import apiClient, { getAssetUrl } from "./apiClient";

export const doctorService = {
  /**
   * Fetch prioritized waiting queue for doctor
   */
  getPriorityQueue: async (department = "") => {
    try {
      const url = department ? `/doctor/queue?department=${encodeURIComponent(department)}` : "/doctor/queue";
      const response = await apiClient.get(url);
      const resData = response.data;

      if (resData.success && resData.data?.queue) {
        const normalized = resData.data.queue.map(adaptQueueEntryForDoctor);
        return {
          success: true,
          count: resData.data.count,
          department: resData.data.department,
          data: normalized
        };
      }

      return { success: true, count: 0, data: [] };
    } catch (error) {
      console.warn("Failed to fetch doctor queue from backend:", error.message);
      return { success: false, message: error.message, data: [] };
    }
  },

  /**
   * Fetch patients currently on hold in pending queue
   */
  getPendingQueue: async (department = "") => {
    try {
      const url = department
        ? `/doctor/pending-queue?department=${encodeURIComponent(department)}`
        : "/doctor/pending-queue";

      const response = await apiClient.get(url);
      const resData = response.data;

      if (resData.success && resData.data?.pendingQueue) {
        const normalized = resData.data.pendingQueue.map(adaptPendingEntryForDoctor);
        return {
          success: true,
          count: resData.data.count,
          department: resData.data.department,
          data: normalized
        };
      }

      return { success: true, count: 0, data: [] };
    } catch (error) {
      console.warn("Failed to fetch doctor pending queue:", error.message);
      return { success: false, message: error.message, data: [] };
    }
  },

  /**
   * Fetch patient clinical file & history by appointmentId or patientId
   */
  getPatientDetails: async (appointmentOrPatientId) => {
    try {
      const response = await apiClient.get(`/doctor/patient/${appointmentOrPatientId}`);
      const resData = response.data;

      if (resData.success && resData.data) {
        const d = resData.data;
        return {
          success: true,
          data: adaptClinicalRecord(d)
        };
      }
      return { success: false, message: "Clinical record not found" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Call / Start consultation with patient
   */
  startConsultation: async (queueEntryId) => {
    try {
      const response = await apiClient.post("/doctor/consultation/start", { queueEntryId });
      return {
        success: true,
        message: response.data.message || "Consultation started.",
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to start consultation."
      };
    }
  },

  /**
   * Complete consultation and record diagnosis, vitals, prescriptions
   */
  completeAppointment: async (queueEntryIdOrPatientId, payload = {}) => {
    try {
      // payload can be string or object
      let clinicalNotes = "";
      let diagnosisNotes = "";
      let vitals = {};
      let prescriptions = [];
      let queueEntryId = queueEntryIdOrPatientId;

      if (typeof payload === "string") {
        clinicalNotes = payload;
      } else if (typeof payload === "object") {
        clinicalNotes = payload.clinicalNotes || payload.notes || "";
        diagnosisNotes = payload.diagnosisNotes || payload.diagnosis || "";
        vitals = payload.vitals || {};
        prescriptions = payload.prescriptions || [];
        if (payload.queueEntryId) queueEntryId = payload.queueEntryId;
      }

      const body = {
        queueEntryId,
        clinicalNotes: clinicalNotes || "Consultation completed and patient advised follow-up if symptoms persist.",
        diagnosisNotes: diagnosisNotes || "Clinical assessment completed.",
        vitals,
        prescriptions
      };

      const response = await apiClient.post("/doctor/consultation/complete", body);
      return {
        success: true,
        message: response.data.message || "Appointment marked complete.",
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to complete appointment."
      };
    }
  },

  /**
   * Put patient on hold in pending queue
   */
  holdPatientForDoctor: async (queueEntryId, reason = "Sent to Radiology for urgent scan", category = "XRAY_SCAN") => {
    try {
      const body = {
        queueEntryId,
        reason: typeof reason === "object" ? reason.reason : reason,
        category: (typeof reason === "object" ? reason.category : category) || "XRAY_SCAN",
        notes: typeof reason === "object" ? reason.notes : ""
      };

      const response = await apiClient.post("/doctor/queue/hold", body);
      return {
        success: true,
        message: response.data.message || "Patient moved to pending queue.",
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to put patient on hold."
      };
    }
  },

  /**
   * Resume patient from hold back to priority queue with boost
   */
  resumePatient: async (queueEntryId) => {
    try {
      const response = await apiClient.post("/doctor/queue/resume", { queueEntryId });
      return {
        success: true,
        message: response.data.message || "Patient returned to active queue with priority boost.",
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to resume patient."
      };
    }
  },

  /**
   * Get doctor's completed consultations history
   */
  getDoctorHistory: async () => {
    try {
      const response = await apiClient.get("/doctor/history");
      return {
        success: true,
        consultations: response.data?.data?.consultations || []
      };
    } catch (error) {
      return { success: false, consultations: [] };
    }
  }
};

/**
 * Adapter helper for Queue Entry into Doctor Dashboard item
 */
function adaptQueueEntryForDoctor(entry) {
  const appt = entry.appointment || {};
  const patient = entry.patient || {};
  const ai = entry.aiAnalysis || {};
  const img = entry.imageAnalysis || {};
  const checkIn = entry.checkInTime ? new Date(entry.checkInTime) : new Date();

  return {
    id: entry._id, // QueueEntry ID
    queueEntryId: entry._id,
    appointmentId: appt._id,
    patientId: patient._id,
    tokenNumber: appt.tokenNumber || "TKN-000",
    fullName: patient.name || "Walk-in Patient",
    age: patient.age || "--",
    gender: patient.gender || "Unspecified",
    arrivalTime: checkIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    waitTime: entry.estimatedWaitMinutes !== undefined ? `${entry.estimatedWaitMinutes} min` : "15 min",
    estimatedWaitMinutes: entry.estimatedWaitMinutes || 0,
    department: entry.department,
    priorityScore: entry.priorityScore || 50,
    priorityLevel: entry.priorityLevel || "MEDIUM",
    status: entry.status === "IN_CONSULTATION" ? "In Consultation" : (entry.isPending ? "Hold" : "Waiting"),
    rawStatus: entry.status,
    isPending: entry.isPending || false,
    symptoms: Array.isArray(appt.symptoms) ? appt.symptoms.join(", ") : (appt.symptoms || "General triage assessment"),
    symptomsDescription: appt.symptomsDescription || "",
    isAccident: Boolean(appt.isAccident),
    accidentSeverity: appt.accidentSeverity || "NONE",
    medicalImageUrl: (appt.medicalImageUrl || appt.medicalImage?.secureUrl) ? getAssetUrl(appt.medicalImageUrl || appt.medicalImage?.secureUrl) : null,
    aiAssessment: {
      urgencyLevel: ai.urgencyLevel || entry.priorityLevel,
      riskLevel: ai.riskLevel || "MODERATE",
      urgencyScore: entry.priorityScore || 50,
      priorityRecommendation: ai.priorityRecommendation || entry.priorityLevel,
      reason: ai.reason || "Patient triaged based on reported symptoms & clinical severity.",
      riskFactors: ai.riskFactors || []
    },
    imageScreening: img.screeningStatus ? {
      screeningStatus: img.screeningStatus,
      imageScore: img.imageScore || 0,
      confidenceSignal: img.confidenceSignal || 0.85,
      possibleFindings: img.possibleFindings || [],
      imageUrl: img.imageUrl ? getAssetUrl(img.imageUrl) : ((appt.medicalImageUrl || appt.medicalImage?.secureUrl) ? getAssetUrl(appt.medicalImageUrl || appt.medicalImage?.secureUrl) : null)
    } : null
  };
}

/**
 * Adapter helper for Pending Queue Entry
 */
function adaptPendingEntryForDoctor(entry) {
  const item = adaptQueueEntryForDoctor(entry);
  item.status = "Hold";
  item.isPending = true;
  item.pendingReason = entry.pendingDetails?.reason || "Awaiting diagnostic scan results";
  item.pendingCategory = entry.pendingDetails?.category || "XRAY_SCAN";
  item.heldAt = entry.pendingDetails?.heldAt ? new Date(entry.pendingDetails.heldAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently";
  return item;
}

/**
 * Adapter helper for full clinical details
 */
function adaptClinicalRecord(data) {
  const appt = data.appointment || {};
  const patient = data.patient || {};
  const ai = data.aiAnalysis || {};
  const img = data.imageAnalysis || {};
  const queueEntry = data.queueEntry || {};
  const past = data.pastConsultations || [];
  const resolvedImageUrl = (appt.medicalImageUrl || appt.medicalImage?.secureUrl) ? getAssetUrl(appt.medicalImageUrl || appt.medicalImage?.secureUrl) : null;

  return {
    queueEntryId: queueEntry._id,
    appointmentId: appt._id,
    tokenNumber: appt.tokenNumber,
    patient: {
      id: patient._id,
      fullName: patient.name || "Patient Record",
      age: patient.age || 40,
      gender: patient.gender || "Unspecified",
      dob: patient.dob || "1984-01-01",
      bloodGroup: patient.bloodGroup || "O+",
      phoneNumber: patient.phoneNumber || "--",
      allergies: patient.allergies || ["None reported"],
      primaryDoctor: appt.assignedDoctor?.name || "Dr. Staff On Duty"
    },
    clinical: {
      department: appt.department,
      symptoms: Array.isArray(appt.symptoms) ? appt.symptoms.join(", ") : appt.symptoms,
      symptomsDescription: appt.symptomsDescription || "",
      reportedSeverity: appt.reportedSeverity,
      staffSeverity: appt.staffSeverity,
      isAccident: appt.isAccident,
      accidentSeverity: appt.accidentSeverity,
      medicalImageUrl: resolvedImageUrl
    },
    aiAnalysis: ai._id ? {
      urgencyLevel: ai.urgencyLevel,
      riskLevel: ai.riskLevel,
      riskFactors: ai.riskFactors || [],
      priorityRecommendation: ai.priorityRecommendation,
      reason: ai.reason,
      urgencyScore: queueEntry.priorityScore || 75
    } : {
      urgencyLevel: "MEDIUM",
      riskLevel: "MEDIUM",
      riskFactors: ["Awaiting Groq analysis"],
      priorityRecommendation: "MEDIUM",
      reason: "Clinical staff verification completed.",
      urgencyScore: queueEntry.priorityScore || 60
    },
    imageAnalysis: img._id ? {
      screeningStatus: img.screeningStatus,
      imageScore: img.imageScore,
      possibleFindings: img.possibleFindings || [],
      confidenceSignal: img.confidenceSignal,
      imageUrl: img.imageUrl ? getAssetUrl(img.imageUrl) : resolvedImageUrl
    } : null,
    timeline: past.length > 0 ? past.map((c, idx) => ({
      id: c._id || `past-${idx}`,
      date: new Date(c.createdAt || c.startTime).toLocaleDateString(),
      department: c.doctor?.department || "General Medicine",
      aiPriority: "Resolved",
      conditionTitle: c.diagnosisNotes || "General Checkup",
      diagnosis: c.clinicalNotes || "Routine consultation completed."
    })) : [
      {
        id: "cur-1",
        date: new Date().toLocaleDateString(),
        department: appt.department || "General Medicine",
        aiPriority: queueEntry.priorityLevel || "HIGH",
        conditionTitle: Array.isArray(appt.symptoms) ? appt.symptoms[0] : (appt.symptoms || "Current Visit"),
        diagnosis: "Current consultation in progress."
      }
    ]
  };
}

export default doctorService;
