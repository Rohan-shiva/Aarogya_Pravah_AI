import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Patient Pages
import PatientPortal from "./pages/patient/PatientPortal";
import NewAppointment from "./pages/patient/NewAppointment";
import TrackAppointment from "./pages/patient/TrackAppointment";
import TokenDetails from "./pages/patient/TokenDetails";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Staff Pages
import StaffLogin from "./pages/staff/StaffLogin";
import StaffRegister from "./pages/staff/StaffRegister";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffValidation from "./pages/staff/StaffValidation";
import StaffProfile from "./pages/staff/StaffProfile";

// Doctor Pages
import DoctorLogin from "./pages/doctor/DoctorLogin";
import DoctorRegister from "./pages/doctor/DoctorRegister";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorPatientDetails from "./pages/doctor/DoctorPatientDetails";

// Shared Pages
import ResetPassword from "./pages/shared/ResetPassword";
import PatientHistory from "./pages/shared/PatientHistory";
import TriageQueue from "./pages/shared/TriageQueue";
import AIInsights from "./pages/shared/AIInsights";

// Route Guard
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public Patient Flow */}
      <Route path="/" element={<PatientPortal />} />
      <Route path="/appointment/new" element={<NewAppointment />} />
      <Route path="/track-appointment" element={<TrackAppointment />} />
      <Route path="/token/:tokenNumber" element={<TokenDetails />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Staff Flow */}
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff/register" element={<StaffRegister />} />
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute allowedRole="staff">
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/validation"
        element={
          <ProtectedRoute allowedRole="staff">
            <StaffValidation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/profile"
        element={
          <ProtectedRoute>
            <StaffProfile />
          </ProtectedRoute>
        }
      />

      {/* Doctor Flow */}
      <Route path="/doctor/login" element={<DoctorLogin />} />
      <Route path="/doctor/register" element={<DoctorRegister />} />
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/patient/:patientId"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorPatientDetails />
          </ProtectedRoute>
        }
      />

      {/* Shared Clinical Flow */}
      <Route path="/patient-history" element={<PatientHistory />} />
      <Route path="/patient-history/:patientId" element={<PatientHistory />} />
      <Route path="/triage-queue" element={<TriageQueue />} />
      <Route path="/ai-insights" element={<AIInsights />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
