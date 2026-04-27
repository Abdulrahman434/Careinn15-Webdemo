/**
 * NurseDataStore.ts
 *
 * Centralized data store for the Nurse Interface.
 * Uses the same pub/sub singleton pattern as the existing clinicalStore
 * in CareTeamInterface.tsx.
 *
 * This is the single source of truth for:
 *   - Section & item visibility (what the patient sees in CareMe)
 *   - All editable clinical data managed by the nurse
 *   - Observations (migrated from the existing clinicalStore)
 */

import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
 * TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════ */

export interface PatientProfile {
  name: string;
  nameKey: string;
  age: string;
  mrn: string;
  room: string;
  admissionDate: string;
  dischargeDate: string;
  contact: string;
  emergencyContact: string;
  emergencyName: string;
  extension: string;
}

export interface CareTeamMember {
  id: string;
  nameKey: string;
  roleKey: string;
  specialtyKey: string;
  img: string;
}

export interface CarePlanItem {
  id: string;
  labelKey: string;
  label?: string; // custom label (used for nurse-added items)
  done: boolean;
  active?: boolean;
  minutes?: number;
  timeKey?: string;
}

export interface LabResult {
  id: string;
  labelKey: string;
  value: string;
  status: "normal" | "low" | "high";
  date: string;
  summaryKey: string;
  pdfUrl: string;
  visible: boolean;
}

export interface ImagingResult {
  id: string;
  labelKey: string;
  date: string;
  summaryKey: string;
  type: string;
  pdfUrl: string;
  visible: boolean;
}

export interface BabyCamera {
  id: string;
  name: string;
  location: string;
  src: string; // video/image src
  connected: boolean;
  visible: boolean;
}

export interface FinancialItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  covered: number;
  date: string;
}

export interface DoctorNote {
  text: string;
  addedAt: Date;
  doctorName: string;
}

export interface ClinicalObservation {
  id: string;
  timestamp: Date;
  nurseName: string;
  vitals: { bp: string; hr: string; temp: string; spo2: string };
  painLevel: number;
  risks: { fall: boolean; pressure: boolean; allergies: boolean; other: boolean };
  otherRiskNotes?: string;
  nurseNotes: string;
  doctorNote: DoctorNote | null;
}

/** Section keys matching CareMe slides + new nurse-only sections */
export type SectionKey =
  | "profile"
  | "careOverview"
  | "carePlan"
  | "financial"
  | "labs"
  | "imaging"
  | "baby"
  | "discharge"
  | "observations";

/* ═══════════════════════════════════════════════════════════════
 * STORE STATE
 * ═══════════════════════════════════════════════════════════════ */

export interface NurseStoreState {
  /** Section-level visibility: key → visible to patient */
  sectionVisibility: Record<SectionKey, boolean>;

  /** Patient profile */
  patient: PatientProfile;

  /** Care team members */
  careTeam: CareTeamMember[];

  /** Allergies (raw string chips) */
  allergies: string[];

  /** Diet codes (e.g. "NAS", "DM") */
  dietCodes: { code: string; label: string }[];

  /** Pain score 0–10 */
  painScore: number;

  /** Care plan items (orderable) */
  carePlan: CarePlanItem[];

  /** Financial items */
  financial: FinancialItem[];
  financialShowToPatient: boolean;

  /** Lab results with per-item visibility */
  labResults: LabResult[];

  /** Imaging results with per-item visibility */
  imagingResults: ImagingResult[];

  /** Baby cameras with per-camera visibility */
  babyCameras: BabyCamera[];

  /** Discharge plan items (orderable) */
  dischargePlan: CarePlanItem[];

  /** Clinical observations */
  observations: ClinicalObservation[];
}

/* ═══════════════════════════════════════════════════════════════
 * DEFAULT / SEED DATA
 * ═══════════════════════════════════════════════════════════════ */

// Import paths for team member images (same as CareMe.tsx)
import imgNura from "@/assets/a7907a91bbdb1ced8824b3333ece109b3cd92b62.png";
import imgOmar from "@/assets/2318867853acb678569427c88b9e543e22bd46b6.png";
import imgBabyCam from "@/assets/68ba9ba13c5aa1cc7d2af5bee7bc955298b612dd.png";

function createDefaultState(): NurseStoreState {
  return {
    sectionVisibility: {
      profile: true,
      careOverview: true,
      carePlan: true,
      financial: true,
      labs: true,
      imaging: true,
      baby: true,
      discharge: true,
      observations: true,
    },

    patient: {
      name: "Sara Saleh",
      nameKey: "clinical.patient.sara",
      age: "32",
      mrn: "00-284619",
      room: "412",
      admissionDate: "10 Mar 2026",
      dischargeDate: "12 Mar 2026",
      contact: "+966 50 123 4567",
      emergencyContact: "+966 55 987 6543",
      emergencyName: "Ahmed Saleh",
      extension: "4217",
    },

    careTeam: [
      { id: "ct-1", nameKey: "care.team.name.nura", roleKey: "care.team.primaryNurse", specialtyKey: "care.team.specialty.icu", img: imgNura },
      { id: "ct-2", nameKey: "care.team.name.omar", roleKey: "care.team.attendingDoctor", specialtyKey: "care.team.specialty.cardiology", img: imgOmar },
    ],

    allergies: ["Penicillin", "Latex", "Shellfish"],

    dietCodes: [
      { code: "NAS", label: "No Added Salt" },
      { code: "DM", label: "Diabetic Diet" },
    ],

    painScore: 5,

    carePlan: [
      { id: "cp-1", labelKey: "care.plan.initialAssessment", done: true, timeKey: "care.plan.done" },
      { id: "cp-2", labelKey: "care.plan.bloodWork", done: true, timeKey: "care.plan.done" },
      { id: "cp-3", labelKey: "care.plan.medicationRound", done: false, active: true, minutes: 45 },
      { id: "cp-4", labelKey: "care.plan.checkup", done: false, minutes: 15 },
      { id: "cp-5", labelKey: "care.plan.physicalTherapy", done: false, minutes: 30 },
      { id: "cp-6", labelKey: "care.plan.doctorReview", done: false, minutes: 10 },
    ],

    financial: [
      { id: "fin-1", category: "Room & Board", description: "Private Room — 7 nights", amount: 35000, covered: 31500, date: "5–12 Mar" },
      { id: "fin-2", category: "Medications", description: "IV Antibiotics, Pain Management", amount: 8200, covered: 7380, date: "5–12 Mar" },
      { id: "fin-3", category: "Lab Tests", description: "CBC, BMP, Urinalysis, Blood Culture", amount: 4500, covered: 4050, date: "5–11 Mar" },
      { id: "fin-4", category: "Imaging", description: "Obstetric Ultrasound, Chest X-Ray", amount: 6000, covered: 5400, date: "5–9 Mar" },
      { id: "fin-5", category: "Procedures", description: "IV Insertion, Catheterization", amount: 3200, covered: 2880, date: "5 Mar" },
      { id: "fin-6", category: "Physician Fees", description: "Attending + Consulting physicians", amount: 12000, covered: 10800, date: "5–12 Mar" },
    ],
    financialShowToPatient: true,

    labResults: [
      { id: "lab-1", labelKey: "care.labs.cbc", value: "Normal range", status: "normal", date: "10 Mar", summaryKey: "care.labs.cbcSummary", pdfUrl: "/reports/lab-report-cbc.html", visible: true },
      { id: "lab-2", labelKey: "care.labs.hemoglobin", value: "11.2 g/dL", status: "low", date: "10 Mar", summaryKey: "care.labs.hgbSummary", pdfUrl: "/reports/lab-report-cbc.html", visible: true },
      { id: "lab-3", labelKey: "care.labs.glucose", value: "98 mg/dL", status: "normal", date: "11 Mar", summaryKey: "care.labs.normalRange", pdfUrl: "/reports/lab-report-cbc.html", visible: true },
      { id: "lab-4", labelKey: "care.labs.potassium", value: "4.1 mmol/L", status: "normal", date: "11 Mar", summaryKey: "care.labs.normalRange", pdfUrl: "/reports/lab-report-cbc.html", visible: true },
    ],

    imagingResults: [
      { id: "img-1", labelKey: "care.imaging.ultrasound", date: "09 Mar", summaryKey: "care.imaging.summary", type: "Obstetric", pdfUrl: "/reports/obstetric-ultrasound.html", visible: true },
      { id: "img-2", labelKey: "care.imaging.xray", date: "05 Mar", summaryKey: "care.imaging.xraySummary", type: "Chest", pdfUrl: "/reports/chest-xray.html", visible: true },
      { id: "img-3", labelKey: "care.imaging.doppler", date: "12 Mar", summaryKey: "care.imaging.dopplerSummary", type: "Ultrasound", pdfUrl: "/reports/venous-doppler.html", visible: true },
    ],

    babyCameras: [
      { id: "cam-1", name: "Baby Saleh", location: "Nursery · Crib 3A", src: imgBabyCam, connected: true, visible: true },
    ],

    dischargePlan: [
      { id: "dp-1", labelKey: "care.discharge.order", done: true, timeKey: "care.plan.done" },
      { id: "dp-2", labelKey: "care.discharge.insurance", done: true, timeKey: "care.plan.done" },
      { id: "dp-3", labelKey: "care.discharge.medication", done: false, active: true, minutes: 45 },
      { id: "dp-4", labelKey: "care.discharge.education", done: false, minutes: 20 },
      { id: "dp-5", labelKey: "care.discharge.finalCheckup", done: false, minutes: 25 },
      { id: "dp-6", labelKey: "care.discharge.confirm", done: false, minutes: 10 },
    ],

    observations: [
      {
        id: "seed-1",
        timestamp: new Date(Date.now() - 3600000 * 4),
        nurseName: "clinical.nurse.nura",
        vitals: { bp: "118/78", hr: "68", temp: "37.0", spo2: "99" },
        painLevel: 1,
        risks: { fall: true, pressure: false, allergies: true, other: false },
        nurseNotes: "Patient resting comfortably. Vitals stable. Tolerating oral intake.",
        doctorNote: {
          text: "Continue current plan. Reassess in the morning.",
          addedAt: new Date(Date.now() - 3600000 * 2),
          doctorName: "Dr. Omar Abdulhalim",
        },
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════
 * SINGLETON STORE (pub/sub)
 * ═══════════════════════════════════════════════════════════════ */

type StoreListener = (state: NurseStoreState) => void;

const nurseStore = (() => {
  let state = createDefaultState();
  const listeners = new Set<StoreListener>();

  function notify() {
    listeners.forEach((l) => l({ ...state }));
  }

  return {
    get: () => state,

    subscribe: (listener: StoreListener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    // ── Section visibility ──
    setSectionVisible: (key: SectionKey, visible: boolean) => {
      state = { ...state, sectionVisibility: { ...state.sectionVisibility, [key]: visible } };
      notify();
    },

    // ── Patient profile ──
    updatePatient: (updates: Partial<PatientProfile>) => {
      state = { ...state, patient: { ...state.patient, ...updates } };
      notify();
    },

    // ── Care Team ──
    addCareTeamMember: (member: CareTeamMember) => {
      state = { ...state, careTeam: [...state.careTeam, member] };
      notify();
    },
    removeCareTeamMember: (id: string) => {
      state = { ...state, careTeam: state.careTeam.filter((m) => m.id !== id) };
      notify();
    },

    // ── Allergies ──
    addAllergy: (name: string) => {
      if (!state.allergies.includes(name)) {
        state = { ...state, allergies: [...state.allergies, name] };
        notify();
      }
    },
    removeAllergy: (name: string) => {
      state = { ...state, allergies: state.allergies.filter((a) => a !== name) };
      notify();
    },

    // ── Diet Codes ──
    addDietCode: (code: string, label: string) => {
      if (!state.dietCodes.find((d) => d.code === code)) {
        state = { ...state, dietCodes: [...state.dietCodes, { code, label }] };
        notify();
      }
    },
    removeDietCode: (code: string) => {
      state = { ...state, dietCodes: state.dietCodes.filter((d) => d.code !== code) };
      notify();
    },

    // ── Pain Score ──
    setPainScore: (score: number) => {
      state = { ...state, painScore: Math.max(0, Math.min(10, score)) };
      notify();
    },

    // ── Care Plan ──
    setCarePlan: (items: CarePlanItem[]) => {
      state = { ...state, carePlan: items };
      notify();
    },
    addCarePlanItem: (item: CarePlanItem) => {
      state = { ...state, carePlan: [...state.carePlan, item] };
      notify();
    },
    updateCarePlanItem: (id: string, updates: Partial<CarePlanItem>) => {
      state = { ...state, carePlan: state.carePlan.map((i) => i.id === id ? { ...i, ...updates } : i) };
      notify();
    },
    deleteCarePlanItem: (id: string) => {
      state = { ...state, carePlan: state.carePlan.filter((i) => i.id !== id) };
      notify();
    },

    // ── Financial ──
    setFinancialShowToPatient: (show: boolean) => {
      state = { ...state, financialShowToPatient: show };
      notify();
    },

    // ── Lab Results ──
    setLabResultVisible: (id: string, visible: boolean) => {
      state = { ...state, labResults: state.labResults.map((l) => l.id === id ? { ...l, visible } : l) };
      notify();
    },

    // ── Imaging ──
    setImagingResultVisible: (id: string, visible: boolean) => {
      state = { ...state, imagingResults: state.imagingResults.map((i) => i.id === id ? { ...i, visible } : i) };
      notify();
    },

    // ── Baby Camera ──
    setBabyCameraVisible: (id: string, visible: boolean) => {
      state = { ...state, babyCameras: state.babyCameras.map((c) => c.id === id ? { ...c, visible } : c) };
      notify();
    },

    // ── Discharge Plan ──
    setDischargePlan: (items: CarePlanItem[]) => {
      state = { ...state, dischargePlan: items };
      notify();
    },
    addDischargePlanItem: (item: CarePlanItem) => {
      state = { ...state, dischargePlan: [...state.dischargePlan, item] };
      notify();
    },
    updateDischargePlanItem: (id: string, updates: Partial<CarePlanItem>) => {
      state = { ...state, dischargePlan: state.dischargePlan.map((i) => i.id === id ? { ...i, ...updates } : i) };
      notify();
    },
    deleteDischargePlanItem: (id: string) => {
      state = { ...state, dischargePlan: state.dischargePlan.filter((i) => i.id !== id) };
      notify();
    },

    // ── Observations ──
    addObservation: (obs: ClinicalObservation) => {
      state = { ...state, observations: [...state.observations, obs] };
      notify();
    },
    deleteObservation: (id: string) => {
      state = { ...state, observations: state.observations.filter((o) => o.id !== id) };
      notify();
    },
    addDoctorNote: (obsId: string, note: DoctorNote) => {
      state = {
        ...state,
        observations: state.observations.map((o) =>
          o.id === obsId ? { ...o, doctorNote: note } : o
        ),
      };
      notify();
    },
  };
})();

/* ═══════════════════════════════════════════════════════════════
 * REACT HOOK
 * ═══════════════════════════════════════════════════════════════ */

/** Subscribe to the full nurse data store. Re-renders on any change. */
export function useNurseStore() {
  const [state, setState] = useState<NurseStoreState>(nurseStore.get());
  useEffect(() => nurseStore.subscribe(setState), []);
  return state;
}

/** Direct access to store actions (stable references — no re-render trigger) */
export const nurseActions = nurseStore;
