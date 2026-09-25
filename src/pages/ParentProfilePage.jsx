// src/pages/ParentProfilePage.jsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineUserGroup,
  HiOutlineCreditCard,
  HiOutlineCalendar,
  HiOutlineShieldCheck,
  HiOutlineIdentification,
  HiOutlineArrowSmRight,
  HiOutlineAcademicCap,
} from "react-icons/hi";

// Mock Parent Security Core Ledger Database
const PARENT_REPOSITORY_DATA = {
  "PAR-9902": {
    id: "PAR-9902",
    name: "Hesham Mansoor Al-Omari",
    email: "h.omari@domain.com",
    relationship: "Primary Guardian",
    dependents: [
      {
        id: "ST-5501",
        name: "Mohamed Hesham",
        track: "Cambridge IGCSE",
        standing: "Excellent (A*)",
        route: "/profile",
      },
    ],
    invoices: [
      {
        invoiceNo: "INV-2026-042",
        term: "Term 3 Balance",
        amount: "SAR 4,500",
        status: "Paid",
        date: "May 15, 2026",
      },
      {
        invoiceNo: "INV-2026-019",
        term: "Lab Logistics Assessment fee",
        amount: "SAR 650",
        status: "Outstanding",
        date: "June 10, 2026",
      },
    ],
    meetings: [
      {
        host: "Dr. Ammar Al-Otaibi",
        focus: "Mathematics Calculus Track Sync",
        schedule: "June 08, 2026 — 16:30 AST",
      },
    ],
  },
};

const ParentProfilePage = () => {
  const [searchId, setSearchId] = useState("");
  const [activeParentId, setActiveParentId] = useState("PAR-9902");

  const currentParent = useMemo(() => {
    return PARENT_REPOSITORY_DATA[activeParentId.toUpperCase().trim()];
  }, [activeParentId]);

  const handleIdQuerySubmit = (e) => {
    e.preventDefault();
    if (PARENT_REPOSITORY_DATA[searchId.toUpperCase().trim()]) {
      setActiveParentId(searchId.toUpperCase().trim());
    } else {
      alert(
        `System Log Notice: Guardian signature ID "${searchId}" could not be authenticated.`,
      );
    }
  };

  return (
    <div className="space-y-10 py-4 animate-fadeIn">
      {/* 1. TOP PORTAL CONTROLS SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="max-w-md">
          <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
            Guardian Core Interface
          </span>
          <h1 className="text-3xl font-black text-[#2e0854] tracking-tight font-heading mt-3">
            Family Portal Ecosystem
          </h1>
          <p className="text-xs text-gray-400 font-light mt-1.5 leading-relaxed">
            Query verified household access hashes below to check balance
            obligations, consult rosters, and supervise dependent progress
            sheets.
          </p>
        </div>

        {/* Real-time Query Input Box */}
        <form
          onSubmit={handleIdQuerySubmit}
          className="relative max-w-xs w-full flex items-center gap-2"
        >
          <div className="relative flex-grow">
            <HiOutlineIdentification className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Query Parent Key (e.g. PAR-9902)"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs text-[#2e0854] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-[#2e0854] text-white text-xs font-bold rounded-xl hover:bg-[#1a0433] transition-all shrink-0"
          >
            Query
          </button>
        </form>
      </div>

      {currentParent ? (
        <div className="space-y-8">
          {/* 2. MAIN ACCOUNT ROOT SUMMARY CARD */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-brand-purple border border-violet-100/50 flex items-center justify-center text-xl shadow-xs">
                <HiOutlineUserGroup />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black font-heading text-[#2e0854]">
                    {currentParent.name}
                  </h2>
                  <span className="text-[9px] font-black tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    {currentParent.id}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-light">
                  {currentParent.relationship} • {currentParent.email}
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-md">
                Secure Account Sync
              </span>
            </div>
          </div>

          {/* 3. CORE SUB-SECTION BREAKDOWNS LAYOUT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* LEFT SIDE BLOCK MATRIX (3/5 Width): DEPENDENTS & MEETING SCHEDULES */}
            <div className="lg:col-span-3 space-y-8">
              {/* Dependents Tracker Index */}
              <div className="space-y-3">
                <h3 className="font-heading font-black text-sm text-[#2e0854] px-1">
                  Registered Student Dependents
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {currentParent.dependents.map((student) => (
                    <div
                      key={student.id}
                      className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between hover:border-gray-200 transition-all shadow-2xs"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 text-sm shrink-0">
                          <HiOutlineAcademicCap />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-bold text-[#2e0854] font-heading truncate">
                            {student.name}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-light truncate">
                            {student.track} • Standing:{" "}
                            <span className="font-bold text-brand-purple">
                              {student.standing}
                            </span>
                          </p>
                        </div>
                      </div>

                      <Link
                        to={student.route}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-[#2e0854] hover:bg-[#2e0854] hover:text-white text-[11px] font-bold tracking-wide transition-all shrink-0"
                      >
                        <span>Performance Record</span>
                        <HiOutlineArrowSmRight className="text-xs" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consultation Schedules Section */}
              <div className="space-y-3">
                <h3 className="font-heading font-black text-sm text-[#2e0854] px-1">
                  Scheduled Faculty Consultations
                </h3>
                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white divide-y divide-gray-50 shadow-2xs">
                  {currentParent.meetings.map((meeting, idx) => (
                    <div key={idx} className="p-4 flex items-start space-x-3.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm shrink-0">
                        <HiOutlineCalendar />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-[#2e0854] font-heading">
                          {meeting.host}
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium truncate">
                          {meeting.focus}
                        </p>
                        <p className="text-[10px] text-gray-400 font-light pt-0.5">
                          {meeting.schedule}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE BLOCK MATRIX (2/5 Width): TUITION BILLING & ACCREDITATION */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-2 px-1">
                <HiOutlineCreditCard className="text-sm text-brand-purple" />
                <h3 className="font-heading font-black text-sm text-[#2e0854]">
                  Tuition Accounting Statements
                </h3>
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50 shadow-2xs bg-white">
                {currentParent.invoices.map((invoice, idx) => (
                  <div
                    key={idx}
                    className="p-4 space-y-2 hover:bg-gray-50/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#2e0854] font-heading truncate">
                          {invoice.term}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-light mt-0.5">
                          {invoice.invoiceNo} • {invoice.date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-[#2e0854] font-heading">
                          {invoice.amount}
                        </p>
                        <span
                          className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 ${
                            invoice.status === "Paid"
                              ? "text-emerald-600 bg-emerald-50"
                              : "text-amber-600 bg-amber-50 animate-pulse"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 flex items-start space-x-3 shadow-3xs">
                <HiOutlineShieldCheck className="text-base text-gray-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 font-light leading-relaxed">
                  Financial transfers and identity queries are handled via
                  secure endpoint hashing routines. For support regarding ledger
                  inaccuracies, route logs straight to our{" "}
                  <Link
                    to="/contact"
                    className="text-brand-purple font-bold hover:underline"
                  >
                    Support Gateway
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ParentProfilePage;
