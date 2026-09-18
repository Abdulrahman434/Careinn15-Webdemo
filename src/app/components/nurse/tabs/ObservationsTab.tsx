import { useRef, useState, useEffect } from "react";
import {
  Activity, Droplet, Thermometer, Wind, Save, CheckCircle2,
  Clock, Trash2, ClipboardList, Eye
} from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useLocale } from "../../i18n";
import { useNurseStore, nurseActions, type ClinicalObservation } from "../../NurseDataStore";

function fmtFull(d: any) {
  if (!d) return "";
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return String(d);
  return `${dateObj.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })} • ${dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
function painColor(n: number, dark: boolean) {
  // Lifted variants for dark surfaces; the base hues fail AA below ~4.5:1 there.
  if (n <= 0) return dark ? "#B7C4CE" : "#64748B";
  if (n < 4) return dark ? "#34D399" : "#047857";
  if (n < 7) return dark ? "#FBBF24" : "#B45309";
  return dark ? "#FF7B7B" : "#DC2626";
}

/* Blood pressure, as two boxes with the slash already between them.
 *
 * It is stored as one "120/80" string, because that is what the ticket, the
 * board and the patient's card all read. Only the entry is split: on a touch
 * keypad the slash sits behind a symbols key, and a nurse taking a round of
 * vitals should never have to go looking for punctuation. Three digits fills
 * a box and moves the caret on, so the whole reading is six taps. */
function BloodPressureField({ value, onChange, unit }: {
  value: string; onChange: (v: string) => void; unit: string;
}) {
  const { theme: t } = useTheme();
  const [sys = "", dia = ""] = (value || "").split("/");
  const diaRef = useRef<HTMLInputElement | null>(null);

  const digits = (raw: string) => raw.replace(/\D/g, "").slice(0, 3);
  /* An empty diastolic is not "120/" — a half-entered reading is stored as
     just the number it has, so nothing downstream has to strip a stray slash. */
  const join = (a: string, b: string) => (b ? `${a}/${b}` : a);

  const box: React.CSSProperties = {
    width: "3ch", minWidth: "3ch", textAlign: "center",
    fontSize: "20px", fontWeight: 900, color: t.textHeading,
    background: "transparent", border: "none", outline: "none",
  };

  return (
    <div dir="ltr" className="flex items-baseline" style={{ gap: "2px" }}>
      <input
        value={sys}
        onChange={(e) => {
          const next = digits(e.target.value);
          onChange(join(next, dia));
          if (next.length === 3) diaRef.current?.focus();
        }}
        placeholder="120"
        inputMode="numeric"
        aria-label="Systolic"
        style={box}
      />
      <span aria-hidden style={{ fontSize: "20px", fontWeight: 900, color: t.textMuted }}>/</span>
      <input
        ref={diaRef}
        value={dia}
        onChange={(e) => onChange(join(sys, digits(e.target.value)))}
        onKeyDown={(e) => {
          /* Backspace out of an empty diastolic goes back to the systolic,
             so a mistyped reading is corrected without reaching for the box. */
          if (e.key === "Backspace" && !dia) {
            (e.currentTarget.previousElementSibling?.previousElementSibling as HTMLInputElement | null)?.focus();
          }
        }}
        placeholder="80"
        inputMode="numeric"
        aria-label="Diastolic"
        style={box}
      />
      <span style={{ fontSize: "11px", color: t.textMuted, marginInlineStart: "4px" }}>{unit}</span>
    </div>
  );
}

export function ObservationsTab({ role, addNonce = 0 }: { role: "nurse" | "doctor"; addNonce?: number }) {
  const { theme: t, darkMode } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const isNurse = role === "nurse";

  const [isAdding, setIsAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state
  const blankForm = { vitals: { bp: "", hr: "", temp: "", spo2: "", resp: "" }, painLevel: 0 };
  const [form, setForm] = useState(blankForm);

  // "Add Observation" in the header bumps `addNonce`. A counter rather than a
  // boolean so repeat presses re-open the form even when the tab is already
  // showing — a plain flag would only ever fire once.
  useEffect(() => {
    if (addNonce > 0 && role === "nurse") {
      setIsAdding(true);
      setSelectedId(null);
      setForm(blankForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNonce]);

  const activeObs = store.observations.find((o) => o.id === selectedId) || store.observations[store.observations.length - 1] || null;

  const handleSave = () => {
    const obs: ClinicalObservation = {
      id: Date.now().toString(36),
      timestamp: new Date(),
      nurseName: "clinical.nurse.nura",
      vitals: form.vitals,
      painLevel: form.painLevel,
      /* Kept on the record for the older readings that carry it; the form
         does not ask for risks any more — the alerts live on Care Details. */
      risks: { fall: false, pressure: false, allergies: false, other: false },
    };
    nurseActions.addObservation(obs);
    setSelectedId(obs.id);
    setForm(blankForm);
    setIsAdding(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };


  return (
    <div className="flex flex-col gap-5">
      {isNurse && (
        <div className="nurse-card flex items-center justify-between" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primarySubtle }}>
              <Eye size={18} style={{ color: t.primaryOn }} />
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, display: "block" }}>Show Section to Patient</span>
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Observations" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.observations}
              onChange={(e) => nurseActions.setSectionVisible("observations", e.target.checked)}
              className="sr-only peer"
            />
            <div className="ni-switch"
              style={{ backgroundColor: store.sectionVisibility.observations ? t.primary : undefined }} />
          </label>
        </div>
      )}

      <div className="flex gap-5" style={{ minHeight: 500 }}>
      {/* Main content */}
      <div className="flex-1">
        {isAdding ? (
          <div className="nurse-card">
            <h3 style={{ color: t.textHeading }}><ClipboardList size={18} style={{ color: t.primaryOn }} /> New Vital Signs</h3>
            <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: 16 }}>{fmtFull(new Date())}</p>

            {/* Vitals */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              {[
                { key: "bp", label: "Blood Pressure", unit: "mmHg", icon: <Droplet size={14} color={t.errorOn} />, placeholder: "120/80" },
                { key: "hr", label: "Heart Rate", unit: "BPM", icon: <Activity size={14} color="#F43F5E" />, placeholder: "72" },
                { key: "temp", label: "Temperature", unit: "°C", icon: <Thermometer size={14} color="#F59E0B" />, placeholder: "37.0" },
                { key: "spo2", label: "O₂ Saturation", unit: "%", icon: <Wind size={14} style={{ color: t.primaryOn }} />, placeholder: "98" },
                { key: "resp", label: "Respiratory Rate", unit: "/min", icon: <Wind size={14} style={{ color: t.infoOn }} />, placeholder: "16" },
              ].map((v) => (
                <div key={v.key} className="p-3 rounded-xl" style={{ backgroundColor: t.surfaceInset, border: `1px solid ${t.borderDefault}` }}>
                  <div className="flex items-center gap-1.5 mb-2">{v.icon}<span style={{ fontSize: "10px", fontWeight: 700, color: t.textMuted }}>{v.label}</span></div>
                  {v.key === "bp" ? (
                    <BloodPressureField
                      value={form.vitals.bp}
                      onChange={(bp) => setForm({ ...form, vitals: { ...form.vitals, bp } })}
                      unit={v.unit}
                    />
                  ) : (
                  <div dir="ltr" className="flex items-baseline gap-1">
                    <input dir="auto"
                      value={(form.vitals as any)[v.key]}
                      onChange={(e) => {
                        let val = e.target.value;
                        
                        if (v.key === "hr") {
                          val = val.replace(/\D/g, "").slice(0, 3);
                        } else if (v.key === "resp") {
                          val = val.replace(/\D/g, "").slice(0, 2);
                        } else if (v.key === "spo2") {
                          val = val.replace(/\D/g, "");
                          if (Number(val) > 100) val = "100";
                        } else if (v.key === "temp") {
                          val = val.replace(/[^0-9.]/g, "");
                          if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                        }

                        setForm({ ...form, vitals: { ...form.vitals, [v.key]: val } });
                      }}
                      placeholder={v.placeholder}
                      inputMode={v.key === "temp" ? "decimal" : "numeric"}
                      className="bg-transparent border-none outline-none w-full"
                      style={{ fontSize: "20px", fontWeight: 900, color: t.textHeading }}
                    />
                    <span style={{ fontSize: "11px", color: t.textMuted }}>{v.unit}</span>
                  </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pain */}
            <div className="mb-5">
              <span style={{ fontSize: "12px", fontWeight: 600, color: t.textMuted }}>Pain Level: {form.painLevel}/10</span>
              <input dir="auto" type="range" min={0} max={10} value={form.painLevel}
                onChange={(e) => setForm({ ...form, painLevel: Number(e.target.value) })}
                className="w-full mt-2" style={{ accentColor: painColor(form.painLevel, darkMode) }} />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
                style={{ backgroundColor: saved ? t.success : t.primary, color: saved ? t.successOn : t.brandOnPrimary, fontSize: "14px", border: "none" }}>
                {saved ? <CheckCircle2 size={16} /> : <Save size={16} />} {saved ? "Saved!" : "Save Vital Signs"}
              </button>
              <button onClick={() => { setIsAdding(false); setForm(blankForm); }}
                className="px-6 py-3 rounded-xl font-bold cursor-pointer" style={{ fontSize: "14px", color: t.textMuted, border: `1.5px solid ${t.borderDefault}`, backgroundColor: t.surface }}>
                Cancel
              </button>
            </div>
          </div>
        ) : activeObs ? (
          <div className="nurse-card">
            <div className="mb-4">
              <span style={{ fontSize: "12px", fontWeight: 700, color: t.primaryOn }}>Vital Signs</span>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ fontSize: "16px", fontWeight: 800, color: t.textHeading }}>{tr(activeObs.nurseName)}</span>
                <span style={{ color: t.textMuted, opacity: 0.3 }}>|</span>
                <span style={{ fontSize: "13px", color: t.textMuted }}>{fmtFull(activeObs.timestamp)}</span>
              </div>
            </div>

            {/* Vitals */}
            <div dir="ltr" className="grid grid-cols-5 gap-3 mb-5">
              {[
                { val: activeObs.vitals.bp, label: "BP", unit: "mmHg", icon: <Droplet size={14} color={t.errorOn} /> },
                { val: activeObs.vitals.hr, label: "HR", unit: "BPM", icon: <Activity size={14} color="#F43F5E" /> },
                { val: activeObs.vitals.temp, label: "Temp", unit: "°C", icon: <Thermometer size={14} color="#F59E0B" /> },
                { val: activeObs.vitals.spo2, label: "SpO₂", unit: "%", icon: <Wind size={14} style={{ color: t.primaryOn }} /> },
                { val: activeObs.vitals.resp, label: "Resp", unit: "/min", icon: <Wind size={14} style={{ color: t.infoOn }} /> },
              ].map((v) => (
                <div key={v.label} className="p-3 rounded-xl" style={{ backgroundColor: t.surfaceInset, border: `1px solid ${t.borderDefault}` }}>
                  <div className="flex items-center gap-1.5 mb-2">{v.icon}<span style={{ fontSize: "10px", fontWeight: 700, color: t.textMuted }}>{v.label}</span></div>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: t.textHeading }}>{v.val || "—"}</span>
                  <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: 4 }}>{v.unit}</span>
                </div>
              ))}
            </div>

            {/* Pain */}
            <div className="mb-5">
              <div className="p-4 rounded-xl" style={{ backgroundColor: t.surfaceInset, border: `1px solid ${t.borderDefault}` }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: t.textMuted }}>Pain</span>
                <div className="flex items-center gap-2 mt-2">
                  <span style={{ fontSize: "28px", fontWeight: 900, color: painColor(activeObs.painLevel, darkMode) }}>{activeObs.painLevel}<span style={{ fontSize: "14px", color: t.textMuted }}>/10</span></span>
                </div>
              </div>
            </div>

            {isNurse && (
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.borderDefault}` }}>
                <button onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl cursor-pointer transition-all active:scale-95"
                  style={{ backgroundColor: t.primary, color: t.brandOnPrimary, fontSize: "14px", fontWeight: 700, border: "none" }}>
                  Add New Reading
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="nurse-card flex flex-col items-center justify-center py-16">
            <ClipboardList size={40} style={{ color: t.textMuted, opacity: 0.5 }} />
            <p className="mt-4" style={{ fontSize: "14px", color: t.textMuted }}>No vital signs recorded yet.</p>
            {isNurse && (
              <button onClick={() => setIsAdding(true)} className="mt-4 px-5 py-3 rounded-xl cursor-pointer"
                style={{ backgroundColor: t.primary, color: t.brandOnPrimary, fontWeight: 700, border: "none" }}>
                Add First Reading
              </button>
            )}
          </div>
        )}
      </div>

      {/* History sidebar */}
      <div className="shrink-0" style={{ width: 300 }}>
        <div className="nurse-card" style={{ position: "sticky", top: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading }}>History</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: t.primaryOn, backgroundColor: t.primarySubtle, padding: "2px 10px", borderRadius: 99 }}>{store.observations.length}</span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto ni-scroll">
            {[...store.observations].reverse().map((obs) => (
              <div key={obs.id} onClick={() => { setSelectedId(obs.id); setIsAdding(false); }}
                className="group p-3 rounded-xl cursor-pointer transition-all hover:shadow-md"
                style={{ backgroundColor: t.surface, border: selectedId === obs.id || (!selectedId && obs.id === activeObs?.id) ? `2px solid ${t.primary}` : `1px solid ${t.borderDefault}` }}>
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: t.primaryOn, backgroundColor: t.primarySubtle, padding: "2px 8px", borderRadius: 99 }}>NURSE</span>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: t.textHeading, marginTop: 4 }}>{tr(obs.nurseName)}</p>
                    <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: "11px", color: t.textMuted }}><Clock size={10} /> {fmtFull(obs.timestamp)}</p>
                  </div>
                  {isNurse && (
                    <button onClick={(e) => { e.stopPropagation(); nurseActions.deleteObservation(obs.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded cursor-pointer" style={{ background: "none", border: "none" }}>
                      <Trash2 size={12} style={{ color: t.errorOn }} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[obs.vitals.bp, obs.vitals.hr, obs.vitals.temp + "°", obs.vitals.spo2 + "%"].map((v, i) => (
                    <div key={i} className="px-1.5 py-1 rounded-lg text-center" style={{ backgroundColor: t.primarySubtle, fontSize: "10px", fontWeight: 700, color: t.textHeading }}>{v}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
