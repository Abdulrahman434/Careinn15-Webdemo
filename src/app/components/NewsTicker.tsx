import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, TEXT_STYLE, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import separatorIcon from "../../imports/Asset_2_white.svg";
import { ApiImage } from "./ApiImage";

interface NewsTickerProps {
  items?: string[];
  /** Stop scrolling, e.g. while a full-screen screensaver covers the ticker. */
  paused?: boolean;
}

/** Scroll speed, px per second. */
const SPEED_PX_PER_S = 30;
/** Redraws per second while scrolling. At 30 px/s this is exactly 1 px per
 *  step, so it reads as smooth, but it halves the frames the screen has to
 *  composite — measured on a bedside tablet, 60 fps cost ~35 points of CPU
 *  over a paused ticker, 30 fps ~12. */
const TICKER_FPS = 30;
/** With no touch for this long the ticker stops; the next touch restarts it. */
const IDLE_PAUSE_MS = 3 * 60 * 1000;

export function NewsTicker({ items, paused = false }: NewsTickerProps = {}) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const textRef = useRef<HTMLDivElement>(null);
  const [durationS, setDurationS] = useState<number | null>(null);
  const [idle, setIdle] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);

  const newsItems = items ?? (theme.id === "dallah"
    ? [
        `🏆  ${t("news.dallah.1")}`,
        `🌍  ${t("news.dallah.2")}`,
        `🔬  ${t("news.dallah.3")}`,
      ]
    : theme.id === "dsfh"
    ? [
        `🤝  ${t("news.dsfh.jeddah.6")}`,
        `🏆  ${t("news.dsfh.jeddah.2")}`,
        `🌍  ${t("news.dsfh.jeddah.1")}`,
        `🧠  ${t("news.dsfh.jeddah.5")}`,
        `🚀  ${t("news.dsfh.jeddah.4")}`,
        `🏗️  ${t("news.dsfh.jeddah.3")}`,
        `🇩🇪  ${t("news.dsfh.1")}`,
        `⭐  ${t("news.dsfh.2")}`,
        `🏆  ${t("news.dsfh.3")}`,
      ]
    : theme.id === "imc"
    ? [
        `🎓  ${t("news.imc.1")}`,
        `🏥  ${t("news.imc.2")}`,
        `🏗️  ${t("news.imc.3")}`,
        `🤝  ${t("news.imc.4")}`,
        `📱  ${t("news.imc.5")}`,
      ]
    : theme.id === "burjeel"
    ? [
        `🏆  ${t("news.burjeel.1")}`,
        `🌍  ${t("news.burjeel.2")}`,
        `🔬  ${t("news.burjeel.3")}`,
        `💹  ${t("news.burjeel.4")}`,
        `🏥  ${t("news.burjeel.5")}`,
      ]
    : theme.id === "prime"
    ? [
        `🏆  ${t("news.prime.1")}`,
        `❤️  ${t("news.prime.2")}`,
        `🤝  ${t("news.prime.3")}`,
      ]
    : theme.id === "kauh"
    ? [
        `🏥  ${t("news.kauh.1")}`,
        `📱  ${t("news.kauh.2")}`,
        `🔬  ${t("news.kauh.3")}`,
        `🚀  ${t("news.kauh.4")}`,
      ]
    : theme.id === "andalusia"
    ? [
        `🌍  Andalusia Health expands its network of hospitals across Saudi Arabia.`,
        `🔬  Andalusia Health launches new specialized oncology center.`,
        `🏆  Andalusia Health recognized for excellence in patient care and experience.`,
      ]
    : theme.id === "careinn"
    ? [
        `🏆  ${t("news.careinn.1")}`,
        `🌍  ${t("news.careinn.2")}`,
        `🤝  ${t("news.careinn.3")}`,
        `🏥  ${t("news.careinn.4")}`,
        `⭐  ${t("news.careinn.5")}`,
        `🚀  ${t("news.careinn.6")}`,
        `📺  ${t("news.careinn.7")}`,
        `🔬  ${t("news.careinn.8")}`,
      ]
    : [
        `🏆  ${t("news.wifi")}`,
        `🌍  ${t("news.carePlans")}`,
        `🔬  ${t("news.menu")}`,
      ]);

  // The browser scrolls the strip itself (CSS animation), so no JavaScript runs
  // per frame. The strip holds two identical copies; one loop is half its width.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () =>
      setDurationS(Math.round((el.scrollWidth / 2 / SPEED_PX_PER_S) * 10) / 10);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Nothing about a ticker needs to move while nobody is looking at it.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_PAUSE_MS);
    };
    const wake = () => {
      setIdle(false);
      arm();
    };
    const onVisibility = () => setHidden(document.hidden);
    arm();
    window.addEventListener("pointerdown", wake, { capture: true, passive: true });
    window.addEventListener("keydown", wake, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", wake, { capture: true });
      window.removeEventListener("keydown", wake, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const running = !paused && !idle && !hidden;

  const separator = "        ·        ";
  const tickerText = newsItems.join(separator);

  /* Build ticker content with SVG separators */
  const renderTickerContent = () => {
    const elements: React.ReactNode[] = [];
    newsItems.forEach((item, i) => {
      elements.push(<span key={`item-${i}`}>{item}</span>);
      elements.push(
        <ApiImage
          key={`sep-${i}`}
          src={separatorIcon}
          alt=""
          style={{
            width: "14px",
            height: "14px",
            display: "inline-block",
            verticalAlign: "middle",
            margin: "0 24px",
            opacity: 0.5,
          }}
        />
      );
    });
    return elements;
  };

  return (
    <div
      className="w-full overflow-hidden flex items-center justify-center shrink-0"
      style={{
        height: SPACE[5],
        // Read the scoped CSS variable so Layout 2 uses its own (CareInn) theme
        // source; falls back to the active-hospital theme in Layout 1.
        background: `var(--primary-color, ${theme.primary})`,
        boxShadow: SHADOW.md,
      }}
    >
      <div
        className="relative overflow-hidden h-full flex items-center w-full"
      >
        <style>{`
          @keyframes news-ticker-ltr { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes news-ticker-rtl { from { transform: translateX(0); } to { transform: translateX(50%); } }
        `}</style>
        <div
          ref={textRef}
          className="absolute whitespace-nowrap will-change-transform flex items-center"
          style={{
            animation:
              durationS === null
                ? undefined
                : `${isRTL ? "news-ticker-rtl" : "news-ticker-ltr"} ${durationS}s steps(${Math.max(
                    1,
                    Math.round(durationS * TICKER_FPS),
                  )}) infinite`,
            animationPlayState: running ? "running" : "paused",
            fontFamily: fontFamily,
            color: theme.brandOnPrimary,
            ...TEXT_STYLE.body,
          }}
        >
          {renderTickerContent()}{renderTickerContent()}
        </div>
      </div>
    </div>
  );
}