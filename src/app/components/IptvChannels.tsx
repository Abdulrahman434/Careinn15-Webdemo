import { useState, useEffect, useMemo, useRef, useCallback, type CSSProperties } from "react";
import { InternalPageHeader } from "./InternalPageHeader";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, SPACE, TEXT_STYLE, LEADING } from "./ThemeContext";
import { useLocale } from "./i18n";
import {
  Tv, ArrowLeft, ArrowRight, RefreshCw, Square, Search, X, Heart, LayoutGrid,
  Newspaper, Trophy, Baby, BookOpen, Clapperboard, Compass, Music, Globe,
  SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, Layers,
} from "lucide-react";
import { useIptvChannels, iptv, isAndroidApp, useAndroidEvent, IptvChannel, _setIptvPlayingId } from "../utils/androidBridge";
import { ApiImage } from "./ApiImage";
import { PREVIEW_CHANNELS } from "../data/tvChannels";

/* The patient's favourites, as channel ids (strings). */
const FAVOURITES_KEY = "careinn-iptv-favourites";
/* Favourites are parked for now: off hides the heart on each card and the
   Favourites entry in the rail. Flip back on to bring them back as built. */
const SHOW_FAVOURITES = false;

/* Known genres, in rail order. Anything else a server sends follows them,
   alphabetically, under its own name. */
const KNOWN_CATEGORIES = ["general", "news", "sports", "kids", "religious", "movies", "documentary", "music", "international"];
const CATEGORY_ICON: Record<string, typeof Tv> = {
  general: Tv, news: Newspaper, sports: Trophy, kids: Baby, religious: BookOpen,
  movies: Clapperboard, documentary: Compass, music: Music, international: Globe,
};

type Section = "favourites" | "all" | `cat:${string}`;

function readIds(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
}

/* ── Logo normalising ──────────────────────────────────────────────────
   Channel logos arrive with any amount of white or transparent margin and
   in any shape, so the same box made them look big, small, very big. Each
   logo is trimmed to its ink once (cached per URL), then sized by optical
   area: a wide wordmark gets more width, a square mark less, and all read
   the same weight. An image the canvas can't read (cross-origin) still
   gets the area sizing, untrimmed. */
type LogoFit = { url: string; aspect: number };
const logoFits = new Map<string, LogoFit>();
const TRIM_SAMPLE = 256;   // analyse at this size — fast, precise enough
const TRIM_MAX_OUT = 480;  // keep the trimmed copy small; tiles are ~240px
const LOGO_AREA = 100 * 100; // optical area in the 240 × 130 tile box
const LOGO_BOX_W = 240, LOGO_BOX_H = 130;

function fitLogo(img: HTMLImageElement): LogoFit {
  const w = img.naturalWidth, h = img.naturalHeight;
  const whole = { url: img.currentSrc || img.src, aspect: w / h || 1 };
  try {
    const k = Math.min(1, TRIM_SAMPLE / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
    const probe = document.createElement("canvas");
    probe.width = sw; probe.height = sh;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    if (!pctx) return whole;
    pctx.drawImage(img, 0, 0, sw, sh);
    const d = pctx.getImageData(0, 0, sw, sh).data;
    let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        // Background = see-through, or near-white (JPEG boxes carry noise).
        const bg = d[i + 3] < 16 || (d[i] > 228 && d[i + 1] > 228 && d[i + 2] > 228);
        if (bg) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return whole;
    const nx0 = Math.max(0, Math.floor(x0 / k) - 1), ny0 = Math.max(0, Math.floor(y0 / k) - 1);
    const nx1 = Math.min(w, Math.ceil((x1 + 1) / k) + 1), ny1 = Math.min(h, Math.ceil((y1 + 1) / k) + 1);
    const cw = nx1 - nx0, ch = ny1 - ny0;
    const o = Math.min(1, TRIM_MAX_OUT / Math.max(cw, ch));
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(cw * o)); out.height = Math.max(1, Math.round(ch * o));
    out.getContext("2d")?.drawImage(img, nx0, ny0, cw, ch, 0, 0, out.width, out.height);
    return { url: out.toDataURL("image/png"), aspect: cw / ch };
  } catch {
    return whole;
  }
}

/* Width of the logo as a share of the tile, for equal optical area,
   capped so no logo runs to the tile's edge. */
function logoWidthPct(aspect: number) {
  let w = Math.sqrt(LOGO_AREA * aspect), h = w / aspect;
  const s = Math.min(1, (LOGO_BOX_W * 0.86) / w, (LOGO_BOX_H * 0.8) / h);
  w *= s; h *= s;
  return (w / LOGO_BOX_W) * 100;
}

/* A channel's logo, or its name set as a wordmark when the server (or the
   preview line-up) has no logo for it — always on the white tile. */
function ChannelLogo({ channel, size }: { channel: IptvChannel; size: "card" | "player" }) {
  const { theme } = useTheme();
  const { fontFamily, locale } = useLocale();
  const [fit, setFit] = useState<LogoFit | undefined>(() => channel.logo ? logoFits.get(channel.logo) : undefined);
  useEffect(() => {
    setFit(channel.logo ? logoFits.get(channel.logo) : undefined);
  }, [channel.logo]);
  const name = locale === "ar" ? (channel.nameAr || channel.name) : channel.name;
  const wordmark = (
    <span
      className="text-center"
      style={{
        fontFamily,
        fontSize: size === "player" ? TYPE_SCALE["2xl"] : name.length > 14 ? TYPE_SCALE.base : TYPE_SCALE.md,
        fontWeight: WEIGHT.extrabold,
        lineHeight: LEADING.tight,
        color: theme.primary,
        padding: "0 8px",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {name}
    </span>
  );
  if (!channel.logo) return wordmark;
  const logoKey = channel.logo;
  if (fit) {
    return (
      <img
        src={fit.url}
        alt={channel.name}
        draggable={false}
        style={{ width: `${logoWidthPct(fit.aspect)}%`, aspectRatio: String(fit.aspect), objectFit: "contain" }}
      />
    );
  }
  // First sight of this logo: load it unseen, measure, then show it fitted.
  return (
    <ApiImage
      src={channel.logo}
      alt={channel.name}
      loading={size === "player" ? "eager" : "lazy"}
      draggable={false}
      className="w-full h-full object-contain"
      style={{ opacity: 0 }}
      onLoad={e => {
        const f = fitLogo(e.currentTarget);
        logoFits.set(logoKey, f);
        setFit(f);
      }}
      fallback={wordmark}
    />
  );
}

/**
 * Full-screen stand-in for the native player, opened where nothing can
 * play (browser, preview) so a demo still shows what tapping a channel does.
 * The kiosk uses its own native overlay instead.
 */
function ChannelPlayerSimulation({
  channel, number, total, category, onClose, onNext, onPrev, onStop,
}: {
  channel: IptvChannel;
  number: string;
  total: number;
  category: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
}) {
  const { t, locale, isRTL, fontFamily } = useLocale();
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const name = locale === "ar" ? (channel.nameAr || channel.name) : channel.name;
  const otherName = locale === "ar" ? channel.name : channel.nameAr;

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 4500);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [channel.id, resetHideTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      resetHideTimer();
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "PageDown") (isRTL ? onPrev : onNext)();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") (isRTL ? onNext : onPrev)();
      else if (e.key === "m" || e.key === "M") setIsMuted(m => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev, isRTL, resetHideTimer]);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch {}
  };

  const glass: CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.15)",
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      onPointerMove={resetHideTimer}
      onClick={resetHideTimer}
      className="absolute inset-0 z-[60] flex flex-col justify-between overflow-hidden select-none"
      style={{
        background: "radial-gradient(circle at 50% 45%, #1e293b 0%, #0b1120 70%, #020617 100%)",
        animation: "simFadeIn 0.25s ease-out",
        fontFamily,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }}
      />

      {/* Top bar */}
      <div className={`relative z-20 flex items-center justify-between px-10 pt-8 pb-4 transition-opacity duration-300 ${showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <button
          onClick={onClose}
          type="button"
          className="flex items-center gap-3 px-5 py-3 cursor-pointer active:scale-95 transition-all text-white rounded-xl backdrop-blur-md"
          style={glass}
        >
          {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          <span className="text-base font-semibold">{t("tv.guide")}</span>
        </button>

        <div className="flex items-center gap-3 px-6 py-2.5 rounded-full backdrop-blur-md bg-black/50 border border-white/15">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 shadow-[0_0_10px_rgba(239,68,68,1)]" />
          </span>
          <span className="text-xs font-black tracking-widest text-red-400 uppercase">{t("tv.live")}</span>
          <span className="text-white/40">|</span>
          <span className="text-sm font-bold text-white tabular-nums tracking-wide">CH {number}</span>
          <span className="text-white/40">•</span>
          <span className="text-sm font-semibold text-white/90">{name}</span>
        </div>

        <button
          onClick={onStop}
          type="button"
          className="flex items-center gap-2 px-6 py-3 cursor-pointer active:scale-95 transition-all text-white rounded-xl shadow-lg bg-red-500"
        >
          <Square size={18} color="#fff" fill="#fff" />
          <span className="text-base font-semibold">{t("tv.stop")}</span>
        </button>
      </div>

      {/* Simulated broadcast */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center max-w-xl text-center">
          <div
            className="w-72 aspect-video rounded-2xl p-4 mb-6 flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: "#fff",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.2)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <ChannelLogo channel={channel} size="player" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">{name}</h2>
          {otherName && otherName !== name && (
            <p className="text-lg text-white/60 font-medium mb-6">{otherName}</p>
          )}
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 mb-3">
            <div className="flex items-end gap-1 h-4">
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4" style={{ animationDelay: "150ms" }} />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" style={{ animationDelay: "300ms" }} />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4" style={{ animationDelay: "450ms" }} />
            </div>
            <span className="text-sm font-semibold text-emerald-400">{t("tv.simActive")}</span>
          </div>
          <div className="text-xs text-white/40 tracking-wider uppercase font-semibold flex items-center gap-2" dir="ltr">
            <span>1080p FHD</span><span>•</span><span>60 FPS</span><span>•</span><span>Dolby Digital Stereo</span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className={`relative z-20 px-10 pb-8 pt-4 transition-opacity duration-300 ${showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div
          className="max-w-4xl mx-auto flex items-center justify-between px-8 py-4 rounded-2xl backdrop-blur-xl shadow-2xl"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.15)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl font-black text-white tabular-nums px-3 py-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              {number}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-white leading-tight truncate">{name}</span>
              <span className="text-xs text-white/50 font-medium">{category} • {Number(number)} / {total}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onPrev} type="button" aria-label={t("tv.prevChannel")} className="w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer active:scale-95 transition-all text-white" style={glass}>
              {isRTL ? <SkipForward size={22} /> : <SkipBack size={22} />}
            </button>
            <button onClick={onStop} type="button" aria-label={t("tv.stop")} className="w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer active:scale-95 transition-all text-white bg-red-600 shadow-md">
              <Square size={20} fill="#fff" />
            </button>
            <button onClick={onNext} type="button" aria-label={t("tv.nextChannel")} className="w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer active:scale-95 transition-all text-white" style={glass}>
              {isRTL ? <SkipBack size={22} /> : <SkipForward size={22} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsMuted(m => !m)} type="button" aria-label={isMuted ? t("tv.unmute") : t("tv.mute")} className="w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer active:scale-95 transition-all text-white" style={glass}>
              {isMuted ? <VolumeX size={20} color="#ef4444" /> : <Volume2 size={20} />}
            </button>
            <button onClick={toggleFullscreen} type="button" className="w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer active:scale-95 transition-all text-white" style={glass}>
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} type="button" className="px-4 h-11 flex items-center gap-2 rounded-xl cursor-pointer active:scale-95 transition-all text-white font-semibold text-sm" style={glass}>
              <Layers size={18} />
              <span>{t("tv.channelList")}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes simFadeIn {
          from { opacity: 0; transform: scale(0.99); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export function IptvChannels({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, fontFamily, locale, isRTL } = useLocale();
  const { channels, loading, error, reload } = useIptvChannels();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [favourites, setFavourites] = useState<string[]>(() => readIds(FAVOURITES_KEY));
  const [section, setSection] = useState<Section>("all");
  const [query, setQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const isAndroid = isAndroidApp();
  const connected = channels.length > 0 && !error;
  const preview = !loading && !connected;
  const shown = preview ? PREVIEW_CHANNELS : channels;

  // Sync playingId with native events. The playChannelList path emits
  // `index` + `total`; the legacy playIptv path emits only `url` + `channel`.
  useAndroidEvent<{ url: string; channel: string; index?: number; total?: number }>(
    'iptv-playing',
    (d) => {
      let id: number | null = null;
      if (typeof d.index === 'number' && channels[d.index]) {
        id = channels[d.index].id;
      } else {
        const ch = channels.find(c => c.url === d.url);
        id = ch?.id ?? null;
      }
      setPlayingId(id);
      _setIptvPlayingId(id);
    }
  );

  useAndroidEvent('iptv-stopped', () => {
    setPlayingId(null);
    _setIptvPlayingId(null);
  });

  const [simChannel, setSimChannel] = useState<IptvChannel | null>(null);

  const simulate = (channel: IptvChannel) => {
    setSimChannel(channel);
    setPlayingId(channel.id);
  };

  const stopAll = () => {
    if (!isAndroid || preview) {
      setSimChannel(null);
      setPlayingId(null);
    } else {
      iptv.stop();
    }
  };

  // Channel up/down in the simulated player walks the whole line-up.
  const stepSim = (delta: number) => {
    if (!simChannel) return;
    const i = shown.findIndex(c => c.id === simChannel.id);
    simulate(shown[(i + delta + shown.length) % shown.length]);
  };

  /* Touch feedback: the card the finger is on, and the one just tapped —
     held for a beat before the player covers the screen so the press is seen. */
  const [pressedId, setPressedId] = useState<number | null>(null);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  /* A finger that lands to scroll must not light a card up. Like Android's
     own lists: show the press only after the finger has rested 100 ms
     without moving, and drop it once it moves past the touch slop. A quick
     tap still gets the pressed look through launchingId. */
  const touch = useRef<{ id: number; x: number; y: number; moved: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const PRESS_DELAY = 100, TOUCH_SLOP = 10;
  const pressStart = (e: React.PointerEvent, id: number) => {
    if (touch.current?.timer) clearTimeout(touch.current.timer);
    touch.current = {
      id, x: e.clientX, y: e.clientY, moved: false,
      timer: setTimeout(() => setPressedId(id), PRESS_DELAY),
    };
  };
  const pressMove = (e: React.PointerEvent) => {
    const t = touch.current;
    if (!t || t.moved) return;
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > TOUCH_SLOP) {
      t.moved = true;
      if (t.timer) clearTimeout(t.timer);
      setPressedId(null);
    }
  };
  const pressEnd = () => {
    if (touch.current?.timer) clearTimeout(touch.current.timer);
    setPressedId(null);
  };
  const tapChannel = (channel: IptvChannel) => {
    if (launchingId !== null || touch.current?.moved) return;
    setLaunchingId(channel.id);
    setTimeout(() => {
      setLaunchingId(null);
      handlePlay(channel);
    }, 160);
  };

  const handlePlay = (channel: IptvChannel) => {
    // Nothing can play here, so show the simulated player instead.
    if (!isAndroid || preview) {
      simulate(channel);
      return;
    }
    if (playingId === channel.id) {
      iptv.stop();
      return;
    }
    // The whole list, not the filtered one, so channel up/down on the
    // player still walks every channel.
    const startIndex = channels.findIndex(c => c.id === channel.id);
    if (startIndex >= 0) iptv.playList(channels, startIndex);
  };

  const toggleFavourite = (id: number) => {
    setFavourites(prev => {
      const key = String(id);
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      writeIds(FAVOURITES_KEY, next);
      return next;
    });
  };

  // A channel keeps its number whatever list it shows in — the number is
  // what a patient remembers and searches by.
  const numberOf = useMemo(() => {
    const digits = Math.max(2, String(shown.length).length);
    const map = new Map<number, string>();
    shown.forEach((c, i) => map.set(c.id, String(i + 1).padStart(digits, "0")));
    return map;
  }, [shown]);

  const categories = useMemo(() => {
    const present = Array.from(new Set(shown.map(c => c.category).filter((c): c is string => !!c)));
    const known = KNOWN_CATEGORIES.filter(c => present.includes(c));
    const other = present.filter(c => !KNOWN_CATEGORIES.includes(c)).sort();
    return [...known, ...other];
  }, [shown]);

  const categoryLabel = (c: string) =>
    KNOWN_CATEGORIES.includes(c) ? t(`tv.cat.${c}`) : c.charAt(0).toUpperCase() + c.slice(1);

  const byId = useMemo(() => new Map(shown.map(c => [String(c.id), c])), [shown]);
  const favouriteChannels = favourites.map(k => byId.get(k)).filter((c): c is IptvChannel => !!c);

  const listFor = (s: Section): IptvChannel[] => {
    if (s === "favourites") return favouriteChannels;
    if (s === "all") return shown;
    const cat = s.slice(4);
    return shown.filter(c => c.category === cat);
  };

  const trimmed = query.trim().toLowerCase();
  // Search looks across every channel, whichever section is open.
  const visible = trimmed
    ? shown.filter(c =>
        c.name.toLowerCase().includes(trimmed) ||
        (c.nameAr ?? "").includes(query.trim()) ||
        (numberOf.get(c.id) ?? "").replace(/^0+/, "").startsWith(trimmed.replace(/^0+/, "")))
    : listFor(section);

  const selectSection = (s: Section) => {
    setSection(s);
    setQuery("");
    gridRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const heading = trimmed
    ? t("tv.results")
    : section === "favourites" ? t("tv.cat.favourites")
    : section === "all" ? t("tv.cat.all")
    : categoryLabel(section.slice(4));

  const emptyText = trimmed
    ? t("tv.empty.search")
    : section === "favourites" ? t("tv.empty.favourites")
    : t("tv.noChannels");

  const railItems: { key: Section; Icon: typeof Tv; label: string; count: number }[] = [
    ...(SHOW_FAVOURITES
      ? [{ key: "favourites" as Section, Icon: Heart, label: t("tv.cat.favourites"), count: favouriteChannels.length }]
      : []),
    { key: "all", Icon: LayoutGrid, label: t("tv.cat.all"), count: shown.length },
    ...categories.map(c => ({
      key: `cat:${c}` as Section,
      Icon: CATEGORY_ICON[c] ?? Tv,
      label: categoryLabel(c),
      count: shown.filter(ch => ch.category === c).length,
    })),
  ];

  // Same size as the language / dark mode / fullscreen buttons beside them.
  const glassButton: CSSProperties = {
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.15)",
    outline: "none",
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: theme.pageGradientFlat,
        fontFamily,
        animation: "appLauncherIn 0.2s ease-out",
        ["--tv-primary" as any]: theme.primary,
      } as CSSProperties}
    >
      <ApiImage
        src={theme.heroImageUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ opacity: 0.08, mixBlendMode: "luminosity", userSelect: "none" }}
      />

      <style>{`
        .tv-card { transition: transform .12s ease; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .tv-search::placeholder { color: ${theme.textDisabled}; }
        .tv-search-box:focus-within { border-color: var(--tv-primary) !important; }
        .tv-scroll::-webkit-scrollbar { width: 10px; }
        .tv-scroll::-webkit-scrollbar-track { background: transparent; }
        .tv-scroll::-webkit-scrollbar-thumb { background: ${theme.borderDefault}; border-radius: 100px; border: 3px solid transparent; background-clip: content-box; }
        @keyframes tvLivePulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
        @keyframes appLauncherIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <InternalPageHeader
        title={`${t("hub.media")} - ${t("tv.liveTv")}`}
        subtitle={preview ? t("tv.preview") : loading ? t("tv.loading") : t("tv.channelCount", shown.length)}
        icon={<Tv size={24} strokeWidth={2} />}
        onClose={onClose}
        leadingIcon={isRTL
          ? <ArrowRight size={22} style={{ color: "#fff" }} />
          : <ArrowLeft size={22} style={{ color: "#fff" }} />}
        rightAction={
          <>
            {playingId !== null && (
              <button
                onClick={stopAll}
                className="flex items-center gap-2 px-6 cursor-pointer active:scale-95 transition-transform"
                style={{ ...glassButton, backgroundColor: theme.error, border: "none" }}
              >
                <Square size={20} color={theme.textInverse} fill={theme.textInverse} />
                <span style={{ ...TEXT_STYLE.buttonSm, fontFamily, color: theme.textInverse }}>
                  {t("tv.stop")}
                </span>
              </button>
            )}
            <button
              onClick={reload}
              disabled={loading}
              aria-label={t("conn.refresh")}
              className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
              style={{ ...glassButton, width: "44px" }}
            >
              <RefreshCw size={20} style={{ color: "#fff" }} className={loading ? "animate-spin" : ""} />
            </button>
          </>
        }
      />

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
          {/* Category rail — the patient's own lists first, then genres. */}
          <nav
            className="tv-scroll shrink-0 flex flex-col gap-2 py-7 px-5 overflow-y-auto"
            style={{
              width: 320,
              backgroundColor: theme.surfaceInset,
              borderInlineEnd: `1px solid ${theme.borderSubtle}`,
            }}
          >
            {railItems.map((item, i) => {
              const active = !trimmed && section === item.key;
              const RIcon = item.Icon;
              const startsGenres = item.key === "all" && i > 0;
              return (
                <div key={item.key}>
                  {startsGenres && (
                    <div style={{ height: 1, backgroundColor: theme.borderSubtle, margin: `${SPACE[1]} 14px` }} />
                  )}
                  <button
                    onClick={() => selectSection(item.key)}
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
                      <RIcon
                        size={20}
                        color={active ? theme.textInverse : theme.primaryOn}
                        fill={item.key === "favourites" && item.count > 0 ? (active ? theme.textInverse : theme.primaryOn) : "none"}
                        strokeWidth={2.2}
                      />
                    </span>
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{
                        ...TEXT_STYLE.buttonSm,
                        fontFamily,
                        color: active ? theme.textInverse : theme.textHeading,
                        lineHeight: 1.25,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.count > 0 && (
                      <span
                        className="tabular-nums"
                        style={{
                          minWidth: 30,
                          height: 26,
                          padding: "0 8px",
                          borderRadius: theme.radiusFull,
                          backgroundColor: active ? "rgba(255,255,255,0.22)" : theme.primarySubtle,
                          color: active ? theme.textInverse : theme.primaryOn,
                          fontFamily,
                          fontSize: TYPE_SCALE.sm,
                          fontWeight: WEIGHT.bold,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Body */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <div className="shrink-0 flex items-center gap-6 px-8 pt-7 pb-5">
              <div className="flex-1 min-w-0">
                <h3 className="truncate" style={{ ...TEXT_STYLE.pageTitle, fontFamily, color: theme.textHeading }}>
                  {heading}
                </h3>
                <p style={{ ...TEXT_STYLE.body, fontFamily, color: theme.textMuted, marginTop: 2 }}>
                  {t("tv.channelCount", visible.length)}
                </p>
              </div>

              <label
                className="tv-search-box shrink-0 flex items-center gap-3"
                style={{
                  width: 440,
                  height: 56,
                  paddingInlineStart: 18,
                  paddingInlineEnd: 8,
                  borderRadius: theme.radiusMd,
                  backgroundColor: theme.surfaceInset,
                  border: `1.5px solid ${theme.borderSubtle}`,
                }}
              >
                <Search size={22} color={theme.textMuted} strokeWidth={2.2} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t("tv.search")}
                  className="tv-search flex-1 min-w-0 bg-transparent outline-none"
                  style={{ ...TEXT_STYLE.body, fontFamily, color: theme.textHeading, border: "none" }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("tv.clearSearch")}
                    className="shrink-0 flex items-center justify-center cursor-pointer active:scale-95"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.radiusSm,
                      backgroundColor: theme.surface,
                      border: "none",
                      outline: "none",
                    }}
                  >
                    <X size={20} color={theme.textMuted} />
                  </button>
                )}
              </label>
            </div>

            <div ref={gridRef} className="tv-scroll flex-1 min-h-0 overflow-y-auto px-8 pb-8" style={{ overscrollBehavior: "contain" }}>
              {loading && channels.length === 0 ? (
                <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse"
                      style={{ height: 172, backgroundColor: theme.surfaceInset, borderRadius: theme.radiusLg }}
                    />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4" style={{ minHeight: 320 }}>
                  <span
                    className="flex items-center justify-center"
                    style={{ width: 88, height: 88, borderRadius: theme.radiusFull, backgroundColor: theme.primarySubtle }}
                  >
                    {section === "favourites" && !trimmed
                      ? <Heart size={40} color={theme.primaryOn} strokeWidth={1.8} />
                      : <Tv size={40} color={theme.primaryOn} strokeWidth={1.8} />}
                  </span>
                  <p style={{ ...TEXT_STYLE.subtitle, fontFamily, color: theme.textMuted, maxWidth: 420, lineHeight: LEADING.normal }}>
                    {emptyText}
                  </p>
                </div>
              ) : (
                <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
                  {visible.map(channel => {
                    const isPlaying = playingId === channel.id;
                    const isPressed = pressedId === channel.id || launchingId === channel.id;
                    const isFavourite = favourites.includes(String(channel.id));
                    const name = locale === "ar" ? (channel.nameAr || channel.name) : channel.name;
                    return (
                      <div
                        key={channel.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => tapChannel(channel)}
                        onKeyDown={e => { if (e.key === "Enter") tapChannel(channel); }}
                        onPointerDown={e => pressStart(e, channel.id)}
                        onPointerMove={pressMove}
                        onPointerUp={pressEnd}
                        onPointerLeave={pressEnd}
                        onPointerCancel={e => { if (touch.current) touch.current.moved = true; pressEnd(); }}
                        className="tv-card relative flex flex-col cursor-pointer select-none"
                        style={{
                          padding: 10,
                          /* Pressed = the home hub cards' press: brand fill, white text. */
                          backgroundColor: isPressed ? theme.primary : theme.surface,
                          borderRadius: theme.radiusLg,
                          border: isPressed
                            ? `1.5px solid ${theme.primary}`
                            : isPlaying ? `3px solid ${theme.primary}` : `1.5px solid ${theme.borderSubtle}`,
                          boxShadow: isPressed ? `0px 2px 8px 0px ${theme.primarySubtle}` : isPlaying ? SHADOW.lg : SHADOW.sm,
                          transform: isPressed ? "scale(0.96)" : "scale(1)",
                          outline: "none",
                        }}
                      >
                        {/* Number and favourite get their own row so neither
                            ever covers a logo. */}
                        <div className="flex items-center justify-between" style={{ height: 44, marginBottom: 6 }}>
                          <span
                            className="tabular-nums"
                            style={{
                              marginInlineStart: 4,
                              padding: "5px 9px",
                              borderRadius: theme.radiusSm,
                              backgroundColor: isPressed ? "rgba(255,255,255,0.2)" : theme.surfaceInset,
                              color: isPressed ? theme.textInverse : theme.textMuted,
                              fontFamily,
                              fontSize: TYPE_SCALE.sm,
                              fontWeight: WEIGHT.semibold,
                              lineHeight: 1,
                            }}
                          >
                            {numberOf.get(channel.id)}
                          </span>

                          {SHOW_FAVOURITES && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); toggleFavourite(channel.id); }}
                            aria-label={isFavourite ? t("tv.removeFavourite") : t("tv.addFavourite")}
                            aria-pressed={isFavourite}
                            className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: theme.radiusFull,
                              backgroundColor: isFavourite ? theme.primarySubtle : "transparent",
                              border: "none",
                              outline: "none",
                            }}
                          >
                            <Heart
                              size={22}
                              color={isFavourite ? theme.primaryOn : theme.textDisabled}
                              fill={isFavourite ? theme.primaryOn : "none"}
                              strokeWidth={2.2}
                            />
                          </button>
                          )}
                        </div>

                        {/* Logo tile stays white in dark mode too: channel
                            logos are drawn for white (many are JPGs with a
                            white box, some are black on transparent). */}
                        <div
                          className="w-full aspect-video overflow-hidden flex items-center justify-center"
                          style={{ padding: 6, borderRadius: theme.radiusMd, backgroundColor: "#fff" }}
                        >
                          <ChannelLogo channel={channel} size="card" />
                        </div>

                        {/* Name, or the live marker while it plays */}
                        <div className="flex items-center justify-center gap-2 px-1" style={{ minHeight: 44, paddingTop: 8 }}>
                          {isPlaying && (
                            <span
                              className="shrink-0"
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: theme.radiusFull,
                                backgroundColor: theme.error,
                                animation: "tvLivePulse 1.4s ease-in-out infinite",
                              }}
                            />
                          )}
                          <span
                            className="truncate"
                            style={{
                              fontFamily,
                              fontSize: "16px",
                              fontWeight: WEIGHT.bold,
                              lineHeight: 1.3,
                              color: isPressed ? theme.textInverse : isPlaying ? theme.primaryOn : theme.textHeading,
                            }}
                          >
                            {isPlaying ? `${t("tv.nowPlaying")} · ${name}` : name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {simChannel && (
        <ChannelPlayerSimulation
          channel={simChannel}
          number={numberOf.get(simChannel.id) ?? ""}
          total={shown.length}
          category={simChannel.category ? categoryLabel(simChannel.category) : ""}
          onClose={stopAll}
          onNext={() => stepSim(1)}
          onPrev={() => stepSim(-1)}
          onStop={stopAll}
        />
      )}
    </div>
  );
}
