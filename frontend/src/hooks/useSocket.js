import { useEffect, useRef } from "react";
import socketService from "../services/socketService";

export const useSocket = (eventName, callback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // Automatically ensure socket connection is initialized
    socketService.connectSocket();

    if (!eventName || !callback) return;

    const unsubscribe = socketService.subscribe(eventName, (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [eventName]);

  return {
    emit: socketService.emit,
    triggerLocal: socketService.triggerLocal
  };
};

export default useSocket;
