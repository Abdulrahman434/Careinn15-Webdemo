import React, { useState, useEffect, useRef } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import {
  ArrowLeft, Plus, Bell, Check, Trash2, Clock,
  CheckCircle2, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";

/* â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface Reminder {
  id: string;
  title: string;
  /** "YYYY-MM-DD" â€“ links to calendar */
  date: string;
  time: string;
  completed: boolean;
  category: "medication" | "appointment" | "general";
}

interface ScheduledAlert {
  id: string;
  title: string;
  description: string;
  dateTime: string; // ISO
  category: "Medical" | "Prayer" | "General";
  fired: boolean;
}

/* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const pad = (n: number) => String(n).padStart(2, "0");
const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = toDateKey(new Date());

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalSystem = "gregory" | "islamic-umalqura";
const CAL_LABELS: Record<CalSystem, string> = {
  gregory: "Gregorian",
  "islamic-umalqura": "Hijri",
};

/** Format day number of a Gregorian date in the chosen calendar system */
function fmtDay(date: Date, sys: CalSystem): string {
  if (sys === "gregory") return String(date.getDate());
  try {
    return new Intl.DateTimeFormat("en-u-ca-" + sys, { day: "numeric" }).format(date);
  } catch { return String(date.getDate()); }
}

/** Format month + year header in the chosen calendar system */
function fmtMonthYear(firstDay: Date, sys: CalSystem): string {
  if (sys === "gregory") {
    return `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  }
  try {
    return new Intl.DateTimeFormat("en-u-ca-" + sys, { month: "long", year: "numeric" }).format(firstDay);
  } catch { return `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`; }
}

/** Returns { greg, hijri } label strings for a date (Hijri uses islamic-umalqura — Saudi official) */
function fmtAllSystems(dateStr: string): { greg: string; hijri: string } {
  // Use T12:00 (noon) to avoid timezone-boundary shifts misidentifying the date
  const d = new Date(dateStr.length === 10 ? dateStr + "T12:00:00" : dateStr);
  const greg = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  let hijri = greg;
  // islamic-umalqura = Saudi official calendar
  try { hijri = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "short", year: "numeric" }).format(d); } catch { }
  return { greg, hijri };
}

function playAlertSound() {
  const ctx = new AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(880, ctx.currentTime);
  g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  o.start(ctx.currentTime);
  o.stop(ctx.currentTime + 1.5);
}


/* ─── Islamic & National Occasions ─── */
interface Occasion {
  label: string;        // short badge text
  name: string;         // full display name
  description: string;
  color: string;        // badge background
}

const HIJRI_OCCASIONS: Array<{ month: number; day: number } & Occasion> = [
  { month: 1, day: 1, label: "New Year", name: "Islamic New Year", description: "The first day of Muharram marks the beginning of the new Islamic lunar year.", color: "#4ECDC4" },
  { month: 1, day: 10, label: "Ashura", name: "Day of Ashura", description: "The 10th of Muharram — a significant day of fasting, reflection, and remembrance.", color: "#4ECDC4" },
  { month: 3, day: 12, label: "Mawlid", name: "Prophet's Birthday", description: "Mawlid al-Nabi — celebrating the birth of the Prophet Muhammad ﷺ.", color: "#4ECDC4" },
  { month: 9, day: 1, label: "Ramadan", name: "First Day of Ramadan", description: "The holy month of Ramadan begins — a month of fasting, prayer, and reflection.", color: "#4ECDC4" },
  { month: 9, day: 27, label: "Qadr", name: "Laylat al-Qadr", description: "The Night of Power — the most blessed night of Ramadan and of the entire year.", color: "#4ECDC4" },
  { month: 10, day: 1, label: "Eid Fitr", name: "Eid al-Fitr", description: "Celebrating the end of Ramadan — Eid Mubarak! A day of joy, gratitude, and family.", color: "#4ECDC4" },
  { month: 12, day: 9, label: "Arafah", name: "Day of Arafah", description: "The most important day of Hajj — pilgrims gather at the plain of Arafah to pray.", color: "#4ECDC4" },
  { month: 12, day: 10, label: "Eid Adha", name: "Eid al-Adha", description: "The Festival of Sacrifice — commemorating Prophet Ibrahim’s devotion to Allah.", color: "#4ECDC4" },
];

const GREG_OCCASIONS: Array<{ gregMonth: number; gregDay: number } & Occasion> = [
  { gregMonth: 9, gregDay: 23, label: "National Day", name: "Saudi National Day", description: "Saudi Arabia proudly celebrates its National Day on September 23rd every year.", color: "#16A34A" },
];

/** Extract Hijri month and day from a Gregorian Date using islamic-umalqura */
function getHijriParts(date: Date): { month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric",
    }).formatToParts(date);
    const day = parseInt(parts.find(p => p.type === "day")?.value ?? "0");
    const month = parseInt(parts.find(p => p.type === "month")?.value ?? "0");
    return { month, day };
  } catch { return { month: 0, day: 0 }; }
}

/** Return the occasion (if any) for a given Gregorian Date */
function getOccasionForDate(date: Date): Occasion | null {
  // Gregorian occasions first
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const gregOcc = GREG_OCCASIONS.find(o => o.gregMonth === gm && o.gregDay === gd);
  if (gregOcc) return gregOcc;
  // Hijri occasions (islamic-umalqura)
  const { month, day } = getHijriParts(date);
  return HIJRI_OCCASIONS.find(o => o.month === month && o.day === day) ?? null;
}

/* Category tile background colors (solid, matching original design) */
const CAT_COLOR: Record<string, string> = {
  medication: "#EF6035",
  appointment: "#6366F1",
  general: "#EF4444",
  Medical: "#EF6035",
  Prayer: "#8B5CF6",
  General: "#EF4444",
};

/* Soft pastel tile backgrounds per category */
const CAT_BG: Record<string, string> = {
  medication: "#FFF1E6",
  appointment: "#EEF2FF",
  general: "#FEF2F2",
  Medical: "#FFF1E6",
  Prayer: "#E6F7F1",
  General: "#FEF2F2",
};

/* Category emoji icons — rendered as spans with unicode escapes to avoid encoding corruption */
const emojiSpan = (code: string) => (
  <span style={{ fontSize: "18px", lineHeight: "1", display: "inline-block" }}>{code}</span>
);

const CAT_ICON: Record<string, React.ReactNode> = {
  medication: emojiSpan("\uD83D\uDC8A"),
  appointment: emojiSpan("\uD83C\uDFE5"),
  general: emojiSpan("\uD83D\uDCCC"),
  Medical: emojiSpan("\uD83D\uDC8A"),
  Prayer: emojiSpan("\uD83D\uDD4C"),
  General: emojiSpan("\uD83D\uDCCC"),
};


/* ════════════════════════════════════════════════════════════════════════ 
   Component
════════════════════════════════════════════════════════════════════════  */
export function RemindersCalendarTool({
  onClose,
  onBackToTools,
}: {
  onClose: () => void;
  onBackToTools: () => void;
}) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();

  /* â”€â”€ Calendar state â”€â”€ */
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calSystem, setCalSystem] = useState<CalSystem>("gregory");

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const offset = new Date(year, month, 1).getDay();
  const firstDay = new Date(year, month, 1);

  /* â”€â”€ Reminders â”€â”€ */
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: "1", title: "Morning medication", date: todayKey, time: "08:00", completed: false, category: "medication" },
    { id: "2", title: "Doctor's visit", date: todayKey, time: "14:30", completed: false, category: "appointment" },
    { id: "3", title: "Call family", date: todayKey, time: "17:00", completed: false, category: "general" },
  ]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rDate, setRDate] = useState(selectedDate ?? todayKey);
  const [rTime, setRTime] = useState("");
  const [rCat, setRCat] = useState<"medication" | "appointment" | "general">("general");

  /* â”€â”€ Alerts â”€â”€ */
  const [alerts, setAlerts] = useState<ScheduledAlert[]>([]);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aTime, setATime] = useState("");
  const [aCat, setACat] = useState<"Medical" | "Prayer" | "General">("General");
  // Modal mini-calendar state
  const [aCalSys, setACalSys] = useState<CalSystem>("gregory");
  const [aCalDate, setACalDate] = useState(new Date());
  const [aSelDate, setASelDate] = useState<string>(selectedDate ?? todayKey);
  // Derived aDateTime for scheduling
  const aDateTime = aSelDate && aTime ? `${aSelDate}T${aTime}` : "";

  /* ── Notification popup ── */
  const [activeNotif, setActiveNotif] = useState<ScheduledAlert | null>(null);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifAck, setNotifAck] = useState(false);
  const firedIds = useRef<Set<string>>(new Set());
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  /* Load alert sound once */
  useEffect(() => {
    const audio = new Audio("https://www.soundjay.com/buttons/sounds/button-09a.mp3");
    audio.preload = "auto";
    audio.loop = true;
    alertAudioRef.current = audio;
    return () => { audio.pause(); };
  }, []);

  /* Periodic checker — runs every 30 s, fires any alert whose date+time
     matches the current minute (YYYY-MM-DDTHH:mm). Each alert fires once. */
  useEffect(() => {
    const tick = () => {
      const nowKey = new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
      setAlerts(prev => {
        let changed = false;
        const next = prev.map(a => {
          const alertKey = a.dateTime.slice(0, 16);          // same format
          if (!a.fired && !firedIds.current.has(a.id) && alertKey === nowKey) {
            firedIds.current.add(a.id);
            changed = true;
            /* Show popup */
            setActiveNotif(a);
            setNotifAck(false);
            setNotifVisible(false);
            requestAnimationFrame(() => { setNotifVisible(true); playAlertSound(); });
            /* Play sound */
            if (alertAudioRef.current) {
              alertAudioRef.current.currentTime = 0;
              alertAudioRef.current.play().catch(() => { });
            }
            return { ...a, fired: true };
          }
          return a;
        });
        return changed ? next : prev;
      });
    };
    tick(); // check immediately on mount
    const id = setInterval(tick, 30_000); // every 30 seconds
    return () => clearInterval(id);
  }, []); // stable — firedIds ref handles dedup across re-renders

  /* ── Saudi National Day (Sep 23) built-in popup ── */
  useEffect(() => {
    const now = new Date();
    const isSep23 = now.getMonth() === 8 && now.getDate() === 23; // month is 0-indexed
    const sessionKey = `snd-shown-${now.getFullYear()}`;
    if (isSep23 && !sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      const sndAlert: ScheduledAlert = {
        id: "__saudi-national-day__",
        title: "Saudi National Day",
        description: "Today is the Saudi National Day \u2014 September 23rd. Happy National Day! \uD83C\uDDF8\uD83C\uDDE6",
        dateTime: now.toISOString(),
        category: "General",
        fired: false,
      };
      setTimeout(() => {
        setActiveNotif(sndAlert);
        setNotifAck(false);
        setNotifVisible(false);
        requestAnimationFrame(() => { setNotifVisible(true); playAlertSound(); });
      }, 1200); // slight delay so the page finishes rendering first
    }
  }, []); // runs once on mount

  /* ── Also trigger National Day popup when user selects Sep 23 in calendar ── */
  useEffect(() => {
    if (!selectedDate) return;
    const [, mm, dd] = selectedDate.split("-");
    if (mm === "09" && dd === "23") {
      const popupKey = `snd-selected-popup-${selectedDate.slice(0, 4)}`;
      if (sessionStorage.getItem(popupKey)) return;
      sessionStorage.setItem(popupKey, "1");
      const sndAlert: ScheduledAlert = {
        id: "__saudi-national-day__",
        title: "Saudi National Day",
        description: "Today is the Saudi National Day \u2014 September 23rd. Happy National Day!",
        dateTime: new Date().toISOString(),
        category: "General",
        fired: false,
      };
      setActiveNotif(sndAlert);
      setNotifAck(false);
      setNotifVisible(false);
      requestAnimationFrame(() => { setNotifVisible(true); playAlertSound(); });
    }
  }, [selectedDate]);

  /* sync rDate + aSelDate with selectedDate */
  useEffect(() => {
    if (selectedDate) { setRDate(selectedDate); setASelDate(selectedDate); }
  }, [selectedDate]);

  /* â”€â”€ Derived lists â”€â”€ */
  const dateReminders = selectedDate
    ? reminders.filter(r => r.date === selectedDate)
    : reminders;

  const selectedOccasion = selectedDate
    ? getOccasionForDate(new Date(selectedDate + "T12:00:00"))
    : null;

  const dateAlerts = selectedDate
    ? alerts.filter(a => a.dateTime.startsWith(selectedDate))
    : alerts;

  const allSorted = [
    ...dateReminders.map(r => ({ kind: "reminder" as const, ...r, sortKey: `${r.date}T${r.time}` })),
    ...dateAlerts.map(a => ({ kind: "alert" as const, ...a, sortKey: a.dateTime })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  /* â”€â”€ Dot indicators â”€â”€ */
  const datesWithItems = new Set([
    ...reminders.map(r => r.date),
    ...alerts.map(a => a.dateTime.slice(0, 10)),
  ]);

  /* â”€â”€ Handlers â”€â”€ */
  const addReminder = () => {
    if (!rTitle || !rDate || !rTime) return;
    setReminders(prev => [...prev, {
      id: Date.now().toString(), title: rTitle, date: rDate,
      time: rTime, completed: false, category: rCat,
    }]);
    setRTitle(""); setRTime(""); setShowAddReminder(false);
  };

  const addAlert = () => {
    if (!aTitle || !aDateTime) return;
    const na: ScheduledAlert = {
      id: Date.now().toString(), title: aTitle, description: aDesc,
      dateTime: aDateTime, category: aCat, fired: false,
    };
    setAlerts(prev => [...prev, na]);
    // No scheduleAlert needed — the 30-s interval handles all alerts automatically
    setATitle(""); setADesc(""); setATime(""); setShowAddAlert(false);
  };

  const dismissNotif = () => {
    /* Stop alert sound */
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
    setNotifAck(true);
    setTimeout(() => { setActiveNotif(null); setNotifAck(false); }, 400);
  };

  /* â”€â”€â”€ Styles â”€â”€â”€ */
  const S = {
    inp: {
      fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textBody,
      backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd,
      border: `1px solid ${theme.borderDefault}`, padding: "10px 14px", outline: "none", width: "100%",
    } as React.CSSProperties,
    btn: (active?: boolean, color?: string) => ({
      padding: "8px 14px", borderRadius: theme.radiusFull, border: "none", outline: "none",
      fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, cursor: "pointer",
      backgroundColor: active ? (color ?? theme.primary) : theme.surfaceElevated,
      color: active ? "#fff" : theme.textMuted,
    } as React.CSSProperties),
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>

      {/* â”€â”€ Header â”€â”€ */}
      <div className="shrink-0 flex items-center justify-between px-8"
        style={{ height: 88, backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToTools} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{ width: 56, height: 56, backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1 style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>
            Reminders &amp; Calendar
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowAddReminder(v => !v); setShowAddAlert(false); }}
            className="flex items-center gap-2 px-5 py-3 cursor-pointer active:scale-95 transition-transform"
            style={{ backgroundColor: "#4ECDC4", borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <Plus size={18} color="#fff" />
            <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: "#fff" }}>Add Reminder</span>
          </button>
          <button onClick={() => { setShowAddAlert(v => !v); setShowAddReminder(false); }}
            className="flex items-center gap-2 px-5 py-3 cursor-pointer active:scale-95 transition-transform"
            style={{ backgroundColor: "#4ECDC4", borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <Plus size={18} color="#fff" />
            <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: "#fff" }}>Add Alert</span>
          </button>
          <button onClick={onClose}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{ width: 36, height: 36, background: "none", border: "none", outline: "none", borderRadius: "50%", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>


      {/* â”€â”€ Add Reminder Modal â”€â”€ */}
      {showAddReminder && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center"
          style={{ backgroundColor: "rgba(10,22,40,0.55)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddReminder(false); }}>
          <div style={{
            width: 520, backgroundColor: theme.surface, borderRadius: theme.radiusXl,
            boxShadow: SHADOW.xl, overflow: "hidden",
            border: `1.5px solid ${theme.borderDefault}`,
          }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-7 py-5"
              style={{ borderBottom: `1px solid ${theme.borderDefault}`, backgroundColor: theme.primarySubtle }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: theme.radiusMd,
                  backgroundColor: theme.primary, display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Plus size={20} color="#fff" />
                </div>
                <h2 style={{
                  fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold,
                  color: theme.textHeading, margin: 0
                }}>New Reminder</h2>
              </div>
              <button onClick={() => setShowAddReminder(false)}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: "none", border: "none", outline: "none", cursor: "pointer",
                  color: "#6B7280",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {/* Modal body */}
            <div className="flex flex-col gap-4 p-7">
              {/* Title */}
              <div>
                <label style={{
                  fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                  color: theme.textMuted, display: "block", marginBottom: 6
                }}>Title</label>
                <input style={S.inp} placeholder="e.g. Take morning medication"
                  value={rTitle} onChange={e => setRTitle(e.target.value)} autoFocus />
              </div>
              {/* Category */}
              <div>
                <label style={{
                  fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                  color: theme.textMuted, display: "block", marginBottom: 6
                }}>Category</label>
                <div className="flex gap-2">
                  {(["medication", "appointment", "general"] as const).map(c => (
                    <button key={c} onClick={() => setRCat(c)}
                      style={{ ...S.btn(rCat === c, CAT_COLOR[c]), flex: 1 }}>
                      {CAT_ICON[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Date + Time row */}
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <label style={{
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                    color: theme.textMuted, display: "block", marginBottom: 6
                  }}>Date</label>
                  <input type="date" style={S.inp} value={rDate} onChange={e => setRDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                    color: theme.textMuted, display: "block", marginBottom: 6
                  }}>Time</label>
                  <input type="time" style={S.inp} value={rTime} onChange={e => setRTime(e.target.value)} />
                </div>
              </div>
              {/* Auto-fill note */}
              {selectedDate && (
                <p style={{
                  fontFamily, fontSize: "12px", color: theme.textMuted, margin: 0,
                  padding: "6px 10px", backgroundColor: theme.primarySubtle, borderRadius: theme.radiusSm
                }}>
                  ðŸ“… Date auto-filled from your calendar selection
                </p>
              )}
              {/* Save button */}
              <button onClick={addReminder} disabled={!rTitle || !rDate || !rTime}
                className="w-full flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                style={{
                  height: 52, borderRadius: theme.radiusMd, border: "none", outline: "none",
                  backgroundColor: theme.primary, opacity: (!rTitle || !rDate || !rTime) ? 0.45 : 1,
                  boxShadow: `0 4px 16px ${theme.primary}40`
                }}>
                <Check size={18} color="#fff" />
                <span style={{ fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: "#fff" }}>
                  Save Reminder
                </span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* â”€â”€ Add Alert Modal â”€â”€ */}
      {showAddAlert && (() => {
        const aYear = aCalDate.getFullYear();
        const aMon = aCalDate.getMonth();
        const aTotalDays = new Date(aYear, aMon + 1, 0).getDate();
        const aOffset = new Date(aYear, aMon, 1).getDay();
        const aFirstDay = new Date(aYear, aMon, 1);
        return (
          <div className="absolute inset-0 z-[55] flex items-center justify-center"
            style={{ backgroundColor: "rgba(10,22,40,0.6)", backdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddAlert(false); }}>
            <div style={{
              width: 620, maxHeight: "90vh", overflowY: "auto",
              backgroundColor: theme.surface, borderRadius: theme.radiusXl,
              boxShadow: SHADOW.xl, border: `1.5px solid #4ECDC440`,
            }}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-7 py-5" style={{
                borderBottom: `1px solid ${theme.borderDefault}`,
                backgroundColor: "rgba(78,205,196,0.08)", position: "sticky", top: 0, zIndex: 1,
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: theme.radiusMd,
                    backgroundColor: "#4ECDC4", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Plus size={20} color="#fff" />
                  </div>
                  <h2 style={{
                    fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold,
                    color: theme.textHeading, margin: 0
                  }}>New Alert</h2>
                </div>
                <button onClick={() => setShowAddAlert(false)}
                  className="flex items-center justify-center transition-colors"
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: "none", border: "none", outline: "none", cursor: "pointer",
                    color: "#6B7280",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <div className="flex flex-col gap-5 p-7">

                {/* Title */}
                <div>
                  <label style={{
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                    color: theme.textMuted, display: "block", marginBottom: 6
                  }}>Alert Title</label>
                  <input style={S.inp} placeholder="e.g. Take medication" autoFocus
                    value={aTitle} onChange={e => setATitle(e.target.value)} />
                </div>

                {/* Description */}
                <div>
                  <label style={{
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                    color: theme.textMuted, display: "block", marginBottom: 6
                  }}>Short Description</label>
                  <input style={S.inp} placeholder="Optional note shown in the popup"
                    value={aDesc} onChange={e => setADesc(e.target.value)} />
                </div>

                {/* Category */}
                <div>
                  <label style={{
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                    color: theme.textMuted, display: "block", marginBottom: 6
                  }}>Category</label>
                  <div className="flex gap-2">
                    {(["Medical", "Prayer", "General"] as const).map(c => (
                      <button key={c} onClick={() => setACat(c)}
                        style={{ ...S.btn(aCat === c, CAT_COLOR[c]), flex: 1 }}>
                        {CAT_ICON[c]} {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Embedded mini-calendar */}
                <div style={{
                  backgroundColor: theme.background, borderRadius: theme.radiusLg,
                  padding: 16, border: `1px solid ${theme.borderDefault}`
                }}>
                  <label style={{
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                    color: theme.textMuted, display: "block", marginBottom: 10
                  }}>Pick a Date</label>

                  {/* Cal system tabs */}
                  <div className="flex mb-3" style={{
                    backgroundColor: theme.surfaceElevated,
                    borderRadius: theme.radiusSm, padding: 3
                  }}>
                    {(["gregory", "islamic-umalqura"] as CalSystem[]).map(sys => (
                      <button key={sys} onClick={() => setACalSys(sys)}
                        style={{
                          flex: 1, padding: "6px 4px", border: "none", outline: "none",
                          cursor: "pointer", borderRadius: theme.radiusSm,
                          fontFamily, fontSize: "12px", fontWeight: WEIGHT.semibold,
                          backgroundColor: aCalSys === sys ? "#4ECDC4" : "transparent",
                          color: aCalSys === sys ? "#fff" : theme.textMuted,
                          transition: "all 0.15s"
                        }}>
                        {CAL_LABELS[sys]}
                      </button>
                    ))}
                  </div>

                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={() => setACalDate(new Date(aYear, aMon - 1, 1))}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <ChevronLeft size={18} color={theme.textHeading} />
                    </button>
                    <span style={{
                      fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold,
                      color: theme.textHeading
                    }}>
                      {fmtMonthYear(aFirstDay, aCalSys)}
                    </span>
                    <button onClick={() => setACalDate(new Date(aYear, aMon + 1, 1))}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <ChevronRight size={18} color={theme.textHeading} />
                    </button>
                  </div>

                  {/* Day-name row */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_NAMES.map(d => (
                      <div key={d} style={{
                        textAlign: "center", fontFamily, fontSize: "11px",
                        fontWeight: WEIGHT.semibold, color: theme.textMuted, paddingBottom: 4
                      }}>{d}</div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array(aOffset).fill(null).map((_, i) => <div key={`ae${i}`} />)}
                    {Array(aTotalDays).fill(null).map((_, i) => {
                      const d = i + 1;
                      const cellDate = new Date(aYear, aMon, d);
                      const key = toDateKey(cellDate);
                      const isTd = key === todayKey;
                      const isSel = key === aSelDate;
                      return (
                        <button key={d} onClick={() => setASelDate(key)}
                          style={{
                            height: 40, borderRadius: theme.radiusSm, border: "none",
                            outline: "none", cursor: "pointer", display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", gap: 2,
                            backgroundColor: isSel ? "#4ECDC4" : isTd ? "rgba(78,205,196,0.15)" : theme.surfaceElevated,
                            transition: "all 0.15s"
                          }}>
                          <span style={{
                            fontFamily, fontSize: "12px",
                            fontWeight: isTd ? WEIGHT.bold : WEIGHT.medium,
                            color: isSel ? "#fff" : isTd ? "#4ECDC4" : theme.textHeading,
                            lineHeight: 1
                          }}>{fmtDay(cellDate, aCalSys)}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected date display */}
                  {aSelDate && (() => {
                    const f = fmtAllSystems(aSelDate); return (
                      <div className="flex gap-2 mt-3" style={{ flexWrap: "wrap" }}>
                        <span style={{ fontFamily, fontSize: "11px", padding: "2px 8px", borderRadius: 999, border: "1px solid #BFDBFE", backgroundColor: "#EFF6FF", color: "#3B82F6", fontWeight: 600 }}>{f.greg}</span>
                        <span style={{ fontFamily, fontSize: "11px", padding: "2px 8px", borderRadius: 999, border: "1px solid #BBF7D0", backgroundColor: "#F0FDF4", color: "#16A34A", fontWeight: 600 }}>{f.hijri}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Time picker */}
                <div>
                  <label style={{
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                    color: theme.textMuted, display: "block", marginBottom: 6
                  }}>Time</label>
                  <input type="time" style={S.inp} value={aTime} onChange={e => setATime(e.target.value)} />
                </div>

                {/* Save */}
                <button onClick={addAlert} disabled={!aTitle || !aDateTime}
                  className="w-full flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                  style={{
                    height: 56, borderRadius: theme.radiusMd, border: "none", outline: "none",
                    backgroundColor: "#4ECDC4", opacity: (!aTitle || !aDateTime) ? 0.45 : 1,
                    boxShadow: "0 4px 20px rgba(78,205,196,0.4)"
                  }}>
                  <CheckCircle2 size={20} color="#fff" />
                  <span style={{ fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: "#fff" }}>
                    Save Alert
                  </span>
                </button>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Date banner */}
      <div style={{
        flexShrink: 0,
        backgroundColor: "#E6FBFA",
        borderBottom: "1px solid #AFE3E0",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 44,
      }}>
        {selectedDate ? (() => {
          const f = fmtAllSystems(selectedDate);
          const d = new Date(selectedDate + "T00:00");
          const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
          return (
            <>
              <span style={{ fontFamily, fontSize: "13px", fontWeight: WEIGHT.semibold, color: "#374151" }}>
                {weekday}, {f.greg}
              </span>
              <span style={{ color: "#D1D5DB", fontSize: 16, lineHeight: 1 }}>·</span>
              <span style={{ fontFamily, fontSize: "13px", fontWeight: WEIGHT.medium, color: "#6B7280" }}>
                {f.hijri} AH
              </span>
            </>
          );
        })() : (
          <span style={{ fontFamily, fontSize: "13px", fontWeight: WEIGHT.medium, color: "#36B3A8" }}>
            All upcoming reminders
          </span>
        )}
      </div>

      {/* â”€â”€ Split body â”€â”€ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* LEFT: Reminders list â€“ 40% */}
        <div className="shrink-0 flex flex-col overflow-y-auto p-6"
          style={{ width: "40%", borderRight: `1px solid #AFE3E0`, backgroundColor: "#ffffff", gap: 0 }}>

          {/* "Upcoming" section title */}
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} color="#4ECDC4" />
            <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: "#4ECDC4" }}>
              {selectedDate
                ? new Date(selectedDate + "T00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                : "Upcoming"}
            </span>
          </div>

          {/* Occasion info card */}
          {selectedOccasion && (
            <div style={{
              borderRadius: 12,
              marginBottom: 12,
              overflow: "hidden",
              border: `1px solid ${selectedOccasion.color}30`,
            }}>
              <div style={{
                backgroundColor: selectedOccasion.color,
                padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: "18px", lineHeight: 1 }}>★</span>
                <span style={{ fontFamily, fontSize: "13px", fontWeight: WEIGHT.bold, color: "#fff" }}>
                  {selectedOccasion.name}
                </span>
              </div>
              <div style={{ backgroundColor: `${selectedOccasion.color}10`, padding: "8px 14px" }}>
                <p style={{ fontFamily, fontSize: "12px", color: "#374151", margin: 0, lineHeight: 1.5 }}>
                  {selectedOccasion.description}
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {allSorted.length === 0 && !selectedOccasion && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3" style={{ opacity: 0.45 }}>
              <Bell size={44} color={theme.textMuted} strokeWidth={1.5} />
              <p style={{ fontFamily, fontSize: TYPE_SCALE.base, color: theme.textMuted }}>No items for this date</p>
            </div>
          )}

          {/* Item list */}
          <div className="flex flex-col">
            {allSorted.map((item, idx) => {

              if (item.kind === "reminder") {
                const r = item as typeof item & Reminder;
                return (
                  <div key={r.id}
                    className="group flex items-start gap-3 p-4"
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderBottom: "1px solid #F0F0F0",
                      opacity: r.completed ? 0.6 : 1,
                    }}
                  >
                    {/* Hollow circle checkbox */}
                    <button
                      onClick={() => setReminders(prev => prev.map(x => x.id === r.id ? { ...x, completed: !x.completed } : x))}
                      style={{
                        flexShrink: 0,
                        width: 22, height: 22,
                        borderRadius: "50%",
                        border: r.completed ? "none" : "1.5px solid #CCCCCC",
                        backgroundColor: r.completed ? "#4ECDC4" : "transparent",
                        cursor: "pointer",
                        outline: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                        marginTop: 2,
                      }}
                    >
                      {r.completed && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* Category icon tile – 34×34 soft pastel bg */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      backgroundColor: CAT_BG[r.category] ?? "#F5F5F5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {CAT_ICON[r.category]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p style={{
                        fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold,
                        color: theme.textHeading,
                        textDecoration: r.completed ? "line-through" : "none",
                        margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {r.title}
                      </p>
                      {/* Time in teal */}
                      <p className="flex items-center gap-1" style={{
                        fontFamily, fontSize: "13px", fontWeight: WEIGHT.semibold,
                        color: "#4ECDC4", margin: 0, marginTop: 4,
                      }}>
                        <Clock size={12} color="#4ECDC4" /> {r.time}
                      </p>
                      {/* Date badges */}
                      {(() => {
                        const f = fmtAllSystems(r.date); return (
                          <div className="flex gap-1" style={{ marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontFamily, fontSize: "11px", padding: "2px 8px", borderRadius: 999, border: "1px solid", fontWeight: 600, backgroundColor: "#EFF6FF", color: "#3B82F6", borderColor: "#BFDBFE" }}>{f.greg}</span>
                            <span style={{ fontFamily, fontSize: "11px", padding: "2px 8px", borderRadius: 999, border: "1px solid", fontWeight: 600, backgroundColor: "#F0FDF4", color: "#16A34A", borderColor: "#BBF7D0" }}>{f.hijri}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Delete â€“ far right */}
                    <button
                      onClick={() => setReminders(prev => prev.filter(x => x.id !== r.id))}
                      className="flex items-center justify-center"
                      style={{
                        background: "none", border: "none", outline: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, padding: 4, borderRadius: 6, marginLeft: 4,
                      }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </button>
                  </div>
                );
              }

              /* â”€â”€ Alert row â”€â”€ */
              const a = item as typeof item & ScheduledAlert;
              return (
                <div key={a.id}
                  className="group flex items-start gap-3 p-4"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderBottom: "1px solid #F0F0F0",
                    opacity: a.fired ? 0.6 : 1,
                  }}
                >
                  {/* Category icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0, marginTop: 1,
                    backgroundColor: "#F5F5F5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {CAT_ICON[a.category]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p style={{
                      fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold,
                      color: theme.textHeading, margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {a.title}
                    </p>
                    {a.description && (
                      <p style={{ fontFamily, fontSize: "12px", color: theme.textMuted, margin: 0, marginTop: 2 }}>
                        {a.description}
                      </p>
                    )}
                    {/* Time in teal */}
                    <p className="flex items-center gap-1" style={{
                      fontFamily, fontSize: "13px", fontWeight: WEIGHT.semibold,
                      color: "#4ECDC4", margin: 0, marginTop: 4,
                    }}>
                      <Clock size={12} color="#4ECDC4" />
                      {new Date(a.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </p>
                    {/* Date badges */}
                    {(() => {
                      const f = fmtAllSystems(a.dateTime); return (
                        <div className="flex gap-1" style={{ marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ fontFamily, fontSize: "11px", padding: "2px 8px", borderRadius: 999, border: "1px solid", fontWeight: 600, backgroundColor: "#EFF6FF", color: "#3B82F6", borderColor: "#BFDBFE" }}>{f.greg}</span>
                          <span style={{ fontFamily, fontSize: "11px", padding: "2px 8px", borderRadius: 999, border: "1px solid", fontWeight: 600, backgroundColor: "#F0FDF4", color: "#16A34A", borderColor: "#BBF7D0" }}>{f.hijri}</span>
                        </div>
                      );
                    })()}
                    {/* Status pill */}
                    <span style={{
                      display: "inline-block", marginTop: 5,
                      fontFamily, fontSize: "11px", fontWeight: WEIGHT.semibold,
                      padding: "2px 8px", borderRadius: 20,
                      backgroundColor: a.fired ? "#ECFDF5" : "#FFF7ED",
                      color: a.fired ? "#059669" : "#EA580C",
                    }}>
                      {a.fired ? "✓ Fired" : "⏳ Pending"}
                    </span>
                  </div>

                  {/* Delete – far right */}
                  <button
                    onClick={() => {
                      setAlerts(prev => prev.filter(x => x.id !== a.id));
                    }}
                    className="flex items-center justify-center"
                    style={{
                      background: "none", border: "none", outline: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, padding: 4, borderRadius: 6, marginLeft: 4,
                    }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Calendar – 60% */}
        <div className="flex-1 flex flex-col overflow-y-auto"
          style={{ backgroundColor: "#E6FBFA", borderLeft: "1px solid #AFE3E0" }}>

          {/* 3-tab toggle – pinned at top */}
          <div className="flex shrink-0"
            style={{ backgroundColor: "#E6FBFA", borderBottom: "1px solid #AFE3E0", padding: "10px 24px 0" }}>
            {(["gregory", "islamic-umalqura"] as CalSystem[]).map(sys => {
              const active = calSystem === sys;
              return (
                <button key={sys} onClick={() => setCalSystem(sys)}
                  style={{
                    flex: 1, padding: "10px 6px", border: "none", outline: "none", cursor: "pointer",
                    fontFamily, fontSize: "13px", fontWeight: WEIGHT.semibold,
                    borderRadius: "10px 10px 0 0",
                    backgroundColor: active ? "#4ECDC4" : "#ffffff",
                    color: active ? "#fff" : "#6B7280",
                    transition: "all 0.18s",
                    borderBottom: active ? "2px solid #4ECDC4" : "2px solid transparent",
                    marginBottom: active ? -1 : 0,
                  }}>
                  {CAL_LABELS[sys]}
                </button>
              );
            })}
          </div>

          {/* Calendar body */}
          <div className="flex flex-col flex-1 p-6">

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCalDate(new Date(year, month - 1, 1))}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none", outline: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: "rgba(78, 205, 196, 0.12)", transition: "background 0.15s",
                }}>
                <ChevronLeft size={20} color="#4ECDC4" />
              </button>
              <span style={{ fontFamily, fontSize: "18px", fontWeight: WEIGHT.bold, color: "#36B3A8", letterSpacing: 0.2 }}>
                {fmtMonthYear(firstDay, calSystem)}
              </span>
              <button onClick={() => setCalDate(new Date(year, month + 1, 1))}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none", outline: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: "rgba(78, 205, 196, 0.12)", transition: "background 0.15s",
                }}>
                <ChevronRight size={20} color="#4ECDC4" />
              </button>
            </div>

            {/* Day-name headers */}
            <div className="grid grid-cols-7 mb-3">
              {DAY_NAMES.map(d => (
                <div key={d} style={{
                  textAlign: "center", fontFamily, fontSize: "12px",
                  fontWeight: WEIGHT.bold, color: "#4ECDC4", letterSpacing: 0.5,
                  paddingBottom: 10, textTransform: "uppercase",
                }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-2">
              {Array(offset).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(totalDays).fill(null).map((_, i) => {
                const day = i + 1;
                const cellDate = new Date(year, month, day);
                const key = toDateKey(cellDate);
                const isToday = key === todayKey;
                const isSelected = key === selectedDate;
                const hasDot = datesWithItems.has(key);
                const occasion = getOccasionForDate(cellDate);
                const displayDay = fmtDay(cellDate, calSystem);
                const circleBg = isSelected ? "#36B3A8" : isToday ? "#4ECDC4" : "transparent";
                const textColor = (isSelected || isToday) ? "#fff" : "#1A3D32";
                return (
                  <button key={day}
                    onClick={() => setSelectedDate(prev => prev === key ? null : key)}
                    style={{
                      border: "none", outline: "none", cursor: "pointer",
                      background: "transparent", padding: 0,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 3, height: 52,
                    }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      backgroundColor: circleBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isSelected
                        ? "0 3px 10px rgba(54, 179, 168, 0.35)"
                        : isToday
                          ? "0 3px 10px rgba(78, 205, 196, 0.30)"
                          : "none",
                      transition: "all 0.15s",
                    }}>
                      <span style={{
                        fontFamily, fontSize: "15px",
                        fontWeight: (isToday || isSelected) ? WEIGHT.bold : WEIGHT.medium,
                        color: textColor, lineHeight: 1,
                      }}>{displayDay}</span>
                    </div>
                    {hasDot && (
                      <div style={{
                        width: 5, height: 5, borderRadius: "50%",
                        backgroundColor: (isSelected || isToday) ? "rgba(255,255,255,0.75)" : "#4ECDC4",
                      }} />
                    )}
                    {occasion && (
                      <div style={{
                        marginTop: 2, borderRadius: 3, padding: "1px 5px",
                        backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : occasion.color,
                      }}>
                        <span style={{ fontFamily, fontSize: "7px", fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
                          {occasion.label}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <button onClick={() => setSelectedDate(null)}
                style={{
                  marginTop: 20, alignSelf: "center",
                  background: "none", border: "1.5px solid #4ECDC4",
                  borderRadius: theme.radiusFull, padding: "6px 20px", cursor: "pointer",
                  fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                  color: "#4ECDC4",
                }}>
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Alert popup ── */}
      {activeNotif && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center"
          style={{
            backgroundColor: notifAck ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            transition: "background-color 0.3s",
          }}
        >
          <div style={{
            width: 480, maxWidth: "92%",
            backgroundColor: "#ffffff",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)",
            transform: notifVisible && !notifAck
              ? "scale(1) translateY(0)"
              : notifAck
                ? "scale(0.96) translateY(6px)"
                : "scale(0.92) translateY(20px)",
            opacity: notifVisible && !notifAck ? 1 : 0,
            transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s",
          }}>

            {activeNotif.id === "__saudi-national-day__" ? (
              /* ── Saudi National Day celebration card ── */
              <>
                {/* Green celebration header */}
                <div style={{
                  background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
                  padding: "28px 24px 20px",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Decorative circles */}
                  <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)" }} />
                  <div style={{ position: "absolute", bottom: -15, left: -15, width: 60, height: 60, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)" }} />
                  {/* Crescent SVG */}
                  <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <path d="M28 20a10 10 0 1 1-10-10 8 8 0 0 0 10 10z" fill="white" fillOpacity="0.9" />
                      <circle cx="30" cy="13" r="3" fill="white" fillOpacity="0.9" />
                    </svg>
                  </div>
                  <div style={{ fontFamily, fontSize: "11px", fontWeight: WEIGHT.bold, color: "rgba(255,255,255,0.75)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>
                    September 23rd
                  </div>
                  <h2 style={{ fontFamily, fontSize: "22px", fontWeight: WEIGHT.bold, color: "#ffffff", margin: 0, lineHeight: 1.25 }}>
                    Happy Saudi National Day!
                  </h2>
                </div>
                {/* Body */}
                <div style={{ padding: "20px 24px 20px" }}>
                  <p style={{ fontFamily, fontSize: "14px", color: "#374151", margin: 0, marginBottom: 20, lineHeight: 1.7, textAlign: "center" }}>
                    Today is the Saudi National Day &mdash; a day to celebrate the Kingdom of Saudi Arabia and its proud heritage.
                  </p>
                  <button
                    onClick={dismissNotif}
                    className="w-full flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                    style={{ height: 52, borderRadius: 12, backgroundColor: "#16A34A", border: "none", outline: "none", boxShadow: "0 4px 14px rgba(22,163,74,0.35)" }}
                  >
                    <CheckCircle2 size={18} color="#fff" />
                    <span style={{ fontFamily, fontSize: "15px", fontWeight: WEIGHT.semibold, color: "#fff" }}>
                      Celebrate!
                    </span>
                  </button>
                  <div className="flex items-center justify-center gap-1" style={{ marginTop: 12 }}>
                    <span style={{ fontFamily, fontSize: "11px", color: "#D1D5DB" }}>Saudi Arabia &bull; 1446 AH</span>
                  </div>
                </div>
              </>
            ) : (
              /* ── Standard REMINDER NOTICE card ── */
              <>
                {/* Header */}
                <div className="flex items-center gap-3"
                  style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, backgroundColor: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bell size={20} color="#374151" />
                  </div>
                  <div>
                    <div style={{ fontFamily, fontSize: "13px", fontWeight: WEIGHT.bold, color: "#111827", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                      REMINDER NOTICE
                    </div>
                    <div style={{ fontFamily, fontSize: "12px", color: "#9CA3AF", marginTop: 2 }}>
                      {new Date(activeNotif.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </div>
                  </div>
                </div>
                {/* Body */}
                <div style={{ padding: "24px 24px 20px" }}>
                  <h2 style={{ fontFamily, fontSize: "20px", fontWeight: WEIGHT.bold, color: "#111827", margin: 0, marginBottom: 8, lineHeight: 1.3 }}>
                    {activeNotif.title}
                  </h2>
                  <p style={{ fontFamily, fontSize: "14px", color: "#6B7280", margin: 0, marginBottom: 24, lineHeight: 1.6 }}>
                    {activeNotif.description || `Your scheduled ${activeNotif.category.toLowerCase()} alert is due now.`}
                  </p>
                  <button onClick={dismissNotif}
                    className="w-full flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                    style={{ height: 52, borderRadius: 12, backgroundColor: "#4ECDC4", border: "none", outline: "none", boxShadow: "0 4px 14px rgba(29,158,117,0.35)" }}
                  >
                    <CheckCircle2 size={18} color="#fff" />
                    <span style={{ fontFamily, fontSize: "15px", fontWeight: WEIGHT.semibold, color: "#fff" }}>I've Read This</span>
                  </button>
                  <div className="flex items-center justify-center gap-1" style={{ marginTop: 14 }}>
                    <ShieldCheck size={12} color="#D1D5DB" />
                    <p style={{ fontFamily, fontSize: "11px", color: "#D1D5DB", margin: 0 }}>This notice will be saved in your notifications</p>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}