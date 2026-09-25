import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";

// Fraction of the track the knob must reach for the swipe to count.
const CONFIRM_THRESHOLD = 0.9;

const fmtCountdown = (totalSeconds) => {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// The mid-video "are you still watching?" prompt.
//
// Rendered as an absolutely-positioned child of `.player-root` rather than a
// `fixed` modal (the convention elsewhere in this codebase) because the player
// fullscreens `.player-root` itself — a fixed overlay would vanish exactly when
// a student is most likely to be watching.
const VideoAttentionCheckpoint = ({ active, secondsLeft, onConfirm }) => {
  const { t, isRtl } = useTranslation();
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const ratioFromEvent = useCallback(
    (event) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      if (rect.width === 0) return 0;
      const raw = (event.clientX - rect.left) / rect.width;
      // In RTL the knob starts on the right and travels left.
      const oriented = isRtl ? 1 - raw : raw;
      return Math.max(0, Math.min(1, oriented));
    },
    [isRtl],
  );

  const handlePointerDown = (event) => {
    if (confirmed) return;
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setProgress(ratioFromEvent(event));
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current || confirmed) return;
    setProgress(ratioFromEvent(event));
  };

  const handlePointerUp = (event) => {
    if (!draggingRef.current || confirmed) return;
    draggingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture can already be gone if the pointer left the window.
    }

    if (ratioFromEvent(event) >= CONFIRM_THRESHOLD) {
      setConfirmed(true);
      setProgress(1);
      onConfirm();
    } else {
      // Snap back so a half-hearted drag doesn't look like it counted.
      setProgress(0);
    }
  };

  if (!active) return null;

  const knobOffset = `${progress * 100}%`;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl text-center">
        <h3 className="font-heading text-lg font-black text-[#2e0854]">
          {t("videoCheckpoint.title")}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {t("videoCheckpoint.description")}
        </p>

        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative mt-5 h-14 w-full cursor-grab touch-none select-none overflow-hidden rounded-full bg-violet-100 active:cursor-grabbing"
        >
          <div
            className="absolute inset-y-0 start-0 bg-violet-300/60"
            style={{ width: knobOffset }}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-brand-purple">
            {confirmed
              ? t("videoCheckpoint.confirmed")
              : t("videoCheckpoint.swipeHint")}
          </span>
          <div
            className="pointer-events-none absolute top-1.5 h-11 w-11 rounded-full bg-brand shadow-lg transition-transform"
            style={{
              insetInlineStart: `calc(${knobOffset} - ${progress * 2.75}rem + 0.375rem)`,
            }}
          >
            <span className="flex h-full w-full items-center justify-center text-lg font-black text-white">
              {confirmed ? "✓" : isRtl ? "‹" : "›"}
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-gray-500">
          {t("videoCheckpoint.timeLeft", { time: fmtCountdown(secondsLeft) })}
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          {t("videoCheckpoint.warning")}
        </p>
      </div>
    </div>
  );
};

export default VideoAttentionCheckpoint;
