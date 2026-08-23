import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import ImageModal from "../../components/ImageModal";
import doctorService from "../../services/doctorService";
import socketService from "../../services/socketService";
import useSocket from "../../hooks/useSocket";
import useAuth from "../../hooks/useAuth";

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view tab: 'waiting', 'pending', or 'completed'
  const initialTab = searchParams.get("tab") === "pending" ? "pending" : "waiting";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Queues & metrics
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [completedConsultations, setCompletedConsultations] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(user?.department || "General Medicine");
  const [loading, setLoading] = useState(true);
  const [actionAlert, setActionAlert] = useState("");

  // Modals & Active Consultation State
  const [inspectPatient, setInspectPatient] = useState(null);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [holdModalPatient, setHoldModalPatient] = useState(null);
  const [holdReason, setHoldReason] = useState("Additional test required (Lab/Blood test)");
  const [holdCategory, setHoldCategory] = useState("LAB_TEST");
  const [holdNotes, setHoldNotes] = useState("");
  const [modalImage, setModalImage] = useState(null);

  // Consultation form fields
  const [consultNotes, setConsultNotes] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [rxPrescription, setRxPrescription] = useState("");
  const [vitals, setVitals] = useState({
    bloodPressure: "120/80",
    heartRate: "76",
    temperature: "98.6",
    oxygenSaturation: "99"
  });
  const [consultTimer, setConsultTimer] = useState(0);
  const timerRef = useRef(null);

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pending") {
      setActiveTab("pending");
    } else if (tabParam === "priority" || tabParam === "waiting") {
      setActiveTab("waiting");
    }
  }, [searchParams]);

  // Consultation timer
  useEffect(() => {
    if (activeConsultation) {
      setConsultTimer(0);
      timerRef.current = setInterval(() => {
        setConsultTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setConsultTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeConsultation]);

  // Fetch all queues
  const fetchDoctorData = async () => {
    try {
      const [qRes, pRes, hRes] = await Promise.all([
        doctorService.getPriorityQueue(selectedDepartment),
        doctorService.getPendingQueue(selectedDepartment),
        doctorService.getDoctorHistory()
      ]);

      if (qRes.success && qRes.data) {
        setPriorityQueue(qRes.data);
      }
      if (pRes.success && pRes.data) {
        setPendingQueue(pRes.data);
      }
      if (hRes.success && hRes.consultations) {
        setCompletedConsultations(hRes.consultations);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    socketService.joinDoctor(user?.id || user?._id || "");
    if (selectedDepartment) {
      socketService.joinDepartment(selectedDepartment);
    }
    fetchDoctorData();
  }, [selectedDepartment, user]);

  // Real-time socket event listeners
  useSocket("patient_verified", () => {
    fetchDoctorData();
    setActionAlert("New patient verified & prioritized by clinical triage!");
  });

  useSocket("priority_updated", () => {
    fetchDoctorData();
  });

  useSocket("queue_updated", () => {
    fetchDoctorData();
  });

  useSocket("patient_on_hold", () => {
    fetchDoctorData();
  });

  useSocket("patient_completed", () => {
    fetchDoctorData();
  });

  useSocket("patient_called", () => {
    fetchDoctorData();
  });

  // Action: Open Patient Details
  const handleViewPatient = async (patient) => {
    try {
      const res = await doctorService.getPatientDetails(patient.appointmentId || patient.id);
      if (res.success && res.data) {
        setInspectPatient(res.data);
      } else {
        setInspectPatient(patient);
      }
    } catch {
      setInspectPatient(patient);
    }
  };

  // Action: Start Consultation
  const handleStartConsultation = async (patient) => {
    try {
      if (patient.queueEntryId) {
        await doctorService.startConsultation(patient.queueEntryId);
      }
      setActiveConsultation(patient);
      setInspectPatient(null);
      setConsultNotes(patient.symptoms ? `Patient evaluated for: ${patient.symptoms}.` : "");
      setDiagnosisNotes("");
      setRxPrescription("");
      setActionAlert(`Consultation started with ${patient.fullName || "Patient"} (${patient.tokenNumber}).`);
      fetchDoctorData();
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Finalize Complete Consultation
  const handleFinishConsultation = async () => {
    if (!activeConsultation) return;

    try {
      const queueId = activeConsultation.queueEntryId || activeConsultation.id;
      const res = await doctorService.completeAppointment(queueId, {
        clinicalNotes: consultNotes || "Consultation finalized and clinical review completed.",
        diagnosisNotes: diagnosisNotes || "Clinical evaluation confirmed.",
        vitals: {
          bloodPressure: vitals.bloodPressure,
          heartRate: parseInt(vitals.heartRate, 10) || 76,
          temperature: parseFloat(vitals.temperature) || 98.6,
          oxygenSaturation: parseInt(vitals.oxygenSaturation, 10) || 99
        },
        prescriptions: rxPrescription ? [
          {
            medicationName: rxPrescription,
            dosage: "As prescribed",
            frequency: "Daily",
            durationDays: 5,
            instructions: "Take after meals"
          }
        ] : []
      });

      if (res.success) {
        setActionAlert(`✓ Consultation for ${activeConsultation.fullName} completed.`);
        setActiveConsultation(null);
        fetchDoctorData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Open Hold Modal
  const handleOpenHoldModal = (patient) => {
    setHoldModalPatient(patient);
    setHoldReason("Additional test required (Lab/Blood test)");
    setHoldCategory("LAB_TEST");
    setHoldNotes("");
  };

  // Action: Confirm Put Patient on Hold
  const handleConfirmHold = async () => {
    if (!holdModalPatient) return;
    try {
      const queueId = holdModalPatient.queueEntryId || holdModalPatient.id;
      const res = await doctorService.holdPatientForDoctor(queueId, {
        reason: holdReason,
        category: holdCategory,
        notes: holdNotes
      });

      if (res.success) {
        setActionAlert(`Patient ${holdModalPatient.fullName} moved to Pending Queue (${holdReason}).`);
        setHoldModalPatient(null);
        if (activeConsultation && (activeConsultation.id === holdModalPatient.id || activeConsultation.queueEntryId === holdModalPatient.queueEntryId)) {
          setActiveConsultation(null);
        }
        fetchDoctorData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Resume Patient from Hold
  const handleResumePatient = async (patient) => {
    try {
      const queueId = patient.queueEntryId || patient.id;
      const res = await doctorService.resumePatient(queueId);
      if (res.success) {
        setActionAlert(`✓ Patient ${patient.fullName} returned to Waiting Queue with +35 Priority Boost!`);
        fetchDoctorData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Workload Counts
  const waitingCount = priorityQueue.filter((p) => p.status === "Waiting" || p.rawStatus === "WAITING").length;
  const highPriorityCount = priorityQueue.filter((p) => (p.priorityScore || 0) >= 70 || p.priorityLevel === "CRITICAL" || p.priorityLevel === "HIGH").length;
  const inConsultCount = priorityQueue.filter((p) => p.status === "In Consultation" || p.rawStatus === "IN_CONSULTATION").length;
  const pendingCount = pendingQueue.length;
  const completedTodayCount = completedConsultations.length;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="antialiased min-h-screen flex flex-col md:flex-row bg-background font-body-md w-full max-w-full overflow-x-hidden">
      {/* Desktop Doctor Sidebar */}
      <Sidebar activeSection="doctor_queue" />

      {/* Mobile Top Bar */}
      <header className="md:hidden flex justify-between items-center bg-surface border-b border-outline-variant px-4 py-3 sticky top-0 z-40 w-full">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-2xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            local_hospital
          </span>
          <h1 className="text-base font-bold text-primary">Aarogya Pravah AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary-fixed text-primary px-2 py-0.5 rounded font-bold">Doctor Portal</span>
          <Link to="/staff/profile" className="text-on-surface-variant p-1">
            <span className="material-symbols-outlined text-xl">account_circle</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 md:p-8 max-w-container-max mx-auto w-full pb-24 md:pb-8 min-w-0">
        {/* Action feedback banner */}
        {actionAlert && (
          <div className="mb-4 p-3 bg-primary text-on-primary rounded-lg text-sm flex items-center justify-between shadow-md animate-fade-in-up">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">verified</span>
              <span className="font-medium">{actionAlert}</span>
            </div>
            <button onClick={() => setActionAlert("")} className="text-on-primary hover:opacity-80">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* 1. Doctor Header */}
        <div className="bg-surface border border-outline-variant rounded-xl p-5 sm:p-6 shadow-sm mb-6 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">stethoscope</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface">
                  {user?.name || "Dr. Arjun Mehta, MD"}
                </h2>
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Available • On Duty
                </span>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                {user?.specialization || "Emergency Medicine & Trauma Specialist"} • {user?.department || selectedDepartment}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg text-xs">
              <span className="text-secondary font-semibold">Department:</span>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-transparent font-bold text-primary focus:outline-none cursor-pointer"
              >
                <option value="Emergency">Emergency</option>
                <option value="Cardiology">Cardiology</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Neurology">Neurology</option>
              </select>
            </div>

            <button
              onClick={() => fetchDoctorData()}
              className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
              title="Refresh Live Queue"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>
        </div>

        {/* 2. Workload Summary Metric Cards (5 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {/* Waiting Now */}
          <div
            onClick={() => {
              setActiveTab("waiting");
              setSearchParams({ tab: "waiting" });
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === "waiting"
                ? "bg-surface border-primary ring-2 ring-primary/20 shadow-sm"
                : "bg-surface border-outline-variant hover:border-primary"
            }`}
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-label-sm text-secondary uppercase font-semibold">Waiting Now</p>
              <span className="material-symbols-outlined text-primary text-xl">groups</span>
            </div>
            <p className="text-2xl font-bold font-headline-lg text-primary mt-2">{waitingCount}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Awaiting consult</p>
          </div>

          {/* High Priority */}
          <div className="p-4 rounded-xl border border-error/30 bg-error-container/40">
            <div className="flex justify-between items-start">
              <p className="text-xs font-label-sm text-error uppercase font-bold">High Priority</p>
              <span className="material-symbols-outlined text-error text-xl">warning</span>
            </div>
            <p className="text-2xl font-bold font-headline-lg text-error mt-2">{highPriorityCount}</p>
            <p className="text-[11px] text-error/80 mt-0.5">Score &ge; 70 pts</p>
          </div>

          {/* In Consultation */}
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50">
            <div className="flex justify-between items-start">
              <p className="text-xs font-label-sm text-emerald-800 uppercase font-bold">In Consult</p>
              <span className="material-symbols-outlined text-emerald-700 text-xl">medical_services</span>
            </div>
            <p className="text-2xl font-bold font-headline-lg text-emerald-800 mt-2">{inConsultCount}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Active session</p>
          </div>

          {/* Pending / On Hold */}
          <div
            onClick={() => {
              setActiveTab("pending");
              setSearchParams({ tab: "pending" });
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                : "bg-surface border-outline-variant hover:border-amber-500"
            }`}
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-label-sm text-amber-800 uppercase font-semibold">Pending Hold</p>
              <span className="material-symbols-outlined text-amber-700 text-xl">hourglass_top</span>
            </div>
            <p className="text-2xl font-bold font-headline-lg text-amber-900 mt-2">{pendingCount}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Labs & scans</p>
          </div>

          {/* Completed Today */}
          <div
            onClick={() => {
              setActiveTab("completed");
              setSearchParams({ tab: "completed" });
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-surface border-primary ring-2 ring-primary/20 shadow-sm"
                : "bg-surface border-outline-variant hover:border-primary"
            }`}
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-label-sm text-secondary uppercase font-semibold">Completed</p>
              <span className="material-symbols-outlined text-primary text-xl">task_alt</span>
            </div>
            <p className="text-2xl font-bold font-headline-lg text-on-surface mt-2">{completedTodayCount}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Finalized visits</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-outline-variant mb-6 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab("waiting");
              setSearchParams({ tab: "waiting" });
            }}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "waiting"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg">queue</span>
            <span>Smart Waiting Queue ({priorityQueue.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("pending");
              setSearchParams({ tab: "pending" });
            }}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "pending"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg">hourglass_empty</span>
            <span>Pending Queue ({pendingQueue.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("completed");
              setSearchParams({ tab: "completed" });
            }}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "completed"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg">history</span>
            <span>Completed Consultations ({completedConsultations.length})</span>
          </button>
        </div>

        {/* 3. Prioritized Smart Waiting Queue */}
        {activeTab === "waiting" && (
          <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-on-surface text-base">Prioritized Consultation Queue</h3>
                <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded font-bold">
                  {priorityQueue.length} Patients
                </span>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-1 font-label-sm">
                <span className="material-symbols-outlined text-sm text-primary">auto_graph</span>
                Multi-Factor Priority Sorting Active (Dynamic Starvation-Preventing Engine)
              </p>
            </div>

            <div className="divide-y divide-outline-variant">
              {priorityQueue.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">check_circle</span>
                  <p className="font-medium text-base">No patients currently waiting in {selectedDepartment}.</p>
                  <p className="text-xs text-outline mt-1">New staff-verified triage patients will appear here in real-time.</p>
                </div>
              ) : (
                priorityQueue.map((patient) => {
                  const score = patient.priorityScore || 50;
                  const isCritical = score >= 80 || patient.priorityLevel === "CRITICAL";
                  const isHigh = score >= 70 && score < 80;
                  const isConsulting = patient.status === "In Consultation" || patient.rawStatus === "IN_CONSULTATION";
                  const ai = patient.aiAssessment || {};
                  const img = patient.imageScreening;

                  return (
                    <div
                      key={patient.id || patient.tokenNumber}
                      className={`p-5 transition-colors ${
                        isConsulting
                          ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                          : isCritical
                          ? "bg-error-container/10 border-l-4 border-error hover:bg-error-container/20"
                          : isHigh
                          ? "bg-amber-50/50 border-l-4 border-amber-500 hover:bg-amber-50"
                          : "border-l-4 border-transparent hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Patient Core Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded text-xs font-bold font-label-sm uppercase flex items-center gap-1 ${
                                isCritical
                                  ? "bg-error text-on-error"
                                  : isHigh
                                  ? "bg-amber-600 text-white"
                                  : "bg-primary text-on-primary"
                              }`}
                            >
                              {isCritical && <span className="material-symbols-outlined text-xs">emergency</span>}
                              {patient.priorityLevel || "MEDIUM"}
                            </span>

                            <span className="font-data-display font-bold text-sm text-primary">
                              {patient.tokenNumber}
                            </span>

                            {isConsulting && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-bold animate-pulse flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                In Consultation
                              </span>
                            )}

                            {patient.isAccident && (
                              <span className="px-2 py-0.5 bg-error-container text-error rounded text-xs font-bold">
                                Trauma Case ({patient.accidentSeverity})
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-on-surface">
                            {patient.fullName}, <span className="font-normal text-on-surface-variant">{patient.age} yrs ({patient.gender})</span>
                          </h4>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant mt-1">
                            <span><strong>Dept:</strong> {patient.department}</span>
                            <span>•</span>
                            <span><strong>Wait Time:</strong> {patient.waitTime}</span>
                            <span>•</span>
                            <span><strong>Arrival:</strong> {patient.arrivalTime || "Recent"}</span>
                          </div>

                          {/* Symptoms summary */}
                          <p className="text-xs text-on-surface mt-2 bg-surface-container-low p-2 rounded border border-outline-variant/50 line-clamp-2">
                            <strong className="text-secondary">Reported Symptoms:</strong> {patient.symptoms || "Clinical examination requested."}
                          </p>
                        </div>

                        {/* AI Summary Badge */}
                        <div className="w-full lg:w-72 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/70 space-y-1.5 shrink-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">psychology</span>
                              AI Triage Insights
                            </span>
                            <span className="font-data-display text-xs font-bold text-primary">
                              Score: {score}/100
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface line-clamp-2">
                            {ai.reason || "Patient evaluated by Groq clinical decision-support."}
                          </p>
                          {img && (
                            <p className="text-[10px] text-secondary font-semibold flex items-center gap-1 border-t border-outline-variant/40 pt-1">
                              <span className="material-symbols-outlined text-xs">radiology</span>
                              X-Ray Screening: {img.screeningStatus}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleViewPatient(patient)}
                            className="px-3 py-2 border border-outline-variant hover:bg-surface-container text-on-surface rounded text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            View Patient
                          </button>

                          <button
                            onClick={() => handleStartConsultation(patient)}
                            className="px-4 py-2 bg-primary text-on-primary hover:bg-on-primary-fixed-variant rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">stethoscope</span>
                            Start Consultation
                          </button>

                          <button
                            onClick={() => handleOpenHoldModal(patient)}
                            className="p-2 border border-outline-variant text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title="Put Patient on Hold"
                          >
                            <span className="material-symbols-outlined text-sm">pause</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 7. Pending Patients Queue Tab */}
        {activeTab === "pending" && (
          <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-amber-900 text-base">Pending Queue (Patients on Hold)</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Patients awaiting lab tests, radiological imaging, or clinical observation.
                </p>
              </div>
              <span className="text-xs bg-amber-600 text-white px-2.5 py-1 rounded-full font-bold">
                {pendingQueue.length} on Hold
              </span>
            </div>

            <div className="divide-y divide-outline-variant">
              {pendingQueue.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">hourglass_disabled</span>
                  <p className="font-medium">No patients currently on hold in {selectedDepartment}.</p>
                </div>
              ) : (
                pendingQueue.map((patient) => (
                  <div key={patient.id || patient.tokenNumber} className="p-5 hover:bg-surface-container-low transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-data-display font-bold text-sm text-primary">{patient.tokenNumber}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">
                            ON HOLD
                          </span>
                          <span className="text-xs text-outline font-label-sm">
                            Held At: {patient.heldAt || "Recently"}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-on-surface">
                          {patient.fullName}, {patient.age} yrs ({patient.gender})
                        </h4>
                        <div className="text-xs text-amber-900 bg-amber-50/80 p-2 rounded border border-amber-200 inline-block mt-1">
                          <strong>Hold Reason:</strong> {patient.pendingReason || "Diagnostic scan in progress."}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleViewPatient(patient)}
                          className="px-3 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded text-xs font-semibold"
                        >
                          View Details
                        </button>

                        <button
                          onClick={() => handleResumePatient(patient)}
                          className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
                          Return to Queue (+35 Boost)
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Completed Consultations Tab */}
        {activeTab === "completed" && (
          <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-on-surface text-base">Completed Consultations Today</h3>
              <span className="text-xs bg-primary text-on-primary px-2.5 py-0.5 rounded-full font-bold">
                {completedConsultations.length} Consultations
              </span>
            </div>

            <div className="divide-y divide-outline-variant">
              {completedConsultations.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">task_alt</span>
                  <p className="font-medium">No consultations completed yet today.</p>
                </div>
              ) : (
                completedConsultations.map((c, idx) => (
                  <div key={c._id || idx} className="p-4 hover:bg-surface-container-low transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-on-surface text-sm">{c.patient?.name || "Patient"}</span>
                          <span className="text-xs text-outline font-label-sm">
                            {new Date(c.createdAt || c.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant"><strong>Diagnosis:</strong> {c.diagnosisNotes || "General consultation"}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5"><strong>Notes:</strong> {c.clinicalNotes || "Visit finalized."}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">
                        COMPLETED
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* 4. PATIENT CLINICAL DETAILS MODAL / DRAWER */}
      {inspectPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-outline-variant shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">clinical_notes</span>
                <h3 className="font-bold text-base text-on-surface">Patient Clinical Profile & Triage Record</h3>
              </div>
              <button onClick={() => setInspectPatient(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Patient Basic Info Card */}
              <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-data-display font-bold text-primary text-sm">
                      {inspectPatient.tokenNumber}
                    </span>
                    <h4 className="text-lg font-bold text-on-surface mt-0.5">
                      {inspectPatient.patient?.fullName || inspectPatient.fullName || "Patient"}
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      Age: {inspectPatient.patient?.age || inspectPatient.age} yrs • Gender: {inspectPatient.patient?.gender || inspectPatient.gender || "Unspecified"} • Blood Group: {inspectPatient.patient?.bloodGroup || "O+"}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-primary-fixed text-primary rounded font-bold text-xs font-label-sm">
                    {inspectPatient.clinical?.department || inspectPatient.department}
                  </span>
                </div>
              </div>

              {/* Patient Reported Info */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-secondary">Patient-Reported Symptoms</h5>
                <div className="p-3 bg-surface-container-low rounded border border-outline-variant text-sm">
                  <p>{inspectPatient.clinical?.symptoms || inspectPatient.symptoms || "No specific symptoms reported."}</p>
                  {inspectPatient.clinical?.reportedSeverity && (
                    <p className="text-xs text-secondary mt-1 font-semibold">
                      Self-Assessed Severity: {inspectPatient.clinical.reportedSeverity}
                    </p>
                  )}
                </div>
              </div>

              {/* Staff Verification Badge */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Verified by Hospital Clinical Triage Staff
                </span>
                <span>Staff Approved ✓</span>
              </div>

              {/* AI Decision Support */}
              <div className="p-4 bg-primary-fixed/20 border border-primary/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    AI Decision-Support Analysis (Groq Llama-3 Triage)
                  </span>
                  <span className="text-[10px] text-secondary font-medium">
                    Priority Score: {inspectPatient.aiAnalysis?.urgencyScore || inspectPatient.priorityScore || 50}/100
                  </span>
                </div>
                <p className="text-xs text-on-surface">
                  {inspectPatient.aiAnalysis?.reason || inspectPatient.aiAssessment?.reason || "Patient evaluated based on clinical severity and reported symptoms."}
                </p>
                <div className="p-2 bg-white/80 rounded text-[11px] text-secondary italic border border-outline-variant/30">
                  <strong>Safety Notice:</strong> AI-generated decision support — not a medical diagnosis.
                </div>
              </div>

              {/* 5. Preliminary Image Screening Section */}
              {(inspectPatient.clinical?.medicalImageUrl || inspectPatient.imageScreening?.imageUrl || inspectPatient.medicalImageUrl) && (
                <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-secondary flex items-center gap-1.5 uppercase">
                      <span className="material-symbols-outlined text-sm">radiology</span>
                      Preliminary Image Screening
                    </h5>
                    <span className="text-[10px] text-outline font-label-sm">PyTorch Screening Engine</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => setModalImage(inspectPatient.clinical?.medicalImageUrl || inspectPatient.imageScreening?.imageUrl || inspectPatient.medicalImageUrl)}
                      className="w-24 h-24 bg-surface-container rounded-lg overflow-hidden border border-outline-variant relative group cursor-pointer shrink-0"
                    >
                      <img
                        src={inspectPatient.clinical?.medicalImageUrl || inspectPatient.imageScreening?.imageUrl || inspectPatient.medicalImageUrl}
                        alt="X-Ray Scan"
                        className="w-full h-full object-cover grayscale"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-base">zoom_in</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-on-surface">
                        Screening Status: <span className="text-primary font-bold">{inspectPatient.imageAnalysis?.screeningStatus || inspectPatient.imageScreening?.screeningStatus || "SCREENING COMPLETED"}</span>
                      </p>
                      <p className="text-on-surface-variant">
                        Possible abnormality detected — clinical review recommended.
                      </p>
                      <button
                        onClick={() => setModalImage(inspectPatient.clinical?.medicalImageUrl || inspectPatient.imageScreening?.imageUrl || inspectPatient.medicalImageUrl)}
                        className="text-primary font-semibold text-xs hover:underline flex items-center gap-1 mt-1"
                      >
                        <span className="material-symbols-outlined text-xs">fullscreen</span>
                        Inspect High-Resolution Scan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-2">
              <button
                onClick={() => setInspectPatient(null)}
                className="px-4 py-2 border border-outline-variant rounded font-semibold text-xs text-on-surface hover:bg-surface-container"
              >
                Close
              </button>
              <button
                onClick={() => handleStartConsultation(inspectPatient)}
                className="px-4 py-2 bg-primary text-on-primary rounded font-bold text-xs hover:bg-on-primary-fixed-variant flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">stethoscope</span>
                Start Consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONSULTATION WORKFLOW DRAWER / MODAL */}
      {activeConsultation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-outline-variant shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up">
            {/* Active Consultation Header */}
            <div className="px-6 py-3.5 bg-emerald-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping"></span>
                <h3 className="font-bold text-sm">Active Clinical Consultation</h3>
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono">
                  {formatTimer(consultTimer)}
                </span>
              </div>
              <button
                onClick={() => setActiveConsultation(null)}
                className="text-white hover:opacity-75"
                title="Minimize consultation"
              >
                <span className="material-symbols-outlined text-lg">minimize</span>
              </button>
            </div>

            {/* Form & Consultation Inputs */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Patient Banner */}
              <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant flex justify-between items-center">
                <div>
                  <span className="font-data-display font-bold text-xs text-primary">{activeConsultation.tokenNumber}</span>
                  <h4 className="font-bold text-base text-on-surface">{activeConsultation.fullName}</h4>
                  <p className="text-xs text-on-surface-variant">Age: {activeConsultation.age} yrs • {activeConsultation.department}</p>
                </div>
                <button
                  onClick={() => handleOpenHoldModal(activeConsultation)}
                  className="px-3 py-1.5 border border-amber-500 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded text-xs font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">pause</span>
                  Put on Hold
                </button>
              </div>

              {/* Vitals Row */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Patient Vitals</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <span className="text-[10px] text-outline uppercase font-label-sm block">BP (mmHg)</span>
                    <input
                      type="text"
                      value={vitals.bloodPressure}
                      onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                      placeholder="120/80"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-label-sm block">Heart Rate</span>
                    <input
                      type="text"
                      value={vitals.heartRate}
                      onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                      placeholder="76 bpm"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-label-sm block">SpO2 (%)</span>
                    <input
                      type="text"
                      value={vitals.oxygenSaturation}
                      onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })}
                      placeholder="99%"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-label-sm block">Temp (°F)</span>
                    <input
                      type="text"
                      value={vitals.temperature}
                      onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                      placeholder="98.6"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Assessment & Examination Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Doctor Assessment & Clinical Notes
                </label>
                <textarea
                  rows={3}
                  value={consultNotes}
                  onChange={(e) => setConsultNotes(e.target.value)}
                  placeholder="Record examination findings, severity assessment, and clinical rationale..."
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                ></textarea>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Clinical Diagnosis
                </label>
                <input
                  type="text"
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="e.g. Acute Bronchitis / Musculoskeletal Chest Strain"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2.5 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Prescriptions (Rx) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Prescription (Rx) & Orders
                </label>
                <textarea
                  rows={2}
                  value={rxPrescription}
                  onChange={(e) => setRxPrescription(e.target.value)}
                  placeholder="e.g. Tab Paracetamol 650mg TDS x 3 days, Syrup Ambroxol 10ml TID"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                ></textarea>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-3.5 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
              <button
                onClick={() => setActiveConsultation(null)}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded text-xs font-semibold"
              >
                Minimize
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenHoldModal(activeConsultation)}
                  className="px-4 py-2 border border-amber-600 text-amber-800 hover:bg-amber-50 rounded text-xs font-bold"
                >
                  Put on Hold
                </button>

                <button
                  onClick={handleFinishConsultation}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">task_alt</span>
                  Complete Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOLD REASON MODAL */}
      {holdModalPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-outline-variant shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="material-symbols-outlined">pause_circle</span>
              <h3 className="font-bold text-base">Place Patient on Hold (Pending Queue)</h3>
            </div>

            <p className="text-xs text-on-surface-variant">
              Moving <strong className="text-on-surface">{holdModalPatient.fullName}</strong> ({holdModalPatient.tokenNumber}) to the pending queue. Select a reason:
            </p>

            <div className="space-y-2">
              {[
                { label: "Further examination required", cat: "OTHER" },
                { label: "Additional test required (Lab/Blood test)", cat: "LAB_TEST" },
                { label: "Diagnostic imaging / X-Ray required", cat: "XRAY_SCAN" },
                { label: "Observation & stabilization required", cat: "OBSERVATION" },
                { label: "Specialist doctor review required", cat: "SPECIALIST_REVIEW" }
              ].map((opt) => (
                <label key={opt.label} className="flex items-center gap-2 p-2 rounded hover:bg-surface-container-low cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="holdReason"
                    value={opt.label}
                    checked={holdReason === opt.label}
                    onChange={() => {
                      setHoldReason(opt.label);
                      setHoldCategory(opt.cat);
                    }}
                    className="text-primary focus:ring-primary"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Additional Hold Notes</label>
              <textarea
                rows={2}
                value={holdNotes}
                onChange={(e) => setHoldNotes(e.target.value)}
                placeholder="Optional instructions for lab or nursing staff..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-xs"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <button
                onClick={() => setHoldModalPatient(null)}
                className="px-4 py-2 border border-outline-variant rounded text-xs font-semibold text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHold}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow-sm"
              >
                Confirm Put on Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High Resolution Radiograph Image Lightbox Modal */}
      <ImageModal
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        imageUrl={modalImage}
        title="Preliminary Radiology Screening Inspection"
      />
    </div>
  );
};

export default DoctorDashboard;
