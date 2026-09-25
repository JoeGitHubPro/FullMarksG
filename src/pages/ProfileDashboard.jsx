import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";
import { api } from "../api";
import ProfileAvatarManager, {
  getUserProfileImage,
} from "../components/ProfileAvatarManager";
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineCalendar,
  HiOutlineIdentification,
  HiOutlineShieldCheck,
  HiOutlineAcademicCap,
  HiOutlineCheck,
  HiOutlineX,
} from "react-icons/hi";

const DetailRow = ({ icon: Icon, label, value }) => {
  const { t } = useTranslation();
  if (!value && value !== false) return null;
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
      <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
        <Icon className="text-brand-purple text-lg" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="text-sm font-medium text-[#2e0854] mt-0.5 break-words">
          {typeof value === "boolean"
            ? value
              ? t("dashboard.common.yes")
              : t("dashboard.common.no")
            : value}
        </p>
      </div>
    </div>
  );
};

const ProfileDashboard = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const syncAuthFromProfile = (data) => {
    const image = getUserProfileImage(data);
    updateUser({
      firstName: data.firstName || data.first_name,
      lastName: data.lastName || data.last_name,
      profileImage: image,
      avatarUrl: image ? api.getFileUrl(image) : null,
    });
  };

  const refreshProfile = async ({ syncAuth = false } = {}) => {
    const res = await api.getMe();
    if (!res.success) {
      throw new Error("Could not load profile data.");
    }
    setProfile(res.data);
    if (syncAuth) {
      syncAuthFromProfile(res.data);
    }
    return res.data;
  };

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        await refreshProfile({ syncAuth: true });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.profile.loading")}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-sm">
        {error || t("dashboard.profile.unavailable")}
      </div>
    );
  }

  const roleData = profile.roleData || {};
  const role = profile.role || user?.role;
  const firstName = profile.firstName || profile.first_name || "";
  const lastName = profile.lastName || profile.last_name || "";
  const profileImage = getUserProfileImage(profile);
  const createdAt = profile.createdAt || profile.created_at;

  const roleLabels = {
    admin: t("dashboard.shell.administrator"),
    instructor: t("roles.instructor"),
    assistant: t("roles.assistant"),
  };

  const permissionLabels = {
    read_only: t("dashboard.common.readOnly"),
    edit_grades: t("dashboard.common.canEditGrades"),
    full_access: t("dashboard.common.fullAccess"),
  };

  const roleSpecificFields = [];

  if (role === "admin") {
    roleSpecificFields.push(
      {
        icon: HiOutlineShieldCheck,
        label: t("dashboard.profile.superAdmin"),
        value: roleData.superAdmin ?? roleData.super_admin,
      },
      {
        icon: HiOutlineIdentification,
        label: t("dashboard.profile.adminRecordId"),
        value: roleData.id,
      },
    );
  } else if (role === "instructor") {
    roleSpecificFields.push(
      {
        icon: HiOutlineIdentification,
        label: t("dashboard.profile.instructorRecordId"),
        value: roleData.id,
      },
      {
        icon: HiOutlineAcademicCap,
        label: t("dashboard.profile.bio"),
        value: roleData.bio,
      },
    );
  } else if (role === "assistant") {
    roleSpecificFields.push(
      {
        icon: HiOutlineIdentification,
        label: t("dashboard.profile.assistantRecordId"),
        value: roleData.id,
      },
      {
        icon: HiOutlineUser,
        label: t("dashboard.profile.assignedInstructor"),
        value: roleData.instructor_first_name
          ? `${roleData.instructor_first_name} ${roleData.instructor_last_name || ""}`.trim()
          : null,
      },
      {
        icon: HiOutlineShieldCheck,
        label: t("dashboard.profile.permissions"),
        value:
          permissionLabels[roleData.permissions_level] ||
          roleData.permissions_level,
      },
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#2e0854] font-heading">
          {t("dashboard.profile.title")}
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-light">
          {t("dashboard.profile.subtitle")}
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm flex items-center gap-2">
          <HiOutlineCheck className="text-lg shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-sm flex items-center gap-2">
          <HiOutlineX className="text-lg shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#2e0854] to-[#4a0512] px-6 py-8 sm:px-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <ProfileAvatarManager
              imageUrl={profileImage}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              editable
              variant="dark"
              onUpdated={async () => {
                await refreshProfile({ syncAuth: true });
                setSuccess(t("dashboard.common.profileImageUpdated"));
                setTimeout(() => setSuccess(""), 4000);
              }}
              onRemoved={async () => {
                await refreshProfile({ syncAuth: true });
                setSuccess(t("dashboard.common.profileImageRemoved"));
                setTimeout(() => setSuccess(""), 4000);
              }}
            />

            <div className="text-center sm:text-start flex-1">
              <h2 className="text-2xl font-black font-heading tracking-tight text-white">
                {firstName} {lastName}
              </h2>
              <p className="text-red-100/80 text-sm mt-1">
                {roleLabels[role] || role}
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white">
                  {t("dashboard.profile.userId", { id: profile.id })}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    profile.isActive !== false
                      ? "bg-emerald-400/20 text-emerald-100"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {profile.isActive !== false
                    ? t("dashboard.common.active")
                    : t("dashboard.common.inactive")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-4">
              <HiOutlineUser className="text-brand-purple" />
              {t("dashboard.profile.contactInfo")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow
                icon={HiOutlinePhone}
                label={t("dashboard.common.phone")}
                value={profile.phone}
              />
              <DetailRow
                icon={HiOutlineMail}
                label={t("dashboard.common.email")}
                value={profile.email}
              />
              <DetailRow
                icon={HiOutlineCalendar}
                label={t("dashboard.profile.memberSince")}
                value={
                  createdAt
                    ? new Date(createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : null
                }
              />
              <DetailRow
                icon={HiOutlineIdentification}
                label={t("dashboard.profile.accountRole")}
                value={roleLabels[role] || role}
              />
            </div>
          </section>

          {roleSpecificFields.some((field) => field.value || field.value === false) && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-4">
                <HiOutlineShieldCheck className="text-brand-purple" />
                {t("dashboard.profile.roleDetails", {
                  role: roleLabels[role] || role,
                })}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roleSpecificFields.map((field) => (
                  <DetailRow
                    key={field.label}
                    icon={field.icon}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
