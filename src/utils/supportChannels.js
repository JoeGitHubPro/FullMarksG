export const getSupportChannels = (t) => ({
  admin: {
    key: "admin",
    label: t("dashboard.support.channels.admin.label"),
    description: t("dashboard.support.channels.admin.description"),
    createDescription: t("dashboard.support.channels.admin.createDescription"),
  },
  staff: {
    key: "staff",
    label: t("dashboard.support.channels.staff.label"),
    description: t("dashboard.support.channels.staff.description"),
    createDescription: t("dashboard.support.channels.staff.createDescription"),
  },
  course: {
    key: "course",
    label: t("dashboard.support.channels.course.label"),
    description: t("dashboard.support.channels.course.description"),
    createDescription: t("dashboard.support.channels.course.createDescription"),
  },
});

/** @deprecated use getSupportChannels(t) */
export const SUPPORT_CHANNELS = {
  admin: { key: "admin", label: "Admin Support" },
  staff: { key: "staff", label: "Staff Communication" },
  course: { key: "course", label: "Course Questions" },
};

export const getStatusStyle = (status) => {
  const styles = {
    open: "bg-blue-50 text-blue-600 border-blue-100",
    in_progress: "bg-amber-50 text-amber-600 border-amber-100",
    resolved: "bg-emerald-50 text-emerald-600 border-emerald-100",
    closed: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return styles[status] || styles.open;
};

export const getPriorityStyle = (priority) => {
  const styles = {
    low: "bg-gray-50 text-gray-600",
    medium: "bg-violet-50 text-orange-600",
    high: "bg-violet-50 text-brand-purple font-bold",
    critical: "bg-violet-100 text-brand font-bold",
  };
  return styles[priority] || styles.low;
};
