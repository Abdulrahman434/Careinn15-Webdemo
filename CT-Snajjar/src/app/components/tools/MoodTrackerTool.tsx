import { useState } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { ArrowLeft, Smile, Meh, Frown, Save } from "lucide-react";

export function MoodTrackerTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { isRTL, fontFamily } = useLocale();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!selectedMood) return;
    // Simulate save
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const moods = [
    { label: "Happy", icon: Smile, color: "#10B981", bg: "#ECFDF5" },
    { label: "Neutral", icon: Meh, color: "#F59E0B", bg: "#FFFBEB" },
    { label: "Sad", icon: Frown, color: "#EF4444", bg: "#FEF2F2" },
  ];

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToTools} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Mood Tracker</h1>
        </div>
        <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
          <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center py-12 px-8 gap-12">
        <h2 style={{ fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading }}>How are you feeling today?</h2>
        
        <div className="flex gap-12">
          {moods.map((m) => (
            <button
              key={m.label}
              onClick={() => setSelectedMood(m.label)}
              className="flex flex-col items-center gap-4 p-8 rounded-[40px] transition-all duration-300 transform active:scale-90"
              style={{
                backgroundColor: selectedMood === m.label ? m.bg : "transparent",
                border: selectedMood === m.label ? `3px solid \${m.color}` : "3px solid transparent",
                boxShadow: selectedMood === m.label ? SHADOW.xl : "none",
              }}
            >
              <m.icon size={80} color={selectedMood === m.label ? m.color : "#9CA3AF"} />
              <span style={{ fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: selectedMood === m.label ? m.color : "#9CA3AF" }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full max-w-xl flex flex-col gap-4">
          <label style={{ fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textMuted }}>Add a note (optional):</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write how you are feeling..."
            className="w-full h-40 p-6 bg-white rounded-3xl border-2 outline-none focus:border-blue-500 transition-all text-lg shadow-sm"
            style={{ fontFamily: fontFamily, borderColor: theme.cardBorder }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!selectedMood}
          className="flex items-center gap-3 px-12 py-5 bg-blue-600 text-white rounded-full font-bold text-xl shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {saved ? "SAVED!" : <><Save size={24} /> SAVE ENTRY</>}
        </button>
      </div>
    </div>
  );
}
