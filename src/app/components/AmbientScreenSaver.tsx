import { useEffect, useRef, useState } from "react";
import { Prayer } from "adhan";
import { useTheme, AMBIENT, TYPE_SCALE, WEIGHT, LEADING, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import {
  getPrayerStatus,
  getRelativeTimeString,
  localizeDigits,
  prayerTimeParts,
  PRAYER_NAMES,
} from "../utils/prayerUtils";

/**
 * The dark clock screensaver: logo, time, Gregorian and Hijri date, and the
 * next prayer, on near-black.
 *
 * Built for bedside screens left on for days. Nothing is white, and the whole
 * group drifts slowly around the screen so no pixel holds the same thing for
 * hours — the burn-in protection a still image never has. It holds still for
 * the first minute, so the screen settles before it starts to move, then
 * glides at a constant speed: linear, because easing each leg of the path
 * brought it to a halt at every corner and read as stopping and starting.
 * There is no switch, and it ignores the system's reduce-motion setting,
 * which on a kiosk would quietly turn the protection off.
 *
 * Any hospital can use it by setting `screensaverStyle: "ambient"`; it takes
 * the brand's light-on-dark logo when there is one. Exit gestures match the
 * other screensavers — long-press or swipe — so a stray tap cannot wake it.
 */

const STILL_FOR_S = 60;
const DRIFT_LOOP_S = 90;

export function AmbientScreenSaver({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, locale, fontFamily } = useLocale();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const palette = AMBIENT.palette;

  /* Exit: long-press or swipe, as on the tasbih and video screensavers. */
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const startPress = (e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => onClose(), 800);
  };
  const endPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    touchStart.current = null;
  };
  const movePress = (e: React.PointerEvent) => {
    if (!touchStart.current) return;
    if (Math.hypot(e.clientX - touchStart.current.x, e.clientY - touchStart.current.y) > 150) onClose();
  };

  const hours12 = now.getHours() % 12 || 12;
  const clock = localizeDigits(`${hours12}:${String(now.getMinutes()).padStart(2, "0")}`, locale);
  const period = t(now.getHours() >= 12 ? "topbar.pm" : "topbar.am");

  // "ar-SA" alone formats in the Hijri calendar, so the Gregorian line asks for it.
  const gregorian = now.toLocaleDateString(
    locale === "ar" ? "ar-SA-u-ca-gregory" : locale === "ur" ? "ur-PK" : "en-GB",
    { weekday: "long", day: "numeric", month: "long" },
  );
  const hijri = new Intl.DateTimeFormat(
    `${locale === "ar" ? "ar-SA" : locale === "ur" ? "ur-PK" : "en-GB"}-u-ca-islamic-umalqura`,
    { day: "numeric", month: "long", year: "numeric" },
  ).format(now);

  const status = getPrayerStatus(now, theme.location);
  // After Isha the next prayer is tomorrow's Fajr; adhan reports it as None.
  const tomorrow = status.next === Prayer.None;
  const nextKey = tomorrow ? Prayer.Fajr : status.next;
  const rawName = t(PRAYER_NAMES[nextKey]);
  const prayerName = locale === "en" ? rawName.charAt(0) + rawName.slice(1).toLowerCase() : rawName;
  const prayerTime = prayerTimeParts(status.targetTime, locale, t);
  const relative = localizeDigits(getRelativeTimeString(now, status.targetTime, locale), locale);

  const logo = theme.logoUrlOnDark || theme.logoUrl;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center select-none"
      style={{ background: palette.background, fontFamily }}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerMove={movePress}
    >
      <style>{`
        @keyframes ambient-drift {
          0%, 100% { transform: translate(0, 0); }
          17% { transform: translate(190px, -60px); }
          34% { transform: translate(115px, 75px); }
          51% { transform: translate(-115px, 64px); }
          68% { transform: translate(-190px, -49px); }
          85% { transform: translate(-48px, -75px); }
        }
      `}</style>
      <div
        className="flex flex-col items-center text-center"
        style={{
          animation: `ambient-drift ${DRIFT_LOOP_S}s linear ${STILL_FOR_S}s infinite`,
          color: palette.body,
        }}
      >
        {logo && (
          <img
            src={logo}
            alt={theme.hospitalName}
            style={{
              width: AMBIENT.size.logo,
              height: "auto",
              objectFit: "contain",
              opacity: palette.logoOpacity,
              marginBottom: SPACE[6],
            }}
          />
        )}

        <div className="flex items-baseline" style={{ gap: SPACE[2], color: palette.clock }}>
          <span
            style={{
              fontSize: AMBIENT.size.clock,
              fontWeight: AMBIENT.clockWeight,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {clock}
          </span>
          <span style={{ fontSize: AMBIENT.size.period, fontWeight: WEIGHT.normal, color: palette.subtle }}>
            {period}
          </span>
        </div>

        <div style={{ marginTop: SPACE[3], fontSize: AMBIENT.size.date, lineHeight: LEADING.normal }}>
          {gregorian}
        </div>
        <div style={{ fontSize: TYPE_SCALE.md, lineHeight: LEADING.normal, color: palette.subtle }}>
          {hijri}
        </div>

        <div style={{ marginTop: SPACE[6] }}>
          <div style={{ fontSize: TYPE_SCALE.md, color: palette.accent, lineHeight: LEADING.normal }}>
            {t("screensaver.nextPrayer")}
          </div>
          <div
            className="flex items-center justify-center"
            style={{ gap: SPACE[2], marginTop: SPACE[1], fontSize: AMBIENT.size.prayer, lineHeight: LEADING.normal }}
          >
            <span>{prayerName}</span>
            {/* A thin rule, not a dot: beside Arabic-Indic digits any dot
                reads as a zero (٠). */}
            <span aria-hidden="true" style={{ width: "2px", height: "28px", backgroundColor: palette.accent }} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {prayerTime.time}
              <span style={{ fontSize: TYPE_SCALE.md, marginInlineStart: "6px", color: palette.subtle }}>
                {prayerTime.period}
              </span>
            </span>
          </div>
          <div style={{ fontSize: TYPE_SCALE.md, color: palette.subtle, lineHeight: LEADING.normal }}>
            {tomorrow ? `${t("screensaver.tomorrow")}${locale === "en" ? " · " : "، "}${relative}` : relative}
          </div>
        </div>

        <div style={{ marginTop: SPACE[8], fontSize: TYPE_SCALE.md, color: palette.subtle }}>
          {t("tasbih.exitHint")}
        </div>
      </div>
    </div>
  );
}
