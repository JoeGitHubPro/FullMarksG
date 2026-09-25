import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useTranslation } from "../i18n/LanguageContext";
import {
  HiOutlineSearch,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlineUsers,
  HiOutlineX,
} from "react-icons/hi";

const TYPE_ICONS = {
  courses: HiOutlineAcademicCap,
  instructors: HiOutlineUserGroup,
  subjects: HiOutlineBookOpen,
  users: HiOutlineUsers,
};

const USER_ROLE_PATHS = {
  student: "students",
  instructor: "instructors",
  parent: "parents",
  admin: "admins",
  assistant: "assistants",
};

const getSearchTypes = (role) => {
  if (role === "admin") return undefined;
  if (role === "instructor" || role === "assistant") return "courses";
  return "courses,instructors,subjects";
};

const getResultLabel = (type, item) => {
  switch (type) {
    case "courses":
      return item.title;
    case "instructors":
      return `${item.first_name || ""} ${item.last_name || ""}`.trim();
    case "subjects":
      return item.name;
    case "users":
      return `${item.first_name || ""} ${item.last_name || ""}`.trim();
    default:
      return "";
  }
};

const getResultPath = (type, item, role) => {
  switch (type) {
    case "courses":
      return item.slug ? `/dashboard/courses/${item.slug}` : null;
    case "instructors":
      return item.user_id ? `/dashboard/instructors/${item.user_id}` : null;
    case "subjects":
      return role === "admin" ? "/dashboard/subjects" : null;
    case "users": {
      const segment = USER_ROLE_PATHS[item.role];
      return segment && item.id ? `/dashboard/${segment}/${item.id}` : null;
    }
    default:
      return null;
  }
};

const flattenResults = (data) => {
  if (!data) return [];
  return Object.entries(data).flatMap(([type, bucket]) =>
    (bucket?.items || []).map((item) => ({ type, item })),
  );
};

const DashboardSearch = ({
  role,
  variant = "desktop",
  onClose,
  className = "",
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const getResultMeta = (type, item) => {
    switch (type) {
      case "courses":
        return item.status || item.term || t("dashboard.search.meta.course");
      case "instructors":
        return t("dashboard.search.meta.coursesCount", {
          count: item.course_count || 0,
        });
      case "subjects":
        return item.subject_code || t("dashboard.search.meta.subject");
      case "users":
        return item.role
          ? t(`roles.${item.role}`)
          : t("dashboard.search.meta.user");
      default:
        return "";
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const timeout = setTimeout(async () => {
      try {
        const types = getSearchTypes(role);
        const response = await api.search(trimmed, {
          limit: 8,
          ...(types ? { types } : {}),
        });

        if (response.success) {
          setResults(flattenResults(response.data));
          setIsOpen(true);
        } else {
          setResults([]);
          setError(response.message || t("dashboard.search.failed"));
        }
      } catch (err) {
        setResults([]);
        setError(err?.message || t("dashboard.search.failed"));
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, role, t]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (type, item) => {
    const path = getResultPath(type, item, role);
    if (!path) return;

    setQuery("");
    setResults([]);
    setIsOpen(false);
    onClose?.();
    navigate(path);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError("");
    setIsOpen(false);
  };

  const showDropdown =
    isOpen && (loading || error || results.length > 0 || query.trim().length >= 2);

  const placeholder =
    role === "admin"
      ? t("dashboard.search.placeholderAdmin")
      : t("dashboard.search.placeholderDefault");

  const input = (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
      placeholder={placeholder}
      autoFocus={variant === "mobile"}
      className={
        variant === "mobile"
          ? "w-full bg-transparent focus:outline-none text-sm text-[#2e0854]"
          : "w-full bg-gray-50 border border-gray-100 rounded-xl ps-11 pe-10 py-2 text-sm text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:bg-white transition-all font-light"
      }
    />
  );

  const dropdown = showDropdown && (
    <div
      className={`absolute start-0 end-0 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50 ${
        variant === "mobile" ? "top-full mt-2" : "top-[calc(100%+8px)]"
      }`}
    >
      {loading && (
        <div className="px-4 py-3 text-xs text-gray-400">
          {t("dashboard.search.searching")}
        </div>
      )}

      {!loading && error && (
        <div className="px-4 py-3 text-xs text-brand-purple">{error}</div>
      )}

      {!loading && !error && results.length === 0 && query.trim().length >= 2 && (
        <div className="px-4 py-3 text-xs text-gray-400">
          {t("dashboard.search.noResults")}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="max-h-80 overflow-y-auto py-1">
          {results.map(({ type, item }) => {
            const Icon = TYPE_ICONS[type] || HiOutlineSearch;
            const path = getResultPath(type, item, role);
            const typeLabel =
              t(`dashboard.search.types.${type}`) ||
              t("dashboard.search.meta.result");

            return (
              <button
                key={`${type}-${item.id || item.user_id || item.slug}`}
                type="button"
                onClick={() => handleSelect(type, item)}
                disabled={!path}
                className={`w-full flex items-center gap-3 px-4 py-3 text-start transition-colors ${
                  path ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-brand-purple flex items-center justify-center shrink-0">
                  <Icon className="text-base" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#2e0854] truncate">
                    {getResultLabel(type, item) ||
                      t("dashboard.search.meta.result")}
                  </p>
                  <p className="text-[11px] text-gray-400 capitalize truncate">
                    {typeLabel} · {getResultMeta(type, item)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (variant === "mobile") {
    return (
      <div ref={containerRef} className={`relative w-full ${className}`}>
        <div className="w-full bg-white rounded-2xl p-4 shadow-xl flex items-center gap-3 border border-gray-100">
          <HiOutlineSearch className="text-gray-400 text-xl shrink-0" />
          {input}
          <button
            type="button"
            onClick={() => {
              handleClear();
              onClose?.();
            }}
            className="p-1.5 rounded-xl bg-gray-50 text-gray-400"
          >
            <HiOutlineX className="text-base" />
          </button>
        </div>
        {dropdown}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <HiOutlineSearch className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
      {input}
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <HiOutlineX className="text-base" />
        </button>
      )}
      {dropdown}
    </div>
  );
};

export default DashboardSearch;
