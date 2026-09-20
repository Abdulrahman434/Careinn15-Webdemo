import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
 * PASSWORD GATE — the only login screen
 * White login card on the left of a full-page hospital room wallpaper
 * ═══════════════════════════════════════════════════════════════════════════ */

import fakeehLoginBg from "../../assets/bg/login-background-fakeeh.png";

const SKY = "#6CC4E0";
const NAVY = "#1B2F5B";
const INK = "#16294A";
const INK_MUTED = "#5A6B82";
const FIELD_LINE = "#D5DDE7";
const GUEST_LINE = "#1B7E9E";

/* The gate renders before ThemeProvider, so there is no `theme` here. The last
   signed-in hospital is remembered in localStorage, which is enough to pick the
   right wallpaper; anything unknown falls back to the neutral CareInn one.

   Only the wallpaper varies. The card treatment below is the same on every
   screen — white card on the left, no scrim, no pan. There used to be a second
   "unbranded" look (frosted glass, centred, dark overlay) for any hospital
   without its own wallpaper, which meant a freshly cleared kiosk showed a login
   page nobody had signed off. */
const LOGIN_BACKGROUNDS: Record<string, string> = { dsfh: fakeehLoginBg };

function loginBackground(): string {
  try {
    return LOGIN_BACKGROUNDS[localStorage.getItem("active-hospital-id") || ""] || "/assets/bg/careinnbak.jpg";
  } catch {
    return "/assets/bg/careinnbak.jpg";
  }
}

export function PasswordGate() {
  const { login, loginAsGuest } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(timer);
  }, []);

  /* ── Keyboard-aware viewport ──
   * window.visualViewport reports the region actually visible to the user, and
   * it does so under BOTH Android soft-input modes:
   *   adjustResize — layout viewport shrinks too; height shrinks, offsetTop 0.
   *   adjustPan    — layout viewport is unchanged, so only the visual viewport
   *                  shrinks, and offsetTop moves as the window pans.
   * Driving the content area from it therefore keeps the field and both buttons
   * on screen without depending on how the native kiosk is configured.
   * Falls back to 100%/vh when the API is missing (pre-Chrome-61 WebViews). */
  const [viewport, setViewport] = useState<{ height: number; offsetTop: number } | null>(null);

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
  /* The roomy spacing needs ~432px of card plus breathing room. Below that the
   * card switches to a tighter rhythm rather than pushing controls off screen. */
  const compact = visibleH !== null && visibleH < 560;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    const valid = await login(password);
    if (!valid) {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
      setTimeout(() => setError(false), 3000);
    } else {
      setSuccess(true);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    setSuccess(true);
  };

  const bgUrl = loginBackground();

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
        opacity: success ? 0 : 1,
        background: "#0A0F1D", // Deep fallback background
      }}
    >
      {/* ─── Full-bleed wallpaper ─── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      >
        <img
          src={bgUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>

      {/* ─── Content Area ───
       * The card is centered via `margin: auto` on the child rather than
       * `alignItems: center`, so that when the viewport is too short the top of
       * the card stays reachable instead of being clipped by the scroll box.
       * Asymmetric padding (bottom > top) biases the centered card slightly
       * upward — optically centered, and it reserves bottom margin so the
       * Sign in / Continue as Guest buttons stay clear of the soft keyboard.
       * The bias is proportional to the visible height, so it holds across
       * screen sizes and while the keyboard is open. */}
      <div
        style={{
          position: "absolute",
          top: viewport ? `${viewport.offsetTop}px` : 0,
          left: 0,
          right: 0,
          zIndex: 3,
          // Pinned to the visible band, so the card centers in what the user can
          // actually see rather than in the full (possibly occluded) viewport.
          height: visibleH !== null ? `${visibleH}px` : "100%",
          display: "flex",
          // The wallpapers keep their subject to the right of centre, so the
          // card sits left rather than covering it.
          justifyContent: "flex-start",
          // Same 5% / 7.5% proportions as before, but measured against the
          // visible height. Vertical percentage padding resolves against WIDTH
          // in CSS, so this has to be computed rather than expressed as a %.
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
            animation: shaking ? "shakeForm 0.5s ease-in-out" : "fadeSlideUp 0.6s ease-out both",
          }}
        >
          {/* Title group */}
          <h1
            style={{
              color: NAVY,
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

          {/* Form wrapper */}
          <div style={{ width: "100%" }}>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              {/* Access code + Sign in share one row: the field flexes, the CTA
                  is docked to its right at a fixed width. */}
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
                    border: `1.5px solid ${error ? "#EF4444" : isFocused ? SKY : FIELD_LINE}`,
                    borderRadius: "10px",
                    background: error ? "#FEF2F2" : "#FFFFFF",
                    transition: "border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease",
                    boxShadow: error ? "0 0 0 3px rgba(239, 68, 68, 0.25)" : isFocused ? `0 0 0 3px ${SKY}40` : "none",
                  }}
                >
                  <input
                    ref={inputRef}
                    className="pg-password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(false);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
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
                      // Only track the masked dots — tracking the placeholder too
                      // overflows it now that the field shares its row with the CTA.
                      letterSpacing: password && !showPassword ? "2px" : "0px",
                    }}
                  />
                  {/* Single password visibility toggle — Eye = hidden, EyeOff = visible */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide access code" : "Show access code"}
                    aria-pressed={showPassword}
                    title={showPassword ? "Hide access code" : "Show access code"}
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
                    {showPassword ? (
                      <EyeOff size={18} color={INK_MUTED} />
                    ) : (
                      <Eye size={18} color={INK_MUTED} />
                    )}
                  </button>
                </div>

                {/* Primary CTA — docked to the right of the field */}
                <button
                  type="submit"
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
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.5px",
                    transition: "transform 0.15s ease, box-shadow 0.2s ease",
                    boxShadow: "0 2px 12px rgba(108, 196, 224, 0.3)",
                  }}
                  onMouseEnter={(e) => {
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
                {error && (
                  <p
                    style={{
                      color: "#FF6B6B",
                      fontSize: "13px",
                      fontWeight: 500,
                      margin: 0,
                      textAlign: "center",
                      animation: "fadeIn 0.3s ease",
                    }}
                  >
                    Invalid access code. Please try again.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "2px 0 14px" }}>
                <span style={{ flex: 1, height: "1px", background: FIELD_LINE }} />
                <span style={{ color: INK_MUTED, fontSize: "13px", fontWeight: 600 }}>or</span>
                <span style={{ flex: 1, height: "1px", background: FIELD_LINE }} />
              </div>

              {/* Secondary action — full width, outline treatment: no fill,
                  lighter weight, no shadow. */}
              <button
                type="button"
                onClick={handleGuest}
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
                  e.currentTarget.style.borderColor = GUEST_LINE;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = GUEST_LINE;
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
            viewport && visibleH !== null
              ? `${viewport.offsetTop + visibleH - 33}px`
              : undefined,
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
            animation: "slideshowIn 0.35s ease-out both",
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
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)"; }}
            title="Close Slideshow"
          >
            <X size={22} />
          </button>
          <iframe
            src="/CareInn%20Welcome%20Slideshow.html"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            allow="fullscreen"
            title="CareInn Welcome Slideshow"
          />
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        /* Suppress Edge/Chromium's native password reveal + clear buttons —
           we render our own single eye toggle, and the built-ins duplicate it. */
        .pg-password-input::-ms-reveal,
        .pg-password-input::-ms-clear {
          display: none;
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shakeForm {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideshowIn {
          from { opacity: 0; transform: scale(1.03); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
