import { useState } from "react";
import {
  X, ClipboardList, Stethoscope, User, Heart,
  FlaskConical, Image as ImageIcon, LogOut, Activity,
  Hash, DoorOpen, Clock, Plus, Bed, CreditCard, ExternalLink,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import { useLocale } from "../i18n";
import { useNurseStore, nurseActions, type SectionKey } from "../NurseDataStore";
import { PatientProfileTab } from "./tabs/PatientProfileTab";
import { CareOverviewTab } from "./tabs/CareOverviewTab";
import { CarePlanTab } from "./tabs/CarePlanTab";
import { LabResultsTab } from "./tabs/LabResultsTab";
import { ImagingTab } from "./tabs/ImagingTab";
import { DischargePlanTab } from "./tabs/DischargePlanTab";
import { ObservationsTab } from "./tabs/ObservationsTab";
import { NfcTab } from "./tabs/NfcTab";

interface TabDef {
  key: SectionKey;
  label: string;
  icon: typeof User;
  hasVisibility: boolean;
}

const TABS: TabDef[] = [
  { key: "profile", label: "Patient Profile", icon: User, hasVisibility: false },
  { key: "careOverview", label: "Care Overview", icon: Heart, hasVisibility: true },
  { key: "carePlan", label: "My Care Plan", icon: ClipboardList, hasVisibility: true },
  { key: "labs", label: "Lab Results", icon: FlaskConical, hasVisibility: true },
  { key: "imaging", label: "Imaging", icon: ImageIcon, hasVisibility: true },
  { key: "discharge", label: "Discharge Process", icon: LogOut, hasVisibility: true },
  { key: "observations", label: "Observations", icon: Activity, hasVisibility: true },
  { key: "nfc", label: "Update Nurse Info", icon: CreditCard, hasVisibility: false },
];

interface NurseInterfaceProps {
  role: "nurse" | "doctor";
  onClose: () => void;
}

export function NurseInterface({ role, onClose }: NurseInterfaceProps) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const [activeTab, setActiveTab] = useState<SectionKey>("profile");
  // Bumped by the header's "Add Observation" so the observations tab opens its
  // form — switching tab alone did nothing when that tab was already active.
  const [addObsNonce, setAddObsNonce] = useState(0);

  const patient = store.patient;

  const renderTab = () => {
    switch (activeTab) {
      case "profile": return <PatientProfileTab role={role} />;
      case "careOverview": return <CareOverviewTab role={role} />;
      case "carePlan": return <CarePlanTab role={role} />;
      case "labs": return <LabResultsTab role={role} />;
      case "imaging": return <ImagingTab role={role} />;
      case "discharge": return <DischargePlanTab role={role} />;
      case "observations": return <ObservationsTab role={role} addNonce={addObsNonce} />;
      case "nfc": return <NfcTab />;
      default: return null;
    }
  };

  return (
    <div
      className="ni-root absolute inset-0 z-[900] flex flex-col"
      style={{
        backgroundColor: t.background,
        // Drives the .nurse-card class below, which every tab uses.
        ["--ni-surface" as any]: t.surface,
        ["--ni-card-line" as any]: t.borderCardColor,
        ["--ni-tint" as any]: t.surfaceInset,
        ["--ni-switch-off" as any]: t.surfaceInset,
        // iOS convention: white knob on the neutral off-track; on the brand
        // on-track it flips to whatever actually contrasts with the brand.
        ["--ni-switch-knob" as any]: "#FFFFFF",
        ["--ni-switch-knob-on" as any]: t.brandOnPrimary,
        ["--ni-ink" as any]: t.textHeading,
        ["--ni-ink-muted" as any]: t.textMuted,
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{ backgroundColor: t.primary }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
          >
            {role === "nurse"
              ? <ClipboardList size={22} color="#fff" />
              : <Stethoscope size={22} color="#fff" />}
          </div>
          <div>
            <h1 style={{ fontFamily: t.fontFamily, fontSize: "20px", fontWeight: 800, color: "#fff" }}>
              {role === "nurse" ? tr("careteam.nurseRole") : tr("careteam.doctorRole")}
            </h1>
            <p style={{ fontSize: "13px", color: t.brandOnPrimary, opacity: 0.92, fontWeight: 500 }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <X size={20} color="rgba(255,255,255,0.9)" />
        </button>
      </div>

      {/* ── Patient Summary Bar ── */}
      <div
        className="flex items-center px-8 py-4 shrink-0"
        style={{ backgroundColor: t.surface, borderBottom: `1px solid ${t.borderCardColor}` }}
      >
        <div className="flex-1 grid grid-cols-4 gap-0">
          {[
            { label: "MRN", value: patient.mrn, icon: <Hash size={15} /> },
            { 
              label: "Patient", 
              value: `${(tr("direction") === "rtl" && patient.nameAr) ? patient.nameAr : patient.name} (${patient.age}y)`, 
              icon: <User size={15} /> 
            },
            { label: "Room", value: patient.room, icon: <DoorOpen size={15} /> },
            { label: "Bed", value: patient.bed || "—", icon: <Bed size={15} /> },
          ].map((item, i) => (
            <div key={i} className="flex relative items-center justify-center">
              {i > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 w-px h-8"
                  style={{ insetInlineStart: 0, backgroundColor: t.borderCardColor }} />
              )}
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 mb-1" style={{ fontSize: "12px", fontWeight: 600, color: t.textMuted }}>
                  <span style={{ color: t.primaryOn }}>{item.icon}</span> {item.label}
                </span>
                <span style={{ fontSize: "17px", fontWeight: 800, color: t.textHeading }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
        {role === "nurse" && (
          <button
            onClick={() => { setActiveTab("observations"); setAddObsNonce((n) => n + 1); }}
            className="flex items-center gap-2 px-5 py-3 cursor-pointer transition-all active:scale-95"
            style={{ backgroundColor: t.primary, color: t.brandOnPrimary, fontSize: "14px", fontWeight: 800, borderRadius: "14px", border: "none" }}
          >
            <Plus size={18} /> Add Observation
          </button>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div
        className="flex items-center gap-1 px-6 shrink-0 overflow-x-auto"
        style={{ backgroundColor: t.surface, borderBottom: `1px solid ${t.borderCardColor}`, padding: "0 24px" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const isVisible = store.sectionVisibility[tab.key];
          return (
            <div key={tab.key} className="flex items-center shrink-0">
              <button
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-4 py-3.5 transition-all cursor-pointer relative"
                style={{
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? t.primaryOn : t.textMuted,
                  borderBottom: isActive ? `3px solid ${t.primary}` : "3px solid transparent",
                  background: "none",
                  border: "none",
                  borderBottomWidth: "3px",
                  borderBottomStyle: "solid",
                  borderBottomColor: isActive ? t.primary : "transparent",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: t.background }}>
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          {renderTab()}
        </div>
      </div>

      {/* ── Footer Link ── */}
      {role === "nurse" && (
        <div className="flex justify-end px-8 pb-4 shrink-0">
          <a
            href="https://client.careinn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
            style={{ color: t.primaryOn }}
          >
            <ExternalLink size={14} />
            {tr("careteam.gotoEmr")}
          </a>
        </div>
      )}

      <style>{`
        .nurse-card {
          background: var(--ni-surface);
          border-radius: 20px;
          border: 1px solid var(--ni-card-line);
          padding: 24px;
          margin-bottom: 20px;
        }
        .nurse-card h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        /* Theme-driven stand-ins for the fixed Tailwind light utilities the
           tabs used to carry, so the nurse UI follows light and dark. */
        .ni-surface { background: var(--ni-surface); }
        .ni-tint    { background: var(--ni-tint); }
        .ni-line    { border-color: var(--ni-card-line); }
        /* Toggle switch. The knob is a ::after on the track; the hidden
           checkbox in front of it carries .peer, so :checked drives both. */
        .ni-switch {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid var(--ni-card-line);
          background: var(--ni-switch-off);
          transition: background 0.2s ease;
        }
        .ni-switch::after {
          content: "";
          position: absolute;
          top: 2px;
          inset-inline-start: 2px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: var(--ni-switch-knob);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
          transition: transform 0.2s ease;
        }
        .peer:checked ~ .ni-switch::after {
          transform: translateX(20px);
          background: var(--ni-switch-knob-on);
        }
        [dir="rtl"] .peer:checked ~ .ni-switch::after { transform: translateX(-20px); }
        .ni-switch-sm { width: 36px; height: 20px; }
        .ni-switch-sm::after { width: 14px; height: 14px; }
        .peer:checked ~ .ni-switch-sm::after { transform: translateX(16px); }
        [dir="rtl"] .peer:checked ~ .ni-switch-sm::after { transform: translateX(-16px); }
        /* Form controls across every tab carried no background or text colour,
           so they fell back to the browser default (white field, black text)
           and vanished in dark mode. None of them set these inline, so this
           rule wins without touching each call site. */
        .ni-root input:not([type="checkbox"]):not([type="radio"]),
        .ni-root select,
        .ni-root textarea {
          background: var(--ni-tint);
          color: var(--ni-ink);
        }
        .ni-root input::placeholder,
        .ni-root textarea::placeholder { color: var(--ni-ink-muted); opacity: 1; }
        .ni-root select option { background: var(--ni-surface); color: var(--ni-ink); }
        .ni-scroll::-webkit-scrollbar { width: 5px; }
        .ni-scroll::-webkit-scrollbar-thumb { background: var(--ni-card-line); border-radius: 99px; }
        .ni-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
