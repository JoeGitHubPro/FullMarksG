import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import { api } from "../api";
import {
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineSupport,
  HiOutlineDocumentReport,
  HiOutlineUsers,
  HiOutlineIdentification,
  HiOutlineHeart,
  HiOutlineArrowRight,
  HiOutlineCollection,
} from "react-icons/hi";

const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-start w-full transition-all ${
      onClick ? "hover:shadow-md hover:border-violet-100 cursor-pointer" : ""
    }`}
  >
    <div className="flex items-start justify-between w-full">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
          {title}
        </p>
        <h3 className="text-2xl font-black text-[#2e0854] font-heading">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-gray-400 font-light">{subtitle}</p>
        )}
      </div>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner ${color}`}
      >
        <Icon />
      </div>
    </div>
  </button>
);

const QuickLink = ({ label, path, icon: Icon, onNavigate }) => (
  <button
    type="button"
    onClick={() => onNavigate(path)}
    className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-100 hover:border-violet-100 hover:bg-violet-50/40 transition-all group"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-brand-purple">
        <Icon className="text-lg" />
      </div>
      <span className="text-sm font-medium text-[#2e0854]">{label}</span>
    </div>
    <HiOutlineArrowRight className="text-gray-300 group-hover:text-brand-purple transition-colors flip-rtl" />
  </button>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = user?.role;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [recentTitle, setRecentTitle] = useState("");
  const [welcomeNote, setWelcomeNote] = useState("");

  const goTo = (path) => navigate(`/${path.replace(/^\//, "")}`);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const meRes = await api.getMe();
        const me = meRes.success ? meRes.data : null;
        const currentRole = me?.role || role;

        if (currentRole === "admin") {
          const [studentsRes, instructorsRes, coursesRes, ticketsRes] =
            await Promise.all([
              api.getAllStudents({ limit: 1 }),
              api.getAllInstructors({ limit: 1 }),
              api.getAllCourses({ limit: 1 }),
              api.getAllTickets({ status: "open", limit: 5 }),
            ]);

          const openTickets = ticketsRes.success ? ticketsRes.data : [];
          const openCount =
            ticketsRes.pagination?.total ?? openTickets.length;

          setStats([
            {
              title: t("dashboard.home.stats.students"),
              value:
                studentsRes.pagination?.total ?? studentsRes.data?.length ?? 0,
              subtitle: t("dashboard.home.stats.studentsSub"),
              icon: HiOutlineUsers,
              color: "text-brand-purple bg-violet-50",
              path: "dashboard/students",
            },
            {
              title: t("dashboard.home.stats.instructors"),
              value:
                instructorsRes.pagination?.total ??
                instructorsRes.data?.length ??
                0,
              subtitle: t("dashboard.home.stats.instructorsSub"),
              icon: HiOutlineUserGroup,
              color: "text-amber-600 bg-amber-50",
              path: "dashboard/instructors",
            },
            {
              title: t("dashboard.home.stats.courses"),
              value: coursesRes.pagination?.total ?? coursesRes.data?.length ?? 0,
              subtitle: t("dashboard.home.stats.coursesSub"),
              icon: HiOutlineAcademicCap,
              color: "text-emerald-600 bg-emerald-50",
              path: "dashboard/courses",
            },
            {
              title: t("dashboard.home.stats.openTickets"),
              value: openCount,
              subtitle: t("dashboard.home.stats.openTicketsSub"),
              icon: HiOutlineSupport,
              color: "text-blue-600 bg-blue-50",
              path: "dashboard/support",
            },
          ]);

          setRecentTitle(t("dashboard.home.recent.openTickets"));
          setRecentItems(
            openTickets.slice(0, 5).map((ticket) => ({
              id: ticket.id,
              primary: ticket.subject,
              secondary: ticket.category || t("dashboard.support.category.general"),
              meta: ticket.status,
            })),
          );
          setWelcomeNote(
            t("dashboard.home.platformOverview", {
              courses: coursesRes.pagination?.total ?? 0,
              tickets: openCount,
            }),
          );
        } else if (currentRole === "instructor") {
          const instructorId = me?.roleData?.id;
          const [coursesRes, ticketsRes] = await Promise.all([
            instructorId
              ? api.getAllCourses({ instructorId, limit: 200 })
              : Promise.resolve({ success: true, data: [] }),
            api.getMyTickets(),
          ]);

          const courses = (coursesRes.success ? coursesRes.data : []).filter(
            (course) => !instructorId || course.instructor_id === instructorId,
          );
          const published = courses.filter((c) => c.status === "published").length;
          const draft = courses.filter((c) => c.status === "draft").length;
          const tickets = ticketsRes.success ? ticketsRes.data : [];
          const openTickets = tickets.filter(
            (ticket) => ticket.status === "open" || ticket.status === "pending",
          );

          setStats([
            {
              title: t("dashboard.home.stats.myCourses"),
              value: courses.length,
              subtitle: t("dashboard.home.stats.myCoursesSub"),
              icon: HiOutlineAcademicCap,
              color: "text-brand-purple bg-violet-50",
              path: "dashboard/courses",
            },
            {
              title: t("dashboard.home.stats.published"),
              value: published,
              subtitle: t("dashboard.home.stats.publishedSub"),
              icon: HiOutlineCollection,
              color: "text-emerald-600 bg-emerald-50",
              path: "dashboard/courses",
            },
            {
              title: t("dashboard.home.stats.drafts"),
              value: draft,
              subtitle: t("dashboard.home.stats.draftsSub"),
              icon: HiOutlineDocumentReport,
              color: "text-amber-600 bg-amber-50",
              path: "dashboard/courses",
            },
            {
              title: t("dashboard.home.stats.myTickets"),
              value: openTickets.length,
              subtitle: t("dashboard.home.stats.myTicketsSub"),
              icon: HiOutlineSupport,
              color: "text-blue-600 bg-blue-50",
              path: "dashboard/support",
            },
          ]);

          setRecentTitle(t("dashboard.home.recent.yourCourses"));
          setRecentItems(
            courses.slice(0, 5).map((course) => ({
              id: course.id,
              primary: course.title,
              secondary: course.status,
              meta: course.term || "—",
              path: `dashboard/courses/${course.slug}`,
            })),
          );
          setWelcomeNote(
            t("dashboard.home.manageCourses", {
              count: courses.length,
              published,
            }),
          );
        } else if (currentRole === "assistant") {
          const instructorId = me?.roleData?.assigned_instructor_id;
          const instructorName = me?.roleData?.instructor_first_name
            ? `${me.roleData.instructor_first_name} ${me.roleData.instructor_last_name || ""}`.trim()
            : t("dashboard.home.assignedInstructor");

          const [coursesRes, ticketsRes] = await Promise.all([
            instructorId
              ? api.getAllCourses({ instructorId, limit: 200 })
              : Promise.resolve({ success: true, data: [] }),
            api.getMyTickets(),
          ]);

          const courses = (coursesRes.success ? coursesRes.data : []).filter(
            (course) => !instructorId || course.instructor_id === instructorId,
          );
          const tickets = ticketsRes.success ? ticketsRes.data : [];
          const openTickets = tickets.filter(
            (ticket) => ticket.status === "open" || ticket.status === "pending",
          );

          setStats([
            {
              title: t("dashboard.home.stats.assignedCourses"),
              value: courses.length,
              subtitle: t("dashboard.home.stats.assignedCoursesSub", {
                instructor: instructorName,
              }),
              icon: HiOutlineAcademicCap,
              color: "text-brand-purple bg-violet-50",
              path: "dashboard/courses",
            },
            {
              title: t("dashboard.home.stats.assignments"),
              subtitle: t("dashboard.home.stats.assignmentsSub"),
              value: "→",
              icon: HiOutlineClipboardList,
              color: "text-amber-600 bg-amber-50",
              path: "dashboard/assignments",
            },
            {
              title: t("dashboard.home.stats.quizzes"),
              subtitle: t("dashboard.home.stats.quizzesSub"),
              value: "→",
              icon: HiOutlineDocumentReport,
              color: "text-emerald-600 bg-emerald-50",
              path: "dashboard/quizzes",
            },
            {
              title: t("dashboard.home.stats.myTickets"),
              value: openTickets.length,
              subtitle: t("dashboard.home.stats.myTicketsSub"),
              icon: HiOutlineSupport,
              color: "text-blue-600 bg-blue-50",
              path: "dashboard/support",
            },
          ]);

          setRecentTitle(t("dashboard.home.recent.assignedCourses"));
          setRecentItems(
            courses.slice(0, 5).map((course) => ({
              id: course.id,
              primary: course.title,
              secondary: course.status,
              meta: course.term || "—",
              path: `dashboard/courses/${course.slug}`,
            })),
          );
          setWelcomeNote(
            t("dashboard.home.assisting", {
              instructor: instructorName,
              count: courses.length,
            }),
          );
        }
      } catch (err) {
        setError(err.message || t("dashboard.home.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    if (user) loadDashboard();
  }, [user, role, t]);

  const quickLinksByRole = {
    admin: [
      {
        label: t("dashboard.home.links.manageCourses"),
        path: "dashboard/courses",
        icon: HiOutlineAcademicCap,
      },
      {
        label: t("dashboard.nav.students"),
        path: "dashboard/students",
        icon: HiOutlineUsers,
      },
      {
        label: t("dashboard.nav.instructors"),
        path: "dashboard/instructors",
        icon: HiOutlineUserGroup,
      },
      {
        label: t("dashboard.nav.parents"),
        path: "dashboard/parents",
        icon: HiOutlineHeart,
      },
      {
        label: t("dashboard.home.links.supportQueue"),
        path: "dashboard/support",
        icon: HiOutlineSupport,
      },
    ],
    instructor: [
      {
        label: t("dashboard.home.stats.myCourses"),
        path: "dashboard/courses",
        icon: HiOutlineAcademicCap,
      },
      {
        label: t("dashboard.nav.assignments"),
        path: "dashboard/assignments",
        icon: HiOutlineClipboardList,
      },
      {
        label: t("dashboard.nav.quizzes"),
        path: "dashboard/quizzes",
        icon: HiOutlineDocumentReport,
      },
      {
        label: t("dashboard.nav.assistants"),
        path: "dashboard/assistants",
        icon: HiOutlineIdentification,
      },
      {
        label: t("dashboard.nav.support"),
        path: "dashboard/support",
        icon: HiOutlineSupport,
      },
    ],
    assistant: [
      {
        label: t("dashboard.nav.courses"),
        path: "dashboard/courses",
        icon: HiOutlineAcademicCap,
      },
      {
        label: t("dashboard.nav.assignments"),
        path: "dashboard/assignments",
        icon: HiOutlineClipboardList,
      },
      {
        label: t("dashboard.nav.quizzes"),
        path: "dashboard/quizzes",
        icon: HiOutlineDocumentReport,
      },
      {
        label: t("dashboard.nav.support"),
        path: "dashboard/support",
        icon: HiOutlineSupport,
      },
      {
        label: t("dashboard.home.links.myProfile"),
        path: "dashboard/profile",
        icon: HiOutlineIdentification,
      },
    ],
  };

  const quickLinks = quickLinksByRole[role] || quickLinksByRole.admin;
  const roleLabel = role ? t(`roles.${role}`) : t("dashboard.nav.dashboard");

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.home.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-[#2e0854] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md shadow-brand/20">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="text-xs font-bold text-brand-violet uppercase tracking-widest bg-brand/50 px-3 py-1 rounded-full border border-brand/30">
            {roleLabel}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-2">
            {t("dashboard.home.welcome", {
              name: user?.firstName || t("dashboard.home.welcomeFallback"),
            })}
          </h2>
          <p className="text-xs text-violet-100/70 font-light leading-relaxed">
            {welcomeNote || t("dashboard.home.snapshot")}
          </p>
        </div>
        <div className="absolute -end-10 -bottom-10 w-44 h-44 bg-brand/10 rounded-full blur-3xl" />
      </div>

      {error && (
        <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
            onClick={stat.path ? () => goTo(stat.path) : undefined}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 md:col-span-2">
          <div className="pb-4 border-b border-gray-50 mb-4">
            <h4 className="font-heading font-bold text-base text-[#2e0854]">
              {recentTitle}
            </h4>
            <p className="text-[11px] text-gray-400 font-light">
              {t("dashboard.home.recent.subtitle")}
            </p>
          </div>

          {recentItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              {t("dashboard.common.nothingYet")}
            </p>
          ) : (
            <div className="space-y-3">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.path && goTo(item.path)}
                  disabled={!item.path}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 text-start transition-all ${
                    item.path
                      ? "hover:bg-gray-50 hover:border-violet-100 cursor-pointer"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2e0854] truncate">
                      {item.primary}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                      {item.secondary}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase shrink-0 ms-3">
                    {item.meta}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="pb-4 border-b border-gray-50 mb-4">
            <h4 className="font-heading font-bold text-base text-[#2e0854]">
              {t("dashboard.home.quickActions")}
            </h4>
            <p className="text-[11px] text-gray-400 font-light">
              {t("dashboard.home.quickActionsSub")}
            </p>
          </div>
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <QuickLink key={link.path} {...link} onNavigate={goTo} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
