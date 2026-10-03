import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, getFileUrl } from "../api";
import { useAuth } from "../context/AuthContext";
import { useConfirm, useToast } from "../context/FeedbackContext";
import { useTranslation } from "../i18n/LanguageContext";
import {
  isBeforeAvailableFrom,
  isPastDueDate,
  toLocalAttempt,
} from "../utils/assessmentDue";
import {
  HiOutlineArrowLeft,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineUpload,
} from "react-icons/hi";

// Student "take a Month Quiz" page — the standalone counterpart of the
// lesson-quiz branch inside CourseItemPreviewPage.jsx. Same countdown /
// auto-submit / answer-reveal behavior. Reached from /quizzes/:quizId (and
// the legacy /courses/:slug/month-quiz/:quizId link, which still works).
const MonthQuizTakePage = () => {
  const { slug, quizId } = useParams();
  // Month Quizzes are standalone now: go back to the quizzes list, unless
  // the student arrived through an old course link.
  const backTo = slug ? `/courses/${slug}` : "/quizzes";
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [answers, setAnswers] = useState({}); // questionId -> { answerText, selectedOptionId, file }
  const [existingAnswers, setExistingAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // True when a submit (manual or timeout auto-submit) ended with NO answers
  // stored on the server — the student must ask staff to "Allow repeat".
  const [saveFailed, setSaveFailed] = useState(false);
  const [starting, setStarting] = useState(false);

  const [attempt, setAttempt] = useState(null); // { windowMinutes, startedAt, deadline }
  const [nowTick, setNowTick] = useState(Date.now());
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const fetchQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getCourseQuizQuestions(quizId);
      if (res.success) {
        setQuestions(res.data || []);
        setQuiz(res.quiz || null);
        setSchedule(res.schedule || null);
        if (res.attempt) setAttempt(toLocalAttempt(res.attempt));

        const answersRes = await api.getCourseQuizAnswers(quizId);
        if (answersRes.success && answersRes.data.length > 0) {
          setExistingAnswers(answersRes.data);
          const map = {};
          answersRes.data.forEach((ans) => {
            map[ans.question_id] = {
              answerText: ans.answer_text || "",
              selectedOptionId: ans.selected_option_id || "",
              file: ans.file_path || null,
            };
          });
          setAnswers(map);
          const questionCount = res.data.length;
          if (answersRes.data.length >= questionCount && questionCount > 0) {
            setSubmitted(true);
          }
        }
      } else {
        setError(res.message || t("dashboard.common.loadFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── Timed countdown ──
  const windowMinutes = attempt?.windowMinutes || null;
  const started = !!attempt?.startedAt;
  const deadlineMs = attempt?.deadline ? Number(attempt.deadline) : null;
  const timeRemainingMs = started && deadlineMs ? deadlineMs - nowTick : null;
  const timeUp = timeRemainingMs !== null && timeRemainingMs <= 0;
  const needsStart =
    !!windowMinutes && !started && !submitted && schedule?.status === "open";

  useEffect(() => {
    if (!started || !deadlineMs || timeUp) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [started, deadlineMs, timeUp]);

  useEffect(() => {
    if (!started || !deadlineMs) return undefined;
    const resync = () => setNowTick(Date.now());
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, [started, deadlineMs]);

  useEffect(() => {
    if (started && !submitted) autoSubmittedRef.current = false;
  }, [attempt?.startedAt]);

  const formActive =
    user?.role === "student" &&
    questions.length > 0 &&
    !submitted &&
    schedule?.status !== "not_started" &&
    !needsStart;

  useEffect(() => {
    if (!formActive) return undefined;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formActive]);

  const fmtCountdown = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await api.startCourseQuizAttempt(quizId);
      if (res.success && res.data) {
        setAttempt(toLocalAttempt(res.data));
        setNowTick(Date.now());
      } else {
        toast.error(res.message || t("dashboard.monthQuizzes.startFailed"));
      }
    } catch (err) {
      toast.error(err?.message || t("dashboard.monthQuizzes.startFailed"));
    } finally {
      setStarting(false);
    }
  };

  const isBlankAnswer = (q, ans) => {
    if (q.question_type === "mcq") return !ans.selectedOptionId;
    if (q.question_type === "text") return !ans.answerText?.trim();
    if (q.question_type === "upload") return !ans.file;
    return true;
  };

  // Sends every answer, then re-reads what the server actually stored.
  // Only marks the quiz as submitted when at least one answer was saved —
  // previously failures were swallowed and the student saw "submitted"
  // even when the server had rejected everything (e.g. late auto-submit).
  const submitAllAnswers = async () => {
    let failed = 0;
    for (const q of questions) {
      const ans = answers[q.id] || {};
      // The server rejects blank answers, so don't send them.
      if (isBlankAnswer(q, ans)) continue;
      // Already-uploaded file (string path) is stored — nothing to re-send.
      if (q.question_type === "upload" && typeof ans.file === "string") continue;
      // Graded answers (auto-graded MCQ) can't be changed — already stored.
      const prev = existingAnswers.find((a) => a.question_id === q.id);
      if (prev && prev.score !== null && prev.score !== undefined) continue;

      const payload = {
        questionId: q.id,
        answerText: ans.answerText || "",
        selectedOptionId: ans.selectedOptionId || undefined,
      };
      try {
        await api.submitCourseQuizAnswer(quizId, payload, ans.file || undefined);
      } catch (err) {
        failed += 1;
        console.error("Failed to submit Month Quiz answer", q.id, err);
      }
    }

    let saved = [];
    try {
      const answersRes = await api.getCourseQuizAnswers(quizId);
      if (answersRes.success) saved = answersRes.data || [];
    } catch (err) {
      console.error("Failed to reload Month Quiz answers", err);
    }
    setExistingAnswers(saved);

    if (saved.length === 0) {
      setSaveFailed(true);
      return { savedCount: 0, failed };
    }

    try {
      const refreshed = await api.getCourseQuizQuestions(quizId);
      if (refreshed.success) setQuestions(refreshed.data || []);
    } catch (err) {
      console.error("Failed to refresh Month Quiz questions", err);
    }
    setSaveFailed(false);
    setSubmitted(true);
    return { savedCount: saved.length, failed };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitted) return;
    if (isBeforeAvailableFrom(schedule?.availableFrom)) {
      toast.error(t("dashboard.monthQuizzes.notStartedYet"));
      return;
    }
    if (isPastDueDate(schedule?.dueDate)) {
      toast.error(t("dashboard.monthQuizzes.pastDue"));
      return;
    }
    if (windowMinutes && !started) {
      toast.error(t("dashboard.monthQuizzes.startFirst"));
      return;
    }
    if (timeUp) {
      toast.info(t("dashboard.monthQuizzes.timeUpAutoSubmit"));
      return;
    }
    setSubmitting(true);
    try {
      const requiredUnanswered = questions.filter(
        (q) =>
          q.is_required &&
          (!answers[q.id] ||
            (q.question_type === "mcq" && !answers[q.id]?.selectedOptionId) ||
            (q.question_type === "text" && !answers[q.id]?.answerText?.trim()) ||
            (q.question_type === "upload" && !answers[q.id]?.file)),
      );
      if (requiredUnanswered.length > 0) {
        const proceed = await confirm({
          title: t("dashboard.monthQuizzes.unansweredTitle"),
          message: t("dashboard.monthQuizzes.unansweredMessage"),
          confirmLabel: t("dashboard.monthQuizzes.submitAnyway"),
          cancelLabel: t("dashboard.monthQuizzes.goBack"),
          tone: "danger",
        });
        if (!proceed) {
          setSubmitting(false);
          return;
        }
      }
      const result = await submitAllAnswers();
      if (result.savedCount === 0) {
        toast.error(t("dashboard.monthQuizzes.noAnswersSaved"));
      } else if (result.failed > 0) {
        toast.error(t("dashboard.monthQuizzes.partialSaveFailed"));
      } else {
        toast.success(t("dashboard.monthQuizzes.submittedSuccess"));
      }
    } catch (err) {
      toast.error(err.message || t("dashboard.monthQuizzes.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!timeUp || submitted || autoSubmittedRef.current) return;
    if (!started || questions.length === 0) return;
    autoSubmittedRef.current = true;
    setSubmitting(true);
    submitAllAnswers()
      .then((result) => {
        if (result.savedCount === 0) {
          toast.error(t("dashboard.monthQuizzes.noAnswersSaved"));
        } else if (result.failed > 0) {
          toast.error(t("dashboard.monthQuizzes.partialSaveFailed"));
        }
      })
      .catch((err) => console.error("Auto-submit on timeout failed", err))
      .finally(() => setSubmitting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, submitted, started, questions]);

  const setAnswer = (questionId, patch) => {
    if (submitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), ...patch },
    }));
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <p className="text-brand-purple font-semibold">{error}</p>
        <Link
          to={backTo}
          className="text-xs font-bold text-gray-400 hover:text-brand-purple"
        >
          {t("dashboard.common.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn text-[#2e0854] py-6 px-4">
      <Link
        to={backTo}
        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider w-fit"
      >
        <HiOutlineArrowLeft className="flip-rtl" />
        <span>{t("dashboard.common.back")}</span>
      </Link>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(43,2,7,0.02)] space-y-6">
        <div className="border-b border-gray-50 pb-4 text-start flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black font-heading tracking-tight">
              {quiz?.title}
            </h1>
            {quiz?.description && (
              <p className="text-gray-400 text-sm font-light mt-1">
                {quiz.description}
              </p>
            )}
          </div>
          {started && deadlineMs && !submitted && (
            <div
              className={`flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1.5 rounded-lg shrink-0 ${
                timeRemainingMs < 60000
                  ? "bg-red-50 text-red-600"
                  : "bg-violet-50 text-brand-purple"
              }`}
            >
              <HiOutlineClock />
              {fmtCountdown(Math.max(0, timeRemainingMs))}
            </div>
          )}
        </div>

        {saveFailed && !submitted && (
          <div className="text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-start">
            {t("dashboard.monthQuizzes.noAnswersSaved")}
          </div>
        )}

        {schedule?.status === "not_started" ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {t("dashboard.monthQuizzes.notStartedYet")}
          </div>
        ) : submitted ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <HiOutlineCheckCircle />
              {t("dashboard.monthQuizzes.submittedSuccess")}
            </div>
            {questions.map((q, idx) => {
              const ans = existingAnswers.find((a) => a.question_id === q.id);
              return (
                <div
                  key={q.id}
                  className="border border-gray-100 rounded-xl p-4 space-y-2 text-start"
                >
                  <p className="font-semibold text-sm">
                    {idx + 1}. {q.question_text}
                  </p>
                  {q.question_type === "mcq" ? (
                    <div className="space-y-1">
                      {(q.options || []).map((opt) => (
                        <div
                          key={opt.id}
                          className={`text-xs px-3 py-1.5 rounded-lg ${
                            opt.id === ans?.selected_option_id
                              ? opt.is_correct
                                ? "bg-green-50 text-green-700 font-semibold"
                                : "bg-red-50 text-red-600 font-semibold"
                              : opt.is_correct
                                ? "bg-green-50/50 text-green-600"
                                : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {opt.option_text}
                        </div>
                      ))}
                    </div>
                  ) : q.question_type === "text" ? (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">
                      {ans?.answer_text}
                    </p>
                  ) : (
                    ans?.file_path && (
                      <a
                        href={getFileUrl(ans.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-purple hover:text-brand"
                      >
                        {t("dashboard.assignments.downloadAttachment")}
                      </a>
                    )
                  )}
                  {ans?.score !== null && ans?.score !== undefined && (
                    <p className="text-xs font-bold text-brand-purple">
                      {t("dashboard.common.score")}: {ans.score}/{q.max_score}
                    </p>
                  )}
                  {ans?.feedback && (
                    <p className="text-xs text-gray-500 italic">
                      {ans.feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : needsStart ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-sm text-gray-500">
              {t("dashboard.monthQuizzes.timeLimitNotice", {
                minutes: windowMinutes,
              })}
            </p>
            <button
              onClick={handleStart}
              disabled={starting}
              className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
            >
              {starting
                ? t("dashboard.monthQuizzes.starting")
                : t("dashboard.monthQuizzes.startQuiz")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="border border-gray-100 rounded-xl p-4 space-y-3 text-start"
              >
                <p className="font-semibold text-sm">
                  {idx + 1}. {q.question_text}
                  {q.is_required && (
                    <span className="text-red-500 ms-1">*</span>
                  )}
                </p>
                {q.question_image_path && (
                  <img
                    src={getFileUrl(q.question_image_path)}
                    alt=""
                    className="max-h-48 rounded-lg border border-gray-100"
                  />
                )}
                {q.question_type === "mcq" && (
                  <div className="space-y-1.5">
                    {(q.options || []).map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id]?.selectedOptionId === opt.id}
                          onChange={() =>
                            setAnswer(q.id, { selectedOptionId: opt.id })
                          }
                        />
                        {opt.option_text}
                      </label>
                    ))}
                  </div>
                )}
                {q.question_type === "text" && (
                  <textarea
                    rows="3"
                    value={answers[q.id]?.answerText || ""}
                    onChange={(e) =>
                      setAnswer(q.id, { answerText: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                  />
                )}
                {q.question_type === "upload" && (
                  <label className="flex items-center gap-2 text-xs text-brand-purple cursor-pointer w-fit">
                    <HiOutlineUpload />
                    {answers[q.id]?.file?.name ||
                      t("dashboard.monthQuizzes.chooseFile")}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        setAnswer(q.id, { file: e.target.files?.[0] || null })
                      }
                    />
                  </label>
                )}
              </div>
            ))}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
              >
                {submitting
                  ? t("dashboard.common.saving")
                  : t("dashboard.monthQuizzes.submitQuiz")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MonthQuizTakePage;
