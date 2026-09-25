import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import api from "../api";
import SupportTicketsPanel from "../components/SupportTicketsPanel";
import { getSupportChannels } from "../utils/supportChannels";

const SupportDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = user?.role || "student";
  const [activeChannel, setActiveChannel] = useState("admin");
  const [assistants, setAssistants] = useState([]);
  const channels = useMemo(() => getSupportChannels(t), [t]);

  const availableChannels = useMemo(() => {
    if (role === "admin") return ["admin", "staff", "course"];
    if (role === "instructor") return ["admin", "staff", "course"];
    if (role === "assistant") return ["admin", "staff", "course"];
    return ["admin"];
  }, [role]);

  useEffect(() => {
    if (!availableChannels.includes(activeChannel)) {
      setActiveChannel(availableChannels[0]);
    }
  }, [availableChannels, activeChannel]);

  useEffect(() => {
    const loadAssistants = async () => {
      if (role !== "instructor") return;
      try {
        const me = await api.getMe();
        const instructorId = me.data?.roleData?.id;
        if (!instructorId) return;
        const res = await api.getAllAssistants({
          assignedInstructorId: instructorId,
          limit: 100,
        });
        if (res.success) {
          setAssistants(res.data);
        }
      } catch (err) {
        console.error("Failed to load assistants for support", err);
      }
    };
    loadAssistants();
  }, [role]);

  const canManageMeta =
    (activeChannel === "admin" && role === "admin") ||
    (activeChannel !== "admin" &&
      ["admin", "instructor", "assistant"].includes(role));

  return (
    <div className="space-y-6 text-[#2e0854] animate-fadeIn">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight font-heading">
          {t("dashboard.support.title")}
        </h1>
        <p className="text-gray-400 text-sm font-light">
          {t("dashboard.support.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableChannels.map((channelKey) => (
          <button
            key={channelKey}
            type="button"
            onClick={() => setActiveChannel(channelKey)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeChannel === channelKey
                ? "bg-brand text-white shadow-lg shadow-brand/10"
                : "bg-white border border-gray-100 text-gray-500 hover:border-violet-100 hover:text-brand-purple"
            }`}
          >
            {channels[channelKey].label}
          </button>
        ))}
      </div>

      <SupportTicketsPanel
        key={activeChannel}
        channel={activeChannel}
        userRole={role}
        currentUserId={user?.id}
        showCreatorInfo={role === "admin" || activeChannel !== "admin"}
        allowCreate={
          (activeChannel === "admin" &&
            ["admin", "instructor", "assistant"].includes(role)) ||
          (activeChannel === "staff" &&
            ["instructor", "assistant"].includes(role))
        }
        canManageMeta={canManageMeta}
        showFilters={role === "admin" && activeChannel === "admin"}
        assistants={assistants}
      />
    </div>
  );
};

export default SupportDashboard;
