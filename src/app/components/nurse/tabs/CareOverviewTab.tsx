import { useState } from "react";
import { Users, AlertTriangle, Apple, Plus, X, Activity } from "lucide-react";
import { useTheme } from "../../ThemeContext";
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
  const store = useNurseStore();
  const isNurse = role === "nurse";

  const [newAllergy, setNewAllergy] = useState("");
  const [newDietCode, setNewDietCode] = useState("");
  const [newDietLabel, setNewDietLabel] = useState("");

  const pc = painColor(store.painScore);

  return (
    <div className="space-y-5">
      {/* Care Team */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Users size={18} style={{ color: t.primary }} /> Care Team</h3>
        <div className="space-y-3">
          {store.careTeam.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "#F9FAFB", border: `1px solid ${t.borderDefault}` }}>
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                <img src={m.img} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>{m.nameKey}</p>
                <p style={{ fontSize: "12px", fontWeight: 600, color: t.primary }}>{m.roleKey}</p>
              </div>
              {isNurse && (
                <button onClick={() => nurseActions.removeCareTeamMember(m.id)}
                  className="p-1.5 rounded-lg cursor-pointer transition-all hover:bg-red-50"
                  style={{ border: "none", background: "none" }}>
                  <X size={14} style={{ color: t.error }} />
                </button>
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
          <div className="flex items-center gap-2">
            <input value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)} placeholder="Add allergy..."
              className="flex-1 outline-none" style={{ padding: "8px 12px", borderRadius: 10, fontSize: "13px", border: `1.5px solid ${t.borderDefault}`, backgroundColor: "#fff" }}
              onKeyDown={(e) => { if (e.key === "Enter" && newAllergy.trim()) { nurseActions.addAllergy(newAllergy.trim()); setNewAllergy(""); } }} />
            <button onClick={() => { if (newAllergy.trim()) { nurseActions.addAllergy(newAllergy.trim()); setNewAllergy(""); } }}
              className="p-2 rounded-lg cursor-pointer" style={{ backgroundColor: t.errorSubtle, border: "none", color: t.error }}>
              <Plus size={16} />
            </button>
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
          <div className="flex items-center gap-2">
            <input value={newDietCode} onChange={(e) => setNewDietCode(e.target.value.toUpperCase())} placeholder="Code"
              className="outline-none" style={{ width: 80, padding: "8px 12px", borderRadius: 10, fontSize: "13px", border: `1.5px solid ${t.borderDefault}` }} />
            <input value={newDietLabel} onChange={(e) => setNewDietLabel(e.target.value)} placeholder="Label"
              className="flex-1 outline-none" style={{ padding: "8px 12px", borderRadius: 10, fontSize: "13px", border: `1.5px solid ${t.borderDefault}` }}
              onKeyDown={(e) => { if (e.key === "Enter" && newDietCode.trim() && newDietLabel.trim()) { nurseActions.addDietCode(newDietCode.trim(), newDietLabel.trim()); setNewDietCode(""); setNewDietLabel(""); } }} />
            <button onClick={() => { if (newDietCode.trim() && newDietLabel.trim()) { nurseActions.addDietCode(newDietCode.trim(), newDietLabel.trim()); setNewDietCode(""); setNewDietLabel(""); } }}
              className="p-2 rounded-lg cursor-pointer" style={{ backgroundColor: t.primarySubtle, border: "none", color: t.primary }}>
              <Plus size={16} />
            </button>
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
    </div>
  );
}
