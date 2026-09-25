import React from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineHome,
  HiOutlineArrowLeft,
  HiOutlineQuestionMarkCircle,
} from "react-icons/hi";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Visual Brand Indicator Token */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-violet-50 text-brand-purple flex items-center justify-center text-4xl shadow-inner border border-violet-100/50">
            <HiOutlineQuestionMarkCircle />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand"></span>
          </span>
        </div>

        {/* Text Error Matrix Status */}
        <div className="space-y-2">
          <h1 className="text-6xl font-black font-heading text-[#2e0854] tracking-tighter">
            404
          </h1>
          <h2 className="text-xl font-bold font-heading text-[#2e0854] tracking-tight">
            Route Matrix Fragment Missing
          </h2>
          <p className="text-xs text-gray-400 font-light max-w-xs mx-auto leading-relaxed">
            The requested web address location could not be verified by the core
            routing stack architecture.
          </p>
        </div>

        {/* Action Controls Navigation Cluster */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 font-bold text-xs tracking-wide transition-all shadow-2xs"
          >
            <HiOutlineArrowLeft className="text-sm" />
            <span>Go Back</span>
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2e0854] hover:bg-[#1a0433] text-white font-bold text-xs tracking-wide shadow-sm shadow-brand/10 transition-all transform hover:-translate-y-0.5"
          >
            <HiOutlineHome className="text-sm" />
            <span>Return Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
