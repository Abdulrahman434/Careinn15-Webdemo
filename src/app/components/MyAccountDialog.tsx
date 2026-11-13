import React, { useState, useEffect } from "react";
import { useTheme, TEXT_STYLE } from "./ThemeContext";
import { PIN_METRICS, PIN_TYPE } from "./pinMetrics";
import { DialogFrame, DialogTitleBar, DialogText, DialogActions, DialogButton } from "./dialogKit";
import { ListRowGroup, ListRow } from "./listRow";
import { KeyRound, Nfc, UserCircle } from "lucide-react";
import { useLocale } from "./i18n";
import { usePressFlash } from "./usePressFlash";
import { setAccount, getAccount, updateNfcCard, clearAccount, verifyPin } from "../lib/accountAuth";
import { useNfcTap } from "../utils/nfc";
import { X, CheckCircle, Shield, AlertCircle, Trash2, ChevronRight, Globe, Layout, Settings, Image, Check, SlidersHorizontal } from "lucide-react";
import { ApiImage } from "./ApiImage";
import { getApiConfig, saveApiConfig, isCustomConfig, resetApiConfig, SECONDARY_OPTION, resolveBaseUrl } from "../lib/apiConfig";
import { fetchAllWallpapers, WallpaperGroup } from "../lib/hospitalApi";
import { proxyImageUrls } from "../lib/imageProxy";
import {
  getSavedHeroImage, saveHeroImage, clearSavedHeroImage,
  isSlideshowEnabled, setSlideshowEnabled,
} from "../lib/backgroundPrefs";

type Step =
  | 'menu'
  | 'overview'
  | 'setup-pin1'
  | 'setup-pin2'
  | 'setup-pin-mismatch'
  | 'nfc-prompt'
  | 'nfc-tap1'
  | 'nfc-tap2'
  | 'nfc-mismatch'
  | 'verify-current-pin'
  | 'remove-confirm'
  | 'success'
  | 'server'
  | 'admin-login'
  | 'admin-controls'
  | 'backgrounds'
  | 'layout-mode';

type PendingAction = 'reset-pin' | 'reset-nfc' | 'remove-account' | 'admin-login' | null;

function CenteredDialog({
  children,
  onClose,
  width = 340,
}: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  const { theme: t } = useTheme();
  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center"
      style={{ animation: "settingsFadeIn 0.15s ease-out" }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: t.overlay }}
        onClick={onClose}
      />
      <div
        className="relative flex flex-col"
        style={{
          width: `${width}px`,
          /* Per cent of the scaled canvas, not vh: the kiosk transform-scales
             the whole 1920x1080 canvas, so vh resolves against the browser
             window instead and clipped this dialog mid-keypad. */
          maxHeight: "90%",
          overflowY: "auto",
          borderRadius: t.radiusXl,
          backgroundColor: t.surface,
          border: t.borderCard,
          boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
          animation: "castDialogIn 0.2s ease-out",
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DialogHeader({
  icon,
  title,
  onClose,
  onBack,
}: {
  icon?: React.ReactNode;
  title: string;
  onClose?: () => void;
  onBack?: () => void;
}) {
  const { theme: t } = useTheme();
  const { isRTL } = useLocale();
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "20px 20px 0 20px" }}
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: t.radiusFull,
              backgroundColor: t.tileInactiveBg,
              border: "none",
            }}
          >
            <ChevronRight size={20} style={{ color: t.textHeading, transform: isRTL ? '' : 'rotate(180deg)' }} />
          </button>
        )}
        {!onBack && icon}
        <span
          style={{
            fontFamily: t.fontFamily,
            ...TEXT_STYLE.dialogTitle,
            color: t.textHeading,
          }}
        >
          {title}
        </span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: t.radiusFull,
            backgroundColor: t.tileInactiveBg,
            border: "none",
          }}
        >
          <X size={16} style={{ color: t.textMuted }} />
        </button>
      )}
    </div>
  );
}

export function PinKeypad({
  pin,
  setPin,
  error,
  onComplete,
}: {
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  error: boolean;
  onComplete: (completedPin: string) => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const { pressedKey, flash } = usePressFlash();

  const handleDigit = (d: string) => {
    if (pin.length < 4) {
      const newPin = pin + d;
      setPin(newPin);
      if (newPin.length === 4) {
        onComplete(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
  };

  return (
    <>
      <div dir="ltr" className="flex items-center justify-center gap-4" style={{ padding: "20px 0 18px 0" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: `${PIN_METRICS.dot}px`,
              height: `${PIN_METRICS.dot}px`,
              borderRadius: t.radiusFull,
              backgroundColor: i < pin.length ? t.accent : t.borderDefault,
              transition: "background-color 0.15s",
              animation: error ? "pinShake 0.4s ease-out" : undefined,
            }}
          />
        ))}
      </div>

      <div
        dir="ltr"
        className="flex flex-col items-center"
        style={{ padding: "8px 0 16px 0", gap: `${PIN_METRICS.keyGap}px` }}
      >
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
          ["", "0", "del"],
        ].map((row, ri) => (
          <div key={ri} className="flex items-center" style={{ gap: `${PIN_METRICS.keyGap}px` }}>
            {row.map((key, ki) => {
              if (key === "") return <div key={ki} style={{ width: PIN_METRICS.key, height: PIN_METRICS.key }} />;
              const isPressed = pressedKey === key;
              return (
                <button
                  key={ki}
                  onPointerDown={() => flash(key)}
                  onClick={() => (key === "del" ? handleDelete() : handleDigit(key))}
                  className="flex items-center justify-center cursor-pointer"
                  style={{
                    width: PIN_METRICS.key,
                    height: PIN_METRICS.key,
                    borderRadius: t.radiusLg,
                    backgroundColor: isPressed
                      ? (key === "del" ? t.accent : t.primary)
                      : (key === "del" ? t.accentSubtle : t.tileInactiveBg),
                    border: "none",
                    transform: isPressed ? "scale(0.92)" : "scale(1)",
                    transition: "background-color 0.15s, transform 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontFamily: t.fontFamily,
                      fontSize: key === "del" ? PIN_TYPE.del : PIN_TYPE.key,
                      fontWeight: 600,
                      color: isPressed ? t.textInverse : (key === "del" ? t.accentOn : t.textHeading),
                      transition: "color 0.15s",
                    }}
                  >
                    {key === "del" ? tr("careteam.del") : key}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* The keypad carries its own shake so the wrong-PIN feedback works in
          every dialog that uses it, not only inside SettingsPanel. */}
      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </>
  );
}

export function MyPreferencesDialog({
  open,
  onClose,
  mode = "full",
}: {
  open: boolean;
  onClose: () => void;
  /** "pin-setup" jumps straight into the existing PIN setup flow and closes
   *  when it finishes — used by the onboarding wizard. "pin" is the Settings
   *  panel's PIN row: no PIN yet → the same setup flow; a PIN already set →
   *  the PIN options (Change PIN, Update NFC, Remove PIN), each of which asks
   *  for the current PIN first. Both close when they finish. */
  mode?: "full" | "pin-setup" | "pin";
}) {
  const { theme: t } = useTheme();
  const { t: tr, isRTL } = useLocale();
  const changingPin = () => mode === "pin" && !!getAccount();
  const startStep = (): Step =>
    mode === "full" ? 'menu' : changingPin() ? 'overview' : 'setup-pin1';
  const [step, setStep] = useState<Step>(startStep);
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState(false);
  const [nfcUid1, setNfcUid1] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [verifyPinVal, setVerifyPinVal] = useState("");
  const [layoutModeValue, setLayoutModeValue] = useState<1 | 2 | 3 | 4>(() => {
    try {
      const v = localStorage.getItem('careinn-layout-mode');
      return v === '2' ? 2 : v === '3' ? 3 : v === '4' ? 4 : 1;
    } catch {
      return 1;
    }
  });

  /* careinn-orientation — read by App.tsx (useIsPortrait). Unset = follow
     the screen's shape; "portrait" / "landscape" force one for a demo. */
  const [orientationValue, setOrientationValue] = useState<"auto" | "landscape" | "portrait">(() => {
    try {
      const v = localStorage.getItem('careinn-orientation');
      return v === 'portrait' || v === 'landscape' ? v : 'auto';
    } catch {
      return 'auto';
    }
  });

  // Server Config state
  const [serverIp, setServerIp] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Connection diagnostics (admin-only) — probes the entered server for reachability vs CORS
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ path: string; icon: string; note: string }[]>([]);

  const account = getAccount();

  useEffect(() => {
    if (open) {
      setStep(startStep());
      setPin1("");
      setPin2("");
      setError(false);
      setNfcUid1(null);
      setPendingAction(null);
      setVerifyPinVal("");
      setIsAdminUnlocked(false);

      const config = getApiConfig();
      setServerIp(config.serverIp);
      setApiKey(config.apiKey);
      setLayoutModeValue((() => { const v = localStorage.getItem('careinn-layout-mode'); return v === '2' ? 2 : v === '3' ? 3 : v === '4' ? 4 : 1; })());
    }
  }, [open]);

  useNfcTap((uid) => {
    if (step === 'nfc-tap1') {
      setNfcUid1(uid);
      setStep('nfc-tap2');
    } else if (step === 'nfc-tap2') {
      if (uid === nfcUid1) {
        if (getAccount()) {
          updateNfcCard(uid).then(() => setStep('success'));
        } else {
          setAccount(pin1, uid).then(() => setStep('success'));
        }
      } else {
        setStep('nfc-mismatch');
        setTimeout(() => {
          setStep('nfc-tap1');
          setNfcUid1(null);
        }, 1500);
      }
    }
  }, step === 'nfc-tap1' || step === 'nfc-tap2');

  /* The latest onClose, read when the timer fires. With onClose in the
     effect's deps, a parent that re-renders every second (the Settings
     prayer countdown) restarted the 2 s timer forever and "PIN saved" never
     closed. */
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        if (mode !== "full") {
          onCloseRef.current();
        } else {
          setStep('menu');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, mode]);

  function isValidServerUrl(s: string): boolean {
    // Allows IP, DNS, and optional http/https prefix. Also rejects empty spaces.
    return s.trim().length > 0 && !/\s/.test(s) && /^(https?:\/\/)?([a-zA-Z0-9.-]+)(:[0-9]+)?(\/.*)?$/.test(s);
  }

  const handleSaveServer = () => {
    if (!isValidServerUrl(serverIp) || !apiKey.trim()) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }
    saveApiConfig({ serverIp, apiKey });
    window.location.reload();
  };

  const handleResetServer = () => {
    resetApiConfig();
    window.location.reload();
  };

  // Probe the entered server against the real endpoints. A normal fetch proves
  // CORS is OK; if it fails, a no-cors fetch that still resolves means the
  // request reached the server and only CORS blocked reading it — vs. a total
  // failure (cleartext/network). Distinguishes CORS from transport on-device.
  const runConnectionTest = async () => {
    if (!isValidServerUrl(serverIp) || !apiKey.trim()) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }
    setTesting(true);
    setTestResults([]);
    const base = resolveBaseUrl(serverIp);
    const paths = [
      "/user/organization/devices/",
      "/hl7/httpreceiver/?reference_id=1",
      "/apps/packages/",
      "/resource/background/wallpaper/?group=1",
      "/push/device/alerts/",
    ];
    const results: { path: string; icon: string; note: string }[] = [];
    for (const path of paths) {
      const sep = path.includes("?") ? "&" : "?";
      const url = `${base}${path}${sep}apikey=${apiKey}`;
      let entry: { path: string; icon: string; note: string };
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        entry = { path, icon: res.ok ? "✅" : "⚠️", note: res.ok ? `${res.status} OK` : `HTTP ${res.status}` };
      } catch {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6000);
          await fetch(url, { mode: "no-cors", signal: ctrl.signal });
          clearTimeout(timer);
          entry = { path, icon: "⚠️", note: "reached, CORS-blocked" };
        } catch {
          entry = { path, icon: "❌", note: "unreachable" };
        }
      }
      results.push(entry);
      setTestResults([...results]);
    }
    setTesting(false);
  };

  const saveLayoutMode = (mode: 1 | 2 | 3 | 4) => {
    try {
      localStorage.setItem('careinn-layout-mode', mode.toString());
    } catch {
      // ignore storage errors
    }
    setLayoutModeValue(mode);
    window.dispatchEvent(new Event('layout-mode-changed'));
  };

  const saveOrientation = (value: "auto" | "landscape" | "portrait") => {
    try {
      if (value === 'auto') localStorage.removeItem('careinn-orientation');
      else localStorage.setItem('careinn-orientation', value);
    } catch {
      // ignore storage errors
    }
    setOrientationValue(value);
    window.dispatchEvent(new Event('orientation-changed'));
  };

  if (!open) return null;

  const renderContent = () => {
    switch (step) {
      case 'menu': {
        const isCustom = isCustomConfig();
        const apiConfig = getApiConfig();
        return (
          /* The Settings list rows (listRow.tsx): same rows as the panel
             that opened this, not a second style of grey boxes. */
          <div className="flex flex-col" style={{ paddingTop: "16px" }}>
            <ListRowGroup>
              <ListRow
                icon={KeyRound}
                label={getAccount() ? tr("settings.pin") : tr("settings.setPin")}
                value={getAccount() ? tr("settings.pin.subtitle.set") : tr("settings.pin.subtitle.unset")}
                onClick={() => setStep(getAccount() ? 'overview' : 'setup-pin1')}
              />
              <ListRow
                icon={Image}
                label={tr("prefs.backgrounds")}
                value={getSavedHeroImage() ? tr("prefs.backgrounds.custom") : (isSlideshowEnabled() ? tr("prefs.backgrounds.slideshow") : tr("prefs.backgrounds.default"))}
                onClick={() => setStep('backgrounds')}
              />
              {(() => {
                const setupIncomplete = localStorage.getItem("careinn-onboarding-complete") !== "true";
                return (
                  <ListRow
                    icon={SlidersHorizontal}
                    label={tr("prefs.setup")}
                    value={setupIncomplete ? tr("prefs.setup.incomplete") : tr("prefs.setup.review")}
                    valueTone={setupIncomplete ? "warning" : "muted"}
                    onClick={() => {
                      onClose();
                      // App root listens: closes Settings and opens the wizard
                      window.dispatchEvent(new CustomEvent("careinn-open-onboarding"));
                    }}
                  />
                );
              })()}
            </ListRowGroup>

            {/* Staff only, in their own group. */}
            <div style={{ height: "12px" }} />
            <ListRowGroup>
              <ListRow
                icon={Layout}
                label="Layout Mode"
                value={`Layout ${layoutModeValue} selected`}
                onClick={() => setStep('layout-mode')}
              />
              <ListRow
                icon={Globe}
                label="Server"
                value={isAdminUnlocked ? `${apiConfig.serverIp}${isCustom ? " · custom" : ""}` : "Requires Admin"}
                disabled={!isAdminUnlocked}
                onClick={() => setStep('server')}
              />
              <ListRow
                icon={Settings}
                label="Admin Settings"
                value={isAdminUnlocked ? "Unlocked" : "PIN protected"}
                onClick={() => {
                  if (isAdminUnlocked) {
                    setStep('admin-controls');
                  } else {
                    setVerifyPinVal("");
                    setError(false);
                    setPendingAction('admin-login');
                    setStep('verify-current-pin');
                  }
                }}
              />
            </ListRowGroup>
          </div>
        );
      }

      case 'server':
        return (
          <div className="flex flex-col" style={{ paddingTop: "16px" }}>
            <label style={{ fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>Server IP</label>
            <input
              type="text"
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder="10.32.0.86"
              style={{
                width: "100%", padding: "12px", borderRadius: t.radiusMd, border: `1px solid ${error && !isValidServerUrl(serverIp) ? '#EF4444' : t.borderDefault}`,
                backgroundColor: t.surfaceElevated, fontFamily: t.fontFamily, fontSize: "15px", marginBottom: "16px", outline: "none",
              }}
            />

            <label style={{ fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="20b91694-..."
              style={{
                width: "100%", padding: "12px", borderRadius: t.radiusMd, border: `1px solid ${error && !apiKey.trim() ? '#EF4444' : t.borderDefault}`,
                backgroundColor: t.surfaceElevated, fontFamily: t.fontFamily, fontSize: "15px", marginBottom: "16px", outline: "none",
              }}
            />

            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
              <button
                onClick={() => {
                  setServerIp("https://control.careinn.com/api");
                  setApiKey("2345fcba-1633-46c9-a27e-ed0ca9ee17e9");
                }}
                className="px-3 py-1.5 rounded-full font-bold cursor-pointer transition-all active:scale-95 shrink-0"
                style={{ backgroundColor: t.primarySubtle, color: t.primaryOn, fontSize: "12px", border: "none" }}
              >
                Default Cloud
              </button>
              <button
                onClick={() => {
                  setServerIp(SECONDARY_OPTION.serverIp);
                  setApiKey(SECONDARY_OPTION.apiKey);
                }}
                className="px-3 py-1.5 rounded-full font-bold cursor-pointer transition-all active:scale-95 shrink-0"
                style={{ backgroundColor: t.tileInactiveBg, color: t.textMuted, fontSize: "12px", border: `1px solid ${t.borderDefault}` }}
              >
                Secondary Local ({
                  SECONDARY_OPTION.serverIp.includes("10.1.189.77") ? "10.1.189.77" :
                  SECONDARY_OPTION.serverIp.includes("careinn.bh.com") ? "careinn.bh.com" :
                  SECONDARY_OPTION.serverIp.includes("10.11.16.15") ? "10.11.16.15" : "10.32.x"
                })
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveServer}
                className="w-full py-3 rounded-lg font-bold text-white transition-transform active:scale-[0.98]"
                style={{ backgroundColor: t.primary, fontFamily: t.fontFamily, border: "none" }}
              >
                Save & Reconnect
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleResetServer}
                  className="flex-1 py-3 rounded-lg font-semibold transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: t.tileInactiveBg, color: t.textHeading, fontFamily: t.fontFamily, border: "none" }}
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => setStep('menu')}
                  className="flex-1 py-3 rounded-lg font-semibold transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: "transparent", color: t.textMuted, fontFamily: t.fontFamily, border: `1px solid ${t.borderDefault}` }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Connection diagnostics — tests the entered server for reachability vs CORS */}
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${t.borderDefault}` }}>
              {(window as any).AndroidSystem?.getKioskStatus && (() => {
                let ks: any = {};
                try { ks = JSON.parse((window as any).AndroidSystem.getKioskStatus() || "{}"); } catch {}
                return (
                  <div style={{ marginBottom: 12, fontFamily: t.fontFamily, fontSize: "12px", color: t.textMuted }}>
                    <span>Device Owner: </span>
                    <b style={{ color: ks.isDeviceOwner ? t.textHeading : "#EF4444" }}>{ks.isDeviceOwner ? "Yes" : "No"}</b>
                    {!ks.isDeviceOwner && (
                      <span style={{ color: t.errorOn }}> — kiosk is screen-pinning; apps can't launch until Device Owner is restored</span>
                    )}
                    <div>Lock Task: {ks.isInLockTask ? "On" : "Off"} · Build: {ks.buildType || "?"}</div>
                  </div>
                );
              })()}
              <button
                onClick={runConnectionTest}
                disabled={testing}
                className="w-full py-3 rounded-lg font-bold transition-transform active:scale-[0.98]"
                style={{ backgroundColor: t.tileInactiveBg, color: t.textHeading, fontFamily: t.fontFamily, border: `1px solid ${t.borderDefault}`, opacity: testing ? 0.6 : 1 }}
              >
                {testing ? "Testing…" : "Test Connection"}
              </button>

              {testResults.length > 0 && (
                <div className="mt-3 flex flex-col gap-1" style={{ backgroundColor: t.surfaceElevated, borderRadius: t.radiusMd, padding: "12px" }}>
                  <span style={{ fontFamily: t.fontFamily, fontSize: "12px", fontWeight: 700, color: t.textMuted, marginBottom: 4, wordBreak: "break-all" }}>
                    {resolveBaseUrl(serverIp)}
                  </span>
                  {testResults.map((r) => (
                    <div key={r.path} className="flex items-center justify-between gap-2">
                      <span style={{ fontFamily: t.fontFamily, fontSize: "12px", color: t.textNormal, wordBreak: "break-all" }}>
                        {r.icon} {r.path}
                      </span>
                      <span style={{ fontFamily: t.fontFamily, fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>
                        {r.note}
                      </span>
                    </div>
                  ))}
                  {!testing && (
                    <span style={{ fontFamily: t.fontFamily, fontSize: "12px", fontWeight: 600, color: t.textHeading, marginTop: 8 }}>
                      {(() => {
                        const anyCors = testResults.some(r => r.note === "reached, CORS-blocked");
                        const anyOk = testResults.some(r => r.icon === "✅");
                        const allUnreachable = testResults.every(r => r.icon === "❌");
                        if (allUnreachable) return "→ Server unreachable (network / cleartext).";
                        if (anyCors && !anyOk) return "→ CORS: server reachable, browser reads blocked. Needs native bridge or server CORS header.";
                        if (anyCors) return "→ Partial: some endpoints CORS-blocked.";
                        return "→ All endpoints reachable.";
                      })()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'admin-controls':
        return (
          <div className="flex flex-col items-center" style={{ paddingTop: "16px" }}>
            <Shield size={40} style={{ color: t.primaryOn, marginBottom: 16 }} />
            <span style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogTitle, color: t.textHeading, marginBottom: 8, textAlign: "center" }}>
              Admin Controls
            </span>
            <span style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogBody, color: t.textMuted, marginBottom: 24, textAlign: "center" }}>
              Admin mode active — 10 min window
            </span>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  window.AndroidSystem?.exitKioskMode?.(adminPin);
                  window.AndroidSystem?.triggerMaintenanceMode?.(adminPin);
                  setStep('menu');
                }}
                className="w-full py-3 rounded-lg font-bold transition-transform active:scale-[0.98]"
                style={{ backgroundColor: t.primarySubtle, color: t.primaryOn, fontFamily: t.fontFamily, border: "none" }}
              >
                Exit Kiosk Mode
              </button>
              <button
                onClick={() => {
                  window.AndroidSystem?.returnToKioskMode?.();
                  setStep('menu');
                }}
                className="w-full py-3 rounded-lg font-bold transition-transform active:scale-[0.98]"
                style={{ backgroundColor: t.tileInactiveBg, color: t.textHeading, fontFamily: t.fontFamily, border: "none" }}
              >
                Return to Kiosk Mode
              </button>
              {/* TODO: Add more admin controls here */}
            </div>
          </div>
        );

      /* ── PIN family ──
         On the shared popup (dialogKit.tsx). The title bar names what was
         tapped (Set PIN, Change PIN, Remove PIN, NFC card); each step adds
         one line saying what to do, then the keypad or the actions. */
      case 'overview':
        return (
          <div className="flex flex-col" style={{ paddingTop: "8px" }}>
            <DialogText>{tr("pin.overview.desc")}</DialogText>
            {/* Choices, not actions: the Settings list rows, so they read as
                "open this", not as Cancel. Remove sits apart, in red. */}
            <div className="flex flex-col" style={{ gap: "12px", marginTop: "24px" }}>
              <ListRowGroup>
                <ListRow
                  icon={KeyRound}
                  label={tr("settings.changePin")}
                  onClick={() => { setVerifyPinVal(""); setError(false); setPendingAction('reset-pin'); setStep('verify-current-pin'); }}
                />
                <ListRow
                  icon={Nfc}
                  label={tr("pin.updateNfc")}
                  onClick={() => { setVerifyPinVal(""); setError(false); setPendingAction('reset-nfc'); setStep('verify-current-pin'); }}
                />
              </ListRowGroup>
              <ListRowGroup>
                <ListRow
                  icon={Trash2}
                  tone="danger"
                  label={tr("pin.remove")}
                  onClick={() => { setVerifyPinVal(""); setError(false); setPendingAction('remove-account'); setStep('verify-current-pin'); }}
                />
              </ListRowGroup>
            </div>
          </div>
        );

      case 'setup-pin1':
        return (
          <>
            <DialogText align="center" style={{ marginTop: "16px" }}>{tr("pinSetup.subtitle")}</DialogText>
            <PinKeypad pin={pin1} setPin={setPin1} error={false} onComplete={() => setStep('setup-pin2')} />
          </>
        );

      case 'setup-pin2':
        return (
          <>
            <DialogText align="center" style={{ marginTop: "16px" }}>{tr("pinSetup.confirm")}</DialogText>
            <PinKeypad
              pin={pin2}
              setPin={setPin2}
              error={error}
              onComplete={(p) => {
                if (p === pin1) {
                  setStep('nfc-prompt');
                } else {
                  setError(true);
                  setStep('setup-pin-mismatch');
                  setTimeout(() => {
                    setPin1("");
                    setPin2("");
                    setError(false);
                    setStep('setup-pin1');
                  }, 1500);
                }
              }}
            />
          </>
        );

      case 'setup-pin-mismatch':
        return (
          <div className="flex flex-col items-center" style={{ gap: "16px", padding: "32px 0 16px" }}>
            <AlertCircle size={40} style={{ color: t.errorOn }} />
            <DialogText align="center" tone="error">{tr("pinSetup.mismatch")}</DialogText>
          </div>
        );

      case 'nfc-prompt':
        return (
          <>
            <DialogText style={{ marginTop: "8px" }}>{tr("nfcSetup.subtitle")}</DialogText>
            <DialogActions>
              <DialogButton kind="secondary" label={tr("nfcSetup.skip")} onClick={() => { setAccount(pin1, null).then(() => setStep('success')); }} />
              <DialogButton label={tr("nfcSetup.pair")} onClick={() => setStep('nfc-tap1')} />
            </DialogActions>
          </>
        );

      case 'nfc-tap1':
      case 'nfc-tap2':
        return (
          <div className="flex flex-col items-center" style={{ paddingTop: "24px" }}>
            <div className="relative mb-6 flex items-center justify-center" style={{ width: 100, height: 100 }}>
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: t.primary }}></div>
              <div className="absolute inset-2 rounded-full animate-ping opacity-40 animation-delay-150" style={{ backgroundColor: t.primary }}></div>
              <div className="relative rounded-full z-10 flex items-center justify-center" style={{ width: 64, height: 64, backgroundColor: t.primary }}>
                <Shield size={32} style={{ color: t.brandOnPrimary }} />
              </div>
            </div>
            <DialogText align="center">
              {step === 'nfc-tap1' ? tr("nfcSetup.tap1") : tr("nfcSetup.tap2")} · {tr("nfcSetup.hold")}
            </DialogText>
            <DialogActions>
              <DialogButton
                kind="secondary"
                label={tr("general.cancel")}
                onClick={() => { if (getAccount()) setStep(backStep); else setStep('nfc-prompt'); }}
              />
            </DialogActions>
          </div>
        );

      case 'nfc-mismatch':
        return (
          <div className="flex flex-col items-center" style={{ gap: "16px", padding: "32px 0 16px" }}>
            <AlertCircle size={40} style={{ color: t.errorOn }} />
            <DialogText align="center" tone="error">{tr("nfcSetup.mismatch")}</DialogText>
          </div>
        );

      case 'verify-current-pin':
        return (
          <>
            <DialogText align="center" tone={error ? "error" : "muted"} style={{ marginTop: "16px" }}>
              {pendingAction === 'admin-login'
                ? "Enter admin password"
                : error ? tr("pin.wrong") : tr("pin.current")}
            </DialogText>
            <PinKeypad
              pin={verifyPinVal}
              setPin={setVerifyPinVal}
              error={error}
              onComplete={async (p) => {
                if (pendingAction === 'admin-login') {
                  if (p === '2580') {
                    setAdminPin(p);
                    setIsAdminUnlocked(true);
                    setStep('admin-controls');
                  } else {
                    setError(true);
                    setTimeout(() => {
                      setVerifyPinVal("");
                      setError(false);
                    }, 1000);
                  }
                  return;
                }

                const ok = await verifyPin(p);
                if (ok) {
                  if (pendingAction === 'remove-account') {
                    setStep('remove-confirm');
                  } else if (pendingAction === 'reset-pin') {
                    setPin1("");
                    setPin2("");
                    setStep('setup-pin1');
                  } else if (pendingAction === 'reset-nfc') {
                    setNfcUid1(null);
                    setStep('nfc-tap1');
                  }
                } else {
                  setError(true);
                  setTimeout(() => {
                    setVerifyPinVal("");
                    setError(false);
                  }, 1000);
                }
              }}
            />
          </>
        );

      case 'remove-confirm':
        return (
          <>
            <DialogText style={{ marginTop: "8px" }}>{tr("pin.remove.desc")}</DialogText>
            <DialogActions>
              <DialogButton kind="secondary" label={tr("general.cancel")} onClick={() => setStep(backStep)} />
              <DialogButton kind="danger" label={tr("pin.remove")} onClick={() => { clearAccount(); setStep('success'); }} />
            </DialogActions>
          </>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center" style={{ gap: "16px", padding: "32px 0 16px" }}>
            <CheckCircle size={48} style={{ color: t.successOn }} />
            <DialogText align="center">
              {pendingAction === 'remove-account' ? tr("pinSetup.removed") : tr("pinSetup.saved")}
            </DialogText>
          </div>
        );

      case 'layout-mode':
        return (
          <div className="flex flex-col" style={{ paddingTop: "16px" }}>
            <div className="flex flex-col gap-3" style={{ padding: "8px 0 0" }}>
              {[
                { id: 1, title: "Layout 1", subtitle: "Current layout (existing design)" },
                { id: 2, title: "Layout 2", subtitle: "CareInn15 design" },
                { id: 3, title: "Layout 3", subtitle: "Kids mode — playful pediatric design" },
                { id: 4, title: "Layout 4", subtitle: "Spotlight — full hospital photo with glass cards" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => saveLayoutMode(option.id as 1 | 2 | 3 | 4)}
                  className="flex items-center gap-3 w-full text-left cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ padding: "16px", borderRadius: t.radiusLg, backgroundColor: t.tileInactiveBg, border: "none" }}
                >
                  <div className="flex-1 flex flex-col gap-1">
                    <span style={{ fontFamily: t.fontFamily, fontSize: "15px", fontWeight: 700, color: t.textHeading }}>
                      {option.title}
                    </span>
                    <span style={{ fontFamily: t.fontFamily, fontSize: "13px", color: t.textMuted }}>
                      {option.subtitle}
                    </span>
                  </div>
                  {layoutModeValue === option.id ? (
                    <Check size={18} style={{ color: t.primaryOn }} />
                  ) : null}
                </button>
              ))}
            </div>
            <span style={{ fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 700, color: t.textMuted, padding: "20px 0 8px" }}>
              Screen
            </span>
            <div className="flex flex-col gap-3">
              {([
                { id: "auto", title: "Auto", subtitle: "Follow the screen: portrait when it's taller than wide" },
                { id: "landscape", title: "Landscape", subtitle: "1920 × 1080" },
                { id: "portrait", title: "Portrait", subtitle: "1080 × 1920 — Home in one column" },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  onClick={() => saveOrientation(option.id)}
                  className="flex items-center gap-3 w-full text-left cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ padding: "16px", borderRadius: t.radiusLg, backgroundColor: t.tileInactiveBg, border: "none" }}
                >
                  <div className="flex-1 flex flex-col gap-1">
                    <span style={{ fontFamily: t.fontFamily, fontSize: "15px", fontWeight: 700, color: t.textHeading }}>
                      {option.title}
                    </span>
                    <span style={{ fontFamily: t.fontFamily, fontSize: "13px", color: t.textMuted }}>
                      {option.subtitle}
                    </span>
                  </div>
                  {orientationValue === option.id ? (
                    <Check size={18} style={{ color: t.primaryOn }} />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        );

      case 'backgrounds':
        return <BackgroundsPanel />;
    }
  };

  /* Each PIN step is titled with the action the patient chose, never a
     generic "Password". */
  const pinTitle = () => {
    if (pendingAction === 'admin-login') return "Admin Login";
    if (pendingAction === 'remove-account') return tr("pin.remove");
    if (pendingAction === 'reset-nfc') return tr("pin.nfcCard");
    if (pendingAction === 'reset-pin') return tr("settings.changePin");
    return tr("settings.setPin");
  };
  /* Title-bar icon for the standard steps (keypad steps draw none). */
  const stepIcon = () => {
    switch (step) {
      case 'menu': return UserCircle;
      case 'overview': return KeyRound;
      case 'nfc-prompt': return Nfc;
      case 'remove-confirm': return Trash2;
      case 'server': return Globe;
      case 'layout-mode': return Layout;
      case 'admin-controls': return Settings;
      case 'backgrounds': return Image;
      default: return undefined;
    }
  };
  const getTitle = () => {
    switch (step) {
      case 'menu': return tr("settings.preferences");
      case 'server': return "Server Configuration";
      case 'layout-mode': return "Layout Mode";
      case 'admin-controls': return "Admin Settings";
      case 'overview': return tr("settings.pin");
      case 'setup-pin1':
      case 'setup-pin2':
      case 'setup-pin-mismatch':
      case 'nfc-prompt':
      case 'nfc-tap1':
      case 'nfc-tap2':
      case 'nfc-mismatch':
      case 'verify-current-pin':
      case 'remove-confirm':
      case 'success':
        return pinTitle();
      case 'backgrounds': return tr("prefs.backgrounds");
      default: return tr("settings.preferences");
    }
  };

  const showHeader = true;
  /* The PIN row's options screen is its home: every step under it backs up
     to it, the way the full dialog's steps back up to the menu. */
  const backStep: Step = mode === 'full' ? 'menu' : 'overview';
  const canGoBack = step !== 'success' && (
    mode === 'full' ? step !== 'menu' : mode === 'pin' && !!account && step !== 'overview'
  );
  const isPinStep = !['menu', 'server', 'layout-mode', 'admin-controls', 'backgrounds'].includes(step);
  /* Keypad steps and their one-line results are PIN popups (centred);
     the PIN options, the NFC question and Remove's confirm are standard. */
  const isKeypadStep = ['setup-pin1', 'setup-pin2', 'setup-pin-mismatch', 'verify-current-pin', 'nfc-tap1', 'nfc-tap2', 'nfc-mismatch', 'success'].includes(step);

  return (
    <DialogFrame onClose={onClose} size={isPinStep ? "small" : "content"} kind={isKeypadStep ? "pin" : "standard"}>
      {showHeader && (
        <DialogTitleBar
          title={getTitle()}
          onClose={onClose}
          onBack={canGoBack ? () => setStep(backStep) : undefined}
          icon={stepIcon()}
          tone={step === 'remove-confirm' ? "danger" : "brand"}
        />
      )}
      {renderContent()}
    </DialogFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BACKGROUNDS PANEL
 * ═══════════════════════════════════════════════════════════════════════════ */

function BackgroundsPanel() {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();

  const [groups, setGroups] = useState<WallpaperGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState<string>(
    getSavedHeroImage() ?? "");
  const [slideshow, setSlideshow] = useState(isSlideshowEnabled());

  const doFetch = async () => {
    setLoading(true);
    const data = await fetchAllWallpapers();
    setGroups(data);
    setLoading(false);
  };

  useEffect(() => {
    doFetch();
    window.addEventListener("api-config-changed", doFetch);
    return () => window.removeEventListener("api-config-changed", doFetch);
  }, []);

  const handleSelect = (originalUrl: string) => {
    setSelectedUrl(originalUrl);
    saveHeroImage(originalUrl);
    setSlideshowEnabled(false);
    setSlideshow(false);
  };

  const handleSlideshow = (enabled: boolean) => {
    setSlideshow(enabled);
    setSlideshowEnabled(enabled);
    if (enabled) {
      setSelectedUrl("");
      clearSavedHeroImage();
    }
  };

  // Hardcoded theme images (always available as fallback)
  const themeImages: string[] = (t as any).heroImageUrls ?? [];

  return (
    <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Slideshow toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", backgroundColor: t.tileInactiveBg,
        borderRadius: t.radiusMd, border: `1px solid ${t.borderSubtle}`,
      }}>
        <div>
          <p style={{ fontFamily: t.fontFamily, fontSize: "15px", fontWeight: 600, color: t.textHeading, margin: 0 }}>
            {tr("prefs.backgrounds.slideshow.label")}
          </p>
          <p style={{ fontFamily: t.fontFamily, fontSize: "12px", color: t.textMuted, margin: "2px 0 0 0" }}>
            {tr("prefs.backgrounds.slideshow.hint")}
          </p>
        </div>
        <div
          onClick={() => handleSlideshow(!slideshow)}
          style={{
            width: 44, height: 24, borderRadius: 12, cursor: "pointer",
            backgroundColor: slideshow ? t.primary : t.borderDefault,
            position: "relative", transition: "background-color 0.2s",
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff",
            position: "absolute", top: 2,
            left: slideshow ? 22 : 2,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>

      {loading && (
        <p style={{ fontFamily: t.fontFamily, color: t.textMuted, fontSize: "14px", textAlign: "center", padding: "16px 0" }}>
          {tr("prefs.backgrounds.loading")}
        </p>
      )}

      {/* API wallpaper groups */}
      {!loading && groups.map(group => (
        <div key={group.id}>
          <p style={{
            fontFamily: t.fontFamily, fontSize: "12px", fontWeight: 700, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0",
          }}>
            {group.title}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: "8px", marginBottom: "16px" }}>
            {group.images.map(img => {
              const isSelected = selectedUrl === img.imageUrl && !slideshow;
              return (
                <button
                  key={img.id}
                  onClick={() => handleSelect(img.imageUrl)}
                  style={{
                    position: "relative", width: "100%", aspectRatio: "16/9",
                    borderRadius: t.radiusMd, overflow: "hidden", cursor: "pointer", padding: 0,
                    border: isSelected ? `3px solid ${t.primary}` : `2px solid ${t.borderSubtle}`,
                    background: t.tileInactiveBg,
                  }}
                >
                  <ApiImage src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                  {isSelected && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={22} color="#fff" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Hardcoded theme images */}
      {themeImages.length > 0 && (
        <div>
          <p style={{
            fontFamily: t.fontFamily, fontSize: "12px", fontWeight: 700, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0",
          }}>
            {tr("prefs.backgrounds.default")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: "8px", marginBottom: "16px" }}>
            {themeImages.map((url, i) => {
              const isSelected = selectedUrl === url && !slideshow;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(url)}
                  style={{
                    position: "relative", width: "100%", aspectRatio: "16/9",
                    borderRadius: t.radiusMd, overflow: "hidden", cursor: "pointer", padding: 0,
                    border: isSelected ? `3px solid ${t.primary}` : `2px solid ${t.borderSubtle}`,
                    background: t.tileInactiveBg,
                  }}
                >
                  <ApiImage src={url} alt="" className="w-full h-full object-cover" />
                  {isSelected && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={22} color="#fff" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No images at all */}
      {!loading && groups.length === 0 && themeImages.length === 0 && (
        <p style={{ fontFamily: t.fontFamily, color: t.textMuted, fontSize: "14px", textAlign: "center", padding: "16px 0" }}>
          {tr("prefs.backgrounds.empty")}
        </p>
      )}
    </div>
  );
}
