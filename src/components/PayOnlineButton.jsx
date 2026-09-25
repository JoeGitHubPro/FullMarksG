import React, { useState } from "react";
import { HiOutlineCreditCard, HiOutlineCheck, HiOutlineX } from "react-icons/hi";
import { api } from "../api";
import { useTranslation } from "../i18n/LanguageContext";

const CHECKOUT_SCRIPT_URL =
  import.meta.env.VITE_GEIDEA_CHECKOUT_SCRIPT_URL ||
  "https://www.merchant.geidea.net/hpp/geideaCheckout.min.js";

let sdkPromise = null;
const loadGeideaSDK = () => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.GeideaCheckout) return resolve(window.GeideaCheckout);
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.onload = () => resolve(window.GeideaCheckout);
    script.onerror = () => reject(new Error("Failed to load payment SDK."));
    document.head.appendChild(script);
  });
  return sdkPromise;
};

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

// Pay online for a course or category bundle via Geidea. Access is only
// ever granted from the backend once Geidea's server-to-server callback
// confirms the payment — this component polls order status for that
// confirmation rather than trusting the checkout SDK's own client-side
// success/error callbacks, which are informational only.
const PayOnlineButton = ({ itemType, itemId, amount, currency = "EGP", onPaid }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState("idle"); // idle | starting | confirming | success | failed
  const [error, setError] = useState("");

  const pollOrder = (reference) => {
    const startedAt = Date.now();
    setPhase("confirming");

    const tick = async () => {
      try {
        const res = await api.getPaymentOrderStatus(reference);
        const status = res?.data?.status;
        if (status === "paid") {
          setPhase("success");
          if (onPaid) onPaid();
          return;
        }
        if (status === "failed" || status === "cancelled") {
          setPhase("failed");
          setError(res?.data?.response_message || t("payment.failed"));
          return;
        }
      } catch (_err) {
        // transient network hiccup — keep polling until timeout
      }

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setPhase("failed");
        setError(t("payment.timeout"));
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };

    setTimeout(tick, POLL_INTERVAL_MS);
  };

  const handlePayClick = async () => {
    setError("");
    setPhase("starting");
    try {
      const [GeideaCheckout, orderRes] = await Promise.all([
        loadGeideaSDK(),
        api.createPaymentCheckout(itemType, itemId),
      ]);

      if (!orderRes.success) {
        throw new Error(orderRes.message || t("payment.failed"));
      }

      const { sessionId, merchantReferenceId } = orderRes.data;

      const checkout = new GeideaCheckout(
        () => pollOrder(merchantReferenceId), // onSuccess (client-side signal only)
        () => pollOrder(merchantReferenceId), // onError — still confirm server-side
        () => setPhase("idle"), // onCancel — user backed out, nothing to confirm
      );
      checkout.startPayment(sessionId);
    } catch (err) {
      setPhase("failed");
      setError(err.message || t("payment.failed"));
    }
  };

  if (phase === "success") {
    return (
      <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-semibold text-xs py-3 rounded-xl">
        <HiOutlineCheck /> {t("payment.success")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayClick}
        disabled={phase === "starting" || phase === "confirming"}
        className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-xs py-3 rounded-xl transition-all disabled:opacity-60"
      >
        <HiOutlineCreditCard />
        {phase === "starting"
          ? t("payment.starting")
          : phase === "confirming"
            ? t("payment.confirming")
            : t("payment.payOnline", { amount, currency })}
      </button>
      {phase === "failed" && (
        <p className="text-[11px] text-brand font-semibold flex items-center gap-1">
          <HiOutlineX /> {error}
        </p>
      )}
    </div>
  );
};

export default PayOnlineButton;
