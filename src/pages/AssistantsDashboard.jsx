import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { useParams, useNavigate } from "react-router-dom";
import { api, getFileUrl } from "../api";
import ProfileAvatarManager, {
  getUserProfileImage,
} from "../components/ProfileAvatarManager";
import {
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineArrowLeft,
  HiOutlineUserGroup,
  HiOutlineChevronRight,
  HiOutlineShieldCheck,
  HiOutlineBriefcase,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineDownload,
} from "react-icons/hi";

const getInitials = (first, last) =>
  `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();

const getInstructorRecordId = (instructor) => {
  if (!instructor) return "";
  if (instructor.instructor_record_id) return instructor.instructor_record_id;
  if (instructor.roleData?.id) return instructor.roleData.id;
  if (instructor.user_id != null) return instructor.id;
  return "";
};

const PERMISSION_LABELS = {
  read_only: "dashboard.common.readOnly",
  edit_grades: "dashboard.common.canEditGrades",
  full_access: "dashboard.common.fullAccess",
};

const PERMISSION_OPTIONS = [
  { value: "read_only", labelKey: "dashboard.common.readOnly" },
  { value: "edit_grades", labelKey: "dashboard.common.canEditGrades" },
  { value: "full_access", labelKey: "dashboard.common.fullAccess" },
];

const AssistantsDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // User info
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentInstructorId, setCurrentInstructorId] = useState(null);

  // Core Data States
  const [assistantsData, setAssistantsData] = useState([]);
  const [activeAssistant, setActiveAssistant] = useState(null);
  const [instructorsList, setInstructorsList] = useState([]);
  const [assistedCourses, setAssistedCourses] = useState([]);
  const [gradedSubmissions, setGradedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Inline Form View Control
  const [isFormViewActive, setIsFormViewActive] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    assignedInstructorId: "",
    profileImageUrl: null,
    permissionsLevel: "full_access",
    isActive: true,
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Inline submissions view for a specific graded assignment
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  // ----- Fetch current user -----
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.getMe();
        if (res.success) {
          const user = res.data;
          setCurrentUserRole(user.role);
          if (user.role === "instructor") {
            const instructorId = user.roleData?.id;
            setCurrentInstructorId(instructorId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch current user", err);
      }
    };
    fetchUser();
  }, []);

  // ----- Fetch all assistants (filtered for instructors) -----
  const fetchAllAssistants = async () => {
    setLoading(true);
    setError("");
    try {
      const filters = { limit: 100 };
      if (currentUserRole === "instructor" && currentInstructorId) {
        filters.assignedInstructorId = currentInstructorId;
      }

      const response = await api.getAllAssistants(filters);
      if (response.success) {
        setAssistantsData(response.data);
      } else {
        setError(t("dashboard.assistants.loadFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.assistants.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ----- Fetch single assistant (with permission check) -----
  const fetchSingleAssistant = async (id) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAssistantById(id);
      if (response.success) {
        const assistant = response.data;
        // If instructor, ensure this assistant is assigned to them
        if (currentUserRole === "instructor" && currentInstructorId) {
          if (
            assistant.roleData?.assigned_instructor_id !== currentInstructorId
          ) {
            setError(t("dashboard.assistants.permissionDenied"));
            setActiveAssistant(null);
            setLoading(false);
            return;
          }
        }
        setActiveAssistant(assistant);

        const instructorId = assistant.roleData?.assigned_instructor_id;
        if (instructorId) {
          const coursesRes = await api.getAllCourses({
            instructorId,
            limit: 100,
          });
          if (coursesRes.success) setAssistedCourses(coursesRes.data);
          else setAssistedCourses([]);
        } else {
          setAssistedCourses([]);
        }

        // Fetch grades graded by this assistant
        try {
          const gradesRes = await api.getGradesByGrader(id);
          if (gradesRes.success) setGradedSubmissions(gradesRes.data);
          else setGradedSubmissions([]);
        } catch (gradeErr) {
          console.error("Could not fetch grades:", gradeErr);
          setGradedSubmissions([]);
        }
      } else {
        setError(t("dashboard.assistants.notFound"));
        setActiveAssistant(null);
      }
    } catch (err) {
      setError(err?.message || "Failed to retrieve assistant profile.");
    } finally {
      setLoading(false);
    }
  };

  // ----- Fetch instructors for dropdown (only if admin) -----
  const fetchInstructors = async () => {
    if (currentUserRole !== "admin") return;
    try {
      const res = await api.getAllInstructors({ limit: 200 });
      if (res.success) setInstructorsList(res.data);
    } catch (err) {
      console.error("Failed to load instructors", err);
    }
  };

  // ----- Effects -----
  useEffect(() => {
    if (!currentUserRole) return;
    if (currentUserRole === "instructor" && !currentInstructorId) return;

    fetchInstructors();
    if (slug) {
      fetchSingleAssistant(slug);
    } else {
      fetchAllAssistants();
    }
    setIsFormViewActive(false);
  }, [slug, currentUserRole, currentInstructorId]);

  // ----- Helpers -----
  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // ----- Submissions view handlers -----
  const handleViewSubmissions = async (grade) => {
    setViewingAssignment(grade);
    setSubmissionsLoading(true);
    try {
      const res = await api.getSubmissionsForItem(grade.chapter_item_id);
      if (res.success && Array.isArray(res.data)) {
        setSubmissionsList(res.data);
      } else {
        setSubmissionsList([]);
      }
    } catch (err) {
      console.error(err);
      setSubmissionsList([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleBackToGradesList = () => {
    setViewingAssignment(null);
    setSubmissionsList([]);
    setGradingSubmission(null);
  };

  const handleGradeSubmission = async (submissionId) => {
    if (!gradeScore) return;
    try {
      const res = await api.gradeSubmission(
        submissionId,
        parseFloat(gradeScore),
        gradeFeedback,
      );
      if (res.success) {
        alert(t("dashboard.common.gradeSaved"));
        setGradingSubmission(null);
        setGradeScore("");
        setGradeFeedback("");
        if (viewingAssignment) {
          setSubmissionsLoading(true);
          const updatedRes = await api.getSubmissionsForItem(
            viewingAssignment.chapter_item_id,
          );
          if (updatedRes.success && Array.isArray(updatedRes.data)) {
            setSubmissionsList(updatedRes.data);
          }
          setSubmissionsLoading(false);
        }
      } else {
        alert(res.message || t("dashboard.common.gradingFailed"));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ----- Form handlers -----
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setEditingId(null);
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      assignedInstructorId:
        currentUserRole === "instructor" ? currentInstructorId : "",
      profileImageUrl: null,
      permissionsLevel: "full_access",
      isActive: true,
    });
    setIsFormViewActive(true);
  };

  const handleOpenEditForm = (e, assistant) => {
    e.stopPropagation();
    setFormMode("edit");
    setEditingId(assistant.id);
    setFormData({
      firstName: assistant.firstName,
      lastName: assistant.lastName,
      phone: assistant.phone,
      email: assistant.email || "",
      password: "",
      assignedInstructorId:
        assistant.roleData?.assigned_instructor_id ||
        assistant.assigned_instructor_id ||
        "",
      profileImageUrl: getUserProfileImage(assistant),
      permissionsLevel: assistant.roleData?.permissions_level || "full_access",
      isActive: assistant.isActive,
    });
    setIsFormViewActive(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      if (formMode === "create") {
        if (!formData.password || formData.password.length < 6) {
          setError(t("dashboard.common.passwordMin"));
          setFormSubmitLoading(false);
          return;
        }
        if (currentUserRole === "admin" && !formData.assignedInstructorId) {
          setError("Please select an instructor to assign this assistant to.");
          setFormSubmitLoading(false);
          return;
        }
        const assignedInstructorId =
          currentUserRole === "instructor"
            ? currentInstructorId
            : Number(formData.assignedInstructorId);

        if (!assignedInstructorId) {
          setError("Please select an instructor to assign this assistant to.");
          setFormSubmitLoading(false);
          return;
        }

        const response = await api.createAssistant({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || null,
          password: formData.password,
          assignedInstructorId,
          permissionsLevel: formData.permissionsLevel,
          isActive: formData.isActive,
        });
        if (response.success) {
          triggerSuccess("Assistant account created successfully.");
          setIsFormViewActive(false);
          fetchAllAssistants();
        } else {
          setError(response.message || t("dashboard.common.creationFailed"));
        }
      } else {
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || null,
          isActive: formData.isActive,
          assignedInstructorId: formData.assignedInstructorId
            ? Number(formData.assignedInstructorId)
            : null,
          permissionsLevel: formData.permissionsLevel,
        };
        const response = await api.updateAssistant(editingId, updateData);
        if (response.success) {
          triggerSuccess("Assistant account updated successfully.");
          setIsFormViewActive(false);
          if (slug) {
            fetchSingleAssistant(slug);
          } else {
            fetchAllAssistants();
          }
        } else {
          setError(response.message || t("dashboard.common.updateFailed"));
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteAssistant = async (e, assistantId, assistantName) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete assistant "${assistantName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const response = await api.deleteAssistant(assistantId);
      if (response.success) {
        triggerSuccess("Assistant account permanently removed.");
        if (slug) {
          navigate("/dashboard/assistants");
        } else {
          fetchAllAssistants();
        }
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || "Could not delete assistant account.");
    }
  };

  // ---- RENDER: Loading ----
  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.assistants.loading")}
        </p>
      </div>
    );
  }

  // ---- RENDER: Inline Form (Create/Edit) ----
  if (isFormViewActive) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsFormViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.common.cancelBack")}</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-8">
          <div className="space-y-2 border-b border-gray-50 pb-5">
            <h1 className="text-3xl font-black font-heading tracking-tight text-[#2e0854]">
              {formMode === "create"
                ? t("dashboard.assistants.create")
                : t("dashboard.assistants.edit")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {formMode === "create"
                ? "Create a teaching assistant account and assign to an instructor."
                : "Modify assistant details, instructor assignment, or permissions."}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
              ⚠️ {error}
            </div>
          )}

          {formMode === "edit" && editingId && (
            <div className="flex justify-center pb-2">
              <ProfileAvatarManager
                userId={editingId}
                imageUrl={getUserProfileImage({
                  profile_image_url: formData.profileImageUrl,
                })}
                firstName={formData.firstName}
                lastName={formData.lastName}
                size="lg"
                editable
                variant="light"
                onUpdated={(imageUrl) => {
                  setFormData((prev) => ({
                    ...prev,
                    profileImageUrl: imageUrl,
                  }));
                }}
                onRemoved={() => {
                  setFormData((prev) => ({
                    ...prev,
                    profileImageUrl: null,
                  }));
                }}
              />
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.common.firstNameRequired")}
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.common.lastNameRequired")}
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Smith"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.common.phoneRequired")}
              </label>
              <div className="relative">
                <HiOutlinePhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+201234567890"
                  className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.common.emailOptional")}
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="assistant@example.com"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Assigned Instructor – admin sees dropdown, instructor sees read‑only */}
            {currentUserRole === "admin" ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.assistants.assignedInstructor")} *
                </label>
                <select
                  value={formData.assignedInstructorId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assignedInstructorId: e.target.value,
                    })
                  }
                  required
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                >
                  <option value="">-- Select Instructor --</option>
                  {instructorsList.map((instructor) => (
                    <option
                      key={instructor.id}
                      value={getInstructorRecordId(instructor)}
                    >
                      {instructor.first_name || instructor.firstName}{" "}
                      {instructor.last_name || instructor.lastName} (
                      {instructor.phone})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              // Instructor: auto‑assigned, read‑only
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.assistants.assignedInstructor")}
                </label>
                <input
                  type="text"
                  value={t("dashboard.assistants.assignedToYou")}
                  disabled
                  className="w-full bg-gray-100 text-sm border border-gray-200 rounded-2xl px-4 py-4 cursor-not-allowed"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Permission Level
              </label>
              <select
                value={formData.permissionsLevel}
                onChange={(e) =>
                  setFormData({ ...formData, permissionsLevel: e.target.value })
                }
                className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {formMode === "create" && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.common.passwordRequired")}
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  minLength={6}
                  placeholder="••••••"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
                <p className="text-[10px] text-gray-400 px-1">
                  Minimum 6 characters
                </p>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2 px-1">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple cursor-pointer"
              />
              <label
                htmlFor="isActive"
                className="text-xs text-gray-400 font-light select-none cursor-pointer"
              >
                Account active (can log in and assist)
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
                className="w-full sm:w-2/3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99]"
              >
                {formSubmitLoading
                  ? t("dashboard.common.processing")
                  : formMode === "create"
                    ? t("dashboard.assistants.createAccount")
                    : t("common.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---- RENDER: Single Assistant Profile ----
  if (slug) {
    if (!activeAssistant) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {error || t("dashboard.assistants.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/assistants")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.assistants.backAll")}
          </button>
        </div>
      );
    }

    const roleData = activeAssistant.roleData;

    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/assistants")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.assistants.backAll")}</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => handleOpenEditForm(e, activeAssistant)}
              className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
            >
              <HiOutlinePencil /> <span>{t("dashboard.common.edit")}</span>
            </button>
            <button
              onClick={(e) =>
                handleDeleteAssistant(
                  e,
                  activeAssistant.id,
                  `${activeAssistant.first_name} ${activeAssistant.last_name}`,
                )
              }
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
        {error && (
          <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-[#2e0854] rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
          <div className="flex items-center space-x-4">
            <ProfileAvatarManager
              userId={activeAssistant.id}
              imageUrl={getUserProfileImage(activeAssistant)}
              firstName={activeAssistant.first_name || activeAssistant.firstName}
              lastName={activeAssistant.last_name || activeAssistant.lastName}
              size="md"
              editable={
                currentUserRole === "admin" || currentUserRole === "instructor"
              }
              variant="dark"
              onUpdated={(imageUrl) => {
                setActiveAssistant((prev) => ({
                  ...prev,
                  profile_image_url: imageUrl,
                }));
                triggerSuccess(t("dashboard.common.profileImageUpdated"));
              }}
              onRemoved={() => {
                setActiveAssistant((prev) => ({
                  ...prev,
                  profile_image_url: null,
                }));
                triggerSuccess(t("dashboard.common.profileImageRemoved"));
              }}
            />
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-900/30 font-mono">
                ID-{activeAssistant.id}
              </span>
              <h2 className="text-2xl font-black font-heading tracking-tight mt-2">
                {activeAssistant.first_name} {activeAssistant.last_name}
              </h2>
              <p className="text-xs text-red-100/70 font-light">
                {t("dashboard.assistants.teachingAssistant")} •{" "}
                {activeAssistant.is_active ? t("dashboard.common.active") : t("dashboard.common.disabled")}
              </p>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* If viewing submissions, show that panel instead of the grid */}
        {viewingAssignment ? (
          <div className="max-w-4xl space-y-6">
            <button
              onClick={handleBackToGradesList}
              className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
            >
              <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.assistants.backOverview")}</span>
            </button>

            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-6">
              <div className="border-b border-gray-50 pb-4">
                <h1 className="text-2xl font-black font-heading tracking-tight">
                  Grade: {viewingAssignment.item_title}
                </h1>
                <p className="text-gray-400 text-sm font-light mt-1">
                  {viewingAssignment.course_title} –{" "}
                  {viewingAssignment.student_first}{" "}
                  {viewingAssignment.student_last}
                </p>
              </div>

              {submissionsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : submissionsList.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {t("dashboard.common.noSubmissions")}
                </div>
              ) : (
                <div className="space-y-5">
                  {submissionsList.map((sub) => (
                    <div
                      key={sub.id}
                      className="border border-gray-100 rounded-xl p-5 space-y-3 hover:bg-gray-50/30 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-[#2e0854]">
                            {sub.first_name} {sub.last_name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Submitted:{" "}
                            {new Date(sub.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        {sub.score !== null && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                            {t("dashboard.common.score")}: {sub.score}
                          </span>
                        )}
                      </div>

                      {sub.submission_text && (
                        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                          {sub.submission_text}
                        </div>
                      )}
                      {sub.submission_file && (
                        <a
                          href={getFileUrl(sub.submission_file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-purple hover:text-brand"
                        >
                          <HiOutlineDownload /> {t("dashboard.assignments.downloadAttachment")}
                        </a>
                      )}

                      {gradingSubmission === sub.id ? (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              {t("dashboard.common.score")}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={t("dashboard.common.score")}
                              value={gradeScore}
                              onChange={(e) => setGradeScore(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              {t("dashboard.common.feedback")}
                            </label>
                            <textarea
                              rows="2"
                              placeholder={t("dashboard.common.feedbackPlaceholder")}
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setGradingSubmission(null)}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              onClick={() => handleGradeSubmission(sub.id)}
                              className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark"
                            >
                              Save Grade
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setGradingSubmission(sub.id);
                            setGradeScore(sub.score || "");
                            setGradeFeedback(sub.feedback || "");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Grade
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal grid: left (courses + graded) + right (contact & assignment) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              {/* Assisted Courses Panel */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                      <HiOutlineBookOpen className="text-brand-purple" />
                      Assisted Courses
                    </h3>
                    <p className="text-[11px] text-gray-400 font-light">
                      Courses managed by the assigned instructor.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl">
                    {assistedCourses.length} Courses
                  </span>
                </div>

                <div className="space-y-3">
                  {assistedCourses.length > 0 ? (
                    assistedCourses.map((course) => (
                      <div
                        key={course.id}
                        onClick={() =>
                          navigate(`/dashboard/courses/${course.slug}`)
                        }
                        className="p-4 bg-gray-50/40 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-between gap-4 group cursor-pointer"
                      >
                        <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-violet-50 text-brand flex items-center justify-center text-base shrink-0">
                            <HiOutlineAcademicCap />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[#2e0854] font-heading group-hover:text-brand-purple transition-colors truncate">
                              {course.title}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-1 font-mono">
                              {course.term}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded capitalize ${
                            {
                              published: "text-emerald-700 bg-emerald-50",
                              draft: "text-gray-400 bg-gray-100",
                              archived: "text-amber-700 bg-amber-50",
                            }[course.status] || "text-gray-400 bg-gray-100"
                          }`}
                        >
                          {course.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                      <p className="text-xs text-gray-400 font-light">
                        No courses found for the assigned instructor.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Graded Submissions Panel */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                      <HiOutlinePencil className="text-brand-purple" />
                      Recent Graded Work
                    </h3>
                    <p className="text-[11px] text-gray-400 font-light">
                      Submissions graded by this assistant – click to view
                    </p>
                  </div>
                  <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl">
                    {gradedSubmissions.length} grades
                  </span>
                </div>

                {gradedSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {gradedSubmissions.slice(0, 10).map((grade) => (
                      <div
                        key={grade.id}
                        onClick={() => handleViewSubmissions(grade)}
                        className="p-4 bg-gray-50/40 border border-gray-100 rounded-xl flex items-start justify-between gap-4 cursor-pointer hover:bg-white hover:shadow-sm transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#2e0854] truncate">
                            {grade.item_title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {grade.course_title} · {grade.student_first}{" "}
                            {grade.student_last}
                          </p>
                          <p className="text-xs font-mono text-gray-500 mt-1">
                            {t("dashboard.common.score")}:{" "}
                            <span className="font-bold text-brand-purple">
                              {grade.score}
                            </span>
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(grade.graded_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                    <p className="text-xs text-gray-400">
                      No grades recorded yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (contact & assignment) */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-heading font-black text-base text-[#2e0854]">
                  Contact
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                    <HiOutlinePhone className="text-gray-400 text-base shrink-0" />
                    <span className="font-mono text-xs">
                      {activeAssistant.phone}
                    </span>
                  </div>
                  {activeAssistant.email && (
                    <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                      <HiOutlineMail className="text-gray-400 text-base shrink-0" />
                      <span className="text-xs truncate">
                        {activeAssistant.email}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-gray-50 text-[10px] text-gray-400">
                  Registered:{" "}
                  {new Date(activeAssistant.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-heading font-black text-base text-[#2e0854]">
                    Assignment & Permissions
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Assigned instructor and access level
                  </p>
                </div>
                {roleData ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center">
                        <HiOutlineUserGroup />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          {t("dashboard.assistants.assignedInstructor")}
                        </p>
                        {roleData.instructor_first_name ? (
                          <button
                            onClick={() =>
                              navigate(
                                `/dashboard/instructors/${roleData.assigned_instructor_id}`,
                              )
                            }
                            className="text-sm font-bold text-[#2e0854] hover:text-brand-purple transition-colors text-start truncate w-full focus:outline-none"
                          >
                            {roleData.instructor_first_name}{" "}
                            {roleData.instructor_last_name}
                          </button>
                        ) : (
                          <h4 className="text-sm font-bold text-[#2e0854]">
                            Not assigned
                          </h4>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <HiOutlineShieldCheck />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          Permission Level
                        </p>
                        <h4 className="text-sm font-bold text-[#2e0854]">
                          {t(PERMISSION_LABELS[roleData.permissions_level]) ||
                            roleData.permissions_level}
                        </h4>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No assignment data found.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- RENDER: Assistants Directory (Grid) ----
  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.assistants.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {currentUserRole === "admin"
              ? t("dashboard.assistants.subtitleAdmin")
              : t("dashboard.assistants.subtitleInstructor")}
          </p>
        </div>
        {/* Hide the Register button for instructors */}
        {currentUserRole === "admin" && (
          <button
            onClick={handleOpenCreateForm}
            className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
          >
            <HiOutlinePlus className="text-base" />
            <span>{t("dashboard.assistants.create")}</span>
          </button>
        )}
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
        {assistantsData.map((assistant) => (
          <div
            key={assistant.id}
            onClick={() => navigate(`/dashboard/assistants/${assistant.id}`)}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                  ID-{assistant.id}
                </span>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEditForm(e, assistant)}
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                    title="Edit Assistant"
                  >
                    <HiOutlinePencil className="text-xs" />
                  </button>
                  <button
                    onClick={(e) =>
                      handleDeleteAssistant(
                        e,
                        assistant.id,
                        `${assistant.first_name} ${assistant.last_name}`,
                      )
                    }
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                    title="Delete Assistant"
                  >
                    <HiOutlineTrash className="text-xs" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {assistant.profile_image_url ? (
                  <img
                    src={getFileUrl(assistant.profile_image_url)}
                    alt={assistant.first_name}
                    className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-xs font-bold">
                    {getInitials(assistant.first_name, assistant.last_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors truncate">
                    {assistant.first_name} {assistant.last_name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-light truncate font-mono">
                    {assistant.phone}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center font-medium text-[#2e0854] bg-violet-50/50 px-2 py-1 rounded-lg text-[11px]">
                <HiOutlineBriefcase className="mr-1 text-gray-400 text-xs" />{" "}
                {t("dashboard.assistants.teachingAssistant")}
              </span>
              <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}

        {assistantsData.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-xs text-gray-400 font-light">
              {currentUserRole === "admin"
                ? t("dashboard.assistants.emptyAdmin")
                : t("dashboard.assistants.emptyInstructor")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantsDashboard;
