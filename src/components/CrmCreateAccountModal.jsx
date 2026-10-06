import React, { useEffect, useState } from "react";
import { HiOutlineUserAdd, HiOutlineClipboardCopy, HiOutlineRefresh } from "react-icons/hi";
import api from "../api";
import { EGYPT_GOVERNORATES, DEFAULT_GOVERNORATE } from "../utils/governorates";

// Create a student or parent account right from a CRM chat; the chat is
// linked to the new account and the login details can be sent on the chat.

const genPassword = () => {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const splitName = (name) => {
  const clean = String(name || "").replace(/^@/, "").trim();
  if (!clean) return ["", ""];
  const parts = clean.split(/\s+/);
  return [parts[0], parts.slice(1).join(" ")];
};

const toLocalPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits ? phone : "";
};

const asList = (res) => (Array.isArray(res) ? res : res?.data || res?.levels || res?.curriculums || []);

const field =
  "w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-transparent focus:border-violet-200 focus:bg-white focus:outline-none";

const CrmCreateAccountModal = ({ open, onClose, conversationId, contact, onCreated, t, language }) => {
  const [form, setForm] = useState(null);
  const [levels, setLevels] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const [firstName, lastName] = splitName(contact?.name);
    setForm({
      role: "student",
      firstName,
      lastName,
      phone: toLocalPhone(contact?.phone),
      email: "",
      password: genPassword(),
      academicLevelId: "",
      curriculumId: "",
      studentType: "online",
      governorate: DEFAULT_GOVERNORATE,
      dateOfBirth: "",
      parentPhone: "",
      emergencyContact: "",
      childrenPhones: "",
      sendCredentials: true,
    });
    setError("");
    setResult(null);
    setCopied(false);
    api.getAllLevels().then((r) => setLevels(asList(r))).catch(() => setLevels([]));
    api.getAllCurriculums().then((r) => setCurriculums(asList(r))).catch(() => setCurriculums([]));
  }, [open, contact]);

  if (!open || !form) return null;

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        role: form.role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        sendCredentials: !!form.sendCredentials,
      };
      if (form.role === "student") {
        Object.assign(payload, {
          academicLevelId: form.academicLevelId ? Number(form.academicLevelId) : undefined,
          curriculumId: form.curriculumId ? Number(form.curriculumId) : undefined,
          studentType: form.studentType,
          governorate: form.governorate,
          dateOfBirth: form.dateOfBirth || undefined,
          parentPhone: form.parentPhone.trim() || undefined,
        });
      } else {
        Object.assign(payload, {
          emergencyContact: form.emergencyContact.trim() || undefined,
          childrenPhones: form.childrenPhones
            .split(/[\s,،]+/)
            .map((p) => p.trim())
            .filter(Boolean),
        });
      }
      const res = await api.createCrmAccount(conversationId, payload);
      if (res.success) {
        setResult(res.data);
        onCreated?.(res);
      }
    } catch (err) {
      setError(err.message || t("dashboard.crm.account.failed"));
    } finally {
      setBusy(false);
    }
  };

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`${result.phone}\n${result.password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 text-xs text-[#2e0854] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-2 mb-1">
          <HiOutlineUserAdd className="text-brand-purple text-lg" />
          <h3 className="text-sm font-bold">{t("dashboard.crm.account.title")}</h3>
        </div>

        {result ? (
          <div className="space-y-4 mt-3">
            <div className="p-3 rounded-2xl bg-green-50 border border-green-100 text-green-800 font-semibold">
              {t("dashboard.crm.account.created")}
              {result.linkedParent && <div className="font-normal mt-1">{t("dashboard.crm.account.linkedParent")}</div>}
              {result.linkedChildren > 0 && (
                <div className="font-normal mt-1">
                  {t("dashboard.crm.account.linkedChildren", { count: result.linkedChildren })}
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-gray-50 p-3 space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">{t("dashboard.crm.phone")}</span>
                <span className="font-mono" dir="ltr">{result.phone}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">{t("dashboard.crm.account.password")}</span>
                <span className="font-mono font-bold" dir="ltr">{result.password}</span>
              </div>
              <button
                type="button"
                onClick={copyCredentials}
                className="mt-1 inline-flex items-center gap-1 text-brand-purple font-semibold hover:underline"
              >
                <HiOutlineClipboardCopy /> {copied ? t("dashboard.crm.account.copied") : t("dashboard.crm.account.copy")}
              </button>
            </div>
            {result.credentialsMessage && (
              <p className={result.credentialsMessage.sent ? "text-green-700" : "text-red-600 font-semibold"}>
                {result.credentialsMessage.sent
                  ? t("dashboard.crm.account.sentOnChat")
                  : t("dashboard.crm.account.sendFailed", { detail: result.credentialsMessage.error || "" })}
              </p>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-xl bg-brand text-white font-semibold px-4 py-2">
                {t("dashboard.crm.account.done")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-3">
            <p className="text-gray-500">{t("dashboard.crm.account.hint")}</p>

            <div className="grid grid-cols-2 gap-2">
              {["student", "parent"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role }))}
                  className={`rounded-xl border px-3 py-2 font-semibold ${
                    form.role === role
                      ? "border-violet-300 bg-violet-50 text-brand-purple"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t(`dashboard.crm.roles.${role}`)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="font-semibold">{t("dashboard.crm.account.firstName")}</span>
                <input value={form.firstName} onChange={set("firstName")} required dir="auto" className={field} />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">{t("dashboard.crm.account.lastName")}</span>
                <input value={form.lastName} onChange={set("lastName")} required dir="auto" className={field} />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">{t("dashboard.crm.phone")}</span>
                <input type="tel" value={form.phone} onChange={set("phone")} required dir="ltr" placeholder="01xxxxxxxxx" className={field} />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">{t("dashboard.crm.email")} <span className="text-gray-400 font-normal">({t("dashboard.crm.account.optional")})</span></span>
                <input type="email" value={form.email} onChange={set("email")} dir="ltr" className={field} />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="font-semibold">{t("dashboard.crm.account.password")}</span>
              <div className="flex gap-2">
                <input value={form.password} onChange={set("password")} required minLength={6} dir="ltr" className={`${field} font-mono`} />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, password: genPassword() }))}
                  className="shrink-0 rounded-xl border border-gray-200 px-3 text-gray-500 hover:bg-gray-50"
                  aria-label={t("dashboard.crm.account.regenerate")}
                  title={t("dashboard.crm.account.regenerate")}
                >
                  <HiOutlineRefresh />
                </button>
              </div>
            </label>

            {form.role === "student" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.level")}</span>
                  <select value={form.academicLevelId} onChange={set("academicLevelId")} className={field}>
                    <option value="">—</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.profile.curriculum")}</span>
                  <select value={form.curriculumId} onChange={set("curriculumId")} className={field}>
                    <option value="">—</option>
                    {curriculums.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.studentType")}</span>
                  <select value={form.studentType} onChange={set("studentType")} className={field}>
                    <option value="online">{t("dashboard.crm.studentTypes.online")}</option>
                    <option value="center">{t("dashboard.crm.studentTypes.center")}</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.governorate")}</span>
                  <select value={form.governorate} onChange={set("governorate")} className={field}>
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g.value} value={g.value}>{language === "ar" ? g.ar : g.en}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.profile.dateOfBirth")}</span>
                  <input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} className={field} />
                </label>
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.account.parentPhone")}</span>
                  <input type="tel" value={form.parentPhone} onChange={set("parentPhone")} dir="ltr" placeholder="01xxxxxxxxx" className={field} />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.profile.emergencyContact")}</span>
                  <input value={form.emergencyContact} onChange={set("emergencyContact")} dir="auto" className={field} />
                </label>
                <label className="space-y-1">
                  <span className="font-semibold">{t("dashboard.crm.account.childrenPhones")}</span>
                  <input value={form.childrenPhones} onChange={set("childrenPhones")} dir="ltr" placeholder="01xxxxxxxxx, 01xxxxxxxxx" className={field} />
                  <span className="text-[10px] text-gray-400">{t("dashboard.crm.account.childrenPhonesHint")}</span>
                </label>
              </div>
            )}

            <label className="flex items-start gap-2">
              <input type="checkbox" checked={form.sendCredentials} onChange={set("sendCredentials")} className="mt-0.5" />
              <span>
                <span className="font-semibold block">{t("dashboard.crm.account.sendCredentials")}</span>
                <span className="text-gray-400">{t("dashboard.crm.account.sendCredentialsHint")}</span>
              </span>
            </label>

            {error && (
              <div className="p-2 bg-red-50 border border-red-100 text-red-700 rounded-lg font-semibold">{error}</div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600">
                {t("dashboard.crm.ticket.cancel")}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold px-4 py-2"
              >
                {busy ? t("dashboard.crm.account.creating") : t("dashboard.crm.account.create")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CrmCreateAccountModal;
