/**
 * carePartnerStore — who the patient has nominated to be with them.
 *
 * The Care Partner Programme used to be two questions inside the preferences
 * form. It is its own thing: an explanation, a decision, an agreement the
 * partner themselves accepts, and then a standing fact about the bed. That is
 * a state machine, not an answer to a question, so it gets its own record.
 *
 * Kept in localStorage next to the other patient-authored records. Nominations
 * written by the old form are read once and carried over, so a patient who
 * already named someone does not have to do it again.
 */

const KEY = "careinn-care-partner";
export const CARE_PARTNER_EVENT = "careinn-care-partner-changed";

export type CarePartnerStatus =
  /** Never asked, or the answer was cleared — show the explanation. */
  | "unasked"
  /** Asked and declined. Reversible at any time: a patient's circumstances
   *  change more often than a form does. */
  | "declined"
  /** Named, but the partner has not accepted yet — the screen is waiting to
   *  be handed over. */
  | "nominated"
  /** Named and accepted. This is the only state the ward should act on. */
  | "active";

export interface CarePartnerRecord {
  status: CarePartnerStatus;
  name: string;
  relationship: string;
  /** The ward rings this number, so it is required, exactly as on the form. */
  mobile: string;
  /** The partner's own signature, drawn on the bedside screen. */
  signature: string | null;
  /** The date on the signature line, as shown on the paper form. */
  signedOn: string;
  /** When the partner accepted, ISO — the machine's record of the same event. */
  agreedAt: string | null;
}

export const EMPTY_CARE_PARTNER: CarePartnerRecord = {
  status: "unasked",
  name: "",
  relationship: "",
  mobile: "",
  signature: null,
  signedOn: "",
  agreedAt: null,
};

/** The statements the care partner agrees to, numbered as on Dr. Soliman
 *  Fakeeh Hospital's own Care Partner Agreement Checklist. The words live in
 *  i18n under care.cp.item.N — this is only the count and the order, both of
 *  which come from the form and must not be rearranged. */
export const CARE_PARTNER_ITEMS = Array.from({ length: 14 }, (_, i) => i + 1);

export function readCarePartner(): CarePartnerRecord {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === "object" && typeof p.status === "string") {
        return { ...EMPTY_CARE_PARTNER, ...p };
      }
    }
  } catch {
    /* A corrupt record is the same as no record — the patient can name
       someone again, which is better than a screen that will not load. */
  }
  return { ...EMPTY_CARE_PARTNER };
}

export function writeCarePartner(next: CarePartnerRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* A failed write is a lost save, not a dead screen. */
  }
  window.dispatchEvent(new CustomEvent(CARE_PARTNER_EVENT));
}

/** Carry a nomination made in the old preferences form across, once. Called
 *  with whatever the preference record holds; does nothing if the patient has
 *  since answered here. */
export function adoptLegacyCarePartner(legacy?: { name?: string; relationship?: string } | null) {
  if (!legacy?.name?.trim() || !legacy?.relationship?.trim()) return;
  const current = readCarePartner();
  if (current.status !== "unasked") return;
  writeCarePartner({
    ...current,
    /* Nominated, not active: the old form never asked the partner to accept,
       so presenting it as agreed would put words in their mouth. */
    status: "nominated",
    name: legacy.name.trim(),
    relationship: legacy.relationship.trim(),
  });
}
