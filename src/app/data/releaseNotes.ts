/**
 * Release notes — one entry per push to main, newest first.
 *
 * Every push to main is a version: bump "version" in package.json (it is the
 * "UI V…" number in Settings, via UI_VERSION) and add an entry here with the
 * same number. Minor bump (1.5.0 → 1.6.0) when the push adds or changes
 * something visible; patch (1.5.0 → 1.5.1) when it only fixes.
 *
 * Each change has a type (shown as New / Improved / Fixed groups, in that
 * order), the area of the app it touches, and one plain sentence.
 *
 * Shown under the version line at the bottom of Settings (the info icon).
 */
export type ChangeType = "new" | "improved" | "fixed";

export interface Change {
  type: ChangeType;
  /** Where in the app, as staff would name it: "Home", "Guest mode", … */
  area: string;
  text: string;
}

export interface Release {
  version: string;
  /** ISO date of the push, YYYY-MM-DD */
  date: string;
  changes: Change[];
}

export const CHANGE_TYPES: { type: ChangeType; label: string }[] = [
  { type: "new", label: "New" },
  { type: "improved", label: "Improved" },
  { type: "fixed", label: "Fixed" },
];

export const RELEASES: Release[] = [
  {
    version: "1.6.0",
    date: "2026-11-03",
    changes: [
      { type: "improved", area: "Greeting card", text: "Clear My Data is outline only, with the outline inside the button, and fills with the brand tint while pressed. Patient Login matches." },
      { type: "improved", area: "Settings", text: "Tighter spacing. The action buttons and the Clear Data / Log out pair sit closer together." },
      { type: "fixed", area: "CareInn", text: "Brand colours restored: navy #16274D and light blue #4EBEE3." },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-11-03",
    changes: [
      { type: "new", area: "Settings", text: "Version number with the list of changes in each version." },
      { type: "new", area: "Guest mode", text: "Same layout as the patient's. CareMe, Consultation, Patient Services, Meal Ordering and Your Feedback show locked and ask for Patient Login." },
      { type: "new", area: "Guest mode", text: "Guests can switch hospitals (demo)." },
      { type: "improved", area: "Home", text: "Even spacing: 24 between cards, 32 at the screen edges and between columns. The shortcuts column is one card wide." },
      { type: "improved", area: "Greeting card", text: "Tighter header. \"Hello\" lines up with the corner buttons and the chips sit closer to the name." },
      { type: "improved", area: "Patient Services", text: "Requested items show the item name only." },
      { type: "fixed", area: "Dialogs", text: "Cancel buttons keep their grey text with a clearer outline." },
    ],
  },
];
