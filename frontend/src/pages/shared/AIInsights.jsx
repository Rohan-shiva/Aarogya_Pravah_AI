import React from "react";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import useAuth from "../../hooks/useAuth";

export const AIInsights = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {isAuthenticated && <Sidebar activeSection="ai_insights" />}

        <main className={`flex-1 p-margin-mobile md:p-gutter max-w-container-max mx-auto w-full ${isAuthenticated ? "md:ml-64" : ""} space-y-6 pb-20`}>
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 bg-primary-fixed text-primary px-3 py-1 rounded-full text-xs font-label-sm font-semibold mb-2">
              <span className="material-symbols-outlined text-sm">psychology</span>
              Clinical Precision AI Architecture
            </div>
            <h1 className="font-headline-lg text-display-lg text-on-surface font-bold">
              AI Triage Intelligence & Model Analytics
            </h1>
            <p className="font-body-lg text-sm text-on-surface-variant max-w-3xl mt-1">
              Zero-direct frontend coupling architecture: Triage evaluation requests pass securely through the Node.js backend to Groq (LLM Symptom Parsing) and PyTorch (DenseNet Medical Image Feature Extraction).
            </p>
          </div>

          {/* Architecture Pipeline Flow Diagram */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">hub</span>
              End-to-End Clinical Flow
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="font-body-md font-bold text-sm text-on-surface">Patient Intake</h4>
                <p className="text-xs text-on-surface-variant">
                  Patient submits structured symptoms, self-assessed severity, accidental trauma status, and optional X-Ray scans.
                </p>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="font-body-md font-bold text-sm text-on-surface">Staff Validation</h4>
                <p className="text-xs text-on-surface-variant">
                  Triage nurses review intake information, preliminary ghost text suggestions, and approve dispatch to AI engine.
                </p>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="font-body-md font-bold text-sm text-on-surface">Dual AI Processing</h4>
                <p className="text-xs text-on-surface-variant">
                  Groq parses risk indices (0-50). PyTorch evaluates radiological scans (0-30). Backend priority engine computes total composite score (0-100).
                </p>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h4 className="font-body-md font-bold text-sm text-on-surface">Doctor Queue</h4>
                <p className="text-xs text-on-surface-variant">
                  Dynamically sorted queue prioritizes critical cases, updating waiting positions in real-time over Socket.IO.
                </p>
              </div>
            </div>
          </div>

          {/* Model Weights & Mathematical Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Priority Score Weight Formulation
              </h3>
              <p className="text-xs text-on-surface-variant">
                The composite priority formula guarantees life-threatening trauma and acute cardiac events preempt routine walk-ins:
              </p>

              <div className="bg-surface-container-low p-4 rounded border border-outline-variant font-data-display text-xs text-primary space-y-1">
                <p className="font-bold">Total Priority = S_AI + S_IMG + W_SEV + B_WAIT</p>
                <p className="text-secondary text-[11px] font-normal">• S_AI: Groq LLM clinical risk score (max 40 pts)</p>
                <p className="text-secondary text-[11px] font-normal">• S_IMG: PyTorch radiological confidence (max 30 pts)</p>
                <p className="text-secondary text-[11px] font-normal">• W_SEV: Accidental & reported severity weight (max 20 pts)</p>
                <p className="text-secondary text-[11px] font-normal">• B_WAIT: Waiting time decay compensation (1 pt / 5 min)</p>
              </div>
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">security</span>
                Safety & Compliance Standards
              </h3>
              <ul className="space-y-2 text-xs text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check_circle</span>
                  <span><strong>Zero Direct AI Calls:</strong> All AI inference credentials remain strictly safeguarded on backend microservices.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check_circle</span>
                  <span><strong>Human-in-the-Loop Validation:</strong> Clinical staff approve patient data before triage prioritization.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check_circle</span>
                  <span><strong>HIPAA Data Isolation:</strong> Tokenized queue identifiers eliminate public display of sensitive medical history.</span>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AIInsights;
