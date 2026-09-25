import React from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import {
  getDashboardTabsForRole,
  DASHBOARD_TAB_KEYS,
} from "../i18n/dashboardNav";
import {
  HiOutlineLogout,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi";
import BrandLogo from "./BrandLogo";

const DashboardSidebar = ({
  activeTab,
  setActiveTab,
  onSignOut,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user } = useAuth();
  const { t, isRtl } = useTranslation();
  const navigationTabs = getDashboardTabsForRole(user?.role);
  const CollapseIcon = isRtl
    ? isCollapsed
      ? HiOutlineChevronLeft
      : HiOutlineChevronRight
    : isCollapsed
      ? HiOutlineChevronRight
      : HiOutlineChevronLeft;

  return (
    <aside
      className={`bg-white border-e border-gray-100 hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="p-5 flex flex-col h-full overflow-hidden">
        <div
          className={`flex items-center mb-8 shrink-0 ${
            isCollapsed ? "justify-center" : "justify-between px-1"
          }`}
        >
          {!isCollapsed && <BrandLogo className="text-lg" />}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-brand-purple transition-all hover:bg-violet-50 shadow-sm"
            title={
              isCollapsed
                ? t("dashboard.shell.expandSidebar")
                : t("dashboard.shell.collapseSidebar")
            }
          >
            <CollapseIcon className="text-base" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pe-1 scrollbar-none">
          {navigationTabs.map((tab) => {
            const IconComponent = tab.icon;
            const cleanedActive = activeTab
              .toLowerCase()
              .replace(/^\/|\/$/g, "");
            const isActive =
              cleanedActive === tab.path.toLowerCase() ||
              cleanedActive === tab.key.toLowerCase() ||
              (tab.key === DASHBOARD_TAB_KEYS.DASHBOARD &&
                cleanedActive === "dashboard");

            const label = t(`dashboard.nav.${tab.key}`);

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.path)}
                className={`w-full flex items-center rounded-xl text-[13px] leading-snug transition-all ${
                  isCollapsed
                    ? "justify-center px-0 py-3"
                    : "gap-3 px-4 py-2.5"
                } ${
                  isActive
                    ? "bg-violet-50 text-brand font-semibold shadow-sm shadow-brand/5"
                    : "text-gray-500 font-medium hover:text-gray-800 hover:bg-gray-50/80"
                }`}
                title={isCollapsed ? label : ""}
              >
                <IconComponent
                  className={`text-lg shrink-0 ${
                    isActive ? "text-brand-purple" : "text-gray-400"
                  }`}
                />
                {!isCollapsed && (
                  <span className="animate-fadeIn truncate">{label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-50 shrink-0">
        <button
          onClick={onSignOut}
          className={`w-full flex items-center rounded-xl text-[13px] font-medium leading-snug text-rose-500 hover:bg-rose-50/40 transition-colors ${
            isCollapsed ? "justify-center px-0 py-3.5" : "gap-3 px-4 py-3.5"
          }`}
          title={isCollapsed ? t("common.signOut") : ""}
        >
          <HiOutlineLogout className="text-lg shrink-0" />
          {!isCollapsed && (
            <span className="animate-fadeIn">{t("common.signOut")}</span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </aside>
  );
};

export default DashboardSidebar;
