import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineSearch,
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineUserGroup,
  HiOutlineUser,
} from "react-icons/hi";
import { api, getFileUrl } from "../api";
import { useTranslation } from "../i18n/LanguageContext";

const InstructorsCatalogPage = () => {
  const { t } = useTranslation();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchInstructors = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.getPublicInstructors();
        if (response.success) {
          setInstructors(response.data);
        } else {
          setError(response.message || t("instructorsCatalog.loadError"));
        }
      } catch (err) {
        setError(err.message || "Network error.");
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, []);

  const filteredFaculty = useMemo(() => {
    if (!searchQuery.trim()) return instructors;
    const q = searchQuery.toLowerCase();
    return instructors.filter((member) => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (member.bio && member.bio.toLowerCase().includes(q)) ||
        (member.subject_names && member.subject_names.toLowerCase().includes(q))
      );
    });
  }, [instructors, searchQuery]);

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("instructorsCatalog.loading")}
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
      <div className="max-w-2xl">
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {t("instructorsCatalog.badge")}
        </span>
        <h1 className="text-3xl font-black text-[#2e0854] tracking-tight font-heading mt-3">
          {t("instructorsCatalog.title")}
        </h1>
        <p className="text-xs text-gray-400 font-light mt-1.5 leading-relaxed">
          {t("instructorsCatalog.subtitle")}
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-b-gray-100 pb-6">
        <div className="relative max-w-sm w-full">
          <HiOutlineSearch className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("instructorsCatalog.searchPlaceholder")}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl ps-9 pe-4 py-2 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all"
          />
        </div>
      </div>

      {filteredFaculty.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculty.map((member) => {
            const fullName = `${member.first_name} ${member.last_name}`;
            return (
              <div
                key={member.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md hover:border-gray-200/60 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
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
                    <div className="space-y-0.5 min-w-0">
                      {member.subject_names && (
                        <span className="text-[9px] font-black tracking-wider text-brand-purple bg-violet-50 px-2 py-0.5 rounded-md uppercase inline-block">
                          {member.subject_names}
                        </span>
                      )}
                      <h3 className="font-heading font-black text-sm text-[#2e0854] group-hover:text-brand-purple transition-colors mt-1 truncate">
                        {fullName}
                      </h3>
                      <p className="text-[11px] font-medium text-gray-400">
                        {t("instructorDetail.instructor")}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-3">
                    {member.bio || t("instructorDetail.noBio")}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#2e0854] bg-gray-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <HiOutlineAcademicCap className="text-xs" />
                    {t("instructorsCatalog.coursesCount", {
                      count: member.course_count || 0,
                    })}
                  </span>

                  <Link
                    to={`/instructors/${member.id}`}
                    className="w-7 h-7 rounded-lg bg-gray-50 text-[#2e0854] group-hover:bg-[#2e0854] group-hover:text-white flex items-center justify-center transition-all shadow-2xs"
                  >
                    <HiOutlineArrowRight className="text-xs flip-rtl transform group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl space-y-2">
          <HiOutlineUserGroup className="text-3xl text-gray-300 mx-auto" />
          <h3 className="font-heading font-bold text-xs text-[#2e0854]">
            {t("instructorsCatalog.noResults")}
          </h3>
          <p className="text-[11px] text-gray-400 font-light max-w-xs mx-auto">
            {t("coursesCatalog.noResultsDesc")}
          </p>
        </div>
      )}
    </div>
  );
};

export default InstructorsCatalogPage;
