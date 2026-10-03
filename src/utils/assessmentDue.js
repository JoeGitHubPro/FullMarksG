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

// Converts a value from the backend (a true UTC instant — either an ISO
// string like "2026-09-26T14:53:00.000Z" or a "YYYY-MM-DD HH:MM:SS" string
// mysql2 already resolved to UTC) into the "YYYY-MM-DDTHH:MM" shape a
// <input type="datetime-local"> needs, expressed in the *browser's own
// local time* — not a naive slice of the UTC digits, which would show the
// wrong wall-clock time to whoever is looking at the form.
export const toDatetimeLocalValue = (value) => {
  const date = parseAssessmentDateTime(value);
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

// The reverse direction: a <input type="datetime-local"> value has no
// timezone attached, so the browser (and this function) treats it as the
// viewer's own local wall-clock time — correct, since that's what they
// meant when they picked it. `new Date(value)` on a string with no "Z"/
// offset is parsed as local time by every browser, so .toISOString() gives
// the true UTC instant that's safe to send to the backend and store.
// Without this conversion the raw local string gets stored as a literal
// DATETIME value and is later misread as UTC on the way back out, shifting
// every schedule by the viewer's UTC offset (e.g. +3h for Cairo).
export const localInputToUtcIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

// Convert a server timed-attempt ({ deadline, serverNow, ... }) into this
// device's clock. `deadline` is an absolute timestamp from the SERVER clock;
// comparing it directly with the browser's Date.now() breaks for students
// whose phone/PC clock is wrong — a clock that's ahead by more than the quiz
// window makes the countdown hit 0 instantly and auto-submits an empty quiz.
// Re-anchoring on serverNow makes the countdown depend only on the time
// REMAINING, which is the same on every device.
export const toLocalAttempt = (attempt) => {
  if (!attempt) return attempt;
  const deadline = attempt.deadline != null ? Number(attempt.deadline) : null;
  const serverNow = attempt.serverNow != null ? Number(attempt.serverNow) : null;
  if (!deadline || !serverNow) return attempt;
  return { ...attempt, deadline: Date.now() + (deadline - serverNow) };
};
