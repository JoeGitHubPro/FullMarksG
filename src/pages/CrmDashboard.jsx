import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import api, { getFileUrl } from "../api";
import {
  HiOutlineChatAlt2,
  HiOutlineSearch,
  HiOutlinePaperAirplane,
  HiOutlineUser,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
  HiOutlineArrowLeft,
  HiOutlineExclamationCircle,
  HiOutlineLink,
  HiOutlineCog,
  HiOutlineIdentification,
  HiOutlineAcademicCap,
  HiOutlineKey,
  HiOutlineCreditCard,
  HiOutlineAnnotation,
  HiOutlineUserGroup,
  HiOutlineTicket,
} from "react-icons/hi";
import { FaWhatsapp, FaFacebookMessenger } from "react-icons/fa";

// Polling intervals — assistants see new messages within a few seconds.
const LIST_POLL_MS = 5000;
const THREAD_POLL_MS = 4000;

// Skip background polling while the browser tab is hidden; the next tick
// after the agent comes back catches up.
const isPageHidden = () =>
  typeof document !== "undefined" && document.visibilityState === "hidden";

// Per-channel look + limits. `facebook` = Facebook Messenger.
const CHANNEL_META = {
  whatsapp: {
    icon: FaWhatsapp,
    dot: "bg-green-500",
    chip: "bg-green-50 text-green-700",
    maxLength: 4096,
  },
  facebook: {
    icon: FaFacebookMessenger,
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-600",
    maxLength: 2000,
  },
};
const channelMeta = (channel) => CHANNEL_META[channel] || CHANNEL_META.whatsapp;

const ChannelDot = ({ channel }) => {
  const meta = channelMeta(channel);
  const Icon = meta.icon;
  return (
    <span
      className={`absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full ${meta.dot} text-white flex items-center justify-center ring-2 ring-white`}
    >
      <Icon className="text-[9px]" />
    </span>
  );
};

const SetupChip = ({ ok, warn = false, children }) => (
  <span
    className={`rounded-md px-2 py-0.5 font-semibold ${
      ok
        ? "bg-green-50 text-green-700"
        : warn
          ? "bg-amber-50 text-amber-700"
          : "bg-red-50 text-red-600"
    }`}
  >
    {children}
  </span>
);

const SetupNotice = ({ warn = false, children }) => (
  <div
    className={`p-2 rounded-lg font-semibold whitespace-pre-line break-words ${
      warn
        ? "bg-amber-50 border border-amber-100 text-amber-800"
        : "bg-red-50 border border-red-100 text-red-700"
    }`}
  >
    {children}
  </div>
);

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "2-digit", month: "short" });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const displayName = (conv) => {
  const userName = [conv.user_first_name, conv.user_last_name]
    .filter(Boolean)
    .join(" ");
  return (
    userName ||
    conv.contact_name ||
    conv.contact_phone ||
    (conv.channel === "facebook" ? null : conv.external_chat_id)
  );
};

const initials = (name) =>
  String(name || "?")
    .replace(/^\+/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const Section = ({ icon: Icon, title, count, children }) => (
  <div className="border-t border-gray-100 pt-4">
    <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
      <Icon className="text-brand-purple text-sm" />
      {title}
      {typeof count === "number" && (
        <span className="ms-auto rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
          {count}
        </span>
      )}
    </h4>
    {children}
  </div>
);

const CrmDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ----- Conversation list -----
  const [conversations, setConversations] = useState([]);
  const [counts, setCounts] = useState({ open: 0, unread: 0 });
  const [channelFilter, setChannelFilter] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [quickFilter, setQuickFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ----- Selected thread -----
  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const lastMessageIdRef = useRef(0);
  // Always the conversation currently open — async responses compare against
  // it so a late reply for a previous chat never lands in the new one.
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  // ----- Profile panel -----
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileMobile, setShowProfileMobile] = useState(false);

  // ----- Support ticket from chat -----
  const emptyTicketForm = {
    subject: "",
    ticketType: "admin",
    courseId: "",
    category: "general",
    priority: "low",
    note: "",
    includeMessages: 10,
    notifyCustomer: true,
  };
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState(emptyTicketForm);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [ticketNotice, setTicketNotice] = useState(null);

  // Deep link: /dashboard/crm?conversation=<id> (e.g. from a Support ticket).
  const [searchParams] = useSearchParams();
  const linkedConversationId = Number(searchParams.get("conversation")) || null;
  const [linkPhone, setLinkPhone] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linking, setLinking] = useState(false);

  // ----- Admin: webhook setup -----
  const [showSetup, setShowSetup] = useState(false);
  const [webhook, setWebhook] = useState(null);
  const [webhookError, setWebhookError] = useState("");
  const [webhookBusy, setWebhookBusy] = useState(false);
  const [messenger, setMessenger] = useState(null);
  const [messengerError, setMessengerError] = useState("");
  const [messengerBusy, setMessengerBusy] = useState(false);

  useEffect(() => {
    if (linkedConversationId) {
      setStatusFilter("all");
      setSelectedId(linkedConversationId);
    }
  }, [linkedConversationId]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const fetchConversations = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setListLoading(true);
      try {
        const res = await api.getCrmConversations({
          status: statusFilter,
          channel: channelFilter,
          filter: quickFilter,
          search: debouncedSearch,
        });
        if (res.success) {
          setConversations(res.data || []);
          setCounts(res.counts || { open: 0, unread: 0 });
          setListError("");
        }
      } catch (err) {
        setListError(err.message || t("dashboard.crm.loadFailed"));
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    [statusFilter, channelFilter, quickFilter, debouncedSearch, t],
  );

  useEffect(() => {
    fetchConversations();
    const id = setInterval(() => {
      if (isPageHidden()) return;
      fetchConversations({ silent: true });
    }, LIST_POLL_MS);
    // Refresh right away when the agent returns to the tab.
    const onVisible = () => {
      if (!isPageHidden()) fetchConversations({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchConversations]);

  const loadProfile = useCallback(async (conversationId) => {
    setProfileLoading(true);
    try {
      const res = await api.getCrmConversationProfile(conversationId);
      if (selectedIdRef.current !== conversationId) return;
      if (res.success) setProfile(res);
    } catch (err) {
      if (selectedIdRef.current === conversationId) setProfile(null);
    } finally {
      if (selectedIdRef.current === conversationId) setProfileLoading(false);
    }
  }, []);

  // Full load when a conversation is opened.
  useEffect(() => {
    setConversation(null);
    setShowProfileMobile(false);
    if (!selectedId) return;
    let cancelled = false;
    setThreadLoading(true);
    setThreadError("");
    setSendError("");
    setMessages([]);
    setProfile(null);
    setLinkPhone("");
    setLinkError("");
    lastMessageIdRef.current = 0;
    stickToBottomRef.current = true;

    api
      .getCrmMessages(selectedId)
      .then((res) => {
        if (cancelled || !res.success) return;
        setConversation(res.conversation);
        setMessages(res.data || []);
        const last = res.data?.[res.data.length - 1];
        lastMessageIdRef.current = last ? last.id : 0;
        setConversations((current) =>
          current.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c)),
        );
      })
      .catch((err) => {
        if (!cancelled) setThreadError(err.message || t("dashboard.crm.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false);
      });

    loadProfile(selectedId);
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadProfile, t]);

  // Incremental polling for new messages in the open thread.
  useEffect(() => {
    if (!selectedId) return;
    const pollFor = selectedId;
    let inFlight = false;
    const id = setInterval(async () => {
      if (inFlight || isPageHidden()) return;
      inFlight = true;
      try {
        const res = await api.getCrmMessages(pollFor, lastMessageIdRef.current);
        // The agent switched chats while this request was in flight.
        if (selectedIdRef.current !== pollFor) return;
        if (!res.success) return;
        if (res.conversation) setConversation(res.conversation);
        if (res.data?.length) {
          setMessages((current) => {
            const known = new Set(current.map((m) => m.id));
            const fresh = res.data.filter((m) => !known.has(m.id));
            return fresh.length ? [...current, ...fresh] : current;
          });
          lastMessageIdRef.current = res.data[res.data.length - 1].id;
        }
      } catch (err) {
        // Transient — the next tick retries.
      } finally {
        inFlight = false;
      }
    }, THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [selectedId]);

  // Keep the view pinned to the newest message unless the agent scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleThreadScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    const sendTo = selectedId;
    setSending(true);
    setSendError("");
    stickToBottomRef.current = true;
    try {
      const res = await api.sendCrmMessage(sendTo, text);
      if (selectedIdRef.current !== sendTo) {
        // Sent fine, but the agent already moved to another chat.
        fetchConversations({ silent: true });
        return;
      }
      if (res.success && res.data) {
        setMessages((current) => [...current, res.data]);
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, res.data.id);
        setDraft("");
        fetchConversations({ silent: true });
      }
    } catch (err) {
      if (selectedIdRef.current !== sendTo) return;
      setSendError(err.message || t("dashboard.crm.sendFailed"));
      if (err.data?.id) {
        setMessages((current) => [...current, err.data]);
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, err.data.id);
      }
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const updateConversation = async (changes) => {
    if (!selectedId) return;
    try {
      const res = await api.updateCrmConversation(selectedId, changes);
      if (res.success) {
        setConversation(res.conversation);
        fetchConversations({ silent: true });
      }
    } catch (err) {
      setThreadError(err.message || t("dashboard.crm.updateFailed"));
    }
  };

  const handleLink = async (e) => {
    e.preventDefault();
    if (!linkPhone.trim() || !selectedId) return;
    setLinking(true);
    setLinkError("");
    try {
      const res = await api.linkCrmConversation(selectedId, linkPhone.trim());
      if (res.success) {
        setConversation(res.conversation);
        setLinkPhone("");
        loadProfile(selectedId);
        fetchConversations({ silent: true });
      }
    } catch (err) {
      setLinkError(err.message || t("dashboard.crm.linkFailed"));
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!selectedId) return;
    try {
      const res = await api.linkCrmConversation(selectedId, null);
      if (res.success) {
        setConversation(res.conversation);
        loadProfile(selectedId);
        fetchConversations({ silent: true });
      }
    } catch (err) {
      setLinkError(err.message || t("dashboard.crm.linkFailed"));
    }
  };

  // ----- Admin webhook setup -----
  const loadWebhook = useCallback(async () => {
    setWebhookError("");
    try {
      const res = await api.getCrmWebhookStatus();
      setWebhook(res.data || null);
    } catch (err) {
      setWebhook(err.data || null);
      setWebhookError(err.message || t("dashboard.crm.loadFailed"));
    }
  }, [t]);

  const loadMessenger = useCallback(async () => {
    setMessengerError("");
    try {
      const res = await api.getCrmMessengerSetup();
      setMessenger(res.data || null);
    } catch (err) {
      setMessengerError(err.message || t("dashboard.crm.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (isAdmin && showSetup) {
      loadWebhook();
      loadMessenger();
    }
  }, [isAdmin, showSetup, loadWebhook, loadMessenger]);

  const handleConnectMessenger = async () => {
    setMessengerBusy(true);
    setMessengerError("");
    try {
      const res = await api.connectCrmMessenger();
      setMessenger(res.data || null);
      const appHook = res.data?.result?.appWebhook;
      const pageSub = res.data?.result?.pageSubscription;
      const problems = [];
      if (res.data?.lastSync && res.data.lastSync.ok === false && res.data.lastSync.error) {
        problems.push(res.data.lastSync.error);
      }
      // Fresh conversations may have just been pulled in.
      fetchConversations({ silent: true });
      if (pageSub && pageSub.success === false) {
        problems.push(t("dashboard.crm.messengerSubscribeFailed", { detail: pageSub.error || "" }));
      }
      if (appHook && appHook.success === false) {
        problems.push(t("dashboard.crm.messengerCallbackManual", { detail: appHook.error || "" }));
      }
      if (problems.length) setMessengerError(problems.join("\n"));
    } catch (err) {
      setMessengerError(err.message || t("dashboard.crm.messengerConnectFailed"));
    } finally {
      setMessengerBusy(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setWebhookBusy(true);
    setWebhookError("");
    try {
      const res = await api.registerCrmWebhook();
      fetchConversations({ silent: true });
      if (res.data?.lastSync && res.data.lastSync.ok === false && res.data.lastSync.error) {
        setWebhookError(res.data.lastSync.error);
      } else if (res.data?.test && res.data.test.success === false) {
        setWebhookError(
          t("dashboard.crm.webhookTestFailed", {
            detail: res.data.test.error || res.data.test.statusCode || "",
          }),
        );
      }
      await loadWebhook();
    } catch (err) {
      setWebhookError(err.message || t("dashboard.crm.webhookRegisterFailed"));
    } finally {
      setWebhookBusy(false);
    }
  };

  const headerName = conversation
    ? displayName(conversation) || t("dashboard.crm.messengerUser")
    : "";

  const openTicketModal = () => {
    setTicketError("");
    setTicketForm({ ...emptyTicketForm });
    setShowTicketModal(true);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!selectedId || ticketBusy) return;
    const forConversation = selectedId;
    setTicketBusy(true);
    setTicketError("");
    try {
      const payload = {
        subject: ticketForm.subject.trim(),
        ticketType: ticketForm.ticketType,
        category: ticketForm.category,
        priority: ticketForm.priority,
        note: ticketForm.note,
        includeMessages: Number(ticketForm.includeMessages) || 0,
        notifyCustomer: !!ticketForm.notifyCustomer,
      };
      if (ticketForm.ticketType === "course") payload.courseId = Number(ticketForm.courseId);
      const res = await api.createCrmTicket(forConversation, payload);
      if (res.success) {
        setShowTicketModal(false);
        setTicketNotice({
          id: res.data.id,
          channel: res.data.ticketType,
          notifyFailed: res.data.notification && res.data.notification.sent === false,
        });
        if (selectedIdRef.current === forConversation) loadProfile(forConversation);
      }
    } catch (err) {
      setTicketError(err.message || t("dashboard.crm.ticket.failed"));
    } finally {
      setTicketBusy(false);
    }
  };

  useEffect(() => {
    setTicketNotice(null);
  }, [selectedId]);

  // ----- Create Support ticket from this chat -----
  const renderTicketModal = () => {
    if (!showTicketModal || !selectedId) return null;
    const enrollments = profile?.enrollments || [];
    const canCourse = enrollments.length > 0;
    const set = (key) => (e) =>
      setTicketForm((f) => ({
        ...f,
        [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      }));
    return (
      <div
        className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
        onClick={() => !ticketBusy && setShowTicketModal(false)}
      >
        <form
          onSubmit={handleCreateTicket}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 space-y-4 text-xs text-[#2e0854] max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center gap-2">
            <HiOutlineTicket className="text-brand-purple text-lg" />
            <h3 className="text-sm font-bold">{t("dashboard.crm.ticket.title")}</h3>
          </div>
          <p className="text-gray-500">
            {t("dashboard.crm.ticket.hint", { name: headerName })}
          </p>

          <label className="block space-y-1">
            <span className="font-semibold">{t("dashboard.crm.ticket.subject")}</span>
            <input
              type="text"
              value={ticketForm.subject}
              onChange={set("subject")}
              maxLength={255}
              required
              autoFocus
              dir="auto"
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-transparent focus:border-violet-200 focus:bg-white focus:outline-none"
            />
          </label>

          <div className="space-y-1">
            <span className="font-semibold">{t("dashboard.crm.ticket.channel")}</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["admin", "channelAdmin"],
                ["course", "channelCourse"],
              ].map(([value, key]) => (
                <button
                  key={value}
                  type="button"
                  disabled={value === "course" && !canCourse}
                  onClick={() =>
                    setTicketForm((f) => ({
                      ...f,
                      ticketType: value,
                      category: value === "course" ? "academic" : f.category,
                      courseId:
                        value === "course" && !f.courseId && enrollments[0]
                          ? String(enrollments[0].course_id)
                          : f.courseId,
                    }))
                  }
                  className={`rounded-xl border px-3 py-2 font-semibold text-start disabled:opacity-40 ${
                    ticketForm.ticketType === value
                      ? "border-violet-300 bg-violet-50 text-brand-purple"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t(`dashboard.crm.ticket.${key}`)}
                </button>
              ))}
            </div>
            {!canCourse && (
              <p className="text-[11px] text-gray-400">{t("dashboard.crm.ticket.courseNeedsStudent")}</p>
            )}
          </div>

          {ticketForm.ticketType === "course" && canCourse && (
            <label className="block space-y-1">
              <span className="font-semibold">{t("dashboard.crm.ticket.course")}</span>
              <select
                value={ticketForm.courseId}
                onChange={set("courseId")}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5"
              >
                {enrollments.map((e) => (
                  <option key={e.course_id} value={e.course_id}>
                    {e.course_title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-semibold">{t("dashboard.crm.ticket.category")}</span>
              <select
                value={ticketForm.category}
                onChange={set("category")}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5"
              >
                {["general", "technical", "billing", "academic"].map((c) => (
                  <option key={c} value={c}>
                    {t(`dashboard.support.category.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="font-semibold">{t("dashboard.crm.ticket.priority")}</span>
              <select
                value={ticketForm.priority}
                onChange={set("priority")}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5"
              >
                {["low", "medium", "high"].map((p) => (
                  <option key={p} value={p}>
                    {t(`dashboard.support.priority.${p}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="font-semibold">{t("dashboard.crm.ticket.note")}</span>
            <textarea
              value={ticketForm.note}
              onChange={set("note")}
              rows={3}
              dir="auto"
              placeholder={t("dashboard.crm.ticket.notePlaceholder")}
              className="w-full resize-none bg-gray-50 rounded-xl px-3 py-2.5 border border-transparent focus:border-violet-200 focus:bg-white focus:outline-none"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">{t("dashboard.crm.ticket.includeMessages")}</span>
            <select
              value={ticketForm.includeMessages}
              onChange={set("includeMessages")}
              className="bg-gray-50 rounded-xl px-3 py-2"
            >
              {[0, 5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? t("dashboard.crm.ticket.noMessages") : n}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ticketForm.notifyCustomer}
              onChange={set("notifyCustomer")}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold block">{t("dashboard.crm.ticket.notifyCustomer")}</span>
              <span className="text-gray-400">{t("dashboard.crm.ticket.notifyCustomerHint")}</span>
            </span>
          </label>

          {ticketError && (
            <div className="p-2 bg-red-50 border border-red-100 text-red-700 rounded-lg font-semibold">
              {ticketError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowTicketModal(false)}
              disabled={ticketBusy}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600"
            >
              {t("dashboard.crm.ticket.cancel")}
            </button>
            <button
              type="submit"
              disabled={ticketBusy || !ticketForm.subject.trim()}
              className="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold px-4 py-2"
            >
              {ticketBusy ? t("dashboard.crm.ticket.creating") : t("dashboard.crm.ticket.create")}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderTicketsSection = () => (
    <Section
      icon={HiOutlineTicket}
      title={t("dashboard.crm.ticket.linkedTickets")}
      count={profile?.tickets?.length || 0}
    >
      {profile?.tickets?.length ? (
        <ul className="space-y-1.5">
          {profile.tickets.map((tk) => (
            <li key={tk.id}>
              <Link
                to={`/dashboard/support?channel=${tk.ticket_type}&ticket=${tk.id}`}
                className="flex items-start gap-2 rounded-xl bg-gray-50 hover:bg-violet-50 px-3 py-2 text-xs"
              >
                <span className="font-mono text-gray-400">#{tk.id}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold block truncate" dir="auto">{tk.subject}</span>
                  {tk.course_title && (
                    <span className="text-[10px] text-gray-400 block truncate">{tk.course_title}</span>
                  )}
                </span>
                <span className="shrink-0 text-[9px] font-bold uppercase text-brand-purple">
                  {t(`dashboard.crm.ticket.status.${tk.status}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">{t("dashboard.crm.none")}</p>
      )}
      <button
        type="button"
        onClick={openTicketModal}
        className="mt-2 text-[11px] font-semibold text-brand-purple hover:underline"
      >
        + {t("dashboard.crm.ticket.open")}
      </button>
    </Section>
  );


  // ======================= RENDER =======================

  const renderConversationList = () => (
    <div
      className={`${selectedId ? "hidden lg:flex" : "flex"} flex-col bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden min-h-0`}
    >
      <div className="p-4 space-y-3 border-b border-gray-100">
        <div className="relative">
          <HiOutlineSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dashboard.crm.searchPlaceholder")}
            className="w-full bg-gray-50 text-xs rounded-xl ps-9 pe-3 py-2.5 border border-transparent focus:border-violet-200 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {["open", "closed", "all"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`flex-1 text-[11px] font-semibold rounded-lg py-1.5 transition-all ${
                statusFilter === s
                  ? "bg-white shadow-sm text-brand-purple"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t(`dashboard.crm.status.${s}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["", "filterAll"],
            ["unread", "filterUnread"],
            ["mine", "filterMine"],
            ["unassigned", "filterUnassigned"],
          ].map(([value, key]) => (
            <button
              key={key}
              type="button"
              onClick={() => setQuickFilter(value)}
              className={`text-[10px] font-semibold rounded-full px-2.5 py-1 border transition-all ${
                quickFilter === value
                  ? "border-violet-200 bg-violet-50 text-brand-purple"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t(`dashboard.crm.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {listLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listError ? (
          <div className="m-4 p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
            {listError}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 px-6 text-gray-400 text-xs">
            <HiOutlineChatAlt2 className="mx-auto text-3xl mb-2 text-gray-300" />
            {t("dashboard.crm.emptyList")}
          </div>
        ) : (
          conversations.map((conv) => {
            const name = displayName(conv) || t("dashboard.crm.messengerUser");
            const active = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-start flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors ${
                  active ? "bg-violet-50/70" : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                    conv.user_id
                      ? "bg-violet-100 text-brand-purple"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {initials(name)}
                  <ChannelDot channel={conv.channel} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{name}</span>
                    <span className="ms-auto text-[10px] text-gray-400 shrink-0">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs truncate ${
                        conv.unread_count > 0 ? "text-gray-800 font-medium" : "text-gray-400"
                      }`}
                    >
                      {conv.last_direction === "out" && (
                        <span className="text-gray-400">{t("dashboard.crm.youPrefix")} </span>
                      )}
                      {conv.last_message_preview || "—"}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="ms-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {conv.user_role ? (
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-purple">
                        {t(`dashboard.crm.roles.${conv.user_role}`)}
                      </span>
                    ) : (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-600">
                        {t("dashboard.crm.lead")}
                      </span>
                    )}
                    {conv.assignee_first_name && (
                      <span className="text-[9px] text-gray-400 truncate">
                        → {conv.assignee_first_name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderThread = () => {
    if (!selectedId) {
      return (
        <div className="hidden lg:flex flex-col items-center justify-center bg-white border border-gray-100 rounded-3xl shadow-sm text-center p-10 text-gray-400">
          <HiOutlineChatAlt2 className="text-5xl text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500">{t("dashboard.crm.selectConversation")}</p>
          <p className="text-xs mt-1 max-w-xs">{t("dashboard.crm.selectConversationHint")}</p>
        </div>
      );
    }

    const isClosed = conversation?.status === "closed";
    const assignedToMe = conversation?.assigned_to === user?.id;

    return (
      <div
        className={`${showProfileMobile ? "hidden xl:flex" : "flex"} flex-col bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden min-h-0`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="lg:hidden text-gray-500 hover:text-brand-purple"
            aria-label={t("dashboard.crm.back")}
          >
            <HiOutlineArrowLeft className="rtl:rotate-180" />
          </button>
          <div className="relative w-9 h-9 rounded-full bg-violet-100 text-brand-purple flex items-center justify-center text-xs font-bold">
            {initials(headerName)}
            {conversation && <ChannelDot channel={conversation.channel} />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{headerName || "…"}</div>
            <div className="text-[11px] text-gray-400 truncate">
              {conversation?.channel === "facebook" ? (
                <span className="text-blue-600 font-semibold">
                  {t("dashboard.crm.channelMessenger")}
                </span>
              ) : (
                <span className="font-mono" dir="ltr">
                  {conversation?.contact_phone || conversation?.external_chat_id}
                </span>
              )}
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateConversation({ assignedTo: assignedToMe ? null : "me" })}
              className="hidden sm:inline-flex text-[11px] font-semibold rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              {assignedToMe ? t("dashboard.crm.unassign") : t("dashboard.crm.assignToMe")}
            </button>
            <button
              type="button"
              onClick={openTicketModal}
              className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-lg border border-violet-200 px-2.5 py-1.5 text-brand-purple hover:bg-violet-50"
            >
              <HiOutlineTicket />
              <span className="hidden sm:inline">{t("dashboard.crm.ticket.open")}</span>
            </button>
            <button
              type="button"
              onClick={() => updateConversation({ status: isClosed ? "open" : "closed" })}
              className={`text-[11px] font-semibold rounded-lg px-2.5 py-1.5 flex items-center gap-1 ${
                isClosed
                  ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              <HiOutlineCheckCircle />
              {isClosed ? t("dashboard.crm.reopen") : t("dashboard.crm.close")}
            </button>
            <button
              type="button"
              onClick={() => setShowProfileMobile(true)}
              className="xl:hidden text-gray-500 hover:text-brand-purple p-1.5"
              aria-label={t("dashboard.crm.contactDetails")}
            >
              <HiOutlineUser />
            </button>
          </div>
        </div>

        {ticketNotice && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-100 text-[11px] text-green-800">
            <HiOutlineTicket />
            <span className="flex-1">
              {t("dashboard.crm.ticket.created", { id: ticketNotice.id })}
              {ticketNotice.notifyFailed && ` ${t("dashboard.crm.ticket.notifyFailed")}`}
            </span>
            <Link
              to={`/dashboard/support?channel=${ticketNotice.channel}&ticket=${ticketNotice.id}`}
              className="font-semibold underline"
            >
              {t("dashboard.crm.ticket.view")}
            </Link>
            <button type="button" onClick={() => setTicketNotice(null)} className="text-green-700">
              ×
            </button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleThreadScroll}
          className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-2 bg-gray-50/60"
        >
          {threadLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : threadError ? (
            <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
              {threadError}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-10">{t("dashboard.crm.noMessages")}</div>
          ) : (
            messages.map((m) => {
              const outgoing = m.direction === "out";
              const failed = m.status === "failed";
              return (
                <div key={m.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      outgoing
                        ? failed
                          ? "bg-red-50 border border-red-200 text-red-800 rounded-ee-md"
                          : "bg-brand text-white rounded-ee-md"
                        : "bg-white border border-gray-100 text-gray-800 rounded-es-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words" dir="auto">
                      {m.body}
                    </div>
                    <div
                      className={`mt-1 flex items-center gap-1.5 text-[10px] ${
                        outgoing && !failed ? "text-white/70" : "text-gray-400"
                      }`}
                    >
                      {outgoing && m.sender_first_name && <span>{m.sender_first_name} ·</span>}
                      <span>{formatDateTime(m.created_at)}</span>
                      {failed && (
                        <span className="flex items-center gap-0.5 font-semibold text-red-600">
                          <HiOutlineExclamationCircle /> {t("dashboard.crm.failed")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="border-t border-gray-100 p-3">
          {sendError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-100 text-red-700 rounded-lg text-[11px] font-semibold">
              {sendError}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              maxLength={channelMeta(conversation?.channel).maxLength}
              dir="auto"
              placeholder={t("dashboard.crm.replyPlaceholder")}
              className="flex-1 resize-none bg-gray-50 text-sm rounded-2xl px-4 py-3 border border-transparent focus:border-violet-200 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="shrink-0 h-11 px-4 rounded-2xl bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white text-sm font-semibold flex items-center gap-1.5"
            >
              <HiOutlinePaperAirplane className="rotate-90 rtl:-rotate-90" />
              {sending ? t("dashboard.crm.sending") : t("dashboard.crm.send")}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">
            {conversation?.channel === "facebook"
              ? t("dashboard.crm.composerHintMessenger")
              : t("dashboard.crm.composerHint")}
          </p>
        </form>
      </div>
    );
  };

  const renderProfile = () => {
    if (!selectedId) return null;

    const body = () => {
      if (profileLoading && !profile) {
        return (
          <div className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        );
      }
      if (!profile) return null;

      const contact = profile.contact || {};
      const isMessenger = contact.channel === "facebook";
      const nameLabel = isMessenger
        ? t("dashboard.crm.messengerName")
        : t("dashboard.crm.whatsappName");

      if (!profile.linked) {
        return (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                {t("dashboard.crm.unknownContact")}
              </div>
              <p className="text-xs text-amber-700/80 mt-1">{isMessenger
                  ? t("dashboard.crm.unknownContactHintMessenger")
                  : t("dashboard.crm.unknownContactHint")}</p>
            </div>
            <dl className="text-xs space-y-2">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">{nameLabel}</dt>
                <dd className="font-semibold text-end">{contact.name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">{t("dashboard.crm.phone")}</dt>
                <dd className="font-mono text-end" dir="ltr">{contact.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">{t("dashboard.crm.firstContact")}</dt>
                <dd className="text-end">{formatDateTime(contact.firstContactAt)}</dd>
              </div>
            </dl>
            <form onSubmit={handleLink} className="space-y-2 border-t border-gray-100 pt-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <HiOutlineLink /> {t("dashboard.crm.linkToAccount")}
              </label>
              <p className="text-[11px] text-gray-400">
                {isMessenger ? t("dashboard.crm.linkHintMessenger") : t("dashboard.crm.linkHint")}
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={linkPhone}
                  onChange={(e) => setLinkPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  className="flex-1 min-w-0 bg-gray-50 text-xs rounded-xl px-3 py-2 border border-transparent focus:border-violet-200 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={linking || !linkPhone.trim()}
                  className="text-xs font-semibold rounded-xl bg-brand text-white px-3 disabled:bg-violet-300"
                >
                  {t("dashboard.crm.link")}
                </button>
              </div>
              {linkError && <p className="text-[11px] text-red-600 font-semibold">{linkError}</p>}
            </form>
            {renderTicketsSection()}
          </div>
        );
      }

      const u = profile.user;
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
      const student = profile.student;

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {u.profile_image_url ? (
              <img src={getFileUrl(u.profile_image_url)} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-violet-100 text-brand-purple flex items-center justify-center font-bold">
                {initials(fullName)}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{fullName}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-purple">
                  {t(`dashboard.crm.roles.${u.role}`)}
                </span>
                {!u.is_active && (
                  <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-600">
                    {t("dashboard.crm.inactive")}
                  </span>
                )}
                {!!u.phone_verified_manually && (
                  <span className="rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700">
                    {t("dashboard.crm.phoneVerified")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Section icon={HiOutlineIdentification} title={t("dashboard.crm.personalInfo")}>
            <dl className="text-xs space-y-1.5">
              {[
                [t("dashboard.crm.phone"), <span dir="ltr" className="font-mono">{u.phone}</span>],
                [t("dashboard.crm.email"), u.email || "—"],
                [nameLabel, contact.name || "—"],
                student && [t("dashboard.crm.level"), student.academic_level_name || "—"],
                student && [t(`dashboard.crm.studentType`), t(`dashboard.crm.studentTypes.${student.student_type}`)],
                student && [t("dashboard.crm.governorate"), student.governorate || "—"],
                student && [
                  t("dashboard.crm.parent"),
                  student.parent_user_id ? (
                    <span>
                      {[student.parent_first_name, student.parent_last_name].filter(Boolean).join(" ")}
                      <span className="block font-mono text-gray-400" dir="ltr">
                        {student.parent_phone}
                      </span>
                    </span>
                  ) : (
                    "—"
                  ),
                ],
                [t("dashboard.crm.joined"), formatDate(u.created_at)],
                [t("dashboard.crm.conversations"), profile.conversationCount],
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-gray-400 shrink-0">{label}</dt>
                    <dd className="font-medium text-end min-w-0 break-words">{value}</dd>
                  </div>
                ))}
            </dl>
          </Section>

          {u.role === "student" && !student && (
            <p className="text-xs text-gray-400">{t("dashboard.crm.noStudentRecord")}</p>
          )}

          {student && (
            <>
              <Section
                icon={HiOutlineAcademicCap}
                title={t("dashboard.crm.enrollments")}
                count={profile.enrollments?.length || 0}
              >
                {profile.enrollments?.length ? (
                  <ul className="space-y-2">
                    {profile.enrollments.map((e) => (
                      <li key={e.course_id} className="rounded-xl bg-gray-50 px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold flex-1">{e.course_title}</span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              Number(e.is_active)
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {Number(e.is_active)
                              ? t("dashboard.crm.active")
                              : e.status && e.status !== "active"
                                ? t("dashboard.crm.inactive")
                                : t("dashboard.crm.expired")}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {t(`dashboard.crm.methods.${e.enrollment_method || "admin"}`)} ·{" "}
                          {formatDate(e.enrolled_at)}
                          {e.access_expires_at && (
                            <> → {formatDate(e.access_expires_at)}</>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">{t("dashboard.crm.none")}</p>
                )}
              </Section>

              <Section
                icon={HiOutlineKey}
                title={t("dashboard.crm.codesUsed")}
                count={profile.codes?.length || 0}
              >
                {profile.codes?.length ? (
                  <ul className="space-y-1.5">
                    {profile.codes.map((c) => (
                      <li key={c.id} className="text-xs flex items-start gap-2">
                        <span className="font-mono font-bold text-brand-purple" dir="ltr">
                          {c.code}
                        </span>
                        <span className="text-gray-400 text-[10px] flex-1 text-end">
                          {c.course_title || c.code_type}
                          <span className="block">{formatDate(c.redeemed_at)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">{t("dashboard.crm.none")}</p>
                )}
              </Section>

              <Section
                icon={HiOutlineCreditCard}
                title={t("dashboard.crm.payments")}
                count={profile.payments?.length || 0}
              >
                {profile.payments?.length ? (
                  <ul className="space-y-1.5">
                    {profile.payments.map((p) => (
                      <li key={p.id} className="text-xs flex items-start gap-2">
                        <span className="flex-1 min-w-0">
                          <span className="font-medium block truncate">{p.item_title || `#${p.item_id}`}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(p.created_at)}</span>
                        </span>
                        <span className="text-end shrink-0">
                          <span className="font-semibold block">
                            {Number(p.amount).toFixed(2)} {p.currency}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase ${
                              p.status === "paid"
                                ? "text-green-600"
                                : p.status === "pending"
                                  ? "text-amber-600"
                                  : "text-gray-400"
                            }`}
                          >
                            {t(`dashboard.crm.paymentStatus.${p.status}`)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">{t("dashboard.crm.none")}</p>
                )}
              </Section>

              <Section
                icon={HiOutlineAnnotation}
                title={t("dashboard.crm.staffNotes")}
                count={profile.notes?.length || 0}
              >
                {profile.notes?.length ? (
                  <ul className="space-y-2">
                    {profile.notes.map((n) => (
                      <li key={n.id} className="rounded-xl bg-amber-50/60 px-3 py-2 text-xs">
                        <div className="whitespace-pre-wrap" dir="auto">{n.note}</div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {[n.author_first_name, n.author_last_name].filter(Boolean).join(" ")} ·{" "}
                          {formatDate(n.created_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">{t("dashboard.crm.none")}</p>
                )}
              </Section>
            </>
          )}

          {u.role === "parent" && (
            <Section
              icon={HiOutlineUserGroup}
              title={t("dashboard.crm.children")}
              count={profile.children?.length || 0}
            >
              {profile.children?.length ? (
                <ul className="space-y-1.5">
                  {profile.children.map((c) => (
                    <li key={c.student_id} className="text-xs">
                      <span className="font-semibold">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        <span dir="ltr" className="font-mono">{c.phone}</span>
                        {c.academic_level_name && ` · ${c.academic_level_name}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">{t("dashboard.crm.none")}</p>
              )}
            </Section>
          )}

          {renderTicketsSection()}

          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={handleUnlink}
              className="text-[11px] text-gray-400 hover:text-brand-purple underline"
            >
              {t("dashboard.crm.unlink")}
            </button>
          </div>
        </div>
      );
    };

    return (
      <div
        className={`${showProfileMobile ? "flex" : "hidden xl:flex"} flex-col bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden min-h-0`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setShowProfileMobile(false)}
            className="xl:hidden text-gray-500 hover:text-brand-purple"
            aria-label={t("dashboard.crm.back")}
          >
            <HiOutlineArrowLeft className="rtl:rotate-180" />
          </button>
          <h3 className="text-sm font-bold">{t("dashboard.crm.contactDetails")}</h3>
          <button
            type="button"
            onClick={() => loadProfile(selectedId)}
            className="ms-auto text-gray-400 hover:text-brand-purple"
            aria-label={t("dashboard.common.retry")}
          >
            <HiOutlineRefresh className={profileLoading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4">{body()}</div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-fadeIn text-[#2e0854]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
            {t("dashboard.crm.badge")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3 flex items-center gap-2">
            <HiOutlineChatAlt2 className="text-brand-purple" />
            {t("dashboard.crm.title")}
          </h1>
          <p className="text-sm text-gray-400 font-light mt-1">
            {t("dashboard.crm.subtitle", { open: counts.open, unread: counts.unread })}
          </p>
          <div className="flex flex-wrap gap-2 mt-3" role="tablist" aria-label={t("dashboard.crm.channelAll")}>
            {[
              ["", "channelAll", HiOutlineChatAlt2],
              ["whatsapp", "channelWhatsapp", FaWhatsapp],
              ["facebook", "channelMessenger", FaFacebookMessenger],
            ].map(([value, key, Icon]) => {
              const unread = value
                ? counts.unreadByChannel?.[value] || 0
                : counts.unread || 0;
              const active = channelFilter === value;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChannelFilter(value)}
                  className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl px-4 py-2 border transition-all ${
                    active
                      ? value
                        ? `${channelMeta(value).chip} border-transparent shadow-sm`
                        : "bg-violet-50 text-brand-purple border-transparent shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="text-sm" />
                  {t(`dashboard.crm.${key}`)}
                  {unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-purple"
          >
            <HiOutlineCog /> {t("dashboard.crm.setup")}
          </button>
        )}
      </div>

      {isAdmin && showSetup && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* WhatsApp — CRM session (separate from the OTP number) */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-xs space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <FaWhatsapp className="text-green-600" /> {t("dashboard.crm.setupTitle")}
            </h3>
            <p className="text-gray-500">{t("dashboard.crm.setupHint")}</p>
            {webhook && (
              <>
                <div>
                  <div className="text-gray-400">{t("dashboard.crm.webhookUrl")}</div>
                  <div className="font-mono break-all" dir="ltr">{webhook.url}</div>
                </div>
                {webhook.urlProblem && (
                  <p className="text-gray-400">{t("dashboard.crm.whatsappWebhookLocal")}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <SetupChip ok={webhook.sessionConfigured}>
                    {webhook.sessionConfigured
                      ? t("dashboard.crm.crmSessionSet")
                      : t("dashboard.crm.crmSessionMissing")}
                  </SetupChip>
                  {webhook.session && (
                    <SetupChip ok={webhook.session.status === "ready"}>
                      {t("dashboard.crm.crmSessionStatus", {
                        status: webhook.session.status || "—",
                      })}
                      {webhook.session.phone ? ` · ${webhook.session.phone}` : ""}
                    </SetupChip>
                  )}
                  <SetupChip ok={webhook.secretConfigured}>
                    {webhook.secretConfigured
                      ? t("dashboard.crm.secretSet")
                      : t("dashboard.crm.secretMissing")}
                  </SetupChip>
                  {webhook.lastSync && (
                    <SetupChip ok={webhook.lastSync.ok} warn={!webhook.lastSync.error}>
                      {webhook.lastSync.ok
                        ? t("dashboard.crm.messengerLastSync", {
                            time: formatDateTime(webhook.lastSync.at),
                            count: webhook.lastSync.inserted ?? 0,
                          })
                        : t("dashboard.crm.messengerSyncFailed")}
                    </SetupChip>
                  )}
                  {!webhook.urlProblem && (
                    <SetupChip ok={webhook.registered && webhook.active} warn>
                      {webhook.registered && webhook.active
                        ? t("dashboard.crm.webhookRegistered")
                        : t("dashboard.crm.webhookNotRegistered")}
                    </SetupChip>
                  )}
                  {webhook.otpStillDelivering && (
                    <SetupChip ok={false}>{t("dashboard.crm.otpStillDelivering")}</SetupChip>
                  )}
                </div>
                {webhook.session && webhook.session.status !== "ready" && (
                  <SetupNotice warn>{t("dashboard.crm.crmSessionNotReady")}</SetupNotice>
                )}
              </>
            )}
            {webhookError && (
              <div className="p-2 bg-violet-50 border border-violet-200 text-brand rounded-lg font-semibold">
                {webhookError}
              </div>
            )}
            <button
              type="button"
              onClick={handleRegisterWebhook}
              disabled={webhookBusy}
              className="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold px-4 py-2"
            >
              {webhookBusy ? t("dashboard.crm.registering") : t("dashboard.crm.whatsappSyncNow")}
            </button>
          </div>

          {/* Facebook Messenger */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-xs space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <FaFacebookMessenger className="text-blue-600" /> {t("dashboard.crm.messengerSetupTitle")}
            </h3>
            <p className="text-gray-500">{t("dashboard.crm.messengerSetupHint")}</p>
            {messenger && (
              <>
                <div>
                  <div className="text-gray-400">{t("dashboard.crm.messengerPage")}</div>
                  <div className="font-semibold">
                    {messenger.pageName || "—"}
                    {messenger.pageId && (
                      <span className="ms-2 font-mono text-gray-400" dir="ltr">
                        {messenger.pageId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Required: what Central-CRM also relies on */}
                <div className="flex flex-wrap gap-2">
                  <SetupChip ok={messenger.tokenValid}>
                    {messenger.tokenValid
                      ? t("dashboard.crm.messengerTokenValid")
                      : t("dashboard.crm.messengerTokenInvalid")}
                    {messenger.tokenType ? ` · ${messenger.tokenType}` : ""}
                  </SetupChip>
                  <SetupChip ok={messenger.inboxReadable}>
                    {messenger.inboxReadable
                      ? t("dashboard.crm.messengerInboxOk")
                      : t("dashboard.crm.messengerInboxBlocked")}
                  </SetupChip>
                  {(messenger.missingScopes || []).map((scope) => (
                    <SetupChip key={scope} ok={false}>
                      {t("dashboard.crm.messengerMissingScope", { scope })}
                    </SetupChip>
                  ))}
                  {messenger.lastSync && (
                    <SetupChip ok={messenger.lastSync.ok} warn={!messenger.lastSync.error}>
                      {messenger.lastSync.ok
                        ? t("dashboard.crm.messengerLastSync", {
                            time: formatDateTime(messenger.lastSync.at),
                            count: messenger.lastSync.inserted ?? 0,
                          })
                        : t("dashboard.crm.messengerSyncFailed")}
                    </SetupChip>
                  )}
                </div>
                {messenger.error && <SetupNotice>{messenger.error}</SetupNotice>}
                {messenger.lastSync?.error && <SetupNotice>{messenger.lastSync.error}</SetupNotice>}
                {(messenger.warnings || []).map((w) => (
                  <SetupNotice key={w} warn>{w}</SetupNotice>
                ))}
                {(messenger.missingScopes || []).length > 0 && (
                  <SetupNotice warn>{t("dashboard.crm.messengerScopesHint")}</SetupNotice>
                )}

                {/* Optional: instant delivery via webhook */}
                <div className="rounded-2xl bg-gray-50 p-3 space-y-2">
                  <div className="font-bold text-gray-600">
                    {t("dashboard.crm.messengerWebhookOptional")}
                  </div>
                  <p className="text-gray-500">{t("dashboard.crm.messengerWebhookOptionalHint")}</p>
                  <div className="font-mono break-all text-gray-500" dir="ltr">
                    {messenger.callbackUrl}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SetupChip ok={messenger.pageSubscribed} warn>
                      {messenger.pageSubscribed
                        ? t("dashboard.crm.messengerSubscribed")
                        : t("dashboard.crm.messengerNotSubscribed")}
                    </SetupChip>
                    <SetupChip ok={messenger.appSecretSet} warn>
                      {messenger.appSecretSet
                        ? t("dashboard.crm.messengerSecretSet")
                        : t("dashboard.crm.messengerSecretMissing")}
                    </SetupChip>
                  </div>
                  {messenger.urlProblem && (
                    <p className="text-gray-400">{t("dashboard.crm.messengerWebhookLocal")}</p>
                  )}
                </div>
              </>
            )}
            {messengerError && (
              <div className="p-2 bg-violet-50 border border-violet-200 text-brand rounded-lg font-semibold">
                <span className="whitespace-pre-line">{messengerError}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleConnectMessenger}
              disabled={messengerBusy}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-2"
            >
              {messengerBusy
                ? t("dashboard.crm.registering")
                : t("dashboard.crm.messengerConnect")}
            </button>
          </div>
        </div>
      )}

      <div
        className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]"
        style={{ height: "calc(100vh - 265px)", minHeight: 520 }}
      >
        {renderConversationList()}
        {renderThread()}
        {renderProfile()}
      </div>
      {renderTicketModal()}
    </div>
  );
};

export default CrmDashboard;
