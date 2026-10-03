import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineX,
  HiOutlineXCircle,
} from "react-icons/hi";

// ============================================================================
// FeedbackContext — styled replacements for window.confirm() / window.alert()
// ============================================================================
// The browser's native confirm()/alert() are unstyled, block the whole tab,
// and look completely out of place next to the rest of this dashboard. This
// provider renders a themed confirm dialog and toast stack instead, exposed
// through two hooks:
//   const confirm = useConfirm();       // confirm({ message, ... }) -> Promise<boolean>
//   const toast = useToast();           // toast.success("Saved"), toast.error("...")
// Mounted once (in main.jsx) so any page can use either hook without wiring
// its own modal/toast markup.

const FeedbackContext = createContext(null);

const CONFIRM_TONES = {
  default: {
    icon: HiOutlineExclamationCircle,
    iconWrap: "bg-violet-50 text-brand-purple",
    confirmBtn: "bg-brand text-white hover:bg-brand-hover",
  },
  danger: {
    icon: HiOutlineExclamation,
    iconWrap: "bg-red-50 text-red-500",
    confirmBtn: "bg-red-600 text-white hover:bg-red-700",
  },
};

const TOAST_STYLES = {
  success: {
    icon: HiOutlineCheckCircle,
    ring: "border-emerald-100",
    iconColor: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  error: {
    icon: HiOutlineXCircle,
    ring: "border-red-100",
    iconColor: "text-red-500",
    bar: "bg-red-500",
  },
  info: {
    icon: HiOutlineInformationCircle,
    ring: "border-violet-100",
    iconColor: "text-brand-purple",
    bar: "bg-brand-purple",
  },
};

const TOAST_DURATION_MS = 4500;

export const FeedbackProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState(null);
  const [closing, setClosing] = useState(false);
  const resolveRef = useRef(null);

  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    (type, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      toastTimers.current[id] = setTimeout(
        () => dismissToast(id),
        TOAST_DURATION_MS,
      );
    },
    [dismissToast],
  );

  const toast = useMemo(
    () => ({
      success: (message) => pushToast("success", message),
      error: (message) => pushToast("error", message),
      info: (message) => pushToast("info", message),
    }),
    [pushToast],
  );

  const closeConfirm = useCallback((result) => {
    setClosing(true);
    setTimeout(() => {
      setConfirmState(null);
      setClosing(false);
      if (resolveRef.current) {
        resolveRef.current(result);
        resolveRef.current = null;
      }
    }, 150);
  }, []);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        title: opts.title || "",
        message: opts.message || "",
        confirmLabel: opts.confirmLabel || "Confirm",
        cancelLabel: opts.cancelLabel || "Cancel",
        tone: opts.tone === "danger" ? "danger" : "default",
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  const tone = confirmState
    ? CONFIRM_TONES[confirmState.tone] || CONFIRM_TONES.default
    : CONFIRM_TONES.default;
  const ToneIcon = tone.icon;

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className={`fixed inset-0 z-[999] flex items-center justify-center px-4 transition-opacity duration-150 ${
            closing ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="absolute inset-0 bg-[#1a0433]/40 backdrop-blur-sm"
            onClick={() => closeConfirm(false)}
          />
          <div
            className={`relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 transition-all duration-150 ${
              closing ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}
            role="alertdialog"
            aria-modal="true"
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-4 ${tone.iconWrap}`}
            >
              <ToneIcon />
            </div>
            {confirmState.title && (
              <h3 className="text-base font-black text-[#2e0854] mb-1.5">
                {confirmState.title}
              </h3>
            )}
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              {confirmState.message}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => closeConfirm(true)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${tone.confirmBtn}`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast stack */}
      <div className="fixed z-[1000] bottom-5 inset-x-0 flex flex-col items-center gap-2 px-4 pointer-events-none sm:items-end sm:right-5 sm:left-auto sm:bottom-5">
        {toasts.map((item) => {
          const style = TOAST_STYLES[item.type] || TOAST_STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={item.id}
              className={`pointer-events-auto w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm bg-white border ${style.ring} rounded-2xl shadow-lg overflow-hidden animate-fadeIn`}
            >
              <div className="flex items-start gap-2.5 px-4 py-3.5">
                <Icon className={`text-lg shrink-0 mt-0.5 ${style.iconColor}`} />
                <p className="text-xs font-semibold text-[#2e0854] leading-relaxed flex-1">
                  {item.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  className="text-gray-300 hover:text-gray-500 shrink-0"
                >
                  <HiOutlineX />
                </button>
              </div>
              <div className={`h-0.5 ${style.bar} opacity-70`} />
            </div>
          );
        })}
      </div>
    </FeedbackContext.Provider>
  );
};

const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useConfirm/useToast must be used within <FeedbackProvider>");
  }
  return ctx;
};

export const useConfirm = () => useFeedback().confirm;
export const useToast = () => useFeedback().toast;
