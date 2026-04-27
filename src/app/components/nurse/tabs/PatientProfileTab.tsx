import { useState } from "react";
import { User, Save, X, CheckCircle2 } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

export function PatientProfileTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const store = useNurseStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(store.patient);
  const [saved, setSaved] = useState(false);
  const isReadOnly = role === "doctor";

  const handleSave = () => {
    nurseActions.updatePatient(draft);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setDraft(store.patient);
    setEditing(false);
  };

  const fields = [
    { key: "name", label: "Full Name", span: 2 },
    { key: "age", label: "Age" },
    { key: "mrn", label: "MRN" },
    { key: "room", label: "Room" },
    { key: "extension", label: "Extension" },
    { key: "admissionDate", label: "Admission Date" },
    { key: "dischargeDate", label: "Expected Discharge" },
    { key: "contact", label: "Contact Number", span: 2 },
    { key: "emergencyName", label: "Emergency Contact Name" },
    { key: "emergencyContact", label: "Emergency Contact Number" },
  ] as const;

  return (
    <div className="nurse-card">
      <div className="flex items-center justify-between mb-6">
        <h3 style={{ color: t.textHeading, margin: 0 }}>
          <User size={20} style={{ color: t.primary }} /> Patient Profile
        </h3>
        {!isReadOnly && !editing && (
          <button
            onClick={() => { setDraft(store.patient); setEditing(true); }}
            className="px-4 py-2 rounded-xl cursor-pointer transition-all active:scale-95"
            style={{ fontSize: "13px", fontWeight: 700, color: t.primary, backgroundColor: t.primarySubtle, border: "none" }}
          >
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} style={{ gridColumn: f.span === 2 ? "span 2" : undefined }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
              {f.label}
            </label>
            {editing ? (
              <input
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                className="w-full outline-none transition-all"
                style={{
                  padding: "10px 14px", borderRadius: 12, fontSize: "15px", fontWeight: 600,
                  color: t.textHeading, border: `1.5px solid ${t.borderDefault}`, backgroundColor: t.surface,
                }}
                onFocus={(e) => (e.target.style.borderColor = t.primary)}
                onBlur={(e) => (e.target.style.borderColor = t.borderDefault)}
              />
            ) : (
              <div
                style={{
                  padding: "10px 14px", borderRadius: 12, fontSize: "15px", fontWeight: 600,
                  color: t.textHeading, backgroundColor: "#F9FAFB", border: `1px solid ${t.borderDefault}`,
                }}
              >
                {store.patient[f.key] || "—"}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: `1px solid ${t.borderDefault}` }}>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
            style={{ backgroundColor: t.primary, color: "#fff", fontSize: "14px", border: "none" }}
          >
            <Save size={16} /> Save
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-3 rounded-xl font-bold cursor-pointer"
            style={{ fontSize: "14px", color: t.textMuted, border: `1.5px solid ${t.borderDefault}`, backgroundColor: "#fff" }}
          >
            Cancel
          </button>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 mt-4" style={{ color: t.success, fontSize: "14px", fontWeight: 700 }}>
          <CheckCircle2 size={16} /> Saved successfully
        </div>
      )}
    </div>
  );
}
