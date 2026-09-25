// src/pages/StudentProfilePage.jsx
import React, { useState, useMemo } from "react";
import {
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineClipboardList,
  HiOutlineIdentification,
} from "react-icons/hi";

// Mock Student Database Registry Ledger
const STUDENT_REPOSITORY_DATA = {
  "ST-5501": {
    id: "ST-5501",
    name: "Mohamed Hesham",
    track: "Cambridge IGCSE Extended Track",
    enrolledDate: "September 2025",
    metrics: {
      gpa: "3.92 / 4.0",
      attendance: "98.2%",
      completedModules: "14 / 16",
    },
    activeCourses: [
      {
        code: "MATH-0580",
        name: "Cambridge IGCSE Mathematics",
        status: "A* Expected",
        progress: 92,
      },
      {
        code: "COMP-0478",
        name: "Cambridge IGCSE Computer Science",
        status: "A* Expected",
        progress: 96,
      },
      {
        code: "PHYS-9PH0",
        name: "Pearson Edexcel International AS Physics",
        status: "A Expected",
        progress: 88,
      },
    ],
    recentSubmissions: [
      {
        name: "Calculus Limits Portfolio Matrix",
        type: "Assignment",
        score: "98/100",
        date: "May 28, 2026",
      },
      {
        name: "Logic Gate Circuit Optimization Lab",
        type: "Quiz",
        score: "20/20",
        date: "May 24, 2026",
      },
      {
        name: "Fluid Mechanics Oscillations Check",
        type: "Assignment",
        score: "87/100",
        date: "May 19, 2026",
      },
    ],
  },
  "ST-8842": {
    id: "ST-8842",
    name: "Youssef Mansoor",
    track: "Pearson Edexcel Advanced Tract",
    enrolledDate: "September 2025",
    metrics: {
      gpa: "3.65 / 4.0",
      attendance: "94.5%",
      completedModules: "11 / 16",
    },
    activeCourses: [
      {
        code: "PHYS-9PH0",
        name: "Pearson Edexcel International AS Physics",
        status: "A Expected",
        progress: 85,
      },
      {
        code: "CHEM-9701",
        name: "Cambridge International AS Chemistry",
        status: "B Expected",
        progress: 79,
      },
    ],
    recentSubmissions: [
      {
        name: "Aromatic Benzene Synthesis Structural Log",
        type: "Assignment",
        score: "82/100",
        date: "May 30, 2026",
      },
      {
        name: "Kinetic Velocity Milestone Exam",
        type: "Quiz",
        score: "17/20",
        date: "May 22, 2026",
      },
    ],
  },
};

const StudentProfilePage = () => {
  const [searchId, setSearchId] = useState("");
  const [activeProfileId, setActiveProfileId] = useState("ST-5501");

  // Lookup computing handler
  const currentStudent = useMemo(() => {
    return STUDENT_REPOSITORY_DATA[activeProfileId.toUpperCase().trim()];
  }, [activeProfileId]);

  const handleIdQuerySubmit = (e) => {
    e.preventDefault();
    if (STUDENT_REPOSITORY_DATA[searchId.toUpperCase().trim()]) {
      setActiveProfileId(searchId.toUpperCase().trim());
    } else {
      alert(
        `System Log Notice: Student signature ID "${searchId}" could not be cross-matched.`,
      );
    }
  };

  return (
    <div className="space-y-10 py-4 animate-fadeIn">
      {/* 1. TOP PORTAL CONTROLS SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="max-w-md">
          <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
            Candidate Analytics Gateway
          </span>
          <h1 className="text-3xl font-black text-[#2e0854] tracking-tight font-heading mt-3">
            Student Performance Profile
          </h1>
          <p className="text-xs text-gray-400 font-light mt-1.5 leading-relaxed">
            Input verified security credentials token ID codes below to pull
            real-time curriculum progress grids and exam indexes.
          </p>
        </div>

        {/* Real-time Query Input Box */}
        <form
          onSubmit={handleIdQuerySubmit}
          className="relative max-w-xs w-full flex items-center gap-2"
        >
          <div className="relative flex-grow">
            <HiOutlineIdentification className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Query Student ID (e.g. ST-5501)"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-[#2e0854] text-white text-xs font-bold rounded-xl hover:bg-[#1a0433] transition-all shrink-0"
          >
            Query
          </button>
        </form>
      </div>

      {currentStudent ? (
        <div className="space-y-8">
          {/* 2. MAIN HEADER INFO SHEET */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-brand-purple border border-violet-100/50 flex items-center justify-center text-xl shadow-xs">
                <HiOutlineUser />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black font-heading text-[#2e0854]">
                    {currentStudent.name}
                  </h2>
                  <span className="text-[9px] font-black tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    {currentStudent.id}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-light">
                  {currentStudent.track}
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                Registry Cycle Base
              </p>
              <p className="text-xs font-bold text-[#2e0854] mt-1">
                {currentStudent.enrolledDate}
              </p>
            </div>
          </div>

          {/* 3. HIGH LEVEL KPI METRICS DISPLAY ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Calculated Weight GPA Index",
                value: currentStudent.metrics.gpa,
                icon: HiOutlineChartBar,
                color: "text-brand-purple bg-violet-50",
              },
              {
                label: "Active Session Attendance Sync",
                value: currentStudent.metrics.attendance,
                icon: HiOutlineCheckCircle,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Syllabus Module Deliveries",
                value: currentStudent.metrics.completedModules,
                icon: HiOutlineClock,
                color: "text-amber-600 bg-amber-50",
              },
            ].map((metric, idx) => {
              const Icon = metric.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${metric.color}`}
                  >
                    <Icon />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                      {metric.label}
                    </p>
                    <p className="text-base font-black text-[#2e0854] font-heading pt-0.5">
                      {metric.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. SPLIT LAYOUT: LIVE TIMELINES & COUPLING PROGRESS MODULES */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* LEFT COLUMN: Course Tracking Progress Layouts (3/5 Width) */}
            <div className="lg:col-span-3 space-y-4">
              <h3 className="font-heading font-black text-sm text-[#2e0854] px-1">
                Active Syllabus Progression
              </h3>
              <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5 shadow-2xs">
                {currentStudent.activeCourses.map((course) => (
                  <div key={course.code} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="text-[9px] font-black text-brand-purple uppercase tracking-wider bg-violet-50 px-1.5 py-0.5 rounded-md mr-2">
                          {course.code}
                        </span>
                        <span className="font-bold text-[#2e0854] truncate font-heading">
                          {course.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 shrink-0 bg-gray-50 px-2 py-0.5 rounded-md">
                        {course.status}
                      </span>
                    </div>
                    {/* Linear CSS Meter Track bar */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand h-full rounded-full transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Submission Record Matrices (2/5 Width) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-2 px-1">
                <HiOutlineClipboardList className="text-sm text-brand-purple" />
                <h3 className="font-heading font-black text-sm text-[#2e0854]">
                  Recent Submission Records
                </h3>
              </div>
              <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50 shadow-2xs bg-white">
                {currentStudent.recentSubmissions.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-4 space-y-1.5 hover:bg-gray-50/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#2e0854] font-heading line-clamp-1">
                        {sub.name}
                      </h4>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                        {sub.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-light">
                      <span>{sub.type}</span>
                      <span>{sub.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudentProfilePage;
