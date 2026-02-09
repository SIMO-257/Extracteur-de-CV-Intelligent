import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import CVExtractor from "./CVExtractor";
import CandidatesList from "./CandidatesList";
import CandidatsRefuses from "./CandidatsRefuses";
import CandidatsEmbauches from "./CandidatsEmbauches";
import RecruitmentForm from "./RecruitmentForm";
import EvaluationForm from "./EvaluationForm";
import AdminEvaluationCorrection from "./AdminEvaluationCorrection";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLogin from "./AdminLogin";
import WelcomePage from "./WelcomePage";
import ListeDépart from "./ListeDépart";

export default function QuestionnaireForm() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/form/:token" element={<RecruitmentForm />} />

        {/* Public Evaluation Route */}
        <Route path="/evaluation/:token" element={<EvaluationForm />} />
        <Route path="/evaluation" element={<EvaluationForm />} />

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
        <Route
          path="/hired"
          element={
            <ProtectedRoute>
              <CandidatsEmbauches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/liste-depart"
          element={
            <ProtectedRoute>
              <ListeDépart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluation/admin/:id"
          element={
            <ProtectedRoute>
              <AdminEvaluationCorrection />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
