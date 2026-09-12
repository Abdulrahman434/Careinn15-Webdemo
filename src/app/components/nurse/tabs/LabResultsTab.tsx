import { FlaskConical, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useLocale } from "../../i18n";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

export function LabResultsTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const isNurse = role === "nurse";

  const statusColor = (s: string) => s === "low" || s === "high" ? t.errorOn : t.successOn;
  const statusBg = (s: string) => s === "low" || s === "high" ? t.errorSubtle : t.successSubtle;

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
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Lab Results" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.labs}
              onChange={(e) => nurseActions.setSectionVisible("labs", e.target.checked)}
              className="sr-only peer"
            />
            <div className="ni-switch"
              style={{ backgroundColor: store.sectionVisibility.labs ? t.primary : undefined }} />
          </label>
        </div>
      )}

      <div className="nurse-card">
      <h3 style={{ color: t.textHeading }}><FlaskConical size={18} style={{ color: t.primaryOn }} /> Lab Results</h3>
      <div className="space-y-3">
        {store.labResults.map((lab) => (
          <div key={lab.id} className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
            style={{ backgroundColor: t.surfaceInset, border: `1px solid ${t.borderCardColor}`, opacity: lab.visible ? 1 : 0.5 }}>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: t.primarySubtle }}>
              <FlaskConical size={16} style={{ color: t.primaryOn }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>{tr(lab.labelKey)}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: "13px", fontWeight: 700, color: statusColor(lab.status) }}>{lab.value}</span>
                <span style={{ fontSize: "11px", color: t.textMuted }}>{lab.date}</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-md" style={{ backgroundColor: statusBg(lab.status) }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: statusColor(lab.status), letterSpacing: "0.5px" }}>
                {lab.status.toUpperCase()}
              </span>
            </div>
            {isNurse && (
              <button onClick={() => nurseActions.setLabResultVisible(lab.id, !lab.visible)}
                className="p-2 rounded-lg cursor-pointer transition-all" style={{ backgroundColor: lab.visible ? t.primarySubtle : t.errorSubtle, border: "none" }}>
                {lab.visible ? <Eye size={14} style={{ color: t.primaryOn }} /> : <EyeOff size={14} style={{ color: t.errorOn }} />}
              </button>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
