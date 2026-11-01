import { useState, useEffect } from "react";
import { ApiImage } from "./ApiImage";
import { useTheme, SHADOW } from "./ThemeContext";
import { isAggressiveMemoryMode, isLowRamDevice } from "../lib/deviceCapability";

/**
 * AutoCarousel — fills its nearest `position: relative` parent completely.
 * Parent MUST have `position: relative` (or absolute/fixed) and defined dimensions.
 *
 * If only 1 image is provided, renders it statically with no animation.
 */
export function AutoCarousel({
  images,
  opacity = 1,
  objectPosition = "50% 15%",
  objectFit = "cover",
  intervalSeconds = 5,
  style = {},
  onImageClick,
  showDots = false,
  drift = false,
}: {
  images: string[];
  opacity?: number;
  objectPosition?: string;
  objectFit?: "cover" | "contain";
  intervalSeconds?: number;
  /** Extra inline styles on the container (e.g. zIndex) */
  style?: React.CSSProperties;
  onImageClick?: (url: string, index: number) => void;
  /** Small slide dots along the bottom edge — tells a touch user there are
   *  more photos to see (and so that the photo opens), with no badge on top. */
  showDots?: boolean;
  /** A slow zoom-and-pan on the photo (Ken Burns), so a still image reads as
   *  something to look at. Off on low-RAM devices and for reduced motion. */
  drift?: boolean;
}) {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);
  const validImages = images?.filter(Boolean) ?? [];

  // On low-RAM devices, only keep the previous/current/next layers mounted
  // instead of decoding EVERY wallpaper in the group at once. The 3-wide
  // window fully preserves the cross-fade (outgoing fades out, incoming was
  // already mounted as "next"), so transition quality is unchanged. High-RAM
  // devices mount all layers as before.
  const aggressive = isAggressiveMemoryMode();
  const drifting = drift && !isLowRamDevice();
  const driftStyle: React.CSSProperties = drifting
    ? { animation: "careinn-hero-drift 22s ease-in-out infinite alternate", willChange: "transform" }
    : {};
  const driftKeyframes = drifting ? (
    <style>{`
      @keyframes careinn-hero-drift {
        from { transform: scale(1) translate(0, 0); }
        to   { transform: scale(1.07) translate(-1.5%, -1%); }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*="careinn-hero-drift"] { animation: none !important; }
      }
    `}</style>
  ) : null;
  const isLayerMounted = (i: number, len: number): boolean => {
    if (!aggressive) return true;
    const prev = (index - 1 + len) % len;
    const next = (index + 1) % len;
    return i === index || i === prev || i === next;
  };

  useEffect(() => {
    if (validImages.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % validImages.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [validImages.length, intervalSeconds]);

  if (validImages.length === 0) return null;

  // Single image — no animation, just a plain fill
  if (validImages.length === 1) {
    return (
      <>
      {driftKeyframes}
      <ApiImage
        src={validImages[0]}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit,
          objectPosition,
          opacity,
          pointerEvents: onImageClick ? "auto" : "none",
          cursor: onImageClick ? "pointer" : "default",
          ...driftStyle,
          ...style,
        }}
        onClick={onImageClick ? () => onImageClick(validImages[0], 0) : undefined}
      />
      </>
    );
  }

  // Multiple images — cross-fade carousel
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: onImageClick ? "auto" : "none",
        cursor: onImageClick ? "pointer" : "default",
        ...style,
      }}
      onClick={onImageClick ? () => onImageClick(validImages[index], index) : undefined}
    >
      {driftKeyframes}
      {validImages.map((img, i) =>
        isLayerMounted(i, validImages.length) ? (
          <ApiImage
            key={i}
            src={img}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit,
              objectPosition,
              opacity: i === index ? opacity : 0,
              transition: "opacity 1s ease-in-out",
              ...driftStyle,
            }}
          />
        ) : null
      )}
      {showDots && (
        <div
          className="absolute flex items-center justify-center"
          style={{ left: 0, right: 0, bottom: "8px", gap: "5px", pointerEvents: "none" }}
        >
          {validImages.map((_, i) => (
            <span
              key={i}
              style={{
                display: "block",
                height: "6px",
                width: i === index ? "16px" : "6px",
                borderRadius: theme.radiusFull,
                backgroundColor: theme.textInverse,
                opacity: i === index ? 0.95 : 0.55,
                boxShadow: SHADOW.xl,
                transition: "width 400ms ease, opacity 400ms ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
