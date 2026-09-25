import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import {
  HiOutlineTrendingUp,
  HiOutlineUsers,
  HiOutlineArrowLeft,
  HiOutlineAcademicCap,
  HiOutlineChartBar,
  HiOutlineChevronRight,
} from "react-icons/hi";

// Shared Mock Database Core tracking Class Grade level metrics and student rosters
const gradesData = [
  {
    id: "grade-11",
    name: "Grade 11 (IGCSE Secondary)",
    tier: "Upper Secondary",
    description:
      "Core pre-university preparation path. Tracking metrics isolate student term performance across specialized international subject baselines.",
    averagePerformance: "87.4%",
    totalStudents: 114,
    courses: [
      {
        title: "Advanced Organic Chemistry II",
        code: "CHEM-402",
        average: "84%",
      },
      {
        title: "World History: The Industrial Age",
        code: "HIST-114",
        average: "91%",
      },
      {
        title: "Macroeconomics & Global Markets",
        code: "ECON-201",
        average: "87%",
      },
    ],
    students: [
      {
        name: "Amara Diallo",
        email: "amara.d@ig-hub.com",
        performance: "94.2%",
        initial: "AD",
      },
      {
        name: "Sophia Martinez",
        email: "s.martinez@ig-hub.com",
        performance: "89.5%",
        initial: "SM",
      },
      {
        name: "Liam Henderson",
        email: "l.henderson@ig-hub.com",
        performance: "81.0%",
        initial: "LH",
      },
      {
        name: "Julian Vance",
        email: "j.vance@ig-hub.com",
        performance: "85.1%",
        initial: "JV",
      },
    ],
  },
  {
    id: "grade-12",
    name: "Grade 12 (Advanced A-Levels)",
    tier: "Higher Academy",
    description:
      "Final specialized matriculation track focusing on advanced logical algorithms, research project defenses, and university admissions criteria.",
    averagePerformance: "91.2%",
    totalStudents: 86,
    courses: [
      {
        title: "Introduction to Quantum Computing",
        code: "PHYS-308",
        average: "89%",
      },
      {
        title: "Pure Mathematics Pure 1 & 2",
        code: "MATH-401",
        average: "93%",
      },
    ],
    students: [
      {
        name: "Ethan Zhao",
        email: "e.zhao@ig-hub.com",
        performance: "96.4%",
        initial: "EZ",
      },
      {
        name: "Chloe Henderson",
        email: "c.henderson@ig-hub.com",
        performance: "92.1%",
        initial: "CH",
      },
      {
        name: "Marcus Miller",
        email: "m.miller@ig-hub.com",
        performance: "85.8%",
        initial: "MM",
      },
    ],
  },
];

const GradesDashboard = () => {
  const { t } = useTranslation();
  const { slug } = useParams(); // Grabs parameter strings directly from /dashboard/grades/[slug]
  const navigate = useNavigate();

  // Filter computation to pull out active segment dataset matching the URL slug path string
  const activeGrade = gradesData.find((item) => item.id === slug);

  // VIEW 1: DYNAMIC SINGLE GRADE OVERVIEW WITH ROSTER MATRIX
  if (slug) {
    if (!activeGrade) {
      return (
        <div className="bg-white border rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.grades.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/grades")}
            className="mt-3 text-xs text-brand-purple font-semibold underline"
          >
            {t("dashboard.grades.backDirectory")}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Navigation Action Return Trigger */}
        <button
          onClick={() => navigate("/dashboard/grades")}
          className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
        >
          <HiOutlineArrowLeft className="flip-rtl" />{" "}
          <span>{t("dashboard.grades.backAll")}</span>
        </button>

        {/* Hero Meta Description Info Card Banner */}
        <div className="bg-[#2e0854] rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <span className="text-[10px] font-bold text-brand-violet uppercase tracking-widest bg-red-950/50 px-2.5 py-1 rounded-md border border-red-900/30">
                {activeGrade.tier}
              </span>
              <h2 className="text-2xl font-black font-heading tracking-tight mt-3">
                {activeGrade.name}
              </h2>
              <p className="text-xs text-red-100/70 font-light mt-1.5 max-w-xl">
                {activeGrade.description}
              </p>
            </div>

            {/* Class Group Average Bubble Accent */}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[120px] shrink-0">
              <p className="text-[10px] text-red-300 font-bold uppercase tracking-wider">
                {t("dashboard.grades.cohortAvg")}
              </p>
              <p className="text-3xl font-black font-heading text-white mt-1">
                {activeGrade.averagePerformance}
              </p>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand/10 rounded-full blur-3xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Related Courses Performance Track (2/3 Width on Desktop) */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="font-heading font-bold text-base text-[#2e0854]">
                {t("dashboard.grades.syllabusMetrics")}
              </h3>
              <p className="text-[11px] text-gray-400 font-light">
                Ecosystem modules linked directly to this grade level cohort.
              </p>
            </div>
            <div className="space-y-3">
              {activeGrade.courses.map((course, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:border-violet-100 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-brand flex items-center justify-center text-sm">
                      <HiOutlineAcademicCap />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {course.code}
                      </span>
                      <h4 className="text-sm font-bold text-[#2e0854] font-heading mt-0.5">
                        {course.title}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-gray-400 font-light">
                      {t("dashboard.grades.classAvg")}:{" "}
                    </span>
                    <span className="text-xs font-bold text-[#2e0854] font-mono">
                      {course.average}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Roster Allocation Section (1/3 Width on Desktop) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="font-heading font-bold text-base text-[#2e0854]">
                {t("dashboard.grades.studentRoster")}
              </h3>
              <p className="text-[11px] text-gray-400 font-light">
                Active profiles registered inside this specific grade node.
              </p>
            </div>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-none">
              {activeGrade.students.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50/50 transition-colors border border-transparent"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-xs font-bold shrink-0">
                      {student.initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#2e0854] truncate">
                        {student.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-light truncate">
                        {student.email}
                      </p>
                    </div>
                  </div>

                  {/* Performance Evaluation Marker Badging */}
                  <span className="text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                    {student.performance}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: GLOBAL SECTOR ALL GRADES CATALOG PROFILE DIRECTORY
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#2e0854] font-heading">
          {t("dashboard.grades.title")}
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-light">
          {t("dashboard.grades.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gradesData.map((grade) => (
          <div
            key={grade.id}
            onClick={() => navigate(`/dashboard/grades/${grade.id}`)}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand bg-violet-50 px-2 py-0.5 rounded-md tracking-wide uppercase">
                  {grade.tier}
                </span>
                <span className="text-xs font-black font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {grade.averagePerformance} Avg
                </span>
              </div>
              <h3 className="text-base font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors pt-1">
                {grade.name}
              </h3>
              <p className="text-xs text-gray-400 font-light line-clamp-2">
                {grade.description}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
              <div className="flex space-x-4">
                <span className="flex items-center">
                  <HiOutlineChartBar className="mr-1 text-gray-400 text-sm" />{" "}
                  {grade.courses.length} {t("dashboard.grades.activeTracks")}
                </span>
                <span className="flex items-center">
                  <HiOutlineUsers className="mr-1 text-gray-400 text-sm" />{" "}
                  {grade.totalStudents} {t("dashboard.grades.enrolled")}
                </span>
              </div>
              <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradesDashboard;
