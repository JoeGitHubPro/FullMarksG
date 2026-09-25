import React, { useEffect, useState } from "react";
import { HiOutlineSparkles } from "react-icons/hi";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import AiChatPanel from "../components/AiChatPanel";
import AiChatConversationsPanel from "../components/AiChatConversationsPanel";
import AiKnowledgePanel from "../components/AiKnowledgePanel";

const AiChatbotDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.getAiSettings();
        if (res.success) {
          setEnabled(!!res.data?.enabled);
          setConfigured(!!res.data?.configured);
          setSystemPrompt(res.data?.systemPrompt || "");
        }
      } catch (err) {
        setError(err.message || t("dashboard.aiChatbot.loadError"));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [t]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await api.updateAiSettings({
        enabled,
        systemPrompt,
      });

      if (res.success) {
        setEnabled(!!res.data?.enabled);
        setConfigured(!!res.data?.configured);
        setSystemPrompt(res.data?.systemPrompt || systemPrompt);
        setMessage(t("dashboard.aiChatbot.saved"));
      } else {
        throw new Error(res.message || t("dashboard.aiChatbot.saveError"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.aiChatbot.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fadeIn text-sm text-gray-400">
        {t("dashboard.aiChatbot.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#2e0854] animate-fadeIn">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight font-heading">
          {t("dashboard.aiChatbot.title")}
        </h1>
        <p className="text-sm font-light text-gray-400">
          {t("dashboard.aiChatbot.subtitle")}
        </p>
        <p className="text-xs font-light text-gray-400">
          {t("dashboard.aiChatbot.ragNote")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-brand-purple">
              <HiOutlineSparkles className="text-xl" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold font-heading">
                {t("dashboard.aiChatbot.settingsTitle")}
              </h2>
              <p className="text-xs font-light leading-relaxed text-gray-400">
                {t("dashboard.aiChatbot.settingsDesc")}
              </p>
            </div>
          </div>

          {!configured && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              {t("dashboard.aiChatbot.notConfigured")}
            </div>
          )}

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-4">
            <div>
              <p className="text-sm font-bold">
                {enabled
                  ? t("dashboard.aiChatbot.toggleOn")
                  : t("dashboard.aiChatbot.toggleOff")}
              </p>
              <p className="mt-1 text-xs font-light text-gray-400">
                {enabled
                  ? t("dashboard.aiChatbot.toggleOnDesc")
                  : t("dashboard.aiChatbot.toggleOffDesc")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={!configured || saving}
              onClick={() => setEnabled((value) => !value)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                enabled ? "bg-brand" : "bg-gray-200"
              } ${!configured ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <div className="space-y-2">
            <label
              htmlFor="ai-system-prompt"
              className="text-xs font-bold uppercase tracking-wide text-gray-500"
            >
              {t("dashboard.aiChatbot.systemPrompt")}
            </label>
            <textarea
              id="ai-system-prompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={8}
              className="w-full rounded-2xl border border-gray-100 px-4 py-3 text-sm text-[#2e0854] outline-none transition-colors focus:border-violet-200"
              placeholder={t("dashboard.aiChatbot.systemPromptPlaceholder")}
            />
          </div>

          {error && <p className="text-xs text-brand-purple">{error}</p>}
          {message && <p className="text-xs text-green-600">{message}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? t("dashboard.aiChatbot.saving")
              : t("dashboard.aiChatbot.save")}
          </button>
        </div>

        <div className="space-y-3 self-start lg:sticky lg:top-6">
          <div>
            <h2 className="text-lg font-bold font-heading">
              {t("dashboard.aiChatbot.previewTitle")}
            </h2>
            <p className="text-xs font-light text-gray-400">
              {enabled
                ? t("dashboard.aiChatbot.previewEnabled")
                : t("dashboard.aiChatbot.previewDisabled")}
            </p>
          </div>
          <AiChatPanel allowNewChat sessionScope="admin" />
        </div>
      </div>

      <AiKnowledgePanel />

      <AiChatConversationsPanel />
    </div>
  );
};

export default AiChatbotDashboard;
