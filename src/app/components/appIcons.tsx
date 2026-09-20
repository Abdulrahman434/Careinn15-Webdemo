import { createLucideIcon, type LucideIcon } from "lucide-react";

/**
 * Glyphs the icon set does not carry, drawn to sit beside it: same 24x24 box,
 * same monoline stroke, same rounded caps, so they read as one family.
 */

/**
 * A nurse: the cap, with its cross, over a head and shoulders.
 *
 * The directory had this row wearing a bed, then a stethoscope — a bed is the
 * patient's own room and a stethoscope is any clinician. The cap is the one
 * thing that says nurse at a glance, which is what the patient is looking for
 * when they run down a list of extensions.
 *
 * The cross is drawn thinner than the rest: at this size a 2px arm inside a
 * cap that is 5 units wide fills it in, and the plus turns into a blot.
 */
export const NurseIcon: LucideIcon = createLucideIcon("Nurse", [
  ["path", { d: "M5.9 8.4 L8.2 3.4 A1.5 1.5 0 0 1 9.6 2.5 h4.8 a1.5 1.5 0 0 1 1.4 .9 L18.1 8.4 Z", key: "cap" }],
  ["path", { d: "M12 4.2 v3.2", strokeWidth: 1.3, key: "cross-v" }],
  ["path", { d: "M10.4 5.8 h3.2", strokeWidth: 1.3, key: "cross-h" }],
  ["path", { d: "M9.5 8.4 v0.3 a2.5 2.5 0 0 0 5 0 v-0.3", key: "face" }],
  ["path", { d: "M5 20.5 a7 7 0 0 1 14 0", key: "shoulders" }],
]);

/* The sparkle on the home screen's Patient Services tile. It was drawn at 20
   units and is kept at 20 rather than redrawn, so the tile, the module header
   and the housekeeping toast are the same artwork and not three near-misses. */
const SPARKLE_PATHS = [
  "M8.28083 12.9167C8.20643 12.6283 8.05612 12.3651 7.84551 12.1545C7.63491 11.9439 7.37173 11.7936 7.08333 11.7192L1.97083 10.4008C1.88361 10.3761 1.80684 10.3235 1.75218 10.2512C1.69751 10.1789 1.66794 10.0907 1.66794 10C1.66794 9.90933 1.69751 9.82113 1.75218 9.7488C1.80684 9.67646 1.88361 9.62392 1.97083 9.59917L7.08333 8.28C7.37162 8.20567 7.63474 8.05548 7.84533 7.84503C8.05593 7.63459 8.2063 7.37157 8.28083 7.08333L9.59917 1.97083C9.62367 1.88327 9.67615 1.80612 9.7486 1.75116C9.82105 1.69621 9.90948 1.66646 10.0004 1.66646C10.0913 1.66646 10.1798 1.69621 10.2522 1.75116C10.3247 1.80612 10.3772 1.88327 10.4017 1.97083L11.7192 7.08333C11.7936 7.37173 11.9439 7.63491 12.1545 7.84551C12.3651 8.05612 12.6283 8.20643 12.9167 8.28083L18.0292 9.59833C18.1171 9.62258 18.1946 9.67501 18.2499 9.74756C18.3051 9.82012 18.335 9.9088 18.335 10C18.335 10.0912 18.3051 10.1799 18.2499 10.2524C18.1946 10.325 18.1171 10.3774 18.0292 10.4017L12.9167 11.7192C12.6283 11.7936 12.3651 11.9439 12.1545 12.1545C11.9439 12.3651 11.7936 12.6283 11.7192 12.9167L10.4008 18.0292C10.3763 18.1167 10.3238 18.1939 10.2514 18.2488C10.179 18.3038 10.0905 18.3335 9.99958 18.3335C9.90865 18.3335 9.82021 18.3038 9.74777 18.2488C9.67532 18.1939 9.62284 18.1167 9.59833 18.0292L8.28083 12.9167Z",
  "M16.6667 2.5V5.83333",
  "M18.3333 4.16667H15",
  "M3.33333 14.1667V15.8333",
  "M4.16667 15H2.5",
];

/** Patient Services — the same sparkle the home screen tile wears. */
export function PatientServicesIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.66667,
}: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {SPARKLE_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      ))}
    </svg>
  );
}
