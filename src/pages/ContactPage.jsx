import React, { useState } from "react";
import {
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlinePaperAirplane,
} from "react-icons/hi";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import { normalizePhone } from "../utils/phone";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
  CONTACT_LOCATION,
} from "../constants/contact";

const INITIAL_FORM = {
  name: "",
  phone: "",
  subject: "",
  inquiryType: "general",
  message: "",
};

const ContactPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const normalizedPhone = normalizePhone(formData.phone);
    if (!normalizedPhone) {
      setErrorMessage(t("contact.errors.invalidPhone"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.submitContactForm({
        name: formData.name.trim(),
        phone: normalizedPhone,
        subject: formData.subject.trim(),
        inquiryType: formData.inquiryType,
        message: formData.message.trim(),
      });

      if (response?.success) {
        setSuccessMessage(response.message || t("contact.sentSuccess"));
        setFormData(INITIAL_FORM);
      } else {
        setErrorMessage(response?.message || t("contact.errors.sendFailed"));
      }
    } catch (err) {
      setErrorMessage(err?.message || t("contact.errors.sendFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactCards = [
    {
      title: t("contact.cards.email.title"),
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
      desc: t("contact.cards.email.desc"),
      icon: HiOutlineMail,
    },
    {
      title: t("contact.cards.phone.title"),
      value: CONTACT_PHONE_DISPLAY,
      href: `tel:${CONTACT_PHONE}`,
      desc: t("contact.cards.phone.desc"),
      icon: HiOutlinePhone,
    },
    {
      title: t("contact.cards.location.title"),
      value: CONTACT_LOCATION,
      desc: t("contact.cards.location.desc"),
      icon: HiOutlineLocationMarker,
    },
  ];

  return (
    <div className="space-y-12 py-4 animate-fadeIn">
      <div className="max-w-2xl">
        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
          {t("contact.badge")}
        </span>
        <h1 className="text-3xl font-black text-[#2e0854] tracking-tight font-heading mt-3">
          {t("contact.title")}
        </h1>
        <p className="text-xs text-gray-400 font-light mt-1.5 max-w-md leading-relaxed">
          {t("contact.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
          <form onSubmit={handleFormSubmission} className="space-y-5">
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-brand text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {t("contact.yourName")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("contact.placeholders.name")}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {t("contact.phone")}
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder={t("contact.placeholders.phone")}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                {t("contact.subject")}
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder={t("contact.placeholders.subject")}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                {t("contact.inquiryType")}
              </label>
              <select
                required
                value={formData.inquiryType}
                onChange={(e) =>
                  setFormData({ ...formData, inquiryType: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs text-[#2e0854] focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all cursor-pointer font-medium"
              >
                <option value="general">{t("contact.types.general")}</option>
                <option value="technical">
                  {t("contact.types.technical")}
                </option>
                <option value="billing">{t("contact.types.billing")}</option>
                <option value="courses">{t("contact.types.courses")}</option>
                <option value="enrollment">
                  {t("contact.types.enrollment")}
                </option>
                <option value="other">{t("contact.types.other")}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                {t("contact.message")}
              </label>
              <textarea
                required
                rows="4"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder={t("contact.placeholders.message")}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-medium text-xs tracking-wide shadow-sm shadow-brand/10 transition-all transform hover:-translate-y-0.5 disabled:transform-none"
            >
              <span>
                {isSubmitting ? t("contact.sending") : t("contact.send")}
              </span>
              <HiOutlinePaperAirplane className="text-xs transform rotate-45 flip-rtl" />
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {contactCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-xl bg-[#2e0854] text-white flex items-center justify-center text-base shrink-0 shadow-inner">
                  <Icon />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    {card.title}
                  </h4>
                  <p className="text-xs font-black text-[#2e0854] truncate font-heading">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
