import { useState } from "react";
import { ClipboardList, Plus, Trash2, Check, Clock, GripVertical, Edit2, Save } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useNurseStore, nurseActions, type CarePlanItem } from "../../NurseDataStore";

export function CarePlanTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const store = useNurseStore();
  const isNurse = role === "nurse";
  const [newLabel, setNewLabel] = useState("");
  const [newMinutes, setNewMinutes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    nurseActions.addCarePlanItem({
      id: `cp-${Date.now().toString(36)}`,
      labelKey: "",
      label: newLabel.trim(),
      done: false,
      minutes: Number(newMinutes) || 30,
    });
    setNewLabel("");
    setNewMinutes("");
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

  return (
    <div className="nurse-card">
      <h3 style={{ color: t.textHeading }}><ClipboardList size={18} style={{ color: t.primary }} /> My Care Plan</h3>

      <div className="space-y-2">
        {store.carePlan.map((item, idx) => (
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
              onClick={() => isNurse && nurseActions.updateCarePlanItem(item.id, { done: !item.done, active: false })}
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
                  {item.label || item.labelKey}
                </span>
              )}
            </div>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md shrink-0"
              style={{ fontSize: "12px", fontWeight: 600, color: item.done ? t.success : item.active ? t.primary : t.textMuted, backgroundColor: item.done ? t.successSubtle : item.active ? t.primarySubtle : "transparent" }}>
              {item.done ? <Check size={10} /> : <Clock size={10} />}
              {item.timeKey ? item.timeKey : `${item.minutes || 30} min`}
            </span>

            {isNurse && editingId !== item.id && (
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingId(item.id); setEditLabel(item.label || item.labelKey); }}
                  className="p-1 cursor-pointer" style={{ color: t.textMuted, background: "none", border: "none" }}><Edit2 size={13} /></button>
                <button onClick={() => nurseActions.deleteCarePlanItem(item.id)}
                  className="p-1 cursor-pointer" style={{ color: t.error, background: "none", border: "none" }}><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isNurse && (
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${t.borderDefault}` }}>
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="New care plan item..."
            className="flex-1 outline-none" style={{ padding: "10px 14px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}` }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <input value={newMinutes} onChange={(e) => setNewMinutes(e.target.value)} placeholder="Min" type="number"
            className="outline-none" style={{ width: 70, padding: "10px 12px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}` }} />
          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
            style={{ backgroundColor: t.primary, color: "#fff", fontSize: "13px", fontWeight: 700, border: "none" }}>
            <Plus size={16} /> Add
          </button>
        </div>
      )}
    </div>
  );
}
