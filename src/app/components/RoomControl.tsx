import { useState } from "react";
import { Sun, SunDim, Lightbulb, LightbulbOff, Wind, Snowflake, Thermometer, Power, Pause, ChevronUp, ChevronDown } from "lucide-react";
import { useTheme, WEIGHT, SHADOW, TEXT_STYLE, TYPE_SCALE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { InternalPageHeader } from "./InternalPageHeader";
import { ApiImage } from "./ApiImage";

type TabKey = "lights" | "curtains" | "ac";

/* ── Curtain SVGs ── */
function CurtainOpenIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 3h16" /><path d="M4 3v18" /><path d="M20 3v18" /><path d="M4 7c2 0 3 4 3 7" /><path d="M20 7c-2 0-3 4-3 7" />
  </svg>);
}
function CurtainClosedIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 3h16" /><path d="M4 3v18" /><path d="M20 3v18" /><path d="M8 3v18" /><path d="M12 3v18" /><path d="M16 3v18" />
  </svg>);
}
function AcIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="12" rx="3" /><path d="M6 20h12" /><path d="M8 16v4" /><path d="M16 16v4" /><path d="M6 10h12" /><path d="M9 13c1-1 2-1 3 0s2 1 3 0" />
  </svg>);
}

/* ── Toggle Switch ── */
function Toggle({ on, onToggle, accent, size = "normal" }: { on: boolean; onToggle: () => void; accent: string; size?: "normal" | "large" }) {
  const w = size === "large" ? 80 : 68;
  const h = size === "large" ? 44 : 38;
  const dot = size === "large" ? 36 : 30;
  const pad = size === "large" ? 4 : 4;
  return (
    <button onClick={onToggle} className="relative cursor-pointer active:scale-95 transition-all duration-200"
      style={{ width: `${w}px`, height: `${h}px`, borderRadius: `${h / 2}px`, backgroundColor: on ? accent : "rgba(120,120,140,0.3)", border: "none", outline: "none", boxShadow: on ? `0 0 18px ${accent}50` : "none" }}>
      <div className="absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-250"
        style={{ width: `${dot}px`, height: `${dot}px`, backgroundColor: "#fff", left: on ? `${w - dot - pad}px` : `${pad}px`, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }} />
    </button>
  );
}

/* ── Shared card pieces — one look across Lights, Curtains and Climate ── */

/* Every tappable tile: brand gradient when on, a white bordered card when off. */
function tileStyle(on: boolean, theme: any): React.CSSProperties {
  return {
    background: on ? `linear-gradient(145deg, ${theme.primary}, ${theme.primaryDark})` : theme.surface,
    border: on ? `1px solid transparent` : theme.borderCard,
    boxShadow: on ? `0 6px 24px ${theme.primary}35` : SHADOW.md,
  };
}

/* The panels that hold tiles (All Lights row, each curtain, Climate panels). */
function panelStyle(theme: any): React.CSSProperties {
  return { backgroundColor: theme.surface, borderRadius: theme.radiusXl, border: theme.borderCard, boxShadow: SHADOW.md };
}

function CardIconBox({ on, theme, children }: { on: boolean; theme: any; children: React.ReactNode }) {
  return (
    <div className="shrink-0 flex items-center justify-center" style={{
      width: "52px", height: "52px", borderRadius: theme.radiusMd,
      background: on ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})` : theme.primarySubtle,
      boxShadow: on ? `0 4px 16px ${theme.primary}30` : "none", transition: "all 0.3s",
    }}>
      {children}
    </div>
  );
}

function CardHeading({ title, sub, theme, fontFamily }: { title: string; sub: string; theme: any; fontFamily: string }) {
  return (
    <div>
      <p style={{ ...TEXT_STYLE.subtitle, fontFamily, color: theme.textHeading }}>{title}</p>
      <p style={{ ...TEXT_STYLE.caption, fontFamily, color: theme.textMuted, marginTop: 2 }}>{sub}</p>
    </div>
  );
}

function PanelLabel({ children, theme, fontFamily }: { children: React.ReactNode; theme: any; fontFamily: string }) {
  return (
    <p style={{ ...TEXT_STYLE.label, fontFamily, color: theme.textMuted, marginBottom: "14px" }}>{children}</p>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * LIGHTS TAB
 * ══════════════════════════════════════════════════════════════════════ */
function LightsTab({ theme, fontFamily, t }: { theme: any; fontFamily: string; t: any }) {
  const [zones, setZones] = useState([
    { id: "main", nameKey: "room.light.main", icon: Sun, on: true },
    { id: "bed", nameKey: "room.light.bedside", icon: SunDim, on: true },
    { id: "bathroom", nameKey: "room.light.bathroom", icon: Lightbulb, on: false },
    { id: "reading", nameKey: "room.light.reading", icon: SunDim, on: false },
  ]);
  const toggle = (id: string) => setZones(p => p.map(z => z.id === id ? { ...z, on: !z.on } : z));
  const allOn = zones.every(z => z.on);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Master Toggle */}
      <div style={{ ...panelStyle(theme), padding: "20px 28px" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardIconBox on={allOn} theme={theme}>
              {allOn ? <Sun size={26} color={theme.textInverse} /> : <LightbulbOff size={26} color={theme.primaryOn} />}
            </CardIconBox>
            <CardHeading title={t("room.light.allLights")} sub={`${zones.filter(z => z.on).length} / ${zones.length} ${t("room.active")}`} theme={theme} fontFamily={fontFamily} />
          </div>
          <Toggle on={allOn} accent={theme.primary} onToggle={() => setZones(p => p.map(z => ({ ...z, on: !allOn })))} />
        </div>
      </div>

      {/* Zone Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {zones.map(zone => {
          const Icon = zone.icon;
          return (
            <button key={zone.id} onClick={() => toggle(zone.id)}
              className="cursor-pointer active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-4"
              style={{
                borderRadius: theme.radiusXl, outline: "none",
                ...tileStyle(zone.on, theme),
                padding: "24px",
              }}>
              <div style={{
                width: "68px", height: "68px", borderRadius: theme.radiusFull,
                backgroundColor: zone.on ? "rgba(255,255,255,0.2)" : theme.primarySubtle,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={30} color={zone.on ? theme.textInverse : theme.primaryOn} />
              </div>
              <span style={{ ...TEXT_STYLE.subtitle, fontFamily, color: zone.on ? theme.textInverse : theme.textHeading }}>
                {t(zone.nameKey)}
              </span>
              <div style={{
                ...TEXT_STYLE.label, fontFamily,
                padding: "6px 24px", borderRadius: theme.radiusFull,
                backgroundColor: zone.on ? "rgba(255,255,255,0.2)" : theme.primarySubtle,
                color: zone.on ? theme.textInverse : theme.primaryOn,
              }}>{zone.on ? "ON" : "OFF"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * CURTAINS TAB — open / half / close
 * ══════════════════════════════════════════════════════════════════════ */
function CurtainsTab({ theme, fontFamily, t }: { theme: any; fontFamily: string; t: any }) {
  const [curtains, setCurtains] = useState([
    { id: "window", nameKey: "room.curtain.window", state: "open" as "open" | "half" | "closed" },
    { id: "privacy", nameKey: "room.curtain.privacy", state: "closed" as "open" | "half" | "closed" },
  ]);
  const setState = (id: string, state: "open" | "half" | "closed") =>
    setCurtains(p => p.map(c => c.id === id ? { ...c, state } : c));
  const actions = [
    { key: "open" as const, labelKey: "room.curtain.open", icon: <ChevronUp size={30} strokeWidth={2.5} /> },
    { key: "half" as const, labelKey: "room.curtain.half", icon: <Pause size={26} strokeWidth={2.5} /> },
    { key: "closed" as const, labelKey: "room.curtain.closed", icon: <ChevronDown size={30} strokeWidth={2.5} /> },
  ];

  return (
    <div className="flex flex-col gap-5 h-full">
      {curtains.map(curtain => (
        <div key={curtain.id} style={{
          ...panelStyle(theme),
          flex: 1, padding: "28px", display: "flex", flexDirection: "column",
        }}>
          <div className="flex items-center gap-4 mb-6">
            <CardIconBox on={curtain.state !== "closed"} theme={theme}>
              {curtain.state === "closed"
                ? <CurtainClosedIcon size={26} color={theme.primaryOn} />
                : <CurtainOpenIcon size={26} color={theme.textInverse} />}
            </CardIconBox>
            <CardHeading title={t(curtain.nameKey)} sub={t(`room.curtain.${curtain.state}`)} theme={theme} fontFamily={fontFamily} />
          </div>
          <div className="flex gap-4 flex-1 items-stretch">
            {actions.map(a => {
              const active = curtain.state === a.key;
              return (
                <button key={a.key} onClick={() => setState(curtain.id, a.key)}
                  className="flex-1 flex flex-col items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all"
                  style={{
                    ...tileStyle(active, theme),
                    borderRadius: theme.radiusLg, outline: "none", minHeight: "90px",
                    color: active ? theme.textInverse : theme.primaryOn,
                  }}>
                  {a.icon}
                  <span style={{ ...TEXT_STYLE.label, fontFamily, color: active ? theme.textInverse : theme.textHeading }}>{t(a.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * AC TAB — always visible, disabled when off
 * ══════════════════════════════════════════════════════════════════════ */
function AcTab({ theme, fontFamily, t }: { theme: any; fontFamily: string; t: any }) {
  const [acOn, setAcOn] = useState(true);
  const [temp, setTemp] = useState(22);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [mode, setMode] = useState<"cool" | "heat" | "fan">("cool");
  const modes = [
    { key: "cool" as const, labelKey: "room.ac.cool", icon: Snowflake },
    { key: "heat" as const, labelKey: "room.ac.heat", icon: Thermometer },
    { key: "fan" as const, labelKey: "room.ac.fan", icon: Wind },
  ];
  const fans = [
    { level: 1, labelKey: "room.ac.low" },
    { level: 2, labelKey: "room.ac.medium" },
    { level: 3, labelKey: "room.ac.high" },
  ];
  const dim = acOn ? 1 : 0.35;
  const stepButton: React.CSSProperties = {
    ...tileStyle(false, theme),
    width: "56px", height: "56px", borderRadius: theme.radiusFull, opacity: dim,
    outline: "none", fontSize: TYPE_SCALE.lg, color: theme.textHeading, fontWeight: WEIGHT.bold,
    pointerEvents: acOn ? "auto" : "none",
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left — Temperature */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ ...panelStyle(theme), padding: "32px" }}>
        {/* Temp Ring */}
        <div style={{ opacity: dim, transition: "opacity 0.3s", pointerEvents: acOn ? "auto" : "none" }}>
          <div style={{
            width: "220px", height: "220px", borderRadius: theme.radiusFull, padding: "5px",
            background: acOn
              ? `conic-gradient(${theme.primary} ${((temp - 16) / 14) * 100}%, ${theme.primarySubtle} 0%)`
              : theme.primarySubtle,
          }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: theme.radiusFull, backgroundColor: theme.surface,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily, fontSize: "58px", fontWeight: WEIGHT.bold, color: theme.textHeading, lineHeight: 1 }}>{temp}</span>
              <span style={{ ...TEXT_STYLE.body, fontFamily, color: theme.textMuted, marginTop: "4px" }}>°C</span>
            </div>
          </div>
        </div>

        {/* Power + Temp Buttons Row */}
        <div className="flex items-center gap-5 mt-7">
          <button onClick={() => acOn && setTemp(p => Math.max(16, p - 1))}
            className="cursor-pointer active:scale-90 transition-all flex items-center justify-center"
            style={stepButton}>−</button>

          {/* Big Power Button */}
          <button onClick={() => setAcOn(!acOn)}
            className="cursor-pointer active:scale-90 transition-all flex items-center justify-center"
            style={{
              ...tileStyle(acOn, theme),
              width: "72px", height: "72px", borderRadius: theme.radiusFull, outline: "none",
            }}>
            <Power size={28} color={acOn ? theme.textInverse : theme.primaryOn} />
          </button>

          <button onClick={() => acOn && setTemp(p => Math.min(30, p + 1))}
            className="cursor-pointer active:scale-90 transition-all flex items-center justify-center"
            style={stepButton}>+</button>
        </div>
      </div>

      {/* Right — Mode + Fan (always visible, dimmed when off) */}
      <div className="flex flex-col gap-5" style={{ width: "320px", opacity: dim, transition: "opacity 0.3s", pointerEvents: acOn ? "auto" : "none" }}>
        <div style={{ ...panelStyle(theme), flex: 1, padding: "24px" }}>
          <PanelLabel theme={theme} fontFamily={fontFamily}>{t("room.ac.mode")}</PanelLabel>
          <div className="flex flex-col gap-3">
            {modes.map(m => {
              const active = mode === m.key;
              const Icon = m.icon;
              return (
                <button key={m.key} onClick={() => setMode(m.key)}
                  className="flex items-center gap-4 cursor-pointer active:scale-[0.97] transition-all"
                  style={{
                    ...tileStyle(active, theme),
                    height: "58px", borderRadius: theme.radiusMd, paddingInline: "20px", outline: "none",
                  }}>
                  <Icon size={22} color={active ? theme.textInverse : theme.primaryOn} />
                  <span style={{ ...TEXT_STYLE.label, fontFamily, color: active ? theme.textInverse : theme.textHeading }}>
                    {t(m.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ ...panelStyle(theme), padding: "24px" }}>
          <PanelLabel theme={theme} fontFamily={fontFamily}>{t("room.ac.fanSpeed")}</PanelLabel>
          <div className="flex gap-3">
            {fans.map(f => {
              const active = fanSpeed === f.level;
              return (
                <button key={f.level} onClick={() => setFanSpeed(f.level)}
                  className="flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  style={{
                    ...tileStyle(active, theme),
                    height: "64px", borderRadius: theme.radiusMd, outline: "none",
                    color: active ? theme.textInverse : theme.primaryOn,
                  }}>
                  <Wind size={16} />
                  <span style={{ ...TEXT_STYLE.label, fontFamily, color: active ? theme.textInverse : theme.textHeading }}>{t(f.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * MAIN ROOM CONTROL
 * ══════════════════════════════════════════════════════════════════════ */
const TABS: { key: TabKey; labelKey: string; Icon: (p: { size?: number; color?: string }) => React.ReactNode }[] = [
  { key: "lights", labelKey: "room.tab.lights", Icon: Lightbulb },
  { key: "curtains", labelKey: "room.tab.curtains", Icon: CurtainOpenIcon },
  { key: "ac", labelKey: "room.tab.ac", Icon: AcIcon },
];

/* Same shell as Patient Services and Live TV: one large white card with the
   categories stacked in a rail down the leading edge. */
export function RoomControl({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, fontFamily, isRTL } = useLocale();
  const [activeTab, setActiveTab] = useState<TabKey>("lights");
  const activeLabelKey = TABS.find(tab => tab.key === activeTab)!.labelKey;

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden" dir={isRTL ? "rtl" : "ltr"}
      style={{ background: theme.pageGradientFlat, fontFamily, animation: "rcIn 0.25s ease-out" }}>
      <ApiImage
        src={theme.heroImageUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ opacity: 0.08, mixBlendMode: "luminosity", userSelect: "none" }}
      />
      <InternalPageHeader title={t("room.title")} icon={<AcIcon size={26} color="#fff" />} onClose={onClose} />

      <div className="flex-1 min-h-0 px-12 pt-2 pb-8 relative z-10 flex flex-col">
        <div
          className="flex-1 min-h-0 flex overflow-hidden"
          style={{
            backgroundColor: theme.surface,
            borderRadius: theme.radiusXl,
            boxShadow: SHADOW.xl,
            border: theme.cardBorder,
          }}
        >
          <nav
            className="shrink-0 flex flex-col gap-2 py-7 px-5"
            style={{
              width: 320,
              backgroundColor: theme.surfaceInset,
              borderInlineEnd: `1px solid ${theme.borderSubtle}`,
            }}
          >
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              const TIcon = tab.Icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-3 w-full cursor-pointer active:scale-[0.98] transition-transform"
                  style={{
                    minHeight: 64,
                    padding: "10px 14px",
                    borderRadius: theme.radiusMd,
                    backgroundColor: active ? theme.primary : "transparent",
                    border: "none",
                    outline: "none",
                    boxShadow: active ? SHADOW.md : "none",
                    textAlign: "start",
                  }}
                >
                  <span
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.radiusSm,
                      backgroundColor: active ? "rgba(255,255,255,0.18)" : theme.primarySubtle,
                    }}
                  >
                    <TIcon size={20} color={active ? theme.textInverse : theme.primaryOn} />
                  </span>
                  <span
                    className="flex-1 min-w-0"
                    style={{
                      ...TEXT_STYLE.buttonSm,
                      fontFamily,
                      color: active ? theme.textInverse : theme.textHeading,
                      lineHeight: 1.25,
                    }}
                  >
                    {t(tab.labelKey)}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto px-8 py-7 flex flex-col" style={{ scrollbarWidth: "none" }}>
            <h3 className="shrink-0 mb-5" style={{ ...TEXT_STYLE.pageTitle, fontFamily, color: theme.textHeading }}>
              {t(activeLabelKey)}
            </h3>
            <div className="flex-1 min-h-0">
              {activeTab === "lights" && <LightsTab theme={theme} fontFamily={fontFamily} t={t} />}
              {activeTab === "curtains" && <CurtainsTab theme={theme} fontFamily={fontFamily} t={t} />}
              {activeTab === "ac" && <AcTab theme={theme} fontFamily={fontFamily} t={t} />}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes rcIn { from { opacity:0; } to { opacity:1; } }`}</style>
    </div>
  );
}
