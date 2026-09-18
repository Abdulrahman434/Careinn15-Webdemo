import { useNurseStore, nurseActions } from "../../NurseDataStore";
import { useTheme } from "../../ThemeContext";
import { Target, Info } from "lucide-react";

/* The goals a ward actually sets, in the words it uses on a round. Free text
   is still allowed underneath, because no list survives contact with a real
   patient — but the list is what makes this a two-second job at the bedside. */
const CARE_GOALS = [
  "Sit out of bed for all three meals",
  "Walk to the end of the corridor and back",
  "Keep pain at or below 3 out of 10",
  "Finish today's antibiotics on time",
  "Eat and drink without help",
  "Breathing exercises every two hours",
  "Rest between visitors",
  "Ready for tomorrow's procedure",
  "Understand the discharge plan",
];

export function PersonCenteredCareTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const store = useNurseStore();
  const isNurse = role === "nurse";
  const goal = store.alerts.careGoal || "";

  return (
    <div className="flex flex-col gap-4">
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Target size={18} style={{ color: t.primaryOn }} /> Care Goal of the Day</h3>
        <p style={{ fontSize: "12px", color: t.textMuted, marginBottom: 12 }}>
          Shown at the top of the patient's Person-Centered Care card. One goal at a time — it is what the
          patient and the ward are working towards today.
        </p>

        <label style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, display: "block", marginBottom: 6 }}>
          Today's goal
        </label>
        <select
          value={CARE_GOALS.includes(goal) ? goal : goal ? "__custom" : ""}
          disabled={!isNurse}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom") return;
            nurseActions.setAlerts({ careGoal: v });
          }}
          className="w-full outline-none"
          style={{
            padding: "10px 12px", borderRadius: 10, fontSize: "14px",
            color: t.textHeading, backgroundColor: t.surfaceInset,
            border: `1px solid ${t.borderDefault}`,
            cursor: isNurse ? "pointer" : "default",
          }}
        >
          <option value="">No goal set</option>
          {CARE_GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
          {goal && !CARE_GOALS.includes(goal) && <option value="__custom">{goal}</option>}
        </select>

        {/* A ward that needs to say something the list cannot. */}
        <label style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, display: "block", margin: "12px 0 6px" }}>
          Or write your own
        </label>
        <input dir="auto"
          value={goal}
          readOnly={!isNurse}
          onChange={(e) => nurseActions.setAlerts({ careGoal: e.target.value })}
          placeholder="e.g. Sit out of bed for all three meals"
          className="w-full outline-none"
          style={{
            padding: "10px 12px", borderRadius: 10, fontSize: "14px",
            color: t.textHeading, backgroundColor: t.surfaceInset,
            border: `1px solid ${t.borderDefault}`,
          }}
        />

        {goal && isNurse && (
          <button
            onClick={() => nurseActions.setAlerts({ careGoal: "" })}
            className="mt-3 px-4 py-2 rounded-lg cursor-pointer"
            style={{ fontSize: "13px", fontWeight: 700, color: t.textMuted, backgroundColor: t.surfaceInset, border: `1px solid ${t.borderDefault}` }}
          >
            Clear goal
          </button>
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
