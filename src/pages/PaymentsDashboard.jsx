import React, { useEffect, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { api } from "../api";
import { HiOutlineCreditCard, HiOutlineSearch } from "react-icons/hi";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["pending", "paid", "failed", "cancelled"];

const STATUS_BADGE_CLASSES = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PaymentsDashboard = () => {
  const { t } = useTranslation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getAllPaymentOrders({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(itemTypeFilter ? { itemType: itemTypeFilter } : {}),
        ...(search ? { search } : {}),
      });
      if (res.success) {
        setOrders(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err.message || t("dashboard.payments.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, itemTypeFilter, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const statusLabel = (status) =>
    t(`dashboard.payments.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
      <div>
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {t("dashboard.payments.badge")}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3 flex items-center gap-2">
          <HiOutlineCreditCard className="text-brand-purple" />
          {t("dashboard.payments.title")}
        </h1>
        <p className="text-sm text-gray-400 font-light mt-2 max-w-2xl">
          {t("dashboard.payments.subtitle")}
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-100 flex-wrap">
        <button
          onClick={() => {
            setStatusFilter("");
            setPage(1);
          }}
          className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px ${
            statusFilter === ""
              ? "border-brand text-brand"
              : "border-transparent text-gray-400"
          }`}
        >
          {t("dashboard.payments.filterAll")}
        </button>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px ${
              statusFilter === status
                ? "border-brand text-brand"
                : "border-transparent text-gray-400"
            }`}
          >
            {statusLabel(status)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("dashboard.payments.searchPlaceholder")}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs w-72 max-w-full"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-brand text-white rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <HiOutlineSearch /> {t("dashboard.payments.search")}
          </button>
          <select
            value={itemTypeFilter}
            onChange={(e) => {
              setItemTypeFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-xl px-2 py-2 text-xs"
          >
            <option value="">{t("dashboard.payments.itemTypeAll")}</option>
            <option value="course">{t("dashboard.payments.itemTypeCourse")}</option>
            <option value="category">{t("dashboard.payments.itemTypeCategory")}</option>
          </select>
        </form>

        {pagination.total > 0 && (
          <p className="text-xs text-gray-400 font-medium">
            {t("dashboard.payments.totalCount", { total: pagination.total })}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm border rounded-2xl border-dashed">
            {t("dashboard.payments.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">{t("dashboard.common.id")}</th>
                  <th className="text-left p-3">
                    {t("dashboard.payments.columnReference")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.payments.columnStudent")}
                  </th>
                  <th className="text-left p-3">{t("dashboard.payments.columnItem")}</th>
                  <th className="text-left p-3">
                    {t("dashboard.payments.columnAmount")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.payments.columnStatus")}
                  </th>
                  <th className="text-left p-3">
                    {t("dashboard.payments.columnMessage")}
                  </th>
                  <th className="text-left p-3">{t("dashboard.payments.columnDate")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 align-top">
                    <td className="p-3 font-mono text-gray-400 whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="p-3 font-mono whitespace-nowrap">
                      {order.merchant_reference_id}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold">
                        {order.first_name} {order.last_name}
                      </div>
                      <div className="text-gray-400">{order.phone}</div>
                    </td>
                    <td className="p-3">
                      <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple">
                        {order.item_type === "course"
                          ? t("dashboard.payments.itemTypeCourse")
                          : t("dashboard.payments.itemTypeCategory")}
                      </span>{" "}
                      {order.item_title || `#${order.item_id}`}
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono">
                      {order.amount} {order.currency}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          STATUS_BADGE_CLASSES[order.status] ||
                          "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate" title={order.response_message || ""}>
                      {order.response_message || "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-xl border border-gray-100 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-40"
          >
            {t("dashboard.common.back")}
          </button>
          <span className="text-xs text-gray-400">
            {page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl border border-gray-100 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-40"
          >
            {t("dashboard.common.next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentsDashboard;
