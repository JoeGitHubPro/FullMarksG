import React, { useEffect, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import AiChatMessageContent from "./AiChatMessageContent";

const ROLE_FILTERS = ["all", "admin", "instructor", "assistant", "student", "parent", "guest"];

const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString();
};

const AiChatConversationsPanel = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.getAiConversations({
          page,
          limit: 15,
          role: roleFilter === "all" ? undefined : roleFilter,
        });

        if (res.success) {
          setConversations(res.data?.items || []);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        setError(err.message || t("dashboard.aiChatbot.conversationsLoadError"));
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [page, roleFilter, t]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null);
      return undefined;
    }

    const loadConversation = async () => {
      setDetailLoading(true);
      setError("");

      try {
        const res = await api.getAiConversation(selectedId);
        if (res.success) {
          setSelectedConversation(res.data);
        }
      } catch (err) {
        setError(err.message || t("dashboard.aiChatbot.conversationLoadError"));
      } finally {
        setDetailLoading(false);
      }
    };

    loadConversation();
  }, [selectedId, t]);

  const totalPages = Math.max(Math.ceil(total / 15), 1);

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading">
            {t("dashboard.aiChatbot.conversationsTitle")}
          </h2>
          <p className="text-xs font-light text-gray-400">
            {t("dashboard.aiChatbot.conversationsDesc")}
          </p>
        </div>

        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setPage(1);
            setSelectedId(null);
          }}
          className="rounded-xl border border-gray-100 px-3 py-2 text-xs text-[#2e0854] outline-none focus:border-violet-200"
        >
          {ROLE_FILTERS.map((role) => (
            <option key={role} value={role}>
              {t(`dashboard.aiChatbot.roles.${role}`)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-brand-purple">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-2">
          {loading ? (
            <p className="text-xs text-gray-400">
              {t("dashboard.aiChatbot.conversationsLoading")}
            </p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-400">
              {t("dashboard.aiChatbot.conversationsEmpty")}
            </p>
          ) : (
            conversations.map((conversation) => {
              const isActive = selectedId === conversation.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-start transition-colors ${
                    isActive
                      ? "border-violet-200 bg-violet-50"
                      : "border-gray-100 bg-white hover:border-violet-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">
                      {conversation.user_name ||
                        t("dashboard.aiChatbot.anonymousGuest")}
                    </p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                      {conversation.user_role || "guest"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                    {conversation.last_message ||
                      t("dashboard.aiChatbot.noMessagesYet")}
                  </p>
                  <p className="mt-2 text-[10px] text-gray-400">
                    {formatDateTime(conversation.updated_at)} ·{" "}
                    {conversation.message_count || 0}{" "}
                    {t("dashboard.aiChatbot.messagesLabel")}
                  </p>
                </button>
              );
            })
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-xl border border-gray-100 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-40"
              >
                {t("dashboard.common.back")}
              </button>
              <span className="text-xs text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-xl border border-gray-100 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-40"
              >
                {t("dashboard.common.next")}
              </button>
            </div>
          )}
        </div>

        <div className="min-h-[360px] rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          {!selectedId ? (
            <p className="text-xs text-gray-400">
              {t("dashboard.aiChatbot.selectConversation")}
            </p>
          ) : detailLoading ? (
            <p className="text-xs text-gray-400">
              {t("dashboard.aiChatbot.conversationLoading")}
            </p>
          ) : selectedConversation ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-sm font-bold">
                  {selectedConversation.conversation.user_name ||
                    t("dashboard.aiChatbot.anonymousGuest")}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedConversation.conversation.user_role || "guest"} ·{" "}
                  {formatDateTime(selectedConversation.conversation.updated_at)}
                </p>
                {selectedConversation.conversation.email && (
                  <p className="mt-1 text-xs text-gray-400">
                    {selectedConversation.conversation.email}
                  </p>
                )}
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        message.role === "user"
                          ? "bg-brand text-white"
                          : "bg-white text-gray-700 border border-gray-100"
                      }`}
                    >
                      <AiChatMessageContent
                        content={message.content}
                        isUser={message.role === "user"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AiChatConversationsPanel;
