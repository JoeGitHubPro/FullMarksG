import React from "react";
import {
  HiOutlineAcademicCap,
  HiOutlineBolt,
  HiOutlineShieldCheck,
  HiOutlineGlobeAlt,
} from "react-icons/hi2";
import { useTranslation } from "../i18n/LanguageContext";

const AboutPage = () => {
  const { t } = useTranslation();

  const values = [
    {
      title: t("about.values.excellence.title"),
      desc: t("about.values.excellence.desc"),
      icon: HiOutlineAcademicCap,
      color: "bg-violet-50 text-brand-purple border-violet-100/50",
    },
    {
      title: t("about.values.infrastructure.title"),
      desc: t("about.values.infrastructure.desc"),
      icon: HiOutlineBolt,
      color: "bg-amber-50 text-amber-600 border-amber-100/50",
    },
    {
      title: t("about.values.safety.title"),
      desc: t("about.values.safety.desc"),
      icon: HiOutlineShieldCheck,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100/50",
    },
  ];

  const stats = [
    { label: t("about.stats.candidates"), value: "14,200+" },
    { label: t("about.stats.modules"), value: "480+" },
    { label: t("about.stats.faculty"), value: "120+" },
    { label: t("about.stats.success"), value: "98.4%" },
  ];

  return (
    <div className="space-y-16 py-4 animate-fadeIn">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {t("about.badge")}
        </span>
        <h1 className="text-4xl font-black text-[#2e0854] tracking-tight font-heading leading-tight sm:text-5xl">
          {t("about.title")}
        </h1>
        <p className="text-sm text-gray-400 font-light leading-relaxed max-w-2xl mx-auto">
          {t("about.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 border border-gray-100 rounded-2xl p-6 shadow-2xs">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="text-center p-4 bg-white border border-gray-100/50 rounded-xl shadow-xs"
          >
            <h3 className="text-2xl font-black font-heading text-[#2e0854]">
              {stat.value}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-[#2e0854] font-heading">
            {t("about.valuesTitle")}
          </h2>
          <p className="text-xs text-gray-400 font-light">
            {t("about.valuesSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((val) => {
            const Icon = val.icon;
            return (
              <div
                key={val.title}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${val.color}`}
                  >
                    <Icon />
                  </div>
                  <h3 className="font-heading font-bold text-sm text-[#2e0854]">
                    {val.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-light leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#2e0854] rounded-2xl p-8 text-white relative overflow-hidden group shadow-md shadow-brand/10">
        <div className="relative z-10 space-y-3 max-w-xl">
          <HiOutlineGlobeAlt className="text-3xl text-brand-violet" />
          <h3 className="text-lg font-bold font-heading">
            {t("about.missionTitle")}
          </h3>
          <p className="text-xs text-violet-100/70 font-light leading-relaxed">
            {t("about.missionDesc")}
          </p>
        </div>
        <div className="absolute top-1/2 end-0 -translate-y-1/2 translate-x-12 rtl:-translate-x-12 text-white/5 font-heading font-black text-9xl select-none uppercase tracking-tighter">
          FM
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
