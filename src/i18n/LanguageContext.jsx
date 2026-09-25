import { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./translations/en";
import ar from "./translations/ar";
import dashboardEn from "./translations/dashboard.en";
import dashboardAr from "./translations/dashboard.ar";

const STORAGE_KEY = "fullmarks-language";

const translations = {
  en: { ...en, dashboard: dashboardEn },
  ar: { ...ar, dashboard: dashboardAr },
};

const LanguageContext = createContext(null);

const getNestedValue = (object, path) =>
  path.split(".").reduce((current, key) => current?.[key], object);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "ar" || saved === "en" ? saved : "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((current) => (current === "en" ? "ar" : "en"));
  };

  const t = (key, vars = {}) => {
    let value =
      getNestedValue(translations[language], key) ??
      getNestedValue(translations.en, key) ??
      key;

    if (typeof value === "string") {
      Object.entries(vars).forEach(([name, replacement]) => {
        value = value.replace(`{{${name}}}`, String(replacement));
      });
    }

    return value;
  };

  const value = useMemo(
    () => ({
      language,
      isRtl: language === "ar",
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

export const useTranslation = () => {
  const { t, language, isRtl, toggleLanguage, setLanguage } = useLanguage();
  return { t, language, isRtl, toggleLanguage, setLanguage };
};
