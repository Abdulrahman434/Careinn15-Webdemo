import type { Locale } from "./i18n";

/**
 * The hospital's Patient Goal of the Day list, in its order, in both of the
 * languages the hospital gave for it.
 *
 * Shared, because the patient picks from it and the ward reads back what was
 * picked — two screens quoting one list, which has to be the same list.
 *
 * English is what gets STORED, whichever language it was chosen in. A goal is
 * one answer, and it should not become a different record because the patient
 * had the screen in Arabic; the ward reads its round in English either way,
 * and the bedside card translates on the way out. A goal typed in the free
 * box is stored exactly as typed, in whatever language it was typed in.
 *
 * Urdu is not here. The hospital supplied English and Arabic, and a clinical
 * goal a ward will act on is not a thing to paraphrase without being given
 * the words — so ur falls back to English until it is.
 */
export interface CareGoal {
  /** Canonical, and what is stored. */
  en: string;
  ar: string;
}

export const CARE_GOALS: CareGoal[] = [
  { en: "Relief of symptoms (e.g. fever, cough, diarrhea, cramps, others)", ar: "تخفيف الاعراض مثل الحرارة والسعال والاسهال والمغص" },
  { en: "Manage pain effectively", ar: "تخفيف الالم والسيطرة عليه" },
  { en: "Improve breathing comfort", ar: "التنفس بسهولة وراحة اكبر" },
  { en: "Wean oxygen support when clinically appropriate", ar: "تقليل الحاجة للاكسجين المساعد تدريجيا عندما تسمح الحالة الصحية" },
  { en: "Maintain stable vital signs", ar: "الحفاظ على استقرار العلامات الحيوية مثل الضغط والنبض والحرارة" },
  { en: "Maintain safety (e.g. free from falls, pressure injury, hospital acquired infections)", ar: "الحفاظ على السلامة والوقاية من السقوط وتقرحات الفراش والعدوى داخل المستشفى" },
  { en: "Prevent postoperative complications", ar: "الوقاية من المضاعفات بعد العملية" },
  { en: "Complete procedure safely (e.g. comfort during procedure, no complications)", ar: "اتمام الفحص او الاجراء الطبي بسلامة وراحة ودون مضاعفات" },
  { en: "Improve/Maintain oral intake and hydration", ar: "تناول الطعام وشرب السوائل بشكل كاف عن طريق الفم" },
  { en: "Tolerate prescribed diet/ Advance diet as tolerated", ar: "تناول الطعام الموصوف دون انزعاج / التدرج في الطعام حسب القدرة على التحمل" },
  { en: "Resume diet when medically appropriate", ar: "العودة لتناول الطعام عندما تسمح الحالة الصحية" },
  { en: "Participate in feeding with nurse support", ar: "المشاركة في التغذية بمساعدة طاقم التمريض" },
  { en: "Bottle feed effectively", ar: "رضاعة الطفل بشكل جيد من زجاجة الرضاعة" },
  { en: "Establish/ Initiate breastfeeding/ Breastfeed effectively", ar: "بدء الرضاعة الطبيعية / مساعدة الطفل على الرضاعة الطبيعية بشكل جيد" },
  { en: "Monitor urine and stool output", ar: "متابعة كمية البول والتبرز" },
  { en: "Void without difficulty", ar: "التبول بسهولة" },
  { en: "Improve sleep/ Sleep with minimal interruption", ar: "النوم بشكل افضل وباقل قدر من الانقطاع" },
  { en: "Improve mobility/ Ambulate safely/ Ambulate with assistance", ar: "تحسين الحركة / المشي بامان / المشي بمساعدة" },
  { en: "Prepare for discharge", ar: "الاستعداد للخروج من المستشفى" },
  { en: "Complete newborn screening/ Complete hearing screening/ Complete bilirubin screening", ar: "استكمال فحوصات المولود / فحص السمع / فحص الصفار" },
  { en: "Participate in treatment plan", ar: "المشاركة في خطة العلاج" },
  { en: "Attend group therapy", ar: "حضور جلسات العلاج الجماعي" },
  { en: "Verbalize feelings or concerns", ar: "التحدث عن المشاعر او المخاوف" },
  { en: "Reduce anxiety", ar: "تخفيف القلق" },
  { en: "Improve mood", ar: "تحسين المزاج" },
  { en: "Use coping strategies", ar: "استخدام طرق تساعد على التعامل مع الضغوط والمشاعر الصعبة" },
  { en: "Take medications as prescribed", ar: "تناول الادوية حسب تعليمات الطبيب" },
  { en: "Continue skin-to-skin contact", ar: "الاستمرار في احتضان الطفل بحيث تلامس بشرته بشرة الام او الاب مباشرة" },
  { en: "Provide skin-to-skin care", ar: "احتضان الطفل بحيث تلامس بشرته بشرة الام او الاب مباشرة" },
  { en: "Provide comfort measures during care", ar: "تهدئة الطفل ومساعدته على الشعور بالراحة اثناء الرعاية" },
  { en: "Provide verbal interaction for developmental support", ar: "التحدث مع الطفل لدعم نموه وتطوره" },
  { en: "Provide gentle touch as guided by nurse", ar: "لمس الطفل بلطف حسب توجيهات طاقم التمريض" },
  { en: "Assist with diaper or clothing change", ar: "المساعدة في تغيير حفاض الطفل او ملابسه" },
  { en: "Maintain stable body temperature", ar: "الحفاظ على استقرار درجة حرارة الجسم" },
  { en: "Promote bonding with parent/ Bond with newborn", ar: "تعزيز القرب والتواصل بين الطفل ووالديه" },
  { en: "Rooming-in with mother/parents", ar: "بقاء المولود في الغرفة نفسها مع الام او الوالدين" },
  { en: "Vaginal birth", ar: "الولادة الطبيعية" },
  { en: "Safe delivery", ar: "اتمام الولادة بسلامة" },
  { en: "Manage labor pain/ Progress in labor", ar: "تخفيف الم الطلق / التقدم في مراحل الولادة" },
  { en: "Maintain maternal safety/ Maintain fetal well-being", ar: "الحفاظ على سلامة الام / الاطمئنان على صحة الجنين" },
  { en: "Effective pushing", ar: "الدفع بشكل صحيح اثناء الولادة" },
  { en: "Stable recovery after delivery", ar: "التعافي واستقرار الحالة الصحية بعد الولادة" },
  { en: "Control postpartum bleeding/vaginal bleeding", ar: "السيطرة على نزيف ما بعد الولادة / النزيف المهبلي" },
  { en: "Manage incision or perineal discomfort", ar: "تخفيف الالم والانزعاج في مكان الجرح او المنطقة بين المهبل والشرج" },
  { en: "Learn postpartum self-care", ar: "تعلم كيفية العناية بالنفس بعد الولادة" },
];

const BY_EN = new Map(CARE_GOALS.map((g) => [g.en, g]));

/** Whether a stored goal came from the list or was typed into the free box. */
export function isListedGoal(goal: string): boolean {
  return BY_EN.has(goal);
}

/**
 * How a stored goal should read on screen.
 *
 * Anything not in the list is something the patient wrote, and is shown back
 * exactly as they wrote it — translating somebody's own words at them would
 * be worse than leaving them alone.
 */
export function careGoalLabel(goal: string, locale: Locale): string {
  const found = BY_EN.get(goal);
  if (!found) return goal;
  return locale === "ar" ? found.ar : found.en;
}
