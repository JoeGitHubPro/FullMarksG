import React from "react";
import { useTranslation } from "../i18n/LanguageContext";
import MonthQuizzesStudentPanel from "../components/MonthQuizzesStudentPanel";

// Student page listing every published Month Quiz (standalone — not tied to
// any course). Each quiz opens at /quizzes/:quizId.
const StudentQuizzesPage = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-[#2e0854] py-8 px-4">
      <div className="text-start">
        <h1 className="text-2xl font-black font-heading tracking-tight">
          {t("courseDetail.monthQuizzes.title")}
        </h1>
        <p className="text-gray-400 text-sm font-light mt-1">
          {t("courseDetail.monthQuizzes.subtitle")}
        </p>
      </div>
      <MonthQuizzesStudentPanel />
    </div>
  );
};

export default StudentQuizzesPage;
