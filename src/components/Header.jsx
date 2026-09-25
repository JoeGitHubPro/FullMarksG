import React, { useState } from "react";
import { FiMail, FiPhone, FiUser } from "react-icons/fi";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageToggle from "./LanguageToggle";
import BrandLogo from "./BrandLogo";
import { useTranslation } from "../i18n/LanguageContext";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
} from "../constants/contact";

const NAV_LINKS = [
  { to: "/", labelKey: "nav.home", end: true },
  { to: "/courses", labelKey: "nav.courses" },
  { to: "/months", labelKey: "nav.months" },
  { to: "/instructors", labelKey: "nav.instructors" },
  { to: "/about", labelKey: "nav.about" },
  { to: "/contact", labelKey: "nav.contact" },
];

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((open) => !open);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    setIsMenuOpen(false);
  };

  const getProfileLink = () => {
    if (!user) return "/login";
    if (user.role === "student" || user.role === "parent") {
      return "/profile";
    }
    return "/dashboard";
  };

  const getUserDisplay = () => {
    if (!user) return null;
    const fullName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
    const roleLabel = user.role ? t(`roles.${user.role}`) : "";
    return {
      fullName: fullName === "User" ? t("roles.user") : fullName,
      roleLabel,
    };
  };

  const userDisplay = isAuthenticated ? getUserDisplay() : null;

  const isActiveLink = (to, end = false) => {
    if (end) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const navLinkClass = (active) =>
    `relative px-1 py-2 text-sm font-medium transition-colors ${
      active
        ? "text-brand after:absolute after:bottom-0 after:start-0 after:h-0.5 after:w-full after:rounded-full after:bg-brand-purple"
        : "text-gray-500 hover:text-brand"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-violet-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0">
            <BrandLogo className="text-xl sm:text-2xl" />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map(({ to, labelKey, end }) => (
              <Link
                key={to}
                to={to}
                className={navLinkClass(isActiveLink(to, end))}
              >
                {t(labelKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle className="hidden sm:flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/60 px-3 py-1.5 text-xs font-semibold text-brand" />

            {isAuthenticated && userDisplay ? (
              <Link
                to={getProfileLink()}
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/50 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-violet-100/70"
              >
                <FiUser className="text-base text-brand-purple" />
                <span className="max-w-[120px] truncate">{userDisplay.fullName}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-colors hover:bg-brand-hover"
              >
                <FiUser className="text-base" />
                <span>{t("nav.loginSignUp")}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleMenu}
              className="inline-flex lg:hidden items-center justify-center rounded-xl border border-violet-100 p-2 text-brand transition-colors hover:bg-violet-50"
              aria-label={t("common.openMenu")}
            >
              <HiOutlineMenuAlt3 className="text-xl" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-brand/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMenu}
      />

      <aside
        className={`fixed top-0 end-0 z-50 flex h-full w-[min(100vw-3rem,320px)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isMenuOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
          <BrandLogo className="text-lg" />
          <button
            type="button"
            onClick={toggleMenu}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-violet-50 hover:text-brand"
            aria-label={t("common.closeMenu")}
          >
            <IoClose className="text-2xl" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV_LINKS.map(({ to, labelKey, end }) => {
            const active = isActiveLink(to, end);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-50 text-brand"
                    : "text-gray-600 hover:bg-violet-50/70 hover:text-brand"
                }`}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-violet-100 p-5 space-y-4">
          <LanguageToggle className="flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs font-semibold text-brand w-fit" />

          {isAuthenticated && userDisplay ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-sm font-bold text-brand">{userDisplay.fullName}</p>
                <p className="text-xs text-gray-400">{userDisplay.roleLabel}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={getProfileLink()}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-center text-xs font-semibold text-white"
                >
                  {user?.role === "student" || user?.role === "parent"
                    ? t("common.profile")
                    : t("nav.dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 rounded-xl border border-violet-100 px-3 py-2.5 text-xs font-semibold text-brand"
                >
                  {t("common.logout")}
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white"
            >
              {t("nav.loginSignUp")}
            </Link>
          )}

          <div className="space-y-2 pt-2 text-sm text-gray-500">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-2 hover:text-brand"
            >
              <FiMail className="text-brand-purple" />
              <span>{CONTACT_EMAIL}</span>
            </a>
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="flex items-center gap-2 hover:text-brand"
            >
              <FiPhone className="text-brand-purple" />
              <span>{CONTACT_PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Header;
