import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loading from "./Loading";

export const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading text="Verifying clinical credentials..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole) {
    const userRole = user?.role?.toLowerCase();
    const targetRole = allowedRole.toLowerCase();

    // Support staff role normalization
    const matchesStaff = targetRole === "staff" && (userRole === "staff" || userRole === "support" || userRole === "nurse");
    const matchesDoctor = targetRole === "doctor" && (userRole === "doctor" || userRole === "physician");

    if (!matchesStaff && !matchesDoctor && userRole !== targetRole) {
      // Redirect to appropriate dashboard based on actual role
      if (userRole === "doctor") {
        return <Navigate to="/doctor/dashboard" replace />;
      }
      return <Navigate to="/staff/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
