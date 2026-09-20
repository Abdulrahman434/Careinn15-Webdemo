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
 * OVERRIDE TRACKING LOGIC
 * ═══════════════════════════════════════════════════════════════ */

// Fields that can be overridden by nurse
export type OverridableField = 
  | "name" | "room" | "bed" | "mrn" 
  | "admissionDate" | "dischargeDate" | "nameAr" | "age" | "dob" | "sex"
  | "contact" | "emergencyContact" | "emergencyName" | "extension";

// localStorage key
const OVERRIDE_KEY     = "careinn-nurse-overrides";
const API_SNAPSHOT_KEY = "careinn-api-snapshot";

// In-memory override set — which fields nurse has manually edited
// after API populated them
let _nurseOverrides: Set<OverridableField> = (() => {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return new Set(JSON.parse(raw ?? "[]"));
  } catch { return new Set(); }
})();

// Last values written by the API — used to detect real changes
let _apiSnapshot: Partial<PatientProfile> = (() => {
  try {
    const raw = localStorage.getItem(API_SNAPSHOT_KEY);
    return JSON.parse(raw ?? "{}");
  } catch { return {}; }
})();

function saveOverrides() {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify([..._nurseOverrides]));
}

function saveApiSnapshot(data: Partial<PatientProfile>) {
  _apiSnapshot = { ..._apiSnapshot, ...data };
  localStorage.setItem(API_SNAPSHOT_KEY, JSON.stringify(_apiSnapshot));
}

function clearOverrides() {
  _nurseOverrides.clear();
  localStorage.removeItem(OVERRIDE_KEY);
  localStorage.removeItem(API_SNAPSHOT_KEY);
  _apiSnapshot = {};
}

/* ═══════════════════════════════════════════════════════════════
 * TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════ */

export interface PatientProfile {
  name: string;
  nameAr: string;
  nameKey: string;
  age: string;
  mrn: string;
  room: string;
  bed:           string;
  sex:           string;
  dob:           string;
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
  visible: boolean;
}

export interface CarePlanItem {
  id: string;
  labelKey: string;
  label?: string; // custom label (used for nurse-added items)
  labelAr?: string; // custom arabic label
  done: boolean;
  active?: boolean;
  minutes?: number;
  day?: number;
  date?: string; // YYYY-MM-DD
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

/** A procedure the patient had or is booked for. Unlike labs and imaging the
 *  name is ward-entered free text rather than a translation key — the same way
 *  discharge contacts already work — so it renders with dir="auto".
 *  `pdfUrl` empty means the report is not back yet. */
export interface ProcedureResult {
  id: string;
  label: string;
  date: string;
  summary?: string;
  pdfUrl?: string;
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

/** Alerts the ward raises against a bed rather than against a diagnosis.
 *
 *  `similarName` guards against patient misidentification: two patients on the
 *  ward whose names read alike. The bedside screen shows THAT it is in force
 *  and nothing more — `similarNameWith` names a patient in another bed and
 *  stays staff-facing.
 *  `isolation` is shown to patient and visitors too, since the precautions
 *  apply to anyone entering. */
export interface SafetyAlerts {
  similarName: boolean;
  /** The other patient's name, so the nurse knows who to check against.
   *  NEVER rendered on the bedside screen. */
  similarNameWith: string;
  isolation: boolean;
  /** Free text: "Contact", "Droplet", "Airborne", "Protective" … */
  isolationType: string;
  /** Assessed fall risk. "" when the ward has not assessed one. */
  /** "" is not assessed; "none" is assessed and found to carry no risk —
   *  a different fact, and the one a nurse wants to be able to state.
   *  "medium" is kept so overrides saved before the rename still read. */
  fallRisk: "" | "none" | "low" | "moderate" | "medium" | "high";
  /** The nursing team's goal for today, shown at the top of the patient's
   *  Person-Centered Care card. Free text so a ward can say what it means,
   *  chosen from a preset list in the nurse interface. */
  careGoal: string;
  /** Patient-friendly lines the ward wrote, one per row. Empty means the
   *  section does not appear — an isolation badge with no instructions under
   *  it tells the patient a rule applies without saying what it is. */
  isolationInstructions: string[];
  /** What the patient should do to keep moving safely. Assessed and written
   *  separately from `fallRisk`: a patient with no fall risk can still be on
   *  a mobility plan, and a high risk does not itself dictate the advice. */
  mobilityInstructions: string[];
}

export interface ClinicalObservation {
  id: string;
  timestamp: Date;
  nurseName: string;
  vitals: { bp: string; hr: string; temp: string; spo2: string; resp?: string };
  painLevel: number;
  risks: { fall: boolean; pressure: boolean; allergies: boolean; other: boolean };
  otherRiskNotes?: string;
}

/** What the patient leaves with, alongside the discharge step list: where to
 *  come back to, who to call, and what to do at home. */
export interface FollowUpAppointment {
  id: string;
  /** Clinic or specialty the appointment is with. */
  label: string;
  /** Free text — the HIS is not the source for this yet. */
  when: string;
}

export interface PostDischargeContact {
  id: string;
  label: string;
  value: string;
}

export interface DischargeInfo {
  followUps: FollowUpAppointment[];
  contacts: PostDischargeContact[];
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
  | "dischargePlan"
  | "observations"
  | "pcc"
  | "forms"
  | "nfc";

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

  /** Patient diet — single-select, matches DietType from menuData + "npo" */
  patientDiet: string;

  /** Pain score 0–10 */
  painScore: number;

  /** Ward safety alerts shown on Care Overview. */
  alerts: SafetyAlerts;

  /** Care plan items (orderable) */
  carePlan: CarePlanItem[];

  /** Financial items */
  financial: FinancialItem[];

  /** Lab results with per-item visibility */
  labResults: LabResult[];

  /** Imaging results with per-item visibility */
  imagingResults: ImagingResult[];

  /** Procedures with per-item visibility */
  procedures: ProcedureResult[];

  /** Baby cameras with per-camera visibility */
  babyCameras: BabyCamera[];

  /** Discharge plan items (orderable) */
  dischargePlan: CarePlanItem[];

  /** Follow-ups, contacts and take-home instructions. */
  dischargeInfo: DischargeInfo;

  /** Clinical observations */
  observations: ClinicalObservation[];

  /** Whether to show the "Nurse View" shortcut button on CareMe */
  nurseViewShortcutVisible: boolean;
  
  /** Care Plan Shared State */
  carePlanMode: "daily" | "overall";
  carePlanSelectedDate: string; // YYYY-MM-DD

  /** HIS integration status & per-section HIS data flags */
  isHisConnected: boolean;
  isLocalFallback: boolean;
  hisSections: Record<string, boolean>;
}

/* ═══════════════════════════════════════════════════════════════
 * DEFAULT / SEED DATA
 * ═══════════════════════════════════════════════════════════════ */

// Import paths for team member images (same as CareMe.tsx)
import imgNura from "@/assets/a7907a91bbdb1ced8824b3333ece109b3cd92b62.webp";
import imgOmar from "@/assets/2318867853acb678569427c88b9e543e22bd46b6.webp";
import imgBabyCam from "@/assets/68ba9ba13c5aa1cc7d2af5bee7bc955298b612dd.webp";

function createDefaultState(): NurseStoreState {
  const now = new Date();
  const getISO = (d: Date) => d.toISOString().split("T")[0];
  const shift = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
  };

  const formatPatientDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const todayStr = getISO(now);
  const tomorrowStr = getISO(shift(now, 1));
  const day2Str = getISO(shift(now, 2));
  const day3Str = getISO(shift(now, 3));

  const defaultAdmitDate = formatPatientDate(shift(now, -2));
  const defaultDischargeDate = formatPatientDate(shift(now, 2));

  return {
    isHisConnected: false,
    hisSections: {
      profile: false,
      emergency: false,
      careOverview: false,
      carePlan: false,
      financial: false,
      labs: false,
      imaging: false,
      baby: false,
      discharge: false,
      dischargePlan: false,
      observations: false,
    },
    sectionVisibility: {
      profile: true,
      careOverview: true,
      carePlan: true,
      // Financial Summary and Baby Camera were withdrawn from both the bedside
      // carousel and the nurse tabs; the data and their components remain.
      financial: false,
      labs: true,
      imaging: true,
      baby: false,
      discharge: true,
      dischargePlan: true,
      observations: true,
      pcc: true,
      forms: false, // Nurse-side signing tool, not a patient-facing CareMe slide
      nfc: false, // Not a patient-facing CareMe slide
    },

    patient: {
      name: "Sara Saleh",
      nameAr: "سارة صالح",
      nameKey: "clinical.patient.sara",
      age: "32",
      mrn: "00-284619",
      room: "412",
      bed:           "",
      sex:           "",
      dob:           "",
      admissionDate: defaultAdmitDate,
      dischargeDate: defaultDischargeDate,
      contact: "050 123 4567",
      emergencyContact: "055 987 6543",
      emergencyName: "Ahmed Saleh",
      extension: "4217",
    },

    careTeam: [
      { id: "ct-1", nameKey: "care.team.name.nura", roleKey: "care.team.primaryNurse", specialtyKey: "care.team.specialty.icu", img: imgNura, visible: true },
      { id: "ct-2", nameKey: "care.team.name.omar", roleKey: "care.team.attendingDoctor", specialtyKey: "care.team.specialty.cardiology", img: imgOmar, visible: true },
    ],

    allergies: ["Penicillin", "Latex", "Shellfish"],

    patientDiet: "regular",
    alerts: {
      similarName: true,
      similarNameWith: "Sarah Saleh",
      isolation: true,
      isolationType: "Contact",
      fallRisk: "high",
      careGoal: "Sit out of bed for all three meals",
      isolationInstructions: [
        "Check with your nurse before leaving the room.",
        "Visitors: check with the nurse before entering.",
      ],
      mobilityInstructions: [
        "Change your position regularly",
        "Take short walks around the ward",
      ],
    },

    painScore: 5,

    /* The plan for the stay, not for a day — the bedside card shows every
       step in order rather than slicing it by date. */
    carePlan: [
      { id: "cp-1", labelKey: "care.plan.initialAssessment", done: true, timeKey: "care.plan.done", day: 1, date: todayStr },
      { id: "cp-2", labelKey: "care.plan.bloodWork", done: true, timeKey: "care.plan.done", day: 1, date: todayStr },
      { id: "cp-3", labelKey: "care.plan.scansImaging", done: true, timeKey: "care.plan.done", day: 1, date: todayStr },
      { id: "cp-4", labelKey: "care.plan.medicationRound", done: false, active: true, minutes: 45, day: 1, date: todayStr },
      { id: "cp-5", labelKey: "care.plan.checkup", done: false, minutes: 15, day: 2, date: tomorrowStr },
      { id: "cp-6", labelKey: "care.plan.physicalTherapy", done: false, minutes: 30, day: 3, date: day2Str },
      { id: "cp-7", labelKey: "care.plan.nutritionReview", done: false, minutes: 20, day: 3, date: day2Str },
      { id: "cp-8", labelKey: "care.plan.woundCare", done: false, minutes: 25, day: 4, date: day3Str },
      { id: "cp-9", labelKey: "care.plan.doctorReview", done: false, minutes: 10, day: 4, date: day3Str },
      { id: "cp-10", labelKey: "care.plan.dischargeTeaching", done: false, minutes: 30, day: 5, date: day3Str },
    ],
    carePlanMode: "daily",
    carePlanSelectedDate: todayStr,

    financial: [
      { id: "fin-1", category: "Room & Board", description: "Private Room — 7 nights", amount: 35000, covered: 31500, date: "5–12 Mar" },
      { id: "fin-2", category: "Medications", description: "IV Antibiotics, Pain Management", amount: 8200, covered: 7380, date: "5–12 Mar" },
      { id: "fin-3", category: "Lab Tests", description: "CBC, BMP, Urinalysis, Blood Culture", amount: 4500, covered: 4050, date: "5–11 Mar" },
      { id: "fin-4", category: "Imaging", description: "Obstetric Ultrasound, Chest X-Ray", amount: 6000, covered: 5400, date: "5–9 Mar" },
      { id: "fin-5", category: "Procedures", description: "IV Insertion, Catheterization", amount: 3200, covered: 2880, date: "5 Mar" },
      { id: "fin-6", category: "Physician Fees", description: "Attending + Consulting physicians", amount: 12000, covered: 10800, date: "5–12 Mar" },
    ],

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

    procedures: [
      { id: "proc-1", label: "Fetal Monitoring (CTG)", date: "11 Mar", summary: "Reactive trace. No decelerations.", pdfUrl: "/reports/lab-report-cbc.html", visible: true },
      { id: "proc-2", label: "Epidural Anaesthesia Review", date: "12 Mar", visible: true },
    ],

    babyCameras: [
      { id: "cam-1", name: "Baby Saleh", location: "Nursery · Crib 3A", src: imgBabyCam, connected: true, visible: true },
    ],

    dischargePlan: [
      { id: "dp-1", labelKey: "care.discharge.orderIssued", done: true, timeKey: "care.plan.done" },
      { id: "dp-2", labelKey: "care.discharge.medsOrdered", done: true, timeKey: "care.plan.done" },
      { id: "dp-3", labelKey: "care.discharge.medsDispensed", done: false, active: true },
      { id: "dp-4", labelKey: "care.discharge.financialClearance", done: false },
    ],

    dischargeInfo: {
      followUps: [
        { id: "fu-1", label: "Cardiology clinic", when: formatPatientDate(shift(now, 9)) + " · 10:30" },
        { id: "fu-2", label: "Wound review — day surgery", when: formatPatientDate(shift(now, 16)) + " · 09:00" },
      ],
      contacts: [
        { id: "pc-1", label: "Ward nursing station", value: "+966 12 665 0000 ext. 1412" },
        { id: "pc-2", label: "24/7 nurse advice line", value: "+966 12 665 0500" },
        { id: "pc-3", label: "Pharmacy enquiries", value: "+966 12 665 0310" },
      ],
    },

    /* Oldest first — the card reverses them, so the newest round leads. Two
       earlier rounds are seeded so the repeating block is visible in the demo
       rather than only appearing once a nurse has recorded a second set. */
    observations: [
      {
        id: "seed-3",
        timestamp: new Date(Date.now() - 3600000 * 12),
        nurseName: "clinical.nurse.nura",
        vitals: { bp: "124/80", hr: "74", temp: "37.2", spo2: "97", resp: "16" },
        painLevel: 3,
        risks: { fall: true, pressure: false, allergies: true, other: false },
      },
      {
        id: "seed-2",
        timestamp: new Date(Date.now() - 3600000 * 8),
        nurseName: "clinical.nurse.nura",
        vitals: { bp: "120/79", hr: "71", temp: "37.1", spo2: "98", resp: "15" },
        painLevel: 2,
        risks: { fall: true, pressure: false, allergies: true, other: false },
      },
      {
        id: "seed-1",
        timestamp: new Date(Date.now() - 3600000 * 4),
        nurseName: "clinical.nurse.nura",
        vitals: { bp: "118/78", hr: "68", temp: "37.0", spo2: "99", resp: "14" },
        painLevel: 1,
        risks: { fall: true, pressure: false, allergies: true, other: false },
      },
    ],
    nurseViewShortcutVisible: false,
    isLocalFallback: false,
  };
}

/* ═══════════════════════════════════════════════════════════════
 * SINGLETON STORE (pub/sub)
 * ═══════════════════════════════════════════════════════════════ */

type StoreListener = (state: NurseStoreState) => void;

const NURSE_STORE_CACHE_KEY = 'careinn-nurse-store';

function loadCachedState(): Partial<NurseStoreState> {
  try {
    const raw = localStorage.getItem(NURSE_STORE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Legacy migration: old format had dietCodes[], new format has patientDiet string
    if (parsed.dietCodes && !parsed.patientDiet) {
      delete parsed.dietCodes; // fall back to default "regular"
    }
    // Legacy migration: old abbreviations → new DietType values
    if (parsed.patientDiet === "soft") parsed.patientDiet = "soft-diet";
    if (parsed.patientDiet === "chemo") parsed.patientDiet = "chemotherapy";
    // Legacy migration: remove hardcoded dates so dynamic default dates take effect
    if (parsed.patient) {
      if (parsed.patient.dischargeDate === "12 Mar 2026") delete parsed.patient.dischargeDate;
      if (parsed.patient.admissionDate === "10 Mar 2026") delete parsed.patient.admissionDate;
      if (parsed.patient.mrn === "00-284619") delete parsed.patient.mrn;
    }
    // Legacy migration: the discharge plan was re-sequenced to the ward's
    // seven-step flow. An untouched cache of the old six seeded steps is
    // dropped so the new defaults take effect; a plan a nurse has edited,
    // added to or reordered is left alone.
    /* Instructions were withdrawn from the discharge section. Anything a
       stored record still carries for them is ignored on the way in. */
    if (parsed.dischargeInfo) delete parsed.dischargeInfo.instructions;

    if (Array.isArray(parsed.dischargePlan)) {
      const legacyKeys = [
        "care.discharge.order", "care.discharge.insurance", "care.discharge.medication",
        "care.discharge.education", "care.discharge.finalCheckup", "care.discharge.confirm",
      ];
      const untouched = parsed.dischargePlan.length === legacyKeys.length &&
        parsed.dischargePlan.every((i: any, n: number) => i?.labelKey === legacyKeys[n]);
      if (untouched) delete parsed.dischargePlan;
    }
    // Revive Date fields. JSON.stringify turns them into ISO strings, so
    // without this every persisted observation comes back with a string
    // timestamp and renders as "—" instead of its date.
    if (Array.isArray(parsed.observations)) {
      /* Respiratory rate was added to the vitals after these seeds were first
         cached, so a kiosk that has been running since then holds rounds with
         no `resp` and shows an empty tile for it. The seeded rounds get their
         value back — they are demo data, and the numbers are the ones the
         defaults carry. A round a nurse actually entered is left alone: a
         missing observation is a fact about the record, and filling it in
         would be inventing a vital sign. */
      const SEEDED_RESP: Record<string, string> = {
        "seed-3": "16", "seed-2": "15", "seed-1": "14",
      };
      parsed.observations = parsed.observations.map((o: any) => ({
        ...o,
        timestamp: o?.timestamp ? new Date(o.timestamp) : o?.timestamp,
        vitals: o?.vitals && !o.vitals.resp && SEEDED_RESP[o.id]
          ? { ...o.vitals, resp: SEEDED_RESP[o.id] }
          : o?.vitals,
      }));
    }
    if (Array.isArray(parsed.careTeam)) {
      parsed.careTeam = parsed.careTeam.map((m: any) =>
        m?.addedAt ? { ...m, addedAt: new Date(m.addedAt) } : m);
    }

    const activeMrn = localStorage.getItem('careinn-active-mrn-passcode') || localStorage.getItem('careinn-last-mrn');
    if (activeMrn) {
      if (!parsed.patient) parsed.patient = {};
      parsed.patient.mrn = activeMrn;
    }
    return parsed;
  } catch { return {}; }
}

const nurseStore = (() => {
  const defaultState = createDefaultState();
  const cachedState = loadCachedState();
  let state = {
    ...defaultState,
    ...cachedState,
    /* Field by field, not wholesale. A cached patient replaced the default
       one entirely, so any field missing from the cache came back undefined
       rather than falling back — and the migration above deletes the MRN when
       it still holds the seeded value, on the assumption the default would
       show through. It did not: the record lost its MRN completely, and the
       greeting showed "MRN" with nothing after it. */
    patient: {
      ...defaultState.patient,
      ...(cachedState.patient || {}),
    },
    hisSections: {
      ...defaultState.hisSections,
      ...(cachedState.hisSections || {}),
    },
    sectionVisibility: {
      ...defaultState.sectionVisibility,
      ...(cachedState.sectionVisibility || {}),
    },
    alerts: {
      ...defaultState.alerts,
      ...(cachedState.alerts || {}),
    },
    dischargeInfo: {
      ...defaultState.dischargeInfo,
      ...(cachedState.dischargeInfo || {}),
    },
  };
  const listeners = new Set<StoreListener>();

  function persistState() {
    try {
      localStorage.setItem(NURSE_STORE_CACHE_KEY, JSON.stringify(state));
    } catch {}
  }

  function notify() {
    persistState();
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
      let nextPatient = { ...state.patient, ...updates };
      // If name was updated manually, clear nameKey so the new name shows up
      if (updates.name && updates.name !== state.patient.name) {
        nextPatient.nameKey = "";
      }
      state = { ...state, patient: nextPatient };
      autoCheckKidsLayoutForPatient(nextPatient);
      notify();
    },

    /**
     * Called ONLY by hospitalApi — applies API data with override logic.
     * 
     * Rules per field:
     *  - API value empty → always skip
     *  - Nurse override set AND API value same as last snapshot → skip
     *  - API value different from last snapshot → always apply 
     *    (new patient or real change), clear that field's override
     *  - No nurse override → always apply
     */
    updatePatientFromApi: (
      updates: Partial<PatientProfile>
    ) => {
      const fields = Object.keys(updates) as OverridableField[];
      const applied: Partial<PatientProfile> = {};

      for (const field of fields) {
        const apiValue = updates[field as keyof PatientProfile];

        // Rule 1: empty API value never overrides anything
        if (!apiValue) continue;

        const lastApiValue = _apiSnapshot[
          field as keyof PatientProfile];
        const hasOverride = _nurseOverrides.has(field);
        const apiChanged  = apiValue !== lastApiValue;

        if (hasOverride && !apiChanged) {
          // Nurse edited this field AND API hasn't changed → keep nurse value
          continue;
        }

        if (apiChanged && lastApiValue) {
          // API value genuinely changed (new patient) → apply + clear override
          _nurseOverrides.delete(field);
        }

        // Apply this field
        applied[field as keyof PatientProfile] = apiValue as any;
      }

      if (updates.mrn) {
        applied.mrn = updates.mrn;
        _nurseOverrides.delete("mrn");
        try {
          localStorage.setItem('careinn-active-mrn-passcode', updates.mrn.trim().toLowerCase());
          localStorage.setItem('careinn-last-mrn', updates.mrn.trim());
        } catch {}
      }

      if (Object.keys(applied).length === 0) return;

      // Save API snapshot of what we just applied
      saveApiSnapshot(applied);
      saveOverrides();

      // Apply to store
      let nextPatient = { ...state.patient, ...applied };
      if (applied.name) {
        nextPatient.nameKey = "";
        if (!applied.nameAr || applied.nameAr === "سارة صالح") {
          nextPatient.nameAr = applied.name;
        }
      }
      const hasEmergency = !!(applied.emergencyContact || applied.emergencyName);
      state = {
        ...state,
        patient: nextPatient,
        isHisConnected: true,
        hisSections: {
          ...state.hisSections,
          profile: true,
          ...(hasEmergency ? { emergency: true } : {}),
        },
      };
      autoCheckKidsLayoutForPatient(nextPatient);
      notify();
    },

    /** Completely wipe all previous patient data, overrides, and local preferences for a new A01 admission */
    resetStoreForNewPatient: (newPatient?: Partial<PatientProfile>) => {
      clearOverrides();
      try {
        localStorage.removeItem('careinn-display-name');
        localStorage.removeItem('careinn-display-name-ar');
        localStorage.removeItem('careinn-display-name-mode');
        localStorage.removeItem('careinn-nurse-store');
        localStorage.removeItem('careinn-orders');
        localStorage.removeItem('careinn-feedback');
        localStorage.removeItem('careinn-cart');
        localStorage.removeItem('careinn-onboarding-complete');
      } catch {}

      const cleanState = createDefaultState();
      let nextPatient = cleanState.patient;
      if (newPatient) {
        const fields = Object.keys(newPatient) as OverridableField[];
        const applied: Partial<PatientProfile> = {};
        for (const f of fields) {
          const val = newPatient[f as keyof PatientProfile];
          if (val) applied[f as keyof PatientProfile] = val as any;
        }
        nextPatient = { ...nextPatient, ...applied };
        if (applied.name) {
          nextPatient.nameKey = "";
          if (!applied.nameAr || applied.nameAr === "سارة صالح") {
            nextPatient.nameAr = applied.name;
          }
        }
      }

      state = {
        ...cleanState,
        patient: nextPatient,
        isHisConnected: true,
        hisSections: {
          ...cleanState.hisSections,
          profile: true,
        },
      };

      if (nextPatient.mrn) {
        const normMrn = nextPatient.mrn.trim().toLowerCase();
        localStorage.setItem('careinn-active-mrn-passcode', normMrn);
        localStorage.setItem('careinn-last-mrn', nextPatient.mrn.trim());
      }

      autoCheckKidsLayoutForPatient(nextPatient);
      notify();
      window.dispatchEvent(new Event('display-name-changed'));
    },

    setHisConnected: (connected: boolean, isLocalFallback?: boolean) => {
      state = { ...state, isHisConnected: connected, isLocalFallback: !!isLocalFallback };
      notify();
    },

    setHisSectionData: (section: string, hasData: boolean) => {
      state = {
        ...state,
        hisSections: { ...state.hisSections, [section]: hasData },
      };
      notify();
    },

    /**
     * Called when nurse manually edits a field in the UI.
     * Marks that field as nurse-overridden so future API calls
     * don't overwrite it (unless API value changes).
     */
    updatePatientFromNurse: (
      updates: Partial<PatientProfile>
    ) => {
      // Only flag override if API has already populated this field
      const fields = Object.keys(updates) as OverridableField[];
      for (const field of fields) {
        const apiHasValue = !!_apiSnapshot[
          field as keyof PatientProfile];
        if (apiHasValue) {
          // API had a value — nurse is now overriding it
          _nurseOverrides.add(field);
        }
        // If API never populated this field, no override needed —
        // nurse is just filling it in fresh
      }
      saveOverrides();

      // Apply nurse update normally
      let nextPatient = { ...state.patient, ...updates };

      /* A bed always has a file number. Clearing the field in the nurse form
         — by accident, or to retype it — must not leave the patient's own
         screen showing an empty MRN chip, so a blank keeps what was there. */
      if ("mrn" in updates && !String(updates.mrn ?? "").trim()) {
        nextPatient.mrn = state.patient.mrn;
      }
      if (updates.name && updates.name !== state.patient.name) {
        nextPatient.nameKey = "";
      }
      state = { ...state, patient: nextPatient };
      autoCheckKidsLayoutForPatient(nextPatient);
      notify();
    },

    /** Clear all overrides — call on new admission or Clear Data */
    clearPatientOverrides: () => {
      clearOverrides();
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
    toggleCareTeamMemberVisibility: (id: string) => {
      state = { ...state, careTeam: state.careTeam.map((m) => m.id === id ? { ...m, visible: !m.visible } : m) };
      notify();
    },

    // ── Allergies ──
    setAllergies: (allergies: string[]) => {
      state = { ...state, allergies };
      notify();
    },
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

    // ── Patient Diet (single-select) ──
    setPatientDiet: (diet: string) => {
      state = { ...state, patientDiet: diet };
      notify();
    },

    setAlerts: (updates: Partial<SafetyAlerts>) => {
      state = { ...state, alerts: { ...state.alerts, ...updates } };
      notify();
    },

    /** @deprecated Pain now lives on each observation — see latestPainLevel().
     *  Kept so older cached state and any stray caller stay harmless. */
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
    setCarePlanMode: (mode: "daily" | "overall") => {
      state = { ...state, carePlanMode: mode };
      notify();
    },
    setCarePlanSelectedDate: (date: string) => {
      state = { ...state, carePlanSelectedDate: date };
      notify();
    },

    toggleCarePlanItem: (id: string) => {
      const idx = state.carePlan.findIndex(i => i.id === id);
      if (idx === -1) return;

      const item = state.carePlan[idx];
      const newDone = !item.done;
      
      let nextCarePlan = state.carePlan.map((i) => {
        if (i.id === id) return { ...i, done: newDone, active: false };
        return i;
      });

      if (newDone) {
        let activated = false;
        nextCarePlan = nextCarePlan.map((i) => {
          if (!activated && !i.done) {
            activated = true;
            return { ...i, active: true };
          }
          return { ...i, active: false };
        });
      }

      state = { ...state, carePlan: nextCarePlan };
      notify();
    },

    toggleDischargePlanItem: (id: string) => {
      const idx = state.dischargePlan.findIndex(i => i.id === id);
      if (idx === -1) return;

      const item = state.dischargePlan[idx];
      const newDone = !item.done;

      let nextPlan = state.dischargePlan.map((i) => {
        if (i.id === id) return { ...i, done: newDone, active: false };
        return i;
      });

      if (newDone) {
        let activated = false;
        nextPlan = nextPlan.map((i) => {
          if (!activated && !i.done) {
            activated = true;
            return { ...i, active: true };
          }
          return { ...i, active: false };
        });
      }

      state = { ...state, dischargePlan: nextPlan };
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
    setDischargeInfo: (updates: Partial<DischargeInfo>) => {
      state = { ...state, dischargeInfo: { ...state.dischargeInfo, ...updates } };
      notify();
    },

    setDischargePlan: (items: CarePlanItem[]) => {
      state = { ...state, dischargePlan: items };
      notify();
    },
    addDischargePlanItem: (item: CarePlanItem) => {
      state = { ...state, dischargePlan: [...state.dischargePlan, item] };
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

    setNurseViewShortcutVisible: (visible: boolean) => {
      state = { ...state, nurseViewShortcutVisible: visible };
      notify();
    },
  };
})();

/* ═══════════════════════════════════════════════════════════════
 * REACT HOOK
 * ═══════════════════════════════════════════════════════════════ */

/** Subscribe to the full nurse data store. Re-renders on any change. */
/**
 * Pain is owned by the observations record — there is no separate editable
 * pain value any more. Reads the newest observation by timestamp so Care
 * Overview and the patient-facing card can never disagree.
 * Returns null when no observation has been recorded yet.
 */
export function latestPainLevel(st: Pick<NurseStoreState, "observations">): number | null {
  const obs = st.observations;
  if (!Array.isArray(obs) || obs.length === 0) return null;
  const newest = obs.reduce((a, b) => {
    const ta = new Date(a.timestamp as any).getTime();
    const tb = new Date(b.timestamp as any).getTime();
    return tb >= ta ? b : a;
  });
  return typeof newest?.painLevel === "number" ? newest.painLevel : null;
}

export function useNurseStore() {
  const [state, setState] = useState<NurseStoreState>(nurseStore.get());
  useEffect(() => nurseStore.subscribe(setState), []);
  return state;
}

/** Direct access to store actions (stable references — no re-render trigger) */
export const nurseActions = nurseStore;

/* ═══════════════════════════════════════════════════════════════
 * AGE & KIDS LAYOUT (LAYOUT 3) AUTO-DETECTION
 * ═══════════════════════════════════════════════════════════════ */

export function calculateAgeFromPatient(patient: Partial<PatientProfile>): number | null {
  const ageStr = patient.age ? String(patient.age).trim() : "";
  const dobStr = patient.dob ? String(patient.dob).trim() : "";

  // 1. Try parsing numeric age string (e.g. "11", "8", "8 yrs", "12 years old", "4")
  if (ageStr) {
    const match = ageStr.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 0 && num < 120) return num;
    }
  }

  // 2. Try parsing DOB string
  if (dobStr) {
    try {
      let birthDate: Date | null = null;
      const cleanDob = dobStr.trim();
      if (/^\d{8}$/.test(cleanDob)) {
        const y = parseInt(cleanDob.slice(0, 4), 10);
        const m = parseInt(cleanDob.slice(4, 6), 10) - 1;
        const d = parseInt(cleanDob.slice(6, 8), 10);
        birthDate = new Date(y, m, d);
      } else {
        const d = new Date(cleanDob);
        if (!isNaN(d.getTime())) birthDate = d;
      }

      if (birthDate) {
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }
        if (years >= 0 && years < 120) return years;
      }
    } catch {}
  }

  return null;
}

export function autoCheckKidsLayoutForPatient(patient: Partial<PatientProfile>): void {
  const ageYears = calculateAgeFromPatient(patient);
  if (ageYears !== null && ageYears < 13) {
    try {
      const currentMode = localStorage.getItem("careinn-layout-mode");
      if (currentMode !== "3") {
        localStorage.setItem("careinn-layout-mode", "3");
        window.dispatchEvent(new Event("layout-mode-changed"));
      }
    } catch {}
  }
}
