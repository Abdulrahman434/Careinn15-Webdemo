import { useState } from "react";
import { LogOut, Plus, Trash2, Check, GripVertical, Edit2, Save, Eye, CalendarDays, Phone } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { DateField } from "../DateField";
import { useLocale } from "../../i18n";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

export function DischargePlanTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const store = useNurseStore();
  const isNurse = role === "nurse";
  const [newLabel, setNewLabel] = useState("");
  const [newLabelAr, setNewLabelAr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editLabelAr, setEditLabelAr] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    nurseActions.addDischargePlanItem({
      id: `dp-${Date.now().toString(36)}`,
      labelKey: "",
      label: newLabel.trim(),
      labelAr: newLabelAr.trim(),
      done: false,
    });
    setNewLabel("");
    setNewLabelAr("");
  };

  const info = store.dischargeInfo;
  const rowField = {
    padding: "10px 14px", borderRadius: 12, fontSize: "14px",
    color: t.textHeading, backgroundColor: t.surfaceInset,
    border: `1.5px solid ${t.borderDefault}`,
  };
  const patchFollowUp = (id: string, updates: Partial<{ label: string; when: string }>) =>
    nurseActions.setDischargeInfo({ followUps: info.followUps.map((f) => f.id === id ? { ...f, ...updates } : f) });
  const patchContact = (id: string, updates: Partial<{ label: string; value: string }>) =>
    nurseActions.setDischargeInfo({ contacts: info.contacts.map((c) => c.id === id ? { ...c, ...updates } : c) });

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const items = [...store.dischargePlan];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    nurseActions.setDischargePlan(items);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

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
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Discharge Process" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.discharge}
              onChange={(e) => nurseActions.setSectionVisible("discharge", e.target.checked)}
              className="sr-only peer"
            />
            <div className="ni-switch"
              style={{ backgroundColor: store.sectionVisibility.discharge ? t.primary : undefined }} />
          </label>
        </div>
      )}

      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><CalendarDays size={18} style={{ color: t.primaryOn }} /> Expected Discharge</h3>
        <DateField
          value={store.patient.dischargeDate}
          readOnly={!isNurse}
          onChange={(v) => nurseActions.updatePatientFromNurse({ dischargeDate: v })}
          placeholder="Pick the expected discharge date"
        />
      </div>

      <div className="nurse-card">
      <h3 style={{ color: t.textHeading }}><LogOut size={18} style={{ color: t.primaryOn }} /> Discharge Process</h3>
      <div className="space-y-2">
        {store.dischargePlan.map((item, idx) => (
          <div key={item.id} draggable={isNurse} onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
            style={{
              backgroundColor: item.active ? t.primarySubtle : item.done ? t.successSubtle : t.surfaceInset,
              border: `1px solid ${item.active ? t.primarySubtle : t.borderDefault}`,
              opacity: dragIdx === idx ? 0.5 : 1,
            }}>
            {isNurse && <GripVertical size={14} style={{ color: t.textMuted, cursor: "grab" }} />}
            <button onClick={() => isNurse && nurseActions.toggleDischargePlanItem(item.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: item.done ? t.success : item.active ? t.primary : "transparent",
                border: item.done || item.active ? "none" : `2px solid ${t.borderDefault}`,
                cursor: isNurse ? "pointer" : "default",
              }}>
              {item.done && <Check size={14} color={t.successOn} />}
              {item.active && <div className="w-2 h-2 rounded-full ni-surface" />}
            </button>
            <div className="flex-1 min-w-0">
              {editingId === item.id ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <input dir="auto" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="English Label"
                      className="flex-1 outline-none" style={{ padding: "4px 8px", borderRadius: 8, fontSize: "14px", border: `1px solid ${t.borderDefault}` }} />
                    <button onClick={() => { nurseActions.updateDischargePlanItem(item.id, { label: editLabel, labelAr: editLabelAr }); setEditingId(null); }}
                      className="p-1 cursor-pointer" style={{ color: t.successOn, background: "none", border: "none" }}><Save size={14} /></button>
                  </div>
                  <input value={editLabelAr} onChange={(e) => setEditLabelAr(e.target.value)} placeholder="Arabic Label" dir="rtl"
                    className="w-full outline-none" style={{ padding: "4px 8px", borderRadius: 8, fontSize: "14px", border: `1px solid ${t.borderDefault}` }} />
                </div>
              ) : (
                <span style={{
                  fontSize: "14px", fontWeight: item.active ? 600 : 400,
                  color: item.active ? t.primaryOn : item.done ? t.textMuted : t.textHeading,
                  textDecoration: item.done ? "line-through" : "none",
                }}>
                  {tr("direction") === "rtl" && item.labelAr ? item.labelAr : (item.label || (item.labelKey ? tr(item.labelKey) : ""))}
                </span>
              )}
            </div>
            {isNurse && editingId !== item.id && (
              <div className="flex items-center gap-1">
                <button onClick={() => { 
                  setEditingId(item.id); 
                  setEditLabel(item.label || (item.labelKey ? tr(item.labelKey) : ""));
                  setEditLabelAr(item.labelAr || "");
                }}
                  className="p-1 cursor-pointer" style={{ color: t.textMuted, background: "none", border: "none" }}><Edit2 size={13} /></button>
                <button onClick={() => nurseActions.deleteDischargePlanItem(item.id)}
                  className="p-1 cursor-pointer" style={{ color: t.errorOn, background: "none", border: "none" }}><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      {isNurse && (
        <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${t.borderDefault}` }}>
          <div className="flex items-center gap-2">
            <input dir="auto" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="New item (English)..."
              className="flex-1 outline-none" style={{ padding: "10px 14px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}` }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
            <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
              style={{ backgroundColor: t.primary, color: t.brandOnPrimary, fontSize: "13px", fontWeight: 700, border: "none" }}>
              <Plus size={16} /> Add
            </button>
          </div>
          <input value={newLabelAr} onChange={(e) => setNewLabelAr(e.target.value)} placeholder="الإضافة باللغة العربية..." dir="rtl"
            className="w-full outline-none" style={{ padding: "10px 14px", borderRadius: 12, fontSize: "14px", border: `1.5px solid ${t.borderDefault}` }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        </div>
      )}
      </div>

      {/* Going-home information — its own bedside section, "Discharge Plan" */}
      {isNurse && (
        <div className="nurse-card flex items-center justify-between" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primarySubtle }}>
              <Eye size={18} style={{ color: t.primaryOn }} />
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, display: "block" }}>Show Section to Patient</span>
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Discharge Plan" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.dischargePlan}
              onChange={(e) => nurseActions.setSectionVisible("dischargePlan", e.target.checked)}
              className="sr-only peer"
            />
            <div className="ni-switch"
              style={{ backgroundColor: store.sectionVisibility.dischargePlan ? t.primary : undefined }} />
          </label>
        </div>
      )}

      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><CalendarDays size={18} style={{ color: t.primaryOn }} /> Follow-up Appointments</h3>
        <div className="space-y-2">
          {info.followUps.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <input dir="auto" value={f.label} readOnly={!isNurse}
                onChange={(e) => patchFollowUp(f.id, { label: e.target.value })}
                placeholder="Clinic or specialty"
                className="flex-1 outline-none" style={rowField} />
              <DateField
                value={f.when}
                readOnly={!isNurse}
                onChange={(v) => patchFollowUp(f.id, { when: v })}
                withTime
                className="flex-1"
                placeholder="Date and time"
              />
              {isNurse && (
                <button onClick={() => nurseActions.setDischargeInfo({ followUps: info.followUps.filter((x) => x.id !== f.id) })}
                  className="p-2 cursor-pointer" style={{ color: t.errorOn, background: "none", border: "none" }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
        {isNurse && (
          <button
            onClick={() => nurseActions.setDischargeInfo({ followUps: [...info.followUps, { id: `fu-${Date.now().toString(36)}`, label: "", when: "" }] })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 mt-3"
            style={{ backgroundColor: t.primary, color: t.brandOnPrimary, fontSize: "13px", fontWeight: 700, border: "none" }}>
            <Plus size={16} /> Add appointment
          </button>
        )}
      </div>

      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><Phone size={18} style={{ color: t.primaryOn }} /> Post-Discharge Contacts</h3>
        <div className="space-y-2">
          {info.contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input dir="auto" value={c.label} readOnly={!isNurse}
                onChange={(e) => patchContact(c.id, { label: e.target.value })}
                placeholder="Who to call"
                className="flex-1 outline-none" style={rowField} />
              <input dir="auto" value={c.value} readOnly={!isNurse}
                onChange={(e) => patchContact(c.id, { value: e.target.value })}
                placeholder="Number"
                className="flex-1 outline-none" style={rowField} />
              {isNurse && (
                <button onClick={() => nurseActions.setDischargeInfo({ contacts: info.contacts.filter((x) => x.id !== c.id) })}
                  className="p-2 cursor-pointer" style={{ color: t.errorOn, background: "none", border: "none" }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
        {isNurse && (
          <button
            onClick={() => nurseActions.setDischargeInfo({ contacts: [...info.contacts, { id: `pc-${Date.now().toString(36)}`, label: "", value: "" }] })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 mt-3"
            style={{ backgroundColor: t.primary, color: t.brandOnPrimary, fontSize: "13px", fontWeight: 700, border: "none" }}>
            <Plus size={16} /> Add contact
          </button>
        )}
      </div>

    </div>
  );
}
