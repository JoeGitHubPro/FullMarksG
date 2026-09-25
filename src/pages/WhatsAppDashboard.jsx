import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import {
  HiOutlineChat,
  HiOutlineRefresh,
  HiOutlinePlay,
  HiOutlineStop,
  HiOutlineLogout,
  HiOutlineExclamationCircle,
  HiOutlineQrcode,
  HiOutlinePhone,
} from "react-icons/hi";

// Statuses where the gateway is still settling — worth polling quickly.
const TRANSITIONAL_STATUSES = [
  "created",
  "initializing",
  "qr_ready",
  "authenticating",
];

const STATUS_STYLES = {
  ready: "bg-green-100 text-green-700",
  qr_ready: "bg-amber-100 text-amber-700",
  authenticating: "bg-amber-100 text-amber-700",
  initializing: "bg-amber-100 text-amber-700",
  created: "bg-gray-100 text-gray-500",
  disconnected: "bg-gray-100 text-gray-500",
  action_required: "bg-violet-50 text-brand",
  failed: "bg-violet-50 text-brand",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const WhatsAppDashboard = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState(null);
  const [showPairing, setShowPairing] = useState(false);
  const pollRef = useRef(null);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const fetchStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getWhatsAppStatus();
      if (res.success) {
        setStatus(res.data);
        setError("");
        if (res.data.status !== "qr_ready") {
          setQr(null);
          setPairingCode(null);
        }
      }
    } catch (err) {
      setError(err.message || t("dashboard.whatsapp.loadFailed"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  const fetchQr = useCallback(async () => {
    try {
      const res = await api.getWhatsAppQrCode();
      if (res.success) setQr(res.data);
    } catch {
      // QR isn't ready yet or the session moved on — the next status poll
      // will correct the view.
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll while the session is in a transitional state so the QR / status
  // stays live without the admin having to refresh.
  useEffect(() => {
    clearInterval(pollRef.current);
    if (status && TRANSITIONAL_STATUSES.includes(status.status)) {
      pollRef.current = setInterval(() => fetchStatus({ silent: true }), 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [status, fetchStatus]);

  useEffect(() => {
    if (status?.status === "qr_ready" && !qr) {
      fetchQr();
    }
  }, [status, qr, fetchQr]);

  const runAction = async (action, successKey) => {
    setActionLoading(true);
    setError("");
    try {
      const res = await action();
      if (res.success) {
        setStatus(res.data);
        triggerSuccess(t(successKey));
        setQr(null);
        setPairingCode(null);
      } else {
        setError(res.message || t("dashboard.whatsapp.actionFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.whatsapp.actionFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = () =>
    runAction(api.startWhatsAppSession, "dashboard.whatsapp.started");

  const handleStop = () =>
    runAction(api.stopWhatsAppSession, "dashboard.whatsapp.stopped");

  const handleLogout = () => {
    if (!window.confirm(t("dashboard.whatsapp.logoutConfirm"))) return;
    runAction(api.logoutWhatsAppSession, "dashboard.whatsapp.loggedOut");
  };

  const handleForceKill = () => {
    if (!window.confirm(t("dashboard.whatsapp.forceKillConfirm"))) return;
    runAction(api.forceKillWhatsAppSession, "dashboard.whatsapp.forceKilled");
  };

  const handleRequestPairingCode = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await api.requestWhatsAppPairingCode(phoneNumber.trim());
      if (res.success) {
        setPairingCode(res.data.pairingCode);
      } else {
        setError(res.message || t("dashboard.whatsapp.actionFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.whatsapp.actionFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = status?.status;
  const engineLoaded = !!status?.engineLoaded;
  const canStart = !engineLoaded;
  const isReady = s === "ready";
  const isQrReady = s === "qr_ready";

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
      <div>
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {t("dashboard.whatsapp.badge")}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3 flex items-center gap-2">
          <HiOutlineChat className="text-brand-purple" />
          {t("dashboard.whatsapp.title")}
        </h1>
        <p className="text-sm text-gray-400 font-light mt-2 max-w-2xl">
          {t("dashboard.whatsapp.subtitle")}
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                STATUS_STYLES[s] || "bg-gray-100 text-gray-500"
              }`}
            >
              {t(`dashboard.whatsapp.status.${s}`) || s || "—"}
            </span>
            {status?.name && (
              <span className="text-xs text-gray-400 font-mono">
                {status.name}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fetchStatus()}
            disabled={actionLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-purple disabled:opacity-50"
          >
            <HiOutlineRefresh /> {t("dashboard.common.retry")}
          </button>
        </div>

        {isReady && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("dashboard.whatsapp.phone")}
              </p>
              <p className="font-semibold mt-1">{status.phone || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("dashboard.whatsapp.linkedAs")}
              </p>
              <p className="font-semibold mt-1">{status.pushName || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("dashboard.whatsapp.connectedAt")}
              </p>
              <p className="font-semibold mt-1">
                {formatDate(status.connectedAt)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("dashboard.whatsapp.lastActive")}
              </p>
              <p className="font-semibold mt-1">
                {formatDate(status.lastActive)}
              </p>
            </div>
          </div>
        )}

        {(status?.lastError || status?.restriction) && (
          <div className="flex items-start gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-brand">
            <HiOutlineExclamationCircle className="text-base shrink-0 mt-0.5" />
            <span>{status.lastError || JSON.stringify(status.restriction)}</span>
          </div>
        )}

        {isQrReady && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 p-4 bg-gray-50/70 rounded-2xl">
              {qr?.qrCode ? (
                <img
                  src={qr.qrCode}
                  alt="WhatsApp QR code"
                  className="w-56 h-56 rounded-xl border border-gray-100 bg-white p-2"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-gray-300">
                  <HiOutlineQrcode className="text-6xl" />
                </div>
              )}
              <p className="text-xs text-gray-500 text-center max-w-sm">
                {t("dashboard.whatsapp.qrHint")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPairing((v) => !v)}
              className="text-xs font-semibold text-brand-purple hover:underline"
            >
              {showPairing
                ? t("dashboard.whatsapp.usePairingCodeHide")
                : t("dashboard.whatsapp.usePairingCode")}
            </button>

            {showPairing && (
              <form
                onSubmit={handleRequestPairingCode}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t("dashboard.whatsapp.phonePlaceholder")}
                  className="flex-1 border border-gray-200 rounded-xl p-2.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !phoneNumber.trim()}
                  className="px-4 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <HiOutlinePhone /> {t("dashboard.whatsapp.getCode")}
                </button>
              </form>
            )}

            {pairingCode && (
              <div className="text-center p-4 bg-violet-50 border border-violet-200 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-purple">
                  {t("dashboard.whatsapp.pairingCode")}
                </p>
                <p className="text-2xl font-black tracking-[0.3em] mt-1 font-mono">
                  {pairingCode}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
          {canStart && (
            <button
              type="button"
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
            >
              <HiOutlinePlay /> {t("dashboard.whatsapp.startSession")}
            </button>
          )}
          {engineLoaded && (
            <button
              type="button"
              onClick={handleStop}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              <HiOutlineStop /> {t("dashboard.whatsapp.stopSession")}
            </button>
          )}
          {engineLoaded && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 border border-violet-200 text-brand-purple rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              <HiOutlineLogout /> {t("dashboard.whatsapp.logout")}
            </button>
          )}
          {engineLoaded && (
            <button
              type="button"
              onClick={handleForceKill}
              disabled={actionLoading}
              className="ms-auto flex items-center gap-1.5 px-4 py-2 text-gray-400 hover:text-brand-purple rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {t("dashboard.whatsapp.forceKill")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
