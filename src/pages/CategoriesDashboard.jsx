import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { api, getFileUrl } from "../api";
import {
  HiOutlineCollection,
  HiOutlinePlusCircle,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  status: "draft",
  courseIds: [],
};

const CategoriesDashboard = () => {
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [page, setPage] = useState(1);
  const CATEGORIES_PAGE_SIZE = 12;
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: CATEGORIES_PAGE_SIZE,
    totalPages: 1,
  });

  const fetchCategories = async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getAllCategories({
        page: targetPage,
        limit: CATEGORIES_PAGE_SIZE,
      });
      if (res.success) {
        setCategories(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError(t("dashboard.categories.loadFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.categories.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.getAllCourses({ status: "published", limit: 200 });
      if (res.success) setCourses(res.data || []);
    } catch (err) {
      console.error("Failed to fetch courses for category picker", err);
    }
  };

  useEffect(() => {
    fetchCategories(page);
    fetchCourses();
  }, [page]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.title.localeCompare(b.title)),
    [courses],
  );

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const openCreateForm = () => {
    setFormMode("create");
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setCoverFile(null);
    setCoverPreview(null);
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setFormMode("edit");
    setEditingId(category.id);
    setFormData({
      title: category.title || "",
      description: category.description || "",
      price: category.price || "",
      status: category.status || "draft",
      courseIds: (category.courses || []).map((c) => c.id),
    });
    setFormError("");
    setCoverFile(null);
    setCoverPreview(
      category.cover_image_url ? getFileUrl(category.cover_image_url) : null,
    );
    setShowForm(true);
  };

  const toggleCourseSelection = (courseId) => {
    setFormData((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError(t("dashboard.categories.titleRequired"));
      return;
    }
    if (formData.courseIds.length === 0) {
      setFormError(t("dashboard.categories.selectAtLeastOneCourse"));
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        price: formData.price ? Number(formData.price) : 0,
        status: formData.status,
        courseIds: formData.courseIds,
      };

      let categoryId = editingId;
      const res =
        formMode === "create"
          ? await api.createCategory(payload)
          : await api.updateCategory(editingId, payload);

      if (!res.success) {
        setFormError(res.message || t("dashboard.common.operationFailed"));
        setSubmitLoading(false);
        return;
      }

      categoryId = res.data?.id || editingId;

      if (coverFile && categoryId) {
        await api.updateCategoryCoverImage(categoryId, coverFile);
      }

      triggerSuccess(
        formMode === "create"
          ? t("dashboard.categories.created")
          : t("dashboard.categories.updated"),
      );
      setShowForm(false);
      fetchCategories(page);
    } catch (err) {
      setFormError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (category) => {
    if (
      !window.confirm(
        t("dashboard.categories.deleteConfirm", { title: category.title }),
      )
    )
      return;
    try {
      const res = await api.deleteCategory(category.id);
      if (res.success) {
        triggerSuccess(t("dashboard.categories.deleted"));
        fetchCategories(page);
      }
    } catch (err) {
      alert(err?.message || t("dashboard.common.operationFailed"));
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.categories.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {t("dashboard.categories.subtitle")}
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
        >
          <HiOutlinePlusCircle className="text-base" />
          <span>{t("dashboard.categories.create")}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl animate-fadeIn">
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">
              {formMode === "create"
                ? t("dashboard.categories.createTitle")
                : t("dashboard.categories.editTitle")}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50"
            >
              <HiOutlineX />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t("dashboard.categories.name")} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t("dashboard.categories.namePlaceholder")}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t("dashboard.categories.description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {t("dashboard.categories.price")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {t("dashboard.categories.status")}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
                >
                  <option value="draft">{t("dashboard.categories.statusDraft")}</option>
                  <option value="published">
                    {t("dashboard.categories.statusPublished")}
                  </option>
                  <option value="archived">
                    {t("dashboard.categories.statusArchived")}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t("dashboard.categories.coverImage")}
              </label>
              <div className="flex items-center gap-3">
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                  />
                )}
                <input type="file" accept="image/*" onChange={handleCoverChange} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                {t("dashboard.categories.selectCourses")} *
              </label>
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-3 space-y-2">
                {sortedCourses.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    {t("dashboard.accessCodes.noCourses")}
                  </p>
                ) : (
                  sortedCourses.map((course) => (
                    <label
                      key={course.id}
                      className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.courseIds.includes(course.id)}
                        onChange={() => toggleCourseSelection(course.id)}
                        className="mt-1"
                      />
                      <span className="text-sm text-[#2e0854]">{course.title}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                {t("dashboard.accessCodes.selectedCount", {
                  count: formData.courseIds.length,
                })}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-xl text-sm"
              >
                {t("dashboard.common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-4 py-2 bg-brand text-white rounded-xl text-sm disabled:opacity-60"
              >
                {submitLoading
                  ? t("dashboard.common.saving")
                  : t("dashboard.common.create")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] flex flex-col space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {category.cover_image_url ? (
                  <img
                    src={getFileUrl(category.cover_image_url)}
                    alt={category.title}
                    className="w-9 h-9 rounded-xl object-cover border border-gray-100 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center shrink-0">
                    <HiOutlineCollection />
                  </div>
                )}
                <h3 className="text-sm font-bold font-heading text-[#2e0854] truncate">
                  {category.title}
                </h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  category.status === "published"
                    ? "bg-emerald-100 text-emerald-700"
                    : category.status === "archived"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {category.status}
              </span>
            </div>

            {category.description && (
              <p className="text-xs text-gray-400 font-light line-clamp-2">
                {category.description}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {(category.courses || []).map((course) => (
                <span
                  key={course.id}
                  className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple"
                >
                  {course.title}
                </span>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-[#2e0854]">
                {Number(category.price) > 0
                  ? `EGP ${category.price}`
                  : t("common.free")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditForm(category)}
                  className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50"
                  title={t("dashboard.common.edit")}
                >
                  <HiOutlinePencil className="text-xs" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50"
                  title={t("dashboard.common.delete")}
                >
                  <HiOutlineTrash className="text-xs" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-xs text-gray-400 font-light">
              {t("dashboard.categories.empty")}
            </p>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-100 text-gray-500 disabled:opacity-40"
          >
            {t("dashboard.common.back")}
          </button>
          <span className="text-xs font-semibold text-gray-400">
            {page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages || loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-100 text-gray-500 disabled:opacity-40"
          >
            {t("dashboard.common.next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoriesDashboard;
