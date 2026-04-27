import { useEffect } from "react";

/**
 * AUTHORIZED_CARDS Registry
 * TODO: Move this to a backend/API service later.
 */
export const AUTHORIZED_CARDS: Record<string, { 
  name: string; 
  password: string; 
  route: string;
}> = {
  "043F1BFA577080": { 
    name: "Demo Patient", 
    password: "Dallah",
    route: "/home"
  },
};

/**
 * Detects whether window.AndroidNFC exists (running inside kiosk app).
 */
export const isNfcSupported = (): boolean => {
  return typeof window !== "undefined" && !!window.AndroidNFC;
};

/**
 * Custom hook to subscribe to the 'nfc-card-tap' window event.
 * @param callback - Function to execute when a tag is read.
 */
export const useNfcTap = (callback: (uid: string) => void) => {
  useEffect(() => {
    const handleEvent = (event: any) => {
      // The Android bridge should dispatch a CustomEvent named 'nfc-card-tap'
      // with the UID in event.detail
      const uid = event.detail;
      if (uid) {
        callback(uid);
      }
    };

    window.addEventListener("nfc-card-tap", handleEvent);

    return () => {
      window.removeEventListener("nfc-card-tap", handleEvent);
    };
  }, [callback]);
};
