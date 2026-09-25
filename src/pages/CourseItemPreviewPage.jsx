import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlinePaperClip,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineDownload,
  HiOutlineQuestionMarkCircle,
  HiOutlineKey,
  HiOutlineVideoCamera,
} from "react-icons/hi";
import { HiOutlinePlayCircle } from "react-icons/hi2";
import {
  formatDueDate,
  getAssessmentWindowStatus,
  isBeforeAvailableFrom,
  isPastDueDate,
  toDatetimeLocalValue,
} from "../utils/assessmentDue";
import {
  formatMeetingDateTime,
  getZoomMeetingWindowStatus,
} from "../utils/zoomMeeting";
import VideoMovingWatermark from "../components/VideoMovingWatermark";
import VideoAttentionCheckpoint from "../components/VideoAttentionCheckpoint";
import useVideoContentProtection from "../hooks/useVideoContentProtection";
import useVideoWatchGuard from "../hooks/useVideoWatchGuard";

const isQuestionImagePath = (path) =>
  path && /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(path);

const QuizQuestionPrompt = ({ question }) => (
  <div className="space-y-2">
    {question.question_image_path &&
      (isQuestionImagePath(question.question_image_path) ? (
        <img
          src={api.getFileUrl(question.question_image_path)}
          alt="Question"
          className="max-h-48 rounded-lg border border-gray-200 object-contain"
        />
      ) : (
        <a
          href={api.getFileUrl(question.question_image_path)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-purple hover:underline inline-flex items-center gap-1"
        >
          <HiOutlineDownload /> View question file
        </a>
      ))}
    {question.question_text && (
      <p className="font-medium text-sm text-[#2e0854]">
        {question.question_text}
      </p>
    )}
    {!question.question_image_path && !question.question_text && (
      <p className="text-sm text-gray-400 italic">Question image</p>
    )}
  </div>
);

const ItemAttachment = ({ attachmentUrl }) => {
  if (!attachmentUrl) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
        Attachment
      </span>
      {isQuestionImagePath(attachmentUrl) ? (
        <img
          src={api.getFileUrl(attachmentUrl)}
          alt="Attachment"
          className="max-h-72 rounded-lg border border-gray-200 object-contain"
        />
      ) : (
        <a
          href={api.getFileUrl(attachmentUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-purple hover:underline inline-flex items-center gap-1.5 font-semibold"
        >
          <HiOutlineDownload /> Download attachment
        </a>
      )}
    </div>
  );
};

// ─── Load Vimeo SDK ──────────────────────────────────────────────
let sdkPromise = null;
const loadVimeoSDK = () => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    if (window.Vimeo) return resolve(window.Vimeo);
    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.onload = () => resolve(window.Vimeo);
    document.head.appendChild(script);
  });
  return sdkPromise;
};

// Speeds offered in the playback-rate menu. Vimeo accepts 0.5–2.
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ─── Custom Vimeo Player ────────────────────────────────────────
const CustomVideoPlayer = ({
  videoId,
  title,
  watermarkLabel = "",
  protectContent = false,
  chapterItemId = null,
  trackingEnabled = false,
}) => {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const rafRef = useRef(null);
  const timerRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const {
    maxAllowed,
    checkpoint,
    secondsLeft,
    shouldPause,
    resumeAt,
    reportPosition,
    reportComplete,
    acknowledge,
    clearPause,
  } = useVideoWatchGuard({
    chapterItemId,
    enabled: trackingEnabled,
    duration,
  });

  // The furthest point the student may scrub to. Until the video is finished
  // this is their high-water mark; once finished the whole timeline opens up.
  // `null` means no ceiling — staff, or tracking that never started.
  const seekCeiling = trackingEnabled ? maxAllowed : null;

  // The player-construction effect is keyed on `videoId` alone so the iframe is
  // never rebuilt mid-watch. These refs let its long-lived event handlers read
  // current values without becoming dependencies.
  const seekCeilingRef = useRef(seekCeiling);
  const reportCompleteRef = useRef(reportComplete);
  const reportPositionRef = useRef(reportPosition);
  seekCeilingRef.current = seekCeiling;
  reportCompleteRef.current = reportComplete;
  reportPositionRef.current = reportPosition;

  // Read by the player-construction effect (keyed on videoId) so a chosen speed
  // carries over when the student moves to the next video without the iframe
  // treating it as a dependency. Also lets the auto-hide timer keep the bar up
  // while the speed menu is open.
  const playbackRateRef = useRef(playbackRate);
  const showSpeedMenuRef = useRef(showSpeedMenu);
  playbackRateRef.current = playbackRate;
  showSpeedMenuRef.current = showSpeedMenu;

  useEffect(() => {
    let cancelled = false;
    let player = null;

    loadVimeoSDK().then((Vimeo) => {
      if (cancelled || !mountRef.current) return;

      player = new Vimeo.Player(mountRef.current, {
        id: videoId,
        controls: false,
        autoplay: false,
        title: false,
        byline: false,
        portrait: false,
        badge: false,
        dnt: true,
        transparent: false,
        pip: false,
        // Must be true or the SDK's setPlaybackRate() is a no-op. The native
        // speed menu never shows because controls:false — we drive it from the
        // custom control bar instead.
        speed: true,
      });

      playerRef.current = player;

      player.ready().then(async () => {
        if (cancelled) return;
        setIsReady(true);
        const d = await player.getDuration();
        setDuration(d);
        const v = await player.getVolume();
        setVolume(v);
        const m = await player.getMuted();
        setIsMuted(m);
        // Re-apply a speed the student picked on a previous video.
        if (playbackRateRef.current !== 1) {
          player
            .setPlaybackRate(playbackRateRef.current)
            .catch(() => setPlaybackRate(1));
        }
      });

      player.on("play", () => setIsPlaying(true));
      player.on("pause", () => setIsPlaying(false));
      player.on("ended", () => {
        setIsPlaying(false);
        setShowControls(true);
        reportCompleteRef.current?.();
      });
      // Catches position changes that don't go through handleSeek — the
      // clamp below pulls them back to the high-water mark.
      player.on("seeked", (data) => {
        const ceiling = seekCeilingRef.current;
        if (ceiling !== null && data?.seconds > ceiling + 1.5) {
          player.setCurrentTime(ceiling);
          setCurrentTime(ceiling);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
      if (player) player.destroy().catch(() => {});
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    const tick = () => {
      if (playerRef.current && isPlaying) {
        playerRef.current.getCurrentTime().then((t) => {
          setCurrentTime(t);
          reportPositionRef.current?.(t, true);

          // Defensive clamp for anything that slipped past handleSeek.
          const ceiling = seekCeilingRef.current;
          if (ceiling !== null && t > ceiling + 1.5) {
            playerRef.current?.setCurrentTime(ceiling);
            setCurrentTime(ceiling);
          }
        });
      }
      rafRef.current = requestAnimationFrame(() => {
        timerRef.current = setTimeout(tick, 100);
      });
    };
    if (isPlaying) tick();
    else {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, [isPlaying]);

  // The checkpoint went unanswered for its full five minutes: record the strike
  // (the hook has already told the server) and stop playback.
  useEffect(() => {
    if (!shouldPause) return;
    playerRef.current?.pause();
    clearPause();
  }, [shouldPause, clearPause]);

  // Pick up where the student left off after a reload, instead of restarting
  // the lesson. Runs once per mount; everything inside their watched range
  // stays freely seekable either way.
  const resumeAppliedRef = useRef(false);
  useEffect(() => {
    if (!isReady || !trackingEnabled || resumeAppliedRef.current) return;
    if (!resumeAt || resumeAt < 5) return;
    resumeAppliedRef.current = true;
    // A finished video resumes at its own end, which is useless — a student
    // reopening it wants to rewatch, so leave those at the start.
    if (duration && resumeAt > duration - 10) return;
    playerRef.current?.setCurrentTime(resumeAt);
    setCurrentTime(resumeAt);
  }, [isReady, resumeAt, trackingEnabled, duration]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const hideTimer = useRef(null);
  const resetHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.getPaused().then((p) => {
          if (!p && !showSpeedMenuRef.current) setShowControls(false);
        });
      }
    }, 3000);
  }, []);


  const togglePlay = () => {
    if (!playerRef.current) return;
    isPlaying ? playerRef.current.pause() : playerRef.current.play();
    resetHide();
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    playerRef.current.setMuted(!isMuted);
    setIsMuted((m) => !m);
  };

  const changeRate = (rate) => {
    setShowSpeedMenu(false);
    if (!playerRef.current) return;
    setPlaybackRate(rate);
    resetHide();
    playerRef.current
      .setPlaybackRate(rate)
      .catch((err) => console.warn("Vimeo setPlaybackRate failed", err));
  };

  const handleSeek = (e) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    // Rewinding is always free; scrubbing forward stops at the furthest point
    // the student has actually reached.
    const t = Math.min(ratio * duration, seekCeiling ?? duration);
    playerRef.current.setCurrentTime(t);
    setCurrentTime(t);
    resetHide();
  };

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    if (!playerRef.current) return;
    playerRef.current.setVolume(val);
    setVolume(val);
    if (val === 0) {
      playerRef.current.setMuted(true);
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current.setMuted(false);
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const el = mountRef.current?.closest(".player-root");
    if (!el) return;
    document.fullscreenElement
      ? document.exitFullscreen()
      : el.requestFullscreen();
  };

  const lastTapRef = useRef(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) toggleFullscreen();
    else togglePlay();
    lastTapRef.current = now;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  // How much of the timeline is reachable. Shown as a lighter fill so the lock
  // reads as "not unlocked yet" rather than a broken scrubber.
  const unlockedPct =
    duration && seekCeiling !== null
      ? Math.min(100, (seekCeiling / duration) * 100)
      : 100;

  return (
    <div
      className="player-root relative w-full h-full bg-black select-none overflow-hidden"
      onMouseMove={resetHide}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onContextMenu={protectContent ? (event) => event.preventDefault() : undefined}
      onDragStart={protectContent ? (event) => event.preventDefault() : undefined}
    >
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:pointer-events-none"
      />
      {protectContent && watermarkLabel && (
        <VideoMovingWatermark label={watermarkLabel} intervalMs={15000} />
      )}
      {/* Inside .player-root so it survives fullscreen, and above the z-30 controls. */}
      <VideoAttentionCheckpoint
        active={!!checkpoint}
        secondsLeft={secondsLeft}
        onConfirm={acknowledge}
      />
      {!isReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {isReady && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleTap}
          onDoubleClick={toggleFullscreen}
          onContextMenu={protectContent ? (event) => event.preventDefault() : undefined}
        />
      )}
      {/* Sits below the controls (z-30) so a click anywhere else just closes
          the speed menu without toggling playback. */}
      {showSpeedMenu && (
        <div
          className="absolute inset-0 z-20"
          onClick={() => setShowSpeedMenu(false)}
        />
      )}
      {isReady && !isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      {isReady && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-14 pb-4 px-4">
            <div
              className="w-full h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group/bar relative"
              onClick={handleSeek}
            >
              <div
                className="absolute inset-y-0 left-0 bg-white/25 rounded-full"
                style={{ width: `${unlockedPct}%` }}
              />
              <div
                className="h-full bg-violet-500 rounded-full relative"
                style={{ width: `${pct}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg scale-0 group-hover/bar:scale-100 transition-transform" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-brand-violet transition-colors flex-shrink-0"
              >
                {isPlaying ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-brand-violet transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L7 9H5z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                  className="w-16 h-1 accent-red-500 cursor-pointer"
                />
              </div>
              <span className="text-white/75 text-xs font-mono flex-1">
                {fmt(currentTime)} <span className="text-white/30">/</span>{" "}
                {fmt(duration)}
              </span>
              <div
                className="relative flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowSpeedMenu((s) => !s);
                    resetHide();
                  }}
                  className="text-white hover:text-brand-violet transition-colors text-xs font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded min-w-[2.75rem] text-center"
                  aria-label="Playback speed"
                >
                  {playbackRate === 1 ? "1x" : `${playbackRate}x`}
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm border border-white/15 rounded-lg py-1 min-w-[84px] shadow-xl">
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeRate(rate)}
                        className={`block w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                          rate === playbackRate
                            ? "text-brand-violet font-bold"
                            : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        {rate === 1 ? "Normal" : `${rate}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-brand-violet transition-colors flex-shrink-0"
              >
                {isFullscreen ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────
const CourseItemPreviewPage = () => {
  const { slug, itemId } = useParams();
  const { user, isAuthenticated } = useAuth();

  // ── Content state ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [course, setCourse] = useState(null);
  const [item, setItem] = useState(null);
  const [fullItem, setFullItem] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isStaffViewer, setIsStaffViewer] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [requiresUnlockCode, setRequiresUnlockCode] = useState(false);
  const [sequenceLockReason, setSequenceLockReason] = useState(null);
  const [sequenceLockBlockingTitle, setSequenceLockBlockingTitle] =
    useState(null);
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  // ── Assignment submissions state (multiple files) ──
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submissionText, setSubmissionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState("");
  const fileInputRef = useRef(null);

  // ── Quiz state ──
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({}); // { questionId: { answerText, selectedOptionId, file } }
  const [quizExistingAnswers, setQuizExistingAnswers] = useState([]);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScheduleStatus, setQuizScheduleStatus] = useState("open");
  const [quizScheduleMessage, setQuizScheduleMessage] = useState("");
  // Timed-quiz countdown. `quizAttempt` = { windowMinutes, startedAt, deadline }
  // from the server (null until the quiz has a countdown window).
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [quizStarting, setQuizStarting] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const [studentRecordId, setStudentRecordId] = useState(null);
  const [studentDisplayName, setStudentDisplayName] = useState("");

  const [zoomWindowStatus, setZoomWindowStatus] = useState("live");
  const [zoomJoinError, setZoomJoinError] = useState("");
  const [zoomJoinLoading, setZoomJoinLoading] = useState(false);

  const isAssessment =
    item?.item_type === "assignment" || item?.item_type === "quiz";
  const isQuiz = item?.item_type === "quiz";

  const shouldProtectVideo =
    (item?.item_type === "vimeo_video" || fullItem?.item_type === "vimeo_video") &&
    isAuthenticated &&
    user?.role === "student" &&
    canAccess &&
    !isStaffViewer &&
    (isEnrolled || !!item?.is_preview_free || !!fullItem?.is_preview_free);

  const videoWatermarkLabel =
    shouldProtectVideo && (studentDisplayName || studentRecordId)
      ? [studentDisplayName, studentRecordId ? `ID: ${studentRecordId}` : ""]
          .filter(Boolean)
          .join(" · ")
      : "";

  useVideoContentProtection(shouldProtectVideo);

  useEffect(() => {
    if (user?.role !== "student") {
      setStudentRecordId(null);
      setStudentDisplayName("");
      return;
    }

    const fallbackName = [user.firstName || user.first_name, user.lastName || user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    setStudentDisplayName(fallbackName);

    const loadStudentProfile = async () => {
      try {
        const res = await api.getMe();
        if (res.success && res.data) {
          const profile = res.data;
          const name = [
            profile.firstName || profile.first_name,
            profile.lastName || profile.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
          setStudentDisplayName(name);
          if (profile.roleData?.id) {
            setStudentRecordId(profile.roleData.id);
          }
        }
      } catch (err) {
        console.error("Failed to load student profile for watermark", err);
        const fallbackName = [user.firstName || user.first_name, user.lastName || user.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        setStudentDisplayName(fallbackName);
      }
    };

    loadStudentProfile();
  }, [user?.role, user?.id]);

  // ── Fetch data ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const courseRes = await api.getCourseBySlug(slug);
        if (!courseRes.success) {
          setError("Course not found.");
          setLoading(false);
          return;
        }
        setCourse(courseRes.data);

        let foundItem = null;
        for (const chapter of courseRes.data.chapters || []) {
          const match = (chapter.items || []).find(
            (it) => String(it.id) === itemId,
          );
          if (match) {
            foundItem = { ...match, chapterTitle: chapter.title };
            break;
          }
        }
        if (!foundItem) {
          try {
            const fallbackRes = await api.getChapterItemById(itemId);
            if (fallbackRes.success && fallbackRes.data?.not_available_for_student_type) {
              setError(
                "This content isn't available for your account type. Contact your center for details.",
              );
              setLoading(false);
              return;
            }
          } catch {
            /* fall through to generic not-found message */
          }
          setError("Item not found in this course.");
          setLoading(false);
          return;
        }
        setItem(foundItem);

        const itemRes = await api.getChapterItemById(itemId);
        if (!itemRes.success) {
          setError(itemRes.message || "Failed to load lesson.");
          setLoading(false);
          return;
        }

        const itemData = itemRes.data;
        setFullItem(itemData);

        if (itemData.locked) {
          setCanAccess(false);
          setRequiresUnlockCode(!!itemData.requires_unlock_code);
          setSequenceLockReason(
            itemData.sequence_locked ? itemData.sequence_lock_reason : null,
          );
          setSequenceLockBlockingTitle(
            itemData.sequence_locked
              ? itemData.sequence_lock_blocking_title || null
              : null,
          );
          setIsEnrolled(false);
          setIsStaffViewer(false);
          setLoading(false);
          return;
        }

        setCanAccess(true);
        setRequiresUnlockCode(false);
        setSequenceLockReason(null);

        const staffViewer =
          isAuthenticated &&
          ["admin", "instructor", "assistant"].includes(user?.role);
        setIsStaffViewer(staffViewer);

        let enrolled = false;
        if (isAuthenticated && user?.role === "student") {
          const enrollRes = await api.getMyEnrollments();
          if (enrollRes.success) {
            enrolled = enrollRes.data.some(
              (e) => Number(e.id) === Number(courseRes.data.id),
            );
          }
          setIsEnrolled(enrolled || !!itemData.unlocked_via);
        } else {
          setIsEnrolled(false);
        }

        const isFreePreview = !!foundItem.is_preview_free;
        const canLoadItemContent =
          staffViewer ||
          !!itemData.staff_preview ||
          enrolled ||
          itemData.unlocked_via ||
          isFreePreview;

        if (canLoadItemContent) {
          if (foundItem.item_type === "quiz") {
            const availableFrom =
              itemData.available_from || itemData.availableFrom;
            const dueDate = itemData.due_date || itemData.dueDate;
            const windowStatus = getAssessmentWindowStatus(
              availableFrom,
              dueDate,
            );
            setQuizScheduleStatus(windowStatus);

            try {
              const qRes = await api.getQuizQuestions(itemId);
              if (qRes.success) {
                setQuizQuestions(qRes.data);
                if (qRes.schedule?.status) {
                  setQuizScheduleStatus(qRes.schedule.status);
                }
                if (qRes.attempt) setQuizAttempt(qRes.attempt);
              }

              if (user?.role === "student") {
                const aRes = await api.getQuizAnswers(itemId);
                if (aRes.success) {
                  setQuizExistingAnswers(aRes.data);
                  if (qRes.success && qRes.data.length > 0) {
                    const allAnswered = qRes.data.every((q) =>
                      aRes.data.some((a) => a.question_id === q.id),
                    );
                    setQuizSubmitted(allAnswered);
                  }
                  const existingMap = {};
                  aRes.data.forEach((ans) => {
                    existingMap[ans.question_id] = {
                      answerText: ans.answer_text || "",
                      selectedOptionId: ans.selected_option_id || "",
                      file: ans.file_path || null,
                    };
                  });
                  setQuizAnswers(existingMap);
                }
              }
            } catch (err) {
              if (windowStatus === "not_started") {
                setQuizQuestions([]);
                setQuizScheduleMessage(
                  err.message ||
                    "This quiz has not started yet. Questions will appear at the scheduled start time.",
                );
              } else {
                console.error("Failed to fetch quiz data", err);
              }
            }
          } else if (foundItem.item_type === "assignment" && !staffViewer) {
            const subRes = await api.getSubmissionsForItem(itemId);
            if (subRes.success) {
              setSubmissionsList(subRes.data);
            }
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load preview.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, itemId, isAuthenticated, user, isQuiz]);

  useEffect(() => {
    if (item?.item_type !== "zoom_meeting" && fullItem?.item_type !== "zoom_meeting") {
      return undefined;
    }

    const display = fullItem || item;
    const updateStatus = () => {
      setZoomWindowStatus(
        getZoomMeetingWindowStatus(
          display.start_time,
          display.duration_minutes,
          display.meeting_status,
        ),
      );
    };

    updateStatus();
    const intervalId = window.setInterval(updateStatus, 30000);
    return () => window.clearInterval(intervalId);
  }, [item, fullItem]);

  useEffect(() => {
    setZoomJoinError("");
  }, [itemId]);

  // ── Assignment submission handlers ──
  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitMultiple = async (status) => {
    const dueDate = fullItem?.due_date || item?.due_date;
    if (status === "submitted" && isPastDueDate(dueDate)) {
      setSubmissionError("The due date for this assignment has passed.");
      return;
    }
    if (selectedFiles.length === 0) {
      setSubmissionError("Please select at least one file.");
      return;
    }
    setSubmitting(true);
    setSubmissionError("");
    setSubmissionSuccess("");
    let successCount = 0;
    try {
      for (const fileObj of selectedFiles) {
        await api.upsertSubmission(
          itemId,
          submissionText,
          status,
          fileObj.file,
        );
        successCount++;
      }
      setSubmissionSuccess(
        `✅ ${successCount} file(s) ${
          status === "submitted" ? "submitted" : "saved as draft"
        }.`,
      );
      const subRes = await api.getSubmissionsForItem(itemId);
      if (subRes.success) {
        setSubmissionsList(subRes.data);
      }
      setSelectedFiles([]);
      setSubmissionText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setSubmissionSuccess(""), 5000);
    } catch (err) {
      setSubmissionError(err.message || "Failed to upload files.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quiz handlers ──
  const handleQuizAnswerChange = (questionId, field, value) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [field]: value,
      },
    }));
  };

  const handleQuizFileChange = (questionId, file) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        file: file,
      },
    }));
  };

  // ── Timed quiz (per-student countdown) ──
  const quizWindowMinutes =
    quizAttempt?.windowMinutes ||
    fullItem?.attempt_window_minutes ||
    item?.attempt_window_minutes ||
    null;
  const quizStarted = !!quizAttempt?.startedAt;
  const quizDeadlineMs = quizAttempt?.deadline
    ? Number(quizAttempt.deadline)
    : null;
  const quizTimeRemainingMs =
    quizStarted && quizDeadlineMs ? quizDeadlineMs - nowTick : null;
  const quizTimeUp = quizTimeRemainingMs !== null && quizTimeRemainingMs <= 0;
  // Show the "Start Quiz" gate: quiz has a window, not started, still open,
  // not already submitted.
  const needsQuizStart =
    !!quizWindowMinutes &&
    !quizStarted &&
    !quizSubmitted &&
    quizScheduleStatus === "open";

  // Tick once a second while the countdown is live so it re-renders.
  useEffect(() => {
    if (!quizStarted || !quizDeadlineMs || quizTimeUp) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [quizStarted, quizDeadlineMs, quizTimeUp]);

  const fmtCountdown = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(h > 0 ? m : m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const handleStartQuiz = async () => {
    setQuizStarting(true);
    try {
      const res = await api.startQuizAttempt(itemId);
      if (res.success && res.data) {
        setQuizAttempt({
          windowMinutes: res.data.windowMinutes,
          startedAt: res.data.startedAt,
          deadline: res.data.deadline,
        });
        setNowTick(Date.now());
      } else {
        alert(res.message || "Could not start the quiz.");
      }
    } catch (err) {
      alert(err?.message || "Could not start the quiz.");
    } finally {
      setQuizStarting(false);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (quizSubmitted) return;
    const dueDate = fullItem?.due_date || item?.due_date;
    const availableFrom =
      fullItem?.available_from || item?.available_from;
    if (isBeforeAvailableFrom(availableFrom)) {
      alert("This quiz has not started yet.");
      return;
    }
    if (isPastDueDate(dueDate)) {
      alert("The due date for this quiz has passed.");
      return;
    }
    if (quizWindowMinutes && !quizStarted) {
      alert("Start the quiz before submitting answers.");
      return;
    }
    if (quizTimeUp) {
      alert("Your quiz time is up. Answers can no longer be submitted.");
      return;
    }
    setQuizSubmitting(true);
    try {
      const requiredUnanswered = quizQuestions.filter(
        (q) =>
          q.is_required &&
          (!quizAnswers[q.id] ||
            (q.question_type === "mcq" &&
              !quizAnswers[q.id]?.selectedOptionId) ||
            (q.question_type === "text" &&
              !quizAnswers[q.id]?.answerText?.trim()) ||
            (q.question_type === "upload" && !quizAnswers[q.id]?.file)),
      );
      if (requiredUnanswered.length > 0) {
        if (
          !window.confirm(
            "You have not answered all required questions. Continue anyway?",
          )
        ) {
          setQuizSubmitting(false);
          return;
        }
      }

      for (const q of quizQuestions) {
        const ans = quizAnswers[q.id] || {};
        const payload = {
          questionId: q.id,
          answerText: ans.answerText || "",
          selectedOptionId: ans.selectedOptionId || undefined,
        };
        await api.submitQuizAnswer(itemId, payload, ans.file || undefined);
      }
      alert("Quiz submitted successfully!");
      setQuizSubmitted(true);
      const answersRes = await api.getQuizAnswers(itemId);
      if (answersRes.success) {
        setQuizExistingAnswers(answersRes.data);
        const existingMap = {};
        answersRes.data.forEach((ans) => {
          existingMap[ans.question_id] = {
            answerText: ans.answer_text || "",
            selectedOptionId: ans.selected_option_id || "",
            file: ans.file_path || null,
          };
        });
        setQuizAnswers(existingMap);
      }
    } catch (err) {
      alert(err.message || "Failed to submit quiz.");
    } finally {
      setQuizSubmitting(false);
    }
  };

  // ─── Loading / Error ──────────────────────────────────────────────
  if (loading)
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          Loading content...
        </p>
      </div>
    );

  const handleUnlockCode = async (e) => {
    e.preventDefault();
    if (!unlockCode.trim()) return;
    setUnlockLoading(true);
    setUnlockError("");
    try {
      const res = await api.redeemAccessCode(unlockCode, undefined, item?.id);
      if (res.success) {
        window.location.reload();
      } else {
        setUnlockError(res.message || "Invalid code.");
      }
    } catch (err) {
      setUnlockError(err.message || "Failed to redeem code.");
    } finally {
      setUnlockLoading(false);
    }
  };

  if (error || !item) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="bg-violet-50 border border-violet-200 rounded-3xl p-10">
          <HiOutlineLockClosed className="text-6xl text-brand-violet mx-auto mb-4" />
          <h2 className="font-heading font-bold text-2xl text-[#2e0854]">
            Access Restricted
          </h2>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <Link
            to={`/courses/${slug}`}
            className="inline-block mt-6 text-sm font-semibold text-brand-purple hover:underline"
          >
            ← Back to Course
          </Link>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
          <HiOutlineLockClosed className="text-6xl text-brand-violet mx-auto mb-4" />
          <h2 className="font-heading font-bold text-2xl text-[#2e0854]">
            {sequenceLockReason
              ? "Finish the Required Step"
              : requiresUnlockCode
                ? "Unlock This Lesson"
                : "Access Restricted"}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {sequenceLockReason
              ? sequenceLockReason === "assignment_not_submitted"
                ? sequenceLockBlockingTitle
                  ? `Submit "${sequenceLockBlockingTitle}" to unlock this content.`
                  : "Submit the required assignment to unlock this content."
                : sequenceLockBlockingTitle
                  ? `Score 60% or higher on "${sequenceLockBlockingTitle}" to unlock this content.`
                  : "Score 60% or higher on the required quiz to unlock this content."
              : requiresUnlockCode
                ? `Enter an unlock code to access "${item.title}".`
                : "This content is available to enrolled students only."}
          </p>

          {!sequenceLockReason && requiresUnlockCode && isAuthenticated && user?.role === "student" ? (
            <form
              onSubmit={handleUnlockCode}
              className="mt-6 max-w-sm mx-auto space-y-3 text-left"
            >
              <input
                type="text"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase"
              />
              {unlockError && (
                <p className="text-xs text-brand-purple">{unlockError}</p>
              )}
              <button
                type="submit"
                disabled={unlockLoading || !unlockCode.trim()}
                className="w-full px-4 py-3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white text-sm font-bold rounded-xl"
              >
                {unlockLoading ? "Unlocking..." : "Unlock with Code"}
              </button>
            </form>
          ) : (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/courses/${slug}`}
                className="inline-block text-sm font-semibold text-brand-purple hover:underline"
              >
                ← Back to Course
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-block px-6 py-2 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition-colors"
                >
                  Log In
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const displayItem = fullItem || item;
  const videoId = displayItem.vimeo_video_id || displayItem.vimeoVideoId;
  const durSec = displayItem.duration_seconds || displayItem.durationSeconds;
  const courseTitle = course?.title || "Course";
  const chapterTitle = item.chapterTitle || "";
  const isFreePreview = !!item.is_preview_free;

  const fmtDur = (s) => {
    if (!s) return null;
    const total = Math.floor(s);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (h || m) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(" ");
  };

  const getFileName = (filePath) => {
    if (!filePath) return "";
    return filePath.split("/").pop();
  };

  // ─── Render content based on item type ──────────────────────────
  const renderContent = () => {
    switch (displayItem.item_type) {
      case "vimeo_video":
        return (
          <div className="space-y-4">
            <div
              className="relative aspect-video"
              onContextMenu={
                shouldProtectVideo ? (event) => event.preventDefault() : undefined
              }
            >
              {videoId ? (
                <CustomVideoPlayer
                  videoId={videoId}
                  title={displayItem.title}
                  watermarkLabel={videoWatermarkLabel}
                  protectContent={shouldProtectVideo}
                  chapterItemId={displayItem.id}
                  // Same condition as the watermark: enrolled students only,
                  // never staff previewing the course.
                  trackingEnabled={shouldProtectVideo}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 p-8 text-center">
                  <HiOutlinePlayCircle className="text-8xl mb-4 opacity-40" />
                  <p className="text-lg font-medium">Video not available</p>
                  <p className="text-sm opacity-40 mt-1">
                    The video ID is missing or invalid.
                  </p>
                </div>
              )}
            </div>
            <ItemAttachment attachmentUrl={displayItem.attachment_url} />
          </div>
        );

      case "assignment":
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {displayItem.content || "No instructions provided."}
            </div>

            <ItemAttachment attachmentUrl={displayItem.attachment_url} />

            <div className="grid grid-cols-2 gap-4 text-xs">
              {displayItem.max_score && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Max Score
                  </span>
                  <span className="font-bold text-[#2e0854]">
                    {displayItem.max_score}
                  </span>
                </div>
              )}
              {displayItem.due_date && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Submission Deadline
                  </span>
                  <span
                    className={`font-bold ${isPastDueDate(displayItem.due_date) ? "text-brand-purple" : "text-[#2e0854]"}`}
                  >
                    {formatDueDate(displayItem.due_date)}
                  </span>
                </div>
              )}
              {displayItem.time_limit_minutes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Time Limit
                  </span>
                  <span className="font-bold text-[#2e0854]">
                    {displayItem.time_limit_minutes} min
                  </span>
                </div>
              )}
            </div>

            {isEnrolled ? (
              <div className="border-t border-gray-200 pt-6 mt-4">
                <h4 className="font-bold text-sm text-[#2e0854] mb-3 flex items-center gap-2">
                  <HiOutlinePencil className="text-brand-purple" /> Your Submissions
                </h4>

                {isPastDueDate(displayItem.due_date) && (
                  <div className="bg-violet-50 border border-violet-200 text-brand rounded-xl p-3 text-xs mb-4">
                    The submission deadline has passed. You can no longer submit
                    new work, but your previous submissions are shown below.
                  </div>
                )}

                {submissionsList.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {submissionsList.map((sub) => {
                      const isGraded = sub.status === "graded";
                      return (
                        <div
                          key={sub.id}
                          className={`border rounded-xl p-3 text-xs ${
                            isGraded
                              ? "border-emerald-200 bg-emerald-50"
                              : sub.status === "submitted"
                                ? "border-blue-200 bg-blue-50"
                                : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-bold ${
                                    isGraded
                                      ? "text-emerald-700"
                                      : sub.status === "submitted"
                                        ? "text-blue-700"
                                        : "text-gray-600"
                                  }`}
                                >
                                  {getFileName(sub.submission_file) ||
                                    "Text submission"}
                                </span>
                                <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded-full">
                                  {sub.status === "graded"
                                    ? "✅ Graded"
                                    : sub.status === "submitted"
                                      ? "📤 Submitted"
                                      : "📝 Draft"}
                                </span>
                                {isGraded && (
                                  <span className="font-bold text-emerald-700">
                                    Score: {sub.score} /{" "}
                                    {displayItem.max_score || 100}
                                  </span>
                                )}
                              </div>
                              {sub.submission_text && (
                                <p className="text-gray-600 line-clamp-2">
                                  {sub.submission_text}
                                </p>
                              )}
                              {isGraded && sub.feedback && (
                                <p className="text-gray-600">
                                  <strong>Feedback:</strong> {sub.feedback}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-gray-400 text-[10px]">
                                <span>
                                  {new Date(sub.submitted_at).toLocaleString()}
                                </span>
                                {sub.submission_file && (
                                  <a
                                    href={api.getFileUrl(sub.submission_file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-purple hover:underline flex items-center gap-1"
                                  >
                                    <HiOutlineDownload className="text-sm" />{" "}
                                    Download
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isPastDueDate(displayItem.due_date) && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3">
                    Upload additional files as separate submissions.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                        Your Answer / Notes (optional)
                      </label>
                      <textarea
                        rows="3"
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder="Add a comment for these files…"
                        className="w-full bg-white border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-violet-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                        Select Files
                      </label>
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <HiOutlinePaperClip /> Choose Files
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFilesChange}
                          className="hidden"
                          multiple
                        />
                        {selectedFiles.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {selectedFiles.length} file(s) selected
                          </span>
                        )}
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {selectedFiles.map((f, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                            >
                              <span className="truncate max-w-[180px]">
                                {f.file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="text-brand-purple hover:text-brand"
                              >
                                <HiOutlineTrash />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {submissionError && (
                      <div className="bg-violet-50 border border-violet-200 text-brand p-3 rounded-xl text-sm">
                        ⚠️ {submissionError}
                      </div>
                    )}
                    {submissionSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">
                        ✅ {submissionSuccess}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitMultiple("draft")}
                        disabled={submitting || selectedFiles.length === 0}
                        className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Saving..." : "Save Draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitMultiple("submitted")}
                        disabled={submitting || selectedFiles.length === 0}
                        className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-2 rounded-xl transition-all"
                      >
                        {submitting ? "Submitting..." : "Submit Final"}
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex items-start gap-2">
                <HiOutlineEye className="text-base mt-0.5" />
                <span>
                  This is a preview. To submit your work, please enroll in the
                  course.
                </span>
              </div>
            )}
          </div>
        );

      case "quiz":
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {displayItem.content || "No instructions provided."}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {displayItem.max_score && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Max Score
                  </span>
                  <span className="font-bold text-[#2e0854]">
                    {displayItem.max_score}
                  </span>
                </div>
              )}
              {displayItem.available_from && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Starts At
                  </span>
                  <span
                    className={`font-bold ${isBeforeAvailableFrom(displayItem.available_from) ? "text-amber-600" : "text-[#2e0854]"}`}
                  >
                    {formatDueDate(displayItem.available_from)}
                  </span>
                </div>
              )}
              {displayItem.due_date && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Submission Deadline
                  </span>
                  <span
                    className={`font-bold ${isPastDueDate(displayItem.due_date) ? "text-brand-purple" : "text-[#2e0854]"}`}
                  >
                    {formatDueDate(displayItem.due_date)}
                  </span>
                </div>
              )}
              {displayItem.time_limit_minutes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Time Limit
                  </span>
                  <span className="font-bold text-[#2e0854]">
                    {displayItem.time_limit_minutes} min
                  </span>
                </div>
              )}
            </div>

            {isEnrolled ? (
              <div className="border-t border-gray-200 pt-6 mt-4">
                <h4 className="font-bold text-sm text-[#2e0854] mb-4 flex items-center gap-2">
                  <HiOutlineQuestionMarkCircle className="text-brand-purple" /> Quiz
                  Questions
                </h4>

                {quizQuestions.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    {quizScheduleStatus === "not_started"
                      ? quizScheduleMessage ||
                        "This quiz has not started yet. Questions will appear at the scheduled start time."
                      : "No questions have been added to this quiz yet."}
                  </p>
                ) : quizSubmitted ||
                  (isPastDueDate(displayItem.due_date) &&
                    quizExistingAnswers.length > 0) ? (
                  // ─── READ-ONLY VIEW ──────────────────────────────
                  // Shown once submitted, or after the due date for anyone who
                  // answered — the latter also reveals the correct MCQ options.
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-sm font-semibold flex items-center gap-2">
                      <HiOutlineCheckCircle className="text-lg" />
                      {quizSubmitted
                        ? "You have submitted this quiz."
                        : "This quiz has closed. Here are your answers."}
                    </div>
                    {quizExistingAnswers.map((ans) => {
                      const question = quizQuestions.find(
                        (q) => q.id === ans.question_id,
                      );
                      if (!question) return null;
                      const isGraded =
                        ans.score !== null && ans.score !== undefined;
                      return (
                        <div
                          key={ans.id}
                          className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50/50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <QuizQuestionPrompt question={question} />
                              <span className="text-[10px] text-gray-400">
                                Max score: {question.max_score}
                              </span>
                              {isGraded && (
                                <div className="mt-1 flex items-center gap-3 text-xs">
                                  <span className="text-emerald-700 font-bold">
                                    Score: {ans.score} / {question.max_score}
                                  </span>
                                  {ans.feedback && (
                                    <span className="text-gray-600">
                                      Feedback: {ans.feedback}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {isGraded ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Graded
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                                Pending
                              </span>
                            )}
                          </div>

                          {question.question_type === "mcq" &&
                            (question.options?.some(
                              (o) => o.is_correct !== undefined,
                            ) ? (
                              // After the due date the server sends `is_correct`,
                              // so we can show which option was right.
                              <div className="space-y-1.5">
                                {question.options.map((opt) => {
                                  const isCorrect = !!opt.is_correct;
                                  const isPicked =
                                    Number(ans.selected_option_id) ===
                                    Number(opt.id);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
                                        isCorrect
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                          : isPicked
                                            ? "bg-violet-50 border-violet-200 text-brand"
                                            : "bg-white border-gray-100 text-gray-600"
                                      }`}
                                    >
                                      <span className="flex-1">
                                        {opt.option_text}
                                      </span>
                                      {isCorrect && (
                                        <span className="text-[10px] font-bold uppercase">
                                          ✓ Correct
                                        </span>
                                      )}
                                      {isPicked && !isCorrect && (
                                        <span className="text-[10px] font-bold uppercase">
                                          ✗ Your answer
                                        </span>
                                      )}
                                      {isPicked && isCorrect && (
                                        <span className="text-[10px] font-bold uppercase">
                                          Your answer
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-700">
                                Selected:{" "}
                                <span className="font-medium">
                                  {ans.selected_option_text || "Not answered"}
                                </span>
                              </div>
                            ))}
                          {question.question_type === "text" && (
                            <div className="bg-white p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                              {ans.answer_text || "No text provided."}
                            </div>
                          )}
                          {question.question_type === "upload" && (
                            <div>
                              {ans.file_path ? (
                                <a
                                  href={api.getFileUrl(ans.file_path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-purple hover:underline text-xs flex items-center gap-1"
                                >
                                  <HiOutlineDownload /> Download attached file
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No file uploaded.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : quizScheduleStatus === "not_started" ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
                    {quizScheduleMessage ||
                      "This quiz has not started yet. Questions will appear at the scheduled start time."}
                    {displayItem.available_from && (
                      <p className="mt-2 text-xs font-semibold">
                        Opens: {formatDueDate(displayItem.available_from)}
                      </p>
                    )}
                  </div>
                ) : isPastDueDate(displayItem.due_date) ? (
                  <div className="bg-violet-50 border border-violet-200 text-brand rounded-xl p-3 text-sm">
                    The submission deadline has passed. You can no longer submit
                    answers for this quiz.
                  </div>
                ) : needsQuizStart ? (
                  // ─── START-QUIZ GATE (timed quiz) ────────────────
                  <div className="bg-white border border-violet-200 rounded-2xl p-6 text-center space-y-4">
                    <HiOutlineClock className="text-4xl text-brand-purple mx-auto" />
                    <div>
                      <h5 className="font-bold text-[#2e0854]">
                        Timed quiz — {quizWindowMinutes} minute
                        {quizWindowMinutes === 1 ? "" : "s"}
                      </h5>
                      <p className="text-sm text-gray-500 mt-1">
                        Once you start, the countdown runs continuously — even if
                        you leave, reload, or switch devices. When it reaches
                        zero the quiz locks and no more answers are accepted.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartQuiz}
                      disabled={quizStarting}
                      className="px-6 py-3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      {quizStarting ? "Starting…" : "Start Quiz"}
                    </button>
                  </div>
                ) : (
                  // ─── EDITABLE FORM ──────────────────────────────
                  <form onSubmit={handleQuizSubmit} className="space-y-6">
                    {quizWindowMinutes && quizStarted && (
                      <div
                        className={`sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                          quizTimeUp
                            ? "bg-violet-50 border-violet-200 text-brand"
                            : quizTimeRemainingMs !== null &&
                                quizTimeRemainingMs < 60000
                              ? "bg-amber-50 border-amber-200 text-amber-800"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <HiOutlineClock className="text-base" />
                          {quizTimeUp ? "Time's up" : "Time remaining"}
                        </span>
                        <span className="font-mono tabular-nums">
                          {quizTimeUp
                            ? "00:00"
                            : fmtCountdown(quizTimeRemainingMs ?? 0)}
                        </span>
                      </div>
                    )}
                    {quizTimeUp && (
                      <div className="bg-violet-50 border border-violet-200 text-brand rounded-xl p-3 text-sm">
                        Your quiz time is up. Answers can no longer be submitted.
                      </div>
                    )}
                    {quizQuestions.map((q, index) => {
                      const existing = quizExistingAnswers.find(
                        (a) => a.question_id === q.id,
                      );
                      const isGraded =
                        existing?.score !== null &&
                        existing?.score !== undefined;
                      const userAnswer = quizAnswers[q.id] || {};
                      return (
                        <div
                          key={q.id}
                          className="border border-gray-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-bold text-gray-400">
                                Q{index + 1}
                              </span>
                              <div className="mt-0.5">
                                <QuizQuestionPrompt question={q} />
                              </div>
                              <span className="text-[10px] text-gray-400">
                                Max score: {q.max_score}
                              </span>
                              {isGraded && (
                                <div className="mt-1 flex items-center gap-3 text-xs">
                                  <span className="text-emerald-700 font-bold">
                                    Score: {existing.score} / {q.max_score}
                                  </span>
                                  {existing.feedback && (
                                    <span className="text-gray-600">
                                      Feedback: {existing.feedback}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {q.is_required && (
                              <span className="text-brand-purple text-xs">
                                *Required
                              </span>
                            )}
                          </div>

                          {q.question_type === "mcq" && (
                            <div className="space-y-2">
                              {q.options?.map((opt) => (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <input
                                    type="radio"
                                    name={`question_${q.id}`}
                                    value={opt.id}
                                    checked={
                                      Number(userAnswer.selectedOptionId) ===
                                      Number(opt.id)
                                    }
                                    onChange={(e) =>
                                      handleQuizAnswerChange(
                                        q.id,
                                        "selectedOptionId",
                                        parseInt(e.target.value),
                                      )
                                    }
                                    disabled={isGraded || quizSubmitting || quizTimeUp}
                                    className="accent-brand-purple"
                                  />
                                  <span className="text-gray-700">
                                    {opt.option_text}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}

                          {q.question_type === "text" && (
                            <textarea
                              rows="4"
                              value={userAnswer.answerText || ""}
                              onChange={(e) =>
                                handleQuizAnswerChange(
                                  q.id,
                                  "answerText",
                                  e.target.value,
                                )
                              }
                              placeholder="Write your answer here..."
                              disabled={isGraded || quizSubmitting || quizTimeUp}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-violet-200"
                            />
                          )}

                          {q.question_type === "upload" && (
                            <div>
                              <input
                                type="file"
                                onChange={(e) =>
                                  handleQuizFileChange(q.id, e.target.files[0])
                                }
                                disabled={isGraded || quizSubmitting || quizTimeUp}
                                className="text-sm"
                              />
                              {userAnswer.file && (
                                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                  <HiOutlineCheckCircle /> File attached
                                </div>
                              )}
                              {isGraded && existing.file_path && (
                                <a
                                  href={api.getFileUrl(existing.file_path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-brand-purple hover:underline flex items-center gap-1 mt-1"
                                >
                                  <HiOutlineDownload /> Download submitted file
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="submit"
                        disabled={quizSubmitting || quizTimeUp}
                        className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-2 rounded-xl transition-all"
                      >
                        {quizTimeUp
                          ? "Time's up"
                          : quizSubmitting
                            ? "Submitting..."
                            : "Submit Quiz"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex items-start gap-2">
                <HiOutlineEye className="text-base mt-0.5" />
                <span>
                  This is a preview. To take the quiz, please enroll in the
                  course.
                </span>
              </div>
            )}
          </div>
        );

      case "zoom_meeting": {
        const canJoinMeeting =
          isAuthenticated &&
          canAccess &&
          (isEnrolled || isStaffViewer || isFreePreview);
        const meetingEnded = zoomWindowStatus === "ended";
        const meetingUpcoming = zoomWindowStatus === "upcoming";
        const meetingLive = zoomWindowStatus === "live";
        const joinUrl = displayItem.join_url || displayItem.joinUrl || "";
        const meetingPassword =
          displayItem.meeting_password || displayItem.meetingPassword || "";

        const handleJoinZoom = async () => {
          setZoomJoinError("");
          setZoomJoinLoading(true);
          try {
            const res = await api.getZoomJoinCredentials(displayItem.id);
            if (res.success && res.data?.joinUrl) {
              window.open(res.data.joinUrl, "_blank", "noopener,noreferrer");
              return;
            }
            setZoomJoinError(res.message || "Unable to open the Zoom meeting.");
          } catch (err) {
            setZoomJoinError(
              err?.message || "Unable to open the Zoom meeting.",
            );
          } finally {
            setZoomJoinLoading(false);
          }
        };

        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {displayItem.content || "Meeting details."}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {displayItem.start_time && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Start Time
                  </span>
                  <span className="font-bold text-[#2e0854]">
                    {formatMeetingDateTime(displayItem.start_time)}
                  </span>
                </div>
              )}
              {displayItem.duration_minutes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                    Duration
                  </span>
                  <span className="font-bold text-[#2e0854]">
                    {displayItem.duration_minutes} min
                  </span>
                </div>
              )}
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                  Status
                </span>
                <span
                  className={`font-bold ${
                    meetingEnded
                      ? "text-gray-500"
                      : meetingUpcoming
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }`}
                >
                  {meetingEnded
                    ? "Ended"
                    : meetingUpcoming
                      ? "Not started yet"
                      : "Live now"}
                </span>
              </div>
            </div>

            {!canJoinMeeting ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 flex items-start gap-2">
                <HiOutlineLockClosed className="text-lg mt-0.5 shrink-0" />
                <span>
                  {!isAuthenticated
                    ? "Log in and enroll to join this meeting on Zoom."
                    : "Enroll in this course or unlock this item to join the meeting."}
                </span>
              </div>
            ) : meetingUpcoming && !isStaffViewer ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold">This meeting has not started yet.</p>
                <p className="mt-2 text-xs">
                  The join button will become available at{" "}
                  {formatMeetingDateTime(displayItem.start_time)}.
                </p>
              </div>
            ) : meetingEnded ? (
              <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 text-center">
                <HiOutlineVideoCamera className="text-4xl text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">This meeting has ended.</p>
                <p className="text-xs text-gray-500 mt-2">
                  The scheduled meeting window is closed.
                </p>
              </div>
            ) : (
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <HiOutlineVideoCamera className="text-4xl text-emerald-600 mx-auto mb-3" />
                  <p className="font-semibold text-emerald-800 mb-1">
                    {meetingLive
                      ? "The meeting is live"
                      : "Host early access"}
                  </p>
                  <p className="text-xs text-emerald-700 mb-4">
                    Join this meeting on Zoom using the link below.
                  </p>
                  {joinUrl ? (
                    <button
                      type="button"
                      onClick={handleJoinZoom}
                      disabled={zoomJoinLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      <HiOutlineVideoCamera className="text-lg" />
                      {zoomJoinLoading ? "Opening Zoom..." : "Join on Zoom"}
                    </button>
                  ) : (
                    <p className="text-xs text-emerald-800">
                      The Zoom join link is not available yet.
                    </p>
                  )}
                  {meetingPassword && (
                    <p className="text-xs text-emerald-800 mt-3">
                      Meeting password:{" "}
                      <span className="font-mono font-bold">{meetingPassword}</span>
                    </p>
                  )}
                  {zoomJoinError && (
                    <p className="text-xs text-brand mt-3">{zoomJoinError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
            <HiOutlineDocumentText className="text-3xl mx-auto mb-2" />
            <p>This content type is not supported in preview mode.</p>
          </div>
        );
    }
  };

  // ─── Render Page ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <Link
          to={`/courses/${slug}`}
          className="inline-flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-[#2e0854] transition-colors mb-6 group"
        >
          <HiOutlineArrowLeft className="text-base group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Course</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {displayItem.item_type?.replace("_", " ")}
                  </span>
                  {isFreePreview ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <HiOutlineEye className="text-xs" /> Free Preview
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <HiOutlineCheckCircle className="text-xs" /> Enrolled
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-[#2e0854]">
                  {displayItem.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {courseTitle} {chapterTitle && ` • ${chapterTitle}`}
                </p>
                {durSec && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <HiOutlineClock className="text-sm" /> {fmtDur(durSec)}
                  </p>
                )}
              </div>

              {/* Content */}
              <div className="p-4">{renderContent()}</div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#2e0854]">Details</h3>
                <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <p className="flex items-center gap-2">
                    <HiOutlineBookOpen className="text-base text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-700">
                      {courseTitle}
                    </span>
                  </p>
                  {chapterTitle && (
                    <p className="flex items-center gap-2">
                      <HiOutlineDocumentText className="text-base text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-700">
                        {chapterTitle}
                      </span>
                    </p>
                  )}
                  {durSec && (
                    <p className="flex items-center gap-2">
                      <HiOutlineClock className="text-base text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-700">
                        {fmtDur(durSec)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Enrollment status */}
              <div className="pt-3 border-t border-gray-100">
                {isAuthenticated && isEnrolled ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center text-xs text-emerald-700">
                    <HiOutlineCheckCircle className="text-xl mx-auto mb-1" />
                    <p className="font-bold">You are enrolled</p>
                    <p className="mt-1">
                      You have full access to this content.
                    </p>
                  </div>
                ) : (
                  <Link
                    to={`/courses/${slug}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
                  >
                    <HiOutlineCheckCircle className="text-base" />
                    {isAuthenticated
                      ? "Enroll in This Course"
                      : "Log in to Enroll"}
                  </Link>
                )}
                {!isAuthenticated && (
                  <p className="text-[10px] text-gray-400 text-center mt-2">
                    Log in to enroll and access all content
                  </p>
                )}
                {isAuthenticated && !isEnrolled && (
                  <p className="text-[10px] text-gray-400 text-center mt-2">
                    Enroll to unlock the complete learning experience
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center text-xs text-gray-500">
              {isFreePreview ? (
                <p>
                  This is a{" "}
                  <span className="font-bold text-emerald-700">
                    free preview
                  </span>
                  .
                  <br />
                  {isEnrolled
                    ? "You are enrolled – enjoy full access!"
                    : "Enroll to unlock the complete learning experience."}
                </p>
              ) : (
                <p>
                  {isEnrolled ? (
                    <>
                      <HiOutlineCheckCircle className="text-emerald-600 text-lg mx-auto mb-1" />
                      <span className="font-bold text-emerald-700">
                        You are enrolled!
                      </span>
                      <br />
                      You have full access to this content.
                    </>
                  ) : (
                    <>
                      <HiOutlineLockClosed className="text-gray-400 text-lg mx-auto mb-1" />
                      <span className="font-bold text-gray-600">
                        Enrolled content
                      </span>
                      <br />
                      This content is available to enrolled students only.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseItemPreviewPage;
