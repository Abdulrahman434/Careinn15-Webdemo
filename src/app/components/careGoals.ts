/**
 * The hospital's Patient Goal of the Day list, in its order and its wording.
 *
 * Shared, because the patient picks from it and the ward reads back what was
 * picked — two screens quoting one list, which has to be the same list.
 *
 * Not translated. These are the clinical phrases off the hospital's own form,
 * and a goal a ward will act on is not a thing to paraphrase into Arabic
 * without the hospital saying what the Arabic should be. The free-text answer
 * beside them takes whatever a patient types, in any language.
 */
export const CARE_GOALS = [
  "Relief of symptoms (e.g. fever, cough, diarrhea, cramps, others)",
  "Manage pain effectively",
  "Improve breathing comfort",
  "Wean oxygen support when clinically appropriate",
  "Maintain stable vital signs",
  "Maintain safety (e.g. free from falls, pressure injury, hospital acquired infections)",
  "Prevent postoperative complications",
  "Complete procedure safely (e.g. comfort during procedure, no complications)",
  "Improve/Maintain oral intake and hydration",
  "Tolerate prescribed diet/ Advance diet as tolerated",
  "Resume diet when medically appropriate",
  "Participate in feeding with nurse support",
  "Bottle feed effectively",
  "Establish/ Initiate breastfeeding/ Breastfeed effectively",
  "Monitor urine and stool output",
  "Void without difficulty",
  "Improve sleep/ Sleep with minimal interruption",
  "Improve mobility/ Ambulate safely/ Ambulate with assistance",
  "Prepare for discharge",
  "Complete newborn screening/ Complete hearing screening/ Complete bilirubin screening",
  "Participate in treatment plan",
  "Attend group therapy",
  "Verbalize feelings or concerns",
  "Reduce anxiety",
  "Improve mood",
  "Use coping strategies",
  "Take medications as prescribed",
  "Continue skin-to-skin contact",
  "Provide skin-to-skin care",
  "Provide comfort measures during care",
  "Provide verbal interaction for developmental support",
  "Provide gentle touch as guided by nurse",
  "Assist with diaper or clothing change",
  "Maintain stable body temperature",
  "Promote bonding with parent/ Bond with newborn",
  "Rooming-in with mother/parents",
  "Vaginal birth",
  "Safe delivery",
  "Manage labor pain/ Progress in labor",
  "Maintain maternal safety/ Maintain fetal well-being",
  "Effective pushing",
  "Stable recovery after delivery",
  "Control postpartum bleeding/vaginal bleeding",
  "Manage incision or perineal discomfort",
  "Learn postpartum self-care",
] as const;

/** Whether a stored goal came from the list or was typed. */
export function isListedGoal(goal: string): boolean {
  return (CARE_GOALS as readonly string[]).includes(goal);
}
