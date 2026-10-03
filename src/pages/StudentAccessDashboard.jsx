import React, { useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { useConfirm, useToast } from "../context/FeedbackContext";
import { api } from "../api";
import {
  HiOutlineAdjustments,
  HiOutlineSearch,
  HiOutlinePlay,
  HiOutlineDocumentText,
  HiOutlineQuestionMarkCircle,
  HiOutlineVideoCamera,
  HiOutlineBookOpen,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineRefresh,
} from "react-icons/hi";

const ITEM_TYPE_ICONS = {
  vimeo_video: HiOutlinePlay,
  assignment: HiOutlineDocumentText,
  quiz: HiOutlineQuestionMarkCircle,
  zoom_meeting: HiOutlineVideoCamera,
};

const fillTemplate = (template, vars = {}) =>
  Object.entries(vars).reduce(
    (str, [key, value]) => str.replace(`{{${key}}}`, value),
    template,
  );

const StudentAccessDashboard = () => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [access, setAccess] = useState(null); // { student, chapters }
  const [accessLoading, setAccessLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState(null);

  const searchStudents = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await api.getAllUsers({
        role: "student",
        search: query.trim(),
        limit: 10,
      });
      setSearchResults(res.success ? res.data : []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedCourse(null);
    setAccess(null);
    setError("");

    if (!student.student_record_id) {
      setEnrollments([]);
      return;
    }

    setEnrollmentsLoading(true);
    try {
      const res = await api.getStudentEnrollments(student.id);
      setEnrollments(res.success ? res.data : []);
    } catch {
      setEnrollments([]);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    setAccess(null);
    setError("");
    setAccessLoading(true);
    try {
      const res = await api.getStudentCourseAccess(
        course.id,
        selectedStudent.student_record_id,
      );
      if (res.success) {
        setAccess(res.data);
      } else {
        setError(res.message || t("dashboard.studentAccess.loadAccessFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.studentAccess.loadAccessFailed"));
    } finally {
      setAccessLoading(false);
    }
  };

  const refetchAccess = async () => {
    if (!selectedCourse || !selectedStudent) return;
    try {
      const res = await api.getStudentCourseAccess(
        selectedCourse.id,
        selectedStudent.student_record_id,
      );
      if (res.success) setAccess(res.data);
    } catch {
      /* keep showing the stale data rather than clearing it */
    }
  };

  const handleUnlock = async (item) => {
    const ok = await confirm({
      message: fillTemplate(t("dashboard.studentAccess.unlockConfirm"), {
        title: item.title,
      }),
      confirmLabel: t("dashboard.studentAccess.unlockAction"),
      cancelLabel: t("dashboard.studentAccess.cancelAction"),
    });
    if (!ok) return;
    setActionKey(`unlock-${item.id}`);
    try {
      const res = await api.unlockChapterItemForStudent(
        item.id,
        selectedStudent.student_record_id,
      );
      if (res.success) {
        toast.success(t("dashboard.studentAccess.unlockSuccess"));
        await refetchAccess();
      } else {
        toast.error(res.message || t("dashboard.studentAccess.actionFailed"));
      }
    } catch (err) {
      toast.error(err.message || t("dashboard.studentAccess.actionFailed"));
    } finally {
      setActionKey(null);
    }
  };

  const handleRevoke = async (item) => {
    const ok = await confirm({
      message: fillTemplate(t("dashboard.studentAccess.revokeConfirm"), {
        title: item.title,
      }),
      confirmLabel: t("dashboard.studentAccess.revokeAction"),
      cancelLabel: t("dashboard.studentAccess.cancelAction"),
      tone: "danger",
    });
    if (!ok) return;
    setActionKey(`revoke-${item.id}`);
    try {
      const res = await api.lockChapterItemForStudent(
        item.id,
        selectedStudent.student_record_id,
      );
      if (res.success) {
        toast.success(t("dashboard.studentAccess.revokeSuccess"));
        await refetchAccess();
      } else {
        toast.error(res.message || t("dashboard.studentAccess.actionFailed"));
      }
    } catch (err) {
      toast.error(err.message || t("dashboard.studentAccess.actionFailed"));
    } finally {
      setActionKey(null);
    }
  };

  const handleRepeatQuiz = async (item) => {
    const ok = await confirm({
      message: fillTemplate(t("dashboard.studentAccess.repeatQuizConfirm"), {
        title: item.title,
      }),
      confirmLabel: t("dashboard.studentAccess.repeatQuizAction"),
      cancelLabel: t("dashboard.studentAccess.cancelAction"),
      tone: "danger",
    });
    if (!ok) return;
    setActionKey(`repeat-${item.id}`);
    try {
      const res = await api.resetQuizAttemptForStudent(
        item.id,
        selectedStudent.student_record_id,
      );
      if (res.success) {
        toast.success(t("dashboard.studentAccess.repeatQuizSuccess"));
        await refetchAccess();
      } else {
        toast.error(res.message || t("dashboard.studentAccess.actionFailed"));
      }
    } catch (err) {
      toast.error(err.message || t("dashboard.studentAccess.actionFailed"));
    } finally {
      setActionKey(null);
    }
  };

  const renderQuizProgress = (progress) => {
    if (!progress || (progress.answerCount === 0 && !progress.hasAttempt)) {
      return (
        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
          {t("dashboard.studentAccess.quizNotStarted")}
        </span>
      );
    }
    // A timed quiz whose countdown ran out before any answer made it to the
    // server (a slow connection, or the window closing mid-submit) leaves a
    // quiz_attempts row with zero saved answers — that's a *started and
    // stuck* attempt, not "not started", and it needs the same "Allow
    // repeat" as a normal attempt (below), which is keyed off this same
    // hasAttempt flag rather than answerCount alone.
    if (progress.answerCount === 0 && progress.hasAttempt) {
      return (
        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">
          {t("dashboard.studentAccess.quizExpiredNoAnswers")}
        </span>
      );
    }
    if (progress.fullyGraded && progress.percentage !== null) {
      return (
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
          {fillTemplate(t("dashboard.studentAccess.quizGraded"), {
            percentage: Math.round(progress.percentage),
          })}
        </span>
      );
    }
    if (progress.gradedCount === 0) {
      return (
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
          {t("dashboard.studentAccess.quizSubmittedUngraded")}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
        {fillTemplate(t("dashboard.studentAccess.quizInProgress"), {
          answered: progress.answerCount,
          total: progress.answerCount,
        })}
      </span>
    );
  };

  const renderItem = (item) => {
    const Icon = ITEM_TYPE_ICONS[item.item_type] || HiOutlineBookOpen;
    const isUnlocking = actionKey === `unlock-${item.id}`;
    const isRevoking = actionKey === `revoke-${item.id}`;
    const isRepeating = actionKey === `repeat-${item.id}`;

    return (
      <div
        key={item.id}
        className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap text-xs hover:bg-gray-50/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="text-gray-400 text-base shrink-0" />
          <span className="text-gray-700 font-medium truncate">
            {item.title}
          </span>
          {item.is_unlocked && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0">
              {t("dashboard.studentAccess.unlocked")}
            </span>
          )}
          {!item.is_unlocked && item.sequence_locked && (
            <span
              className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded shrink-0"
              title={
                item.sequence_lock_blocking_title
                  ? fillTemplate(
                      t("dashboard.studentAccess.sequenceLockedFor"),
                      { title: item.sequence_lock_blocking_title },
                    )
                  : undefined
              }
            >
              {t("dashboard.studentAccess.sequenceLocked")}
            </span>
          )}
          {item.item_type === "quiz" && renderQuizProgress(item.quiz_progress)}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.item_type === "quiz" &&
            (item.quiz_progress?.answerCount > 0 ||
              item.quiz_progress?.hasAttempt) && (
            <button
              type="button"
              onClick={() => handleRepeatQuiz(item)}
              disabled={isRepeating}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand-purple hover:underline disabled:opacity-50"
            >
              <HiOutlineRefresh className={isRepeating ? "animate-spin" : ""} />
              {t("dashboard.studentAccess.repeatQuizAction")}
            </button>
          )}
          {item.is_unlocked ? (
            <button
              type="button"
              onClick={() => handleRevoke(item)}
              disabled={isRevoking}
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50"
            >
              <HiOutlineLockClosed />
              {t("dashboard.studentAccess.revokeAction")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleUnlock(item)}
              disabled={isUnlocking}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline disabled:opacity-50"
            >
              <HiOutlineLockOpen />
              {t("dashboard.studentAccess.unlockAction")}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
      <div>
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {t("dashboard.studentAccess.badge")}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3 flex items-center gap-2">
          <HiOutlineAdjustments className="text-brand-purple" />
          {t("dashboard.studentAccess.title")}
        </h1>
        <p className="text-sm text-gray-400 font-light mt-2 max-w-2xl">
          {t("dashboard.studentAccess.subtitle")}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Student search */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
          {t("dashboard.studentAccess.searchLabel")}
        </label>
        <div className="relative">
          <div className="flex items-center gap-2 bg-gray-50/70 border border-transparent focus-within:border-violet-200 rounded-2xl px-4 py-3 focus-within:ring-4 focus-within:ring-violet-100/50 focus-within:bg-white transition-all">
            <HiOutlineSearch className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchStudents(e.target.value);
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder={t("dashboard.studentAccess.searchPlaceholder")}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-2xl shadow-lg max-h-64 overflow-y-auto">
              {searching ? (
                <div className="px-4 py-3 text-xs text-gray-400">…</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => selectStudent(student)}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-violet-50/60 flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-gray-700">
                      {student.first_name} {student.last_name}
                    </span>
                    <span className="text-gray-400">{student.phone}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-gray-400">
                  {searchQuery.trim()
                    ? t("dashboard.studentAccess.noResults")
                    : t("dashboard.studentAccess.searchHint")}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="flex items-center justify-between bg-violet-50/60 border border-violet-100 rounded-2xl px-4 py-2.5">
            <div className="text-xs">
              <span className="font-bold text-brand-purple">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </span>
              <span className="text-gray-400 ml-2">
                {selectedStudent.phone}
              </span>
            </div>
            {!selectedStudent.student_record_id && (
              <span className="text-[10px] font-bold text-red-500">
                {t("dashboard.studentAccess.noStudentProfile")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Course picker */}
      {selectedStudent && selectedStudent.student_record_id && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {t("dashboard.studentAccess.enrolledCourses")}
          </h3>
          {enrollmentsLoading ? (
            <p className="text-xs text-gray-400">
              {t("dashboard.studentAccess.loadingEnrollments")}
            </p>
          ) : enrollments.length === 0 ? (
            <p className="text-xs text-gray-400">
              {t("dashboard.studentAccess.noEnrollments")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enrollments.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => selectCourse(course)}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors ${
                    selectedCourse?.id === course.id
                      ? "bg-brand text-white border-brand"
                      : "bg-gray-50/70 text-gray-600 border-transparent hover:border-violet-200"
                  }`}
                >
                  {course.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Course content access */}
      {selectedCourse && (
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          {accessLoading ? (
            <div className="p-8 text-center text-xs text-gray-400">
              {t("dashboard.studentAccess.loadingAccess")}
            </div>
          ) : !access || access.chapters.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              {t("dashboard.studentAccess.noChapters")}
            </div>
          ) : (
            access.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="border-b border-gray-50 last:border-b-0"
              >
                <div className="px-4 py-2.5 bg-gray-50/50 text-xs font-bold text-gray-500">
                  {chapter.title}
                </div>
                <div className="divide-y divide-gray-50">
                  {chapter.items.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-300">—</div>
                  ) : (
                    chapter.items.map(renderItem)
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAccessDashboard;
