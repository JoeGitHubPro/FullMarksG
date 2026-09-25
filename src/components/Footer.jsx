import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa";
import {
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineArrowRight,
} from "react-icons/hi";
import { useTranslation } from "../i18n/LanguageContext";
import { getWhatsAppUrl, normalizePhone } from "../utils/phone";
import { api } from "../api";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
  CONTACT_LOCATION,
} from "../constants/contact";
import BrandLogo from "./BrandLogo";

const SOCIAL_LINKS = [
  {
    href: "https://www.youtube.com/@fullmarks-edu",
    labelKey: "footer.social.youtube",
    Icon: FaYoutube,
  },
  {
    href: "https://www.instagram.com/fullmarks.online",
    labelKey: "footer.social.instagram",
    Icon: FaInstagram,
  },
  {
    href: "https://www.tiktok.com/@fullmarksedu",
    labelKey: "footer.social.tiktok",
    Icon: FaTiktok,
  },
];

const EXPLORE_LINKS = [
  { to: "/", labelKey: "nav.home" },
  { to: "/about", labelKey: "nav.about" },
  { to: "/courses", labelKey: "footer.courseCatalog" },
  { to: "/instructors", labelKey: "footer.ourInstructors" },
  { to: "/contact", labelKey: "footer.contactUs" },
];

const START_LINKS = [
  { to: "/login", labelKey: "footer.logIn" },
  { to: "/login?mode=register", labelKey: "footer.createAccount" },
  { to: "/courses", labelKey: "footer.redeemCode" },
];

const Footer = () => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState("idle");
  const whatsappUrl = getWhatsAppUrl(CONTACT_PHONE);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setSubscribeStatus("error");
      return;
    }

    setSubscribeStatus("loading");
    try {
      const response = await api.subscribeNewsletter(normalizedPhone);
      setSubscribeStatus(response.alreadySubscribed ? "already" : "success");
      if (!response.alreadySubscribed) {
        setPhone("");
      }
    } catch {
      setSubscribeStatus("error");
    }
  };

  return (
    <footer className="mt-auto border-t border-violet-100 bg-white">
      {/* Newsletter band */}
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-violet-50/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-purple">
              {t("footer.newsletter")}
            </p>
            <h2 className="mt-2 font-heading text-xl font-black text-brand sm:text-2xl">
              {t("footer.newsletterTitle")}
            </h2>
            <p className="mt-2 text-sm font-light text-gray-500">
              {t("footer.newsletterDesc")}
            </p>
          </div>

          <form
            onSubmit={handleNewsletterSubmit}
            className="w-full max-w-md shrink-0"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <HiOutlinePhone className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (
                      subscribeStatus !== "idle" &&
                      subscribeStatus !== "loading"
                    ) {
                      setSubscribeStatus("idle");
                    }
                  }}
                  placeholder={t("footer.newsletterPlaceholder")}
                  disabled={subscribeStatus === "loading"}
                  className="w-full rounded-xl border border-violet-100 bg-white py-3 ps-10 pe-4 text-sm text-brand placeholder-gray-400 shadow-sm focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={subscribeStatus === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {subscribeStatus === "loading"
                  ? "..."
                  : t("footer.newsletterSubscribe")}
                <HiOutlineArrowRight className="text-base" />
              </button>
            </div>
            {subscribeStatus === "success" && (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                {t("footer.newsletterSuccess")}
              </p>
            )}
            {subscribeStatus === "already" && (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                {t("footer.newsletterAlready")}
              </p>
            )}
            {subscribeStatus === "error" && (
              <p className="mt-2 text-xs font-medium text-orange-600">
                {t("footer.newsletterError")}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Main columns */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link to="/">
              <BrandLogo className="text-2xl" />
            </Link>
            <p className="mt-4 max-w-sm text-sm font-light leading-relaxed text-gray-500">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIAL_LINKS.map(({ href, labelKey, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(labelKey)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-100 bg-violet-50/60 text-brand transition-colors hover:border-brand-purple hover:bg-violet-100 hover:text-brand-purple"
                >
                  <Icon className="text-lg" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand">
              {t("footer.quickLinks")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE_LINKS.map(({ to, labelKey }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-gray-500 transition-colors hover:text-brand-purple"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand">
              {t("footer.getStarted")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {START_LINKS.map(({ to, labelKey }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-gray-500 transition-colors hover:text-brand-purple"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand">
              {t("footer.contactDetails")}
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="group flex items-start gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-brand-purple">
                    <HiOutlineMail />
                  </span>
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {t("footer.emailLabel")}
                    </span>
                    <span className="text-sm font-medium text-brand group-hover:text-brand-purple">
                      {CONTACT_EMAIL}
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT_PHONE}`}
                  className="group flex items-start gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-brand-purple">
                    <HiOutlinePhone />
                  </span>
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {t("footer.phoneLabel")}
                    </span>
                    <span className="text-sm font-medium text-brand group-hover:text-brand-purple">
                      {CONTACT_PHONE_DISPLAY}
                    </span>
                  </span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-brand-purple">
                  <HiOutlineLocationMarker />
                </span>
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Location
                  </span>
                  <span className="text-sm font-medium text-brand">
                    {CONTACT_LOCATION}
                  </span>
                </span>
              </li>
              {whatsappUrl && (
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    {t("footer.chatWhatsApp")}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-violet-100 bg-brand text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-center sm:flex-row sm:px-6 sm:text-start lg:px-8">
          <p className="text-xs font-light text-violet-200/90">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium">
            <Link
              to="/privacy-policy"
              className="text-violet-100/90 transition-colors hover:text-white"
            >
              {t("footer.privacyPolicy")}
            </Link>
            <Link
              to="/terms-and-conditions"
              className="text-violet-100/90 transition-colors hover:text-white"
            >
              {t("footer.termsConditions")}
            </Link>
            <Link
              to="/contact"
              className="text-violet-100/90 transition-colors hover:text-white"
            >
              {t("footer.sendMessage")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
