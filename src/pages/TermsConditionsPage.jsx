import LegalDocumentLayout from "../components/LegalDocumentLayout";
import { useTranslation } from "../i18n/LanguageContext";
import termsEn from "../i18n/content/termsConditions.en";
import termsAr from "../i18n/content/termsConditions.ar";

const TermsConditionsPage = () => {
  const { language } = useTranslation();
  const content = language === "ar" ? termsAr : termsEn;

  return (
    <LegalDocumentLayout
      badge={content.badge}
      title={content.title}
      description={content.description}
      lastUpdated={content.lastUpdated}
      relatedLink={{
        to: "/privacy-policy",
        label: content.relatedLabel,
      }}
      sections={content.sections}
    />
  );
};

export default TermsConditionsPage;
