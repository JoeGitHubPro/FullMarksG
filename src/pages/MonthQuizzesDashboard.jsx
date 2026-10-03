import React from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import MonthQuizzesPanel from "../components/MonthQuizzesPanel";

// Dashboard section for standalone Month Quizzes. Not tied to any course:
// every admin, instructor and assistant can create, edit and grade every quiz.
const MonthQuizzesDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#2e0854] font-heading">
          {t("dashboard.monthQuizzes.title")}
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-light">
          {t("dashboard.monthQuizzes.subtitle")}
        </p>
      </div>

      <MonthQuizzesPanel currentUserRole={user?.role} />
    </div>
  );
};

export default MonthQuizzesDashboard;
