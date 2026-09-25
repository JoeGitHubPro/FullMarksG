import React, { useRef, useState } from "react";
import { HiOutlinePhotograph, HiOutlineTrash } from "react-icons/hi";
import { api, getFileUrl } from "../api";

const SIZE_CLASSES = {
  sm: "w-12 h-12 text-sm rounded-xl",
  md: "w-16 h-16 text-xl rounded-2xl",
  lg: "w-24 h-24 text-3xl rounded-2xl",
  xl: "w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 text-3xl sm:text-4xl rounded-2xl md:rounded-3xl",
};

export const getUserProfileImage = (user) =>
  user?.profile_image_url ||
  user?.profileImage ||
  user?.profile_image ||
  null;

const ProfileAvatarManager = ({
  userId = null,
  imageUrl,
  firstName = "",
  lastName = "",
  size = "md",
  editable = false,
  variant = "dark",
  onUpdated,
  onRemoved,
  className = "",
}) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initials =
    `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() ||
    "U";

  const displayUrl = previewUrl || (imageUrl ? getFileUrl(imageUrl) : null);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const isDark = variant === "dark";
  const shellClass = isDark
    ? "bg-white/20 text-white border-white/30"
    : "bg-gray-50 text-[#2e0854] border-gray-100";

  const handleUpload = async (file) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setLoading(true);
    setError("");

    try {
      const res = userId
        ? await api.updateUserAvatar(userId, file)
        : await api.updateAvatar(file);

      if (!res.success) {
        throw new Error(res.message || "Failed to update profile image.");
      }

      const nextUrl = res.imageUrl || res.data?.imageUrl;
      setPreviewUrl(null);
      onUpdated?.(nextUrl);
    } catch (err) {
      setPreviewUrl(null);
      setError(err.message || "Failed to update profile image.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl && !previewUrl) return;
    if (!window.confirm("Remove this profile picture?")) return;

    setLoading(true);
    setError("");

    try {
      if (userId) {
        const res = await api.deleteUserAvatar(userId);
        if (!res.success) {
          throw new Error(res.message || "Failed to remove profile image.");
        }
      } else {
        const res = await api.deleteAvatar();
        if (!res.success) {
          throw new Error(res.message || "Failed to remove profile image.");
        }
      }

      setPreviewUrl(null);
      onRemoved?.();
    } catch (err) {
      setError(err.message || "Failed to remove profile image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${sizeClass} border-2 overflow-hidden flex items-center justify-center font-bold shadow-lg ${shellClass} ${
          loading ? "opacity-70" : ""
        }`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`${firstName} ${lastName}`.trim() || "Profile"}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {editable && (
        <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="bg-brand text-white p-1.5 rounded-lg border-2 border-white shadow-md hover:bg-brand-dark transition-colors disabled:opacity-60"
            title="Upload photo"
          >
            <HiOutlinePhotograph className="text-sm" />
          </button>
          {(imageUrl || previewUrl) && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={loading}
              className="bg-white text-brand-purple p-1.5 rounded-lg border-2 border-violet-100 shadow-md hover:bg-violet-50 transition-colors disabled:opacity-60"
              title="Remove photo"
            >
              <HiOutlineTrash className="text-sm" />
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="absolute top-full left-0 mt-1 text-[10px] text-brand-purple whitespace-nowrap max-w-[180px] truncate">
          {error}
        </p>
      )}
    </div>
  );
};

export default ProfileAvatarManager;
