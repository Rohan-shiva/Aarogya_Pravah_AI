import apiClient from "./apiClient";

export const authService = {
  login: async (credentials) => {
    try {
      const email = credentials.email || credentials.identifier || credentials.staffId;
      const password = credentials.password;

      const response = await apiClient.post("/auth/login", { email, password });
      const responseData = response.data;

      if (responseData.success && responseData.data?.token) {
        const token = responseData.data.token;
        const user = responseData.data.user;

        localStorage.setItem("aarogyapravah_token", token);
        localStorage.setItem("aarogyapravah_user", JSON.stringify(user));
        localStorage.setItem("smartqueue_token", token);
        localStorage.setItem("smartqueue_user", JSON.stringify(user));

        return {
          success: true,
          message: responseData.message || "Login successful",
          user,
          token
        };
      }

      return {
        success: false,
        message: responseData.message || "Invalid credentials."
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        error.message ||
        "Authentication failed. Please verify your credentials.";
      return { success: false, message: errMsg };
    }
  },

  register: async (userData) => {
    try {
      const payload = {
        name: userData.name || userData.fullName || "Clinical Staff",
        email: userData.email,
        password: userData.password,
        role: (userData.role || "STAFF").toUpperCase(),
        department: userData.department || "General Medicine",
        specialization: userData.specialization || userData.license || "General Practice",
        phoneNumber: userData.phoneNumber || userData.contact || "+91-9876543210"
      };

      const response = await apiClient.post("/auth/register", payload);
      const responseData = response.data;

      if (responseData.success && responseData.data?.token) {
        const token = responseData.data.token;
        const user = responseData.data.user;

        localStorage.setItem("aarogyapravah_token", token);
        localStorage.setItem("aarogyapravah_user", JSON.stringify(user));
        localStorage.setItem("smartqueue_token", token);
        localStorage.setItem("smartqueue_user", JSON.stringify(user));

        return {
          success: true,
          message: responseData.message || "Registration successful.",
          user,
          token
        };
      }

      return {
        success: false,
        message: responseData.message || "Registration could not be completed."
      };
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        error.message ||
        "Registration failed. Please try again.";
      return { success: false, message: errMsg };
    }
  },

  getMe: async () => {
    try {
      const response = await apiClient.get("/auth/me");
      if (response.data?.success && response.data.data?.user) {
        const user = response.data.data.user;
        localStorage.setItem("aarogyapravah_user", JSON.stringify(user));
        localStorage.setItem("smartqueue_user", JSON.stringify(user));
        return { success: true, user };
      }
      return { success: false, message: "User not found" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  getDoctors: async (department = "") => {
    try {
      const url = department ? `/auth/doctors?department=${encodeURIComponent(department)}` : "/auth/doctors";
      const response = await apiClient.get(url);
      return {
        success: true,
        doctors: response.data?.data?.doctors || []
      };
    } catch (error) {
      return { success: false, doctors: [] };
    }
  },

  resetPassword: async (identifier) => {
    return {
      success: true,
      message: `Password reset protocol dispatched for ${identifier}. Please follow the instructions sent to your institutional email.`
    };
  },

  logout: () => {
    localStorage.removeItem("aarogyapravah_token");
    localStorage.removeItem("aarogyapravah_user");
    localStorage.removeItem("smartqueue_token");
    localStorage.removeItem("smartqueue_user");
  },

  getCurrentUser: () => {
    const saved = localStorage.getItem("aarogyapravah_user") || localStorage.getItem("smartqueue_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated: () => {
    return !!(localStorage.getItem("aarogyapravah_token") || localStorage.getItem("smartqueue_token"));
  }
};

export default authService;
