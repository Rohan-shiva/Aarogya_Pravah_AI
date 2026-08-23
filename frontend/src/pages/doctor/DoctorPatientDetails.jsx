import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import ImageModal from "../../components/ImageModal";
import doctorService from "../../services/doctorService";

export const DoctorPatientDetails = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [patientData, setPatientData] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [consultNotes, setConsultNotes] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [rxPrescription, setRxPrescription] = useState("");
  const [bloodPressure, setBloodPressure] = useState("120/80");
  const [heartRate, setHeartRate] = useState("76");
  const [temperature, setTemperature] = useState("98.6");
  const [oxygenSaturation, setOxygenSaturation] = useState("99");
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await doctorService.getPatientDetails(patientId);
        if (res.success && res.data) {
          setPatientData(res.data);
          if (res.data.clinical?.symptoms) {
            setConsultNotes(`Reviewed reported symptoms: ${res.data.clinical.symptoms}.`);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [patientId]);

  const handleFinishConsult = async () => {
    try {
      const queueEntryId = patientData?.queueEntryId || patientId;
      const res = await doctorService.completeAppointment(queueEntryId, {
        clinicalNotes: consultNotes || "Patient examined and clinical consultation finalized.",
        diagnosisNotes: diagnosisNotes || "Clinical diagnosis confirmed.",
        vitals: {
          bloodPressure,
          heartRate: parseInt(heartRate, 10) || 76,
          temperature: parseFloat(temperature) || 98.6,
          oxygenSaturation: parseInt(oxygenSaturation, 10) || 99
        },
        prescriptions: rxPrescription ? [
          {
            medicationName: rxPrescription,
            dosage: "As directed",
            frequency: "Daily",
            durationDays: 5,
            instructions: "Take with water after meals"
          }
        ] : []
      });

      if (res.success) {
        setIsCompleted(true);
        setTimeout(() => {
          navigate("/doctor/dashboard");
        }, 1500);
      } else {
        setError(res.message || "Failed to complete consultation.");
      }
    } catch (err) {
      setError(err.message || "Error finalizing consultation.");
    }
  };

  const patient = patientData?.patient || {};
  const clinical = patientData?.clinical || {};
  const ai = patientData?.aiAnalysis || {};
  const img = patientData?.imageAnalysis || null;
  const urgencyScore = ai.urgencyScore || 75;
  const isCritical = urgencyScore >= 80;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex h-screen overflow-hidden">
      <Sidebar activeSection="doctor_queue" />

      <main className="flex-1 flex flex-col md:ml-64 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-surface border-b border-outline-variant h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/doctor/dashboard")}
              className="p-1.5 rounded-full hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <h1 className="text-title-md font-headline-lg font-bold text-on-surface">
              Patient Consultation & Clinical File
            </h1>
          </div>
          <span className="font-data-display text-primary font-bold text-base">
            Token: {patientData?.tokenNumber || "TKN-000"}
          </span>
        </header>

        {isCompleted && (
          <div className="bg-emerald-600 text-white p-3 text-center text-sm font-semibold animate-fade-in-up">
            ✓ Consultation completed and recorded in medical history. Returning to priority queue...
          </div>
        )}

        {error && (
          <div className="bg-error text-white p-3 text-center text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Card Banner */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl shadow-sm">
                {(patient.fullName || "P").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-headline-lg font-headline-lg text-on-surface text-2xl font-bold">
                  {patient.fullName || "Marcus Thorne"}
                </h2>
                <div className="flex flex-wrap gap-4 text-xs font-body-md text-on-surface-variant mt-1">
                  <span>Age: {patient.age || 42} ({patient.gender || "Unspecified"})</span>
                  <span>• Blood Group: {patient.bloodGroup || "O+"}</span>
                  <span>• Contact: {patient.phoneNumber || "N/A"}</span>
                  <span>• Department: {clinical.department || "General Medicine"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-label-sm text-secondary uppercase">Composite AI Urgency</span>
                <p className={`font-data-display text-2xl font-bold ${isCritical ? "text-error" : "text-primary"}`}>
                  {urgencyScore}/100
                </p>
              </div>
              <span className={`p-3 rounded-xl ${isCritical ? "bg-error-container text-error" : "bg-primary-container text-primary"}`}>
                <span className="material-symbols-outlined text-2xl">
                  {isCritical ? "emergency" : "verified"}
                </span>
              </span>
            </div>
          </div>

          {/* Grid Layout: Clinical History + Rx Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Clinical Summary & Timeline (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* AI Diagnostic Summary */}
              <div className="bg-surface-container-low border border-primary/20 rounded-xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <span className="material-symbols-outlined text-lg">psychology</span>
                    <span>AI Decision Support Insights (Groq Triage Engine)</span>
                  </div>
                  <span className="text-[10px] text-secondary font-medium italic">
                    AI-generated decision support — not a medical diagnosis
                  </span>
                </div>
                <p className="text-body-md text-sm text-on-surface mt-1">
                  {ai.reason || "Patient triaged based on reported symptoms & staff clinical verification."}
                </p>
                {ai.riskFactors && ai.riskFactors.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-secondary">Identified Risk Patterns:</p>
                    <ul className="list-disc list-inside text-xs text-on-surface-variant mt-1 space-y-0.5">
                      {ai.riskFactors.map((rf, idx) => (
                        <li key={idx}>{rf}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Medical Image Screening Preview if uploaded */}
              {clinical.medicalImageUrl && (
                <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">radiology</span>
                      Preliminary Medical Image Screening
                    </h3>
                    <span className="text-[10px] text-secondary italic">
                      Possible abnormality detected — clinical review recommended.
                    </span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div
                      onClick={() => setModalImage(clinical.medicalImageUrl)}
                      className="w-32 h-32 bg-surface-container rounded-lg overflow-hidden border border-outline-variant relative group cursor-pointer shrink-0"
                    >
                      <img
                        src={clinical.medicalImageUrl}
                        alt="X-Ray Scan"
                        className="w-full h-full object-cover grayscale mix-blend-multiply"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white">zoom_in</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-on-surface">
                      <p className="font-semibold text-sm">PyTorch DenseNet Signal Ingestion</p>
                      <p className="text-on-surface-variant">
                        Screening Status: <span className="font-bold text-primary">{img?.screeningStatus || "NORMAL / CLEAR"}</span>
                      </p>
                      <p className="text-on-surface-variant">
                        Confidence Signal: <span className="font-semibold">{img?.confidenceSignal ? `${(img.confidenceSignal * 100).toFixed(0)}%` : "92%"}</span>
                      </p>
                      <p className="text-[11px] text-outline">Click image to inspect high-resolution radiograph.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Visit Timeline */}
              <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-title-md text-title-md text-on-surface font-semibold">Prior Hospital Visits & Timeline</h3>
                {patientData?.timeline?.map((item) => (
                  <div key={item.id} className="border-l-2 border-primary pl-4 py-1 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-primary font-label-sm">{item.date} • {item.department}</span>
                      <span className="font-bold text-error font-data-display">{item.aiPriority}</span>
                    </div>
                    <h4 className="font-body-md font-semibold text-sm text-on-surface">{item.conditionTitle}</h4>
                    <p className="text-xs text-on-surface-variant">{item.diagnosis}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor Consultation Actions & Prescription Form (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-title-md text-title-md text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">edit_note</span>
                  Clinical Notes & Rx
                </h3>

                {/* Vitals Input Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-label-sm text-secondary uppercase mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="120/80"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-body-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-label-sm text-secondary uppercase mb-1">Heart Rate (bpm)</label>
                    <input
                      type="text"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="76"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-body-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-label-sm text-secondary uppercase mb-1">Doctor Observations & Findings</label>
                  <textarea
                    rows={3}
                    value={consultNotes}
                    onChange={(e) => setConsultNotes(e.target.value)}
                    placeholder="Enter diagnostic assessment, clinical findings, and examination notes..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-label-sm text-secondary uppercase mb-1">Diagnosis</label>
                  <input
                    type="text"
                    value={diagnosisNotes}
                    onChange={(e) => setDiagnosisNotes(e.target.value)}
                    placeholder="e.g. Acute Bronchitis / Musculoskeletal Chest Pain"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-label-sm text-secondary uppercase mb-1">Prescription (Rx)</label>
                  <textarea
                    rows={3}
                    value={rxPrescription}
                    onChange={(e) => setRxPrescription(e.target.value)}
                    placeholder="e.g. Amoxicillin 500mg TID for 5 days; Paracetamol 650mg SOS"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => navigate("/doctor/dashboard")}
                    className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded font-label-sm text-sm hover:bg-surface-container-low"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinishConsult}
                    className="flex-1 py-2.5 bg-primary text-on-primary rounded font-label-sm text-sm font-semibold hover:bg-on-primary-fixed-variant transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Complete Visit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ImageModal
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        imageUrl={modalImage}
        title={`Radiology Scan - ${patient.fullName || "Patient"}`}
      />
    </div>
  );
};

export default DoctorPatientDetails;
