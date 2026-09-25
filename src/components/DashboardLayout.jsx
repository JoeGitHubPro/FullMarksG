import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import {
  getDashboardTabsForRole,
  DASHBOARD_TAB_KEYS,
} from "../i18n/dashboardNav";
import {
  HiOutlineLogout,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineChevronDown,
} from "react-icons/hi";
import DashboardSidebar from "./DashboardSidebar";
import DashboardSearch from "./DashboardSearch";
import LanguageToggle from "./LanguageToggle";
import { getFileUrl, getUserProfileImage } from "../api";

const DashboardLayout = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mainScrollRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const navigationTabs = getDashboardTabsForRole(user?.role);

  useEffect(() => {
    const currentPath = location.pathname.replace(/^\/|\/$/g, "");
    setActiveTab(currentPath || "dashboard");
  }, [location, setActiveTab]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const handleNavigationShift = (destinationPath) => {
    setActiveTab(destinationPath);
    navigate(`/${destinationPath}`);
  };

  const getActiveTabLabel = () => {
    const cleanedActive = activeTab.toLowerCase().replace(/^\/|\/$/g, "");
    const matchedTab = navigationTabs.find(
      (tab) =>
        tab.path.toLowerCase() === cleanedActive ||
        tab.key.toLowerCase() === cleanedActive ||
        (tab.key === DASHBOARD_TAB_KEYS.DASHBOARD &&
          cleanedActive === "dashboard"),
    );
    return matchedTab
      ? t(`dashboard.nav.${matchedTab.key}`)
      : t("dashboard.shell.console");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAdminDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUserInitials = () => {
    if (user && user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    return "AD";
  };

  const headerAvatarUrl =
    user?.avatarUrl ||
    (getUserProfileImage(user) ? getFileUrl(getUserProfileImage(user)) : null);

  const handleSignOutClick = () => {
    logout();
    navigate("/login");
  };

  const roleLabel = user?.role
    ? t(`roles.${user.role}`)
    : t("dashboard.shell.administrator");

  return (
    <div className="w-full h-screen bg-[#fdfdfc] text-[#2e0854] flex overflow-hidden font-sidebar relative">
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={handleNavigationShift}
        onSignOut={handleSignOutClick}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div
        ref={mainScrollRef}
        data-scroll-container
        className="flex-1 h-screen overflow-y-auto flex flex-col"
      >
        <header className="w-full bg-white border-b border-gray-100 h-16 shrink-0 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 md:w-1/4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest font-heading hidden lg:inline">
              {t("dashboard.shell.eduConsole")}
            </span>
            <span className="text-xs text-gray-300 hidden lg:inline">/</span>
            <span className="text-xs font-bold text-brand-purple uppercase tracking-widest font-heading">
              {getActiveTabLabel()}
            </span>
          </div>

          <div className="hidden md:block w-full max-w-md mx-4">
            <DashboardSearch role={user?.role} />
          </div>

          <div className="flex items-center gap-3 justify-end md:w-1/4">
            <LanguageToggle className="hidden sm:flex items-center gap-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all text-gray-500" />

            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden text-xl text-gray-400 hover:text-[#2e0854] p-2 rounded-xl bg-gray-50 border border-gray-100 transition-all"
              aria-label={t("common.search")}
            >
              <HiOutlineSearch />
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                className="flex items-center gap-3 text-start focus:outline-none p-1 rounded-xl hover:bg-gray-50 transition-all group"
              >
                <div className="text-end hidden sm:block">
                  <p className="text-xs font-bold text-[#2e0854] leading-none mb-1">
                    {user?.firstName || t("dashboard.shell.administrator")}
                  </p>
                  <p className="text-[10px] text-gray-400 font-light leading-none uppercase">
                    {roleLabel}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#2e0854] text-white flex items-center justify-center font-heading text-xs font-bold shadow-sm relative group-hover:bg-[#1a0433] transition-colors overflow-hidden">
                  {headerAvatarUrl ? (
                    <img
                      src={headerAvatarUrl}
                      alt={t("dashboard.profile.title")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getUserInitials()
                  )}
                  <div className="absolute -bottom-1 -end-1 w-4 h-4 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] text-gray-500 shadow-sm">
                    <HiOutlineChevronDown
                      className={`transition-transform duration-200 ${
                        isAdminDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </button>

              {isAdminDropdownOpen && (
                <div className="absolute end-0 mt-2.5 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 text-xs border-b border-gray-50 mb-1">
                    <span className="text-gray-400 block font-light">
                      {t("dashboard.shell.rolePrivilege")}
                    </span>
                    <span className="text-[#2e0854] font-bold capitalize">
                      {roleLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsAdminDropdownOpen(false);
                      navigate("/dashboard/profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2e0854] transition-all font-medium"
                  >
                    <HiOutlineUser className="text-lg text-gray-400" />
                    <span>{t("dashboard.shell.myProfile")}</span>
                  </button>
                  <div className="my-1 border-t border-gray-50" />
                  <button
                    onClick={handleSignOutClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50/50 transition-all font-medium"
                  >
                    <HiOutlineLogout className="text-lg text-rose-400" />
                    <span>{t("common.signOut")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-gray-100 px-4 py-2 flex md:hidden items-center justify-start overflow-x-auto gap-1 shrink-0 scrollbar-none">
          {navigationTabs.map((tab) => {
            const IconComponent = tab.icon;
            const cleanedActive = activeTab
              .toLowerCase()
              .replace(/^\/|\/$/g, "");
            const isActive =
              cleanedActive === tab.path.toLowerCase() ||
              cleanedActive === tab.key.toLowerCase();
            const label = t(`dashboard.nav.${tab.key}`);
            return (
              <button
                key={tab.key}
                onClick={() => handleNavigationShift(tab.path)}
                className={`flex flex-col items-center p-2 rounded-xl text-[9px] font-medium transition-all min-w-[68px] shrink-0 ${
                  isActive
                    ? "text-brand-purple font-black bg-violet-50/60"
                    : "text-gray-400"
                }`}
              >
                <IconComponent className="text-base mb-0.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </div>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 bg-[#2e0854]/40 backdrop-blur-sm z-50 flex flex-col p-4 md:hidden animate-fadeIn">
          <DashboardSearch
            role={user?.role}
            variant="mobile"
            onClose={() => setIsMobileSearchOpen(false)}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
