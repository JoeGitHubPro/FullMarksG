import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import api, { getFileUrl } from "../api";
import {
  getSupportChannels,
  getStatusStyle,
  getPriorityStyle,
} from "../utils/supportChannels";
import {
  HiOutlineArrowLeft,
  HiOutlineSupport,
  HiOutlinePlus,
  HiOutlineChatAlt2,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlinePaperAirplane,
  HiOutlineTag,
  HiOutlineLightningBolt,
  HiOutlinePhotograph,
  HiOutlineX,
} from "react-icons/hi";

// Local object-URL preview for a pending image attachment, with its own
// cleanup so repeated picks don't leak blob URLs.
const AttachmentPreview = ({ file, onClear }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!file || !url) return null;
  return (
    <div className="relative inline-block">
      <img
        src={url}
        alt="attachment preview"
        className="h-20 w-20 object-cover rounded-xl border border-gray-200"
      />
      <button
        type="button"
        onClick={onClear}
        className="absolute -top-2 -end-2 bg-white border border-gray-200 rounded-full p-1 shadow text-gray-500 hover:text-brand-purple"
        aria-label="Remove image"
      >
        <HiOutlineX className="text-xs" />
      </button>
    </div>
  );
};

const SupportTicketsPanel = ({
  channel = "admin",
  userRole = "student",
  currentUserId,
  canManageMeta = false,
  showFilters = false,
  showCreatorInfo = false,
  allowCreate = true,
  enrollments = [],
  assistants = [],
  fixedCourseId = null,
  fixedCourseTitle = "",
  compact = false,
}) => {
  const { t } = useTranslation();
  const channels = useMemo(() => getSupportChannels(t), [t]);
  const channelMeta = channels[channel] || channels.admin;

  const getStatusLabel = (status) => {
    const labels = {
      open: t("dashboard.support.filters.open"),
      in_progress: t("dashboard.support.filters.inProgress"),
      resolved: t("dashboard.support.filters.resolved"),
      closed: t("dashboard.support.filters.closed"),
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) =>
    t(`dashboard.support.priority.${priority}`) || priority;

  const getCategoryLabel = (category) =>
    t(`dashboard.support.category.${category}`) || category;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    priority: "",
  });
  const [activeView, setActiveView] = useState("list");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [newTicketImage, setNewTicketImage] = useState(null);
  const messagesEndRef = useRef(null);
  const createFileInputRef = useRef(null);
  const chatFileInputRef = useRef(null);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: channel === "course" ? "academic" : "general",
    priority: "low",
    message: "",
    courseId: fixedCourseId ? String(fixedCourseId) : "",
    targetUserId: "",
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const query = { channel, ...filters };
      if (fixedCourseId) {
        query.courseId = fixedCourseId;
      }
      const response = await api.getTickets(query);
      if (response.success) {
        let rows = response.data;
        if (fixedCourseId) {
          rows = rows.filter(
            (ticket) => Number(ticket.course_id) === Number(fixedCourseId),
          );
        }
        setTickets(rows);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await api.getTicketById(ticketId);
      if (response.success) {
        setSelectedTicket(response.data);
        setChatMessage("");
        setChatImage(null);
        setActiveView("chat");
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100,
        );
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.loadFailed"));
    }
  };

  useEffect(() => {
    setActiveView("list");
    setSelectedTicket(null);
    setNewTicketImage(null);
    setChatImage(null);
    fetchTickets();
  }, [channel, filters.status, filters.category, filters.priority, fixedCourseId]);

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");
    try {
      const payload = {
        subject: newTicket.subject,
        category: newTicket.category,
        priority: newTicket.priority,
        message: newTicket.message,
        ticketType: channel,
      };

      if (channel === "course") {
        const selectedCourseId = fixedCourseId || newTicket.courseId;
        if (!selectedCourseId) {
          setError(t("dashboard.common.operationFailed"));
          setFormSubmitLoading(false);
          return;
        }
        payload.courseId = Number(selectedCourseId);
      }

      if (channel === "staff" && userRole === "instructor" && newTicket.targetUserId) {
        payload.targetUserId = Number(newTicket.targetUserId);
      }

      const response = await api.createTicket(payload, newTicketImage);
      if (response.success) {
        setSuccessMsg("Ticket created successfully.");
        setNewTicket({
          subject: "",
          category: channel === "course" ? "academic" : "general",
          priority: "low",
          message: "",
          courseId: fixedCourseId ? String(fixedCourseId) : "",
          targetUserId: "",
        });
        setNewTicketImage(null);
        if (createFileInputRef.current) createFileInputRef.current.value = "";
        setActiveView("list");
        fetchTickets();
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.creationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() && !chatImage) return;

    setChatLoading(true);
    try {
      const response = await api.addTicketMessage(
        selectedTicket.id,
        chatMessage,
        chatImage,
      );
      if (response.success) {
        setChatMessage("");
        setChatImage(null);
        if (chatFileInputRef.current) chatFileInputRef.current.value = "";
        await fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setChatLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      const response = await api.updateTicketStatus(selectedTicket.id, status);
      if (response.success) {
        setSuccessMsg(
          `${t("dashboard.common.status")}: ${getStatusLabel(status)}`,
        );
        fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.updateFailed"));
    }
  };

  const handleDetailChange = async (key, value) => {
    try {
      const updatedDetails = {
        category: key === "category" ? value : selectedTicket.category,
        priority: key === "priority" ? value : selectedTicket.priority,
      };
      const response = await api.updateTicketDetails(
        selectedTicket.id,
        updatedDetails,
      );
      if (response.success) {
        fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.updateFailed"));
    }
  };

  if (loading && activeView === "list") {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.common.processing")} {channelMeta.label}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl">
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {activeView === "list" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 text-start">
              <h2
                className={`${compact ? "text-lg" : "text-2xl"} font-black tracking-tight font-heading`}
              >
                {compact
                  ? t("dashboard.support.channels.course.label")
                  : channelMeta.label}
              </h2>
              <p className="text-gray-400 text-sm font-light">
                {compact
                  ? channelMeta.createDescription
                  : channelMeta.description}
              </p>
            </div>
            {allowCreate && (
              <button
                onClick={() => {
                  setNewTicketImage(null);
                  setActiveView("create");
                }}
                className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.99]"
              >
                <HiOutlinePlus className="text-base" />
                <span>{t("dashboard.support.newTicket")}</span>
              </button>
            )}
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full bg-gray-50/70 border border-transparent rounded-xl p-2.5 text-xs"
              >
                <option value="">{t("dashboard.support.filters.allStatuses")}</option>
                <option value="open">
                  {t("dashboard.support.filters.open")}
                </option>
                <option value="in_progress">
                  {t("dashboard.support.filters.inProgress")}
                </option>
                <option value="resolved">
                  {t("dashboard.support.filters.resolved")}
                </option>
                <option value="closed">
                  {t("dashboard.support.filters.closed")}
                </option>
              </select>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                className="w-full bg-gray-50/70 border border-transparent rounded-xl p-2.5 text-xs"
              >
                <option value="">{t("dashboard.common.all")}</option>
                <option value="general">
                  {t("dashboard.support.category.general")}
                </option>
                <option value="technical">
                  {t("dashboard.support.category.technical")}
                </option>
                <option value="billing">
                  {t("dashboard.support.category.billing")}
                </option>
                <option value="academic">
                  {t("dashboard.support.category.academic")}
                </option>
              </select>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="w-full bg-gray-50/70 border border-transparent rounded-xl p-2.5 text-xs"
              >
                <option value="">{t("dashboard.common.all")}</option>
                <option value="low">
                  {t("dashboard.support.priority.low")}
                </option>
                <option value="medium">
                  {t("dashboard.support.priority.medium")}
                </option>
                <option value="high">
                  {t("dashboard.support.priority.high")}
                </option>
              </select>
            </div>
          )}

          {tickets.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl space-y-3">
              <HiOutlineSupport className="mx-auto text-4xl text-gray-200" />
              <p className="text-sm text-gray-400 font-light">
                {t("dashboard.common.nothingYet")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => fetchTicketDetails(ticket.id)}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-red-600"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2 max-w-2xl text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusStyle(ticket.status)}`}
                        >
                          {getStatusLabel(ticket.status)}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityStyle(ticket.priority)}`}
                        >
                          {getPriorityLabel(ticket.priority)}
                        </span>
                        {ticket.course_title && (
                          <span className="text-[10px] text-brand-purple bg-violet-50 px-2 py-0.5 rounded">
                            {ticket.course_title}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold group-hover:text-brand-purple transition-colors">
                        {ticket.subject}
                      </h3>
                      {showCreatorInfo && (
                        <p className="text-xs text-gray-400">
                          From: {ticket.creator_first_name}{" "}
                          {ticket.creator_last_name} ({ticket.creator_role})
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-xl">
                        <HiOutlineChatAlt2 />
                        {ticket.messages_count || 0}
                      </span>
                      <span className="font-mono text-[11px]">
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === "create" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <button
            onClick={() => setActiveView("list")}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-purple uppercase tracking-wider"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>{t("dashboard.support.back")}</span>
          </button>

          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="text-start">
              <h2 className="text-2xl font-black font-heading">
                {t("dashboard.support.newTicket")}
              </h2>
              <p className="text-gray-400 text-sm font-light mt-1">
                {channelMeta.createDescription}
              </p>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-5">
              {channel === "course" && !fixedCourseId && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Course *
                  </label>
                  <select
                    required
                    value={newTicket.courseId}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, courseId: e.target.value })
                    }
                    className="w-full bg-gray-50/70 text-sm rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50"
                  >
                    <option value="">Select enrolled course</option>
                    {enrollments
                      .filter(
                        (course) =>
                          !course.enrollment_status ||
                          course.enrollment_status === "active",
                      )
                      .map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {channel === "staff" && userRole === "instructor" && assistants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Assistant (optional)
                  </label>
                  <select
                    value={newTicket.targetUserId}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        targetUserId: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm rounded-2xl px-4 py-4"
                  >
                    <option value="">Whole assistant team</option>
                    {assistants.map((assistant) => (
                      <option key={assistant.id} value={assistant.id}>
                        {assistant.first_name} {assistant.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={newTicket.subject}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, subject: e.target.value })
                  }
                  className="w-full bg-gray-50/70 text-sm rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50"
                />
              </div>

              {channel !== "course" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Category
                    </label>
                    <select
                      value={newTicket.category}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, category: e.target.value })
                      }
                      className="w-full bg-gray-50/70 text-sm rounded-2xl px-4 py-4"
                    >
                      <option value="general">
                        {t("dashboard.support.category.general")}
                      </option>
                      <option value="technical">
                        {t("dashboard.support.category.technical")}
                      </option>
                      <option value="billing">
                        {t("dashboard.support.category.billing")}
                      </option>
                      <option value="academic">
                        {t("dashboard.support.category.academic")}
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Priority
                    </label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, priority: e.target.value })
                      }
                      className="w-full bg-gray-50/70 text-sm rounded-2xl px-4 py-4"
                    >
                      <option value="low">
                        {t("dashboard.support.priority.low")}
                      </option>
                      <option value="medium">
                        {t("dashboard.support.priority.medium")}
                      </option>
                      <option value="high">
                        {t("dashboard.support.priority.high")}
                      </option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Message *
                </label>
                <textarea
                  required
                  rows="5"
                  value={newTicket.message}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, message: e.target.value })
                  }
                  className="w-full bg-gray-50/70 text-sm rounded-2xl p-4 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Image (optional)
                </label>
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setNewTicketImage(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
                {newTicketImage ? (
                  <AttachmentPreview
                    file={newTicketImage}
                    onClear={() => {
                      setNewTicketImage(null);
                      if (createFileInputRef.current)
                        createFileInputRef.current.value = "";
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-gray-50/70 hover:bg-gray-100 text-gray-500 text-xs font-semibold px-4 py-3 rounded-2xl transition-colors"
                  >
                    <HiOutlinePhotograph className="text-base" />
                    <span>Attach an image</span>
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView("list")}
                  className="w-1/3 border border-gray-200 text-gray-500 font-semibold text-sm py-4 rounded-2xl"
                >
                  {t("dashboard.common.back")}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitLoading}
                  className="w-2/3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl"
                >
                  {formSubmitLoading
                    ? t("dashboard.common.processing")
                    : t("dashboard.support.submitTicket")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === "chat" && selectedTicket && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="space-y-4 lg:col-span-1">
            <button
              onClick={() => {
                setActiveView("list");
                fetchTickets();
              }}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-purple uppercase tracking-wider"
            >
              <HiOutlineArrowLeft className="flip-rtl" />{" "}
              <span>{t("dashboard.support.back")}</span>
            </button>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 text-start">
              <h4 className="text-sm font-bold">{selectedTicket.subject}</h4>
              {selectedTicket.course_title && (
                <p className="text-xs text-brand-purple bg-violet-50 px-2 py-1 rounded inline-block">
                  {selectedTicket.course_title}
                </p>
              )}

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1">
                    <HiOutlineShieldCheck /> {t("dashboard.common.status")}
                  </span>
                  {canManageMeta ? (
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-gray-50 rounded-xl px-2 py-1 text-xs"
                    >
                      <option value="open">
                        {t("dashboard.support.filters.open")}
                      </option>
                      <option value="in_progress">
                        {t("dashboard.support.filters.inProgress")}
                      </option>
                      <option value="resolved">
                        {t("dashboard.support.filters.resolved")}
                      </option>
                      <option value="closed">
                        {t("dashboard.support.filters.closed")}
                      </option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusStyle(selectedTicket.status)}`}
                    >
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                  )}
                </div>

                {canManageMeta && channel !== "course" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <HiOutlineLightningBolt /> Priority
                      </span>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) =>
                          handleDetailChange("priority", e.target.value)
                        }
                        className="bg-gray-50 rounded-xl px-2 py-1 text-xs"
                      >
                        <option value="low">
                          {t("dashboard.support.priority.low")}
                        </option>
                        <option value="medium">
                          {t("dashboard.support.priority.medium")}
                        </option>
                        <option value="high">
                          {t("dashboard.support.priority.high")}
                        </option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <HiOutlineTag /> Category
                      </span>
                      <select
                        value={selectedTicket.category}
                        onChange={(e) =>
                          handleDetailChange("category", e.target.value)
                        }
                        className="bg-gray-50 rounded-xl px-2 py-1 text-xs"
                      >
                        <option value="general">
                          {t("dashboard.support.category.general")}
                        </option>
                        <option value="technical">
                          {t("dashboard.support.category.technical")}
                        </option>
                        <option value="billing">
                          {t("dashboard.support.category.billing")}
                        </option>
                        <option value="academic">
                          {t("dashboard.support.category.academic")}
                        </option>
                      </select>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    Opened by
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-xl mt-1">
                    <HiOutlineUser />
                    <div>
                      <p className="font-bold text-[#2e0854]">
                        {selectedTicket.creator_first_name}{" "}
                        {selectedTicket.creator_last_name}
                      </p>
                      <p className="font-mono text-[10px]">
                        {selectedTicket.creator_phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl overflow-hidden flex flex-col h-[520px]">
            <div className="bg-[#2e0854] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HiOutlineChatAlt2 className="text-xl text-brand-violet" />
                <div>
                  <h4 className="text-xs font-bold tracking-wider">
                    Ticket #{selectedTicket.id}
                  </h4>
                  <p className="text-[11px] text-gray-400">{channelMeta.label}</p>
                </div>
              </div>
              <HiOutlineClock className="text-gray-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/40">
              {selectedTicket.messages?.map((msg, index) => {
                const isMyMessage = msg.sender_user_id === currentUserId;
                return (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[85%] ${isMyMessage ? "ms-auto items-end" : "me-auto items-start"}`}
                  >
                    <div className="text-[10px] text-gray-400 mb-1 px-1">
                      {msg.first_name} {msg.last_name}{" "}
                      <span className="uppercase text-[8px]">{msg.role}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 ${
                        isMyMessage
                          ? "bg-brand text-white rounded-tr-none"
                          : "bg-white border border-gray-100 rounded-tl-none"
                      }`}
                    >
                      {msg.attachment_url && (
                        <a
                          href={getFileUrl(msg.attachment_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={getFileUrl(msg.attachment_url)}
                            alt="attachment"
                            className="max-h-56 w-auto rounded-lg border border-black/5"
                          />
                        </a>
                      )}
                      {msg.message_body && <p>{msg.message_body}</p>}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 px-1">
                      {new Date(msg.sent_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendChatMessage}
              className="p-4 bg-white border-t border-gray-50 space-y-3"
            >
              {chatImage && (
                <AttachmentPreview
                  file={chatImage}
                  onClear={() => {
                    setChatImage(null);
                    if (chatFileInputRef.current)
                      chatFileInputRef.current.value = "";
                  }}
                />
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setChatImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  disabled={selectedTicket.status === "closed" || chatLoading}
                  className="w-11 h-11 flex-shrink-0 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-500 flex items-center justify-center rounded-xl"
                  aria-label="Attach an image"
                >
                  <HiOutlinePhotograph className="text-lg" />
                </button>
                <input
                  type="text"
                  value={chatMessage}
                  disabled={selectedTicket.status === "closed" || chatLoading}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={
                    selectedTicket.status === "closed"
                      ? t("dashboard.support.ticketClosed")
                      : t("dashboard.support.replyPlaceholder")
                  }
                  className="flex-1 bg-gray-50 text-xs rounded-xl px-4 py-3.5 focus:outline-none disabled:opacity-50 text-start"
                />
                <button
                  type="submit"
                  disabled={
                    selectedTicket.status === "closed" ||
                    chatLoading ||
                    (!chatMessage.trim() && !chatImage)
                  }
                  className="w-12 h-11 flex-shrink-0 bg-brand hover:bg-brand-dark disabled:bg-gray-200 text-white flex items-center justify-center rounded-xl"
                >
                  <HiOutlinePaperAirplane className="transform rotate-90 flip-rtl" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsPanel;
