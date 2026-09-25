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
  HiOutlineAcademicCap,
  HiOutlineChevronRight,
  HiOutlineIdentification,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineBookOpen,
} from "react-icons/hi";

const getInitials = (first, last) =>
  `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();

const STATUS_STYLES = {
  published: "text-emerald-700 bg-emerald-50",
  draft: "text-gray-400 bg-gray-100",
  archived: "text-amber-700 bg-amber-50",
};

const PERMISSION_LABELS = {
  read_only: "dashboard.common.readOnly",
  edit_grades: "dashboard.common.canEditGrades",
  full_access: "dashboard.common.fullAccess",
};

const slugify = (title) =>
  `${title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${Date.now().toString(36).slice(-4)}`;

const emptyCourseForm = {
  title: "",
  description: "",
  term: "",
  price: 0,
  status: "draft",
};

const emptyAssistantForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  permissionsLevel: "full_access",
  isActive: true,
};

const InstructorsDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Core Data States
  const [instructorsData, setInstructorsData] = useState([]);
  const [activeInstructor, setActiveInstructor] = useState(null);
  const [managedCourses, setManagedCourses] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Inline Form View Control — formType decides which panel renders: 'instructor' | 'course' | 'assistant'
  const [formType, setFormType] = useState(null);
  const [formMode, setFormMode] = useState("create"); // 'create' or 'edit'

  // Instructor form
  const [editingInstructorId, setEditingInstructorId] = useState(null);
  const [instructorFormData, setInstructorFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    bio: "",
    profileImageUrl: null,
    isActive: true,
  });

  // Course form
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseFormData, setCourseFormData] = useState(emptyCourseForm);

  // Assistant form
  const [editingAssistantId, setEditingAssistantId] = useState(null);
  const [assistantFormData, setAssistantFormData] =
    useState(emptyAssistantForm);

  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Fetch all instructors (directory)
  const fetchAllInstructors = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAllInstructors({ limit: 100 });
      if (response.success) {
        setInstructorsData(response.data);
      } else {
        setError(t("dashboard.instructors.loadFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.instructors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Fetch assistants assigned to a given instructor record id
  const fetchAssistants = async (instructorRecordId) => {
    if (!instructorRecordId) {
      setAssistants([]);
      return;
    }
    try {
      const res = await api.getAllAssistants({
        assignedInstructorId: instructorRecordId,
        limit: 100,
      });
      if (res.success) setAssistants(res.data);
      else setAssistants([]);
    } catch (err) {
      setAssistants([]);
    }
  };

  // Fetch single instructor + courses + assistants
  const fetchSingleInstructor = async (id) => {
    setLoading(true);
    setError("");
    try {
      const instructorRes = await api.getInstructorById(id);
      if (instructorRes.success) {
        setActiveInstructor(instructorRes.data);

        const instructorRecordId = instructorRes.data.roleData?.id;

        if (instructorRecordId) {
          const coursesRes = await api.getAllCourses({
            instructorId: instructorRecordId,
            limit: 100,
          });
          if (coursesRes.success) setManagedCourses(coursesRes.data);
          else setManagedCourses([]);

          await fetchAssistants(instructorRecordId);
        } else {
          setManagedCourses([]);
          setAssistants([]);
        }
      } else {
        setError(t("dashboard.instructors.notFound"));
        setActiveInstructor(null);
      }
    } catch (err) {
      setError(err?.message || "Failed to retrieve instructor profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchSingleInstructor(slug);
    } else {
      fetchAllInstructors();
    }
    setFormType(null);
  }, [slug]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const closeForm = () => setFormType(null);

  // ──────────────────────────────────────────────────────────
  // INSTRUCTOR FORM HANDLERS
  // ──────────────────────────────────────────────────────────

  const handleOpenCreateInstructorForm = () => {
    setFormType("instructor");
    setFormMode("create");
    setInstructorFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      bio: "",
      isActive: true,
    });
  };

  const handleOpenEditInstructorForm = (e, instructor) => {
    e.stopPropagation();
    setFormType("instructor");
    setFormMode("edit");
    setEditingInstructorId(instructor.id);
    setInstructorFormData({
      firstName: instructor.first_name || instructor.firstName,
      lastName: instructor.last_name || instructor.lastName,
      phone: instructor.phone,
      email: instructor.email || "",
      password: "",
      bio: instructor.roleData?.bio || "",
      profileImageUrl: getUserProfileImage(instructor),
      isActive:
        instructor.is_active !== undefined
          ? instructor.is_active
          : instructor.isActive,
    });
  };

  const handleInstructorFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      if (formMode === "create") {
        if (
          !instructorFormData.password ||
          instructorFormData.password.length < 6
        ) {
          setError(t("dashboard.common.passwordMin"));
          setFormSubmitLoading(false);
          return;
        }
        const response = await api.createInstructor({
          firstName: instructorFormData.firstName,
          lastName: instructorFormData.lastName,
          phone: instructorFormData.phone,
          email: instructorFormData.email || null,
          password: instructorFormData.password,
          bio: instructorFormData.bio || null,
          isActive: instructorFormData.isActive,
        });
        if (response.success) {
          triggerSuccess("Instructor account created successfully.");
          closeForm();
          fetchAllInstructors();
        } else {
          setError(response.message || t("dashboard.common.creationFailed"));
        }
      } else {
        const updateData = {
          firstName: instructorFormData.firstName,
          lastName: instructorFormData.lastName,
          phone: instructorFormData.phone,
          email: instructorFormData.email || null,
          isActive: instructorFormData.isActive,
          bio: instructorFormData.bio || null,
        };
        const response = await api.updateInstructor(
          editingInstructorId,
          updateData,
        );
        if (response.success) {
          triggerSuccess("Instructor account updated successfully.");
          closeForm();
          if (slug) fetchSingleInstructor(slug);
          else fetchAllInstructors();
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

  const handleDeleteInstructor = async (e, instructorId, instructorName) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete instructor "${instructorName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const response = await api.deleteInstructor(instructorId);
      if (response.success) {
        triggerSuccess("Instructor account permanently removed.");
        if (slug) navigate("/dashboard/instructors");
        else fetchAllInstructors();
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || "Could not delete instructor account.");
    }
  };

  // ──────────────────────────────────────────────────────────
  // COURSE FORM HANDLERS (quick create/edit — full content editing
  // still happens on the dedicated course dashboard page)
  // ──────────────────────────────────────────────────────────

  const handleOpenCreateCourseForm = () => {
    setFormType("course");
    setFormMode("create");
    setCourseFormData(emptyCourseForm);
  };

  const handleOpenEditCourseForm = (e, course) => {
    e.stopPropagation();
    setFormType("course");
    setFormMode("edit");
    setEditingCourseId(course.id);
    setCourseFormData({
      title: course.title || "",
      description: course.description || "",
      term: course.term || "",
      price: course.price || 0,
      status: course.status || "draft",
    });
  };

  const handleCourseFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      if (formMode === "create") {
        const instructorRecordId = activeInstructor?.roleData?.id;
        if (!instructorRecordId) {
          setError("Instructor record not loaded yet.");
          setFormSubmitLoading(false);
          return;
        }
        const response = await api.createCourse({
          title: courseFormData.title,
          description: courseFormData.description || null,
          term: courseFormData.term,
          price: Number(courseFormData.price) || 0,
          status: courseFormData.status,
          instructorId: instructorRecordId,
          slug: slugify(courseFormData.title),
        });
        if (response.success) {
          triggerSuccess("Course created successfully.");
          closeForm();
          fetchSingleInstructor(slug);
        } else {
          setError(response.message || "Course creation failed.");
        }
      } else {
        const response = await api.updateCourse(editingCourseId, {
          title: courseFormData.title,
          description: courseFormData.description || null,
          term: courseFormData.term,
          price: Number(courseFormData.price) || 0,
          status: courseFormData.status,
        });
        if (response.success) {
          triggerSuccess("Course updated successfully.");
          closeForm();
          fetchSingleInstructor(slug);
        } else {
          setError(response.message || "Course update failed.");
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteCourse = async (e, course) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete course "${course.title}"? This will remove all its chapters and content permanently.`,
      )
    ) {
      return;
    }
    try {
      const response = await api.deleteCourse(course.id);
      if (response.success) {
        triggerSuccess("Course deleted successfully.");
        fetchSingleInstructor(slug);
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || "Could not delete course.");
    }
  };

  // ──────────────────────────────────────────────────────────
  // ASSISTANT FORM HANDLERS
  // ──────────────────────────────────────────────────────────

  const handleOpenCreateAssistantForm = () => {
    setFormType("assistant");
    setFormMode("create");
    setAssistantFormData(emptyAssistantForm);
  };

  const handleOpenEditAssistantForm = (e, assistant) => {
    e.stopPropagation();
    setFormType("assistant");
    setFormMode("edit");
    setEditingAssistantId(assistant.id);
    setAssistantFormData({
      firstName: assistant.first_name,
      lastName: assistant.last_name,
      phone: assistant.phone,
      email: assistant.email || "",
      password: "",
      permissionsLevel: assistant.permissions_level || "full_access",
      isActive: !!assistant.is_active,
    });
  };

  const handleAssistantFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      const instructorRecordId = activeInstructor?.roleData?.id;
      if (!instructorRecordId) {
        setError("Instructor record not loaded yet.");
        setFormSubmitLoading(false);
        return;
      }

      if (formMode === "create") {
        if (
          !assistantFormData.password ||
          assistantFormData.password.length < 6
        ) {
          setError(t("dashboard.common.passwordMin"));
          setFormSubmitLoading(false);
          return;
        }
        const response = await api.createAssistant({
          firstName: assistantFormData.firstName,
          lastName: assistantFormData.lastName,
          phone: assistantFormData.phone,
          email: assistantFormData.email || null,
          password: assistantFormData.password,
          assignedInstructorId: instructorRecordId,
          permissionsLevel: assistantFormData.permissionsLevel,
          isActive: assistantFormData.isActive,
        });
        if (response.success) {
          triggerSuccess("Assistant account created successfully.");
          closeForm();
          fetchAssistants(instructorRecordId);
        } else {
          setError(response.message || "Assistant creation failed.");
        }
      } else {
        const response = await api.updateAssistant(editingAssistantId, {
          firstName: assistantFormData.firstName,
          lastName: assistantFormData.lastName,
          phone: assistantFormData.phone,
          email: assistantFormData.email || null,
          assignedInstructorId: instructorRecordId,
          permissionsLevel: assistantFormData.permissionsLevel,
          isActive: assistantFormData.isActive,
        });
        if (response.success) {
          triggerSuccess("Assistant account updated successfully.");
          closeForm();
          fetchAssistants(instructorRecordId);
        } else {
          setError(response.message || "Assistant update failed.");
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteAssistant = async (e, assistant) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Remove assistant "${assistant.first_name} ${assistant.last_name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const response = await api.deleteAssistant(assistant.id);
      if (response.success) {
        triggerSuccess("Assistant removed successfully.");
        fetchAssistants(activeInstructor?.roleData?.id);
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || "Could not delete assistant.");
    }
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.instructors.loading")}
        </p>
      </div>
    );
  }

  // ==================== INLINE FULL PAGE FORM (INSTRUCTOR / COURSE / ASSISTANT) ====================
  if (formType) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={closeForm}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.common.cancelBack")}</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-8">
          {/* ── INSTRUCTOR FORM ── */}
          {formType === "instructor" && (
            <>
              <div className="space-y-2 border-b border-gray-50 pb-5">
                <h1 className="text-3xl font-black font-heading tracking-tight text-[#2e0854]">
                  {formMode === "create"
                    ? t("dashboard.instructors.create")
                    : t("dashboard.instructors.edit")}
                </h1>
                <p className="text-gray-400 text-sm font-light">
                  {formMode === "create"
                    ? t("dashboard.instructors.createDesc")
                    : t("dashboard.instructors.editDesc")}
                </p>
              </div>

              {error && (
                <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
                  ⚠️ {error}
                </div>
              )}

              {formMode === "edit" && editingInstructorId && (
                <div className="flex justify-center pb-2">
                  <ProfileAvatarManager
                    userId={editingInstructorId}
                    imageUrl={instructorFormData.profileImageUrl}
                    firstName={instructorFormData.firstName}
                    lastName={instructorFormData.lastName}
                    size="lg"
                    editable
                    variant="light"
                    onUpdated={(imageUrl) =>
                      setInstructorFormData((prev) => ({
                        ...prev,
                        profileImageUrl: imageUrl,
                      }))
                    }
                    onRemoved={() =>
                      setInstructorFormData((prev) => ({
                        ...prev,
                        profileImageUrl: null,
                      }))
                    }
                  />
                </div>
              )}

              <form onSubmit={handleInstructorFormSubmit} className="space-y-6">
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
                        value={instructorFormData.firstName}
                        onChange={(e) =>
                          setInstructorFormData({
                            ...instructorFormData,
                            firstName: e.target.value,
                          })
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
                        value={instructorFormData.lastName}
                        onChange={(e) =>
                          setInstructorFormData({
                            ...instructorFormData,
                            lastName: e.target.value,
                          })
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
                      value={instructorFormData.phone}
                      onChange={(e) =>
                        setInstructorFormData({
                          ...instructorFormData,
                          phone: e.target.value,
                        })
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
                      value={instructorFormData.email}
                      onChange={(e) =>
                        setInstructorFormData({
                          ...instructorFormData,
                          email: e.target.value,
                        })
                      }
                      placeholder="instructor@example.com"
                      className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    {t("dashboard.instructors.bio")}
                  </label>
                  <textarea
                    value={instructorFormData.bio}
                    onChange={(e) =>
                      setInstructorFormData({
                        ...instructorFormData,
                        bio: e.target.value,
                      })
                    }
                    placeholder="e.g., PhD in Mathematics, 10+ years teaching experience..."
                    rows="4"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all resize-none"
                  />
                </div>

                {formMode === "create" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("dashboard.common.passwordRequired")}
                    </label>
                    <input
                      type="password"
                      required
                      value={instructorFormData.password}
                      onChange={(e) =>
                        setInstructorFormData({
                          ...instructorFormData,
                          password: e.target.value,
                        })
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
                    id="isActiveInstructor"
                    checked={instructorFormData.isActive}
                    onChange={(e) =>
                      setInstructorFormData({
                        ...instructorFormData,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple cursor-pointer"
                  />
                  <label
                    htmlFor="isActiveInstructor"
                    className="text-xs text-gray-400 font-light select-none cursor-pointer"
                  >
                    Account active (can log in and create courses)
                  </label>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
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
                        ? t("dashboard.instructors.createAccount")
                        : t("common.saveChanges")}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── COURSE FORM ── */}
          {formType === "course" && (
            <>
              <div className="space-y-2 border-b border-gray-50 pb-5">
                <h1 className="text-3xl font-black font-heading tracking-tight text-[#2e0854]">
                  {formMode === "create" ? t("dashboard.courses.create") : t("dashboard.courses.edit")}
                </h1>
                <p className="text-gray-400 text-sm font-light">
                  {formMode === "create"
                    ? "Basic course details. Chapters and content are added afterwards."
                    : "Update basic course details. Manage chapters from the course editor."}
                </p>
              </div>

              {error && (
                <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleCourseFormSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    {t("dashboard.courses.form.title")}
                  </label>
                  <input
                    type="text"
                    required
                    value={courseFormData.title}
                    onChange={(e) =>
                      setCourseFormData({
                        ...courseFormData,
                        title: e.target.value,
                      })
                    }
                    placeholder="IGCSE Mathematics Core"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    {t("dashboard.courses.form.description")}
                  </label>
                  <textarea
                    value={courseFormData.description}
                    onChange={(e) =>
                      setCourseFormData({
                        ...courseFormData,
                        description: e.target.value,
                      })
                    }
                    rows="4"
                    placeholder="Short description of the course..."
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("dashboard.courses.form.term")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={courseFormData.term}
                      onChange={(e) =>
                        setCourseFormData({
                          ...courseFormData,
                          term: e.target.value,
                        })
                      }
                      placeholder="Fall 2026"
                      className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("dashboard.courses.form.price")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={courseFormData.price}
                      onChange={(e) =>
                        setCourseFormData({
                          ...courseFormData,
                          price: e.target.value,
                        })
                      }
                      placeholder="199.99"
                      className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    {t("dashboard.courses.form.status")}
                  </label>
                  <select
                    value={courseFormData.status}
                    onChange={(e) =>
                      setCourseFormData({
                        ...courseFormData,
                        status: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  >
                    <option value="draft">{t("dashboard.common.draft")}</option>
                    <option value="published">{t("dashboard.common.published")}</option>
                    <option value="archived">{t("dashboard.common.archived")}</option>
                  </select>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
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
                        ? t("dashboard.courses.createCourse")
                        : t("common.saveChanges")}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── ASSISTANT FORM ── */}
          {formType === "assistant" && (
            <>
              <div className="space-y-2 border-b border-gray-50 pb-5">
                <h1 className="text-3xl font-black font-heading tracking-tight text-[#2e0854]">
                  {formMode === "create"
                    ? t("dashboard.assistants.create")
                    : t("dashboard.assistants.edit")}
                </h1>
                <p className="text-gray-400 text-sm font-light">
                  Assigned to{" "}
                  <span className="font-bold text-[#2e0854]">
                    {activeInstructor?.first_name} {activeInstructor?.last_name}
                  </span>
                  .
                </p>
              </div>

              {error && (
                <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleAssistantFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("dashboard.common.firstNameRequired")}
                    </label>
                    <input
                      type="text"
                      required
                      value={assistantFormData.firstName}
                      onChange={(e) =>
                        setAssistantFormData({
                          ...assistantFormData,
                          firstName: e.target.value,
                        })
                      }
                      placeholder="Amina"
                      className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("dashboard.common.lastNameRequired")}
                    </label>
                    <input
                      type="text"
                      required
                      value={assistantFormData.lastName}
                      onChange={(e) =>
                        setAssistantFormData({
                          ...assistantFormData,
                          lastName: e.target.value,
                        })
                      }
                      placeholder="Hassan"
                      className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    {t("dashboard.common.phoneRequired")}
                  </label>
                  <input
                    type="tel"
                    required
                    value={assistantFormData.phone}
                    onChange={(e) =>
                      setAssistantFormData({
                        ...assistantFormData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+201234567890"
                    className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    {t("dashboard.common.emailOptional")}
                  </label>
                  <input
                    type="email"
                    value={assistantFormData.email}
                    onChange={(e) =>
                      setAssistantFormData({
                        ...assistantFormData,
                        email: e.target.value,
                      })
                    }
                    placeholder="assistant@example.com"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Permission Level *
                  </label>
                  <select
                    value={assistantFormData.permissionsLevel}
                    onChange={(e) =>
                      setAssistantFormData({
                        ...assistantFormData,
                        permissionsLevel: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  >
                    <option value="read_only">{t("dashboard.common.readOnly")}</option>
                    <option value="edit_grades">{t("dashboard.common.canEditGrades")}</option>
                    <option value="full_access">{t("dashboard.common.fullAccess")}</option>
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
                      value={assistantFormData.password}
                      onChange={(e) =>
                        setAssistantFormData({
                          ...assistantFormData,
                          password: e.target.value,
                        })
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
                    id="isActiveAssistant"
                    checked={assistantFormData.isActive}
                    onChange={(e) =>
                      setAssistantFormData({
                        ...assistantFormData,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple cursor-pointer"
                  />
                  <label
                    htmlFor="isActiveAssistant"
                    className="text-xs text-gray-400 font-light select-none cursor-pointer"
                  >
                    Account active (can log in)
                  </label>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
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
                        ? t("dashboard.common.add")
                        : t("common.saveChanges")}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ==================== VIEW 1: SINGLE INSTRUCTOR PROFILE ====================
  if (slug) {
    if (!activeInstructor) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.instructors.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/instructors")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.instructors.backRoster")}
          </button>
        </div>
      );
    }

    const roleData = activeInstructor.roleData;

    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/instructors")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.instructors.backRoster")}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => handleOpenEditInstructorForm(e, activeInstructor)}
              className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
            >
              <HiOutlinePencil /> <span>{t("dashboard.common.edit")}</span>
            </button>
            <button
              onClick={(e) =>
                handleDeleteInstructor(
                  e,
                  activeInstructor.id,
                  `${activeInstructor.first_name} ${activeInstructor.last_name}`,
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
              userId={activeInstructor.id}
              imageUrl={getUserProfileImage(activeInstructor)}
              firstName={activeInstructor.first_name || activeInstructor.firstName}
              lastName={activeInstructor.last_name || activeInstructor.lastName}
              size="md"
              editable
              variant="dark"
              onUpdated={(imageUrl) => {
                setActiveInstructor((prev) => ({
                  ...prev,
                  profile_image_url: imageUrl,
                }));
                triggerSuccess(t("dashboard.common.profileImageUpdated"));
              }}
              onRemoved={() => {
                setActiveInstructor((prev) => ({
                  ...prev,
                  profile_image_url: null,
                }));
                triggerSuccess(t("dashboard.common.profileImageRemoved"));
              }}
            />
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-900/30 font-mono">
                ID-{activeInstructor.id}
              </span>
              <h2 className="text-2xl font-black font-heading tracking-tight mt-2">
                {activeInstructor.first_name} {activeInstructor.last_name}
              </h2>
              <p className="text-xs text-red-100/70 font-light">
                Instructor •{" "}
                {activeInstructor.is_active ? t("dashboard.common.active") : t("dashboard.common.disabled")}
              </p>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Courses + Assistants */}
          <div className="lg:col-span-2 space-y-6">
            {/* Courses */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                    <HiOutlineBookOpen className="text-brand-purple" />
                    Course Load
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Courses created and managed by this instructor.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl">
                    {managedCourses.length} Courses
                  </span>
                  <button
                    onClick={handleOpenCreateCourseForm}
                    className="flex items-center gap-1 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    <HiOutlinePlus className="text-sm" /> Add Course
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {managedCourses.length > 0 ? (
                  managedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 bg-gray-50/40 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-between gap-4 group"
                    >
                      <div
                        onClick={() =>
                          navigate(`/dashboard/courses/${course.slug}`)
                        }
                        className="flex items-start space-x-3.5 min-w-0 cursor-pointer flex-1"
                      >
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded capitalize ${
                            STATUS_STYLES[course.status] ||
                            "text-gray-400 bg-gray-100"
                          }`}
                        >
                          {course.status}
                        </span>
                        <button
                          onClick={(e) => handleOpenEditCourseForm(e, course)}
                          className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-white transition-colors"
                          title="Quick Edit"
                        >
                          <HiOutlinePencil className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCourse(e, course)}
                          className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-white transition-colors"
                          title="Delete Course"
                        >
                          <HiOutlineTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                    <p className="text-xs text-gray-400 font-light">
                      No courses created by this instructor yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Assistants */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                    <HiOutlineUserGroup className="text-brand-purple" />
                    {t("dashboard.assistants.title")}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Assistants assigned to help this instructor.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl">
                    {assistants.length} Assistants
                  </span>
                  <button
                    onClick={handleOpenCreateAssistantForm}
                    className="flex items-center gap-1 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    <HiOutlinePlus className="text-sm" /> Add Assistant
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {assistants.length > 0 ? (
                  assistants.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 bg-gray-50/40 border border-gray-100 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {a.profile_image_url ? (
                          <img
                            src={getFileUrl(a.profile_image_url)}
                            alt={a.first_name}
                            className="w-9 h-9 rounded-xl object-cover border border-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-xs font-bold shrink-0">
                            {getInitials(a.first_name, a.last_name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#2e0854] truncate">
                            {a.first_name} {a.last_name}
                          </p>
                          <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1 mt-0.5">
                            <HiOutlineShieldCheck className="text-xs" />
                            {t(PERMISSION_LABELS[a.permissions_level]) ||
                              a.permissions_level}
                            {!a.is_active && (
                              <span className="text-brand-purple ml-1">
                                • Disabled
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleOpenEditAssistantForm(e, a)}
                          className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-white transition-colors"
                          title="Edit Assistant"
                        >
                          <HiOutlinePencil className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAssistant(e, a)}
                          className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-white transition-colors"
                          title="Remove Assistant"
                        >
                          <HiOutlineTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                    <p className="text-xs text-gray-400 font-light">
                      No assistants assigned yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Contact + Bio */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-heading font-black text-base text-[#2e0854]">
                Contact
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlinePhone className="text-gray-400 text-base shrink-0" />
                  <span className="font-mono text-xs">
                    {activeInstructor.phone}
                  </span>
                </div>
                {activeInstructor.email && (
                  <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                    <HiOutlineMail className="text-gray-400 text-base shrink-0" />
                    <span className="text-xs truncate">
                      {activeInstructor.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {roleData?.bio && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
                <h3 className="font-heading font-black text-base text-[#2e0854]">
                  {t("dashboard.instructors.bio")}
                </h3>
                <p className="text-xs text-gray-600 font-light leading-relaxed">
                  {roleData.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: FACULTY DIRECTORY (GRID) ====================
  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.instructors.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {t("dashboard.instructors.subtitle")}
          </p>
        </div>
        <button
          onClick={handleOpenCreateInstructorForm}
          className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
        >
          <HiOutlinePlus className="text-base" />
          <span>{t("dashboard.instructors.create")}</span>
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
        {instructorsData.map((instructor) => (
          <div
            key={instructor.id}
            onClick={() => navigate(`/dashboard/instructors/${instructor.id}`)}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                  ID-{instructor.id}
                </span>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEditInstructorForm(e, instructor)}
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                    title="Edit Instructor"
                  >
                    <HiOutlinePencil className="text-xs" />
                  </button>
                  <button
                    onClick={(e) =>
                      handleDeleteInstructor(
                        e,
                        instructor.id,
                        `${instructor.first_name} ${instructor.last_name}`,
                      )
                    }
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                    title="Delete Instructor"
                  >
                    <HiOutlineTrash className="text-xs" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {instructor.profile_image_url ? (
                  <img
                    src={getFileUrl(instructor.profile_image_url)}
                    alt={instructor.first_name}
                    className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-xs font-bold">
                    {getInitials(instructor.first_name, instructor.last_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors truncate">
                    {instructor.first_name} {instructor.last_name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-light truncate font-mono">
                    {instructor.phone}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center font-medium text-[#2e0854] bg-violet-50/50 px-2 py-1 rounded-lg text-[11px]">
                <HiOutlineIdentification className="mr-1 text-gray-400 text-xs" />{" "}
                Instructor
              </span>
              <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}

        {instructorsData.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-xs text-gray-400 font-light">
              {t("dashboard.instructors.empty")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorsDashboard;
