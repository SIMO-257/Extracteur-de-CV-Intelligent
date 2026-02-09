import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import AdminLayout from "./AdminLayout";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isLoggedIn =
    typeof window !== "undefined" &&
    localStorage.getItem("isAdminLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

export default ProtectedRoute;

