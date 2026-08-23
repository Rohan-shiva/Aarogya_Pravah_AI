import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import queueService from "../../services/queueService";
import useSocket from "../../hooks/useSocket";
import useAuth from "../../hooks/useAuth";

export const TriageQueue = () => {
  const { isAuthenticated } = useAuth();
  const [queueList, setQueueList] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [stats, setStats] = useState({
    waitingPatients: 12,
    criticalCases: 3,
    pendingReview: 4,
    avgWaitTime: "18 mins"
  });
  const [loading, setLoading] = useState(true);

  const fetchLiveQueue = async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        queueService.getLiveQueue(departmentFilter === "all" ? "" : departmentFilter),
        queueService.getQueueStats()
      ]);

      if (queueRes.success && queueRes.data) {
        setQueueList(queueRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
  }, [departmentFilter]);

  useSocket("queue_updated", () => {
    fetchLiveQueue();
  });
  useSocket("queue-updated", () => {
    fetchLiveQueue();
  });
  useSocket("new_patient", () => {
    fetchLiveQueue();
  });
  useSocket("patient_verified", () => {
    fetchLiveQueue();
  });
  useSocket("priority_updated", () => {
    fetchLiveQueue();
  });
  useSocket("patient_completed", () => {
    fetchLiveQueue();
  });

  const filteredItems = queueList.filter((item) => {
    const name = (item.fullName || "").toLowerCase();
    const token = (item.tokenNumber || "").toLowerCase();
    const dept = (item.department || "").toLowerCase();
    const query = searchFilter.toLowerCase();

    const matchesQuery = name.includes(query) || token.includes(query);
    const matchesDept = departmentFilter === "all" || dept === departmentFilter.toLowerCase();
    return matchesQuery && matchesDept;
  });

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {isAuthenticated && <Sidebar activeSection="live_queue" />}

        <main className={`flex-1 p-margin-mobile md:p-gutter max-w-container-max mx-auto w-full ${isAuthenticated ? "md:ml-64" : ""} space-y-6 pb-20`}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-primary-fixed text-on-primary-fixed px-3 py-0.5 rounded-full font-label-sm text-xs mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Real-Time Triage Engine</span>
              </div>
              <h1 className="font-headline-lg text-display-lg text-on-surface font-bold">
                Smart Healthcare Triage Queue
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
                Dynamic patient queuing powered by Groq LLM urgency analysis and PyTorch imaging metrics.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                to="/appointment/new"
                className="px-4 py-2 bg-primary text-on-primary rounded font-label-sm text-xs font-semibold hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">add</span>
                New Patient Intake
              </Link>
            </div>
          </div>

          {/* Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm">
              <p className="text-xs font-label-sm text-secondary uppercase">Waiting Queue</p>
              <p className="font-display-lg text-2xl font-bold text-primary mt-1">{stats.waitingPatients}</p>
            </div>
            <div className="bg-error-container/80 border border-error/30 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-label-sm text-on-error-container uppercase">Critical Urgent</p>
              <p className="font-display-lg text-2xl font-bold text-error mt-1">{stats.criticalCases}</p>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm">
              <p className="text-xs font-label-sm text-secondary uppercase">Pending Validation</p>
              <p className="font-display-lg text-2xl font-bold text-on-surface mt-1">{stats.pendingReview}</p>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm">
              <p className="text-xs font-label-sm text-secondary uppercase">Avg Wait Time</p>
              <p className="font-display-lg text-2xl font-bold text-secondary mt-1">{stats.avgWaitTime}</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {["all", "cardiology", "orthopedics", "neurology", "general medicine"].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-3 py-1.5 rounded-full text-xs font-label-sm capitalize transition-colors ${
                    departmentFilter === dept
                      ? "bg-primary text-on-primary font-bold shadow-sm"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by name/token..."
                className="w-full pl-8 pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-primary"
              />
              <span className="material-symbols-outlined absolute left-2 top-2 text-on-surface-variant text-base">
                search
              </span>
            </div>
          </div>

          {/* Queue Data Table */}
          <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body-md text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-xs text-secondary uppercase">
                    <th className="py-3.5 px-4 font-semibold">Token</th>
                    <th className="py-3.5 px-4 font-semibold">Patient Name</th>
                    <th className="py-3.5 px-4 font-semibold">Department</th>
                    <th className="py-3.5 px-4 font-semibold">Symptoms & AI Findings</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Urgency Score</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredItems.map((item, idx) => {
                    const score = item.aiScoreBreakdown?.totalScore || item.aiPreliminary?.urgencyScore || 45;
                    const isCritical = score >= 80;

                    return (
                      <tr key={idx} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="py-3.5 px-4 font-data-display font-bold text-primary">
                          {item.tokenNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-on-surface">
                          {item.fullName}
                          <span className="text-xs text-on-surface-variant block font-normal font-label-sm">
                            Age: {item.age || 40}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-medium">
                          {item.department}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs text-xs text-on-surface truncate">
                          {item.aiSummary || item.symptoms}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-data-display font-bold px-2.5 py-0.5 rounded text-xs ${
                              isCritical ? "bg-error-container text-error" : "bg-primary-fixed text-primary"
                            }`}
                          >
                            {score}/100
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant font-label-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            {item.status || "In Queue"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/token/${item.tokenNumber}`}
                            className="px-3 py-1 bg-surface-container hover:bg-surface-container-high text-primary rounded font-label-sm text-xs font-semibold transition-colors"
                          >
                            View Slip
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TriageQueue;
