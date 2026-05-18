import { useEffect, useState, useCallback, useRef } from "react";
import { getAuthorizedCards, getNurseCardUid } from "./utils/nfc";
import { isTvDevice } from "./utils/deviceDetect";
import { ThemeProvider, useTheme, TYPE_SCALE, WEIGHT, SHADOW, SPACE } from "./components/ThemeContext";
import { IptvChannels } from "./components/IptvChannels";
import { useSipCallState } from "./utils/androidBridge";
import { useLocale } from "./components/i18n";
import { TopBar } from "./components/TopBar";
import { NewsTicker } from "./components/NewsTicker";
import { PatientGreeting } from "./components/PatientGreeting";
import { ServicesGrid, ShortcutsColumn, HubGridCompact, ServiceCardsRow } from "./components/ServicesGrid";
import { useCmsHospital, useCmsSectionVisibility } from '../lib/useCmsContent';
import { CareMe, CareMeExpanded } from "./components/CareMe";
import { IdleScreen } from "./components/IdleScreen";
import { RippleStyles } from "./components/useRipple";
import { AppLauncher } from "./components/AppLauncher";
import { SurveyModal } from "./components/SurveyModal";
import { AboutUs } from "./components/AboutUs";
import { SettingsPanel } from "./components/SettingsPanel";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { AppTour } from "./components/AppTour";
import { CallScreen } from "./components/CallScreen";
import { AutoCarousel } from "./components/AutoCarousel";
import fakeehSymbol from "../assets/7b9b440667ca2ce8678111ec37e1fb104ae88026.png";
import caremedicalicon from "../assets/caremedicalicon.png";
import { HospitalConfigurator } from "./components/HospitalConfigurator";
import { TasbihScreenSaver } from "./components/TasbihScreenSaver";
import { FoodOrdering } from "./components/FoodOrdering";
import { OrderProvider } from "./components/OrderStore";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { PasswordGate } from "./components/PasswordGate";
import { HospitalBroadcast, SAMPLE_BROADCAST } from "./components/HospitalBroadcast";
import type { BroadcastNotification } from "./components/HospitalBroadcast";
import { MemoryGame } from "./components/games/MemoryGame";
import { TicTacToeGame } from "./components/games/TicTacToeGame";
import { SlidingPuzzleGame } from "./components/games/SlidingPuzzleGame";
import { ColorMatchGame } from "./components/games/ColorMatchGame";
import { PatternMemoryGame } from "./components/games/PatternMemoryGame";
import { EmojiMatchGame } from "./components/games/EmojiMatchGame";
import { SimonSaysGame } from "./components/games/SimonSaysGame";
import { WordSearchGame } from "./components/games/WordSearchGame";
import { ReactionTimeGame } from "./components/games/ReactionTimeGame";
import { BrainMathGame } from "./components/games/BrainMathGame";
import { TriviaQuizGame } from "./components/games/TriviaQuizGame";
import { ImageJigsawGame } from "./components/games/ImageJigsawGame";
import { WordChainGame } from "./components/games/WordChainGame";
import { CalculatorTool } from "./components/tools/CalculatorTool";
import { NotesTool } from "./components/tools/NotesTool";
import { RemindersTool, DEFAULT_REMINDERS, parseReminderTime } from "./components/tools/RemindersTool";
import type { Reminder } from "./components/tools/RemindersTool";

import { StopwatchTool } from "./components/tools/StopwatchTool";
import { UnitConverterTool } from "./components/tools/UnitConverterTool";
import { BreathingTool } from "./components/tools/BreathingTool";
import { WhiteboardTool } from "./components/tools/WhiteboardTool";
import { MirrorTool } from "./components/tools/MirrorTool";
import { RoomControl } from "./components/RoomControl";

import { getPrayerStatus, PRAYER_NAMES, formatPrayerTime } from "./utils/prayerUtils";
import { Prayer } from "adhan";
import { isAccountSet } from "./lib/accountAuth";
import { useNetworkStatus } from "./lib/networkStatus";
import { AccountLockScreen } from "./components/AccountLockScreen";
import { OfflineBanner } from "./components/OfflineBanner";
import { useGuestMode, guestModeStore } from "./lib/guestMode";
import { CareMePinDialog } from "./components/CareMePinDialog";
import { Lock } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { 
  fetchAppPackages, invalidatePackagesCache, fetchPatientForDevice,
  fetchDeviceAlerts, getSeenAlertIds, markAlertSeen,
  markAllAlertsSeen, DeviceAlert
} from "./lib/hospitalApi";
import { nurseActions } from "./components/NurseDataStore";
import { getDeviceInfo } from "./utils/androidBridge";
import { matchBinding } from "./lib/handsetConfig";
import { sip, iptv, _getIptvChannels, _getIptvPlayingId, isAndroidApp, IptvChannel } from "./utils/androidBridge";


const DESIGN_W = 1920;
const DESIGN_H = 1080;

function useScreenScale() {
  const getScale = useCallback(() => {
    const isTV = isTvDevice();

    if (!isTV) {
      // Standard laptop/desktop browser or touch tablet kiosk:
      // Exactly scale to the available inner window dimensions
      const sx = window.innerWidth / DESIGN_W;
      const sy = window.innerHeight / DESIGN_H;
      return Math.min(sx, sy);
    }

    // TV set-top boxes (STBs running Android kiosk app with DPR=2 viewport bugs)
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(
      window.innerWidth,
      window.innerWidth * dpr,
      window.screen?.width || 0,
      document.documentElement?.clientWidth || 0
    );
    const h = Math.max(
      window.innerHeight,
      window.innerHeight * dpr,
      window.screen?.height || 0,
      document.documentElement?.clientHeight || 0
    );

    const sx = w / DESIGN_W;
    const sy = h / DESIGN_H;
    const scale = Math.min(sx, sy);
    return Math.max(0.5, Math.min(2.0, scale));
  }, []);

  const [scale, setScale] = useState(getScale);

  useEffect(() => {
    const t1 = setTimeout(() => setScale(getScale()), 100);
    const t2 = setTimeout(() => setScale(getScale()), 500);
    const t3 = setTimeout(() => setScale(getScale()), 1500);

    const onResize = () => setScale(getScale());
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", onResize);
    };
  }, [getScale]);

  return scale;
}

function BedsideScreen() {
  const { patientAdmitted, setPatientAdmitted, theme, darkMode, switchConfig, prayerAlarm } = useTheme();
  const { isFullAccess, lockedHospitalId } = useAuth();
  const { t, locale, isRTL, dir, fontFamily } = useLocale();
  const scale = useScreenScale();
  const isOnline = useNetworkStatus();
  const isTV = isTvDevice();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  /* ── Auto-switch hospital config based on login password ── */
  const hasAppliedConfig = useRef(false);
  useEffect(() => {
    if (lockedHospitalId && !hasAppliedConfig.current) {
      switchConfig(lockedHospitalId);
      hasAppliedConfig.current = true;
    }
  }, [lockedHospitalId, switchConfig]);

  useEffect(() => {
    // Pre-fetch packages on startup so AppLauncher loads instantly
    fetchAppPackages();

    const syncPatient = () => {
      if (!isAndroidApp()) return;
      const info = getDeviceInfo();
      if (!info?.serial) return;
      
      
      fetchPatientForDevice(info.serial)
        .then(result => {
          if (result) {
            const p = result.patient;
            
            // Store device group for alert filtering
            deviceGroupRef.current = result.location.group?.id || null;
            fetchAlerts();

            nurseActions.updatePatientFromApi({
              name:          p.name          || undefined,
              nameAr:        p.nameAr        || undefined,
              mrn:           p.mrn           || undefined,
              room:          p.room          || undefined,
              bed:           p.bed           || undefined,
              sex:           p.sex           || undefined,
              dob:           p.dob           || undefined,
              admissionDate: p.admissionDate || undefined,
              dischargeDate: p.dischargeDate || undefined,
            });
          }
        })
        .catch(() => {});
    };
    syncPatient();

    // Re-fetch when server changes
    const handler = () => {
      invalidatePackagesCache();
      fetchAppPackages();
      syncPatient();
    };
    window.addEventListener("api-config-changed", handler);
    return () => window.removeEventListener("api-config-changed", handler);
  }, []);

  // Close AppLauncher when kiosk app returns to foreground
  useEffect(() => {
    const handler = () => setOpenCategory(null);
    window.addEventListener("kiosk-resumed", handler);
    return () => window.removeEventListener("kiosk-resumed", handler);
  }, []);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showTasbih, setShowTasbih] = useState(false);
  const [tourDismissed, setTourDismissed] = useState(() => {
    try {
      return localStorage.getItem("hbs-tour-seen") === "1";
    } catch {
      return false;
    }
  });
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [openAccountDirectly, setOpenAccountDirectly] = useState(false);

  const [showCareMeExpanded, setShowCareMeExpanded] = useState(false);
  const [showCareMePinDialog, setShowCareMePinDialog] = useState(false);
  const [lockMenuApp, setLockMenuApp] = useState<string | null>(null);

  const lockActiveRef = useRef(false);

  // Note: Existing history back/push logic for normal overlays at line 174 
  // is still needed for non-lock overlays, but we've integrated popstate above.
  const { isGuest, careMeUnlocked } = useGuestMode();
  const [showCall, setShowCall] = useState(false);
  const [showFoodOrder, setShowFoodOrder] = useState(false);
  const [activeCareRole, setActiveCareRole] = useState<"nurse" | "doctor" | null>(null);
  const [layoutVersion, setLayoutVersion] = useState<1 | 2 | 3>(1);
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastNotification | null>(null);
  const [acknowledgedBroadcasts, setAcknowledgedBroadcasts] = useState<BroadcastNotification[]>([]);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showBlankPage, setShowBlankPage] = useState(false);
  const [showIptv, setShowIptv] = useState(false);

  // Queue of immediate alerts to show as broadcast popups
  const [broadcastQueue, setBroadcastQueue] = useState<BroadcastNotification[]>([]);

  // API alerts shown in NotificationsPanel
  const [apiNotifications, setApiNotifications] = useState<DeviceAlert[]>([]);

  const deviceGroupRef = useRef<number | null>(null);
  const appStartRef = useRef(Date.now());

  const fetchAlerts = useCallback(async () => {
    // Prevent fetching during tour or for the first minute of a fresh entry
    const isFirstEntry = !tourDismissed;
    const timeSinceStart = Date.now() - appStartRef.current;
    if (showTour || (isFirstEntry && timeSinceStart < 60000)) return;

    const alerts = await fetchDeviceAlerts();
    if (!alerts.length) {
      setApiNotifications([]);
      return;
    }

    const seen = getSeenAlertIds();
    const deviceGroupId = deviceGroupRef.current ?? 1;

    const relevant = alerts.filter(a =>
      a.groupIds.length === 0 ||
      a.groupIds.includes(deviceGroupId)
    );

    setApiNotifications(relevant);

    const unseen = relevant.filter(a => !seen.has(a.id));

    // Immediate alerts
    const immediate = unseen.filter(a => a.sendImmediately);

    if (immediate.length > 0) {
      const broadcasts: BroadcastNotification[] = immediate.map(a => ({
        id:       `alert-${a.id}`,
        type:     "announcement" as const,
        priority: "urgent" as const,
        title:    { en: a.titleEn, ar: a.titleAr },
        body:     { en: a.bodyEn,  ar: a.bodyAr  },
        icon:     "megaphone",
      }));
      setBroadcastQueue(prev => [...prev, ...broadcasts]);
      markAllAlertsSeen(immediate.map(a => a.id));
    }

    // Scheduled alerts that are due or overdue
    const now = new Date();
    const dueSoon = unseen.filter(a => {
      if (a.status !== "scheduled" || !a.scheduledAt) return false;
      const scheduledTime = new Date(a.scheduledAt);
      const diffMs = now.getTime() - scheduledTime.getTime();
      // Show if scheduled time has reached or passed
      return diffMs >= 0;
    });

    if (dueSoon.length > 0) {
      dueSoon.forEach(a => {
        const title = locale === "ar" ? a.titleAr : a.titleEn;
        const body = locale === "ar" ? a.bodyAr : a.bodyEn;
        
        toast(title, {
          description: body,
          duration: 10000,
          icon: <Megaphone size={18} />,
        });
      });
      markAllAlertsSeen(dueSoon.map(a => a.id));
    }
  }, [locale, showTour]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Immediately check for alerts when tour finishes
  useEffect(() => {
    if (!showTour) {
      fetchAlerts();
    }
  }, [showTour, fetchAlerts]);

  useEffect(() => {
    // Only process the queue if the tour is NOT active AND the user has at least seen/skipped the tour once
    if (!showTour && tourDismissed && !activeBroadcast && broadcastQueue.length > 0) {
      const [next, ...rest] = broadcastQueue;
      setActiveBroadcast(next);
      setBroadcastQueue(rest);
    }
  }, [activeBroadcast, broadcastQueue, showTour, tourDismissed]);
  const anyOtherOverlayOpen = !!(
    openCategory || showSurvey || showAboutUs || showSettings ||
    showNotifications || showTour || showConfigurator ||
    showCareMeExpanded || showCall || showFoodOrder || activeBroadcast ||
    activeGame || activeTool || showIptv
  );
  const anyOverlayOpen = anyOtherOverlayOpen || showTasbih;
  
  const [iptvOsd, setIptvOsd] = useState<{
    name: string; 
    nameAr: string;
    logo: string;
    index: number;   // e.g. "Channel 5 of 55"
    total: number;
  } | null>(null);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showChannelOsd = useCallback((channel: IptvChannel) => {
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    const channels = _getIptvChannels();
    const idx = channels.findIndex(c => c.id === channel.id);
    setIptvOsd({
      name: channel.name,
      nameAr: channel.nameAr,
      logo: channel.logo,
      index: idx + 1,
      total: channels.length,
    });
    osdTimerRef.current = setTimeout(() => {
      setIptvOsd(null);
    }, 2500);
  }, []);


  const handleGoHome = useCallback(() => {
    setOpenCategory(null);
    setShowSurvey(false);
    setShowAboutUs(false);
    setShowSettings(false);
    setShowNotifications(false);
    setShowTour(false);
    setShowTasbih(false);
    setShowConfigurator(false);
    setShowCareMeExpanded(false);
    setShowCall(false);
    setShowFoodOrder(false);
    setActiveBroadcast(null);
    setActiveGame(null);
    setActiveTool(null);
    setShowIptv(false);
    setActiveCareRole(null);
  }, []);

  // ── Security & History Management ──

  // Global monitoring for Android and security gates
  useEffect(() => {
    window.__isLockActive = () => lockActiveRef.current;
    return () => { delete (window as any).__isLockActive; };
  }, []);

  useEffect(() => {
    lockActiveRef.current = 
      isLocked || 
      showCareMePinDialog || 
      !!lockMenuApp ||
      (showTasbih && isAccountSet());
  }, [isLocked, showCareMePinDialog, lockMenuApp, showTasbih]);

  // Initialize history state once on mount
  useEffect(() => {
    window.history.pushState({ careinnLock: true }, "");
  }, []);

  // FIX 2: Block browser back navigation when lock is active
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (lockActiveRef.current) {
        // Lock is active — push state back immediately
        window.history.pushState({ careinnLock: true }, "");

        // If on Tasbih with an account set, transition to lock screen instead of home
        if (showTasbih && isAccountSet()) {
          setIsLocked(true);
          setShowTasbih(false);
        }
        return;
      }
      
      // If no lock, but an overlay is open, close it (existing logic)
      if (anyOverlayOpen) {
        isPopping.current = true;
        handleGoHome();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [anyOverlayOpen, handleGoHome]);

  const lastOverlayState = useRef(false);
  const isPopping = useRef(false);

  // Replaced by unified popstate effect above

  useEffect(() => {
    if (anyOverlayOpen && !lastOverlayState.current) {
      window.history.pushState({ overlay: true }, "");
    } else if (!anyOverlayOpen && lastOverlayState.current) {
      if (!isPopping.current) {
        try { window.history.back(); } catch (e) { console.error(e); }
      }
    }
    lastOverlayState.current = anyOverlayOpen;
    isPopping.current = false;
  }, [anyOverlayOpen]);

  // --- Idle Timer for Tasbih Screen Saver ---
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;

    const startTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // Only show if no other overlays are open
        if (!anyOtherOverlayOpen) {
          setShowTasbih(true);
        }
      }, 60000); // 1 minute
    };

    const handleUserActivity = () => {
      startTimer();
    };

    // Removed 'click' and 'keypress' (keydown is sufficient) to prevent bubbling issues
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(evt => window.addEventListener(evt, handleUserActivity));

    // Initial start
    startTimer();

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearTimeout(idleTimer);
    };
  }, [anyOtherOverlayOpen]);

  // Re-lock CareMe whenever the screensaver appears in guest mode
  useEffect(() => {
    if (showTasbih) {
      guestModeStore.relockCareMe();
    }
  }, [showTasbih]);



  // Dismiss screen saver if any other overlay opens (e.g. call or broadcast)
  useEffect(() => {
    if (anyOtherOverlayOpen && showTasbih) {
      setShowTasbih(false);
    }
  }, [anyOtherOverlayOpen, showTasbih]);



  /* ── SIP Call State Integration ── */
  const { callState: sipCallState } = useSipCallState();
  useEffect(() => {
    if (!isAndroidApp()) return;
    if (sipCallState === 'IncomingReceived' && !showCall) {
      setShowCall(true);
    }
  }, [sipCallState, showCall]);

  useEffect(() => {
    // Pre-fetch IPTV channels so handset channel switching works 
    // immediately without the user having to open the TV page first
    if (isAndroidApp()) {
      iptv.fetchChannels();
    }
  }, []);

  /* ── CMS Integration ── */
  const cmsHospital = useCmsHospital();
  const visibilityCms = useCmsSectionVisibility(cmsHospital.data?.documentId);
  const v = visibilityCms.data ?? {
    show_iptv: true,
    show_care_plan: true,
    show_about_us: true,
    show_prayer_times: true,
    show_food_menu: true,
    show_resources: true,
    show_care_team: true,
  };

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULT_REMINDERS);

  
  /* ── Prayer Monitoring / Azan Alarm ── */
  const lastPrayerRef = useRef<Prayer>(Prayer.None);
  const azanAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadAzan = () => {
      const audio = new Audio("https://www.islamcan.com/audio/adhan/azan20.mp3");
      audio.preload = "auto";
      audio.onerror = (e) => console.error("Azan Audio Load Error:", e);
      azanAudioRef.current = audio;
    };
    loadAzan();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const status = getPrayerStatus(now, theme.location);
      
      // Check if a prayer has just started
      if (status.current !== Prayer.None && status.current !== lastPrayerRef.current) {
        // TRICK: Only trigger if the previous one wasn't None (prevents double trigger on load)
        // OR if it's the first time we detect any prayer (which always happens on load)
        if (lastPrayerRef.current !== Prayer.None) {
          handlePrayerTimeReached(status.current);
        }
        lastPrayerRef.current = status.current;
      } else if (lastPrayerRef.current === Prayer.None) {
        // Initial load
        lastPrayerRef.current = status.current;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [prayerAlarm]);

  const handlePrayerTimeReached = useCallback((pKey: Prayer) => {
    const prayerNameEn = t(PRAYER_NAMES[pKey], "en");
    const prayerNameAr = t(PRAYER_NAMES[pKey], "ar");

    // 1. Queue Broadcast (will show after tour if active)
    setBroadcastQueue(prev => [...prev, {
      id: "prayer-" + Date.now(),
      type: "prayer",
      title: {
        en: `${prayerNameEn} Prayer Time`,
        ar: `حان الآن موعد أذان ${prayerNameAr}`
      },
      body: {
        en: `Now it is time for the ${prayerNameEn} prayer.`,
        ar: `يرجى التوجه لأداء فريضة ${prayerNameAr} كما في الموعد المحدد.`
      },
      priority: "info",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    }]);

    // 2. Play Azan if alarm enabled
    if (prayerAlarm && azanAudioRef.current) {
      azanAudioRef.current.currentTime = 0;
      azanAudioRef.current.play().catch(e => console.error("Azan play failed:", e));
    }
  }, [prayerAlarm, t]);

  /* ── Reminder Push Notification Timer (runs persistently) ── */
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      setReminders((prev) => {
        let changed = false;
        const next = prev.map((r) => {
          if (!r.pushNotify || r.completed || r.notified) return r;

          const parsed = parseReminderTime(r.time);
          if (!parsed) return r;

          if (parsed.hour === currentHour && parsed.minute === currentMinute) {
            changed = true;

            const catEmoji =
              r.category === "medication" ? "💊" : r.category === "appointment" ? "🏥" : "📌";

            setBroadcastQueue(prev => [...prev, {
              id: "reminder-" + r.id + "-" + Date.now(),
              type: "general",
              title: {
                en: `${catEmoji} Reminder`,
                ar: `${catEmoji} تذكير`,
              },
              body: {
                en: r.title,
                ar: r.title,
              },
              priority: r.category === "medication" ? "warning" : "info",
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            }]);

            return { ...r, notified: true };
          }
          return r;
        });
        return changed ? next : prev;
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const handleBroadcastAcknowledge = useCallback((id: string) => {
    if (azanAudioRef.current) {
      azanAudioRef.current.pause();
      azanAudioRef.current.currentTime = 0;
    }

    setActiveBroadcast((prev) => {
      if (prev && prev.id === id) {
        const acknowledged = {
          ...prev,
          acknowledgedAt: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        };
        // Schedule outside state updater
        setTimeout(() => {
          setAcknowledgedBroadcasts((list) => [acknowledged, ...list]);
        }, 0);
      }
      return null;
    });
  }, []);

  const handleMaghribTap = useCallback(() => {
    setBroadcastQueue(prev => [...prev, {
      ...SAMPLE_BROADCAST,
      id: "broadcast-" + Date.now(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    }]);
  }, []);

  const handleNotificationClick = useCallback((notif: any) => {
    // 1. API Notifications
    if (notif.id.startsWith("api-")) {
      const alertId = parseInt(notif.id.replace("api-", ""));
      markAlertSeen(alertId);
      
      // Show as broadcast popup
      setBroadcastQueue(prev => [...prev, {
        id:       notif.id,
        type:     "announcement",
        priority: "info",
        title:    { 
          en: notif.titleText ?? "", 
          ar: notif.titleText ?? "" 
        },
        body:     { 
          en: notif.bodyText  ?? "", 
          ar: notif.bodyText  ?? "" 
        },
        icon:     "megaphone",
      }]);
      setShowNotifications(false);
      return;
    }

    // 2. Hardcoded Notifications
    // Map textKey to realistic broadcast content
    const contentMap: Record<string, { title: { en: string, ar: string }, body: { en: string, ar: string }, priority: "info" | "warning" | "urgent" }> = {
      "notif.mriReady": {
        title: { en: "MRI Study Complete", ar: "اكتملت دراسة الرنين المغناطيسي" },
        body: { 
          en: "Your Abdominal MRI study is now ready for review. Your attending physician has been notified and will discuss the results with you during the next ward round.",
          ar: "دراسة الرنين المغناطيسي للبطن جاهزة الآن للمراجعة. تم إبلاغ طبيبك المعالج وسيناقش النتائج معك خلال جولة القسم القادمة."
        },
        priority: "info"
      },
      "notif.labsReady": {
        title: { en: "Laboratory Results", ar: "نتائج المختبر" },
        body: { 
          en: "Your latest laboratory results are now available. You can review the detailed breakdown and clinical status in the 'Care Me' module under Lab Results.",
          ar: "أنتائج المختبر الأخيرة متاحة الآن. يمكنك مراجعة التفاصيل والحالة السريرية في قسم 'رعاية المريض' (Care Me) تحت نتائج المختبر."
        },
        priority: "info"
      },
      "notif.surveyRequest": {
        title: { en: "We Value Your Feedback", ar: "نحن نقدر رأيك" },
        body: { 
          en: "How are we doing? Please take a moment to share your experience with us through our quick patient survey. Your feedback helps us improve our care.",
          ar: "كيف كانت خدمتنا؟ يرجى تخصيص لحظة لمشاركة تجربتك معنا من خلال استبيان المريض السريع. ملاحظاتك تساعدنا على تحسين رعايتنا."
        },
        priority: "info"
      },
      "notif.hygieneScheduled": {
        title: { en: "Maintenance Alert", ar: "تنبيه الصيانة والنظافة" },
        body: { 
          en: "A routine hospital hygiene check is scheduled for your room shortly. This should take approximately 10 minutes. Thank you.",
          ar: "من المقرر إجراء فحص دوري لنظافة المستشفى في غرفتك قريباً. سيستغرق ذلك حوالي 10 دقائق. شكراً لكم."
        },
        priority: "warning"
      },
      "notif.doctorVisit": {
        title: { en: "Doctor Update", ar: "تحديث من الطبيب" },
        body: { 
          en: "Dr. Al-Ghamdi has reviewed your latest vitals and will visit your bedside during the afternoon rounds.",
          ar: "قام الدكتور الغامدي بمراجعة علاماتك الحيوية الأخيرة وسيقوم بزيارتك خلال جولات بعد الظهر."
        },
        priority: "info"
      }
    };

    const details = contentMap[notif.textKey] || {
      title: { en: "Hospital Notification", ar: "إشعار من المستشفى" },
      body: { en: "You have a new update from the medical staff.", ar: "لديك تحديث جديد من الطاقم الطبي." },
      priority: "info"
    };

    setBroadcastQueue(prev => [...prev, {
      id: "notif-popup-" + notif.id,
      title: details.title,
      body: details.body,
      priority: details.priority,
      timestamp: notif.time,
    }]);
    setShowNotifications(false); // Close panel to focus on broadcast
  }, []);

  const handleOpenCategory = (categoryKey: string) => {
    if (categoryKey === "About Us") {
      setShowAboutUs(true);
    } else if (categoryKey === "Call") {
      setShowCall(true);
    } else if (categoryKey === "Order Food") {
      setShowFoodOrder(true);
    } else if (categoryKey === "Housekeeping") {
      window.open("https://demo.hospitalopsai.com/patient/?mrd_id=3344&room=342", "_blank", "noopener,noreferrer");
    } else if (categoryKey === "Consultation") {
      window.open("https://intracare.icare.medoment.com/login?mrnEncrypted=1611605&deviceId=Rom1", "_blank", "noopener,noreferrer");
    } else {
      setOpenCategory(categoryKey);
    }
  };

  // Auto-show tour on first visit once patient is admitted
  useEffect(() => {
    if (patientAdmitted && !tourDismissed && !showTour) {
      // Small delay so the main UI renders first
      const timer = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, [patientAdmitted, tourDismissed]);

  const handleCloseTour = useCallback(() => {
    setShowTour(false);
    setTourDismissed(true);
    try {
      localStorage.setItem("hbs-tour-seen", "1");
    } catch { }
  }, []);

  const handleFullscreenTap = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }, []);

  // Allow the Android kiosk app (or any external caller) to open the 
  // Care Team interface directly, bypassing the PIN dialog.
  useEffect(() => {
    (window as any).__openCareTeam = (role: "nurse" | "doctor") => {
      if (role !== "nurse" && role !== "doctor") return;
      setActiveCareRole(role);
      setShowSettings(true);
    };
    return () => {
      delete (window as any).__openCareTeam;
    };
  }, []);

  useEffect(() => {
    // Open call page and focus the dialer input
    (window as any).__handsetOpenDialer = () => {
      setShowCall(true);
      // Signal CallScreen to focus the dialer
      // Give it 300ms to mount then fire the event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('handset-focus-dialer'));
      }, 300);
    };

    // Call the nurse/emergency extension immediately
    (window as any).__handsetNurseCall = () => {
      setShowCall(true);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('handset-nurse-call'));
      }, 300);
    };

    return () => {
      delete (window as any).__handsetOpenDialer;
      delete (window as any).__handsetNurseCall;
    };
  }, [setShowCall]);

  // ── Keyboard Navigation ──
  useEffect(() => {
    // anyOverlayOpen is now defined at the top level of BedsideScreen


    const handleKeyDown = (e: KeyboardEvent) => {
      // ── Block ALL handset actions when lock dialog is active ──
      if (lockActiveRef.current) {
        // Only allow digit keys for PIN entry (handled by lock screen)
        // Block everything else to prevent navigation/feature bypasses
        const isDigit = /^[0-9]$/.test(e.key) && !e.ctrlKey && !e.altKey;
        if (!isDigit) {
          if (e.key === "Escape") return; // Handled below for safety
          e.preventDefault();
        }
        if (e.key === "Escape") return;
      }

      // ── Handset key binding resolution ──────────────────────────────
      const binding = matchBinding(e);
      if (binding) {
        e.preventDefault();  // always prevent default for handset keys

        switch (binding.action) {
          case "ignore":
            return;

          case "dial_digit": {
            // If call page is open, send digit to dialer
            if (showCall) {
              window.dispatchEvent(new CustomEvent('handset-dial-digit', {
                detail: { digit: binding.digit ?? "" }
              }));
            } else {
              // If call page closed, open it then send digit
              setShowCall(true);
              const d = binding.digit ?? "";
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('handset-dial-digit', {
                  detail: { digit: d }
                }));
              }, 300);
            }
            return;
          }

          case "open_dialer": {
            if (showCall) {
              window.dispatchEvent(new CustomEvent('handset-dial-action'));
            } else {
              if (typeof (window as any).__handsetOpenDialer === "function") {
                (window as any).__handsetOpenDialer();
              }
            }
            return;
          }

          case "nurse_call": {
            if (typeof (window as any).__handsetNurseCall === "function") {
              (window as any).__handsetNurseCall();
            }
            return;
          }

          case "hangup": {
            if (showCall) {
              window.dispatchEvent(new CustomEvent('handset-hangup-action'));
            } else {
              sip.hangup();
            }
            return;
          }

          case "channel_next": {
            const before = _getIptvPlayingId();
            iptv.channelNext();
            // Show OSD for the new channel (next in list from before)
            const channels = _getIptvChannels();
            if (channels.length) {
              const idx = before === null ? 0 
                : (channels.findIndex(c => c.id === before) + 1) % channels.length;
              showChannelOsd(channels[idx]);
            }
            return;
          }

          case "channel_prev": {
            const before = _getIptvPlayingId();
            iptv.channelPrev();
            const channels = _getIptvChannels();
            if (channels.length) {
              const idx = before === null ? channels.length - 1
                : (channels.findIndex(c => c.id === before) - 1 + channels.length) % channels.length;
              showChannelOsd(channels[idx]);
            }
            return;
          }
        }
      }
      // ── END handset key binding resolution ───────────────────────────

      // Escape closes the topmost overlay
      if (e.key === "Escape") {
        // NEVER dismiss security dialogs with Escape
        if (lockActiveRef.current) return;

        if (activeTool) { setActiveTool(null); return; }
        if (activeGame) { setActiveGame(null); return; }
        if (activeBroadcast) { setActiveBroadcast(null); return; }
        if (showFoodOrder) { setShowFoodOrder(false); return; }
        if (showCall) { setShowCall(false); return; }
        if (showCareMeExpanded) { setShowCareMeExpanded(false); return; }
        if (showConfigurator) { setShowConfigurator(false); return; }
        if (showTasbih) { setShowTasbih(false); return; }
        if (showTour) { setShowTour(false); setTourDismissed(true); return; }
        if (showNotifications) { setShowNotifications(false); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (showAboutUs) { setShowAboutUs(false); return; }
        if (showSurvey) { setShowSurvey(false); return; }
        if (openCategory) { setOpenCategory(null); return; }
        return;
      }

      // Only handle arrows/enter when no overlay is open
      if (anyOverlayOpen) return;

      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      const isArrow = arrows.includes(e.key);
      const isEnter = e.key === "Enter" || e.key === " ";
      if (!isArrow && !isEnter) return;

      e.preventDefault();

      // Find all visible nav buttons
      const allBtns = Array.from(
        document.querySelectorAll<HTMLElement>('[data-nav="true"]')
      ).filter((el) => el.offsetParent !== null);

      if (allBtns.length === 0) return;

      const focused = document.activeElement as HTMLElement;
      const currentIdx = allBtns.indexOf(focused);

      // Enter/Space: click focused element
      if (isEnter) {
        if (currentIdx >= 0) allBtns[currentIdx].click();
        return;
      }

      // If nothing focused yet, focus first button
      if (currentIdx < 0) {
        allBtns[0].focus();
        return;
      }

      // Spatial navigation: find the closest button in the arrow direction
      const cur = allBtns[currentIdx].getBoundingClientRect();
      const cx = cur.left + cur.width / 2;
      const cy = cur.top + cur.height / 2;

      const dir = e.key;

      let best: HTMLElement | null = null;
      let bestDist = Infinity;

      for (let i = 0; i < allBtns.length; i++) {
        if (i === currentIdx) continue;
        const r = allBtns[i].getBoundingClientRect();
        const nx = r.left + r.width / 2;
        const ny = r.top + r.height / 2;
        const dx = nx - cx;
        const dy = ny - cy;

        // Filter by direction
        let valid = false;
        if (dir === "ArrowUp" && dy < -5) valid = true;
        if (dir === "ArrowDown" && dy > 5) valid = true;
        if (dir === "ArrowLeft" && dx < -5) valid = true;
        if (dir === "ArrowRight" && dx > 5) valid = true;
        if (!valid) continue;

        // Distance with bias toward staying on-axis
        let dist: number;
        if (dir === "ArrowUp" || dir === "ArrowDown") {
          dist = Math.abs(dy) + Math.abs(dx) * 2;
        } else {
          dist = Math.abs(dx) + Math.abs(dy) * 2;
        }

        if (dist < bestDist) {
          bestDist = dist;
          best = allBtns[i];
        }
      }

      if (best) best.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCategory, showSurvey, showAboutUs, showSettings,
      showNotifications, showTour, showTasbih, showConfigurator,
      showCareMeExpanded, showCall, showFoodOrder, activeBroadcast,
      activeGame, activeTool, showIptv, matchBinding]);

  return (
    <div
      className="w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div
        dir={dir}
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: theme.gradientCanvas,
          fontFamily: fontFamily,
        }}
        className={`flex flex-col overflow-hidden relative shrink-0 ${isTV ? "careinn-tv" : "careinn-kiosk"}`}
      >
        {/* Decorative hospital background photo — subtle texture */}
        <AutoCarousel
          images={[theme.heroImageUrl]}
          opacity={darkMode ? 0.03 : 0.08}
          objectPosition={theme.heroCropPosition}
          style={{ zIndex: 0 }}
        />
        {/* Decorative hospital symbol watermarks */}
        <img
          src={theme.id === "caremed" ? caremedicalicon : fakeehSymbol}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute"
          style={{
            width: "680px",
            height: "680px",
            right: "-120px",
            bottom: "-160px",
            opacity: darkMode ? 0.015 : 0.03,
            transform: "rotate(-15deg)",
            zIndex: 0,
          }}
        />
        <img
          src={theme.id === "caremed" ? caremedicalicon : fakeehSymbol}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute"
          style={{
            width: "420px",
            height: "420px",
            left: "-80px",
            top: "-60px",
            opacity: darkMode ? 0.012 : 0.025,
            transform: "rotate(160deg)",
            zIndex: 0,
          }}
        />

        {/* System Header */}
        <TopBar
          onFajrTap={() => setLayoutVersion((v) => (v === 3 ? 1 : 3))}
          onDhuhrTap={() => setShowConfigurator(true)}
          onAsrTap={undefined}
          onMaghribTap={() => handlePrayerTimeReached(Prayer.Maghrib)}
          onIshaTap={() => setShowTasbih(true)}
          onWeatherTap={() => setLayoutVersion((v) => (v === 1 ? 2 : 1))}
          onSettingsTap={() => setShowSettings(true)}
          onBellTap={() => setShowNotifications(true)}
          unreadCount={3 + apiNotifications.filter(a => !getSeenAlertIds().has(a.id)).length}
        />

        {/* News Ticker */}
        <NewsTicker />

        {/* Main Content — 32px gap below ticker */}
        <div className="flex-1 flex flex-row gap-[40px] px-8 pt-8 pb-6 min-h-0" style={{ position: "relative", zIndex: 1 }}>
          {patientAdmitted ? (
            layoutVersion === 3 ? (
              /* ─── V3 Layout: HubCards left, Greeting+CareMe center, Shortcuts right ─── */
              <div className="flex-1 flex flex-row gap-[40px] min-w-0 min-h-0">
                {/* Left — 2×4 Hub Grid */}
                <div className="flex flex-col shrink-0 min-h-0" style={{ width: "400px" }}>
                  <HubGridCompact 
                    onOpenCategory={handleOpenCategory} 
                    visibility={v} 
                    onRequestPinSetup={() => {
                      setOpenAccountDirectly(true);
                      setShowSettings(true);
                    }}
                  />
                </div>

                {/* Center — Greeting + CareMe side by side, Services below */}
                <div className="flex-1 flex flex-col gap-5 min-w-0 min-h-0">
                  {/* Top: Greeting + CareMe horizontally */}
                  <div className="flex-1 flex flex-row gap-5 min-h-0">
                    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                      <PatientGreeting 
                        onOpenAboutUs={() => setShowAboutUs(true)} 
                        onOpenTour={() => setShowTour(true)} 
                        fillImage 
                        showAboutUs={v.show_about_us}
                      />
                    </div>
                    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                      {(!isGuest || careMeUnlocked) ? (
                        <CareMe onExpand={() => setShowCareMeExpanded(true)} />
                      ) : (
                        <CareMeLockedPlaceholder onTap={() => setShowCareMePinDialog(true)} />
                      )}
                    </div>
                  </div>
                  {/* Bottom: Service cards row */}
                  <ServiceCardsRow 
                    onOpenCategory={handleOpenCategory} 
                    visibility={v} 
                    onRequestPinSetup={() => {
                      setOpenAccountDirectly(true);
                      setShowSettings(true);
                    }}
                  />
                </div>

                {/* Right — Shortcuts */}
                <div className="flex flex-col shrink-0 min-h-0" style={{ width: "280px" }}>
                  <ShortcutsColumn 
                    onOpenSurvey={() => setShowSurvey(true)} 
                    onLaunchTool={(id) => setActiveTool(id as any)} 
                    onRequestPinSetup={() => {
                      setOpenAccountDirectly(true);
                      setShowSettings(true);
                    }}
                  />
                </div>
              </div>
            ) : layoutVersion === 1 ? (
              <>
                {/* Left Column — PatientGreeting + CareMe */}
                <div className="flex flex-col gap-5 shrink-0 min-h-0 h-full" style={{ width: "400px" }}>
                  <PatientGreeting 
                    onOpenAboutUs={() => setShowAboutUs(true)} 
                    onOpenTour={() => setShowTour(true)} 
                    showAboutUs={v.show_about_us}
                  />
                  <div className="flex-1 min-h-0 flex flex-col">
                    {(!isGuest || careMeUnlocked) ? (
                      <CareMe onExpand={() => setShowCareMeExpanded(true)} />
                    ) : (
                      <CareMeLockedPlaceholder onTap={() => setShowCareMePinDialog(true)} />
                    )}
                  </div>
                </div>

                {/* Center + Right Column */}
                <div className="flex-1 flex flex-row gap-[40px] min-w-0 min-h-0">
                  {/* Center — Engagement Grid */}
                  <div className="flex-1 min-w-0 flex flex-col gap-5 min-h-0">
                    <ServicesGrid 
                      onOpenCategory={handleOpenCategory} 
                      onLaunchTool={(id) => setActiveTool(id as any)} 
                      visibility={v}
                      onRequestPinSetup={() => {
                        setOpenAccountDirectly(true);
                        setShowSettings(true);
                      }}
                      lockMenu={lockMenuApp}
                      onLockMenuChange={setLockMenuApp}
                    />
                  </div>

                  {/* Right — Shortcuts */}
                  <div className="flex flex-col shrink-0 min-h-0" style={{ width: "280px" }}>
                    <ShortcutsColumn 
                      onOpenSurvey={() => setShowSurvey(true)} 
                      onLaunchTool={(id) => setActiveTool(id as any)} 
                      onRequestPinSetup={() => {
                        setOpenAccountDirectly(true);
                        setShowSettings(true);
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* ─── V2 Layout: Shortcuts in container ─── */
              <>
                {/* Left Column — PatientGreeting + CareMe */}
                <div className="flex flex-col gap-5 shrink-0 min-h-0 h-full" style={{ width: "400px" }}>
                  <PatientGreeting onOpenAboutUs={() => setShowAboutUs(true)} onOpenTour={() => setShowTour(true)} />
                  <div className="flex-1 min-h-0 flex flex-col">
                    {(!isGuest || careMeUnlocked) ? (
                      <CareMe onExpand={() => setShowCareMeExpanded(true)} />
                    ) : (
                      <CareMeLockedPlaceholder onTap={() => setShowCareMePinDialog(true)} />
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-row gap-[40px] min-w-0 min-h-0">
                  {/* Center — Hub grid with shortcuts at bottom */}
                  <div className="flex-1 min-w-0 flex flex-col gap-5 min-h-0">
                    <ServicesGrid 
                      onOpenCategory={handleOpenCategory} 
                      swapped 
                      onLaunchTool={(id) => setActiveTool(id as any)} 
                      visibility={v}
                      onRequestPinSetup={() => {
                        setOpenAccountDirectly(true);
                        setShowSettings(true);
                      }}
                      lockMenu={lockMenuApp}
                      onLockMenuChange={setLockMenuApp}
                    />
                  </div>

                  {/* Right — Services stacked vertically */}
                  <div className="flex flex-col shrink-0 min-h-0" style={{ width: "280px" }}>
                    <ShortcutsColumn 
                      contained 
                      onOpenSurvey={() => setShowSurvey(true)} 
                      swapped 
                      onLaunchTool={(id) => setActiveTool(id as any)} 
                      onRequestPinSetup={() => {
                        setOpenAccountDirectly(true);
                        setShowSettings(true);
                      }}
                    />
                  </div>
                </div>
              </>
            )
          ) : (
            <>
              {/* Left Column — Awaiting */}
              <div className="flex flex-col gap-5 shrink-0 min-h-0" style={{ width: "400px" }}>
                <div
                  className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
                  style={{
                    backgroundColor: theme.background,
                    borderRadius: theme.radiusCard,
                    boxShadow: SHADOW.md,
                    border: theme.cardBorder,
                  }}
                >
                  <div className="relative z-10 text-center px-8">
                    <div
                      className="mx-auto mb-5 flex items-center justify-center rounded-2xl"
                      style={{ width: SPACE[8] + SPACE[1], height: SPACE[8] + SPACE[1], backgroundColor: theme.primarySubtle }}
                    >
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{
                          border: `2px solid ${theme.primarySubtle}`,
                          borderTopColor: theme.primary,
                          animation: "spin 2s linear infinite",
                        }}
                      />
                    </div>
                    <p style={{ fontFamily: fontFamily, color: theme.textHeading, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.semibold, lineHeight: 1.3 }}>
                      {t("idle.awaiting")}
                    </p>
                    <p className="mt-2" style={{ fontFamily: fontFamily, color: theme.textMuted, fontSize: TYPE_SCALE.base, lineHeight: 1.5 }}>
                      {t("idle.awaitingDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-5 min-h-0">
                <IdleScreen />
              </div>
            </>
          )}
        </div>

        {/* App Launcher Overlay */}
        {openCategory && (
          <AppLauncher
            categoryKey={openCategory}
            onClose={() => setOpenCategory(null)}
            onLaunchGame={(gameId) => {
              setActiveGame(gameId);
              setOpenCategory(null);
            }}
            onLaunchTool={(toolId) => {
              setActiveTool(toolId);
              setOpenCategory(null);
            }}
            onLaunchIptv={() => {
              setShowIptv(true);
              setOpenCategory(null);
            }}
            onRequestPinSetup={() => {
              setOpenAccountDirectly(true);
              setShowSettings(true);
            }}
            lockMenu={lockMenuApp}
            onLockMenuChange={setLockMenuApp}
          />
        )}

        {/* IPTV Channels Overlay */}
        {showIptv && (
          <IptvChannels onClose={() => setShowIptv(false)} />
        )}

        {/* About Us Modal — inside scaled container for consistent sizing */}

        {showAboutUs && (
          <AboutUs onClose={() => setShowAboutUs(false)} />
        )}

        {/* Settings Panel — slide-in from right */}
        {showSettings && (
          <SettingsPanel
            onClose={() => {
              setShowSettings(false);
              setActiveCareRole(null);
              setOpenAccountDirectly(false);
            }}
            onFullscreenTap={handleFullscreenTap}
            isFullscreen={isFullscreen}
            activeCareRole={activeCareRole}
            setActiveCareRole={setActiveCareRole}
            openAccountDirectly={openAccountDirectly}
          />
        )}

        {/* Notifications Panel — slide-in from right */}
        {showNotifications && (
          <NotificationsPanel 
            onClose={() => setShowNotifications(false)} 
            acknowledgedBroadcasts={acknowledgedBroadcasts} 
            onNotificationClick={handleNotificationClick}
            apiAlerts={apiNotifications}
            onClearAll={() => setAcknowledgedBroadcasts([])}
          />
        )}

        {/* Application Tour Modal */}
        {showTour && (
          <AppTour onClose={handleCloseTour} />
        )}

        {/* Hospital Configurator */}
        {showConfigurator && (
          <HospitalConfigurator onClose={() => setShowConfigurator(false)} />
        )}

        {/* CareMe Expanded Overlay */}
        {showCareMeExpanded && (!isGuest || careMeUnlocked) && (
          <CareMeExpanded onClose={() => setShowCareMeExpanded(false)} />
        )}

        {/* Call Screen Overlay */}
        {showCall && (
          <CallScreen onClose={() => setShowCall(false)} />
        )}

        {/* Food Ordering Overlay */}
        {showFoodOrder && (
          <FoodOrdering onClose={() => setShowFoodOrder(false)} />
        )}

        {/* Tasbih Screen Saver */}
        {showTasbih && (
          <TasbihScreenSaver onClose={() => {
            if (isAccountSet()) {
              setIsLocked(true);
            } else {
              setShowTasbih(false);
            }
          }} />
        )}

        {/* Hospital Broadcast Overlay */}
        {activeBroadcast && (
          <HospitalBroadcast
            notification={activeBroadcast}
            onAcknowledge={handleBroadcastAcknowledge}
          />
        )}

        {/* Games */}
        {activeGame === "memory" && <MemoryGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "tictactoe" && <TicTacToeGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "puzzle" && <SlidingPuzzleGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "colormatch" && <ColorMatchGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "patternmemory" && <PatternMemoryGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "emojimatch" && <EmojiMatchGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "simonsays" && <SimonSaysGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "wordsearch" && <WordSearchGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "reactiontime" && <ReactionTimeGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "brainmath" && <BrainMathGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "triviaquiz" && <TriviaQuizGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "picturepuzzle" && <ImageJigsawGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}
        {activeGame === "wordchain" && <WordChainGame onClose={() => setActiveGame(null)} onBackToGames={() => { setActiveGame(null); setOpenCategory("Games"); }} />}

        {/* IPTV Channels Overlay */}
        {showIptv && (
          <IptvChannels onClose={() => setShowIptv(false)} />
        )}

        {/* Tools */}
        {activeTool === "calculator" && <CalculatorTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} />}
        {activeTool === "notes" && <NotesTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} />}
        {activeTool === "reminders" && <RemindersTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} reminders={reminders} setReminders={setReminders} />}

        {activeTool === "stopwatch" && <StopwatchTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} />}
        {activeTool === "unitconverter" && <UnitConverterTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} />}
        {activeTool === "breathing" && <BreathingTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} />}
        {activeTool === "whiteboard" && <WhiteboardTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} />}
        {activeTool === "mirror" && <MirrorTool onClose={() => setActiveTool(null)} onBackToTools={() => { setActiveTool(null); setOpenCategory("Tools"); }} />}
        {activeTool === "roomcontrol" && <RoomControl onClose={() => setActiveTool(null)} />}


        {/* Blank Page Overlay */}
        {showBlankPage && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center cursor-none"
            style={{ backgroundColor: "#000000" }}
            onClick={() => setShowBlankPage(false)}
          >
            <div className="text-white/20 font-medium text-lg animate-pulse">
              {t("idle.tapToExit")}
            </div>
          </div>
        )}
      </div>



      {/* Survey Modal */}
      {showSurvey && (
        <SurveyModal onClose={() => setShowSurvey(false)} />
      )}

      <OfflineBanner visible={!isOnline} />

      <AccountLockScreen
        visible={isLocked}
        onUnlock={() => {
          guestModeStore.exitGuestMode();
          setIsLocked(false);
          setShowTasbih(false);
        }}
        onSkipAsGuest={() => {
          setIsLocked(false);
          setShowTasbih(false);
        }}
        onClose={() => setIsLocked(false)}
      />

      {showCareMePinDialog && (
        <CareMePinDialog
          onClose={() => setShowCareMePinDialog(false)}
          onSuccess={() => {
            guestModeStore.unlockCareMe();
            setShowCareMePinDialog(false);
          }}
          onNfcSuccess={() => {
            guestModeStore.exitGuestMode();
            setShowCareMePinDialog(false);
          }}
        />
      )}

        {/* IPTV Channel OSD Overlay */}
        {iptvOsd && (
          <div
            style={{
              position: "fixed",
              bottom: "48px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 8888,
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "14px 24px",
              borderRadius: "16px",
              backgroundColor: "rgba(0,0,0,0.82)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              animation: "iptvOsdIn 0.2s ease-out",
              minWidth: "320px",
              maxWidth: "480px",
            }}
          >
            {/* Channel logo */}
            {iptvOsd.logo && (
              <img
                src={iptvOsd.logo}
                alt=""
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "8px",
                  objectFit: "contain",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  flexShrink: 0,
                }}
              />
            )}

            {/* Channel info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: "#fff",
                fontSize: "17px",
                fontWeight: 700,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: fontFamily,
              }}>
                {locale === "ar" ? iptvOsd.nameAr : iptvOsd.name}
              </p>
              <p style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "13px",
                fontWeight: 500,
                margin: 0,
                fontFamily: fontFamily,
              }}>
                {iptvOsd.index} / {iptvOsd.total}
              </p>
            </div>

            {/* Channel number badge */}
            <div style={{
              backgroundColor: theme.primary,
              borderRadius: "8px",
              padding: "4px 12px",
              flexShrink: 0,
            }}>
              <span style={{
                color: "#fff",
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: theme.fontFamilyMono,
              }}>
                {iptvOsd.index}
              </span>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes iptvOsdIn {
            from { opacity: 0; transform: translateX(-50%) translateY(8px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          @keyframes castPulse {
            0%, 100% { box-shadow: 0 0 0 0 var(--hbs-primary-subtle); }
            50% { box-shadow: 0 0 0 6px transparent; }
          }
          [data-nav="true"]:focus {
            outline: 5px solid #008BAE !important;
            outline-offset: 4px !important;
            box-shadow: 0 0 20px rgba(0, 139, 174, 0.6) !important;
            transform: scale(1.02) !important;
            z-index: 50 !important;
            border-color: transparent !important;
          }
          * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
          }
        `}</style>
      <RippleStyles />
    </div>
  );
}

function CareMeLockedPlaceholder({ onTap }: { onTap: () => void }) {
  const { theme } = useTheme();
  const { t, fontFamily } = useLocale();
  return (
    <button
      onClick={onTap}
      className="flex flex-col items-center justify-center gap-3 
                 w-full h-full cursor-pointer active:scale-[0.99] 
                 transition-transform"
      style={{
        backgroundColor: theme.surface,
        borderRadius: theme.radiusCard,
        boxShadow: SHADOW.md,
        border: theme.cardBorder,
        padding: "24px",
        minHeight: "100%",
        outline: "none",
      }}
    >
      <div 
        className="flex items-center justify-center"
        style={{
          width: "56px", height: "56px",
          borderRadius: theme.radiusLg,
          backgroundColor: theme.primarySubtle,
        }}
      >
        <Lock size={26} style={{ color: theme.primary }} />
      </div>
      <span style={{
        fontFamily, fontSize: "16px", fontWeight: 700,
        color: theme.textHeading, textAlign: "center",
      }}>
        {t("guest.careMe.locked.title")}
      </span>
      <span style={{
        fontFamily, fontSize: "13px", fontWeight: 500,
        color: theme.textMuted, textAlign: "center",
        maxWidth: "240px", lineHeight: "18px",
      }}>
        {t("guest.careMe.locked.subtitle")}
      </span>
      <div style={{
        marginTop: "4px",
        padding: "10px 24px",
        borderRadius: theme.radiusFull,
        backgroundColor: theme.primary,
        color: "#fff",
        fontFamily, fontSize: "13px", fontWeight: 700,
      }}>
        {t("guest.careMe.unlock.button")}
      </div>
    </button>
  );
}


import { Component, ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-10 text-center font-sans">
          <h1 className="text-4xl font-black mb-4">System Recovered</h1>
          <p className="text-slate-400 mb-8 max-w-md">An unexpected interface error occurred. The system has automatically rebooted to a stable state.</p>
          <div className="bg-slate-800 p-4 rounded-lg text-left text-xs font-mono text-red-400 mb-8 select-all max-w-xl overflow-auto max-h-[300px]">
             {this.state.error?.stack}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-500 transition-colors"
          >
            Refresh Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthenticatedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <PasswordGate />;
  }

  return (
    <ThemeProvider>
      <OrderProvider>
        <ErrorBoundary>
          <BedsideScreen />
        </ErrorBoundary>
      </OrderProvider>
    </ThemeProvider>
  );
}

function GlobalNfcListener() {
  const { login } = useAuth();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = (event: any) => {
      const uid = event.detail as string;

      // Check patient card
      const cards = getAuthorizedCards();
      if (cards[uid]) {
        login(cards[uid].password);
      }

      // Check nurse card
      if (uid === getNurseCardUid()) {
        (window as any).__openCareTeam?.("nurse");
      }
    };
    window.addEventListener("nfc-card-tap", handler);
    return () => window.removeEventListener("nfc-card-tap", handler);
  }, [login]);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener("nfc-cards-updated", handler);
    return () => window.removeEventListener("nfc-cards-updated", handler);
  }, []);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalNfcListener />
      <AuthenticatedApp />
    </AuthProvider>
  );
}
