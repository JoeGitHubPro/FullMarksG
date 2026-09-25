import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api"; // Centralized API object engine export
import {
  HiOutlineArrowLeft,
  HiOutlineCollection,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineBookmark,
  HiOutlineDocumentText,
} from "react-icons/hi";

const CurriculumsDashboard = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  // Core Data Retrieval States
  const [curriculumsData, setCurriculumsData] = useState([]);
  const [activeCurriculum, setActiveCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // FULL INLINE PAGE FORM CONTROL (No layout-breaking overlays)
  const [isFormViewActive, setIsFormViewActive] = useState(false);
  const [formMode, setFormMode] = useState("create"); // 'create' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // FETCH 1: Gather All Records
  const fetchAllCurriculums = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAllCurriculums();
      if (response.success) {
        setCurriculumsData(response.data);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.curriculums.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // FETCH 2: Target Single Node Deep Lookup
  const fetchSingleCurriculum = async (curriculumId) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getCurriculumById(curriculumId);
      if (response.success) {
        setActiveCurriculum(response.data);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.curriculums.notFound"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSingleCurriculum(id);
    } else {
      fetchAllCurriculums();
    }
    // Safety fallback resets when URL routing state adjusts
    setIsFormViewActive(false);
  }, [id]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Trigger Inline Registration View
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setFormData({ name: "", code: "", description: "" });
    setIsFormViewActive(true);
  };

  // Trigger Inline Modification View
  const handleOpenEditForm = (e, curriculum) => {
    e.stopPropagation();
    setFormMode("edit");
    setEditingId(curriculum.id);
    setFormData({
      name: curriculum.name,
      code: curriculum.code || "",
      description: curriculum.description || "",
    });
    setIsFormViewActive(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      if (formMode === "create") {
        const response = await api.createCurriculum(formData);
        if (response.success) {
          triggerSuccess(t("dashboard.curriculums.save"));
          setIsFormViewActive(false);
          fetchAllCurriculums();
        } else {
          setError(response.message || t("dashboard.common.creationFailed"));
        }
      } else {
        const response = await api.updateCurriculum(editingId, formData);
        if (response.success) {
          triggerSuccess(t("dashboard.curriculums.save"));
          setIsFormViewActive(false);
          if (id) {
            fetchSingleCurriculum(id);
          } else {
            fetchAllCurriculums();
          }
        } else {
          setError(
            response.message || t("dashboard.common.updateFailed"),
          );
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteCurriculum = async (e, curriculumId) => {
    e.stopPropagation();
    if (!window.confirm(t("dashboard.curriculums.deleteConfirm")))
      return;

    try {
      const response = await api.deleteCurriculum(curriculumId);
      if (response.success) {
        triggerSuccess(t("dashboard.curriculums.deleted"));
        if (id) {
          navigate("/dashboard/curriculums");
        } else {
          fetchAllCurriculums();
        }
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.deletionFailed"));
    }
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.curriculums.loading")}
        </p>
      </div>
    );
  }

  // ==================== INLINE FULL PAGE VIEW: CREATION & EDITING INTERFACE ====================
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
                ? t("dashboard.curriculums.createTitle")
                : t("dashboard.curriculums.editTitle")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {formMode === "create"
                ? "Configure core educational systems (like IGCSE, American Diploma, IB) to map subject trees to."
                : "Modify high-level classification data schemas mapping operational course arrays."}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Curriculum Name Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.curriculums.name")}
              </label>
              <div className="relative">
                <HiOutlineBookmark className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Cambridge International IGCSE"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854]"
                />
              </div>
            </div>

            {/* Curriculum Code Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.curriculums.slug")}
              </label>
              <div className="relative">
                <HiOutlineDocumentText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="e.g., CAMS-IG"
                  className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854] uppercase"
                />
              </div>
            </div>

            {/* Curriculum Description Area */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.curriculums.description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Detail evaluation setups, grading rules and regional metrics parameters mapping to this standard..."
                rows="4"
                className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854] resize-none leading-relaxed"
              />
            </div>

            {/* Verification Parameter checkbox */}
            <div className="flex items-center space-x-2 pt-1 px-1">
              <input
                type="checkbox"
                id="verify_curriculum_integrity"
                required
                className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple cursor-pointer"
              />
              <label
                htmlFor="verify_curriculum_integrity"
                className="text-xs text-gray-400 font-light select-none cursor-pointer"
              >
                Confirm structural taxonomy system alignment rules
              </label>
            </div>

            {/* Form Actions Footing Wrapper */}
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
                  : t("dashboard.curriculums.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== VIEW 1: SINGLE ISOLATED CURRICULUM PROFILE DETAIL SHEET ====================
  if (id) {
    if (!activeCurriculum) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.curriculums.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/curriculums")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.curriculums.backDirectory")}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/curriculums")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>{t("dashboard.curriculums.backDirectory")}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => handleOpenEditForm(e, activeCurriculum)}
              className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
            >
              <HiOutlinePencil /> <span>{t("dashboard.curriculums.edit")}</span>
            </button>
            <button
              onClick={(e) => handleDeleteCurriculum(e, activeCurriculum.id)}
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
            {activeCurriculum.code}
          </span>
          <h2 className="text-2xl font-black font-heading tracking-tight mt-3">
            {activeCurriculum.name}
          </h2>
          <p className="text-xs text-red-100/70 font-light mt-1.5 max-w-xl leading-relaxed">
            {activeCurriculum.description ||
              "No description provided inside this system layout instance configuration reference entry."}
          </p>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: GLOBAL CURRICULUMS SYSTEM TRACK GRID DIRECTORY ====================
  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.curriculums.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {t("dashboard.curriculums.subtitle")}
          </p>
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
        >
          <HiOutlinePlus className="text-base" />
          <span>{t("dashboard.curriculums.create")}</span>
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

      {curriculumsData.length === 0 ? (
        <div className="text-center py-24 bg-white border border-gray-100 rounded-3xl space-y-3">
          <HiOutlineCollection className="mx-auto text-4xl text-gray-200" />
          <p className="text-sm text-gray-400 font-light">
            {t("dashboard.curriculums.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {curriculumsData.map((curriculum) => (
            <div
              key={curriculum.id}
              onClick={() =>
                navigate(`/dashboard/curriculums/${curriculum.id}`)
              }
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-purple bg-violet-50/70 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                    {curriculum.code}
                  </span>

                  {/* Row Actions Matrix */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEditForm(e, curriculum)}
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.common.edit")}
                    >
                      <HiOutlinePencil className="text-xs" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCurriculum(e, curriculum.id)}
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.common.delete")}
                    >
                      <HiOutlineTrash className="text-xs" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors pt-1">
                  {curriculum.name}
                </h3>
                <p className="text-xs text-gray-400 font-light line-clamp-3 leading-relaxed">
                  {curriculum.description ||
                    "No core description properties initialized inside this specific track context registry row."}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 font-light">
                <span className="text-[11px] font-medium text-gray-400">
                  Node Identifier: Cluster-{curriculum.id}
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

export default CurriculumsDashboard;
