import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

const PING_INTERVAL_MS = 15000;
const CHECKPOINT_WINDOW_SECONDS = 5 * 60;

// Tracks how much of a recorded video the student has genuinely watched, and
// runs the mid-video "still watching?" checkpoint.
//
// The server is the authority on both: it clamps reported progress to real
// elapsed time, and it picks the checkpoint position. Everything here is the
// cooperative half — useful for honest students, not a security boundary.
const useVideoWatchGuard = ({ chapterItemId, enabled, duration }) => {
  const [maxAllowed, setMaxAllowed] = useState(0);
  const [checkpoint, setCheckpoint] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(CHECKPOINT_WINDOW_SECONDS);
  const [shouldPause, setShouldPause] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);

  // Refs mirror the state the polling loop reads every ~100ms, so the loop
  // never needs to be torn down and rebuilt as these change.
  const maxAllowedRef = useRef(0);
  const startedRef = useRef(false);
  const pendingWatchedRef = useRef(0);
  const lastPositionRef = useRef(0);
  const lastPingRef = useRef(0);
  const checkpointRef = useRef(null);
  const checkpointFiredRef = useRef(false);
  const deadlineRef = useRef(null);

  const setMax = useCallback((value) => {
    maxAllowedRef.current = value;
    setMaxAllowed(value);
  }, []);

  // ── Session start ────────────────────────────────────────────────
  // Waits for a real duration: the Vimeo player reports 0 until `ready()`
  // resolves, and the server needs the true length to place the checkpoint.
  // `startRequestedRef` keeps this to exactly one call even though `duration`
  // is a dependency, and guards against the preview page's main effect
  // re-running on `user` object identity.
  const startRequestedRef = useRef(null);

  useEffect(() => {
    if (!enabled || !chapterItemId || !duration) return undefined;
    if (startRequestedRef.current === chapterItemId) return undefined;
    startRequestedRef.current = chapterItemId;

    let cancelled = false;
    startedRef.current = false;

    const start = async () => {
      try {
        const res = await api.startVideoProgress(
          chapterItemId,
          Math.floor(duration || 0),
        );
        if (cancelled || !res?.success || !res.data?.tracked) return;

        startedRef.current = true;
        const serverMax = res.data.maxPositionSeconds || 0;
        setMax(serverMax);
        // Never resume beyond the seek ceiling. These normally agree, but if
        // the server clamped a suspicious advance the last position can sit
        // ahead of it — resuming there would just bounce the student back.
        setResumeAt(Math.min(res.data.lastPositionSeconds || 0, serverMax));
        if (res.data.checkpoint) {
          checkpointRef.current = res.data.checkpoint;
        }
      } catch {
        // Tracking must never block playback. A failed start just means this
        // session goes unrecorded.
      }
    };

    start();
    return () => {
      cancelled = true;
    };
  }, [chapterItemId, enabled, duration, setMax]);

  // ── Progress flush ───────────────────────────────────────────────
  const flush = useCallback(async () => {
    if (!enabled || !startedRef.current) return;
    const watchedDelta = pendingWatchedRef.current;
    if (watchedDelta <= 0) return;

    pendingWatchedRef.current = 0;
    lastPingRef.current = Date.now();

    try {
      const res = await api.pingVideoProgress(chapterItemId, {
        positionSeconds: Math.floor(lastPositionRef.current),
        watchedDeltaSeconds: Math.round(watchedDelta),
      });
      // Trust the server's clamped figure over our local optimistic one.
      if (res?.success && typeof res.data?.maxPositionSeconds === "number") {
        setMax(res.data.maxPositionSeconds);
      }
    } catch {
      // Drop the sample rather than retrying — a lost ping costs a few
      // seconds of recorded watch time, a retry storm costs the session.
    }
  }, [chapterItemId, enabled, setMax]);

  // Flush on tab-hide and unmount so closing the tab still records the tail
  // of the session.
  useEffect(() => {
    if (!enabled) return undefined;
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [enabled, flush]);

  // ── Called from the player's polling loop ────────────────────────
  const reportPosition = useCallback(
    (position, isPlaying) => {
      if (!enabled || !startedRef.current) return;

      const previous = lastPositionRef.current;
      lastPositionRef.current = position;

      const advance = position - previous;
      // Only count forward movement at roughly real-time speed as watched.
      // A jump is a seek, not viewing.
      if (isPlaying && advance > 0 && advance < 2) {
        pendingWatchedRef.current += advance;
        if (position > maxAllowedRef.current) setMax(position);
      }

      const cp = checkpointRef.current;
      if (
        cp &&
        !checkpointFiredRef.current &&
        position >= cp.promptAtSeconds
      ) {
        checkpointFiredRef.current = true;
        deadlineRef.current = Date.now() + CHECKPOINT_WINDOW_SECONDS * 1000;
        setCheckpoint(cp);
        setSecondsLeft(CHECKPOINT_WINDOW_SECONDS);
        api.issueVideoCheckpoint(chapterItemId, cp.id).catch(() => {});
      }

      if (Date.now() - lastPingRef.current >= PING_INTERVAL_MS) flush();
    },
    [chapterItemId, enabled, flush, setMax],
  );

  // ── Checkpoint countdown ─────────────────────────────────────────
  // Wall-clock, not playback-driven: the player's poller stops when paused, so
  // a poller-driven timer would freeze the moment a student paused and walked
  // away — exactly the case this is meant to catch.
  useEffect(() => {
    if (!checkpoint || !deadlineRef.current) return undefined;

    const timer = setInterval(() => {
      const remaining = Math.ceil((deadlineRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        setSecondsLeft(0);
        setCheckpoint(null);
        setShouldPause(true);
        checkpointRef.current = null;
        // The server records the strike on its own via the ping safety net and
        // on completion; flushing here just makes it immediate.
        flush();
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [checkpoint, flush]);

  const acknowledge = useCallback(async () => {
    const cp = checkpointRef.current;
    setCheckpoint(null);
    checkpointRef.current = null;
    deadlineRef.current = null;
    if (!cp) return;
    try {
      await api.ackVideoCheckpoint(chapterItemId, cp.id);
    } catch {
      // Already expired server-side; the strike stands.
    }
  }, [chapterItemId]);

  const reportComplete = useCallback(() => {
    if (!enabled || !startedRef.current) return;
    flush();
    api.completeVideoProgress(chapterItemId).catch(() => {});
  }, [chapterItemId, enabled, flush]);

  const clearPause = useCallback(() => setShouldPause(false), []);

  return {
    maxAllowed,
    checkpoint,
    secondsLeft,
    shouldPause,
    resumeAt,
    reportPosition,
    reportComplete,
    acknowledge,
    clearPause,
    tracking: enabled && startedRef.current,
  };
};

export default useVideoWatchGuard;
