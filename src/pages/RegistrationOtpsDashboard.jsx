import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import {
  HiOutlineKey,
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineMail,
  HiOutlineChat,
  HiOutlineCheckCircle,
} from "react-icons/hi";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const RegistrationOtpsDashboard = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchRows = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await api.getRegistrationOtps();
      if (res.success) setRows(res.data || []);
    } catch (err) {
      setError(err.message || t("dashboard.registrationOtps.loadFailed"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRows();
    const interval = setInterval(() => fetchRows({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [fetchRows]);

  const handleDelete = async (id) => {
    if (!window.confirm(t("dashboard.registrationOtps.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await api.deleteRegistrationOtp(id);
      if (res.success) {
        setRows((current) => current.filter((row) => row.id !== id));
      }
    } catch (err) {
      setError(err.message || t("dashboard.registrationOtps.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
            {t("dashboard.registrationOtps.badge")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3 flex items-center gap-2">
            <HiOutlineKey className="text-brand-purple" />
            {t("dashboard.registrationOtps.title")}
          </h1>
          <p className="text-sm text-gray-400 font-light mt-2 max-w-2xl">
            {t("dashboard.registrationOtps.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRows()}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-purple"
        >
          <HiOutlineRefresh /> {t("dashboard.common.retry")}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm border rounded-2xl border-dashed">
            {t("dashboard.registrationOtps.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">
                    {t("dashboard.registrationOtps.phone")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.registrationOtps.accountType")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.registrationOtps.code")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.registrationOtps.deliveredVia")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.registrationOtps.verified")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.registrationOtps.requestedAt")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.registrationOtps.expiresAt")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const expired = new Date(row.expires_at) < new Date();
                  return (
                    <tr
                      key={row.id}
                      className="border-b hover:bg-gray-50 align-top"
                    >
                      <td className="p-3 font-mono whitespace-nowrap">
                        {row.phone}
                        {!!row.is_existing_parent && (
                          <span className="block text-[10px] text-gray-400 font-sans">
                            {t("dashboard.registrationOtps.existingParent")}
                          </span>
                        )}
                        {row.email && (
                          <span className="block text-[10px] text-gray-400 font-sans">
                            {row.email}
                          </span>
                        )}
                      </td>
                      <td className="p-3 capitalize">{row.account_type}</td>
                      <td className="p-3 font-mono font-black text-sm tracking-widest">
                        {row.otp_code}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {row.delivered_via_whatsapp ? (
                            <span className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              <HiOutlineChat /> WhatsApp
                            </span>
                          ) : null}
                          {row.delivered_via_email ? (
                            <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              <HiOutlineMail /> Email
                            </span>
                          ) : null}
                          {!row.delivered_via_whatsapp &&
                            !row.delivered_via_email && (
                              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
                                {t("dashboard.registrationOtps.notDelivered")}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="p-3">
                        {row.verified ? (
                          <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                            <HiOutlineCheckCircle />{" "}
                            {t("dashboard.registrationOtps.verifiedYes")}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] font-bold">
                            {t("dashboard.registrationOtps.verifiedNo")}
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={expired ? "text-brand" : ""}>
                          {formatDate(row.expires_at)}
                        </span>
                        {expired && (
                          <span className="block text-[10px] text-brand">
                            {t("dashboard.registrationOtps.expired")}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="text-brand-purple hover:underline disabled:opacity-50"
                          title={t("dashboard.common.delete")}
                        >
                          <HiOutlineTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationOtpsDashboard;
