import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTheme, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";

import burjeelAdAr from "../../assets/Ads/Burjeel_dietitian_in_a_light_grey_hijab-2.jpg";
import burjeelAdEn from "../../assets/Ads/Nutrition_care_with_a_warm_grey_hijab-2.jpg";
import fakeehAdEn from "../../assets/Ads/Teal-hijab_nurse_caring_for_an_older_patient-1.jpg";
import fakeehAdAr from "../../assets/Ads/Teal-hijab_nurse_in_Fakeeh_home-care_ad-1.jpg";
import burjeelCheckupEn from "../../assets/Ads/burjeel-checkup-en.jpg";
import burjeelCheckupAr from "../../assets/Ads/burjeel-checkup-ar.jpg";
import fakeehPediatricEn from "../../assets/Ads/fakeeh-pediatric-en.jpg";
import fakeehPediatricAr from "../../assets/Ads/fakeeh-pediatric-ar.jpg";

/* ═══════════════════════════════════════════════════════════════════════════
 * ImageNotice — an image-only notification
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The admin sends a picture and nothing else: no card, no title, no button.
 * It sits on the dimmed screen, scaled to fit (never cropped) inside a
 * 1600 × 900 box — the recommended upload size shows 1:1 on the 1920 × 1080
 * canvas. Closed with the ✕ or a tap anywhere outside the picture.
 *
 * Demo content: two ads per hospital that has them, in English and Arabic.
 * Urdu falls back to the English artwork. Each ad's panel title is the i18n
 * key ad.<hospitalId>.<n> (n from 1).
 * ═══════════════════════════════════════════════════════════════════════════ */

const IMAGE_ADS: Record<string, { en: string; ar: string; alt: string }[]> = {
  burjeel: [
    { en: burjeelAdEn, ar: burjeelAdAr, alt: "Burjeel nutrition care" },
    { en: burjeelCheckupEn, ar: burjeelCheckupAr, alt: "Burjeel health check-ups" },
  ],
  dsfh: [
    { en: fakeehAdEn, ar: fakeehAdAr, alt: "Fakeeh home healthcare" },
    { en: fakeehPediatricEn, ar: fakeehPediatricAr, alt: "Fakeeh pediatric care" },
  ],
};

/** Ad number `n` (from 1) for this hospital in this language, or null. */
export function imageAdFor(hospitalId: string, locale: string, n = 1): { src: string; alt: string } | null {
  const ad = IMAGE_ADS[hospitalId]?.[n - 1];
  if (!ad) return null;
  return { src: locale === "ar" ? ad.ar : ad.en, alt: ad.alt };
}

/** "cta-ad-2" → 2; anything else → null. */
export function adNumberOf(notifId: string): number | null {
  const m = /^cta-ad-(\d+)$/.exec(notifId);
  return m ? Number(m[1]) : null;
}

const MAX_W = 1600;
const MAX_H = 900;

export function ImageNotice({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const { theme } = useTheme();
  const { isRTL } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
      style={{
        backgroundColor: theme.overlay,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: visible ? "scale(1)" : "scale(0.96)",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="block"
          style={{
            maxWidth: MAX_W,
            maxHeight: MAX_H,
            width: "auto",
            height: "auto",
            objectFit: "contain",
            borderRadius: theme.radiusMd,
            boxShadow: SHADOW.xl,
          }}
        />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          style={{
            top: -26,
            [isRTL ? "left" : "right"]: -26,
            width: 56,
            height: 56,
            borderRadius: theme.radiusFull,
            backgroundColor: theme.surface,
            border: "none",
            outline: "none",
            boxShadow: SHADOW.lg,
          }}
        >
          <X size={28} color={theme.textHeading} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
