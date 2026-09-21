import { useNurseStore } from "../../NurseDataStore";
import { useTheme } from "../../ThemeContext";
import { Target, Info } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PersonCenteredCareTab({ role: _role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const store = useNurseStore();
  const goal = store.alerts.careGoal || "";

  return (
    <div className="flex flex-col gap-4">
      {/* Read back, not set. The goal is the patient's answer to what today
          is for, chosen on their own card — a ward typing it for them was the
          one thing in Person-Centered Care that the person was not centred
          in. Shown here so the round knows what was asked for. */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Target size={18} style={{ color: t.primaryOn }} /> Care Goal of the Day</h3>
        <p style={{ fontSize: "12px", color: t.textMuted, marginBottom: 12 }}>
          Chosen by the patient on their Person-Centered Care card. Shown here so the ward knows what
          they are working towards today.
        </p>
        {goal ? (
          <div
            dir="auto"
            style={{
              padding: "14px 16px", borderRadius: 12,
              backgroundColor: t.primarySubtle,
              border: `1px solid ${t.primarySubtle}`,
              color: t.primaryOn, fontSize: "15px", fontWeight: 700,
            }}
          >
            {goal}
          </div>
        ) : (
          <div
            style={{
              padding: "14px 16px", borderRadius: 12,
              backgroundColor: t.surfaceInset,
              border: `1px dashed ${t.borderDefault}`,
              color: t.textMuted, fontSize: "14px",
            }}
          >
            The patient has not chosen a goal for today yet.
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: `${t.primary}08`, border: `1px dashed ${t.primary}40` }}>
        <Info size={20} style={{ color: t.primaryOn, marginTop: 2 }} />
        <div className="flex flex-col gap-1">
          <p style={{ fontSize: "13px", fontWeight: 700, color: t.textHeading }}>Person-Centered Care</p>
          <p style={{ fontSize: "12px", color: t.textMuted, lineHeight: "1.5" }}>
            The patient's own sections — preferences, care partner and communication board — are filled in by the
            patient on the bedside screen. This tab is where the ward sets what today is for.
          </p>
        </div>
      </div>
    </div>
  );
}
