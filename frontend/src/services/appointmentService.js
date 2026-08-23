import apiClient from "./apiClient";

export const appointmentService = {
  /**
   * Book a new patient appointment with optional medical image upload
   */
  createAppointment: async (formData) => {
    try {
      const patient = formData.patient || {};
      const appointment = formData.appointment || {};
      const file = formData.medicalImage || null;

      // Build payload for backend
      const name = patient.fullName || patient.name || "Anonymous Patient";
      const age = parseInt(patient.age, 10) || 30;
      const gender = patient.gender || "Male";
      const phoneNumber = patient.contact || patient.phoneNumber || "+91-9876543210";
      const email = patient.email || "";
      const department = appointment.department || "General Medicine";
      const possibleCondition = appointment.possibleDisease || appointment.possibleCondition || "";
      const symptoms = appointment.symptoms || "General discomfort";
      const symptomsDescription = appointment.symptomsDescription || "";
      const severityLevel = (appointment.severity || appointment.severityLevel || "MEDIUM").toUpperCase();
      const isAccident = appointment.isAccidentalCase || appointment.isAccident || false;
      const accidentSeverity = (appointment.accidentSeverity || "NONE").toUpperCase();

      let response;

      if (file && file instanceof File) {
        const data = new FormData();
        data.append("name", name);
        data.append("age", String(age));
        data.append("gender", gender);
        data.append("phoneNumber", phoneNumber);
        if (email) data.append("email", email);
        data.append("department", department);
        data.append("possibleCondition", possibleCondition);
        data.append("symptoms", typeof symptoms === "string" ? symptoms : symptoms.join(", "));
        data.append("symptomsDescription", symptomsDescription);
        data.append("severityLevel", severityLevel);
        data.append("isAccident", String(isAccident));
        data.append("accidentSeverity", accidentSeverity);
        data.append("medicalImage", file);
        data.append("medicalImageType", "XRAY");

        response = await apiClient.post("/patients/appointments", data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        const jsonPayload = {
          name,
          age,
          gender,
          phoneNumber,
          email,
          department,
          possibleCondition,
          symptoms: typeof symptoms === "string" ? symptoms : symptoms.join(", "),
          symptomsDescription,
          severityLevel,
          isAccident,
          accidentSeverity
        };

        response = await apiClient.post("/patients/appointments", jsonPayload);
      }

      const resData = response.data;
      if (resData.success && resData.data) {
        const apptData = resData.data;
        return {
          success: true,
          message: resData.message,
          tokenNumber: apptData.tokenNumber,
          data: {
            tokenNumber: apptData.tokenNumber,
            appointmentId: apptData.appointmentId,
            patientName: apptData.patientName,
            department: apptData.department,
            estimatedWaitTime: `${apptData.estimatedWaitMinutes || 15} min`,
            estimatedWaitMinutes: apptData.estimatedWaitMinutes || 15,
            queuePosition: "#Pending",
            status: apptData.status === "PENDING_STAFF_VERIFICATION" ? "Waiting for Staff Verification" : apptData.status,
            appointmentTime: apptData.appointmentTime,
            message: apptData.message
          }
        };
      }

      return {
        success: false,
        message: resData.message || "Failed to register appointment."
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        error.message ||
        "Failed to submit appointment. Please check all fields.";
      return { success: false, message: errMsg };
    }
  },

  /**
   * Get public tracking status by token number (Privacy-Safe)
   */
  getAppointmentByToken: async (tokenNumber) => {
    if (!tokenNumber) {
      return { success: false, message: "Token number is required" };
    }

    try {
      const cleanToken = tokenNumber.trim().toUpperCase();
      const response = await apiClient.get(`/patients/token/${cleanToken}`);
      const resData = response.data;

      if (resData.success && resData.data) {
        const d = resData.data;
        const formattedStatus = formatStatusText(d.status);

        return {
          success: true,
          data: {
            tokenNumber: d.tokenNumber,
            department: d.department,
            appointmentDate: d.appointmentDate,
            status: formattedStatus,
            rawStatus: d.status,
            queuePosition: d.queuePosition !== null ? `#${d.queuePosition}` : (d.status === "IN_CONSULTATION" ? "Serving Now" : "#--"),
            numericQueuePosition: d.queuePosition,
            estimatedWaitTime: d.estimatedWaitMinutes !== null ? `${d.estimatedWaitMinutes} min` : (d.status === "IN_CONSULTATION" ? "0 min" : "Calculating..."),
            estimatedWaitMinutes: d.estimatedWaitMinutes,
            priorityLevel: d.priorityLevel || "STANDARD",
            isPending: d.isPending || false,
            pendingReason: d.pendingReason || null,
            assignedDoctor: d.assignedDoctor || null,
            departmentQueueStats: d.departmentQueueStats || { totalWaiting: 0, currentServingToken: "None" },
            lastUpdated: d.lastUpdated
          }
        };
      }

      return {
        success: false,
        message: resData.message || "Token not found"
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        "No appointment found with the provided token number.";
      return { success: false, message: errMsg };
    }
  }
};

/**
 * Human-friendly status label helper
 */
function formatStatusText(status) {
  switch (status) {
    case "PENDING_STAFF_VERIFICATION":
      return "Waiting for Staff Verification";
    case "REQUIRES_CLARIFICATION":
      return "Requires Clarification at Desk";
    case "VERIFIED":
    case "WAITING":
      return "In AI Triage Queue";
    case "IN_CONSULTATION":
      return "In Consultation with Doctor";
    case "PENDING":
      return "On Hold (Pending Diagnostics)";
    case "COMPLETED":
      return "Consultation Completed";
    case "REJECTED":
      return "Appointment Cancelled";
    default:
      return status || "In Queue";
  }
}

export default appointmentService;
