import { useState, useCallback, useEffect, useRef } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, TEXT_STYLE } from "../ThemeContext";
import { useLocale } from "../i18n";
import { ArrowLeft, Plus, Bell, Check, Trash2, Clock, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  category: "medication" | "appointment" | "general";
}

interface ScheduledAlert {
  id: string;
  title: string;
  dateTime: string; // ISO string
  category: "Medical" | "Prayer" | "General";
  fired: boolean;
}

export function RemindersTool({ onClose, onBackToTools }: { onClose: () => void; onBackToTools: () => void }) {
  const { theme } = useTheme();
  const { fontFamily, locale } = useLocale();
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: "1", title: "Take morning medication", time: "08:00 AM", completed: false, category: "medication" },
    { id: "2", title: "Doctor's visit", time: "02:30 PM", completed: false, category: "appointment" },
    { id: "3", title: "Call family", time: "05:00 PM", completed: false, category: "general" },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newCategory, setNewCategory] = useState<"medication" | "appointment" | "general">("general");

  // Alert state
  const [alerts, setAlerts] = useState<ScheduledAlert[]>([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDateTime, setAlertDateTime] = useState("");
  const [alertCategory, setAlertCategory] = useState<"Medical" | "Prayer" | "General">("General");
  const [activeNotification, setActiveNotification] = useState<ScheduledAlert | null>(null);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifAcknowledging, setNotifAcknowledging] = useState(false);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Schedule a timeout for an alert
  const scheduleAlert = useCallback((alert: ScheduledAlert) => {
    const delay = new Date(alert.dateTime).getTime() - Date.now();
    if (delay <= 0 || alert.fired) return;
    const timerId = setTimeout(() => {
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, fired: true } : a));
      setActiveNotification(alert);
      setNotifVisible(false);
      setNotifAcknowledging(false);
      requestAnimationFrame(() => setNotifVisible(true));
    }, delay);
    timerRefs.current.set(alert.id, timerId);
  }, []);

  // Schedule all pending alerts on mount / when alerts change
  useEffect(() => {
    alerts.filter(a => !a.fired).forEach(a => {
      if (!timerRefs.current.has(a.id)) scheduleAlert(a);
    });
    return () => { timerRefs.current.forEach(t => clearTimeout(t)); timerRefs.current.clear(); };
  }, [alerts, scheduleAlert]);

  const handleAddAlert = useCallback(() => {
    if (!alertTitle || !alertDateTime) return;
    const newAlert: ScheduledAlert = { id: Date.now().toString(), title: alertTitle, dateTime: alertDateTime, category: alertCategory, fired: false };
    setAlerts(prev => [...prev, newAlert]);
    scheduleAlert(newAlert);
    setAlertTitle(""); setAlertDateTime(""); setAlertCategory("General"); setShowAlertForm(false);
  }, [alertTitle, alertDateTime, alertCategory, scheduleAlert]);

  const handleDismissNotification = () => {
    setNotifAcknowledging(true);
    setTimeout(() => { setActiveNotification(null); setNotifAcknowledging(false); }, 400);
  };

  const handleToggleComplete = useCallback((id: string) => {
    setReminders(reminders.map((r) => r.id === id ? { ...r, completed: !r.completed } : r));
  }, [reminders]);

  const handleDeleteReminder = useCallback((id: string) => {
    setReminders(reminders.filter((r) => r.id !== id));
  }, [reminders]);

  const handleAddReminder = useCallback(() => {
    if (!newTitle || !newTime) return;
    const newReminder: Reminder = { id: Date.now().toString(), title: newTitle, time: newTime, completed: false, category: newCategory };
    setReminders([...reminders, newReminder]);
    setNewTitle(""); setNewTime(""); setNewCategory("general"); setShowAddForm(false);
  }, [reminders, newTitle, newTime, newCategory]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "medication": return "#4ECDC4";
      case "appointment": return "#FF6B6B";
      case "general": return "#FFA07A";
      default: return theme.primary;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "medication": return "💊";
      case "appointment": return "🏥";
      case "general": return "📌";
      default: return "📌";
    }
  };

  const getAlertCategoryIcon = (cat: string) => {
    switch (cat) { case "Medical": return "💊"; case "Prayer": return "🕌"; default: return "📌"; }
  };

  const activeReminders = reminders.filter((r) => !r.completed);
  const completedReminders = reminders.filter((r) => r.completed);

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-8"
        style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}
      >
        <div className="flex items-center gap-4">
          <button onClick={onBackToTools} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1 style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Reminders</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Add Reminder Button */}
          <button onClick={() => { setShowAddForm(!showAddForm); setShowAlertForm(false); }}
            className="flex items-center gap-2 px-6 py-3 cursor-pointer active:scale-95 transition-transform"
            style={{ backgroundColor: theme.primary, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <Plus size={20} color={theme.textInverse} />
            <span style={{ fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textInverse }}>Add Reminder</span>
          </button>
          {/* Add Alert Button */}
          <button onClick={() => { setShowAlertForm(!showAlertForm); setShowAddForm(false); }}
            className="flex items-center gap-2 px-6 py-3 cursor-pointer active:scale-95 transition-transform"
            style={{ backgroundColor: theme.primary, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <Plus size={20} color={theme.textInverse} />
            <span style={{ fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textInverse }}>Add Alert</span>
          </button>
          {/* Close */}
          <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-6 px-16 py-8 overflow-y-auto">
        {/* Add Reminder Form */}
        {showAddForm && (
          <div className="p-6" style={{ backgroundColor: theme.surface, borderRadius: theme.radiusCard, border: theme.cardBorder, boxShadow: SHADOW.md }}>
            <h3 className="mb-4" style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: theme.textHeading }}>New Reminder</h3>
            <div className="flex gap-4 mb-4">
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Reminder title" className="flex-1"
                style={{ fontFamily, fontSize: TYPE_SCALE.base, color: theme.textBody, backgroundColor: theme.background, borderRadius: theme.radiusMd, border: theme.cardBorder, padding: "12px 16px", outline: "none" }} />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                style={{ fontFamily, fontSize: TYPE_SCALE.base, color: theme.textBody, backgroundColor: theme.background, borderRadius: theme.radiusMd, border: theme.cardBorder, padding: "12px 16px", outline: "none" }} />
            </div>
            <div className="flex gap-3 mb-4">
              {(["medication", "appointment", "general"] as const).map((cat) => (
                <button key={cat} onClick={() => setNewCategory(cat)} className="cursor-pointer transition-all"
                  style={{ padding: "8px 16px", backgroundColor: newCategory === cat ? getCategoryColor(cat) : theme.surfaceElevated, borderRadius: theme.radiusFull, border: "none", outline: "none", fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: newCategory === cat ? "#fff" : theme.textMuted }}>
                  {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={handleAddReminder} disabled={!newTitle || !newTime} className="cursor-pointer active:scale-95 transition-transform"
              style={{ padding: "12px 24px", backgroundColor: theme.primary, borderRadius: theme.radiusMd, border: "none", outline: "none", fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textInverse, opacity: !newTitle || !newTime ? 0.5 : 1 }}>
              Add Reminder
            </button>
          </div>
        )}

        {/* Add Alert Form */}
        {showAlertForm && (
          <div className="p-6" style={{ backgroundColor: theme.surface, borderRadius: theme.radiusCard, border: theme.cardBorder, boxShadow: SHADOW.md }}>
            <h3 className="mb-4" style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: theme.textHeading }}>New Alert</h3>
            <div className="flex flex-col gap-4 mb-4">
              <input type="text" value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)} placeholder="Alert title"
                style={{ fontFamily, fontSize: TYPE_SCALE.base, color: theme.textBody, backgroundColor: theme.background, borderRadius: theme.radiusMd, border: theme.cardBorder, padding: "12px 16px", outline: "none" }} />
              <input type="datetime-local" value={alertDateTime} onChange={(e) => setAlertDateTime(e.target.value)}
                style={{ fontFamily, fontSize: TYPE_SCALE.base, color: theme.textBody, backgroundColor: theme.background, borderRadius: theme.radiusMd, border: theme.cardBorder, padding: "12px 16px", outline: "none" }} />
            </div>
            <div className="flex gap-3 mb-4">
              {(["Medical", "Prayer", "General"] as const).map((cat) => (
                <button key={cat} onClick={() => setAlertCategory(cat)} className="cursor-pointer transition-all"
                  style={{ padding: "8px 16px", backgroundColor: alertCategory === cat ? (cat === "Medical" ? "#4ECDC4" : cat === "Prayer" ? "#8B5CF6" : "#FFA07A") : theme.surfaceElevated, borderRadius: theme.radiusFull, border: "none", outline: "none", fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: alertCategory === cat ? "#fff" : theme.textMuted }}>
                  {getAlertCategoryIcon(cat)} {cat}
                </button>
              ))}
            </div>
            <button onClick={handleAddAlert} disabled={!alertTitle || !alertDateTime} className="cursor-pointer active:scale-95 transition-transform"
              style={{ padding: "12px 24px", backgroundColor: theme.primary, borderRadius: theme.radiusMd, border: "none", outline: "none", fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textInverse, opacity: !alertTitle || !alertDateTime ? 0.5 : 1 }}>
              Add Alert
            </button>
          </div>
        )}

        {/* Scheduled Alerts List */}
        {alerts.length > 0 && (
          <div>
            <h2 className="mb-4" style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Scheduled Alerts</h2>
            <div className="flex flex-col gap-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-4 p-5"
                  style={{ backgroundColor: theme.surface, borderRadius: theme.radiusMd, border: theme.cardBorder, boxShadow: SHADOW.sm, opacity: alert.fired ? 0.5 : 1 }}>
                  <div className="flex items-center justify-center"
                    style={{ width: "48px", height: "48px", backgroundColor: alert.category === "Medical" ? "#4ECDC420" : alert.category === "Prayer" ? "#8B5CF620" : "#FFA07A20", borderRadius: theme.radiusMd, fontSize: "24px" }}>
                    {getAlertCategoryIcon(alert.category)}
                  </div>
                  <div className="flex-1">
                    <h3 style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.semibold, color: theme.textHeading, textDecoration: alert.fired ? "line-through" : "none" }}>{alert.title}</h3>
                    <p className="flex items-center gap-1 mt-1" style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted }}>
                      <Clock size={14} /> {new Date(alert.dateTime).toLocaleString()}
                    </p>
                  </div>
                  <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: alert.fired ? "#4ECDC4" : theme.primary, padding: "4px 12px", backgroundColor: alert.fired ? "#4ECDC420" : `${theme.primary}20`, borderRadius: theme.radiusFull }}>
                    {alert.fired ? "Fired" : "Pending"}
                  </span>
                  <button onClick={() => { const id = alert.id; timerRefs.current.get(id) && clearTimeout(timerRefs.current.get(id)!); timerRefs.current.delete(id); setAlerts(prev => prev.filter(a => a.id !== id)); }}
                    className="cursor-pointer transition-all" style={{ width: "40px", height: "40px", backgroundColor: "transparent", border: "none", outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={20} color="#D10044" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Reminders */}
        {activeReminders.length > 0 && (
          <div>
            <h2 className="mb-4" style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Upcoming</h2>
            <div className="flex flex-col gap-3">
              {activeReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-4 p-5"
                  style={{ backgroundColor: theme.surface, borderRadius: theme.radiusMd, border: theme.cardBorder, boxShadow: SHADOW.sm }}>
                  <button onClick={() => handleToggleComplete(reminder.id)} className="cursor-pointer transition-all"
                    style={{ width: "48px", height: "48px", backgroundColor: theme.surfaceElevated, borderRadius: "50%", border: `2px solid ${getCategoryColor(reminder.category)}`, outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {reminder.completed && <Check size={24} color={getCategoryColor(reminder.category)} />}
                  </button>
                  <div className="flex items-center justify-center"
                    style={{ width: "48px", height: "48px", backgroundColor: `${getCategoryColor(reminder.category)}20`, borderRadius: theme.radiusMd, fontSize: "24px" }}>
                    {getCategoryIcon(reminder.category)}
                  </div>
                  <div className="flex-1">
                    <h3 style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.semibold, color: theme.textHeading }}>{reminder.title}</h3>
                    <p className="flex items-center gap-1 mt-1" style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted }}><Clock size={14} />{reminder.time}</p>
                  </div>
                  <button onClick={() => handleDeleteReminder(reminder.id)} className="cursor-pointer transition-all"
                    style={{ width: "40px", height: "40px", backgroundColor: "transparent", border: "none", outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={20} color="#D10044" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Reminders */}
        {completedReminders.length > 0 && (
          <div>
            <h2 className="mb-4" style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textMuted }}>Completed</h2>
            <div className="flex flex-col gap-3">
              {completedReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-4 p-5"
                  style={{ backgroundColor: theme.surface, borderRadius: theme.radiusMd, border: theme.cardBorder, boxShadow: SHADOW.sm, opacity: 0.6 }}>
                  <button onClick={() => handleToggleComplete(reminder.id)} className="cursor-pointer transition-all"
                    style={{ width: "48px", height: "48px", backgroundColor: getCategoryColor(reminder.category), borderRadius: "50%", border: "none", outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={24} color="#fff" />
                  </button>
                  <div className="flex items-center justify-center"
                    style={{ width: "48px", height: "48px", backgroundColor: `${getCategoryColor(reminder.category)}20`, borderRadius: theme.radiusMd, fontSize: "24px" }}>
                    {getCategoryIcon(reminder.category)}
                  </div>
                  <div className="flex-1">
                    <h3 style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.semibold, color: theme.textHeading, textDecoration: "line-through" }}>{reminder.title}</h3>
                    <p className="flex items-center gap-1 mt-1" style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted }}><Clock size={14} />{reminder.time}</p>
                  </div>
                  <button onClick={() => handleDeleteReminder(reminder.id)} className="cursor-pointer transition-all"
                    style={{ width: "40px", height: "40px", backgroundColor: "transparent", border: "none", outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={20} color="#D10044" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {reminders.length === 0 && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16"
            style={{ backgroundColor: theme.surface, borderRadius: theme.radiusCard, border: theme.cardBorder }}>
            <Bell size={64} color={theme.textMuted} strokeWidth={1.5} />
            <p className="mt-4" style={{ fontFamily, fontSize: TYPE_SCALE.md, color: theme.textMuted }}>No reminders yet</p>
          </div>
        )}
      </div>

      {/* ── Hospital Notice-style Alert Notification Popup ── */}
      {activeNotification && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: notifAcknowledging ? "rgba(10,22,40,0.15)" : "rgba(10,22,40,0.6)", transition: "background-color 0.3s ease", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
          <div style={{
            width: "620px", maxWidth: "90%", backgroundColor: theme.surface, borderRadius: theme.radiusXl,
            boxShadow: `0 25px 50px -12px rgba(0,0,0,0.25), 0 0 60px rgba(78,205,196,0.12)`,
            border: `1.5px solid rgba(78,205,196,0.20)`, overflow: "hidden",
            transform: notifVisible && !notifAcknowledging ? "scale(1) translateY(0)" : notifAcknowledging ? "scale(0.95) translateY(8px)" : "scale(0.92) translateY(24px)",
            opacity: notifVisible && !notifAcknowledging ? 1 : 0, transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
          }}>
            {/* Header */}
            <div className="flex items-center gap-4" style={{ padding: "24px 36px 20px", backgroundColor: "rgba(78,205,196,0.06)", borderBottom: "1px solid rgba(78,205,196,0.20)" }}>
              <div className="flex items-center justify-center" style={{ width: "56px", height: "56px", borderRadius: theme.radiusMd, backgroundColor: theme.surface, border: "1.5px solid rgba(78,205,196,0.20)", boxShadow: "0 2px 8px rgba(78,205,196,0.12)" }}>
                <span style={{ fontSize: "26px" }}>{getAlertCategoryIcon(activeNotification.category)}</span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span style={{ fontFamily, fontSize: "18px", fontWeight: WEIGHT.bold, color: theme.primary, letterSpacing: "1.2px", textTransform: "uppercase" as const }}>HOSPITAL NOTICE</span>
                <span style={{ fontFamily, fontSize: "13px", color: theme.textMuted, marginTop: "3px" }}>{new Date(activeNotification.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: "28px 36px 32px" }}>
              <h2 style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading, margin: 0, marginBottom: "14px" }}>{activeNotification.title}</h2>
              <p style={{ fontFamily, fontSize: TYPE_SCALE.base, color: theme.textBody, margin: 0, marginBottom: "32px", lineHeight: 1.7 }}>
                Your scheduled {activeNotification.category.toLowerCase()} alert "{activeNotification.title}" is due now.
              </p>
              <button onClick={handleDismissNotification} className="w-full cursor-pointer flex items-center justify-center gap-3 active:scale-[0.97] transition-transform"
                style={{ height: "60px", borderRadius: theme.radiusMd, backgroundColor: theme.primary, border: "none", outline: "none", boxShadow: `0 4px 20px ${theme.primary}30` }}>
                <CheckCircle2 size={22} style={{ color: theme.textInverse }} />
                <span style={{ fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textInverse }}>I've Read This</span>
              </button>
              <div className="flex items-center justify-center gap-2" style={{ marginTop: "14px" }}>
                <ShieldCheck size={13} style={{ color: theme.textDisabled }} />
                <p style={{ fontFamily, fontSize: "12px", color: theme.textDisabled, textAlign: "center", margin: 0 }}>This notice will be saved in your notifications</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
