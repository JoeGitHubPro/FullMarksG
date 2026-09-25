import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { api, getFileUrl } from "../api";
import {
  HiOutlineQuestionMarkCircle,
  HiOutlineCalendar,
  HiOutlineDownload,
  HiOutlineArrowLeft,
  HiOutlinePencil,
} from "react-icons/hi";

const QuizzesDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Grading view states (using quiz answers)
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingAnswerId, setGradingAnswerId] = useState(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  // null = show the grades table for the whole quiz; otherwise the user_id
  // whose individual answers are being reviewed.
  const [viewingStudentId, setViewingStudentId] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // ----- Fetch current user and role -----
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.getMe();
      if (!res.success) {
        setError(t("dashboard.common.loadFailed"));
        setLoading(false);
        return;
      }

      const userData = res.data;
      setCurrentUserRole(userData.role);

      let user = { ...userData };
      if (userData.role === "student") {
        user = { ...userData, student_id: userData.roleData?.id };
      } else if (userData.role === "instructor") {
        user = {
          ...userData,
          instructor_record_id: userData.roleData?.id,
        };
      } else if (userData.role === "assistant") {
        user = {
          ...userData,
          assistant_data: userData.roleData,
        };
      }

      setCurrentUser(user);
      await fetchQuizzes(user);
    } catch (err) {
      setError(err.message || t("dashboard.common.loadFailed"));
      setLoading(false);
    }
  };

  // ----- Fetch quizzes for all roles -----
  const fetchQuizzes = async (user) => {
    setLoading(true);
    setError("");
    try {
      let allQuizzes = [];

      if (user.role === "student") {
        let enrolledCourseIds = [];
        try {
          const enrollmentsRes = await api.getMyEnrollments();
          if (enrollmentsRes.success && Array.isArray(enrollmentsRes.data)) {
            enrolledCourseIds = enrollmentsRes.data.map((e) => e.course_id);
          }
        } catch (err) {
          console.warn("getMyEnrollments failed", err);
        }

        const coursesRes = await api.getAllCourses({
          status: "published",
          limit: 200,
        });
        if (coursesRes.success) {
          let relevantCourses = coursesRes.data;
          if (enrolledCourseIds.length > 0) {
            relevantCourses = relevantCourses.filter((c) =>
              enrolledCourseIds.includes(c.id),
            );
          }
          for (const course of relevantCourses) {
            const courseDetail = await api.getCourseBySlug(course.slug);
            if (courseDetail.success) {
              const quizzesFromCourse = extractQuizzes(courseDetail.data);
              allQuizzes.push(...quizzesFromCourse);
            }
          }
        }
      } else if (user.role === "instructor") {
        const instructorId = user.instructor_record_id;
        if (instructorId) {
          const coursesRes = await api.getAllCourses({
            instructorId,
            limit: 200,
          });
          if (coursesRes.success) {
            // The API already filters by instructorId, but we'll double‑check
            const instructorCourses = coursesRes.data.filter(
              (course) => course.instructor_id === instructorId,
            );
            for (const course of instructorCourses) {
              const courseDetail = await api.getCourseBySlug(course.slug);
              if (courseDetail.success) {
                const quizzesFromCourse = extractQuizzes(courseDetail.data);
                allQuizzes.push(...quizzesFromCourse);
              }
            }
          }
        }
        // If instructorId is missing, we just get no quizzes – no error.
      } else if (user.role === "assistant") {
        const instructorId = user.assistant_data?.assigned_instructor_id;
        if (instructorId) {
          const coursesRes = await api.getAllCourses({
            instructorId,
            limit: 200,
          });
          if (coursesRes.success) {
            const instructorCourses = coursesRes.data.filter(
              (course) => course.instructor_id === instructorId,
            );
            for (const course of instructorCourses) {
              const courseDetail = await api.getCourseBySlug(course.slug);
              if (courseDetail.success) {
                const quizzesFromCourse = extractQuizzes(courseDetail.data);
                allQuizzes.push(...quizzesFromCourse);
              }
            }
          }
        }
        // No instructor assigned – no quizzes.
      } else if (user.role === "admin") {
        const coursesRes = await api.getAllCourses({ limit: 200 });
        if (coursesRes.success) {
          for (const course of coursesRes.data) {
            const courseDetail = await api.getCourseBySlug(course.slug);
            if (courseDetail.success) {
              const quizzesFromCourse = extractQuizzes(courseDetail.data);
              allQuizzes.push(...quizzesFromCourse);
            }
          }
        }
      }

      setQuizzes(allQuizzes);
    } catch (err) {
      setError(err.message || t("dashboard.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ----- Extract quiz items from course structure -----
  const extractQuizzes = (course) => {
    const items = [];
    if (course.chapters && Array.isArray(course.chapters)) {
      for (const chapter of course.chapters) {
        if (chapter.items && Array.isArray(chapter.items)) {
          for (const item of chapter.items) {
            if (item.item_type === "quiz") {
              items.push({
                ...item,
                courseTitle: course.title,
                courseSlug: course.slug,
                chapterTitle: chapter.title,
                dueDate: item.due_date,
                maxScore: item.max_score,
                timeLimit: item.time_limit_minutes,
              });
            }
          }
        }
      }
    }
    return items;
  };

  // ----- Fetch answers for a quiz using the new quiz API -----
  const fetchAnswersForQuiz = async (quiz) => {
    setGradingLoading(true);
    try {
      const res = await api.getQuizAnswers(quiz.id);
      if (res.success && Array.isArray(res.data)) {
        setAnswers(res.data);
      } else {
        setAnswers([]);
      }
    } catch (err) {
      console.error(err);
      setAnswers([]);
    } finally {
      setGradingLoading(false);
    }
  };

  // ----- Grade a single answer using the new quiz API -----
  const handleGradeAnswer = async (answerId) => {
    if (!gradeScore) return;
    setGradingLoading(true);
    try {
      const res = await api.gradeQuizAnswer(
        answerId,
        parseFloat(gradeScore),
        gradeFeedback,
      );
      if (res.success) {
        alert(t("dashboard.common.gradeSaved"));
        setGradingAnswerId(null);
        setGradeScore("");
        setGradeFeedback("");
        await fetchAnswersForQuiz(selectedQuiz);
      } else {
        alert(res.message || t("dashboard.common.gradingFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGradingLoading(false);
    }
  };

  // ----- Filter quizzes list -----
  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ==================== GRADING FULL‑PAGE VIEW ====================
  if (selectedQuiz) {
    // Group answers by student, plus the total grade earned so far.
    const grouped = answers.reduce((acc, ans) => {
      const key = ans.user_id;
      if (!acc[key]) {
        acc[key] = {
          user_id: key,
          student_name:
            `${ans.first_name || ""} ${ans.last_name || ""}`.trim() ||
            `Student #${key}`,
          answers: [],
        };
      }
      acc[key].answers.push(ans);
      return acc;
    }, {});

    Object.values(grouped).forEach((group) => {
      group.totalMax = group.answers.reduce(
        (sum, a) => sum + (parseFloat(a.max_score) || 0),
        0,
      );
      group.totalScore = group.answers.reduce(
        (sum, a) =>
          sum + (a.score !== null && a.score !== undefined ? parseFloat(a.score) : 0),
        0,
      );
      group.allGraded = group.answers.every(
        (a) => a.score !== null && a.score !== undefined,
      );
      group.anyGraded = group.answers.some(
        (a) => a.score !== null && a.score !== undefined,
      );
    });

    const viewingStudent = viewingStudentId
      ? grouped[viewingStudentId]
      : null;

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (viewingStudentId) {
                setViewingStudentId(null);
              } else {
                setSelectedQuiz(null);
                setAnswers([]);
                setGradingAnswerId(null);
              }
            }}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>
              {viewingStudentId
                ? t("dashboard.quizzes.backToGrades")
                : `${t("dashboard.common.back")} ${t("dashboard.nav.quizzes")}`}
            </span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-6">
          <div className="border-b border-gray-50 pb-4 text-start">
            <h1 className="text-2xl font-black font-heading tracking-tight">
              {viewingStudent
                ? viewingStudent.student_name
                : t("dashboard.quizzes.gradeTitle", { title: selectedQuiz.title })}
            </h1>
            <p className="text-gray-400 text-sm font-light mt-1">
              {viewingStudent
                ? t("dashboard.quizzes.gradeTitle", { title: selectedQuiz.title })
                : t("dashboard.quizzes.gradeSubtitle")}
            </p>
          </div>

          {gradingLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : answers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {t("dashboard.common.noAnswers")}
            </div>
          ) : viewingStudent ? (
            <div className="space-y-6">
              {(() => {
                const group = viewingStudent;
                return (
                  <div
                    key={group.user_id}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                      <span className="font-bold text-[#2e0854] text-start">
                        {group.student_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {group.answers.length} {t("dashboard.quizzes.answers")}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.answers.map((ans) => {
                      const isGraded =
                        ans.score !== null && ans.score !== undefined;
                      const maxScore =
                        ans.max_score || selectedQuiz.maxScore || 10;

                      return (
                        <div key={ans.id} className="px-5 py-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1 flex-1 text-start">
                              <p className="text-xs font-bold text-gray-500">
                                {t("dashboard.quizzes.question")}:{" "}
                                {ans.question_text}
                              </p>
                              {ans.answer_text && (
                                <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 whitespace-pre-wrap">
                                  {ans.answer_text}
                                </div>
                              )}
                              {ans.selected_option_text && (
                                <div className="bg-gray-50 p-2 rounded text-sm text-gray-700">
                                  {t("dashboard.quizzes.selected")}:{" "}
                                  {ans.selected_option_text}
                                </div>
                              )}
                              {ans.file_path && (
                                <a
                                  href={getFileUrl(ans.file_path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-brand-purple hover:text-brand"
                                >
                                  <HiOutlineDownload />{" "}
                                  {t("dashboard.assignments.downloadAttachment")}
                                </a>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {t("dashboard.assignments.submitted")}:{" "}
                                {new Date(ans.submitted_at).toLocaleString()}
                              </p>
                              {isGraded && (
                                <div className="flex items-center gap-3 text-xs mt-1">
                                  <span className="text-emerald-700 font-bold">
                                    {t("dashboard.common.score")}: {ans.score} /{" "}
                                    {maxScore}
                                  </span>
                                  {ans.feedback && (
                                    <span className="text-gray-600">
                                      {t("dashboard.common.feedback")}:{" "}
                                      {ans.feedback}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {!isGraded && (
                              <button
                                onClick={() => {
                                  setGradingAnswerId(ans.id);
                                  setGradeScore("");
                                  setGradeFeedback("");
                                }}
                                className="ms-4 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 shrink-0"
                              >
                                <HiOutlinePencil className="inline me-1" />{" "}
                                {t("dashboard.common.grade")}
                              </button>
                            )}
                          </div>

                          {gradingAnswerId === ans.id && !isGraded && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-start">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">
                                  {t("dashboard.common.score")} (
                                  {t("dashboard.assignments.maxScore")}{" "}
                                  {maxScore})
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={t("dashboard.common.score")}
                                  value={gradeScore}
                                  onChange={(e) =>
                                    setGradeScore(e.target.value)
                                  }
                                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">
                                  {t("dashboard.common.feedback")}
                                </label>
                                <textarea
                                  rows="2"
                                  placeholder={t(
                                    "dashboard.common.feedbackPlaceholder",
                                  )}
                                  value={gradeFeedback}
                                  onChange={(e) =>
                                    setGradeFeedback(e.target.value)
                                  }
                                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setGradingAnswerId(null)}
                                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                                >
                                  {t("dashboard.common.back")}
                                </button>
                                <button
                                  onClick={() => handleGradeAnswer(ans.id)}
                                  className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark"
                                >
                                  {t("dashboard.common.save")}{" "}
                                  {t("dashboard.common.grade")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="py-2 px-3 text-start">
                      {t("dashboard.quizzes.studentName")}
                    </th>
                    <th className="py-2 px-3 text-start">
                      {t("dashboard.quizzes.gradeColumn")}
                    </th>
                    <th className="py-2 px-3 text-start">
                      {t("dashboard.common.status")}
                    </th>
                    <th className="py-2 px-3 text-end">
                      {t("dashboard.common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(grouped).map((group) => (
                    <tr
                      key={group.user_id}
                      className="border-b border-gray-50 hover:bg-gray-50/60"
                    >
                      <td className="py-3 px-3 font-semibold text-start">
                        {group.student_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-start">
                        {group.anyGraded
                          ? `${group.totalScore} / ${group.totalMax}`
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-start">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            group.allGraded
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {group.allGraded
                            ? t("dashboard.quizzes.gradedStatus")
                            : t("dashboard.quizzes.pendingGrading")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end">
                        <button
                          onClick={() => setViewingStudentId(group.user_id)}
                          className="text-xs font-semibold text-brand-purple hover:underline"
                        >
                          {t("dashboard.quizzes.viewDetails")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== QUIZ DASHBOARD LIST ====================
  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.quizzes.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-start">
          <h1 className="text-2xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.quizzes.title")}
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-light">
            {currentUserRole !== "student"
              ? t("dashboard.quizzes.subtitleAdmin")
              : t("dashboard.quizzes.subtitleUser")}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("dashboard.common.searchByTitle")}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <HiOutlineQuestionMarkCircle className="text-purple-500 text-xl shrink-0" />
                  <h3 className="font-heading font-bold text-[#2e0854] line-clamp-1 text-start">
                    {quiz.title}
                  </h3>
                </div>
                {quiz.dueDate && new Date(quiz.dueDate) < new Date() && (
                  <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2 py-0.5 rounded shrink-0">
                    {t("dashboard.common.overdue")}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 text-start">
                {t("dashboard.assignments.course")}:{" "}
                <span className="font-medium text-gray-700">
                  {quiz.courseTitle}
                </span>
              </p>
              <p className="text-xs text-gray-500 text-start">
                {t("dashboard.assignments.chapter")}: {quiz.chapterTitle}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                {quiz.dueDate && (
                  <div className="flex items-center gap-1">
                    <HiOutlineCalendar className="text-sm" />
                    <span>
                      {t("dashboard.assignments.due")}:{" "}
                      {new Date(quiz.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {quiz.timeLimit && (
                  <span>
                    {t("dashboard.quizzes.timeLimit", {
                      minutes: quiz.timeLimit,
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <span className="text-xs font-mono text-gray-400">
                  {t("dashboard.assignments.maxScore")}: {quiz.maxScore || 100}
                </span>
                {currentUserRole !== "student" ? (
                  <button
                    onClick={async () => {
                      setSelectedQuiz(quiz);
                      setViewingStudentId(null);
                      await fetchAnswersForQuiz(quiz);
                    }}
                    className="text-xs font-semibold bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100"
                  >
                    {t("dashboard.common.grade")}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      navigate(`/dashboard/courses/${quiz.courseSlug}`)
                    }
                    className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200"
                  >
                    {t("dashboard.quizzes.takeQuiz")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredQuizzes.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <HiOutlineQuestionMarkCircle className="text-4xl text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {currentUserRole === "instructor" && !quizzes.length
                ? t("dashboard.quizzes.noResults")
                : t("dashboard.quizzes.noAvailable")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizzesDashboard;
