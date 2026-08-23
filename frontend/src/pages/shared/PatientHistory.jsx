import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import ImageModal from "../../components/ImageModal";
import doctorService from "../../services/doctorService";
import { mockPatientHistory } from "../../mocks/mockData";

export const PatientHistory = () => {
  const { patientId } = useParams();
  const [historyData, setHistoryData] = useState(mockPatientHistory);
  const [modalImage, setModalImage] = useState(null);
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [patientVitals, setPatientVitals] = useState({
    bp: "120/80 mmHg",
    hr: "76 bpm",
    spo2: "99%",
    temp: "37.0 °C"
  });

  useEffect(() => {
    if (patientId) {
      doctorService.getPatientDetails(patientId).then((res) => {
        if (res.success && res.data) {
          setHistoryData(res.data);
        }
      }).catch(() => {});
    }
  }, [patientId]);

  const { patient = {}, timeline = [] } = historyData || {};

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex h-screen overflow-hidden">
      {/* SideNavBar */}
      <Sidebar activeSection="history" />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 h-screen overflow-hidden relative">
        {/* TopAppBar */}
        <header className="bg-surface border-b border-outline-variant h-16 flex justify-between items-center px-margin-mobile md:px-margin-desktop flex-shrink-0">
          <div className="flex items-center space-x-8">
            <h1 className="text-title-md font-headline-lg font-bold text-primary truncate">Aarogya Pravah AI</h1>
            <nav className="hidden md:flex space-x-6 h-full items-center text-label-sm font-label-sm">
              <span className="text-primary border-b-2 border-primary font-bold px-2 py-4">Patient File & History</span>
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            <span className="bg-error text-on-error px-3 py-1 rounded font-label-sm text-xs font-semibold hidden sm:flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span> Emergency Triage
            </span>
            <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-6 pb-24 md:pb-8">
          {/* Patient Summary Header */}
          <section className="bg-surface rounded-xl border border-outline-variant p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-title-md font-title-md font-bold shadow-sm">
                {(patient.fullName || "P").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg font-bold text-on-surface">
                  {patient.fullName || "Patient File"}
                </h2>
                <div className="flex flex-wrap gap-2 md:gap-4 mt-1 text-body-md text-xs sm:text-sm text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">cake</span>
                    {patient.age || 42} yrs (DOB: {patient.dob || "1982-01-01"})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">water_drop</span>
                    {patient.bloodGroup || "O+"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">medical_services</span>
                    {patient.primaryDoctor || "Dr. Staff Physician"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingVitals(!isEditingVitals)}
                className="bg-surface text-primary border border-primary px-4 py-2 rounded text-label-sm font-label-sm font-semibold hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                {isEditingVitals ? "Close Vitals" : "Edit Vitals"}
              </button>
              <button
                onClick={() => alert("New clinical entry opened.")}
                className="bg-primary text-on-primary px-4 py-2 rounded text-label-sm font-label-sm font-semibold hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                New Entry
              </button>
            </div>
          </section>

          {/* Vitals Quick Edit Panel */}
          {isEditingVitals && (
            <div className="bg-surface-container-low border border-primary/30 rounded-xl p-5 shadow-sm animate-fade-in-up">
              <h3 className="text-label-sm font-label-sm uppercase text-primary font-bold mb-3">Live Clinical Vitals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-outline block mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={patientVitals.bp}
                    onChange={(e) => setPatientVitals({ ...patientVitals, bp: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded p-2 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-outline block mb-1">Heart Rate</label>
                  <input
                    type="text"
                    value={patientVitals.hr}
                    onChange={(e) => setPatientVitals({ ...patientVitals, hr: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded p-2 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-outline block mb-1">SpO2</label>
                  <input
                    type="text"
                    value={patientVitals.spo2}
                    onChange={(e) => setPatientVitals({ ...patientVitals, spo2: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded p-2 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-outline block mb-1">Body Temperature</label>
                  <input
                    type="text"
                    value={patientVitals.temp}
                    onChange={(e) => setPatientVitals({ ...patientVitals, temp: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded p-2 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Layout Grid: Timeline + Side Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Main Timeline Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <h3 className="text-title-md font-title-md text-on-surface font-bold border-b border-outline-variant pb-2">
                Visit History
              </h3>
              <div className="relative pl-4 md:pl-0">
                {/* Vertical Line */}
                <div className="absolute left-[23px] top-4 bottom-0 w-0.5 bg-outline-variant hidden md:block"></div>

                {timeline.map((entry) => (
                  <div key={entry.id} className="relative flex flex-col md:flex-row gap-4 mb-8">
                    {/* Desktop Date Indicator */}
                    <div className="md:w-32 flex-shrink-0 pt-1 text-right hidden md:block">
                      <p className="text-label-sm font-label-sm text-on-surface-variant text-xs">{entry.date}</p>
                      <p className={`text-label-sm font-label-sm font-bold text-xs ${entry.isCritical ? "text-primary" : "text-secondary"}`}>
                        {entry.department}
                      </p>
                    </div>
                    <div
                      className={`absolute left-[-16px] md:left-[17px] top-2 w-3.5 h-3.5 rounded-full border-2 border-surface z-10 hidden md:block ${
                        entry.isCritical ? "bg-primary" : "bg-secondary"
                      }`}
                    ></div>

                    {/* Timeline Card */}
                    <div className="flex-1 bg-surface border border-outline-variant rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-primary font-bold md:hidden">{entry.date} • {entry.department}</span>
                          <h4 className="text-title-md font-headline-lg font-bold text-on-surface text-base">
                            {entry.conditionTitle}
                          </h4>
                          <p className="text-xs text-on-surface-variant mt-0.5">Attending: {entry.doctor || "Clinical Staff"}</p>
                        </div>
                        <span className="px-2.5 py-0.5 bg-primary-fixed text-on-primary-fixed rounded text-xs font-bold font-data-display">
                          {entry.aiPriority}
                        </span>
                      </div>

                      <p className="text-body-md text-sm text-on-surface">{entry.diagnosis}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side Stats & Vitals Card (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-title-md text-title-md text-on-surface font-bold">Vitals & Allergy Summary</h3>
                <div className="space-y-2 text-sm text-on-surface">
                  <div className="flex justify-between py-1 border-b border-outline-variant">
                    <span className="text-secondary">Blood Pressure:</span>
                    <span className="font-semibold">{patientVitals.bp}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant">
                    <span className="text-secondary">Heart Rate:</span>
                    <span className="font-semibold">{patientVitals.hr}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant">
                    <span className="text-secondary">Oxygen (SpO2):</span>
                    <span className="font-semibold">{patientVitals.spo2}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant">
                    <span className="text-secondary">Temperature:</span>
                    <span className="font-semibold">{patientVitals.temp}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-secondary">Known Allergies:</span>
                    <span className="font-semibold text-error">None reported</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ImageModal
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        imageUrl={modalImage}
        title="Patient Medical Scan"
      />
    </div>
  );
};

export default PatientHistory;
