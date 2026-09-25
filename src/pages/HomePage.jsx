import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineSearch,
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineUserGroup,
  HiOutlineKey,
  HiOutlineClipboardList,
  HiOutlineBadgeCheck,
  HiOutlineUser,
  HiOutlineClock,
} from "react-icons/hi";
import { api, getFileUrl } from "../api";
import { useTranslation } from "../i18n/LanguageContext";
import heroStudent from "../assets/hero-student.png";

const Home = () => {
  const { t, isRtl } = useTranslation();
  const navigate = useNavigate();
  const ArrowIcon = isRtl ? HiOutlineArrowLeft : HiOutlineArrowRight;
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const howItWorks = useMemo(
    () => [
      {
        icon: HiOutlineSearch,
        title: t("home.steps.browse.title"),
        description: t("home.steps.browse.description"),
      },
      {
        icon: HiOutlineKey,
        title: t("home.steps.enroll.title"),
        description: t("home.steps.enroll.description"),
      },
      {
        icon: HiOutlineClipboardList,
        title: t("home.steps.learn.title"),
        description: t("home.steps.learn.description"),
      },
      {
        icon: HiOutlineBadgeCheck,
        title: t("home.steps.track.title"),
        description: t("home.steps.track.description"),
      },
    ],
    [t],
  );

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [coursesRes, instructorsRes] = await Promise.all([
          api.getAllCourses({ status: "published", limit: 100 }),
          api.getPublicInstructors(),
        ]);

        if (coursesRes.success) setCourses(coursesRes.data);
        if (instructorsRes.success) setInstructors(instructorsRes.data);
      } catch (err) {
        console.error("Failed to load homepage data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const featuredCourses = useMemo(() => courses.slice(0, 6), [courses]);

  const subjectsFromCourses = useMemo(() => {
    const subjectMap = new Map();
    courses.forEach((course) => {
      if (course.subjects && Array.isArray(course.subjects)) {
        course.subjects.forEach((subject) => {
          if (subject.name && !subjectMap.has(subject.name)) {
            subjectMap.set(subject.name, {
              id: subject.id,
              name: subject.name,
            });
          }
        });
      }
    });
    return Array.from(subjectMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [courses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    navigate(
      query ? `/courses?search=${encodeURIComponent(query)}` : "/courses",
    );
  };

  return (
    <div className="w-full bg-[#fdfdfc] text-[#2e0854] font-sidebar overflow-x-hidden">
      {/* ══════════════ HERO ══════════════ */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-violet-50/80 via-[#fdfdfc] to-violet-100/40">
        <div
          className="pointer-events-none absolute -end-24 top-0 h-96 w-96 rounded-full bg-brand-purple/5 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -start-24 bottom-0 h-80 w-80 rounded-full bg-brand/5 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="relative lg:grid lg:grid-cols-2 lg:gap-16">
            <div className="w-full max-w-xl pb-10 text-start sm:pb-12 lg:pb-14">
              <h1 className="mb-6 font-heading text-3xl font-black leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                {t("home.heroTitleLead")}{" "}
                <span className="relative inline-block whitespace-nowrap">
                  {t("home.heroTitleHighlight")}
                  <span className="absolute start-0 bottom-1 -z-10 h-[6px] w-full origin-left rotate-[-1deg] rounded-full bg-violet-400/70 sm:bottom-2 rtl:origin-right" />
                </span>
              </h1>

              <p className="mb-10 max-w-lg text-base font-light leading-relaxed text-gray-500 sm:text-lg">
                {t("home.heroSubtitle")}
              </p>

              <form
                onSubmit={handleSearchSubmit}
                className="mb-6 flex w-full max-w-lg items-center gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_20px_50px_rgba(46,8,84,0.06)]"
              >
                <HiOutlineSearch className="ms-3 shrink-0 text-lg text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="flex-1 bg-transparent py-2 text-sm text-brand placeholder-gray-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-hover"
                >
                  {t("common.search")}
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/courses"
                  className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand/10 transition-all hover:bg-brand-hover"
                >
                  <span>{t("home.browseCourses")}</span>
                  <ArrowIcon className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
                <Link
                  to="/instructors"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 font-semibold text-brand transition-all hover:border-violet-200 hover:bg-violet-50/50"
                >
                  <span>{t("home.meetInstructors")}</span>
                </Link>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-0 end-0 hidden w-1/2 items-end justify-center lg:flex">
              <img
                src={heroStudent}
                alt="3rd preparatory student celebrating academic success"
                className="block max-h-[520px] w-auto object-contain"
              />
            </div>
          </div>

          <div className="flex justify-center lg:hidden">
            <img
              src={heroStudent}
              alt="3rd preparatory student celebrating academic success"
              className="block max-h-[360px] w-auto object-contain sm:max-h-[440px]"
            />
          </div>
        </div>
      </section>

      {/* ══════════════ CURRICULUMS STRIP ══════════════ */}
      <section className="bg-[#2e0854] py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-violet-200/80">
            {t("home.accreditedCurriculums")}
          </span>
          {subjectsFromCourses.map((subject) => (
            <Link
              key={subject.id ?? subject.name}
              to={`/courses?subject=${encodeURIComponent(subject.name)}`}
              className="text-sm font-semibold text-white/90 tracking-wide transition-colors hover:text-white"
            >
              {subject.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════ FEATURED COURSES ══════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
              {t("home.featured")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3">
              {t("home.popularCourses")}
            </h2>
          </div>
          <Link
            to="/courses"
            className="text-xs font-bold text-brand-purple hover:text-brand flex items-center gap-1"
          >
            {t("home.viewAllCourses")} <ArrowIcon className="text-xs" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : featuredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {course.cover_image_url && (
                  <div
                    className="aspect-video w-full bg-gray-100 shrink-0"
                    style={{
                      backgroundImage: `url(${getFileUrl(course.cover_image_url)})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                )}
                <div className="p-5 flex-1 space-y-3">
                  {course.subjects && course.subjects.length > 0 && (
                    <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2 py-0.5 rounded-md tracking-wider uppercase inline-block">
                      {course.subjects[0].name}
                    </span>
                  )}
                  <h3 className="font-heading font-black text-sm text-[#2e0854] group-hover:text-brand-purple transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-2">
                    {course.description}
                  </p>
                </div>
                <div className="mt-2 pt-4 border-t border-gray-50 px-5 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                    <HiOutlineClock className="text-xs text-gray-300" />
                    <span className="font-light">{course.term || "N/A"}</span>
                  </div>
                  <span className="text-xs font-black font-mono text-[#2e0854]">
                    {Number(course.price) > 0
                      ? `EGP ${course.price}`
                      : t("common.free")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl">
            <p className="text-xs text-gray-400 font-light">
              {t("home.noCourses")}
            </p>
          </div>
        )}
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section className="bg-gray-50/60 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
              {t("home.simpleProcess")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3">
              {t("home.howItWorks")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, idx) => (
              <div
                key={step.title}
                className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3 relative"
              >
                <span className="absolute top-4 right-5 text-3xl font-black text-gray-100 font-mono">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center text-lg">
                  <step.icon />
                </div>
                <h3 className="font-heading font-bold text-sm text-[#2e0854]">
                  {step.title}
                </h3>
                <p className="text-xs text-gray-400 font-light leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURED INSTRUCTORS ══════════════ */}
      {!loading && instructors.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
                {t("home.faculty")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3">
                {t("home.meetInstructors")}
              </h2>
            </div>
            <Link
              to="/instructors"
              className="text-xs font-bold text-brand-purple hover:text-brand flex items-center gap-1"
            >
              {t("home.viewAllInstructors")} <ArrowIcon className="text-xs" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {instructors.slice(0, 3).map((member) => {
              const fullName = `${member.first_name} ${member.last_name}`;
              return (
                <Link
                  key={member.id}
                  to={`/instructors/${member.id}`}
                  className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col hover:shadow-md hover:border-gray-200/60 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center text-gray-300">
                      {member.profile_image_url ? (
                        <img
                          src={getFileUrl(member.profile_image_url)}
                          alt={fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <HiOutlineUser className="text-xl" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-black text-sm text-[#2e0854] group-hover:text-brand-purple transition-colors truncate">
                        {fullName}
                      </h3>
                      <p className="text-[11px] font-medium text-gray-400">
                        {t("home.coursesCount", {
                          count: member.course_count || 0,
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-2">
                    {member.bio || t("home.noBio")}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════ CTA BANNER ══════════════ */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto bg-[#2e0854] rounded-[32px] p-10 sm:p-14 text-center text-white relative overflow-hidden">
          <div className="absolute w-72 aspect-square bg-brand/20 rounded-full blur-3xl -z-0 top-0 right-0 transform translate-x-1/3 -translate-y-1/3" />
          <HiOutlineAcademicCap className="text-4xl text-red-300 mx-auto mb-4 relative z-10" />
          <h2 className="text-2xl sm:text-3xl font-black font-heading mb-3 relative z-10">
            {t("home.ctaTitle")}
          </h2>
          <p className="text-red-100/70 text-sm font-light max-w-md mx-auto mb-8 relative z-10">
            {t("home.ctaSubtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl px-6 py-3.5 transition-all shadow-lg shadow-brand/20 group"
            >
              <HiOutlineBookOpen />
              <span>{t("home.ctaBrowseCourses")}</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl px-6 py-3.5 border border-white/10 transition-all"
            >
              <HiOutlineUserGroup />
              <span>{t("home.ctaCreateAccount")}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
