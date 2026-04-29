import { useState, useRef } from "react";
import { ClipboardList, Plus, Trash2, Check, Clock, GripVertical, Edit2, Save, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useLocale } from "../../i18n";
import { useNurseStore, nurseActions, type CarePlanItem } from "../../NurseDataStore";

type CarePlanMode = "daily" | "overall";

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function shiftDay(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + delta);
  return next;
}
const toISO = (d: Date) => d.toISOString().split("T")[0];
const fromISO = (s: string) => new Date(s);

export function CarePlanTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const isNurse = role === "nurse";
  const [newLabel, setNewLabel] = useState("");
  const [newLabelAr, setNewLabelAr] = useState("");
  const [newMinutes, setNewMinutes] = useState("");
  const [newDay, setNewDay] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editLabelAr, setEditLabelAr] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const mode = store.carePlanMode;
  const selectedDate = fromISO(store.carePlanSelectedDate);

  const handleModeChange = (newMode: "daily" | "overall") => {
    nurseActions.setCarePlanMode(newMode);
  };

  const today = new Date();
  const yesterday = shiftDay(today, -1);
  const tomorrow = shiftDay(today, 1);

  let dateLabel = "";
  if (isSameDay(selectedDate, today)) dateLabel = tr("careplan.today") || "Today";
  else if (isSameDay(selectedDate, yesterday)) dateLabel = tr("careplan.yesterday") || "Yesterday";
  else if (isSameDay(selectedDate, tomorrow)) dateLabel = tr("careplan.tomorrow") || "Tomorrow";
  else dateLabel = selectedDate.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    nurseActions.addCarePlanItem({
      id: `cp-${Date.now().toString(36)}`,
      labelKey: "",
      label: newLabel.trim(),
      labelAr: newLabelAr.trim(),
      done: false,
      minutes: mode === "daily" ? (Number(newMinutes) || 30) : undefined,
      day: mode === "overall" ? (Number(newDay) || 1) : undefined,
      date: mode === "daily" ? store.carePlanSelectedDate : undefined,
    });
    setNewLabel("");
    setNewLabelAr("");
    setNewMinutes("");
    setNewDay("1");
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const items = [...store.carePlan];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    nurseActions.setCarePlan(items);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const filteredItems = store.carePlan.filter(item => {
    if (mode === "overall") return item.day !== undefined;
    return item.date === store.carePlanSelectedDate;
  });

  return (
    <div className="space-y-5">
      {isNurse && (
        <div className="nurse-card flex items-center justify-between" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primarySubtle }}>
              <Eye size={18} style={{ color: t.primary }} />
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, display: "block" }}>Show Section to Patient</span>
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Care Plan" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.carePlan}
              onChange={(e) => nurseActions.setSectionVisible("carePlan", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"
              style={{ backgroundColor: store.sectionVisibility.carePlan ? t.primary : "#E5E7EB" }} />
          </label>
        </div>
      )}

      <div className="nurse-card">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: t.textHeading, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <ClipboardList size={18} style={{ color: t.primary }} /> {tr("care.plan.title") || "My Care Plan"}
          </h3>
          
          {/* Daily / Overall Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleModeChange("daily")}
              className="px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all"
              style={{
                backgroundColor: mode === "daily" ? t.primary : "transparent",
                color: mode === "daily" ? "#fff" : t.textMuted,
                border: "none",
                cursor: "pointer"
              }}
            >
              {tr("careplan.toggle.daily") || "Daily"}
            </button>
            <button
              onClick={() => handleModeChange("overall")}
              className="px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all"
              style={{
                backgroundColor: mode === "overall" ? t.primary : "transparent",
                color: mode === "overall" ? "#fff" : t.textMuted,
                border: "none",
                cursor: "pointer"
              }}
            >
              {tr("careplan.toggle.overall") || "Overall"}
            </button>
          </div>
        </div>

        {/* Period Row */}
        <div className="flex items-center justify-center mb-6 py-2" style={{ borderBottom: `1px solid ${t.borderDefault}` }}>
          {mode === "daily" ? (
            <div className="flex items-center gap-4">
              <button onClick={() => nurseActions.setCarePlanSelectedDate(toISO(shiftDay(selectedDate, -1)))} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer" style={{ border: "none", background: "none" }}>
                <ChevronLeft size={20} style={{ color: t.textHeading }} />
              </button>
              <span style={{ fontSize: "16px", fontWeight: 700, color: t.textHeading, minWidth: "120px", textAlign: "center" }}>
                {dateLabel}
              </span>
              <button onClick={() => nurseActions.setCarePlanSelectedDate(toISO(shiftDay(selectedDate, 1)))} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer" style={{ border: "none", background: "none" }}>
                <ChevronRight size={20} style={{ color: t.textHeading }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span style={{ fontSize: "16px", fontWeight: 700, color: t.textHeading, minWidth: "120px", textAlign: "center" }}>
                {tr("careplan.overallTitle") || "Overall Plan"}
              </span>
            </div>
          )}
        </div>

        {/* Today Card (Mocked) */}
        {mode === "daily" && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "#F9FAFB", border: `1px solid ${t.borderDefault}` }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, marginBottom: "12px" }}>
              {dateLabel}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span style={{ fontSize: "12px", color: t.textMuted, display: "block", marginBottom: "4px" }}>Vitals</span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: t.textHeading, margin: 0 }}>BP: 120/80, HR: 72</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: t.textMuted, display: "block", marginBottom: "4px" }}>Notes</span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: t.textHeading, margin: 0 }}>Resting comfortably.</p>
              </div>
            </div>
          </div>
        )}

      <div className="space-y-2">
        {filteredItems.map((item, idx) => (
          <div
            key={item.id}
            draggable={isNurse}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
            style={{
              backgroundColor: item.active ? t.primarySubtle : item.done ? "#F0FDF4" : "#F9FAFB",
              border: `1px solid ${item.active ? t.primarySubtle : t.borderDefault}`,
              opacity: dragIdx === idx ? 0.5 : 1,
            }}
          >
            {isNurse && <GripVertical size={14} style={{ color: t.textMuted, cursor: "grab" }} />}

            <button
              onClick={() => isNurse && nurseActions.toggleCarePlanItem(item.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: item.done ? t.success : item.active ? t.primary : "transparent",
                border: item.done || item.active ? "none" : `2px solid ${t.borderDefault}`,
                cursor: isNurse ? "pointer" : "default",
              }}
            >
              {item.done && <Check size={14} color="#fff" />}
              {item.active && <div className="w-2 h-2 rounded-full bg-white" />}
            </button>

            <div className="flex-1 min-w-0">
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 outline-none" style={{ padding: "4px 8px", borderRadius: 8, fontSize: "14px", border: `1px solid ${t.borderDefault}` }} />
                  <button onClick={() => { nurseActions.updateCarePlanItem(item.id, { label: editLabel }); setEditingId(null); }}
                    className="p-1 cursor-pointer" style={{ color: t.success, background: "none", border: "none" }}><Save size={14} /></button>
                </div>
              ) : (
                <span style={{
                  fontSize: "14px", fontWeight: item.active ? 600 : 400,
                  color: item.active ? t.primary : item.done ? t.textMuted : t.textHeading,
                  textDecoration: item.done ? "line-through" : "none",
                }}>
                  {tr("direction") === "rtl" && item.labelAr ? item.labelAr : (item.label || (item.labelKey ? tr(item.labelKey) : ""))}
                </span>
              )}
            </div>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md shrink-0"
              style={{ fontSize: "12px", fontWeight: 600, color: item.done ? t.success : item.active ? t.primary : t.textMuted, backgroundColor: item.done ? t.successSubtle : item.active ? t.primarySubtle : "transparent" }}>
              {item.done ? <Check size={10} /> : <Clock size={10} />}
              {mode === "overall" 
                ? `${tr("careplan.dayLabel")} ${item.day || 1}`
                : (item.timeKey ? tr(item.timeKey) : `${item.minutes || 30} min`)
              }
            </span>

            {isNurse && editingId !== item.id && (
              <div className="flex items-center gap-1">
                <button onClick={() => { 
                  setEditingId(item.id); 
                  setEditLabel(item.label || (item.labelKey ? tr(item.labelKey) : ""));
                  setEditLabelAr(item.labelAr || ""); 
                }}
                  className="p-1 cursor-pointer" style={{ color: t.textMuted, background: "none", border: "none" }}><Edit2 size={13} /></button>
                <button onClick={() => nurseActions.deleteCarePlanItem(item.id)}
                  className="p-1 cursor-pointer" style={{ color: t.error, background: "none", border: "none" }}><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isNurse && (
        <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${t.borderDefault}` }}>
          <div className="flex items-center gap-2">
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="New care plan item..."
            className="flex-1 outline-none" style={{ padding: "10px 14px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}` }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          {mode === "daily" ? (
            <input value={newMinutes} onChange={(e) => setNewMinutes(e.target.value)} placeholder="Min" type="number"
              className="outline-none" style={{ width: 70, padding: "10px 12px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}` }} />
          ) : (
            <select value={newDay} onChange={(e) => setNewDay(e.target.value)}
              className="outline-none appearance-none" style={{ width: 85, padding: "10px 12px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}`, backgroundColor: "#fff" }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(d => <option key={d} value={d}>{tr("careplan.dayLabel")} {d}</option>)}
            </select>
          )}
          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
            style={{ backgroundColor: t.primary, color: "#fff", fontSize: "13px", fontWeight: 700, border: "none" }}>
            <Plus size={16} /> Add
          </button>
          </div>
          <input value={newLabelAr} onChange={(e) => setNewLabelAr(e.target.value)} placeholder="الإضافة باللغة العربية..." dir="rtl"
            className="w-full outline-none" style={{ padding: "10px 14px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}` }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        </div>
      )}
      </div>
    </div>
  );
}
