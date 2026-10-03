import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { api } from "../api";
import {
  HiOutlineClipboardList,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineCheckCircle,
} from "react-icons/hi";

// Student-facing "Month Quiz" list — rendered by the standalone /quizzes page
// (pages/StudentQuizzesPage.jsx). Lists every published Month Quiz with the
// student's own progress and links to the take-quiz page for each one.
const MonthQuizzesStudentPanel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.getCourseQuizzes();
        if (res.success) setQuizzes(res.data || []);
      } catch (err) {
        console.error("Failed to load Month Quizzes", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center text-sm text-gray-400">
        {t("courseDetail.monthQuizzes.noQuizzes")}
      </div>
    );
  }

  const statusBadge = (quiz) => {
    if (quiz.myProgress?.isFullyGraded) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          <HiOutlineCheckCircle />
          {t("courseDetail.monthQuizzes.graded")}: {quiz.myProgress.totalScore}
          /{quiz.max_score}
        </span>
      );
    }
    if (quiz.myProgress?.answerCount > 0) {
      return (
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          {t("courseDetail.monthQuizzes.pendingGrade")}
        </span>
      );
    }
    if (quiz.status === "not_started") {
      return (
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {t("courseDetail.monthQuizzes.notStarted")}
        </span>
      );
    }
    if (quiz.status === "closed") {
      return (
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {t("courseDetail.monthQuizzes.closed")}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2 py-0.5 rounded-full">
        {t("courseDetail.monthQuizzes.open")}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <HiOutlineClipboardList className="text-brand-purple text-xl" />
        <h3 className="font-heading font-bold text-lg text-[#2e0854]">
          {t("courseDetail.monthQuizzes.title")}
        </h3>
      </div>

      <div className="space-y-2.5">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3"
          >
            <div className="min-w-0 text-start">
              <p className="font-semibold text-sm text-[#2e0854] truncate">
                {quiz.title}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                {quiz.due_date && (
                  <span className="flex items-center gap-1">
                    <HiOutlineCalendar />
                    {new Date(quiz.due_date).toLocaleDateString()}
                  </span>
                )}
                {quiz.time_limit_minutes && (
                  <span className="flex items-center gap-1">
                    <HiOutlineClock /> {quiz.time_limit_minutes}m
                  </span>
                )}
                {statusBadge(quiz)}
              </div>
            </div>
            <button
              onClick={() =>
                navigate(`/quizzes/${quiz.id}`)
              }
              disabled={quiz.status === "not_started"}
              className="shrink-0 text-xs font-semibold bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {quiz.myProgress?.answerCount > 0
                ? t("courseDetail.monthQuizzes.viewQuiz")
                : t("courseDetail.monthQuizzes.takeQuiz")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthQuizzesStudentPanel;
