import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import CVExtractor from "./CVExtractor";
import CandidatesList from "./CandidatesList";
import CandidatsRefuses from "./CandidatsRefuses";
import RecruitmentForm from "./RecruitmentForm";
import AdminLogin from "./AdminLogin";

// Component to protect admin routes
const ProtectedRoute = ({ children }) => {
  const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
  if (!isAdminLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function QuestionnaireForm() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<RecruitmentForm />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/form/:token" element={<RecruitmentForm />} />

        {/* Protected Admin Routes */}
        <Route
          path="/candidates"
          element={
            <ProtectedRoute>
              <CandidatesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <CVExtractor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/refused"
          element={
            <ProtectedRoute>
              <CandidatsRefuses />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
