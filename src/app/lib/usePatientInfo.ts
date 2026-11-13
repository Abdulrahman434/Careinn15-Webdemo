import { useState, useEffect } from "react";
import { useNurseStore } from "../components/NurseDataStore";
import { useLocale } from "../components/i18n";
import { useTheme } from "../components/ThemeContext";

/* Burjeel's real record shape (long MRN, room and bed codes), shown in place
   of the built-in demo patient so the greeting chips are tested on the data
   that wrapped to two rows at Burjeel. A record from the API still wins.
   The name stays the demo patient's, Sara Saleh, as in every hospital. */
const DEMO_MRN = "00-284619";
const BURJEEL_TEST_PATIENT = {
  mrn: "0011013447",
  room: "BUHDR506",
  bed: "BUHDS506",
};

export interface PatientInfoResult {
  patient: ReturnType<typeof useNurseStore>["patient"];
  displayName: string;
  displayMrn: string;
  displayRoom: string;
  displayBed: string;
  displayAdmit: string;
  displayDischarge: string;
  nameMode: string | null;
  fileName: string;
  customName: string;
}

export function usePatientInfo(): PatientInfoResult {
  const nurseStore = useNurseStore();
  const { t, isRTL } = useLocale();
  const { activeConfigId } = useTheme();
  const p =
    activeConfigId === "burjeel" && nurseStore.patient.mrn === DEMO_MRN
      ? { ...nurseStore.patient, ...BURJEEL_TEST_PATIENT }
      : nurseStore.patient;

  const [nameMode, setNameMode] = useState<string | null>(() =>
    localStorage.getItem("careinn-display-name-mode")
  );

  const [customNameEn, setCustomNameEn] = useState<string>(() =>
    localStorage.getItem("careinn-display-name") || ""
  );

  const [customNameAr, setCustomNameAr] = useState<string>(() =>
    localStorage.getItem("careinn-display-name-ar") || ""
  );

  useEffect(() => {
    const handler = () => {
      setNameMode(localStorage.getItem("careinn-display-name-mode"));
      setCustomNameEn(localStorage.getItem("careinn-display-name") || "");
      setCustomNameAr(localStorage.getItem("careinn-display-name-ar") || "");
    };
    window.addEventListener("display-name-changed", handler);
    return () => window.removeEventListener("display-name-changed", handler);
  }, []);

  const fileName = isRTL
    ? (p.nameAr || p.name || (p.nameKey ? t(p.nameKey) : ""))
    : (p.name || (p.nameKey ? t(p.nameKey) : ""));

  const customName = isRTL
    ? (customNameAr || customNameEn || fileName)
    : (customNameEn || fileName);

  const displayName =
    nameMode === "skipped" ? "" :
    nameMode === "custom" ? (customName || fileName) :
    fileName;

  return {
    patient: p,
    displayName,
    displayMrn: p.mrn || "",
    displayRoom: p.room || "",
    displayBed: p.bed || "",
    displayAdmit: p.admissionDate || "",
    displayDischarge: p.dischargeDate || "",
    nameMode,
    fileName,
    customName,
  };
}
