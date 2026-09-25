import LegalDocumentLayout from "../components/LegalDocumentLayout";
import { useTranslation } from "../i18n/LanguageContext";
import privacyEn from "../i18n/content/privacyPolicy.en";
import privacyAr from "../i18n/content/privacyPolicy.ar";

const PrivacyPolicyPage = () => {
  const { language } = useTranslation();
  const content = language === "ar" ? privacyAr : privacyEn;

  return (
    <LegalDocumentLayout
      badge={content.badge}
      title={content.title}
      description={content.description}
      lastUpdated={content.lastUpdated}
      relatedLink={{
        to: "/terms-and-conditions",
        label: content.relatedLabel,
      }}
      sections={content.sections}
    />
  );
};

export default PrivacyPolicyPage;
