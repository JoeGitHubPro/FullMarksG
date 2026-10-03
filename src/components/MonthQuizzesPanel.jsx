import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { api, getFileUrl } from "../api";
import {
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
  HiOutlineUpload,
  HiOutlineX,
} from "react-icons/hi";

// Staff-facing "Month Quiz" management panel — rendered by its own dashboard
// section (pages/MonthQuizzesDashboard.jsx). Month Quizzes are standalone
// (not tied to any course): list quizzes, create/edit/delete one, manage its
// questions/options, and grade student answers. Every admin, instructor and
// assistant can manage and grade every quiz.
const emptyQuizForm = {
  title: "",
  description: "",
  availableFrom: "",
  dueDate: "",
  timeLimitMinutes: "",
  attemptWindowMinutes: "",
  maxScore: 100,
  isPublished: false,
};

const emptyQuestionForm = {
  questionText: "",
  questionType: "mcq",
  maxScore: 10,
  isRequired: true,
};

const MonthQuizzesPanel = ({ currentUserRole }) => {
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null); // quiz object being edited, or null
  const [quizForm, setQuizForm] = useState(emptyQuizForm);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Manage view: questions + grading for one quiz
  const [managingQuiz, setManagingQuiz] = useState(null);
  const [manageTab, setManageTab] = useState("questions"); // 'questions' | 'grading'
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [questionImage, setQuestionImage] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [optionDrafts, setOptionDrafts] = useState({}); // questionId -> { text, isCorrect }

  const [answers, setAnswers] = useState([]);
  const [attempts, setAttempts] = useState([]); // students who started, incl. those with no saved answers
  const [answersLoading, setAnswersLoading] = useState(false);
  const [gradingAnswerId, setGradingAnswerId] = useState(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const canManage = ["admin", "instructor", "assistant"].includes(
    currentUserRole,
  );

  useEffect(() => {
    fetchQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getCourseQuizzes();
      if (res.success) {
        setQuizzes(res.data || []);
      } else {
        setError(res.message || t("dashboard.common.loadFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── Create / Edit quiz ──
  const openCreateForm = () => {
    setEditingQuiz(null);
    setQuizForm(emptyQuizForm);
    setShowCreate(true);
  };

  const openEditForm = (quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title || "",
      description: quiz.description || "",
      availableFrom: quiz.available_from
        ? String(quiz.available_from).replace(" ", "T").slice(0, 16)
        : "",
      dueDate: quiz.due_date
        ? String(quiz.due_date).replace(" ", "T").slice(0, 16)
        : "",
      timeLimitMinutes: quiz.time_limit_minutes || "",
      attemptWindowMinutes: quiz.attempt_window_minutes || "",
      maxScore: quiz.max_score || 100,
      isPublished: !!quiz.is_published,
    });
    setShowCreate(true);
  };

  const closeQuizForm = () => {
    setShowCreate(false);
    setEditingQuiz(null);
    setQuizForm(emptyQuizForm);
  };

  const handleSaveQuiz = async () => {
    if (!quizForm.title.trim()) {
      setError(t("dashboard.monthQuizzes.titleRequired"));
      return;
    }
    setSavingQuiz(true);
    setError("");
    try {
      const payload = {
        title: quizForm.title.trim(),
        description: quizForm.description || null,
        availableFrom: quizForm.availableFrom || null,
        dueDate: quizForm.dueDate || null,
        timeLimitMinutes: quizForm.timeLimitMinutes || null,
        attemptWindowMinutes: quizForm.attemptWindowMinutes || null,
        maxScore: quizForm.maxScore || 100,
        isPublished: quizForm.isPublished,
      };
      const res = editingQuiz
        ? await api.updateCourseQuiz(editingQuiz.id, payload)
        : await api.createCourseQuiz(payload);

      if (res.success) {
        closeQuizForm();
        await fetchQuizzes();
      } else {
        setError(res.message || t("dashboard.common.updateFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.updateFailed"));
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quiz) => {
    if (!window.confirm(t("dashboard.monthQuizzes.confirmDelete"))) return;
    try {
      const res = await api.deleteCourseQuiz(quiz.id);
      if (res.success) {
        await fetchQuizzes();
      } else {
        setError(res.message || t("dashboard.common.deletionFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.deletionFailed"));
    }
  };

  // ── Manage one quiz: questions + grading ──
  const openManageQuiz = async (quiz) => {
    setManagingQuiz(quiz);
    setManageTab("questions");
    await fetchQuestions(quiz.id);
  };

  const closeManageQuiz = () => {
    setManagingQuiz(null);
    setQuestions([]);
    setAnswers([]);
    setAttempts([]);
    setShowAddQuestion(false);
    setQuestionForm(emptyQuestionForm);
    setQuestionImage(null);
  };

  const fetchQuestions = async (courseQuizId) => {
    setQuestionsLoading(true);
    try {
      const res = await api.getCourseQuizQuestions(courseQuizId);
      if (res.success) setQuestions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const fetchAnswers = async (courseQuizId) => {
    setAnswersLoading(true);
    try {
      const res = await api.getCourseQuizAnswers(courseQuizId);
      if (res.success) {
        setAnswers(res.data || []);
        setAttempts(res.attempts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnswersLoading(false);
    }
  };

  const switchManageTab = async (tab) => {
    setManageTab(tab);
    if (tab === "grading" && managingQuiz) {
      await fetchAnswers(managingQuiz.id);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionForm.questionText.trim() && !questionImage) {
      setError(t("dashboard.monthQuizzes.questionTextRequired"));
      return;
    }
    setSavingQuestion(true);
    setError("");
    try {
      let body;
      if (questionImage) {
        body = new FormData();
        body.append("questionText", questionForm.questionText);
        body.append("questionType", questionForm.questionType);
        body.append("maxScore", questionForm.maxScore);
        body.append("isRequired", questionForm.isRequired);
        body.append("questionImage", questionImage);
      } else {
        body = { ...questionForm };
      }
      const res = await api.createCourseQuizQuestion(managingQuiz.id, body);
      if (res.success) {
        setShowAddQuestion(false);
        setQuestionForm(emptyQuestionForm);
        setQuestionImage(null);
        await fetchQuestions(managingQuiz.id);
      } else {
        setError(res.message || t("dashboard.common.updateFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.updateFailed"));
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm(t("dashboard.monthQuizzes.confirmDeleteQuestion")))
      return;
    try {
      const res = await api.deleteCourseQuizQuestion(questionId);
      if (res.success) await fetchQuestions(managingQuiz.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddOption = async (questionId) => {
    const draft = optionDrafts[questionId];
    if (!draft?.text?.trim()) return;
    try {
      const res = await api.createCourseQuizOption(questionId, {
        optionText: draft.text.trim(),
        isCorrect: !!draft.isCorrect,
      });
      if (res.success) {
        setOptionDrafts((prev) => ({
          ...prev,
          [questionId]: { text: "", isCorrect: false },
        }));
        await fetchQuestions(managingQuiz.id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteOption = async (optionId) => {
    try {
      const res = await api.deleteCourseQuizOption(optionId);
      if (res.success) await fetchQuestions(managingQuiz.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleCorrect = async (option) => {
    try {
      await api.updateCourseQuizOption(option.id, {
        isCorrect: !option.is_correct,
      });
      await fetchQuestions(managingQuiz.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGradeAnswer = async (answer) => {
    if (gradeScore === "") return;
    try {
      const res = await api.gradeCourseQuizAnswer(
        answer.id,
        parseFloat(gradeScore),
        gradeFeedback,
      );
      if (res.success) {
        setGradingAnswerId(null);
        setGradeScore("");
        setGradeFeedback("");
        await fetchAnswers(managingQuiz.id);
      } else {
        setError(res.message || t("dashboard.common.gradingFailed"));
      }
    } catch (err) {
      setError(err.message || t("dashboard.common.gradingFailed"));
    }
  };

  const handleResetAttempt = async (studentId) => {
    if (!window.confirm(t("dashboard.monthQuizzes.confirmAllowRepeat")))
      return;
    try {
      await api.resetCourseQuizAttempt(managingQuiz.id, studentId);
      await fetchAnswers(managingQuiz.id);
    } catch (err) {
      setError(err.message);
    }
  };

  // ==================== GRADING / QUESTIONS MANAGE VIEW ====================
  if (managingQuiz) {
    // Group answers by student for the grading tab.
    const answersByStudent = {};
    answers.forEach((ans) => {
      const key = ans.student_id;
      if (!answersByStudent[key]) {
        answersByStudent[key] = {
          student: {
            id: ans.student_id,
            name: `${ans.first_name || ""} ${ans.last_name || ""}`.trim(),
            email: ans.email,
          },
          answers: [],
        };
      }
      answersByStudent[key].answers.push(ans);
    });
    // Students who started the quiz but have no saved answers (e.g. their
    // auto-submit was rejected after time ran out) — list them too so staff
    // can still "Allow repeat" for them.
    attempts.forEach((att) => {
      const key = att.student_id;
      if (!answersByStudent[key]) {
        answersByStudent[key] = {
          student: {
            id: att.student_id,
            name: `${att.first_name || ""} ${att.last_name || ""}`.trim(),
            email: att.email,
          },
          answers: [],
        };
      }
    });

    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
        <button
          onClick={closeManageQuiz}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-purple transition-colors uppercase tracking-wider"
        >
          <HiOutlineArrowLeft className="flip-rtl" />
          <span>{t("dashboard.common.back")}</span>
        </button>

        <div className="border-b border-gray-50 pb-3 text-start">
          <h3 className="font-heading font-bold text-lg text-[#2e0854]">
            {managingQuiz.title}
          </h3>
        </div>

        <div className="flex gap-2 border-b border-gray-100">
          <button
            onClick={() => switchManageTab("questions")}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wide ${
              manageTab === "questions"
                ? "text-brand-purple border-b-2 border-brand-purple"
                : "text-gray-400"
            }`}
          >
            {t("dashboard.monthQuizzes.questionsTab")}
          </button>
          <button
            onClick={() => switchManageTab("grading")}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wide ${
              manageTab === "grading"
                ? "text-brand-purple border-b-2 border-brand-purple"
                : "text-gray-400"
            }`}
          >
            {t("dashboard.monthQuizzes.gradingTab")}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {manageTab === "questions" ? (
          <div className="space-y-3">
            {questionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="border border-gray-100 rounded-xl p-4 space-y-2 text-start"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#2e0854] text-sm">
                        {idx + 1}. {q.question_text}
                      </p>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-gray-300 hover:text-red-500 shrink-0"
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                    {q.question_image_path && (
                      <img
                        src={getFileUrl(q.question_image_path)}
                        alt=""
                        className="max-h-40 rounded-lg border border-gray-100"
                      />
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {q.question_type}
                      </span>
                      <span>
                        {t("dashboard.common.score")}: {q.max_score}
                      </span>
                      {!q.is_required && (
                        <span>{t("dashboard.monthQuizzes.optional")}</span>
                      )}
                    </div>

                    {q.question_type === "mcq" && (
                      <div className="space-y-1.5 pt-2">
                        {(q.options || []).map((opt) => (
                          <div
                            key={opt.id}
                            className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-1.5"
                          >
                            <button
                              onClick={() => handleToggleCorrect(opt)}
                              className={`flex items-center gap-2 text-xs ${
                                opt.is_correct
                                  ? "text-green-600 font-semibold"
                                  : "text-gray-600"
                              }`}
                            >
                              <HiOutlineCheckCircle
                                className={
                                  opt.is_correct
                                    ? "text-green-500"
                                    : "text-gray-300"
                                }
                              />
                              {opt.option_text}
                            </button>
                            <button
                              onClick={() => handleDeleteOption(opt.id)}
                              className="text-gray-300 hover:text-red-500"
                            >
                              <HiOutlineX className="text-xs" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={optionDrafts[q.id]?.text || ""}
                            onChange={(e) =>
                              setOptionDrafts((prev) => ({
                                ...prev,
                                [q.id]: {
                                  ...(prev[q.id] || {}),
                                  text: e.target.value,
                                },
                              }))
                            }
                            placeholder={t(
                              "dashboard.monthQuizzes.addOptionPlaceholder",
                            )}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs"
                          />
                          <label className="flex items-center gap-1 text-[10px] text-gray-500">
                            <input
                              type="checkbox"
                              checked={!!optionDrafts[q.id]?.isCorrect}
                              onChange={(e) =>
                                setOptionDrafts((prev) => ({
                                  ...prev,
                                  [q.id]: {
                                    ...(prev[q.id] || {}),
                                    isCorrect: e.target.checked,
                                  },
                                }))
                              }
                            />
                            {t("dashboard.monthQuizzes.correct")}
                          </label>
                          <button
                            onClick={() => handleAddOption(q.id)}
                            className="text-xs font-semibold text-brand-purple hover:text-brand"
                          >
                            {t("dashboard.common.add")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {showAddQuestion ? (
                  <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                    <textarea
                      rows="2"
                      value={questionForm.questionText}
                      onChange={(e) =>
                        setQuestionForm((prev) => ({
                          ...prev,
                          questionText: e.target.value,
                        }))
                      }
                      placeholder={t(
                        "dashboard.monthQuizzes.questionTextPlaceholder",
                      )}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={questionForm.questionType}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({
                            ...prev,
                            questionType: e.target.value,
                          }))
                        }
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                      >
                        <option value="mcq">
                          {t("dashboard.monthQuizzes.typeMcq")}
                        </option>
                        <option value="text">
                          {t("dashboard.monthQuizzes.typeText")}
                        </option>
                        <option value="upload">
                          {t("dashboard.monthQuizzes.typeUpload")}
                        </option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={questionForm.maxScore}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({
                            ...prev,
                            maxScore: e.target.value,
                          }))
                        }
                        placeholder={t("dashboard.common.score")}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={questionForm.isRequired}
                          onChange={(e) =>
                            setQuestionForm((prev) => ({
                              ...prev,
                              isRequired: e.target.checked,
                            }))
                          }
                        />
                        {t("dashboard.monthQuizzes.required")}
                      </label>
                      <label className="flex items-center gap-1 text-xs text-brand-purple cursor-pointer">
                        <HiOutlineUpload />
                        {questionImage
                          ? questionImage.name
                          : t("dashboard.monthQuizzes.questionImage")}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            setQuestionImage(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowAddQuestion(false);
                          setQuestionForm(emptyQuestionForm);
                          setQuestionImage(null);
                        }}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        {t("dashboard.common.cancel")}
                      </button>
                      <button
                        onClick={handleAddQuestion}
                        disabled={savingQuestion}
                        className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark disabled:opacity-50"
                      >
                        {savingQuestion
                          ? t("dashboard.common.saving")
                          : t("dashboard.common.save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddQuestion(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-purple hover:text-brand"
                  >
                    <HiOutlinePlus /> {t("dashboard.monthQuizzes.addQuestion")}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {answersLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : Object.keys(answersByStudent).length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                {t("dashboard.common.noSubmissions")}
              </div>
            ) : (
              Object.values(answersByStudent).map(({ student, answers: studentAnswers }) => (
                <div
                  key={student.id}
                  className="border border-gray-100 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#2e0854] text-sm text-start">
                      {student.name || student.email}
                    </p>
                    <button
                      onClick={() => handleResetAttempt(student.id)}
                      className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-brand-purple uppercase tracking-wide"
                    >
                      <HiOutlineRefresh />
                      {t("dashboard.monthQuizzes.allowRepeat")}
                    </button>
                  </div>
                  {studentAnswers.length === 0 && (
                    <p className="text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-start">
                      {t("dashboard.monthQuizzes.startedNoAnswers")}
                    </p>
                  )}
                  {studentAnswers.map((ans) => (
                    <div
                      key={ans.id}
                      className="bg-gray-50 rounded-lg p-3 space-y-2 text-start"
                    >
                      <p className="text-xs font-semibold text-gray-600">
                        {ans.question_text}
                      </p>
                      {ans.question_type === "mcq" ? (
                        <p className="text-xs text-gray-500">
                          {ans.selected_option_text}
                        </p>
                      ) : ans.question_type === "text" ? (
                        <p className="text-xs text-gray-500 whitespace-pre-wrap">
                          {ans.answer_text}
                        </p>
                      ) : (
                        ans.file_path && (
                          <a
                            href={getFileUrl(ans.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-purple hover:text-brand inline-flex items-center gap-1"
                          >
                            <HiOutlineDocumentText />
                            {t("dashboard.assignments.downloadAttachment")}
                          </a>
                        )
                      )}
                      <div className="flex items-center justify-between pt-1">
                        {ans.score !== null ? (
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            {t("dashboard.common.score")}: {ans.score}/
                            {ans.max_score}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            {t("dashboard.monthQuizzes.pendingGrade")}
                          </span>
                        )}
                        {ans.question_type !== "mcq" &&
                          (gradingAnswerId === ans.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                value={gradeScore}
                                onChange={(e) => setGradeScore(e.target.value)}
                                placeholder={`/${ans.max_score}`}
                                className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs"
                              />
                              <input
                                type="text"
                                value={gradeFeedback}
                                onChange={(e) =>
                                  setGradeFeedback(e.target.value)
                                }
                                placeholder={t("dashboard.common.feedback")}
                                className="w-28 border border-gray-200 rounded px-1.5 py-1 text-xs"
                              />
                              <button
                                onClick={() => handleGradeAnswer(ans)}
                                className="text-xs font-semibold text-brand-purple"
                              >
                                {t("dashboard.common.save")}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGradingAnswerId(ans.id);
                                setGradeScore(ans.score ?? "");
                                setGradeFeedback(ans.feedback || "");
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              {t("dashboard.common.grade")}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ==================== QUIZ LIST VIEW ====================
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-lg text-[#2e0854]">
          {t("dashboard.monthQuizzes.title")}
        </h3>
        {canManage && (
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 text-xs font-semibold bg-violet-50 text-brand-purple px-3 py-1.5 rounded-lg hover:bg-violet-100"
          >
            <HiOutlinePlus /> {t("dashboard.monthQuizzes.newQuiz")}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {showCreate && (
        <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={quizForm.title}
            onChange={(e) =>
              setQuizForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder={t("dashboard.monthQuizzes.titlePlaceholder")}
            className="w-full border border-gray-200 rounded-lg p-2 text-sm"
          />
          <textarea
            rows="2"
            value={quizForm.description}
            onChange={(e) =>
              setQuizForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder={t("dashboard.monthQuizzes.descriptionPlaceholder")}
            className="w-full border border-gray-200 rounded-lg p-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                {t("dashboard.monthQuizzes.availableFrom")}
              </label>
              <input
                type="datetime-local"
                value={quizForm.availableFrom}
                onChange={(e) =>
                  setQuizForm((prev) => ({
                    ...prev,
                    availableFrom: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                {t("dashboard.monthQuizzes.dueDate")}
              </label>
              <input
                type="datetime-local"
                value={quizForm.dueDate}
                onChange={(e) =>
                  setQuizForm((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                {t("dashboard.monthQuizzes.timeLimit")}
              </label>
              <input
                type="number"
                value={quizForm.timeLimitMinutes}
                onChange={(e) =>
                  setQuizForm((prev) => ({
                    ...prev,
                    timeLimitMinutes: e.target.value,
                  }))
                }
                placeholder={t("dashboard.monthQuizzes.minutesPlaceholder")}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                {t("dashboard.common.score")}
              </label>
              <input
                type="number"
                step="0.01"
                value={quizForm.maxScore}
                onChange={(e) =>
                  setQuizForm((prev) => ({
                    ...prev,
                    maxScore: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={quizForm.isPublished}
              onChange={(e) =>
                setQuizForm((prev) => ({
                  ...prev,
                  isPublished: e.target.checked,
                }))
              }
            />
            {t("dashboard.monthQuizzes.publishNow")}
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeQuizForm}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {t("dashboard.common.cancel")}
            </button>
            <button
              onClick={handleSaveQuiz}
              disabled={savingQuiz}
              className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark disabled:opacity-50"
            >
              {savingQuiz
                ? t("dashboard.common.saving")
                : t("dashboard.common.save")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-xs">
          {t("dashboard.monthQuizzes.noQuizzes")}
        </div>
      ) : (
        <div className="space-y-2.5">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 hover:bg-gray-50/50 transition"
            >
              <button
                onClick={() => openManageQuiz(quiz)}
                className="flex-1 text-start min-w-0"
              >
                <p className="font-semibold text-sm text-[#2e0854] truncate">
                  {quiz.title}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                  {quiz.due_date && (
                    <span className="flex items-center gap-1">
                      <HiOutlineCalendar />
                      {new Date(quiz.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {quiz.time_limit_minutes && (
                    <span className="flex items-center gap-1">
                      <HiOutlineClock /> {quiz.time_limit_minutes}m
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      quiz.is_published
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {quiz.is_published
                      ? t("dashboard.monthQuizzes.published")
                      : t("dashboard.monthQuizzes.draft")}
                  </span>
                </div>
              </button>
              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditForm(quiz)}
                    className="text-gray-300 hover:text-brand-purple"
                  >
                    <HiOutlinePencil />
                  </button>
                  <button
                    onClick={() => handleDeleteQuiz(quiz)}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthQuizzesPanel;
