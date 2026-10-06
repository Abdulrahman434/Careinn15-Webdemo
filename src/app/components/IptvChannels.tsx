import { useState, useEffect, useCallback, useRef } from "react";
import { InternalPageHeader } from "./InternalPageHeader";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { Tv, ArrowLeft, ArrowRight, RefreshCw, Square } from "lucide-react";
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

export function IptvChannels({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, fontFamily, locale, isRTL } = useLocale();
  const { channels, loading, error, reload } = useIptvChannels();
  const [playingId, setPlayingId] = useState<number | null>(null);

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


  const handlePlayList = (startIndex: number) => {
    const channel = channels[startIndex];
    if (!channel) return;
    if (playingId === channel.id) {
      iptv.stop();
    } else {
      iptv.playList(channels, startIndex);
    }
  };

  const isAndroid = isAndroidApp();

  const [filter, setFilter] = useState<ChannelFilter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleChannels = filter === "all" ? TV_CHANNELS : TV_CHANNELS.filter(c => c.category === filter);
  const filterCounts = (id: ChannelFilter) =>
    id === "all" ? TV_CHANNELS.length : TV_CHANNELS.filter(c => c.category === id).length;

  // Paging + swipe mirror the launcher grid (AppLauncher); only kicks in past 18 channels.
  const numPages = Math.ceil(visibleChannels.length / CHANNELS_PER_PAGE);
  const [pageIndex, setPageIndex] = useState(0);

  const selectFilter = (id: ChannelFilter) => {
    setFilter(id);
    setPageIndex(0);
    // "instant" overrides the container's scroll-smooth so the new list starts at the top.
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

  const renderGrid = (list: TvChannel[], firstNumber: number) => (
    // Container query, not a media query: the app scales a fixed 1920px canvas,
    // so the viewport width says nothing about how wide this grid really is.
    <div className="grid gap-3.5 grid-cols-4 @4xl:grid-cols-5 @6xl:grid-cols-6 @7xl:grid-cols-7">
      {list.map((channel, i) => (
        <button
          key={channel.logo}
          type="button"
          className="group relative flex flex-col items-center px-2.5 pt-2 pb-2.5 transition-all duration-300 active:scale-95"
          style={{
            backgroundColor: theme.surface,
            borderRadius: theme.radiusCard,
            border: theme.cardBorder,
            boxShadow: SHADOW.md,
            outline: "none",
          }}
        >
          {/* Channel Number — on its own line so it never sits on a logo */}
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
              textAlign: "center"
            }}
          >
            {locale === "ar" ? channel.nameAr : channel.name}
          </span>
        </button>
      ))}
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
      <div
        role="tablist"
        dir={isRTL ? "rtl" : "ltr"}
        className="relative z-10 flex-shrink-0 flex items-center gap-3 overflow-x-auto px-16 pt-2 pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {CHANNEL_FILTERS.map(f => {
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

      {/* Main Content */}
      <div ref={scrollRef} className="@container relative z-10 flex-1 min-h-0 overflow-y-auto px-16 pt-2 pb-16 scroll-smooth">
        {numPages > 1 ? (
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
                    {renderGrid(visibleChannels.slice(pIdx * CHANNELS_PER_PAGE, (pIdx + 1) * CHANNELS_PER_PAGE), pIdx * CHANNELS_PER_PAGE + 1)}
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
