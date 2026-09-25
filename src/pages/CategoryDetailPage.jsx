// src/pages/CategoryDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineKey,
  HiOutlineCollection,
  HiOutlineChevronRight,
} from "react-icons/hi";
import { api, getFileUrl } from "../api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import RedeemCodeModal from "../components/RedeemCodeModal";
import PayOnlineButton from "../components/PayOnlineButton";

const CategoryDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getCategoryBySlug(slug);
        if (res.success) {
          setCategory(res.data);
        } else {
          setError(res.message || t("categoryDetail.notFound"));
        }
      } catch (err) {
        setError(err.message || t("categoryDetail.notFound"));
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [slug]);

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-sm text-brand-purple">⚠️ {error || t("categoryDetail.notFound")}</p>
        <Link
          to="/months"
          className="inline-flex items-center gap-2 text-xs text-brand-purple underline"
        >
          <HiOutlineArrowLeft />
          {t("categoryDetail.backToCatalog")}
        </Link>
      </div>
    );
  }

  const { title, description, price, cover_image_url, courses = [] } = category;

  return (
    <div className="space-y-10 py-2 animate-fadeIn">
      <button
        onClick={() => navigate("/months")}
        className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-[#2e0854] transition-colors"
      >
        <HiOutlineArrowLeft className="text-sm" />
        <span>{t("categoryDetail.backToCatalog")}</span>
      </button>

      <div
        className="bg-[#2e0854] rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
        style={
          cover_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(43,2,7,0.85), rgba(43,2,7,0.85)), url(${getFileUrl(cover_image_url)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        <div className="space-y-2">
          <span className="text-[10px] font-mono tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <HiOutlineCollection className="text-xs" />
            {t("categoriesCatalog.coursesCount", { count: courses.length })}
          </span>
          <h1 className="text-3xl font-black font-heading leading-tight sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-red-100/70 font-light max-w-xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="bg-white/10 border border-white/5 px-4 py-3 rounded-xl text-center min-w-[120px] shrink-0 self-start sm:self-center">
          <span className="text-[9px] text-red-300 uppercase font-bold tracking-wider block">
            {t("courseDetail.price")}
          </span>
          <span className="text-2xl font-heading font-black text-white font-mono">
            {Number(price) > 0 ? `EGP ${price}` : t("common.free")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-heading font-black text-sm text-[#2e0854] px-1">
            {t("categoryDetail.coursesInside")}
          </h2>
          <div className="space-y-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-gray-200 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {course.cover_image_url ? (
                    <img
                      src={getFileUrl(course.cover_image_url)}
                      alt={course.title}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center shrink-0">
                      <HiOutlineCollection />
                    </div>
                  )}
                  <span className="text-sm font-bold text-[#2e0854] group-hover:text-brand-purple transition-colors truncate">
                    {course.title}
                  </span>
                </div>
                <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
            {courses.length === 0 && (
              <p className="text-xs text-gray-400 font-light">
                {t("categoryDetail.noCourses")}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading font-black text-sm text-[#2e0854]">
              {t("categoryDetail.unlockTitle")}
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              {t("categoryDetail.unlockDesc")}
            </p>
            {isAuthenticated && user?.role === "student" ? (
              <>
                {Number(price) > 0 && (
                  <PayOnlineButton
                    itemType="category"
                    itemId={category.id}
                    amount={price}
                    currency="EGP"
                    onPaid={() => {}}
                  />
                )}
                <button
                  onClick={() => setShowRedeemModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-xs py-3 rounded-xl transition-all"
                >
                  <HiOutlineKey />
                  {t("courseDetail.enrollWithAccessCode")}
                </button>
              </>
            ) : isAuthenticated ? null : (
              <Link
                to="/login"
                className="block text-center w-full bg-brand hover:bg-brand-dark text-white font-semibold text-xs py-3 rounded-xl transition-all"
              >
                {t("courseDetail.loginToEnroll")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {showRedeemModal && (
        <RedeemCodeModal
          onClose={() => setShowRedeemModal(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};

export default CategoryDetailPage;
