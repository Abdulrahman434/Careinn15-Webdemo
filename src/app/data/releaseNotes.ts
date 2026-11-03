/**
 * Release notes — one entry per push to main, newest first.
 *
 * Every push to main is a version: bump "version" in package.json (it is the
 * "UI V…" number in Settings, via UI_VERSION) and add an entry here with the
 * same number, listing what changed in plain words. Minor bump (1.5.0 → 1.6.0)
 * when the push adds or changes something visible; patch (1.5.0 → 1.5.1) when
 * it only fixes.
 *
 * Shown under the version line at the bottom of Settings.
 */
export interface Release {
  version: string;
  /** ISO date of the push, YYYY-MM-DD */
  date: string;
  changes: string[];
}

export const RELEASES: Release[] = [
  {
    version: "1.5.0",
    date: "2026-11-03",
    changes: [
      "Settings shows the version number, and tapping it lists what changed in each version.",
      "Home: one spacing system. Even 24 gaps between cards, 32 at the screen edges and between columns; the shortcuts column is now exactly one card wide.",
      "Guest mode keeps the patient layout: welcome card with Patient Login, CareMe shows as Patient Access, and Consultation, Patient Services, Meal Ordering and Your Feedback show locked and ask for patient login.",
      "Guest mode: guests can switch hospitals (demo).",
      "Greeting card: tighter header. \"Hello\" lines up with the corner buttons and the chips sit closer to the name.",
      "Patient Services: requested items show the item name only, without an icon.",
      "Dialogs: Cancel buttons keep their grey text with a clearer outline.",
    ],
  },
];
