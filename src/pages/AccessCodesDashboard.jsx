import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import writeExcelFile from "write-excel-file/browser";
import {
  HiOutlineKey,
  HiOutlinePlusCircle,
  HiOutlineDuplicate,
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineDownload,
} from "react-icons/hi";

const AccessCodesDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const TAB_CONFIG = {
    multi_course: {
      requiresCoursePicker: true,
      badge: t("dashboard.accessCodes.badge"),
      title: t("dashboard.accessCodes.title"),
      subtitle: t("dashboard.accessCodes.subtitle"),
      tabLabel: t("dashboard.accessCodes.bundleTab"),
      newCode: t("dashboard.accessCodes.newCode"),
      createTitle: t("dashboard.accessCodes.createTitle"),
      bulkTitle: t("dashboard.accessCodes.bulkTitle"),
      empty: t("dashboard.accessCodes.empty"),
    },
    bundle_select: {
      requiresCoursePicker: true,
      requiresAudiencePicker: true,
      badge: t("dashboard.accessCodes.bundleSelectBadge"),
      title: t("dashboard.accessCodes.bundleSelectTitle"),
      subtitle: t("dashboard.accessCodes.bundleSelectSubtitle"),
      tabLabel: t("dashboard.accessCodes.bundleSelectTab"),
      newCode: t("dashboard.accessCodes.bundleSelectNewCode"),
      createTitle: t("dashboard.accessCodes.bundleSelectCreateTitle"),
      bulkTitle: t("dashboard.accessCodes.bundleSelectBulkTitle"),
      empty: t("dashboard.accessCodes.bundleSelectEmpty"),
    },
    any_course: {
      requiresCoursePicker: false,
      badge: t("dashboard.accessCodes.openCourseBadge"),
      title: t("dashboard.accessCodes.openCourseTitle"),
      subtitle: t("dashboard.accessCodes.openCourseSubtitle"),
      tabLabel: t("dashboard.accessCodes.openCourseTab"),
      newCode: t("dashboard.accessCodes.openCourseNewCode"),
      createTitle: t("dashboard.accessCodes.openCourseCreateTitle"),
      bulkTitle: t("dashboard.accessCodes.openCourseBulkTitle"),
      empty: t("dashboard.accessCodes.openCourseEmpty"),
      anyLabel: t("dashboard.accessCodes.openCourseAnyCourse"),
    },
    any_chapter_item: {
      requiresCoursePicker: false,
      badge: t("dashboard.accessCodes.openItemBadge"),
      title: t("dashboard.accessCodes.openItemTitle"),
      subtitle: t("dashboard.accessCodes.openItemSubtitle"),
      tabLabel: t("dashboard.accessCodes.openItemTab"),
      newCode: t("dashboard.accessCodes.openItemNewCode"),
      createTitle: t("dashboard.accessCodes.openItemCreateTitle"),
      bulkTitle: t("dashboard.accessCodes.openItemBulkTitle"),
      empty: t("dashboard.accessCodes.openItemEmpty"),
      anyLabel: t("dashboard.accessCodes.openItemAnyItem"),
    },
    instructor_course: {
      requiresCoursePicker: false,
      requiresInstructorPicker: true,
      requiresAudiencePicker: true,
      badge: t("dashboard.accessCodes.instructorBadge"),
      title: t("dashboard.accessCodes.instructorTitle"),
      subtitle: t("dashboard.accessCodes.instructorSubtitle"),
      tabLabel: t("dashboard.accessCodes.instructorTab"),
      newCode: t("dashboard.accessCodes.instructorNewCode"),
      createTitle: t("dashboard.accessCodes.instructorCreateTitle"),
      bulkTitle: t("dashboard.accessCodes.instructorBulkTitle"),
      empty: t("dashboard.accessCodes.instructorEmpty"),
    },
    category: {
      requiresCategoryPicker: true,
      badge: t("dashboard.accessCodes.categoryBadge"),
      title: t("dashboard.accessCodes.categoryTitle"),
      subtitle: t("dashboard.accessCodes.categorySubtitle"),
      tabLabel: t("dashboard.accessCodes.categoryTab"),
      newCode: t("dashboard.accessCodes.categoryNewCode"),
      createTitle: t("dashboard.accessCodes.categoryCreateTitle"),
      bulkTitle: t("dashboard.accessCodes.categoryBulkTitle"),
      empty: t("dashboard.accessCodes.categoryEmpty"),
    },
  };

  const [activeTab, setActiveTab] = useState("multi_course");
  const [codes, setCodes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [codeFormError, setCodeFormError] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [newCode, setNewCode] = useState({
    maxUses: 1,
    expiresAt: "",
    accessDurationDays: "",
    customCode: "",
  });
  const [bulkQuantity, setBulkQuantity] = useState(5);
  const [bulkExpiresAt, setBulkExpiresAt] = useState("");
  const [bulkAccessDurationDays, setBulkAccessDurationDays] = useState("");
  const [selectedAudience, setSelectedAudience] = useState("any");
  const [selectedCodeIds, setSelectedCodeIds] = useState([]);
  const [bulkAudienceValue, setBulkAudienceValue] = useState("any");
  const [bulkAudienceSaving, setBulkAudienceSaving] = useState(false);
  const [page, setPage] = useState(1);
  const CODES_PAGE_SIZE = 20;
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: CODES_PAGE_SIZE,
    totalPages: 1,
  });

  const tab = TAB_CONFIG[activeTab];
  const requiresCoursePicker = tab.requiresCoursePicker;
  const requiresInstructorPicker = !!tab.requiresInstructorPicker;
  const requiresCategoryPicker = !!tab.requiresCategoryPicker;
  const requiresAudiencePicker = !!tab.requiresAudiencePicker;

  const AUDIENCE_OPTIONS = [
    { value: "any", label: t("dashboard.accessCodes.audienceAny") },
    { value: "online", label: t("dashboard.accessCodes.audienceOnline") },
    { value: "center", label: t("dashboard.accessCodes.audienceCenter") },
  ];
  const audienceLabel = (value) =>
    AUDIENCE_OPTIONS.find((opt) => opt.value === value)?.label || value;

  const getCodeCoursesText = (code) => {
    if (requiresCoursePicker) {
      return (code.courses || []).map((c) => c.title).join(", ");
    }
    if (requiresInstructorPicker) {
      return code.instructor
        ? `${code.instructor.firstName} ${code.instructor.lastName}`
        : "";
    }
    if (requiresCategoryPicker) {
      return (code.categories || []).map((c) => c.title).join(", ");
    }
    return tab.anyLabel || "";
  };

  const EXPORT_COLUMNS = [
    {
      id: "id",
      label: "ID",
      cell: (code) => ({ value: code.id, type: Number }),
      width: 8,
    },
    {
      id: "code",
      label: "Code",
      cell: (code) => ({ value: code.code }),
      width: 16,
    },
    {
      id: "courses",
      label: t("dashboard.accessCodes.courses"),
      cell: (code) => ({ value: getCodeCoursesText(code) }),
      width: 40,
    },
    {
      id: "uses",
      label: "Uses",
      cell: (code) => ({ value: `${code.used_count} / ${code.max_uses}` }),
      width: 10,
    },
    {
      id: "expiresAt",
      label: t("dashboard.courses.codeExpiresAt"),
      cell: (code) => ({
        value: code.expires_at
          ? new Date(code.expires_at).toLocaleDateString()
          : t("dashboard.courses.never"),
      }),
      width: 16,
    },
    {
      id: "accessDuration",
      label: t("dashboard.courses.accessDurationDays"),
      cell: (code) => ({
        value: code.access_duration_days
          ? t("dashboard.courses.accessDurationValue", {
              days: code.access_duration_days,
            })
          : t("dashboard.courses.unlimitedAccess"),
      }),
      width: 22,
    },
    {
      id: "status",
      label: "Status",
      cell: (code) => ({ value: code.is_active ? "Active" : "Inactive" }),
      width: 10,
    },
    ...(requiresAudiencePicker
      ? [
          {
            id: "audience",
            label: t("dashboard.accessCodes.audienceColumn"),
            cell: (code) => ({ value: audienceLabel(code.audience || "any") }),
            width: 20,
          },
        ]
      : []),
  ];

  const [showExportPanel, setShowExportPanel] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState(() =>
    EXPORT_COLUMNS.map((col) => col.id),
  );
  const [exporting, setExporting] = useState(false);

  const toggleExportColumn = (columnId) => {
    setSelectedExportColumns((current) =>
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId],
    );
  };

  const handleExportCodes = async () => {
    if (selectedExportColumns.length === 0) return;
    setExporting(true);
    setError("");
    try {
      const res = await api.getAllAccessCodes({
        codeType: activeTab,
        page: 1,
        limit: Math.max(pagination.total || 0, codes.length, 1),
      });
      const allCodes = res.success ? res.data || [] : [];
      const columns = EXPORT_COLUMNS.filter((col) =>
        selectedExportColumns.includes(col.id),
      );
      await writeExcelFile(allCodes, {
        columns: columns.map((col) => ({
          header: { value: col.label, fontWeight: "bold" },
          cell: col.cell,
          width: col.width,
        })),
      }).toFile(`${activeTab}-access-codes.xlsx`);
      setShowExportPanel(false);
    } catch (err) {
      setError(err.message || t("dashboard.accessCodes.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const fetchCodes = async (codeType, targetPage = page) => {
    setCodesLoading(true);
    setError("");
    setSelectedCodeIds([]);
    try {
      const res = await api.getAllAccessCodes({
        codeType,
        page: targetPage,
        limit: CODES_PAGE_SIZE,
      });
      if (res.success) {
        setCodes(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setCodes([]);
      }
    } catch (err) {
      setError(err.message || t("dashboard.accessCodes.loadFailed"));
    } finally {
      setCodesLoading(false);
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.getAllCourses({ status: "published", limit: 200 });
      if (res.success) setCourses(res.data || []);
    } catch (err) {
      console.error("Failed to fetch courses for bundle codes", err);
    }
  };

  const fetchInstructors = async () => {
    try {
      const res = await api.getAllInstructors({ limit: 200 });
      if (res.success) setInstructors(res.data || []);
    } catch (err) {
      console.error("Failed to fetch instructors for instructor codes", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.getAllCategories({ limit: 200 });
      if (res.success) setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch categories for category codes", err);
    }
  };

  useEffect(() => {
    fetchCodes(activeTab, page);
    fetchCourses();
    fetchInstructors();
    fetchCategories();
    setShowCreateForm(false);
    setShowBulkForm(false);
    setCodeFormError("");
    setSelectedInstructorId("");
    setSelectedAudience("any");
    setBulkAudienceValue("any");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.title.localeCompare(b.title)),
    [courses],
  );

  const sortedInstructors = useMemo(
    () =>
      [...instructors]
        .filter((inst) => inst.instructor_record_id)
        .sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`,
          ),
        ),
    [instructors],
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.title.localeCompare(b.title)),
    [categories],
  );

  const toggleCourseSelection = (courseId) => {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    );
  };

  const toggleCategorySelection = (categoryId) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const validateCourseSelection = () => {
    if (requiresCoursePicker && selectedCourseIds.length < 2) {
      setCodeFormError(t("dashboard.accessCodes.selectAtLeastTwoCourses"));
      return false;
    }
    if (requiresInstructorPicker && !selectedInstructorId) {
      setCodeFormError(t("dashboard.accessCodes.selectInstructor"));
      return false;
    }
    if (requiresCategoryPicker && selectedCategoryIds.length < 1) {
      setCodeFormError(t("dashboard.accessCodes.selectAtLeastOneCategory"));
      return false;
    }
    return true;
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setCodeFormError("");
    if (!validateCourseSelection()) return;

    try {
      const res = await api.createAccessCode({
        codeType: activeTab,
        ...(requiresCoursePicker ? { courseIds: selectedCourseIds } : {}),
        ...(requiresInstructorPicker
          ? { instructorId: selectedInstructorId }
          : {}),
        ...(requiresCategoryPicker
          ? { categoryIds: selectedCategoryIds }
          : {}),
        ...(requiresAudiencePicker ? { audience: selectedAudience } : {}),
        maxUses: newCode.maxUses,
        expiresAt: newCode.expiresAt || null,
        accessDurationDays: newCode.accessDurationDays
          ? parseInt(newCode.accessDurationDays, 10)
          : null,
        customCode: newCode.customCode || undefined,
      });

      if (res.success) {
        triggerSuccess(t("dashboard.courses.codeCreated"));
        setShowCreateForm(false);
        setNewCode({
          maxUses: 1,
          expiresAt: "",
          accessDurationDays: "",
          customCode: "",
        });
        setSelectedCourseIds([]);
        setSelectedInstructorId("");
        setSelectedCategoryIds([]);
        fetchCodes(activeTab);
      } else {
        setCodeFormError(res.message || t("dashboard.common.creationFailed"));
      }
    } catch (err) {
      setCodeFormError(err.message);
    }
  };

  const handleBulkCreate = async () => {
    setCodeFormError("");
    if (!validateCourseSelection()) return;

    try {
      const res = await api.createBulkAccessCodes({
        codeType: activeTab,
        ...(requiresCoursePicker ? { courseIds: selectedCourseIds } : {}),
        ...(requiresInstructorPicker
          ? { instructorId: selectedInstructorId }
          : {}),
        ...(requiresCategoryPicker
          ? { categoryIds: selectedCategoryIds }
          : {}),
        ...(requiresAudiencePicker ? { audience: selectedAudience } : {}),
        quantity: bulkQuantity,
        maxUses: 1,
        expiresAt: bulkExpiresAt || null,
        accessDurationDays: bulkAccessDurationDays
          ? parseInt(bulkAccessDurationDays, 10)
          : null,
      });

      if (res.success) {
        triggerSuccess(
          t("dashboard.courses.codesBulkCreated", {
            count: res.data?.codes?.length || bulkQuantity,
          }),
        );
        setShowBulkForm(false);
        setSelectedCourseIds([]);
        setSelectedInstructorId("");
        setSelectedCategoryIds([]);
        fetchCodes(activeTab);
      } else {
        setCodeFormError(res.message || t("dashboard.common.creationFailed"));
      }
    } catch (err) {
      setCodeFormError(err.message);
    }
  };

  const handleToggleActive = async (code) => {
    try {
      await api.updateAccessCode(code.id, { isActive: !code.is_active });
      fetchCodes(activeTab);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCode = async (codeId, codeValue) => {
    if (!window.confirm(t("dashboard.accessCodes.deleteConfirm", { code: codeValue }))) {
      return;
    }
    try {
      const res = await api.deleteAccessCode(codeId);
      if (res.success) {
        triggerSuccess(t("dashboard.courses.codeDeleted"));
        fetchCodes(activeTab);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleCodeSelection = (codeId) => {
    setSelectedCodeIds((current) =>
      current.includes(codeId)
        ? current.filter((id) => id !== codeId)
        : [...current, codeId],
    );
  };

  const toggleSelectAllCodes = () => {
    setSelectedCodeIds((current) =>
      current.length === codes.length ? [] : codes.map((c) => c.id),
    );
  };

  const handleBulkAudienceUpdate = async () => {
    if (selectedCodeIds.length === 0) return;
    setBulkAudienceSaving(true);
    setError("");
    try {
      const res = await api.bulkUpdateAccessCodeAudience(
        selectedCodeIds,
        bulkAudienceValue,
      );
      if (res.success) {
        triggerSuccess(
          t("dashboard.accessCodes.audienceBulkUpdated", {
            count: res.data?.updatedCount ?? selectedCodeIds.length,
          }),
        );
        setSelectedCodeIds([]);
        fetchCodes(activeTab);
      } else {
        setError(res.message || t("dashboard.accessCodes.audienceBulkFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.accessCodes.audienceBulkFailed"));
    } finally {
      setBulkAudienceSaving(false);
    }
  };

  const renderCoursePicker = () => (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
        {t("dashboard.accessCodes.selectCourses")} *
      </label>
      <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-3 space-y-2">
        {sortedCourses.length === 0 ? (
          <p className="text-xs text-gray-400">{t("dashboard.accessCodes.noCourses")}</p>
        ) : (
          sortedCourses.map((course) => (
            <label
              key={course.id}
              className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCourseIds.includes(course.id)}
                onChange={() => toggleCourseSelection(course.id)}
                className="mt-1"
              />
              <span className="text-sm text-[#2e0854]">{course.title}</span>
            </label>
          ))
        )}
      </div>
      <p className="text-[11px] text-gray-400">
        {t("dashboard.accessCodes.selectedCount", {
          count: selectedCourseIds.length,
        })}
      </p>
    </div>
  );

  const renderInstructorPicker = () => (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
        {t("dashboard.accessCodes.selectInstructor")} *
      </label>
      {sortedInstructors.length === 0 ? (
        <p className="text-xs text-gray-400">
          {t("dashboard.accessCodes.noInstructors")}
        </p>
      ) : (
        <select
          value={selectedInstructorId}
          onChange={(e) => setSelectedInstructorId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl p-2 text-sm"
        >
          <option value="">-- {t("dashboard.accessCodes.selectInstructor")} --</option>
          {sortedInstructors.map((inst) => (
            <option key={inst.instructor_record_id} value={inst.instructor_record_id}>
              {inst.first_name} {inst.last_name} ({inst.phone})
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const renderAudiencePicker = () => (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
        {t("dashboard.accessCodes.audienceLabel")}
      </label>
      <select
        value={selectedAudience}
        onChange={(e) => setSelectedAudience(e.target.value)}
        className="w-full border border-gray-200 rounded-xl p-2 text-sm"
      >
        {AUDIENCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderCategoryPicker = () => (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
        {t("dashboard.accessCodes.selectCategories")} *
      </label>
      <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-3 space-y-2">
        {sortedCategories.length === 0 ? (
          <p className="text-xs text-gray-400">
            {t("dashboard.accessCodes.noCategories")}
          </p>
        ) : (
          sortedCategories.map((category) => (
            <label
              key={category.id}
              className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCategoryIds.includes(category.id)}
                onChange={() => toggleCategorySelection(category.id)}
                className="mt-1"
              />
              <span className="text-sm text-[#2e0854]">{category.title}</span>
            </label>
          ))
        )}
      </div>
      <p className="text-[11px] text-gray-400">
        {t("dashboard.accessCodes.categoriesSelectedCount", {
          count: selectedCategoryIds.length,
        })}
      </p>
    </div>
  );

  const renderCodeFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">Max Uses</label>
        <input
          type="number"
          min="1"
          value={newCode.maxUses}
          onChange={(e) =>
            setNewCode({ ...newCode, maxUses: parseInt(e.target.value, 10) || 1 })
          }
          className="w-full border border-gray-200 rounded-xl p-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">
          {t("dashboard.courses.codeExpiresAt")}
        </label>
        <input
          type="datetime-local"
          value={newCode.expiresAt}
          onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
          className="w-full border border-gray-200 rounded-xl p-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">
          {t("dashboard.courses.accessDurationDays")}
        </label>
        <input
          type="number"
          min="1"
          value={newCode.accessDurationDays}
          onChange={(e) => setNewCode({ ...newCode, accessDurationDays: e.target.value })}
          placeholder={t("dashboard.courses.accessDurationPlaceholder")}
          className="w-full border border-gray-200 rounded-xl p-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">
          Custom Code (optional)
        </label>
        <input
          type="text"
          value={newCode.customCode}
          onChange={(e) => setNewCode({ ...newCode, customCode: e.target.value.toUpperCase() })}
          placeholder="LEAVE EMPTY FOR RANDOM"
          className="w-full border border-gray-200 rounded-xl p-2 text-sm font-mono"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn text-[#2e0854]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
            {tab.badge}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight mt-3 flex items-center gap-2">
            <HiOutlineKey className="text-brand-purple" />
            {tab.title}
          </h1>
          <p className="text-sm text-gray-400 font-light mt-2 max-w-2xl">{tab.subtitle}</p>
        </div>
        <div className="flex gap-2 relative">
          <button
            onClick={() => {
              setShowCreateForm(true);
              setShowBulkForm(false);
              setCodeFormError("");
            }}
            className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <HiOutlinePlusCircle /> {tab.newCode}
          </button>
          <button
            onClick={() => {
              setShowBulkForm(true);
              setShowCreateForm(false);
              setCodeFormError("");
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <HiOutlineDuplicate /> {t("dashboard.accessCodes.bulk")}
          </button>
          <button
            onClick={() => setShowExportPanel((current) => !current)}
            disabled={codes.length === 0}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
          >
            <HiOutlineDownload /> {t("dashboard.accessCodes.export")}
          </button>

          {showExportPanel && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-lg p-4 z-10 space-y-3">
              <p className="text-xs font-bold text-gray-500">
                {t("dashboard.accessCodes.exportColumns")}
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {EXPORT_COLUMNS.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExportColumns.includes(col.id)}
                      onChange={() => toggleExportColumn(col.id)}
                      className="rounded border-gray-300"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
              <button
                onClick={handleExportCodes}
                disabled={exporting || selectedExportColumns.length === 0}
                className="w-full px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold disabled:bg-violet-300"
              >
                {exporting
                  ? t("dashboard.accessCodes.exporting")
                  : t("dashboard.accessCodes.downloadExcel")}
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2 border-b border-gray-100">
          {Object.keys(TAB_CONFIG).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => {
                setActiveTab(tabKey);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px ${
                activeTab === tabKey
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-400"
              }`}
            >
              {TAB_CONFIG[tabKey].tabLabel}
            </button>
          ))}
        </div>
      )}

      {pagination.total > 0 && (
        <p className="text-xs text-gray-400 font-medium">
          {t("dashboard.accessCodes.totalCount", { total: pagination.total })}
        </p>
      )}

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}
      {codeFormError && (
        <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
          ⚠️ {codeFormError}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-sm">{tab.createTitle}</h2>
          <form onSubmit={handleCreateCode} className="space-y-4">
            {requiresCoursePicker && renderCoursePicker()}
            {requiresInstructorPicker && renderInstructorPicker()}
            {requiresCategoryPicker && renderCategoryPicker()}
            {requiresAudiencePicker && renderAudiencePicker()}
            {renderCodeFields()}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border rounded-xl text-sm"
              >
                {t("dashboard.common.cancel")}
              </button>
              <button type="submit" className="px-4 py-2 bg-brand text-white rounded-xl text-sm">
                {t("dashboard.common.create")}
              </button>
            </div>
          </form>
        </div>
      )}

      {showBulkForm && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-sm">{tab.bulkTitle}</h2>
          {requiresCoursePicker && renderCoursePicker()}
          {requiresInstructorPicker && renderInstructorPicker()}
          {requiresCategoryPicker && renderCategoryPicker()}
          {requiresAudiencePicker && renderAudiencePicker()}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Quantity (max 500)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={bulkQuantity}
                onChange={(e) => setBulkQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full border border-gray-200 rounded-xl p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t("dashboard.courses.codeExpiresAt")}
              </label>
              <input
                type="datetime-local"
                value={bulkExpiresAt}
                onChange={(e) => setBulkExpiresAt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t("dashboard.courses.accessDurationDays")}
              </label>
              <input
                type="number"
                min="1"
                value={bulkAccessDurationDays}
                onChange={(e) => setBulkAccessDurationDays(e.target.value)}
                placeholder={t("dashboard.courses.accessDurationPlaceholder")}
                className="w-full border border-gray-200 rounded-xl p-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBulkForm(false)}
              className="px-4 py-2 border rounded-xl text-sm"
            >
              {t("dashboard.common.cancel")}
            </button>
            <button
              onClick={handleBulkCreate}
              className="px-4 py-2 bg-brand text-white rounded-xl text-sm"
            >
              {t("dashboard.accessCodes.generateCount", { count: bulkQuantity })}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        {codesLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading codes...</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm border rounded-2xl border-dashed">
            {tab.empty}
          </div>
        ) : (
          <div className="space-y-4">
            {requiresAudiencePicker && selectedCodeIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                <span className="text-xs font-bold text-brand">
                  {t("dashboard.accessCodes.audienceBulkTitle", {
                    count: selectedCodeIds.length,
                  })}
                </span>
                <select
                  value={bulkAudienceValue}
                  onChange={(e) => setBulkAudienceValue(e.target.value)}
                  className="border border-gray-200 rounded-xl p-1.5 text-xs bg-white"
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAudienceUpdate}
                  disabled={bulkAudienceSaving}
                  className="px-3 py-1.5 bg-brand text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {bulkAudienceSaving
                    ? t("dashboard.common.saving")
                    : t("dashboard.accessCodes.audienceBulkApply")}
                </button>
                <button
                  onClick={() => setSelectedCodeIds([])}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  {t("dashboard.common.cancel")}
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {requiresAudiencePicker && (
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          codes.length > 0 &&
                          selectedCodeIds.length === codes.length
                        }
                        onChange={toggleSelectAllCodes}
                        aria-label={t("dashboard.accessCodes.selectAllCodes")}
                      />
                    </th>
                  )}
                  <th className="text-left p-3">{t("dashboard.common.id")}</th>
                  <th className="text-left p-3">{t("dashboard.common.code")}</th>
                  <th className="text-left p-3">{t("dashboard.accessCodes.courses")}</th>
                  <th className="text-left p-3">{t("dashboard.common.uses")}</th>
                  <th className="text-left p-3">{t("dashboard.courses.codeExpiresAt")}</th>
                  <th className="text-left p-3">{t("dashboard.courses.accessDurationDays")}</th>
                  <th className="text-left p-3">{t("dashboard.common.status")}</th>
                  {requiresAudiencePicker && (
                    <th className="text-left p-3">
                      {t("dashboard.accessCodes.audienceColumn")}
                    </th>
                  )}
                  <th className="text-left p-3">{t("dashboard.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b hover:bg-gray-50 align-top">
                    {requiresAudiencePicker && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedCodeIds.includes(code.id)}
                          onChange={() => toggleCodeSelection(code.id)}
                          aria-label={code.code}
                        />
                      </td>
                    )}
                    <td className="p-3 font-mono text-gray-400 whitespace-nowrap">
                      {code.id}
                    </td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap">{code.code}</td>
                    <td className="p-3">
                      {requiresCoursePicker ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {(code.courses || []).map((course) => (
                            <span
                              key={course.id}
                              className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple"
                            >
                              {course.title}
                            </span>
                          ))}
                        </div>
                      ) : requiresInstructorPicker ? (
                        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple">
                          {code.instructor
                            ? `${code.instructor.firstName} ${code.instructor.lastName}`
                            : "—"}
                        </span>
                      ) : requiresCategoryPicker ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {(code.categories || []).map((category) => (
                            <span
                              key={category.id}
                              className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple"
                            >
                              {category.title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple">
                          {tab.anyLabel}
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {code.used_count} / {code.max_uses}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {code.expires_at
                        ? new Date(code.expires_at).toLocaleDateString()
                        : t("dashboard.courses.never")}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {code.access_duration_days
                        ? t("dashboard.courses.accessDurationValue", {
                            days: code.access_duration_days,
                          })
                        : t("dashboard.courses.unlimitedAccess")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          code.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {code.is_active
                          ? t("dashboard.common.active")
                          : t("dashboard.common.inactive")}
                      </span>
                    </td>
                    {requiresAudiencePicker && (
                      <td className="p-3 whitespace-nowrap">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          {audienceLabel(code.audience || "any")}
                        </span>
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(code)}
                          className="text-blue-600 hover:underline"
                          title={t("dashboard.common.toggleActive")}
                        >
                          <HiOutlineRefresh />
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code.id, code.code)}
                          className="text-brand-purple hover:underline"
                          title={t("dashboard.common.delete")}
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={page <= 1 || codesLoading}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-xl border border-gray-100 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-40"
          >
            {t("dashboard.common.back")}
          </button>
          <span className="text-xs text-gray-400">
            {page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages || codesLoading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl border border-gray-100 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-40"
          >
            {t("dashboard.common.next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default AccessCodesDashboard;
