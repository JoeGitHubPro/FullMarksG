import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { api, getFileUrl } from "../api";
import {
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineDownload,
  HiOutlineArrowLeft,
} from "react-icons/hi";

const AssignmentsDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const assignmentIdFromUrl = searchParams.get("assignmentId"); // e.g., "17"

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Grading view states
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  // User info
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // ----- Auto‑open grading view when assignmentId query param is present -----
  useEffect(() => {
    if (assignmentIdFromUrl && assignments.length > 0) {
      const target = assignments.find(
        (a) => a.id === Number(assignmentIdFromUrl),
      );
      if (target) {
        setSelectedAssignment(target);
        fetchSubmissionsForAssignment(target);
      } else {
        setError(
          t("dashboard.assignments.notFound", { id: assignmentIdFromUrl }),
        );
        // Optionally remove the invalid query param
        navigate("/dashboard/assignments", { replace: true });
      }
    }
  }, [assignments, assignmentIdFromUrl]);

  // ----- Fetch current user and role -----
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.getMe();
      if (!res.success) {
        setError(t("dashboard.common.loadFailed"));
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
      await fetchAssignments(user);
    } catch (err) {
      setError(err.message || t("dashboard.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ----- Fetch assignments for all roles -----
  const fetchAssignments = async (user) => {
    setLoading(true);
    setError("");
    try {
      let allAssignments = [];

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
              const assignmentsFromCourse = extractAssignments(
                courseDetail.data,
              );
              allAssignments.push(...assignmentsFromCourse);
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
            const instructorCourses = coursesRes.data.filter(
              (course) => course.instructor_id === instructorId,
            );
            for (const course of instructorCourses) {
              const courseDetail = await api.getCourseBySlug(course.slug);
              if (courseDetail.success) {
                const assignmentsFromCourse = extractAssignments(
                  courseDetail.data,
                );
                allAssignments.push(...assignmentsFromCourse);
              }
            }
          }
        }
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
                const assignmentsFromCourse = extractAssignments(
                  courseDetail.data,
                );
                allAssignments.push(...assignmentsFromCourse);
              }
            }
          }
        }
      } else if (user.role === "admin") {
        const coursesRes = await api.getAllCourses({ limit: 200 });
        if (coursesRes.success) {
          for (const course of coursesRes.data) {
            const courseDetail = await api.getCourseBySlug(course.slug);
            if (courseDetail.success) {
              const assignmentsFromCourse = extractAssignments(
                courseDetail.data,
              );
              allAssignments.push(...assignmentsFromCourse);
            }
          }
        }
      }

      setAssignments(allAssignments);
    } catch (err) {
      setError(err.message || t("dashboard.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const extractAssignments = (course) => {
    const items = [];
    if (course.chapters && Array.isArray(course.chapters)) {
      for (const chapter of course.chapters) {
        if (chapter.items && Array.isArray(chapter.items)) {
          for (const item of chapter.items) {
            if (item.item_type === "assignment") {
              items.push({
                ...item,
                courseTitle: course.title,
                courseSlug: course.slug,
                chapterTitle: chapter.title,
                dueDate: item.due_date,
                maxScore: item.max_score,
              });
            }
          }
        }
      }
    }
    return items;
  };

  // ----- Fetch submissions for a specific assignment -----
  const fetchSubmissionsForAssignment = async (assignment) => {
    setGradingLoading(true);
    try {
      const res = await api.getSubmissionsForItem(assignment.id);
      if (res.success && Array.isArray(res.data)) {
        setSubmissions(res.data);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.error(err);
      setSubmissions([]);
    } finally {
      setGradingLoading(false);
    }
  };

  // ----- Handle grading a submission -----
  const handleGradeSubmission = async (submissionId) => {
    if (!gradeScore) return;
    setGradingLoading(true);
    try {
      const res = await api.gradeSubmission(
        submissionId,
        parseFloat(gradeScore),
        gradeFeedback,
      );
      if (res.success) {
        alert(t("dashboard.common.gradeSaved"));
        setGradingSubmission(null);
        setGradeScore("");
        setGradeFeedback("");
        await fetchSubmissionsForAssignment(selectedAssignment);
      } else {
        alert(res.message || t("dashboard.common.gradingFailed"));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGradingLoading(false);
    }
  };

  // ----- Filter assignments list -----
  const filteredAssignments = assignments.filter(
    (a) =>
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ==================== GRADING FULL‑PAGE VIEW ====================
  if (selectedAssignment) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedAssignment(null);
              // Clear the query param so the URL reflects the list view
              navigate("/dashboard/assignments", { replace: true });
            }}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>
              {t("dashboard.common.back")} {t("dashboard.nav.assignments")}
            </span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-6">
          <div className="border-b border-gray-50 pb-4 text-start">
            <h1 className="text-2xl font-black font-heading tracking-tight">
              {t("dashboard.assignments.gradeTitle", {
                title: selectedAssignment.title,
              })}
            </h1>
            <p className="text-gray-400 text-sm font-light mt-1">
              {t("dashboard.assignments.gradeSubtitle")}
            </p>
          </div>

          {gradingLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {t("dashboard.common.noSubmissions")}
            </div>
          ) : (
            <div className="space-y-5">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="border border-gray-100 rounded-xl p-5 space-y-3 hover:bg-gray-50/30 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-start">
                      <p className="font-bold text-[#2e0854]">
                        {sub.first_name} {sub.last_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t("dashboard.assignments.submitted")}:{" "}
                        {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    {sub.score !== null && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        {t("dashboard.common.score")}: {sub.score}
                      </span>
                    )}
                  </div>

                  {sub.submission_text && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 text-start">
                      {sub.submission_text}
                    </div>
                  )}
                  {sub.submission_file && (
                    <a
                      href={getFileUrl(sub.submission_file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-purple hover:text-brand"
                    >
                      <HiOutlineDownload />{" "}
                      {t("dashboard.assignments.downloadAttachment")}
                    </a>
                  )}

                  {gradingSubmission === sub.id ? (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-start">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          {t("dashboard.common.score")}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={`${t("dashboard.assignments.maxScore")} ${selectedAssignment.maxScore || 100}`}
                          value={gradeScore}
                          onChange={(e) => setGradeScore(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          {t("dashboard.common.feedback")}
                        </label>
                        <textarea
                          rows="2"
                          placeholder={t("dashboard.common.feedbackPlaceholder")}
                          value={gradeFeedback}
                          onChange={(e) => setGradeFeedback(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-100"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setGradingSubmission(null)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          {t("dashboard.common.back")}
                        </button>
                        <button
                          onClick={() => handleGradeSubmission(sub.id)}
                          className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark"
                        >
                          {t("dashboard.common.save")} {t("dashboard.common.grade")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setGradingSubmission(sub.id);
                        setGradeScore(sub.score || "");
                        setGradeFeedback(sub.feedback || "");
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t("dashboard.common.grade")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== ASSIGNMENT DASHBOARD LIST ====================
  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.assignments.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-start">
          <h1 className="text-2xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.assignments.title")}
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-light">
            {currentUserRole !== "student"
              ? t("dashboard.assignments.subtitleAdmin")
              : t("dashboard.assignments.subtitleUser")}
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
        {filteredAssignments.map((assignment) => (
          <div
            key={assignment.id}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <HiOutlineDocumentText className="text-brand-purple text-xl shrink-0" />
                  <h3 className="font-heading font-bold text-[#2e0854] line-clamp-1 text-start">
                    {assignment.title}
                  </h3>
                </div>
                {assignment.dueDate &&
                  new Date(assignment.dueDate) < new Date() && (
                    <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2 py-0.5 rounded shrink-0">
                      {t("dashboard.common.overdue")}
                    </span>
                  )}
              </div>
              <p className="text-xs text-gray-500 text-start">
                {t("dashboard.assignments.course")}:{" "}
                <span className="font-medium text-gray-700">
                  {assignment.courseTitle}
                </span>
              </p>
              <p className="text-xs text-gray-500 text-start">
                {t("dashboard.assignments.chapter")}: {assignment.chapterTitle}
              </p>
              {assignment.dueDate && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <HiOutlineCalendar className="text-sm" />
                  <span>
                    {t("dashboard.assignments.due")}:{" "}
                    {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <span className="text-xs font-mono text-gray-400">
                  {t("dashboard.assignments.maxScore")}:{" "}
                  {assignment.maxScore || 100}
                </span>
                {currentUserRole !== "student" ? (
                  <button
                    onClick={async () => {
                      setSelectedAssignment(assignment);
                      await fetchSubmissionsForAssignment(assignment);
                    }}
                    className="text-xs font-semibold bg-violet-50 text-brand-purple px-3 py-1.5 rounded-lg hover:bg-violet-100"
                  >
                    {t("dashboard.common.grade")}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      navigate(`/dashboard/courses/${assignment.courseSlug}`)
                    }
                    className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200"
                  >
                    {t("dashboard.assignments.viewInCourse")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredAssignments.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <HiOutlineDocumentText className="text-4xl text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {t("dashboard.assignments.noResults")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentsDashboard;
