export const parseAssessmentDateTime = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const parseDueDate = parseAssessmentDateTime;

export const isPastDueDate = (dueDate) => {
  const due = parseAssessmentDateTime(dueDate);
  if (!due) return false;
  return Date.now() > due.getTime();
};

export const isBeforeAvailableFrom = (availableFrom) => {
  const start = parseAssessmentDateTime(availableFrom);
  if (!start) return false;
  return Date.now() < start.getTime();
};

export const getAssessmentWindowStatus = (availableFrom, dueDate) => {
  if (isBeforeAvailableFrom(availableFrom)) return "not_started";
  if (isPastDueDate(dueDate)) return "closed";
  return "open";
};

export const formatDueDate = (value) => {
  const date = parseAssessmentDateTime(value);
  if (!date) return "";
  return date.toLocaleString();
};

export const toDatetimeLocalValue = (value) => {
  if (!value) return "";
  const normalized = String(value).trim().replace(" ", "T");
  return normalized.slice(0, 16);
};
