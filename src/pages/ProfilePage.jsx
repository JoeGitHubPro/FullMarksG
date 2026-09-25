// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, getUserProfileImage } from "../api";
import ProfileAvatarManager from "../components/ProfileAvatarManager";
import RedeemCodeModal from "../components/RedeemCodeModal";
import { useTranslation } from "../i18n/LanguageContext";
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineLogout,
  HiOutlineIdentification,
  HiOutlineClipboardList,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineDocumentText,
  HiOutlineQuestionMarkCircle,
  HiOutlineCollection,
  HiOutlineChartBar,
  HiOutlineKey,
} from "react-icons/hi";

const GRADE_STATUS_STYLES = {
  graded: "bg-emerald-100 text-emerald-700",
  submitted: "bg-blue-100 text-blue-700",
  draft: "bg-amber-100 text-amber-700",
  none: "bg-gray-100 text-gray-500",
};

const formatGradeScore = (grade, t) => {
  if (grade.submission_status === "graded") {
    const score = Number(grade.score);
    const max = Number(grade.max_score) || 100;
    return `${score} / ${max}`;
  }
  return (
    t(`profile.gradeStatus.${grade.submission_status}`) ||
    t("profile.gradeStatus.none")
  );
};

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fullUser, setFullUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [gradesByCourse, setGradesByCourse] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childGradesByCourse, setChildGradesByCourse] = useState([]);
  const [childGradesLoading, setChildGradesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch full user data
  // NOTE: these all use self-service endpoints (getMe / getMyEnrollments /
  // getMyChildren) that scope strictly to the logged-in user's own token
  // (req.user.id on the backend). The equivalents keyed by :id
  // (getUserById, getStudentEnrollments, getChildrenOfParent) are
  // admin-only and will 403 for a student/parent viewing their own page.
  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError("");
      try {
        const userRes = await api.getMe();
        if (userRes.success) {
          setFullUser(userRes.data);
          // Populate edit form with current data
          const data = userRes.data;
          setEditFormData({
            firstName: data.firstName || data.first_name || "",
            lastName: data.lastName || data.last_name || "",
            email: data.email || "",
            phone: data.phone || "",
            dateOfBirth: data.roleData?.date_of_birth || "",
          });
        } else {
          setError("Could not load profile data.");
          setLoading(false);
          return;
        }

        if (user?.role === "student") {
          const [enrollRes, gradesRes] = await Promise.all([
            api.getMyEnrollments(),
            api.getMyGrades(),
          ]);
          if (enrollRes.success) {
            setEnrollments(enrollRes.data);
          } else {
            setError("Could not load enrollments.");
          }
          if (gradesRes.success) {
            setGradesByCourse(gradesRes.data);
          }
        } else if (user?.role === "parent") {
          const childrenRes = await api.getMyChildren();
          if (childrenRes.success) {
            setChildren(childrenRes.data);
            if (childrenRes.data.length > 0) {
              setSelectedChildId(childrenRes.data[0].student_id);
            }
          } else {
            setError("Could not load children information.");
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const refetchEnrollments = async () => {
    try {
      const enrollRes = await api.getMyEnrollments();
      if (enrollRes.success) setEnrollments(enrollRes.data);
    } catch (err) {
      console.error("Failed to refresh enrollments", err);
    }
  };

  useEffect(() => {
    if (user?.role !== "parent" || !selectedChildId) {
      setChildGradesByCourse([]);
      return;
    }

    const fetchChildGrades = async () => {
      setChildGradesLoading(true);
      try {
        const gradesRes = await api.getChildGrades(selectedChildId);
        if (gradesRes.success) {
          setChildGradesByCourse(gradesRes.data);
        } else {
          setChildGradesByCourse([]);
        }
      } catch (err) {
        console.error(err);
        setChildGradesByCourse([]);
      } finally {
        setChildGradesLoading(false);
      }
    };

    fetchChildGrades();
  }, [user, selectedChildId]);

  const selectedChild = children.find(
    (child) => String(child.student_id) === String(selectedChildId),
  );

  const renderGradesPanel = (gradesData, emptyMessage, isLoading) => (
    <>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : gradesData.length > 0 ? (
        <div className="space-y-3">
          {gradesData.map((courseGrades) => (
            <div
              key={courseGrades.course_id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
            >
              <div className="px-3 sm:px-4 py-3 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-[#2e0854] break-words font-heading">
                  {courseGrades.course_title}
                </h4>
                <Link
                  to={`/courses/${courseGrades.course_slug}`}
                  className="text-[10px] font-bold text-brand-purple hover:text-brand shrink-0"
                >
                  {t("common.view")}
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {courseGrades.grades.map((grade) => {
                  const Icon =
                    grade.item_type === "quiz"
                      ? HiOutlineQuestionMarkCircle
                      : HiOutlineDocumentText;
                  return (
                    <div
                      key={`${courseGrades.course_id}-${grade.item_id}`}
                      className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                        <Icon className="text-gray-300 text-sm shrink-0 mt-0.5 sm:mt-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#2e0854] break-words">
                            {grade.title}
                          </p>
                          <p className="text-[10px] text-gray-400 capitalize">
                            {grade.chapter_title
                              ? `${grade.chapter_title} · `
                              : ""}
                            {grade.item_type}
                          </p>
                          {grade.submitted_at && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {t("profile.submittedAt")}:{" "}
                              {new Date(grade.submitted_at).toLocaleString()}
                            </p>
                          )}
                          {grade.feedback && (
                            <p className="text-[10px] text-gray-500 mt-1 break-words">
                              {t("profile.feedback")}: {grade.feedback}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md self-start sm:self-auto shrink-0 ${
                          GRADE_STATUS_STYLES[grade.submission_status] ||
                          GRADE_STATUS_STYLES.none
                        }`}
                      >
                        {formatGradeScore(grade, t)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
          <p className="text-xs text-gray-400 font-light">{emptyMessage}</p>
        </div>
      )}
    </>
  );

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // 1. Update user fields
      const payload = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email || null,
        phone: editFormData.phone,
        dateOfBirth: editFormData.dateOfBirth || null,
      };

      const updateRes = await api.updateUser(user.id, payload);
      if (!updateRes.success) {
        throw new Error(updateRes.message || "Failed to update profile.");
      }

      const updatedUser = {
        ...user,
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        phone: editFormData.phone,
      };
      updateUser(updatedUser);

      // 4. Refetch fresh user data
      const freshUser = await api.getMe();
      if (freshUser.success) {
        setFullUser(freshUser.data);
        // Update edit form with fresh data
        const data = freshUser.data;
        setEditFormData({
          firstName: data.firstName || data.first_name || "",
          lastName: data.lastName || data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          dateOfBirth: data.roleData?.date_of_birth || "",
        });
      }

      setSuccess(t("profile.profileUpdated"));
      setIsEditing(false);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data from fullUser
    if (fullUser) {
      const data = fullUser;
      setEditFormData({
        firstName: data.firstName || data.first_name || "",
        lastName: data.lastName || data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        dateOfBirth: data.roleData?.date_of_birth || "",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  const displayName =
    fullUser?.firstName || user.firstName || fullUser?.first_name || "";
  const displayLastName =
    fullUser?.lastName || user.lastName || fullUser?.last_name || "";
  const displayPhone = fullUser?.phone || user.phone || "";
  const displayEmail = fullUser?.email || user.email || "";
  const displayRole = user.role || fullUser?.role || "";
  const displayCreatedAt = fullUser?.createdAt || user.createdAt || new Date();

  const roleData = fullUser?.roleData || {};
  const academicLevel = roleData?.academic_level_name || null;
  const curriculum = roleData?.curriculum_name || null;
  const dateOfBirth = roleData?.date_of_birth || null;
  const parentFirstName = roleData?.parent_first_name || null;
  const parentLastName = roleData?.parent_last_name || null;
  const studentId = roleData?.id || null;

  const roleLabel =
    displayRole === "student"
      ? t("roles.student")
      : displayRole === "parent"
        ? t("roles.parent")
        : t(`roles.${displayRole}`) || displayRole;

  const gradedCount = gradesByCourse.reduce(
    (sum, course) => sum + (course.grades?.length || 0),
    0,
  );
  const activeEnrollments = enrollments.filter(
    (enrollment) => enrollment.enrollment_status === "active",
  ).length;
  const totalChildEnrollments = children.reduce(
    (sum, child) =>
      sum + (child.enrollments_count ?? child.enrollmentsCount ?? 0),
    0,
  );

  if (loading && !fullUser) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("profile.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 py-1 sm:py-2 pb-20 sm:pb-2 animate-fadeIn">
      {(success || error) && (
        <div className="space-y-3">
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
              <HiOutlineCheck className="text-base" /> {success}
            </div>
          )}
          {error && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand text-xs font-semibold rounded-2xl flex items-center gap-2">
              <HiOutlineX className="text-base" /> {error}
            </div>
          )}
        </div>
      )}

      {/* HERO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 pb-6 sm:pb-8 border-b border-gray-100 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col items-center sm:items-start sm:flex-row gap-4 sm:gap-6">
            <ProfileAvatarManager
              imageUrl={getUserProfileImage(fullUser || user)}
              firstName={displayName}
              lastName={displayLastName}
              size="xl"
              editable
              variant="light"
              className="mx-auto sm:mx-0"
              onUpdated={async (imageUrl) => {
                const freshUser = await api.getMe();
                if (freshUser.success) {
                  setFullUser(freshUser.data);
                  updateUser({
                    ...user,
                    profileImage: imageUrl,
                  });
                }
                setSuccess(t("profile.profileImageUpdated"));
                setTimeout(() => setSuccess(""), 5000);
              }}
              onRemoved={async () => {
                const freshUser = await api.getMe();
                if (freshUser.success) {
                  setFullUser(freshUser.data);
                  updateUser({
                    ...user,
                    profileImage: null,
                  });
                }
                setSuccess(t("profile.profileImageRemoved"));
                setTimeout(() => setSuccess(""), 5000);
              }}
            />

            <div className="flex-1 min-w-0 space-y-3 w-full text-center sm:text-start">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  {displayRole === "student" && (academicLevel || curriculum) && (
                    <div className="flex flex-wrap gap-1 mb-1.5 justify-center sm:justify-start">
                      {academicLevel && (
                        <span className="text-[10px] font-black tracking-widest text-brand-purple uppercase bg-violet-50 px-2.5 py-1 rounded-md">
                          {academicLevel}
                        </span>
                      )}
                      {curriculum && (
                        <span className="text-[10px] font-black tracking-widest text-brand-purple uppercase bg-violet-50 px-2.5 py-1 rounded-md">
                          {curriculum}
                        </span>
                      )}
                    </div>
                  )}
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#2e0854] tracking-tight font-heading leading-tight break-words">
                    {displayName} {displayLastName}
                  </h1>
                  <p className="text-xs font-semibold text-gray-400 mt-0.5 capitalize">
                    {roleLabel}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex flex-1 sm:flex-none min-w-[120px] items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-white text-xs font-bold text-[#2e0854] hover:border-violet-100 hover:text-brand-purple transition-all"
                    >
                      <HiOutlinePencil className="text-sm" />
                      <span>{t("profile.edit")}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex flex-1 sm:flex-none min-w-[120px] items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-white text-xs font-bold text-gray-500 hover:border-violet-100 hover:text-brand-purple transition-all"
                  >
                    <HiOutlineLogout className="text-sm" />
                    <span>{t("profile.signOut")}</span>
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {t("profile.firstNameLabel")}
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={editFormData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-gray-50/70 border border-transparent focus:border-violet-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-violet-100/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {t("profile.lastNameLabel")}
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={editFormData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-gray-50/70 border border-transparent focus:border-violet-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-violet-100/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {t("profile.phoneLabel")}
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-gray-50/70 border border-transparent focus:border-violet-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-violet-100/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {t("profile.emailLabel")}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50/70 border border-transparent focus:border-violet-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-violet-100/50"
                      />
                    </div>
                  </div>
                  {displayRole === "student" && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {t("profile.dateOfBirth")}
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={editFormData.dateOfBirth?.split("T")[0] || ""}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50/70 border border-transparent focus:border-violet-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-violet-100/50"
                      />
                    </div>
                  )}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-4 py-2.5 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      {isSubmitting ? t("common.saving") : t("common.saveChanges")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 text-xs text-gray-400 font-light leading-relaxed text-start">
                  <p className="flex items-start sm:items-center gap-2">
                    <HiOutlinePhone className="text-sm text-gray-300 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="break-all">{displayPhone}</span>
                  </p>
                  {displayEmail && (
                    <p className="flex items-start sm:items-center gap-2">
                      <HiOutlineMail className="text-sm text-gray-300 shrink-0 mt-0.5 sm:mt-0" />
                      <span className="break-all">{displayEmail}</span>
                    </p>
                  )}
                  <p className="flex items-start sm:items-center gap-2">
                    <HiOutlineCalendar className="text-sm text-gray-300 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      {t("profile.joined")}{" "}
                      {new Date(displayCreatedAt).toLocaleDateString()}
                    </span>
                  </p>
                  {displayRole === "student" && dateOfBirth && (
                    <p className="flex items-start sm:items-center gap-2">
                      <HiOutlineCalendar className="text-sm text-gray-300 shrink-0 mt-0.5 sm:mt-0" />
                      <span>
                        {t("profile.dob")}: {new Date(dateOfBirth).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  {displayRole === "student" && studentId && (
                    <p className="flex items-start sm:items-center gap-2">
                      <HiOutlineIdentification className="text-sm text-gray-300 shrink-0 mt-0.5 sm:mt-0" />
                      <span>{t("profile.studentId")}: {studentId}</span>
                    </p>
                  )}
                  {displayRole === "student" &&
                    parentFirstName &&
                    parentLastName && (
                      <p className="flex items-start sm:items-center gap-2">
                        <HiOutlineUserGroup className="text-sm text-gray-300 shrink-0 mt-0.5 sm:mt-0" />
                        <span className="break-words">
                          {t("profile.parent")}: {parentFirstName} {parentLastName}
                        </span>
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 sm:p-5 w-full">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3.5">
          {displayRole === "student" ? (
            <>
              <div className="flex items-center space-x-3 text-xs rounded-xl bg-white/70 sm:bg-transparent p-3 sm:p-0">
                <HiOutlineCollection className="text-base text-brand-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                    {t("profile.enrolledCourses")}
                  </p>
                  <p className="font-bold text-[#2e0854] mt-1">
                    {enrollments.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs rounded-xl bg-white/70 sm:bg-transparent p-3 sm:p-0">
                <HiOutlineChartBar className="text-base text-brand-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                    {t("profile.activeEnrollments")}
                  </p>
                  <p className="font-bold text-[#2e0854] mt-1">
                    {activeEnrollments}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs rounded-xl bg-white/70 sm:bg-transparent p-3 sm:p-0">
                <HiOutlineClipboardList className="text-base text-brand-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                    {t("profile.gradedItems")}
                  </p>
                  <p className="font-bold text-[#2e0854] mt-1">{gradedCount}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-3 text-xs rounded-xl bg-white/70 sm:bg-transparent p-3 sm:p-0">
                <HiOutlineUserGroup className="text-base text-brand-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                    {t("profile.linkedChildren")}
                  </p>
                  <p className="font-bold text-[#2e0854] mt-1">
                    {children.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs rounded-xl bg-white/70 sm:bg-transparent p-3 sm:p-0">
                <HiOutlineCollection className="text-base text-brand-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                    {t("profile.totalChildEnrollments")}
                  </p>
                  <p className="font-bold text-[#2e0854] mt-1">
                    {totalChildEnrollments}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs rounded-xl bg-white/70 sm:bg-transparent p-3 sm:p-0">
                <HiOutlineIdentification className="text-base text-brand-purple shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                    {t("profile.accountId")}
                  </p>
                  <p className="font-bold text-[#2e0854] mt-1 break-all">{user.id}</p>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-3 space-y-4">
          {displayRole === "student" ? (
            <>
              <div className="flex items-center justify-between px-1 gap-3">
                <div className="flex items-center space-x-2">
                  <HiOutlineCollection className="text-sm text-brand-purple" />
                  <h3 className="font-heading font-black text-sm text-[#2e0854]">
                    {t("profile.myEnrollments")}
                  </h3>
                </div>
                <button
                  onClick={() => setShowRedeemModal(true)}
                  className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-[11px] font-bold px-3 py-2 rounded-xl transition-all shrink-0"
                >
                  <HiOutlineKey className="text-sm" />
                  {t("redeemCode.title")}
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : enrollments.length > 0 ? (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      to={`/courses/${enrollment.slug}`}
                      className="block bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-4 hover:shadow-md hover:border-gray-200 transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-black tracking-widest text-brand-purple uppercase bg-violet-50 px-2 py-0.5 rounded-md">
                              {enrollment.term}
                            </span>
                            <span
                              className={`sm:hidden text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                enrollment.enrollment_status === "active"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : enrollment.enrollment_status === "completed"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-gray-50 text-gray-500"
                              }`}
                            >
                              {enrollment.enrollment_status}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#2e0854] group-hover:text-brand-purple transition-colors mt-2 font-heading break-words">
                            {enrollment.title}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-light mt-0.5 break-words">
                            {t("profile.instructor")}: {enrollment.instructor_first_name}{" "}
                            {enrollment.instructor_last_name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-light mt-0.5">
                            {t("profile.enrolled")}:{" "}
                            {new Date(
                              enrollment.enrolled_at,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`hidden sm:inline text-[10px] font-bold px-2 py-1 rounded-md shrink-0 self-start ${
                            enrollment.enrollment_status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : enrollment.enrollment_status === "completed"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {enrollment.enrollment_status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <p className="text-xs text-gray-400 font-light">
                    {t("profile.noEnrollments")}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 px-1">
                <HiOutlineUserGroup className="text-sm text-brand-purple" />
                <h3 className="font-heading font-black text-sm text-[#2e0854]">
                  {t("profile.myChildren")}
                </h3>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : children.length > 0 ? (
                <div className="space-y-3">
                  {children.map((child) => {
                    const isSelected =
                      String(child.student_id) === String(selectedChildId);
                    const enrollmentCount =
                      child.enrollments_count ?? child.enrollmentsCount ?? 0;

                    return (
                      <button
                        key={child.user_id}
                        type="button"
                        onClick={() => setSelectedChildId(child.student_id)}
                        className={`w-full text-left bg-white border rounded-2xl p-3.5 sm:p-4 flex items-start sm:items-center gap-3 transition-all ${
                          isSelected
                            ? "border-violet-300 ring-2 ring-red-50 shadow-sm"
                            : "border-gray-100 hover:border-violet-100"
                        }`}
                      >
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-violet-50 border border-violet-100 shrink-0 overflow-hidden flex items-center justify-center text-brand-purple font-bold text-sm">
                          {child.first_name?.charAt(0)}
                          {child.last_name?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#2e0854] break-words">
                            {child.first_name} {child.last_name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-light mt-0.5 break-words">
                            {t("profile.studentId")}: {child.student_id}
                            {child.academic_level_name
                              ? ` · ${child.academic_level_name}`
                              : ""}
                          </p>
                          <p className="text-[10px] text-gray-400 font-light mt-0.5">
                            {t("profile.enrolledCoursesCount", {
                              count: enrollmentCount,
                            })}
                          </p>
                          <p className="text-[10px] font-bold text-brand-purple mt-1">
                            {t("profile.viewProgress")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <p className="text-xs text-gray-400 font-light">
                    {t("profile.noChildren")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {displayRole === "student" ? (
            <>
              <div className="flex items-center space-x-2 px-1">
                <HiOutlineClipboardList className="text-sm text-brand-purple" />
                <h3 className="font-heading font-black text-sm text-[#2e0854]">
                  {t("profile.myGrades")}
                </h3>
              </div>

              {loading
                ? renderGradesPanel([], t("profile.noGrades"), true)
                : renderGradesPanel(
                    gradesByCourse,
                    t("profile.noGrades"),
                    false,
                  )}
            </>
          ) : displayRole === "parent" ? (
            <>
              <div className="flex items-center space-x-2 px-1">
                <HiOutlineClipboardList className="text-sm text-brand-purple" />
                <h3 className="font-heading font-black text-sm text-[#2e0854]">
                  {t("profile.childProgress")}
                  {selectedChild
                    ? `: ${selectedChild.first_name} ${selectedChild.last_name}`
                    : ""}
                </h3>
              </div>

              {!selectedChildId ? (
                <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <p className="text-xs text-gray-400 font-light">
                    {t("profile.selectChildHint")}
                  </p>
                </div>
              ) : (
                renderGradesPanel(
                  childGradesByCourse,
                  t("profile.noChildGrades"),
                  childGradesLoading,
                )
              )}

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2 px-1 mb-3">
                  <HiOutlineUser className="text-sm text-brand-purple" />
                  <h3 className="font-heading font-black text-sm text-[#2e0854]">
                    {t("profile.accountDetails")}
                  </h3>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlinePhone className="text-gray-300" />
                    <span>{displayPhone}</span>
                  </div>
                  {displayEmail && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlineMail className="text-gray-300" />
                      <span>{displayEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlineCalendar className="text-gray-300" />
                    <span>
                      {t("profile.joined")}{" "}
                      {new Date(displayCreatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 px-1">
                <HiOutlineUser className="text-sm text-brand-purple" />
                <h3 className="font-heading font-black text-sm text-[#2e0854]">
                  {t("profile.accountDetails")}
                </h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <HiOutlinePhone className="text-gray-300" />
                  <span>{displayPhone}</span>
                </div>
                {displayEmail && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlineMail className="text-gray-300" />
                    <span>{displayEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <HiOutlineCalendar className="text-gray-300" />
                  <span>
                    {t("profile.joined")}{" "}
                    {new Date(displayCreatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showRedeemModal && (
        <RedeemCodeModal
          onClose={() => setShowRedeemModal(false)}
          onSuccess={() => refetchEnrollments()}
        />
      )}
    </div>
  );
};

export default ProfilePage;
