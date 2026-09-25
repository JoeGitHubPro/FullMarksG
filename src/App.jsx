import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Layout from "./components/Layout";
import Home from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsConditionsPage from "./pages/TermsConditionsPage";
import CoursesCatalogPage from "./pages/CoursesCatalogPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import CategoriesCatalogPage from "./pages/CategoriesCatalogPage";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import CourseItemPreviewPage from "./pages/CourseItemPreviewPage";
import InstructorsCatalogPage from "./pages/InstructorsCatalogPage";
import InstructorDetailPage from "./pages/InstructorDetailPage";

import Login from "./pages/LoginPage";

import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import CoursesDashboard from "./pages/CoursesDashboard";
import CurriculumsDashboard from "./pages/CurriculumsDashboard";
import SubjectsDashboard from "./pages/SubjectsDashboard";
import SupportDashboard from "./pages/SupportDashboard";
import AiChatbotDashboard from "./pages/AiChatbotDashboard";
import ParentsDashboard from "./pages/ParentsDashboard";
import StudentsDashboard from "./pages/StudentsDashboard";
import AssistantsDashboard from "./pages/AssistantsDashboard";
import InstructorsDashboard from "./pages/InstructorsDashboard";
import QuizzesDashboard from "./pages/QuizzesDashboard";
import AssignmentsDashboard from "./pages/AssignmentsDashboard";
import LevelsDashboard from "./pages/LevelsDashboard";
import AdminsDashboard from "./pages/AdminsDashboard";
import ProfileDashboard from "./pages/ProfileDashboard";
import AccessCodesDashboard from "./pages/AccessCodesDashboard";
import CategoriesDashboard from "./pages/CategoriesDashboard";
import PaymentsDashboard from "./pages/PaymentsDashboard";
import WhatsAppDashboard from "./pages/WhatsAppDashboard";
import RegistrationOtpsDashboard from "./pages/RegistrationOtpsDashboard";
import PaymentReturnPage from "./pages/PaymentReturnPage";

import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

const STAFF_ROLES = ["admin", "instructor", "assistant"];

const AlreadyLoggedInRedirect = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    if (user?.role === "student" || user?.role === "parent") {
      return <Navigate to="/profile" replace />;
    }
    if (STAFF_ROLES.includes(user?.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

const ProfileRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!["student", "parent"].includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const DashboardProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!STAFF_ROLES.includes(user?.role)) {
    if (user?.role === "student" || user?.role === "parent") {
      return <Navigate to="/profile" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
};

const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route
          path="/terms-and-conditions"
          element={<TermsConditionsPage />}
        />
        <Route path="/courses" element={<CoursesCatalogPage />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route
          path="/courses/:slug/preview/:itemId"
          element={<CourseItemPreviewPage />}
        />
        <Route path="/months" element={<CategoriesCatalogPage />} />
        <Route path="/months/:slug" element={<CategoryDetailPage />} />
        <Route path="/payment/return" element={<PaymentReturnPage />} />
        <Route path="/instructors" element={<InstructorsCatalogPage />} />
        <Route path="/instructors/:slug" element={<InstructorDetailPage />} />
        <Route
          path="/profile"
          element={
            <ProfileRoute>
              <ProfilePage />
            </ProfileRoute>
          }
        />
      </Route>

      <Route
        path="/login"
        element={
          <AlreadyLoggedInRedirect>
            <Login />
          </AlreadyLoggedInRedirect>
        }
      />

      <Route
        path="/dashboard"
        element={
          <DashboardProtectedRoute>
            <DashboardLayout
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </DashboardProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="profile"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <ProfileDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="courses"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <CoursesDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="courses/:slug"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <CoursesDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="course/:slug"
          element={<Navigate to="/dashboard/courses/:slug" replace />}
        />

        <Route
          path="access-codes"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor"]}>
              <AccessCodesDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="whatsapp"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <WhatsAppDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="registration-otps"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <RegistrationOtpsDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="categories"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <CategoriesDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="payments"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <PaymentsDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="assignments"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <AssignmentsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="quizzes"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <QuizzesDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="support"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <SupportDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="ai-chatbot"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <AiChatbotDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="curriculums"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <CurriculumsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="levels"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <LevelsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="subjects"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <SubjectsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="instructors"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <InstructorsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="instructors/:slug"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <InstructorsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="assistants"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor"]}>
              <AssistantsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="assistants/:slug"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor"]}>
              <AssistantsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="students"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <StudentsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="students/:slug"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <StudentsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="parents"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <ParentsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="parents/:slug"
          element={
            <RoleBasedRoute allowedRoles={["admin", "instructor", "assistant"]}>
              <ParentsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="admins"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <AdminsDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="admins/:slug"
          element={
            <RoleBasedRoute allowedRoles={["admin"]}>
              <AdminsDashboard />
            </RoleBasedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
