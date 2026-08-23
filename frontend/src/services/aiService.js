import apiClient from "./apiClient";

export const aiService = {
  /**
   * Trigger Groq AI clinical triage analysis
   */
  runTriageAnalysis: async (appointmentId) => {
    try {
      const response = await apiClient.post(`/ai/analyze-triage/${appointmentId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to execute AI clinical triage."
      };
    }
  },

  /**
   * Get Groq AI clinical analysis for an appointment
   */
  getAnalysis: async (appointmentId) => {
    try {
      const response = await apiClient.get(`/ai/analysis/${appointmentId}`);
      return {
        success: true,
        data: response.data.data?.aiAnalysis
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "AI analysis not found."
      };
    }
  },

  /**
   * Get PyTorch medical image screening details
   */
  getImageAnalysis: async (appointmentId) => {
    try {
      const response = await apiClient.get(`/ai/image-analysis/${appointmentId}`);
      return {
        success: true,
        data: response.data.data?.imageAnalysis
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Image analysis not found."
      };
    }
  },

  /**
   * Ingest / simulate PyTorch medical image screening webhook result
   */
  submitPyTorchScreening: async (screeningData) => {
    try {
      const response = await apiClient.post("/ai/image-analysis-result", screeningData);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to ingest image screening signal."
      };
    }
  }
};

export default aiService;
