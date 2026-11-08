import { useState, useEffect, useRef, useCallback, Children, Fragment } from "react";
import { ApiImage } from "./ApiImage";
import {
  isAndroidApp,
  brightness as brightnessBridge,
  volume as volumeBridge,
  bluetooth as bluetoothBridge,
  wifi as wifiBridge,
  cast as castBridge,
  dnd as dndBridge,
  nightLight as nightLightBridge,
  useAndroidEvent,
  useDeviceInfo,
  UI_VERSION,
  getNativeAppVersion,
} from "../utils/androidBridge";
import { useNurseStore } from "./NurseDataStore";
import { getMemoryStats, subscribeMemoryStats } from "../lib/memoryPressure";
import {
  X,
  Sun,
  Volume2,
  Globe,
  Wifi,
  Moon,
  BellOff,
  Settings,
  Bluetooth,
  Trash2,
  LogOut,
  ChevronRight,
  Info,
  Minus,
  Plus,
  Check,
  Monitor,
  Cast,
  Tv,
  Loader2,
  RotateCcw,
  RefreshCw,
  Signal,
  Lock,
  KeyRound,
  Smartphone,
  Headphones,
  Speaker,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Search,
  Maximize,
  Minimize,
  Stethoscope,
  Users,
  UserCircle,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useAuth } from "./AuthContext";
import { clearUserDataAndReload, clearAllDataAndReload } from "../lib/clearAllData";
import { BrushCleaningIcon } from "./PatientGreeting";
import { NurseInterface } from "./nurse/NurseInterface";
import type { Locale } from "./i18n";
import imgMosque from "../../assets/b51acb5e2ec4a2c930572c53103b020b12e76ee2.webp";
import { getPrayerStatus, getCountdown, formatPrayerTime, PRAYER_NAMES } from "../utils/prayerUtils";
import { MyPreferencesDialog } from "./MyAccountDialog";
import { PinDialog } from "./PinDialog";
import { isAccountSet } from "../lib/accountAuth";
import { useSettingsPreview } from "./settingsPreview";
import { DialogFrame, DialogTitleBar, DialogText, DialogButton, DialogActions, DialogSwitchRow, DialogPinned } from "./dialogKit";
import { ListRowGroup, ListRow } from "./listRow";
import { resetAppLockTutorial } from "../lib/appLockTutorialStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { RELEASES, CHANGE_TYPES } from "../data/releaseNotes";
import { useGuestMode } from "../lib/guestMode";

/* ═══════════════════════════════════════════════════════════════
 * All colors/fonts/radii in this file come from ThemeContext.
 * To rebrand: change ONLY the theme config in ThemeContext.tsx.
 * ═══════════════════════════════════════════════════════════════ */

/* ─── Slider with touch-friendly +/- buttons ─── */
function SettingsSlider({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const { theme: t } = useTheme();
  const { isRTL } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calcValue = (e: React.PointerEvent | PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    
    let percentage: number;
    if (isRTL) {
      percentage = (rect.right - e.clientX) / rect.width;
    } else {
      percentage = (e.clientX - rect.left) / rect.width;
    }
    
    return Math.max(0, Math.min(100, Math.round(percentage * 100)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    onChange(calcValue(e));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    onChange(calcValue(e));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: t.radiusMd,
            backgroundColor: t.primarySubtle,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontFamily: t.fontFamily,
            fontSize: "15px",
            fontWeight: 700,
            color: t.textHeading,
          }}
        >
          {label}
        </span>
        <span
          className="ml-auto"
          style={{
            fontFamily: t.fontFamily,
            fontSize: "14px",
            fontWeight: 700,
            color: t.primaryOn,
          }}
        >
          {value}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 10))}
          className="shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            width: t.touchTargetMin,
            height: t.touchTargetMin,
            borderRadius: t.radiusMd,
            backgroundColor: t.primarySubtle,
            border: "none",
          }}
        >
          <Minus size={18} style={{ color: t.primaryOn }} />
        </button>
        <div
          ref={trackRef}
          className="flex-1 relative cursor-pointer"
          style={{ 
            height: "12px", 
            borderRadius: t.radiusSm, 
            backgroundColor: t.sliderBg, 
            touchAction: "none" 
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Track fill */}
          <div
            style={{
              height: "100%",
              borderRadius: t.radiusSm,
              backgroundColor: t.sliderTrack,
              width: `${value}%`,
              transition: isDragging ? "none" : "width 0.2s ease-out",
            }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2"
            style={{
              [isRTL ? "right" : "left"]: `${value}%`,
              transform: `translate(${isRTL ? "50%" : "-50%"}, -50%)`,
              width: isDragging ? "24px" : "20px",
              height: isDragging ? "24px" : "20px",
              borderRadius: t.radiusFull,
              backgroundColor: t.sliderThumb,
              border: `3px solid ${t.surface}`,
              boxShadow: isDragging ? `0 4px 12px ${t.primary}44` : `0 2px 6px rgba(0,0,0,0.15)`,
              transition: isDragging ? "width 0.1s, height 0.1s" : "all 0.2s ease-out",
              zIndex: 10,
            }}
          />
        </div>
        <button
          onClick={() => onChange(Math.min(100, value + 10))}
          className="shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            width: t.touchTargetMin,
            height: t.touchTargetMin,
            borderRadius: t.radiusMd,
            backgroundColor: t.primarySubtle,
            border: "none",
          }}
        >
          <Plus size={18} style={{ color: t.primaryOn }} />
        </button>
      </div>
    </div>
  );
}

function QuickTile({
  icon,
  label,
  active,
  onTap,
  onLongPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onTap: () => void;
  onLongPress?: () => void;
}) {
  const { theme: t } = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startLongPress = useCallback(() => {
    didLongPress.current = false;
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        didLongPress.current = true;
        onLongPress();
      }, 500);
    }
  }, [onLongPress]);

  const cancelLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!didLongPress.current) {
      onTap();
    }
    didLongPress.current = false;
  }, [onTap]);

  return (
    <button
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onClick={handleClick}
      className="flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-[0.92] select-none"
      style={{
        flex: 1,
        height: "100px",
        borderRadius: t.radiusLg,
        backgroundColor: active ? t.tileActiveBg : t.tileInactiveBg,
        border: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: t.fontFamily,
          fontSize: "13px",
          fontWeight: 700,
          color: active ? t.tileActiveText : t.tileInactiveText,
          letterSpacing: "0.2px",
          textAlign: "center",
          lineHeight: "1.2",
        }}
      >
        {label}
      </span>
    </button>
  );
}

/* ─── Language Picker ───
 * A plain list, so it holds two languages or twenty: it scrolls inside the
 * dialog past about six. Each language in its own script first (a patient
 * picks the one they can read), its English name under it. */
const LANGUAGE_OPTIONS: { key: Locale; label: string; native: string }[] = [
  { key: "en", label: "English", native: "English" },
  { key: "ar", label: "Arabic", native: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { key: "ur", label: "Urdu", native: "\u0627\u0631\u062f\u0648" },
];

/* Demo only: seven sample languages, to judge the popup with ten. They
   can be picked to see the selection, but Apply works only for the three
   the app speaks. Switched in the nurse view (Settings panel rows). */
const SAMPLE_LANGUAGES: { key: string; label: string; native: string }[] = [
  { key: "fr", label: "French", native: "Français" },
  { key: "hi", label: "Hindi", native: "हिन्दी" },
  { key: "bn", label: "Bengali", native: "বাংলা" },
  { key: "tl", label: "Filipino", native: "Filipino" },
  { key: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { key: "ml", label: "Malayalam", native: "മലയാളം" },
  { key: "ru", label: "Russian", native: "Русский" },
];

function LanguagePicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (lang: string) => void;
}) {
  const { theme: t } = useTheme();
  const preview = useSettingsPreview();
  const options = preview.sampleLanguages ? [...LANGUAGE_OPTIONS, ...SAMPLE_LANGUAGES] : LANGUAGE_OPTIONS;
  return (
    /* No scroll box of its own: the popup scrolls (up to its 640 cap) with
       Cancel / Apply pinned under the list, so ten languages show about
       seven rows at a time. The 2px inset keeps the selected row's outline
       from being clipped. */
    <div className="flex flex-col gap-2" style={{ padding: "2px" }}>
      {options.map((opt) => {
        const isActive = selected === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className="flex items-center gap-3 w-full cursor-pointer active:scale-[0.98] transition-transform select-none shrink-0"
            style={{
              minHeight: "60px",
              padding: "8px 16px",
              borderRadius: t.radiusLg,
              backgroundColor: isActive ? t.primarySubtle : "transparent",
              border: `1.5px solid ${isActive ? t.borderActive : t.borderDefault}`,
            }}
          >
            <div className="flex-1 min-w-0 flex flex-col" style={{ textAlign: "start", gap: "2px" }}>
              <span style={{ fontFamily: t.fontFamily, fontSize: "17px", fontWeight: 700, lineHeight: 1.5, color: isActive ? t.primaryOn : t.textHeading }}>
                {opt.native}
              </span>
              {opt.native !== opt.label && (
                <span style={{ fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 500, lineHeight: 1.4, color: t.textMuted }}>
                  {opt.label}
                </span>
              )}
            </div>
            {isActive && (
              <div
                className="shrink-0 flex items-center justify-center"
                style={{ width: "24px", height: "24px", borderRadius: t.radiusFull, backgroundColor: t.primary }}
              >
                <Check size={14} style={{ color: t.brandOnPrimary }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Centered Dialog (reusable for Wi-Fi, Bluetooth, Cast, Clear Data) ─── */
function CenteredDialog({
  children,
  onClose,
  size = "content",
}: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
  /** "device" for Wi-Fi, Bluetooth and Cast. */
  size?: "small" | "device" | "content";
}) {
  return <DialogFrame onClose={onClose} size={size}>{children}</DialogFrame>;
}

/* ─── Dialog Header (reusable) ─── the shared title bar itself, so the
   frame can keep it fixed while the list under it scrolls. */
const DialogHeader = DialogTitleBar;

/* ─── Dialog Section Label ─── */
function DialogSectionLabel({ children, action }: { children: string; action?: React.ReactNode }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-center justify-between" style={{ minHeight: action ? 44 : undefined, marginBottom: "4px" }}>
      <span style={{ fontFamily: t.fontFamily, fontSize: "14px", fontWeight: 600, color: t.textMuted }}>
        {children}
      </span>
      {action}
    </div>
  );
}

/* ─── Scan again ───
 * Next to "Available devices": search once more without closing the popup.
 * The list stays while it searches (the phones show a spinner, not an empty
 * screen); the button reads "Searching…" and waits until the scan ends. */
function ScanAgainButton({ scanning, onScan }: { scanning: boolean; onScan: () => void }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  return (
    <button
      onClick={scanning ? undefined : onScan}
      disabled={scanning}
      className="shrink-0 flex items-center cursor-pointer active:scale-95 transition-transform"
      style={{
        minHeight: 44, gap: "8px", padding: "0 12px", marginInlineEnd: "-12px",
        borderRadius: t.radiusMd, background: "none", border: "none", outline: "none",
        fontFamily: t.fontFamily, fontSize: "15px", fontWeight: 600,
        color: scanning ? t.textMuted : t.primaryOn,
      }}
    >
      {scanning
        ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
        : <RefreshCw size={18} />}
      {scanning ? tr("scan.searching") : tr("scan.again")}
    </button>
  );
}

/** A second scan, started by Scan again. */
function useRescan(start: () => void, stop?: () => void, ms = 4000) {
  const [rescanning, setRescanning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const rescan = () => {
    setRescanning(true);
    start();
    timer.current = setTimeout(() => { setRescanning(false); stop?.(); }, ms);
  };
  return { rescanning, rescan };
}

/* ─── Device List Item (reusable for Wi-Fi, Bluetooth, Cast) ─── */
function DeviceListItem({
  icon,
  name,
  subtitle,
  isConnected,
  disabled,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  name: string;
  subtitle: string;
  isConnected: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Replaces the check: a per-row control (Bluetooth's Disconnect). */
  trailing?: React.ReactNode;
}) {
  const { theme: t } = useTheme();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full cursor-pointer active:scale-[0.98] transition-transform select-none shrink-0"
      style={{
        minHeight: "60px",
        padding: "10px 14px",
        borderRadius: t.radiusLg,
        backgroundColor: isConnected ? t.primarySubtle : t.tileInactiveBg,
        border: isConnected ? `1.5px solid ${t.borderActive}` : "1.5px solid transparent",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: "36px",
          height: "36px",
          borderRadius: t.radiusMd,
          backgroundColor: isConnected ? t.primarySubtle : t.tileInactiveBg,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0" style={{ textAlign: "start" }}>
        <span
          style={{
            fontFamily: t.fontFamily,
            fontSize: "16px",
            fontWeight: 700,
            lineHeight: 1.4,
            color: isConnected ? t.primaryOn : t.textHeading,
            display: "block",
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: t.fontFamily,
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: 1.4,
            color: isConnected ? t.primaryOn : t.textMuted,
            display: "block",
            marginTop: "1px",
          }}
        >
          {subtitle}
        </span>
      </div>
      {trailing ?? (isConnected && (
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: "22px",
            height: "22px",
            borderRadius: t.radiusFull,
            backgroundColor: t.primary,
          }}
        >
          <Check size={13} style={{ color: t.textInverse }} strokeWidth={3} />
        </div>
      ))}
    </button>
  );
}

/* ─── Disconnect Button (reusable) ─── destructive: it ends a connection
   the patient is using, so red — as an outline, since it is routine and
   undone with one tap. */
function DisconnectButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <DialogActions style={{ marginTop: "16px" }}>
      <DialogButton kind="dangerOutline" label={label} onClick={onClick} />
    </DialogActions>
  );
}

/* ─── Scanning State ─── */
function ScanningState({ message }: { message: string }) {
  const { theme: t } = useTheme();
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      style={{ padding: "24px 0" }}
    >
      <Loader2
        size={28}
        style={{ color: t.primaryOn, animation: "spin 1s linear infinite" }}
      />
      <span
        style={{
          fontFamily: t.fontFamily,
          fontSize: "14px",
          fontWeight: 600,
          color: t.textMuted,
        }}
      >
        {message}
      </span>
    </div>
  );
}

/* ─── Wi-Fi Dialog ─── */

/** Map dBm signal level to 1/2/3 strength bars */
function rssiToStrength(dbm: number): 1 | 2 | 3 {
  if (dbm >= -60) return 3;
  if (dbm >= -75) return 2;
  return 1;
}

/** Mock networks shown in regular-browser fallback mode */
const mockWifiNetworks = [
  { id: "dsfh-patient", name: "DSFH-Patient", secured: true, strength: 3 as 1 | 2 | 3 },
  { id: "dsfh-guest", name: "DSFH-Guest", secured: false, strength: 2 as 1 | 2 | 3 },
  { id: "dsfh-staff", name: "DSFH-Staff", secured: true, strength: 3 as 1 | 2 | 3 },
  { id: "eduroam", name: "eduroam", secured: true, strength: 1 as 1 | 2 | 3 },
];

function WifiDialog({
  onClose,
  connectedId,
  onConnect,
  onDisconnect,
  enabled,
  onToggle,
}: {
  onClose: () => void;
  connectedId: string | null;
  onConnect: (id: string) => void;
  onDisconnect: () => void;
  /** The master switch at the top, as on the phones' own Wi-Fi screen. */
  enabled?: boolean;
  onToggle?: (on: boolean) => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const isNative = isAndroidApp();

  // Dynamic network list — mock for browser, live for kiosk
  const [wifiNetworks, setWifiNetworks] = useState(
    isNative ? [] as { id: string; name: string; secured: boolean; strength: 1 | 2 | 3 }[] : mockWifiNetworks
  );

  const [scanning, setScanning] = useState(true);
  const wifiScan = useRescan(() => { if (isNative) wifiBridge.startScan(); });

  useEffect(() => {
    if (isNative) {
      wifiBridge.startScan();
    }
    const timer = setTimeout(() => setScanning(false), 1200);
    return () => clearTimeout(timer);
  }, [isNative]);

  // Accumulate networks from scan events (kiosk only)
  useAndroidEvent<{ ssid: string; bssid: string; signalLevel: number; secured: boolean }>(
    'wifi-network-found',
    (d) => {
      if (!isNative) return;
      setWifiNetworks((prev) => {
        const filtered = prev.filter((n) => n.id !== d.bssid);
        return [
          ...filtered,
          {
            id: d.bssid,
            name: d.ssid || d.bssid,
            secured: d.secured,
            strength: rssiToStrength(d.signalLevel),
          },
        ];
      });
    }
  );

  return (
    <CenteredDialog onClose={onClose} size="device">
      <DialogHeader
        icon={<Wifi size={20} style={{ color: t.primaryOn }} />}
        title={tr("settings.wifi")}
        onClose={onClose}
      />
      <div className="flex flex-col" style={{ paddingTop: "16px" }}>
        {onToggle && (
          <DialogPinned>
            <DialogSwitchRow label={tr("settings.wifi")} on={enabled !== false} onChange={onToggle} />
          </DialogPinned>
        )}
        {enabled === false ? (
          <DialogText>{tr("wifi.offHint")}</DialogText>
        ) : scanning ? (
          <ScanningState message={tr("wifi.scanning")} />
        ) : (
          <div className="flex flex-col gap-2">
            <DialogSectionLabel action={<ScanAgainButton scanning={wifiScan.rescanning} onScan={wifiScan.rescan} />}>{tr("wifi.available")}</DialogSectionLabel>
            {wifiNetworks.map((net) => {
              const isConnected = connectedId === net.id;
              return (
                <DeviceListItem
                  key={net.id}
                  icon={<Signal size={18} style={{ color: isConnected ? t.primaryOn : t.iconDefault }} />}
                  name={net.name}
                  subtitle={isConnected ? tr("wifi.connected") : net.secured ? tr("wifi.secured") : tr("wifi.open")}
                  isConnected={isConnected}
                  onClick={() => {
                    /* Connected: Disconnect is the named button below, as on
                       the phones — a tap on the row never drops the network. */
                    if (isConnected) {
                      return;
                    } else if (isNative) {
                      // TODO: add an inline password prompt for secured networks.
                      // For now, delegate to Android's own Wi-Fi settings UI so
                      // the user can enter the password there.
                      wifiBridge.openSettings();
                    } else {
                      onConnect(net.id);
                    }
                  }}
                />
              );
            })}
            {connectedId && (
              <DisconnectButton
                label={tr("settings.disconnect")}
                onClick={() => onDisconnect()}
              />
            )}
          </div>
        )}
      </div>
    </CenteredDialog>
  );
}

/* ─── Bluetooth Dialog ─── */

/** Mock BT devices shown in regular-browser fallback mode */
const mockBtDevices = [
  { id: "bt-speaker", name: "Room 412 Speaker", type: "Speaker", icon: Speaker, paired: true },
  { id: "bt-phone", name: "Nurse Call Button", type: "Medical Device", icon: Smartphone, paired: true },
  { id: "bt-headphones", name: "Patient Headphones", type: "Audio", icon: Headphones, paired: true },
  { id: "bt-earbuds", name: "Galaxy Buds Pro", type: "Audio", icon: Headphones, paired: false },
  { id: "bt-speaker2", name: "JBL Flip 6", type: "Speaker", icon: Speaker, paired: false },
  { id: "bt-phone2", name: "iPhone 15", type: "Phone", icon: Smartphone, paired: false },
];

/* Android keeps Bluetooth devices of different kinds connected together
   (a speaker and the nurse call button, say), so each connected row has its
   own Disconnect. Audio is one device at a time: Android's "maximum connected
   audio devices" is 1 by default, so connecting a second speaker/headset
   replaces the first. Wi-Fi and Cast are one-at-a-time and keep a single
   Disconnect. */
const BT_AUDIO_TYPES = ["Speaker", "Audio", "Headphones"];
export function isBtAudio(type: string | undefined) {
  return !!type && BT_AUDIO_TYPES.includes(type);
}
export function BluetoothDialog({
  onClose,
  connectedIds,
  onConnect,
  onDisconnect,
  enabled,
  onToggle,
}: {
  onClose: () => void;
  connectedIds: string[];
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  /** The master switch at the top, as on the phones' own Bluetooth screen. */
  enabled?: boolean;
  onToggle?: (on: boolean) => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const isNative = isAndroidApp();
  /* Two cases, chosen per build (demo: nurse view switch).
     Several at once: Disconnect on each connected row + Disconnect all.
     One at a time: a check on the connected row + a single Disconnect. */
  const single = useSettingsPreview().btSingle;

  // Dynamic device list — mock for browser, live for kiosk
  const [btDevices, setBtDevices] = useState(
    isNative
      ? [] as { id: string; name: string; type: string; icon: typeof Bluetooth; paired: boolean; rssi?: number }[]
      : mockBtDevices
  );

  const [scanning, setScanning] = useState(true);
  const btScan = useRescan(
    () => { if (isNative) bluetoothBridge.startScan(); },
    () => { if (isNative) bluetoothBridge.stopScan(); },
  );

  useEffect(() => {
    if (isNative) {
      bluetoothBridge.startScan();
    }
    const timer = setTimeout(() => setScanning(false), 1400);
    return () => {
      clearTimeout(timer);
      if (isNative) {
        bluetoothBridge.stopScan();
      }
    };
  }, [isNative]);

  // Accumulate discovered BT devices from scan events (kiosk only)
  useAndroidEvent<{ name: string; address: string; rssi: number; paired: boolean }>(
    'bluetooth-device-found',
    (d) => {
      if (!isNative) return;

      // Filter out unnamed or placeholder devices
      const name = d.name?.trim() || "";
      if (
        !name ||
        name.toLowerCase() === "unknown" ||
        name.toLowerCase() === "unknown device"
      ) {
        return;
      }

      setBtDevices((prev) => {
        const filtered = prev.filter((x) => x.id !== d.address);
        return [
          ...filtered,
          {
            id: d.address,
            name: d.name || 'Unknown device',
            type: 'Bluetooth device',
            icon: Bluetooth,
            paired: d.paired,
            rssi: d.rssi,
          },
        ].sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
      });
    }
  );

  // Confirm connection from native event
  useAndroidEvent<{ address: string }>(
    'bluetooth-device-connected',
    (d) => {
      if (!isNative) return;
      onConnect(d.address);
    }
  );

  /* Connecting a device pairs it, so a connected one is listed with the paired. */
  const pairedDevices = btDevices.filter((d) => d.paired || connectedIds.includes(d.id));
  const availableDevices = btDevices.filter((d) => !d.paired && !connectedIds.includes(d.id));

  /* No search box: a bedside list is a handful of devices, read at a glance. */
  const filteredPaired = pairedDevices;
  const filteredAvailable = availableDevices;

  return (
    <CenteredDialog onClose={onClose} size="device">
      <DialogHeader
        icon={<Bluetooth size={20} style={{ color: t.primaryOn }} />}
        title={tr("settings.bluetooth")}
        onClose={onClose}
      />
      <div className="flex flex-col" style={{ paddingTop: "16px" }}>
        {onToggle && (
          <DialogPinned>
            <DialogSwitchRow label={tr("settings.bluetooth")} on={enabled !== false} onChange={onToggle} />
          </DialogPinned>
        )}
        {enabled === false ? (
          <DialogText>{tr("bt.offHint")}</DialogText>
        ) : scanning ? (
          <ScanningState message={tr("bt.searching")} />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Paired + Available sections (Scrollable) */}
            <div
              className="flex flex-col gap-3"
              style={{

              }}
            >
              {/* Paired devices section */}
              {filteredPaired.length > 0 && (
                <div className="flex flex-col gap-2">
                  <DialogSectionLabel>{tr("bt.paired")}</DialogSectionLabel>
                  {filteredPaired.map((device) => {
                    const isConnected = connectedIds.includes(device.id);
                    const DevIcon = device.icon;
                    return (
                      <DeviceListItem
                        key={device.id}
                        icon={<DevIcon size={18} style={{ color: isConnected ? t.primaryOn : t.iconDefault }} />}
                        name={device.name}
                        subtitle={isConnected ? tr("wifi.connected") : tr("bt.pairedStatus")}
                        isConnected={isConnected}
                        trailing={isConnected && !single ? (
                          <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); onDisconnect(device.id); }}
                            className="shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                            style={{
                              minHeight: "44px", padding: "0 14px", borderRadius: t.radiusMd,
                              /* Red outline: destructive, but repeated on each row, so not a solid red block. */
                              border: `1.5px solid ${t.errorOn}`, backgroundColor: t.surface,
                              fontFamily: t.fontFamily, fontSize: "15px", fontWeight: 600, color: t.errorOn,
                            }}
                          >
                            {tr("settings.disconnect")}
                          </span>
                        ) : undefined}
                        onClick={() => {
                          if (isConnected) return;
                          if (isNative) bluetoothBridge.connect(device.id);
                          else onConnect(device.id);
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Available devices section — always shown, so Scan again is
                  there even when the last search found nothing. */}
              {(
                <div className="flex flex-col gap-2">
                  <DialogSectionLabel action={<ScanAgainButton scanning={btScan.rescanning} onScan={btScan.rescan} />}>{tr("bt.available")}</DialogSectionLabel>
                  {filteredAvailable.length === 0 && <DialogText>{tr("bt.noDevices")}</DialogText>}
                  {filteredAvailable.map((device) => {
                    const DevIcon = device.icon;
                    return (
                      <DeviceListItem
                        key={device.id}
                        icon={<DevIcon size={18} style={{ color: t.iconDefault }} />}
                        name={device.name}
                        subtitle={device.type}
                        isConnected={false}
                        onClick={() => {
                          if (isNative) bluetoothBridge.connect(device.id);
                          else onConnect(device.id);
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {connectedIds.length > 0 && (
                <DisconnectButton
                  label={single ? tr("settings.disconnect") : tr("bt.disconnectAll")}
                  onClick={() => connectedIds.forEach((id) => onDisconnect(id))}
                />
              )}


            </div>


          </div>
        )}
      </div>
    </CenteredDialog>
  );
}

/* ─── Cast Dialog ─── */

/** Mock cast devices shown in regular-browser fallback mode */
const mockCastDevices = [
  { id: "tv-412", name: "Room 412 TV", type: "Smart TV", available: true },
  { id: "tv-lobby", name: "Lobby Display", type: "Digital Signage", available: false },
];

function CastDialog({
  onClose,
  connectedId,
  onConnect,
  onDisconnect,
}: {
  onClose: () => void;
  connectedId: string | null;
  onConnect: (id: string) => void;
  onDisconnect: () => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const isNative = isAndroidApp();

  // Dynamic cast device list — mock for browser, live for kiosk
  const [castDevices, setCastDevices] = useState(
    isNative ? [] as { id: string; name: string; type: string; available: boolean }[] : mockCastDevices
  );

  const [scanning, setScanning] = useState(false);
  const castScan = useRescan(
    () => { if (isNative) castBridge.startScan(); },
    () => { if (isNative) castBridge.stopScan(); },
  );

  useEffect(() => {
    if (!connectedId) {
      setScanning(true);
      if (isNative) {
        castBridge.startScan();
      }
      const timer = setTimeout(() => setScanning(false), 1500);
      return () => {
        clearTimeout(timer);
        if (isNative) {
          castBridge.stopScan();
        }
      };
    }
  }, [isNative]);

  // Accumulate discovered cast devices from scan events (kiosk only)
  useAndroidEvent<{ id: string; name: string; modelName: string }>(
    'cast-device-found',
    (d) => {
      if (!isNative) return;
      setCastDevices((prev) => {
        const filtered = prev.filter((x) => x.id !== d.id);
        return [
          ...filtered,
          {
            id: d.id,
            name: d.name,
            type: d.modelName || 'Cast device',
            available: true,
          },
        ];
      });
    }
  );

  // Confirm cast connection from native event
  useAndroidEvent<{ id: string }>(
    'cast-connected',
    (d) => {
      if (!isNative) return;
      onConnect(d.id);
    }
  );

  return (
    <CenteredDialog onClose={onClose} size="device">
      <DialogHeader
        icon={<Cast size={20} style={{ color: t.primaryOn }} />}
        title={tr("settings.castScreen")}
        onClose={onClose}
      />
      <div className="flex flex-col" style={{ paddingTop: "16px" }}>
        {scanning ? (
          <ScanningState message={tr("cast.looking")} />
        ) : (
          <div className="flex flex-col gap-2">
            <DialogSectionLabel action={<ScanAgainButton scanning={castScan.rescanning} onScan={castScan.rescan} />}>{tr("bt.available")}</DialogSectionLabel>
            {castDevices.map((device) => {
              const isConnected = connectedId === device.id;
              return (
                <DeviceListItem
                  key={device.id}
                  icon={<Tv size={18} style={{ color: isConnected ? t.primaryOn : t.iconDefault }} />}
                  name={device.name}
                  subtitle={isConnected ? tr("wifi.connected") : device.available ? device.type : tr("cast.unavailable")}
                  isConnected={isConnected}
                  disabled={!device.available}
                  onClick={() => {
                    if (!device.available) return;
                    if (isConnected) {
                      if (isNative) castBridge.stop();
                      onDisconnect();
                    } else {
                      if (isNative) castBridge.connect(device.id);
                      else onConnect(device.id);
                    }
                  }}
                />
              );
            })}
            {connectedId && (
              <DisconnectButton
                label={tr("settings.stopCasting")}
                onClick={() => { onDisconnect(); onClose(); }}
              />
            )}
          </div>
        )}
      </div>
    </CenteredDialog>
  );
}

/* ─── Clear Data Confirmation Dialog ─── */

/* ─── Language Dialog ─── */
function LanguageDialog({
  onClose,
  selected,
  onSelect,
}: {
  onClose: () => void;
  selected: Locale;
  onSelect: (lang: Locale) => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  /* Pick, then Apply: switching the whole screen on the first tap, while
     still choosing, re-laid every word under the patient's finger. */
  const [pending, setPending] = useState<string>(selected);
  const realLocale = LANGUAGE_OPTIONS.some((o) => o.key === pending);
  return (
    <CenteredDialog onClose={onClose}>
      <DialogHeader
        icon={<Globe size={20} style={{ color: t.primaryOn }} />}
        title={tr("settings.language")}
        onClose={onClose}
      />
      <div className="flex flex-col" style={{ paddingTop: "16px" }}>
        <DialogText style={{ marginBottom: "16px" }}>{tr("settings.language.select")}</DialogText>
        <LanguagePicker selected={pending} onSelect={setPending} />
        <DialogActions>
          <DialogButton kind="secondary" label={tr("general.cancel")} onClick={onClose} />
          <DialogButton
            label={tr("general.apply")}
            disabled={pending === selected || !realLocale}
            onClick={() => { onSelect(pending as Locale); onClose(); }}
          />
        </DialogActions>
      </div>
    </CenteredDialog>
  );
}

/* ─── Care Team Access PIN Dialog ─── */
function CareTeamAccessDialog({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: (role: "nurse" | "doctor") => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleComplete = (completedPin: string) => {
    if (completedPin === "2580") {
      onSuccess("nurse");
      onClose();
    } else if (completedPin === "0000") {
      onSuccess("doctor");
      onClose();
    } else {
      setTimeout(() => {
        setError(true);
        setPin("");
      }, 300);
    }
  };

  return (
    <PinDialog
      icon={<Stethoscope size={28} style={{ color: t.primaryOn }} />}
      title={tr("careteam.title")}
      subtitle={tr("careteam.enterPin")}
      errorText={tr("careteam.incorrect")}
      error={error}
      pin={pin}
      setPin={(value) => { setPin(value); setError(false); }}
      onComplete={handleComplete}
      onClose={onClose}
    />
  );
}

/* ─── Upcoming Prayer Card ─── */
function PrayerCard({
  prayerData,
  countdown,
  prayerAlarm,
  onToggleAlarm,
}: {
  prayerData: ReturnType<typeof getPrayerStatus>;
  countdown: string;
  prayerAlarm: boolean;
  onToggleAlarm: () => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr, isRTL, fontFamily, locale } = useLocale();
  return (
    <div
      style={{
        borderRadius: t.radiusLg,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Gradient background — uses theme's feature gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: t.primary,
        }}
      />
      {/* Subtle pattern overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          background:
            "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6) 0%, transparent 40%)",
        }}
      />
      <div
        className="relative flex items-center gap-4"
        style={{ padding: "16px 18px" }}
      >
        {/* Left: Mosque icon + prayer info */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: t.radiusFull,
                overflow: "hidden",
              }}
            >
              <ApiImage
                src={imgMosque}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "11px",
                fontWeight: 700,
                color: t.textInverseMuted,
                letterSpacing: "1.2px",
              }}
            >
              {tr("prayer.upcoming")}
            </span>
          </div>
          <div className="flex items-baseline gap-3" style={{ paddingLeft: "2px" }}>
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "24px",
                fontWeight: 700,
                color: t.textInverse,
                letterSpacing: "-0.5px",
              }}
            >
              {tr(PRAYER_NAMES[prayerData.next])}
            </span>
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "20px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.5px",
                fontVariantNumeric: "tabular-nums",
                marginLeft: "4px",
              }}
            >
              {formatPrayerTime(prayerData.targetTime, locale, tr)}
            </span>
          </div>
        </div>

        {/* Right: Countdown + Alarm checkbox */}
        <div className="shrink-0 flex flex-col items-end gap-3">
          <div className="flex items-center gap-1.5">
            <Clock size={14} style={{ color: t.textInverseMuted }} />
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "20px",
                fontWeight: 700,
                color: t.textInverse,
                letterSpacing: "0.5px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {countdown}
            </span>
          </div>
          <button
            onClick={onToggleAlarm}
            className="flex items-center gap-2 cursor-pointer active:scale-[0.95] transition-transform"
            style={{
              padding: "6px 12px 6px 10px",
              borderRadius: t.radiusMd,
              backgroundColor: prayerAlarm
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.1)",
              border: prayerAlarm
                ? "1.5px solid rgba(255,255,255,0.5)"
                : "1.5px solid rgba(255,255,255,0.2)",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: t.radiusSm,
                backgroundColor: prayerAlarm ? t.textInverse : "transparent",
                border: prayerAlarm ? "none" : "2px solid rgba(255,255,255,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              {prayerAlarm && (
                <Check size={13} style={{ color: t.primaryOn }} strokeWidth={3} />
              )}
            </div>
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "13px",
                fontWeight: 700,
                color: t.textInverse,
                whiteSpace: "nowrap",
              }}
            >
              {tr("prayer.alarmMe")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Settings list ───
 * The shared list rows (listRow.tsx): the PIN popup uses the same rows, so
 * a choice inside a popup looks like the Settings row that opened it. */
const SettingsRowGroup = ListRowGroup;
const SettingsRow = ListRow;

/* ═══════════════════════════════════════════════════════════════
 * MAIN SETTINGS PANEL
 * ═══════════════════════════════════════════════════════════════ */
export function SettingsPanel({
  onClose,
  onFullscreenTap,
  isFullscreen,
  activeCareRole,
  setActiveCareRole,
  openAccountDirectly,
  openCareTeamDirectly,
}: {
  onClose: () => void;
  onFullscreenTap: () => void;
  isFullscreen: boolean;
  activeCareRole: "nurse" | "doctor" | null;
  setActiveCareRole: (role: "nurse" | "doctor" | null) => void;
  openAccountDirectly?: boolean;
  /** Arrived from CareMe's Nurse View shortcut: go straight to the PIN. */
  openCareTeamDirectly?: boolean;
}) {
  const { theme: t, darkMode, setDarkMode, castDevice, setCastDevice, locale: currentLocale, setLocale, prayerAlarm, setPrayerAlarm } = useTheme();
  const { t: tr, isRTL, fontFamily, locale } = useLocale();
  const { logout } = useAuth();
  const { isGuest } = useGuestMode();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const deviceInfo = useDeviceInfo();
  const nurseState = useNurseStore();

  const isNative = isAndroidApp();

  // Room: from NurseDataStore (set by nurse in CareMe)
  // Fallback: hardcoded "412"
  const roomDisplay = nurseState.patient.room || "412";

  // Device serial: from Android bridge
  const serialDisplay = deviceInfo?.serial || null;

  // Device ID shown: use serial if available, else old format
  const deviceIdDisplay = serialDisplay
    ? serialDisplay
    : `${t.hospitalShortName}-BT-${roomDisplay}A`;

  // IP address: from Android bridge
  // Fallback: hardcoded
  const ipDisplay = deviceInfo?.ipAddress || "10.10.42.118";

  // Version line: "App V<apk> - UI V<web>" on the kiosk, or
  // "App VWeb - UI V<web>" in a plain browser (no native APK).
  const nativeVer = isAndroidApp() ? getNativeAppVersion() : null;
  const appVerLabel = isAndroidApp() ? `V${nativeVer ?? "?"}` : "VWeb";
  const versionDisplay = `App ${appVerLabel} - UI V${UI_VERSION}`;
  /* Release notes — the version line opens the list of what changed in each
     version (newest first). See src/app/data/releaseNotes.ts. */
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  /* The list grows with every version, so only the newest opens by itself;
     older ones are one line each, and past the recent few they hide behind
     "Older versions". */
  const RECENT_RELEASES = 5;
  const [openRelease, setOpenRelease] = useState<string | null>(RELEASES[0]?.version ?? null);
  const [showOlderReleases, setShowOlderReleases] = useState(false);
  /* The notes open below the fold of the panel, so bring them into view —
     otherwise the tap looks like it did nothing. */
  const releaseNotesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = releaseNotesRef.current;
    if (!showReleaseNotes || !el) return;
    // Scroll the panel's own scroller only. scrollIntoView would also scroll
    // the page under the fixed 1920×1080 canvas and leave a blank band.
    let box: HTMLElement | null = el.parentElement;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    if (!box) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 16;
    box.scrollTo({ top, behavior: "smooth" });
  }, [showReleaseNotes]);

  // Admin memory-reclaim indicator (updates when native fires memory-pressure)
  const [memStats, setMemStats] = useState(getMemoryStats());
  useEffect(() => subscribeMemoryStats(setMemStats), []);

  // ── Brightness: init from bridge, sync via event ──
  const [brightnessVal, setBrightnessState] = useState(() =>
    Math.round(brightnessBridge.get() * 100)
  );
  const handleBrightnessChange = (v: number) => {
    setBrightnessState(v);
    brightnessBridge.set(v / 100);
  };
  useAndroidEvent<{ value: number }>('brightness-changed', (d) => {
    setBrightnessState(Math.round(d.value * 100));
  });

  // ── Volume: init from bridge, sync via event ──
  const [volumeVal, setVolumeState] = useState(() =>
    Math.round(volumeBridge.get() * 100)
  );
  const handleVolumeChange = (v: number) => {
    setVolumeState(v);
    volumeBridge.set(v / 100);
  };
  useAndroidEvent<{ value: number }>('volume-changed', (d) => {
    setVolumeState(Math.round(d.value * 100));
  });

  // ── Wi-Fi: read initial state from bridge, sync via events ──
  const [wifiEnabled, setWifiEnabled] = useState(() =>
    isNative ? wifiBridge.isEnabled() : true
  );
  const [wifiNetwork, setWifiNetwork] = useState<string | null>(
    isNative ? null : "dsfh-patient"
  );

  useAndroidEvent<{ enabled: boolean }>('wifi-state-changed', (d) => {
    setWifiEnabled(d.enabled);
    if (!d.enabled) setWifiNetwork(null);
  });
  useAndroidEvent<{ ssid: string }>('wifi-connected', (d) => {
    setWifiEnabled(true);
    setWifiNetwork(d.ssid);
  });

  // ── Bluetooth: read initial state from bridge, sync via events ──
  const [btEnabled, setBtEnabled] = useState(() =>
    isNative ? bluetoothBridge.isEnabled() : true
  );
  const [btConnected, setBtConnected] = useState<string[]>(
    isNative ? [] : ["bt-speaker"]
  );

  useAndroidEvent<{ enabled: boolean }>('bluetooth-state-changed', (d) => {
    setBtEnabled(d.enabled);
    if (!d.enabled) setBtConnected([]);
  });
  useAndroidEvent<{ address: string }>('bluetooth-device-connected', (d) => {
    setBtEnabled(true);
    setBtConnected((ids) => (ids.includes(d.address) ? ids : [...ids, d.address]));
  });

  // ── DND: read initial state, sync via event ──
  const [dnd, setDnd] = useState(() =>
    isNative ? dndBridge.isEnabled() : false
  );
  useAndroidEvent<{ enabled: boolean }>('dnd-state-changed', (d) => setDnd(d.enabled));

  // ── Night Light: read initial state, sync via event ──
  const [nightMode, setNightMode] = useState(() =>
    isNative ? nightLightBridge.isEnabled() : false
  );
  useAndroidEvent<{ enabled: boolean }>('night-light-changed', (d) => setNightMode(d.enabled));

  const [selectedLang, setSelectedLang] = useState<"en" | "ar" | "ur">(currentLocale);

  // Prayer countdown timer
  const [prayerData, setPrayerData] = useState(() => getPrayerStatus(new Date()));
  const [countdown, setCountdown] = useState(() => getCountdown(new Date(), getPrayerStatus(new Date()).targetTime));

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const status = getPrayerStatus(now, t.location);
      setPrayerData(status);
      setCountdown(getCountdown(now, status.targetTime));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dialog states
  const [showWifiDialog, setShowWifiDialog] = useState(false);
  const [showBtDialog, setShowBtDialog] = useState(false);
  const [showCastDialog, setShowCastDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showLangDialog, setShowLangDialog] = useState(false);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const preview = useSettingsPreview();
  const [replayToast, setReplayToast] = useState<string | null>(null);

  useEffect(() => {
    if (openAccountDirectly) {
      setShowAccountDialog(true);
    }
  }, [openAccountDirectly]);

  /* Either route in: the shortcut fired while this panel was already open, or
     App opened the panel for us because it was not. */
  useEffect(() => {
    const handler = () => setShowCareTeamDialog(true);
    window.addEventListener("open-nurse-view", handler);
    return () => window.removeEventListener("open-nurse-view", handler);
  }, []);

  useEffect(() => {
    if (openCareTeamDirectly) setShowCareTeamDialog(true);
  }, [openCareTeamDirectly]);



  // Get connected names for subtitles
  const connectedCastName = castDevice
    ? mockCastDevices.find((d) => d.id === castDevice)?.name ?? castDevice
    : null;

  return (
    <div
      /* Above the modules, not beside them: Call, Meal Ordering, Patient
         Services and expanded CareMe are all z-50 and are painted after this
         panel, so at the same level the nurse view opened underneath them. */
      className="absolute inset-0 z-[90] flex justify-end"
      style={{ animation: "settingsFadeIn 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: t.overlay }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative h-full flex flex-col"
        style={{
          width: "480px",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          backgroundColor: t.panelBg,
          [isRTL ? "borderRight" : "borderLeft"]: `1px solid ${t.borderSubtle}`,
          boxShadow: `${isRTL ? "8px" : "-8px"} 0 40px rgba(0,0,0,0.12)`,
          animation: "settingsSlideIn 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between"
          style={{ padding: "24px 24px 16px 24px" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: t.touchTargetMin,
                height: t.touchTargetMin,
                borderRadius: t.radiusMd,
                backgroundColor: t.primarySubtle,
              }}
            >
              <Settings size={22} style={{ color: t.primaryOn }} />
            </div>
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "22px",
                fontWeight: 700,
                color: t.textHeading,
                letterSpacing: "-0.3px",
              }}
            >
              {tr("settings.title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* DEMO ONLY — not part of the product, not in the dev guide.
                Restores the screen to its first setup (the old "Clear
                Everything"), for resetting a demo between showings. */}
            <button
              onClick={() => setShowRestoreConfirm(true)}
              aria-label={tr("demo.restore.title")}
              className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: t.radiusLg,
                backgroundColor: t.tileInactiveBg,
                border: "none",
              }}
              title={tr("demo.restore.title")}
            >
              <RotateCcw size={22} style={{ color: t.primaryOn }} />
            </button>
            <button
              onClick={onFullscreenTap}
              className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: t.radiusLg,
                backgroundColor: t.tileInactiveBg,
                border: "none",
              }}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize size={22} style={{ color: t.primaryOn }} />
              ) : (
                <Maximize size={22} style={{ color: t.primaryOn }} />
              )}
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: t.radiusLg,
                backgroundColor: t.tileInactiveBg,
                border: "none",
              }}
            >
              <X size={22} style={{ color: t.textMuted }} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 flex flex-col gap-4"
          style={{
            padding: "8px 24px 24px 24px",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          {/* Upcoming Prayer */}
          <PrayerCard
            prayerData={prayerData}
            countdown={countdown}
            prayerAlarm={prayerAlarm}
            onToggleAlarm={() => setPrayerAlarm(!prayerAlarm)}
          />

          {/* Brightness */}
          <SettingsSlider
            icon={<Sun size={20} style={{ color: t.iconBrand }} />}
            label={tr("settings.brightness")}
            value={brightnessVal}
            onChange={handleBrightnessChange}
          />

          <div style={{ height: "1px", backgroundColor: t.borderDefault }} />

          {/* Volume */}
          <SettingsSlider
            icon={<Volume2 size={20} style={{ color: t.iconBrand }} />}
            label={tr("settings.volume")}
            value={volumeVal}
            onChange={handleVolumeChange}
          />

          <div style={{ height: "1px", backgroundColor: t.borderDefault }} />

          {/* Quick Settings Toggle Tiles — 3x2 grid */}
          <div className="flex flex-col gap-2.5">
            {/* Row 1: Connectivity */}
            <div className="flex items-center justify-center gap-2.5">
              <QuickTile
                icon={<Wifi size={24} style={{ color: wifiEnabled ? t.tileActiveText : t.iconDefault }} />}
                label={tr("settings.wifi")}
                active={wifiEnabled}
                onTap={() => {
                  // Android 10+ restricts programmatic Wi-Fi toggling.
                  // Delegate to the system Wi-Fi settings screen so the
                  // user can toggle it there. The 'wifi-state-changed'
                  // event will sync the local state back.
                  if (isNative) {
                    wifiBridge.openSettings();
                  } else {
                    if (wifiEnabled) {
                      setWifiEnabled(false);
                      setWifiNetwork(null);
                    } else {
                      setWifiEnabled(true);
                      setWifiNetwork("dsfh-patient");
                    }
                  }
                }}
                onLongPress={() => setShowWifiDialog(true)}
              />
              <QuickTile
                icon={<Bluetooth size={24} style={{ color: btEnabled ? t.tileActiveText : t.iconDefault }} />}
                label={tr("settings.bluetooth")}
                active={btEnabled}
                onTap={() => {
                  const next = !btEnabled;
                  if (isNative) {
                    bluetoothBridge.setEnabled(next);
                    // State will update via 'bluetooth-state-changed' event
                  } else {
                    setBtEnabled(next);
                    if (!next) setBtConnected([]);
                  }
                }}
                onLongPress={() => setShowBtDialog(true)}
              />
              <QuickTile
                icon={<Cast size={24} style={{ color: castDevice ? t.tileActiveText : t.iconDefault }} />}
                label={tr("settings.cast")}
                active={!!castDevice}
                onTap={() => {
                  if (isNative) {
                    castBridge.openSettings();
                  } else {
                    if (castDevice) {
                      setCastDevice(null);
                    } else {
                      setShowCastDialog(true);
                    }
                  }
                }}
                onLongPress={() => setShowCastDialog(true)}
              />
            </div>
            {/* Row 2: Modes */}
            <div className="flex items-center justify-center gap-2.5">
              <QuickTile
                icon={<BellOff size={24} style={{ color: dnd ? t.tileActiveText : t.iconDefault }} />}
                label={tr("settings.dnd")}
                active={dnd}
                onTap={() => {
                  const next = !dnd;
                  setDnd(next);
                  if (isNative) dndBridge.setEnabled(next);
                }}
              />
              <QuickTile
                icon={<Sun size={24} style={{ color: nightMode ? t.tileActiveText : t.iconDefault }} />}
                label={tr("settings.nightLight")}
                active={nightMode}
                onTap={() => {
                  const next = !nightMode;
                  setNightMode(next);
                  if (isNative) nightLightBridge.setEnabled(next);
                }}
              />
              <QuickTile
                icon={<Monitor size={24} style={{ color: darkMode ? t.tileActiveText : t.iconDefault }} />}
                label={tr("settings.darkMode")}
                active={darkMode}
                onTap={() => setDarkMode(!darkMode)}
              />
            </div>

            {/* Status line */}
            {castDevice && connectedCastName && (
              null
            )}
          </div>

          <div style={{ height: "1px", backgroundColor: t.borderDefault }} />

          {/* Everything that opens something: one list, one row style. Rows
              a hospital doesn't have are left out and the list closes up. */}
          <SettingsRowGroup>
            {/* Language: a row that opens the full list, so it holds two
                languages or twenty. The value is the language in its own
                script, so a patient who can't read English still finds it. */}
            <SettingsRow
              icon={Globe}
              label={tr("settings.language")}
              value={LANGUAGE_OPTIONS.find((o) => o.key === selectedLang)?.native}
              onClick={() => setShowLangDialog(true)}
            />
            {t.remoteControl && preview.useMyPhone && (
              <SettingsRow
                icon={Smartphone}
                label={tr("remote.settings.title")}
                value={tr("remote.settings.subtitle")}
                onClick={() => window.dispatchEvent(new Event("careinn-remote-start"))}
              />
            )}
            {preview.preferences && (
              <SettingsRow
                icon={UserCircle}
                label={tr("settings.preferences")}
                value={isAccountSet() ? tr("settings.preferences.subtitle.set") : tr("settings.preferences.subtitle.unset")}
                onClick={() => setShowAccountDialog(true)}
              />
            )}
            {preview.pin && (
              <SettingsRow
                icon={KeyRound}
                label={isAccountSet() ? tr("settings.pin") : tr("settings.setPin")}
                value={isAccountSet() ? tr("settings.pin.subtitle.set") : tr("settings.pin.subtitle.unset")}
                onClick={() => setShowPinDialog(true)}
              />
            )}
            <SettingsRow
              icon={Stethoscope}
              label={tr("settings.careTeam")}
              value={tr("settings.careTeam.subtitle")}
              onClick={() => setShowCareTeamDialog(true)}
            />
          </SettingsRowGroup>

          {/* Ending actions — Log out and Clear Data, full width, together and
              apart from the list so neither is tapped on the way to something
              else. Same row, in red. No fill until pressed. Log out is hidden
              for guests, who have no session to end. */}
          <SettingsRowGroup>
            {!isGuest && preview.logout && (
              <SettingsRow
                icon={LogOut}
                mirrorIcon
                tone="danger"
                label={tr("general.logout")}
                onClick={() => setShowLogoutConfirm(true)}
              />
            )}
            <SettingsRow
              icon={BrushCleaningIcon}
              tone="danger"
              label={tr("settings.clearData.clearMyData.title")}
              onClick={() => setShowClearConfirm(true)}
            />
          </SettingsRowGroup>

          {/* Room & Device info */}
          <div
            className="flex flex-col items-center gap-1"
            style={{ padding: "8px 0 4px 0" }}
          >
            {/* Line 1: Room number (from NurseDataStore) */}
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "12px",
                fontWeight: 600,
                color: t.textMuted,
              }}
            >
              {tr("settings.room")} {roomDisplay}
            </span>

            {/* Line 2: Device serial / ID */}
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "11px",
                fontWeight: 500,
                color: t.textDisabled,
              }}
            >
              {tr("settings.deviceId")}: {deviceIdDisplay}
            </span>

            {/* Line 3: App + UI version (before IP) — tap for what changed */}
            <button
              onClick={() => setShowReleaseNotes((v) => !v)}
              aria-expanded={showReleaseNotes}
              aria-label={tr("settings.whatsNew")}
              className="flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
              style={{
                fontFamily: t.fontFamily,
                fontSize: "11px",
                fontWeight: 500,
                color: t.textDisabled,
                background: "none",
                border: "none",
                outline: "none",
                padding: "2px 6px",
              }}
            >
              {versionDisplay}
              <Info size={13} strokeWidth={2.2} style={{ color: t.primaryOn }} />
            </button>

            {/* Line 4: IP address */}
            <span
              style={{
                fontFamily: t.fontFamily,
                fontSize: "11px",
                fontWeight: 500,
                color: t.textDisabled,
              }}
            >
              IP: {ipDisplay}
            </span>

            {/* Line 4: Android model (only show on kiosk, not browser) */}
            {isAndroidApp() && deviceInfo?.model && (
              <span
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: "10px",
                  fontWeight: 400,
                  color: t.textDisabled,
                  opacity: 0.7,
                }}
              >
                {deviceInfo.manufacturer} {deviceInfo.model}
              </span>
            )}

            {/* Line 5: Memory reclaim indicator (admin diagnostic; only
                appears once a low-memory reclaim has actually happened) */}
            {memStats.reclaims > 0 && (
              <span
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: "10px",
                  fontWeight: 400,
                  color: t.textDisabled,
                  opacity: 0.6,
                }}
              >
                Memory optimized ×{memStats.reclaims}
                {memStats.lastAvailMb !== null
                  ? ` · ${memStats.lastAvailMb}MB free`
                  : ""}
              </span>
            )}
          </div>

          {/* Release notes — every version on main, newest first. Written in
              English: they are for staff and the team, not the patient. */}
          {showReleaseNotes && (
            <div
              ref={releaseNotesRef}
              dir="ltr"
              className="flex flex-col"
              style={{
                gap: "12px",
                padding: "14px 16px",
                marginBottom: "8px",
                borderRadius: t.radiusLg,
                backgroundColor: t.surfaceInset,
                textAlign: "left",
              }}
            >
              {(showOlderReleases ? RELEASES : RELEASES.slice(0, RECENT_RELEASES)).map((rel) => {
                const isOpen = openRelease === rel.version;
                return (
                <div key={rel.version} className="flex flex-col" style={{ gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setOpenRelease(isOpen ? null : rel.version)}
                    aria-expanded={isOpen}
                    className="flex items-center justify-between w-full cursor-pointer active:opacity-60"
                    style={{ gap: "8px", minHeight: "32px", padding: 0, border: "none", background: "transparent", textAlign: "left" }}
                  >
                    <span className="flex items-center" style={{ gap: "6px" }}>
                      <ChevronRight
                        size={14}
                        style={{ color: t.textMuted, transform: isOpen ? "rotate(90deg)" : undefined, transition: "transform 150ms" }}
                      />
                      <span style={{ fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 700, color: t.textHeading }}>
                        V{rel.version}
                      </span>
                    </span>
                    <span style={{ fontFamily: t.fontFamily, fontSize: "11px", fontWeight: 500, color: t.textMuted }}>
                      {new Date(rel.date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </button>
                  {/* Grouped New → Improved → Fixed; each line leads with its area */}
                  {isOpen && CHANGE_TYPES.map(({ type, label }) => {
                    const items = rel.changes.filter((c) => c.type === type);
                    if (items.length === 0) return null;
                    return (
                      <div key={type} className="flex flex-col" style={{ gap: "4px", marginTop: "2px" }}>
                        <span
                          style={{
                            fontFamily: t.fontFamily,
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.8px",
                            textTransform: "uppercase",
                            color: t.primaryOn,
                          }}
                        >
                          {label}
                        </span>
                        <ul style={{ margin: 0, paddingLeft: "16px", listStyle: "disc" }}>
                          {items.map((c, i) => (
                            <li key={i} style={{ fontFamily: t.fontFamily, fontSize: "12px", lineHeight: 1.45, color: t.textBody, marginTop: i ? "4px" : 0 }}>
                              <b style={{ fontWeight: 700, color: t.textHeading }}>{c.area}</b> – {c.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                );
              })}
              {!showOlderReleases && RELEASES.length > RECENT_RELEASES && (
                <button
                  type="button"
                  onClick={() => setShowOlderReleases(true)}
                  className="w-full cursor-pointer active:opacity-60"
                  style={{
                    minHeight: "32px", padding: 0, border: "none", background: "transparent", textAlign: "left",
                    fontFamily: t.fontFamily, fontSize: "12px", fontWeight: 700, color: t.primaryOn,
                  }}
                >
                  Older versions ({RELEASES.length - RECENT_RELEASES})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Dialogs ─── */}
      {showWifiDialog && (
        <WifiDialog
          onClose={() => setShowWifiDialog(false)}
          connectedId={wifiNetwork}
          enabled={wifiEnabled}
          onToggle={(on) => {
            /* Same as the tile: Android 10+ only lets the system settings
               switch Wi-Fi, so the kiosk hands off there. */
            if (isNative) { wifiBridge.openSettings(); return; }
            setWifiEnabled(on);
            setWifiNetwork(on ? "dsfh-patient" : null);
          }}
          onConnect={(id) => { setWifiEnabled(true); setWifiNetwork(id); }}
          onDisconnect={() => {
            if (isNative) wifiBridge.disconnect();
            /* Drops the network only; Wi-Fi stays on (the switch turns it off). */
            setWifiNetwork(null);
          }}
        />
      )}

      {showBtDialog && (
        <BluetoothDialog
          onClose={() => setShowBtDialog(false)}
          connectedIds={btConnected}
          enabled={btEnabled}
          onToggle={(on) => {
            if (isNative) { bluetoothBridge.setEnabled(on); return; }
            setBtEnabled(on);
            if (!on) setBtConnected([]);
          }}
          onConnect={(id) => {
            setBtEnabled(true);
            /* A new audio device takes the place of the one before it. */
            const audio = (x: string) => isBtAudio(mockBtDevices.find((d) => d.id === x)?.type);
            if (preview.btSingle) { setBtConnected([id]); return; }
            setBtConnected((ids) => (ids.includes(id) ? ids : [...ids.filter((x) => !(audio(id) && audio(x))), id]));
          }}
          onDisconnect={(id) => {
            if (isNative) bluetoothBridge.disconnect(id);
            setBtConnected((ids) => ids.filter((x) => x !== id));
          }}
        />
      )}

      {showCastDialog && (
        <CastDialog
          onClose={() => setShowCastDialog(false)}
          connectedId={castDevice}
          onConnect={(id) => setCastDevice(id)}
          onDisconnect={() => { setCastDevice(null); setShowCastDialog(false); }}
        />
      )}

      {/* The same Clear My Data confirm as the home card: one action, one
          popup, one message. "Clear Everything" is not a patient action. */}
      <ConfirmDialog
        visible={showClearConfirm}
        title={tr("settings.clearData.clearMyData.title")}
        message={tr("settings.clearData.clearMyData.desc")}
        confirmLabel={tr("settings.clearData.btn.clearMyData")}
        variant="danger"
        icon={<BrushCleaningIcon size={20} />}
        onConfirm={async () => {
          setShowClearConfirm(false);
          await clearUserDataAndReload();
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* DEMO ONLY — Restore device. */}
      <ConfirmDialog
        visible={showRestoreConfirm}
        title={tr("demo.restore.title")}
        message={tr("demo.restore.desc")}
        confirmLabel={tr("demo.restore.confirm")}
        variant="danger"
        icon={RotateCcw}
        onConfirm={async () => {
          setShowRestoreConfirm(false);
          await clearAllDataAndReload();
        }}
        onCancel={() => setShowRestoreConfirm(false)}
      />

      <ConfirmDialog
        visible={showLogoutConfirm}
        title={tr("general.logout")}
        message={tr("logout.confirm")}
        confirmLabel={tr("general.logout")}
        variant="danger"
        icon={LogOut}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {showLangDialog && (
        <LanguageDialog
          onClose={() => setShowLangDialog(false)}
          selected={selectedLang}
          onSelect={(lang) => { setSelectedLang(lang); setLocale(lang); }}
        />
      )}

      {showAccountDialog && (
        <MyPreferencesDialog
          open={showAccountDialog}
          onClose={() => setShowAccountDialog(false)}
        />
      )}

      {showPinDialog && (
        <MyPreferencesDialog
          open={showPinDialog}
          mode="pin"
          onClose={() => setShowPinDialog(false)}
        />
      )}

      {showCareTeamDialog && (
        <CareTeamAccessDialog
          onClose={() => setShowCareTeamDialog(false)}
          onSuccess={(role) => setActiveCareRole(role)}
        />
      )}


      {activeCareRole && (
        <NurseInterface 
          role={activeCareRole} 
          onClose={() => setActiveCareRole(null)} 
        />
      )}

      {replayToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10010] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Check size={18} className="text-emerald-400" />
          <span>{replayToast}</span>
        </div>
      )}

      <style>{`
        @keyframes settingsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes settingsSlideIn {
          from { transform: translateX(${isRTL ? "-100%" : "100%"}); }
          to { transform: translateX(0); }
        }
        @keyframes castDialogIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pinShake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
