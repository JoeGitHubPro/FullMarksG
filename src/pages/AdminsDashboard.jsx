import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { api, getFileUrl } from "../api";
import ProfileAvatarManager, {
  getUserProfileImage,
} from "../components/ProfileAvatarManager";
import {
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineArrowLeft,
  HiOutlineUserGroup,
  HiOutlineChevronRight,
  HiOutlineShieldCheck,
  HiOutlineCog,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineBadgeCheck,
} from "react-icons/hi";

const getInitials = (first, last) =>
  `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();

const AdminsDashboard = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [adminsData, setAdminsData] = useState([]);
  const [activeAdmin, setActiveAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Inline Form View Control
  const [isFormViewActive, setIsFormViewActive] = useState(false);
  const [formMode, setFormMode] = useState("create"); // 'create' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    profileImageUrl: null,
    isActive: true,
    superAdmin: false,
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Fetch all admins (directory)
  const fetchAllAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getAllUsers({ role: "admin", limit: 100 });
      if (response.success) {
        setAdminsData(response.data);
      } else {
        setError(t("dashboard.admins.loadFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.admins.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Fetch single admin details
  const fetchSingleAdmin = async (id) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getUserById(id);
      if (response.success) {
        setActiveAdmin(response.data);
      } else {
        setError(t("dashboard.admins.notFound"));
        setActiveAdmin(null);
      }
    } catch (err) {
      setError(err?.message || t("dashboard.admins.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchSingleAdmin(slug);
    } else {
      fetchAllAdmins();
    }
    setIsFormViewActive(false);
  }, [slug]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Open inline form for creating a new admin
  const handleOpenCreateForm = () => {
    setFormMode("create");
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      isActive: true,
      superAdmin: false,
    });
    setIsFormViewActive(true);
  };

  // Open inline form for editing an existing admin
  const handleOpenEditForm = (e, admin) => {
    e.stopPropagation();
    setFormMode("edit");
    setEditingId(admin.id);
    setFormData({
      firstName: admin.first_name,
      lastName: admin.last_name,
      phone: admin.phone,
      email: admin.email || "",
      password: "",
      profileImageUrl: getUserProfileImage(admin),
      isActive: admin.is_active,
      superAdmin: admin.roleData?.superAdmin || false,
    });
    setIsFormViewActive(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError("");

    try {
      if (formMode === "create") {
        if (!formData.password || formData.password.length < 6) {
          setError(t("dashboard.common.passwordMin"));
          setFormSubmitLoading(false);
          return;
        }
        const response = await api.createUser({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || null,
          password: formData.password,
          role: "admin",
          isActive: formData.isActive,
          superAdmin: formData.superAdmin,
        });
        if (response.success) {
          triggerSuccess(t("dashboard.admins.createAccount"));
          setIsFormViewActive(false);
          fetchAllAdmins();
        } else {
          setError(response.message || t("dashboard.common.creationFailed"));
        }
      } else {
        // Update
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || null,
          isActive: formData.isActive,
          superAdmin: formData.superAdmin,
        };
        const response = await api.updateUser(editingId, updateData);
        if (response.success) {
          triggerSuccess(t("common.saveChanges"));
          setIsFormViewActive(false);
          if (slug) {
            fetchSingleAdmin(slug);
          } else {
            fetchAllAdmins();
          }
        } else {
          setError(response.message || t("dashboard.common.updateFailed"));
        }
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteAdmin = async (e, adminId, adminName) => {
    e.stopPropagation();
    if (
      !window.confirm(
        t("dashboard.common.confirmDelete"),
      )
    ) {
      return;
    }
    try {
      const response = await api.deleteUser(adminId);
      if (response.success) {
        triggerSuccess(t("dashboard.common.delete"));
        if (slug) {
          navigate("/dashboard/admins");
        } else {
          fetchAllAdmins();
        }
      } else {
        setError(response.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.deletionFailed"));
    }
  };

  const handleToggleActive = async (e, admin) => {
    e.stopPropagation();
    try {
      const response = await api.toggleUserActive(admin.id);
      if (response.success) {
        triggerSuccess(
          admin.is_active
            ? t("dashboard.admins.disableAccount")
            : t("dashboard.admins.enableAccount"),
        );
        if (slug) {
          fetchSingleAdmin(slug);
        } else {
          fetchAllAdmins();
        }
      } else {
        setError(response.message || t("dashboard.common.operationFailed"));
      }
    } catch (err) {
      setError(err?.message || t("dashboard.common.operationFailed"));
    }
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          {t("dashboard.admins.loading")}
        </p>
      </div>
    );
  }

  // ==================== INLINE FULL PAGE FORM (CREATE / EDIT) ====================
  if (isFormViewActive) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsFormViewActive(false)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>{t("dashboard.common.cancelBack")}</span>
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-8">
          <div className="space-y-2 border-b border-gray-50 pb-5">
            <h1 className="text-3xl font-black font-heading tracking-tight text-[#2e0854]">
              {formMode === "create"
                ? t("dashboard.admins.create")
                : t("dashboard.admins.edit")}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {formMode === "create"
                ? "Add a new admin user with full platform control."
                : "Modify admin details, status, or super admin privileges."}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
              ⚠️ {error}
            </div>
          )}

          {formMode === "edit" && editingId && (
            <div className="flex justify-center pb-2">
              <ProfileAvatarManager
                userId={editingId}
                imageUrl={formData.profileImageUrl}
                firstName={formData.firstName}
                lastName={formData.lastName}
                size="lg"
                editable
                variant="light"
                onUpdated={(imageUrl) =>
                  setFormData((prev) => ({ ...prev, profileImageUrl: imageUrl }))
                }
                onRemoved={() =>
                  setFormData((prev) => ({ ...prev, profileImageUrl: null }))
                }
              />
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.common.firstNameRequired")}
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.common.lastNameRequired")}
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Smith"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.common.phoneRequired")}
              </label>
              <div className="relative">
                <HiOutlinePhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+201234567890"
                  className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                {t("dashboard.common.emailOptional")}
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="admin@example.com"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            {formMode === "create" && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("dashboard.common.passwordRequired")}
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  minLength={6}
                  placeholder="••••••"
                  className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
                <p className="text-[10px] text-gray-400 px-1">
                  {t("dashboard.common.passwordMin")}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple"
                />
                <span className="text-xs text-gray-500">
                  {t("dashboard.admins.enableAccount")}
                </span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.superAdmin}
                  onChange={(e) =>
                    setFormData({ ...formData, superAdmin: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple"
                />
                <span className="text-xs text-gray-500">
                  {t("dashboard.admins.superAdmin")} ({t("dashboard.admins.superAdminDesc")})
                </span>
              </label>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsFormViewActive(false)}
                className="w-full sm:w-1/3 border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold text-sm py-4 rounded-2xl transition-all active:scale-[0.99]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={formSubmitLoading}
                className="w-full sm:w-2/3 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99]"
              >
                {formSubmitLoading
                  ? t("dashboard.common.processing")
                  : formMode === "create"
                    ? t("dashboard.admins.createAccount")
                    : t("common.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== VIEW 1: SINGLE ADMIN PROFILE ====================
  if (slug) {
    if (!activeAdmin) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center animate-fadeIn">
          <p className="text-sm font-bold text-[#2e0854]">
            {t("dashboard.admins.notFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard/admins")}
            className="mt-3 text-xs text-brand-purple font-semibold underline focus:outline-none"
          >
            {t("dashboard.common.back")}
          </button>
        </div>
      );
    }

    const roleData = activeAdmin.roleData;

    return (
      <div className="space-y-6 animate-fadeIn text-[#2e0854]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/admins")}
            className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider focus:outline-none"
          >
            <HiOutlineArrowLeft className="flip-rtl" />{" "}
            <span>{t("dashboard.common.back")}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => handleOpenEditForm(e, activeAdmin)}
              className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-gray-500"
            >
              <HiOutlinePencil /> <span>{t("dashboard.admins.edit")}</span>
            </button>
            <button
              onClick={(e) =>
                handleDeleteAdmin(
                  e,
                  activeAdmin.id,
                  `${activeAdmin.first_name} ${activeAdmin.last_name}`,
                )
              }
              className="flex items-center space-x-1 bg-violet-50 hover:bg-violet-100 text-brand-purple px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              <HiOutlineTrash /> <span>{t("dashboard.common.delete")}</span>
            </button>
            <button
              onClick={(e) => handleToggleActive(e, activeAdmin)}
              className={`flex items-center space-x-1 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeAdmin.is_active
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {activeAdmin.is_active
                ? t("dashboard.admins.disableAccount")
                : t("dashboard.admins.enableAccount")}
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl animate-fadeIn">
            ✓ {successMsg}
          </div>
        )}
        {error && (
          <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-[#2e0854] rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
          <div className="flex items-center space-x-4">
            <ProfileAvatarManager
              userId={activeAdmin.id}
              imageUrl={getUserProfileImage(activeAdmin)}
              firstName={activeAdmin.first_name}
              lastName={activeAdmin.last_name}
              size="md"
              editable
              variant="dark"
              onUpdated={(imageUrl) => {
                setActiveAdmin((prev) => ({
                  ...prev,
                  profile_image_url: imageUrl,
                }));
                triggerSuccess(t("dashboard.common.profileImageUpdated"));
              }}
              onRemoved={() => {
                setActiveAdmin((prev) => ({
                  ...prev,
                  profile_image_url: null,
                }));
                triggerSuccess(t("dashboard.common.profileImageRemoved"));
              }}
            />
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-900/30 font-mono">
                ID-{activeAdmin.id}
              </span>
              <h2 className="text-2xl font-black font-heading tracking-tight mt-2">
                {activeAdmin.first_name} {activeAdmin.last_name}
              </h2>
              <p className="text-xs text-red-100/70 font-light">
                {activeAdmin.is_active
                  ? t("dashboard.admins.activeLabel")
                  : t("dashboard.admins.disabledLabel")}
                {roleData?.superAdmin && ` • ${t("dashboard.admins.superAdmin")}`}
              </p>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading font-black text-base text-[#2e0854]">
              {t("dashboard.profile.contactInfo")}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                <HiOutlinePhone className="text-gray-400 text-base" />
                <span className="font-mono text-xs">{activeAdmin.phone}</span>
              </div>
              {activeAdmin.email && (
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50">
                  <HiOutlineMail className="text-gray-400 text-base" />
                  <span className="text-xs truncate">{activeAdmin.email}</span>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-gray-50 text-[10px] text-gray-400">
              Registered:{" "}
              {new Date(activeAdmin.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-heading font-black text-base text-[#2e0854]">
                Privileges
              </h3>
              <p className="text-[11px] text-gray-400 font-light">
                System access level
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center">
                  <HiOutlineShieldCheck />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">
                    Admin Role
                  </p>
                  <h4 className="text-sm font-bold text-[#2e0854]">
                    {roleData?.superAdmin
                      ? t("dashboard.admins.superAdmin")
                      : t("dashboard.shell.administrator")}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {roleData?.superAdmin
                      ? t("dashboard.admins.superAdminDesc")
                      : t("dashboard.admins.standardAdminDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: ADMINS DIRECTORY (GRID) ====================
  return (
    <div className="space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-[#2e0854] font-heading">
            {t("dashboard.admins.title")}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {t("dashboard.admins.subtitle")}
          </p>
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center justify-center space-x-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99] shrink-0 focus:outline-none"
        >
          <HiOutlinePlus className="text-base" />
          <span>{t("dashboard.admins.addNew")}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl animate-fadeIn">
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminsData.map((admin) => (
          <div
            key={admin.id}
            onClick={() => navigate(`/dashboard/admins/${admin.id}`)}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_15px_40px_rgba(43,2,7,0.02)] hover:shadow-[0_15px_40px_rgba(43,2,7,0.05)] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative border-b-2 hover:border-b-red-600"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2.5 py-1 rounded-md tracking-wide uppercase font-mono">
                  ID-{admin.id}
                </span>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEditForm(e, admin)}
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                    title={t("dashboard.admins.edit")}
                  >
                    <HiOutlinePencil className="text-xs" />
                  </button>
                  <button
                    onClick={(e) =>
                      handleDeleteAdmin(
                        e,
                        admin.id,
                        `${admin.first_name} ${admin.last_name}`,
                      )
                    }
                    className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50 transition-colors"
                    title={t("dashboard.common.delete")}
                  >
                    <HiOutlineTrash className="text-xs" />
                  </button>
                  <button
                    onClick={(e) => handleToggleActive(e, admin)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    title={
                      admin.is_active
                        ? t("dashboard.admins.disableAccount")
                        : t("dashboard.admins.enableAccount")
                    }
                  >
                    <HiOutlineCog className="text-xs" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {admin.profile_image_url ? (
                  <img
                    src={getFileUrl(admin.profile_image_url)}
                    alt={admin.first_name}
                    className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-[#2e0854] flex items-center justify-center font-heading text-xs font-bold">
                    {getInitials(admin.first_name, admin.last_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold font-heading text-[#2e0854] group-hover:text-brand-purple transition-colors truncate">
                    {admin.first_name} {admin.last_name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-light truncate font-mono">
                    {admin.phone}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 pt-1">
                {admin.roleData?.superAdmin && (
                  <span className="inline-flex items-center text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    <HiOutlineBadgeCheck className="mr-0.5 text-[10px]" />
                    {t("dashboard.admins.superAdmin")}
                  </span>
                )}
                {!admin.is_active && (
                  <span className="inline-flex items-center text-[9px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {t("dashboard.common.disabled")}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center font-medium text-[#2e0854] bg-violet-50/50 px-2 py-1 rounded-lg text-[11px]">
                <HiOutlineUserGroup className="mr-1 text-gray-400 text-xs" />{" "}
                {t("dashboard.shell.administrator")}
              </span>
              <HiOutlineChevronRight className="text-gray-400 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}

        {adminsData.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-xs text-gray-400 font-light">
              {t("dashboard.admins.empty")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminsDashboard;
