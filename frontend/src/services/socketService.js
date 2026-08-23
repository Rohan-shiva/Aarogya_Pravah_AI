import { io } from "socket.io-client";

let socket = null;
const eventListeners = new Map();

export const socketService = {
  connectSocket: () => {
    if (socket && socket.connected) {
      return socket;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

    try {
      if (!socket) {
        socket = io(socketUrl, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          transports: ["websocket", "polling"]
        });

        socket.on("connect", () => {
          console.log("[Aarogya Pravah Socket] Connected to server:", socket.id);
        });

        socket.on("disconnect", (reason) => {
          console.log("[Aarogya Pravah Socket] Disconnected:", reason);
        });

        socket.on("connect_error", (error) => {
          console.warn("[Aarogya Pravah Socket] Connection failed:", error.message);
        });

        // Backend event names
        const serverEvents = [
          "new_patient",
          "patient_verified",
          "priority_updated",
          "queue_updated",
          "patient_called",
          "patient_on_hold",
          "patient_completed",
          "patient_status_updated",
          "joined_room"
        ];

        serverEvents.forEach((eventName) => {
          socket.on(eventName, (data) => {
            socketService.triggerLocal(eventName, data);

            // Forward compatibility aliases for UI components
            if (eventName === "new_patient") {
              socketService.triggerLocal("appointment-created", data.appointment || data);
            }
            if (eventName === "patient_verified") {
              socketService.triggerLocal("appointment-validated", data);
              socketService.triggerLocal("queue-updated", data);
            }
            if (eventName === "priority_updated") {
              socketService.triggerLocal("priority-updated", data);
              socketService.triggerLocal("queue-updated", data);
            }
            if (eventName === "queue_updated") {
              socketService.triggerLocal("queue-updated", data);
            }
            if (eventName === "patient_called") {
              socketService.triggerLocal("patient-called", data);
              socketService.triggerLocal("queue-updated", data);
            }
            if (eventName === "patient_on_hold") {
              socketService.triggerLocal("patient-on-hold", data);
              socketService.triggerLocal("queue-updated", data);
            }
            if (eventName === "patient_completed") {
              socketService.triggerLocal("patient-completed", data);
              socketService.triggerLocal("queue-updated", data);
            }
          });
        });
      } else if (!socket.connected) {
        socket.connect();
      }
    } catch (err) {
      console.warn("[Aarogya Pravah Socket] Initialization error:", err);
    }

    return socket;
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // Room Subscription Methods
  joinStaff: () => {
    const s = socketService.connectSocket();
    if (s) s.emit("join_staff");
  },

  joinDoctor: (doctorId = "") => {
    const s = socketService.connectSocket();
    if (s) s.emit("join_doctor", { doctorId });
  },

  joinDepartment: (department = "Emergency") => {
    const s = socketService.connectSocket();
    if (s) s.emit("join_department", { department });
  },

  joinPatient: (tokenNumber) => {
    const s = socketService.connectSocket();
    if (s && tokenNumber) s.emit("join_patient", { tokenNumber });
  },

  leavePatient: (tokenNumber) => {
    const s = socketService.connectSocket();
    if (s && tokenNumber) s.emit("leave_patient", { tokenNumber });
  },

  // Event Subscription
  subscribe: (eventName, callback) => {
    socketService.connectSocket();

    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, new Set());
    }
    eventListeners.get(eventName).add(callback);

    // Return cleanup unsubscribe function
    return () => {
      if (eventListeners.has(eventName)) {
        eventListeners.get(eventName).delete(callback);
      }
    };
  },

  triggerLocal: (eventName, data) => {
    if (eventListeners.has(eventName)) {
      eventListeners.get(eventName).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event listener for ${eventName}:`, e);
        }
      });
    }
  },

  emit: (eventName, data) => {
    const s = socketService.connectSocket();
    if (s && s.connected) {
      s.emit(eventName, data);
    }
    // Also trigger locally so UI updates immediately
    socketService.triggerLocal(eventName, data);
  }
};

export default socketService;
