import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import ImageModal from "../../components/ImageModal";
import staffService from "../../services/staffService";
import socketService from "../../services/socketService";
import useSocket from "../../hooks/useSocket";

export const StaffValidation = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("HIGH");
  const [verificationNotes, setVerificationNotes] = useState("");

  const loadData = async () => {
    try {
      const [patientsRes, notifsRes] = await Promise.all([
        staffService.getPendingPatients(),
        staffService.getNotifications()
      ]);

      if (patientsRes.success && patientsRes.data) {
        setPatients(patientsRes.data);
        if (patientsRes.data.length > 0) {
          setSelectedPatient(patientsRes.data[0]);
          setSelectedSeverity(patientsRes.data[0].reportedSeverity || "HIGH");
        }
      }

      if (notifsRes.success && notifsRes.data) {
        setNotifications(notifsRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    socketService.joinStaff();
    loadData();
  }, []);

  // Sync selectedSeverity when active patient changes
  useEffect(() => {
    if (selectedPatient) {
      setSelectedSeverity(selectedPatient.reportedSeverity || "HIGH");
      setVerificationNotes(`Staff verified intake symptoms: ${selectedPatient.symptoms}`);
    }
  }, [selectedPatient?.id]);

  // Listen for real-time appointments arriving
  useSocket("new_patient", (payload) => {
    const appt = payload.appointment || payload;
    const dept = appt.department || "General Medicine";
    const token = appt.tokenNumber || "New Token";

    setNotifications((prev) => [
      {
        id: "notif-" + Date.now(),
        type: "new_request",
        title: `New Patient Intake: ${dept}`,
        message: `Token #${token} just registered for check-in.`,
        time: "Just now",
        unread: true
      },
      ...prev
    ]);

    // Refresh pending verifications list
    loadData();
  });

  const handleValidate = async () => {
    if (!selectedPatient) return;
    try {
      const result = await staffService.validatePatient(selectedPatient.id, {
        staffSeverity: selectedSeverity,
        verificationNotes,
        isAccident: selectedPatient.isAccidentalCase,
        accidentSeverity: selectedPatient.accidentSeverity,
        department: selectedPatient.department
      });

      if (result.success) {
        const priorityScore = result.data?.queueEntry?.priorityScore || result.data?.priorityResult?.priorityScore || 85;
        const urgencyLevel = result.data?.aiAnalysis?.urgencyLevel || selectedSeverity;

        setActionSuccess(
          `✓ Patient ${selectedPatient.fullName} (${selectedPatient.tokenNumber}) verified! Groq AI Score: ${priorityScore}/100 (${urgencyLevel}). Placed in dynamic priority queue.`
        );

        // Advance to next patient
        const remaining = patients.filter((p) => p.id !== selectedPatient.id);
        setPatients(remaining);
        setSelectedPatient(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHold = async () => {
    if (!selectedPatient) return;
    try {
      const res = await staffService.holdPatient(selectedPatient.id, "Please visit counter with ID and past medical documentation");
      if (res.success) {
        setActionSuccess(`Patient ${selectedPatient.fullName} flagged for front-desk clarification.`);
        const remaining = patients.filter((p) => p.id !== selectedPatient.id);
        setPatients(remaining);
        setSelectedPatient(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!selectedPatient) return;
    try {
      const res = await staffService.rejectPatient(selectedPatient.id, "Duplicate booking or invalid patient verification");
      if (res.success) {
        setActionSuccess(`Patient ${selectedPatient.fullName} appointment cancelled.`);
        const remaining = patients.filter((p) => p.id !== selectedPatient.id);
        setPatients(remaining);
        setSelectedPatient(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex h-screen overflow-hidden">
      {/* SideNavBar */}
      <Sidebar activeSection="validation" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden md:ml-64">
        {/* TopAppBar Mobile */}
        <header className="md:hidden flex justify-between items-center w-full px-margin-mobile h-16 bg-surface border-b border-outline-variant flex-shrink-0">
          <h1 className="text-title-md font-headline-lg font-bold text-primary">Aarogya Pravah AI</h1>
          <div className="flex items-center gap-4">
            <button className="text-on-surface-variant">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link to="/staff/profile" className="text-on-surface-variant">
              <span className="material-symbols-outlined">account_circle</span>
            </Link>
          </div>
        </header>

        {/* Action feedback toast */}
        {actionSuccess && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-sm flex items-center justify-between shadow-md animate-fade-in-up">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess("")} className="text-white hover:opacity-80">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-gutter">
          <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full">
            {/* Left Column: Notifications & Pending Validation List */}
            <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6 h-full">
              {/* Real-time Notifications */}
              <section className="bg-surface border border-outline-variant rounded-xl flex flex-col flex-shrink-0 shadow-sm">
                <div className="px-5 py-3.5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
                  <h2 className="text-title-md font-title-md text-on-surface font-semibold text-sm">Live Feed</h2>
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto max-h-[170px]">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`rounded-lg p-3 flex gap-3 items-start ${
                        notif.unread ? "bg-surface-container animate-fade-in-up" : "opacity-75"
                      }`}
                    >
                      <span className="material-symbols-outlined text-primary mt-0.5 text-lg">
                        {notif.type === "new_request" ? "add_alert" : notif.type === "ai_alert" ? "warning" : "update"}
                      </span>
                      <div>
                        <p className="text-body-md font-semibold text-on-surface text-xs">{notif.title}</p>
                        <p className="text-label-sm text-on-surface-variant text-[11px] mt-0.5">{notif.message}</p>
                        <p className="text-[9px] text-outline mt-1 uppercase tracking-wider">{notif.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pending Validation List */}
              <section className="bg-surface border border-outline-variant rounded-xl flex flex-col flex-1 overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-outline-variant bg-surface-container-low rounded-t-xl flex justify-between items-center">
                  <h2 className="text-title-md font-title-md text-on-surface font-semibold text-sm">
                    Pending Validation
                  </h2>
                  <span className="bg-primary-container text-on-primary-container text-label-sm text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {patients.length} waiting
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {patients.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant text-sm">
                      <span className="material-symbols-outlined text-4xl text-outline mb-2">done_all</span>
                      <p>All pending patients have been validated!</p>
                    </div>
                  ) : (
                    patients.map((patient) => {
                      const isSelected = selectedPatient?.id === patient.id;
                      const isHigh = patient.reportedSeverity === "HIGH" || patient.reportedSeverity === "High" || patient.reportedSeverity === "CRITICAL";
                      const isMedium = patient.reportedSeverity === "MEDIUM" || patient.reportedSeverity === "Medium";

                      return (
                        <div
                          key={patient.id}
                          onClick={() => setSelectedPatient(patient)}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? "bg-surface-container-high border-l-4 border-primary shadow-sm"
                              : "bg-surface hover:bg-surface-container-low border border-transparent hover:border-outline-variant"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-data-display font-data-display text-primary font-bold text-sm">
                              #{patient.tokenNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                                isHigh
                                  ? "bg-error-container text-on-error-container"
                                  : isMedium
                                  ? "bg-surface-variant text-on-surface-variant"
                                  : "bg-surface-container text-on-surface"
                              }`}
                            >
                              {patient.reportedSeverity || "Normal"}
                            </span>
                          </div>
                          <h3 className="font-title-md text-body-lg text-on-surface font-semibold mb-0.5">
                            {patient.fullName}
                          </h3>
                          <p className="text-body-md text-xs text-on-surface-variant truncate">{patient.symptoms}</p>
                          <p className="text-label-sm text-secondary text-xs mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {patient.waitTime}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Detail / Validation Canvas */}
            <div className="lg:col-span-8 xl:col-span-8 bg-surface border border-outline-variant rounded-xl flex flex-col h-full shadow-sm relative overflow-hidden">
              {selectedPatient ? (
                <>
                  {/* Top Action Bar */}
                  <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <h2 className="text-headline-lg font-headline-lg text-on-surface text-xl font-bold">
                        Patient Details
                      </h2>
                      <span className="bg-secondary-container text-on-secondary-container text-label-sm text-xs px-3 py-1 rounded-full font-medium">
                        Validating Intake
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-label-sm text-secondary text-[11px] uppercase tracking-wider">Token Number</p>
                      <p className="text-data-display font-data-display text-primary text-xl font-bold">
                        {selectedPatient.tokenNumber}
                      </p>
                    </div>
                  </div>

                  {/* Scrollable Canvas Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-bright">
                    {/* Basic Info Bento Box */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-surface border border-outline-variant rounded-lg p-5 col-span-2 shadow-sm">
                        <h3 className="text-label-sm text-secondary uppercase text-xs mb-3 flex items-center gap-2 font-bold">
                          <span className="material-symbols-outlined text-[16px]">person</span> Basic Info
                        </h3>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                          <div>
                            <p className="text-label-sm text-outline text-xs">Full Name</p>
                            <p className="text-body-lg font-semibold text-on-surface mt-0.5">
                              {selectedPatient.fullName}
                            </p>
                          </div>
                          <div>
                            <p className="text-label-sm text-outline text-xs">Department</p>
                            <p className="text-body-lg font-semibold text-on-surface mt-0.5">
                              {selectedPatient.department}
                            </p>
                          </div>
                          <div>
                            <p className="text-label-sm text-outline text-xs">Contact</p>
                            <p className="text-body-lg text-on-surface mt-0.5">{selectedPatient.contact}</p>
                          </div>
                          <div>
                            <p className="text-label-sm text-outline text-xs">Arrival Time</p>
                            <p className="text-body-lg text-on-surface mt-0.5">{selectedPatient.arrivalTime}</p>
                          </div>
                        </div>
                      </div>

                      {/* Severity / Accidental Case Card */}
                      <div
                        className={`border rounded-lg p-5 flex flex-col justify-center items-center text-center shadow-sm ${
                          selectedPatient.isAccidentalCase
                            ? "bg-error-container border-error/30"
                            : "bg-surface-container-low border-outline-variant"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[32px] mb-1 ${
                            selectedPatient.isAccidentalCase ? "text-error" : "text-primary"
                          }`}
                        >
                          {selectedPatient.isAccidentalCase ? "emergency" : "verified"}
                        </span>
                        <h3
                          className={`text-title-md font-title-md font-bold text-sm ${
                            selectedPatient.isAccidentalCase ? "text-on-error-container" : "text-on-surface"
                          }`}
                        >
                          {selectedPatient.reportedSeverity} Severity
                        </h3>
                        <p
                          className={`text-body-md text-xs mt-1 ${
                            selectedPatient.isAccidentalCase ? "text-on-error-container opacity-90" : "text-on-surface-variant"
                          }`}
                        >
                          {selectedPatient.isAccidentalCase ? "Reported Accidental Case" : "Standard Walk-in Consultation"}
                        </p>
                      </div>
                    </div>

                    {/* Reported Symptoms & AI Preliminary Extraction */}
                    <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                      <h3 className="text-label-sm text-secondary uppercase text-xs flex items-center gap-2 font-bold">
                        <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                        Reported Symptoms & Findings
                      </h3>

                      <div>
                        <label className="block text-label-sm text-outline text-xs mb-1">Patient Reported Symptoms</label>
                        <div className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-sm text-on-surface">
                          {selectedPatient.symptoms}
                        </div>
                      </div>

                      {/* Clinical Staff Severity Override Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-label-sm text-secondary text-xs mb-1 font-semibold">
                            Staff Clinical Severity Assessment
                          </label>
                          <select
                            value={selectedSeverity}
                            onChange={(e) => setSelectedSeverity(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-on-surface font-body-md"
                          >
                            <option value="CRITICAL">CRITICAL (Emergency Life-Threatening)</option>
                            <option value="HIGH">HIGH (Acute Symptoms / Urgent Review)</option>
                            <option value="MEDIUM">MEDIUM (Moderate Symptoms)</option>
                            <option value="LOW">LOW (Mild / Routine)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-label-sm text-secondary text-xs mb-1 font-semibold">
                            Staff Verification Notes
                          </label>
                          <input
                            type="text"
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            placeholder="Clinical observations or vitals check..."
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-on-surface font-body-md"
                          />
                        </div>
                      </div>

                      {/* AI Preliminary Box with Clinical Blue Overlay */}
                      <div className="p-4 bg-[#F0F7FF] border border-primary-fixed-dim rounded-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                          <span className="material-symbols-outlined text-[64px] text-primary">smart_toy</span>
                        </div>
                        <h4 className="text-label-sm text-primary uppercase font-bold text-xs mb-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                          AI Preliminary Triage Support (Groq LLaMA 3.3 Engine)
                        </h4>
                        <p className="text-[11px] text-primary opacity-80 mb-3 italic">
                          AI-generated decision support — not a medical diagnosis.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                          <div>
                            <label className="block text-label-sm text-primary opacity-80 text-xs mb-1">
                              Self-Reported / Preliminary Condition
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={selectedPatient.possibleCondition || selectedPatient.aiPreliminary?.suggestedDisease || "Assessment in progress"}
                              className="w-full bg-transparent border-b border-primary-fixed-dim text-body-md text-on-surface font-semibold focus:outline-none focus:border-primary px-1 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-label-sm text-primary opacity-80 text-xs mb-1">
                              Preliminary Risk Assessment
                            </label>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-body-md font-data-display font-bold text-primary text-base">
                                Dynamic Priority Queue Ready
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded Attachments / X-Ray */}
                    <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm">
                      <h3 className="text-label-sm text-secondary uppercase text-xs mb-4 flex items-center gap-2 font-bold">
                        <span className="material-symbols-outlined text-[16px]">radiology</span> Uploaded Attachments
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        {selectedPatient.attachments && selectedPatient.attachments.length > 0 ? (
                          selectedPatient.attachments.map((att) => (
                            <div
                              key={att.id}
                              onClick={() => setModalImage(att.url)}
                              className="w-44 h-44 bg-surface-container border border-outline-variant rounded-lg overflow-hidden relative group cursor-pointer shadow-sm"
                            >
                              <img
                                src={att.url}
                                alt={att.fileName}
                                className="w-full h-full object-cover grayscale mix-blend-multiply opacity-80 group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-inverse-surface/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white text-[32px]">zoom_in</span>
                              </div>
                              <div className="absolute bottom-0 left-0 w-full bg-surface/90 p-1.5 text-center text-label-sm text-xs text-on-surface font-medium truncate">
                                {att.fileName}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-on-surface-variant py-4">No attachments uploaded by patient.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="p-4 md:p-6 border-t border-outline-variant bg-surface flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
                    <button
                      onClick={handleReject}
                      className="px-5 py-2.5 border border-error text-error rounded-lg font-medium hover:bg-error-container/20 transition-colors flex items-center gap-2 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">cancel</span> Reject
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={handleHold}
                        className="px-5 py-2.5 border border-primary text-primary rounded-lg font-medium hover:bg-surface-container-low transition-colors text-sm"
                      >
                        Request Clarification
                      </button>
                      <button
                        onClick={handleValidate}
                        className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-medium shadow-sm hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-2 text-sm"
                      >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Verify & Trigger AI Triage
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl text-outline mb-2">how_to_reg</span>
                  <h3 className="font-title-md text-on-surface">No Patient Selected</h3>
                  <p className="text-sm mt-1">Select a pending patient from the list on the left to begin validation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox Image Modal */}
      <ImageModal
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        imageUrl={modalImage}
        title={`Radiology Scan - ${selectedPatient?.fullName || "Patient"}`}
      />
    </div>
  );
};

export default StaffValidation;
