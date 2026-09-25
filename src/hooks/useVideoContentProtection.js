import { useEffect } from "react";

// Vimeo's own keyboard shortcuts still reach the iframe if it ever takes focus,
// and they seek: arrows are ±5s, J/L are ±10s, and a digit jumps to that
// percentage of the video. Left alone they are a hole straight through the
// forward-seek lock, so they are swallowed alongside the devtools shortcuts.
const SEEK_KEYS = new Set([
  "arrowleft",
  "arrowright",
  "j",
  "l",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
]);

// Typing in a field must stay unaffected — the preview page has an unlock-code
// input and assignment/quiz forms on the very same screen.
const isTextEntry = (target) => {
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || target?.isContentEditable;
};

const useVideoContentProtection = (enabled) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const blockContextMenu = (event) => {
      event.preventDefault();
    };

    const blockShortcuts = (event) => {
      const key = event.key?.toLowerCase();

      if (key === "f12") {
        event.preventDefault();
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        if (event.shiftKey && ["i", "j", "c", "k"].includes(key)) {
          event.preventDefault();
          return;
        }
        if (["s", "u", "p", "c"].includes(key)) {
          event.preventDefault();
        }
        return;
      }

      if (SEEK_KEYS.has(key) && !isTextEntry(event.target)) {
        event.preventDefault();
      }
    };

    const blockDrag = (event) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockShortcuts);
    document.addEventListener("dragstart", blockDrag, true);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockShortcuts);
      document.removeEventListener("dragstart", blockDrag, true);
    };
  }, [enabled]);
};

export default useVideoContentProtection;
