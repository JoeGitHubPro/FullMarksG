import React from "react";
import { Link } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";
import { useTranslation } from "../i18n/LanguageContext";

const LegalDocumentLayout = ({
  badge,
  title,
  description,
  lastUpdated,
  sections,
  relatedLink,
}) => {
  const { t, isRtl } = useTranslation();
  const BackIcon = isRtl ? HiOutlineArrowRight : HiOutlineArrowLeft;

  return (
    <div className="space-y-8 py-4 animate-fadeIn max-w-3xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#2e0854] transition-colors"
      >
        <BackIcon className="text-sm" />
        {t("common.backToHome")}
      </Link>

      <div className="space-y-3">
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {badge}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#2e0854] tracking-tight font-heading leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-400 font-light leading-relaxed">
            {description}
          </p>
        )}
        {lastUpdated && (
          <p className="text-[11px] text-gray-400 font-medium">
            {t("common.lastUpdated")}: {lastUpdated}
          </p>
        )}
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-black text-[#2e0854] font-heading">
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph, index) => (
              <p
                key={index}
                className="text-sm text-gray-500 font-light leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
            {section.list && (
              <ul className="list-disc ps-5 space-y-2 text-sm text-gray-500 font-light leading-relaxed">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {relatedLink && (
        <div className="pt-4 border-t border-gray-100 text-sm text-gray-400 font-light">
          {t("common.seeAlso")}:{" "}
          <Link
            to={relatedLink.to}
            className="text-brand-purple font-semibold hover:underline"
          >
            {relatedLink.label}
          </Link>
        </div>
      )}
    </div>
  );
};

export default LegalDocumentLayout;
