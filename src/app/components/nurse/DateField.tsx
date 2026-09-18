import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTheme } from "../ThemeContext";

/**
 * DateField — the one way a date is entered in the nurse interface.
 *
 * Every date on this side used to be a free-text box: the nurse typed
 * "18 Sep 2026" and hoped. That is three ways to get it wrong (the format, the
 * month spelling, a day that does not exist) on a touchscreen with no keyboard
 * shortcuts, and it is also what made the Arabic screen reorder the value —
 * a string beginning with a digit has no direction of its own.
 *
 * Values go in and out as the display string the store already holds, so
 * nothing downstream has to change: "18 Sep 2026", or "18 Sep 2026 · 10:30"
 * when `withTime` is set. Anything unparseable is kept and shown as typed
 * rather than silently discarded — a nurse's note is not ours to throw away.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
/** The separator the store already uses between a date and a time. */
const TIME_SEP = " · ";

function pad(n: number) { return String(n).padStart(2, "0"); }

export function formatDateValue(d: Date, withTime = false, time?: { h: number; m: number }) {
  const date = `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return date;
  const h = time?.h ?? d.getHours();
  const m = time?.m ?? d.getMinutes();
  return `${date}${TIME_SEP}${pad(h)}:${pad(m)}`;
}

/** "18 Sep 2026 · 10:30", "18 Sep 2026", "2026-09-18" — or nothing. */
export function parseDateValue(raw: string): { date: Date | null; h: number; m: number } {
  const text = (raw || "").trim();
  if (!text) return { date: null, h: 9, m: 0 };

  let h = 9, m = 0;
  const time = text.match(/(\d{1,2}):(\d{2})/);
  if (time) { h = Math.min(23, Number(time[1])); m = Math.min(59, Number(time[2])); }

  const dmy = text.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (dmy) {
    const month = MONTHS.findIndex((x) => x.toLowerCase() === dmy[2].toLowerCase());
    if (month >= 0) return { date: new Date(Number(dmy[3]), month, Number(dmy[1])), h, m };
  }
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { date: new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])), h, m };

  return { date: null, h, m };
}

export function DateField({
  value, onChange, withTime = false, readOnly = false, placeholder, className, style,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Adds an hour/minute stepper, for an appointment rather than a day. */
  withTime?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseDateValue(value), [value]);
  /* The month on screen. Starts on the value's month, or this month when
     there is nothing to start from. */
  const [cursor, setCursor] = useState<Date>(() => parsed.date ?? new Date());
  const [hour, setHour] = useState(parsed.h);
  const [minute, setMinute] = useState(parsed.m);

  useEffect(() => {
    if (!open) return;
    const p = parseDateValue(value);
    setCursor(p.date ?? new Date());
    setHour(p.h);
    setMinute(p.m);
  }, [open]);

  /* Tapping anywhere else closes it — a popover that needs its own button to
     dismiss is one more thing to find on a touchscreen. */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const selected = parsed.date;
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  /* A fixed six-row grid: the month's days padded to whole weeks, so the
     popover never changes height as the nurse pages through months. */
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = first.getDay();
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    while (out.length < 42) out.push(null);
    return out;
  }, [cursor]);

  const commit = (d: Date, h = hour, m = minute) => {
    onChange(formatDateValue(d, withTime, { h, m }));
    if (!withTime) setOpen(false);
  };

  const fieldStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    width: "100%", padding: "10px 14px", borderRadius: 12,
    fontSize: "14px", color: value ? t.textHeading : t.textMuted,
    backgroundColor: t.surfaceInset, border: `1.5px solid ${open ? t.primary : t.borderDefault}`,
    cursor: readOnly ? "default" : "pointer", textAlign: "start",
    outline: "none",
    ...style,
  };

  const navBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, display: "flex",
    alignItems: "center", justifyContent: "center",
    backgroundColor: t.surfaceInset, border: `1px solid ${t.borderDefault}`,
    color: t.textHeading, cursor: "pointer",
  };

  return (
    <div ref={wrapRef} className={className} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && setOpen((o) => !o)}
        style={fieldStyle}
      >
        <CalendarDays size={16} style={{ color: t.primaryOn, flexShrink: 0 }} />
        {/* The value is Latin and numeric, so it keeps its own direction
            whatever the interface is set to. */}
        <span dir="ltr" style={{ unicodeBidi: "isolate", flex: 1, minWidth: 0 }}>
          {value || placeholder || (withTime ? "Pick a date and time" : "Pick a date")}
        </span>
        {!!value && !readOnly && (
          <span
            role="button"
            aria-label="Clear"
            onPointerDown={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
            style={{ display: "flex", color: t.textMuted, flexShrink: 0 }}
          >
            <X size={15} />
          </span>
        )}
      </button>

      {open && !readOnly && (
        <div
          dir="ltr"
          style={{
            position: "absolute", zIndex: 60, top: "calc(100% + 6px)", insetInlineStart: 0,
            width: 300, padding: 12, borderRadius: 16,
            backgroundColor: t.surface, border: `1px solid ${t.borderDefault}`,
            boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
          }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <button type="button" aria-label="Previous month" style={navBtn}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: "14px", fontWeight: 800, color: t.textHeading }}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <button type="button" aria-label="Next month" style={navBtn}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7" style={{ gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map((w) => (
              <span key={w} style={{ fontSize: "10px", fontWeight: 700, color: t.textMuted, textAlign: "center" }}>{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7" style={{ gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <span key={i} style={{ height: 36 }} />;
              const isSel = !!selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => commit(d)}
                  style={{
                    height: 36, borderRadius: 10,
                    fontSize: "13px", fontWeight: isSel || isToday ? 800 : 600,
                    color: isSel ? t.brandOnPrimary : isToday ? t.primaryOn : t.textHeading,
                    backgroundColor: isSel ? t.primary : isToday ? t.primarySubtle : "transparent",
                    border: "none", cursor: "pointer",
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.borderDefault}` }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, display: "block", marginBottom: 6 }}>
                Time
              </span>
              <div className="flex items-center" style={{ gap: 6 }}>
                <select
                  value={hour}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setHour(h);
                    if (selected) commit(selected, h, minute);
                  }}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 10, fontSize: "14px",
                    color: t.textHeading, backgroundColor: t.surfaceInset,
                    border: `1px solid ${t.borderDefault}`, cursor: "pointer", outline: "none",
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}</option>)}
                </select>
                <span style={{ fontWeight: 800, color: t.textMuted }}>:</span>
                <select
                  value={minute}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setMinute(m);
                    if (selected) commit(selected, hour, m);
                  }}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 10, fontSize: "14px",
                    color: t.textHeading, backgroundColor: t.surfaceInset,
                    border: `1px solid ${t.borderDefault}`, cursor: "pointer", outline: "none",
                  }}
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>{pad(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center" style={{ gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { const n = new Date(); setCursor(n); commit(n); }}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 10,
                fontSize: "13px", fontWeight: 700, color: t.primaryOn,
                backgroundColor: t.primarySubtle, border: "none", cursor: "pointer",
              }}
            >
              Today
            </button>
            {withTime && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 10,
                  fontSize: "13px", fontWeight: 700, color: t.brandOnPrimary,
                  backgroundColor: t.primary, border: "none", cursor: "pointer",
                }}
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
