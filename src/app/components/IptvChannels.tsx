import { useState, useRef, useMemo } from "react";
import { InternalPageHeader } from "./InternalPageHeader";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { Tv, ArrowLeft, ArrowRight, RefreshCw, Square, AlertCircle } from "lucide-react";
import { useIptvChannels, iptv, isAndroidApp, useAndroidEvent, IptvChannel, _setIptvPlayingId } from "../utils/androidBridge";
import { ApiImage } from "./ApiImage";
import { TV_CHANNELS, TvChannel, TvChannelCategory } from "../data/tvChannels";

const CHANNELS_PER_PAGE = 28; // 7 columns x 4 rows on a large screen

type ChannelFilter = "all" | TvChannelCategory;

const CHANNEL_FILTERS: { id: ChannelFilter; en: string; ar: string }[] = [
  { id: "all",       en: "All",       ar: "الكل" },
  { id: "general",   en: "General",   ar: "عام" },
  { id: "news",      en: "News",      ar: "أخبار" },
  { id: "sports",    en: "Sports",    ar: "رياضة" },
  { id: "kids",      en: "Kids",      ar: "أطفال" },
  { id: "religious", en: "Religious", ar: "دينية" },
];

export interface DisplayIptvChannel {
  id: number;
  name: string;
  nameAr: string;
  url: string;
  logo: string;
  category: TvChannelCategory;
  originalIndex: number;
}

function inferCategory(name: string, nameAr?: string): TvChannelCategory {
  const text = `${name} ${nameAr || ""}`.toLowerCase();
  if (/(sport|رياض|كورة|كاس|دوري)/i.test(text)) return "sports";
  if (/(news|أخبار|إخبار|حدث|عربية|جزيرة|cnn|bbc)/i.test(text)) return "news";
  if (/(quran|sunnah|قرآن|سنة|ذكر|دعوة|إسلام|islam)/i.test(text)) return "religious";
  if (/(kid|أطفال|طفل|كرتون|cartoon|junior|disney|majid|ماجد)/i.test(text)) return "kids";
  return "general";
}

function matchKnownChannel(name: string, nameAr?: string): TvChannel | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "");
  const n1 = norm(name);
  const n2 = nameAr ? norm(nameAr) : "";
  return TV_CHANNELS.find((c) => {
    const cn1 = norm(c.name);
    const cn2 = norm(c.nameAr);
    return cn1 === n1 || (n2 && cn2 === n2) || (n1 && cn1 && (n1.includes(cn1) || cn1.includes(n1)));
  });
}

export function IptvChannels({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, fontFamily, locale, isRTL } = useLocale();
  const { channels, loading, error, reload } = useIptvChannels();
  const [playingId, setPlayingId] = useState<number | null>(null);

  // Sync playingId with native events. The playChannelList path emits
  // `index` + `total`; the legacy playIptv path emits only `url` + `channel`.
  useAndroidEvent<{ url: string; channel: string; index?: number; total?: number }>(
    "iptv-playing",
    (d) => {
      let id: number | null = null;
      if (typeof d.index === "number" && channels[d.index]) {
        id = channels[d.index].id;
      } else {
        const ch = channels.find((c) => c.url === d.url);
        id = ch?.id ?? null;
      }
      setPlayingId(id);
      _setIptvPlayingId(id);
    }
  );

  useAndroidEvent("iptv-stopped", () => {
    setPlayingId(null);
    _setIptvPlayingId(null);
  });

  // Dynamically map server channels to DisplayIptvChannel, enriching with local logos/categories if matched
  const enrichedChannels: DisplayIptvChannel[] = useMemo(() => {
    return channels.map((ch, idx) => {
      const known = matchKnownChannel(ch.name, ch.nameAr);
      const category: TvChannelCategory =
        (ch.category as TvChannelCategory) ||
        known?.category ||
        inferCategory(ch.name, ch.nameAr);
      const logo = ch.logo || known?.logo || "";
      const name = ch.name || known?.name || `Channel ${idx + 1}`;
      const nameAr = ch.nameAr || known?.nameAr || name;
      return {
        id: ch.id ?? idx,
        name,
        nameAr,
        url: ch.url,
        logo,
        category,
        originalIndex: idx,
      };
    });
  }, [channels]);

  // If running in web preview and server returned no channels, provide TV_CHANNELS as a preview fallback
  const displaySource = useMemo(() => {
    if (enrichedChannels.length > 0) return enrichedChannels;
    if (!isAndroidApp() && !loading && !error) {
      return TV_CHANNELS.map((ch, idx) => ({
        id: idx + 1,
        name: ch.name,
        nameAr: ch.nameAr,
        url: "",
        logo: ch.logo,
        category: ch.category,
        originalIndex: idx,
      }));
    }
    return [];
  }, [enrichedChannels, loading, error]);

  const handlePlayList = (originalIndex: number) => {
    const channel = displaySource[originalIndex] ?? channels[originalIndex];
    if (!channel) return;
    if (playingId === channel.id) {
      iptv.stop();
      setPlayingId(null);
      _setIptvPlayingId(null);
    } else {
      setPlayingId(channel.id);
      _setIptvPlayingId(channel.id);
      if (channels.length > 0) {
        iptv.playList(channels, originalIndex);
      } else if (channel.url) {
        iptv.play(channel as IptvChannel);
      }
    }
  };

  const [filter, setFilter] = useState<ChannelFilter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleChannels = useMemo(() => {
    return filter === "all"
      ? displaySource
      : displaySource.filter((c) => c.category === filter);
  }, [displaySource, filter]);

  const filterCounts = (id: ChannelFilter) =>
    id === "all" ? displaySource.length : displaySource.filter((c) => c.category === id).length;

  // Paging + swipe mirror the launcher grid (AppLauncher); only kicks in past 28 channels.
  const numPages = Math.ceil(visibleChannels.length / CHANNELS_PER_PAGE);
  const [pageIndex, setPageIndex] = useState(0);

  const selectFilter = (id: ChannelFilter) => {
    setFilter(id);
    setPageIndex(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const touchOffset = useRef(0);

  const handleSwipeStart = (e: React.PointerEvent) => {
    if (numPages <= 1) return;
    swipeStartX.current = e.clientX;
    setIsSwiping(true);
    touchOffset.current = 0;
  };

  const handleSwipeMove = (e: React.PointerEvent) => {
    if (swipeStartX.current === null) return;
    const deltaX = e.clientX - swipeStartX.current;
    const isOut = isRTL
      ? (pageIndex === 0 && deltaX < 0) || (pageIndex === numPages - 1 && deltaX > 0)
      : (pageIndex === 0 && deltaX > 0) || (pageIndex === numPages - 1 && deltaX < 0);
    setDragOffset(isOut ? deltaX * 0.3 : deltaX);
    touchOffset.current = deltaX;
  };

  const handleSwipeEnd = () => {
    if (swipeStartX.current === null) return;
    const deltaX = touchOffset.current;
    const threshold = 100;
    setIsSwiping(false);
    setDragOffset(0);
    swipeStartX.current = null;
    const forward = isRTL ? deltaX > threshold : deltaX < -threshold;
    const back = isRTL ? deltaX < -threshold : deltaX > threshold;
    if (forward && pageIndex < numPages - 1) setPageIndex(pageIndex + 1);
    else if (back && pageIndex > 0) setPageIndex(pageIndex - 1);
  };

  const renderGrid = (list: DisplayIptvChannel[], firstNumber: number) => (
    <div className="grid gap-3.5 grid-cols-4 @4xl:grid-cols-5 @6xl:grid-cols-6 @7xl:grid-cols-7">
      {list.map((channel, i) => {
        const isPlaying = playingId === channel.id;
        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => handlePlayList(channel.originalIndex)}
            className="group relative flex flex-col items-center px-2.5 pt-2 pb-2.5 transition-all duration-300 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: theme.surface,
              borderRadius: theme.radiusCard,
              border: isPlaying ? `3px solid ${theme.primary}` : theme.cardBorder,
              boxShadow: isPlaying ? SHADOW.xl : SHADOW.md,
              outline: "none",
            }}
          >
            {/* Live Indicator */}
            {isPlaying && (
              <div className="absolute top-2.5 end-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500 rounded-full shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">Live</span>
              </div>
            )}

            {/* Channel Number */}
            <span
              className="self-start ms-2.5 mt-1 mb-1 tabular-nums"
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.sm,
                lineHeight: 1,
                fontWeight: WEIGHT.semibold,
                color: theme.textMuted,
                letterSpacing: "0.04em",
              }}
            >
              {String(firstNumber + i).padStart(2, "0")}
            </span>

            {/* Logo Container */}
            <div
              className="w-full aspect-video rounded-xl mb-1.5 overflow-hidden flex items-center justify-center p-1"
              style={{ backgroundColor: "#fff" }}
            >
              {channel.logo ? (
                <ApiImage
                  src={channel.logo}
                  alt={channel.name}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-contain"
                  fallback={
                    <div className="flex items-center justify-center">
                      <Tv size={48} color={theme.textMuted} strokeWidth={1} />
                    </div>
                  }
                />
              ) : (
                <div className="flex items-center justify-center">
                  <Tv size={48} color={theme.textMuted} strokeWidth={1} />
                </div>
              )}
            </div>

            {/* Channel Name */}
            <span
              className="line-clamp-2"
              style={{
                fontFamily: fontFamily,
                fontSize: "16px",
                lineHeight: 1.3,
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
                textAlign: "center",
              }}
            >
              {locale === "ar" ? channel.nameAr : channel.name}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        background: theme.pageGradient,
        animation: "appLauncherIn 0.2s ease-out",
      }}
    >
      {/* Hospital background image — same treatment as the Media page (AppLauncher) */}
      <ApiImage
        src={theme.heroImageUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ opacity: 0.08, mixBlendMode: "luminosity", userSelect: "none" }}
      />

      {/* Header — the Media page's header; the leading arrow returns to Media */}
      <InternalPageHeader
        title={`${t("hub.media")} - ${locale === "ar" ? "البث المباشر" : "Live TV"}`}
        icon={<Tv size={26} strokeWidth={2} />}
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
                style={{
                  height: "52px",
                  backgroundColor: "#ef4444",
                  borderRadius: "12px",
                  border: "none",
                  outline: "none",
                }}
              >
                <Square size={20} color="#fff" fill="#fff" />
                <span
                  style={{
                    fontFamily: fontFamily,
                    fontSize: TYPE_SCALE.base,
                    fontWeight: WEIGHT.semibold,
                    color: "#fff",
                  }}
                >
                  {t("tv.stop") || (locale === "ar" ? "إيقاف البث" : "Stop TV")}
                </span>
              </button>
            )}

            <button
              onClick={reload}
              disabled={loading}
              className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "12px",
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.15)",
                outline: "none",
              }}
            >
              <RefreshCw size={22} style={{ color: "#fff" }} className={loading ? "animate-spin" : ""} />
            </button>
          </>
        }
      />

      {/* Category filter — stays put while the grid below scrolls */}
      {displaySource.length > 0 && (
        <div
          role="tablist"
          dir={isRTL ? "rtl" : "ltr"}
          className="relative z-10 flex-shrink-0 flex items-center gap-3 overflow-x-auto px-16 pt-2 pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {CHANNEL_FILTERS.map((f) => {
            const count = filterCounts(f.id);
            if (count === 0) return null;
            const selected = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectFilter(f.id)}
                className="flex-shrink-0 flex items-center px-6 cursor-pointer active:scale-95 transition-all whitespace-nowrap focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{
                  height: SPACE[6],
                  borderRadius: "12px",
                  backgroundColor: selected ? "#fff" : "rgba(255,255,255,0.12)",
                  border: selected ? "1px solid #fff" : "1px solid rgba(255,255,255,0.15)",
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.base,
                  fontWeight: selected ? WEIGHT.bold : WEIGHT.semibold,
                  color: selected ? theme.primary : "#fff",
                }}
              >
                {locale === "ar" ? f.ar : f.en}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div ref={scrollRef} className="@container relative z-10 flex-1 min-h-0 overflow-y-auto px-16 pt-2 pb-16 scroll-smooth">
        {/* Loading skeleton */}
        {loading && displaySource.length === 0 && (
          <div className="grid gap-3.5 grid-cols-4 @4xl:grid-cols-5 @6xl:grid-cols-6 @7xl:grid-cols-7">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex flex-col items-center px-2.5 pt-2 pb-2.5"
                style={{
                  height: "170px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: theme.radiusCard,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && displaySource.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertCircle size={56} color="#ef4444" opacity={0.7} />
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.xl,
                fontWeight: WEIGHT.semibold,
                color: "#fff",
              }}
            >
              {error}
            </p>
            <button
              onClick={reload}
              className="mt-2 px-8 py-3 cursor-pointer active:scale-95 transition-transform"
              style={{
                backgroundColor: theme.primary,
                color: "#fff",
                borderRadius: "12px",
                fontWeight: WEIGHT.bold,
                border: "none",
                outline: "none",
              }}
            >
              {locale === "ar" ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && displaySource.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Tv size={56} color="rgba(255,255,255,0.4)" />
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.xl,
                fontWeight: WEIGHT.semibold,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {t("tv.noChannels") || (locale === "ar" ? "لا توجد قنوات متاحة" : "No channels available")}
            </p>
          </div>
        )}

        {/* Channels Grid / Pages */}
        {displaySource.length > 0 && (
          numPages > 1 ? (
            <>
              <div
                className="overflow-hidden pb-3"
                style={{ touchAction: "pan-y" }}
                onPointerDown={handleSwipeStart}
                onPointerMove={handleSwipeMove}
                onPointerUp={handleSwipeEnd}
                onPointerCancel={handleSwipeEnd}
              >
                <div
                  className="flex"
                  style={{
                    width: `${numPages * 100}%`,
                    transform: `translateX(calc(${(isRTL ? 1 : -1) * (pageIndex / numPages) * 100}% + ${dragOffset}px))`,
                    transition: isSwiping ? "none" : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  {Array.from({ length: numPages }).map((_, pIdx) => (
                    <div key={pIdx} className="flex-shrink-0" style={{ width: `${100 / numPages}%` }}>
                      {renderGrid(
                        visibleChannels.slice(pIdx * CHANNELS_PER_PAGE, (pIdx + 1) * CHANNELS_PER_PAGE),
                        pIdx * CHANNELS_PER_PAGE + 1
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-6 w-full">
                {Array.from({ length: numPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPageIndex(i)}
                    className="transition-transform duration-300"
                    style={{
                      width: i === pageIndex ? 24 : 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: i === pageIndex ? "#fff" : "rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      border: "none",
                      outline: "none",
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            renderGrid(visibleChannels, 1)
          )
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes appLauncherIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
