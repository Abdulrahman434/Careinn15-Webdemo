import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme, SHADOW, SPACE, TEXT_STYLE, WEIGHT } from "./ThemeContext";
import { useLocale } from "./i18n";
import { ApiImage } from "./ApiImage";

/**
 * HeroGallery — the greeting card's photos, opened full screen.
 *
 * The card shows the hospital photos as a slideshow, so the enlarged view is
 * the same slideshow, held still: it opens on the photo that was tapped and the
 * patient swipes (or taps the side arrows) through the rest. Built for touch —
 * big targets, swipe follows the finger, tap outside the photo to close.
 *
 * Covers its nearest positioned ancestor (the scaled 1920×1080 canvas), like
 * the other full-screen viewers, so it scales with the screen.
 */
export function HeroGallery({
  images,
  startIndex = 0,
  title,
  origin,
  onClose,
}: {
  images: string[];
  startIndex?: number;
  /** Where the tapped photo sits on the canvas (percent) — the gallery grows
   *  out of that spot. */
  origin?: { x: number; y: number };
  title?: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const count = images.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), count - 1));
  const [shown, setShown] = useState(false);
  /* Live drag, as a fraction of the slide width (scale-independent). */
  const [drag, setDrag] = useState(0);
  /* Each photo's aspect ratio, once loaded — lets small files scale up to
     fill the stage while keeping their rounded corners on the photo itself. */
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const trackRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; w: number; t: number; moved: boolean } | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(isRTL ? -1 : 1);
      if (e.key === "ArrowLeft") go(isRTL ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL]);

  /* +1 = next photo in reading order, whatever the script direction. */
  const go = (step: number) => setIndex((i) => Math.min(Math.max(i + step, 0), count - 1));

  const onPointerDown = (e: React.PointerEvent) => {
    if (count < 2) return;
    const w = trackRef.current?.getBoundingClientRect().width ?? 1;
    start.current = { x: e.clientX, y: e.clientY, w, t: performance.now(), moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 6) s.moved = true;
    /* In RTL the next photo sits to the left, so a rightward swipe advances. */
    let f = dx / s.w;
    const atStart = index === 0 && (isRTL ? f < 0 : f > 0);
    const atEnd = index === count - 1 && (isRTL ? f > 0 : f < 0);
    if (atStart || atEnd) f *= 0.3; // rubber-band at the ends
    setDrag(f);
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const fast = Math.abs(drag) / Math.max(1, performance.now() - s.t) > 0.0006;
    if (Math.abs(drag) > 0.18 || (fast && Math.abs(drag) > 0.04)) {
      const forward = isRTL ? drag > 0 : drag < 0;
      go(forward ? 1 : -1);
    }
    setDrag(0);
  };

  const dir = isRTL ? 1 : -1;
  const offsetPct = (index * dir + drag) * 100;

  const glassBtn: React.CSSProperties = {
    width: SPACE[8],
    height: SPACE[8],
    borderRadius: theme.radiusFull,
    backgroundColor: `color-mix(in srgb, ${theme.textInverse} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${theme.textInverse} 22%, transparent)`,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: theme.textInverse,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
  const Prev = isRTL ? ChevronRight : ChevronLeft;
  const Next = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col"
      style={{
        backgroundColor: theme.overlay,
        backdropFilter: "blur(28px) brightness(0.35)",
        WebkitBackdropFilter: "blur(28px) brightness(0.35)",
        opacity: shown ? 1 : 0,
        transform: shown ? "scale(1)" : "scale(0.25)",
        transformOrigin: origin ? `${origin.x}% ${origin.y}%` : "center",
        transition: "opacity 260ms ease-out, transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        fontFamily,
        userSelect: "none",
      }}
      dir={isRTL ? "rtl" : "ltr"}
      onClick={onClose}
    >
      {/* Header — title and counter at the start, close at the end */}
      <div
        className="shrink-0 flex items-center justify-between"
        style={{ padding: `${SPACE[4]} ${SPACE[6]} 0` }}
      >
        <div className="flex items-baseline" style={{ gap: SPACE[2], color: theme.textInverse }}>
          {title && <span style={{ ...TEXT_STYLE.subtitle, fontWeight: WEIGHT.bold }}>{title}</span>}
          {count > 1 && (
            <span style={{ ...TEXT_STYLE.body, color: theme.textInverseMuted }} dir="ltr">
              {index + 1} / {count}
            </span>
          )}
        </div>
        <button
          className="cursor-pointer active:scale-90 transition-transform"
          style={glassBtn}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={t("general.close")}
        >
          <X size={28} />
        </button>
      </div>

      {/* Slides */}
      <div className="flex-1 relative min-h-0 overflow-hidden" style={{ touchAction: "pan-y" }}>
        <div
          ref={trackRef}
          className="absolute inset-0 flex"
          style={{
            transform: `translateX(${offsetPct}%)`,
            transition: drag === 0 ? "transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="shrink-0 w-full h-full flex items-center justify-center"
              style={{ padding: `${SPACE[4]} ${SPACE[16]}` }}
            >
              <div className="w-full h-full flex items-center justify-center" style={{ containerType: "size" }}>
              {/* Only this photo and its neighbours are decoded. */}
              {Math.abs(i - index) <= 1 && (
                <ApiImage
                  src={src}
                  alt=""
                  draggable={false}
                  onClick={(e: React.MouseEvent) => {
                    /* A tap on the photo is not a request to close; a swipe
                       that ends on it is not a tap at all. */
                    e.stopPropagation();
                  }}
                  onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    if (w && h) setRatios((r) => (r[i] ? r : { ...r, [i]: w / h }));
                  }}
                  style={{
                    width: ratios[i] ? `min(100cqw, calc(100cqh * ${ratios[i]}))` : undefined,
                    height: "auto",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: theme.radiusLg,
                    boxShadow: SHADOW["2xl"],
                    transform: shown ? "scale(1)" : "scale(0.94)",
                    transition: "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    pointerEvents: "auto",
                  }}
                />
              )}
              </div>
            </div>
          ))}
        </div>

        {/* Side arrows — hidden at the ends rather than greyed out */}
        {count > 1 && index > 0 && (
          <button
            className="absolute top-1/2 -translate-y-1/2 cursor-pointer active:scale-90 transition-transform"
            style={{ ...glassBtn, insetInlineStart: SPACE[3] }}
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={t("survey.previous")}
          >
            <Prev size={32} />
          </button>
        )}
        {count > 1 && index < count - 1 && (
          <button
            className="absolute top-1/2 -translate-y-1/2 cursor-pointer active:scale-90 transition-transform"
            style={{ ...glassBtn, insetInlineEnd: SPACE[3] }}
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={t("survey.next")}
          >
            <Next size={32} />
          </button>
        )}
      </div>

      {/* Dots — each one jumps straight to its photo */}
      <div className="shrink-0 flex items-center justify-center" style={{ height: SPACE[10], gap: SPACE[1] }}>
        {count > 1 &&
          images.map((_, i) => (
            <button
              key={i}
              className="cursor-pointer flex items-center justify-center"
              style={{ height: SPACE[6], padding: "0 4px", background: "none", border: "none", outline: "none" }}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              aria-label={`${i + 1} / ${count}`}
            >
              <span
                style={{
                  display: "block",
                  height: "8px",
                  width: i === index ? SPACE[4] : "8px",
                  borderRadius: theme.radiusFull,
                  backgroundColor: i === index ? theme.textInverse : theme.textInverseMuted,
                  transition: "width 250ms ease, background-color 250ms ease",
                }}
              />
            </button>
          ))}
      </div>
    </div>
  );
}
