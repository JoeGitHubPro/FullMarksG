import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { api } from "../api";
import {
  HiOutlineArrowLeft,
  HiOutlineAcademicCap,
  HiOutlineCollection,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineBookOpen,
  HiOutlineDocumentText,
} from "react-icons/hi";

const SubjectsDashboard = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();

  // Core Data Retrieval States
  const [subjectsData, setSubjectsData] = useState([]);
  const [activeSubject, setActiveSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // INLINE VIEW CONTROL (Replaces the broken modal overlay)
  const [isFormViewActive, setIsFormViewActive] = useState(false);
  const [formMode, setFormMode] = useState("create"); // 'create' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    subjectCode: "",
    description: "",
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // FETCH 1: Directory Catalog
  const fetchAllSubjects = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAllSubjects();
      if (response.success) {
        setSubjectsData(response.data);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.subjects.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // FETCH 2: Isolated Subject Node
  const fetchSingleSubject = async (id) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getSubjectById(id);
      if (response.success) {
        setActiveSubject(response.data);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.subjects.notFound"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchSingleSubject(slug);
    } else {
      fetchAllSubjects();
    }
    // Automatically reset inline views when route params change
    setIsFormViewActive(false);
  }, [slug]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Show Full-Screen Registration Panel Inline
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setFormData({ name: "", subjectCode: "", description: "" });
    setIsFormViewActive(true);
  };

  // Show Full-Screen Modification Panel Inline
  const handleOpenEditForm = (e, subject) => {
    e.stopPropagation();
    setFormMode("edit");
    setEditingId(subject.id);
    setFormData({
      name: subject.name,
      subjectCode: subject.subject_code || subject.subjectCode || "",
      description: subject.description || "",
    });
    setIsFormViewActive(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      if (formMode === "create") {
        const response = await api.createSubject(formData);
        if (response.success) {
          triggerSuccess(t("dashboard.subjects.save"));
          setIsFormViewActive(false);
          fetchAllSubjects();
        }
      } else {
        const response = await api.updateSubject(editingId, formData);
        if (response.success) {
          triggerSuccess(t("dashboard.subjects.save"));
          setIsFormViewActive(false);
          if (slug) {
            fetchSingleSubject(slug);
          } else {
            fetchAllSubjects();
          }
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteSubject = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm(t("dashboard.subjects.deleteConfirm")))
      return;

    try {
      const response = await api.deleteSubject(id);
      if (response.success) {
        triggerSuccess(t("dashboard.subjects.deleted"));
        if (slug) {
          navigate("/dashboard/subjects");
        } else {
          fetchAllSubjects();
        }
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
          {t("dashboard.subjects.loading")}
        </p>
      </div>
    );
  }

  // ==================== INLINE FULL PAGE VIEW: REGISTRATION / EDIT FORM ====================
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
                ? t("dashboard.subjects.createTitle")
                : t("dashboard.subjects.editTitle")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {formMode === "create"
                ? "Deploy a brand new academic core module segment structure into the database registry."
                : "Update data pipeline properties and properties schema parameters."}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.subjects.name")}
              </label>
              <div className="relative">
                <HiOutlineBookOpen className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Chemical Sciences"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.subjects.code")}
              </label>
              <div className="relative">
                <HiOutlineDocumentText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  required
                  value={formData.subjectCode}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectCode: e.target.value })
                  }
                  placeholder="e.g., CHEM-101"
                  className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854] uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.subjects.description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter module pipeline overview mappings and deep structure parameters..."
                rows="4"
                className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-[#2e0854] resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1 px-1">
              <input
                type="checkbox"
                id="confirm_integrity"
                required
                className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple cursor-pointer"
              />
              <label
                htmlFor="confirm_integrity"
                className="text-xs text-gray-400 font-light select-none cursor-pointer"
              >
                Verify system data mapping integrity validation parameters
              </label>
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
                  : t("dashboard.subjects.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== VIEW 1: DYNAMIC SINGLE SUBJECT PROFILE VIEW ====================
  if (slug) {
    if (!activeSubject) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.subjects.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/subjects")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.subjects.backAll")}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/subjects")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>{t("dashboard.subjects.backAll")}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => handleOpenEditForm(e, activeSubject)}
              className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
            >
              <HiOutlinePencil /> <span>{t("dashboard.subjects.edit")}</span>
            </button>
            <button
              onClick={(e) => handleDeleteSubject(e, activeSubject.id)}
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
            {activeSubject.subject_code || activeSubject.subjectCode}
          </span>
          <h2 className="text-2xl font-black font-heading tracking-tight mt-3">
            {activeSubject.name}
          </h2>
          <p className="text-xs text-red-100/70 font-light mt-1.5 max-w-xl leading-relaxed">
            {activeSubject.description ||
              "No customized structural blueprint description provided inside the master core registry."}
          </p>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-[0_15px_40px_rgba(43,2,7,0.01)]">
            <div>
              <h3 className="font-heading font-black text-base text-[#2e0854]">
                Related Departmental Courses
              </h3>
              <p className="text-[11px] text-gray-400 font-light">
                Classes currently requiring matching subject clearance codes.
              </p>
            </div>
            <div className="space-y-3">
              {activeSubject.courses && activeSubject.courses.length > 0 ? (
                activeSubject.courses.map((course, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gray-50/70 border border-transparent hover:border-violet-100 rounded-2xl transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center text-base shadow-inner">
                        <HiOutlineAcademicCap />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2e0854] font-heading">
                          {course.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                          Node: {course.slug || `TERM-${course.term}`}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-brand-purple bg-white px-3 py-1.5 rounded-xl border border-gray-100">
                      EGP {course.price}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <p className="text-xs text-gray-400 font-light">
                    No active live courses linked to this subject node yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-[0_15px_40px_rgba(43,2,7,0.01)]">
            <div>
              <h3 className="font-heading font-black text-base text-[#2e0854]">
                Subject Specialists
              </h3>
              <p className="text-[11px] text-gray-400 font-light">
                Instructors holding validation rights for this field.
              </p>
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {activeSubject.instructors &&
              activeSubject.instructors.length > 0 ? (
                activeSubject.instructors.map((faculty, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-gray-50/70 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-500 border border-gray-100 flex items-center justify-center font-heading text-xs font-bold shrink-0 shadow-sm uppercase">
                      {faculty.initial ||
                        faculty.first_name?.substring(0, 2) ||
                        "ST"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#2e0854] truncate">
                        {faculty.first_name} {faculty.last_name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[180px] font-light">
                        {faculty.bio || "Certified Subject Matter Specialist"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 font-light text-xs">
                  No validated specialists assigned.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: ALL SUBJECTS MAIN DIRECTORY GRID CATALOG ====================
  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.subjects.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {t("dashboard.subjects.subtitle")}
          </p>
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
        >
          <HiOutlinePlus className="text-base" />
          <span>{t("dashboard.subjects.create")}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjectsData.map((subject) => (
          <div
            key={subject.id}
            onClick={() => navigate(`/dashboard/subjects/${subject.id}`)}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                  {subject.subject_code || subject.subjectCode}
                </span>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEditForm(e, subject)}
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.common.edit")}
                  >
                    <HiOutlinePencil className="text-xs" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSubject(e, subject.id)}
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.common.delete")}
                  >
                    <HiOutlineTrash className="text-xs" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors pt-1">
                {subject.name}
              </h3>
              <p className="text-xs text-gray-400 font-light line-clamp-3 leading-relaxed">
                {subject.description ||
                  "Core structural blueprint definition syncing integrated modules across servers."}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 font-light">
              <span className="flex items-center">
                <HiOutlineCollection className="mr-1.5 text-gray-400 text-sm" />
                {subject.total_linked_courses || 0} Modules Assigned
              </span>
              <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectsDashboard;
