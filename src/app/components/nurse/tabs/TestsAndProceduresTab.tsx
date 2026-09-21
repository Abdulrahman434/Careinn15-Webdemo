import { ClipboardCheck, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useNurseStore, nurseActions } from "../../NurseDataStore";
import { LabResultsTab } from "./LabResultsTab";
import { ImagingTab } from "./ImagingTab";

/**
 * TESTS AND PROCEDURES
 *
 * Labs and imaging used to be two tabs here while the bedside screen has
 * always shown them as three sections of one card — so a nurse hunting for
 * what the patient sees had to hold two places in their head and still not
 * find the third. This is the same card, from the other side: the two
 * existing panels unchanged, each keeping its own heading and its own
 * "show to patient" switch, and procedures joining them.
 *
 * Procedures have no section-level switch because the data has no section to
 * switch: each one carries its own `visible`, and the bedside card shows the
 * group only when something in it survives that filter.
 */
export function TestsAndProceduresTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const store = useNurseStore();
  const isNurse = role === "nurse";
  const procedures = store.procedures || [];

  return (
    <div className="space-y-5">
      <LabResultsTab role={role} />
      <ImagingTab role={role} />

      {procedures.length > 0 && (
        <div className="nurse-card">
          <h3 style={{ color: t.textHeading }}>
            <ClipboardCheck size={18} style={{ color: t.primaryOn }} /> Procedures
          </h3>
          <div className="space-y-3">
            {procedures.map((proc) => (
              <div
                key={proc.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
                style={{
                  backgroundColor: t.surfaceInset,
                  border: `1px solid ${t.borderCardColor}`,
                  opacity: proc.visible ? 1 : 0.5,
                }}
              >
                <div
                  className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0"
                  style={{ backgroundColor: t.primarySubtle }}
                >
                  <ClipboardCheck size={16} style={{ color: t.primaryOn }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>{proc.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {proc.summary && (
                      <span style={{ fontSize: "12px", fontWeight: 600, color: t.primaryOn }}>{proc.summary}</span>
                    )}
                    <span style={{ fontSize: "11px", color: t.textMuted }}>{proc.date}</span>
                  </div>
                </div>
                {isNurse && (
                  <button
                    onClick={() => nurseActions.setProcedureVisible(proc.id, !proc.visible)}
                    className="p-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: proc.visible ? t.primarySubtle : t.errorSubtle,
                      border: "none",
                    }}
                  >
                    {proc.visible
                      ? <Eye size={14} style={{ color: t.primaryOn }} />
                      : <EyeOff size={14} style={{ color: t.errorOn }} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
