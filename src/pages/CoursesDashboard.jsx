import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { api, getFileUrl } from "../api";
import writeExcelFile from "write-excel-file/browser";
import {
  formatDueDate,
  isPastDueDate,
  toDatetimeLocalValue,
} from "../utils/assessmentDue";
import {
  HiOutlinePlus,
  HiOutlineBookOpen,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineArrowLeft,
  HiOutlineAcademicCap,
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineVideoCamera,
  HiOutlineQuestionMarkCircle,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePhotograph,
  HiOutlineCollection,
  HiOutlineKey,
  HiOutlinePlusCircle,
  HiOutlineDuplicate,
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineX,
  HiOutlinePlusSm,
  HiOutlineInformationCircle,
} from "react-icons/hi";
import { HiOutlinePlayCircle } from "react-icons/hi2";

const STATUS_FILTERS = ["all", "published", "draft", "archived"];
const TERM_OPTIONS = ["Fall", "Spring", "Summer", "Winter"];

const STATUS_STYLES = {
  published: "text-emerald-700 bg-emerald-50",
  draft: "text-gray-400 bg-gray-100",
  archived: "text-amber-700 bg-amber-50",
};

const ITEM_TYPE_ICONS = {
  vimeo_video: HiOutlinePlayCircle,
  assignment: HiOutlineDocumentText,
  quiz: HiOutlineQuestionMarkCircle,
  zoom_meeting: HiOutlineVideoCamera,
};

const VALID_ITEM_TYPES = ["vimeo_video", "assignment", "quiz", "zoom_meeting"];
const QUESTION_TYPES = ["mcq", "text", "upload"];
const QUESTION_TYPE_LABELS = {
  mcq: "Multiple Choice",
  text: "Text Answer",
  upload: "File Upload",
};
const QUESTION_CONTENT_MODES = ["text", "upload"];

const isQuestionImagePath = (path) =>
  path && /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(path);

// The chapter-item form stores video length as a single `durationSeconds`
// string (the server's contract). These split it into hours/minutes/seconds
// for the three-part input and recombine whenever one part changes. Minutes or
// seconds above 59 roll up on the next split (entering 90s shows as 1m 30s).
const splitDuration = (totalSeconds) => {
  const total = parseInt(totalSeconds, 10);
  if (!Number.isFinite(total) || total <= 0) return { h: "", m: "", s: "" };
  return {
    h: String(Math.floor(total / 3600)),
    m: String(Math.floor((total % 3600) / 60)),
    s: String(total % 60),
  };
};

const combineDuration = ({ h, m, s }) => {
  const total =
    (parseInt(h, 10) || 0) * 3600 +
    (parseInt(m, 10) || 0) * 60 +
    (parseInt(s, 10) || 0);
  return total > 0 ? String(total) : "";
};

const DURATION_PARTS = [
  { key: "h", label: "Hours" },
  { key: "m", label: "Minutes" },
  { key: "s", label: "Seconds" },
];

const buildQuizQuestionRequestBody = (question) => {
  if (question.question_file) {
    const formData = new FormData();
    formData.append("questionText", question.question_text || "");
    formData.append("questionType", question.question_type);
    formData.append("maxScore", question.max_score);
    formData.append("isRequired", question.is_required);
    formData.append("questionImage", question.question_file);
    return formData;
  }

  return {
    questionText: question.question_text || "",
    questionType: question.question_type,
    maxScore: question.max_score,
    isRequired: question.is_required,
    ...(question.clear_question_image ? { clearQuestionImage: true } : {}),
  };
};

const QuizQuestionPrompt = ({ question, getFileUrl }) => (
  <div className="space-y-2">
    {question.question_image_path &&
      (isQuestionImagePath(question.question_image_path) ? (
        <img
          src={getFileUrl(question.question_image_path)}
          alt="Question"
          className="max-h-32 rounded-lg border border-gray-200 object-contain"
        />
      ) : (
        <a
          href={getFileUrl(question.question_image_path)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-purple hover:underline"
        >
          View question file
        </a>
      ))}
    {question.question_text && (
      <p className="font-medium text-sm text-[#2e0854]">
        {question.question_text}
      </p>
    )}
    {!question.question_image_path && !question.question_text && (
      <p className="text-sm text-gray-400 italic">Question image</p>
    )}
  </div>
);

const CoursesDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const termLabel = (term) => {
    const key = String(term || "").toLowerCase();
    const termKeys = {
      fall: "fall",
      spring: "spring",
      summer: "summer",
      winter: "winter",
    };
    return termKeys[key]
      ? t(`dashboard.common.terms.${termKeys[key]}`)
      : term;
  };

  const statusFilterLabel = (status) => {
    const labels = {
      all: t("dashboard.common.all"),
      published: t("dashboard.common.published"),
      draft: t("dashboard.common.draft"),
      archived: t("dashboard.common.archived"),
    };
    return labels[status] ?? status;
  };

  // ========== LIST VIEW STATES ==========
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ========== DETAIL VIEW STATES ==========
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseStudents, setCourseStudents] = useState([]);

  // ========== COURSE FORM STATES ==========
  const [isCourseFormActive, setIsCourseFormActive] = useState(false);
  const [courseFormMode, setCourseFormMode] = useState("create");
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseFormData, setCourseFormData] = useState({
    title: "",
    description: "",
    term: "Fall",
    priceType: "Free",
    price: "",
    status: "draft",
    instructorId: "",
    subjectIds: [],
    academicLevelIds: [],
    curriculumIds: [],
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [courseFormSubmitLoading, setCourseFormSubmitLoading] = useState(false);
  const [courseFormError, setCourseFormError] = useState("");

  // ========== CHAPTER FULL‑PAGE VIEW ==========
  const [isChapterViewActive, setIsChapterViewActive] = useState(false);
  const [chapterFormMode, setChapterFormMode] = useState("create");
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [chapterFormData, setChapterFormData] = useState({
    title: "",
    description: "",
    sortOrder: "",
    isActive: true,
  });
  const [chapterFormSubmitLoading, setChapterFormSubmitLoading] =
    useState(false);
  const [chapterFormError, setChapterFormError] = useState("");

  // ========== CHAPTER ITEM FULL‑PAGE VIEW (with Quiz Builder) ==========
  const [isChapterItemViewActive, setIsChapterItemViewActive] = useState(false);
  const [chapterItemFormMode, setChapterItemFormMode] = useState("create");
  const [editingChapterItemId, setEditingChapterItemId] = useState(null);
  const [selectedParentChapterId, setSelectedParentChapterId] = useState(null);
  const [chapterItemFormData, setChapterItemFormData] = useState({
    title: "",
    content: "",
    itemType: "assignment",
    sortOrder: "",
    isPreviewFree: false,
    vimeoVideoId: "",
    durationSeconds: "",
    meetingId: "",
    meetingPassword: "",
    startTime: "",
    durationMinutes: "",
    joinUrl: "",
    meetingStatus: "scheduled",
    maxScore: 100,
    dueDate: "",
    availableFrom: "",
    timeLimitMinutes: "",
    attemptWindowMinutes: "",
    dependsOnItemId: "",
    visibleIfScoreBelow: "60",
    prereqQuizItemId: "",
    prereqAssignmentItemId: "",
  });
  const [chapterItemSubmitLoading, setChapterItemSubmitLoading] =
    useState(false);
  const [chapterItemFormError, setChapterItemFormError] = useState("");
  const [chapterItemAttachmentFile, setChapterItemAttachmentFile] =
    useState(null);
  const [chapterItemExistingAttachmentUrl, setChapterItemExistingAttachmentUrl] =
    useState(null);
  const [chapterItemRemoveAttachment, setChapterItemRemoveAttachment] =
    useState(false);

  // ─── QUIZ QUESTION BUILDER ───
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_content_mode: "text",
    question_file: null,
    question_image_path: null,
    question_image_preview: null,
    question_type: "mcq",
    max_score: 10,
    is_required: true,
    options: [{ option_text: "", is_correct: false }],
  });
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // ========== GRADING FULL‑PAGE VIEW ==========
  const [isGradingViewActive, setIsGradingViewActive] = useState(false);
  const [selectedGradingItem, setSelectedGradingItem] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [gradingSubmissionId, setGradingSubmissionId] = useState(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [gradingLoading, setGradingLoading] = useState(false);

  // ========== ACCESS CODES FULL‑PAGE VIEW ==========
  const [isAccessCodesViewActive, setIsAccessCodesViewActive] = useState(false);
  const [accessCodes, setAccessCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesPage, setCodesPage] = useState(1);
  const [exportingCodes, setExportingCodes] = useState(false);
  const CODES_PER_PAGE = 20;

  // ========== VIDEO PROGRESS FULL-PAGE VIEW ==========
  const [isVideoProgressViewActive, setIsVideoProgressViewActive] =
    useState(false);
  const [videoProgress, setVideoProgress] = useState([]);
  const [videoProgressLoading, setVideoProgressLoading] = useState(false);
  const [videoProgressItemFilter, setVideoProgressItemFilter] = useState("");
  const [videoProgressError, setVideoProgressError] = useState("");
  const [showCreateCodeForm, setShowCreateCodeForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [newCode, setNewCode] = useState({
    codeType: "course",
    chapterItemId: "",
    maxUses: 1,
    expiresAt: "",
    accessDurationDays: "",
    customCode: "",
  });
  const [bulkQuantity, setBulkQuantity] = useState(5);
  const [bulkCodeType, setBulkCodeType] = useState("course");
  const [bulkExpiresAt, setBulkExpiresAt] = useState("");
  const [bulkAccessDurationDays, setBulkAccessDurationDays] = useState("");
  const [codeFormError, setCodeFormError] = useState("");

  // ========== STUDENT ENROLLMENT SEARCH ==========
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [enrollingStudentId, setEnrollingStudentId] = useState(null);
  const [enrollmentActionId, setEnrollmentActionId] = useState(null);

  // Item-level student access modal
  const [itemAccessTarget, setItemAccessTarget] = useState(null);
  const [itemUnlockedStudents, setItemUnlockedStudents] = useState([]);
  const [itemAccessSearchQuery, setItemAccessSearchQuery] = useState("");
  const [itemAccessSearchResults, setItemAccessSearchResults] = useState([]);
  const [showItemAccessDropdown, setShowItemAccessDropdown] = useState(false);
  const [itemAccessActionId, setItemAccessActionId] = useState(null);
  const [itemAccessLoading, setItemAccessLoading] = useState(false);
  // Note: searchDebounceRef is no longer needed (we removed live search)

  // ========== SUBMISSION UI STATE (student) ==========
  const [selectedItemForSubmission, setSelectedItemForSubmission] =
    useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("draft");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState("");

  // ========== REDEEM CODE MODAL (student) ==========
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCodeInput, setRedeemCodeInput] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);

  // ========== DROPDOWN DATA ==========
  const [subjectsList, setSubjectsList] = useState([]);
  const [academicLevelsList, setAcademicLevelsList] = useState([]);
  const [curriculumsList, setCurriculumsList] = useState([]);
  const [instructorsList, setInstructorsList] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // ========== UI STATES ==========
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ----- Helper functions (existing) -----
  const fetchStudentSubmission = async (chapterItemId) => {
    if (!currentUser?.student_id) return;
    try {
      const res = await api.getSubmissionsForItem(chapterItemId, {
        studentId: currentUser.student_id,
      });
      if (res.success && res.data.length > 0) {
        setExistingSubmission(res.data[0]);
        setSubmissionText(res.data[0].submission_text || "");
        setSubmissionStatus(res.data[0].status);
      } else {
        setExistingSubmission(null);
        setSubmissionText("");
        setSubmissionStatus("draft");
      }
    } catch (err) {
      console.error("Failed to fetch submission", err);
    }
  };

  const handleSaveSubmission = async (finalize = false) => {
    if (!selectedItemForSubmission) return;
    if (
      finalize &&
      isPastDueDate(selectedItemForSubmission.due_date)
    ) {
      setSubmissionError("The due date for this assignment has passed.");
      return;
    }
    setSubmitting(true);
    setSubmissionError("");
    try {
      const res = await api.upsertSubmission(
        selectedItemForSubmission.id,
        submissionText,
        finalize ? "submitted" : "draft",
        submissionFile,
      );
      if (res.success) {
        setSubmissionSuccess(res.message);
        setTimeout(() => setSubmissionSuccess(""), 3000);
        setSubmissionFile(null);
        await fetchStudentSubmission(selectedItemForSubmission.id);
        if (finalize) fetchCourseDetails(slug);
      } else {
        setSubmissionError(res.message || "Failed to save submission.");
      }
    } catch (err) {
      setSubmissionError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Grading full‑page functions (UPDATED) -----
  const openGradingView = async (item) => {
    setSelectedGradingItem(item);
    setIsGradingViewActive(true);
    setGradingLoading(true);
    try {
      // The course-structure `item` carries no max_score; pull the full record
      // so the grading view shows the real "/ N" denominator.
      api
        .getChapterItemById(item.id)
        .then((full) => {
          if (full?.data) {
            setSelectedGradingItem((prev) =>
              prev && prev.id === item.id ? { ...prev, ...full.data } : prev,
            );
          }
        })
        .catch(() => {});

      let res;
      if (item.item_type === "quiz") {
        res = await api.getQuizAnswers(item.id);
      } else {
        res = await api.getSubmissionsForItem(item.id);
      }
      if (res.success) setSubmissionsList(res.data);
      else setSubmissionsList([]);
    } catch (err) {
      console.error(err);
      setSubmissionsList([]);
    } finally {
      setGradingLoading(false);
    }
    setGradingSubmissionId(null);
    setGradeScore("");
    setGradeFeedback("");
  };

  const handleGradeSubmit = async (submissionId) => {
    if (!gradeScore) return;
    setGradingLoading(true);
    try {
      const res = await api.gradeSubmission(
        submissionId,
        parseFloat(gradeScore),
        gradeFeedback,
      );
      if (res.success) {
        triggerSuccess(t("dashboard.common.gradeSaved"));
        setGradingSubmissionId(null);
        setGradeScore("");
        setGradeFeedback("");
        const refreshRes = await api.getSubmissionsForItem(
          selectedGradingItem.id,
        );
        if (refreshRes.success) setSubmissionsList(refreshRes.data);
      } else {
        alert(res.message || t("dashboard.common.gradingFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGradingLoading(false);
    }
  };

  // ----- Access codes functions -----
  const fetchAccessCodes = async (courseId) => {
    if (!courseId) return;
    setCodesLoading(true);
    setCodesPage(1);
    try {
      const res = await api.getAllAccessCodes({ courseId });
      if (res.success) setAccessCodes(res.data);
      else setAccessCodes([]);
    } catch (err) {
      console.error("Failed to fetch access codes", err);
    } finally {
      setCodesLoading(false);
    }
  };

  const codeTypeLabel = (codeType) =>
    codeType === "course"
      ? "Course Enrollment"
      : codeType === "center_course"
        ? "Course Enrollment (Center Only)"
        : "Chapter Item";

  const handleExportAccessCodes = async () => {
    if (!accessCodes.length) return;
    setExportingCodes(true);
    try {
      const columns = [
        { header: "Code", width: 18, cell: (c) => ({ value: c.code }) },
        {
          header: "Type",
          width: 30,
          cell: (c) => ({ value: codeTypeLabel(c.code_type) }),
        },
        {
          header: "Used",
          width: 8,
          cell: (c) => ({ value: c.used_count ?? 0, type: Number }),
        },
        {
          header: "Max Uses",
          width: 10,
          cell: (c) => ({ value: c.max_uses ?? 0, type: Number }),
        },
        {
          header: t("dashboard.courses.codeExpiresAt"),
          width: 16,
          cell: (c) => ({
            value: c.expires_at
              ? new Date(c.expires_at).toLocaleDateString()
              : t("dashboard.courses.never"),
          }),
        },
        {
          header: t("dashboard.courses.accessDurationDays"),
          width: 22,
          cell: (c) => ({
            value: c.access_duration_days
              ? t("dashboard.courses.accessDurationValue", {
                  days: c.access_duration_days,
                })
              : t("dashboard.courses.unlimitedAccess"),
          }),
        },
        {
          header: "Status",
          width: 10,
          cell: (c) => ({ value: c.is_active ? "Active" : "Inactive" }),
        },
        {
          header: "Created",
          width: 16,
          cell: (c) => ({
            value: c.created_at
              ? new Date(c.created_at).toLocaleDateString()
              : "",
          }),
        },
      ];
      await writeExcelFile(accessCodes, {
        columns: columns.map((col) => ({
          header: { value: col.header, fontWeight: "bold" },
          cell: col.cell,
          width: col.width,
        })),
      }).toFile(
        `access-codes-${activeCourse.slug || activeCourse.id}.xlsx`,
      );
    } catch (err) {
      console.error("Failed to export access codes", err);
      alert(t("dashboard.courses.codesExportFailed"));
    } finally {
      setExportingCodes(false);
    }
  };

  const openAccessCodesView = () => {
    setIsAccessCodesViewActive(true);
    setShowCreateCodeForm(false);
    setShowBulkForm(false);
    fetchAccessCodes(activeCourse.id);
    setCodeFormError("");
  };

  const fetchVideoProgress = async (courseId, chapterItemId = "") => {
    if (!courseId) return;
    setVideoProgressLoading(true);
    setVideoProgressError("");
    try {
      const res = await api.getCourseVideoProgress(courseId, {
        chapterItemId: chapterItemId || undefined,
      });
      if (res.success) setVideoProgress(res.data);
      else setVideoProgress([]);
    } catch (err) {
      setVideoProgress([]);
      setVideoProgressError(
        err?.message || t("dashboard.courses.videoProgress.loadFailed"),
      );
    } finally {
      setVideoProgressLoading(false);
    }
  };

  const openVideoProgressView = () => {
    setIsVideoProgressViewActive(true);
    setVideoProgressItemFilter("");
    fetchVideoProgress(activeCourse.id);
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setCodeFormError("");
    if (newCode.codeType === "chapter_item" && !newCode.chapterItemId) {
      setCodeFormError(t("dashboard.courses.selectChapterItem"));
      return;
    }
    try {
      const payload = {
        codeType: newCode.codeType,
        courseId: activeCourse.id,
        maxUses: newCode.maxUses,
        expiresAt: newCode.expiresAt || null,
        accessDurationDays: newCode.accessDurationDays
          ? parseInt(newCode.accessDurationDays, 10)
          : null,
        customCode: newCode.customCode || undefined,
      };
      if (newCode.codeType === "chapter_item" && newCode.chapterItemId) {
        payload.chapterItemId = newCode.chapterItemId;
      }
      const res = await api.createAccessCode(payload);
      if (res.success) {
        triggerSuccess(t("dashboard.courses.codeCreated"));
        setShowCreateCodeForm(false);
        fetchAccessCodes(activeCourse.id);
        setNewCode({
          codeType: "course",
          chapterItemId: "",
          maxUses: 1,
          expiresAt: "",
          accessDurationDays: "",
          customCode: "",
        });
      } else {
        setCodeFormError(res.message || t("dashboard.common.creationFailed"));
      }
    } catch (err) {
      setCodeFormError(err.message);
    }
  };

  const handleBulkCreate = async () => {
    setCodeFormError("");
    try {
      const res = await api.createBulkAccessCodes({
        codeType: bulkCodeType,
        courseId: activeCourse.id,
        quantity: bulkQuantity,
        maxUses: 1,
        expiresAt: bulkExpiresAt || null,
        accessDurationDays: bulkAccessDurationDays
          ? parseInt(bulkAccessDurationDays, 10)
          : null,
      });
      if (res.success) {
        triggerSuccess(
          t("dashboard.courses.codesBulkCreated", {
            count: res.data.codes.length,
          }),
        );
        setShowBulkForm(false);
        fetchAccessCodes(activeCourse.id);
      } else {
        setCodeFormError(res.message);
      }
    } catch (err) {
      setCodeFormError(err.message);
    }
  };

  const handleDeleteCode = async (codeId, codeValue) => {
    if (!window.confirm(`Delete code "${codeValue}"? This cannot be undone.`))
      return;
    try {
      const res = await api.deleteAccessCode(codeId);
      if (res.success) {
        triggerSuccess(t("dashboard.courses.codeDeleted"));
        fetchAccessCodes(activeCourse.id);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (code) => {
    try {
      await api.updateAccessCode(code.id, { isActive: !code.is_active });
      fetchAccessCodes(activeCourse.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRedeemCode = async () => {
    if (!redeemCodeInput.trim()) return;
    setRedeemLoading(true);
    try {
      const res = await api.redeemAccessCode(redeemCodeInput, activeCourse?.id);
      if (res.success) {
        triggerSuccess(res.message || t("dashboard.courses.codeRedeemed"));
        setShowRedeemModal(false);
        setRedeemCodeInput("");
        if (slug) fetchCourseDetails(slug);
      } else {
        alert(res.message || t("dashboard.courses.invalidCode"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRedeemLoading(false);
    }
  };

  // ----- Chapter functions -----
  const openCreateChapterView = () => {
    setChapterFormMode("create");
    setEditingChapterId(null);
    setChapterFormData({
      title: "",
      description: "",
      sortOrder: "",
      isActive: true,
    });
    setChapterFormError("");
    setIsChapterViewActive(true);
  };

  const openEditChapterView = async (chapter) => {
    setChapterFormMode("edit");
    setEditingChapterId(chapter.id);
    setChapterFormData({
      title: chapter.title,
      description: chapter.description || "",
      sortOrder: chapter.sort_order !== undefined ? chapter.sort_order : "",
      isActive: chapter.is_active === 1,
    });
    setChapterFormError("");
    setIsChapterViewActive(true);
  };

  const handleChapterFormSubmit = async (e) => {
    e.preventDefault();
    setChapterFormSubmitLoading(true);
    setChapterFormError("");

    try {
      const payload = {
        courseId: activeCourse.id,
        title: chapterFormData.title,
        description: chapterFormData.description || null,
        sortOrder: chapterFormData.sortOrder
          ? parseInt(chapterFormData.sortOrder)
          : undefined,
      };

      let res;
      if (chapterFormMode === "create") {
        res = await api.createChapter(payload);
        if (res.success) {
          triggerSuccess(t("dashboard.courses.chapterCreated"));
        } else {
          throw new Error(res.message || t("dashboard.common.creationFailed"));
        }
      } else {
        res = await api.updateChapter(editingChapterId, {
          title: chapterFormData.title,
          description: chapterFormData.description,
          sortOrder: chapterFormData.sortOrder
            ? parseInt(chapterFormData.sortOrder)
            : undefined,
          isActive: chapterFormData.isActive,
        });
        if (res.success) {
          triggerSuccess(t("dashboard.courses.chapterUpdated"));
        } else {
          throw new Error(res.message || t("dashboard.common.updateFailed"));
        }
      }

      setIsChapterViewActive(false);
      fetchCourseDetails(slug);
    } catch (err) {
      setChapterFormError(err.message);
    } finally {
      setChapterFormSubmitLoading(false);
    }
  };

  const handleDeleteChapter = async (chapterId, chapterTitle) => {
    if (
      !window.confirm(
        `Delete chapter "${chapterTitle}"? All items inside will be deleted.`,
      )
    )
      return;
    try {
      const res = await api.deleteChapter(chapterId);
      if (res.success) {
        triggerSuccess(t("dashboard.courses.chapterDeleted"));
        fetchCourseDetails(slug);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ----- Chapter Item full‑page functions (with quiz builder) -----
  const openCreateChapterItemView = (chapterId) => {
    if (!chapterId) {
      console.error("openCreateChapterItemView called without chapterId");
      return;
    }
    setSelectedParentChapterId(chapterId);
    setChapterItemFormMode("create");
    setEditingChapterItemId(null);
    setChapterItemFormData({
      title: "",
      content: "",
      itemType: "assignment",
      sortOrder: "",
      isPreviewFree: false,
      vimeoVideoId: "",
      durationSeconds: "",
      meetingId: "",
      meetingPassword: "",
      startTime: "",
      durationMinutes: "",
      joinUrl: "",
      meetingStatus: "scheduled",
      maxScore: 100,
      dueDate: "",
      availableFrom: "",
      timeLimitMinutes: "",
      attemptWindowMinutes: "",
      dependsOnItemId: "",
      visibleIfScoreBelow: "60",
      prereqQuizItemId: "",
      prereqAssignmentItemId: "",
    });
    setQuizQuestions([]);
    setShowQuestionForm(false);
    setChapterItemFormError("");
    setChapterItemAttachmentFile(null);
    setChapterItemExistingAttachmentUrl(null);
    setChapterItemRemoveAttachment(false);
    setIsChapterItemViewActive(true);
  };

  const openEditChapterItemView = async (chapterItem, chapterId) => {
    setSelectedParentChapterId(chapterId);
    setChapterItemFormMode("edit");
    setEditingChapterItemId(chapterItem.id);

    let assessmentDetails = {};
    let zoomDetails = {};
    let fullItemDetails = {};
    if (
      chapterItem.item_type === "assignment" ||
      chapterItem.item_type === "quiz" ||
      chapterItem.item_type === "zoom_meeting" ||
      chapterItem.item_type === "vimeo_video"
    ) {
      try {
        const itemRes = await api.getChapterItemById(chapterItem.id);
        if (itemRes.success) {
          fullItemDetails = itemRes.data;
          if (chapterItem.item_type === "zoom_meeting") {
            zoomDetails = itemRes.data;
          } else {
            assessmentDetails = itemRes.data;
          }
        }
      } catch (err) {
        console.error("Failed to load chapter item details", err);
      }
    }

    setChapterItemExistingAttachmentUrl(
      fullItemDetails.attachment_url || chapterItem.attachment_url || null,
    );
    setChapterItemAttachmentFile(null);
    setChapterItemRemoveAttachment(false);

    setChapterItemFormData({
      title: chapterItem.title,
      content: chapterItem.content || "",
      itemType: chapterItem.item_type,
      sortOrder:
        chapterItem.sort_order !== undefined ? chapterItem.sort_order : "",
      isPreviewFree: !!chapterItem.is_preview_free,
      vimeoVideoId:
        fullItemDetails.vimeo_video_id ||
        fullItemDetails.vimeoVideoId ||
        chapterItem.vimeoVideoId ||
        "",
      durationSeconds:
        fullItemDetails.duration_seconds ||
        chapterItem.duration_seconds ||
        "",
      meetingId: zoomDetails.meeting_id || chapterItem.meetingId || "",
      meetingPassword:
        zoomDetails.meeting_password || chapterItem.meetingPassword || "",
      startTime: toDatetimeLocalValue(
        zoomDetails.start_time || chapterItem.startTime || chapterItem.start_time || "",
      ),
      durationMinutes:
        zoomDetails.duration_minutes || chapterItem.duration_minutes || "",
      joinUrl: zoomDetails.join_url || chapterItem.joinUrl || "",
      meetingStatus:
        zoomDetails.meeting_status || chapterItem.meeting_status || "scheduled",
      maxScore: assessmentDetails.max_score || chapterItem.max_score || 100,
      dueDate: toDatetimeLocalValue(
        assessmentDetails.due_date || chapterItem.due_date || "",
      ),
      availableFrom: toDatetimeLocalValue(
        assessmentDetails.available_from || chapterItem.available_from || "",
      ),
      timeLimitMinutes:
        assessmentDetails.time_limit_minutes ||
        chapterItem.time_limit_minutes ||
        "",
      attemptWindowMinutes:
        assessmentDetails.attempt_window_minutes ||
        chapterItem.attempt_window_minutes ||
        "",
      dependsOnItemId: assessmentDetails.depends_on_item_id || "",
      visibleIfScoreBelow:
        assessmentDetails.visible_if_score_below !== null &&
        assessmentDetails.visible_if_score_below !== undefined
          ? String(assessmentDetails.visible_if_score_below)
          : "60",
      prereqQuizItemId: fullItemDetails.prereq_quiz_item_id
        ? String(fullItemDetails.prereq_quiz_item_id)
        : "",
      prereqAssignmentItemId: fullItemDetails.prereq_assignment_item_id
        ? String(fullItemDetails.prereq_assignment_item_id)
        : "",
    });
    // Load existing questions if quiz
    if (chapterItem.item_type === "quiz") {
      try {
        const res = await api.getQuizQuestions(chapterItem.id);
        if (res.success) {
          setQuizQuestions(res.data);
        } else {
          setQuizQuestions([]);
        }
      } catch (err) {
        console.error("Failed to load quiz questions", err);
        setQuizQuestions([]);
      }
    } else {
      setQuizQuestions([]);
    }
    setShowQuestionForm(false);
    setChapterItemFormError("");
    setIsChapterItemViewActive(true);
  };

  // ─── Quiz Question Builder Handlers ───
  const addOptionToQuestion = () => {
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { option_text: "", is_correct: false }],
    }));
  };

  const removeOptionFromQuestion = (index) => {
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOptionInQuestion = (index, field, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const resetQuestionForm = () => {
    if (questionForm.question_image_preview) {
      URL.revokeObjectURL(questionForm.question_image_preview);
    }
    setQuestionForm({
      question_text: "",
      question_content_mode: "text",
      question_file: null,
      question_image_path: null,
      question_image_preview: null,
      question_type: "mcq",
      max_score: 10,
      is_required: true,
      options: [{ option_text: "", is_correct: false }],
    });
    setEditingQuestionIndex(null);
    setShowQuestionForm(false);
  };

  const handleQuestionContentModeChange = (mode) => {
    setQuestionForm((prev) => {
      if (prev.question_image_preview) {
        URL.revokeObjectURL(prev.question_image_preview);
      }
      return {
        ...prev,
        question_content_mode: mode,
        question_file: null,
        question_image_preview: null,
      };
    });
  };

  const handleQuestionImageChange = (file) => {
    setQuestionForm((prev) => {
      if (prev.question_image_preview) {
        URL.revokeObjectURL(prev.question_image_preview);
      }
      if (!file) {
        return {
          ...prev,
          question_file: null,
          question_image_preview: null,
        };
      }
      return {
        ...prev,
        question_file: file,
        question_image_preview: isQuestionImagePath(file.name)
          ? URL.createObjectURL(file)
          : null,
        question_image_path: null,
      };
    });
  };

  const saveQuestion = () => {
    const hasText =
      questionForm.question_content_mode === "text" &&
      questionForm.question_text.trim();
    const hasUpload =
      questionForm.question_content_mode === "upload" &&
      (questionForm.question_file || questionForm.question_image_path);

    if (!hasText && !hasUpload) {
      alert(
        questionForm.question_content_mode === "upload"
          ? "Please upload a question image or file."
          : "Please enter question text.",
      );
      return;
    }
    if (
      questionForm.question_type === "mcq" &&
      questionForm.options.length < 2
    ) {
      alert("MCQ questions need at least two options.");
      return;
    }
    const previewUrl =
      questionForm.question_file &&
      isQuestionImagePath(questionForm.question_file.name)
        ? URL.createObjectURL(questionForm.question_file)
        : null;

    const newQuestion = {
      question_text: questionForm.question_text.trim(),
      question_content_mode: questionForm.question_content_mode,
      question_file: questionForm.question_file,
      question_image_path: questionForm.question_image_path,
      question_image_preview: previewUrl,
      question_type: questionForm.question_type,
      max_score: parseFloat(questionForm.max_score) || 10,
      is_required: questionForm.is_required,
      clear_question_image:
        questionForm.question_content_mode === "text" &&
        !!questionForm.question_image_path,
      options: questionForm.options.map((opt) => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct,
      })),
    };
    if (editingQuestionIndex !== null) {
      const previousPreview =
        quizQuestions[editingQuestionIndex]?.question_image_preview;
      if (previousPreview && previousPreview !== previewUrl) {
        URL.revokeObjectURL(previousPreview);
      }
      // Update existing
      const updated = [...quizQuestions];
      updated[editingQuestionIndex] = {
        ...updated[editingQuestionIndex],
        ...newQuestion,
      };
      setQuizQuestions(updated);
    } else {
      setQuizQuestions([...quizQuestions, newQuestion]);
    }
    resetQuestionForm();
  };

  const editQuestion = (index) => {
    const q = quizQuestions[index];
    setQuestionForm({
      question_text: q.question_text || "",
      question_content_mode: q.question_image_path ? "upload" : "text",
      question_file: null,
      question_image_path: q.question_image_path || null,
      question_image_preview: null,
      question_type: q.question_type,
      max_score: q.max_score,
      is_required: q.is_required,
      options: q.options || [{ option_text: "", is_correct: false }],
    });
    setEditingQuestionIndex(index);
    setShowQuestionForm(true);
  };

  const deleteQuestion = (index) => {
    if (!window.confirm("Delete this question?")) return;
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  // ─── Chapter Item Submit (with quiz questions) ───
  const handleChapterItemFormSubmit = async (e) => {
    e.preventDefault();
    setChapterItemSubmitLoading(true);
    setChapterItemFormError("");

    if (!selectedParentChapterId) {
      setChapterItemFormError(
        "Parent chapter not found. Please close and reopen the form.",
      );
      setChapterItemSubmitLoading(false);
      return;
    }

    const isQuiz = chapterItemFormData.itemType === "quiz";

    try {
      const payload = {
        chapterId: selectedParentChapterId,
        title: chapterItemFormData.title,
        content: chapterItemFormData.content || null,
        itemType: chapterItemFormData.itemType,
        sortOrder: chapterItemFormData.sortOrder
          ? parseInt(chapterItemFormData.sortOrder)
          : undefined,
        isPreviewFree: chapterItemFormData.isPreviewFree,
      };

      // Prerequisites — recorded / live items only.
      if (
        chapterItemFormData.itemType === "vimeo_video" ||
        chapterItemFormData.itemType === "zoom_meeting"
      ) {
        payload.prereqQuizItemId = chapterItemFormData.prereqQuizItemId
          ? parseInt(chapterItemFormData.prereqQuizItemId)
          : null;
        payload.prereqAssignmentItemId = chapterItemFormData.prereqAssignmentItemId
          ? parseInt(chapterItemFormData.prereqAssignmentItemId)
          : null;
      }

      // Add type-specific fields
      if (chapterItemFormData.itemType === "vimeo_video") {
        if (!chapterItemFormData.vimeoVideoId)
          throw new Error("Vimeo video ID is required");
        payload.vimeoVideoId = chapterItemFormData.vimeoVideoId;
        payload.durationSeconds = chapterItemFormData.durationSeconds
          ? parseInt(chapterItemFormData.durationSeconds)
          : null;
      } else if (chapterItemFormData.itemType === "zoom_meeting") {
        // ─── UPDATED ZOOM LOGIC ────────────────────────────────
        if (chapterItemFormMode === "create") {
          // CREATE: only startTime and durationMinutes are required – meetingId and joinUrl are auto‑created by backend
          if (
            !chapterItemFormData.startTime ||
            !chapterItemFormData.durationMinutes
          ) {
            throw new Error(
              "Start time and duration are required for Zoom meeting.",
            );
          }
          payload.startTime = chapterItemFormData.startTime;
          payload.durationMinutes = parseInt(
            chapterItemFormData.durationMinutes,
          );
          payload.meetingStatus =
            chapterItemFormData.meetingStatus || "scheduled";
          if (chapterItemFormData.meetingPassword) {
            payload.meetingPassword = chapterItemFormData.meetingPassword;
          }
          // DO NOT send meetingId or joinUrl – backend will call Zoom API to create them
        } else {
          // EDIT: all fields are required (they were set when the meeting was created)
          if (
            !chapterItemFormData.meetingId ||
            !chapterItemFormData.startTime ||
            !chapterItemFormData.durationMinutes ||
            !chapterItemFormData.joinUrl
          ) {
            throw new Error(
              "Meeting ID, start time, duration, and join URL are required",
            );
          }
          payload.meetingId = chapterItemFormData.meetingId;
          payload.meetingPassword = chapterItemFormData.meetingPassword || null;
          payload.startTime = chapterItemFormData.startTime;
          payload.durationMinutes = parseInt(
            chapterItemFormData.durationMinutes,
          );
          payload.joinUrl = chapterItemFormData.joinUrl;
          payload.meetingStatus =
            chapterItemFormData.meetingStatus || "scheduled";
        }
        // ─── END OF UPDATED ZOOM LOGIC ──────────────────────
      } else if (
        chapterItemFormData.itemType === "assignment" ||
        chapterItemFormData.itemType === "quiz"
      ) {
        payload.maxScore = chapterItemFormData.maxScore
          ? parseFloat(chapterItemFormData.maxScore)
          : 100;
        payload.dueDate = chapterItemFormData.dueDate || null;
        if (chapterItemFormData.itemType === "quiz") {
          payload.availableFrom = chapterItemFormData.availableFrom || null;
        }
        payload.timeLimitMinutes = chapterItemFormData.timeLimitMinutes
          ? parseInt(chapterItemFormData.timeLimitMinutes)
          : null;

        if (chapterItemFormData.itemType === "quiz") {
          payload.attemptWindowMinutes = chapterItemFormData.attemptWindowMinutes
            ? parseInt(chapterItemFormData.attemptWindowMinutes)
            : null;
        }

        if (chapterItemFormData.itemType === "quiz") {
          if (chapterItemFormData.dependsOnItemId) {
            payload.dependsOnItemId = parseInt(
              chapterItemFormData.dependsOnItemId,
            );
            payload.visibleIfScoreBelow = chapterItemFormData.visibleIfScoreBelow
              ? parseFloat(chapterItemFormData.visibleIfScoreBelow)
              : 60;
          } else if (chapterItemFormMode === "edit") {
            payload.clearDependsOnItem = true;
          }
        }
      }

      let itemId;
      if (chapterItemFormMode === "create") {
        const res = await api.createChapterItem(payload);
        if (!res.success) throw new Error(res.message || "Creation failed");
        itemId = res.data.id;
        triggerSuccess(`${chapterItemFormData.itemType} created successfully`);
      } else {
        const res = await api.updateChapterItem(editingChapterItemId, payload);
        if (!res.success) throw new Error(res.message || "Update failed");
        itemId = editingChapterItemId;
        triggerSuccess(`${chapterItemFormData.itemType} updated successfully`);
      }

      // If quiz, save questions
      if (isQuiz) {
        for (const q of quizQuestions) {
          const questionPayload = buildQuizQuestionRequestBody(q);
          if (q.id) {
            await api.updateQuizQuestion(q.id, questionPayload);
          } else {
            const questionRes = await api.createQuizQuestion(
              itemId,
              questionPayload,
            );
            if (questionRes.success) {
              const newQuestionId = questionRes.data.id;
              if (q.question_type === "mcq" && q.options) {
                for (const opt of q.options) {
                  await api.createQuizOption(newQuestionId, {
                    optionText: opt.option_text,
                    isCorrect: opt.is_correct,
                  });
                }
              }
            }
          }
        }
      }

      if (chapterItemAttachmentFile) {
        await api.updateChapterItemAttachment(itemId, chapterItemAttachmentFile);
      } else if (chapterItemRemoveAttachment) {
        await api.deleteChapterItemAttachment(itemId);
      }

      setIsChapterItemViewActive(false);
      fetchCourseDetails(slug);
    } catch (err) {
      setChapterItemFormError(err.message);
    } finally {
      setChapterItemSubmitLoading(false);
    }
  };
  const handleDeleteChapterItem = async (itemId, itemTitle) => {
    if (!window.confirm(`Delete item "${itemTitle}"? This cannot be undone.`))
      return;
    try {
      const res = await api.deleteChapterItem(itemId);
      if (res.success) {
        triggerSuccess(t("dashboard.courses.itemDeleted"));
        fetchCourseDetails(slug);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ----- Student enrollment search (UPDATED: digits only + no debounce) -----
  const searchStudents = useCallback(async (query) => {
    // Remove everything except digits
    const digitsOnly = query.replace(/\D/g, "");
    if (!digitsOnly.trim() || digitsOnly.length < 2) {
      setStudentSearchResults([]);
      return;
    }
    try {
      const res = await api.getAllUsers({
        role: "student",
        search: digitsOnly,
        limit: 10,
      });
      if (res.success) setStudentSearchResults(res.data);
      else setStudentSearchResults([]);
    } catch (err) {
      console.error("Student search error", err);
      setStudentSearchResults([]);
    }
  }, []);

  const handleStudentSearchChange = (e) => {
    const value = e.target.value;
    setStudentSearchQuery(value);
    // No debounce – we'll search on button click or form submit
  };

  const handleEnrollStudent = async (student) => {
    if (!activeCourse) return;
    if (!student.student_record_id) {
      alert(t("dashboard.courses.noStudentProfile"));
      return;
    }
    setEnrollingStudentId(student.id);
    try {
      const res = await api.enrollStudent(
        activeCourse.id,
        student.student_record_id,
        "admin",
      );
      if (res.success) {
        triggerSuccess(`${student.first_name} ${student.last_name} enrolled`);
        await refreshCourseStudents();
        setStudentSearchQuery("");
        setStudentSearchResults([]);
        setShowStudentDropdown(false);
      } else {
        alert(res.message || t("dashboard.courses.enrollmentFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setEnrollingStudentId(null);
    }
  };

  const refreshCourseStudents = async () => {
    if (!activeCourse) return;
    const studentsRes = await api.getCourseStudents(activeCourse.id);
    if (studentsRes.success) setCourseStudents(studentsRes.data);
    const courseRes = await api.getCourseBySlug(activeCourse.slug);
    if (courseRes.success) {
      setActiveCourse((prev) =>
        prev ? { ...prev, enrolledCount: courseRes.data.enrolledCount } : prev,
      );
    }
  };

  const handleRemoveEnrollment = async (student) => {
    if (!activeCourse) return;
    const name = `${student.first_name} ${student.last_name}`;
    if (
      !window.confirm(
        t("dashboard.courses.removeStudentConfirm").replace("{{name}}", name),
      )
    ) {
      return;
    }
    setEnrollmentActionId(student.student_id);
    try {
      const res = await api.removeEnrollment(
        activeCourse.id,
        student.student_id,
      );
      if (res.success) {
        triggerSuccess(t("dashboard.courses.studentRemoved"));
        await refreshCourseStudents();
      } else {
        alert(res.message || t("dashboard.courses.enrollmentFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setEnrollmentActionId(null);
    }
  };

  const handleRestoreEnrollment = async (student) => {
    if (!activeCourse) return;
    const name = `${student.first_name} ${student.last_name}`;
    if (
      !window.confirm(
        t("dashboard.courses.restoreStudentConfirm").replace("{{name}}", name),
      )
    ) {
      return;
    }
    setEnrollmentActionId(student.student_id);
    try {
      const res = await api.restoreEnrollment(
        activeCourse.id,
        student.student_id,
      );
      if (res.success) {
        triggerSuccess(t("dashboard.courses.studentRestored"));
        await refreshCourseStudents();
      } else {
        alert(res.message || t("dashboard.courses.enrollmentFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setEnrollmentActionId(null);
    }
  };

  const fetchItemUnlockedStudents = async (itemId) => {
    setItemAccessLoading(true);
    try {
      const res = await api.getChapterItemUnlocks(itemId);
      if (res.success) setItemUnlockedStudents(res.data);
      else setItemUnlockedStudents([]);
    } catch {
      setItemUnlockedStudents([]);
    } finally {
      setItemAccessLoading(false);
    }
  };

  const openItemAccessModal = async (item) => {
    setItemAccessTarget(item);
    setItemAccessSearchQuery("");
    setItemAccessSearchResults([]);
    setShowItemAccessDropdown(false);
    await fetchItemUnlockedStudents(item.id);
  };

  const closeItemAccessModal = () => {
    setItemAccessTarget(null);
    setItemUnlockedStudents([]);
    setItemAccessSearchQuery("");
    setItemAccessSearchResults([]);
    setShowItemAccessDropdown(false);
  };

  const searchStudentsForItemAccess = async (query) => {
    if (!query.trim()) {
      setItemAccessSearchResults([]);
      setShowItemAccessDropdown(false);
      return;
    }
    try {
      const res = await api.getAllUsers({
        role: "student",
        search: query.trim(),
        limit: 10,
      });
      if (res.success) setItemAccessSearchResults(res.data);
      else setItemAccessSearchResults([]);
      setShowItemAccessDropdown(true);
    } catch {
      setItemAccessSearchResults([]);
    }
  };

  const handleGrantItemAccess = async (student) => {
    if (!itemAccessTarget) return;
    if (!student.student_record_id) {
      alert(t("dashboard.courses.noStudentProfile"));
      return;
    }
    setItemAccessActionId(student.id);
    try {
      const res = await api.unlockChapterItemForStudent(
        itemAccessTarget.id,
        student.student_record_id,
      );
      if (res.success) {
        triggerSuccess(t("dashboard.courses.accessGranted"));
        await fetchItemUnlockedStudents(itemAccessTarget.id);
        setItemAccessSearchQuery("");
        setItemAccessSearchResults([]);
        setShowItemAccessDropdown(false);
      } else {
        alert(res.message || t("dashboard.courses.enrollmentFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setItemAccessActionId(null);
    }
  };

  const handleRevokeItemAccess = async (student) => {
    if (!itemAccessTarget) return;
    const name = `${student.first_name} ${student.last_name}`;
    if (
      !window.confirm(
        t("dashboard.courses.revokeAccessConfirm").replace("{{name}}", name),
      )
    ) {
      return;
    }
    setItemAccessActionId(student.student_id);
    try {
      const res = await api.lockChapterItemForStudent(
        itemAccessTarget.id,
        student.student_id,
      );
      if (res.success) {
        triggerSuccess(t("dashboard.courses.accessRevoked"));
        await fetchItemUnlockedStudents(itemAccessTarget.id);
      } else {
        alert(res.message || t("dashboard.courses.enrollmentFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setItemAccessActionId(null);
    }
  };

  // ----- Course fetching -----
  const fetchCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {
        status: activeFilter === "all" ? undefined : activeFilter,
        search: searchQuery || undefined,
        limit: 50,
      };

      if (
        currentUserRole === "instructor" &&
        currentUser?.instructor_record_id
      ) {
        filters.instructorId = currentUser.instructor_record_id;
      }

      const response = await api.getAllCourses(filters);
      if (response.success) {
        let courseList = response.data;
        if (
          currentUserRole === "instructor" &&
          currentUser?.instructor_record_id
        ) {
          courseList = courseList.filter(
            (course) =>
              course.instructor_id === currentUser.instructor_record_id,
          );
        }
        setCourses(courseList);
        setPagination(response.pagination);
      }
    } catch (err) {
      setError(err?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (courseSlug) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getCourseBySlug(courseSlug);
      if (response.success) {
        setActiveCourse(response.data);
        try {
          const studentsRes = await api.getCourseStudents(response.data.id);
          if (studentsRes.success) setCourseStudents(studentsRes.data);
        } catch {
          setCourseStudents([]);
        }
      }
    } catch (err) {
      setError(err?.message || "Course not found.");
      setActiveCourse(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const [subjectsRes, levelsRes, curriculumsRes] = await Promise.all([
        api.getAllSubjects(),
        api.getAllLevels(),
        api.getAllCurriculums(),
      ]);
      if (subjectsRes.success) setSubjectsList(subjectsRes.data);
      if (levelsRes.success) setAcademicLevelsList(levelsRes.data);
      if (curriculumsRes.success) setCurriculumsList(curriculumsRes.data);
    } catch (err) {
      console.error("Failed to load subjects/levels/curriculums", err);
    }
  };

  const fetchInstructorsAndUserRole = async () => {
    try {
      setLoadingInstructors(true);
      const userRes = await api.getMe();
      if (!userRes.success) return;

      const userData = userRes.data;
      setCurrentUserRole(userData.role);

      if (userData.role === "student") {
        setCurrentUser({
          ...userData,
          student_id: userData.roleData?.id,
        });
      } else if (userData.role === "instructor") {
        setCurrentUser({
          ...userData,
          instructor_record_id: userData.roleData?.id,
        });
      } else if (userData.role === "assistant") {
        setCurrentUser({
          ...userData,
          assistant_data: userData.roleData,
        });
      } else {
        setCurrentUser(userData);
      }

      if (userData.role === "admin") {
        const instructorsRes = await api.getAllInstructors({ limit: 200 });
        if (instructorsRes.success) setInstructorsList(instructorsRes.data);
      }
    } catch (err) {
      console.error("Error loading user role:", err);
    } finally {
      setLoadingInstructors(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchCourseDetails(slug);
    } else {
      setActiveCourse(null);
      setCourseStudents([]);
    }
    fetchFormOptions();
    fetchInstructorsAndUserRole();
  }, [slug]);

  useEffect(() => {
    if (slug || currentUserRole === null) return;
    const timeout = setTimeout(() => fetchCourses(), 400);
    return () => clearTimeout(timeout);
  }, [
    searchQuery,
    activeFilter,
    slug,
    currentUserRole,
    currentUser?.instructor_record_id,
  ]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // ----- Course form handlers -----
  const openCreateCourseForm = () => {
    setCourseFormMode("create");
    setEditingCourseId(null);
    setCourseFormData({
      title: "",
      description: "",
      term: "Fall",
      priceType: "Free",
      price: "",
      status: "draft",
      instructorId: "",
      subjectIds: [],
      academicLevelIds: [],
      curriculumIds: [],
    });
    setCoverFile(null);
    setCoverPreview(null);
    setCourseFormError("");
    setIsCourseFormActive(true);
  };

  const openEditCourseForm = async (e, course) => {
    e.stopPropagation();
    setCourseFormMode("edit");
    setEditingCourseId(course.id);
    setCourseFormData({
      title: course.title,
      description: course.description || "",
      term: course.term,
      priceType: Number(course.price) > 0 ? "Paid" : "Free",
      price: Number(course.price) > 0 ? course.price : "",
      status: course.status,
      instructorId: course.instructor_id || "",
      subjectIds: (course.subjects || []).map((s) => s.id),
      academicLevelIds: (course.academicLevels || []).map((l) => l.id),
      curriculumIds: (course.curriculums || []).map((c) => c.id),
    });
    setCoverFile(null);
    setCoverPreview(
      course.cover_image_url ? getFileUrl(course.cover_image_url) : null,
    );
    setCourseFormError("");
    setIsCourseFormActive(true);
  };

  const handleCoursePriceTypeChange = (e) => {
    const type = e.target.value;
    setCourseFormData({
      ...courseFormData,
      priceType: type,
      price: type === "Free" ? "" : courseFormData.price,
    });
  };

  const handleCourseSubjectToggle = (subjectId) => {
    setCourseFormData((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter((id) => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
  };

  const handleCourseLevelToggle = (levelId) => {
    setCourseFormData((prev) => ({
      ...prev,
      academicLevelIds: prev.academicLevelIds.includes(levelId)
        ? prev.academicLevelIds.filter((id) => id !== levelId)
        : [...prev.academicLevelIds, levelId],
    }));
  };

  const handleCourseCurriculumToggle = (curriculumId) => {
    setCourseFormData((prev) => ({
      ...prev,
      curriculumIds: prev.curriculumIds.includes(curriculumId)
        ? prev.curriculumIds.filter((id) => id !== curriculumId)
        : [...prev.curriculumIds, curriculumId],
    }));
  };

  const handleCourseCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCourseFormSubmit = async (e) => {
    e.preventDefault();
    setCourseFormSubmitLoading(true);
    setCourseFormError("");

    try {
      const payload = {
        title: courseFormData.title,
        description: courseFormData.description || null,
        term: courseFormData.term,
        status: courseFormData.status,
        price:
          courseFormData.priceType === "Free"
            ? 0
            : parseFloat(courseFormData.price) || 0,
        subjectIds: courseFormData.subjectIds,
        academicLevelIds: courseFormData.academicLevelIds,
        curriculumIds: courseFormData.curriculumIds,
      };
      if (currentUserRole === "admin") {
        if (!courseFormData.instructorId) {
          setCourseFormError(t("dashboard.courses.selectInstructor"));
          setCourseFormSubmitLoading(false);
          return;
        }
        payload.instructorId = courseFormData.instructorId;
      }

      let courseId;
      if (courseFormMode === "create") {
        const response = await api.createCourse(payload);
        if (!response.success)
          throw new Error(response.message || t("dashboard.common.creationFailed"));
        courseId = response.data.id;
        triggerSuccess(t("dashboard.courses.courseCreated"));
      } else {
        const response = await api.updateCourse(editingCourseId, payload);
        if (!response.success)
          throw new Error(response.message || t("dashboard.common.updateFailed"));
        courseId = editingCourseId;
        triggerSuccess(t("dashboard.courses.courseUpdated"));
      }

      if (coverFile) {
        await api.updateCourseCoverImage(courseId, coverFile);
        triggerSuccess(
          courseFormMode === "create"
            ? "Course created with cover image."
            : "Course updated with new cover image.",
        );
      }

      setIsCourseFormActive(false);
      if (courseFormMode === "edit" && slug) {
        fetchCourseDetails(slug);
      } else {
        fetchCourses();
      }
    } catch (err) {
      setCourseFormError(
        err?.message || t("dashboard.common.operationFailed"),
      );
    } finally {
      setCourseFormSubmitLoading(false);
    }
  };

  const handleDeleteCourse = async (e, courseId, courseTitle) => {
    e.stopPropagation();
    if (
      !window.confirm(`Delete course "${courseTitle}"? This cannot be undone.`)
    )
      return;
    try {
      const response = await api.deleteCourse(courseId);
      if (response.success) {
        triggerSuccess(t("dashboard.courses.courseDeleted"));
        if (slug) navigate("/dashboard/courses");
        else fetchCourses();
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || "Could not delete course.");
    }
  };

  const metrics = [
    {
      label: t("dashboard.courses.total"),
      count: pagination?.total ?? courses.length,
      icon: HiOutlineBookOpen,
      color: "text-brand-purple bg-violet-50",
    },
    {
      label: t("dashboard.common.published"),
      count: courses.filter((c) => c.status === "published").length,
      icon: HiOutlineCheckCircle,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: t("dashboard.common.drafts"),
      count: courses.filter((c) => c.status === "draft").length,
      icon: HiOutlineClipboardList,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.courses.loading")}
        </p>
      </div>
    );
  }

  // ==================== COURSE FORM FULL-PAGE VIEW ====================
  if (isCourseFormActive) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCourseFormActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft />{" "}
            <span>{t("dashboard.common.cancelBack")}</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-8">
          <div className="space-y-2 border-b border-gray-50 pb-5">
            <h1 className="text-3xl font-black font-heading tracking-tight">
              {courseFormMode === "create"
                ? t("dashboard.courses.create")
                : t("dashboard.courses.edit")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {courseFormMode === "create"
                ? "Add a new course to the platform."
                : "Modify course details, subjects, academic levels, and curriculums."}
            </p>
          </div>

          {courseFormError && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold">
              ⚠️ {courseFormError}
            </div>
          )}

          <form onSubmit={handleCourseFormSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Course Title *
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
                placeholder="e.g., Advanced Mathematics"
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Description
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
                placeholder="Brief overview of what this course covers..."
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  Term *
                </label>
                <select
                  value={courseFormData.term}
                  onChange={(e) =>
                    setCourseFormData({
                      ...courseFormData,
                      term: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                >
                  {TERM_OPTIONS.map((term) => (
                    <option key={term} value={term}>
                      {termLabel(term)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  Status
                </label>
                <select
                  value={courseFormData.status}
                  onChange={(e) =>
                    setCourseFormData({
                      ...courseFormData,
                      status: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                >
                  <option value="draft">{t("dashboard.common.draft")}</option>
                  <option value="published">
                    {t("dashboard.common.published")}
                  </option>
                  <option value="archived">
                    {t("dashboard.common.archived")}
                  </option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Pricing
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="radio"
                    value="Free"
                    checked={courseFormData.priceType === "Free"}
                    onChange={handleCoursePriceTypeChange}
                    className="accent-brand-purple"
                  />
                  <span>{t("dashboard.common.free")}</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="radio"
                    value="Paid"
                    checked={courseFormData.priceType === "Paid"}
                    onChange={handleCoursePriceTypeChange}
                    className="accent-brand-purple"
                  />
                  <span>{t("dashboard.common.paid")}</span>
                </label>
              </div>
              {courseFormData.priceType === "Paid" && (
                <div className="relative">
                  <span className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    EGP
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={courseFormData.price}
                    onChange={(e) =>
                      setCourseFormData({
                        ...courseFormData,
                        price: e.target.value,
                      })
                    }
                    placeholder="199.99"
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl ps-12 pe-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>
              )}
            </div>

            {currentUserRole === "admin" && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  Assign Instructor *
                </label>
                {loadingInstructors ? (
                  <div className="flex items-center space-x-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading instructors...</span>
                  </div>
                ) : instructorsList.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
                    No instructors available. Please create an instructor
                    account first.
                  </div>
                ) : (
                  <>
                    <select
                      value={courseFormData.instructorId}
                      onChange={(e) =>
                        setCourseFormData({
                          ...courseFormData,
                          instructorId: e.target.value,
                        })
                      }
                      required={courseFormMode === "create"}
                      className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    >
                      <option value="">-- Select Instructor --</option>
                      {instructorsList
                        .filter((inst) => inst.instructor_record_id)
                        .map((inst) => (
                          <option
                            key={inst.id}
                            value={inst.instructor_record_id}
                          >
                            {inst.first_name} {inst.last_name} ({inst.phone})
                          </option>
                        ))}
                    </select>
                    {!courseFormData.instructorId &&
                      courseFormMode === "create" && (
                        <p className="text-[10px] text-brand-purple px-1">
                          Please select an instructor
                        </p>
                      )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Subjects
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                {subjectsList.map((subj) => (
                  <button
                    type="button"
                    key={subj.id}
                    onClick={() => handleCourseSubjectToggle(subj.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      courseFormData.subjectIds.includes(subj.id)
                        ? "bg-brand text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {subj.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Academic Levels
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                {academicLevelsList.map((level) => (
                  <button
                    type="button"
                    key={level.id}
                    onClick={() => handleCourseLevelToggle(level.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      courseFormData.academicLevelIds.includes(level.id)
                        ? "bg-brand text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Curriculums
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                {curriculumsList.length > 0 ? (
                  curriculumsList.map((cur) => (
                    <button
                      type="button"
                      key={cur.id}
                      onClick={() => handleCourseCurriculumToggle(cur.id)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        courseFormData.curriculumIds.includes(cur.id)
                          ? "bg-brand text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {cur.name}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 font-light">
                    No curriculums available yet.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Cover Image
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <HiOutlinePhotograph className="inline mr-1" /> Choose file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCourseCoverChange}
                    className="hidden"
                  />
                </label>
                {coverPreview && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 px-1">
                Recommended: 1280x720 pixels, max 2MB
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsCourseFormActive(false)}
                className="w-full sm:w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold text-sm py-4 rounded-2xl transition-all"
              >
                {t("dashboard.common.cancel")}
              </button>
              <button
                type="submit"
                disabled={courseFormSubmitLoading}
                className="w-full sm:w-2/3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99]"
              >
                {courseFormSubmitLoading
                  ? t("dashboard.common.processing")
                  : courseFormMode === "create"
                    ? t("dashboard.courses.createCourse")
                    : t("dashboard.common.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== CHAPTER FULL-PAGE VIEW ====================
  if (isChapterViewActive) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsChapterViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft /> <span>Back to Course</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-8">
          <div className="space-y-2 border-b border-gray-50 pb-5">
            <h1 className="text-3xl font-black font-heading tracking-tight">
              {chapterFormMode === "create"
                ? t("dashboard.courses.createChapter")
                : t("dashboard.courses.editChapter")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {chapterFormMode === "create"
                ? "Add a new chapter to this course."
                : "Modify chapter title, description, or order."}
            </p>
          </div>

          {chapterFormError && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold">
              ⚠️ {chapterFormError}
            </div>
          )}

          <form onSubmit={handleChapterFormSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Chapter Title *
              </label>
              <input
                type="text"
                required
                value={chapterFormData.title}
                onChange={(e) =>
                  setChapterFormData({
                    ...chapterFormData,
                    title: e.target.value,
                  })
                }
                placeholder="e.g., Algebra Fundamentals"
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Description
              </label>
              <textarea
                value={chapterFormData.description}
                onChange={(e) =>
                  setChapterFormData({
                    ...chapterFormData,
                    description: e.target.value,
                  })
                }
                rows="4"
                placeholder="Brief description of the chapter content..."
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  Sort Order (optional)
                </label>
                <input
                  type="number"
                  value={chapterFormData.sortOrder}
                  onChange={(e) =>
                    setChapterFormData({
                      ...chapterFormData,
                      sortOrder: e.target.value,
                    })
                  }
                  placeholder="Leave empty for auto"
                  className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
                <p className="text-[10px] text-gray-400 px-1">
                  If empty, chapter will be placed at the end.
                </p>
              </div>

              {chapterFormMode === "edit" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Active Status
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="true"
                        checked={chapterFormData.isActive === true}
                        onChange={() =>
                          setChapterFormData({
                            ...chapterFormData,
                            isActive: true,
                          })
                        }
                        className="accent-brand-purple"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="false"
                        checked={chapterFormData.isActive === false}
                        onChange={() =>
                          setChapterFormData({
                            ...chapterFormData,
                            isActive: false,
                          })
                        }
                        className="accent-brand-purple"
                      />
                      <span className="text-sm">Inactive</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsChapterViewActive(false)}
                className="w-full sm:w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold text-sm py-4 rounded-2xl transition-all"
              >
                {t("dashboard.common.cancel")}
              </button>
              <button
                type="submit"
                disabled={chapterFormSubmitLoading}
                className="w-full sm:w-2/3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99]"
              >
                {chapterFormSubmitLoading
                  ? t("dashboard.common.processing")
                  : chapterFormMode === "create"
                    ? t("dashboard.courses.createChapter")
                    : t("dashboard.common.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== CHAPTER ITEM FULL-PAGE VIEW (with Quiz Builder) ====================
  if (isChapterItemViewActive) {
    const isQuiz = chapterItemFormData.itemType === "quiz";

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsChapterItemViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft /> <span>Back to Course</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-8">
          <div className="space-y-2 border-b border-gray-50 pb-5">
            <h1 className="text-3xl font-black font-heading tracking-tight">
              {chapterItemFormMode === "create"
                ? "Add New Chapter Item"
                : "Edit Chapter Item"}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {chapterItemFormMode === "create"
                ? "Add a new assignment, quiz, video, or meeting to this chapter."
                : "Modify the item details."}
            </p>
          </div>

          {chapterItemFormError && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold">
              ⚠️ {chapterItemFormError}
            </div>
          )}

          <form onSubmit={handleChapterItemFormSubmit} className="space-y-6">
            {/* Item Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Item Type *
              </label>
              <select
                value={chapterItemFormData.itemType}
                onChange={(e) =>
                  setChapterItemFormData({
                    ...chapterItemFormData,
                    itemType: e.target.value,
                  })
                }
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              >
                <option value="assignment">Assignment</option>
                <option value="quiz">Quiz</option>
                <option value="vimeo_video">Vimeo Video</option>
                <option value="zoom_meeting">Zoom Meeting</option>
              </select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={chapterItemFormData.title}
                onChange={(e) =>
                  setChapterItemFormData({
                    ...chapterItemFormData,
                    title: e.target.value,
                  })
                }
                placeholder="e.g., Solving Inequalities – Assignment"
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Content / Instructions
              </label>
              <textarea
                value={chapterItemFormData.content}
                onChange={(e) =>
                  setChapterItemFormData({
                    ...chapterItemFormData,
                    content: e.target.value,
                  })
                }
                rows="4"
                placeholder="Detailed description or instructions for students..."
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Attachment (optional PDF or image) — assignments & videos only */}
            {(chapterItemFormData.itemType === "assignment" ||
              chapterItemFormData.itemType === "vimeo_video") && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  Attachment (optional PDF or image)
                </label>
                {chapterItemExistingAttachmentUrl &&
                  !chapterItemRemoveAttachment &&
                  !chapterItemAttachmentFile && (
                    <div className="flex items-center justify-between bg-gray-50/70 rounded-2xl px-4 py-3 text-sm">
                      <a
                        href={getFileUrl(chapterItemExistingAttachmentUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-purple underline truncate"
                      >
                        {chapterItemExistingAttachmentUrl.split("/").pop()}
                      </a>
                      <button
                        type="button"
                        onClick={() => setChapterItemRemoveAttachment(true)}
                        className="text-xs text-red-500 hover:underline shrink-0 ms-3"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                {chapterItemAttachmentFile && (
                  <div className="flex items-center justify-between bg-gray-50/70 rounded-2xl px-4 py-3 text-sm">
                    <span className="truncate">
                      {chapterItemAttachmentFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChapterItemAttachmentFile(null)}
                      className="text-xs text-red-500 hover:underline shrink-0 ms-3"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {(!chapterItemExistingAttachmentUrl ||
                  chapterItemRemoveAttachment) &&
                  !chapterItemAttachmentFile && (
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setChapterItemAttachmentFile(file);
                          setChapterItemRemoveAttachment(false);
                        }
                      }}
                      className="w-full bg-gray-50/70 text-sm border border-transparent rounded-2xl px-4 py-3"
                    />
                  )}
              </div>
            )}

            {/* Free preview */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPreviewFree"
                checked={chapterItemFormData.isPreviewFree}
                onChange={(e) =>
                  setChapterItemFormData({
                    ...chapterItemFormData,
                    isPreviewFree: e.target.checked,
                  })
                }
                className="accent-brand-purple"
              />
              <label htmlFor="isPreviewFree" className="text-xs text-gray-600">
                Free preview (visible without enrollment)
              </label>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                Sort Order (optional)
              </label>
              <input
                type="number"
                value={chapterItemFormData.sortOrder}
                onChange={(e) =>
                  setChapterItemFormData({
                    ...chapterItemFormData,
                    sortOrder: e.target.value,
                  })
                }
                placeholder="Leave empty for auto"
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              />
            </div>

            {/* Prerequisites — recorded video / live session only */}
            {(chapterItemFormData.itemType === "vimeo_video" ||
              chapterItemFormData.itemType === "zoom_meeting") && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Prerequisites (optional)
                  </span>
                  <p className="text-[10px] text-gray-400 px-1 mt-1">
                    Students must score 60%+ on the selected quiz and submit the
                    selected assignment before this item opens.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={chapterItemFormData.prereqQuizItemId}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        prereqQuizItemId: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  >
                    <option value="">No required quiz</option>
                    {activeCourse?.chapters?.flatMap((chapter) =>
                      (chapter.items || [])
                        .filter(
                          (it) =>
                            it.item_type === "quiz" &&
                            it.id !== editingChapterItemId,
                        )
                        .map((it) => (
                          <option key={it.id} value={it.id}>
                            {chapter.title}: {it.title}
                          </option>
                        )),
                    )}
                  </select>
                  <select
                    value={chapterItemFormData.prereqAssignmentItemId}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        prereqAssignmentItemId: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  >
                    <option value="">No required assignment</option>
                    {activeCourse?.chapters?.flatMap((chapter) =>
                      (chapter.items || [])
                        .filter(
                          (it) =>
                            it.item_type === "assignment" &&
                            it.id !== editingChapterItemId,
                        )
                        .map((it) => (
                          <option key={it.id} value={it.id}>
                            {chapter.title}: {it.title}
                          </option>
                        )),
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* Type-specific fields */}
            {chapterItemFormData.itemType === "vimeo_video" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Vimeo Video ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={chapterItemFormData.vimeoVideoId}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        vimeoVideoId: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Duration (optional)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {DURATION_PARTS.map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={
                            splitDuration(chapterItemFormData.durationSeconds)[
                              key
                            ]
                          }
                          onChange={(e) =>
                            setChapterItemFormData({
                              ...chapterItemFormData,
                              durationSeconds: combineDuration({
                                ...splitDuration(
                                  chapterItemFormData.durationSeconds,
                                ),
                                [key]: e.target.value,
                              }),
                            })
                          }
                          className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        />
                        <span className="text-[11px] text-gray-400 block px-1">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {chapterItemFormData.itemType === "zoom_meeting" && (
              <>
                {/* Meeting ID – hidden in create mode, read‑only in edit */}
                {chapterItemFormMode === "edit" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      Meeting ID
                    </label>
                    <input
                      type="text"
                      value={chapterItemFormData.meetingId || ""}
                      readOnly
                      className="w-full bg-gray-100 text-sm border border-gray-200 rounded-2xl px-4 py-4 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Meeting Password – optional (editable in both modes) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Meeting Password (optional)
                  </label>
                  <input
                    type="text"
                    value={chapterItemFormData.meetingPassword}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        meetingPassword: e.target.value,
                      })
                    }
                    placeholder="Leave blank for auto‑generated"
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>

                {/* Start Time – required */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={chapterItemFormData.startTime}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>

                {/* Duration – required */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={chapterItemFormData.durationMinutes}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        durationMinutes: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>

                {/* Join URL – hidden in create, read‑only in edit */}
                {chapterItemFormMode === "edit" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      Join URL
                    </label>
                    <input
                      type="url"
                      value={chapterItemFormData.joinUrl || ""}
                      readOnly
                      className="w-full bg-gray-100 text-sm border border-gray-200 rounded-2xl px-4 py-4 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-400 px-1">
                      This link is auto‑generated by Zoom.
                    </p>
                  </div>
                )}

                {/* Meeting Status – editable */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Meeting Status
                  </label>
                  <select
                    value={chapterItemFormData.meetingStatus}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        meetingStatus: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>

                {/* Hint for auto‑creation */}
                {chapterItemFormMode === "create" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <HiOutlineInformationCircle className="text-base mt-0.5" />
                    <span>
                      The meeting will be <strong>automatically created</strong>{" "}
                      on Zoom using the title, start time, and duration you
                      provide. You don’t need to enter a Meeting ID or Join URL
                      – they will be generated for you.
                    </span>
                  </div>
                )}
              </>
            )}

            {(chapterItemFormData.itemType === "assignment" ||
              chapterItemFormData.itemType === "quiz") && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Max Score
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={chapterItemFormData.maxScore}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        maxScore: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>
                {chapterItemFormData.itemType === "quiz" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      Start time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={chapterItemFormData.availableFrom}
                      onChange={(e) =>
                        setChapterItemFormData({
                          ...chapterItemFormData,
                          availableFrom: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-gray-400 px-1">
                      When questions become visible to students. Leave empty to
                      open immediately.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Submission deadline (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={chapterItemFormData.dueDate}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        dueDate: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-gray-400 px-1">
                    {chapterItemFormData.itemType === "quiz"
                      ? "Last date and time students can submit quiz answers."
                      : "Last date and time students can submit their work."}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Time Limit (minutes, optional)
                  </label>
                  <input
                    type="number"
                    value={chapterItemFormData.timeLimitMinutes}
                    onChange={(e) =>
                      setChapterItemFormData({
                        ...chapterItemFormData,
                        timeLimitMinutes: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-gray-400 px-1">
                    {chapterItemFormData.itemType === "quiz"
                      ? "Shown to students as a guideline. If “Countdown after start” below is left empty, this value is also used as the enforced countdown."
                      : "Shown to students as a guideline only — not enforced."}
                  </p>
                </div>
                {chapterItemFormData.itemType === "quiz" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      Countdown after start (minutes, optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={chapterItemFormData.attemptWindowMinutes}
                      onChange={(e) =>
                        setChapterItemFormData({
                          ...chapterItemFormData,
                          attemptWindowMinutes: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-gray-400 px-1">
                      When set (or left empty but Time Limit above is set),
                      the student clicks “Start Quiz” and this many minutes
                      later the quiz locks — no more submissions. The
                      countdown keeps running across reloads and devices.
                      Overrides Time Limit for the actual enforced window.
                    </p>
                  </div>
                )}
                {chapterItemFormData.itemType === "quiz" && (
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      Hidden unless failed (optional)
                    </label>
                    <select
                      value={chapterItemFormData.dependsOnItemId}
                      onChange={(e) =>
                        setChapterItemFormData({
                          ...chapterItemFormData,
                          dependsOnItemId: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    >
                      <option value="">
                        Always visible (no prerequisite quiz)
                      </option>
                      {activeCourse?.chapters?.flatMap((chapter) =>
                        (chapter.items || [])
                          .filter(
                            (it) =>
                              it.item_type === "quiz" &&
                              it.id !== editingChapterItemId,
                          )
                          .map((it) => (
                            <option key={it.id} value={it.id}>
                              {chapter.title}: {it.title}
                            </option>
                          )),
                      )}
                    </select>
                    {chapterItemFormData.dependsOnItemId && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-gray-500 shrink-0">
                          Only show if score on that quiz is below
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="0.01"
                          value={chapterItemFormData.visibleIfScoreBelow}
                          onChange={(e) =>
                            setChapterItemFormData({
                              ...chapterItemFormData,
                              visibleIfScoreBelow: e.target.value,
                            })
                          }
                          className="w-20 bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 px-1">
                      This quiz stays hidden from students until they're
                      graded below this score on the selected quiz — useful
                      for a remedial retake quiz.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ─── QUIZ QUESTION BUILDER ─── */}
            {isQuiz && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-[#2e0854]">
                    Quiz Questions
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      resetQuestionForm();
                      setShowQuestionForm(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-brand-purple rounded-xl text-xs font-semibold hover:bg-violet-100"
                  >
                    <HiOutlinePlusSm className="text-sm" /> Add Question
                  </button>
                </div>

                {quizQuestions.length === 0 && !showQuestionForm && (
                  <p className="text-xs text-gray-400">
                    No questions yet. Click "Add Question" to start building
                    your quiz.
                  </p>
                )}

                {/* Display existing questions */}
                {quizQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-xl p-3 mb-3 bg-gray-50/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        {q.question_image_path || q.question_image_preview ? (
                          <div className="space-y-2">
                            {q.question_image_preview ||
                            isQuestionImagePath(q.question_image_path) ? (
                              <img
                                src={
                                  q.question_image_preview ||
                                  getFileUrl(q.question_image_path)
                                }
                                alt="Question"
                                className="max-h-32 rounded-lg border border-gray-200 object-contain"
                              />
                            ) : (
                              <a
                                href={getFileUrl(q.question_image_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand-purple hover:underline"
                              >
                                View question file
                              </a>
                            )}
                            {q.question_text && (
                              <p className="font-medium text-sm text-gray-700">
                                {q.question_text}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="font-medium text-sm">{q.question_text}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="bg-gray-200 px-2 py-0.5 rounded">
                            {QUESTION_TYPE_LABELS[q.question_type] ||
                              q.question_type}
                          </span>
                          <span>Max: {q.max_score}</span>
                          {q.is_required && (
                            <span className="text-brand-purple">*Required</span>
                          )}
                        </div>
                        {q.question_type === "mcq" && q.options && (
                          <div className="mt-1 text-xs text-gray-600">
                            Options:{" "}
                            {q.options.map((o, i) => (
                              <span key={i} className="mr-2">
                                {o.option_text} {o.is_correct && "✓"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => editQuestion(idx)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <HiOutlinePencil className="text-sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(idx)}
                          className="text-gray-400 hover:text-brand-purple"
                        >
                          <HiOutlineTrash className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Question form */}
                {showQuestionForm && (
                  <div className="border border-gray-300 rounded-xl p-4 bg-white mt-3">
                    <h4 className="font-bold text-sm mb-3">
                      {editingQuestionIndex !== null
                        ? "Edit Question"
                        : "New Question"}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          Question *
                        </label>
                        <div className="flex gap-2 mb-2">
                          {QUESTION_CONTENT_MODES.map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                handleQuestionContentModeChange(mode)
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                questionForm.question_content_mode === mode
                                  ? "bg-brand text-white border-brand"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-200"
                              }`}
                            >
                              {mode === "text"
                                ? t("dashboard.courses.questionTextMode")
                                : t("dashboard.courses.questionUploadMode")}
                            </button>
                          ))}
                        </div>

                        {questionForm.question_content_mode === "text" ? (
                          <textarea
                            rows={3}
                            value={questionForm.question_text}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                question_text: e.target.value,
                              })
                            }
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                            placeholder={t(
                              "dashboard.courses.questionTextPlaceholder",
                            )}
                          />
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx,.txt"
                              onChange={(e) =>
                                handleQuestionImageChange(
                                  e.target.files?.[0] || null,
                                )
                              }
                              className="w-full text-sm"
                            />
                            {(questionForm.question_image_preview ||
                              questionForm.question_image_path) && (
                              <div className="rounded-lg border border-gray-200 p-2 bg-gray-50">
                                {questionForm.question_image_preview ||
                                isQuestionImagePath(
                                  questionForm.question_image_path,
                                ) ? (
                                  <img
                                    src={
                                      questionForm.question_image_preview ||
                                      getFileUrl(
                                        questionForm.question_image_path,
                                      )
                                    }
                                    alt="Question preview"
                                    className="max-h-40 rounded object-contain"
                                  />
                                ) : (
                                  <a
                                    href={getFileUrl(
                                      questionForm.question_image_path,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-brand-purple hover:underline"
                                  >
                                    View current question file
                                  </a>
                                )}
                              </div>
                            )}
                            <input
                              type="text"
                              value={questionForm.question_text}
                              onChange={(e) =>
                                setQuestionForm({
                                  ...questionForm,
                                  question_text: e.target.value,
                                })
                              }
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                              placeholder={t(
                                "dashboard.courses.questionCaptionPlaceholder",
                              )}
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">
                            Answer Type
                          </label>
                          <select
                            value={questionForm.question_type}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                question_type: e.target.value,
                                options:
                                  e.target.value === "mcq"
                                    ? [{ option_text: "", is_correct: false }]
                                    : [],
                              })
                            }
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                          >
                            {QUESTION_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {QUESTION_TYPE_LABELS[type] || type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">
                            Max Score
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={questionForm.max_score}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                max_score: e.target.value,
                              })
                            }
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isRequired"
                          checked={questionForm.is_required}
                          onChange={(e) =>
                            setQuestionForm({
                              ...questionForm,
                              is_required: e.target.checked,
                            })
                          }
                          className="accent-brand-purple"
                        />
                        <label
                          htmlFor="isRequired"
                          className="text-xs text-gray-600"
                        >
                          Required question
                        </label>
                      </div>

                      {/* Options for MCQ */}
                      {questionForm.question_type === "mcq" && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">
                            Options (at least 2)
                          </label>
                          {questionForm.options.map((opt, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 mb-1"
                            >
                              <input
                                type="text"
                                value={opt.option_text}
                                onChange={(e) =>
                                  updateOptionInQuestion(
                                    idx,
                                    "option_text",
                                    e.target.value,
                                  )
                                }
                                className="flex-1 border border-gray-200 rounded-lg p-2 text-sm"
                                placeholder={`Option ${idx + 1}`}
                              />
                              <label className="flex items-center gap-1 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={opt.is_correct}
                                  onChange={(e) =>
                                    updateOptionInQuestion(
                                      idx,
                                      "is_correct",
                                      e.target.checked,
                                    )
                                  }
                                  className="accent-brand-purple"
                                />
                                Correct
                              </label>
                              {questionForm.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOptionFromQuestion(idx)}
                                  className="text-brand-purple hover:text-brand"
                                >
                                  <HiOutlineX className="text-sm" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addOptionToQuestion}
                            className="text-xs text-brand-purple hover:underline mt-1"
                          >
                            + Add Option
                          </button>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={resetQuestionForm}
                          className="px-3 py-1.5 border rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveQuestion}
                          className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs"
                        >
                          {editingQuestionIndex !== null ? "Update" : "Add"}{" "}
                          Question
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsChapterItemViewActive(false)}
                className="w-full sm:w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold text-sm py-4 rounded-2xl transition-all"
              >
                {t("dashboard.common.cancel")}
              </button>
              <button
                type="submit"
                disabled={chapterItemSubmitLoading}
                className="w-full sm:w-2/3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99]"
              >
                {chapterItemSubmitLoading
                  ? t("dashboard.common.processing")
                  : chapterItemFormMode === "create"
                    ? t("dashboard.common.create")
                    : t("dashboard.common.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== GRADING FULL-PAGE VIEW ====================
  if (isGradingViewActive && selectedGradingItem) {
    const isQuiz = selectedGradingItem.item_type === "quiz";

    const renderAssignmentGrading = () => {
      const groupedSubmissions = submissionsList.reduce((acc, sub) => {
        const key = sub.student_id || sub.user_id;
        if (!acc[key]) {
          acc[key] = {
            student_id: key,
            student_name:
              `${sub.first_name || ""} ${sub.last_name || ""}`.trim(),
            submissions: [],
          };
        }
        acc[key].submissions.push(sub);
        return acc;
      }, {});

      return (
        <div className="space-y-6">
          {Object.values(groupedSubmissions).map((group) => (
            <div
              key={group.student_id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="font-bold text-[#2e0854]">
                  {group.student_name || `Student #${group.student_id}`}
                </span>
                <span className="text-xs text-gray-400">
                  {group.submissions.length} file
                  {group.submissions.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.submissions.map((sub) => {
                  const isGraded = sub.status === "graded";
                  return (
                    <div key={sub.id} className="px-5 py-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          {sub.submission_text && (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                              {sub.submission_text}
                            </div>
                          )}
                          {sub.submission_file && (
                            <a
                              href={api.getFileUrl(sub.submission_file)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-purple hover:text-brand"
                            >
                              <HiOutlineDownload /> Download Attachment
                            </a>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted:{" "}
                            {new Date(sub.submitted_at).toLocaleString()}
                          </p>
                          {isGraded && (
                            <div className="flex items-center gap-3 text-xs mt-1">
                              <span className="text-emerald-700 font-bold">
                                Score: {sub.score} /{" "}
                                {selectedGradingItem.max_score || 100}
                              </span>
                              {sub.feedback && (
                                <span className="text-gray-600">
                                  Feedback: {sub.feedback}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {!isGraded && (
                          <button
                            onClick={() => {
                              setGradingSubmissionId(sub.id);
                              setGradeScore("");
                              setGradeFeedback("");
                            }}
                            className="ml-4 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 shrink-0"
                          >
                            <HiOutlinePencil className="inline mr-1" /> Grade
                          </button>
                        )}
                      </div>
                      {gradingSubmissionId === sub.id && !isGraded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              Score
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Enter score"
                              value={gradeScore}
                              onChange={(e) => setGradeScore(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              Feedback (optional)
                            </label>
                            <textarea
                              rows="2"
                              placeholder="Provide feedback"
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setGradingSubmissionId(null)}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleGradeSubmit(sub.id)}
                              className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark"
                            >
                              Save Grade
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    };

    const renderQuizGrading = () => {
      const grouped = submissionsList.reduce((acc, ans) => {
        const key = ans.user_id;
        if (!acc[key]) {
          acc[key] = {
            user_id: key,
            student_name:
              `${ans.first_name || ""} ${ans.last_name || ""}`.trim(),
            answers: [],
          };
        }
        acc[key].answers.push(ans);
        return acc;
      }, {});

      return (
        <div className="space-y-6">
          {Object.values(grouped).map((group) => (
            <div
              key={group.user_id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="font-bold text-[#2e0854]">
                  {group.student_name || `Student #${group.user_id}`}
                </span>
                <span className="text-xs text-gray-400">
                  {group.answers.length} answers
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.answers.map((ans) => {
                  const isGraded =
                    ans.score !== null && ans.score !== undefined;
                  return (
                    <div key={ans.id} className="px-5 py-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-bold text-gray-500">Q:</p>
                          <QuizQuestionPrompt
                            question={{
                              question_text: ans.question_text,
                              question_image_path: ans.question_image_path,
                            }}
                            getFileUrl={getFileUrl}
                          />
                          {ans.answer_text && (
                            <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 whitespace-pre-wrap">
                              {ans.answer_text}
                            </div>
                          )}
                          {ans.selected_option_text && (
                            <div className="bg-gray-50 p-2 rounded text-sm text-gray-700">
                              Selected: {ans.selected_option_text}
                            </div>
                          )}
                          {ans.file_path && (
                            <a
                              href={api.getFileUrl(ans.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-purple hover:text-brand"
                            >
                              <HiOutlineDownload /> Download Attachment
                            </a>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted:{" "}
                            {new Date(ans.submitted_at).toLocaleString()}
                          </p>
                          {isGraded && (
                            <div className="flex items-center gap-3 text-xs mt-1">
                              <span className="text-emerald-700 font-bold">
                                Score: {ans.score} / {ans.max_score ?? "?"}
                              </span>
                              {ans.feedback && (
                                <span className="text-gray-600">
                                  Feedback: {ans.feedback}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {!isGraded && (
                          <button
                            onClick={() => {
                              setGradingSubmissionId(ans.id);
                              setGradeScore("");
                              setGradeFeedback("");
                            }}
                            className="ml-4 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 shrink-0"
                          >
                            <HiOutlinePencil className="inline mr-1" /> Grade
                          </button>
                        )}
                      </div>
                      {gradingSubmissionId === ans.id && !isGraded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              Score (max {ans.max_score ?? "?"})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Enter score"
                              value={gradeScore}
                              onChange={(e) => setGradeScore(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              Feedback (optional)
                            </label>
                            <textarea
                              rows="2"
                              placeholder="Provide feedback"
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setGradingSubmissionId(null)}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (!gradeScore)
                                  return alert("Please enter a score.");
                                try {
                                  await api.gradeQuizAnswer(
                                    ans.id,
                                    parseFloat(gradeScore),
                                    gradeFeedback,
                                  );
                                  alert("Grade saved.");
                                  setGradingSubmissionId(null);
                                  const res = await api.getQuizAnswers(
                                    selectedGradingItem.id,
                                  );
                                  if (res.success) setSubmissionsList(res.data);
                                } catch (err) {
                                  alert(err.message);
                                }
                              }}
                              className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark"
                            >
                              Save Grade
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsGradingViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft /> <span>Back to Course</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-6">
          <div className="border-b border-gray-50 pb-4">
            <h1 className="text-2xl font-black font-heading tracking-tight">
              Grade: {selectedGradingItem.title}
            </h1>
            <p className="text-gray-400 text-sm font-light mt-1">
              {isQuiz
                ? "Review and score student quiz answers."
                : "Review and score student submissions."}
            </p>
          </div>

          {gradingLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : submissionsList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No submissions yet.
            </div>
          ) : (
            <div>
              {isQuiz ? renderQuizGrading() : renderAssignmentGrading()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== ACCESS CODES FULL-PAGE VIEW ====================
  if (isAccessCodesViewActive && activeCourse) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsAccessCodesViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft /> <span>Back to Course</span>
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-6">
          <div className="border-b border-gray-50 pb-4 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black font-heading tracking-tight flex items-center gap-2">
                <HiOutlineKey className="text-brand-purple" />{" "}
                {t("dashboard.courses.accessCodes")}
              </h1>
              <p className="text-gray-400 text-sm font-light mt-1">
                Manage enrollment and unlock codes for {activeCourse.title}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateCodeForm(true);
                  setShowBulkForm(false);
                }}
                className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <HiOutlinePlusCircle /> New Code
              </button>
              <button
                onClick={() => {
                  setShowBulkForm(true);
                  setShowCreateCodeForm(false);
                }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <HiOutlineDuplicate /> Bulk
              </button>
              <button
                onClick={handleExportAccessCodes}
                disabled={exportingCodes || accessCodes.length === 0}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <HiOutlineDownload />{" "}
                {exportingCodes
                  ? t("dashboard.courses.codesExporting")
                  : t("dashboard.courses.codesExportExcel")}
              </button>
            </div>
          </div>

          {codeFormError && (
            <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
              ⚠️ {codeFormError}
            </div>
          )}

          {showCreateCodeForm && (
            <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-sm mb-4">
                Create Single Access Code
              </h3>
              <form onSubmit={handleCreateCode} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Code Type
                    </label>
                    <select
                      value={newCode.codeType}
                      onChange={(e) =>
                        setNewCode({ ...newCode, codeType: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                    >
                      <option value="course">Course Enrollment</option>
                      <option value="center_course">
                        Course Enrollment (Center Students Only)
                      </option>
                      <option value="chapter_item">Chapter Item Unlock</option>
                    </select>
                  </div>
                  {newCode.codeType === "chapter_item" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Chapter Item
                      </label>
                      <select
                        value={newCode.chapterItemId}
                        onChange={(e) =>
                          setNewCode({
                            ...newCode,
                            chapterItemId: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                      >
                        <option value="">-- Choose --</option>
                        {activeCourse.chapters?.flatMap((chapter) =>
                          (chapter.items || []).map((item) => (
                            <option key={item.id} value={item.id}>
                              {chapter.title}: {item.title} ({item.item_type})
                            </option>
                          )),
                        )}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newCode.maxUses}
                      onChange={(e) =>
                        setNewCode({
                          ...newCode,
                          maxUses: parseInt(e.target.value),
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      {t("dashboard.courses.codeExpiresAt")}
                    </label>
                    <input
                      type="datetime-local"
                      value={newCode.expiresAt}
                      onChange={(e) =>
                        setNewCode({ ...newCode, expiresAt: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      {t("dashboard.courses.codeExpiresAtHint")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      {t("dashboard.courses.accessDurationDays")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newCode.accessDurationDays}
                      onChange={(e) =>
                        setNewCode({
                          ...newCode,
                          accessDurationDays: e.target.value,
                        })
                      }
                      placeholder={t("dashboard.courses.accessDurationPlaceholder")}
                      className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      {t("dashboard.courses.accessDurationHint")}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Custom Code (optional)
                    </label>
                    <input
                      type="text"
                      value={newCode.customCode}
                      onChange={(e) =>
                        setNewCode({
                          ...newCode,
                          customCode: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="LEAVE EMPTY FOR RANDOM"
                      className="w-full border border-gray-200 rounded-xl p-2 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCodeForm(false)}
                    className="px-4 py-2 border rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand text-white rounded-xl text-sm"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          )}

          {showBulkForm && (
            <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-sm mb-4">Bulk Generate Codes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Code Type
                  </label>
                  <select
                    value={bulkCodeType}
                    onChange={(e) => setBulkCodeType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                  >
                    <option value="course">Course Enrollment</option>
                    <option value="center_course">
                      Course Enrollment (Center Students Only)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Quantity (max 500)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    {t("dashboard.courses.codeExpiresAt")}
                  </label>
                  <input
                    type="datetime-local"
                    value={bulkExpiresAt}
                    onChange={(e) => setBulkExpiresAt(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    {t("dashboard.courses.accessDurationDays")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bulkAccessDurationDays}
                    onChange={(e) => setBulkAccessDurationDays(e.target.value)}
                    placeholder={t("dashboard.courses.accessDurationPlaceholder")}
                    className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowBulkForm(false)}
                  className="px-4 py-2 border rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkCreate}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-sm"
                >
                  Generate {bulkQuantity} Codes
                </button>
              </div>
            </div>
          )}

          {codesLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Loading codes...
            </div>
          ) : accessCodes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm border rounded-2xl border-dashed">
              No access codes created for this course yet.
            </div>
          ) : (
            (() => {
              const totalCodePages = Math.max(
                1,
                Math.ceil(accessCodes.length / CODES_PER_PAGE),
              );
              const currentCodesPage = Math.min(codesPage, totalCodePages);
              const pagedCodes = accessCodes.slice(
                (currentCodesPage - 1) * CODES_PER_PAGE,
                currentCodesPage * CODES_PER_PAGE,
              );
              return (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Uses</th>
                    <th className="text-left p-3">
                      {t("dashboard.courses.codeExpiresAt")}
                    </th>
                    <th className="text-left p-3">
                      {t("dashboard.courses.accessDurationDays")}
                    </th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCodes.map((code) => (
                    <tr key={code.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold">{code.code}</td>
                      <td className="p-3 capitalize">
                        {code.code_type === "course"
                          ? "Course Enrollment"
                          : code.code_type === "center_course"
                            ? "Course Enrollment (Center Only)"
                            : code.code_type === "multi_course"
                              ? "Multi-Course Bundle"
                              : "Chapter Item"}
                      </td>
                      <td className="p-3">
                        {code.used_count} / {code.max_uses}
                      </td>
                      <td className="p-3">
                        {code.expires_at
                          ? new Date(code.expires_at).toLocaleDateString()
                          : t("dashboard.courses.never")}
                      </td>
                      <td className="p-3">
                        {code.access_duration_days
                          ? t("dashboard.courses.accessDurationValue", {
                              days: code.access_duration_days,
                            })
                          : t("dashboard.courses.unlimitedAccess")}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${code.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {code.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 flex gap-2">
                        <button
                          onClick={() => handleToggleActive(code)}
                          className="text-blue-600 hover:underline"
                        >
                          <HiOutlineRefresh />
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code.id, code.code)}
                          className="text-brand-purple hover:underline"
                        >
                          <HiOutlineTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between gap-3 pt-4 flex-wrap">
                <span className="text-[11px] text-gray-400">
                  {t("dashboard.courses.codesTotalCount", {
                    total: accessCodes.length,
                  })}
                </span>
                {totalCodePages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCodesPage((p) => Math.max(1, p - 1))}
                      disabled={currentCodesPage <= 1}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      {t("dashboard.courses.codesPaginationPrev")}
                    </button>
                    <span className="text-[11px] text-gray-500">
                      {t("dashboard.courses.codesPaginationPage", {
                        page: currentCodesPage,
                        totalPages: totalCodePages,
                      })}
                    </span>
                    <button
                      onClick={() =>
                        setCodesPage((p) => Math.min(totalCodePages, p + 1))
                      }
                      disabled={currentCodesPage >= totalCodePages}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      {t("dashboard.courses.codesPaginationNext")}
                    </button>
                  </div>
                )}
              </div>
            </div>
              );
            })()
          )}
        </div>
      </div>
    );
  }

  // ==================== VIDEO PROGRESS VIEW ====================
  if (isVideoProgressViewActive && activeCourse) {
    const videoItems = (activeCourse.chapters || []).flatMap((chapter) =>
      (chapter.items || []).filter((item) => item.item_type === "vimeo_video"),
    );

    const fmtWatched = (seconds) => {
      if (!seconds) return "0m";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // The endpoint returns flat student × video rows already ordered by
    // chapter/item, so bucketing by item id preserves lesson order.
    const groupedVideoProgress = Object.values(
      videoProgress.reduce((acc, row) => {
        if (!acc[row.chapter_item_id]) {
          acc[row.chapter_item_id] = {
            chapterItemId: row.chapter_item_id,
            itemTitle: row.item_title,
            chapterTitle: row.chapter_title,
            chapterIsActive: row.chapter_is_active,
            chapterOrder: row.chapter_order,
            itemOrder: row.item_order,
            rows: [],
          };
        }
        acc[row.chapter_item_id].rows.push(row);
        return acc;
      }, {}),
    )
      .map((group) => ({
        ...group,
        openedCount: group.rows.filter((r) => r.first_opened_at).length,
        completedCount: group.rows.filter((r) => r.completed).length,
        strikeTotal: group.rows.reduce((sum, r) => sum + r.strike_count, 0),
      }))
      .sort(
        (a, b) =>
          a.chapterOrder - b.chapterOrder || a.itemOrder - b.itemOrder,
      );

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsVideoProgressViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft /> <span>Back to Course</span>
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-6">
          <div className="border-b border-gray-50 pb-4 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black font-heading tracking-tight flex items-center gap-2">
                <HiOutlineVideoCamera className="text-brand-purple" />{" "}
                {t("dashboard.courses.videoProgress.title")}
              </h1>
              <p className="text-gray-400 text-sm font-light mt-1">
                {t("dashboard.courses.videoProgress.subtitle")}
              </p>
            </div>
            <select
              value={videoProgressItemFilter}
              onChange={(e) => {
                setVideoProgressItemFilter(e.target.value);
                fetchVideoProgress(activeCourse.id, e.target.value);
              }}
              className="border border-gray-200 rounded-xl p-2 text-xs"
            >
              <option value="">
                {t("dashboard.courses.videoProgress.allVideos")}
              </option>
              {videoItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {videoProgressError && (
            <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
              ⚠️ {videoProgressError}
            </div>
          )}

          {videoProgressLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {t("dashboard.courses.videoProgress.loading")}
            </div>
          ) : videoProgress.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm border rounded-2xl border-dashed">
              {t("dashboard.courses.videoProgress.empty")}
            </div>
          ) : (
            // One table per video rather than a single flat list: staff read
            // this per-lesson ("who watched today's video?"), and grouping
            // drops the repeated video column and gives each one a headline.
            <div className="space-y-8">
              {groupedVideoProgress.map((group) => (
                <div key={group.chapterItemId} className="space-y-3">
                  <div className="flex items-end justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-heading font-bold text-sm text-[#2e0854] flex items-center gap-2">
                        <HiOutlineVideoCamera className="text-brand-purple" />
                        {group.itemTitle}
                        {!group.chapterIsActive && (
                          <span className="text-[10px] font-semibold text-amber-600">
                            ({t("dashboard.courses.videoProgress.hiddenChapter")})
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-light">
                        {group.chapterTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {t("dashboard.courses.videoProgress.openedCount", {
                          opened: group.openedCount,
                          total: group.rows.length,
                        })}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                        {t("dashboard.courses.videoProgress.completedCount", {
                          count: group.completedCount,
                        })}
                      </span>
                      {group.strikeTotal > 0 && (
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                          {t("dashboard.courses.videoProgress.strikeCount", {
                            count: group.strikeTotal,
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3">
                            {t("dashboard.courses.videoProgress.student")}
                          </th>
                          <th className="text-left p-3">
                            {t("dashboard.courses.videoProgress.opened")}
                          </th>
                          <th className="text-left p-3">
                            {t("dashboard.courses.videoProgress.progress")}
                          </th>
                          <th className="text-left p-3">
                            {t("dashboard.courses.videoProgress.watched")}
                          </th>
                          <th className="text-left p-3">
                            {t("dashboard.courses.videoProgress.completed")}
                          </th>
                          <th className="text-left p-3">
                            {t("dashboard.courses.videoProgress.strikes")}
                          </th>
                          <th className="text-left p-3">
                            {t("dashboard.courses.videoProgress.lastActivity")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr
                            key={`${row.student_id}-${row.chapter_item_id}`}
                            className="border-b last:border-0 hover:bg-gray-50"
                          >
                            <td className="p-3">
                              <div className="font-semibold">
                                {row.first_name} {row.last_name}
                              </div>
                              <div className="text-[10px] font-mono text-gray-400">
                                {row.phone}
                              </div>
                            </td>
                            <td className="p-3 text-gray-500">
                              {row.first_opened_at || "—"}
                            </td>
                            <td className="p-3">
                              {row.progressPercent === null ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <div className="flex items-center gap-2 min-w-[110px]">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                                    <div
                                      className="h-full bg-violet-500 rounded-full"
                                      style={{ width: `${row.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] text-gray-500">
                                    {row.progressPercent}%
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-mono text-gray-500">
                              {fmtWatched(row.watched_seconds)}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.completed
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {row.completed
                                  ? t("dashboard.courses.videoProgress.yes")
                                  : t("dashboard.courses.videoProgress.no")}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.strike_count > 0
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {row.strike_count}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500">
                              {row.last_watched_at || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== SINGLE COURSE VIEW ====================
  if (slug && activeCourse) {
    const instructorName =
      `${activeCourse.instructor_first_name || ""} ${activeCourse.instructor_last_name || ""}`.trim();
    const primarySubject = activeCourse.subjects?.[0];

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/courses")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft /> <span>Back to Course Directory</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => openEditCourseForm(e, activeCourse)}
              className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
            >
              <HiOutlinePencil /> <span>{t("dashboard.courses.edit")}</span>
            </button>
            <button
              onClick={(e) =>
                handleDeleteCourse(e, activeCourse.id, activeCourse.title)
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

        <div
          className="bg-[#2e0854] rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
          style={
            activeCourse.cover_image_url
              ? {
                  backgroundImage: `linear-gradient(rgba(43,2,7,0.85), rgba(43,2,7,0.85)), url(${getFileUrl(activeCourse.cover_image_url)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md font-mono ${STATUS_STYLES[activeCourse.status] || "text-gray-300 bg-white/10"}`}
              >
                {statusFilterLabel(activeCourse.status)}
              </span>
              {primarySubject && (
                <span className="text-[10px] font-mono tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 rounded">
                  {primarySubject.name}
                </span>
              )}
              <span className="text-[10px] font-mono tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 rounded">
                {termLabel(activeCourse.term)}
              </span>
            </div>
            <h2 className="text-xl font-black font-heading leading-tight">
              {activeCourse.title}
            </h2>
            {activeCourse.description && (
              <p className="text-xs text-red-100/70 font-light max-w-xl leading-relaxed">
                {activeCourse.description}
              </p>
            )}
          </div>
          <div className="bg-white/10 border border-white/5 px-4 py-3 rounded-xl text-center min-w-[120px] shrink-0 self-start sm:self-center">
            <span className="text-[9px] text-red-300 uppercase font-bold tracking-wider block">
              {t("dashboard.courses.price")}
            </span>
            <span className="text-2xl font-heading font-black text-white font-mono">
              {Number(activeCourse.price) > 0
                ? `EGP ${activeCourse.price}`
                : t("dashboard.common.free")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-heading font-bold text-sm text-[#2e0854]">
                    {t("dashboard.courses.chapters")}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Chapters and content items for this course.
                  </p>
                </div>
                {(currentUserRole === "admin" ||
                  currentUserRole === "instructor") && (
                  <button
                    onClick={openCreateChapterView}
                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-brand-purple rounded-xl text-xs font-semibold hover:bg-violet-100"
                  >
                    <HiOutlinePlus className="text-sm" />{" "}
                    {t("dashboard.courses.addChapter")}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {activeCourse.chapters && activeCourse.chapters.length > 0 ? (
                  activeCourse.chapters.map((chapter, idx) => (
                    <div
                      key={chapter.id}
                      className="border border-gray-100 rounded-xl overflow-hidden"
                    >
                      <div className="p-3.5 bg-gray-50/50 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 flex items-center justify-center font-mono font-bold text-[10px]">
                            {String(idx + 1).padStart(2, "0")}
                          </div>
                          <h4 className="font-bold text-[#2e0854] truncate font-heading">
                            {chapter.title}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded text-gray-400 bg-gray-100">
                            {chapter.items?.length || 0} items
                          </span>
                          {(currentUserRole === "admin" ||
                            currentUserRole === "instructor") && (
                            <>
                              <button
                                onClick={() => openEditChapterView(chapter)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg transition-colors"
                                title={t("dashboard.courses.editChapter")}
                              >
                                <HiOutlinePencil className="text-sm" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteChapter(chapter.id, chapter.title)
                                }
                                className="p-1.5 text-gray-500 hover:text-brand-purple rounded-lg transition-colors"
                                title={t("dashboard.common.delete")}
                              >
                                <HiOutlineTrash className="text-sm" />
                              </button>
                            </>
                          )}
                          {(currentUserRole === "admin" ||
                            currentUserRole === "instructor" ||
                            currentUserRole === "assistant") && (
                            <button
                              onClick={() =>
                                openCreateChapterItemView(chapter.id)
                              }
                              className="p-1.5 text-gray-500 hover:text-brand-purple hover:bg-violet-50 rounded-lg transition-colors"
                              title="Add item to chapter"
                            >
                              <HiOutlinePlus className="text-sm" />
                            </button>
                          )}
                        </div>
                      </div>
                      {chapter.items && chapter.items.length > 0 && (
                        <div className="divide-y divide-gray-50">
                          {chapter.items.map((item) => {
                            const Icon =
                              ITEM_TYPE_ICONS[item.item_type] ||
                              HiOutlineBookOpen;
                            const isAssessment =
                              item.item_type === "assignment" ||
                              item.item_type === "quiz";
                            const isStudent = currentUserRole === "student";
                            const isInstructor =
                              currentUserRole === "instructor" ||
                              currentUserRole === "admin" ||
                              currentUserRole === "assistant";

                            return (
                              <div
                                key={item.id}
                                className="px-4 py-2.5 flex items-center justify-between text-xs group/item"
                              >
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <Icon className="text-gray-400 text-base shrink-0" />
                                  <span className="text-gray-600 truncate">
                                    {item.title}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  {item.is_preview_free && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                      Free Preview
                                    </span>
                                  )}
                                  {isAssessment && isStudent && (
                                    <button
                                      onClick={async () => {
                                        setSelectedItemForSubmission(item);
                                        fetchStudentSubmission(item.id);
                                        try {
                                          const res =
                                            await api.getChapterItemById(
                                              item.id,
                                            );
                                          if (res.success) {
                                            setSelectedItemForSubmission({
                                              ...item,
                                              ...res.data,
                                            });
                                          }
                                        } catch {
                                          /* keep basic item data */
                                        }
                                      }}
                                      className="text-[10px] font-semibold bg-violet-50 text-brand-purple px-2 py-1 rounded-lg hover:bg-violet-100"
                                    >
                                      {existingSubmission?.status ===
                                      "submitted"
                                        ? "View Submission"
                                        : existingSubmission?.status ===
                                            "graded"
                                          ? "View Grade"
                                          : "Submit"}
                                    </button>
                                  )}
                                  {isAssessment && isInstructor && (
                                    <button
                                      onClick={() => openGradingView(item)}
                                      className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100"
                                    >
                                      Grade Submissions
                                    </button>
                                  )}
                                  {isInstructor && (
                                    <>
                                      {!item.is_preview_free && (
                                        <button
                                          onClick={() =>
                                            openItemAccessModal(item)
                                          }
                                          className="text-gray-400 hover:text-amber-600 transition-colors opacity-0 group-hover/item:opacity-100"
                                          title={t(
                                            "dashboard.courses.itemAccess",
                                          )}
                                        >
                                          <HiOutlineKey className="text-sm" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          openEditChapterItemView(
                                            item,
                                            chapter.id,
                                          )
                                        }
                                        className="text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover/item:opacity-100"
                                      >
                                        <HiOutlinePencil className="text-sm" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteChapterItem(
                                            item.id,
                                            item.title,
                                          )
                                        }
                                        className="text-gray-400 hover:text-brand-purple transition-colors opacity-0 group-hover/item:opacity-100"
                                      >
                                        <HiOutlineTrash className="text-sm" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                    <p className="text-xs text-gray-400 font-light">
                      No chapters added to this course yet.
                    </p>
                    {(currentUserRole === "admin" ||
                      currentUserRole === "instructor") && (
                      <button
                        onClick={openCreateChapterView}
                        className="mt-3 text-xs text-brand-purple font-semibold underline"
                      >
                        Add your first chapter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-400">
                Course Info
              </h3>
              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                  <HiOutlineUser className="text-gray-400 text-base shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                      Instructor
                    </p>
                    <span className="font-bold text-[#2e0854]">
                      {instructorName || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                  <HiOutlineAcademicCap className="text-gray-400 text-base shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                      Slug
                    </p>
                    <span className="font-mono text-gray-600 font-semibold">
                      {activeCourse.slug}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                  <HiOutlineCalendar className="text-gray-400 text-base shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                      Term
                    </p>
                    <span className="font-medium text-gray-600">
                      {termLabel(activeCourse.term)}
                    </span>
                  </div>
                </div>
                {activeCourse.academicLevels &&
                  activeCourse.academicLevels.length > 0 && (
                    <div className="flex items-start space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                      <HiOutlineClipboardList className="text-gray-400 text-base shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">
                          Academic Levels
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {activeCourse.academicLevels.map((lvl) => (
                            <span
                              key={lvl.id}
                              className="text-[10px] font-medium text-gray-600 bg-white border border-gray-100 px-2 py-0.5 rounded"
                            >
                              {lvl.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                {activeCourse.curriculums &&
                  activeCourse.curriculums.length > 0 && (
                    <div className="flex items-start space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                      <HiOutlineCollection className="text-gray-400 text-base shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">
                          Curriculums
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {activeCourse.curriculums.map((cur) => (
                            <span
                              key={cur.id}
                              className="text-[10px] font-medium text-gray-600 bg-white border border-gray-100 px-2 py-0.5 rounded"
                            >
                              {cur.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* ==================== ENROLLED STUDENTS CARD (UPDATED) ==================== */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#2e0854]">
                  {t("dashboard.courses.enrolledStudents")}
                </h3>
                <p className="text-[11px] text-gray-400 font-light">
                  Total enrolled:{" "}
                  <span className="font-bold font-mono text-gray-600">
                    {activeCourse.enrolledCount ?? 0}
                  </span>
                </p>
              </div>
              {(currentUserRole === "admin" ||
                currentUserRole === "instructor") && (
                <div className="relative mb-3">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Enroll new student
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      searchStudents(studentSearchQuery);
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <HiOutlineSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={handleStudentSearchChange}
                        onFocus={() => {
                          if (studentSearchResults.length > 0)
                            setShowStudentDropdown(true);
                        }}
                        placeholder={t("dashboard.courses.searchStudents")}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-9 pe-3 py-2 text-xs focus:ring-2 focus:ring-red-100 focus:border-violet-200"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark shrink-0"
                    >
                      Search
                    </button>
                  </form>

                  {showStudentDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {studentSearchResults.length > 0 ? (
                        studentSearchResults.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => handleEnrollStudent(student)}
                            disabled={enrollingStudentId === student.id}
                            className="w-full text-start px-4 py-2 text-xs hover:bg-gray-50 flex justify-between items-center border-b last:border-0"
                          >
                            <span>
                              <span className="font-medium">
                                {student.first_name} {student.last_name}
                              </span>
                              <span className="text-gray-400 ml-2">
                                {student.phone}
                              </span>
                            </span>
                            {enrollingStudentId === student.id ? (
                              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <HiOutlinePlusCircle className="text-brand-purple" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-gray-500 text-center">
                          {studentSearchQuery.trim()
                            ? "الطالب غير موجود"
                            : "اكتب رقم الهاتف أو الاسم للبحث"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2 border-t border-gray-50 pt-3 max-h-[300px] overflow-y-auto">
                {courseStudents.length > 0 ? (
                  courseStudents.map((std) => (
                    <div
                      key={std.student_id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0 last:pb-0 gap-2"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-[#2e0854] truncate">
                          {std.first_name} {std.last_name}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-400">
                          {std.phone}
                        </span>
                        {std.access_expires_at && std.status === "active" && (
                          <span className="block text-[10px] text-amber-600 mt-0.5">
                            Access until{" "}
                            {new Date(std.access_expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${std.status === "active" ? "text-emerald-700 bg-emerald-50" : std.status === "completed" ? "text-blue-700 bg-blue-50" : "text-amber-700 bg-amber-50"}`}
                        >
                          {std.status}
                        </span>
                        {(currentUserRole === "admin" ||
                          currentUserRole === "instructor") &&
                          (std.status === "active" ? (
                            <button
                              onClick={() => handleRemoveEnrollment(std)}
                              disabled={
                                enrollmentActionId === std.student_id
                              }
                              className="p-1 text-gray-400 hover:text-brand-purple rounded transition-colors disabled:opacity-50"
                              title={t("dashboard.courses.removeStudent")}
                            >
                              {enrollmentActionId === std.student_id ? (
                                <div className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <HiOutlineTrash className="text-sm" />
                              )}
                            </button>
                          ) : std.status === "dropped" ? (
                            <button
                              onClick={() => handleRestoreEnrollment(std)}
                              disabled={
                                enrollmentActionId === std.student_id
                              }
                              className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors disabled:opacity-50"
                              title={t("dashboard.courses.restoreStudent")}
                            >
                              {enrollmentActionId === std.student_id ? (
                                <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <HiOutlineRefresh className="text-sm" />
                              )}
                            </button>
                          ) : null)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-gray-400 font-light italic text-center py-2">
                    No students enrolled yet.
                  </p>
                )}
              </div>
            </div>

            {(currentUserRole === "admin" ||
              currentUserRole === "instructor") && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#2e0854] flex items-center gap-2">
                      <HiOutlineKey className="text-brand-purple" />{" "}
                      {t("dashboard.courses.accessCodes")}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Manage enrollment and unlock codes.
                    </p>
                  </div>
                  <button
                    onClick={openAccessCodesView}
                    className="px-3 py-1.5 bg-brand text-white rounded-xl text-xs font-semibold"
                  >
                    Manage
                  </button>
                </div>
              </div>
            )}

            {(currentUserRole === "admin" ||
              currentUserRole === "instructor" ||
              currentUserRole === "assistant") && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#2e0854] flex items-center gap-2">
                      <HiOutlineVideoCamera className="text-brand-purple" />{" "}
                      {t("dashboard.courses.videoProgress.title")}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {t("dashboard.courses.videoProgress.cardHint")}
                    </p>
                  </div>
                  <button
                    onClick={openVideoProgressView}
                    className="px-3 py-1.5 bg-brand text-white rounded-xl text-xs font-semibold"
                  >
                    {t("dashboard.courses.videoProgress.view")}
                  </button>
                </div>
              </div>
            )}

            {currentUserRole === "student" && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowRedeemModal(true)}
                  className="px-4 py-2 bg-violet-100 text-brand rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <HiOutlineKey /> Redeem a Code
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chapter Item Student Access Modal */}
        {itemAccessTarget && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeItemAccessModal}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2e0854]">
                    {t("dashboard.courses.itemAccess")}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {itemAccessTarget.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t("dashboard.courses.itemAccessDesc")}
                  </p>
                </div>
                <button
                  onClick={closeItemAccessModal}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <HiOutlineX className="text-xl" />
                </button>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {t("dashboard.courses.grantAccess")}
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    searchStudentsForItemAccess(itemAccessSearchQuery);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <HiOutlineSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      value={itemAccessSearchQuery}
                      onChange={(e) => setItemAccessSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (itemAccessSearchResults.length > 0)
                          setShowItemAccessDropdown(true);
                      }}
                      placeholder={t(
                        "dashboard.courses.searchStudentsForAccess",
                      )}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-9 pe-3 py-2 text-xs focus:ring-2 focus:ring-red-100 focus:border-violet-200"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark shrink-0"
                  >
                    Search
                  </button>
                </form>

                {showItemAccessDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                    {itemAccessSearchResults.length > 0 ? (
                      itemAccessSearchResults.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleGrantItemAccess(student)}
                          disabled={itemAccessActionId === student.id}
                          className="w-full text-start px-4 py-2 text-xs hover:bg-gray-50 flex justify-between items-center border-b last:border-0"
                        >
                          <span>
                            <span className="font-medium">
                              {student.first_name} {student.last_name}
                            </span>
                            <span className="text-gray-400 ml-2">
                              {student.phone}
                            </span>
                          </span>
                          {itemAccessActionId === student.id ? (
                            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <HiOutlinePlusCircle className="text-brand-purple" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-gray-500 text-center">
                        {itemAccessSearchQuery.trim()
                          ? "No students found"
                          : t("dashboard.courses.searchStudentsForAccess")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs font-bold text-gray-500">
                  {t("dashboard.courses.itemAccess")} (
                  {itemUnlockedStudents.length})
                </p>
                {itemAccessLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : itemUnlockedStudents.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {itemUnlockedStudents.map((std) => (
                      <div
                        key={std.student_id}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[#2e0854] truncate">
                            {std.first_name} {std.last_name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {std.phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            {std.unlocked_via}
                          </span>
                          <button
                            onClick={() => handleRevokeItemAccess(std)}
                            disabled={itemAccessActionId === std.student_id}
                            className="p-1 text-gray-400 hover:text-brand-purple rounded transition-colors disabled:opacity-50"
                            title={t("dashboard.courses.revokeAccess")}
                          >
                            {itemAccessActionId === std.student_id ? (
                              <div className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <HiOutlineTrash className="text-sm" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic text-center py-2">
                    {t("dashboard.courses.noUnlockedStudents")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student Submission Modal */}
        {selectedItemForSubmission && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedItemForSubmission(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-lg">
                  {selectedItemForSubmission.title}
                </h3>
                <button
                  onClick={() => setSelectedItemForSubmission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiOutlineX className="text-xl" />
                </button>
              </div>
              {submissionSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-2 rounded text-xs">
                  {submissionSuccess}
                </div>
              )}
              {submissionError && (
                <div className="bg-violet-50 text-brand p-2 rounded text-xs">
                  {submissionError}
                </div>
              )}
              {selectedItemForSubmission.due_date && (
                <p
                  className={`text-xs ${isPastDueDate(selectedItemForSubmission.due_date) ? "text-brand-purple" : "text-gray-500"}`}
                >
                  Submission deadline:{" "}
                  {formatDueDate(selectedItemForSubmission.due_date)}
                </p>
              )}
              {existingSubmission?.status === "graded" ? (
                <div className="space-y-2">
                  <p className="text-sm">Your submission has been graded.</p>
                  <p>
                    <strong>Score:</strong> {existingSubmission.score} / max
                    score
                  </p>
                  <p>
                    <strong>Feedback:</strong>{" "}
                    {existingSubmission.feedback || "None"}
                  </p>
                </div>
              ) : isPastDueDate(selectedItemForSubmission.due_date) ? (
                <p className="text-sm text-brand-purple">
                  The submission deadline has passed. You can no longer submit
                  new work.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveSubmission(submissionStatus === "submitted");
                  }}
                  className="space-y-3"
                >
                  <textarea
                    rows="6"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Write your answer or assignment text here..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-red-100 focus:border-violet-200"
                  />
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Attach file (optional)
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setSubmissionFile(e.target.files[0])}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSubmission(false)}
                      disabled={submitting}
                      className="px-4 py-2 border rounded-xl text-sm"
                    >
                      Save Draft
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-brand text-white rounded-xl text-sm"
                    >
                      {submitting ? "Submitting..." : "Submit Final"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Redeem Code Modal */}
        {showRedeemModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRedeemModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-lg">
                  Redeem Access Code
                </h3>
                <button
                  onClick={() => setShowRedeemModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiOutlineX className="text-xl" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter code (e.g., ABCD-1234)"
                value={redeemCodeInput}
                onChange={(e) =>
                  setRedeemCodeInput(e.target.value.toUpperCase())
                }
                className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRedeemModal(false)}
                  className="px-4 py-2 border rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeemCode}
                  disabled={redeemLoading}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-sm"
                >
                  {redeemLoading
                    ? t("dashboard.common.processing")
                    : t("dashboard.courses.redeem")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== COURSE DIRECTORY ====================
  return (
    <div className="space-y-8 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.courses.title")}
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-light">
            {t("dashboard.courses.subtitle")}
          </p>
        </div>
        <button
          onClick={openCreateCourseForm}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-medium text-xs tracking-wide shadow-sm shadow-brand/10 transition-all transform hover:-translate-y-0.5 shrink-0"
        >
          <HiOutlinePlus className="text-base" />{" "}
          <span>{t("dashboard.courses.create")}</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {metrics.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {item.label}
                </p>
                <h3 className="text-2xl font-black text-[#2e0854] font-heading">
                  {item.count}
                </h3>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${item.color}`}
              >
                <Icon />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center overflow-x-auto gap-1 scrollbar-none pb-2 md:pb-0">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide capitalize transition-all shrink-0 ${
                activeFilter === filter
                  ? "bg-[#2e0854] text-white shadow-sm shadow-brand/20"
                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {statusFilterLabel(filter)}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <HiOutlineSearch className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("dashboard.courses.searchTitles")}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl ps-10 pe-4 py-2 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all"
            />
          </div>
          <button className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <HiOutlineFilter className="text-base" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const instructorName =
            `${course.instructor_first_name || ""} ${course.instructor_last_name || ""}`.trim();
          const primarySubject = course.subjects?.[0];
          return (
            <div
              key={course.id}
              onClick={() => navigate(`/dashboard/courses/${course.slug}`)}
              className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group cursor-pointer"
            >
              {course.cover_image_url && (
                <div
                  className="h-28 w-full bg-gray-100"
                  style={{
                    backgroundImage: `url(${getFileUrl(course.cover_image_url)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    {primarySubject && (
                      <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2 py-0.5 rounded-md tracking-wider uppercase">
                        {primarySubject.name}
                      </span>
                    )}
                    <p className="text-xs text-gray-400 font-mono">
                      {termLabel(course.term)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEditCourseForm(e, course)}
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.courses.edit")}
                    >
                      <HiOutlinePencil className="text-xs" />
                    </button>
                    <button
                      onClick={(e) =>
                        handleDeleteCourse(e, course.id, course.title)
                      }
                      className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                      title={t("dashboard.courses.deleteCourse")}
                    >
                      <HiOutlineTrash className="text-xs" />
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="font-heading text-base font-bold text-[#2e0854] tracking-tight group-hover:text-brand-purple transition-colors line-clamp-1">
                    {course.title}
                  </h4>
                  {course.description && (
                    <p className="text-xs text-gray-400 font-light mt-0.5 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 font-light mt-0.5">
                    {t("dashboard.courses.lead")}: {instructorName || "—"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <HiOutlineClock className="text-base text-gray-300" />
                    <span className="text-xs font-medium text-gray-500">
                      {termLabel(course.term)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <HiOutlineUserGroup className="text-base text-gray-300" />
                    <span className="text-xs font-medium text-gray-500">
                      {Number(course.price) > 0
                        ? `EGP ${course.price}`
                        : t("dashboard.common.free")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50/50 border-t border-gray-50 px-5 py-3 shrink-0 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded capitalize ${STATUS_STYLES[course.status] || "text-gray-400 bg-gray-100"}`}
                >
                  {statusFilterLabel(course.status)}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {course.slug}
                </span>
              </div>
            </div>
          );
        })}
        {courses.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <HiOutlineBookOpen className="text-4xl text-gray-200 mx-auto mb-3" />
            <h5 className="text-sm font-bold text-[#2e0854] font-heading">
              {t("dashboard.courses.noResults")}
            </h5>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 font-light">
              {t("dashboard.courses.noResultsHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesDashboard;
