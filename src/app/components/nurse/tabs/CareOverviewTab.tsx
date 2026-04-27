import { useState } from "react";
import { Users, AlertTriangle, Apple, Plus, X, Activity, Eye, EyeOff, Info } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useLocale } from "../../i18n";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

function painColor(n: number) {
  if (n <= 0) return "#94A3B8";
  if (n < 4) return "#10B981";
  if (n < 7) return "#F59E0B";
  return "#EF4444";
}
function painLabel(n: number) {
  if (n <= 0) return "None";
  if (n < 4) return "Mild";
  if (n < 7) return "Moderate";
  return "Severe";
}

export function CareOverviewTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const isNurse = role === "nurse";

  const [newAllergy, setNewAllergy] = useState("");
  const [newDietCode, setNewDietCode] = useState("");
  const [newDietLabel, setNewDietLabel] = useState("");

  const pc = painColor(store.painScore);

  return (
    <div className="space-y-5">
      {isNurse && (
        <div className="nurse-card flex items-center justify-between" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primarySubtle }}>
              <Eye size={18} style={{ color: t.primary }} />
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"
              style={{ backgroundColor: store.sectionVisibility.careOverview ? t.primary : "#E5E7EB" }} />
          </label>
        </div>
      )}

      {/* Care Team */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Users size={18} style={{ color: t.primary }} /> Care Team</h3>
        <div className="space-y-3">
          {store.careTeam.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "#F9FAFB", border: `1px solid ${t.borderDefault}` }}>
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                <img src={m.img} alt="" className="w-full h-full object-cover" />
              </div>
              <div-1 min-w-0>
                <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>{tr(m.nameKey)}</p>
                <p style={{ fontSize: "12px", fontWeight: 600, color: t.primary }}>{tr(m.roleKey)}</p>
              </div-1>
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"
                      style={{ backgroundColor: m.visible ? t.primary : "#E5E7EB" }} />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><AlertTriangle size={18} style={{ color: t.error }} /> Allergies</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {store.allergies.map((a) => (
            <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ fontSize: "13px", fontWeight: 700, color: t.error, backgroundColor: t.errorSubtle, border: `1px solid ${t.errorSubtle}` }}>
              <AlertTriangle size={12} /> {a}
              {isNurse && (
                <button onClick={() => nurseActions.removeAllergy(a)} className="ml-1 cursor-pointer" style={{ background: "none", border: "none", color: t.error }}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        {isNurse && (
          <div className="mt-4 pt-4 border-t border-gray-100">
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
                      backgroundColor: isActive ? t.errorSubtle : "#F3F4F6",
                      color: isActive ? t.error : t.textMuted,
                      border: `1px solid ${isActive ? t.error : "transparent"}`,
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

      {/* Diet Codes */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Apple size={18} style={{ color: t.primary }} /> Diet Codes</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {store.dietCodes.map((d) => (
            <span key={d.code} className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ fontSize: "13px", fontWeight: 700, color: t.primary, backgroundColor: t.primarySubtle }}>
              <span style={{ fontWeight: 800 }}>{d.code}</span> — {d.label}
              {isNurse && (
                <button onClick={() => nurseActions.removeDietCode(d.code)} className="ml-1 cursor-pointer" style={{ background: "none", border: "none", color: t.primary }}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        {isNurse && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, marginBottom: 8 }}>Predefined Diet Codes:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { code: "NAS", label: "No Added Salt" },
                { code: "DM", label: "Diabetic Diet" },
                { code: "LD", label: "Low Diet" },
                { code: "NPO", label: "Nothing by mouth" },
                { code: "SOFT", label: "Soft Diet" },
                { code: "LIQ", label: "Clear Liquid" },
                { code: "RENAL", label: "Renal Diet" }
              ].map(diet => {
                const isActive = store.dietCodes.some(d => d.code === diet.code);
                return (
                  <button
                    key={diet.code}
                    onClick={() => isActive ? nurseActions.removeDietCode(diet.code) : nurseActions.addDietCode(diet.code, diet.label)}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all text-left"
                    style={{
                      backgroundColor: isActive ? t.primarySubtle : "#F3F4F6",
                      color: isActive ? t.primary : t.textMuted,
                      border: `1px solid ${isActive ? t.primary : "transparent"}`,
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>{diet.code}</span> — {diet.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pain Score */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Activity size={18} style={{ color: pc }} /> Pain Score</h3>
        <div className="flex items-center gap-4">
          <span style={{ fontSize: "36px", fontWeight: 900, color: pc }}>{store.painScore}<span style={{ fontSize: "18px", color: t.textMuted }}>/10</span></span>
          <span style={{ fontSize: "12px", fontWeight: 800, color: pc, backgroundColor: `${pc}18`, padding: "4px 12px", borderRadius: 99 }}>{painLabel(store.painScore).toUpperCase()}</span>
        </div>
        {isNurse && (
          <div className="mt-4">
            <input type="range" min={0} max={10} value={store.painScore}
              onChange={(e) => nurseActions.setPainScore(Number(e.target.value))}
              className="w-full cursor-pointer" style={{ accentColor: pc }} />
            <div className="flex justify-between mt-1" style={{ fontSize: "11px", color: t.textMuted }}>
              <span>0 — None</span><span>10 — Severe</span>
            </div>
          </div>
        )}
      </div>
      {/* HIS Disclaimer Note */}
      <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: `${t.primary}08`, border: `1px dashed ${t.primary}40` }}>
        <Info size={20} style={{ color: t.primary, marginTop: 2 }} />
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
