import type { Locale } from "../i18n";

/** A line of a form, in the languages the hospital supplies it in.
 *
 *  `ar` is optional on purpose: a form the ward only has in English still has
 *  to be usable, and the reader disables its language toggle rather than
 *  showing a half-translated document to a family member. */
export interface FormText {
  en: string;
  ar?: string;
}

export interface FormSection {
  heading?: FormText;
  /** Rendered as a numbered or bulleted list under the heading. */
  clauses: FormText[];
}

export interface FormDef {
  id: string;
  title: FormText;
  intro?: FormText;
  sections: FormSection[];
  /** Who signs it, beyond the patient. */
  signerLabel: FormText;
  /** Ask for the signer's relationship to the patient as well as their name. */
  askRelationship: boolean;
}

/** True when every line of the form exists in that language. A form is offered
 *  in a language only if it is complete in it — a document that switches to
 *  English halfway through is not a translation. */
export function formHasLocale(form: FormDef, locale: Locale): boolean {
  if (locale === "en") return true;
  if (locale !== "ar") return false;
  if (form.intro && !form.intro.ar) return false;
  return form.sections.every(
    (s) => (!s.heading || !!s.heading.ar) && s.clauses.every((c) => !!c.ar),
  );
}

export function pick(text: FormText, locale: Locale): string {
  return locale === "ar" && text.ar ? text.ar : text.en;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * The forms themselves.
 *
 * Content only — the reader, the language toggle and the signature pad are all
 * driven from this file, so replacing a form's wording is an edit here and
 * nothing else. Add `ar` to every line of a form and it becomes bilingual on
 * its own; leave it off and the reader stays in English for that form.
 * ═══════════════════════════════════════════════════════════════════════════ */
export const NURSE_FORMS: FormDef[] = [
  {
    id: "care-partner-agreement",
    title: {
      en: "Care Partner Agreement",
      ar: "اتفاقية شريك الرعاية",
    },
    intro: {
      en: "Your care partner is a family member or friend who takes an active part in your care. Please review the agreement below together.",
      ar: "شريك الرعاية هو أحد أفراد الأسرة أو صديق يشارك بفعالية في رعايتك. يرجى مراجعة الاتفاقية أدناه معاً.",
    },
    signerLabel: { en: "Care partner", ar: "شريك الرعاية" },
    askRelationship: true,
    sections: [
      {
        clauses: [
          {
            en: "The care partner may join rounds, handovers and education sessions with your consent.",
            ar: "يمكن لشريك الرعاية حضور الجولات والتسليم والجلسات التثقيفية بموافقتك.",
          },
          {
            en: "The care partner will follow hospital infection prevention, safety and visiting rules.",
            ar: "يلتزم شريك الرعاية بقواعد مكافحة العدوى والسلامة والزيارة في المستشفى.",
          },
          {
            en: "Your medical information will be shared with the care partner only as far as you allow.",
            ar: "لن تتم مشاركة معلوماتك الطبية مع شريك الرعاية إلا بالقدر الذي تسمح به.",
          },
          {
            en: "You may withdraw from the program at any time by telling your nurse.",
            ar: "يمكنك الانسحاب من البرنامج في أي وقت بإبلاغ الممرض/الممرضة.",
          },
        ],
      },
    ],
  },
  {
    id: "patient-education",
    title: { en: "Patient & Family Education Record" },
    intro: {
      en: "Record of the education given to the patient and their family during this admission.",
    },
    signerLabel: { en: "Patient / family member" },
    askRelationship: true,
    sections: [
      {
        heading: { en: "Topics covered" },
        clauses: [
          { en: "Diagnosis and plan of care" },
          { en: "Medication: purpose, dose, timing and side effects" },
          { en: "Diet and nutrition" },
          { en: "Safe mobility and fall prevention" },
          { en: "Infection prevention and hand hygiene" },
          { en: "Equipment or devices used at home" },
          { en: "Follow-up appointments and who to contact" },
        ],
      },
      {
        heading: { en: "Confirmation" },
        clauses: [
          { en: "The above topics were explained in a language I understand." },
          { en: "I had the opportunity to ask questions and my questions were answered." },
          { en: "I can describe what I have been taught and what to do at home." },
        ],
      },
    ],
  },
];
