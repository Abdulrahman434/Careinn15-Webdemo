import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff, Globe, X } from "lucide-react";
import { translateWithLocale, type Locale } from "./i18n";

/* ═══════════════════════════════════════════════════════════════════════════
 * PASSWORD GATE — the login screen, rendered before ThemeProvider mounts
 *
 * Two layouts, chosen by whether this device is linked to a hospital:
 *
 *   HospitalGate — a hospital that ships its own wallpaper (Fakeeh today) gets
 *                  a white card over its own photograph.
 *   CareInnGate  — no hospital linked: a fresh kiosk, a wipe, or a brand with
 *                  no wallpaper of its own. CareInn's split screen — form on
 *                  one side, corridor photograph on the other.
 *
 * Neither can call useTheme()/useLocale(): the gate stands above ThemeProvider.
 * Brand colours are therefore literals here rather than theme tokens, and the
 * locale is read straight out of localStorage under the key ThemeContext uses.
 * ═══════════════════════════════════════════════════════════════════════════ */

import fakeehLoginBg from "../../assets/bg/login-background-fakeeh.webp";
import careinnWallpaper from "../../assets/bg/wallpaper.webp";
import careinnLogo from "../../assets/logos/careinn-logo-lockup.webp";
import { useReloadHold } from "../lib/reloadSafety";

/* ── CareInn brand ── */
const NAVY = "#16274D";       // headings and primary text
const BLUE = "#4EBEE3";       // Sign in button and accents
const BLUE_ON = NAVY;         // type on BLUE — 6.9:1; white would be 2.1:1
const PAGE = "#EEF3F8";       // the ground the rounded split card sits on
const FIELD_BG = "#F4F7FA";
const LINE = "#E2E8F0";       // subtle gray borders
const MUTED = "#5B6B84";      // readable secondary text
const DANGER = "#DC2626";

/* ── Hospital gate palette (unchanged) ── */
const SKY = "#6CC4E0";
const HOSPITAL_NAVY = "#1B2F5B";
const INK = "#16294A";
const INK_MUTED = "#5A6B82";
const FIELD_LINE = "#D5DDE7";
const GUEST_LINE = "#1B7E9E";

/* The last signed-in hospital is remembered in localStorage, which is enough to
   pick a wallpaper without the theme. null means no hospital is linked to this
   device — the CareInn screen answers for that case. */
const HOSPITAL_WALLPAPERS: Record<string, string> = { dsfh: fakeehLoginBg };

function hospitalWallpaper(): string | null {
  try {
    return HOSPITAL_WALLPAPERS[localStorage.getItem("active-hospital-id") || ""] ?? null;
  } catch {
    return null;
  }
}

/* ═══════════════════ LOCALE ═══════════════════
 * Same storage key ThemeContext reads, so a language picked at the gate is the
 * one the app comes up in. A plain toggle rather than a menu: the gate offers
 * English and Arabic only, and the label names the one a tap away. Urdu is
 * still a locale inside the app — it is just not offered here. A device left
 * on Urdu reads as Arabic for the purpose of the toggle, so the button always
 * has somewhere to go. */
const LOCALE_KEY = "active-locale";
const LOCALE_NAME: Record<Locale, string> = { en: "English", ar: "العربية", ur: "اردو" };

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    return v === "ar" || v === "ur" ? v : "en";
  } catch {
    return "en";
  }
}

function useGateLocale() {
  const [locale, setLocale] = useState<Locale>(readLocale);

  // Urdu is not in the toggle, so it counts as "not English" and hands the
  // button English to offer.
  const nextLocale: Locale = locale === "en" ? "ar" : "en";

  const cycleLocale = useCallback(() => {
    setLocale((current) => {
      const next: Locale = current === "en" ? "ar" : "en";
      try {
        localStorage.setItem(LOCALE_KEY, next);
      } catch {
        /* private mode — the gate still switches, the app just won't remember */
      }
      return next;
    });
  }, []);

  const isRTL = locale === "ar" || locale === "ur";

  /* translateWithLocale has no argument interpolation; createT (which does) is
     not exported, and only the footer year needs it. */
  const t = useCallback(
    (key: string, ...args: (string | number)[]) => {
      let str = translateWithLocale(key, locale);
      args.forEach((arg, i) => {
        str = str.replace("{" + i + "}", String(arg));
      });
      return str;
    },
    [locale]
  );

  return {
    locale,
    nextLocale,
    cycleLocale,
    isRTL,
    dir: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr",
    fontFamily: isRTL ? "'Almarai', sans-serif" : "'Mulish', 'Inter', sans-serif",
    t,
  };
}

/* ═══════════════════ KEYBOARD-AWARE VIEWPORT ═══════════════════
 * window.visualViewport reports the region actually visible to the user, and it
 * does so under BOTH Android soft-input modes:
 *   adjustResize — layout viewport shrinks too; height shrinks, offsetTop 0.
 *   adjustPan    — layout viewport is unchanged, so only the visual viewport
 *                  shrinks, and offsetTop moves as the window pans.
 * Driving the content area from it therefore keeps the field and both buttons
 * on screen without depending on how the native kiosk is configured.
 * Falls back to window.innerWidth / 100% when the API is missing (pre-Chrome-61
 * WebViews), which still gets the responsive split right. */
function useVisibleViewport() {
  const [viewport, setViewport] = useState<{ height: number; offsetTop: number } | null>(null);
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1920 : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      // Coalesce the resize+scroll bursts Android emits while the keyboard animates.
      frame = requestAnimationFrame(() =>
        setViewport({ height: vv.height, offsetTop: vv.offsetTop })
      );
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const visibleH = viewport?.height ?? null;

  return {
    viewport,
    visibleH,
    width,
    /* The roomy spacing needs ~432px of card plus breathing room. Below that
       both layouts switch to a tighter rhythm rather than pushing controls off
       screen — which is what an open soft keyboard leaves behind. */
    compact: visibleH !== null && visibleH < 560,
    /* Below this the wallpaper is dropped and the form takes the screen. */
    narrow: width < 900,
  };
}

/* ═══════════════════ SHARED FORM STATE ═══════════════════
 * Both layouts submit the same way: the same login(), the same guest entry, the
 * same shake-and-clear on a bad code. Only the chrome around them differs. */
function useLoginForm() {
  const { login, loginAsGuest } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A request already sent, whose answer would be thrown away by a reload.
  useReloadHold(submitting, "sign-in", "sign-in in progress");

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // login() can reach the network for an MRN lookup, so the second submit
      // of a double-tap has to be dropped rather than queued behind the first.
      if (!password.trim() || submitting) return;

      setSubmitting(true);
      let valid = false;
      try {
        valid = await login(password);
      } finally {
        setSubmitting(false);
      }

      if (!valid) {
        setError(true);
        setShaking(true);
        setTimeout(() => setShaking(false), 600);
        setTimeout(() => setError(false), 3000);
      } else {
        setSuccess(true);
      }
    },
    [password, submitting, login]
  );

  const handleGuest = useCallback(() => {
    loginAsGuest();
    setSuccess(true);
  }, [loginAsGuest]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (error) setError(false);
    },
    [error]
  );

  return {
    password,
    showPassword,
    setShowPassword,
    error,
    shaking,
    submitting,
    success,
    isFocused,
    setIsFocused,
    inputRef,
    handleSubmit,
    handleGuest,
    handleChange,
  };
}

export function PasswordGate() {
  const wallpaper = hospitalWallpaper();
  return wallpaper ? <HospitalGate wallpaper={wallpaper} /> : <CareInnGate />;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * CAREINN GATE — no hospital linked
 * Split screen: form on the inline-start side, photograph on the other. Both
 * sides live inside one rounded card inset from a pale ground, so nothing is
 * laid over the photograph and it keeps its own brightness.
 * ═══════════════════════════════════════════════════════════════════════════ */
function CareInnGate() {
  const f = useLoginForm();
  const { nextLocale, cycleLocale, dir, fontFamily, t } = useGateLocale();
  const { viewport, visibleH, compact, narrow } = useVisibleViewport();

  // The inset and its matching corner radius collapse once vertical space is
  // tight (an open keyboard), buying the gutter back for the controls.
  const gutter = compact ? 0 : 16;
  const control = compact ? 48 : 56;

  const fieldBorder = f.error ? DANGER : f.isFocused ? BLUE : LINE;

  return (
    <div
      dir={dir}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: PAGE,
        fontFamily,
        overflow: "hidden",
        opacity: f.success ? 0 : 1,
        transition: "opacity 0.5s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          // Pinned to the band the user can actually see rather than the full
          // (possibly keyboard-occluded) viewport.
          top: viewport ? `${viewport.offsetTop + gutter}px` : `${gutter}px`,
          left: `${gutter}px`,
          right: `${gutter}px`,
          height:
            visibleH !== null
              ? `${visibleH - gutter * 2}px`
              : `calc(100% - ${gutter * 2}px)`,
          display: "flex",
          // `row` follows dir, so RTL mirrors the split without row-reverse.
          flexDirection: "row",
          background: "#FFFFFF",
          borderRadius: gutter ? "24px" : "0px",
          overflow: "hidden",
          boxShadow: gutter ? "0 1px 4px rgba(22, 39, 77, 0.07)" : "none",
        }}
      >
        {/* ─── FORM SIDE ─── */}
        <div
          style={{
            flex: narrow ? "1 1 100%" : "0 0 42%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            padding: compact ? "20px 28px" : "clamp(28px, 3.4vw, 56px)",
            overflowY: "auto",
          }}
        >
          {/* Logo + language switch */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexShrink: 0,
            }}
          >
            <img
              src={careinnLogo}
              alt="CareInn"
              style={{ height: compact ? "26px" : "36px", width: "auto", display: "block" }}
            />
            <button
              type="button"
              className="gate-focusable"
              onClick={cycleLocale}
              lang={nextLocale}
              aria-label={t("gate.language")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: "none",
                padding: "8px",
                margin: "-8px",
                borderRadius: "8px",
                cursor: "pointer",
                color: NAVY,
                fontFamily:
                  nextLocale === "en" ? "'Mulish', 'Inter', sans-serif" : "'Almarai', sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <Globe size={19} strokeWidth={1.8} />
              <span>{LOCALE_NAME[nextLocale]}</span>
            </button>
          </div>

          {/* Form block — optically centred in whatever height is left over */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: compact ? "18px 0" : "28px 0",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                // Hugs the inline-start edge, level with the logo above it.
                marginInlineEnd: "auto",
                animation: f.shaking
                  ? "gateShake 0.5s ease-in-out"
                  : "gateFadeUp 0.5s ease-out both",
              }}
            >
              <h1
                style={{
                  color: NAVY,
                  fontSize: compact ? "32px" : "clamp(32px, 2.6vw, 50px)",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {t("gate.welcome")}
              </h1>

              <p
                style={{
                  color: MUTED,
                  fontSize: compact ? "15px" : "clamp(15px, 1vw, 18px)",
                  fontWeight: 500,
                  lineHeight: 1.5,
                  margin: "10px 0 0",
                }}
              >
                {t("gate.subtitle")}
              </p>

              <form onSubmit={f.handleSubmit} style={{ marginTop: compact ? "22px" : "38px" }}>
                <label
                  htmlFor="gate-access-code"
                  style={{
                    display: "block",
                    color: NAVY,
                    fontSize: "15px",
                    fontWeight: 700,
                    marginBottom: "10px",
                  }}
                >
                  {t("gate.fieldLabel")}
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: `${control}px`,
                    background: f.error ? "#FEF2F2" : FIELD_BG,
                    border: `1.5px solid ${fieldBorder}`,
                    borderRadius: "12px",
                    transition:
                      "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
                    boxShadow: f.error
                      ? `0 0 0 3px ${DANGER}26`
                      : f.isFocused
                      ? `0 0 0 3px ${BLUE}40`
                      : "none",
                  }}
                >
                  <input
                    id="gate-access-code"
                    ref={f.inputRef}
                    className="gate-password-input"
                    type={f.showPassword ? "text" : "password"}
                    value={f.password}
                    onChange={f.handleChange}
                    onFocus={() => f.setIsFocused(true)}
                    onBlur={() => f.setIsFocused(false)}
                    placeholder={t("gate.placeholder")}
                    autoComplete="off"
                    aria-invalid={f.error}
                    aria-describedby={f.error ? "gate-access-error" : undefined}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: NAVY,
                      fontSize: "16px",
                      fontWeight: 500,
                      fontFamily: "inherit",
                      paddingInlineStart: "18px",
                      paddingInlineEnd: "4px",
                      // Only track the masked dots — tracking the placeholder
                      // too would crowd it.
                      letterSpacing: f.password && !f.showPassword ? "2px" : "0px",
                    }}
                  />
                  {/* Single visibility toggle — EyeOff = hidden, Eye = visible */}
                  <button
                    type="button"
                    className="gate-focusable"
                    onClick={() => f.setShowPassword(!f.showPassword)}
                    aria-label={f.showPassword ? t("gate.hideCode") : t("gate.showCode")}
                    aria-pressed={f.showPassword}
                    title={f.showPassword ? t("gate.hideCode") : t("gate.showCode")}
                    style={{
                      flexShrink: 0,
                      width: "46px",
                      height: "46px",
                      marginInlineEnd: "5px",
                      padding: 0,
                      background: "none",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: MUTED,
                    }}
                  >
                    {f.showPassword ? <Eye size={19} /> : <EyeOff size={19} />}
                  </button>
                </div>

                {/* Always-reserved slot, so the buttons below never shift when
                    an error appears. */}
                <div style={{ minHeight: "22px", paddingTop: "6px" }}>
                  {f.error && (
                    <p
                      id="gate-access-error"
                      role="alert"
                      style={{
                        color: DANGER,
                        fontSize: "13px",
                        fontWeight: 600,
                        margin: 0,
                        animation: "gateFadeIn 0.3s ease",
                      }}
                    >
                      {t("gate.error")}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="gate-focusable"
                  disabled={f.submitting}
                  style={{
                    width: "100%",
                    height: `${control}px`,
                    marginTop: compact ? "6px" : "10px",
                    border: "none",
                    borderRadius: "12px",
                    background: BLUE,
                    color: BLUE_ON,
                    fontSize: "17px",
                    fontWeight: 800,
                    fontFamily: "inherit",
                    letterSpacing: "0.2px",
                    cursor: f.submitting ? "progress" : "pointer",
                    opacity: f.submitting ? 0.65 : 1,
                    transition: "opacity 0.2s ease, filter 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!f.submitting) e.currentTarget.style.filter = "brightness(1.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  {f.submitting ? t("gate.signingIn") : t("gate.signIn")}
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    margin: compact ? "14px 0" : "20px 0",
                  }}
                >
                  <span style={{ flex: 1, height: "1px", background: LINE }} />
                  <span style={{ color: MUTED, fontSize: "14px", fontWeight: 500 }}>
                    {t("gate.or")}
                  </span>
                  <span style={{ flex: 1, height: "1px", background: LINE }} />
                </div>

                <button
                  type="button"
                  className="gate-focusable"
                  onClick={f.handleGuest}
                  style={{
                    width: "100%",
                    height: `${control}px`,
                    background: "transparent",
                    border: `1.5px solid ${LINE}`,
                    borderRadius: "12px",
                    color: NAVY,
                    fontSize: "17px",
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = FIELD_BG;
                    e.currentTarget.style.borderColor = "#CBD5E1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = LINE;
                  }}
                >
                  {t("lock.guest.button")}
                </button>
              </form>
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              color: MUTED,
              fontSize: "13px",
              fontWeight: 500,
              opacity: compact ? 0 : 0.85,
              transition: "opacity 0.2s ease",
            }}
          >
            {t("gate.footer", new Date().getFullYear())}
          </div>
        </div>

        {/* ─── WALLPAPER SIDE ─── */}
        {!narrow && (
          <div style={{ flex: "1 1 58%", minWidth: 0 }}>
            <img
              src={careinnWallpaper}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      <GateStyles />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HOSPITAL GATE — a hospital that ships its own wallpaper
 * The wallpapers keep their subject to the right of centre, so the card sits
 * left rather than covering it.
 * ═══════════════════════════════════════════════════════════════════════════ */
function HospitalGate({ wallpaper }: { wallpaper: string }) {
  const f = useLoginForm();
  const { viewport, visibleH, compact } = useVisibleViewport();
  const [showSlideshow, setShowSlideshow] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Mulish', 'Inter', sans-serif",
        overflow: "hidden",
        transition: "opacity 0.5s ease",
        opacity: f.success ? 0 : 1,
        background: "#0A0F1D", // Deep fallback background
      }}
    >
      {/* ─── Full-bleed wallpaper ─── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <img
          src={wallpaper}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
      </div>

      {/* ─── Content Area ───
       * The card is centered via `margin: auto` on the child rather than
       * `alignItems: center`, so that when the viewport is too short the top of
       * the card stays reachable instead of being clipped by the scroll box.
       * Asymmetric padding (bottom > top) biases the centered card slightly
       * upward — optically centered, and it reserves bottom margin so the
       * Sign in / Continue as Guest buttons stay clear of the soft keyboard. */}
      <div
        style={{
          position: "absolute",
          top: viewport ? `${viewport.offsetTop}px` : 0,
          left: 0,
          right: 0,
          zIndex: 3,
          height: visibleH !== null ? `${visibleH}px` : "100%",
          display: "flex",
          justifyContent: "flex-start",
          // Vertical percentage padding resolves against WIDTH in CSS, so this
          // has to be computed rather than expressed as a %.
          padding:
            visibleH !== null
              ? `${Math.round(visibleH * (compact ? 0.03 : 0.05))}px 24px ${Math.round(
                  visibleH * (compact ? 0.04 : 0.075)
                )}px`
              : "5vh 24px 7.5vh",
          overflowY: "auto",
        }}
      >
        {/* ─── White Login Card ─── */}
        <div
          style={{
            width: "420px",
            flexShrink: 0,
            margin: "auto",
            background: "#FFFFFF",
            borderRadius: "20px",
            marginLeft: "clamp(32px, 7vw, 132px)",
            // Navy-tinted ambient shadow (calmer than pure black) + a soft
            // white top highlight so the card edge reads crisp on any wallpaper.
            boxShadow:
              "0 24px 60px rgba(15, 30, 55, 0.20), 0 2px 8px rgba(15, 30, 55, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.40)",
            padding: compact ? "28px 32px" : "48px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            animation: f.shaking ? "gateShake 0.5s ease-in-out" : "gateFadeUp 0.6s ease-out both",
          }}
        >
          <h1
            style={{
              color: HOSPITAL_NAVY,
              fontSize: "30px",
              fontWeight: 800,
              margin: compact ? "0 0 8px" : "0 0 12px",
              letterSpacing: "-0.5px",
              textAlign: "center",
            }}
          >
            Welcome!
          </h1>

          <p
            style={{
              color: INK_MUTED,
              fontSize: "14px",
              fontWeight: 600,
              margin: compact ? "0 0 22px" : "0 0 44px",
              textAlign: "center",
            }}
          >
            Please enter your access code to continue.
          </p>

          <div style={{ width: "100%" }}>
            <form onSubmit={f.handleSubmit} style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    border: `1.5px solid ${
                      f.error ? "#EF4444" : f.isFocused ? SKY : FIELD_LINE
                    }`,
                    borderRadius: "10px",
                    background: f.error ? "#FEF2F2" : "#FFFFFF",
                    transition:
                      "border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease",
                    boxShadow: f.error
                      ? "0 0 0 3px rgba(239, 68, 68, 0.25)"
                      : f.isFocused
                      ? `0 0 0 3px ${SKY}40`
                      : "none",
                  }}
                >
                  <input
                    ref={f.inputRef}
                    className="gate-password-input"
                    type={f.showPassword ? "text" : "password"}
                    value={f.password}
                    onChange={f.handleChange}
                    onFocus={() => f.setIsFocused(true)}
                    onBlur={() => f.setIsFocused(false)}
                    placeholder="Enter MRN, Access Code"
                    autoComplete="off"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: INK,
                      fontSize: "15px",
                      fontWeight: 500,
                      padding: "0 4px 0 16px",
                      height: "100%",
                      fontFamily: "inherit",
                      letterSpacing: f.password && !f.showPassword ? "2px" : "0px",
                    }}
                  />
                  <button
                    type="button"
                    className="gate-focusable"
                    onClick={() => f.setShowPassword(!f.showPassword)}
                    aria-label={f.showPassword ? "Hide access code" : "Show access code"}
                    aria-pressed={f.showPassword}
                    title={f.showPassword ? "Hide access code" : "Show access code"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                      width: "44px",
                      height: "44px",
                      marginRight: "4px",
                      padding: 0,
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {f.showPassword ? (
                      <Eye size={18} color={INK_MUTED} />
                    ) : (
                      <EyeOff size={18} color={INK_MUTED} />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  className="gate-focusable"
                  disabled={f.submitting}
                  style={{
                    flexShrink: 0,
                    width: "100%",
                    height: "48px",
                    border: "none",
                    borderRadius: "10px",
                    background: `linear-gradient(135deg, ${SKY} 0%, #5BB8D6 100%)`,
                    color: "#FFFFFF",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: f.submitting ? "progress" : "pointer",
                    opacity: f.submitting ? 0.65 : 1,
                    fontFamily: "inherit",
                    letterSpacing: "0.5px",
                    transition: "transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease",
                    boxShadow: "0 2px 12px rgba(108, 196, 224, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    if (f.submitting) return;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(108, 196, 224, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 12px rgba(108, 196, 224, 0.3)";
                  }}
                >
                  Sign in
                </button>
              </div>

              {/* Error message — the always-reserved slot doubles as the gap
                  between the input row and Continue as Guest, so the spacing
                  holds at 22px whether or not an error is showing. */}
              <div style={{ minHeight: "22px" }}>
                {f.error && (
                  <p
                    role="alert"
                    style={{
                      color: "#FF6B6B",
                      fontSize: "13px",
                      fontWeight: 500,
                      margin: 0,
                      textAlign: "center",
                      animation: "gateFadeIn 0.3s ease",
                    }}
                  >
                    Invalid access code. Please try again.
                  </p>
                )}
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "12px", margin: "2px 0 14px" }}
              >
                <span style={{ flex: 1, height: "1px", background: FIELD_LINE }} />
                <span style={{ color: INK_MUTED, fontSize: "13px", fontWeight: 600 }}>or</span>
                <span style={{ flex: 1, height: "1px", background: FIELD_LINE }} />
              </div>

              {/* Secondary action — full width, outline treatment: no fill,
                  lighter weight, no shadow. */}
              <button
                type="button"
                className="gate-focusable"
                onClick={f.handleGuest}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "10px",
                  background: "transparent",
                  border: `1.5px solid ${GUEST_LINE}`,
                  color: GUEST_LINE,
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.3px",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(27, 126, 158, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Continue as Guest
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ─── Bottom Copyright Text ───
       * Anchored to the bottom of the VISIBLE band, and dropped entirely in
       * compact mode so it can never crowd the card when space is tight. */}
      <div
        style={{
          position: "absolute",
          top:
            viewport && visibleH !== null ? `${viewport.offsetTop + visibleH - 33}px` : undefined,
          bottom: viewport && visibleH !== null ? undefined : "20px",
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.4)",
          fontSize: "13px",
          fontWeight: 400,
          zIndex: 3,
          pointerEvents: "none",
          opacity: compact ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        Hospital Bedside Companion by CareInn &copy; {new Date().getFullYear()}
      </div>

      {/* ─── Welcome Slideshow Overlay ─── */}
      {showSlideshow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "#000",
            animation: "gateSlideshowIn 0.35s ease-out both",
          }}
        >
          <button
            onClick={() => setShowSlideshow(false)}
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              zIndex: 100001,
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255, 255, 255, 0.12)",
              color: "#FFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            }}
            title="Close Slideshow"
          >
            <X size={22} />
          </button>
          <iframe
            src="/CareInn%20Welcome%20Slideshow.html"
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="fullscreen"
            title="CareInn Welcome Slideshow"
          />
        </div>
      )}

      <GateStyles />
    </div>
  );
}

function GateStyles() {
  return (
    <style>{`
      /* Suppress Edge/Chromium's native password reveal + clear buttons —
         we render our own single eye toggle, and the built-ins duplicate it. */
      .gate-password-input::-ms-reveal,
      .gate-password-input::-ms-clear {
        display: none;
      }

      /* Keyboard focus stays visible on every control; pointer focus draws no
         ring, so touch use is unchanged. */
      .gate-focusable:focus-visible,
      .gate-password-input:focus-visible {
        outline: 3px solid rgba(78, 190, 227, 0.65);
        outline-offset: 2px;
      }

      @keyframes gateFadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes gateShake {
        0%, 100% { transform: translateX(0); }
        15% { transform: translateX(-8px); }
        30% { transform: translateX(6px); }
        45% { transform: translateX(-5px); }
        60% { transform: translateX(3px); }
        75% { transform: translateX(-2px); }
      }

      @keyframes gateFadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes gateSlideshowIn {
        from { opacity: 0; transform: scale(1.03); }
        to   { opacity: 1; transform: scale(1); }
      }
    `}</style>
  );
}
