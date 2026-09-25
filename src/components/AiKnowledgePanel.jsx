import React, { useEffect, useState } from "react";
import { HiOutlineBookOpen, HiOutlinePencilAlt, HiOutlineTrash } from "react-icons/hi";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";

const emptyForm = {
  question: "",
  answer: "",
  keywords: "",
  questionVariations: "",
  retrievalAction: "none",
  audience: "everyone",
};

const AUDIENCE_OPTIONS = ["everyone", "admin_only", "staff_only"];
const RETRIEVAL_ACTION_OPTIONS = [
  "none",
  "upcoming_zoom_meetings",
  "pending_student_work",
  "student_profile_lookup",
];

const AiKnowledgePanel = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadItems = async (searchTerm = search) => {
    setLoading(true);
    setError("");

    try {
      const res = await api.getAiKnowledge({ search: searchTerm, limit: 50 });
      if (res.success) {
        setItems(res.data?.items || []);
      }
    } catch (err) {
      setError(err.message || t("dashboard.aiChatbot.knowledgeLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [t]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        keywords: form.keywords.trim(),
        questionVariations: form.questionVariations.trim(),
        retrievalAction: form.retrievalAction,
        audience: form.audience,
      };

      const res = editingId
        ? await api.updateAiKnowledge(editingId, payload)
        : await api.createAiKnowledge(payload);

      if (res.success) {
        setMessage(
          editingId
            ? t("dashboard.aiChatbot.knowledgeUpdated")
            : t("dashboard.aiChatbot.knowledgeCreated"),
        );
        resetForm();
        await loadItems();
      } else {
        throw new Error(res.message || t("dashboard.aiChatbot.knowledgeSaveError"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.aiChatbot.knowledgeSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      question: item.question || "",
      answer: item.answer || "",
      keywords: item.keywords || "",
      questionVariations: item.question_variations || "",
      retrievalAction: item.retrieval_action || "none",
      audience: item.audience || "everyone",
    });
    setMessage("");
    setError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("dashboard.aiChatbot.knowledgeDeleteConfirm"))) return;

    try {
      const res = await api.deleteAiKnowledge(id);
      if (res.success) {
        if (editingId === id) resetForm();
        await loadItems();
        setMessage(t("dashboard.aiChatbot.knowledgeDeleted"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.aiChatbot.knowledgeDeleteError"));
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const res = await api.updateAiKnowledge(item.id, {
        isActive: !item.is_active,
      });
      if (res.success) {
        await loadItems();
      }
    } catch (err) {
      setError(err.message || t("dashboard.aiChatbot.knowledgeSaveError"));
    }
  };

  return (
    <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-brand-purple">
          <HiOutlineBookOpen className="text-xl" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-heading">
            {t("dashboard.aiChatbot.knowledgeTitle")}
          </h2>
          <p className="text-xs font-light leading-relaxed text-gray-400">
            {t("dashboard.aiChatbot.knowledgeDesc")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {editingId
            ? t("dashboard.aiChatbot.knowledgeEditTitle")
            : t("dashboard.aiChatbot.knowledgeAddTitle")}
        </p>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">
            {t("dashboard.aiChatbot.knowledgeQuestion")}
          </label>
          <input
            value={form.question}
            onChange={(event) =>
              setForm((current) => ({ ...current, question: event.target.value }))
            }
            placeholder={t("dashboard.aiChatbot.knowledgeQuestionPlaceholder")}
            className="w-full rounded-xl border border-gray-100 px-4 py-3 text-sm outline-none focus:border-violet-200"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">
            {t("dashboard.aiChatbot.knowledgeVariations")}
          </label>
          <textarea
            value={form.questionVariations}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                questionVariations: event.target.value,
              }))
            }
            rows={4}
            placeholder={t("dashboard.aiChatbot.knowledgeVariationsPlaceholder")}
            className="w-full rounded-xl border border-gray-100 px-4 py-3 text-sm outline-none focus:border-violet-200"
          />
          <p className="text-[11px] font-light text-gray-400">
            {t("dashboard.aiChatbot.knowledgeVariationsHint")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">
            {t("dashboard.aiChatbot.knowledgeRetrievalAction")}
          </label>
          <select
            value={form.retrievalAction}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                retrievalAction: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-gray-100 px-4 py-3 text-sm outline-none focus:border-violet-200"
          >
            {RETRIEVAL_ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`dashboard.aiChatbot.knowledgeRetrievalActions.${option}`)}
              </option>
            ))}
          </select>
          <p className="text-[11px] font-light text-gray-400">
            {t(
              `dashboard.aiChatbot.knowledgeRetrievalActionHelp.${form.retrievalAction}`,
            )}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">
            {t("dashboard.aiChatbot.knowledgeAnswer")}
          </label>
          <textarea
            value={form.answer}
            onChange={(event) =>
              setForm((current) => ({ ...current, answer: event.target.value }))
            }
            rows={5}
            placeholder={t("dashboard.aiChatbot.knowledgeAnswerPlaceholder")}
            className="w-full rounded-xl border border-gray-100 px-4 py-3 text-sm outline-none focus:border-violet-200"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">
            {t("dashboard.aiChatbot.knowledgeKeywords")}
          </label>
          <input
            value={form.keywords}
            onChange={(event) =>
              setForm((current) => ({ ...current, keywords: event.target.value }))
            }
            placeholder={t("dashboard.aiChatbot.knowledgeKeywordsPlaceholder")}
            className="w-full rounded-xl border border-gray-100 px-4 py-3 text-sm outline-none focus:border-violet-200"
          />
          <p className="text-[11px] font-light text-gray-400">
            {t("dashboard.aiChatbot.knowledgeKeywordsHint")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">
            {t("dashboard.aiChatbot.knowledgeAudience")}
          </label>
          <select
            value={form.audience}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                audience: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-gray-100 px-4 py-3 text-sm outline-none focus:border-violet-200"
          >
            {AUDIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`dashboard.aiChatbot.knowledgeAudienceOptions.${option}`)}
              </option>
            ))}
          </select>
          <p className="text-[11px] font-light text-gray-400">
            {t(`dashboard.aiChatbot.knowledgeAudienceHelp.${form.audience}`)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving
              ? t("dashboard.aiChatbot.saving")
              : editingId
                ? t("dashboard.aiChatbot.knowledgeUpdate")
                : t("dashboard.aiChatbot.knowledgeCreate")}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-100 px-4 py-2.5 text-xs font-bold text-gray-500"
            >
              {t("dashboard.common.cancel")}
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-xs text-brand-purple">{error}</p>}
      {message && <p className="text-xs text-green-600">{message}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("dashboard.aiChatbot.knowledgeSearchPlaceholder")}
          className="min-w-[220px] flex-1 rounded-xl border border-gray-100 px-4 py-2.5 text-sm outline-none focus:border-violet-200"
        />
        <button
          type="button"
          onClick={() => loadItems(search)}
          className="rounded-xl border border-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600 hover:border-violet-100 hover:text-brand-purple"
        >
          {t("dashboard.aiChatbot.knowledgeSearch")}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">
          {t("dashboard.aiChatbot.knowledgeLoading")}
        </p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400">
          {t("dashboard.aiChatbot.knowledgeEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-100 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-[#2e0854]">
                    {item.question}
                  </p>
                  <p className="text-xs leading-relaxed text-gray-600 whitespace-pre-wrap">
                    {item.answer}
                  </p>
                  {item.keywords && (
                    <p className="text-[11px] text-gray-400">
                      {t("dashboard.aiChatbot.knowledgeKeywordsLabel")}:{" "}
                      {item.keywords}
                    </p>
                  )}
                  {item.question_variations && (
                    <p className="text-[11px] text-gray-400 whitespace-pre-wrap">
                      {t("dashboard.aiChatbot.knowledgeVariationsLabel")}:{" "}
                      {item.question_variations}
                    </p>
                  )}
                  {item.retrieval_action && item.retrieval_action !== "none" && (
                    <p className="text-[11px] text-blue-600">
                      {t("dashboard.aiChatbot.knowledgeRetrievalActionLabel")}:{" "}
                      {t(
                        `dashboard.aiChatbot.knowledgeRetrievalActions.${item.retrieval_action}`,
                      )}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                      item.audience === "admin_only"
                        ? "bg-violet-50 text-violet-700"
                        : item.audience === "staff_only"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t(
                      `dashboard.aiChatbot.knowledgeAudienceOptions.${item.audience || "everyone"}`,
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                      item.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.is_active
                      ? t("dashboard.common.active")
                      : t("dashboard.common.inactive")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-purple"
                    aria-label={t("dashboard.common.edit")}
                  >
                    <HiOutlinePencilAlt />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-purple"
                    aria-label={t("dashboard.common.delete")}
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiKnowledgePanel;
