export const EGYPT_GOVERNORATES = [
  { value: "Cairo", en: "Cairo", ar: "القاهرة" },
  { value: "Giza", en: "Giza", ar: "الجيزة" },
  { value: "Alexandria", en: "Alexandria", ar: "الإسكندرية" },
  { value: "Qalyubia", en: "Qalyubia", ar: "القليوبية" },
  { value: "Port Said", en: "Port Said", ar: "بورسعيد" },
  { value: "Suez", en: "Suez", ar: "السويس" },
  { value: "Ismailia", en: "Ismailia", ar: "الإسماعيلية" },
  { value: "Dakahlia", en: "Dakahlia", ar: "الدقهلية" },
  { value: "Sharqia", en: "Sharqia", ar: "الشرقية" },
  { value: "Gharbia", en: "Gharbia", ar: "الغربية" },
  { value: "Monufia", en: "Monufia", ar: "المنوفية" },
  { value: "Beheira", en: "Beheira", ar: "البحيرة" },
  { value: "Kafr El Sheikh", en: "Kafr El Sheikh", ar: "كفر الشيخ" },
  { value: "Damietta", en: "Damietta", ar: "دمياط" },
  { value: "North Sinai", en: "North Sinai", ar: "شمال سيناء" },
  { value: "South Sinai", en: "South Sinai", ar: "جنوب سيناء" },
  { value: "Faiyum", en: "Faiyum", ar: "الفيوم" },
  { value: "Beni Suef", en: "Beni Suef", ar: "بني سويف" },
  { value: "Minya", en: "Minya", ar: "المنيا" },
  { value: "Assiut", en: "Assiut", ar: "أسيوط" },
  { value: "Sohag", en: "Sohag", ar: "سوهاج" },
  { value: "Qena", en: "Qena", ar: "قنا" },
  { value: "Luxor", en: "Luxor", ar: "الأقصر" },
  { value: "Aswan", en: "Aswan", ar: "أسوان" },
  { value: "Red Sea", en: "Red Sea", ar: "البحر الأحمر" },
  { value: "New Valley", en: "New Valley", ar: "الوادي الجديد" },
  { value: "Matrouh", en: "Matrouh", ar: "مطروح" },
];

export const DEFAULT_GOVERNORATE = "Ismailia";

export const getGovernorateLabel = (value, language = "en") => {
  const match = EGYPT_GOVERNORATES.find((gov) => gov.value === value);
  if (!match) return value || "";
  return language === "ar" ? match.ar : match.en;
};
