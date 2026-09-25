import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, getFileUrl } from "../api";
import ProfileAvatarManager, {
  getUserProfileImage,
} from "../components/ProfileAvatarManager";
import VerificationToggle from "../components/VerificationToggle";
import { getVerificationStatus } from "../utils/verification";
import {
  HiOutlineArrowLeft,
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineHeart,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineAcademicCap,
  HiOutlineUserCircle,
  HiOutlineBookOpen,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlineEye,
} from "react-icons/hi";

const getInitials = (first, last) =>
  `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();

const ParentsDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "admin";

  // Core Data States
  const [parentsData, setParentsData] = useState([]);
  const [activeParent, setActiveParent] = useState(null);
  const [children, setChildren] = useState([]);
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
    emergencyContact: "",
    password: "",
    profileImageUrl: null,
    isActive: true,
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // --- New: Child detail view (enrollments & assignments) ---
  const [viewingChild, setViewingChild] = useState(null); // child object
  const [childEnrollments, setChildEnrollments] = useState([]);
  const [childAssignments, setChildAssignments] = useState([]);
  const [childLoading, setChildLoading] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [assignmentSubmission, setAssignmentSubmission] = useState(null);

  // Fetch all parents (directory)
  const fetchAllParents = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAllParents({ limit: 100 });
      if (response.success) {
        setParentsData(response.data);
      } else {
        setError(t("dashboard.parents.loadFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.parents.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Fetch single parent + children
  const fetchSingleParent = async (id) => {
    setLoading(true);
    setError("");
    try {
      const parentRes = await api.getParentById(id);
      if (parentRes.success) {
        setActiveParent(parentRes.data);
        const childrenRes = await api.getChildrenOfParent(id);
        if (childrenRes.success) {
          setChildren(childrenRes.data);
        } else {
          setChildren([]);
        }
      } else {
        setError(t("dashboard.parents.notFound"));
        setActiveParent(null);
      }
    } catch (err) {
      setError(err?.message || "Failed to retrieve parent profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchSingleParent(slug);
    } else {
      fetchAllParents();
    }
    setIsFormViewActive(false);
  }, [slug]);

  useEffect(() => {
    if (!isAdmin && isFormViewActive) {
      setIsFormViewActive(false);
    }
  }, [isAdmin, isFormViewActive]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleChildVerificationUpdated = (data) => {
    setChildren((prev) =>
      prev.map((child) =>
        child.user_id === data?.userId
          ? {
              ...child,
              is_verified: data?.isVerified ? 1 : 0,
              verified_at: data?.roleData?.verified_at || null,
            }
          : child,
      ),
    );
    triggerSuccess(
      data?.isVerified
        ? t("dashboard.common.linkVerified")
        : t("dashboard.common.linkRemoved"),
    );
  };

  // ----- Child detail handlers -----
  const handleViewChild = async (child) => {
    setViewingChild(child);
    setChildLoading(true);
    try {
      // child.user_id is the student's user ID
      const userId = child.user_id;
      // Fetch enrollments
      const enrollRes = await api.getStudentEnrollments(userId);
      if (enrollRes.success) {
        setChildEnrollments(enrollRes.data);
        // Fetch assignments for each enrolled course
        let allAssignments = [];
        for (const course of enrollRes.data) {
          try {
            const courseDetail = await api.getCourseBySlug(course.slug);
            if (courseDetail.success && courseDetail.data.chapters) {
              for (const chapter of courseDetail.data.chapters) {
                if (chapter.items) {
                  for (const item of chapter.items) {
                    if (item.item_type === "assignment") {
                      // Get the student's submission for this item
                      let submission = null;
                      try {
                        const subRes = await api.getSubmissionsForItem(
                          item.id,
                          { studentId: child.student_id },
                        );
                        if (subRes.success && subRes.data.length > 0) {
                          submission = subRes.data[0];
                        }
                      } catch (e) {}
                      allAssignments.push({
                        ...item,
                        courseTitle: course.title,
                        courseSlug: course.slug,
                        chapterTitle: chapter.title,
                        dueDate: item.due_date,
                        maxScore: item.max_score,
                        submission,
                      });
                    }
                  }
                }
              }
            }
          } catch (e) {}
        }
        setChildAssignments(allAssignments);
      } else {
        setChildEnrollments([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChildLoading(false);
    }
  };

  const handleBackToChildren = () => {
    setViewingChild(null);
    setChildEnrollments([]);
    setChildAssignments([]);
    setViewingAssignment(null);
  };

  const handleViewAssignment = (assignment) => {
    setViewingAssignment(assignment);
    setAssignmentSubmission(assignment.submission || null);
  };

  const handleBackToChildOverview = () => {
    setViewingAssignment(null);
    setAssignmentSubmission(null);
  };

  // Open inline form for creating a new parent
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      emergencyContact: "",
      password: "",
      isActive: true,
    });
    setIsFormViewActive(true);
  };

  // Open inline form for editing an existing parent
  const handleOpenEditForm = (e, parent) => {
    e.stopPropagation();
    setFormMode("edit");
    setEditingId(parent.id);
    setFormData({
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone,
      email: parent.email || "",
      emergencyContact: parent.roleData?.emergency_contact || "",
      password: "",
      profileImageUrl: getUserProfileImage(parent),
      isActive: parent.isActive ?? parent.is_active,
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
        const response = await api.createParent({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || null,
          emergencyContact: formData.emergencyContact || null,
          password: formData.password,
          isActive: formData.isActive,
        });
        if (response.success) {
          triggerSuccess("Parent account created successfully.");
          setIsFormViewActive(false);
          fetchAllParents();
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
          emergencyContact: formData.emergencyContact || null,
        };
        const response = await api.updateParent(editingId, updateData);
        if (response.success) {
          triggerSuccess("Parent account updated successfully.");
          setIsFormViewActive(false);
          if (slug) {
            fetchSingleParent(slug);
          } else {
            fetchAllParents();
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

  const handleDeleteParent = async (e, parentId, parentName) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete parent "${parentName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const response = await api.deleteParent(parentId);
      if (response.success) {
        triggerSuccess("Parent account permanently removed.");
        if (slug) {
          navigate("/dashboard/parents");
        } else {
          fetchAllParents();
        }
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || "Could not delete parent account.");
    }
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.parents.loading")}
        </p>
      </div>
    );
  }

  // ==================== INLINE FORM (CREATE / EDIT) ====================
  if (isFormViewActive && isAdmin) {
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
                ? t("dashboard.parents.create")
                : t("dashboard.parents.edit")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {formMode === "create"
                ? t("dashboard.parents.create")
                : t("dashboard.parents.edit")}
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
                imageUrl={formData.profileImageUrl}
                firstName={formData.firstName}
                lastName={formData.lastName}
                size="lg"
                editable={isAdmin}
                variant="light"
                onUpdated={(imageUrl) =>
                  setFormData((prev) => ({ ...prev, profileImageUrl: imageUrl }))
                }
                onRemoved={() =>
                  setFormData((prev) => ({ ...prev, profileImageUrl: null }))
                }
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
                    placeholder="Ahmed"
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
                    placeholder="Hassan"
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
                  placeholder="parent@example.com"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.parents.emergencyContact")}
              </label>
              <div className="relative">
                <HiOutlineHeart className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: e.target.value,
                    })
                  }
                  placeholder={t("dashboard.parents.alternatePhone")}
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
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
                Account active (can log in and access linked students)
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
                    ? t("dashboard.parents.createAccount")
                    : t("common.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== VIEW 1: SINGLE PARENT PROFILE ====================
  if (slug) {
    if (!activeParent) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.parents.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/parents")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.parents.backAll")}
          </button>
        </div>
      );
    }

    const roleData = activeParent.roleData;

    // If viewing a specific child's detail
    if (viewingChild) {
      // If viewing a specific assignment of that child
      if (viewingAssignment) {
        return (
          <div className="max-w-3xl space-y-6 animate-fadeIn text-[#2e0854]">
            <button
              onClick={handleBackToChildOverview}
              className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
            >
              <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.parents.backOverview")}</span>
            </button>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h1 className="text-xl font-black font-heading mb-4">
                {viewingAssignment.title}
              </h1>
              <p className="text-xs text-gray-500 mb-2">
                Course: {viewingAssignment.courseTitle} · Chapter:{" "}
                {viewingAssignment.chapterTitle}
              </p>
              {viewingAssignment.dueDate && (
                <p className="text-xs text-gray-400 mb-4">
                  Due:{" "}
                  {new Date(viewingAssignment.dueDate).toLocaleDateString()} |
                  Max Score: {viewingAssignment.maxScore || 100}
                </p>
              )}

              {assignmentSubmission ? (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        Submission by {viewingChild.first_name}{" "}
                        {viewingChild.last_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t("dashboard.assignments.submitted")}:{" "}
                        {new Date(
                          assignmentSubmission.submitted_at,
                        ).toLocaleString()}
                      </p>
                    </div>
                    {assignmentSubmission.score !== null && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        Score: {assignmentSubmission.score}
                      </span>
                    )}
                  </div>
                  {assignmentSubmission.submission_text && (
                    <div className="bg-gray-50 p-4 rounded-xl text-sm whitespace-pre-wrap">
                      {assignmentSubmission.submission_text}
                    </div>
                  )}
                  {assignmentSubmission.submission_file && (
                    <a
                      href={getFileUrl(assignmentSubmission.submission_file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-purple hover:text-brand"
                    >
                      <HiOutlineDownload /> {t("dashboard.assignments.downloadAttachment")}
                    </a>
                  )}
                  {assignmentSubmission.feedback && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">
                        {t("dashboard.common.feedback")}:
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        {assignmentSubmission.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {t("dashboard.common.noSubmissions")}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Show child overview with enrollments and assignments
      return (
        <div className="space-y-6 animate-fadeIn text-[#2e0854]">
          <button
            onClick={handleBackToChildren}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.parents.backLinked")}</span>
          </button>
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-gray-50 pb-4 flex items-center space-x-4">
              {viewingChild.profile_image_url ? (
                <img
                  src={getFileUrl(viewingChild.profile_image_url)}
                  alt={viewingChild.first_name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-sm font-bold">
                  {getInitials(viewingChild.first_name, viewingChild.last_name)}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black font-heading">
                  {viewingChild.first_name} {viewingChild.last_name}
                </h1>
                <p className="text-xs text-gray-400">
                  {viewingChild.academic_level_name || "N/A"}
                </p>
              </div>
            </div>

            {childLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Enrollments */}
                <div className="lg:col-span-1 bg-gray-50/40 border border-gray-100 rounded-2xl p-4 space-y-3">
                  <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                    <HiOutlineBookOpen className="text-brand-purple" />
                    Enrolled Courses
                  </h3>
                  {childEnrollments.length > 0 ? (
                    <div className="space-y-2">
                      {childEnrollments.map((course, idx) => (
                        <div
                          key={idx}
                          onClick={() =>
                            navigate(`/dashboard/courses/${course.slug}`)
                          }
                          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white cursor-pointer transition"
                        >
                          {course.cover_image_url ? (
                            <img
                              src={getFileUrl(course.cover_image_url)}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                              <HiOutlineBookOpen className="text-gray-500 text-sm" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">
                              {course.title}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {course.instructor_first_name}{" "}
                              {course.instructor_last_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{t("dashboard.parents.noEnrollments")}</p>
                  )}
                </div>

                {/* Assignments & Grades */}
                <div className="lg:col-span-2 bg-gray-50/40 border border-gray-100 rounded-2xl p-4 space-y-3">
                  <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                    <HiOutlineDocumentText className="text-brand-purple" />
                    {t("dashboard.students.assignmentsGrades")}
                  </h3>
                  {childAssignments.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {childAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          onClick={() => handleViewAssignment(assignment)}
                          className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all cursor-pointer group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">
                              {assignment.title}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {assignment.courseTitle} · Due:{" "}
                              {assignment.dueDate
                                ? new Date(
                                    assignment.dueDate,
                                  ).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {assignment.submission ? (
                              <>
                                {assignment.submission.score !== null ? (
                                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                    {assignment.submission.score} /{" "}
                                    {assignment.maxScore || 100}
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                    {t("dashboard.assignments.submitted")}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                No submission
                              </span>
                            )}
                            <HiOutlineEye className="text-gray-400 group-hover:text-brand-purple text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-8 text-center">
                      No assignments found.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Main parent profile with linked children list
    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/parents")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.parents.backAll")}</span>
          </button>

          <div className="flex items-center space-x-2">
            {isAdmin && (
              <>
                <button
                  onClick={(e) => handleOpenEditForm(e, activeParent)}
                  className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
                >
                  <HiOutlinePencil /> <span>{t("dashboard.common.edit")}</span>
                </button>
                <button
                  onClick={(e) =>
                    handleDeleteParent(
                      e,
                      activeParent.id,
                      `${activeParent.first_name} ${activeParent.last_name}`,
                    )
                  }
                  className="flex items-center space-x-1 bg-violet-50 hover:bg-violet-100 text-brand-purple px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                >
                  <HiOutlineTrash /> <span>{t("dashboard.common.delete")}</span>
                </button>
              </>
            )}
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

        {/* Parent Hero Card */}
        <div className="bg-[#2e0854] rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
          <div className="flex items-center space-x-4">
            <ProfileAvatarManager
              userId={activeParent.id}
              imageUrl={getUserProfileImage(activeParent)}
              firstName={activeParent.first_name || activeParent.firstName}
              lastName={activeParent.last_name || activeParent.lastName}
              size="md"
              editable={isAdmin}
              variant="dark"
              onUpdated={(imageUrl) => {
                setActiveParent((prev) => ({
                  ...prev,
                  profile_image_url: imageUrl,
                }));
                triggerSuccess(t("dashboard.common.profileImageUpdated"));
              }}
              onRemoved={() => {
                setActiveParent((prev) => ({
                  ...prev,
                  profile_image_url: null,
                }));
                triggerSuccess(t("dashboard.common.profileImageRemoved"));
              }}
            />
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-900/30 font-mono">
                ID-{activeParent.id}
              </span>
              <h2 className="text-2xl font-black font-heading tracking-tight mt-2">
                {activeParent.first_name} {activeParent.last_name}
              </h2>
              <p className="text-xs text-red-100/70 font-light">
                Parent Account •{" "}
                {activeParent.is_active ? t("dashboard.common.active") : t("dashboard.common.disabled")}
              </p>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Contact Info & Children */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.01)] space-y-4">
            <div>
              <h3 className="font-heading font-black text-base text-[#2e0854]">
                Contact Details
              </h3>
              <p className="text-[11px] text-gray-400 font-light">
                Primary and emergency contacts
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                <HiOutlinePhone className="text-gray-400 text-base" />
                <span className="font-mono text-xs">{activeParent.phone}</span>
              </div>
              {activeParent.email && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineMail className="text-gray-400 text-base" />
                  <span className="text-xs truncate">{activeParent.email}</span>
                </div>
              )}
              {roleData?.emergency_contact && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineHeart className="text-gray-400 text-base" />
                  <span className="font-mono text-xs">
                    {roleData.emergency_contact}
                  </span>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-gray-50 text-[10px] text-gray-400">
              Registered:{" "}
              {new Date(activeParent.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.01)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-black text-base text-[#2e0854]">
                  Linked Students
                </h3>
                <p className="text-[11px] text-gray-400 font-light">
                  Children under this guardian – click to view details
                </p>
              </div>
              <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl flex items-center">
                <HiOutlineUserCircle className="mr-1" /> {children.length}{" "}
                Students
              </span>
            </div>
            <div className="space-y-4">
              {children.length > 0 ? (
                children.map((child) => (
                  <div
                    key={child.student_id}
                    className="p-4 bg-gray-50/70 border border-transparent hover:border-violet-100 rounded-2xl transition-all group"
                  >
                    <div
                      onClick={() => handleViewChild(child)}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        {child.profile_image_url ? (
                          <img
                            src={getFileUrl(child.profile_image_url)}
                            alt={child.first_name}
                            className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-heading text-xs font-bold">
                            {getInitials(child.first_name, child.last_name)}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-[#2e0854] group-hover:text-brand-purple transition-colors">
                            {child.first_name} {child.last_name}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {child.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 sm:mt-0">
                        {child.academic_level_name && (
                          <div className="flex items-center text-xs text-gray-500 bg-white px-2 py-1 rounded-lg">
                            <HiOutlineAcademicCap className="mr-1 text-gray-400" />
                            {child.academic_level_name}
                          </div>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            getVerificationStatus(child)
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {getVerificationStatus(child)
                            ? t("dashboard.common.parentVerified")
                            : t("dashboard.common.parentUnverified")}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-md ${
                            child.is_active
                              ? "text-emerald-700 bg-emerald-50"
                              : "text-gray-400 bg-gray-100"
                          }`}
                        >
                          {child.is_active ? t("dashboard.common.active") : t("dashboard.common.inactive")}
                        </span>
                        <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple text-sm" />
                      </div>
                    </div>
                    {isAdmin && (
                      <div
                        className="mt-3 pt-3 border-t border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <VerificationToggle
                          student={{
                            ...child,
                            id: child.user_id,
                            parent_id: child.parent_id,
                          }}
                          parentUser={activeParent}
                          compact
                          stopPropagation
                          onUpdated={handleChildVerificationUpdated}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <p className="text-xs text-gray-400 font-light">
                    {t("dashboard.common.nothingYet")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: PARENTS DIRECTORY (GRID) ====================
  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.parents.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {isAdmin
              ? t("dashboard.parents.subtitleAdmin")
              : t("dashboard.parents.subtitleInstructor")}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreateForm}
            className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
          >
            <HiOutlinePlus className="text-base" />
            <span>{t("dashboard.parents.create")}</span>
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
        {parentsData.map((parent) => (
          <div
            key={parent.id}
            onClick={() => navigate(`/dashboard/parents/${parent.id}`)}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                  ID-{parent.id}
                </span>
                {isAdmin && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEditForm(e, parent)}
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title="Edit Parent"
                    >
                      <HiOutlinePencil className="text-xs" />
                    </button>
                    <button
                      onClick={(e) =>
                        handleDeleteParent(
                          e,
                          parent.id,
                          `${parent.first_name} ${parent.last_name}`,
                        )
                      }
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title="Delete Parent"
                    >
                      <HiOutlineTrash className="text-xs" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {parent.profile_image_url ? (
                  <img
                    src={getFileUrl(parent.profile_image_url)}
                    alt={parent.first_name}
                    className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-xs font-bold">
                    {getInitials(parent.first_name, parent.last_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors truncate">
                    {parent.first_name} {parent.last_name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-light truncate font-mono">
                    {parent.phone}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center font-medium text-[#2e0854] bg-violet-50/50 px-2 py-1 rounded-lg text-[11px]">
                  <HiOutlineUser className="mr-1 text-gray-400 text-xs" /> Parent
                  Account
                </span>
                <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        ))}

        {parentsData.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-xs text-gray-400 font-light">
              {isAdmin
                ? t("dashboard.parents.emptyAdmin")
                : t("dashboard.parents.emptyInstructor")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentsDashboard;
