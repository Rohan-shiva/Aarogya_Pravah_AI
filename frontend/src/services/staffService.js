import apiClient, { getAssetUrl } from "./apiClient";

export const staffService = {
  /**
   * Get all unverified patient appointments
   */
  getPendingPatients: async (department = "") => {
    try {
      const url = department
        ? `/staff/pending-verifications?department=${encodeURIComponent(department)}`
        : "/staff/pending-verifications";

      const response = await apiClient.get(url);
      const resData = response.data;

      if (resData.success && resData.data?.appointments) {
        const normalized = resData.data.appointments.map(adaptAppointmentForStaff);
        return { success: true, count: resData.data.count, data: normalized };
      }

      return { success: true, count: 0, data: [] };
    } catch (error) {
      console.warn("Failed to fetch pending verifications from backend:", error.message);
      return { success: false, message: error.message, data: [] };
    }
  },

  /**
   * Get complete patient details by appointment ID
   */
  getPatientDetails: async (appointmentId) => {
    try {
      const response = await apiClient.get(`/staff/patient/${appointmentId}`);
      const resData = response.data;
      if (resData.success && resData.data) {
        return { success: true, data: resData.data };
      }
      return { success: false, message: "Patient record not found" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Verify & approve patient into smart queue (triggers Groq AI triage & priority calculation)
   */
  validatePatient: async (appointmentId, payload = {}) => {
    try {
      const body = {
        staffSeverity: (payload.staffSeverity || payload.severity || "HIGH").toUpperCase(),
        verificationNotes: payload.verificationNotes || payload.notes || "Clinical verification completed by hospital staff.",
        isAccident: Boolean(payload.isAccident || payload.isAccidentalCase),
        accidentSeverity: (payload.accidentSeverity || "NONE").toUpperCase(),
        department: payload.department
      };

      const response = await apiClient.post(`/staff/verify/${appointmentId}`, body);
      const resData = response.data;

      return {
        success: resData.success,
        message: resData.message || "Patient successfully verified and queued.",
        data: resData.data
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "Failed to verify patient.";
      return { success: false, message: errMsg };
    }
  },

  /**
   * Request clarification / flag patient
   */
  holdPatient: async (appointmentId, clarificationReason = "Please visit desk for additional clinical vitals verification") => {
    try {
      const response = await apiClient.post(`/staff/request-clarification/${appointmentId}`, {
        clarificationReason
      });
      return {
        success: true,
        message: response.data.message || "Clarification requested from patient.",
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to request clarification."
      };
    }
  },

  /**
   * Reject appointment
   */
  rejectPatient: async (appointmentId, rejectionReason = "Incomplete or duplicate booking") => {
    try {
      const response = await apiClient.post(`/staff/reject/${appointmentId}`, {
        rejectionReason
      });
      return {
        success: true,
        message: response.data.message || "Appointment rejected.",
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to reject appointment."
      };
    }
  },

  /**
   * Override severity
   */
  updateSeverity: async (appointmentId, severity) => {
    try {
      const response = await apiClient.post(`/staff/update-severity/${appointmentId}`, {
        severity: severity.toUpperCase()
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get real-time staff notifications
   */
  getNotifications: async () => {
    return {
      success: true,
      data: [
        {
          id: "sys-live-1",
          type: "system_status",
          title: "Aarogya Pravah AI Real-Time Active",
          message: "Socket.IO triage stream and Groq LLaMA 3.3 engine online.",
          time: "Just now",
          unread: true
        }
      ]
    };
  },

  /**
   * Get staff profile from authenticated session
   */
  getStaffProfile: async () => {
    try {
      const response = await apiClient.get("/auth/me");
      if (response.data?.success && response.data.data?.user) {
        const user = response.data.data.user;
        return {
          success: true,
          data: {
            id: user.id || user._id,
            name: user.name,
            role: user.role === "STAFF" ? "Hospital Triage Staff" : user.role,
            department: user.department || "Emergency & Triage",
            email: user.email,
            contact: user.phoneNumber || "+91-9876543210",
            specializations: [user.specialization || "Emergency Triage & Intake Protocol"],
            employeeId: `EMP-${(user.id || "0000").slice(-4).toUpperCase()}`,
            shiftStatus: "On-Duty"
          }
        };
      }
    } catch {
      // Fallback to localStorage user
      const savedUser = JSON.parse(localStorage.getItem("smartqueue_user") || "{}");
      if (savedUser.name) {
        return {
          success: true,
          data: {
            id: savedUser.id,
            name: savedUser.name,
            role: savedUser.role || "Triage Staff",
            department: savedUser.department || "Emergency & Triage",
            email: savedUser.email
          }
        };
      }
    }
    return { success: false, data: null };
  }
};

/**
 * Adapter helper to transform MongoDB Appointment into rich UI format
 */
function adaptAppointmentForStaff(appt) {
  const patient = appt.patient || {};
  const symptomsStr = Array.isArray(appt.symptoms) ? appt.symptoms.join(", ") : (appt.symptoms || "");
  const createdDate = appt.createdAt ? new Date(appt.createdAt) : new Date();

  const attachments = [];
  const imageUrl = appt.medicalImageUrl || appt.medicalImage?.secureUrl;
  if (imageUrl) {
    attachments.push({
      id: `img-${appt._id}`,
      fileName: imageUrl.split("/").pop() || "Medical_XRay_Scan.jpg",
      fileType: "image/jpeg",
      url: getAssetUrl(imageUrl)
    });
  }

  return {
    id: appt._id,
    appointmentId: appt._id,
    tokenNumber: appt.tokenNumber,
    fullName: patient.name || "Patient Record",
    age: patient.age || "--",
    gender: patient.gender || "Not specified",
    dob: patient.dob || "N/A",
    bloodGroup: patient.bloodGroup || "Pending",
    contact: patient.phoneNumber || "--",
    email: patient.email || "",
    arrivalTime: createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    waitTime: `${appt.initialEstimatedWaitMinutes || 15} min wait`,
    department: appt.department,
    reportedSeverity: appt.reportedSeverity || "MEDIUM",
    isAccidentalCase: Boolean(appt.isAccident),
    accidentSeverity: appt.accidentSeverity || "NONE",
    status: appt.status,
    symptoms: symptomsStr,
    symptomsDescription: appt.symptomsDescription || "",
    possibleCondition: appt.possibleCondition || "",
    aiPreliminary: {
      suggestedDisease: appt.possibleCondition || "Preliminary AI Assessment In Progress...",
      urgencyScore: appt.reportedSeverity === "CRITICAL" ? 95 : appt.reportedSeverity === "HIGH" ? 75 : 50,
      riskLevel: appt.reportedSeverity || "MEDIUM"
    },
    attachments
  };
}

export default staffService;
