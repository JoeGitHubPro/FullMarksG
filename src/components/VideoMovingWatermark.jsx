import React, { useEffect, useState } from "react";

const CORNERS = [
  { top: "4%", left: "4%" },
  { top: "4%", right: "4%", left: "auto" },
  { bottom: "4%", left: "4%", top: "auto" },
  { bottom: "4%", right: "4%", top: "auto", left: "auto" },
];

const pickNextCornerIndex = (currentIndex) => {
  if (CORNERS.length <= 1) return 0;
  let next = currentIndex;
  while (next === currentIndex) {
    next = Math.floor(Math.random() * CORNERS.length);
  }
  return next;
};

const VideoMovingWatermark = ({ label, intervalMs = 15000 }) => {
  const [cornerIndex, setCornerIndex] = useState(0);

  useEffect(() => {
    if (!label) return undefined;

    const intervalId = window.setInterval(() => {
      setCornerIndex((current) => pickNextCornerIndex(current));
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [label, intervalMs]);

  if (!label) return null;

  return (
    <div
      className="absolute z-[25] pointer-events-none select-none"
      style={CORNERS[cornerIndex]}
    >
      <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-[2px] border border-white/10 shadow-lg">
        <p className="text-[11px] sm:text-xs font-semibold text-white/90 whitespace-nowrap tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
};

export default VideoMovingWatermark;
