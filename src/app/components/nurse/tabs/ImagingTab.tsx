import { Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useLocale } from "../../i18n";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

export function ImagingTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const isNurse = role === "nurse";

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
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Imaging" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.imaging}
              onChange={(e) => nurseActions.setSectionVisible("imaging", e.target.checked)}
              className="sr-only peer"
            />
            <div className="ni-switch"
              style={{ backgroundColor: store.sectionVisibility.imaging ? t.primary : undefined }} />
          </label>
        </div>
      )}

      <div className="nurse-card">
      <h3 style={{ color: t.textHeading }}><ImageIcon size={18} style={{ color: t.primaryOn }} /> Imaging & Scans</h3>
      <div className="space-y-3">
        {store.imagingResults.map((img) => (
          <div key={img.id} className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
            style={{ backgroundColor: t.surfaceInset, border: `1px solid ${t.borderCardColor}`, opacity: img.visible ? 1 : 0.5 }}>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: t.primarySubtle }}>
              <ImageIcon size={16} style={{ color: t.primaryOn }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>{tr(img.labelKey)}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: "12px", fontWeight: 600, color: t.primaryOn }}>{img.type}</span>
                <span style={{ fontSize: "11px", color: t.textMuted }}>{img.date}</span>
              </div>
            </div>
            {isNurse && (
              <button onClick={() => nurseActions.setImagingResultVisible(img.id, !img.visible)}
                className="p-2 rounded-lg cursor-pointer transition-all" style={{ backgroundColor: img.visible ? t.primarySubtle : t.errorSubtle, border: "none" }}>
                {img.visible ? <Eye size={14} style={{ color: t.primaryOn }} /> : <EyeOff size={14} style={{ color: t.errorOn }} />}
              </button>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
