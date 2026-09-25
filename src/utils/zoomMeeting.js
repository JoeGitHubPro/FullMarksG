const EARLY_JOIN_MINUTES = 5;

export const parseMeetingDateTime = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
    );
  }

  const str = String(value).trim();
  const match = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (match) {
    const [, y, mo, d, h, mi, s = "0"] = match;
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getMeetingEndTime = (startTime, durationMinutes) => {
  const start = parseMeetingDateTime(startTime);
  if (!start) return null;
  const duration = Number(durationMinutes);
  if (!Number.isFinite(duration) || duration < 1) return null;
  return new Date(start.getTime() + duration * 60 * 1000);
};

export const getZoomMeetingWindowStatus = (
  startTime,
  durationMinutes,
  meetingStatus,
) => {
  if (meetingStatus === "ended") return "ended";
  if (meetingStatus === "live") return "live";

  const start = parseMeetingDateTime(startTime);
  if (!start) return "live";

  const end = getMeetingEndTime(startTime, durationMinutes);
  const now = Date.now();
  const earlyStart = start.getTime() - EARLY_JOIN_MINUTES * 60 * 1000;

  if (now < earlyStart) return "upcoming";
  if (end && now >= end.getTime()) return "ended";
  return "live";
};

export const formatMeetingDateTime = (value) => {
  const date = parseMeetingDateTime(value);
  if (!date) return "";
  return date.toLocaleString();
};
