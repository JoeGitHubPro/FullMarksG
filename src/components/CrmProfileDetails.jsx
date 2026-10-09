import React, { useState } from "react";
import {
  HiOutlineIdentification,
  HiOutlineAcademicCap,
  HiOutlineKey,
  HiOutlineCreditCard,
  HiOutlineAnnotation,
  HiOutlineUserGroup,
  HiOutlineHeart,
  HiOutlineDeviceMobile,
  HiOutlineTicket,
  HiOutlineChevronDown,
  HiOutlinePlay,
  HiOutlineChartBar,
  HiOutlineClock,
} from "react-icons/hi";
import { getGovernorateLabel } from "../utils/governorates";
import { api } from "../api";
import { localInputToUtcIso, toDatetimeLocalValue } from "../utils/assessmentDue";

// Full student / parent details for the CRM contact panel (data comes from
// GET /api/crm/conversations/:id/profile → utils/crmProfile.js).

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const fullName = (o, a = "first_name", b = "last_name") =>
  [o?.[a], o?.[b]].filter(Boolean).join(" ");

export const CrmSection = ({ icon: Icon, title, count, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[#ebe6f5] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full min-h-11 px-3 flex items-center gap-2 text-xs font-bold text-brand hover:bg-[#faf8fe] ${
          open ? "bg-[#f4f1fa]" : ""
        }`}
      >
        {Icon && <Icon className="text-brand-violet text-base shrink-0" />}
        <span className="text-start">{title}</span>
        {typeof count === "number" && (
          <span className="rounded-full bg-[#ede9fe] px-2 py-0.5 text-[11px] text-brand">{count}</span>
        )}
        <HiOutlineChevronDown className={`ms-auto text-gray-500 transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`} />
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
};

export const InfoList = ({ rows }) => (
  <dl className="text-[13px] divide-y divide-[#f4f1fa]">
    {rows.filter(Boolean).map(([label, value]) => (
      <div key={label} className="flex justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
        <dt className="text-gray-500 shrink-0">{label}</dt>
        <dd className="font-semibold text-end min-w-0 break-words">{value ?? "—"}</dd>
      </div>
    ))}
  </dl>
);

const Chip = ({ tone = "gray", children }) => {
  const tones = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-[#ede9fe] text-brand",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

const ProgressBar = ({ value, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
      <div className="h-full bg-brand-purple rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
};

const SummaryTiles = ({ summary, t }) => {
  if (!summary) return null;
  const tiles = [
    [t("dashboard.crm.profile.activeCourses"), `${summary.activeCourses}/${summary.totalCourses}`],
    [t("dashboard.crm.profile.totalPaid"), `${Number(summary.totalPaid || 0).toFixed(0)} ${summary.paidCurrency || ""}`],
    [t("dashboard.crm.profile.codesUsed"), summary.codesUsed],
    [t("dashboard.crm.profile.lastSeen"), summary.lastSeenAt ? fmtDateTime(summary.lastSeenAt) : "—"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-[#f4f1fa] px-3 py-2.5">
          <div className="text-[11px] text-gray-600">{label}</div>
          <div className="text-sm font-bold text-brand truncate" dir="auto">{value}</div>
        </div>
      ))}
    </div>
  );
};

const ExtendAccessForm = ({ e, studentId, t, onDone, onCancel }) => {
  const [mode, setMode] = useState("days"); // 'days' | 'date'
  const [days, setDays] = useState("30");
  const [newDate, setNewDate] = useState(
    toDatetimeLocalValue(e.access_expires_at) || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    const payload =
      mode === "days"
        ? { additionalDays: parseInt(days, 10) }
        : { newExpiresAt: localInputToUtcIso(newDate) };
    if (mode === "days" && (!payload.additionalDays || payload.additionalDays < 1)) {
      setError(t("dashboard.crm.profile.invalidDays"));
      return;
    }
    if (mode === "date" && !payload.newExpiresAt) {
      setError(t("dashboard.crm.profile.invalidDate"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.extendCrmStudentCourseAccess(
        studentId,
        e.course_id,
        payload,
      );
      if (res.success) {
        onDone();
      } else {
        setError(res.message || t("dashboard.common.updateFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg bg-white border border-violet-100 p-2 space-y-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMode("days")}
          className={`px-2 py-1 rounded-md text-[11px] font-bold ${
            mode === "days" ? "bg-brand-purple text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {t("dashboard.crm.profile.addDays")}
        </button>
        <button
          type="button"
          onClick={() => setMode("date")}
          className={`px-2 py-1 rounded-md text-[11px] font-bold ${
            mode === "date" ? "bg-brand-purple text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {t("dashboard.crm.profile.setNewDate")}
        </button>
      </div>
      {mode === "days" ? (
        <input
          type="number"
          min="1"
          value={days}
          onChange={(ev) => setDays(ev.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          placeholder={t("dashboard.crm.profile.additionalDays")}
        />
      ) : (
        <input
          type="datetime-local"
          value={newDate}
          onChange={(ev) => setNewDate(ev.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
        />
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700"
        >
          {t("dashboard.common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-2.5 py-1 rounded-md bg-brand text-white text-[11px] font-bold hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? t("dashboard.common.saving") : t("dashboard.common.save")}
        </button>
      </div>
    </div>
  );
};

// Extend/edit ONE redeemed access code's expiry — for a code that unlocked
// several courses/items at once (a Bundle code, "Pick one" code, etc.) this
// updates all of them in a single action instead of opening each course and
// extending it one by one. Mirrors ExtendAccessForm above but targets
// PUT /crm/students/:studentId/codes/:redemptionId/access.
const CodeExtendForm = ({ c, studentId, t, onDone, onCancel }) => {
  const [mode, setMode] = useState("days"); // 'days' | 'date'
  const [days, setDays] = useState("30");
  const [newDate, setNewDate] = useState(
    toDatetimeLocalValue(c.access_expires_at) || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    const payload =
      mode === "days"
        ? { additionalDays: parseInt(days, 10) }
        : { newExpiresAt: localInputToUtcIso(newDate) };
    if (mode === "days" && (!payload.additionalDays || payload.additionalDays < 1)) {
      setError(t("dashboard.crm.profile.invalidDays"));
      return;
    }
    if (mode === "date" && !payload.newExpiresAt) {
      setError(t("dashboard.crm.profile.invalidDate"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.extendCrmStudentCodeAccess(studentId, c.id, payload);
      if (res.success) {
        onDone();
      } else {
        setError(res.message || t("dashboard.common.updateFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg bg-white border border-violet-100 p-2 space-y-2 mt-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMode("days")}
          className={`px-2 py-1 rounded-md text-[11px] font-bold ${
            mode === "days" ? "bg-brand-purple text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {t("dashboard.crm.profile.addDays")}
        </button>
        <button
          type="button"
          onClick={() => setMode("date")}
          className={`px-2 py-1 rounded-md text-[11px] font-bold ${
            mode === "date" ? "bg-brand-purple text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {t("dashboard.crm.profile.setNewDate")}
        </button>
      </div>
      {mode === "days" ? (
        <input
          type="number"
          min="1"
          value={days}
          onChange={(ev) => setDays(ev.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          placeholder={t("dashboard.crm.profile.additionalDays")}
        />
      ) : (
        <input
          type="datetime-local"
          value={newDate}
          onChange={(ev) => setNewDate(ev.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
        />
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700"
        >
          {t("dashboard.common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-2.5 py-1 rounded-md bg-brand text-white text-[11px] font-bold hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? t("dashboard.common.saving") : t("dashboard.common.save")}
        </button>
      </div>
    </div>
  );
};

const CodeRow = ({ c, studentId, t, onAccessExtended }) => {
  const [showExtend, setShowExtend] = useState(false);
  // A code that grants several courses/items at once (Bundle, Pick-one,
  // etc.) has no single course_title resolved server-side, so fall back to
  // its type so staff still know what they're extending.
  const label = c.course_title || c.code_type;

  return (
    <li className="text-xs">
      <div className="flex items-start gap-2">
        <span className="font-mono font-bold text-brand-purple shrink-0" dir="ltr">{c.code}</span>
        <span className="text-gray-500 text-[11px] flex-1 text-end">
          {label}
          <span className="block">{fmtDate(c.redeemed_at)}</span>
        </span>
      </div>
      <div className="flex items-center justify-end mt-1">
        {!showExtend && (
          <button
            type="button"
            onClick={() => setShowExtend(true)}
            className="flex items-center gap-1 text-brand-purple font-bold shrink-0 hover:underline text-[11px]"
          >
            <HiOutlineClock />
            {t("dashboard.crm.profile.extendAccess")}
          </button>
        )}
      </div>
      {showExtend && (
        <CodeExtendForm
          c={c}
          studentId={studentId}
          t={t}
          onCancel={() => setShowExtend(false)}
          onDone={() => {
            setShowExtend(false);
            onAccessExtended();
          }}
        />
      )}
    </li>
  );
};

const CourseCard = ({ e, studentId, t, onAccessExtended }) => {
  const [showGrades, setShowGrades] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const g = e.grades;
  const active = Number(e.is_active);
  return (
    <li className="rounded-xl bg-[#faf8fe] border border-[#f4f1fa] px-3 py-2.5 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold flex-1" dir="auto">{e.course_title}</span>
        <Chip tone={active ? "green" : "gray"}>
          {active
            ? t("dashboard.crm.active")
            : e.status && e.status !== "active"
              ? t("dashboard.crm.inactive")
              : t("dashboard.crm.expired")}
        </Chip>
      </div>
      <div className="text-[11px] text-gray-500 flex items-center gap-2">
        <span>
          {e.instructor_name && <>{e.instructor_name} · </>}
          {t(`dashboard.crm.methods.${e.enrollment_method || "admin"}`)} · {fmtDate(e.enrolled_at)}
          {e.access_expires_at && <> → {fmtDate(e.access_expires_at)}</>}
        </span>
        {!showExtend && (
          <button
            type="button"
            onClick={() => setShowExtend(true)}
            className="ms-auto flex items-center gap-1 text-brand-purple font-bold shrink-0 hover:underline"
          >
            <HiOutlineClock />
            {t("dashboard.crm.profile.extendAccess")}
          </button>
        )}
      </div>
      {showExtend && (
        <ExtendAccessForm
          e={e}
          studentId={studentId}
          t={t}
          onCancel={() => setShowExtend(false)}
          onDone={() => {
            setShowExtend(false);
            onAccessExtended?.();
          }}
        />
      )}
      {e.videos?.total > 0 && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <HiOutlinePlay />
            {t("dashboard.crm.profile.videosWatched", {
              done: e.videos.completed,
              total: e.videos.total,
            })}
            {e.videos.lastWatchedAt && (
              <span className="ms-auto text-gray-500">{fmtDate(e.videos.lastWatchedAt)}</span>
            )}
          </div>
          <ProgressBar value={e.videos.completed} total={e.videos.total} />
        </div>
      )}
      {g && (g.assignments.total > 0 || g.quizzes.total > 0) && (
        <div className="text-[11px] text-gray-500 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <HiOutlineChartBar />
            {g.averagePercent != null && (
              <span className="font-bold text-[#2e0854]">
                {t("dashboard.crm.profile.average", { pct: g.averagePercent })}
              </span>
            )}
            {g.assignments.total > 0 && (
              <span>
                {t("dashboard.crm.profile.assignmentsDone", {
                  done: g.assignments.submitted,
                  total: g.assignments.total,
                })}
              </span>
            )}
            {g.quizzes.total > 0 && (
              <span>
                {t("dashboard.crm.profile.quizzesDone", { done: g.quizzes.submitted, total: g.quizzes.total })}
              </span>
            )}
            {g.assignments.missed + g.quizzes.missed > 0 && (
              <span className="text-red-600 font-semibold">
                {t("dashboard.crm.profile.missed", { count: g.assignments.missed + g.quizzes.missed })}
              </span>
            )}
          </div>
          {g.recent?.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowGrades((v) => !v)}
                className="text-brand-purple font-semibold hover:underline"
              >
                {showGrades ? t("dashboard.crm.profile.hideGrades") : t("dashboard.crm.profile.showGrades")}
              </button>
              {showGrades && (
                <ul className="space-y-0.5">
                  {g.recent.map((r, i) => (
                    <li key={`${r.title}-${i}`} className="flex gap-2">
                      <span className="flex-1 truncate" dir="auto">
                        {r.type === "quiz" ? "📝" : "📄"} {r.title}
                      </span>
                      <span className="font-mono font-semibold">
                        {r.score ?? "—"}/{r.maxScore ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
};

/** All details of one student. `compact` = shown inside a parent's child card. */
export const StudentDetails = ({ data, t, language, compact = false, contactName, nameLabel, onAccessExtended }) => {
  const s = data?.student;
  if (!s) return <p className="text-xs text-gray-500">{t("dashboard.crm.noStudentRecord")}</p>;
  const verifiedBy = fullName(s, "verified_by_first_name", "verified_by_last_name");

  return (
    <div className="space-y-3">
      <SummaryTiles summary={data.summary} t={t} />

      <CrmSection icon={HiOutlineIdentification} title={t("dashboard.crm.personalInfo")}>
        <InfoList
          rows={[
            compact && [t("dashboard.crm.phone"), <span dir="ltr" className="font-mono">{s.phone}</span>],
            compact && [t("dashboard.crm.email"), s.email || "—"],
            !compact && contactName && [nameLabel, contactName],
            [
              t("dashboard.crm.profile.dateOfBirth"),
              s.date_of_birth
                ? `${fmtDate(s.date_of_birth)}${s.age != null ? ` · ${t("dashboard.crm.profile.age", { age: s.age })}` : ""}`
                : "—",
            ],
            [t("dashboard.crm.level"), s.academic_level_name || "—"],
            [
              t("dashboard.crm.profile.curriculum"),
              s.curriculum_name ? `${s.curriculum_name}${s.curriculum_code ? ` (${s.curriculum_code})` : ""}` : "—",
            ],
            [t("dashboard.crm.studentType"), t(`dashboard.crm.studentTypes.${s.student_type}`)],
            [t("dashboard.crm.governorate"), s.governorate ? getGovernorateLabel(s.governorate, language) : "—"],
            [
              t("dashboard.crm.profile.verification"),
              s.is_verified ? (
                <span className="text-green-700">
                  {t("dashboard.crm.profile.verified")}
                  {(verifiedBy || s.verified_at) && (
                    <span className="block text-[11px] text-gray-500">
                      {[verifiedBy, s.verified_at ? fmtDate(s.verified_at) : null].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
              ) : (
                t("dashboard.crm.profile.notVerified")
              ),
            ],
            compact && [t("dashboard.crm.profile.account"), s.is_active ? t("dashboard.crm.active") : t("dashboard.crm.inactive")],
            compact && [t("dashboard.crm.joined"), fmtDate(s.created_at)],
          ]}
        />
      </CrmSection>

      {!compact && (
        <CrmSection icon={HiOutlineHeart} title={t("dashboard.crm.profile.guardian")}>
          {data.parent ? (
            <div className="space-y-2">
              <InfoList
                rows={[
                  [t("dashboard.crm.profile.name"), fullName(data.parent) || "—"],
                  [t("dashboard.crm.phone"), <span dir="ltr" className="font-mono">{data.parent.phone || "—"}</span>],
                  [t("dashboard.crm.email"), data.parent.email || "—"],
                  [t("dashboard.crm.profile.emergencyContact"), data.parent.emergency_contact || "—"],
                  [t("dashboard.crm.profile.account"), data.parent.is_active ? t("dashboard.crm.active") : t("dashboard.crm.inactive")],
                ]}
              />
              {data.siblings?.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-gray-500 mb-1">
                    {t("dashboard.crm.profile.siblings")}
                  </div>
                  <ul className="space-y-1">
                    {data.siblings.map((sib) => (
                      <li key={sib.user_id} className="text-xs flex gap-2">
                        <span className="font-semibold flex-1">{fullName(sib)}</span>
                        <span className="text-[11px] text-gray-500">
                          {sib.academic_level_name || ""}
                          {sib.phone && <span dir="ltr" className="block font-mono">{sib.phone}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">{t("dashboard.crm.profile.noGuardian")}</p>
          )}
        </CrmSection>
      )}

      <CrmSection
        icon={HiOutlineAcademicCap}
        title={t("dashboard.crm.enrollments")}
        count={data.enrollments?.length || 0}
      >
        {data.enrollments?.length ? (
          <ul className="space-y-2">
            {data.enrollments.map((e) => (
              <CourseCard
                key={e.course_id}
                e={e}
                t={t}
                studentId={s.id}
                onAccessExtended={onAccessExtended}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">{t("dashboard.crm.none")}</p>
        )}
      </CrmSection>

      <CrmSection icon={HiOutlineKey} title={t("dashboard.crm.codesUsed")} count={data.codes?.length || 0} defaultOpen={!compact}>
        {data.codes?.length ? (
          <ul className="space-y-2">
            {data.codes.map((c) => (
              <CodeRow
                key={c.id}
                c={c}
                t={t}
                studentId={s.id}
                onAccessExtended={onAccessExtended}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">{t("dashboard.crm.none")}</p>
        )}
      </CrmSection>

      <CrmSection icon={HiOutlineCreditCard} title={t("dashboard.crm.payments")} count={data.payments?.length || 0} defaultOpen={!compact}>
        {data.payments?.length ? (
          <ul className="space-y-1.5">
            {data.payments.map((p) => (
              <li key={p.id} className="text-xs flex items-start gap-2">
                <span className="flex-1 min-w-0">
                  <span className="font-medium block truncate">{p.item_title || `#${p.item_id}`}</span>
                  <span className="text-[11px] text-gray-500">{fmtDate(p.created_at)}</span>
                </span>
                <span className="text-end shrink-0">
                  <span className="font-semibold block">
                    {Number(p.amount).toFixed(2)} {p.currency}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      p.status === "paid" ? "text-green-600" : p.status === "pending" ? "text-amber-600" : "text-gray-500"
                    }`}
                  >
                    {t(`dashboard.crm.paymentStatus.${p.status}`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">{t("dashboard.crm.none")}</p>
        )}
      </CrmSection>

      <CrmSection icon={HiOutlineAnnotation} title={t("dashboard.crm.staffNotes")} count={data.notes?.length || 0} defaultOpen={!compact}>
        {data.notes?.length ? (
          <ul className="space-y-2">
            {data.notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-amber-50/60 px-3 py-2 text-xs">
                <div className="whitespace-pre-wrap" dir="auto">{n.note}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {fullName(n, "author_first_name", "author_last_name")} · {fmtDate(n.created_at)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">{t("dashboard.crm.none")}</p>
        )}
      </CrmSection>

      <CrmSection icon={HiOutlineDeviceMobile} title={t("dashboard.crm.profile.devices")} count={data.devices?.length || 0} defaultOpen={false}>
        {data.devices?.length ? (
          <ul className="space-y-1.5">
            {data.devices.map((d, i) => (
              <li key={i} className="text-[11px]">
                <span className="block truncate text-gray-600" title={d.user_agent || ""}>
                  {(d.user_agent || "—").slice(0, 60)}
                </span>
                <span className="text-[11px] text-gray-500">
                  {t("dashboard.crm.profile.lastSeen")}: {fmtDateTime(d.last_seen_at)}
                  {d.ip_address && <> · <span dir="ltr">{d.ip_address}</span></>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">{t("dashboard.crm.none")}</p>
        )}
      </CrmSection>

      {data.accountTickets?.length > 0 && (
        <CrmSection icon={HiOutlineTicket} title={t("dashboard.crm.profile.supportHistory")} count={data.accountTickets.length} defaultOpen={false}>
          <ul className="space-y-1">
            {data.accountTickets.map((tk) => (
              <li key={tk.id} className="text-xs flex gap-2">
                <span className="font-mono text-gray-500">#{tk.id}</span>
                <span className="flex-1 truncate" dir="auto">{tk.subject}</span>
                <span className="text-[10px] font-bold uppercase text-brand-purple">
                  {t(`dashboard.crm.ticket.status.${tk.status}`)}
                </span>
              </li>
            ))}
          </ul>
        </CrmSection>
      )}
    </div>
  );
};

const ChildCard = ({ child, t, language, defaultOpen, onAccessExtended }) => {
  const [open, setOpen] = useState(defaultOpen);
  const s = child.student;
  return (
    <li className="rounded-xl border border-[#ebe6f5] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-12 flex items-center gap-2 px-3 py-2 text-start hover:bg-[#faf8fe] rounded-xl"
      >
        <span className="w-9 h-9 rounded-full bg-[#ede9fe] text-brand flex items-center justify-center text-xs font-bold shrink-0">
          {(s.first_name || "?")[0]}
          {(s.last_name || "")[0] || ""}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-bold truncate">{fullName(s)}</span>
          <span className="block text-[11px] text-gray-500 truncate">
            {[s.academic_level_name, t(`dashboard.crm.studentTypes.${s.student_type}`)].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="text-[11px] text-gray-500 shrink-0">
          {t("dashboard.crm.profile.coursesCount", { count: child.summary?.activeCourses ?? 0 })}
        </span>
        <HiOutlineChevronDown className={`text-gray-500 transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <StudentDetails
            data={child}
            t={t}
            language={language}
            compact
            onAccessExtended={onAccessExtended}
          />
        </div>
      )}
    </li>
  );
};

/** A parent/guardian with every child and the child's full details. */
export const ParentDetails = ({ data, user, t, language, onAccessExtended }) => (
  <div className="space-y-3">
    <CrmSection icon={HiOutlineIdentification} title={t("dashboard.crm.personalInfo")}>
      <InfoList
        rows={[
          [t("dashboard.crm.phone"), <span dir="ltr" className="font-mono">{user.phone}</span>],
          [t("dashboard.crm.email"), user.email || "—"],
          [t("dashboard.crm.profile.emergencyContact"), data.parent?.emergency_contact || "—"],
          [t("dashboard.crm.profile.childrenCount"), data.children?.length || 0],
          [t("dashboard.crm.joined"), fmtDate(user.created_at)],
        ]}
      />
    </CrmSection>
    <CrmSection icon={HiOutlineUserGroup} title={t("dashboard.crm.children")} count={data.children?.length || 0}>
      {data.children?.length ? (
        <ul className="space-y-2">
          {data.children.map((child, i) => (
            <ChildCard
              key={child.student.user_id}
              child={child}
              t={t}
              language={language}
              defaultOpen={i === 0}
              onAccessExtended={onAccessExtended}
            />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">{t("dashboard.crm.profile.noChildren")}</p>
      )}
    </CrmSection>
  </div>
);
