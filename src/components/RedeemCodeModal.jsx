import React, { useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { api } from "../api";
import { HiOutlineKey, HiOutlineX, HiOutlineCheck } from "react-icons/hi";

const NO_CHOICE_TYPES = [
  "course",
  "chapter_item",
  "multi_course",
  "center_course",
];
const UNSUPPORTED_TYPES = ["any_course", "any_chapter_item", "instructor_course"];

const RedeemCodeModal = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState("enterCode"); // enterCode | pickCategory | pickCourse | unsupported | done
  const [code, setCode] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultData, setResultData] = useState(null);
  const [resultMessage, setResultMessage] = useState("");

  const finishRedeem = async ({ courseId, categoryId } = {}) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.redeemAccessCode(
        code,
        courseId,
        undefined,
        categoryId,
      );
      if (res.success) {
        setResultData(res.data);
        setResultMessage(res.message);
        setStep("done");
        if (onSuccess) onSuccess(res.data);
      } else {
        setError(res.message || t("redeemCode.failed"));
      }
    } catch (err) {
      setError(err?.message || t("redeemCode.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const preview = await api.previewAccessCode(code.trim());
      if (!preview.success) {
        setError(preview.message || t("redeemCode.invalidCode"));
        setLoading(false);
        return;
      }

      const codeType = preview.data?.codeType;

      if (codeType === "category") {
        const availableCategories = preview.data?.categories || [];
        if (availableCategories.length === 0) {
          setError(t("redeemCode.noCategoriesLinked"));
          setLoading(false);
          return;
        }
        setCategories(availableCategories);
        setStep("pickCategory");
        setLoading(false);
        return;
      }

      if (codeType === "bundle_select") {
        const availableCourses = preview.data?.courses || [];
        if (availableCourses.length === 0) {
          setError(t("redeemCode.noCoursesLinked"));
          setLoading(false);
          return;
        }
        setCourses(availableCourses);
        setStep("pickCourse");
        setLoading(false);
        return;
      }

      if (UNSUPPORTED_TYPES.includes(codeType)) {
        setStep("unsupported");
        setLoading(false);
        return;
      }

      if (NO_CHOICE_TYPES.includes(codeType)) {
        await finishRedeem({});
        return;
      }

      setError(t("redeemCode.invalidCode"));
      setLoading(false);
    } catch (err) {
      setError(err?.message || t("redeemCode.invalidCode"));
      setLoading(false);
    }
  };

  const handleConfirmCategory = () => {
    if (!selectedCategoryId) return;
    finishRedeem({ categoryId: selectedCategoryId });
  };

  const handleConfirmCourse = () => {
    if (!selectedCourseId) return;
    finishRedeem({ courseId: selectedCourseId });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-brand-purple flex items-center justify-center">
              <HiOutlineKey />
            </div>
            <h2 className="font-heading font-black text-base text-[#2e0854]">
              {t("redeemCode.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-brand-purple rounded-lg hover:bg-gray-50"
          >
            <HiOutlineX />
          </button>
        </div>

        {step === "enterCode" && (
          <form onSubmit={handleCheckCode} className="space-y-4">
            <p className="text-xs text-gray-400 font-light">
              {t("redeemCode.enterCodeHint")}
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono tracking-wider text-center"
              autoFocus
            />
            {error && (
              <p className="text-xs text-brand font-semibold">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full px-4 py-3 bg-brand text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading ? t("dashboard.common.processing") : t("redeemCode.continue")}
            </button>
          </form>
        )}

        {step === "pickCategory" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 font-light">
              {t("redeemCode.pickCategoryHint")}
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${
                    selectedCategoryId === category.id
                      ? "border-brand bg-violet-50/60"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategoryId === category.id}
                    onChange={() => setSelectedCategoryId(category.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-bold text-[#2e0854]">
                      {category.title}
                    </span>
                    {category.description && (
                      <span className="block text-[11px] text-gray-400 font-light mt-0.5">
                        {category.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {error && (
              <p className="text-xs text-brand font-semibold">{error}</p>
            )}
            <button
              onClick={handleConfirmCategory}
              disabled={loading || !selectedCategoryId}
              className="w-full px-4 py-3 bg-brand text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading ? t("dashboard.common.processing") : t("redeemCode.confirmSelection")}
            </button>
          </div>
        )}

        {step === "pickCourse" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 font-light">
              {t("redeemCode.pickCourseHint")}
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${
                    selectedCourseId === course.id
                      ? "border-brand bg-violet-50/60"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="bundleCourse"
                    checked={selectedCourseId === course.id}
                    onChange={() => setSelectedCourseId(course.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-bold text-[#2e0854]">
                      {course.title}
                    </span>
                    {course.description && (
                      <span className="block text-[11px] text-gray-400 font-light mt-0.5 line-clamp-2">
                        {course.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {error && (
              <p className="text-xs text-brand font-semibold">{error}</p>
            )}
            <button
              onClick={handleConfirmCourse}
              disabled={loading || !selectedCourseId}
              className="w-full px-4 py-3 bg-brand text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading
                ? t("dashboard.common.processing")
                : t("redeemCode.confirmCourseSelection")}
            </button>
          </div>
        )}

        {step === "unsupported" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-light">
              {t("redeemCode.unsupportedHint")}
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold"
            >
              {t("dashboard.common.cancel")}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <HiOutlineCheck className="text-2xl" />
            </div>
            <p className="text-sm font-semibold text-[#2e0854]">
              {resultMessage}
            </p>
            {resultData?.courses?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {resultData.courses.map((course) => (
                  <span
                    key={course.id}
                    className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple"
                  >
                    {course.title}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-brand text-white rounded-xl text-sm font-semibold"
            >
              {t("redeemCode.done")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedeemCodeModal;
