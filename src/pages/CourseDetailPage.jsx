// src/pages/CourseDetailPage.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  HiOutlineClock,
  HiOutlineBookOpen,
  HiOutlineShieldCheck,
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineUser,
  HiOutlineVideoCamera,
  HiOutlineQuestionMarkCircle,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiOutlineX,
  HiOutlineEye,
  HiOutlinePencilAlt,
} from "react-icons/hi";
import { HiOutlinePlayCircle } from "react-icons/hi2";
import { api, getFileUrl } from "../api";
import { scrollToSection } from "../utils/scroll";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import SupportTicketsPanel from "../components/SupportTicketsPanel";
import PayOnlineButton from "../components/PayOnlineButton";

const ITEM_TYPE_ICONS = {
  vimeo_video: HiOutlinePlayCircle,
  assignment: HiOutlineDocumentText,
  quiz: HiOutlineQuestionMarkCircle,
  zoom_meeting: HiOutlineVideoCamera,
};

const STATUS_STYLES = {
  graded: "text-emerald-700 bg-emerald-50 border-emerald-200",
  submitted: "text-blue-700 bg-blue-50 border-blue-200",
  draft: "text-amber-700 bg-amber-50 border-amber-200",
  none: "text-gray-400 bg-gray-50 border-gray-200",
};

const CourseDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const enrollSectionRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");
  const [redeemMode, setRedeemMode] = useState("course");
  const [redeemTargetItem, setRedeemTargetItem] = useState(null);
  const [grades, setGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  const statusLabel = useCallback(
    (status) => t(`courseDetail.status.${status}`),
    [t],
  );

  const formatGradeScore = useCallback(
    (grade) => {
      if (grade.submission_status === "graded") {
        const score = Number(grade.score);
        const max = Number(grade.max_score) || 100;
        return `${score} / ${max}`;
      }
      return statusLabel(grade.submission_status || "none");
    },
    [statusLabel],
  );

  const loadCourse = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getCourseBySlug(slug);
      if (response.success) {
        setCourse(response.data);

        if (isAuthenticated && user?.role === "student") {
          const enrollRes = await api.getMyEnrollments();
          if (enrollRes.success) {
            const enrolled = enrollRes.data.some(
              (e) => Number(e.id) === Number(response.data.id),
            );
            setIsEnrolled(enrolled);
          } else {
            setIsEnrolled(false);
          }
        } else if (
          isAuthenticated &&
          ["admin", "instructor", "assistant"].includes(user?.role)
        ) {
          setIsEnrolled(true);
        } else {
          setIsEnrolled(false);
        }
      } else {
        setError(response.message || t("courseDetail.loadError"));
      }
    } catch (err) {
      setError(err.message || t("courseDetail.networkError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [slug, isAuthenticated, user]);

  const gradesByItemId = useMemo(() => {
    const map = {};
    grades.forEach((g) => {
      map[g.item_id] = g;
    });
    return map;
  }, [grades]);

  const scrollToEnroll = () => {
    scrollToSection("enroll");
  };

  useEffect(() => {
    const fetchGrades = async () => {
      if (!course || !isEnrolled || user?.role !== "student") return;
      setGradesLoading(true);
      try {
        const response = await api.getCourseGrades(course.id);
        if (response.success) {
          setGrades(response.data);
        }
      } catch (err) {
        console.error("Failed to load grades:", err);
      } finally {
        setGradesLoading(false);
      }
    };

    fetchGrades();
  }, [course, isEnrolled, user]);

  const openRedeemModal = (mode = "course", item = null) => {
    setRedeemMode(mode);
    setRedeemTargetItem(item);
    setRedeemCode("");
    setRedeemError("");
    setRedeemSuccess("");
    setShowRedeemModal(true);
  };

  const handleRedeemCode = async (e) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemError("");
    setRedeemSuccess("");
    try {
      const response = await api.redeemAccessCode(
        redeemCode,
        course?.id,
        redeemMode === "item" ? redeemTargetItem?.id : undefined,
      );
      if (response.success) {
        setRedeemSuccess(response.message);
        setShowRedeemModal(false);
        setRedeemCode("");
        setRedeemTargetItem(null);
        setRedeemMode("course");

        await loadCourse();

        if (response.data?.type === "chapter_item" && response.data?.item?.id) {
          navigate(`/courses/${slug}/preview/${response.data.item.id}`);
        }
        setTimeout(() => setRedeemSuccess(""), 5000);
      } else {
        setRedeemError(response.message || t("courseDetail.invalidCode"));
      }
    } catch (err) {
      setRedeemError(err.message || t("courseDetail.redeemError"));
    } finally {
      setRedeemLoading(false);
    }
  };

  const renderItem = (item) => {
    const Icon = ITEM_TYPE_ICONS[item.item_type] || HiOutlineBookOpen;
    const isFreePreview = !!item.is_preview_free;
    const isUnlocked = !!item.is_unlocked;
    const isAccessible =
      item.is_accessible ?? (isFreePreview || isEnrolled || isUnlocked);
    const isSequenceLocked = !isAccessible && !!item.sequence_locked;
    const canUnlockWithCode =
      !isSequenceLocked &&
      user?.role === "student" &&
      (item.requires_unlock_code || (!isAccessible && !isFreePreview && !isEnrolled));
    const isAssessment =
      item.item_type === "assignment" || item.item_type === "quiz";

    const gradeInfo =
      isAssessment && user?.role === "student" ? gradesByItemId[item.id] : null;
    const submissionStatus = gradeInfo?.submission_status || "none";

    return (
      <div
        key={item.id}
        className="px-4 py-2.5 flex items-center justify-between text-xs group hover:bg-gray-50/30 transition-colors cursor-pointer gap-2"
        onClick={() => {
          if (!isAccessible && canUnlockWithCode) {
            openRedeemModal("chapter_item", item);
          } else if (!isAccessible && !isSequenceLocked) {
            scrollToEnroll();
          }
        }}
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <Icon className="text-gray-400 text-base shrink-0" />
          <span className="text-gray-600 truncate">{item.title}</span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {isFreePreview && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {t("courseDetail.freePreview")}
            </span>
          )}
          {isUnlocked && !isEnrolled && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {t("courseDetail.unlocked")}
            </span>
          )}

          {isAccessible && isAssessment && user?.role === "student" && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${STATUS_STYLES[submissionStatus]}`}
            >
              {submissionStatus === "graded"
                ? formatGradeScore(gradeInfo)
                : statusLabel(submissionStatus)}
            </span>
          )}

          {isAccessible ? (
            <Link
              to={`/courses/${course.slug}/preview/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
            >
              {isFreePreview && !isEnrolled ? (
                <>
                  {t("courseDetail.preview")} <HiOutlineEye className="text-xs" />
                </>
              ) : isAssessment && user?.role === "student" ? (
                submissionStatus === "none" ? (
                  <>
                    {t("courseDetail.submit")}{" "}
                    <HiOutlinePencilAlt className="text-xs" />
                  </>
                ) : submissionStatus === "draft" ? (
                  <>
                    {t("courseDetail.continue")}{" "}
                    <HiOutlinePencilAlt className="text-xs" />
                  </>
                ) : (
                  <>
                    {t("courseDetail.view")} <HiOutlineEye className="text-xs" />
                  </>
                )
              ) : (
                <>
                  {t("courseDetail.viewContent")}{" "}
                  <HiOutlineEye className="text-xs" />
                </>
              )}
            </Link>
          ) : isSequenceLocked ? (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
              <HiOutlineLockClosed className="text-xs" />
              {item.sequence_lock_reason === "quiz_score_below_threshold" ||
              item.sequence_lock_reason === "quiz_not_submitted" ||
              item.sequence_lock_reason === "quiz_not_graded"
                ? t("courseDetail.sequenceLockedQuiz")
                : t("courseDetail.sequenceLockedAssignment")}
            </span>
          ) : canUnlockWithCode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openRedeemModal("chapter_item", item);
              }}
              className="text-[10px] font-semibold text-brand-purple bg-violet-50 px-2 py-0.5 rounded flex items-center gap-1 shrink-0 hover:bg-violet-100"
            >
              <HiOutlineKey className="text-xs" />
              {t("courseDetail.unlockWithCode")}
            </button>
          ) : (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
              <HiOutlineLockClosed className="text-xs" />
              {t("courseDetail.enrollToAccess")}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("courseDetail.loading")}
        </p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-20 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl space-y-4 animate-fadeIn">
        <h3 className="font-heading font-black text-lg text-[#2e0854]">
          {t("courseDetail.notFound")}
        </h3>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          {error || t("courseDetail.notFoundDesc")}
        </p>
        <Link
          to="/courses"
          className="inline-flex items-center space-x-2 text-xs font-bold text-brand-purple hover:text-brand"
        >
          <HiOutlineArrowLeft />
          <span>{t("courseDetail.returnToCatalog")}</span>
        </Link>
      </div>
    );
  }

  const {
    title,
    slug: courseSlug,
    term,
    description,
    subjects = [],
    academicLevels = [],
    curriculums = [],
    chapters = [],
    price,
    instructor_first_name,
    instructor_last_name,
    cover_image_url,
    enrolledCount = 0,
  } = course;

  const code = courseSlug?.split("-").slice(0, 2).join("-") || "CODE";
  const instructorName =
    `${instructor_first_name || ""} ${instructor_last_name || ""}`.trim();

  const assessmentGrades = grades.filter(
    (g) => g.item_type === "assignment" || g.item_type === "quiz",
  );
  const gradedCount = assessmentGrades.filter(
    (g) => g.submission_status === "graded",
  ).length;

  return (
    <div className="space-y-10 py-2 animate-fadeIn">
      <button
        onClick={() => navigate("/courses")}
        className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-[#2e0854] transition-colors"
      >
        <HiOutlineArrowLeft className="text-sm" />
        <span>{t("courseDetail.returnToCatalog")}</span>
      </button>

      <div
        className="bg-[#2e0854] rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
        style={
          cover_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(43,2,7,0.85), rgba(43,2,7,0.85)), url(${getFileUrl(cover_image_url)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md font-mono text-gray-300 bg-white/10">
              {code}
            </span>
            {subjects.length > 0 && (
              <span className="text-[10px] font-mono tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 rounded">
                {subjects.map((s) => s.name).join(", ")}
              </span>
            )}
            <span className="text-[10px] font-mono tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 rounded">
              {term || t("courseDetail.generalTerm")}
            </span>
          </div>
          <h1 className="text-3xl font-black font-heading leading-tight sm:text-4xl">
            {title}
          </h1>
          <p className="text-xs text-red-100/70 font-light max-w-xl leading-relaxed">
            {description}
          </p>
        </div>
        <div className="bg-white/10 border border-white/5 px-4 py-3 rounded-xl text-center min-w-[120px] shrink-0 self-start sm:self-center">
          <span className="text-[9px] text-red-300 uppercase font-bold tracking-wider block">
            {t("courseDetail.price")}
          </span>
          <span className="text-2xl font-heading font-black text-white font-mono">
            {Number(price) > 0 ? `EGP ${price}` : t("common.free")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#2e0854]">
                  {t("courseDetail.chaptersTitle")}
                </h3>
                <p className="text-[11px] text-gray-400 font-light">
                  {t("courseDetail.chaptersDesc")}
                  {gradesLoading && (
                    <span className="text-gray-300">
                      {" "}
                      {t("courseDetail.loadingGrades")}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-xs text-gray-400">
                {t("courseDetail.enrolledCount", { count: enrolledCount })}
              </div>
            </div>

            {!isAuthenticated && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-center justify-between">
                <span>🔒 {t("courseDetail.loginRequired")}</span>
                <Link
                  to="/login"
                  className="font-bold text-brand-purple hover:underline"
                >
                  {t("courseDetail.logIn")}
                </Link>
              </div>
            )}
            {isAuthenticated && user?.role === "student" && !isEnrolled && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-center justify-between">
                <span>🔒 {t("courseDetail.notEnrolled")}</span>
                <button
                  onClick={() => setShowRedeemModal(true)}
                  className="font-bold text-brand-purple hover:underline flex items-center gap-1"
                >
                  <HiOutlineKey className="text-sm" />{" "}
                  {t("courseDetail.enrollWithCode")}
                </button>
              </div>
            )}

            {chapters && chapters.length > 0 ? (
              chapters.map((chapter, idx) => (
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
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded text-gray-400 bg-gray-100">
                      {t("courseDetail.itemsCount", {
                        count: chapter.items?.length || 0,
                      })}
                    </span>
                  </div>
                  {chapter.items && chapter.items.length > 0 && (
                    <div className="divide-y divide-gray-50">
                      {chapter.items.map((item) => renderItem(item))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                <p className="text-xs text-gray-400 font-light">
                  {t("courseDetail.noChapters")}
                </p>
              </div>
            )}
          </div>

          {isEnrolled && user?.role === "student" && course && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <SupportTicketsPanel
                key={course.id}
                channel="course"
                userRole="student"
                currentUserId={user.id}
                allowCreate
                canManageMeta={false}
                showCreatorInfo={false}
                fixedCourseId={course.id}
                fixedCourseTitle={course.title}
                compact
              />
            </div>
          )}
        </div>

        <div className="space-y-6" id="enroll" ref={enrollSectionRef}>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-400">
              {t("courseDetail.courseInfo")}
            </h3>
            <div className="space-y-3 pt-1 text-xs">
              <div className="flex items-center space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                <HiOutlineUser className="text-gray-400 text-base shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                    {t("courseDetail.instructor")}
                  </p>
                  <span className="font-bold text-[#2e0854]">
                    {instructorName || "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                <HiOutlineBookOpen className="text-gray-400 text-base shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                    {t("courseDetail.term")}
                  </p>
                  <span className="font-medium text-gray-600">{term}</span>
                </div>
              </div>
              {academicLevels && academicLevels.length > 0 && (
                <div className="flex items-start space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                  <HiOutlineCheckCircle className="text-gray-400 text-base shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">
                      {t("courseDetail.academicLevels")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {academicLevels.map((lvl) => (
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
              {curriculums && curriculums.length > 0 && (
                <div className="flex items-start space-x-3 p-2.5 bg-gray-50/50 rounded-xl border border-transparent">
                  <HiOutlineShieldCheck className="text-gray-400 text-base shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">
                      {t("courseDetail.curriculums")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {curriculums.map((cur) => (
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

          {isEnrolled && user?.role === "student" && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-[#2e0854]">
                  {t("courseDetail.myGrades")}
                </h3>
                {!gradesLoading && assessmentGrades.length > 0 && (
                  <span className="text-[10px] font-bold text-gray-400">
                    {t("courseDetail.gradedProgress", {
                      graded: gradedCount,
                      total: assessmentGrades.length,
                    })}
                  </span>
                )}
              </div>

              {gradesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : assessmentGrades.length === 0 ? (
                <p className="text-[11px] text-gray-400">
                  {t("courseDetail.noAssessments")}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {assessmentGrades.map((grade) => {
                    const Icon =
                      grade.item_type === "quiz"
                        ? HiOutlineQuestionMarkCircle
                        : HiOutlineDocumentText;
                    return (
                      <div
                        key={grade.item_id}
                        className="flex items-start justify-between gap-2 p-2.5 bg-gray-50/50 rounded-xl border border-transparent"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <Icon className="text-gray-400 text-sm shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#2e0854] truncate">
                              {grade.title}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {grade.item_type === "quiz"
                                ? t("courseDetail.itemTypes.quiz")
                                : t("courseDetail.itemTypes.assignment")}
                            </p>
                            {grade.feedback && (
                              <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                                {grade.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                            STATUS_STYLES[grade.submission_status] ||
                            STATUS_STYLES.none
                          }`}
                        >
                          {formatGradeScore(grade)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-[#2e0854]">
              {t("courseDetail.syllabusResources")}
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-brand-purple flex items-center justify-center text-sm border border-violet-100/40 shrink-0">
                  <HiOutlineDocumentText />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-[#2e0854] font-heading">
                    {t("courseDetail.specSheetTitle")}
                  </h4>
                  <p className="text-[11px] text-gray-400 font-light leading-relaxed mt-0.5">
                    {t("courseDetail.specSheetDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-brand-purple flex items-center justify-center text-sm border border-violet-100/40 shrink-0">
                  <HiOutlineShieldCheck />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-[#2e0854] font-heading">
                    {t("courseDetail.accreditationTitle")}
                  </h4>
                  <p className="text-[11px] text-gray-400 font-light leading-relaxed mt-0.5">
                    {t("courseDetail.accreditationDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
              <Link
                to="/login"
                className="w-full inline-block px-4 py-3 bg-brand hover:bg-brand-dark text-white text-sm font-bold rounded-xl transition-all"
              >
                {t("courseDetail.loginToEnroll")}
              </Link>
            </div>
          )}
          {isAuthenticated && user?.role === "student" && !isEnrolled && (
            <div
              ref={enrollSectionRef}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center space-y-3"
            >
              {Number(course.price) > 0 && (
                <PayOnlineButton
                  itemType="course"
                  itemId={course.id}
                  amount={course.price}
                  currency="EGP"
                  onPaid={loadCourse}
                />
              )}
              <button
                onClick={() => openRedeemModal("course")}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                <HiOutlineKey className="text-base" />
                {t("courseDetail.enrollWithAccessCode")}
              </button>
              <p className="text-[10px] text-gray-400">
                {t("courseDetail.enrollHint")}
              </p>
            </div>
          )}
          {isEnrolled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-xs text-emerald-700">
              <HiOutlineCheckCircle className="text-xl mx-auto mb-1" />
              <span className="font-bold">✅ {t("courseDetail.enrolledTitle")}</span>
              <p className="mt-1">{t("courseDetail.enrolledDesc")}</p>
            </div>
          )}
        </div>
      </div>

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
              <h3 className="font-heading font-bold text-lg text-[#2e0854]">
                {redeemMode === "chapter_item"
                  ? t("courseDetail.unlockLessonTitle")
                  : t("courseDetail.enrollModalTitle")}
              </h3>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiOutlineX className="text-xl" />
              </button>
            </div>
            {redeemError && (
              <div className="bg-violet-50 border border-violet-200 text-brand p-3 rounded-xl text-sm">
                ⚠️ {redeemError}
              </div>
            )}
            {redeemSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">
                ✅ {redeemSuccess}
              </div>
            )}
            <form onSubmit={handleRedeemCode} className="space-y-4">
              {redeemMode === "chapter_item" && redeemTargetItem && (
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3">
                  {t("courseDetail.unlocking")}{" "}
                  <span className="font-semibold text-[#2e0854]">
                    {redeemTargetItem.title}
                  </span>
                </p>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  {t("courseDetail.enterCode")}
                </label>
                <input
                  type="text"
                  placeholder={t("courseDetail.codePlaceholder")}
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-violet-200"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-3 rounded-xl transition-all"
                >
                  {t("courseDetail.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={redeemLoading || !redeemCode.trim()}
                  className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-3 rounded-xl transition-all"
                >
                  {redeemLoading
                    ? t("courseDetail.processing")
                    : redeemMode === "chapter_item"
                      ? t("courseDetail.unlockLesson")
                      : t("courseDetail.enrollNow")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailPage;
