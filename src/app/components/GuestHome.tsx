import type { CSSProperties } from "react";
import { useTheme, SHADOW, TEXT_STYLE, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useAuth } from "./AuthContext";
import { ConfirmDialog } from "./ConfirmDialog";
import { HeartIcon } from "./CareMe";
import { Heart, Lock, User } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
 * GUEST HOME — pieces for sessions entered via "Continue as Guest".
 * The dashboard keeps its patient layout: the greeting card is PatientGreeting
 * in its `guest` form, CareMe becomes a locked "Patient Access" card, and the
 * patient's own services stay in place but locked (see ServicesGrid). Anything
 * locked offers the same way back: Patient Login.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** The quiet card button — no fill, a thin brand outline drawn inside. Clear My Data
 *  and Patient Login share it, so the two cards' bottom buttons match. */
export function cardSecondaryButtonStyle(theme: { primaryOn: string; radiusMd: string }): CSSProperties {
  return {
    backgroundColor: "transparent",
    // Stroke drawn inside the edge (inset shadow, not a border), so the
    // button stays the same height as About Us.
    border: "none",
    boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${theme.primaryOn} 40%, transparent)`,
    outline: "none",
    borderRadius: theme.radiusMd,
    color: theme.primaryOn,
  };
}

/** Patient Login — ends the guest session and returns to the access-code screen. */
export function GuestLoginButton({ fit = false }: { fit?: boolean }) {
  const { theme } = useTheme();
  const { t, fontFamily } = useLocale();
  const { logout } = useAuth();

  return (
    <button
      data-nav="true"
      className={`flex items-center justify-center gap-2.5 ${fit ? "" : "w-full "}py-3 cursor-pointer active:scale-[0.96] transition-transform duration-150`}
      style={{ ...cardSecondaryButtonStyle(theme), ...(fit && { paddingInline: SPACE[4] }) }}
      onClick={(e) => {
        e.stopPropagation();
        logout();
      }}
    >
      <User size={20} strokeWidth={2} />
      <span style={{ fontFamily, ...TEXT_STYLE.buttonSm, letterSpacing: "0.3px" }}>
        {t("guest.home.patientLogin")}
      </span>
    </button>
  );
}

/** Asked when a guest taps a locked service: log in as the patient, or carry on. */
export function GuestLoginPrompt({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const { logout } = useAuth();

  return (
    <ConfirmDialog
      visible={visible}
      icon={Lock}
      title={t("guest.locked.title")}
      message={t("guest.locked.message")}
      confirmLabel={t("guest.home.patientLogin")}
      cancelLabel={t("lock.guest.button")}
      onConfirm={() => {
        onClose();
        logout();
      }}
      onCancel={onClose}
    />
  );
}

/* ─── CareMe, locked for guests ───
 * Same card, header and padding as CareMe, so the column keeps its shape; the
 * body says what is behind it and how to get there. */
export function GuestCareMeCard() {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div
      dir={dir}
      className="flex flex-col overflow-hidden flex-1 min-h-0"
      style={{
        backgroundColor: theme.engagementSurface,
        backgroundImage: theme.engagementCardGradient,
        borderRadius: theme.radiusCard,
        boxShadow: SHADOW.md,
        border: theme.engagementCardBorder,
      }}
    >
      <div
        className="shrink-0 flex items-center justify-between gap-2"
        style={{ padding: "22px 22px 12px", borderBottom: `1px solid ${theme.borderSubtle}` }}
      >
        <div className="flex items-center min-w-0" style={{ gap: "10px" }}>
          <HeartIcon />
          <span style={{ fontFamily: theme.fontFamily, ...TEXT_STYLE.sectionTitle, color: theme.textHeading }}>CareMe</span>
        </div>
        <Lock size={20} strokeWidth={2} style={{ color: theme.primaryOn }} />
      </div>

      <div
        className="flex-1 min-h-0 flex flex-col items-center justify-center text-center"
        style={{ padding: `${SPACE[2]} ${SPACE[3]}`, gap: SPACE[1] }}
      >
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{
            width: SPACE[8],
            height: SPACE[8],
            borderRadius: theme.radiusFull,
            backgroundColor: theme.primarySubtle,
            marginBottom: SPACE[1],
          }}
        >
          <Heart size={30} strokeWidth={2} style={{ color: theme.primaryOn }} />
          <span
            className="absolute flex items-center justify-center"
            style={{
              bottom: 10,
              insetInlineEnd: 10,
              width: 22,
              height: 22,
              borderRadius: theme.radiusFull,
              backgroundColor: theme.surface,
            }}
          >
            <Lock size={13} strokeWidth={2.6} style={{ color: theme.primaryOn }} />
          </span>
        </div>
        <span style={{ fontFamily, ...TEXT_STYLE.cardTitle, color: theme.textHeading }}>
          {t("guest.careMe.access.title")}
        </span>
        <span style={{ fontFamily, ...TEXT_STYLE.body, color: theme.textMuted, maxWidth: 280 }}>
          {t("guest.careMe.access.message")}
        </span>
        {/* Sized to its label and kept with the message it answers */}
        <div style={{ marginTop: SPACE[2] }}>
          <GuestLoginButton fit />
        </div>
      </div>
    </div>
  );
}
