import { FiGlobe } from "react-icons/fi";
import { useTranslation } from "../i18n/LanguageContext";

const LanguageToggle = ({ className = "" }) => {
  const { language, toggleLanguage, t } = useTranslation();
  const nextLabel = language === "en" ? t("common.arabic") : t("common.english");

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`transition-colors hover:opacity-80 ${className}`}
      aria-label={nextLabel}
      title={nextLabel}
    >
      <FiGlobe className="text-base text-brand-orange" />
      <span className="tracking-wide uppercase text-xs font-semibold">
        {language === "ar" ? "AR" : "EN"}
      </span>
    </button>
  );
};

export default LanguageToggle;
