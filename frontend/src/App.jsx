import { BrowserRouter, Route, Routes } from "react-router-dom";
import CVExtractor from "./CVExtractor";
import CandidatesList from "./CandidatesList";
import CandidatsRefuses from "./CandidatsRefuses";

export default function QuestionnaireForm() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CVExtractor />} />
        <Route path="/candidates" element={<CandidatesList />} />
        <Route path="/refused" element={<CandidatsRefuses />} />
      </Routes>
    </BrowserRouter>
  );
}
