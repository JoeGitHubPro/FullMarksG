import React, { useEffect, useState } from "react";
import {
  HiOutlinePhone,
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheckCircle,
} from "react-icons/hi";
import { api } from "../api";

const emptyNewParent = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  emergencyContact: "",
};

const ParentLinkSection = ({ initialLinkedParent = null, onChange }) => {
  const [parentPhone, setParentPhone] = useState(
    initialLinkedParent?.phone || "",
  );
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [linkMode, setLinkMode] = useState(
    initialLinkedParent?.parentRecordId ? "linked" : "lookup",
  );
  const [linkedParent, setLinkedParent] = useState(initialLinkedParent);
  const [newParent, setNewParent] = useState(emptyNewParent);

  useEffect(() => {
    if (initialLinkedParent?.parentRecordId) {
      setLinkedParent(initialLinkedParent);
      setParentPhone(initialLinkedParent.phone || "");
      setLinkMode("linked");
      setLookupError("");
      setNewParent(emptyNewParent);
    } else {
      setLinkedParent(null);
      setParentPhone("");
      setLinkMode("lookup");
      setLookupError("");
      setNewParent(emptyNewParent);
    }
  }, [initialLinkedParent]);

  useEffect(() => {
    onChange?.({
      parentId: linkedParent?.parentRecordId || null,
      linkMode,
      newParent: linkMode === "create_new" ? newParent : null,
      linkedParent,
    });
  }, [linkedParent, linkMode, newParent, onChange]);

  const handleLookup = async () => {
    const phone = parentPhone.trim();
    if (!phone) {
      setLookupError("Enter a parent phone number first.");
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await api.lookupParentByPhone(phone);
      if (!res.success) {
        throw new Error(res.message || "Lookup failed.");
      }

      if (res.found) {
        setLinkedParent({
          parentRecordId: res.data.parentRecordId,
          userId: res.data.userId,
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          phone: res.data.phone,
          email: res.data.email,
        });
        setLinkMode("linked");
        setNewParent(emptyNewParent);
      } else if (res.reason === "not_parent") {
        setLookupError(
          res.message ||
            "This phone number belongs to a non-parent account.",
        );
        setLinkMode("lookup");
        setLinkedParent(null);
      } else {
        setLinkedParent(null);
        setLinkMode("create_new");
        setNewParent({
          ...emptyNewParent,
          phone: res.phone || phone,
        });
      }
    } catch (err) {
      setLookupError(err.message || "Could not look up parent phone.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRemoveParent = () => {
    setLinkedParent(null);
    setLinkMode("lookup");
    setParentPhone("");
    setLookupError("");
    setNewParent(emptyNewParent);
  };

  const handleCancelNewParent = () => {
    setLinkMode("lookup");
    setNewParent(emptyNewParent);
    setLookupError("");
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
          Parent (Guardian)
        </label>
        <p className="text-[11px] text-gray-400 font-light px-1 mt-1">
          Enter the parent phone number. If they exist, connect them. If not,
          create a new parent account.
        </p>
      </div>

      {linkMode === "linked" && linkedParent && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 text-emerald-700 flex items-center justify-center">
                <HiOutlineCheckCircle className="text-lg" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Parent Connected
                </p>
                <h4 className="text-sm font-bold text-[#2e0854]">
                  {linkedParent.firstName} {linkedParent.lastName}
                </h4>
                <p className="text-[11px] text-gray-500 font-mono">
                  {linkedParent.phone}
                </p>
                {linkedParent.email && (
                  <p className="text-[11px] text-gray-500">{linkedParent.email}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveParent}
              className="p-2 text-gray-400 hover:text-brand-purple hover:bg-white rounded-xl transition-colors"
              title="Remove parent link"
            >
              <HiOutlineX />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setLinkMode("lookup");
              setParentPhone(linkedParent.phone || "");
            }}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Change parent
          </button>
        </div>
      )}

      {linkMode !== "linked" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <HiOutlinePhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => {
                  setParentPhone(e.target.value);
                  setLookupError("");
                }}
                placeholder="Parent phone number"
                className="w-full bg-white text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading}
              className="inline-flex items-center justify-center gap-2 bg-[#2e0854] hover:bg-black disabled:opacity-60 text-white font-semibold text-sm px-5 py-4 rounded-2xl transition-all"
            >
              <HiOutlineSearch className="text-base" />
              {lookupLoading ? "Checking..." : "Check Number"}
            </button>
          </div>

          {lookupError && (
            <p className="text-xs font-semibold text-brand-purple px-1">{lookupError}</p>
          )}
        </div>
      )}

      {linkMode === "create_new" && (
        <div className="rounded-2xl border border-amber-100 bg-white p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                New Parent Account
              </p>
              <p className="text-[11px] text-gray-400 font-light mt-1">
                This phone is not registered. Fill in the details to create a
                parent and connect them to this student.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancelNewParent}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-1">
                First Name *
              </label>
              <div className="relative">
                <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                <input
                  type="text"
                  required
                  value={newParent.firstName}
                  onChange={(e) =>
                    setNewParent({ ...newParent, firstName: e.target.value })
                  }
                  className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-1">
                Last Name *
              </label>
              <div className="relative">
                <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                <input
                  type="text"
                  required
                  value={newParent.lastName}
                  onChange={(e) =>
                    setNewParent({ ...newParent, lastName: e.target.value })
                  }
                  className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-1">
              Phone *
            </label>
            <div className="relative">
              <HiOutlinePhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
              <input
                type="tel"
                required
                value={newParent.phone}
                onChange={(e) =>
                  setNewParent({ ...newParent, phone: e.target.value })
                }
                className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-1">
              Email
            </label>
            <div className="relative">
              <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
              <input
                type="email"
                value={newParent.email}
                onChange={(e) =>
                  setNewParent({ ...newParent, email: e.target.value })
                }
                className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-1">
              Emergency Contact
            </label>
            <input
              type="tel"
              value={newParent.emergencyContact}
              onChange={(e) =>
                setNewParent({
                  ...newParent,
                  emergencyContact: e.target.value,
                })
              }
              className="w-full bg-gray-50/70 text-sm font-mono border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-1">
              Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newParent.password}
              onChange={(e) =>
                setNewParent({ ...newParent, password: e.target.value })
              }
              placeholder="Minimum 6 characters"
              className="w-full bg-gray-50/70 text-sm border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentLinkSection;
