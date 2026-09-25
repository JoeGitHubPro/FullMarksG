import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCollection, HiOutlineBookOpen } from "react-icons/hi";
import { api, getFileUrl } from "../api";
import { useTranslation } from "../i18n/LanguageContext";

const CategoriesCatalogPage = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.getAllCategories({
          status: "published",
          limit: 100,
        });
        if (response.success) {
          setCategories(response.data);
        } else {
          setError(response.message || t("categoriesCatalog.loadError"));
        }
      } catch (err) {
        setError(err.message || "Network error.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("categoriesCatalog.loading")}
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
          {t("categoriesCatalog.badge")}
        </span>
        <h1 className="text-3xl font-black text-[#2e0854] tracking-tight font-heading mt-3">
          {t("categoriesCatalog.title")}
        </h1>
        <p className="text-xs text-gray-400 font-light mt-1.5 leading-relaxed">
          {t("categoriesCatalog.subtitle")}
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/months/${category.slug}`}
              className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
            >
              {category.cover_image_url ? (
                <div
                  className="aspect-video w-full bg-gray-100 shrink-0"
                  style={{
                    backgroundImage: `url(${getFileUrl(category.cover_image_url)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <div className="aspect-video w-full bg-violet-50 shrink-0 flex items-center justify-center">
                  <HiOutlineCollection className="text-3xl text-brand-purple" />
                </div>
              )}

              <div className="p-5 flex-1 space-y-3">
                <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2 py-0.5 rounded-md tracking-wider uppercase inline-flex items-center gap-1">
                  <HiOutlineBookOpen className="text-xs" />
                  {t("categoriesCatalog.coursesCount", {
                    count: (category.courses || []).length,
                  })}
                </span>
                <h3 className="font-heading font-black text-sm text-[#2e0854] group-hover:text-brand-purple transition-colors line-clamp-1">
                  {category.title}
                </h3>
                {category.description && (
                  <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-2">
                    {category.description}
                  </p>
                )}
              </div>

              <div className="mt-2 pt-4 border-t border-gray-50 px-5 pb-4 flex items-center justify-end">
                <span className="text-xs font-black font-mono text-[#2e0854]">
                  {Number(category.price) > 0
                    ? `EGP ${category.price}`
                    : t("common.free")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl space-y-2">
          <HiOutlineCollection className="text-3xl text-gray-300 mx-auto" />
          <h3 className="font-heading font-bold text-xs text-[#2e0854]">
            {t("categoriesCatalog.noResultsTitle")}
          </h3>
        </div>
      )}
    </div>
  );
};

export default CategoriesCatalogPage;
