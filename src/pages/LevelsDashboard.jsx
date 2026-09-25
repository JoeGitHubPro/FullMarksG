import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api"; // استيراد كائن الـ api المركزي الخاص بك
import {
  HiOutlineArrowLeft,
  HiOutlineTrendingUp,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineHashtag,
  HiOutlineDocumentText,
} from "react-icons/hi";

const LevelsDashboard = () => {
  const { t } = useTranslation();
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  // حالات جلب وتخزين البيانات
  const [levelsData, setLevelsData] = useState([]);
  const [activeLevel, setActiveLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // التحكم في عرض الفورم كاملاً داخل الصفحة (Inline View)
  const [isFormViewActive, setIsFormViewActive] = useState(false);
  const [formMode, setFormMode] = useState("create"); // 'create' أو 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // 1. جلب جميع المراحل الدراسية
  const fetchAllLevels = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAllLevels();
      if (response.success) {
        setLevelsData(response.data);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.levels.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // 2. جلب تفاصيل مرحلة واحدة (عند وجود برامز بالـ URL)
  const fetchSingleLevel = async (target) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getLevelById(target);
      if (response.success) {
        setActiveLevel(response.data);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.levels.notFound"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idOrSlug) {
      fetchSingleLevel(idOrSlug);
    } else {
      fetchAllLevels();
    }
    // إعادة تعيين واجهة الفورم تلقائياً عند تنقل المستخدم بين الروابط
    setIsFormViewActive(false);
  }, [idOrSlug]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // فتح واجهة الإنشاء الكاملة
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setFormData({ name: "", slug: "", description: "" });
    setIsFormViewActive(true);
  };

  // فتح واجهة التعديل الكاملة مع ملء البيانات السابقة
  const handleOpenEditForm = (e, level) => {
    e.stopPropagation(); // منع الانتقال لصفحة التفاصيل عند الضغط على أزرار التحكم
    setFormMode("edit");
    setEditingId(level.id);
    setFormData({
      name: level.name,
      slug: level.slug || "",
      description: level.description || "",
    });
    setIsFormViewActive(true);
  };

  // معالجة إرسال الفورم (إنشاء وتحديث)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      if (formMode === "create") {
        const response = await api.createLevel(formData);
        if (response.success) {
          triggerSuccess(t("dashboard.levels.save"));
          setIsFormViewActive(false);
          fetchAllLevels();
        }
      } else {
        const response = await api.updateLevel(editingId, formData);
        if (response.success) {
          triggerSuccess(t("dashboard.levels.save"));
          setIsFormViewActive(false);
          if (idOrSlug) {
            fetchSingleLevel(idOrSlug);
          } else {
            fetchAllLevels();
          }
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  // حذف مرحلة دراسية
  const handleDeleteLevel = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(t("dashboard.levels.deleteConfirm")))
      return;

    try {
      const response = await api.deleteLevel(id);
      if (response.success) {
        triggerSuccess(t("dashboard.levels.deleted"));
        if (idOrSlug) {
          navigate("/dashboard/grades"); // العودة للرئيسية (أو مسار التبويب الفعلي للمراحل)
        } else {
          fetchAllLevels();
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.deletionFailed"));
    }
  };

  // شاشة الانتظار (Loading) بنفس النمط
  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.levels.loading")}
        </p>
      </div>
    );
  }

  // ==================== الواجهة الأولى: استمارة الإنشاء والتعديل الكاملة (Inline Full View) ====================
  if (isFormViewActive) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsFormViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>{t("dashboard.common.cancelBack")}</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-8">
          <div className="space-y-2 border-b border-gray-50 pb-5">
            <h1 className="text-3xl font-black font-heading tracking-tight text-[#2e0854]">
              {formMode === "create"
                ? t("dashboard.levels.createTitle")
                : t("dashboard.levels.editTitle")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {formMode === "create"
                ? "Register a foundational academic level node (e.g., Grade 10, Year 11) within the multi-tenant registry."
                : "Update metadata parameters for the designated tier layout cluster."}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* اسم المرحلة الدراسية */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.levels.name")}
              </label>
              <div className="relative">
                <HiOutlineTrendingUp className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Grade 11 / AS-Level"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854]"
                />
              </div>
            </div>

            {/* الـ Slug أو المعرف النصي الفريد */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.levels.slug")}
              </label>
              <div className="relative">
                <HiOutlineHashtag className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/ /g, "-"),
                    })
                  }
                  placeholder="e.g., grade-11"
                  className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854]"
                />
              </div>
            </div>

            {/* الوصف التفصيلي للمرحلة */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.levels.description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Initialize taxonomy bounds, core track details, or student classification configurations for this level tier..."
                rows="4"
                className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854] resize-none leading-relaxed"
              />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsFormViewActive(false)}
                className="w-full sm:w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold text-sm py-4 rounded-2xl transition-all active:scale-[0.99]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={formSubmitLoading}
                className="w-full sm:w-2/3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] transition-colors duration-200"
              >
                {formSubmitLoading
                  ? t("dashboard.common.saving")
                  : t("dashboard.levels.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== الواجهة الثانية: عرض تفاصيل مرحلة دراسية واحدة بالتفصيل (Detailed Profile View) ====================
  if (idOrSlug) {
    if (!activeLevel) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.levels.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/grades")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.levels.backDirectory")}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/grades")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>{t("dashboard.levels.backDirectory")}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => handleOpenEditForm(e, activeLevel)}
              className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
            >
              <HiOutlinePencil /> <span>{t("dashboard.levels.edit")}</span>
            </button>
            <button
              onClick={(e) => handleDeleteLevel(e, activeLevel.id)}
              className="flex items-center space-x-1 bg-violet-50 hover:bg-violet-100 text-brand-purple px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              <HiOutlineTrash /> <span>{t("dashboard.common.delete")}</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl animate-fadeIn">
            ✓ {successMsg}
          </div>
        )}

        <div className="bg-[#2e0854] rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-900/30 font-mono">
            {activeLevel.slug || `NODE-ID: ${activeLevel.id}`}
          </span>
          <h2 className="text-2xl font-black font-heading tracking-tight mt-3">
            {activeLevel.name}
          </h2>
          <p className="text-xs text-red-100/70 font-light mt-1.5 max-w-xl leading-relaxed">
            {activeLevel.description ||
              "No customized structural scope blueprint initialized for this academic level tier within server tables."}
          </p>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    );
  }

  // ==================== الواجهة الثالثة: شبكة العرض العامة لجميع المراحل الدراسية (Main Grid View) ====================
  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.levels.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {t("dashboard.levels.subtitle")}
          </p>
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
        >
          <HiOutlinePlus className="text-base" />
          <span>{t("dashboard.levels.create")}</span>
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

      {levelsData.length === 0 ? (
        <div className="text-center py-24 bg-white border border-gray-100 rounded-3xl space-y-3">
          <HiOutlineTrendingUp className="mx-auto text-4xl text-gray-200" />
          <p className="text-sm text-gray-400 font-light">
            {t("dashboard.levels.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levelsData.map((level) => (
            <div
              key={level.id}
              onClick={() =>
                navigate(`/dashboard/grades/${level.slug || level.id}`)
              } // توجيه للمرحلة بناءً على السلوج أو الـ ID
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                    {level.slug || `id: ${level.id}`}
                  </span>

                  {/* أزرار التحكم السريع على الكارت عند الـ Hover */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEditForm(e, level)}
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.common.edit")}
                    >
                      <HiOutlinePencil className="text-xs" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteLevel(e, level.id)}
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.common.delete")}
                    >
                      <HiOutlineTrash className="text-xs" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors pt-1">
                  {level.name}
                </h3>
                <p className="text-xs text-gray-400 font-light line-clamp-3 leading-relaxed">
                  {level.description ||
                    "Structural foundational step layout mapping operational tracking vectors safely."}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 font-light">
                <span className="text-[10px] tracking-wide text-gray-400 uppercase font-mono">
                  Schema Class: Cluster-{level.id}
                </span>
                <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LevelsDashboard;
