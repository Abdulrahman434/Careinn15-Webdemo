import { useState, useEffect, useCallback } from "react";
import { DemoControls } from "./DemoControls";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";
import { Tv, ArrowLeft, RefreshCw, Square, Wifi, WifiOff } from "lucide-react";
import { useIptvChannels, iptv, isAndroidApp, useAndroidEvent, IptvChannel, _setIptvPlayingId } from "../utils/androidBridge";
import { ApiImage } from "./ApiImage";

// Shown when the channel list can't be loaded (browser, server down) so the
// screen's design is still visible. Not playable.
const PREVIEW_CHANNELS: IptvChannel[] = [
  { id: -1, name: "News 24", nameAr: "الأخبار ٢٤", url: "", logo: "" },
  { id: -2, name: "Sports HD", nameAr: "الرياضة", url: "", logo: "" },
  { id: -3, name: "Kids", nameAr: "الأطفال", url: "", logo: "" },
  { id: -4, name: "Movies", nameAr: "الأفلام", url: "", logo: "" },
  { id: -5, name: "Documentary", nameAr: "الوثائقية", url: "", logo: "" },
  { id: -6, name: "Quran", nameAr: "القرآن الكريم", url: "", logo: "" },
  { id: -7, name: "Music", nameAr: "الموسيقى", url: "", logo: "" },
  { id: -8, name: "Weather", nameAr: "الطقس", url: "", logo: "" },
];

export function IptvChannels({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, fontFamily, locale } = useLocale();
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
  const connected = channels.length > 0 && !error;
  const preview = !loading && !connected;
  const shown = preview ? PREVIEW_CHANNELS : channels;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: theme.background,
        animation: "appLauncherIn 0.2s ease-out",
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-8"
        style={{
          height: "88px",
          backgroundColor: theme.surface,
          borderBottom: theme.cardBorder,
          boxShadow: SHADOW.lg,
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: theme.surfaceElevated,
              borderRadius: theme.radiusMd,
              border: "none",
              outline: "none",
            }}
          >
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <div className="flex items-center gap-3">
            <Tv size={28} color={theme.primaryOn} strokeWidth={2.5} />
            <h1
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.xl,
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
              }}
            >
              {t("hub.media")} - {locale === "ar" ? "البث المباشر" : "Live TV"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!loading && (
            <div
              title={connected ? t("conn.connected") : (!isAndroid ? t("tv.onlyOnKiosk") : t("conn.offline"))}
              className="flex items-center gap-2 px-4"
              style={{
                height: "56px",
                backgroundColor: connected ? theme.successSubtle : theme.errorSubtle,
                borderRadius: theme.radiusMd,
              }}
            >
              {connected
                ? <Wifi size={22} color={theme.successOn} strokeWidth={2.5} />
                : <WifiOff size={22} color={theme.errorOn} strokeWidth={2.5} />}
              <span
                style={{
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.base,
                  fontWeight: WEIGHT.semibold,
                  color: connected ? theme.successOn : theme.errorOn,
                }}
              >
                {connected ? t("conn.connected") : t("conn.offline")}
              </span>
            </div>
          )}

          {playingId !== null && (
            <button
              onClick={() => iptv.stop()}
              className="flex items-center gap-2 px-6 py-3 cursor-pointer active:scale-95 transition-transform"
              style={{
                backgroundColor: "#ef4444",
                borderRadius: theme.radiusMd,
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
              width: "56px",
              height: "56px",
              backgroundColor: theme.surfaceElevated,
              borderRadius: theme.radiusMd,
              border: "none",
              outline: "none",
            }}
          >
            <RefreshCw size={24} color={theme.textHeading} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Language, dark mode, fullscreen — last in the row, as on every
              other internal screen. */}
          <DemoControls variant="onSurface" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-16 py-12 scroll-smooth">
        {loading && channels.length === 0 && (
          <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div 
                key={i} 
                className="animate-pulse"
                style={{ 
                  height: "220px", 
                  backgroundColor: theme.surfaceElevated, 
                  borderRadius: theme.radiusCard 
                }}
              />
            ))}
          </div>
        )}

        <div 
          className="grid gap-8" 
          style={{ 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            pointerEvents: isAndroid && !preview ? "auto" : "none"
          }}
        >
          {shown.map((channel, i) => {
            const isPlaying = playingId === channel.id;
            return (
              <button
                key={channel.id}
                onClick={() => handlePlayList(i)}
                className="group relative flex flex-col items-center p-6 transition-all duration-300 active:scale-95"
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: theme.radiusCard,
                  border: isPlaying ? `4px solid ${theme.primary}` : theme.cardBorder,
                  boxShadow: isPlaying ? SHADOW.xl : SHADOW.md,
                  outline: "none",
                }}
              >
                {/* Logo Container */}
                <div 
                  className="w-full aspect-video rounded-xl mb-4 overflow-hidden flex items-center justify-center p-4"
                  style={{ backgroundColor: "#f8fafc" }}
                >
                  {channel.logo ? (
                    <ApiImage 
                      src={channel.logo} 
                      alt={channel.name} 
                      className="max-w-full max-h-full object-contain"
                      fallback={
                        <div className="flex items-center justify-center">
                          <Tv size={48} color={theme.textMuted} strokeWidth={1} />
                        </div>
                      }
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center rounded-lg"
                      style={{ backgroundColor: theme.surfaceElevated }}
                    >
                      <Tv size={64} color={theme.textMuted} strokeWidth={1} />
                    </div>
                  )}
                </div>

                {/* Channel Name */}
                <span
                  style={{
                    fontFamily: fontFamily,
                    fontSize: TYPE_SCALE.lg,
                    fontWeight: WEIGHT.bold,
                    color: theme.textHeading,
                    textAlign: "center"
                  }}
                >
                  {locale === "ar" ? channel.nameAr : channel.name}
                </span>

                {/* Playing Indicator */}
                {isPlaying && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-green-500 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
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
