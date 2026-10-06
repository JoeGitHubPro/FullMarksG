import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlinePaperAirplane, HiOutlineLockClosed } from "react-icons/hi";
import api from "../api";

// Internal team chat attached to one CRM conversation. Never sent to the
// customer. Type "@" to mention an admin or assistant — they get it in their
// Mentions inbox.

const POLL_MS = 6000;

const fmt = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Renders the note with @mentions highlighted.
const NoteBody = ({ body, names, meName }) => {
  if (!names.length) return <>{body}</>;
  const re = new RegExp(`(@(?:${names.map(escapeRe).join("|")}))`, "gi");
  const lowerNames = new Set(names.map((n) => `@${n.toLowerCase()}`));
  return body.split(re).map((part, i) =>
    lowerNames.has(part.toLowerCase()) ? (
      <span
        key={i}
        className={`font-semibold rounded px-0.5 ${
          meName && part.toLowerCase() === `@${meName.toLowerCase()}`
            ? "bg-amber-200 text-amber-900"
            : "text-brand-purple"
        }`}
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
};

const CrmInternalChat = ({ conversationId, staff, currentUserId, t, onActivity }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [mentionIds, setMentionIds] = useState([]);
  const [picker, setPicker] = useState(null); // { query, start }
  const [pickerIndex, setPickerIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const forRef = useRef(conversationId);
  forRef.current = conversationId;

  const staffNames = useMemo(() => staff.map((s) => s.name).filter(Boolean), [staff]);
  const meName = staff.find((s) => s.id === currentUserId)?.name || "";

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      const target = conversationId;
      try {
        const res = await api.getCrmInternalNotes(target);
        if (forRef.current !== target) return;
        if (res.success) {
          setNotes(res.data || []);
          setError("");
          onActivity?.();
        }
      } catch (err) {
        if (forRef.current === target) setError(err.message || t("dashboard.crm.internal.loadFailed"));
      } finally {
        if (!silent && forRef.current === target) setLoading(false);
      }
    },
    [conversationId, onActivity, t],
  );

  useEffect(() => {
    setNotes([]);
    setDraft("");
    setMentionIds([]);
    setPicker(null);
    load();
    const id = setInterval(() => {
      if (document.visibilityState !== "hidden") load({ silent: true });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [notes]);

  const candidates = useMemo(() => {
    if (!picker) return [];
    const q = picker.query.toLowerCase();
    return staff
      .filter((s) => s.id !== currentUserId)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [picker, staff, currentUserId]);

  const updatePicker = (value, caret) => {
    const before = value.slice(0, caret);
    const m = /(^|\s)@([^\s@]{0,30}(?:\s[^\s@]{0,30})?)$/.exec(before);
    if (m) {
      setPicker({ query: m[2], start: caret - m[2].length - 1 });
      setPickerIndex(0);
    } else {
      setPicker(null);
    }
  };

  const insertMention = (person) => {
    if (!picker) return;
    const el = inputRef.current;
    const caret = el ? el.selectionStart : draft.length;
    const next = `${draft.slice(0, picker.start)}@${person.name} ${draft.slice(caret)}`;
    setDraft(next);
    setMentionIds((ids) => (ids.includes(person.id) ? ids : [...ids, person.id]));
    setPicker(null);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = picker.start + person.name.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    const target = conversationId;
    setSending(true);
    setError("");
    try {
      // Keep only mentions whose name is still in the text.
      const mentions = mentionIds.filter((id) => {
        const p = staff.find((s) => s.id === id);
        return p && body.toLowerCase().includes(`@${p.name.toLowerCase()}`);
      });
      const res = await api.addCrmInternalNote(target, { body, mentions });
      if (forRef.current !== target) return;
      if (res.success && res.data) {
        setNotes((cur) => [...cur, res.data]);
        setDraft("");
        setMentionIds([]);
        onActivity?.();
      }
    } catch (err) {
      setError(err.message || t("dashboard.crm.internal.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (picker && candidates.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPickerIndex((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPickerIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(candidates[pickerIndex]);
        return;
      }
      if (e.key === "Escape") {
        setPicker(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800">
        <HiOutlineLockClosed /> {t("dashboard.crm.internal.privateHint")}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2.5">
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">{t("dashboard.crm.internal.empty")}</p>
        ) : (
          notes.map((n) => {
            const mine = n.author_id === currentUserId;
            const mentionsMe = (n.mentions || []).some((m) => m.userId === currentUserId);
            return (
              <div key={n.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs border ${
                    mentionsMe
                      ? "bg-amber-50 border-amber-300"
                      : mine
                        ? "bg-violet-50 border-violet-100"
                        : "bg-yellow-50/60 border-yellow-100"
                  }`}
                >
                  <div className="text-[10px] font-semibold text-gray-500 mb-0.5">
                    {[n.author_first_name, n.author_last_name].filter(Boolean).join(" ") || "—"}
                    {n.author_role && (
                      <span className="ms-1 uppercase text-[9px] text-gray-400">
                        {t(`dashboard.crm.roles.${n.author_role}`)}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words" dir="auto">
                    <NoteBody body={n.body} names={staffNames} meName={meName} />
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1">{fmt(n.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="relative border-t border-gray-100 p-3">
        {picker && candidates.length > 0 && (
          <ul className="absolute bottom-full mb-1 inset-x-3 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
            {candidates.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(p);
                  }}
                  className={`w-full text-start px-3 py-2 text-xs flex items-center gap-2 ${
                    i === pickerIndex ? "bg-violet-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="ms-auto text-[9px] uppercase text-gray-400">
                    {t(`dashboard.crm.roles.${p.role}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-100 text-red-700 rounded-lg text-[11px] font-semibold">
            {error}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              updatePicker(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setPicker(null), 150)}
            rows={2}
            maxLength={4000}
            dir="auto"
            placeholder={t("dashboard.crm.internal.placeholder")}
            className="flex-1 resize-none bg-amber-50/60 text-xs rounded-2xl px-3 py-2.5 border border-transparent focus:border-amber-200 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 h-10 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white text-xs font-semibold flex items-center gap-1"
          >
            <HiOutlinePaperAirplane className="rotate-90 rtl:-rotate-90" />
            {t("dashboard.crm.internal.send")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrmInternalChat;
