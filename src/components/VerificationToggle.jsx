import React, { useState } from "react";
import { HiOutlineShieldCheck, HiOutlineXCircle } from "react-icons/hi";
import { api } from "../api";
import {
  getParentDisplayName,
  getParentLinkVerificationStatus,
  getParentLinkVerifiedAt,
  getStudentDisplayName,
  hasLinkedParent,
} from "../utils/verification";

const VerificationToggle = ({
  student,
  parentUser = null,
  onUpdated,
  compact = false,
  stopPropagation = false,
}) => {
  const [loading, setLoading] = useState(false);
  const linkedParent = hasLinkedParent(student);
  const isVerified = getParentLinkVerificationStatus(student);
  const verifiedAt = getParentLinkVerifiedAt(student);
  const studentUserId = student?.id || student?.user_id;
  const studentName = getStudentDisplayName(student);
  const parentName = getParentDisplayName(student, parentUser);

  const handleToggle = async (e) => {
    if (stopPropagation) e.stopPropagation();
    if (!studentUserId || !linkedParent || loading) return;

    const nextValue = !isVerified;
    const action = nextValue ? "verify" : "remove verification for";
    if (
      !window.confirm(
        nextValue
          ? `Verify that ${parentName} is the parent of ${studentName}?`
          : `Remove parent verification for ${studentName}?`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.setUserVerification(studentUserId, nextValue);
      if (!res.success) {
        throw new Error(res.message || "Verification update failed.");
      }
      onUpdated?.(res.data);
    } catch (err) {
      alert(err.message || "Verification update failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!linkedParent) {
    return (
      <span className="text-[10px] text-gray-400 italic">
        No parent linked to verify
      </span>
    );
  }

  return (
    <div
      className={`flex ${compact ? "flex-row items-center gap-2" : "flex-col gap-2"}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
          isVerified
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        {isVerified ? (
          <HiOutlineShieldCheck className="text-sm" />
        ) : (
          <HiOutlineXCircle className="text-sm" />
        )}
        {isVerified ? "Parent Verified" : "Parent Unverified"}
      </span>

      {!compact && (
        <span className="text-[10px] text-gray-500">
          {parentName} → {studentName}
        </span>
      )}

      {!compact && verifiedAt && (
        <span className="text-[10px] text-gray-400">
          Verified on {new Date(verifiedAt).toLocaleDateString()}
        </span>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`text-xs font-semibold rounded-xl px-3 py-2 transition-all disabled:opacity-60 ${
          isVerified
            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {loading
          ? "Saving..."
          : isVerified
            ? "Remove Parent Verification"
            : "Verify Parent Link"}
      </button>
    </div>
  );
};

export default VerificationToggle;
