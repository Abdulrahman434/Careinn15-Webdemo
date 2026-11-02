import { useState, useEffect, useRef } from "react";
import { fetchPatientForDevice } from "../lib/hospitalApi";
import { isAndroidApp, getDeviceInfo } from "../utils/androidBridge";
import { useTheme, WEIGHT, SHADOW, TEXT_STYLE, SPACE, LEADING } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useRipple } from "./useRipple";
import { HelpCircle, LogOut } from "lucide-react";
import { AutoCarousel } from "./AutoCarousel";
import { useNurseStore } from "./NurseDataStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { useGuestMode } from "../lib/guestMode";
import { useAuth } from "./AuthContext";
import svgPaths from "../../imports/svg-ca68x68c4i";
import { getSavedHeroImage, isSlideshowEnabled } from "../lib/backgroundPrefs";
import { usePatientInfo } from "../lib/usePatientInfo";
import { clearUserDataAndReload } from "../lib/clearAllData";

function AboutUsIcon({ color }: { color?: string }) {
  const { theme } = useTheme();
  const iconColor = color || theme.primary;
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="block size-full" fill="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip_about_greeting)">
          <path d={svgPaths.p14d24500} stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 13.3333V10" stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 6.66667H10.0083" stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip_about_greeting">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

/* Cleaning brush for Clear My Data — the "clean up" mark cleaners use
   (Material's cleaning_services, the CCleaner-style brush) instead of a
   trash can, which reads as deleting something of the patient's.
   Lucide "brush-cleaning" (ISC), inlined: it is newer than the
   lucide-react version this project pins. */
function BrushCleaningIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden>
      <path d="m16 22-1-4" />
      <path d="M19 14a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1" />
      <path d="M19 14H5l-1.973 6.767A1 1 0 0 0 4 22h16a1 1 0 0 0 .973-1.233z" />
      <path d="m8 22 1-4" />
    </svg>
  );
}

export function PatientGreeting({
  onOpenAboutUs, 
  onOpenTour, 
  fillImage,
  showAboutUs = true,
  onImageTap
}: { 
  onOpenAboutUs?: () => void; 
  onOpenTour?: () => void; 
  fillImage?: boolean;
  showAboutUs?: boolean;
  onImageTap?: (url: string, images: string[], index: number, origin?: { x: number; y: number }) => void;
}) {
  const [pressed, setPressed] = useState(false);
  /* Where the photo sits on the canvas, as percentages — the gallery grows
     out of that spot, so the first tap teaches that the photo opens. */
  const photoRef = useRef<HTMLDivElement>(null);
  const photoOrigin = () => {
    const el = photoRef.current;
    const canvas = document.getElementById("careinn-canvas");
    if (!el || !canvas) return undefined;
    const r = el.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    return {
      x: ((r.left + r.width / 2 - c.left) / c.width) * 100,
      y: ((r.top + r.height / 2 - c.top) / c.height) * 100,
    };
  };
  const [showSignOutAppsConfirm, setShowSignOutAppsConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const rippleElements = useRipple(theme.primarySubtle).rippleElements;
  const { isGuest } = useGuestMode();
  const { logout } = useAuth();
  // Read below by the name tap, which opens the care team. The import was
  // here and the hook was never called, so tapping the patient's own name
  // threw rather than showing who is looking after them.
  const nurseStore = useNurseStore();

  const {
    patient: p,
    displayName,
    displayMrn,
    displayRoom,
    displayBed,
    displayAdmit,
  } = usePatientInfo();

  // Hero image fallback chain:
  // 1. User-saved image from Backgrounds preferences
  // 2. theme.heroImageUrls (hardcoded per hospital brand)
  const [heroImages, setHeroImages] = useState<string[]>(() => {
    const saved = getSavedHeroImage();
    if (saved && !isSlideshowEnabled()) return [saved];
    return theme.heroImageUrls ?? [];
  });

  // Follow the hospital's photos when the brand changes (e.g. after login).
  const themeHeroKey = (theme.heroImageUrls ?? []).join("|");
  useEffect(() => {
    const saved = getSavedHeroImage();
    setHeroImages(saved && !isSlideshowEnabled() ? [saved] : theme.heroImageUrls ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeHeroKey]);

  useEffect(() => {
    const onHeroChange = (e: Event) => {
      const url = (e as CustomEvent<string | null>).detail;
      if (url) setHeroImages([url]);
      else setHeroImages(theme.heroImageUrls ?? []);
    };
    const onSlideshowChange = (e: Event) => {
      const enabled = (e as CustomEvent<boolean>).detail;
      if (enabled) setHeroImages(theme.heroImageUrls ?? []);
    };
    window.addEventListener("hero-image-changed",  onHeroChange);
    window.addEventListener("slideshow-changed",    onSlideshowChange);
    return () => {
      window.removeEventListener("hero-image-changed",  onHeroChange);
      window.removeEventListener("slideshow-changed",    onSlideshowChange);
    };
  }, [theme.heroImageUrls]);

  return (
    <div
      className={`relative overflow-hidden w-full ${fillImage ? "flex-1 flex flex-col min-h-0" : "shrink-0"}`}
      style={{
        textAlign: isRTL ? "right" : "left",
        backgroundColor: theme.engagementSurface,
        backgroundImage: theme.engagementCardGradient,
        borderRadius: theme.radiusCard,
        boxShadow: SHADOW.md,
        border: theme.engagementCardBorder,
      }}
    >
      {rippleElements}

      {/* Help / App Tour + Log out (Log out is also in Settings) */}
      <div
        className="absolute flex items-center z-10"
        style={{ [isRTL ? "left" : "right"]: SPACE[2], top: SPACE[2], gap: SPACE[1] }}
      >
      <button
        className="flex items-center justify-center rounded-full cursor-pointer active:scale-90 transition-transform"
        style={{
          width: theme.touchTargetMin,
          height: theme.touchTargetMin,
          backgroundColor: theme.primarySubtle,
          border: "none",
          outline: "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenTour?.();
        }}
        aria-label="Application Tour"
      >
        <HelpCircle size={20} style={{ color: theme.primaryOn }} strokeWidth={2} />
      </button>
      {!isGuest && (
        <button
          className="flex items-center justify-center rounded-full cursor-pointer active:scale-90 transition-transform"
          style={{
            width: theme.touchTargetMin,
            height: theme.touchTargetMin,
            backgroundColor: theme.errorSubtle,
            border: "none",
            outline: "none",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowLogoutConfirm(true);
          }}
          aria-label={t("general.logout")}
          title={t("general.logout")}
        >
          <LogOut size={20} style={{ color: theme.errorOn, transform: isRTL ? "scaleX(-1)" : undefined }} strokeWidth={2} />
        </button>
      )}
      </div>

      {/* Text content */}
      <div style={{ padding: `${theme.cardPadding} ${theme.cardPadding} ${SPACE[2]} ${theme.cardPadding}` }}>
        {/* "Hello" shares the row with the corner buttons, so the name below
            starts clear of them and can use the card's full width. */}
        <p
          className="flex items-center"
          style={{
            fontFamily: fontFamily,
            ...TEXT_STYLE.subtitle,
            fontWeight: WEIGHT.medium,
            color: theme.textMuted,
            minHeight: `calc(${SPACE[2]} + ${theme.touchTargetMin} - ${theme.cardPadding})`,
          }}
        >
          {t("general.hello")}
        </p>
        {!isGuest && (
          <p
            className="cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              fontFamily: fontFamily,
              ...TEXT_STYLE.display,
              /* One line always — a long name ends in "…" rather than wrap.
                 The clip that makes the "…" also cut Arabic descenders (ح, ع)
                 at display leading, so Arabic/Urdu get room below the line. */
              ...(isRTL && { lineHeight: LEADING.normal, letterSpacing: 0 }),
              fontWeight: WEIGHT.extrabold,
              color: theme.textHeading,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            onClick={() => {
              const careTeam = nurseStore.careTeam.filter(m => m.visible);
              const staffList = careTeam.map(m => ({
                name: t(m.nameKey),
                role: t(m.roleKey),
                img: m.img,
              }));
              (window as any).__demoRtlsToast?.(staffList.length ? staffList : undefined);
            }}
          >
            {displayName}
          </p>
        )}
        {/* Badges: [MRN] [Room] [Bed] */}
        {!isGuest && (
          <div className="flex items-center flex-wrap gap-2" style={{ paddingTop: SPACE[2] }}>
            <div
              className="flex items-center px-3 py-1.5 cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: theme.primarySubtle, borderRadius: theme.radiusFull }}
              onClick={() => (window as any).__demoHkToast?.()}
            >
              <span
                style={{
                  fontFamily: fontFamily,
                  ...TEXT_STYLE.pill,
                  color: theme.primaryOn,
                }}
              >
                {t("greeting.mrn")} {displayMrn}
              </span>
            </div>
            <div
              className="flex items-center px-3 py-1.5 cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: theme.primarySubtle, borderRadius: theme.radiusFull }}
              onClick={() => (window as any).__demoMealToast?.()}
            >
              <span
                style={{
                  fontFamily: fontFamily,
                  ...TEXT_STYLE.pill,
                  color: theme.primaryOn,
                }}
              >
                {t("greeting.room", displayRoom)}
              </span>
            </div>
            {displayBed && (
              <div
                className="flex items-center px-3 py-1.5"
                style={{
                  backgroundColor: theme.primarySubtle,
                  borderRadius: theme.radiusFull,
                }}
              >
                <span style={{
                  fontFamily,
                  ...TEXT_STYLE.pill,
                  color: theme.primaryOn,
                }}>
                  {t("greeting.bed")} {displayBed}
                </span>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Hospital image */}
      <div
        ref={photoRef}
        className={`overflow-hidden mx-4 mb-4 ${fillImage ? "flex-1 min-h-[120px]" : "shrink-0"} ${
          onImageTap ? "cursor-pointer active:scale-[0.99] transition-all duration-200" : ""
        }`}
        style={{
          height: fillImage ? undefined : SPACE[12],
          borderRadius: theme.radiusLg,
          position: "relative",
        }}
      >
        <AutoCarousel
          images={heroImages}
          objectPosition={theme.welcomeImagePosition || theme.heroCropPosition || "50% 15%"}
          objectFit="cover"
          intervalSeconds={theme.slideshowInterval}
          onImageClick={onImageTap ? (url, i) => onImageTap(url, heroImages, i, photoOrigin()) : undefined}
          showDots={!!onImageTap}
          drift
        />
      </div>

      {/* About Us — pill below image */}
      {showAboutUs && (
        <div className="mx-4 mb-4" style={{ position: "relative", zIndex: 10 }}>
          <button
            data-nav="true"
            className="flex items-center justify-center gap-2.5 w-full py-3 cursor-pointer transition-transform duration-150"
            style={{
              backgroundColor: pressed ? theme.primaryDark : theme.primary,
              transform: pressed ? "scale(0.96)" : "scale(1)",
              border: "none",
              outline: "none",
              borderRadius: theme.radiusMd,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenAboutUs?.();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setPressed(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setPressed(false);
            }}
            onPointerLeave={() => setPressed(false)}
          >
            <AboutUsIcon color={theme.brandOnPrimary} />
            <span
              style={{
                fontFamily: fontFamily,
                ...TEXT_STYLE.buttonSm,
                color: theme.brandOnPrimary,
                letterSpacing: "0.3px",
              }}
            >
              {t("general.aboutUs")}
            </span>
          </button>
        </div>
      )}

      {/* Clear My Data — the patient-facing clear, as the quiet partner of
          About Us. Only the light clear (apps, browser, logins); the factory
          reset stays staff-only in Settings. */}
      <div className="mx-4 mb-4" style={{ position: "relative", zIndex: 10 }}>
        <button
          data-nav="true"
          className="flex items-center justify-center gap-2.5 w-full py-3 cursor-pointer active:scale-[0.96] transition-transform duration-150"
          style={{
            backgroundColor: theme.primarySubtle,
            border: `1.5px solid color-mix(in srgb, ${theme.primaryOn} 40%, transparent)`,
            outline: "none",
            borderRadius: theme.radiusMd,
            color: theme.primaryOn,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowSignOutAppsConfirm(true);
          }}
        >
          <BrushCleaningIcon size={20} />
          <span
            style={{
              fontFamily: fontFamily,
              ...TEXT_STYLE.buttonSm,
              letterSpacing: "0.3px",
            }}
          >
            {t("settings.clearData.btn.clearMyData")}
          </span>
        </button>
      </div>

      <ConfirmDialog
        visible={showSignOutAppsConfirm}
        title={t("settings.clearData.clearMyData.title")}
        message={t("settings.clearData.clearMyData.desc")}
        confirmLabel={t("settings.clearData.btn.clearMyData")}
        variant="danger"
        onConfirm={() => {
          setShowSignOutAppsConfirm(false);
          clearUserDataAndReload();
        }}
        onCancel={() => setShowSignOutAppsConfirm(false)}
      />

      <ConfirmDialog
        visible={showLogoutConfirm}
        title={t("general.logout")}
        message={t("settings.account.overview.removeConfirm")}
        confirmLabel={t("general.logout")}
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
