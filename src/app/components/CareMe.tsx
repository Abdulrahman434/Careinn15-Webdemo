import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, LEADING, primaryRgba, TEXT_STYLE, SPACE } from "./ThemeContext";
import { ApiImage } from "./ApiImage";
import { useLocale, type Locale } from "./i18n";
import { useNurseStore, type SectionKey } from "./NurseDataStore";
import { useAuth } from "./AuthContext";
import {
  PREFS_SAVED_EVENT, clearPreferenceRecord, preferenceAppName, preferenceSummaryRows,
  readPreferenceRecord, setCarePartnerAnswer, type PreferenceSummaryRow,
} from "./PatientPreferenceForm";
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal,
  Heart,
  Users,
  ClipboardList,
  Apple,
  AlertTriangle,
  Baby,
  LogOut,
  LogIn,
  CheckCircle2,
  Check,
  Clock,
  Video,
  Circle,
  CalendarDays,
  Maximize2,
  Minimize2,
  X,
  DoorOpen,
  Phone,
  Hash,
  Activity,
  Shield,
  Venus,
  Mars,
  Utensils,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  FlaskConical,
  Image as ImageIcon,
  FileText,
  CreditCard,
  Receipt,
  Wallet,
  IdCard,
  User,
  ShieldCheck,
  Stethoscope,
  Droplet,
  Thermometer,
  Wind,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Sparkles,
  Lock,
  Gauge,
  HeartPulse,
  Frown,
  RotateCcw,
  ClipboardCheck,
  MessageCircleQuestion,
  Pencil,
  CirclePlus,
  UserRound,
  BedDouble,
  ContactRound,
  Pill,
  PersonStanding,
  ShieldAlert,
  Target,
  HeartHandshake,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  readCarePartner, writeCarePartner, clearCarePartner, adoptLegacyCarePartner,
  CARE_PARTNER_EVENT, EMPTY_CARE_PARTNER,
  type CarePartnerRecord,
} from "./carePartnerStore";
import { CarePartnerAgreement } from "./CarePartnerAgreement";
import { SIGNATURE_PAPER, SIGNATURE_PAPER_LINE } from "./nurse/SignaturePad";
import { InternalPageHeader } from "./InternalPageHeader";
import { CareMePinDialog } from "./CareMePinDialog";
import { PinKeypad } from "./MyAccountDialog";
import { PIN_METRICS } from "./pinMetrics";
import { isAccountSet, setAccount } from "../lib/accountAuth";
import svgPaths from "../../imports/svg-ca68x68c4i";

/* ─── Assets ─── */
import imgNuraAlRashid from "@/assets/a7907a91bbdb1ced8824b3333ece109b3cd92b62.png";
import imgDrOmarAbdulhalim from "@/assets/2318867853acb678569427c88b9e543e22bd46b6.png";
import imgBabyCam from "@/assets/68ba9ba13c5aa1cc7d2af5bee7bc955298b612dd.png";
import imgDallahBabyCam from "@/assets/dallah-baby-cam.jpg";
import imgCareMedBabyCam from "@/assets/CareMedicalHospital.jpeg";
import imgCareInnBabyCam from "@/assets/careinn-baby-cam.jpg";
import imgFakeehBabyCam from "@/assets/fakeeh-baby-cam.jpg";

const careTeam = [
  { nameKey: "care.team.name.nura", roleKey: "care.team.primaryNurse", specialtyKey: "care.team.specialty.icu", img: imgNuraAlRashid },
  { nameKey: "care.team.name.omar", roleKey: "care.team.attendingDoctor", specialtyKey: "care.team.specialty.cardiology", img: imgDrOmarAbdulhalim },
];

const carePlan = [
  { labelKey: "care.plan.initialAssessment", time: "Done", timeKey: "care.plan.done", done: true, day: 1 },
  { labelKey: "care.plan.labTests", time: "Done", timeKey: "care.plan.done", done: true, day: 1 },
  { labelKey: "care.plan.scansImaging", time: "Done", timeKey: "care.plan.done", done: true, day: 1 },
  { labelKey: "care.plan.medicationPrep", time: "Done", timeKey: "care.plan.done", done: true, day: 1 },
  { labelKey: "care.plan.laborMonitoring", minutes: 45, done: false, active: true, day: 1 },
  { labelKey: "care.plan.delivery", minutes: 120, done: false, day: 2 },
  { labelKey: "care.plan.recoveryObservation", minutes: 60, done: false, day: 3 },
  { labelKey: "care.plan.motherBabyCheck", minutes: 30, done: false, day: 4 },
];

/** Maps patientDiet store values → human-readable display labels */
const DIET_DISPLAY_LABELS: Record<string, string> = {
  regular:        "Regular",
  diabetic:       "Diabetic",
  "low-sodium":   "Low Sodium",
  "low-potassium":"Low Potassium",
  "soft-diet":    "Soft Diet",
  chemotherapy:   "Chemotherapy",
  ob:             "OB Patients",
  kids:           "Kids Menu",
  npo:            "NPO / Fasting",
  // Legacy aliases (backward-compat for any cached state)
  soft:           "Soft Diet",
  chemo:          "Chemotherapy",
};

const allergies = [
  { nameKey: "care.allergy.penicillin" },
  { nameKey: "care.allergy.latex" },
  { nameKey: "care.allergy.shellfish" },
];

const dischargePlan = [
  { labelKey: "care.discharge.finalCheck", time: "Done", timeKey: "care.plan.done", done: true },
  { labelKey: "care.discharge.medicationPrep", time: "Done", timeKey: "care.plan.done", done: true },
  { labelKey: "care.discharge.education", minutes: 45, done: false, active: true },
  { labelKey: "care.discharge.homeCare", minutes: 20, done: false },
  { labelKey: "care.discharge.followup", minutes: 15, done: false },
  { labelKey: "care.discharge.billing", minutes: 30, done: false },
  { labelKey: "care.discharge.docsReady", minutes: 25, done: false },
  { labelKey: "care.discharge.confirm", minutes: 10, done: false },
];

/* ─── Slide Definitions ─── */
interface SlideConfig {
  key: string;
  title: string;
  titleKey: string;
  icon: typeof Heart;
}

/* Read in the order the stay is lived: who the patient is, how they are being
   cared for, what they want from that care, the plan, the numbers behind it,
   what is being investigated, and finally going home. */
const ALL_SLIDES: SlideConfig[] = [
  { key: "profile", title: "Patient Profile", titleKey: "care.profile.title", icon: IdCard },
  { key: "overview", title: "Care Overview", titleKey: "care.overview.title", icon: Activity },
  { key: "preferences", title: "Person-Centered Care", titleKey: "care.pcc.title", icon: HeartHandshake },
  { key: "plan", title: "My Care Plan", titleKey: "care.plan.title", icon: ClipboardList },
  { key: "observations", title: "Vital Signs", titleKey: "care.observations.title", icon: Activity },
  { key: "tests", title: "Tests and Procedures", titleKey: "care.tests.title", icon: ClipboardCheck },
  { key: "discharge", title: "Discharge Process", titleKey: "care.discharge.title", icon: LogOut },
  { key: "dischargePlan", title: "Discharge Plan", titleKey: "care.dischargePlan.title", icon: FileText },
];

/** Map CareMe slide keys → NurseDataStore SectionKey. Tests & Procedures has
 *  no key of its own: it is governed by `labs` and `imaging` together, and
 *  drops out only when the nurse has hidden both. */
const SLIDE_TO_SECTION: Record<string, SectionKey> = {
  profile: "profile",
  overview: "careOverview",
  plan: "carePlan",
  discharge: "discharge",
  dischargePlan: "dischargePlan",
  observations: "observations",
};

/** True when a slide should be offered to the patient. */
function slideVisible(key: string, visibility: Record<SectionKey, boolean>): boolean {
  if (key === "tests") return visibility.labs !== false || visibility.imaging !== false;
  const section = SLIDE_TO_SECTION[key];
  return section ? visibility[section] !== false : true;
}


/* ═══════════════════════════════════════════════════════════════════════════
 * Shared card system
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every CareMe card is ONE rounded container: icon, title, header actions and
 * content sit on a single continuous surface (`theme.surface` — white in light
 * mode, the dark card surface in dark mode), separated by spacing plus one
 * hairline rule. No detached title pills, no header boxes, no tinted strips.
 *
 * The brand reaches a card only through accents — the header icon chip,
 * buttons, badges — never through the card surface itself, so the same
 * geometry reads correctly on every hospital config.
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * CareMe type and space system
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Two densities, because there are two real contexts: an expanded column is a
 * quarter of a 1920px screen, the carousel card on the home screen is about a
 * third of that. The SAME role takes a different step in each — that is what
 * keeps both readable. Equivalent elements match; they are not all flattened
 * to one size.
 */
const CARD_PAD = {
  headerSlide: "22px 22px 12px",
  headerExpanded: "20px 22px 18px",
  /* The panels inside carry the real inset; the body only frames them. The
     bottom value is the largest so content never sits on the card's edge. */
  bodySlide: "12px 22px 20px",
  bodyExpanded: "20px 18px 24px",
} as const;

/** The card header's icon chip — the one boxed glyph on a card. Everything
 *  inside the body is a line icon at the density's own size. */
const ICON_BOX = {
  cardHeader: { slide: 36, expanded: 42 },
} as const;

type Tone = "brand" | "danger" | "warning" | "success" | "info" | "neutral";

/**
 * Type roles per density — the sizes CareMe has always used, taken from the
 * committed version rather than re-derived. They sit outside TYPE_SCALE on
 * purpose: this card set was drawn to these steps, and rounding them onto the
 * scale is what made it feel wrong.
 */
function roles(isExpanded: boolean) {
  return {
    /** Card title in the expanded column. */
    title: { fontSize: isExpanded ? "20px" : "17.5px", fontWeight: WEIGHT.bold, lineHeight: 1.4, letterSpacing: "0.2px" },
    /** Heading on a panel. */
    heading: { fontSize: isExpanded ? "17px" : "15.5px", fontWeight: WEIGHT.bold, lineHeight: 1.3, letterSpacing: "0.2px" },
    /** The answer half of a label/value pair. */
    value: { fontSize: isExpanded ? "16px" : "15px", fontWeight: WEIGHT.bold, lineHeight: 1.2 },
    /** A person's name, and anything that carries a row. */
    name: { fontSize: isExpanded ? "18px" : "17px", fontWeight: WEIGHT.bold, lineHeight: 1.3 },
    /** Sentences and instructions. */
    body: { fontSize: isExpanded ? "16px" : "15.5px", fontWeight: WEIGHT.normal, lineHeight: 1.5 },
    /** The label above a value, a date, a timestamp. */
    label: { fontSize: isExpanded ? "16px" : "14.5px", fontWeight: WEIGHT.normal, lineHeight: 1.2 },
    /** The label on a detail row, which sits beside a badge rather than above
     *  a sentence. Deliberately a step under the badge it names, so the answer
     *  reads first and the label second. */
    cellLabel: { fontSize: isExpanded ? "13.5px" : "12.5px", fontWeight: WEIGHT.normal, lineHeight: 1.2 },
    /** Small print inside a reading tile. */
    tileLabel: { fontSize: isExpanded ? "13px" : "13px", fontWeight: WEIGHT.medium, lineHeight: 1.25 },
    /** An observation reading. */
    metric: isExpanded ? "30px" : "26px",
    /** Patient identity. */
    identity: { fontSize: isExpanded ? "18px" : "17px", fontWeight: WEIGHT.bold, lineHeight: 1.4 },
  };
}

/** A colour at an alpha, whatever notation the theme handed us. */
function withAlpha(color: string, a: number): string {
  const c = (color || "").trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map(x => x + x).join("") : hex[1];
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const rgb = c.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(",").map(v => parseFloat(v));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return c;
}

/** Tone → (tint background, contrast-safe foreground). Clinical status tones
 *  stay independent of the brand palette; only "brand" follows the config. */
function toneColors(theme: any, tone: Tone) {
  switch (tone) {
    case "danger": return { bg: theme.errorSubtle, fg: theme.errorOn };
    case "warning": return { bg: theme.warningSubtle, fg: theme.warningOn };
    case "success": return { bg: theme.successSubtle, fg: theme.successOn };
    case "info": return { bg: theme.infoSubtle, fg: theme.infoOn };
    case "neutral": return { bg: theme.surfaceInset, fg: theme.textMuted };
    default: return { bg: theme.primarySubtle, fg: theme.primaryOn };
  }
}

/** A line icon labelling a line of text. No container: the tinted square is
 *  kept for the card header, where the icon IS the card's mark. */
function LineIcon({
  icon: Icon, theme, tone = "brand", isExpanded = false, size,
}: {
  icon: React.ComponentType<any>; theme: any; tone?: Tone;
  isExpanded?: boolean; size?: number;
}) {
  return (
    <Icon
      size={size ?? (isExpanded ? 20 : 18)}
      strokeWidth={2}
      style={{ color: toneColors(theme, tone).fg, flexShrink: 0 }}
    />
  );
}

/** The card header's glyph, in its subtle square. */
function CardIcon({
  icon: Icon, theme, tone = "brand", circle = false, size = 36, glyph, stroke = 2,
}: {
  icon: React.ComponentType<any>; theme: any; tone?: Tone;
  circle?: boolean; size?: number; glyph?: number; stroke?: number;
}) {
  const { bg, fg } = toneColors(theme, tone);
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: `${size}px`, height: `${size}px`,
        borderRadius: circle ? theme.radiusFull : theme.radiusMd,
        backgroundColor: bg,
      }}
    >
      <Icon size={glyph ?? Math.round(size * 0.5)} strokeWidth={stroke} style={{ color: fg }} />
    </div>
  );
}

/** Short status or value. Content-sized and wrapping with its siblings —
 *  never used for a sentence. */
function CardBadge({
  theme, tone = "brand", isExpanded = false, children,
}: {
  theme: any; tone?: Tone; isExpanded?: boolean; children: React.ReactNode;
}) {
  const { bg, fg } = toneColors(theme, tone);
  return (
    <span
      className="inline-flex items-center gap-1.5 shrink-0"
      style={{
        backgroundColor: bg,
        border: `1px solid ${withAlpha(fg, 0.25)}`,
        borderRadius: theme.radiusSm,
        padding: isExpanded ? "4px 11px" : "3px 9px",
        fontFamily: theme.fontFamily,
        fontSize: isExpanded ? "14px" : "13.5px",
        fontWeight: WEIGHT.bold,
        lineHeight: 1.2,
        color: fg,
      }}
    >
      {children}
    </span>
  );
}

/** The one call-to-action shape in CareMe: same corner, same height, same
 *  type, at each density. Returned as a style so the results gate — whose
 *  whole panel is already a button — can wear it on a span without nesting
 *  one button inside another. */
function ctaStyle(theme: any, isExpanded: boolean): React.CSSProperties {
  return {
    minHeight: isExpanded ? "48px" : "44px",
    padding: `0 ${isExpanded ? "24px" : "20px"}`,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.primary,
    border: "none",
    outline: "none",
  };
}

function CardButton({
  theme, isExpanded = false, onClick, icon: Icon, label, block = false,
}: {
  theme: any; isExpanded?: boolean; onClick?: () => void;
  icon?: React.ComponentType<any>; label: string; block?: boolean;
}) {
  return (
    <button
      data-nav="true"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform ${block ? "w-full" : ""}`}
      style={ctaStyle(theme, isExpanded)}
    >
      {Icon && <Icon size={isExpanded ? 19 : 18} style={{ color: theme.brandOnPrimary }} />}
      <span
        style={{
          fontFamily: theme.fontFamily, ...roles(isExpanded).value,
          color: theme.brandOnPrimary, lineHeight: LEADING.none,
        }}
      >
        {label}
      </span>
    </button>
  );
}

/** The shape every empty or gated state takes: one disc, a title, a line of
 *  explanation, and — where the state has a single way out — the action.
 *  Same order and the same offset from the top of the body on every card, so
 *  swiping between two empty cards does not move the content around. */
function CardEmptyState({
  theme, isExpanded = false, icon, title, description, action,
}: {
  theme: any; isExpanded?: boolean; icon: React.ComponentType<any>;
  title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{
        gap: isExpanded ? "14px" : "12px",
        paddingTop: isExpanded ? "44px" : "32px",
        paddingBottom: "8px",
      }}
    >
      <CardIcon
        icon={icon}
        theme={theme}
        circle
        size={isExpanded ? 72 : 62}
        glyph={isExpanded ? 32 : 28}
      />
      <span style={{ fontFamily: theme.fontFamily, ...roles(isExpanded).title, color: theme.textHeading }}>
        {title}
      </span>
      {description && (
        <p
          style={{
            fontFamily: theme.fontFamily, ...roles(isExpanded).body,
            color: theme.textMuted, maxWidth: "320px",
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "4px" }}>{action}</div>}
    </div>
  );
}

/** A row of badges. */
function BadgeRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

/** A control with a comfortable hit area and a glyph that stays its own size. */
function TapTarget({
  onClick, label, children, theme, style, size = 40,
}: {
  onClick: () => void; label: string; children: React.ReactNode;
  theme: any; style?: React.CSSProperties; size?: number;
}) {
  return (
    <button
      data-nav="true"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
      style={{
        width: `${size}px`, height: `${size}px`,
        borderRadius: theme.radiusMd, background: "none", border: "none",
        outline: "none", padding: 0, ...style,
      }}
    >
      {children}
    </button>
  );
}

/**
 * The unified CareMe card. Header and body share one surface and one set of
 * outer corners; the header stays put while the body scrolls.
 */
function CareMeCard({
  theme, icon, title, actions, children, isExpanded = false, bodyClassName = "", style,
}: {
  theme: any;
  icon?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
  bodyClassName?: string;
  style?: React.CSSProperties;
}) {
  const { dir } = useLocale();
  return (
    <div
      className="flex flex-col min-h-0 overflow-hidden"
      style={{
        backgroundColor: theme.surface,
        borderRadius: theme.radiusXl,
        border: theme.cardBorder,
        boxShadow: isExpanded ? SHADOW.xl : SHADOW.md,
        ...style,
      }}
    >
      <div
        dir={dir}
        className="flex items-center gap-3 shrink-0"
        style={{
          padding: isExpanded ? CARD_PAD.headerExpanded : CARD_PAD.headerSlide,
          borderBottom: `1px solid ${theme.borderSubtle}`,
        }}
      >
        {icon}
        <span
          className="flex-1 min-w-0"
          style={{
            fontFamily: theme.fontFamily, ...roles(isExpanded).title,
            color: theme.textHeading, overflowWrap: "anywhere",
          }}
        >
          {title}
        </span>
        {actions}
      </div>

      <div
        dir={dir}
        className={`flex-1 min-h-0 overflow-y-auto careme-scroll ${bodyClassName}`}
        style={{ padding: isExpanded ? CARD_PAD.bodyExpanded : CARD_PAD.bodySlide }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── A panel inside a card ────────────────────────────────────────────────
 * The inset surface CareMe has always used to group a block of related facts.
 * Panels are separated by space rather than a rule; `tone` tints one where the
 * colour carries meaning — the emergency contact, a safety alert. */
function Section({
  children, theme, isExpanded = false, icon, title, actions, tone,
  first = false, bare = false, bg, padding, style, className = "", ...rest
}: any) {
  return (
    <div
      className={className}
      {...rest}
      style={{
        width: "100%",
        ...(bare ? null : {
          backgroundColor: bg || (tone ? toneColors(theme, tone).bg : theme.surfaceInset),
          border: theme.borderInset,
          borderRadius: theme.radiusLg,
          padding: padding || (isExpanded ? "20px" : "14px"),
        }),
        marginTop: first ? 0 : "16px",
        ...style,
      }}
    >
      {!!title && (
        <div
          className="flex items-center gap-2.5"
          style={{
            paddingBottom: isExpanded ? "12px" : "10px",
            marginBottom: isExpanded ? "14px" : "12px",
            borderBottom: `1px solid ${theme.borderSubtle}`,
          }}
        >
          {icon && (
            <CardIcon
              icon={icon}
              theme={theme}
              tone={tone || "brand"}
              circle
              size={isExpanded ? 34 : 30}
              glyph={isExpanded ? 17 : 15}
            />
          )}
          <span
            className="flex-1 min-w-0"
            style={{
              fontFamily: theme.fontFamily, ...roles(isExpanded).heading,
              color: tone === "danger" ? theme.errorOn : theme.primaryOn,
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </span>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}


/** The BCP-47 tag a date or time is formatted with.
 *
 *  "ar-SA" is what gives an Arabic patient a Hijri date, which is the calendar
 *  the rest of the app already shows them — the meal-ordering screen has been
 *  doing this all along. Passing [] here, as this card used to, formatted
 *  against the BROWSER's locale instead: an Arabic screen showed
 *  "Jul 07, 2026" while the meal screen next to it said "٧ ربيع الآخر". */
function dateLocale(locale: Locale): string {
  return locale === "ar" ? "ar-SA" : locale === "ur" ? "ur-PK" : "en-US";
}

/** The gap between a label and the thing it names.
 *
 *  Every stacked label/value pair on this screen — a detail row, a profile
 *  field, a care-team member, a discharge heading — sat at 2px, which read as
 *  one clump rather than a heading with something under it. Named so the
 *  pairs cannot drift apart from each other again. Deliberately small: this
 *  is the space inside a pair, not between rows. */
const LABEL_GAP = "5px";

/** Latin/numeric values — dates, record numbers, phone numbers, room/bed —
 *  keep their own direction so Arabic and Urdu do not reorder them. */
function Ltr({ children, nowrap = false }: { children: React.ReactNode; nowrap?: boolean }) {
  return (
    <span
      dir="ltr"
      style={{ unicodeBidi: "isolate", display: "inline-block", whiteSpace: nowrap ? "nowrap" : undefined }}
    >
      {children}
    </span>
  );
}

/** One line of advice: a bullet and a sentence at body weight. Wrapped lines
 *  align with the first line of TEXT, not under the bullet. */
function InstructionRow({
  theme, text, tone = "brand", isExpanded = false,
}: {
  theme: any; text: string; tone?: Tone; isExpanded?: boolean;
}) {
  const { fg } = toneColors(theme, tone);
  const size = isExpanded ? TYPE_SCALE.base : TYPE_SCALE.sm;
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="shrink-0 rounded-full"
        style={{
          width: "6px", height: "6px", backgroundColor: fg,
          /* Centred on the first line, whatever the sentence wraps to. */
          marginTop: `calc((${size} * ${LEADING.normal} - 6px) / 2)`,
        }}
      />
      <span
        dir="auto"
        className="min-w-0"
        style={{
          fontFamily: theme.fontFamily, ...roles(isExpanded).body,
          color: theme.textBody, overflowWrap: "anywhere",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** A bullet list. */
function Bullets({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

/** Small label over its value, with an optional line icon beside the pair. */
function DetailCell({
  icon, theme, label, value, tone = "brand", labelTone, isExpanded = false,
}: {
  icon?: React.ComponentType<any>; theme: any; label: string;
  value: React.ReactNode; tone?: Tone; labelTone?: Tone; isExpanded?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 min-w-0">
      {icon && (
        <CardIcon
          icon={icon}
          theme={theme}
          tone={tone}
          circle
          size={isExpanded ? 40 : 36}
          glyph={isExpanded ? 18 : 14}
          stroke={2.5}
        />
      )}
      <div className="flex flex-col min-w-0" style={{ gap: LABEL_GAP }}>
        <span
          style={{
            fontFamily: theme.fontFamily, ...roles(isExpanded).cellLabel,
            color: labelTone ? toneColors(theme, labelTone).fg : theme.textMuted,
            ...(labelTone ? { fontWeight: WEIGHT.bold } : null),
          }}
        >
          {label}
        </span>
        {value}
      </div>
    </div>
  );
}

/** The value half of a DetailCell when it is plain text. */
function CellValue({ theme, isExpanded = false, children }: {
  theme: any; isExpanded?: boolean; children: React.ReactNode;
}) {
  return (
    <span
      dir="auto"
      style={{
        fontFamily: theme.fontFamily, ...roles(isExpanded).value,
        color: theme.textHeading, overflowWrap: "anywhere",
      }}
    >
      {children}
    </span>
  );
}

/** Label on the reading edge, value on the far one. For short pairs that line
 *  up as a table — the emergency contact. */
function LabelValueRow({
  theme, label, value, icon, isExpanded = false,
}: {
  theme: any; label: string; value: React.ReactNode;
  icon?: React.ComponentType<any>; isExpanded?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 min-w-0">
      <span
        className="shrink-0"
        style={{ fontFamily: theme.fontFamily, ...roles(isExpanded).label, color: theme.textMuted }}
      >
        {label}
      </span>
      <span className="flex items-center gap-2 min-w-0">
        {icon && <LineIcon icon={icon} theme={theme} isExpanded={isExpanded} />}
        <span
          dir="auto"
          className="min-w-0"
          style={{
            fontFamily: theme.fontFamily, ...roles(isExpanded).value,
            color: theme.textHeading, overflowWrap: "anywhere",
          }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

/** Label over value with a line icon — the one row shape used for every field
 *  that is not in a grid. */
function FieldRow({
  icon, theme, label, value, tone = "brand", isExpanded = false,
}: {
  icon: React.ComponentType<any>; theme: any; label: string;
  value: React.ReactNode; tone?: Tone; isExpanded?: boolean;
}) {
  return (
    <DetailCell
      icon={icon}
      theme={theme}
      label={label}
      tone={tone}
      isExpanded={isExpanded}
      value={<CellValue theme={theme} isExpanded={isExpanded}>{value}</CellValue>}
    />
  );
}

/* ─── Patient Profile Slide (Identity Hub) ─── */
function GendersIcon({ size = 14, style }: { size?: number, style?: any }) {
  const color = style?.color || "currentColor";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute top-[-2px] left-[-2px]">
        <Venus size={size - 2} style={{ color }} strokeWidth={2.5} />
      </div>
      <div className="absolute bottom-[-1px] right-[-1px]">
        <Mars size={size - 2} style={{ color }} strokeWidth={2.5} />
      </div>
    </div>
  );
}

export function calculateAge(dobStr?: string, fallbackAge?: string): number {
  if (!dobStr || !dobStr.trim()) {
    return Number(fallbackAge) || 0;
  }
  const s = dobStr.trim();
  let birthDate: Date | null = null;
  if (/^\d{8}$/.test(s)) {
    const y = parseInt(s.substring(0, 4), 10);
    const m = parseInt(s.substring(4, 6), 10) - 1;
    const d = parseInt(s.substring(6, 8), 10);
    birthDate = new Date(y, m, d);
  } else {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      birthDate = parsed;
    }
  }

  if (!birthDate || isNaN(birthDate.getTime())) {
    return Number(fallbackAge) || 0;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : (Number(fallbackAge) || 0);
}

function HisEmptyStateSection({
  theme,
  title,
  description,
  onCheckDemo,
  isExpanded = false,
}: {
  theme: any;
  title?: string;
  description?: string;
  onCheckDemo: () => void;
  isExpanded?: boolean;
}) {
  const { t } = useLocale();
  return (
    <CardEmptyState
      theme={theme}
      isExpanded={isExpanded}
      icon={Sparkles}
      title={title || t("care.his.noInfo")}
      description={description || t("care.his.noInfoSub")}
      action={
        <CardButton
          theme={theme}
          isExpanded={isExpanded}
          onClick={onCheckDemo}
          icon={Sparkles}
          label={t("care.his.checkDemo")}
        />
      }
    />
  );
}

function DemoBannerHeader({
  theme,
  onCloseDemo,
}: {
  theme: any;
  onCloseDemo: () => void;
}) {
  const { t } = useLocale();
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 mb-3 border shrink-0"
      style={{
        borderRadius: theme.radiusMd,
        backgroundColor: theme.primarySubtle,
        borderColor: theme.borderCardColor,
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={14} style={{ color: theme.primaryOn }} />
        <span style={{ fontFamily: theme.fontFamily, ...TEXT_STYLE.pill, color: theme.primaryOn }}>
          {t("care.his.demoBadge")}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCloseDemo();
        }}
        data-nav="true"
        className="px-2.5 py-1 transition-all active:scale-95 cursor-pointer"
        style={{
          borderRadius: theme.radiusSm,
          backgroundColor: theme.surface,
          color: theme.textMuted,
          border: theme.borderCard,
          fontFamily: theme.fontFamily,
          ...TEXT_STYLE.pill,
        }}
      >
        {t("care.his.hideDemo")}
      </button>
    </div>
  );
}

function PatientProfileSlide({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const R = roles(isExpanded);
  const { t, isRTL, localizeNumber } = useLocale();
  const nurseStore = useNurseStore();
  const p = nurseStore.patient;
  const [showDemoEmergency, setShowDemoEmergency] = useState(false);

  const calculatedAge = useMemo(() => {
    return calculateAge(p.dob, p.age);
  }, [p.dob, p.age]);

  const hasHisEmergency = nurseStore.isHisConnected ? !!nurseStore.hisSections?.emergency : true;
  
  const infoRow = (
    icon: React.ComponentType<any>, label: string, val: React.ReactNode, tone: Tone = "brand"
  ) => (
    <FieldRow icon={icon} theme={theme} label={label} value={val} tone={tone} isExpanded={isExpanded} />
  );

  /* The one row that names the person, or the person to call: a SOLID disc
     rather than a tint, so it leads the panel it sits on. */
  const leadRow = (icon: React.ComponentType<any>, label: string, val: React.ReactNode, tone: Tone = "brand") => {
    const Icon = icon;
    const fill = tone === "danger" ? theme.error : theme.primary;
    const on = tone === "danger" ? theme.onError : theme.brandOnPrimary;
    const d = isExpanded ? 40 : 36;
    return (
      <div className="flex items-start gap-4 min-w-0">
        <div
          className="rounded-full flex items-center justify-center shrink-0"
          style={{ width: `${d}px`, height: `${d}px`, backgroundColor: fill }}
        >
          <Icon size={isExpanded ? 18 : 16} style={{ color: on }} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0 pt-0.5">
          <span style={{ fontFamily: theme.fontFamily, ...R.label, color: theme.textMuted }}>{label}</span>
          <span
            dir="auto"
            style={{
              fontFamily: theme.fontFamily, ...R.identity,
              color: theme.textHeading, overflowWrap: "anywhere", marginTop: LABEL_GAP,
            }}
          >
            {val}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Identity & clinical grid. The admission date now heads My Care Plan,
          where it belongs next to the steps it started. */}
      <Section theme={theme} isExpanded={isExpanded} first>
        <div className="flex flex-col gap-5">
          {leadRow(User, t("care.fullName"), isRTL && p.nameAr ? p.nameAr : (p.nameKey ? t(p.nameKey) : p.name))}

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {infoRow(Hash, t("greeting.mrn"), <Ltr nowrap>{p.mrn}</Ltr>)}
            {infoRow(Shield, t("care.insurance"), t("care.insurance.tawuniya"))}
            {infoRow(CalendarDays, t("care.age"), t("care.ageUnits", localizeNumber(calculatedAge)))}
            {infoRow(GendersIcon, t("care.gender"), p.sex ? t(`care.gender.${p.sex.toLowerCase() === 'm' ? 'male' : (p.sex.toLowerCase() === 'f' ? 'female' : p.sex.toLowerCase())}`) : t("care.gender.female"))}
            {/* No forced LTR: the fallback is a translated date, and pinning an
                Arabic one left-to-right moves its month. */}
            {infoRow(Clock, t("care.dob"), p.dob || t("care.birthDateVal"))}
            {infoRow(DoorOpen, t("care.room") + " / " + t("care.bed"), <Ltr nowrap>{`${p.room} / ${p.bed || 'A'}`}</Ltr>)}
          </div>
        </div>
      </Section>

      {/* Module 3: Emergency Contact */}
      {nurseStore.isHisConnected && !hasHisEmergency && !showDemoEmergency ? (
        <HisEmptyStateSection
          theme={theme}
          isExpanded={isExpanded}
          title={t("care.his.noInfo")}
          description={t("care.his.noInfoSub")}
          onCheckDemo={() => setShowDemoEmergency(true)}
        />
      ) : (
        <Section theme={theme} isExpanded={isExpanded} tone="danger" className="mt-auto">
          {nurseStore.isHisConnected && !hasHisEmergency && showDemoEmergency && (
            <DemoBannerHeader theme={theme} onCloseDemo={() => setShowDemoEmergency(false)} />
          )}
          <div className="flex flex-col gap-5">
            {leadRow(User, t("care.emergencyContact"), t("care.emergencyName").split(' (')[0], "danger")}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {infoRow(Phone, t("care.mobile"), <Ltr nowrap>{p.contact}</Ltr>, "danger")}
              {infoRow(Heart, t("care.relative"), p.emergencyName.split('(')[1]?.replace(')', '') || "Mother", "danger")}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

/* ─── Care Overview Slide (Clinical Status) ─── */
function CareOverviewSlide({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const R = roles(isExpanded);
  const { t } = useLocale();
  const nurseStore = useNurseStore();
  const [showDemo, setShowDemo] = useState(false);
  const storeAllergies = nurseStore.allergies;
  const patientDietLabel = DIET_DISPLAY_LABELS[nurseStore.patientDiet] || nurseStore.patientDiet;
  const isNpo = nurseStore.patientDiet === "npo";
  
  const hasHisData = nurseStore.isHisConnected ? !!nurseStore.hisSections?.careOverview : true;

  if (nurseStore.isHisConnected && !hasHisData && !showDemo) {
    return (
      <HisEmptyStateSection isExpanded={isExpanded}
        theme={theme}
                onCheckDemo={() => setShowDemo(true)}
      />
    );
  }

  const alerts = nurseStore.alerts;
  const fallRiskLabel = alerts.fallRisk ? t(`care.fallRisk.${alerts.fallRisk}`) : "";
  /* Which precaution, not that there is one: "Contact" or "Droplet" tells a
     visitor at the door what to do, where "Isolation" only says to ask. Falls
     back to the plain word if the ward has not picked a type yet. */
  const isolationTypeLabel = alerts.isolationType
    ? t(`care.isolation.type.${alerts.isolationType.toLowerCase()}`)
    : t("care.alert.isolation");
  const hasAllergies = storeAllergies.length > 0;

  /* Every block below the care team is conditional on the ward having entered
     it. A heading with nothing under it is worse than no heading: it tells the
     patient a rule applies and then does not say what it is. */
  const showAlertBar = alerts.similarName || alerts.isolation;

  return (
    <div className="flex flex-col">
      {nurseStore.isHisConnected && !hasHisData && showDemo && (
        <DemoBannerHeader theme={theme} onCloseDemo={() => setShowDemo(false)} />
      )}

      {/* What is in force right now, at the top and in two words each. The
          name alert says only THAT it applies — the other patient it guards
          against is in a different bed and is none of this screen's business.
          Both tones are clinical, not brand: amber for a check-before-you-act
          caution, blue for a precaution in effect. */}
      {/* Care team */}
      <Section isExpanded={isExpanded}
        theme={theme}
                first
        icon={Users}
        title={t("care.team.title")}
      >
        <div className="flex flex-col gap-6">
          {nurseStore.careTeam.filter(m => m.visible).map((m, i) => (
            <div key={m.id || i} className="flex items-center gap-4 min-w-0">
              <div
                className="overflow-hidden shrink-0 shadow-sm"
                style={{
                  width: isExpanded ? "52px" : "40px",
                  height: isExpanded ? "52px" : "40px",
                  borderRadius: theme.radiusFull,
                  border: `1px solid ${theme.borderCardColor}`,
                }}
              >
                <ApiImage src={m.img} alt={t(m.nameKey)} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col min-w-0">
                <span style={{ fontFamily: theme.fontFamily, ...R.label, color: theme.primaryOn, fontWeight: WEIGHT.bold }}>
                  {t(m.roleKey)}
                </span>
                <span
                  style={{
                    fontFamily: theme.fontFamily, ...R.name,
                    color: theme.textHeading, overflowWrap: "anywhere", marginTop: LABEL_GAP,
                  }}
                >
                  {t(m.nameKey)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Care details — the three facts a visitor or a relief nurse checks
          first, side by side. Every tone here is clinical rather than brand:
          NPO is a restriction, a fall risk is a risk, and allergies are read
          in red on every ward in the world. */}
      {/* Stethoscope, not the fork and knife: this block covers diet, fall
          risk and allergies, and the diet row below already owns that glyph. */}
      <Section isExpanded={isExpanded} theme={theme} icon={Stethoscope} title={t("care.overview.details")}>
        {/* The badges are the tallest thing in each row, so the gap has to
            clear them rather than the label above them — at 12px the rows
            read as one block. */}
        <div className="flex flex-col" style={{ gap: isExpanded ? "22px" : "18px" }}>
          <div className="grid grid-cols-2" style={{ columnGap: isExpanded ? "24px" : "16px", rowGap: isExpanded ? "22px" : "18px" }}>
            <DetailCell
              isExpanded={isExpanded}
              icon={Utensils}
              theme={theme}
                            tone={isNpo ? "danger" : "brand"}
              label={t("care.diet.title")}
              value={
                <CardBadge isExpanded={isExpanded} theme={theme} tone={isNpo ? "danger" : "brand"}>
                  {patientDietLabel}
                </CardBadge>
              }
            />
            {fallRiskLabel && (
              <DetailCell isExpanded={isExpanded}
                icon={PersonStanding}
                theme={theme}
                                tone="brand"
                label={t("care.fallRisk")}
                /* Brand-toned whatever the level: the ward reads the word,
                   and a red chip here competed with the allergy chips. */
                value={
                  <CardBadge isExpanded={isExpanded} theme={theme} tone="brand">{fallRiskLabel}</CardBadge>
                }
              />
            )}
          </div>

          {/* What is in force right now. The name alert says only THAT it
              applies — the other patient it guards against is in a different
              bed and is none of this screen's business. Both tones are
              clinical, not brand. */}
          {showAlertBar && (
            <DetailCell
              icon={ShieldAlert}
              theme={theme}
              isExpanded={isExpanded}
              label={t("care.safety.title")}
              value={
                <BadgeRow>
                  {alerts.similarName && (
                    <CardBadge theme={theme} isExpanded={isExpanded} tone="warning">
                      <Users size={14} />
                      {t("care.alert.nameAlert")}
                    </CardBadge>
                  )}
                  {alerts.isolation && (
                    <CardBadge theme={theme} isExpanded={isExpanded} tone="info">
                      <Shield size={14} />
                      {isolationTypeLabel}
                    </CardBadge>
                  )}
                </BadgeRow>
              }
            />
          )}

          {/* The warning glyph appears only when there is something to warn
              about — "No known allergies" is reassurance, not an alert. */}
          <DetailCell isExpanded={isExpanded}
            icon={hasAllergies ? AlertTriangle : undefined}
            theme={theme}
                        tone="danger"
            label={t("care.allergies")}
            value={
              hasAllergies ? (
                <BadgeRow>
                  {storeAllergies.map(a => (
                    <CardBadge isExpanded={isExpanded} key={a} theme={theme} tone="danger">{a}</CardBadge>
                  ))}
                </BadgeRow>
              ) : (
                <CardBadge isExpanded={isExpanded} theme={theme} tone="neutral">
                  {t("care.allergies.none")}
                </CardBadge>
              )
            }
          />
        </div>
      </Section>
    </div>
  );
}

/* ─── My Care Plan ───
 * The step list, headed by the date the patient came in — the mirror of the
 * discharge card, which is headed by the date they are expected to leave. */
function CarePlanSlide({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const { t } = useLocale();
  const nurseStore = useNurseStore();

  return (
    <div className="flex flex-col gap-3">
      {/* Admission date — the exact mirror of the discharge date on its own
          card: a row with a rule under it, not a panel. */}
      {nurseStore.patient.admissionDate && (
        <div style={{ paddingBottom: "12px", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <FieldRow
            icon={CalendarDays}
            theme={theme}
            isExpanded={isExpanded}
            label={t("care.admitted")}
            value={<Ltr nowrap>{nurseStore.patient.admissionDate}</Ltr>}
          />
        </div>
      )}

      <TimelineSlide items={nurseStore.carePlan} theme={theme} isExpanded={isExpanded} type="care" />
    </div>
  );
}

/* ─── Discharge Process Slide ───
 * The step list, headed by the date the patient is expected to leave. What
 * they leave WITH is its own section — see DischargePlanSlide. */
function DischargeSlide({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const { t } = useLocale();
  const nurseStore = useNurseStore();

  return (
    <div className="flex flex-col gap-3">
      {/* Expected discharge date — moved off the patient profile. It heads the
          step list rather than sitting in a panel of its own. */}
      {nurseStore.patient.dischargeDate && (
        <div style={{ paddingBottom: "12px", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <FieldRow isExpanded={isExpanded}
            icon={CalendarDays}
            theme={theme}
            label={t("care.discharge")}
            value={<Ltr nowrap>{nurseStore.patient.dischargeDate}</Ltr>}
                      />
        </div>
      )}

      <TimelineSlide items={nurseStore.dischargePlan} theme={theme} isExpanded={isExpanded} type="discharge" />
    </div>
  );
}

/* ─── Discharge Plan Slide ───
 * What the patient goes home with: where to come back to, who to call, and
 * what to do. Label sits over value rather than beside it — at the width of
 * the inline carousel card a two-column row puts a wrapped clinic name next
 * to a phone number and both become unreadable. Stacking costs a line and
 * buys legibility from a bed. */
function DischargePlanSlide({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const R = roles(isExpanded);
  const { t } = useLocale();
  const nurseStore = useNurseStore();
  const info = nurseStore.dischargeInfo;
  
  /* One fact per row: the label the patient scans for, the detail under it.
     Spacing separates them, not a rule — the hairlines belong between the
     sections, and a line under every pair turned three facts into a form. */
  const row = (key: string, heading: string, detail: React.ReactNode, first: boolean) => (
    <div
      key={key}
      className="flex flex-col"
      style={{ gap: LABEL_GAP, marginTop: first ? 0 : (isExpanded ? "14px" : "12px") }}
    >
      <span
        dir="auto"
        style={{ fontFamily: theme.fontFamily, ...R.label, color: theme.textMuted, overflowWrap: "anywhere" }}
      >
        {heading}
      </span>
      {detail}
    </div>
  );

  const value = (text: React.ReactNode, ltr = false) => (
    <span
      style={{
        fontFamily: theme.fontFamily, ...R.value, color: theme.textHeading,
        overflowWrap: "anywhere",
      }}
    >
      {ltr ? <Ltr>{text}</Ltr> : text}
    </span>
  );

  /* Built as a list so the hairline lands between whichever blocks the ward
     actually filled in — either can be absent. */
  const blocks = [
    info.followUps.length > 0 && {
      key: "followUps", icon: CalendarDays, title: t("care.discharge.followUps"),
      body: info.followUps.map((f, i) => row(`${f.label}-${i}`, f.label, value(f.when, true), i === 0)),
    },
    info.contacts.length > 0 && {
      key: "contacts", icon: Phone, title: t("care.discharge.contacts"),
      body: info.contacts.map((c, i) => row(`${c.label}-${i}`, c.label, value(c.value, true), i === 0)),
    },
  ].filter(Boolean) as { key: string; icon: any; title: string; body: React.ReactNode }[];

  return (
    <div className="flex flex-col">
      {blocks.map((b, i) => (
        <Section isExpanded={isExpanded}
          key={b.key}
          theme={theme}
                    first={i === 0}
          icon={b.icon}
          title={b.title}
        >
          {b.body}
        </Section>
      ))}
    </div>
  );
}

/* ─── Slide Renders ─── */

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function shiftDay(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + delta);
  return next;
}

function CareTeamSlide({ theme }: { theme: any }) {
  return <PatientProfileSlide theme={theme} />;
}

function TimelineSlide({
  items: rawItems,
  theme,
  completedLabel,
  isExpanded = false,
  type = "care",
}: {
  items: any[];
  theme: any;
  completedLabel?: string;
  isExpanded?: boolean;
  type?: "care" | "discharge";
}) {
  const R = roles(isExpanded);
  const { t, isRTL } = useLocale();
  const store = useNurseStore();
  const [showDemo, setShowDemo] = useState(false);
  
  const sectionKey = type === "care" ? "carePlan" : "discharge";
  const hasHisData = store.isHisConnected ? !!store.hisSections?.[sectionKey] : true;

  const toISO = (d: Date) => d.toISOString().split("T")[0];
  const mode = store.carePlanMode;
  
  // Initialize from nurse view, otherwise use today as default
  const [patientDate, setPatientDate] = useState<string>(store.carePlanSelectedDate || toISO(new Date()));
  const selectedDate = new Date(patientDate);

  // Sync with nurse view changes
  useEffect(() => {
    if (store.carePlanSelectedDate) {
      setPatientDate(store.carePlanSelectedDate);
    }
  }, [store.carePlanSelectedDate]);

  if (store.isHisConnected && !hasHisData && !showDemo) {
    return (
      <HisEmptyStateSection isExpanded={isExpanded}
        theme={theme}
                onCheckDemo={() => setShowDemo(true)}
      />
    );
  }

  const today = new Date();
  const yesterday = shiftDay(today, -1);
  const tomorrow = shiftDay(today, 1);

  const dateFormatted = selectedDate.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  let prefix = "";
  if (isSameDay(selectedDate, today)) prefix = t("careplan.today") || "Today";
  else if (isSameDay(selectedDate, yesterday)) prefix = t("careplan.yesterday") || "Yesterday";
  else if (isSameDay(selectedDate, tomorrow)) prefix = t("careplan.tomorrow") || "Tomorrow";

  const dateLabel = prefix ? `${prefix} · ${dateFormatted}` : dateFormatted;

  /* Every step, in order. The plan covers the whole stay, so slicing it by
     day hid most of it behind a date picker the patient had to work. */
  const items = rawItems;

  /* No panel around the steps: the card already is the container, and a
     second rounded surface inside it only repeated the same edge. The date
     strip is separated from the list by a hairline instead. */
  return (
    <div className="flex flex-col gap-2">
      {store.isHisConnected && !hasHisData && showDemo && (
        <DemoBannerHeader theme={theme} onCloseDemo={() => setShowDemo(false)} />
      )}
      <div className="flex flex-col gap-0">
        {/* Timeline Items */}
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center gap-3">
             <CardIcon icon={ClipboardList} theme={theme} circle size={64} glyph={28} />
             <div>
                <h4 style={{ fontFamily: theme.fontFamily, ...R.heading, color: theme.textHeading }}>
                  {type === "care" ? t("careplan.emptyHeader") : t("discharge.emptyHeader")}
                </h4>
                <p style={{ fontFamily: theme.fontFamily, ...R.label, color: theme.textMuted, maxWidth: "240px", margin: "8px auto 0" }}>
                  {type === "care" ? t("careplan.emptyDesc") : t("discharge.emptyDesc")}
                </p>
             </div>
          </div>
        ) : items.map((step, i) => {
          const hasConnector = i < items.length - 1;
          const hasPrev = i > 0;
          return (
            <div
              key={step.id || step.labelKey || i}
              className="flex items-center gap-3 relative"
              style={{ minHeight: isExpanded ? "58px" : "50px" }}
            >
              {/* Top half connector */}
              {hasPrev && (
                <div
                  className="absolute z-0"
                  style={{
                    insetInlineStart: "11px",
                    top: 0,
                    height: "50%",
                    width: "2px",
                    backgroundColor: items[i - 1].done ? theme.success : theme.borderDefault,
                  }}
                />
              )}
              {/* Bottom half connector */}
              {hasConnector && (
                <div
                  className="absolute z-0"
                  style={{
                    insetInlineStart: "11px",
                    top: "50%",
                    height: "50%",
                    width: "2px",
                    backgroundColor: step.done ? theme.success : theme.borderDefault,
                  }}
                />
              )}
              {/* Timeline icon */}
              <div
                className="shrink-0 flex items-center justify-center relative z-[1]"
                /* Opaque so it masks the connector where the line crosses it —
                   the card body and the engagement surface are both `surface`. */
                style={{ width: "24px", height: "24px", backgroundColor: theme.surface, borderRadius: theme.radiusFull }}
              >
                {step.done ? (
                  <CheckCircle2 size={18} style={{ color: theme.successOn }} />
                ) : step.active ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.brandOnPrimary }} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full" style={{ border: `2px solid ${theme.borderDefault}`, backgroundColor: theme.surface }} />
                )}
              </div>
              {/* Content row */}
              <div
                className="flex-1 flex items-center justify-between gap-2 min-w-0"
                style={{
                  /* The step in progress reads as a block, not a pill: squarer
                     corners and more room than the steps around it. */
                  borderRadius: theme.radiusMd,
                  backgroundColor: step.active ? theme.primarySubtle : "transparent",
                  border: `1px solid ${step.active ? theme.borderCardColor : "transparent"}`,
                  paddingTop: step.active ? (isExpanded ? "18px" : "15px") : (isExpanded ? "12px" : "10px"),
                  paddingBottom: step.active ? (isExpanded ? "18px" : "15px") : (isExpanded ? "12px" : "10px"),
                  paddingLeft: isExpanded ? "16px" : "14px",
                  paddingRight: isExpanded ? "16px" : "14px",
                  transition: "all 0.3s ease",
                  boxShadow: step.active ? SHADOW.sm : "none"
                }}
              >
                <span
                  className="min-w-0"
                  style={{
                    fontFamily: theme.fontFamily,
                    ...(step.active ? R.value : R.body),
                    color: step.active ? theme.primaryOn : theme.textHeading,
                    overflowWrap: "anywhere",
                  }}
                >
                  {isRTL && step.labelAr ? step.labelAr : (step.label || (step.labelKey ? t(step.labelKey) : ""))}
                </span>
                {/* Status and duration were dropped from both plans: the
                    timeline marker already carries progress, and a predicted
                    "45 min" on a ward step reads as a promise nobody made.
                    The day label survives — it groups, it does not estimate. */}
                {type === "care" && mode === "overall" && (
                  step.active ? (
                    <CardBadge isExpanded={isExpanded} theme={theme}>{`${t("careplan.dayLabel")} ${step.day || 1}`}</CardBadge>
                  ) : (
                    <span
                      className="shrink-0"
                      style={{
                        fontFamily: theme.fontFamily, ...R.label,
                        color: theme.textMuted, padding: "3px 10px",
                      }}
                    >
                      {`${t("careplan.dayLabel")} ${step.day || 1}`}
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DietSlide({ theme }: { theme: any }) {
  const R = roles(true);
  const nurseStore = useNurseStore();
  const dietLabel = DIET_DISPLAY_LABELS[nurseStore.patientDiet] || nurseStore.patientDiet;
  const isNpo = nurseStore.patientDiet === "npo";
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: isNpo ? "#EF444415" : theme.primarySubtle, border: `1px solid ${isNpo ? "#EF444420" : theme.borderCardColor}`, borderRadius: theme.radiusLg }}
      >
        <div
          className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{ backgroundColor: isNpo ? "#EF444420" : theme.primarySubtle, borderRadius: theme.radiusMd }}
        >
          <Utensils size={18} style={{ color: isNpo ? "#EF4444" : theme.primaryOn }} />
        </div>
        <span style={{ fontFamily: theme.fontFamily, ...R.heading, color: isNpo ? "#EF4444" : theme.textHeading, fontSize: "16px", fontWeight: WEIGHT.bold }}>{dietLabel}</span>
      </div>
    </div>
  );
}

function AllergySlide() {
  const R = roles(true);
  const { theme } = useTheme();
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-2">
      {allergies.map((a) => (
        <div
          key={a.nameKey}
          className="flex items-center gap-4 px-4 py-3"
          style={{ backgroundColor: theme.errorSubtle, border: `1px solid ${theme.errorSubtle}`, borderRadius: theme.radiusLg }}
        >
          <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: theme.errorSubtle, borderRadius: theme.radiusMd }}>
            <AlertTriangle size={18} style={{ color: theme.errorOn }} />
          </div>
          <span style={{ fontFamily: theme.fontFamily, ...R.body, color: theme.errorOn }}>{t(a.nameKey)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Results PIN gate (Lab Results, Scans & Imaging) ───
 * Results are the slides that carry a diagnosis, and the bedside screen
 * sits in a room that visitors, cleaners and porters walk through. The gate
 * reuses the account PIN the kiosk already has; where the patient never set
 * one, it offers to set it here rather than sending them to Settings.
 *
 * The unlock lasts as long as the slide is mounted — leaving CareMe re-locks
 * it, which is the point: the next person to touch the screen is often not
 * the patient. */
/* Labs, scans and procedures now sit on one card and unlock together — the
   gate protects the card, and splitting it would ask the patient for the same
   PIN three times to read one page. */
const RESULTS_UNLOCK_EVENT = "careinn-results-unlocked";
const RESULTS_LOCK_EVENT = "careinn-results-locked";

/** How long the card stays open after the patient closes a report.
 *
 *  The bed is in a room that visitors, cleaners and porters walk through, and
 *  a patient who has just put a result down is the most likely moment for the
 *  screen to be left unattended. One minute is long enough to open a second
 *  report without re-entering the PIN, and short enough that walking away
 *  closes the door behind them. */
const RESULTS_RELOCK_MS = 60_000;

/** Both the inline card and the expanded view render these slides, so lock and
 *  unlock are broadcast rather than held in one of them — otherwise the two
 *  copies of the card would disagree about whether results are visible. */
function useResultsUnlock(section: "tests") {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    const open = (e: Event) => {
      if ((e as CustomEvent).detail === section) setUnlocked(true);
    };
    const close = (e: Event) => {
      if ((e as CustomEvent).detail === section) setUnlocked(false);
    };
    window.addEventListener(RESULTS_UNLOCK_EVENT, open);
    window.addEventListener(RESULTS_LOCK_EVENT, close);
    return () => {
      window.removeEventListener(RESULTS_UNLOCK_EVENT, open);
      window.removeEventListener(RESULTS_LOCK_EVENT, close);
    };
  }, [section]);
  const unlock = useCallback(
    () => window.dispatchEvent(new CustomEvent(RESULTS_UNLOCK_EVENT, { detail: section })),
    [section],
  );
  const lock = useCallback(
    () => window.dispatchEvent(new CustomEvent(RESULTS_LOCK_EVENT, { detail: section })),
    [section],
  );
  return { unlocked, unlock, lock };
}

function ResultsPinGate({ theme, isExpanded = false, titleKey, onUnlock }: {
  theme: any; isExpanded?: boolean; titleKey: string; onUnlock: () => void;
}) {
  const R = roles(isExpanded);
  const { t, fontFamily } = useLocale();
  const [dialog, setDialog] = useState<"verify" | "create" | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [stage, setStage] = useState<"first" | "confirm">("first");
  const [error, setError] = useState(false);

  const open = () => setDialog(isAccountSet() ? "verify" : "create");

  const handleCreate = async (entered: string) => {
    if (stage === "first") {
      setNewPin(entered);
      setConfirmPin("");
      setStage("confirm");
      return;
    }
    if (entered !== newPin) {
      setError(true);
      setConfirmPin("");
      setTimeout(() => setError(false), 900);
      return;
    }
    await setAccount(entered, null);
    setDialog(null);
    onUnlock();
  };

  return (
    <>
      {/* No panel: this state fills the card, so a second rounded surface
          inside it only drew the same edge twice. */}
      <button
        onClick={open}
        className="flex flex-col items-center justify-center gap-3 w-full h-full cursor-pointer active:scale-[0.99] transition-transform"
        style={{
          background: "none", border: "none",
          padding: isExpanded ? "48px 24px" : "32px 12px",
          outline: "none",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: isExpanded ? "72px" : "56px",
            height: isExpanded ? "72px" : "56px",
            borderRadius: theme.radiusLg,
            backgroundColor: theme.primarySubtle,
          }}
        >
          <Lock size={isExpanded ? 32 : 26} style={{ color: theme.primaryOn }} />
        </div>
        <span style={{ fontFamily, ...R.title, color: theme.textHeading, textAlign: "center" }}>
          {t(titleKey)}
        </span>
        <p style={{ fontFamily, ...R.body, color: theme.textMuted, textAlign: "center", maxWidth: "340px" }}>
          {isAccountSet() ? t("care.labs.locked.desc") : t("care.labs.locked.noPin")}
        </p>
        <span
          className="inline-flex items-center justify-center"
          style={{
            ...ctaStyle(theme, isExpanded),
            marginTop: "4px",
            fontFamily, ...roles(isExpanded).value,
            lineHeight: LEADING.none,
            color: theme.brandOnPrimary,
          }}
        >
          {isAccountSet() ? t("care.labs.locked.unlock") : t("care.labs.locked.setPin")}
        </span>
      </button>

      {dialog === "verify" && createPortal(
        <CareMePinDialog
          onClose={() => setDialog(null)}
          onSuccess={() => { setDialog(null); onUnlock(); }}
          onNfcSuccess={() => { setDialog(null); onUnlock(); }}
        />,
        document.body
      )}

      {dialog === "create" && createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center" style={{ backgroundColor: theme.overlay }}>
          <div
            className="flex flex-col items-center gap-4"
            style={{ width: PIN_METRICS.card, padding: PIN_METRICS.pad, borderRadius: theme.radiusXl, backgroundColor: theme.surface, boxShadow: SHADOW.xl }}
          >
            <div className="flex items-center justify-center" style={{ width: "48px", height: "48px", borderRadius: theme.radiusLg, backgroundColor: theme.primarySubtle }}>
              <Lock size={22} style={{ color: theme.primaryOn }} />
            </div>
            <span style={{ fontFamily, ...R.title, color: theme.textHeading, textAlign: "center" }}>
              {stage === "first" ? t("care.labs.pin.create") : t("care.labs.pin.confirm")}
            </span>
            <PinKeypad
              pin={stage === "first" ? newPin : confirmPin}
              setPin={stage === "first" ? setNewPin : setConfirmPin}
              error={error}
              onComplete={handleCreate}
            />
            <button
              onClick={() => { setDialog(null); setStage("first"); setNewPin(""); setConfirmPin(""); }}
              className="cursor-pointer"
              style={{ fontFamily, ...R.heading, color: theme.textMuted, background: "none", border: "none" }}
            >
              {t("general.cancel")}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/** Nothing to show in a results list — the same shape the care plan uses when
 *  it is empty, so every card fails the same way. */
function EmptyResults({ icon, theme, label, isExpanded = false }: {
  icon: React.ComponentType<any>; theme: any; label: string; isExpanded?: boolean;
}) {
  const { t } = useLocale();
  return (
    <CardEmptyState
      theme={theme}
      isExpanded={isExpanded}
      icon={icon}
      title={label}
      description={t("care.his.noInfoSub")}
    />
  );
}


/** One line on the Tests & Procedures card, whatever produced it. */
interface TestEntry {
  id: string;
  /** Already translated, or ward-entered free text — rendered with dir="auto". */
  label: string;
  date: string;
  /** Empty until the report is back. */
  pdfUrl?: string;
}

/* ─── Tests & Procedures ───────────────────────────────────────────────────
 * Laboratory tests, imaging studies and procedures on one card, because from
 * the bed they are one question: has my result come back yet? Every entry
 * answers that — a report to open, or "Processing…" with the date it was
 * taken — and a group only appears when it holds something the ward has made
 * visible. Labs and imaging keep their own nurse-side visibility switches;
 * the card shows whichever of them is on.
 */
function TestsAndProceduresSlide({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const R = roles(isExpanded);
  const { t } = useLocale();
  const nurseStore = useNurseStore();
  const [pdfModal, setPdfModal] = useState<{ url: string; title: string } | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const { unlocked, unlock, lock } = useResultsUnlock("tests");

  /* Closing a report starts the clock; opening another one stops it, so a
     patient reading three results in a row is not asked for the PIN between
     them. Unmounting clears it — leaving CareMe re-locks the card anyway. */
  const relockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRelock = useCallback(() => {
    if (relockTimer.current) {
      clearTimeout(relockTimer.current);
      relockTimer.current = null;
    }
  }, []);
  useEffect(() => cancelRelock, [cancelRelock]);

  const openReport = useCallback((url: string, title: string) => {
    cancelRelock();
    setPdfModal({ url, title });
  }, [cancelRelock]);

  const closeReport = useCallback(() => {
    setPdfModal(null);
    cancelRelock();
    relockTimer.current = setTimeout(lock, RESULTS_RELOCK_MS);
  }, [cancelRelock, lock]);

  
  const hisLabs = nurseStore.isHisConnected ? !!nurseStore.hisSections?.labs : true;
  const hisImaging = nurseStore.isHisConnected ? !!nurseStore.hisSections?.imaging : true;
  const hasHisData = hisLabs || hisImaging;

  if (!unlocked) {
    return (
      <ResultsPinGate isExpanded={isExpanded}
        theme={theme}
                titleKey="care.tests.locked.title"
        onUnlock={unlock}
      />
    );
  }

  if (nurseStore.isHisConnected && !hasHisData && !showDemo) {
    return (
      <HisEmptyStateSection isExpanded={isExpanded}
        theme={theme}
                onCheckDemo={() => setShowDemo(true)}
      />
    );
  }

  const labs: TestEntry[] = nurseStore.sectionVisibility.labs === false ? [] :
    nurseStore.labResults.filter(l => l.visible).map(l => ({
      id: l.id, label: t(l.labelKey), date: l.date, pdfUrl: l.pdfUrl,
    }));

  const imaging: TestEntry[] = nurseStore.sectionVisibility.imaging === false ? [] :
    nurseStore.imagingResults.filter(i => i.visible).map(i => ({
      id: i.id, label: t(i.labelKey), date: i.date, pdfUrl: i.pdfUrl,
    }));

  const procedures: TestEntry[] = (nurseStore.procedures || [])
    .filter(pr => pr.visible)
    .map(pr => ({ id: pr.id, label: pr.label, date: pr.date, pdfUrl: pr.pdfUrl }));

  const groups = [
    { key: "labs", icon: FlaskConical, title: t("care.labs.title"), items: labs },
    { key: "imaging", icon: ImageIcon, title: t("care.imaging.title"), items: imaging },
    { key: "procedures", icon: ClipboardCheck, title: t("care.tests.procedures"), items: procedures },
  ].filter(g => g.items.length > 0);

  /* A row, not a card. The group panel already holds these together, and a
     second surface per result was a box inside a box. The reading itself is
     gone too: a number without its reference range is not something to hand a
     patient unexplained — the report behind the button carries both. */
  const entry = (e: TestEntry, first: boolean) => {
    const ready = !!e.pdfUrl?.trim();
    return (
      <div
        key={e.id}
        {...(ready ? {
          onClick: () => openReport(`${e.pdfUrl}?h=${theme.id}`, e.label),
          "data-nav": "true",
        } : {})}
        className={`flex items-center justify-between gap-3 ${ready ? "cursor-pointer" : ""}`}
        style={{
          paddingTop: first ? 0 : (isExpanded ? "14px" : "12px"),
          marginTop: first ? 0 : (isExpanded ? "14px" : "12px"),
          borderTop: first ? undefined : `1px solid ${theme.borderSubtle}`,
        }}
      >
        <div className="flex flex-col min-w-0">
          <span
            dir="auto"
            style={{
              fontFamily: theme.fontFamily, ...R.value,
              color: theme.textHeading, overflowWrap: "anywhere",
            }}
          >
            {e.label}
          </span>
          <span style={{ fontFamily: theme.fontFamily, ...R.label, color: theme.textMuted, marginTop: LABEL_GAP }}>
            <Ltr>{e.date}</Ltr>
          </span>
        </div>

        {/* Waiting on a report is the state the patient checks for, so it is
            named rather than left as an absent button. */}
        {ready ? (
          <span
            className="shrink-0 inline-flex items-center justify-center pointer-events-none"
            style={{
              padding: isExpanded ? "8px 18px" : "7px 16px",
              borderRadius: theme.radiusSm,
              backgroundColor: theme.primarySubtle,
              border: `1px solid ${withAlpha(theme.primaryOn, 0.2)}`,
              fontFamily: theme.fontFamily, ...R.value, color: theme.primaryOn,
            }}
          >
            {t("care.tests.view")}
          </span>
        ) : (
          <CardBadge theme={theme} isExpanded={isExpanded} tone="warning">
            <Clock size={isExpanded ? 14 : 13} />
            {t("care.imaging.pending")}
          </CardBadge>
        )}
      </div>
    );
  };

  return (
    <>
      {nurseStore.isHisConnected && !hasHisData && showDemo && (
        <DemoBannerHeader theme={theme} onCloseDemo={() => setShowDemo(false)} />
      )}
      {groups.length === 0 ? (
        <EmptyResults isExpanded={isExpanded} icon={ClipboardCheck} theme={theme} label={t("care.tests.title")} />
      ) : (
        <div className="flex flex-col">
          {groups.map((g, i) => (
            <Section isExpanded={isExpanded}
              key={g.key}
              theme={theme}
                            first={i === 0}
              icon={g.icon}
              title={g.title}
            >
              <div className="flex flex-col">
                {g.items.map((e, n) => entry(e, n === 0))}
              </div>
            </Section>
          ))}
        </div>
      )}
      {pdfModal && <PdfViewerModal url={pdfModal.url} title={pdfModal.title} onClose={closeReport} />}
    </>
  );
}

/* ─── In-App PDF Viewer Modal ─── */
function PdfViewerModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const R = roles(true);
  const { theme } = useTheme();
  const { t } = useLocale();
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", animation: "babyCamFadeIn 0.25s ease-out" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ backgroundColor: theme.surface, borderBottom: `1px solid ${theme.borderSubtle}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primarySubtle }}>
            <FileText size={18} style={{ color: theme.primaryOn }} />
          </div>
          <div>
            <p dir="auto" style={{ fontFamily: theme.fontFamily, ...R.value, color: theme.textHeading }}>{title}</p>
            <p style={{ fontFamily: theme.fontFamily, ...R.label, color: theme.textMuted }}>{t("care.imaging.viewReport")}</p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          data-nav="true"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
          style={{ backgroundColor: theme.surfaceAlt }}
        >
          <X size={18} style={{ color: theme.textMuted }} />
        </button>
      </div>
      {/* PDF iframe */}
      <div className="flex-1 min-h-0">
        <iframe
          src={url}
          title={title}
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>,
    document.body
  );
}

/** A recorded observation, read back for display. `resp` and the timestamp
 *  shape both vary with how old the cached record is, so read them defensively. */
function observationTime(raw: any): Date | null {
  const d = raw instanceof Date ? raw : raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function ClinicalObservationsSlide({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const R = roles(isExpanded);
  const { t, isRTL, locale } = useLocale();
  const nurseStore = useNurseStore();
  const [showDemo, setShowDemo] = useState(false);
  const obs = [...nurseStore.observations].reverse();

  const hasHisData = nurseStore.isHisConnected ? !!nurseStore.hisSections?.observations : true;

  if (nurseStore.isHisConnected && !hasHisData && !showDemo) {
    return (
      <HisEmptyStateSection isExpanded={isExpanded}
        theme={theme}
                onCheckDemo={() => setShowDemo(true)}
      />
    );
  }

  if (obs.length === 0) {
    return (
      <CardEmptyState
        theme={theme}
        isExpanded={isExpanded}
        icon={Activity}
        title={t("care.observations.title")}
        description={t("care.observations.empty")}
      />
    );
  }


  /* One reading per tile. The icon carries the meaning at a glance — a patient
     in a bed reads the picture before the word — so each gets its own glyph
     rather than six variations on a wave. */
  const readingsFor = (o: any) => [
    { icon: Gauge,      label: t("care.vitals.bp"),   value: o.vitals.bp,   unit: t("care.vitals.bpUnit") },
    { icon: HeartPulse, label: t("care.vitals.hr"),   value: o.vitals.hr,   unit: t("care.vitals.hrUnit") },
    { icon: Thermometer,label: t("care.vitals.temp"), value: o.vitals.temp, unit: "°C" },
    { icon: Droplet,    label: t("care.vitals.spo2"), value: o.vitals.spo2, unit: "%" },
    { icon: Wind,       label: t("care.vitals.resp"), value: o.vitals.resp, unit: t("care.vitals.respUnit") },
    { icon: Frown,      label: t("care.vitals.pain"), value: o.painLevel ?? "", unit: "/ 10" },
  ];

  /* Every set of readings is drawn the same way, latest or not — a round of
     observations is a round of observations, and reading the earlier ones as
     a run of squashed one-liners made them look like a different kind of
     record. Dividers separate one round from the next. */
  /* Every round is drawn the same way: its name on the reading edge, its date
     and time stacked opposite. Blocks are separated by a rule, not a panel —
     the six tiles are already containers, and boxing them again was a box in
     a box. */
  const readingsBlock = (o: any, label: string) => {
    const d = observationTime(o.timestamp);
    return (
      <>
        <div
          className="flex items-center justify-between gap-3 shrink-0"
          style={{
            paddingBottom: "10px",
            marginBottom: isExpanded ? "14px" : "12px",
            borderBottom: `1px solid ${theme.borderSubtle}`,
          }}
        >
          <span style={{ fontFamily: theme.fontFamily, ...R.heading, color: theme.textHeading }}>
            {label}
          </span>
          {d && (
            <span
              className="shrink-0 flex items-center"
              style={{ gap: SPACE[1], fontFamily: theme.fontFamily, ...R.cellLabel, color: theme.textMuted }}
            >
              <Clock size={isExpanded ? 14 : 13} strokeWidth={2.2} style={{ color: theme.textMuted }} />
              <Ltr nowrap>
                {`${d.toLocaleTimeString(dateLocale(locale), { hour: "2-digit", minute: "2-digit" })} · ${d.toLocaleDateString(dateLocale(locale), { day: "numeric", month: "short", year: "numeric" })}`}
              </Ltr>
            </span>
          )}
        </div>

        {/* `1fr` rows on an auto-height grid equalise every row to the tallest,
            so a two-line label like "Oxygen saturation" does not leave its
            neighbours short. All six tiles end up the same size. */}
        <div
          className={`grid grid-cols-2 flex-1 min-h-0 ${isExpanded ? "gap-3" : "gap-2"}`}
          /* On the card, all six readings have to be on screen at once — a
             vital sign you have to scroll to is one the patient will not see —
             so the three rows split the height equally and the type below is
             sized to fit that, rather than the rows growing and pushing the
             last two off the card. The expanded column has room to spare, so
             there the rows take their content height as a floor. */
          style={{ gridAutoRows: isExpanded ? "minmax(min-content, 1fr)" : "1fr" }}
        >
          {readingsFor(o).map((r) => {
            const Icon = r.icon;
            const shown = r.value === "" || r.value === null || r.value === undefined ? null : String(r.value);
            return (
              /* The glyph goes in a small chip rather than floating loose
                 beside the words — it matches the discs used everywhere else
                 in CareMe, and it buys back enough width that every label,
                 "Oxygen saturation" included, holds one line. The reading then
                 gets the tile's full width underneath it.

                 The hairline is the same one every other container in CareMe
                 wears. It was dropped back when these tiles sat inside a
                 tinted Section, where a border around a tint on a tint greyed
                 them out; they sit on the card itself now, and without it they
                 were the only panels on the screen with no edge. */
              /* Two layouts, because the tile is two different shapes.
                 On the carousel card it is a wide, short box: the glyph sits
                 on the leading edge with the label and reading beside it, so
                 the number gets the height. In the expanded column the tile is
                 tall enough to stack them, which is how it has always read
                 there — only the glyph changed, to the round disc below. */
              <div
                key={r.label}
                className={isExpanded ? "flex flex-col justify-center" : "flex items-center"}
                style={{
                  gap: isExpanded ? "10px" : "9px",
                  backgroundColor: theme.surfaceInset,
                  border: theme.borderInset,
                  /* A softer corner than the card around it: a 24px radius on
                     a 70px-tall tile read as a lozenge, six of them in a grid. */
                  borderRadius: theme.radiusMd,
                  padding: isExpanded ? "18px 16px" : "10px 11px",
                  minHeight: 0,
                }}
              >
                {isExpanded ? (
                  <>
                    <div className="flex items-center min-w-0" style={{ gap: "9px" }}>
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: "44px", height: "44px",
                          borderRadius: theme.radiusFull,
                          backgroundColor: theme.primarySubtle,
                        }}
                      >
                        <Icon size={21} strokeWidth={2.1} style={{ color: theme.primaryOn }} />
                      </div>
                      <span
                        className="min-w-0"
                        style={{ fontFamily: theme.fontFamily, ...R.tileLabel, color: theme.textMuted, overflowWrap: "anywhere" }}
                      >
                        {r.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span style={{
                        fontFamily: theme.fontFamily, fontSize: R.metric,
                        fontWeight: WEIGHT.bold, lineHeight: LEADING.none,
                        letterSpacing: "-0.5px",
                        color: shown ? theme.textHeading : theme.textMuted,
                      }}>
                        {shown ?? "—"}
                      </span>
                      <span style={{
                        fontFamily: theme.fontFamily, ...R.tileLabel,
                        fontWeight: WEIGHT.semibold, color: theme.textMuted,
                      }}>
                        {r.unit}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: "32px", height: "32px",
                        borderRadius: theme.radiusFull,
                        backgroundColor: theme.primarySubtle,
                      }}
                    >
                      <Icon size={16} strokeWidth={2.1} style={{ color: theme.primaryOn }} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col" style={{ gap: "2px" }}>
                      <span
                        className="min-w-0"
                        style={{
                          fontFamily: theme.fontFamily,
                          fontSize: "11.5px", fontWeight: WEIGHT.medium, lineHeight: 1.2,
                          color: theme.textMuted, overflowWrap: "anywhere",
                        }}
                      >
                        {r.label}
                      </span>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span style={{
                          fontFamily: theme.fontFamily,
                          /* Sized to the tile, not to the expanded column: six
                             of these have to sit on one card without scrolling. */
                          fontSize: "21px",
                          fontWeight: WEIGHT.bold, lineHeight: LEADING.none,
                          letterSpacing: "-0.5px",
                          color: shown ? theme.textHeading : theme.textMuted,
                        }}>
                          {shown ?? "—"}
                        </span>
                        <span style={{
                          fontFamily: theme.fontFamily,
                          fontSize: "11px", fontWeight: WEIGHT.semibold, lineHeight: 1.2,
                          color: theme.textMuted,
                        }}>
                          {r.unit}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  /* The latest round only. Stacking every earlier round under it made the
     card a scroll of near-identical blocks, and a patient reading their own
     observations wants the current numbers, not a chart of the week. With one
     round on screen the six tiles can take the height the card actually has. */
  const latest = obs[0];
  if (!latest) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {readingsBlock(latest, t("care.observations.latest"))}
    </div>
  );
}

function BabyCameraSlide({}: {}) {
  const { theme } = useTheme();
  const { t } = useLocale();
  const nurseStore = useNurseStore();
  const [fullscreen, setFullscreen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const hasHisData = nurseStore.isHisConnected ? !!nurseStore.hisSections?.baby : true;

  if (nurseStore.isHisConnected && !hasHisData && !showDemo) {
    return (
      <HisEmptyStateSection isExpanded
        theme={theme}
                onCheckDemo={() => setShowDemo(true)}
      />
    );
  }

  const isDallah = theme.id === "dallah";
  const isCareMed = theme.id === "caremed";
  const isCareInn = theme.id === "careinn";
  const isFakeeh = theme.id === "dsfh";
  const cameraImage = isCareInn ? imgCareInnBabyCam : isDallah ? imgDallahBabyCam : isCareMed ? imgCareMedBabyCam : isFakeeh ? imgFakeehBabyCam : imgBabyCam;

  const titleSize = "16px";
  const subSize = "13px";

  return (
    <div className="flex flex-col">
      {nurseStore.isHisConnected && !hasHisData && showDemo && (
        <DemoBannerHeader theme={theme} onCloseDemo={() => setShowDemo(false)} />
      )}
      {/* 1:1 Camera Feed */}
      <div
        className="relative w-full cursor-pointer overflow-hidden group"
        style={{
          aspectRatio: "1 / 1",
          backgroundColor: "#000",
          boxShadow: SHADOW.xl,
          borderRadius: theme.radiusLg
        }}
        onClick={() => setFullscreen(true)}
      >
        <ApiImage
          src={cameraImage}
          alt="Baby Camera Feed"
          className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
        />

        {/* Image Overlays — LIVE badge + expand only */}
        <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
          {/* Top: LIVE badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md self-start" style={{ backgroundColor: "rgba(239,68,68,0.9)" }}>
            <Circle size={7} fill="#fff" style={{ color: "#fff", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#fff", letterSpacing: "0.5px", textTransform: "uppercase" }}>{t("care.baby.live")}</span>
          </div>
          {/* Bottom-right: expand icon */}
          <div className="flex items-center justify-end">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
              <Maximize2 size={13} style={{ color: "#fff" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Info below the feed */}
      <Section isExpanded theme={theme}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Baby icon avatar */}
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: theme.primarySubtle,
                width: "36px",
                height: "36px"
              }}
            >
              <Baby size={18} style={{ color: theme.primaryOn }} />
            </div>
            <div>
              <p style={{
                fontFamily: theme.fontFamily,
                fontSize: titleSize,
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
                lineHeight: 1.2
              }}>Baby Saleh</p>
              <p style={{
                fontFamily: theme.fontFamily,
                fontSize: subSize,
                color: theme.textMuted,
                marginTop: "2px"
              }}>Nursery · Crib 3A</p>
            </div>
          </div>

          {/* Connected badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: theme.primarySubtle }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.success, boxShadow: `0 0 6px ${theme.success}` }} />
            <span style={{ fontFamily: theme.fontFamily, fontSize: "12px", fontWeight: 700, color: theme.primaryOn }}>{t("care.baby.connected")}</span>
          </div>
        </div>
      </Section>

      {/* Fullscreen Baby Camera Overlay */}
      {fullscreen && createPortal(
        <BabyCameraFullscreen onClose={() => setFullscreen(false)} cameraImage={cameraImage} />,
        document.body
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─── Fullscreen Baby Camera Overlay ─── */
function BabyCameraFullscreen({ onClose, cameraImage }: { onClose: () => void, cameraImage: any }) {
  const { theme } = useTheme();
  const { t } = useLocale();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
      style={{
        backgroundColor: "#000",
        animation: "babyCamFadeIn 0.3s ease-out",
      }}
      onClick={onClose}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <ApiImage
          src={cameraImage}
          alt="Baby Camera Feed — Full Screen"
          className="w-full h-full object-contain"
        />

        {/* Top bar overlay */}
        <div
          className="absolute top-0 left-0 right-0 px-8 py-6 flex items-start justify-between z-10 pointer-events-none"
          style={{ background: "linear-gradient(rgba(0,0,0,0.6) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.9)" }}>
              <Circle size={10} fill="#fff" style={{ color: "#fff", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>{t("care.baby.live")}</span>
            </div>
            <div>
              <p style={{ fontFamily: theme.fontFamily, fontSize: "28px", fontWeight: WEIGHT.bold, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>Baby Saleh</p>
              <p style={{ fontFamily: theme.fontFamily, fontSize: "18px", color: "rgba(255,255,255,0.7)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Nursery · Crib 3A</p>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-8 py-3 rounded-full z-10" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <Video size={18} style={{ color: "#fff" }} />
          <span style={{ fontFamily: theme.fontFamily, fontSize: "16px", fontWeight: WEIGHT.medium, color: "#fff" }}>
            {t("care.baby.tapToExit")}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes babyCamFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function FinanceSlide({ theme }: { theme: any }) {
  const { t } = useLocale();
  const nurseStore = useNurseStore();
  const [showPdf, setShowPdf] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const labelSize = "13px";

  const hasHisData = nurseStore.isHisConnected ? !!nurseStore.hisSections?.financial : true;

  if (nurseStore.isHisConnected && !hasHisData && !showDemo) {
    return (
      <HisEmptyStateSection isExpanded
        theme={theme}
                onCheckDemo={() => setShowDemo(true)}
      />
    );
  }

  const Row = ({ label, value, description, isTotal = false, isHighlight = false, color }: any) => (
    <div className="flex items-center justify-between py-2" style={{ borderColor: theme.borderSubtle }}>
      <div className="flex flex-col" style={{ gap: LABEL_GAP }}>
        <span style={{
          fontFamily: theme.fontFamily,
          fontSize: labelSize,
          color: theme.textHeading,
          fontWeight: isTotal ? WEIGHT.bold : WEIGHT.medium,
          lineHeight: 1.2
        }}>{label}</span>
        {description && (
          <span style={{ fontSize: "11px", color: theme.textDisabled, fontWeight: 700 }}>
            {description}
          </span>
        )}
      </div>
      <span style={{
        fontFamily: theme.fontFamily,
        fontSize: isTotal ? "18px" : "14px",
        color: color || theme.textHeading,
        fontWeight: isTotal || isHighlight ? WEIGHT.bold : WEIGHT.bold
      }}>{value}</span>
    </div>
  );

  const subtotal = nurseStore.financial.reduce((acc, item) => acc + item.amount, 0);
  const covered = nurseStore.financial.reduce((acc, item) => acc + item.covered, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const payable = total - covered;

  return (
    <div className="flex flex-col">
      {nurseStore.isHisConnected && !hasHisData && showDemo && (
        <DemoBannerHeader theme={theme} onCloseDemo={() => setShowDemo(false)} />
      )}
      {/* Module 1: Itemized breakdown */}
      <Section isExpanded theme={theme}>
        <div className="flex flex-col gap-0">
          {nurseStore.financial.map((item, i) => (
            <Row key={item.id} label={item.category} value={`${item.amount.toLocaleString()} ${t("care.currency")}`} description={item.description} />
          ))}
          <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.06)", margin: "8px 0" }} />
          <Row label={t("care.billing.subtotal")} value={`${subtotal.toLocaleString()} ${t("care.currency")}`} />
          <Row label={t("care.billing.vat")} value={`${vat.toLocaleString()} ${t("care.currency")}`} />
          <Row label={t("care.billing.totalInclVat")} value={`${total.toLocaleString()} ${t("care.currency")}`} />
          <Row label={t("care.billing.insuranceCredit").replace("Deduction", "").trim()} value={`- ${covered.toLocaleString()} ${t("care.currency")}`} color={theme.successOn} isHighlight />
          <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.06)", margin: "8px 0" }} />
          <Row label={t("care.billing.subtotal")} value={`19,490 ${t("care.currency")}`} />
          <Row label={t("care.billing.vat")} value={`2,923.5 ${t("care.currency")}`} />
          <Row label={t("care.billing.totalInclVat")} value={`22,413.5 ${t("care.currency")}`} />
          <Row label={t("care.billing.insuranceCredit").replace("Deduction", "").trim()} value={`- 18,515.5 ${t("care.currency")}`} color={theme.successOn} isHighlight />

          <div className="mt-6 pt-2 border-t border-dashed" style={{ borderColor: theme.borderSubtle }}>
            <button
              data-nav="true"
              onClick={() => setShowPdf(true)}
              className="flex items-center justify-center gap-2 w-full py-3 border transition-transform hover:scale-[1.01] active:scale-98"
              style={{ borderRadius: theme.radiusLg, borderColor: `${theme.primary}40`, backgroundColor: theme.surface, cursor: 'pointer' }}
            >
              <FileText size={18} style={{ color: theme.primaryOn }} />
              <span style={{ fontFamily: theme.fontFamily, fontSize: "13.5px", fontWeight: WEIGHT.bold, color: theme.primaryOn }}>
                {t("care.billing.viewDetailedInvoice")}
              </span>
            </button>
          </div>
        </div>
      </Section>

      {/* Module 2: Unified Payment Summary */}
      <Section isExpanded theme={theme}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between px-1">
            <span style={{ fontFamily: theme.fontFamily, fontSize: "13.5px", color: theme.textMuted, fontWeight: WEIGHT.bold }}>{t("care.billing.patientPayable")}</span>
            <span style={{ fontFamily: theme.fontFamily, fontSize: "20px", color: theme.primaryOn, fontWeight: 900 }}>{payable.toLocaleString()} <span style={{ fontSize: "0.6em" }}>{t("care.currency")}</span></span>
          </div>

          <button
            data-nav="true"
            onClick={() => setShowPayment(true)}
            className="flex items-center justify-center gap-2 w-full py-4 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.96]"
            style={{ backgroundColor: theme.primary, cursor: 'pointer', borderRadius: theme.radiusLg }}
          >
            <CreditCard size={18} style={{ color: "#fff" }} />
            <span style={{ fontFamily: theme.fontFamily, fontSize: "15px", fontWeight: WEIGHT.bold, color: "#fff" }}>
              {t("care.billing.payNow")}
            </span>
          </button>
        </div>
      </Section>

      {showPdf && <HospitalInvoiceOverlay theme={theme} onClose={() => setShowPdf(false)} />}
      {showPayment && <PaymentPortal theme={theme} onClose={() => setShowPayment(false)} amount="3,898" />}
    </div>
  );
}
function HospitalInvoiceOverlay({ theme, onClose }: { theme: any, onClose: () => void }) {
  const { t } = useLocale();
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-10" style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-white shadow-2xl relative flex flex-col overflow-hidden"
        style={{ borderRadius: theme.radiusXl, height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Invoice Header */}
        <div className="p-10 border-b flex justify-between items-start" style={{ borderColor: theme.borderSubtle }}>
          <div className="flex flex-col gap-6">
            <ApiImage src={theme.logoUrl} alt="Hospital Logo" className="h-16 object-contain self-start" />
            <div>
              <h1 style={{ fontFamily: theme.fontFamily, fontSize: "28px", fontWeight: WEIGHT.extrabold, color: theme.textHeading }}>
                {t("care.billing.invoiceTitle")}
              </h1>
              <p style={{ fontFamily: theme.fontFamily, fontSize: "14px", color: theme.textMuted }}>#{Math.floor(Math.random() * 900000 + 100000)} · {t("date.5mar2026")}</p>
            </div>
          </div>
          <div className="text-right flex flex-col gap-2">
            <button
              onClick={onClose}
              className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors self-end"
            >
              <X size={20} />
            </button>
            <div className="mt-8">
              <p style={{ fontFamily: theme.fontFamily, fontSize: "14px", fontWeight: 700, color: theme.textHeading }}>{theme.hospitalName}</p>
              <p style={{ fontFamily: theme.fontFamily, fontSize: "12px", color: theme.textMuted }}>{theme.location}, {theme.country}</p>
              <p style={{ fontFamily: theme.fontFamily, fontSize: "12px", color: theme.textMuted }}>VAT ID: 300000000000003</p>
            </div>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="flex-1 overflow-y-auto p-10">
          <table className="w-full text-left" style={{ fontFamily: theme.fontFamily }}>
            <thead className="border-b-2 border-slate-900">
              <tr>
                <th className="py-4 text-sm font-bold uppercase tracking-wider">Item Description</th>
                <th className="py-4 text-sm font-bold uppercase tracking-wider text-center">Qty</th>
                <th className="py-4 text-sm font-bold uppercase tracking-wider text-right">Price</th>
                <th className="py-4 text-sm font-bold uppercase tracking-wider text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billingItems.map(item => (
                <tr key={item.id}>
                  <td className="py-6 font-semibold text-slate-800">{t(item.labelKey)}</td>
                  <td className="py-6 text-center text-slate-600 font-medium">{item.qty}</td>
                  <td className="py-6 text-right text-slate-600">{item.amount.toLocaleString()} SAR</td>
                  <td className="py-6 text-right font-bold text-slate-900">{(item.amount * item.qty).toLocaleString()} SAR</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="mt-12 flex justify-end">
            <div className="w-72 flex flex-col gap-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">19,490.00 SAR</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT (15%)</span>
                <span className="font-semibold">2,923.50 SAR</span>
              </div>
              <div className="flex justify-between py-4 border-y border-slate-100" style={{ color: theme.successOn }}>
                <span className="font-bold">Insurance Credit</span>
                <span className="font-bold">- 18,515.50 SAR</span>
              </div>
              <div className="flex justify-between items-baseline pt-2" style={{ color: theme.primaryOn }}>
                <span className="text-lg font-bold">Total Due</span>
                <span className="text-3xl font-extrabold tracking-tight">3,898.00 SAR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Footer */}
        <div className="p-10 bg-slate-50 border-t flex items-center">
          <div className="flex items-center gap-4 text-slate-400">
            <ShieldCheck size={40} strokeWidth={1} />
            <p className="max-w-xs text-xs leading-relaxed">
              This is an official clinical document generated by the {theme.hospitalName} Health Cloud. Verifiable via secure portal.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PaymentPortal({ theme, onClose, amount }: { theme: any, onClose: () => void, amount: string }) {
  const { t } = useLocale();
  const [step, setStep] = useState<'methods' | 'processing' | 'success'>('methods');

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => setStep('success'), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <div
        className="w-full max-w-md bg-white shadow-3xl overflow-hidden"
        style={{ borderRadius: theme.radiusXl }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'methods' && (
          <div className="p-8 flex flex-col gap-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 style={{ fontFamily: theme.fontFamily, fontSize: "24px", fontWeight: WEIGHT.bold, color: theme.textHeading }}>Secure Payment</h2>
                <p style={{ fontFamily: theme.fontFamily, fontSize: "14px", color: theme.textMuted }}>Direct settlement for {theme.hospitalName}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="bg-slate-50 p-6 flex flex-col items-center border border-slate-100" style={{ borderRadius: "12px" }}>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Payable Now</span>
              <span className="text-4xl font-black tracking-tight" style={{ color: theme.primaryOn }}>{amount} <span className="text-lg">{t("care.currency")}</span></span>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-slate-100 flex-1" />
                <span className="text-xs font-bold text-slate-300">SECURE CARD PAYMENT</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="p-3 border border-slate-200 bg-white" style={{ borderRadius: theme.radiusLg }}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Name on Card</p>
                  <input
                    type="text"
                    placeholder="J. SMITH"
                    className="w-full text-slate-900 font-medium outline-none bg-transparent placeholder:text-slate-200"
                  />
                </div>
                <div className="p-3 border border-slate-200 bg-white rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Card Number</p>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      className="w-full text-slate-900 font-medium outline-none bg-transparent placeholder:text-slate-200"
                    />
                    <CreditCard size={18} className="text-slate-300" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 p-3 border border-slate-200 bg-white" style={{ borderRadius: theme.radiusLg }}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM / YY"
                      className="w-full text-slate-900 font-medium outline-none bg-transparent placeholder:text-slate-200"
                    />
                  </div>
                  <div className="flex-1 p-3 border border-slate-200 bg-white" style={{ borderRadius: theme.radiusLg }}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">CVC</p>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="•••"
                      className="w-full text-slate-900 font-medium outline-none bg-transparent placeholder:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handlePay}
                className="w-full py-4 shadow-xl transition-transform hover:brightness-110 active:scale-95 mt-2"
                style={{ backgroundColor: theme.primary, borderRadius: theme.radiusLg }}
              >
                <span className="text-white font-bold text-lg">Pay Securely</span>
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-20 flex flex-col items-center justify-center gap-8 text-center h-[520px]">
            <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" style={{ borderTopColor: theme.primaryOn }} />
            <div>
              <h3 style={{ fontFamily: theme.fontFamily, fontSize: "20px", fontWeight: WEIGHT.bold }}>Finalizing Payment</h3>
              <p style={{ fontFamily: theme.fontFamily, fontSize: "14px", color: theme.textMuted }}>Securing your transaction...</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-16 flex flex-col items-center justify-center gap-10 text-center h-[520px]">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-inner"
              style={{ backgroundColor: theme.successSubtle, color: theme.successOn }}
            >
              <ShieldCheck size={48} />
            </div>
            <div>
              <h3 style={{ fontFamily: theme.fontFamily, fontSize: "24px", fontWeight: WEIGHT.bold }}>Settlement Successful</h3>
              <p style={{ fontFamily: theme.fontFamily, fontSize: "16px", color: theme.textMuted }}>Your invoice has been updated. A receipt will be sent to your registered email.</p>
            </div>
            <button
              onClick={onClose}
              className="px-12 py-4 rounded-xl font-bold transition-transform hover:scale-105"
              style={{ backgroundColor: theme.surfaceAlt, color: theme.textHeading }}
            >
              Return to Hub
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Questions for My Care Team
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The one card the patient writes rather than reads. Questions occur to people
 * between rounds and are gone by the time the doctor is at the bed, so this is
 * somewhere to put them down as they come.
 *
 * It stays on the device: the ward has no inbox for this, and a question that
 * looked like it had been SENT while nobody was reading it would be worse than
 * no feature at all. The list is the patient's own note to themselves, and the
 * card says so — "to discuss with your care team", not "your team will reply".
 */

/** Written by the patient on this screen; never leaves it. */
const QUESTIONS_KEY = "careinn-care-questions";
/** Same-tab writes fire no storage event, and both the carousel card and the
 *  expanded column can be mounted at once. */
const QUESTIONS_EVENT = "careinn-care-questions-changed";

/** What the patient is putting down. A question and a complaint reach the ward
 *  differently, so the board asks which it is rather than making a nurse infer
 *  it from the wording. Entries written before this existed carry no kind and
 *  are read as questions, which is what they were. */
/* LEGACY. Entries used to be filed as a question, a concern or a complaint.
   Sorting their own words into a category is the ward's job, not the
   patient's — an entry is now just what they wrote, and a pain score if they
   gave one. The field stays so records written before this still parse. */
type BoardKind = "question" | "concern" | "complaint" | "pain";

interface CareQuestion {
  id: string;
  text: string;
  kind?: BoardKind;
  /** 0-10, only on entries where the patient chose to report pain. */
  pain?: number | null;
  createdAt?: string;
}

/** Never throws: a blocked or full store must not trap the patient. */
function readQuestions(): CareQuestion[] {
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((q) => q && typeof q.id === "string" && typeof q.text === "string")
      : [];
  } catch {
    return [];
  }
}

function writeQuestions(list: CareQuestion[]) {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(list));
  } catch {
    /* A failed write is a lost save, not a dead screen. */
  }
  window.dispatchEvent(new CustomEvent(QUESTIONS_EVENT));
}


function SlideIcon({ slideKey }: { slideKey: string }) {
  const { theme } = useTheme();
  const iconProps = { size: 18, strokeWidth: 2 };
  const color = theme.primaryOn;
  switch (slideKey) {
    case "profile": return <IdCard {...iconProps} style={{ color }} />;
    case "overview": return <Activity {...iconProps} style={{ color }} />;
    case "plan": return <ClipboardList {...iconProps} style={{ color }} />;
    case "tests": return <ClipboardCheck {...iconProps} style={{ color }} />;
    case "preferences": return <HeartHandshake {...iconProps} style={{ color }} />;
    case "billing": return <Wallet {...iconProps} style={{ color }} />;
    case "baby": return <Baby {...iconProps} style={{ color }} />;
    case "discharge": return <LogOut {...iconProps} style={{ color }} />;
    case "dischargePlan": return <FileText {...iconProps} style={{ color }} />;
    case "observations": return <Activity {...iconProps} style={{ color }} />;
    default: return <Heart {...iconProps} style={{ color }} />;
  }
}

/* ─── CareMe Heart SVG from Figma ───
 * The mark takes the active brand's accessible foreground so it stays legible
 * on the card surface in both modes. */
function HeartIcon() {
  const { theme } = useTheme();
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="block size-full" fill="none" viewBox="0 0 20 20">
        <g><path d={svgPaths.p2f84f400} fill={theme.accentOn} stroke={theme.accentOn} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" /></g>
      </svg>
    </div>
  );
}

/** A pain score's tone. Green is fine, amber is watch, red is act — the same
 *  three the ward already reads everywhere else on this screen, rather than a
 *  second palette invented for one row of buttons. */
function painTone(n: number): Tone {
  if (n <= 0) return "neutral";
  if (n < 4) return "success";
  if (n < 7) return "warning";
  return "danger";
}

/* ─── Communication Board ───
 * The one section the patient writes. A question, a concern, a complaint and
 * a pain score are four different things to a ward, so the entry says which
 * it is — a nurse scanning the board can see at a glance whether there is
 * something here that needs answering now.
 *
 * It stays on the device, and the card says so: the ward reads it at the
 * bedside. Anything that looked like it had been SENT while nobody was
 * watching an inbox would be worse than no board at all. */
function CommunicationBoardBody({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const R = roles(isExpanded);
  const { t, fontFamily, locale, dir } = useLocale();
  const [entries, setEntries] = useState<CareQuestion[]>(() => readQuestions());
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const refresh = () => setEntries(readQuestions());
    window.addEventListener(QUESTIONS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(QUESTIONS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    writeQuestions(next);
    setEntries(next);
  };

  const add = (entry: { text: string; pain: number | null }) => {
    const next: CareQuestion[] = [
      ...entries,
      { id: `q-${Date.now()}`, text: entry.text, pain: entry.pain, createdAt: new Date().toISOString() },
    ];
    writeQuestions(next);
    setEntries(next);
    setComposing(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <p style={{ fontFamily, ...R.body, color: theme.textMuted }}>
        {t("care.pcc.board.intro")}
      </p>

      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((e) => {
            const when = e.createdAt
              ? new Date(e.createdAt).toLocaleDateString(dateLocale(locale), { day: "numeric", month: "short" })
              : "";
            return (
              <div
                key={e.id}
                style={{
                  backgroundColor: theme.surface,
                  border: theme.borderInset,
                  borderRadius: theme.radiusMd,
                  padding: isExpanded ? "12px 14px" : "10px 12px",
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {typeof e.pain === "number" && (
                    <CardBadge theme={theme} isExpanded={isExpanded} tone={painTone(e.pain)}>
                      {t("care.pcc.board.painShort", String(e.pain))}
                    </CardBadge>
                  )}
                  <span className="flex-1" />
                  {when && (
                    <span style={{ fontFamily, ...R.cellLabel, color: theme.textMuted }}><Ltr nowrap>{when}</Ltr></span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(e.id)}
                    aria-label={t("care.pcc.board.remove")}
                    className="cursor-pointer active:scale-90 transition-transform shrink-0"
                    style={{ background: "none", border: "none", outline: "none", padding: 2, color: theme.textMuted }}
                  >
                    <X size={isExpanded ? 16 : 15} strokeWidth={2.5} />
                  </button>
                </div>
                {!!e.text.trim() && (
                  <p dir="auto" style={{
                    fontFamily, ...R.body, color: theme.textBody,
                    marginTop: SPACE[1], overflowWrap: "anywhere",
                  }}>
                    {e.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CardButton theme={theme} isExpanded={isExpanded}
        onClick={() => setComposing(true)} label={t("care.pcc.board.add")} />

      {composing && (
        <BoardComposer
          theme={theme}
          dir={dir}
          onCancel={() => setComposing(false)}
          onSave={add}
        />
      )}
    </div>
  );
}

/* Writing is done on a sheet of its own, not in the card.
 *
 * The section is a few hundred pixels tall inside a carousel card; a patient
 * describing a concern was typing into a three-line slot with a keyboard over
 * it. The composer takes the screen instead, the way the preferences form and
 * the care-partner agreement do.
 *
 * Pain stands alone here: a score with no text is a complete entry, because
 * "7 out of 10" is the whole message and asking for a sentence as well is a
 * reason not to report it. */
function BoardComposer({ theme, dir, onCancel, onSave }: {
  theme: any;
  dir: string;
  onCancel: () => void;
  onSave: (entry: { text: string; pain: number | null }) => void;
}) {
  const { t, fontFamily } = useLocale();
  const [text, setText] = useState("");
  const [pain, setPain] = useState<number | null>(null);

  /* Either half is enough on its own: words, or a number. */
  const ready = !!text.trim() || pain !== null;

  const canvas = typeof document !== "undefined"
    ? document.getElementById("careinn-canvas") ?? document.body
    : null;
  if (!canvas) return null;

  return createPortal(
    <div
      dir={dir}
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 8700, backgroundColor: theme.overlay, backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: "min(880px, 92%)",
          maxHeight: "92%",
          borderRadius: theme.radiusXl,
          backgroundColor: theme.surface,
          border: theme.cardBorder,
          boxShadow: SHADOW.xl,
          overflow: "hidden",
        }}
      >
        <div className="shrink-0 flex items-center gap-4" style={{ padding: "20px 26px", borderBottom: `1px solid ${theme.borderDefault}` }}>
          <div className="flex items-center justify-center shrink-0"
            style={{ width: "44px", height: "44px", borderRadius: theme.radiusLg, backgroundColor: theme.primarySubtle }}>
            <MessageCircleQuestion size={22} style={{ color: theme.primaryOn }} />
          </div>
          <h2 className="flex-1 min-w-0" style={{
            fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold,
            color: theme.textHeading, margin: 0,
          }}>
            {t("care.pcc.board.compose")}
          </h2>
          <button
            onClick={onCancel}
            aria-label={t("care.pcc.partner.cancel")}
            className="shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            style={{ width: "44px", height: "44px", borderRadius: theme.radiusMd, backgroundColor: theme.tileInactiveBg, border: "none", outline: "none" }}
          >
            <X size={22} style={{ color: theme.textMuted }} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto careme-scroll" style={{ padding: "22px 26px" }}>
          {/* Pain first: it is the entry that needs nothing else. */}
          <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: theme.textMuted, display: "block", marginBottom: SPACE[1] }}>
            {t("care.pcc.board.pain")}
          </span>
          <div className="flex flex-wrap" style={{ gap: "8px", marginBottom: SPACE[3] }}>
            {Array.from({ length: 11 }, (_, n) => {
              const on = pain === n;
              const { bg, fg } = toneColors(theme, painTone(n));
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPain(on ? null : n)}
                  className="cursor-pointer active:scale-95 transition-transform"
                  style={{
                    width: "48px", height: "48px", borderRadius: theme.radiusMd,
                    backgroundColor: on ? bg : theme.surface,
                    border: `1.5px solid ${on ? fg : theme.borderDefault}`,
                    color: on ? fg : theme.textMuted,
                    fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.bold, outline: "none",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: theme.textMuted, display: "block", marginBottom: SPACE[1] }}>
            {t("care.pcc.board.what")}
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("care.pcc.board.placeholder")}
            rows={7}
            dir="auto"
            autoFocus
            style={{
              width: "100%",
              minHeight: "180px",
              padding: "14px 16px",
              borderRadius: theme.radiusMd,
              backgroundColor: theme.surfaceInset,
              border: `1.5px solid ${theme.borderDefault}`,
              color: theme.textHeading,
              fontFamily, fontSize: TYPE_SCALE.base, lineHeight: LEADING.normal,
              resize: "none",
              outline: "none",
            }}
          />
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3"
          style={{ padding: "16px 26px", borderTop: `1px solid ${theme.borderDefault}`, backgroundColor: theme.surfaceInset }}>
          <button
            onClick={onCancel}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              minHeight: "54px", padding: "0 26px", borderRadius: theme.radiusLg,
              backgroundColor: "transparent", border: `1.5px solid ${theme.borderDefault}`,
              fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.medium, color: theme.textMuted, outline: "none",
            }}
          >
            {t("care.pcc.partner.cancel")}
          </button>
          <button
            disabled={!ready}
            onClick={() => onSave({ text: text.trim(), pain })}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              minHeight: "54px", padding: "0 28px", borderRadius: theme.radiusLg,
              backgroundColor: theme.primary, border: "none", outline: "none",
              opacity: ready ? 1 : 0.45,
              cursor: ready ? "pointer" : "not-allowed",
              fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.brandOnPrimary,
            }}
          >
            {t("care.pcc.board.save")}
          </button>
        </div>
      </div>
    </div>,
    canvas,
  );
}

/* ─── My Care Partner ───
 * Four states, one section: explain → decide → agree → stand.
 *
 * The agreement is accepted by the partner, not by the patient on their
 * behalf, so the flow is written to be handed over: the patient names who it
 * is, and everything after that line is addressed to the partner and signed
 * by them on this screen. */
function CarePartnerBody({ theme, isExpanded = false }: { theme: any; isExpanded?: boolean }) {
  const R = roles(isExpanded);
  const { t, fontFamily, locale } = useLocale();
  const [record, setRecord] = useState<CarePartnerRecord>(() => readCarePartner());
  /* The agreement is a sheet over the card, the way the preferences form is:
     fourteen statements, four fields and a signature do not fit in a
     collapsible section, and a signature drawn in a letterbox is a smear. */
  const [agreementOpen, setAgreementOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setRecord(readCarePartner());
    window.addEventListener(CARE_PARTNER_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CARE_PARTNER_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  /* The preferences question is what asks for a care partner at all, so it is
     the one thing that decides whether there is a partner to show. Until it
     carries an answer, this section is back to explaining and asking — a
     nomination standing on a card the patient was never asked about is the
     screen answering for them.
     
     Nominating from this card writes that answer too (see save below), so the
     card's own route does not fall foul of this. What it does clear is a
     record left behind by a cleared form or an older build. */
  useEffect(() => {
    const sync = () => {
      const asked = !!readPreferenceRecord()?.answers?.["partner.participate"]?.value;
      if (!asked && readCarePartner().status !== "unasked") clearCarePartner();
    };
    sync();
    window.addEventListener(PREFS_SAVED_EVENT, sync);
    return () => window.removeEventListener(PREFS_SAVED_EVENT, sync);
  }, []);

  const save = (next: Partial<CarePartnerRecord>) => {
    const merged = { ...record, ...next };
    writeCarePartner(merged);
    setRecord(merged);
    /* The preferences form asks "do you want to take part in the programme?"
       and that answer is what the ward reads on the printed form. Deciding it
       here has to update it there, or the two screens tell different stories
       about the same patient. */
    setCarePartnerAnswer(merged.status === "declined" ? "no" : "yes");
  };

  const agreement = agreementOpen ? (
    <CarePartnerAgreement
      initial={record}
      onClose={() => {
        setAgreementOpen(false);
        /* Closing the sheet without signing is not a refusal: a nomination
           that never reached a signature goes back to the question. */
        if (record.status === "nominated") save({ ...EMPTY_CARE_PARTNER });
      }}
      onAccept={(details) => {
        save({ ...details, status: "active", agreedAt: new Date().toISOString() });
        setAgreementOpen(false);
      }}
    />
  ) : null;

  /* ── Assigned: who they are, how to reach them, when they agreed ── */
  if (record.status === "active") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <CardIcon icon={UserRound} theme={theme} tone="success" circle
            size={isExpanded ? 44 : 38} glyph={isExpanded ? 22 : 19} />
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily, ...R.name, color: theme.textHeading, overflowWrap: "anywhere" }} dir="auto">
              {record.name}
            </p>
            <p style={{ fontFamily, ...R.cellLabel, color: theme.textMuted }} dir="auto">
              {record.relationship}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {!!record.mobile && (
            <div className="flex items-center gap-2">
              <span style={{ fontFamily, ...R.cellLabel, color: theme.textMuted }}>
                {t("care.cp.field.mobile")}
              </span>
              <span style={{ fontFamily, ...R.value, color: theme.textHeading }}>
                <Ltr nowrap>{record.mobile}</Ltr>
              </span>
            </div>
          )}
          {!!(record.signedOn || record.agreedAt) && (
            <span style={{ fontFamily, ...R.cellLabel, color: theme.textMuted }}>
              {t("care.pcc.partner.agreedOn", (() => {
                /* The agreement stores the signing day as "20 Sep 2026". Shown
                   raw it was the one Gregorian English date on an Arabic card,
                   next to Hijri everywhere else — so it goes through the same
                   formatter, and falls back to the stored text if some older
                   record holds something this cannot read. */
                const raw = record.signedOn || record.agreedAt;
                const d = raw ? new Date(raw) : null;
                return d && !Number.isNaN(d.getTime())
                  ? d.toLocaleDateString(dateLocale(locale), { day: "numeric", month: "long", year: "numeric" })
                  : String(record.signedOn ?? "");
              })())}
            </span>
          )}
        </div>

        {/* The signature is part of the record: it is what makes this an
            agreement rather than a name typed into a box. */}
        {record.signature && (
          /* Shown on paper, not on the card: the strokes are dark ink, so a
             themed surface behind them hid the signature in dark mode. */
          <img
            src={record.signature}
            alt={t("care.cp.field.sign")}
            style={{
              maxWidth: isExpanded ? "260px" : "220px",
              backgroundColor: SIGNATURE_PAPER,
              border: `1px solid ${SIGNATURE_PAPER_LINE}`,
              borderRadius: theme.radiusMd,
              padding: "6px",
            }}
          />
        )}

        <button
          type="button"
          onClick={() => save({ ...EMPTY_CARE_PARTNER })}
          className="self-start cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            padding: isExpanded ? "10px 18px" : "8px 16px",
            borderRadius: theme.radiusMd,
            backgroundColor: "transparent",
            border: `1.5px solid ${theme.borderDefault}`,
            fontFamily, ...R.cellLabel, fontWeight: WEIGHT.bold, color: theme.textMuted,
            outline: "none",
          }}
        >
          {t("care.pcc.partner.remove")}
        </button>
        {agreement}
      </div>
    );
  }

  /* ── Named but not signed: the sheet is waiting to be handed over ── */
  if (record.status === "nominated") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p style={{ fontFamily, ...R.body, color: theme.textBody }} dir="auto">
          {t("care.pcc.partner.handover", record.name || t("care.pcc.partner.title"))}
        </p>
        <CardButton theme={theme} isExpanded={isExpanded}
          onClick={() => setAgreementOpen(true)} label={t("care.pcc.partner.assign")} />
        {agreement}
      </div>
    );
  }

  /* ── Declined: a standing answer, and a way back ── */
  if (record.status === "declined") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p style={{ fontFamily, ...R.body, color: theme.textBody }}>
          {t("care.pcc.partner.declined")}
        </p>
        <CardButton theme={theme} isExpanded={isExpanded}
          onClick={() => setAgreementOpen(true)} label={t("care.pcc.partner.assign")} />
        {agreement}
      </div>
    );
  }

  /* ── Never asked: explain first, then ask ── */
  return (
    <div className="flex flex-col gap-3">
      <p style={{ fontFamily, ...R.body, color: theme.textBody }}>
        {t("care.pcc.partner.what")}
      </p>
      <p style={{ fontFamily, ...R.cellLabel, color: theme.textMuted }}>
        {t("care.pcc.partner.optional")}
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <CardButton theme={theme} isExpanded={isExpanded}
          onClick={() => setAgreementOpen(true)} label={t("care.pcc.partner.yes")} />
        <button
          type="button"
          onClick={() => save({ ...EMPTY_CARE_PARTNER, status: "declined" })}
          className="cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            ...ctaStyle(theme, isExpanded),
            backgroundColor: "transparent",
            border: `1.5px solid ${theme.borderDefault}`,
            fontFamily, ...R.value, color: theme.textMuted,
          }}
        >
          {t("care.pcc.partner.no")}
        </button>
      </div>
      {agreement}
    </div>
  );
}

/* ─── Person-Centered Care ───
 * One card, four collapsible sections, in the order the ward reads them:
 * what today is for, what the patient wants, who is with them, and what they
 * still want to say. Sections open independently — a patient reading their
 * goal should not have their preferences closed underneath them. */
function PersonCenteredCareSlide({ theme, isExpanded = false, onOpenForm }: {
  theme: any; isExpanded?: boolean; onOpenForm?: () => void;
}) {
  const R = roles(isExpanded);
  const { t, fontFamily } = useLocale();
  const { activeConfigId } = useTheme();
  const nurseStore = useNurseStore();
  const [record, setRecord] = useState(() => readPreferenceRecord());

  /* The form is a modal over this card, which stays mounted underneath it —
     and a same-tab write fires no storage event. */
  useEffect(() => {
    const refresh = () => setRecord(readPreferenceRecord());
    window.addEventListener(PREFS_SAVED_EVENT, refresh);
    return () => window.removeEventListener(PREFS_SAVED_EVENT, refresh);
  }, []);

  const careGoal = (nurseStore.alerts.careGoal || "").trim();

  /* A nomination made in the old preferences form is carried over once, then
     this record is the only one that counts. */
  const [partner, setPartner] = useState<CarePartnerRecord>(() => {
    const legacy = readPreferenceRecord()?.carePartner;
    adoptLegacyCarePartner(legacy);
    /* A patient who named somebody in the old form was asked the question and
       said yes, so the answer is written alongside the nomination. Without it
       the section would read the record as never-asked and clear the very
       nomination it had just carried over. */
    if (legacy?.name?.trim() && readCarePartner().status !== "unasked") {
      setCarePartnerAnswer("yes");
    }
    return readCarePartner();
  });
  useEffect(() => {
    const refresh = () => setPartner(readCarePartner());
    window.addEventListener(CARE_PARTNER_EVENT, refresh);
    return () => window.removeEventListener(CARE_PARTNER_EVENT, refresh);
  }, []);

  /* The collapsed header says how much is on the board, so the count has to
     follow writes made in the section below it. */
  const [boardCount, setBoardCount] = useState(() => readQuestions().length);
  useEffect(() => {
    const refresh = () => setBoardCount(readQuestions().length);
    window.addEventListener(QUESTIONS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(QUESTIONS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const prefRows = preferenceSummaryRows(
    record, t, preferenceAppName(t, activeConfigId, theme.hospitalName));
  const prefsFilled = !!record?.completedAt && prefRows.length > 0;

  return (
    <div className="flex flex-col">
      {/* 1 — Care Goal of the Day. Not collapsible: it is one line, it changes
          daily, and it is the reason the card opens on this section at all —
          a goal behind a chevron is a goal nobody reads. */}
      <Section theme={theme} isExpanded={isExpanded} first icon={Target} title={t("care.pcc.goal.title")}>
        {careGoal ? (
          <p dir="auto" style={{ fontFamily, ...R.value, color: theme.textHeading, overflowWrap: "anywhere" }}>
            {careGoal}
          </p>
        ) : (
          <p style={{ fontFamily, ...R.body, color: theme.textMuted }}>
            {t("care.pcc.goal.empty")}
          </p>
        )}
      </Section>

      {/* 2 — the patient's own preferences */}
      <Section
        theme={theme}
        isExpanded={isExpanded}
        icon={SlidersHorizontal}
        title={t("care.pcc.preferences.title")}
        actions={
          <CardBadge theme={theme} isExpanded={isExpanded} tone={prefsFilled ? "success" : "neutral"}>
            {prefsFilled ? t("care.pcc.status.recorded") : t("care.pcc.status.notFilled")}
          </CardBadge>
        }
      >
        <PreferencesBody theme={theme} isExpanded={isExpanded} onOpenForm={onOpenForm} />
      </Section>

      {/* 3 — who is with them */}
      <Section
        theme={theme}
        isExpanded={isExpanded}
        icon={UserRound}
        title={t("care.pcc.partner.title")}
        actions={
          partner.status === "unasked" ? undefined : (
            <CardBadge
              theme={theme}
              isExpanded={isExpanded}
              tone={partner.status === "active" ? "success" : partner.status === "nominated" ? "warning" : "neutral"}
            >
              {partner.status === "active" ? t("care.pcc.partner.status.active")
                : partner.status === "nominated" ? t("care.pcc.partner.status.nominated")
                : t("care.pcc.partner.status.declined")}
            </CardBadge>
          )
        }
      >
        <CarePartnerBody theme={theme} isExpanded={isExpanded} />
      </Section>

      {/* 4 — what they still want to say */}
      <Section
        theme={theme}
        isExpanded={isExpanded}
        icon={MessageCircleQuestion}
        title={t("care.pcc.board.title")}
        actions={
          <CardBadge theme={theme} isExpanded={isExpanded} tone={boardCount > 0 ? "brand" : "neutral"}>
            {boardCount > 0 ? t("care.pcc.board.count", String(boardCount)) : t("care.pcc.board.empty")}
          </CardBadge>
        }
      >
        <CommunicationBoardBody theme={theme} isExpanded={isExpanded} />
      </Section>
    </div>
  );
}

/* The answers list, or the invitation to fill it in. Was the whole of the
   "Your Preferences" card; it is now one section of Person-Centered Care. */
function PreferencesBody({ theme, isExpanded = false, onOpenForm }: {
  theme: any;
  isExpanded?: boolean;
  onOpenForm?: () => void;
}) {
  const R = roles(isExpanded);
  const { t, fontFamily } = useLocale();
  const { activeConfigId } = useTheme();
  const nurseStore = useNurseStore();
  const [record, setRecord] = useState(() => readPreferenceRecord());

  /* The form is a modal over this card, which stays mounted underneath it —
     and a same-tab write fires no storage event. */
  useEffect(() => {
    const refresh = () => setRecord(readPreferenceRecord());
    window.addEventListener(PREFS_SAVED_EVENT, refresh);
    return () => window.removeEventListener(PREFS_SAVED_EVENT, refresh);
  }, []);

  const rows: PreferenceSummaryRow[] = preferenceSummaryRows(
    record, t, preferenceAppName(t, activeConfigId, theme.hospitalName));
  const submitted = !!record?.completedAt && rows.length > 0;

  if (!submitted) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p style={{ fontFamily, ...R.body, color: theme.textBody }}>
          {t("care.preferences.description")}
        </p>
        <CardButton
          theme={theme}
          isExpanded={isExpanded}
          onClick={onOpenForm}
          label={t("care.preferences.fill")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* No status row. The card's own header titles this panel and carries the
          demo reset, so the answers start at the top of the body instead of
          under a strip that only restated what a filled-in list already says. */}
      {/* One panel for the whole list: each answer is a row, not a card. */}
      <Section theme={theme} isExpanded={isExpanded} first bare>
        {rows.map((row, i) => (
          <div
            key={row.id}
            style={i === 0 ? undefined : {
              marginTop: isExpanded ? "14px" : "12px",
              paddingTop: isExpanded ? "14px" : "12px",
              borderTop: `1px solid ${theme.borderSubtle}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="flex-1 min-w-0" style={{ fontFamily, ...R.value, color: theme.textHeading }}>
                {row.label}
              </span>
              <CardBadge isExpanded={isExpanded} theme={theme}>
                {row.kind === "time" && <Clock size={12} />}
                {row.value}
              </CardBadge>
            </div>
            {/* The patient's own words, set as a quote rather than as fine
                print — at helper size in textMuted this read as disabled text
                and was being skipped. Logical inline-start so the rule stays
                on the reading edge in Arabic and Urdu.

                FREE TEXT, SO IT IS TYPED, NOT CHOSEN — and the card is a fixed
                width on a fixed panel. Two ways it used to break out of that:

                overflowWrap "anywhere" is for the note with no space in it —
                a run-on sentence, a URL, a long transliteration. Without it
                the line simply kept going past the card's edge and was cut by
                the panel. "anywhere" rather than "break-word" because it also
                lets the paragraph report a narrow min-content width, so a
                flex parent can no longer be widened by the text inside it.

                maxHeight is for the note that IS wrapping and just goes on:
                a few lines high it scrolls on its own instead of pushing the
                answers below it out of the card. Four lines in the slide, six
                in the expanded column, expressed from the type scale so it
                stays whole lines if the body size ever moves. */}
            {row.note && (
              <p
                className="careme-scroll"
                /* The patient may answer in a language other than the one the
                   screen is set to, so the note takes its direction from its
                   own text — otherwise an English note in an Arabic card puts
                   its full stop at the wrong end. */
                dir="auto"
                style={{
                  fontFamily,
                  ...R.body,
                  color: theme.textBody,
                  marginTop: SPACE[1],
                  borderInlineStart: `3px solid ${theme.primary}`,
                  paddingInlineStart: SPACE[1],
                  overflowWrap: "anywhere",
                  maxHeight: `calc(${TYPE_SCALE.base} * ${LEADING.normal} * 4)`,
                  overflowY: "auto",
                }}
              >
                {row.note}
              </p>
            )}
          </div>
        ))}
      </Section>

      {/* Answers are not a submission the patient is stuck with: a preference
          changes during a stay — a diet, a bathing time, who should be in the
          room — and the ward would rather have it updated than stale. Reopens
          the same form with the saved answers already in place. */}
      <div style={{ marginTop: SPACE[2] }}>
        <CardButton
          theme={theme}
          isExpanded={isExpanded}
          onClick={onOpenForm}
          label={t("care.preferences.edit")}
        />
      </div>
    </div>
  );
}

function PreferencesResetButton({ size = 26 }: { size?: number }) {
  const { theme } = useTheme();
  const { t } = useLocale();
  const { isFullAccess } = useAuth();
  const [record, setRecord] = useState(() => readPreferenceRecord());

  useEffect(() => {
    const refresh = () => setRecord(readPreferenceRecord());
    window.addEventListener(PREFS_SAVED_EVENT, refresh);
    return () => window.removeEventListener(PREFS_SAVED_EVENT, refresh);
  }, []);

  if (!isFullAccess || !record?.completedAt) return null;

  return (
    <button
      data-nav="true"
      onClick={() => clearPreferenceRecord()}
      title={t("ppf.demo.reset")}
      aria-label={t("ppf.demo.reset")}
      data-careme="prefs-demo-reset"
      className="shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
      style={{
        width: `${size}px`, height: `${size}px`, borderRadius: "999px",
        backgroundColor: theme.warningSubtle, border: "none", outline: "none",
      }}
    >
      <RotateCcw size={Math.round(size * 0.52)} style={{ color: theme.warningOn }} />
    </button>
  );
}

/* ─── Admission / Discharge Date Strip ─── */
function DateStrip() {
  const R = roles(true);
  const { theme } = useTheme();
  const { t } = useLocale();
  return (
    <div
      className="flex items-center shrink-0 mx-4 mb-3"
      style={{
        borderRadius: theme.radiusMd,
        backgroundColor: theme.primarySubtle,
        border: `1px solid ${theme.borderCardColor}`,
        padding: "8px 12px",
      }}
    >
      {/* Admission */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: theme.radiusMd,
            backgroundColor: theme.primarySubtle,
          }}
        >
          <CalendarDays size={14} style={{ color: theme.primaryOn }} />
        </div>
        <div className="min-w-0" style={{ gap: "0px" }}>
          <p style={{ fontFamily: theme.fontFamily, ...TEXT_STYLE.pill, color: theme.textMuted, lineHeight: "1" }}>
            {t("care.admitted")}
          </p>
          <p style={{ fontFamily: theme.fontFamily, ...R.heading, color: theme.textHeading, lineHeight: "1.2", marginTop: "1px" }}>
            {t("date.5mar2026")}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "28px", backgroundColor: theme.primarySubtle, margin: "0 10px", flexShrink: 0 }} />

      {/* Discharge */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: theme.radiusMd,
            backgroundColor: theme.primarySubtle,
          }}
        >
          <CalendarDays size={14} style={{ color: theme.primaryOn }} />
        </div>
        <div className="min-w-0" style={{ gap: "0px" }}>
          <p style={{ fontFamily: theme.fontFamily, ...TEXT_STYLE.pill, color: theme.textMuted, lineHeight: "1" }}>
            {t("care.discharge")}
          </p>
          <p style={{ fontFamily: theme.fontFamily, ...R.heading, color: theme.textHeading, lineHeight: "1.2", marginTop: "1px" }}>
            {t("date.12mar2026")}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function CareMe({ onExpand, onOpenPreferences }: { onExpand?: () => void; onOpenPreferences?: () => void }) {
  const R = roles(true);
  const { theme } = useTheme();
  const { t, isRTL, dir } = useLocale();
  const nurseStore = useNurseStore();
  const [activeIndex, setActiveIndex] = useState(1); // Start at index 1 because of clones
  const [isBlurred, setIsBlurred] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paused, setPaused] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Navigation lock prevents rapid clicks from stacking out-of-bounds indices
  const isNavigating = useRef(false);
  const navLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter slides based on nurse store section visibility
  const slides = useMemo(() =>
    ALL_SLIDES.filter((s) => slideVisible(s.key, nurseStore.sectionVisibility)),
    [nurseStore.sectionVisibility]
  );

  // Reset activeIndex when slides change (sections toggled)
  useEffect(() => {
    setActiveIndex(1);
  }, [slides.length]);

  // Extended slides for circular carousel: [Last, S0, S1, S2, S3, S4, S5, S6, First]
  const extendedSlides = useMemo(() => [
    slides[slides.length - 1],
    ...slides,
    slides[0]
  ], [slides]);

  const goTo = useCallback(
    (idx: number) => {
      // Hard clamp: never allow out-of-bounds index
      const clamped = Math.max(0, Math.min(idx, extendedSlides.length - 1));
      setActiveIndex(clamped);
    },
    [extendedSlides.length]
  );

  /* Reset scroll to top when slide changes */
  useEffect(() => {
    const el = document.querySelector(`.careme-slide-${activeIndex}`);
    if (el) el.scrollTop = 0;
  }, [activeIndex]);

  /* Auto-rotate every 6 seconds */
  useEffect(() => {
    if (paused || isPinned) return;
    autoTimerRef.current = setInterval(() => {
      // Use functional update + clamp to avoid stale closure issues
      setActiveIndex((prev) => {
        const next = prev + 1;
        return Math.max(0, Math.min(next, extendedSlides.length - 1));
      });
    }, 6000);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [paused, isPinned, extendedSlides.length]);

  /* Cleanup nav lock timer on unmount */
  useEffect(() => {
    return () => {
      if (navLockTimer.current) clearTimeout(navLockTimer.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  /* Pause on user interaction, resume after 15s */
  const pauseAutoRotate = useCallback(() => {
    setPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setPaused(false), 15000);
  }, []);

  const handleManualNav = useCallback(
    (idx: number) => {
      // Block navigation if a transition is already in progress
      if (isNavigating.current) return;
      isNavigating.current = true;
      // Safety release in case transitionend never fires (e.g. no CSS transition)
      if (navLockTimer.current) clearTimeout(navLockTimer.current);
      navLockTimer.current = setTimeout(() => {
        isNavigating.current = false;
      }, 600);
      goTo(idx);
      pauseAutoRotate();
    },
    [goTo, pauseAutoRotate]
  );

  /* ─── Touch-based swipe (more reliable than pointer events with nested scrollables) ─── */
  const touchStartY = useRef(0);
  const swipeLocked = useRef<"none" | "horizontal" | "vertical">("none");

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-nav="true"]')) return;

    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchDeltaX.current = 0;
    swipeLocked.current = "none";
    setDragOffset(0);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (swipeLocked.current === "none") {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        swipeLocked.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }
    }

    // If vertical — let the browser scroll natively, bail out
    if (swipeLocked.current === "vertical") {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    // If horizontal — take over
    if (swipeLocked.current === "horizontal") {
      e.preventDefault(); // prevent vertical scroll while swiping horizontally
      touchDeltaX.current = dx;
      setDragOffset(dx);
      pauseAutoRotate();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 40;
    if (touchDeltaX.current < -threshold) {
      handleManualNav(activeIndex + 1);
    } else if (touchDeltaX.current > threshold) {
      handleManualNav(activeIndex - 1);
    }
    setDragOffset(0);
    touchDeltaX.current = 0;
    swipeLocked.current = "none";
  };

  // Teleportation for circular wrap-around
  const handleTransitionEnd = () => {
    // Unlock navigation so the next click can proceed
    isNavigating.current = false;
    if (navLockTimer.current) clearTimeout(navLockTimer.current);

    if (activeIndex <= 0) {
      // Wrapped past the start — teleport to the real last slide
      setIsSnapping(true);
      setActiveIndex(slides.length);
      setTimeout(() => setIsSnapping(false), 50);
    } else if (activeIndex >= extendedSlides.length - 1) {
      // Wrapped past the end — teleport to the real first slide
      setIsSnapping(true);
      setActiveIndex(1);
      setTimeout(() => setIsSnapping(false), 50);
    }
  };

  const activeSlide = extendedSlides[activeIndex] || slides[0];
  const realIndex =
    activeIndex <= 0 ? slides.length - 1 :
      activeIndex >= extendedSlides.length - 1 ? 0 :
        activeIndex - 1;

  const renderSlideContentItem = (key: string) => {
    switch (key) {
      case "profile": return <PatientProfileSlide theme={theme} />;
      case "overview": return <CareOverviewSlide theme={theme} />;
      case "plan": return <CarePlanSlide theme={theme} />;
      case "tests": return <TestsAndProceduresSlide theme={theme} />;
      case "preferences": return <PersonCenteredCareSlide theme={theme} onOpenForm={onOpenPreferences} />;
      case "discharge": return <DischargeSlide theme={theme} />;
      case "dischargePlan": return <DischargePlanSlide theme={theme} />;
      case "observations": return <ClinicalObservationsSlide theme={theme} />;
      default: return null;
    }
  };

  return (
    <div
      dir="ltr"
      className="flex flex-col overflow-hidden relative select-none flex-1 min-h-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        backgroundColor: theme.engagementSurface,
        backgroundImage: theme.engagementCardGradient,
        borderRadius: theme.radiusCard,
        boxShadow: SHADOW.md,
        border: theme.engagementCardBorder,
        touchAction: "pan-y",
      }}
    >
      {/* Integrated header — the card title, its actions and the active
          slide's heading, all on the card's own surface and fixed while the
          body scrolls. Content aligns to the same 16px inset as the body. */}
      <div
        dir={dir}
        className="shrink-0"
        style={{
          padding: CARD_PAD.headerSlide,
          borderBottom: `1px solid ${theme.borderSubtle}`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0" style={{ gap: "10px" }}>
            <HeartIcon />
            <span style={{ fontFamily: theme.fontFamily, ...TEXT_STYLE.sectionTitle, color: theme.textHeading }}>CareMe</span>
          </div>
          {/* Every control here is a 44×44 target; the glyphs stay their own size. */}
          <div className="flex items-center shrink-0" style={{ marginInlineEnd: "-10px" }}>
            {nurseStore.nurseViewShortcutVisible && (
              <button
                data-nav="true"
                onClick={() => window.dispatchEvent(new CustomEvent("open-nurse-view"))}
                className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                style={{
                  minHeight: "44px", padding: "0 10px",
                  borderRadius: theme.radiusMd, outline: "none",
                  backgroundColor: theme.primarySubtle,
                  border: `1px solid ${theme.borderCardColor}`,
                }}
                aria-label="Update in Nurse View"
              >
                <Stethoscope size={18} style={{ color: theme.primaryOn }} />
                <span style={{ fontFamily: theme.fontFamily, ...TEXT_STYLE.pill, color: theme.primaryOn }}>
                  Nurse View
                </span>
              </button>
            )}

            <TapTarget theme={theme} label="Toggle privacy blur" onClick={() => setIsBlurred(prev => !prev)}>
              {isBlurred
                ? <EyeOff size={18} style={{ color: theme.primaryOn }} />
                : <Eye size={18} style={{ color: theme.primaryOn }} />}
            </TapTarget>
            <TapTarget
              theme={theme}
              label={isPinned ? "Unpin slider" : "Pin slider"}
              onClick={() => setIsPinned(prev => !prev)}
              style={{ backgroundColor: isPinned ? theme.accentSubtle : "transparent" }}
            >
              <Pin
                size={18}
                style={{
                  color: isPinned ? theme.accentOn : theme.primaryOn,
                  fill: isPinned ? theme.accentOn : "none",
                  transform: isPinned ? "rotate(45deg)" : "none",
                  transition: "all 0.2s ease",
                }}
              />
            </TapTarget>
            {onExpand && (
              <TapTarget theme={theme} label="Expand CareMe" onClick={onExpand}>
                <Maximize2 size={18} style={{ color: theme.primaryOn }} />
              </TapTarget>
            )}
            <TapTarget theme={theme} label="Previous slide" onClick={() => handleManualNav(activeIndex - 1)}>
              <ChevronLeft size={18} strokeWidth={2} style={{ color: theme.primaryOn, transform: isRTL ? "scaleX(-1)" : undefined }} />
            </TapTarget>
            <TapTarget theme={theme} label="Next slide" onClick={() => handleManualNav(activeIndex + 1)}>
              <ChevronRight size={18} strokeWidth={2} style={{ color: theme.primaryOn, transform: isRTL ? "scaleX(-1)" : undefined }} />
            </TapTarget>
          </div>
        </div>

        {/* The active slide, as a section heading under the card's title. */}
        <div className="flex items-center" style={{ gap: "10px", marginTop: "12px" }}>
          <SlideIcon slideKey={activeSlide.key} />
          <span
            className="flex-1 min-w-0"
            style={{ fontFamily: theme.fontFamily, ...TEXT_STYLE.subtitle, color: theme.primaryOn, overflowWrap: "anywhere" }}
          >
            {t(activeSlide.titleKey)}
          </span>
          {activeSlide.key === "preferences" && <PreferencesResetButton />}
          <span
            dir="ltr"
            className="shrink-0"
            style={{ fontFamily: theme.fontFamily, ...R.label, color: theme.textMuted }}
          >
            {realIndex + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Slide Content */}
      <div
        className="flex-1 min-h-0 overflow-hidden relative"
        dir="ltr"
        style={{
          filter: isBlurred ? "blur(12px)" : "none",
          transition: "filter 0.3s ease",
        }}
      >
        <div
          className="flex h-full"
          onTransitionEnd={handleTransitionEnd}
          dir="ltr"
          style={{
            width: `${extendedSlides.length * 100}%`,
            transition: (isDragging || isSnapping) ? "none" : "transform 0.5s cubic-bezier(0.2, 1, 0.2, 1)",
            transform: `translateX(calc(-${(activeIndex * 100) / extendedSlides.length}% + ${dragOffset}px))`,
          }}
        >
          {extendedSlides.map((slide, i) => (
            <div
              key={`${slide.key}-${i}`}
              className={`h-full overflow-y-auto careme-scroll shrink-0 careme-slide-${i}`}
              dir={dir}
              style={{
                width: `${100 / extendedSlides.length}%`,
                padding: CARD_PAD.bodySlide,
                pointerEvents: isBlurred ? "none" : "auto",
              }}
            >
              {renderSlideContentItem(slide.key)}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-2 py-3 shrink-0">
        {slides.map((s, i) => (
          <button
            key={s.key}
            data-nav="true"
            onClick={() => handleManualNav(i + 1)}
            className="rounded-full transition-transform duration-300 cursor-pointer"
            style={{
              width: i === realIndex ? "20px" : "6px",
              height: "6px",
              backgroundColor: i === realIndex ? theme.primaryOn : theme.borderDefault,
            }}
            aria-label={`Go to ${t(s.titleKey)}`}
          />
        ))}
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .careme-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .careme-scroll::-webkit-scrollbar-track {
          background: transparent;
          margin: 4px 0;
        }
        .careme-scroll::-webkit-scrollbar-thumb {
          background: ${theme.primary}4D; /* 30% opacity */
          border-radius: 100px;
        }
        .careme-scroll::-webkit-scrollbar-thumb:active {
          background: ${theme.primary};
          opacity: 0.35;
        }
        .careme-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${theme.primaryOn}4D transparent;
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * CareMeExpanded — Full-screen overlay showing all 6 slides as columns
 * ═══════════════════════════════════════════════════════════════════════════ */

function ExpandedSlideIcon({ slideKey, size = 22 }: { slideKey: string; size?: number }) {
  const iconProps = { size, strokeWidth: 2 };
  switch (slideKey) {
    case "profile": return <IdCard {...iconProps} />;
    case "overview": return <Activity {...iconProps} />;
    case "plan": return <ClipboardList {...iconProps} />;
    case "tests": return <ClipboardCheck {...iconProps} />;
    case "baby": return <Baby {...iconProps} />;
    case "preferences": return <HeartHandshake {...iconProps} />;
    case "billing": return <Wallet {...iconProps} />;
    case "discharge": return <LogOut {...iconProps} />;
    case "dischargePlan": return <FileText {...iconProps} />;
    case "observations": return <Activity {...iconProps} />;
    default: return <Heart {...iconProps} />;
  }
}

function renderExpandedSlideContent(key: string, theme: any, t: (k: string) => string, nurseStore: any, onOpenPreferences?: () => void) {
  switch (key) {
    case "profile": return <PatientProfileSlide theme={theme} isExpanded />;
    case "overview": return <CareOverviewSlide theme={theme} isExpanded />;
    case "plan": return <CarePlanSlide theme={theme} isExpanded />;
    case "tests": return <TestsAndProceduresSlide theme={theme} isExpanded />;
    case "preferences": return <PersonCenteredCareSlide theme={theme} isExpanded onOpenForm={onOpenPreferences} />;
    case "discharge": return <DischargeSlide theme={theme} isExpanded />;
    case "dischargePlan": return <DischargePlanSlide theme={theme} isExpanded />;
    case "observations": return <ClinicalObservationsSlide theme={theme} isExpanded />;
    default: return null;
  }
}

export function CareMeExpanded({ onClose, onOpenPreferences }: { onClose: () => void; onOpenPreferences?: () => void }) {
  const { theme } = useTheme();
  const { t, isRTL } = useLocale();
  const nurseStore = useNurseStore();
  const primary = theme.primary;

  // Filter slides by nurse visibility
  const slides = useMemo(() =>
    ALL_SLIDES.filter((s) => slideVisible(s.key, nurseStore.sectionVisibility)),
    [nurseStore.sectionVisibility]
  );

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        background: theme.pageGradient,
        animation: "caremeExpandIn 0.25s ease-out",
      }}
    >
      {/* Subtle background texture */}
      <ApiImage
        src={theme.heroImageUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ opacity: 0.06, mixBlendMode: "luminosity" }}
      />

      {/* Header */}
      <InternalPageHeader
        title="CareMe"
        subtitle={t("care.subtitle")}
        icon={<Heart size={26} fill="#fff" style={{ color: "#fff" }} />}
        onClose={onClose}
      />

      {/* Vertically centered content area */}
      <div className="flex-1 flex flex-col justify-center relative z-10 min-h-0 pt-4">
        {/* Horizontal Scrolling Columns — 4 visible at once */}
        <div className={`flex-1 flex gap-4 pb-12 overflow-x-auto no-scrollbar ${isRTL ? "pr-[172px] pl-10" : "pl-[172px] pr-10"}`}>
          {slides.map((slide) => (
            <CareMeCard
              key={slide.key}
              theme={theme}
              isExpanded
              icon={
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: `${ICON_BOX.cardHeader.slide}px`,
                    height: `${ICON_BOX.cardHeader.slide}px`,
                    borderRadius: theme.radiusMd,
                    backgroundColor: theme.primarySubtle,
                    color: theme.primaryOn,
                  }}
                >
                  <ExpandedSlideIcon slideKey={slide.key} size={22} />
                </div>
              }
              title={t(slide.titleKey)}
              actions={slide.key === "preferences" ? <PreferencesResetButton /> : undefined}
              style={{
                width: "calc(25% - 12px)",
                /* The row is a grid of equal cards — a fixed height here, and
                   content that stays at the top INSIDE each one. Letting the
                   frames size to their content left them ragged and floating
                   in an empty expanse. */
                height: "710px",
                flexShrink: 0,
                alignSelf: "center",
                animation: "caremeExpandIn 0.3s ease-out both",
              }}
            >
              {renderExpandedSlideContent(slide.key, theme, t, nurseStore, onOpenPreferences)}
            </CareMeCard>
          ))}
        </div>
      </div>

      {/* Scrollbar + animation styles */}
      <style>{`
        @keyframes caremeExpandIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .careme-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .careme-scroll::-webkit-scrollbar-track {
          background: transparent;
          margin: 4px 0;
        }
        .careme-scroll::-webkit-scrollbar-thumb {
          background: ${theme.primary}4D;
          border-radius: 100px;
        }
        .careme-scroll::-webkit-scrollbar-thumb:active {
          background: ${theme.primary};
          opacity: 0.35;
        }
        .careme-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${theme.primaryOn}4D transparent;
        }
      `}</style>
    </div>
  );
}