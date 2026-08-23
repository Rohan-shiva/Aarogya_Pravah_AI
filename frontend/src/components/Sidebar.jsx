import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export const Sidebar = ({ activeSection = "dashboard" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isDoctor = user?.role?.toLowerCase() === "doctor";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-outline-variant h-screen fixed left-0 top-0 z-40 py-6 space-y-2 flex-shrink-0">
      {/* Brand Header */}
      <div className="px-6 pb-6 border-b border-outline-variant mb-2">
        <Link to="/" className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_hospital
            </span>
          </div>
          <div>
            <h2 className="text-title-md font-headline-lg font-bold text-primary truncate">Aarogya Pravah AI</h2>
            <p className="text-label-sm font-label-sm text-secondary uppercase">
              {isDoctor ? "Doctor Portal" : "Staff Portal"}
            </p>
          </div>
        </Link>

        {/* Status indicator */}
        <div className="mt-3 bg-surface-container-low border border-outline-variant/60 py-1.5 px-3 rounded text-xs flex items-center justify-between">
          <span className="text-on-surface-variant font-medium truncate max-w-[130px]">{user?.name || "Dr. Mehta"}</span>
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold font-label-sm text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3">
        {isDoctor ? (
          <>
            <Link
              to="/doctor/dashboard"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/doctor/dashboard" && !location.search.includes("tab=pending")
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">stethoscope</span>
              <span>Doctor Dashboard</span>
            </Link>

            <Link
              to="/doctor/dashboard?tab=priority"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/doctor/dashboard" && location.search.includes("tab=priority")
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">queue</span>
              <span>Waiting Queue</span>
            </Link>

            <Link
              to="/doctor/dashboard?tab=pending"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/doctor/dashboard" && location.search.includes("tab=pending")
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">hourglass_top</span>
              <span>Pending Queue</span>
            </Link>

            <Link
              to="/patient-history"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/patient-history"
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">folder_shared</span>
              <span>Patient History</span>
            </Link>

            <Link
              to="/triage-queue"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/triage-queue"
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">dashboard</span>
              <span>Hospital Queue</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/staff/validation"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/staff/validation" || location.pathname === "/staff/dashboard"
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">how_to_reg</span>
              <span>Validation Queue</span>
            </Link>
            <Link
              to="/triage-queue"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/triage-queue"
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">clinical_notes</span>
              <span>Live Queue</span>
            </Link>
            <Link
              to="/patient-history"
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
                location.pathname === "/patient-history"
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-xl">person_search</span>
              <span>Patient History</span>
            </Link>
          </>
        )}

        <Link
          to="/ai-insights"
          className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
            location.pathname === "/ai-insights"
              ? "bg-secondary-container text-on-secondary-container font-semibold"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <span className="material-symbols-outlined text-xl">psychology</span>
          <span>AI Insights</span>
        </Link>

        <Link
          to="/staff/profile"
          className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all text-body-md text-sm ${
            location.pathname === "/staff/profile"
              ? "bg-secondary-container text-on-secondary-container font-semibold"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <span className="material-symbols-outlined text-xl">account_circle</span>
          <span>Profile & Settings</span>
        </Link>
      </div>

      {/* Footer Navigation */}
      <div className="px-3 pt-4 border-t border-outline-variant space-y-1">
        <Link
          to="/"
          className="flex items-center space-x-3 px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-all text-body-md text-xs"
        >
          <span className="material-symbols-outlined text-base">home</span>
          <span>Public Portal</span>
        </Link>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="w-full flex items-center space-x-3 px-4 py-2 rounded-full text-error hover:bg-error-container/20 transition-all text-body-md text-xs text-left"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
