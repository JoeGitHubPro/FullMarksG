import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  HiOutlineSearch,
  HiOutlineClock,
  HiOutlineUserGroup,
} from "react-icons/hi";
import { api, getFileUrl } from "../api"; // adjust path
import { useTranslation } from "../i18n/LanguageContext";

const CoursesCatalogPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    () => searchParams.get("subject") || "all",
  );

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setSearchQuery((current) => (current !== urlSearch ? urlSearch : current));
    setSelectedCategory(searchParams.get("subject") || "all");
  }, [searchParams]);

  const updateSearchParams = (search, subject) => {
    const params = {};
    const trimmedSearch = search.trim();
    if (trimmedSearch) params.search = trimmedSearch;
    if (subject && subject !== "all") params.subject = subject;
    setSearchParams(params, { replace: true });
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    updateSearchParams(value, selectedCategory);
  };

  const handleCategoryChange = (tab) => {
    setSelectedCategory(tab);
    updateSearchParams(searchQuery, tab);
  };

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch only published courses for public catalog
        const response = await api.getAllCourses({
          status: "published",
          limit: 100,
        });
        if (response.success) {
          setCourses(response.data);
        } else {
          setError(response.message || t("coursesCatalog.loadError"));
        }
      } catch (err) {
        setError(err.message || "Network error.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Extract unique category names from the courses' subjects
  const availableCategories = useMemo(() => {
    const categories = new Set();
    courses.forEach((course) => {
      if (course.subjects && Array.isArray(course.subjects)) {
        course.subjects.forEach((subject) => {
          categories.add(subject.name);
        });
      }
    });
    return ["all", ...Array.from(categories)];
  }, [courses]);

  // Filter courses by search query and selected category
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        course.title.toLowerCase().includes(query) ||
        (course.slug && course.slug.toLowerCase().includes(query)) ||
        (course.description &&
          course.description.toLowerCase().includes(query)) ||
        (course.subjects &&
          course.subjects.some((s) => s.name.toLowerCase().includes(query)));

      const matchesCategory =
        selectedCategory === "all" ||
        (course.subjects &&
          course.subjects.some((s) => s.name === selectedCategory));

      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("coursesCatalog.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-sm text-brand-purple">⚠️ {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-brand-purple underline"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-4 animate-fadeIn">
      {/* HEADER */}
      <div className="max-w-2xl">
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {t("coursesCatalog.badge")}
        </span>
        <h1 className="text-3xl font-black text-[#2e0854] tracking-tight font-heading mt-3">
          {t("coursesCatalog.title")}
        </h1>
        <p className="text-xs text-gray-400 font-light mt-1.5 leading-relaxed">
          {t("coursesCatalog.subtitle")}
        </p>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="relative max-w-sm w-full">
          <HiOutlineSearch className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("coursesCatalog.searchPlaceholder")}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl ps-9 pe-4 py-2 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableCategories.map((tab) => (
            <button
              key={tab}
              onClick={() => handleCategoryChange(tab)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide border transition-all uppercase ${
                selectedCategory === tab
                  ? "bg-[#2e0854] text-white border-[#2e0854]"
                  : "bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-500"
              }`}
            >
              {tab === "all" ? t("coursesCatalog.allCategories") : tab}
            </button>
          ))}
        </div>
      </div>

      {/* COURSE GRID */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
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
        <div className="text-center py-16 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl space-y-2">
          <HiOutlineUserGroup className="text-3xl text-gray-300 mx-auto" />
          <h3 className="font-heading font-bold text-xs text-[#2e0854]">
            {t("coursesCatalog.noResultsTitle")}
          </h3>
          <p className="text-[11px] text-gray-400 font-light max-w-xs mx-auto">
            {t("coursesCatalog.noResultsDesc")}
          </p>
        </div>
      )}
    </div>
  );
};

export default CoursesCatalogPage;
