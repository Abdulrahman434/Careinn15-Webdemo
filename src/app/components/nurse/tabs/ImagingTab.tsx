import { Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

export function ImagingTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const store = useNurseStore();
  const isNurse = role === "nurse";

  return (
    <div className="nurse-card">
      <h3 style={{ color: t.textHeading }}><ImageIcon size={18} style={{ color: t.primary }} /> Imaging & Scans</h3>
      <div className="space-y-3">
        {store.imagingResults.map((img) => (
          <div key={img.id} className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
            style={{ backgroundColor: img.visible ? "#F9FAFB" : "rgba(0,0,0,0.02)", border: `1px solid ${t.borderDefault}`, opacity: img.visible ? 1 : 0.5 }}>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: t.primarySubtle }}>
              <ImageIcon size={16} style={{ color: t.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>{img.labelKey}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: "12px", fontWeight: 600, color: t.primary }}>{img.type}</span>
                <span style={{ fontSize: "11px", color: t.textMuted }}>{img.date}</span>
              </div>
            </div>
            {isNurse && (
              <button onClick={() => nurseActions.setImagingResultVisible(img.id, !img.visible)}
                className="p-2 rounded-lg cursor-pointer transition-all" style={{ backgroundColor: img.visible ? t.primarySubtle : t.errorSubtle, border: "none" }}>
                {img.visible ? <Eye size={14} style={{ color: t.primary }} /> : <EyeOff size={14} style={{ color: t.error }} />}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
