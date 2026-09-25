const STORAGE_KEYS = {
  public: "ig_ai_session_id",
  admin: "ig_ai_session_id_admin",
};

const createSessionId = () =>
  window.crypto?.randomUUID?.() ||
  `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getAiSessionId = (scope = "public") => {
  if (typeof window === "undefined") return "";

  const storageKey = STORAGE_KEYS[scope] || STORAGE_KEYS.public;
  let sessionId = localStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = createSessionId();
    localStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
};

export const resetAiSessionId = (scope = "public") => {
  if (typeof window === "undefined") return "";

  const storageKey = STORAGE_KEYS[scope] || STORAGE_KEYS.public;
  localStorage.removeItem(storageKey);
  return getAiSessionId(scope);
};
