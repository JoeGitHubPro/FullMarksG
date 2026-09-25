import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { normalizePhone, isPhoneNumber } from "../utils/phone";
import { useTranslation } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import BrandLogo from "../components/BrandLogo";
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiEye,
  HiEyeOff,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlinePlus,
} from "react-icons/hi";
import { STUDENT_TYPES } from "../utils/studentType";
import { EGYPT_GOVERNORATES, DEFAULT_GOVERNORATE } from "../utils/governorates";

const DEFAULT_ACADEMIC_LEVEL_ID = 1;

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, user } = useAuth();
  const { t, isRtl, language } = useTranslation();

  // Mode: 'login', 'register', 'forgotPassword'
  const [mode, setMode] = useState(() => {
    const modeParam = searchParams.get("mode");
    return modeParam === "register" ? "register" : "login";
  });

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "register") {
      setMode("register");
    }
  }, [searchParams]);

  // --- Login state ---
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- Registration: which account type is the person signing up as ---
  // null (not chosen yet) | 'student' | 'parent'
  const [registerAccountType, setRegisterAccountType] = useState(null);

  // --- STUDENT registration state (4 steps) ---
  const [step, setStep] = useState("phone"); // 'phone' | 'otp' | 'details' | 'parent'
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regToken, setRegToken] = useState(null);

  // --- Academic Level (parent add-child flow) ---
  const [academicLevels, setAcademicLevels] = useState([]);
  const [studentType, setStudentType] = useState("");
  const [governorate, setGovernorate] = useState(DEFAULT_GOVERNORATE);

  // --- Student flow: optional parent/guardian fields (Step 4) ---
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [skipParent, setSkipParent] = useState(false);

  // --- PARENT registration state (separate flow) ---
  // parentStep: 'phone' | 'otp' | 'password' | 'children'
  const [parentStep, setParentStep] = useState("phone");
  const [parentPhoneReg, setParentPhoneReg] = useState("");
  const [parentOtpReg, setParentOtpReg] = useState("");
  const [parentRegToken, setParentRegToken] = useState(null);
  const [isExistingParentFound, setIsExistingParentFound] = useState(false);
  const [parentFirstNameReg, setParentFirstNameReg] = useState("");
  const [parentLastNameReg, setParentLastNameReg] = useState("");
  const [parentEmailReg, setParentEmailReg] = useState("");
  const [parentPasswordReg, setParentPasswordReg] = useState("");
  const [parentConfirmPasswordReg, setParentConfirmPasswordReg] = useState("");
  const [showParentPasswordReg, setShowParentPasswordReg] = useState(false);

  // Auth details captured right after completeParentRegistration succeeds.
  // We hold these instead of calling context login() immediately so the
  // person can view/add children before being redirected away.
  const [parentAuthToken, setParentAuthToken] = useState(null);
  const [parentAuthUser, setParentAuthUser] = useState(null);
  const [parentChildren, setParentChildren] = useState([]);

  // Add-child mini form (inside the "children" step)
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [newChildFirstName, setNewChildFirstName] = useState("");
  const [newChildLastName, setNewChildLastName] = useState("");
  const [newChildPhone, setNewChildPhone] = useState("");
  const [newChildPassword, setNewChildPassword] = useState("");
  const [newChildAcademicLevelId, setNewChildAcademicLevelId] = useState("");
  const [newChildGovernorate, setNewChildGovernorate] =
    useState(DEFAULT_GOVERNORATE);
  const [addChildError, setAddChildError] = useState("");
  const [addChildLoading, setAddChildLoading] = useState(false);

  // --- Forgot Password state ---
  const [forgotStep, setForgotStep] = useState("phone");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // --- Common UI state ---
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Whether the WhatsApp gateway session is connected right now — null while
  // still checking. When it's false, each "send OTP" step below also shows
  // an email field and delivers the OTP there instead.
  const [whatsappReady, setWhatsappReady] = useState(null);
  const [otpFallbackEmail, setOtpFallbackEmail] = useState("");
  const [parentOtpFallbackEmail, setParentOtpFallbackEmail] = useState("");
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  // Which channel the OTP actually went out on, per flow — 'whatsapp' |
  // 'email' | null (not sent yet). Set from the send-otp response, not from
  // whatsappReady, since a "ready" session can still fail to send and fall
  // back to email.
  const [otpDeliveryChannel, setOtpDeliveryChannel] = useState(null);
  const [parentOtpDeliveryChannel, setParentOtpDeliveryChannel] = useState(null);
  const [forgotOtpDeliveryChannel, setForgotOtpDeliveryChannel] = useState(null);
  const deliveryChannelFrom = (response) =>
    response?.deliveredViaEmail
      ? "email"
      : response?.deliveredViaWhatsapp
        ? "whatsapp"
        : null;

  // Normalize Egyptian phone numbers
  // Redirect if already logged in
  useEffect(() => {
    const logoutReason = sessionStorage.getItem("logoutReason");
    if (logoutReason) {
      setErrorMessage(logoutReason);
      sessionStorage.removeItem("logoutReason");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "student" || user?.role === "parent") {
        navigate("/profile", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch academic levels when registration mode is active
  useEffect(() => {
    if (mode === "register") {
      const fetchLevels = async () => {
        try {
          const response = await api.getAcademicLevels();
          if (response.success) {
            setAcademicLevels(response.data);
          }
        } catch (err) {
          console.error("Failed to fetch academic levels", err);
        }
      };
      fetchLevels();
    }
  }, [mode]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check whether WhatsApp is connected whenever registration/forgot-password
  // is opened, so the phone-entry steps know whether to also ask for an
  // email to deliver the OTP to. Fail open (assume ready) if the check
  // itself errors, rather than forcing everyone through an extra field.
  useEffect(() => {
    if (mode !== "register" && mode !== "forgotPassword") return;
    let cancelled = false;
    api
      .getWhatsappAvailability()
      .then((res) => {
        if (!cancelled) setWhatsappReady(!!res?.ready);
      })
      .catch(() => {
        if (!cancelled) setWhatsappReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const getErrorMessage = (err, fallback = t("auth.invalidCredentials")) => {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    return err.message || err.error || fallback;
  };

  // ---- LOGIN ----
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      let normalizedIdentifier = loginIdentifier.trim();
      if (isPhoneNumber(loginIdentifier)) {
        normalizedIdentifier = normalizePhone(loginIdentifier);
        if (!normalizedIdentifier) {
          setErrorMessage(t("auth.invalidPhone"));
          setIsSubmitting(false);
          return;
        }
      }
      const response = await api.login(normalizedIdentifier, password);
      if (response?.success && response.token) {
        login(response.user, response.token);
      } else {
        setErrorMessage(response?.message || t("auth.invalidCredentials"));
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================================================================
  // ---- STUDENT REGISTRATION FLOW ----
  // ==================================================================
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        setErrorMessage(t("auth.invalidPhone"));
        setIsSubmitting(false);
        return;
      }
      setPhone(normalizedPhone);
      if (whatsappReady === false) {
        // WhatsApp is down — collect the fallback email on its own step
        // before actually requesting the OTP.
        setStep("otpEmail");
        setIsSubmitting(false);
        return;
      }
      const response = await api.sendRegistrationOtp(normalizedPhone, "student");
      if (response.success) {
        setCountdown(60);
        setOtpDeliveryChannel(deliveryChannelFrom(response));
        setStep("otp");
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.sendOtpFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1b (WhatsApp down only): email collected, now actually send the OTP.
  const handleSendOtpEmailStep = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!isValidEmail(otpFallbackEmail)) {
      setErrorMessage(t("auth.otpEmailRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.sendRegistrationOtp(
        phone,
        "student",
        otpFallbackEmail.trim(),
      );
      if (response.success) {
        setCountdown(60);
        setOtpDeliveryChannel(deliveryChannelFrom(response));
        setStep("otp");
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.sendOtpFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.verifyRegistrationOtp(phone, otp);
      if (response.success && response.token) {
        setRegToken(response.token);
        // They already typed this email to receive the OTP (WhatsApp was
        // down) — reuse it here instead of asking again.
        if (otpFallbackEmail) setEmail(otpFallbackEmail);
        setStep("details");
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.invalidOtp"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate from details to parent step (Step 4)
  const goToParentStep = () => {
    setErrorMessage("");
    if (!firstName || !lastName || !regPassword || !confirmPassword) {
      setErrorMessage(t("auth.requiredFields"));
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage(t("auth.passwordMinLength"));
      return;
    }
    if (regPassword !== confirmPassword) {
      setErrorMessage(t("auth.passwordMismatch"));
      return;
    }
    if (!studentType) {
      setErrorMessage(t("auth.selectStudentTypeRequired"));
      return;
    }
    setStep("parent");
  };

  // Final submit from Step 4
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    if (!skipParent && parentPhone) {
      if (parentPhone.length < 10) {
        setErrorMessage(t("auth.parentPhoneInvalid"));
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        firstName,
        lastName,
        email,
        password: regPassword,
        academicLevelId: DEFAULT_ACADEMIC_LEVEL_ID,
        studentType,
        governorate,
      };

      if (!skipParent && parentPhone) {
        payload.parentFirstName = parentFirstName || undefined;
        payload.parentLastName = parentLastName || undefined;
        payload.parentPhone = parentPhone;
        payload.parentEmail = parentEmail || undefined;
      }

      const response = await api.completeRegistration(payload, regToken);
      if (response.success && response.token) {
        login(response.user, response.token);
      } else {
        setErrorMessage(response.message || t("auth.createAccountFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.sendRegistrationOtp(
        phone,
        "student",
        whatsappReady === false ? otpFallbackEmail.trim() : undefined,
      );
      if (response.success) {
        setCountdown(60);
        setOtpDeliveryChannel(deliveryChannelFrom(response));
        setSuccessMessage(t("auth.otpResent"));
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.resendFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================================================================
  // ---- PARENT REGISTRATION FLOW ----
  // ==================================================================
  const handleParentSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhone(parentPhoneReg);
      if (!normalizedPhone) {
        setErrorMessage(t("auth.invalidPhone"));
        setIsSubmitting(false);
        return;
      }
      setParentPhoneReg(normalizedPhone);
      if (whatsappReady === false) {
        setParentStep("otpEmail");
        setIsSubmitting(false);
        return;
      }
      const response = await api.sendRegistrationOtp(normalizedPhone, "parent");
      if (response.success) {
        setCountdown(60);
        setIsExistingParentFound(!!response.isExistingParent);
        setParentOtpDeliveryChannel(deliveryChannelFrom(response));
        setParentStep("otp");
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.sendOtpFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1b (WhatsApp down only): email collected, now actually send the OTP.
  const handleParentSendOtpEmailStep = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!isValidEmail(parentOtpFallbackEmail)) {
      setErrorMessage(t("auth.otpEmailRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.sendRegistrationOtp(
        parentPhoneReg,
        "parent",
        parentOtpFallbackEmail.trim(),
      );
      if (response.success) {
        setCountdown(60);
        setIsExistingParentFound(!!response.isExistingParent);
        setParentOtpDeliveryChannel(deliveryChannelFrom(response));
        setParentStep("otp");
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.sendOtpFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParentVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.verifyRegistrationOtp(
        parentPhoneReg,
        parentOtpReg,
      );
      if (response.success && response.token) {
        setParentRegToken(response.token);
        setIsExistingParentFound(!!response.isExistingParent);
        if (response.isExistingParent && response.existingParentInfo) {
          setParentFirstNameReg(response.existingParentInfo.firstName || "");
          setParentLastNameReg(response.existingParentInfo.lastName || "");
          setParentEmailReg(
            response.existingParentInfo.email || parentOtpFallbackEmail || "",
          );
        } else if (parentOtpFallbackEmail) {
          // They already typed this email to receive the OTP (WhatsApp was
          // down) — reuse it here instead of asking again.
          setParentEmailReg(parentOtpFallbackEmail);
        }
        setParentStep("password");
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.invalidOtp"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParentResendOtp = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.sendRegistrationOtp(
        parentPhoneReg,
        "parent",
        whatsappReady === false ? parentOtpFallbackEmail.trim() : undefined,
      );
      if (response.success) {
        setCountdown(60);
        setParentOtpDeliveryChannel(deliveryChannelFrom(response));
        setSuccessMessage(t("auth.otpResent"));
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.resendFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: set/reset password, creates account if brand new
  const handleParentSetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isExistingParentFound && (!parentFirstNameReg || !parentLastNameReg)) {
      setErrorMessage(t("auth.nameRequired"));
      return;
    }
    if (parentPasswordReg.length < 6) {
      setErrorMessage(t("auth.passwordMinLength"));
      return;
    }
    if (parentPasswordReg !== parentConfirmPasswordReg) {
      setErrorMessage(t("auth.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        firstName: parentFirstNameReg,
        lastName: parentLastNameReg,
        email: parentEmailReg || undefined,
        password: parentPasswordReg,
      };
      const response = await api.completeParentRegistration(
        payload,
        parentRegToken,
      );
      if (response.success && response.token) {
        // Hold the token/user locally (and in localStorage so authenticated
        // calls like addChild work) but DON'T call context login() yet —
        // that would redirect away before the person can review/add children.
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setParentAuthToken(response.token);
        setParentAuthUser(response.user);
        setParentChildren(response.children || []);
        setParentStep("children");
        setSuccessMessage(response.message);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.operationFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: add a child under the now-authenticated parent
  const handleAddChild = async (e) => {
    e.preventDefault();
    setAddChildError("");

    if (
      !newChildFirstName ||
      !newChildLastName ||
      !newChildPhone ||
      !newChildPassword
    ) {
      setAddChildError("جميع الحقول المطلوبة يجب تعبئتها.");
      return;
    }
    if (newChildPassword.length < 6) {
      setAddChildError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    setAddChildLoading(true);
    try {
      const response = await api.addChild({
        firstName: newChildFirstName,
        lastName: newChildLastName,
        phone: newChildPhone,
        password: newChildPassword,
        academicLevelId: newChildAcademicLevelId || undefined,
        governorate: newChildGovernorate,
      });
      if (response.success) {
        const childrenRes = await api.getMyChildren();
        if (childrenRes.success) setParentChildren(childrenRes.data);
        setNewChildFirstName("");
        setNewChildLastName("");
        setNewChildPhone("");
        setNewChildPassword("");
        setNewChildAcademicLevelId("");
        setNewChildGovernorate(DEFAULT_GOVERNORATE);
        setShowAddChildForm(false);
      } else {
        setAddChildError(response.message || "فشلت إضافة الابن/الابنة.");
      }
    } catch (err) {
      setAddChildError(err.message || "حدث خطأ.");
    } finally {
      setAddChildLoading(false);
    }
  };

  // Finish: hand off to the real auth context (this triggers the redirect)
  const handleFinishParentFlow = () => {
    if (parentAuthUser && parentAuthToken) {
      login(parentAuthUser, parentAuthToken);
    }
  };

  // ---- FORGOT PASSWORD FLOW ----
  const handleForgotPasswordSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhone(forgotPhone);
      if (!normalizedPhone) {
        setErrorMessage(t("auth.invalidPhone"));
        setIsSubmitting(false);
        return;
      }
      setForgotPhone(normalizedPhone);
      const response = await api.forgotPassword(normalizedPhone);
      if (response.success && response.requiresSupport) {
        // No WhatsApp session and no email on file — staff were notified,
        // nothing to verify here.
        setForgotStep("supportPending");
      } else if (response.success) {
        setCountdown(60);
        setForgotOtpDeliveryChannel(deliveryChannelFrom(response));
        setForgotStep("otp");
        setSuccessMessage(
          response.deliveredViaEmail
            ? t("auth.otpSentToEmail")
            : response.message,
        );
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.sendOtpFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    if (forgotOtp.length !== 6) {
      setErrorMessage("الرجاء إدخال رمز مكون من 6 أرقام.");
      setIsSubmitting(false);
      return;
    }
    setForgotStep("newPassword");
    setIsSubmitting(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    if (newPassword.length < 6) {
      setErrorMessage(t("auth.passwordMinLength"));
      setIsSubmitting(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage(t("auth.passwordMismatch"));
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await api.resetPassword(
        forgotPhone,
        forgotOtp,
        newPassword,
      );
      if (response.success) {
        setSuccessMessage(
          "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.",
        );
        setMode("login");
        setForgotStep("phone");
        setForgotPhone("");
        setForgotOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || "فشل إعادة تعيين كلمة المرور.");
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendForgotOtp = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.forgotPassword(forgotPhone);
      if (response.success) {
        setCountdown(60);
        setForgotOtpDeliveryChannel(deliveryChannelFrom(response));
        setSuccessMessage(t("auth.otpResent"));
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(response.message || t("auth.resendFailed"));
      }
    } catch (err) {
      setErrorMessage(err.message || t("auth.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRegistration = () => {
    setRegisterAccountType(null);

    // student flow
    setStep("phone");
    setPhone("");
    setOtp("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setRegPassword("");
    setConfirmPassword("");
    setRegToken(null);
    setStudentType("");
    setParentFirstName("");
    setParentLastName("");
    setParentPhone("");
    setParentEmail("");
    setSkipParent(false);
    setOtpFallbackEmail("");
    setOtpDeliveryChannel(null);

    // parent flow
    setParentStep("phone");
    setParentPhoneReg("");
    setParentOtpReg("");
    setParentRegToken(null);
    setIsExistingParentFound(false);
    setParentOtpFallbackEmail("");
    setParentOtpDeliveryChannel(null);
    setParentFirstNameReg("");
    setParentLastNameReg("");
    setParentEmailReg("");
    setParentPasswordReg("");
    setParentConfirmPasswordReg("");
    setParentAuthToken(null);
    setParentAuthUser(null);
    setParentChildren([]);
    setShowAddChildForm(false);
    setNewChildFirstName("");
    setNewChildLastName("");
    setNewChildPhone("");
    setNewChildPassword("");
    setNewChildAcademicLevelId("");
    setNewChildGovernorate(DEFAULT_GOVERNORATE);
    setAddChildError("");
  };

  const toggleMode = (newMode) => {
    setMode(newMode);
    resetRegistration();
    setForgotStep("phone");
    setForgotPhone("");
    setForgotOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setForgotOtpDeliveryChannel(null);
    setErrorMessage("");
    setSuccessMessage("");
    setCountdown(0);
  };

  if (isAuthenticated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#fdfdfc]">
        <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const panelContent =
    mode === "login"
      ? {
          badge: t("auth.loginPanelBadge"),
          title: t("auth.loginPanelTitle"),
          desc: t("auth.loginPanelDesc"),
        }
      : mode === "register"
        ? {
            badge: t("auth.registerPanelBadge"),
            title: t("auth.registerPanelTitle"),
            desc: t("auth.registerPanelDesc"),
          }
        : {
            badge: t("auth.forgotPanelBadge"),
            title: t("auth.forgotPanelTitle"),
            desc: t("auth.forgotPanelDesc"),
          };

  const formTitle =
    mode === "login"
      ? t("auth.signInTitle")
      : mode === "register"
        ? registerAccountType === "parent"
          ? t("auth.parentAccount")
          : registerAccountType === "student"
            ? t("auth.createStudentAccount")
            : t("auth.createYourAccount")
        : t("auth.forgotPasswordTitle");

  // Channel-aware OTP subtitle: once we know whether the code actually went
  // out via WhatsApp or email, say so instead of always saying "WhatsApp".
  const otpSubtitleFor = (channel) =>
    channel === "email"
      ? t("auth.subtitles.otpSentEmail")
      : t("auth.subtitles.otpSentWhatsapp");

  const getFormSubtitle = () => {
    if (mode === "login") return t("auth.subtitles.login");
    if (mode === "forgotPassword") {
      if (forgotStep === "phone") return t("auth.subtitles.forgotPhone");
      if (forgotStep === "otp") return otpSubtitleFor(forgotOtpDeliveryChannel);
      if (forgotStep === "supportPending") return "";
      return t("auth.subtitles.forgotPassword");
    }
    if (mode === "register") {
      if (registerAccountType === null)
        return t("auth.subtitles.registerChoose");
      if (registerAccountType === "student") {
        if (step === "phone") return t("auth.subtitles.studentPhone");
        if (step === "otpEmail") return t("auth.otpFallbackEmailHint");
        if (step === "otp") return otpSubtitleFor(otpDeliveryChannel);
        if (step === "details") return t("auth.subtitles.studentDetails");
        return t("auth.subtitles.studentParent");
      }
      if (parentStep === "phone") return t("auth.subtitles.parentPhone");
      if (parentStep === "otpEmail") return t("auth.otpFallbackEmailHint");
      if (parentStep === "otp") return otpSubtitleFor(parentOtpDeliveryChannel);
      if (parentStep === "password") {
        return isExistingParentFound
          ? t("auth.subtitles.parentExisting")
          : t("auth.subtitles.parentDetails");
      }
      return t("auth.subtitles.parentChildren");
    }
    return "";
  };

  return (
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 text-[#2e0854] bg-white font-sidebar overflow-x-hidden selection:bg-brand selection:text-white">
      {/* LEFT SIDE - decorative */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#fdfdfc] flex-col items-center justify-center p-12 border-e border-gray-100 relative overflow-hidden">
        <div className="absolute -start-24 -bottom-24 w-96 h-96 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-md w-full text-center space-y-8 relative z-10">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-purple">
              {panelContent.badge}
            </span>
            <h2 className="text-3xl font-black font-heading tracking-tight leading-tight text-[#2e0854]">
              {panelContent.title}
            </h2>
            <p className="text-gray-400 text-sm font-light leading-relaxed">
              {panelContent.desc}
            </p>
          </div>
          <div className="relative rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_15px_40px_rgba(43,2,7,0.03)] transform transition-transform duration-500 hover:scale-[1.01]">
            <img
              src="/345345_1770200756228.avif"
              alt={t("auth.dashboardPreview")}
              className="w-full h-auto rounded-xl object-cover"
            />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: FORM */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-between p-6 sm:p-12 md:p-20 relative bg-white">
        <div className="flex justify-between items-center w-full mb-12 sm:mb-0">
          <div className="flex items-center">
          <BrandLogo />
          </div>
          <LanguageToggle className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl transition-all text-gray-500" />
        </div>

        <div className="max-w-md w-full mx-auto my-auto space-y-8">
          {/* Header */}
          <div className="space-y-2 text-center sm:text-start">
            <h1 className="text-3xl font-black font-heading tracking-tight text-[#2e0854]">
              {formTitle}
            </h1>
            <p className="text-gray-400 text-sm font-light">
              {getFormSubtitle()}
            </p>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-semibold flex items-start gap-2">
              <HiOutlineCheckCircle className="text-lg mt-0.5 shrink-0" />
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="p-4 bg-violet-50 border border-violet-200 text-brand rounded-2xl text-xs font-semibold animate-shake">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* ========== LOGIN FORM ========== */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                  {t("auth.phoneOrEmail")}
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    required
                    placeholder={t("auth.phoneOrEmailPlaceholder")}
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pe-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                    {t("auth.password")}
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleMode("forgotPassword")}
                    className="text-xs font-medium text-brand-purple hover:text-brand transition-colors"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pe-12 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <HiEyeOff className="text-lg" />
                    ) : (
                      <HiEye className="text-lg" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1 px-1">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-gray-300 text-brand-purple focus:ring-violet-100 accent-brand-purple"
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-gray-400 font-light select-none cursor-pointer"
                >
                  {t("auth.rememberDevice")}
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99]"
              >
                {isSubmitting
                  ? t("auth.authorizing")
                  : t("auth.authorizeEnter")}
              </button>

              <div className="text-center text-xs text-gray-400 mt-4">
                {t("auth.noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => toggleMode("register")}
                  className="text-brand-purple font-semibold hover:underline"
                >
                  {t("auth.signUpNow")}
                </button>
              </div>
            </form>
          )}

          {/* ========== REGISTER: ACCOUNT TYPE SELECTION ========== */}
          {mode === "register" && registerAccountType === null && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRegisterAccountType("student")}
                  className="border border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 rounded-2xl p-6 text-start transition-all"
                >
                  <HiOutlineUser className="text-2xl text-brand-purple mb-2" />
                  <h3 className="font-bold text-sm text-[#2e0854]">
                    {t("auth.imStudent")}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-light">
                    {t("auth.imStudentDesc")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterAccountType("parent")}
                  className="border border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 rounded-2xl p-6 text-start transition-all"
                >
                  <HiOutlineUserGroup className="text-2xl text-brand-purple mb-2" />
                  <h3 className="font-bold text-sm text-[#2e0854]">
                    {t("auth.imParent")}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-light">
                    {t("auth.imParentDesc")}
                  </p>
                </button>
              </div>

              <div className="text-center text-xs text-gray-400 mt-4">
                {t("auth.alreadyHaveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => toggleMode("login")}
                  className="text-brand-purple font-semibold hover:underline"
                >
                  {t("auth.signIn")}
                </button>
              </div>
            </div>
          )}

          {/* ========== STUDENT REGISTER FORM ========== */}
          {mode === "register" && registerAccountType === "student" && (
            <div className="space-y-5">
              {/* Step indicator (4 steps) */}
              <div className="flex items-center justify-between px-2">
                <div
                  className={`flex-1 h-1 rounded-full ${step === "phone" || step === "otpEmail" ? "bg-brand" : "bg-green-500"}`}
                ></div>
                <div
                  className={`flex-1 h-1 rounded-full mx-1 ${step === "otp" ? "bg-brand" : step !== "phone" && step !== "otpEmail" ? "bg-green-500" : "bg-gray-200"}`}
                ></div>
                <div
                  className={`flex-1 h-1 rounded-full mx-1 ${step === "details" ? "bg-brand" : step === "parent" ? "bg-green-500" : "bg-gray-200"}`}
                ></div>
                <div
                  className={`flex-1 h-1 rounded-full ${step === "parent" ? "bg-brand" : "bg-gray-200"}`}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
                <span className={step === "phone" || step === "otpEmail" ? "text-brand-purple" : ""}>
                  {t("auth.stepPhone")}
                </span>
                <span className={step === "otp" ? "text-brand-purple" : ""}>
                  {t("auth.stepVerify")}
                </span>
                <span className={step === "details" ? "text-brand-purple" : ""}>
                  {t("auth.stepDetails")}
                </span>
                <span className={step === "parent" ? "text-brand-purple" : ""}>
                  {t("auth.stepParent")}
                </span>
              </div>

              {/* Step 1: Phone Number */}
              {step === "phone" && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.phoneNumber")} *
                    </label>
                    <div className="relative">
                      <HiOutlinePhone className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="tel"
                        required
                        placeholder="01042040481"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 px-1">
                      {whatsappReady === false
                        ? t("auth.otpFallbackEmailHint")
                        : t("auth.whatsappVerifyHint")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterAccountType(null)}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.sending") : t("auth.sendVerificationCode")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 1b (WhatsApp down only): fallback email */}
              {step === "otpEmail" && (
                <form onSubmit={handleSendOtpEmailStep} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.otpFallbackEmailLabel")}
                    </label>
                    <div className="relative">
                      <HiOutlineMail className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={otpFallbackEmail}
                        onChange={(e) => setOtpFallbackEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-amber-600 px-1">
                      {t("auth.otpFallbackEmailHint")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep("phone")}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.sending") : t("auth.sendVerificationCode")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {step === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.enterSixDigitCode")}
                    </label>
                    <div className="relative">
                      <HiOutlineShieldCheck className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="text"
                        required
                        maxLength="6"
                        placeholder="123456"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-center tracking-widest font-mono text-lg"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400 px-1">
                      {t("auth.sentTo", {
                        phone:
                          otpDeliveryChannel === "email"
                            ? otpFallbackEmail
                            : phone,
                      })} •{" "}
                      {countdown > 0 ? (
                        t("auth.resendIn", { seconds: countdown })
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="text-brand-purple font-semibold hover:underline"
                        >
                          {t("auth.resendCode")}
                        </button>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone");
                        setOtp("");
                      }}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || otp.length < 6}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.verifying") : t("auth.verifyCode")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Personal Details + Student Type */}
              {step === "details" && (
                <form
                  className="space-y-5"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.firstName")} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ahmed"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.lastName")} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Mohamed"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.emailOptional")}
                    </label>
                    <div className="relative">
                      <HiOutlineMail className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="email"
                        placeholder="name@example.com"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.studentType")} *
                    </label>
                    <select
                      required
                      className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                      value={studentType}
                      onChange={(e) => setStudentType(e.target.value)}
                    >
                      <option value="">{t("auth.selectStudentType")}</option>
                      {STUDENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.governorate")}
                    </label>
                    <select
                      className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                    >
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <option key={gov.value} value={gov.value}>
                          {language === "ar" ? gov.ar : gov.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.passwordRequired")}
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        placeholder={t("auth.passwordMin")}
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pe-12 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute end-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showRegPassword ? (
                          <HiEyeOff className="text-lg" />
                        ) : (
                          <HiEye className="text-lg" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.confirmPassword")} *
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder={t("auth.confirmPassword")}
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pe-12 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute end-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <HiEyeOff className="text-lg" />
                        ) : (
                          <HiEye className="text-lg" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetRegistration();
                        setRegisterAccountType("student");
                        setStep("phone");
                      }}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="button"
                      onClick={goToParentStep}
                      className="flex-1 bg-brand hover:bg-brand-dark text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.next")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 4: Parent / Guardian (optional) */}
              {step === "parent" && (
                <form
                  onSubmit={handleCompleteRegistration}
                  className="space-y-5"
                >
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                        Parent / Guardian (optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setSkipParent(!skipParent)}
                        className="text-xs text-brand-purple font-semibold hover:underline"
                      >
                        {skipParent ? t("auth.addParent") : t("auth.skip")}
                      </button>
                    </div>

                    {!skipParent && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder={t("auth.parentFirstName")}
                            className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                            value={parentFirstName}
                            onChange={(e) => setParentFirstName(e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder={t("auth.parentLastName")}
                            className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                            value={parentLastName}
                            onChange={(e) => setParentLastName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <input
                            type="tel"
                            placeholder={t("auth.parentPhone")}
                            className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                            value={parentPhone}
                            onChange={(e) => setParentPhone(e.target.value)}
                          />
                          <input
                            type="email"
                            placeholder={t("auth.parentEmailOptional")}
                            className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                            value={parentEmail}
                            onChange={(e) => setParentEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center text-xs text-gray-400 mt-4">
                {t("auth.alreadyHaveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => toggleMode("login")}
                  className="text-brand-purple font-semibold hover:underline"
                >
                  {t("auth.signIn")}
                </button>
              </div>
            </div>
          )}

          {/* ========== PARENT REGISTER FORM ========== */}
          {mode === "register" && registerAccountType === "parent" && (
            <div className="space-y-5">
              {/* Step indicator (4 stages: Phone, Verify, Password, Children) */}
              <div className="flex items-center justify-between px-2">
                <div
                  className={`flex-1 h-1 rounded-full ${parentStep === "phone" || parentStep === "otpEmail" ? "bg-brand" : "bg-green-500"}`}
                ></div>
                <div
                  className={`flex-1 h-1 rounded-full mx-1 ${
                    parentStep === "otp"
                      ? "bg-brand"
                      : ["password", "children"].includes(parentStep)
                        ? "bg-green-500"
                        : "bg-gray-200"
                  }`}
                ></div>
                <div
                  className={`flex-1 h-1 rounded-full mx-1 ${
                    parentStep === "password"
                      ? "bg-brand"
                      : parentStep === "children"
                        ? "bg-green-500"
                        : "bg-gray-200"
                  }`}
                ></div>
                <div
                  className={`flex-1 h-1 rounded-full ${parentStep === "children" ? "bg-brand" : "bg-gray-200"}`}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
                <span className={parentStep === "phone" || parentStep === "otpEmail" ? "text-brand-purple" : ""}>
                  {t("auth.stepPhone")}
                </span>
                <span className={parentStep === "otp" ? "text-brand-purple" : ""}>
                  {t("auth.stepVerify")}
                </span>
                <span
                  className={parentStep === "password" ? "text-brand-purple" : ""}
                >
                  {t("auth.stepPassword")}
                </span>
                <span
                  className={parentStep === "children" ? "text-brand-purple" : ""}
                >
                  {t("auth.stepChildren")}
                </span>
              </div>

              {/* Step 1: Phone */}
              {parentStep === "phone" && (
                <form onSubmit={handleParentSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.phoneNumber")} *
                    </label>
                    <div className="relative">
                      <HiOutlinePhone className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="tel"
                        required
                        placeholder="01042040481"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={parentPhoneReg}
                        onChange={(e) => setParentPhoneReg(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 px-1">
                      If you're already registered as a parent with us, we'll
                      recognize your number and help you regain access.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterAccountType(null)}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.sending") : t("auth.sendVerificationCode")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 1b (WhatsApp down only): fallback email */}
              {parentStep === "otpEmail" && (
                <form
                  onSubmit={handleParentSendOtpEmailStep}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.otpFallbackEmailLabel")}
                    </label>
                    <div className="relative">
                      <HiOutlineMail className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={parentOtpFallbackEmail}
                        onChange={(e) =>
                          setParentOtpFallbackEmail(e.target.value)
                        }
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-amber-600 px-1">
                      {t("auth.otpFallbackEmailHint")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setParentStep("phone")}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.sending") : t("auth.sendVerificationCode")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: OTP */}
              {parentStep === "otp" && (
                <form onSubmit={handleParentVerifyOtp} className="space-y-5">
                  {isExistingParentFound && (
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-medium">
                      This number is already registered as a parent in our
                      records. Verify the code to set a new password and access
                      your account.
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.enterSixDigitCode")}
                    </label>
                    <div className="relative">
                      <HiOutlineShieldCheck className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="text"
                        required
                        maxLength="6"
                        placeholder="123456"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-center tracking-widest font-mono text-lg"
                        value={parentOtpReg}
                        onChange={(e) =>
                          setParentOtpReg(e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400 px-1">
                      {t("auth.sentTo", {
                        phone:
                          parentOtpDeliveryChannel === "email"
                            ? parentOtpFallbackEmail
                            : parentPhoneReg,
                      })} •{" "}
                      {countdown > 0 ? (
                        t("auth.resendIn", { seconds: countdown })
                      ) : (
                        <button
                          type="button"
                          onClick={handleParentResendOtp}
                          className="text-brand-purple font-semibold hover:underline"
                        >
                          {t("auth.resendCode")}
                        </button>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setParentStep("phone");
                        setParentOtpReg("");
                      }}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || parentOtpReg.length < 6}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.verifying") : t("auth.verifyCode")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Password (+ name/email if brand new) */}
              {parentStep === "password" && (
                <form onSubmit={handleParentSetPassword} className="space-y-5">
                  {isExistingParentFound && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-start gap-2">
                      <HiOutlineCheckCircle className="text-base mt-0.5 shrink-0" />
                      We found your parent account. Set a new password below to
                      log in — your linked children are safe and will be shown
                      on the next step.
                    </div>
                  )}

                  {!isExistingParentFound && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                          {t("auth.firstName")} *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Mona"
                            className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                            value={parentFirstNameReg}
                            onChange={(e) =>
                              setParentFirstNameReg(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                          {t("auth.lastName")} *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ahmed"
                            className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                            value={parentLastNameReg}
                            onChange={(e) =>
                              setParentLastNameReg(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                          {t("auth.emailOptional")}
                        </label>
                        <div className="relative">
                          <HiOutlineMail className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                            value={parentEmailReg}
                            onChange={(e) => setParentEmailReg(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {isExistingParentFound ? "New Password *" : "Password *"}
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type={showParentPasswordReg ? "text" : "password"}
                        required
                        placeholder={t("auth.passwordMin")}
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pe-12 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={parentPasswordReg}
                        onChange={(e) => setParentPasswordReg(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowParentPasswordReg(!showParentPasswordReg)
                        }
                        className="absolute end-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showParentPasswordReg ? (
                          <HiEyeOff className="text-lg" />
                        ) : (
                          <HiEye className="text-lg" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.confirmPassword")} *
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="password"
                        required
                        placeholder={t("auth.confirmPassword")}
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={parentConfirmPasswordReg}
                        onChange={(e) =>
                          setParentConfirmPasswordReg(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setParentStep("otp");
                      }}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting
                        ? "Saving..."
                        : isExistingParentFound
                          ? "Set New Password"
                          : "Create Account"}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 4: Children */}
              {parentStep === "children" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-sm text-[#2e0854] mb-1">
                      {t("auth.yourChildren")}
                    </h3>
                    <p className="text-xs text-gray-400 font-light">
                      {parentChildren.length > 0
                        ? t("auth.childrenLinked")
                        : t("auth.noChildrenLinked")}
                    </p>
                  </div>

                  {parentChildren.length > 0 && (
                    <div className="space-y-2 max-h-56 overflow-y-auto border border-gray-100 rounded-2xl p-3">
                      {parentChildren.map((child) => (
                        <div
                          key={child.student_id}
                          className="flex items-center justify-between text-xs border-b border-gray-50 last:border-0 py-2"
                        >
                          <div>
                            <p className="font-bold text-[#2e0854]">
                              {child.first_name} {child.last_name}
                            </p>
                            <p className="text-gray-400 font-mono">
                              {child.phone}
                            </p>
                          </div>
                          {child.academic_level_name && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                              {child.academic_level_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {addChildError && (
                    <div className="p-3 bg-violet-50 border border-violet-200 text-brand rounded-xl text-xs font-semibold">
                      ⚠️ {addChildError}
                    </div>
                  )}

                  {!showAddChildForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddChildForm(true)}
                      className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-violet-300 hover:bg-violet-50/30 text-gray-500 hover:text-brand-purple font-semibold text-sm py-3 rounded-2xl transition-all"
                    >
                      <HiOutlinePlus className="text-base" /> {t("auth.addAChild")}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleAddChild}
                      className="space-y-3 border border-gray-100 rounded-2xl p-4 bg-gray-50/40"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="First Name"
                          className="w-full bg-white text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-200"
                          value={newChildFirstName}
                          onChange={(e) => setNewChildFirstName(e.target.value)}
                        />
                        <input
                          type="text"
                          required
                          placeholder="Last Name"
                          className="w-full bg-white text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-200"
                          value={newChildLastName}
                          onChange={(e) => setNewChildLastName(e.target.value)}
                        />
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="Child's Phone Number"
                        className="w-full bg-white text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-200"
                        value={newChildPhone}
                        onChange={(e) => setNewChildPhone(e.target.value)}
                      />
                      <input
                        type="password"
                        required
                        placeholder="Password for child's login (min 6 chars)"
                        className="w-full bg-white text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-200"
                        value={newChildPassword}
                        onChange={(e) => setNewChildPassword(e.target.value)}
                      />
                      <select
                        className="w-full bg-white text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-200"
                        value={newChildAcademicLevelId}
                        onChange={(e) =>
                          setNewChildAcademicLevelId(e.target.value)
                        }
                      >
                        <option value="">Academic Level (optional)</option>
                        {academicLevels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full bg-white text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-200"
                        value={newChildGovernorate}
                        onChange={(e) => setNewChildGovernorate(e.target.value)}
                      >
                        {EGYPT_GOVERNORATES.map((gov) => (
                          <option key={gov.value} value={gov.value}>
                            {gov.en}
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddChildForm(false);
                            setAddChildError("");
                          }}
                          className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addChildLoading}
                          className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white rounded-xl text-xs font-semibold"
                        >
                          {addChildLoading ? t("auth.adding") : t("auth.addChild")}
                        </button>
                      </div>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={handleFinishParentFlow}
                    className="w-full bg-brand hover:bg-brand-dark text-white font-semibold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-[0.99]"
                  >
                    Finish &amp; Go to Dashboard
                  </button>
                </div>
              )}

              <div className="text-center text-xs text-gray-400 mt-4">
                {t("auth.alreadyHaveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => toggleMode("login")}
                  className="text-brand-purple font-semibold hover:underline"
                >
                  {t("auth.signIn")}
                </button>
              </div>
            </div>
          )}

          {/* ========== FORGOT PASSWORD FORM ========== */}
          {mode === "forgotPassword" && (
            <div className="space-y-5">
              {/* Step indicator (not shown for the support-escalation dead end) */}
              {forgotStep !== "supportPending" && (
                <>
                  <div className="flex items-center justify-between px-2">
                    <div
                      className={`flex-1 h-1 rounded-full ${
                        forgotStep === "phone" ? "bg-brand" : "bg-green-500"
                      }`}
                    ></div>
                    <div
                      className={`flex-1 h-1 rounded-full mx-1 ${
                        forgotStep === "otp"
                          ? "bg-brand"
                          : forgotStep === "newPassword"
                            ? "bg-green-500"
                            : "bg-gray-200"
                      }`}
                    ></div>
                    <div
                      className={`flex-1 h-1 rounded-full ${
                        forgotStep === "newPassword" ? "bg-brand" : "bg-gray-200"
                      }`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
                    <span className={forgotStep === "phone" ? "text-brand-purple" : ""}>
                      {t("auth.stepPhone")}
                    </span>
                    <span className={forgotStep === "otp" ? "text-brand-purple" : ""}>
                      {t("auth.stepVerify")}
                    </span>
                    <span
                      className={forgotStep === "newPassword" ? "text-brand-purple" : ""}
                    >
                      {t("auth.stepNewPassword")}
                    </span>
                  </div>
                </>
              )}

              {/* Dead end: no WhatsApp session and no email on file — staff
                  were notified by email and will follow up manually. */}
              {forgotStep === "supportPending" && (
                <div className="space-y-5 text-center py-2">
                  <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                    <HiOutlineShieldCheck className="text-2xl text-amber-500" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed px-2">
                    {t("auth.forgotSupportPending")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setForgotStep("phone")}
                    className="text-brand-purple font-semibold text-sm hover:underline"
                  >
                    {t("auth.backToPhone")}
                  </button>
                </div>
              )}

              {/* Step 1: Phone number */}
              {forgotStep === "phone" && (
                <form
                  onSubmit={handleForgotPasswordSendOtp}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.phoneNumber")} *
                    </label>
                    <div className="relative">
                      <HiOutlinePhone className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="tel"
                        required
                        placeholder="01042040481"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 px-1">
                      {whatsappReady === false
                        ? t("auth.forgotEmailFallbackHint")
                        : t("auth.forgotWhatsappHint")}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                  >
                    {isSubmitting ? "Sending..." : "Send Verification Code"}
                  </button>
                </form>
              )}

              {/* Step 2: OTP */}
              {forgotStep === "otp" && (
                <form
                  onSubmit={handleForgotPasswordVerifyOtp}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      {t("auth.enterSixDigitCode")}
                    </label>
                    <div className="relative">
                      <HiOutlineShieldCheck className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="text"
                        required
                        maxLength="6"
                        placeholder="123456"
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all text-center tracking-widest font-mono text-lg"
                        value={forgotOtp}
                        onChange={(e) =>
                          setForgotOtp(e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400 px-1">
                      {t("auth.sentTo", {
                        phone:
                          forgotOtpDeliveryChannel === "email"
                            ? t("auth.yourRegisteredEmail")
                            : forgotPhone,
                      })} •{" "}
                      {countdown > 0 ? (
                        t("auth.resendIn", { seconds: countdown })
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendForgotOtp}
                          className="text-brand-purple font-semibold hover:underline"
                        >
                          {t("auth.resendCode")}
                        </button>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep("phone");
                        setForgotOtp("");
                      }}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || forgotOtp.length < 6}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.verifying") : t("auth.verifyCode")}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: New password */}
              {forgotStep === "newPassword" && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        placeholder={t("auth.passwordMin")}
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pe-12 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute end-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showNewPassword ? (
                          <HiEyeOff className="text-lg" />
                        ) : (
                          <HiEye className="text-lg" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="password"
                        required
                        placeholder={t("auth.confirmPassword")}
                        className="w-full bg-gray-50/70 text-sm font-light border border-transparent focus:border-violet-200 rounded-2xl ps-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-violet-100/50 focus:bg-white transition-all"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep("otp");
                        setNewPassword("");
                        setConfirmNewPassword("");
                      }}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {t("auth.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-violet-300 text-white font-semibold text-sm py-4 rounded-2xl transition-all"
                    >
                      {isSubmitting ? t("auth.resetting") : t("auth.resetPassword")}
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center text-xs text-gray-400 mt-4">
                {t("auth.rememberPassword")}{" "}
                <button
                  type="button"
                  onClick={() => toggleMode("login")}
                  className="text-brand-purple font-semibold hover:underline"
                >
                  {t("auth.signIn")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-full text-center text-[11px] text-gray-400 font-light mt-12 sm:mt-0 pt-6 border-t border-gray-50 sm:border-transparent">
          {t("auth.agreePrefix")}{" "}
          <Link
            to="/terms-and-conditions"
            className="underline hover:text-gray-600 transition-colors"
          >
            {t("footer.termsConditions")}
          </Link>{" "}
          {t("auth.and")}{" "}
          <Link
            to="/privacy-policy"
            className="underline hover:text-gray-600 transition-colors"
          >
            {t("footer.privacyPolicy")}
          </Link>
          .
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
