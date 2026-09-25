import { useEffect, useRef, useState } from "react";
import { HiOutlinePlus, HiOutlineSparkles } from "react-icons/hi";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import { getAiSessionId, resetAiSessionId } from "../utils/aiSession";
import AiChatMessageContent from "./AiChatMessageContent";

const AiChatPanel = ({
  compact = false,
  className = "",
  allowNewChat = false,
  sessionScope = "public",
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const sessionIdRef = useRef(getAiSessionId(sessionScope));
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: messages.length > 0 ? "smooth" : "auto",
    });
  }, [messages, sending]);

  const panelHeightClass = compact ? "h-[420px] w-80" : "h-[560px]";

  const handleNewChat = () => {
    if (sending) return;
    sessionIdRef.current = resetAiSessionId(sessionScope);
    setMessages([]);
    setInput("");
    setError("");
  };

  const handleSend = async (event) => {
    event?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const res = await api.sendAiMessage({
        message: text,
        history: messages,
        sessionId: sessionIdRef.current,
      });

      if (res.success && res.data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.data.reply },
        ]);
      } else {
        throw new Error(res.message || t("support.aiError"));
      }
    } catch (err) {
      setError(err.message || t("support.aiError"));
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-brand/10 ${panelHeightClass} ${className}`}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-brand-purple">
          <HiOutlineSparkles className="text-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#2e0854] font-heading">
            {t("support.aiTitle")}
          </h3>
          <p className="text-[11px] font-light text-gray-400">
            {t("support.aiSubtitle")}
          </p>
        </div>
        {allowNewChat && (
          <button
            type="button"
            onClick={handleNewChat}
            disabled={sending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-100 px-3 py-2 text-[11px] font-bold text-gray-600 transition-colors hover:border-violet-100 hover:text-brand-purple disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HiOutlinePlus className="text-sm" />
            {t("dashboard.aiChatbot.newChat")}
          </button>
        )}
      </div>

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
      >
        {messages.length === 0 && (
          <p className="text-xs font-light leading-relaxed text-gray-400">
            {allowNewChat
              ? t("dashboard.aiChatbot.previewWelcome")
              : t("support.aiWelcome")}
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                message.role === "user"
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-gray-700"
              }`}
            >
              <AiChatMessageContent
                content={message.content}
                isUser={message.role === "user"}
              />
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-400">
              {t("support.aiTyping")}
            </div>
          </div>
        )}

      </div>

      <div className="shrink-0 border-t border-gray-100">
        {error && (
          <p className="px-4 pt-2 text-[11px] text-brand-purple">{error}</p>
        )}

        <form onSubmit={handleSend} className="p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend(event);
                }
              }}
              rows={compact ? 2 : 3}
              placeholder={t("support.aiPlaceholder")}
              className="max-h-24 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-100 px-3 py-2 text-xs text-[#2e0854] outline-none transition-colors focus:border-violet-200"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("support.aiSend")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AiChatPanel;
