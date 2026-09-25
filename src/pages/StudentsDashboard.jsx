import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, getFileUrl } from "../api";
import ProfileAvatarManager, {
  getUserProfileImage,
} from "../components/ProfileAvatarManager";
import VerificationToggle from "../components/VerificationToggle";
import ParentLinkSection from "../components/ParentLinkSection";
import { getStudentTypeLabel } from "../utils/studentType";
import { getVerificationStatus, hasLinkedParent } from "../utils/verification";
import {
  EGYPT_GOVERNORATES,
  DEFAULT_GOVERNORATE,
  getGovernorateLabel,
} from "../utils/governorates";
import {
  HiOutlineArrowLeft,
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineCalendar,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUserCircle,
  HiOutlineCollection,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineChat,
  HiOutlineDesktopComputer,
  HiOutlineAnnotation,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineLocationMarker,
} from "react-icons/hi";

const getInitials = (first, last) =>
  `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();

const StudentsDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const isAdmin = user?.role === "admin";

  // Core Data States
  const [studentsData, setStudentsData] = useState([]);
  const [studentTypeFilter, setStudentTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const STUDENTS_PAGE_SIZE = 20;
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: STUDENTS_PAGE_SIZE,
    totalPages: 1,
  });
  const [typeCounts, setTypeCounts] = useState({ online: 0, center: 0 });
  const [activeStudent, setActiveStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
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
    academicLevelId: "",
    curriculumId: "",
    parentId: "",
    dateOfBirth: "",
    studentType: "online",
    governorate: DEFAULT_GOVERNORATE,
    profileImageUrl: null,
    isActive: true,
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [parentLinkInitial, setParentLinkInitial] = useState(null);
  const [parentLinkState, setParentLinkState] = useState({
    parentId: null,
    linkMode: "lookup",
    newParent: null,
    linkedParent: null,
  });

  // --- New: Student assignments & grades view ---
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [progressPeriod, setProgressPeriod] = useState("7d");
  const [progressLanguage, setProgressLanguage] = useState("en");
  const [progressReport, setProgressReport] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressSending, setProgressSending] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [assignmentSubmission, setAssignmentSubmission] = useState(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [isEditingGrade, setIsEditingGrade] = useState(false);
  const [gradeScoreInput, setGradeScoreInput] = useState("");
  const [gradeFeedbackInput, setGradeFeedbackInput] = useState("");
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeError, setGradeError] = useState("");
  // Admins and assistants (and instructors) can adjust a submission's score
  // from this panel; enforcement still lives server-side in canManageCourseContent.
  const canGradeSubmissions =
    user?.role === "admin" ||
    user?.role === "assistant" ||
    user?.role === "instructor";
  const [sessionClearing, setSessionClearing] = useState(false);
  const [videoSummary, setVideoSummary] = useState(null);

  // --- Staff notes on this student ---
  const [studentNotes, setStudentNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Fetch all students (directory)
  const fetchAllStudents = async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAllStudents({
        page: targetPage,
        limit: STUDENTS_PAGE_SIZE,
        studentType: studentTypeFilter === "all" ? undefined : studentTypeFilter,
      });
      if (response.success) {
        setStudentsData(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
        if (response.typeCounts) {
          setTypeCounts(response.typeCounts);
        }
      } else {
        setError(t("dashboard.students.loadFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.students.syncFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Fetch single student + enrollments + assignments/grades
  const fetchSingleStudent = async (id) => {
    setLoading(true);
    setError("");
    try {
      const studentRes = await api.getStudentById(id);
      if (studentRes.success) {
        setActiveStudent(studentRes.data);
        const enrollRes = await api.getStudentEnrollments(id);
        if (enrollRes.success) {
          setEnrollments(enrollRes.data);
          // After getting enrollments, fetch assignments for this student
          fetchStudentAssignments(id, enrollRes.data);
        } else {
          setEnrollments([]);
        }
        fetchStudentNotes(id);
        fetchVideoSummary(id);
      } else {
        setError(t("dashboard.students.notFound"));
        setActiveStudent(null);
      }
    } catch (err) {
      setError(err?.message || "Failed to retrieve student profile.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch assignments & submissions for all enrolled courses of a student
  const fetchStudentAssignments = async (studentId, enrolledCourses) => {
    setAssignmentsLoading(true);
    try {
      let allAssignments = [];
      const studentRecordId = activeStudent?.roleData?.id; // students table id

      for (const course of enrolledCourses) {
        try {
          const courseDetail = await api.getCourseBySlug(course.slug);
          if (courseDetail.success && courseDetail.data.chapters) {
            // Extract assignment items
            for (const chapter of courseDetail.data.chapters) {
              if (chapter.items) {
                for (const item of chapter.items) {
                  if (item.item_type === "assignment") {
                    // Fetch the student's submission for this item
                    let submission = null;
                    try {
                      const subRes = await api.getSubmissionsForItem(item.id, {
                        studentId: studentRecordId,
                      });
                      if (subRes.success && subRes.data.length > 0) {
                        submission = subRes.data[0];
                      }
                    } catch (e) {
                      console.warn("Failed to fetch submission", e);
                    }

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
        } catch (e) {
          console.warn(`Failed to load course ${course.slug}`, e);
        }
      }
      setStudentAssignments(allAssignments);
    } catch (err) {
      console.error("Failed to fetch student assignments:", err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // View assignment detail (submission)
  const handleViewAssignment = async (assignment) => {
    setViewingAssignment(assignment);
    if (assignment.submission) {
      setAssignmentSubmission(assignment.submission);
    } else {
      setAssignmentSubmission(null);
    }
    setIsEditingGrade(false);
    setGradeError("");
  };

  // Back to assignments list
  const handleBackToAssignments = () => {
    setViewingAssignment(null);
    setAssignmentSubmission(null);
    setIsEditingGrade(false);
    setGradeError("");
  };

  // Start editing the score/feedback for the currently viewed submission
  const handleStartEditGrade = () => {
    setGradeScoreInput(
      assignmentSubmission?.score !== null &&
        assignmentSubmission?.score !== undefined
        ? String(assignmentSubmission.score)
        : "",
    );
    setGradeFeedbackInput(assignmentSubmission?.feedback || "");
    setGradeError("");
    setIsEditingGrade(true);
  };

  // Save an updated score/feedback for the currently viewed submission
  const handleSaveGrade = async () => {
    if (gradeScoreInput === "" || isNaN(Number(gradeScoreInput))) {
      setGradeError("Please enter a valid score.");
      return;
    }
    const scoreNum = Number(gradeScoreInput);
    if (scoreNum < 0) {
      setGradeError("Score cannot be negative.");
      return;
    }
    if (
      viewingAssignment?.maxScore &&
      scoreNum > Number(viewingAssignment.maxScore)
    ) {
      setGradeError(
        `Score cannot exceed the maximum of ${viewingAssignment.maxScore}.`,
      );
      return;
    }

    setGradeSaving(true);
    setGradeError("");
    try {
      await api.gradeSubmission(
        assignmentSubmission.id,
        scoreNum,
        gradeFeedbackInput || null,
      );
      setAssignmentSubmission((prev) => ({
        ...prev,
        score: scoreNum,
        feedback: gradeFeedbackInput || null,
      }));
      setStudentAssignments((prev) =>
        prev.map((a) =>
          a.id === viewingAssignment.id && a.submission
            ? {
                ...a,
                submission: {
                  ...a.submission,
                  score: scoreNum,
                  feedback: gradeFeedbackInput || null,
                },
              }
            : a,
        ),
      );
      setIsEditingGrade(false);
    } catch (err) {
      setGradeError(err?.message || "Failed to save the score.");
    } finally {
      setGradeSaving(false);
    }
  };

  // Fetch staff notes for the active student
  const fetchStudentNotes = async (id) => {
    setNotesLoading(true);
    try {
      const res = await api.getStudentNotes(id);
      if (res.success) setStudentNotes(res.data);
    } catch (err) {
      console.error("Failed to load student notes", err);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !activeStudent?.id) return;
    setNoteSubmitting(true);
    try {
      const res = await api.createStudentNote(
        activeStudent.id,
        newNoteText.trim(),
      );
      if (res.success) {
        setStudentNotes((prev) => [res.data, ...prev]);
        setNewNoteText("");
      } else {
        alert(res.message || "Failed to add note.");
      }
    } catch (err) {
      alert(err.message || "Failed to add note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.note);
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleSaveEditNote = async (noteId) => {
    if (!editingNoteText.trim()) return;
    try {
      const res = await api.updateStudentNote(noteId, editingNoteText.trim());
      if (res.success) {
        setStudentNotes((prev) =>
          prev.map((n) => (n.id === noteId ? res.data : n)),
        );
        setEditingNoteId(null);
        setEditingNoteText("");
      } else {
        alert(res.message || "Failed to update note.");
      }
    } catch (err) {
      alert(err.message || "Failed to update note.");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      const res = await api.deleteStudentNote(noteId);
      if (res.success) {
        setStudentNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        alert(res.message || "Failed to delete note.");
      }
    } catch (err) {
      alert(err.message || "Failed to delete note.");
    }
  };

  // Fetch academic levels for dropdown
  const fetchAcademicLevels = async () => {
    try {
      const res = await api.getAllLevels();
      if (res.success) setAcademicLevels(res.data);
    } catch (err) {
      console.error("Failed to load academic levels", err);
    }
  };

  // Fetch curriculums for dropdown
  const fetchCurriculums = async () => {
    try {
      const res = await api.getAllCurriculums();
      if (res.success) setCurriculums(res.data);
    } catch (err) {
      console.error("Failed to load curriculums", err);
    }
  };

  const handleParentLinkChange = useCallback((state) => {
    setParentLinkState(state);
  }, []);

  useEffect(() => {
    if (slug) {
      fetchSingleStudent(slug);
    } else {
      fetchAllStudents(page);
    }
    setIsFormViewActive(false);
    fetchAcademicLevels();
    fetchCurriculums();
  }, [slug, page, studentTypeFilter]);

  useEffect(() => {
    if (!activeStudent?.id) {
      setProgressReport(null);
      return;
    }

    const loadProgressPreview = async () => {
      setProgressLoading(true);
      try {
        const res = await api.getParentProgressReport(
          activeStudent.id,
          progressPeriod,
          progressLanguage,
        );
        if (res.success) {
          setProgressReport(res.data);
        } else {
          setProgressReport(null);
        }
      } catch (err) {
        console.error("Failed to load parent progress preview", err);
        setProgressReport(null);
      } finally {
        setProgressLoading(false);
      }
    };

    loadProgressPreview();
  }, [activeStudent?.id, progressPeriod, progressLanguage]);

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

  const handleSendParentProgress = async () => {
    if (!activeStudent?.id) return;

    if (!progressReport?.parent?.phone) {
      alert(t("dashboard.students.noParentPhone"));
      return;
    }

    setProgressSending(true);
    try {
      const res = await api.sendParentProgressWhatsApp(
        activeStudent.id,
        progressPeriod,
        progressLanguage,
      );
      if (res.success) {
        triggerSuccess(res.message || t("dashboard.students.whatsAppSent"));
      } else {
        alert(res.message || "Failed to send WhatsApp message.");
      }
    } catch (err) {
      alert(err.message || "Failed to send WhatsApp message.");
    } finally {
      setProgressSending(false);
    }
  };

  const handleVerificationUpdated = (data) => {
    setActiveStudent((prev) =>
      prev
        ? {
            ...prev,
            student_is_verified: data?.isVerified ? 1 : 0,
            roleData: {
              ...(prev.roleData || {}),
              ...(data?.roleData || {}),
            },
          }
        : prev,
    );
    setStudentsData((prev) =>
      prev.map((item) =>
        item.id === data?.userId
          ? {
              ...item,
              student_is_verified: data?.isVerified ? 1 : 0,
              roleData: data?.roleData
                ? {
                    ...(item.roleData || {}),
                    ...data.roleData,
                  }
                : item.roleData,
            }
          : item,
      ),
    );
    triggerSuccess(
      data?.isVerified
        ? t("dashboard.common.linkVerified")
        : t("dashboard.common.linkRemoved"),
    );
  };

  const handleClearStudentSession = async () => {
    if (!activeStudent?.id) return;
    setSessionClearing(true);
    setError("");
    try {
      const res = await api.clearStudentSession(activeStudent.id);
      if (res.success) {
        setActiveStudent((prev) =>
          prev ? { ...prev, activeSessions: [] } : prev,
        );
        triggerSuccess(
          res.message || "All device sessions were signed out for this student.",
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to sign out device sessions.");
    } finally {
      setSessionClearing(false);
    }
  };

  const fetchVideoSummary = async (id) => {
    setVideoSummary(null);
    try {
      const res = await api.getStudentVideoSummary(id);
      if (res.success) setVideoSummary(res.data);
    } catch {
      // Non-critical panel: leave it hidden rather than failing the profile.
    }
  };

  const formatSessionDate = (value) => {
    if (!value) return "";
    const normalized = String(value).trim().replace(" ", "T");
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const resolveParentIdForSubmit = async () => {
    if (parentLinkState.linkMode === "create_new") {
      const newParent = parentLinkState.newParent;
      if (
        !newParent?.firstName?.trim() ||
        !newParent?.lastName?.trim() ||
        !newParent?.phone?.trim()
      ) {
        throw new Error("Parent first name, last name, and phone are required.");
      }
      if (!newParent.password || newParent.password.length < 6) {
        throw new Error("Parent password must be at least 6 characters.");
      }

      const parentRes = await api.createParent({
        firstName: newParent.firstName.trim(),
        lastName: newParent.lastName.trim(),
        phone: newParent.phone.trim(),
        email: newParent.email?.trim() || undefined,
        emergencyContact: newParent.emergencyContact?.trim() || undefined,
        password: newParent.password,
      });

      if (!parentRes.success) {
        throw new Error(parentRes.message || "Failed to create parent account.");
      }

      return parentRes.data.id;
    }

    if (parentLinkState.linkMode === "linked") {
      return parentLinkState.parentId;
    }

    return null;
  };

  // --- Form handlers (unchanged) ---
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setParentLinkInitial(null);
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      academicLevelId: "",
      curriculumId: "",
      parentId: "",
      dateOfBirth: "",
      studentType: "online",
      governorate: DEFAULT_GOVERNORATE,
      profileImageUrl: null,
      isActive: true,
    });
    setIsFormViewActive(true);
  };

  const handleOpenEditForm = async (e, student) => {
    e.stopPropagation();
    setFormMode("edit");
    setEditingId(student.id);

    let studentData = student;
    if (!student.roleData) {
      try {
        const res = await api.getStudentById(student.id);
        if (res.success) {
          studentData = res.data;
        }
      } catch (err) {
        console.error("Failed to load student details for edit", err);
      }
    }

    if (studentData.roleData?.parent_id) {
      setParentLinkInitial({
        parentRecordId: studentData.roleData.parent_id,
        firstName: studentData.roleData.parent_first_name,
        lastName: studentData.roleData.parent_last_name,
        phone: studentData.roleData.parent_phone,
      });
    } else {
      setParentLinkInitial(null);
    }

    setFormData({
      firstName: studentData.first_name,
      lastName: studentData.last_name,
      phone: studentData.phone,
      email: studentData.email || "",
      password: "",
      academicLevelId: studentData.roleData?.academic_level_id || "",
      curriculumId: studentData.roleData?.curriculum_id || "",
      parentId: studentData.roleData?.parent_id || "",
      dateOfBirth: studentData.roleData?.date_of_birth
        ? studentData.roleData.date_of_birth.split("T")[0]
        : "",
      studentType:
        studentData.roleData?.student_type || studentData.student_type || "online",
      governorate:
        studentData.roleData?.governorate ||
        studentData.governorate ||
        DEFAULT_GOVERNORATE,
      profileImageUrl: getUserProfileImage(studentData),
      isActive: studentData.is_active,
    });
    setIsFormViewActive(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      const parentId = await resolveParentIdForSubmit();

      if (formMode === "create") {
        if (!formData.password || formData.password.length < 6) {
          setError(t("dashboard.common.passwordMin"));
          setFormSubmitLoading(false);
          return;
        }
        const response = await api.createStudent({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || undefined,
          password: formData.password,
          academicLevelId: formData.academicLevelId || undefined,
          curriculumId: formData.curriculumId || undefined,
          parentId: parentId || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          studentType: formData.studentType || "online",
          governorate: formData.governorate || DEFAULT_GOVERNORATE,
        });
        if (response.success) {
          triggerSuccess("Student account created successfully.");
          setIsFormViewActive(false);
          fetchAllStudents();
        } else {
          setError(response.message || t("dashboard.common.creationFailed"));
        }
      } else {
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || undefined,
          isActive: formData.isActive,
          academicLevelId: formData.academicLevelId || undefined,
          curriculumId: formData.curriculumId || undefined,
          parentId,
          dateOfBirth: formData.dateOfBirth || undefined,
          studentType: formData.studentType || "online",
          governorate: formData.governorate || DEFAULT_GOVERNORATE,
        };
        const response = await api.updateStudent(editingId, updateData);
        if (response.success) {
          triggerSuccess("Student account updated successfully.");
          setIsFormViewActive(false);
          if (slug) {
            fetchSingleStudent(slug);
          } else {
            fetchAllStudents();
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

  const handleDeleteStudent = async (e, studentId, studentName) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete student "${studentName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const response = await api.deleteStudent(studentId);
      if (response.success) {
        triggerSuccess("Student account permanently removed.");
        if (slug) {
          navigate("/dashboard/students");
        } else {
          fetchAllStudents();
        }
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || "Could not delete student account.");
    }
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.students.loading")}
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
                ? t("dashboard.students.create")
                : t("dashboard.students.edit")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {formMode === "create"
                ? t("dashboard.students.createDesc")
                : t("dashboard.students.editDesc")}
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
                editable
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
                    placeholder="Mohamed"
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
                    placeholder="Hesham"
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
                  placeholder="student@example.com"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.students.academicLevel")}
                </label>
                <select
                  value={formData.academicLevelId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      academicLevelId: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                >
                  <option value="">-- Select Grade --</option>
                  {academicLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.students.curriculum")}
                </label>
                <select
                  value={formData.curriculumId}
                  onChange={(e) =>
                    setFormData({ ...formData, curriculumId: e.target.value })
                  }
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                >
                  <option value="">-- Select Curriculum --</option>
                  {curriculums.map((cur) => (
                    <option key={cur.id} value={cur.id}>
                      {cur.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.students.studentType")}
              </label>
              <select
                value={formData.studentType}
                onChange={(e) =>
                  setFormData({ ...formData, studentType: e.target.value })
                }
                className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              >
                <option value="online">{t("dashboard.common.online")}</option>
                <option value="center">{t("dashboard.common.center")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.students.governorate")}
              </label>
              <select
                value={formData.governorate}
                onChange={(e) =>
                  setFormData({ ...formData, governorate: e.target.value })
                }
                className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              >
                {EGYPT_GOVERNORATES.map((gov) => (
                  <option key={gov.value} value={gov.value}>
                    {language === "ar" ? gov.ar : gov.en}
                  </option>
                ))}
              </select>
            </div>

            <ParentLinkSection
              key={`parent-link-${formMode}-${editingId || "new"}`}
              initialLinkedParent={parentLinkInitial}
              onChange={handleParentLinkChange}
            />

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.students.dateOfBirth")}
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
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
                Account active (can log in and access courses)
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
                    ? t("dashboard.students.createAccount")
                    : t("common.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== VIEW 1: SINGLE STUDENT PROFILE ====================
  if (slug) {
    if (!activeStudent) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.students.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/students")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.students.backAll")}
          </button>
        </div>
      );
    }

    const roleData = activeStudent.roleData;

    // If viewing a single assignment detail
    if (viewingAssignment) {
      return (
        <div className="max-w-3xl space-y-6 animate-fadeIn text-[#2e0854]">
          <button
            onClick={handleBackToAssignments}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.students.backOverview")}</span>
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
                Due: {new Date(viewingAssignment.dueDate).toLocaleDateString()}{" "}
                | Max Score: {viewingAssignment.maxScore || 100}
              </p>
            )}

            {assignmentSubmission ? (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      Submission by {activeStudent.first_name}{" "}
                      {activeStudent.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Submitted:{" "}
                      {new Date(
                        assignmentSubmission.submitted_at,
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignmentSubmission.score !== null && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        Score: {assignmentSubmission.score}
                      </span>
                    )}
                    {canGradeSubmissions && !isEditingGrade && (
                      <button
                        type="button"
                        onClick={handleStartEditGrade}
                        className="text-xs text-brand-purple font-semibold underline focus:outline-none"
                      >
                        {assignmentSubmission.score !== null
                          ? "Edit Score"
                          : "Add Score"}
                      </button>
                    )}
                  </div>
                </div>
                {canGradeSubmissions && isEditingGrade && (
                  <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Score
                        {viewingAssignment.maxScore
                          ? ` (out of ${viewingAssignment.maxScore})`
                          : ""}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={viewingAssignment.maxScore || undefined}
                        step="0.01"
                        value={gradeScoreInput}
                        onChange={(e) => setGradeScoreInput(e.target.value)}
                        className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Feedback (optional)
                      </label>
                      <textarea
                        rows={3}
                        value={gradeFeedbackInput}
                        onChange={(e) => setGradeFeedbackInput(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100"
                      />
                    </div>
                    {gradeError && (
                      <p className="text-xs text-red-500">{gradeError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={gradeSaving}
                        onClick={handleSaveGrade}
                        className="bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all active:scale-[0.99]"
                      >
                        {gradeSaving ? "Saving..." : "Save Score"}
                      </button>
                      <button
                        type="button"
                        disabled={gradeSaving}
                        onClick={() => {
                          setIsEditingGrade(false);
                          setGradeError("");
                        }}
                        className="text-xs text-gray-400 font-semibold px-4 py-2 hover:text-gray-600"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
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

    // Main student profile with assignments panel
    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/students")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" /> <span>{t("dashboard.students.backAll")}</span>
          </button>

          <div className="flex items-center space-x-2">
            {isAdmin && (
              <>
                <button
                  onClick={(e) => handleOpenEditForm(e, activeStudent)}
                  className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
                >
                  <HiOutlinePencil /> <span>{t("dashboard.common.edit")}</span>
                </button>
                <button
                  onClick={(e) =>
                    handleDeleteStudent(
                      e,
                      activeStudent.id,
                      `${activeStudent.first_name} ${activeStudent.last_name}`,
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

        {/* Student Hero Card */}
        <div className="bg-[#2e0854] rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
          <div className="flex items-center space-x-4">
            <ProfileAvatarManager
              userId={activeStudent.id}
              imageUrl={getUserProfileImage(activeStudent)}
              firstName={activeStudent.first_name}
              lastName={activeStudent.last_name}
              size="md"
              editable={isAdmin}
              variant="dark"
              onUpdated={(imageUrl) => {
                setActiveStudent((prev) => ({
                  ...prev,
                  profile_image_url: imageUrl,
                }));
                triggerSuccess(t("dashboard.common.profileImageUpdated"));
              }}
              onRemoved={() => {
                setActiveStudent((prev) => ({
                  ...prev,
                  profile_image_url: null,
                }));
                triggerSuccess(t("dashboard.common.profileImageRemoved"));
              }}
            />
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-900/30 font-mono">
                ID-{activeStudent.id}
              </span>
              <h2 className="text-2xl font-black font-heading tracking-tight mt-2">
                {activeStudent.first_name} {activeStudent.last_name}
              </h2>
              <p className="text-xs text-red-100/70 font-light">
                Student • {getStudentTypeLabel(activeStudent)} •{" "}
                {activeStudent.is_active ? t("dashboard.common.active") : t("dashboard.common.disabled")}
              </p>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Personal Details */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.01)] space-y-4">
            <div>
              <h3 className="font-heading font-black text-base text-[#2e0854]">
                Personal Details
              </h3>
              <p className="text-[11px] text-gray-400 font-light">
                Contact and academic information
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                <HiOutlinePhone className="text-gray-400 text-base" />
                <span className="font-mono text-xs">{activeStudent.phone}</span>
              </div>
              {activeStudent.email && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineMail className="text-gray-400 text-base" />
                  <span className="text-xs truncate">
                    {activeStudent.email}
                  </span>
                </div>
              )}
              {roleData?.academic_level_name && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineAcademicCap className="text-gray-400 text-base" />
                  <span className="text-xs">
                    {roleData.academic_level_name}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                <HiOutlineCollection className="text-gray-400 text-base" />
                <span className="text-xs">{getStudentTypeLabel(activeStudent)} Student</span>
              </div>
              <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                <HiOutlineLocationMarker className="text-gray-400 text-base" />
                <span className="text-xs">
                  {getGovernorateLabel(
                    roleData?.governorate || activeStudent.governorate,
                    language,
                  ) || DEFAULT_GOVERNORATE}
                </span>
              </div>
              {roleData?.curriculum_name && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineCollection className="text-gray-400 text-base" />
                  <span className="text-xs">
                    {roleData.curriculum_name}{" "}
                    {roleData.curriculum_code && (
                      <span className="text-gray-400 font-mono">
                        ({roleData.curriculum_code})
                      </span>
                    )}
                  </span>
                </div>
              )}
              {roleData?.date_of_birth && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineCalendar className="text-gray-400 text-base" />
                  <span className="text-xs font-mono">
                    {new Date(roleData.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              )}
              {roleData?.parent_first_name && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineUserCircle className="text-gray-400 text-base" />
                  <span className="text-xs">
                    Parent: {roleData.parent_first_name}{" "}
                    {roleData.parent_last_name}
                  </span>
                </div>
              )}
            </div>
            {isAdmin && roleData?.parent_id && (
              <div className="pt-3 border-t border-gray-50 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Parent Link Verification
                  </p>
                  <VerificationToggle
                    student={activeStudent}
                    onUpdated={handleVerificationUpdated}
                  />
                </div>
              </div>
            )}
            <div className="pt-3 border-t border-gray-50 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Logged-in Devices
                </p>
                {activeStudent.activeSessions?.length ? (
                  <div className="space-y-2">
                    {activeStudent.activeSessions.map((session) => (
                      <div
                        key={session.session_id}
                        className="rounded-xl border border-gray-100 bg-gray-50/70 p-3"
                      >
                        <div className="flex items-start gap-2 text-xs text-gray-700">
                          <HiOutlineDesktopComputer className="text-base mt-0.5 shrink-0 text-gray-400" />
                          <div className="min-w-0">
                            <p className="font-semibold break-all">
                              {session.user_agent || "Unknown device"}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Since {formatSessionDate(session.created_at)}
                            </p>
                            {session.last_seen_at && (
                              <p className="text-[11px] text-gray-500">
                                Last active{" "}
                                {formatSessionDate(session.last_seen_at)}
                              </p>
                            )}
                            {session.ip_address && (
                              <p className="text-[10px] text-gray-400 mt-1 font-mono">
                                {session.ip_address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(isAdmin ||
                      user?.role === "instructor" ||
                      user?.role === "assistant") && (
                      <button
                        type="button"
                        onClick={handleClearStudentSession}
                        disabled={sessionClearing}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                      >
                        {sessionClearing
                          ? "Signing out..."
                          : "Sign out all devices"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    No devices are currently logged in for this student.
                  </p>
                )}
              </div>
            </div>
            {videoSummary && (
              <div className="pt-3 border-t border-gray-50 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Video Watching
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-gray-50/70 p-2 text-center">
                      <div className="text-sm font-black text-[#2e0854]">
                        {videoSummary.videosOpened}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-400">
                        Opened
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50/70 p-2 text-center">
                      <div className="text-sm font-black text-[#2e0854]">
                        {videoSummary.videosCompleted}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-400">
                        Finished
                      </div>
                    </div>
                    <div
                      className={`rounded-xl p-2 text-center ${
                        videoSummary.totalStrikes > 0
                          ? "bg-red-50"
                          : "bg-gray-50/70"
                      }`}
                    >
                      <div
                        className={`text-sm font-black ${
                          videoSummary.totalStrikes > 0
                            ? "text-red-700"
                            : "text-[#2e0854]"
                        }`}
                      >
                        {videoSummary.totalStrikes}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-400">
                        Strikes
                      </div>
                    </div>
                  </div>
                  {videoSummary.recentStrikes?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {videoSummary.recentStrikes.map((strike) => (
                        <p
                          key={strike.id}
                          className="text-[10px] text-gray-500 leading-snug"
                        >
                          <span className="text-red-600 font-semibold">•</span>{" "}
                          {strike.item_title}
                          <span className="text-gray-400">
                            {" "}
                            — {strike.course_title}
                          </span>
                          {strike.issued_at && (
                            <span className="text-gray-400">
                              {" "}
                              ({formatSessionDate(strike.issued_at)})
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="pt-3 border-t border-gray-50">
              <div className="text-[10px] text-gray-400">
                Registered:{" "}
                {new Date(activeStudent.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Right column: Enrollments + Assignments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Staff Notes Panel */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.01)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                    <HiOutlineAnnotation className="text-brand-purple" />
                    Staff Notes
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Internal notes visible to admins, instructors, and
                    assistants only.
                  </p>
                </div>
                <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl">
                  {studentNotes.length} notes
                </span>
              </div>

              <form
                onSubmit={handleAddNote}
                className="flex items-start gap-2 mb-4"
              >
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add a note about this student..."
                  rows={2}
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all resize-y"
                />
                <button
                  type="submit"
                  disabled={noteSubmitting || !newNoteText.trim()}
                  className="shrink-0 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-xs px-4 py-3 rounded-2xl transition-all active:scale-[0.99]"
                >
                  {noteSubmitting ? "..." : "Add"}
                </button>
              </form>

              {notesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : studentNotes.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {studentNotes.map((note) => {
                    const canManageNote =
                      isAdmin || note.author_id === user?.id;
                    return (
                      <div
                        key={note.id}
                        className="p-3 bg-gray-50/40 border border-gray-100 rounded-xl"
                      >
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingNoteText}
                              onChange={(e) =>
                                setEditingNoteText(e.target.value)
                              }
                              rows={2}
                              className="w-full bg-white text-sm font-light border border-violet-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-y"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEditNote(note.id)}
                                className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100"
                              >
                                <HiOutlineCheck /> Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditNote}
                                className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-200"
                              >
                                <HiOutlineX /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {note.note}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-gray-400">
                                {note.author_first_name} {note.author_last_name}
                                {" · "}
                                {new Date(note.created_at).toLocaleString()}
                              </span>
                              {canManageNote && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditNote(note)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                  >
                                    <HiOutlinePencil className="text-xs" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="text-gray-400 hover:text-brand-purple transition-colors"
                                  >
                                    <HiOutlineTrash className="text-xs" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <p className="text-xs text-gray-400 font-light">
                    No notes yet for this student.
                  </p>
                </div>
              )}
            </div>

            {/* Enrolled Courses Panel */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.01)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-black text-base text-[#2e0854]">
                    Enrolled Courses
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Active courses and enrollment status
                  </p>
                </div>
                <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl flex items-center">
                  <HiOutlineBookOpen className="mr-1" /> {enrollments.length}{" "}
                  Courses
                </span>
              </div>
              <div className="space-y-4">
                {enrollments.length > 0 ? (
                  enrollments.map((course, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        navigate(`/dashboard/courses/${course.slug}`)
                      }
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50/70 border border-transparent hover:border-violet-100 rounded-2xl transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        {course.cover_image_url ? (
                          <img
                            src={getFileUrl(course.cover_image_url)}
                            alt={course.title}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                            <HiOutlineBookOpen />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-[#2e0854]">
                            {course.title}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {course.instructor_first_name}{" "}
                            {course.instructor_last_name} • {course.term}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 sm:mt-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                            course.enrollment_status === "active"
                              ? "text-emerald-700 bg-emerald-50"
                              : course.enrollment_status === "completed"
                                ? "text-blue-700 bg-blue-50"
                                : "text-gray-500 bg-gray-100"
                          }`}
                        >
                          {course.enrollment_status}
                        </span>
                        <span className="text-xs font-mono font-bold text-brand-purple bg-white px-2 py-1 rounded-lg border border-gray-100">
                          {Number(course.price) > 0
                            ? `EGP ${course.price}`
                            : t("dashboard.common.free")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                    <p className="text-xs text-gray-400 font-light">
                      This student is not enrolled in any courses yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Assignments & Grades Panel */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                    <HiOutlineDocumentText className="text-brand-purple" />
                    {t("dashboard.students.assignmentsGrades")}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Click an assignment to view submission details
                  </p>
                </div>
                <span className="text-xs font-bold text-brand bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl">
                  {studentAssignments.length} assignments
                </span>
              </div>

              {assignmentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : studentAssignments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {studentAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      onClick={() => handleViewAssignment(assignment)}
                      className="flex items-center justify-between p-3 bg-gray-50/40 border border-gray-100 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#2e0854] truncate">
                          {assignment.title}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {assignment.courseTitle} · Due:{" "}
                          {assignment.dueDate
                            ? new Date(assignment.dueDate).toLocaleDateString()
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
                <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                  <p className="text-xs text-gray-400">
                    No assignments found for enrolled courses.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-heading font-black text-base text-[#2e0854] flex items-center gap-2">
                    <HiOutlineChat className="text-emerald-600" />
                    {t("dashboard.students.parentWhatsAppProgress")}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light mt-1">
                    {t("dashboard.students.parentWhatsAppDesc")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    {t("dashboard.students.progressPeriod")}
                  </label>
                  <select
                    value={progressPeriod}
                    onChange={(e) => setProgressPeriod(e.target.value)}
                    className="w-full bg-gray-50/70 text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:border-violet-200"
                  >
                    <option value="1d">
                      {t("dashboard.students.periodLastDay")}
                    </option>
                    <option value="7d">
                      {t("dashboard.students.periodLast7Days")}
                    </option>
                    <option value="30d">
                      {t("dashboard.students.periodLastMonth")}
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    {t("dashboard.students.messageLanguage")}
                  </label>
                  <select
                    value={progressLanguage}
                    onChange={(e) => setProgressLanguage(e.target.value)}
                    className="w-full bg-gray-50/70 text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:border-violet-200"
                  >
                    <option value="en">
                      {t("dashboard.students.languageEnglish")}
                    </option>
                    <option value="ar">
                      {t("dashboard.students.languageArabic")}
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {progressReport?.parent ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800">
                    Parent: {progressReport.parent.first_name}{" "}
                    {progressReport.parent.last_name} ·{" "}
                    {progressReport.parent.phone}
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-800">
                    {t("dashboard.students.noParentPhone")}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    {t("dashboard.students.messagePreview")}
                  </label>
                  {progressLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      <span className="sr-only">
                        {t("dashboard.students.loadProgressPreview")}
                      </span>
                    </div>
                  ) : (
                    <textarea
                      readOnly
                      value={progressReport?.messagePreview || ""}
                      rows={12}
                      className="w-full bg-gray-50 text-xs font-mono border border-gray-200 rounded-xl px-4 py-3 focus:outline-none resize-y"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSendParentProgress}
                  disabled={
                    progressSending ||
                    progressLoading ||
                    !progressReport?.parent?.phone
                  }
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold text-sm py-3 rounded-xl transition-all"
                >
                  <HiOutlineChat className="text-base" />
                  {progressSending
                    ? t("dashboard.students.sendingWhatsApp")
                    : t("dashboard.students.sendWhatsApp")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: STUDENTS DIRECTORY (GRID) ====================
  // Filtering by student type is applied server-side (see fetchAllStudents),
  // so the current page's data is already scoped to the active filter.
  const filteredStudents = studentsData;

  const typeFilters = [
    {
      value: "all",
      label: t("dashboard.students.filterAllTypes"),
      count: typeCounts.online + typeCounts.center,
    },
    {
      value: "online",
      label: t("dashboard.students.filterOnline"),
      count: typeCounts.online,
    },
    {
      value: "center",
      label: t("dashboard.students.filterCenter"),
      count: typeCounts.center,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.students.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {isAdmin
              ? t("dashboard.students.subtitleAdmin")
              : t("dashboard.students.subtitleInstructor")}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreateForm}
            className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
          >
            <HiOutlinePlus className="text-base" />
            <span>{t("dashboard.students.create")}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 w-fit shadow-[0_15px_40px_rgba(43,2,7,0.02)]">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setStudentTypeFilter(filter.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                studentTypeFilter === filter.value
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-400 hover:text-brand-purple hover:bg-gray-50"
              }`}
            >
              {filter.label}
              <span
                className={`ml-1.5 text-[10px] ${
                  studentTypeFilter === filter.value
                    ? "text-white/70"
                    : "text-gray-300"
                }`}
              >
                ({filter.count})
              </span>
            </button>
          ))}
        </div>

        {pagination.total > 0 && (
          <p className="text-xs text-gray-400 font-medium">
            {t("dashboard.students.totalCount", { total: pagination.total })}
          </p>
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
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            onClick={() => navigate(`/dashboard/students/${student.id}`)}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                  ID-{student.id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    getStudentTypeLabel(student) === "Center"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {getStudentTypeLabel(student)}
                </span>
                {hasLinkedParent(student) && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      getVerificationStatus(student)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {getVerificationStatus(student)
                      ? t("dashboard.common.parentVerified")
                      : t("dashboard.common.parentUnverified")}
                  </span>
                )}
                {isAdmin && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEditForm(e, student)}
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title="Edit Student"
                    >
                      <HiOutlinePencil className="text-xs" />
                    </button>
                    <button
                      onClick={(e) =>
                        handleDeleteStudent(
                          e,
                          student.id,
                          `${student.first_name} ${student.last_name}`,
                        )
                      }
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title="Delete Student"
                    >
                      <HiOutlineTrash className="text-xs" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {student.profile_image_url ? (
                  <img
                    src={getFileUrl(student.profile_image_url)}
                    alt={student.first_name}
                    className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-xs font-bold">
                    {getInitials(student.first_name, student.last_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors truncate">
                    {student.first_name} {student.last_name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-light truncate font-mono">
                    {student.phone}
                  </p>
                </div>
              </div>
            </div>

            {isAdmin && hasLinkedParent(student) && (
              <div className="pt-3 border-t border-gray-50 space-y-3">
                <div onClick={(e) => e.stopPropagation()}>
                  <VerificationToggle
                    student={student}
                    compact
                    stopPropagation
                    onUpdated={() => fetchAllStudents()}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center font-medium text-[#2e0854] bg-violet-50/50 px-2 py-1 rounded-lg text-[11px]">
                  <HiOutlineUser className="mr-1 text-gray-400 text-xs" /> Student
                  Account
                </span>
                <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        ))}

        {filteredStudents.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-xs text-gray-400 font-light">
              {studentTypeFilter !== "all"
                ? t("dashboard.students.noMatchFilter")
                : isAdmin
                  ? t("dashboard.students.emptyAdmin")
                  : t("dashboard.students.emptyInstructor")}
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-100 text-gray-500 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:text-brand-purple hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {t("dashboard.students.paginationPrev")}
          </button>

          <span className="text-xs font-semibold text-gray-400">
            {t("dashboard.students.paginationPage", {
              page: pagination.page,
              totalPages: pagination.totalPages,
            })}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages || loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-100 text-gray-500 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:text-brand-purple hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {t("dashboard.students.paginationNext")}
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentsDashboard;
