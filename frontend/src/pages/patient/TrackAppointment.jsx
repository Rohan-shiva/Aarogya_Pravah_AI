import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import appointmentService from "../../services/appointmentService";
import socketService from "../../services/socketService";
import useSocket from "../../hooks/useSocket";

export const TrackAppointment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialToken = searchParams.get("token") || "";

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveAlert, setLiveAlert] = useState("");

  const searchToken = async (tokenToQuery) => {
    if (!tokenToQuery.trim()) return;
    setLoading(true);
    setError("");

    try {
      const response = await appointmentService.getAppointmentByToken(tokenToQuery);
      if (response.success && response.data) {
        setTokenData(response.data);
        // Subscribe to private Socket.IO patient room
        socketService.joinPatient(response.data.tokenNumber);
      } else {
        setError(response.message || "Token record not found. Please verify the code on your slip.");
        setTokenData(null);
      }
    } catch (err) {
      setError("Unable to retrieve queue status.");
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      searchToken(initialToken);
    }
  }, [initialToken]);

  // Real-time socket event listeners for patient room
  useSocket("patient_status_updated", (payload) => {
    if (tokenData && payload.tokenNumber === tokenData.tokenNumber) {
      searchToken(tokenData.tokenNumber);
      if (payload.message) {
        setLiveAlert(payload.message);
      }
    }
  });

  useSocket("patient_called", (payload) => {
    if (tokenData && payload.tokenNumber === tokenData.tokenNumber) {
      searchToken(tokenData.tokenNumber);
      setLiveAlert(`🔔 Doctor ${payload.doctorName || ""} is calling your token! Please proceed to ${payload.roomNumber || "the consultation room"}.`);
    }
  });

  useSocket("queue_updated", () => {
    if (tokenData) {
      searchToken(tokenData.tokenNumber);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      searchToken(tokenInput.trim());
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto p-margin-mobile md:p-margin-desktop py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-label-sm mb-3">
            <span className="material-symbols-outlined text-base">radar</span>
            Live Hospital Queue Tracker
          </div>
          <h1 className="font-headline-lg text-display-lg text-primary">Track Your Appointment</h1>
          <p className="font-body-lg text-on-surface-variant max-w-lg mx-auto mt-2">
            Enter your token number to view real-time queue position, triage stage, and estimated wait duration.
          </p>
        </div>

        {liveAlert && (
          <div className="mb-6 p-4 bg-primary-container text-on-primary-container rounded-xl border border-primary/30 flex items-center justify-between shadow-md animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary animate-bounce">campaign</span>
              <span className="font-body-md font-semibold text-sm">{liveAlert}</span>
            </div>
            <button onClick={() => setLiveAlert("")} className="text-on-primary-container hover:opacity-75">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-3.5 text-outline">search</span>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. EMG-20260822-4819 or TKN-042"
                className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded font-data-display text-on-surface text-lg uppercase focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-on-primary font-title-md px-8 py-3 rounded hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Searching..." : "Track Token"}
            </button>
          </div>
          {error && <p className="text-error text-sm font-body-md mt-2">{error}</p>}
        </form>

        {/* Live Token Status Card */}
        {tokenData && (
          <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-lg animate-fade-in-up">
            <div className="bg-primary text-on-primary px-6 py-4 flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-label-sm opacity-80">Active Patient Token</span>
                <h2 className="font-data-display text-2xl font-bold">{tokenData.tokenNumber}</h2>
              </div>
              <div className="flex items-center gap-2 bg-primary-container px-3 py-1 rounded-full text-xs font-label-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live Socket Stream</span>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <p className="text-xs font-label-sm text-secondary uppercase mb-1">Queue Position</p>
                  <p className="font-display-lg text-display-lg text-primary">{tokenData.queuePosition || "#--"}</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <p className="text-xs font-label-sm text-secondary uppercase mb-1">Estimated Wait</p>
                  <p className="font-display-lg text-display-lg text-on-surface">{tokenData.estimatedWaitTime || "Calculating..."}</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <p className="text-xs font-label-sm text-secondary uppercase mb-1">Department</p>
                  <p className="font-title-md text-title-md text-on-surface font-semibold mt-2">{tokenData.department || "General Medicine"}</p>
                </div>
              </div>

              {tokenData.isPending && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-base">pause_circle</span>
                    <span>Consultation Temporarily on Hold</span>
                  </div>
                  <p className="mt-1 text-xs">{tokenData.pendingReason || "Awaiting laboratory or radiological scan results. You will be prioritized when ready."}</p>
                </div>
              )}

              {/* Progress Steps */}
              <div className="border-t border-outline-variant pt-6">
                <h3 className="text-label-sm font-label-sm uppercase text-secondary mb-4">Triage Progression</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">check</span>
                    </div>
                    <div>
                      <p className="font-body-md font-semibold text-on-surface">1. Patient Details Intake</p>
                      <p className="text-xs text-on-surface-variant">Completed & Token Generated</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tokenData.rawStatus === "PENDING_STAFF_VERIFICATION"
                        ? "bg-primary text-white animate-pulse"
                        : "bg-emerald-600 text-white"
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {tokenData.rawStatus === "PENDING_STAFF_VERIFICATION" ? "hourglass_top" : "check"}
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md font-semibold text-primary">2. Clinical Staff Verification & AI Triage</p>
                      <p className="text-xs text-on-surface-variant">Current Status: {tokenData.status}</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 ${
                    tokenData.rawStatus === "IN_CONSULTATION" || tokenData.rawStatus === "COMPLETED" ? "opacity-100" : "opacity-50"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tokenData.rawStatus === "COMPLETED"
                        ? "bg-emerald-600 text-white"
                        : tokenData.rawStatus === "IN_CONSULTATION"
                        ? "bg-primary text-white animate-pulse"
                        : "bg-surface-container-highest text-on-surface"
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {tokenData.rawStatus === "COMPLETED" ? "check" : "stethoscope"}
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md font-semibold text-on-surface">3. Doctor Consultation</p>
                      <p className="text-xs text-on-surface-variant">
                        {tokenData.rawStatus === "COMPLETED"
                          ? "Consultation completed"
                          : tokenData.rawStatus === "IN_CONSULTATION"
                          ? "Doctor is currently consulting with you"
                          : "Prioritized in dynamic AI queue"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-outline-variant">
                <button
                  onClick={() => navigate(`/token/${tokenData.tokenNumber}`)}
                  className="px-6 py-2 bg-primary text-on-primary rounded font-label-sm text-sm hover:bg-on-primary-fixed-variant transition-colors"
                >
                  Open Full Token Card
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TrackAppointment;
