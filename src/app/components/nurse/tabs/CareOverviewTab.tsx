import { useState } from "react";
import { ApiImage } from "../../ApiImage";
import { Users, AlertTriangle, Apple, Plus, X, ShieldAlert, Eye, EyeOff, Info } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useLocale } from "../../i18n";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

const DIET_OPTIONS = [
  { value: "regular",        label: "Regular" },
  { value: "diabetic",       label: "Diabetic" },
  { value: "low-sodium",     label: "Low Sodium" },
  { value: "low-potassium",  label: "Low Potassium" },
  { value: "soft-diet",      label: "Soft Diet" },
  { value: "chemotherapy",   label: "Chemotherapy" },
  { value: "ob",             label: "OB" },
  { value: "kids",           label: "Kids Menu" },
  { value: "npo",            label: "NPO" },
];

const ISOLATION_TYPES = ["Contact", "Droplet", "Airborne", "Protective"];

export function CareOverviewTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const isNurse = role === "nurse";

  const [newAllergy, setNewAllergy] = useState("");

  return (
    <div className="space-y-5">
      {isNurse && (
        <div className="nurse-card flex items-center justify-between" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primarySubtle }}>
              <Eye size={18} style={{ color: t.primaryOn }} />
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, display: "block" }}>Show Section to Patient</span>
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Care Overview" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.careOverview}
              onChange={(e) => nurseActions.setSectionVisible("careOverview", e.target.checked)}
              className="sr-only peer"
            />
            <div className="ni-switch"
              style={{ backgroundColor: store.sectionVisibility.careOverview ? t.primary : undefined }} />
          </label>
        </div>
      )}

      {/* Care Team */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Users size={18} style={{ color: t.primaryOn }} /> Care Team</h3>
        <div className="space-y-3">
          {store.careTeam.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: t.surfaceInset, border: `1px solid ${t.borderDefault}` }}>
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                <ApiImage src={m.img} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>{tr(m.nameKey)}</p>
                <p style={{ fontSize: "12px", fontWeight: 600, color: t.primaryOn }}>{tr(m.roleKey)}</p>
              </div>
              {isNurse && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "11px", color: t.textMuted }}>{m.visible ? "Visible" : "Hidden"}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={m.visible}
                      onChange={() => nurseActions.toggleCareTeamMemberVisibility(m.id)}
                      className="sr-only peer"
                    />
                    <div className="ni-switch ni-switch-sm"
                      style={{ backgroundColor: m.visible ? t.primary : undefined }} />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><AlertTriangle size={18} style={{ color: t.errorOn }} /> Allergies</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {store.allergies.map((a) => (
            <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ fontSize: "13px", fontWeight: 700, color: t.errorOn, backgroundColor: t.errorSubtle, border: `1px solid ${t.errorOn}` }}>
              <AlertTriangle size={12} /> {a}
              {isNurse && (
                <button onClick={() => nurseActions.removeAllergy(a)} className="ml-1 cursor-pointer" style={{ background: "none", border: "none", color: t.errorOn }}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        {isNurse && (
          <div className="mt-4 pt-4 border-t ni-line">
            <p style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, marginBottom: 8 }}>Available Allergies (Tap to add/remove):</p>
            <div className="flex flex-wrap gap-2">
              {["Penicillin", "Latex", "Shellfish", "Aspirin", "Peanuts", "Sulfonamides", "Morphine", "Eggs", "Dairy"].map(allergy => {
                const isActive = store.allergies.includes(allergy);
                return (
                  <button
                    key={allergy}
                    onClick={() => isActive ? nurseActions.removeAllergy(allergy) : nurseActions.addAllergy(allergy)}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                    style={{
                      backgroundColor: isActive ? t.errorSubtle : t.surfaceInset,
                      color: isActive ? t.errorOn : t.textMuted,
                      border: `1px solid ${isActive ? t.errorOn : "transparent"}`,
                      cursor: "pointer"
                    }}
                  >
                    {allergy}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Patient Diet (single-select) */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Apple size={18} style={{ color: t.primaryOn }} /> Patient Diet</h3>
        {/* Current selection */}
        <div className="mb-3">
          <span className="px-4 py-2 rounded-xl inline-flex items-center gap-2"
            style={{ fontSize: "14px", fontWeight: 700, color: store.patientDiet === "npo" ? t.errorOn : t.primaryOn, backgroundColor: store.patientDiet === "npo" ? t.errorSubtle : t.primarySubtle }}>
            {(DIET_OPTIONS.find(d => d.value === store.patientDiet) || DIET_OPTIONS[0]).label}
          </span>
        </div>
        {isNurse && (
          <div className="mt-4 pt-4 border-t ni-line">
            <p style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, marginBottom: 8 }}>Select Patient Diet:</p>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map(diet => {
                const isActive = store.patientDiet === diet.value;
                const isNpo = diet.value === "npo";
                return (
                  <button
                    key={diet.value}
                    onClick={() => nurseActions.setPatientDiet(diet.value)}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all text-left cursor-pointer"
                    style={{
                      backgroundColor: isActive ? (isNpo ? t.errorSubtle : t.primarySubtle) : t.surfaceInset,
                      color: isActive ? (isNpo ? t.errorOn : t.primaryOn) : t.textMuted,
                      border: `1px solid ${isActive ? (isNpo ? t.errorOn : t.primaryOn) : "transparent"}`,
                    }}
                  >
                    {diet.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Safety Alerts */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><ShieldAlert size={18} style={{ color: t.errorOn }} /> Safety Alerts</h3>

        {/* Similar-name alert — staff-facing. It names a patient in another
            bed, so it is deliberately not mirrored to the bedside screen. */}
        <div className="flex items-center justify-between py-3 border-b ni-line">
          <div className="flex-1 min-w-0 pr-4">
            <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, display: "block" }}>Similar Name Alert</span>
            <span style={{ fontSize: "12px", color: t.textMuted }}>Another patient on the ward has a similar name — verify two identifiers before every intervention</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={store.alerts.similarName}
              disabled={!isNurse}
              onChange={(e) => nurseActions.setAlerts({ similarName: e.target.checked })}
              className="sr-only peer"
            />
            <div className="ni-switch" style={{ backgroundColor: store.alerts.similarName ? t.error : undefined }} />
          </label>
        </div>
        {store.alerts.similarName && (
          <div className="py-3 border-b ni-line">
            <p style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>Similar to patient</p>
            <input
              value={store.alerts.similarNameWith}
              readOnly={!isNurse}
              onChange={(e) => nurseActions.setAlerts({ similarNameWith: e.target.value })}
              placeholder="Name and room of the other patient"
              className="w-full outline-none"
              style={{ padding: "8px 12px", borderRadius: 10, fontSize: "14px", color: t.textHeading, backgroundColor: t.surfaceInset, border: `1px solid ${t.borderDefault}` }}
            />
          </div>
        )}

        {/* Isolation — shown to the patient and visitors too: the precautions
            apply to anyone entering the room. */}
        <div className="flex items-center justify-between py-3">
          <div className="flex-1 min-w-0 pr-4">
            <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, display: "block" }}>Isolation Precautions</span>
            <span style={{ fontSize: "12px", color: t.textMuted }}>Shown on the bedside screen so visitors see the precautions</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={store.alerts.isolation}
              disabled={!isNurse}
              onChange={(e) => nurseActions.setAlerts({ isolation: e.target.checked })}
              className="sr-only peer"
            />
            <div className="ni-switch" style={{ backgroundColor: store.alerts.isolation ? t.error : undefined }} />
          </label>
        </div>
        {store.alerts.isolation && (
          <div className="pb-1">
            <p style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, marginBottom: 8 }}>Precaution type</p>
            <div className="flex flex-wrap gap-2">
              {ISOLATION_TYPES.map((iso) => {
                const isActive = store.alerts.isolationType === iso;
                return (
                  <button
                    key={iso}
                    onClick={() => isNurse && nurseActions.setAlerts({ isolationType: isActive ? "" : iso })}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                    style={{
                      backgroundColor: isActive ? t.errorSubtle : t.surfaceInset,
                      color: isActive ? t.errorOn : t.textMuted,
                      border: `1px solid ${isActive ? t.errorOn : "transparent"}`,
                      cursor: isNurse ? "pointer" : "default",
                    }}
                  >
                    {iso}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* HIS Disclaimer Note */}
      <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: `${t.primary}08`, border: `1px dashed ${t.primary}40` }}>
        <Info size={20} style={{ color: t.primaryOn, marginTop: 2 }} />
        <div className="flex flex-col gap-1">
          <p style={{ fontSize: "13px", fontWeight: 700, color: t.textHeading }}>Clinical Data Source Note</p>
          <p style={{ fontSize: "12px", color: t.textMuted, lineHeight: "1.5" }}>
            Information is synchronized from the Hospital Information System (HIS). Manual adjustments made here are for <strong>local bedside display only</strong> and will not update the patient's permanent Electronic Medical Record (EMR).
            <br />
            <em>Note: Any future updates from the HIS will automatically overwrite manual adjustments.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
