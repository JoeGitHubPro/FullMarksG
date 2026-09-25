// src/pages/PaymentReturnPage.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { HiOutlineCheck, HiOutlineX, HiOutlineArrowLeft } from "react-icons/hi";
import { api } from "../api";
import { useTranslation } from "../i18n/LanguageContext";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

// Geidea redirects the whole browser back here after a hosted-page payment
// (e.g. a 3-D Secure challenge). Just like PayOnlineButton, this page never
// trusts the query string itself (responseCode, etc.) for granting access —
// it only polls our own backend, which only reports "paid" once Geidea's
// signed server-to-server callback has actually confirmed it.
const PaymentReturnPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("ref");

  const [phase, setPhase] = useState(reference ? "confirming" : "invalid");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await api.getPaymentOrderStatus(reference);
        const status = res?.data?.status;
        if (status === "paid") {
          setPhase("success");
          return;
        }
        if (status === "failed" || status === "cancelled") {
          setPhase("failed");
          setMessage(res?.data?.response_message || t("payment.failed"));
          return;
        }
      } catch (_err) {
        // transient network hiccup — keep polling until timeout
      }

      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setPhase("timeout");
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-6 animate-fadeIn">
      <h1 className="font-heading font-black text-lg text-[#2e0854]">
        {t("payment.returnTitle")}
      </h1>

      {phase === "invalid" && (
        <p className="text-sm text-brand-purple font-semibold">
          {t("payment.invalidReturn")}
        </p>
      )}

      {phase === "confirming" && (
        <div className="space-y-4">
          <div className="w-8 h-8 mx-auto border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">{t("payment.confirming")}</p>
        </div>
      )}

      {phase === "success" && (
        <div className="flex flex-col items-center gap-2 bg-emerald-50 text-emerald-700 font-semibold text-sm py-6 rounded-2xl">
          <HiOutlineCheck className="text-2xl" />
          {t("payment.success")}
        </div>
      )}

      {phase === "failed" && (
        <div className="flex flex-col items-center gap-2 bg-violet-50 text-brand font-semibold text-sm py-6 rounded-2xl">
          <HiOutlineX className="text-2xl" />
          {message}
        </div>
      )}

      {phase === "timeout" && (
        <p className="text-sm text-gray-500">{t("payment.timeout")}</p>
      )}

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-brand-purple underline"
      >
        <HiOutlineArrowLeft />
        {t("common.backToHome")}
      </Link>
    </div>
  );
};

export default PaymentReturnPage;
