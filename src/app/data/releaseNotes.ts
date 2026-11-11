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
    version: "1.12.0",
    date: "2026-11-11",
    changes: [
      { type: "improved", area: "Azan", text: "The azan is silent by default. Patients can turn it on in Settings or during onboarding." },
      { type: "fixed", area: "PIN", text: "PIN popups are never cut off; the keypad no longer slides under \"Continue as Guest\"." },
    ],
  },
  {
    version: "1.11.0",
    date: "2026-11-09",
    changes: [
      { type: "improved", area: "Clear My Data", text: "The confirm popup lists what gets cleared, and confirming resets the screen and goes back to the login screen." },
      { type: "fixed", area: "Onboarding", text: "\"Start now\" goes straight to Home; only \"Start with a tour\" opens the tour." },
    ],
  },
  {
    version: "1.10.0",
    date: "2026-11-08",
    changes: [
      { type: "improved", area: "CareMe", text: "Every CareMe card with nothing to show has the same centred message with short text, such as \"No Care Plan Yet\" or \"No Data from HIS\"." },
      { type: "improved", area: "CareMe", text: "An empty discharge date reads \"Not set yet\"." },
      { type: "improved", area: "CareMe", text: "Shorter text on the locked results card: \"Enter your PIN to see your results\"." },
      { type: "new", area: "Nurse View", text: "Demo switches for the HIS connection and for previewing empty CareMe cards. They stay as set until switched off, and Restore puts the sample steps back." },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-11-08",
    changes: [
      { type: "new", area: "Patient Services", text: "A search box in every category, the same one Live TV has. Type a few letters to find an item." },
      { type: "new", area: "PIN", text: "The PIN row opens one place to change your PIN, update your NFC card or remove the PIN." },
      { type: "improved", area: "Popups", text: "Every popup shares one look: the same sizes, title bar and buttons, with Cancel first. PIN popups are centred; the others start with an icon." },
      { type: "improved", area: "Settings", text: "Settings is one list of rows: Language, Use my phone, Preferences, PIN and Care Team, then Log out and Clear My Data apart in red." },
      { type: "improved", area: "Settings", text: "Wi-Fi, Bluetooth and Cast: the on/off switch stays at the top, Scan again, and a red Disconnect for the connected device." },
      { type: "improved", area: "Settings", text: "Language opens a list with an Apply button, so it works with many languages." },
      { type: "improved", area: "Patient Services", text: "The request popup shows the category's icon and the item name as its title." },
      { type: "improved", area: "Use my phone", text: "The Use my phone popup is the same size as the other popups." },
      { type: "improved", area: "Wording", text: "Plainer text in popups, PIN, Bluetooth and Clear My Data." },
      { type: "fixed", area: "CareMe", text: "The discharge date reads \"Expected discharge\" in English and Urdu, as it already did in Arabic." },
      { type: "fixed", area: "Clear My Data", text: "The Arabic message now reads يتم تسجيل خروجك." },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-11-08",
    changes: [
      { type: "improved", area: "Dallah", text: "Dallah uses its brand cyan with white text on buttons, and the new Dallah Hospitals logo, with a white-text version in dark mode." },
      { type: "improved", area: "Apps", text: "The \"Keep an app private\" hint is simpler and follows each hospital's colours: hold the highlighted app, or tap Lock App." },
      { type: "improved", area: "Apps", text: "The lock on a locked app is larger, in the hospital's colours, and sits in the top corner." },
      { type: "improved", area: "News", text: "Between headlines, hospitals other than Fakeeh show a small dot instead of Fakeeh's mark." },
      { type: "fixed", area: "Apps", text: "The Arabic app-lock hint now says \"to lock it\" instead of \"to close it\"." },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-11-03",
    changes: [
      { type: "improved", area: "Settings", text: "Release notes stay short: the newest version is open, older ones are one line each (tap to open), and anything past the last 5 sits under \"Older versions\"." },
    ],
  },
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
