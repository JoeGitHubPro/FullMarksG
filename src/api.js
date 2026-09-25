// src/api.js

const BASE_URL = import.meta.env.VITE_API_URL;
const SERVER_URL = BASE_URL.replace(/\/api$/, "");

const fetchClient = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...options.headers };
  const token = localStorage.getItem("token");

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const config = { ...options, headers };

  try {
    const response = await fetch(url, config);

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 401) {
      const isAuthEndpoint = endpoint.startsWith("/auth/");
      if (!isAuthEndpoint && token) {
        if (data?.code === "SESSION_SUPERSEDED") {
          sessionStorage.setItem("logoutReason", data.message);
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      return Promise.reject(
        data || {
          message: isAuthEndpoint
            ? "Invalid credentials."
            : "Session expired. Please log in again.",
        },
      );
    }

    if (!response.ok) {
      return Promise.reject(data || { message: "Request failed" });
    }
    return data;
  } catch (error) {
    console.error("Fetch error Exception:", error);
    return Promise.reject(error);
  }
};

export const getFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SERVER_URL}${path}`;
};

export const getUserProfileImage = (user) =>
  user?.profile_image_url || user?.profileImage || user?.profile_image || null;

const buildQueryString = (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const query = new URLSearchParams(cleanParams).toString();
  return query ? `?${query}` : "";
};

export const api = {
  getFileUrl,

  // ==================================================================
  // --- SEARCH ---
  // ==================================================================

  search: async (query, options = {}) => {
    return await fetchClient(
      `/search${buildQueryString({ q: query, ...options })}`,
      { method: "GET" },
    );
  },

  // ==================================================================
  // --- AUTH ---
  // ==================================================================

  register: async (userData) => {
    return await fetchClient("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  login: async (loginIdentifier, password) => {
    return await fetchClient("/auth/login", {
      method: "POST",
      body: JSON.stringify({ loginIdentifier, password }),
    });
  },

  logout: async () => {
    return await fetchClient("/auth/logout", { method: "POST" });
  },

  // Public: whether the WhatsApp gateway session is connected right now —
  // used to decide whether to collect a fallback email before requesting an
  // OTP (forgot-password / registration).
  getWhatsappAvailability: async () => {
    return await fetchClient("/auth/whatsapp-availability", {
      method: "GET",
    });
  },

  // Delivery is decided entirely server-side: WhatsApp when connected, else
  // the email already on file for the account, else the request is flagged
  // for staff to handle manually (response.requiresSupport).
  forgotPassword: async (phone) => {
    return await fetchClient("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  resetPassword: async (phone, otpCode, newPassword) => {
    return await fetchClient("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ phone, otpCode, newPassword }),
    });
  },

  updateAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return await fetchClient("/auth/profile/image", {
      method: "PUT",
      body: formData,
    });
  },

  updateUserAvatar: async (userId, file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return await fetchClient(`/users/${userId}/profile-image`, {
      method: "PUT",
      body: formData,
    });
  },

  deleteUserAvatar: async (userId) => {
    return await fetchClient(`/users/${userId}/profile-image`, {
      method: "DELETE",
    });
  },

  deleteAvatar: async () => {
    return await fetchClient("/auth/profile/image", { method: "DELETE" });
  },

  // ── Registration OTP flow (shared by student + parent signup) ──

  // accountType: "student" (default) | "parent"
  // email: only needed when the WhatsApp session isn't connected — collected
  // by the frontend beforehand via getWhatsappAvailability().
  sendRegistrationOtp: async (phone, accountType = "student", email) => {
    return await fetchClient("/auth/register/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone, accountType, email }),
    });
  },

  verifyRegistrationOtp: async (phone, otp) => {
    return await fetchClient("/auth/register/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
  },

  completeRegistration: async (userData, token) => {
    return await fetchClient("/auth/register/complete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  },

  // Parent signup completion — handles both brand-new parents and
  // existing parents resetting their password after phone verification.
  completeParentRegistration: async (userData, token) => {
    return await fetchClient("/auth/register/complete-parent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  },

  // Parent self-service: add a child linked to the logged-in parent
  addChild: async (childData) => {
    return await fetchClient("/auth/parent/add-child", {
      method: "POST",
      body: JSON.stringify(childData),
    });
  },

  // Parent self-service: list the logged-in parent's own children
  getMyChildren: async () => {
    return await fetchClient("/auth/parent/children", { method: "GET" });
  },

  getChildGrades: async (studentId) => {
    return await fetchClient(`/auth/parent/children/${studentId}/grades`, {
      method: "GET",
    });
  },

  // Self-service: the logged-in user's own profile (any role, avoids
  // the admin-only GET /users/:id route)
  getMe: async () => {
    return await fetchClient("/auth/me", { method: "GET" });
  },

  getAcademicLevels: async () => {
    return await fetchClient("/auth/academic-levels", { method: "GET" });
  },

  // ==================================================================
  // --- USERS (admin only) ---
  // ==================================================================

  createUser: async (userData) => {
    return await fetchClient("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  getAllUsers: async (filters = {}) => {
    return await fetchClient(`/users${buildQueryString(filters)}`, {
      method: "GET",
    });
  },

  getUserById: async (id) => {
    return await fetchClient(`/users/${id}`, { method: "GET" });
  },

  updateUser: async (id, userData) => {
    return await fetchClient(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  toggleUserActive: async (id) => {
    return await fetchClient(`/users/${id}/toggle-active`, { method: "PUT" });
  },

  clearStudentSession: async (id) => {
    return await fetchClient(`/users/${id}/session`, { method: "DELETE" });
  },

  adminResetUserPassword: async (id, newPassword) => {
    return await fetchClient(`/users/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    });
  },

  deleteUser: async (id) => {
    return await fetchClient(`/users/${id}`, { method: "DELETE" });
  },

  setUserVerification: async (userId, isVerified) => {
    return await fetchClient(`/users/${userId}/verification`, {
      method: "PUT",
      body: JSON.stringify({ isVerified }),
    });
  },

  // ==================================================================
  // --- ACADEMIC LEVELS ---
  // ==================================================================

  getAllLevels: async () => {
    return await fetchClient("/academic-levels", { method: "GET" });
  },

  getLevelById: async (idOrSlug) => {
    return await fetchClient(`/academic-levels/${idOrSlug}`, { method: "GET" });
  },

  createLevel: async (levelData) => {
    return await fetchClient("/academic-levels", {
      method: "POST",
      body: JSON.stringify(levelData),
    });
  },

  updateLevel: async (id, levelData) => {
    return await fetchClient(`/academic-levels/${id}`, {
      method: "PUT",
      body: JSON.stringify(levelData),
    });
  },

  deleteLevel: async (id) => {
    return await fetchClient(`/academic-levels/${id}`, { method: "DELETE" });
  },

  // ==================================================================
  // --- SUBJECTS ---
  // ==================================================================

  getAllSubjects: async () => {
    return await fetchClient("/subjects", { method: "GET" });
  },

  getSubjectById: async (id) => {
    return await fetchClient(`/subjects/${id}`, { method: "GET" });
  },

  createSubject: async (subjectData) => {
    return await fetchClient("/subjects", {
      method: "POST",
      body: JSON.stringify(subjectData),
    });
  },

  updateSubject: async (id, subjectData) => {
    return await fetchClient(`/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify(subjectData),
    });
  },

  deleteSubject: async (id) => {
    return await fetchClient(`/subjects/${id}`, { method: "DELETE" });
  },

  // ==================================================================
  // --- CURRICULUMS ---
  // ==================================================================

  getAllCurriculums: async () => {
    return await fetchClient("/curriculums", { method: "GET" });
  },

  getCurriculumById: async (id) => {
    return await fetchClient(`/curriculums/${id}`, { method: "GET" });
  },

  createCurriculum: async (curriculumData) => {
    return await fetchClient("/curriculums", {
      method: "POST",
      body: JSON.stringify(curriculumData),
    });
  },

  updateCurriculum: async (id, curriculumData) => {
    return await fetchClient(`/curriculums/${id}`, {
      method: "PUT",
      body: JSON.stringify(curriculumData),
    });
  },

  deleteCurriculum: async (id) => {
    return await fetchClient(`/curriculums/${id}`, { method: "DELETE" });
  },

  // ==================================================================
  // --- COURSES ---
  // ==================================================================

  getAllCourses: async (filters = {}) => {
    return await fetchClient(`/courses${buildQueryString(filters)}`, {
      method: "GET",
    });
  },

  getCourseBySlug: async (slug) => {
    return await fetchClient(`/courses/${slug}`, { method: "GET" });
  },

  createCourse: async (courseData) => {
    return await fetchClient("/courses", {
      method: "POST",
      body: JSON.stringify(courseData),
    });
  },

  updateCourse: async (id, courseData) => {
    return await fetchClient(`/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(courseData),
    });
  },

  updateCourseCoverImage: async (id, file) => {
    const formData = new FormData();
    formData.append("cover", file);
    return await fetchClient(`/courses/${id}/cover-image`, {
      method: "PUT",
      body: formData,
    });
  },

  deleteCourse: async (id) => {
    return await fetchClient(`/courses/${id}`, { method: "DELETE" });
  },

  // ==================================================================
  // --- CATEGORIES (e.g. "Month 1", "Month 2" course bundles) ---
  // ==================================================================

  getAllCategories: async (filters = {}) => {
    return await fetchClient(`/categories${buildQueryString(filters)}`, {
      method: "GET",
    });
  },

  getCategoryBySlug: async (slug) => {
    return await fetchClient(`/categories/${slug}`, { method: "GET" });
  },

  createCategory: async (categoryData) => {
    return await fetchClient("/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    });
  },

  updateCategory: async (id, categoryData) => {
    return await fetchClient(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(categoryData),
    });
  },

  updateCategoryCoverImage: async (id, file) => {
    const formData = new FormData();
    formData.append("cover", file);
    return await fetchClient(`/categories/${id}/cover-image`, {
      method: "PUT",
      body: formData,
    });
  },

  deleteCategory: async (id) => {
    return await fetchClient(`/categories/${id}`, { method: "DELETE" });
  },

  getCourseStudents: async (id) => {
    return await fetchClient(`/courses/${id}/students`, { method: "GET" });
  },

  // Self-service: the logged-in student's own enrollments (avoids the
  // admin-only GET /users/:id/enrollments route)
  getMyEnrollments: async () => {
    return await fetchClient("/courses/my/enrollments", { method: "GET" });
  },

  enrollStudent: async (id, studentId, enrollmentMethod) => {
    return await fetchClient(`/courses/${id}/enroll`, {
      method: "POST",
      body: JSON.stringify({ studentId, enrollmentMethod }),
    });
  },

  updateEnrollmentStatus: async (id, studentId, status) => {
    return await fetchClient(`/courses/${id}/enrollment/${studentId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  removeEnrollment: async (id, studentId) => {
    return await fetchClient(`/courses/${id}/enrollment/${studentId}`, {
      method: "DELETE",
    });
  },

  restoreEnrollment: async (id, studentId) => {
    return await fetchClient(`/courses/${id}/enrollment/${studentId}/restore`, {
      method: "PUT",
    });
  },

  // ==================================================================
  // --- CHAPTERS ---
  // ==================================================================

  createChapter: async (chapterData) => {
    return await fetchClient("/chapters", {
      method: "POST",
      body: JSON.stringify(chapterData),
    });
  },

  getChaptersForCourse: async (courseId) => {
    return await fetchClient(`/chapters/course/${courseId}`, { method: "GET" });
  },

  updateChapter: async (id, chapterData) => {
    return await fetchClient(`/chapters/${id}`, {
      method: "PUT",
      body: JSON.stringify(chapterData),
    });
  },

  deleteChapter: async (id) => {
    return await fetchClient(`/chapters/${id}`, { method: "DELETE" });
  },

  reorderChapters: async (courseId, items) => {
    return await fetchClient(`/chapters/course/${courseId}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },

  // ==================================================================
  // --- CHAPTER ITEMS ---
  // ==================================================================

  createChapterItem: async (itemData) => {
    return await fetchClient("/chapter-items", {
      method: "POST",
      body: JSON.stringify(itemData),
    });
  },

  getChapterItemById: async (id) => {
    return await fetchClient(`/chapter-items/${id}`, { method: "GET" });
  },

  updateChapterItem: async (id, itemData) => {
    return await fetchClient(`/chapter-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    });
  },

  deleteChapterItem: async (id) => {
    return await fetchClient(`/chapter-items/${id}`, { method: "DELETE" });
  },

  updateChapterItemAttachment: async (id, file) => {
    const formData = new FormData();
    formData.append("attachment", file);
    return await fetchClient(`/chapter-items/${id}/attachment`, {
      method: "PUT",
      body: formData,
    });
  },

  deleteChapterItemAttachment: async (id) => {
    return await fetchClient(`/chapter-items/${id}/attachment`, {
      method: "DELETE",
    });
  },

  // ==================================================================
  // --- VIDEO WATCH PROGRESS ---
  // ==================================================================

  startVideoProgress: async (itemId, durationSeconds) => {
    return await fetchClient(`/video-progress/${itemId}/start`, {
      method: "POST",
      body: JSON.stringify({ durationSeconds }),
    });
  },

  pingVideoProgress: async (itemId, payload) => {
    return await fetchClient(`/video-progress/${itemId}/ping`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  issueVideoCheckpoint: async (itemId, checkpointId) => {
    return await fetchClient(
      `/video-progress/${itemId}/checkpoint/${checkpointId}/issue`,
      { method: "POST" },
    );
  },

  ackVideoCheckpoint: async (itemId, checkpointId) => {
    return await fetchClient(
      `/video-progress/${itemId}/checkpoint/${checkpointId}/ack`,
      { method: "POST" },
    );
  },

  completeVideoProgress: async (itemId) => {
    return await fetchClient(`/video-progress/${itemId}/complete`, {
      method: "POST",
    });
  },

  getCourseVideoProgress: async (courseId, filters = {}) => {
    return await fetchClient(
      `/video-progress/course/${courseId}${buildQueryString(filters)}`,
      { method: "GET" },
    );
  },

  getStudentVideoSummary: async (userId) => {
    return await fetchClient(`/video-progress/student/${userId}/summary`, {
      method: "GET",
    });
  },

  // ==================================================================
  // --- PAYMENTS (Geidea online checkout) ---
  // ==================================================================

  createPaymentCheckout: async (itemType, itemId) => {
    return await fetchClient("/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ itemType, itemId }),
    });
  },

  getPaymentOrderStatus: async (reference) => {
    return await fetchClient(`/payments/orders/${encodeURIComponent(reference)}`, {
      method: "GET",
    });
  },

  getAllPaymentOrders: async (filters = {}) => {
    return await fetchClient(`/payments${buildQueryString(filters)}`, {
      method: "GET",
    });
  },

  reorderChapterItems: async (chapterId, items) => {
    return await fetchClient(`/chapter-items/chapter/${chapterId}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },

  unlockChapterItemForStudent: async (id, studentId) => {
    return await fetchClient(`/chapter-items/${id}/unlock`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    });
  },

  lockChapterItemForStudent: async (id, studentId) => {
    return await fetchClient(`/chapter-items/${id}/unlock/${studentId}`, {
      method: "DELETE",
    });
  },

  getChapterItemUnlocks: async (id) => {
    return await fetchClient(`/chapter-items/${id}/unlocks`, { method: "GET" });
  },

  getZoomJoinCredentials: async (itemId) => {
    return await fetchClient(`/zoom/join/${itemId}`, { method: "GET" });
  },

  getZoomMeetingSchedule: async (itemId) => {
    return await fetchClient(`/zoom/schedule/${itemId}`, { method: "GET" });
  },

  // ==================================================================
  // --- ACCESS CODES ---
  // ==================================================================

  redeemAccessCode: async (code, courseId, chapterItemId, categoryId) => {
    const payload = { code };
    if (courseId) payload.courseId = courseId;
    if (chapterItemId) payload.chapterItemId = chapterItemId;
    if (categoryId) payload.categoryId = categoryId;
    return await fetchClient("/codes/redeem", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  previewAccessCode: async (code) => {
    return await fetchClient(`/codes/preview/${encodeURIComponent(code)}`, {
      method: "GET",
    });
  },

  createAccessCode: async (codeData) => {
    return await fetchClient("/codes", {
      method: "POST",
      body: JSON.stringify(codeData),
    });
  },

  createBulkAccessCodes: async (codeData) => {
    return await fetchClient("/codes/bulk", {
      method: "POST",
      body: JSON.stringify(codeData),
    });
  },

  bulkUpdateAccessCodeAudience: async (ids, audience) => {
    return await fetchClient("/codes/bulk/audience", {
      method: "PUT",
      body: JSON.stringify({ ids, audience }),
    });
  },

  getAllAccessCodes: async (filters = {}) => {
    return await fetchClient(`/codes${buildQueryString(filters)}`, {
      method: "GET",
    });
  },

  updateAccessCode: async (id, codeData) => {
    return await fetchClient(`/codes/${id}`, {
      method: "PUT",
      body: JSON.stringify(codeData),
    });
  },

  deleteAccessCode: async (id) => {
    return await fetchClient(`/codes/${id}`, { method: "DELETE" });
  },

  // ==================================================================
  // --- SUPPORT TICKETS ---
  // ==================================================================

  createTicket: async (ticketData, attachment) => {
    if (attachment) {
      const formData = new FormData();
      Object.entries(ticketData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      formData.append("attachment", attachment);
      return await fetchClient("/tickets", { method: "POST", body: formData });
    }
    return await fetchClient("/tickets", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  },

  getMyTickets: async (filters = {}) => {
    return await fetchClient(
      `/tickets/my-tickets${buildQueryString(filters)}`,
      {
        method: "GET",
      },
    );
  },

  getTickets: async (filters = {}) => {
    return await fetchClient(`/tickets${buildQueryString(filters)}`, {
      method: "GET",
    });
  },

  getAllTickets: async (filters = {}) => {
    return await api.getTickets({ channel: "admin", ...filters });
  },

  getTicketById: async (id) => {
    return await fetchClient(`/tickets/${id}`, { method: "GET" });
  },

  addTicketMessage: async (id, messageText, attachment) => {
    if (attachment) {
      const formData = new FormData();
      formData.append("message", messageText || "");
      formData.append("attachment", attachment);
      return await fetchClient(`/tickets/${id}/messages`, {
        method: "POST",
        body: formData,
      });
    }
    return await fetchClient(`/tickets/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ message: messageText }),
    });
  },

  updateTicketStatus: async (id, status) => {
    return await fetchClient(`/tickets/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  updateTicketDetails: async (id, details) => {
    return await fetchClient(`/tickets/${id}/details`, {
      method: "PUT",
      body: JSON.stringify(details),
    });
  },

  assignTicket: async (id, adminId) => {
    return await fetchClient(`/tickets/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ adminId }),
    });
  },

  // ==================================================================
  // --- PARENT / STUDENT HELPERS ---
  // ==================================================================

  getChildrenByParent: async (parentUserId) => {
    return await fetchClient(`/users/${parentUserId}/children`, {
      method: "GET",
    });
  },

  getStudentEnrollments: async (studentUserId) => {
    return await fetchClient(`/users/${studentUserId}/enrollments`, {
      method: "GET",
    });
  },

  getStudentNotes: async (studentUserId) => {
    return await fetchClient(`/users/${studentUserId}/notes`, {
      method: "GET",
    });
  },

  createStudentNote: async (studentUserId, note) => {
    return await fetchClient(`/users/${studentUserId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  updateStudentNote: async (noteId, note) => {
    return await fetchClient(`/users/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify({ note }),
    });
  },

  deleteStudentNote: async (noteId) => {
    return await fetchClient(`/users/notes/${noteId}`, {
      method: "DELETE",
    });
  },

  getParentProgressReport: async (
    studentUserId,
    period = "7d",
    lang = "en",
  ) => {
    const params = new URLSearchParams({ period, lang });
    return await fetchClient(
      `/users/${studentUserId}/parent-progress-report?${params.toString()}`,
      { method: "GET" },
    );
  },

  sendParentProgressWhatsApp: async (
    studentUserId,
    period = "7d",
    lang = "en",
  ) => {
    return await fetchClient(
      `/users/${studentUserId}/send-parent-progress-whatsapp`,
      {
        method: "POST",
        body: JSON.stringify({ period, lang }),
      },
    );
  },

  // ==================================================================
  // --- SUBMISSIONS & GRADING (assignments) ---
  // ==================================================================

  upsertSubmission: async (chapterItemId, submissionText, status, file) => {
    const formData = new FormData();
    formData.append("chapterItemId", chapterItemId);
    formData.append("submissionText", submissionText || "");
    formData.append("status", status);
    if (file) formData.append("submission_file", file);
    return await fetchClient("/submissions", {
      method: "POST",
      body: formData,
    });
  },

  getSubmission: async (submissionId) => {
    return await fetchClient(`/submissions/${submissionId}`, { method: "GET" });
  },

  getSubmissionsForItem: async (chapterItemId, filters = {}) => {
    return await fetchClient(
      `/submissions/item/${chapterItemId}${buildQueryString(filters)}`,
      { method: "GET" },
    );
  },

  gradeSubmission: async (submissionId, score, feedback) => {
    return await fetchClient(`/submissions/${submissionId}/grade`, {
      method: "POST",
      body: JSON.stringify({ score, feedback }),
    });
  },

  deleteSubmission: async (submissionId) => {
    return await fetchClient(`/submissions/${submissionId}`, {
      method: "DELETE",
    });
  },

  getCourseGrades: async (courseId) => {
    return await fetchClient(`/courses/${courseId}/my-grades`, {
      method: "GET",
    });
  },

  getMyGrades: async () => {
    return await fetchClient("/courses/my/grades", { method: "GET" });
  },

  // ==================================================================
  // --- QUIZ (NEW) ---
  // ==================================================================

  // ── Questions ──
  createQuizQuestion: async (quizId, questionData) => {
    return await fetchClient(`/quiz/${quizId}/questions`, {
      method: "POST",
      body:
        questionData instanceof FormData
          ? questionData
          : JSON.stringify(questionData),
    });
  },

  updateQuizQuestion: async (questionId, questionData) => {
    return await fetchClient(`/quiz/questions/${questionId}`, {
      method: "PUT",
      body:
        questionData instanceof FormData
          ? questionData
          : JSON.stringify(questionData),
    });
  },

  deleteQuizQuestion: async (questionId) => {
    return await fetchClient(`/quiz/questions/${questionId}`, {
      method: "DELETE",
    });
  },

  getQuizQuestions: async (quizId) => {
    return await fetchClient(`/quiz/${quizId}/questions`, {
      method: "GET",
    });
  },

  // ── Options (for MCQ) ──
  createQuizOption: async (questionId, optionData) => {
    return await fetchClient(`/quiz/questions/${questionId}/options`, {
      method: "POST",
      body: JSON.stringify(optionData),
    });
  },

  updateQuizOption: async (optionId, optionData) => {
    return await fetchClient(`/quiz/options/${optionId}`, {
      method: "PUT",
      body: JSON.stringify(optionData),
    });
  },

  deleteQuizOption: async (optionId) => {
    return await fetchClient(`/quiz/options/${optionId}`, {
      method: "DELETE",
    });
  },

  // ── Student Answers ──
  submitQuizAnswer: async (quizId, answerData, file) => {
    const formData = new FormData();
    for (const key in answerData) {
      if (answerData[key] !== undefined && answerData[key] !== null) {
        formData.append(key, answerData[key]);
      }
    }
    if (file) formData.append("file", file);
    return await fetchClient(`/quiz/${quizId}/answer`, {
      method: "POST",
      body: formData,
    });
  },

  getQuizAnswers: async (quizId) => {
    return await fetchClient(`/quiz/${quizId}/answers`, {
      method: "GET",
    });
  },

  // Start (or resume) the student's timed attempt for a quiz. First start wins.
  startQuizAttempt: async (quizId) => {
    return await fetchClient(`/quiz/${quizId}/attempt/start`, {
      method: "POST",
    });
  },

  gradeQuizAnswer: async (answerId, score, feedback) => {
    return await fetchClient(`/quiz/answers/${answerId}/grade`, {
      method: "PUT",
      body: JSON.stringify({ score, feedback }),
    });
  },

  // ==================================================================
  // --- INSTRUCTORS CATALOG (public) ---
  // ==================================================================

  getPublicInstructors: async (filters = {}) => {
    return await fetchClient(`/instructors${buildQueryString(filters)}`, {
      method: "GET",
    });
  },

  getPublicInstructorById: async (id) => {
    return await fetchClient(`/instructors/${id}`, { method: "GET" });
  },

  // ==================================================================
  // --- INSTRUCTOR MANAGEMENT (admin only) ---
  // ==================================================================

  getAllInstructors: async (filters = {}) => {
    return await api.getAllUsers({ role: "instructor", ...filters });
  },

  getInstructorById: async (userId) => {
    return await api.getUserById(userId);
  },

  createInstructor: async (instructorData) => {
    return await api.createUser({
      ...instructorData,
      role: "instructor",
    });
  },

  updateInstructor: async (userId, instructorData) => {
    return await api.updateUser(userId, instructorData);
  },

  deleteInstructor: async (userId) => {
    return await api.deleteUser(userId);
  },

  // ==================================================================
  // --- ASSISTANT MANAGEMENT (admin only) ---
  // ==================================================================

  getAllAssistants: async (filters = {}) => {
    return await api.getAllUsers({ role: "assistant", ...filters });
  },

  getAssistantById: async (userId) => {
    return await api.getUserById(userId);
  },

  createAssistant: async (assistantData) => {
    return await api.createUser({
      ...assistantData,
      role: "assistant",
    });
  },

  updateAssistant: async (userId, assistantData) => {
    return await api.updateUser(userId, assistantData);
  },

  deleteAssistant: async (userId) => {
    return await api.deleteUser(userId);
  },

  // ==================================================================
  // --- STUDENT MANAGEMENT (admin only) ---
  // ==================================================================

  getAllStudents: async (filters = {}) => {
    return await api.getAllUsers({ role: "student", ...filters });
  },

  getStudentById: async (userId) => {
    return await api.getUserById(userId);
  },

  createStudent: async (studentData) => {
    return await api.createUser({
      ...studentData,
      role: "student",
    });
  },

  updateStudent: async (userId, studentData) => {
    return await api.updateUser(userId, studentData);
  },

  deleteStudent: async (userId) => {
    return await api.deleteUser(userId);
  },

  // ==================================================================
  // --- PARENT MANAGEMENT (admin only) ---
  // ==================================================================

  getAllParents: async (filters = {}) => {
    return await api.getAllUsers({ role: "parent", ...filters });
  },

  getParentById: async (userId) => {
    return await api.getUserById(userId);
  },

  createParent: async (parentData) => {
    return await api.createUser({
      ...parentData,
      role: "parent",
    });
  },

  updateParent: async (userId, parentData) => {
    return await api.updateUser(userId, parentData);
  },

  deleteParent: async (userId) => {
    return await api.deleteUser(userId);
  },

  getChildrenOfParent: async (userId) => {
    return await fetchClient(`/users/${userId}/children`, { method: "GET" });
  },

  lookupParentByPhone: async (phone) => {
    const params = new URLSearchParams({ phone });
    return await fetchClient(`/users/lookup/parent?${params.toString()}`, {
      method: "GET",
    });
  },

  getGradesByGrader: async (userId) => {
    return await fetchClient(`/submissions/graded-by/${userId}`, {
      method: "GET",
    });
  },

  submitContactForm: async (payload) => {
    return await fetchClient("/contact/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  subscribeNewsletter: async (phone) => {
    return await fetchClient("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  getAiStatus: async () => {
    return await fetchClient("/ai/status", { method: "GET" });
  },

  getAiSettings: async () => {
    return await fetchClient("/ai/settings", { method: "GET" });
  },

  updateAiSettings: async (payload) => {
    return await fetchClient("/ai/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  sendAiMessage: async ({ message, history = [], sessionId }) => {
    return await fetchClient("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history, sessionId }),
    });
  },

  getAiConversations: async ({ page = 1, limit = 20, role } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (role) params.set("role", role);
    return await fetchClient(`/ai/conversations?${params.toString()}`, {
      method: "GET",
    });
  },

  getAiConversation: async (conversationId) => {
    return await fetchClient(`/ai/conversations/${conversationId}`, {
      method: "GET",
    });
  },

  getAiKnowledge: async ({ page = 1, limit = 50, search = "" } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set("search", search);
    return await fetchClient(`/ai/knowledge?${params.toString()}`, {
      method: "GET",
    });
  },

  createAiKnowledge: async (payload) => {
    return await fetchClient("/ai/knowledge", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAiKnowledge: async (id, payload) => {
    return await fetchClient(`/ai/knowledge/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteAiKnowledge: async (id) => {
    return await fetchClient(`/ai/knowledge/${id}`, {
      method: "DELETE",
    });
  },

  // ==================================================================
  // --- REGISTRATION OTPS (admin only) ---
  // ==================================================================

  getRegistrationOtps: async () => {
    return await fetchClient("/auth/admin/registration-otps", {
      method: "GET",
    });
  },

  deleteRegistrationOtp: async (id) => {
    return await fetchClient(`/auth/admin/registration-otps/${id}`, {
      method: "DELETE",
    });
  },

  // ==================================================================
  // --- WHATSAPP SESSION (admin only) ---
  // ==================================================================

  getWhatsAppStatus: async () => {
    return await fetchClient("/whatsapp/status", { method: "GET" });
  },

  getWhatsAppQrCode: async () => {
    return await fetchClient("/whatsapp/qr", { method: "GET" });
  },

  startWhatsAppSession: async () => {
    return await fetchClient("/whatsapp/start", { method: "POST" });
  },

  stopWhatsAppSession: async () => {
    return await fetchClient("/whatsapp/stop", { method: "POST" });
  },

  logoutWhatsAppSession: async () => {
    return await fetchClient("/whatsapp/logout", { method: "POST" });
  },

  forceKillWhatsAppSession: async () => {
    return await fetchClient("/whatsapp/force-kill", { method: "POST" });
  },

  requestWhatsAppPairingCode: async (phoneNumber) => {
    return await fetchClient("/whatsapp/pairing-code", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },
};

export default api;
