/**
 * Sizing for the PIN card, measured for the hardware it runs on.
 *
 * The bedside panel is a 15.6" touchscreen at 1920x1080 — roughly 141 px per
 * inch — reached from a bed, often one-handed, sometimes by someone whose
 * hands are not steady. A 64px key is about 11mm of glass, which is the
 * smallest target that can be hit reliably under those conditions; the 16px
 * gap is what keeps a missed press from landing on the neighbouring digit.
 *
 * Every PIN prompt in the app shares these numbers, so the pad feels the same
 * whichever screen raised it.
 */
export const PIN_METRICS = {
  /** Card width. Wide enough for the keypad to sit in its own space. */
  card: 430,
  /** Card padding, all four sides. */
  pad: 32,
  /** Key face — square, not the old 64x52 letterbox. */
  key: 64,
  /** Between keys: a miss lands on glass, not on the wrong digit. */
  keyGap: 16,
  /** Full-width action under the pad (Continue as Guest, Confirm). */
  action: 56,
  /** Close button's touch area — the WCAG floor, and the minimum the rest of
   *  the nurse interface already enforces. */
  close: 44,
  /** The visible disc inside that touch area. */
  closeDisc: 36,
  /** Filled/empty PIN dots. */
  dot: 18,
} as const;

/* Type sizes for the card. The title sits between the scale's 22 and 26: at
   arm's length on this panel 22 reads small for the one line that says what
   the dialog wants, and 26 crowds a 430px card. */
export const PIN_TYPE = {
  title: "24px",
  key: "24px",
  del: "15px",
} as const;
