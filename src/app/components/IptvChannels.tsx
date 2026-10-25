import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { InternalPageHeader } from "./InternalPageHeader";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, SPACE, TEXT_STYLE, LEADING } from "./ThemeContext";
import { useLocale } from "./i18n";
import {
  Tv, ArrowLeft, ArrowRight, RefreshCw, Square, Search, X, Heart, History, LayoutGrid,
  Newspaper, Trophy, Baby, BookOpen, Clapperboard, Compass, Music,
} from "lucide-react";
import { useIptvChannels, iptv, isAndroidApp, useAndroidEvent, IptvChannel, _setIptvPlayingId } from "../utils/androidBridge";
import { ApiImage } from "./ApiImage";
import { PREVIEW_CHANNELS } from "../data/tvChannels";

/* Patient-kept lists. Keys are channel ids as strings, newest first for recent. */
const FAVOURITES_KEY = "careinn-iptv-favourites";
const RECENT_KEY = "careinn-iptv-recent";
const RECENT_MAX = 12;

/* Known genres, in rail order. Anything else a server sends follows them,
   alphabetically, under its own name. */
const KNOWN_CATEGORIES = ["general", "news", "sports", "kids", "religious", "movies", "documentary", "music"];
const CATEGORY_ICON: Record<string, typeof Tv> = {
  general: Tv, news: Newspaper, sports: Trophy, kids: Baby, religious: BookOpen,
  movies: Clapperboard, documentary: Compass, music: Music,
};

type Section = "favourites" | "recent" | "all" | `cat:${string}`;

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

export function IptvChannels({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, fontFamily, locale, isRTL } = useLocale();
  const { channels, loading, error, reload } = useIptvChannels();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [favourites, setFavourites] = useState<string[]>(() => readIds(FAVOURITES_KEY));
  const [recent, setRecent] = useState<string[]>(() => readIds(RECENT_KEY));
  const [section, setSection] = useState<Section>("all");
  const [query, setQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const isAndroid = isAndroidApp();
  const connected = channels.length > 0 && !error;
  const preview = !loading && !connected;
  const shown = preview ? PREVIEW_CHANNELS : channels;

  const markWatched = (id: number) => {
    setRecent(prev => {
      const next = [String(id), ...prev.filter(k => k !== String(id))].slice(0, RECENT_MAX);
      writeIds(RECENT_KEY, next);
      return next;
    });
  };

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
      if (id !== null) markWatched(id);
    }
  );

  useAndroidEvent('iptv-stopped', () => {
    setPlayingId(null);
    _setIptvPlayingId(null);
  });

  const handlePlay = (channel: IptvChannel) => {
    if (!isAndroid || preview) return;
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
  const recentChannels = recent.map(k => byId.get(k)).filter((c): c is IptvChannel => !!c);

  const listFor = (s: Section): IptvChannel[] => {
    if (s === "favourites") return favouriteChannels;
    if (s === "recent") return recentChannels;
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

  // An emptied Recently watched (channel list changed) falls back to All.
  useEffect(() => {
    if (section === "recent" && recentChannels.length === 0) setSection("all");
  }, [section, recentChannels.length]);

  const heading = trimmed
    ? t("tv.results")
    : section === "favourites" ? t("tv.cat.favourites")
    : section === "recent" ? t("tv.cat.recent")
    : section === "all" ? t("tv.cat.all")
    : categoryLabel(section.slice(4));

  const emptyText = trimmed
    ? t("tv.empty.search")
    : section === "favourites" ? t("tv.empty.favourites")
    : section === "recent" ? t("tv.empty.recent")
    : t("tv.noChannels");

  const railItems: { key: Section; Icon: typeof Tv; label: string; count: number }[] = [
    { key: "favourites", Icon: Heart, label: t("tv.cat.favourites"), count: favouriteChannels.length },
    ...(recentChannels.length > 0
      ? [{ key: "recent" as Section, Icon: History, label: t("tv.cat.recent"), count: recentChannels.length }]
      : []),
    { key: "all", Icon: LayoutGrid, label: t("tv.cat.all"), count: shown.length },
    ...categories.map(c => ({
      key: `cat:${c}` as Section,
      Icon: CATEGORY_ICON[c] ?? Tv,
      label: categoryLabel(c),
      count: shown.filter(ch => ch.category === c).length,
    })),
  ];

  const glassButton: CSSProperties = {
    height: "52px",
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
        .tv-card { transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
        .tv-card:hover { border-color: var(--tv-primary); box-shadow: ${SHADOW.md}; transform: translateY(-3px); }
        .tv-card:active { transform: scale(0.97); }
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
                onClick={() => iptv.stop()}
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
              style={{ ...glassButton, width: "52px" }}
            >
              <RefreshCw size={22} style={{ color: "#fff" }} className={loading ? "animate-spin" : ""} />
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
                <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
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
                <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
                  {visible.map(channel => {
                    const isPlaying = playingId === channel.id;
                    const isFavourite = favourites.includes(String(channel.id));
                    const name = locale === "ar" ? (channel.nameAr || channel.name) : channel.name;
                    return (
                      <div
                        key={channel.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handlePlay(channel)}
                        onKeyDown={e => { if (e.key === "Enter") handlePlay(channel); }}
                        className="tv-card relative flex flex-col cursor-pointer select-none"
                        style={{
                          padding: 10,
                          backgroundColor: theme.surface,
                          borderRadius: theme.radiusLg,
                          border: isPlaying ? `3px solid ${theme.primary}` : `1.5px solid ${theme.borderSubtle}`,
                          boxShadow: isPlaying ? SHADOW.lg : SHADOW.sm,
                          outline: "none",
                        }}
                      >
                        {/* Number and favourite get their own row so neither
                            ever covers a logo. */}
                        <div className="flex items-center justify-between" style={{ height: 40 }}>
                          <span
                            className="tabular-nums"
                            style={{
                              marginInlineStart: 4,
                              padding: "5px 9px",
                              borderRadius: theme.radiusSm,
                              backgroundColor: theme.surfaceInset,
                              color: theme.textMuted,
                              fontFamily,
                              fontSize: TYPE_SCALE.sm,
                              fontWeight: WEIGHT.semibold,
                              lineHeight: 1,
                            }}
                          >
                            {numberOf.get(channel.id)}
                          </span>

                          {/* Favourite toggle */}
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); toggleFavourite(channel.id); }}
                            aria-label={isFavourite ? t("tv.removeFavourite") : t("tv.addFavourite")}
                            aria-pressed={isFavourite}
                            className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                            style={{
                              width: 44,
                              height: 44,
                              marginInlineEnd: -4,
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
                        </div>

                        {/* Logo tile stays white in dark mode too: channel
                            logos are drawn for white (many are JPGs with a
                            white box, some are black on transparent). */}
                        <div
                          className="w-full aspect-video overflow-hidden flex items-center justify-center"
                          style={{ padding: 6, borderRadius: theme.radiusMd, backgroundColor: "#fff" }}
                        >
                          {channel.logo ? (
                            <ApiImage
                              src={channel.logo}
                              alt={channel.name}
                              loading="lazy"
                              draggable={false}
                              className="w-full h-full object-contain"
                              fallback={<Tv size={44} color={theme.textMuted} strokeWidth={1.2} />}
                            />
                          ) : (
                            <Tv size={44} color={theme.textMuted} strokeWidth={1.2} />
                          )}
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
                              color: isPlaying ? theme.primaryOn : theme.textHeading,
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
    </div>
  );
}
