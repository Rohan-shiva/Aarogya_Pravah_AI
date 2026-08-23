import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import appointmentService from "../../services/appointmentService";
import socketService from "../../services/socketService";

export const PatientPortal = () => {
  const navigate = useNavigate();

  // Controlled Form State
  const [formData, setFormData] = useState({
    patient: {
      fullName: "",
      age: "",
      gender: "Male",
      contact: ""
    },
    appointment: {
      department: "Cardiology",
      severity: "High",
      symptoms: "",
      possibleDisease: "",
      isAccidentalCase: false,
      accidentSeverity: ""
    }
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [searchToken, setSearchToken] = useState("");
  const [searchedData, setSearchedData] = useState({
    tokenNumber: "TKN-042",
    waitTime: "45 min",
    queuePosition: "#12",
    status: "Waiting for Triage Validation"
  });
  const [isSearching, setIsSearching] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Dynamic AI Ghost Suggestion logic based on symptoms
  const getAiSuggestedCondition = (symptomsText) => {
    if (!symptomsText) return "Will populate based on symptoms...";
    const text = symptomsText.toLowerCase();
    if (text.includes("chest") || text.includes("breath") || text.includes("heart")) {
      return "Acute Coronary Syndrome / Suspected Myocardial Infarction";
    }
    if (text.includes("wrist") || text.includes("fracture") || text.includes("bone") || text.includes("fall")) {
      return "Distal Radius Fracture / Trauma";
    }
    if (text.includes("cough") || text.includes("fever") || text.includes("throat")) {
      return "Viral Upper Respiratory Tract Infection";
    }
    if (text.includes("headache") || text.includes("vision") || text.includes("migraine")) {
      return "Acute Migraine with Aura / Neurological Cephalea";
    }
    return "Preliminary AI Assessment In Progress...";
  };

  const handleInputChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate clicks and submissions

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        patient: formData.patient,
        appointment: {
          ...formData.appointment,
          possibleDisease: getAiSuggestedCondition(formData.appointment.symptoms)
        },
        medicalImage: selectedFile
      };

      const result = await appointmentService.createAppointment(payload);

      if (result.success) {
        setBookingSuccess(result.data || result);
        socketService.emit("appointment-created", result.data || result);
        setSubmitError(null);
      } else {
        const errorMsg = result.message || "Unable to create appointment. Please check your inputs and try again.";
        setSubmitError(errorMsg);
        console.error("[Appointment Submission Error]:", result.message);
      }
    } catch (err) {
      const errorMsg = err.message || "An unexpected error occurred while submitting your appointment.";
      setSubmitError(errorMsg);
      console.error("[Booking Submission Exception]:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTokenSearch = async (e) => {
    e.preventDefault();
    if (!searchToken.trim()) return;
    setIsSearching(true);

    try {
      const result = await appointmentService.getAppointmentByToken(searchToken);
      if (result.success && result.data) {
        setSearchedData({
          tokenNumber: result.data.tokenNumber,
          waitTime: result.data.estimatedWaitTime || "30 min",
          queuePosition: result.data.queuePosition || "#8",
          status: result.data.status || "In Queue"
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen pb-20 md:pb-0 w-full max-w-full overflow-x-hidden">
      <Navbar />

      {/* Main Layout */}
      <main className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 flex flex-col gap-6 md:gap-gutter">
        {/* Hero Section */}
        <section className="bg-primary text-on-primary rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-sm w-full max-w-full">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display-lg text-2xl sm:text-display-lg mb-3 sm:mb-4">Welcome to Aarogya Pravah AI</h2>
            <p className="font-body-lg text-sm sm:text-body-lg mb-6 sm:mb-8 opacity-90">
              Our AI-powered triage system ensures you get the right care, faster. Book your appointment or track your real-time status below.
            </p>
            <a
              href="#appointment-form"
              className="inline-flex items-center gap-2 bg-surface text-primary hover:bg-surface-container-highest px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-title-md text-sm sm:text-title-md shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                calendar_add_on
              </span>
              Book New Appointment
            </a>
          </div>
        </section>

        {/* Success Modal / Banner if booked */}
        {bookingSuccess && (
          <div className="w-full max-w-full bg-surface-container-low border-2 border-primary rounded-xl p-4 sm:p-6 shadow-md animate-fade-in-up flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-title-md font-headline-lg font-bold text-primary">Appointment Booked Successfully!</h3>
                <p className="text-body-md text-on-surface-variant text-sm sm:text-base">
                  Your Token is <span className="font-data-display font-bold text-primary text-lg">{bookingSuccess.tokenNumber}</span>. Estimated Wait: {bookingSuccess.estimatedWaitTime || "30 min"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => navigate(`/token/${bookingSuccess.tokenNumber}`)}
                className="flex-1 md:flex-none px-4 py-2 bg-primary text-on-primary rounded font-label-sm hover:bg-on-primary-fixed-variant transition-colors text-center"
              >
                View Live Token
              </button>
              <button
                onClick={() => setBookingSuccess(null)}
                className="flex-1 md:flex-none px-4 py-2 border border-outline-variant text-on-surface-variant rounded font-label-sm hover:bg-surface-container transition-colors text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Banner if submission fails */}
        {submitError && (
          <div className="w-full max-w-full bg-error-container border border-error/30 text-error rounded-xl p-4 sm:p-5 shadow-sm animate-fade-in-up flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="material-symbols-outlined text-2xl shrink-0 mt-0.5">error</span>
              <div className="min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Unable to Generate Appointment Token</h4>
                <p className="text-xs sm:text-sm text-error/90 mt-0.5">{submitError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-error hover:opacity-75 p-1 shrink-0"
              title="Dismiss error"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Two-Column Responsive Grid: 2-Cols on Desktop (lg:), 1-Col Stacked on Mobile & Tablet (<lg:) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-gutter w-full max-w-full items-start">
          {/* Appointment Form Column (8 cols on lg, full width on mobile/tablet) */}
          <div className="lg:col-span-8 space-y-6 w-full max-w-full min-w-0" id="appointment-form">
            <div className="bg-surface rounded-xl border border-outline-variant p-5 sm:p-6 shadow-sm relative z-0 w-full max-w-full box-border">
              <h3 className="font-headline-lg text-lg sm:text-headline-lg text-on-surface mb-5 sm:mb-6 border-b border-outline-variant pb-3 sm:pb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_document</span>
                Patient Details Entry
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-full">
                {/* Personal Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                  <div className="space-y-1.5 min-w-0">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={formData.patient.fullName}
                      onChange={(e) => handleInputChange("patient", "fullName", e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 sm:px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary box-border"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">Age *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      placeholder="e.g. 42"
                      value={formData.patient.age}
                      onChange={(e) => handleInputChange("patient", "age", e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 sm:px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary box-border"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">Contact Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      value={formData.patient.contact}
                      onChange={(e) => handleInputChange("patient", "contact", e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 sm:px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary box-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full">
                  {/* Department */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">Department *</label>
                    <select
                      value={formData.appointment.department}
                      onChange={(e) => handleInputChange("appointment", "department", e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 sm:px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary text-on-surface font-body-md transition-colors box-border"
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="General Medicine">General Medicine</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>

                  {/* Severity */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">Self-Assessed Severity</label>
                    <select
                      value={formData.appointment.severity}
                      onChange={(e) => handleInputChange("appointment", "severity", e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 sm:px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary text-on-surface font-body-md transition-colors box-border"
                    >
                      <option value="Easy">Easy (Routine checkup)</option>
                      <option value="Medium">Medium (Discomfort, non-urgent)</option>
                      <option value="High">High (Severe pain, urgent)</option>
                    </select>
                  </div>
                </div>

                {/* Symptoms */}
                <div className="space-y-1.5 relative w-full">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">Symptoms *</label>
                  <textarea
                    rows={3}
                    required
                    value={formData.appointment.symptoms}
                    onChange={(e) => handleInputChange("appointment", "symptoms", e.target.value)}
                    placeholder="Describe how you are feeling (e.g., severe chest pain radiating to left arm, shortness of breath)..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 sm:px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary text-on-surface font-body-md transition-colors box-border"
                  ></textarea>
                  <div className="absolute right-2 bottom-3 text-xs text-on-surface-variant opacity-70 flex items-center gap-1 pointer-events-none">
                    <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                    <span className="hidden sm:inline">AI Assisted Extraction</span>
                  </div>
                </div>

                {/* Possible Disease (AI Ghost Text) */}
                <div className="space-y-1.5 w-full">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">AI Suggested Condition (Preliminary Extraction)</label>
                  <input
                    type="text"
                    disabled
                    value={getAiSuggestedCondition(formData.appointment.symptoms)}
                    className="w-full bg-surface-container-low border border-outline-variant border-dashed rounded-md px-3 sm:px-4 py-2 text-primary font-medium font-body-md focus:outline-none box-border"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start w-full">
                  {/* Accidental Case Toggle */}
                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant flex items-center justify-between min-w-0">
                    <div>
                      <p className="font-title-md text-[15px] sm:text-[16px] text-on-surface">Accidental Case?</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Check if related to trauma or injury.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={formData.appointment.isAccidentalCase}
                        onChange={(e) => handleInputChange("appointment", "isAccidentalCase", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
                    </label>
                  </div>

                  {/* X-Ray Upload */}
                  <label className="border-2 border-dashed border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-colors cursor-pointer group relative min-w-0">
                    <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="sr-only" />
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary text-3xl mb-1 transition-colors">
                      upload_file
                    </span>
                    <p className="font-label-sm text-label-sm text-on-surface-variant font-medium truncate max-w-full">
                      {selectedFile ? selectedFile.name : "Upload X-Ray / Documents"}
                    </p>
                    <p className="text-[10px] text-outline">JPG, PNG, DICOM, PDF (Max 10MB)</p>
                    {filePreview && (
                      <span className="text-xs text-primary font-bold mt-1">File Attached ✓</span>
                    )}
                  </label>
                </div>

                <div className="pt-4 flex justify-end w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-primary text-on-primary hover:bg-on-primary-fixed-variant disabled:opacity-60 disabled:cursor-not-allowed px-8 py-2.5 rounded-md font-title-md text-[16px] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        <span>Generating Token...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Token</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Track Status Column (4 cols on lg, full width on mobile/tablet) */}
          <div className="lg:col-span-4 space-y-6 w-full max-w-full min-w-0">
            <div className="bg-surface rounded-xl border border-outline-variant p-5 sm:p-6 shadow-sm lg:sticky lg:top-24 w-full max-w-full box-border">
              <h3 className="font-headline-lg text-lg sm:text-headline-lg text-on-surface mb-5 sm:mb-6 border-b border-outline-variant pb-3 sm:pb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">radar</span>
                Live Queue Status
              </h3>

              <form onSubmit={handleTokenSearch} className="space-y-4 w-full max-w-full">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value)}
                    placeholder="Enter Token (e.g. TKN-042)"
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant rounded-md pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-lg font-data-display text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all uppercase placeholder:normal-case placeholder:font-body-md placeholder:text-sm box-border"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-3 sm:top-3.5 text-outline-variant">
                    search
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 px-4 py-2.5 rounded-md font-label-sm text-label-sm font-semibold transition-colors border border-outline-variant flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Check Status
                </button>
              </form>

              {/* Status Display Card */}
              <div className="mt-6 sm:mt-8 border border-outline-variant rounded-lg overflow-hidden w-full max-w-full">
                <div className="bg-surface-container-low px-4 py-2.5 border-b border-outline-variant flex justify-between items-center">
                  <span className="font-data-display font-bold text-sm text-primary">{searchedData.tokenNumber}</span>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                </div>
                <div className="p-4 space-y-4 bg-surface-container-lowest">
                  <div className="flex justify-between items-end border-b border-surface-dim pb-3">
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase font-label-sm tracking-wider mb-1">Est. Wait Time</p>
                      <p className="font-display-lg text-2xl sm:text-display-lg text-on-surface leading-none">
                        {searchedData.waitTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-on-surface-variant uppercase font-label-sm tracking-wider mb-1">Queue Pos.</p>
                      <p className="font-headline-lg text-xl sm:text-headline-lg text-primary">{searchedData.queuePosition}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-on-surface-variant mb-1 font-label-sm">Current Status</p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                        pending_actions
                      </span>
                      <span className="font-body-md text-sm text-on-surface font-medium">{searchedData.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant text-center mt-4 opacity-70">
                Status auto-updates in real-time via Socket.IO engine.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-surface border-t border-outline-variant rounded-t-xl md:hidden shadow-lg">
        <Link to="/" className="flex flex-col items-center justify-center text-primary font-bold">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
            home
          </span>
          <span className="text-label-sm font-label-sm">Home</span>
        </Link>
        <Link to="/track-appointment" className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined mb-1">confirmation_number</span>
          <span className="text-label-sm font-label-sm">My Token</span>
        </Link>
        <Link to="/triage-queue" className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined mb-1">notifications</span>
          <span className="text-label-sm font-label-sm">Queue</span>
        </Link>
        <Link to="/login" className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined mb-1">person</span>
          <span className="text-label-sm font-label-sm">Staff Login</span>
        </Link>
      </nav>
    </div>
  );
};

export default PatientPortal;
