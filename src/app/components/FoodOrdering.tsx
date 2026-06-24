import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Sun,
  Coffee,
  Moon,
  Clock,
  Check,
  AlertTriangle,
  RotateCcw,
  ClipboardList,
  ShieldAlert,
  ShoppingBag,
  X,
  CheckCircle2,
  Utensils,
  User,
  Users,
  MapPin,
} from "lucide-react";
import { useTheme, TEXT_STYLE, SHADOW, SPACE, TYPE_SCALE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useOrders } from "./OrderStore";
import { useNurseStore } from "./NurseDataStore";

/* ═══════════════════════════════════════════════════════════════════════════
 * FAKEEH HOSPITAL MENU — grouped "choose one" sections mirroring the printed
 * bedside menu card. Images are intentionally avoided (the kiosk runs offline
 * behind a native shell); each item is illustrated with an emoji glyph instead.
 * ═══════════════════════════════════════════════════════════════════════════ */

type Locale = { en: string; ar: string };

/** The ten major allergens surfaced in the staff filter row. */
type Allergen =
  | "gluten" | "dairy" | "eggs" | "tree-nuts" | "fish"
  | "shellfish" | "sesame" | "soy" | "peanuts" | "sulphites";

/** Diet-order codes that can mark an item unsuitable (chart-driven). */
type DietCode = "NAS" | "DM" | "LS" | "RD" | "LF";

interface MenuItem {
  id: string;
  name: Locale;
  emoji: string;
  allergens: Allergen[];
  /** Diet orders this item is NOT suitable for. */
  restrictedFor?: DietCode[];
}

interface FoodGroup {
  id: string;
  label: Locale;
  items: MenuItem[];
}

interface Meal {
  id: "breakfast" | "lunch" | "dinner";
  label: Locale;
  icon: React.ComponentType<any>;
  window: Locale;
  /** Hero food photo shown at the top of the column (with solid-color fallback). */
  heroImage: string;
  groups: FoodGroup[];
  includedForAll: MenuItem[];
}

const ALLERGEN_ORDER: Allergen[] = [
  "gluten", "dairy", "eggs", "tree-nuts", "fish",
  "shellfish", "sesame", "soy", "peanuts", "sulphites",
];

const ALLERGEN_META: Record<Allergen, { label: Locale; emoji: string }> = {
  gluten: { label: { en: "Gluten", ar: "غلوتين" }, emoji: "🌾" },
  dairy: { label: { en: "Dairy", ar: "ألبان" }, emoji: "🥛" },
  eggs: { label: { en: "Eggs", ar: "بيض" }, emoji: "🥚" },
  "tree-nuts": { label: { en: "Tree Nuts", ar: "مكسرات" }, emoji: "🌰" },
  fish: { label: { en: "Fish", ar: "سمك" }, emoji: "🐟" },
  shellfish: { label: { en: "Shellfish", ar: "محار" }, emoji: "🦐" },
  sesame: { label: { en: "Sesame", ar: "سمسم" }, emoji: "🟤" },
  soy: { label: { en: "Soy", ar: "صويا" }, emoji: "🫛" },
  peanuts: { label: { en: "Peanuts", ar: "فول سوداني" }, emoji: "🥜" },
  sulphites: { label: { en: "Sulphites", ar: "كبريتات" }, emoji: "🍇" },
};

const DIET_LABELS: Record<DietCode, Locale> = {
  NAS: { en: "No Added Salt", ar: "بدون ملح مضاف" },
  DM: { en: "Diabetic Diet", ar: "حمية السكري" },
  LS: { en: "Low Sodium", ar: "قليل الصوديوم" },
  RD: { en: "Renal Diet", ar: "حمية الكلى" },
  LF: { en: "Low Fat", ar: "قليل الدهون" },
};

/** Chart allergy strings that are not food allergens — shown but never block food. */
const NON_FOOD_ALLERGY = new Set(["penicillin", "latex"]);

/** Map a raw chart allergy string to a standardized food-allergen token. */
function normalizeAllergen(raw: string): Allergen | null {
  const s = raw.toLowerCase().trim();
  const map: Record<string, Allergen> = {
    gluten: "gluten", wheat: "gluten", bread: "gluten",
    dairy: "dairy", milk: "dairy", lactose: "dairy", cheese: "dairy",
    egg: "eggs", eggs: "eggs",
    "tree nut": "tree-nuts", "tree nuts": "tree-nuts", nut: "tree-nuts", nuts: "tree-nuts",
    fish: "fish",
    shellfish: "shellfish", shrimp: "shellfish", crab: "shellfish", lobster: "shellfish", prawn: "shellfish",
    sesame: "sesame", tahini: "sesame",
    soy: "soy", soya: "soy",
    peanut: "peanuts", peanuts: "peanuts",
    sulphite: "sulphites", sulphites: "sulphites", sulfite: "sulphites",
  };
  return map[s] ?? null;
}

/** Lunch & Dinner share an identical menu; build the groups for a given prefix. */
function mainMealGroups(p: "ln" | "dn"): FoodGroup[] {
  return [
    {
      id: `${p}-a`,
      label: { en: "Group A · Soups", ar: "المجموعة أ · شوربات" },
      items: [
        { id: `${p}-a1`, name: { en: "Vegetable Soup", ar: "شوربة خضار" }, emoji: "🥬", allergens: [] },
        { id: `${p}-a2`, name: { en: "Orzo Soup", ar: "شوربة أورزو" }, emoji: "🍲", allergens: ["gluten"] },
        { id: `${p}-a3`, name: { en: "Chicken Soup", ar: "شوربة دجاج" }, emoji: "🍜", allergens: [] },
        { id: `${p}-a4`, name: { en: "Vermicelli Soup with Chicken", ar: "شوربة شعيرية بالدجاج" }, emoji: "🍜", allergens: ["gluten"] },
      ],
    },
    {
      id: `${p}-b`,
      label: { en: "Group B · Salads", ar: "المجموعة ب · سلطات" },
      items: [
        { id: `${p}-b1`, name: { en: "Mix Green Salad", ar: "سلطة خضراء مشكلة" }, emoji: "🥗", allergens: [] },
        { id: `${p}-b2`, name: { en: "Carrot Salad", ar: "سلطة جزر" }, emoji: "🥕", allergens: [] },
        { id: `${p}-b3`, name: { en: "Fattoush Salad", ar: "سلطة فتوش" }, emoji: "🥙", allergens: ["gluten"] },
        { id: `${p}-b4`, name: { en: "Mutable", ar: "متبل" }, emoji: "🍆", allergens: ["sesame"] },
        { id: `${p}-b5`, name: { en: "Tahini Salad", ar: "سلطة طحينة" }, emoji: "🥣", allergens: ["sesame"] },
      ],
    },
    {
      id: `${p}-c`,
      label: { en: "Group C · Main Course", ar: "المجموعة ج · الطبق الرئيسي" },
      items: [
        { id: `${p}-c1`, name: { en: "Grilled fish served with butter and lemon sauce", ar: "سمك مشوي مع صلصة الزبدة والليمون" }, emoji: "🐟", allergens: ["fish", "dairy"] },
        { id: `${p}-c2`, name: { en: "Fish Panne", ar: "سمك بانيه" }, emoji: "🐠", allergens: ["fish", "gluten", "eggs"] },
        { id: `${p}-c3`, name: { en: "Grilled Chicken with herbal sauce", ar: "دجاج مشوي مع صلصة الأعشاب" }, emoji: "🍗", allergens: [] },
        { id: `${p}-c4`, name: { en: "Grilled Chicken Kofta", ar: "كفتة دجاج مشوية" }, emoji: "🍢", allergens: [] },
        { id: `${p}-c5`, name: { en: "Chicken Panne", ar: "دجاج بانيه" }, emoji: "🍗", allergens: ["gluten", "eggs"] },
        { id: `${p}-c6`, name: { en: "Grilled Beef Kofta", ar: "كفتة لحم مشوية" }, emoji: "🥩", allergens: [] },
      ],
    },
    {
      id: `${p}-d`,
      label: { en: "Group D · Rice & Pasta", ar: "المجموعة د · أرز ومعكرونة" },
      items: [
        { id: `${p}-d1`, name: { en: "White Rice", ar: "أرز أبيض" }, emoji: "🍚", allergens: [] },
        { id: `${p}-d2`, name: { en: "Rice of The Day", ar: "أرز اليوم" }, emoji: "🍛", allergens: [] },
        { id: `${p}-d3`, name: { en: "Pasta of The Day", ar: "معكرونة اليوم" }, emoji: "🍝", allergens: ["gluten"] },
      ],
    },
    {
      id: `${p}-e`,
      label: { en: "Group E · Vegetables", ar: "المجموعة هـ · خضار" },
      items: [
        { id: `${p}-e1`, name: { en: "Vegetable Sauteed", ar: "خضار سوتيه" }, emoji: "🥘", allergens: [] },
        { id: `${p}-e2`, name: { en: "Vegetable Grilled", ar: "خضار مشوية" }, emoji: "🥦", allergens: [] },
        { id: `${p}-e3`, name: { en: "Potato of The Day", ar: "بطاطس اليوم" }, emoji: "🥔", allergens: [] },
      ],
    },
    {
      id: `${p}-f`,
      label: { en: "Group F · Dessert", ar: "المجموعة و · حلويات" },
      items: [
        { id: `${p}-f1`, name: { en: "Dessert of The Day", ar: "حلى اليوم" }, emoji: "🍰", allergens: ["gluten", "dairy", "eggs"], restrictedFor: ["DM"] },
        { id: `${p}-f2`, name: { en: "Fruit Salad", ar: "سلطة فواكه" }, emoji: "🍉", allergens: [] },
      ],
    },
  ];
}

/** "Water Bottle" + "Tetra Pack Juice" — included with every meal. */
function forAll(p: string): MenuItem[] {
  return [
    { id: `${p}-inc1`, name: { en: "Water Bottle", ar: "زجاجة ماء" }, emoji: "💧", allergens: [] },
    { id: `${p}-inc2`, name: { en: "Tetra Pack Juice", ar: "عصير تيترا باك" }, emoji: "🧃", allergens: [] },
  ];
}

const MEALS: Meal[] = [
  {
    id: "breakfast",
    label: { en: "Breakfast", ar: "الإفطار" },
    icon: Sun,
    window: { en: "8:00 – 9:30 AM", ar: "٨:٠٠ – ٩:٣٠ ص" },
    heroImage: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=70",
    groups: [
      {
        id: "bf-a",
        label: { en: "Group A · Bread", ar: "المجموعة أ · خبز" },
        items: [
          { id: "bf-a1", name: { en: "Arabic Bread White", ar: "خبز عربي أبيض" }, emoji: "🍞", allergens: ["gluten"] },
          { id: "bf-a2", name: { en: "Arabic Bread Brown", ar: "خبز عربي أسمر" }, emoji: "🥖", allergens: ["gluten"] },
          { id: "bf-a3", name: { en: "Samoli Bread", ar: "خبز صامولي" }, emoji: "🥯", allergens: ["gluten"] },
        ],
      },
      {
        id: "bf-b",
        label: { en: "Group B · Hot Sides", ar: "المجموعة ب · أطباق ساخنة" },
        items: [
          { id: "bf-b1", name: { en: "Hash Brown", ar: "هاش براون" }, emoji: "🥔", allergens: [] },
          { id: "bf-b2", name: { en: "Grilled Tomato", ar: "طماطم مشوية" }, emoji: "🍅", allergens: [] },
          { id: "bf-b3", name: { en: "Potato Wedges", ar: "أصابع بطاطس" }, emoji: "🍟", allergens: [] },
        ],
      },
      {
        id: "bf-c",
        label: { en: "Group C · Cereals", ar: "المجموعة ج · حبوب" },
        items: [
          { id: "bf-c1", name: { en: "Corn Flakes", ar: "رقائق الذرة" }, emoji: "🥣", allergens: ["gluten"] },
          { id: "bf-c2", name: { en: "Whole Bran Flakes", ar: "رقائق النخالة الكاملة" }, emoji: "🌾", allergens: ["gluten"] },
        ],
      },
      {
        id: "bf-d",
        label: { en: "Group D · Cheese", ar: "المجموعة د · أجبان" },
        items: [
          { id: "bf-d1", name: { en: "Cheese Platter", ar: "طبق أجبان" }, emoji: "🧀", allergens: ["dairy"], restrictedFor: ["NAS"] },
          { id: "bf-d2", name: { en: "Labna", ar: "لبنة" }, emoji: "🥛", allergens: ["dairy"], restrictedFor: ["NAS"] },
        ],
      },
      {
        id: "bf-e",
        label: { en: "Group E · Eggs", ar: "المجموعة هـ · بيض" },
        items: [
          { id: "bf-e1", name: { en: "Espanola Omelette", ar: "أومليت إسبانيولا" }, emoji: "🍳", allergens: ["eggs"] },
          { id: "bf-e2", name: { en: "Scrambled Egg", ar: "بيض مخفوق" }, emoji: "🍳", allergens: ["eggs", "dairy"] },
          { id: "bf-e3", name: { en: "Boiled Eggs", ar: "بيض مسلوق" }, emoji: "🥚", allergens: ["eggs"] },
          { id: "bf-e4", name: { en: "Cheese Omelette", ar: "أومليت بالجبن" }, emoji: "🧀", allergens: ["eggs", "dairy"] },
          { id: "bf-e5", name: { en: "Plain Omelette", ar: "أومليت سادة" }, emoji: "🍳", allergens: ["eggs"] },
        ],
      },
      {
        id: "bf-f",
        label: { en: "Group F · Yogurt", ar: "المجموعة و · زبادي" },
        items: [
          { id: "bf-f1", name: { en: "Plain Yogurt", ar: "زبادي سادة" }, emoji: "🥛", allergens: ["dairy"] },
          { id: "bf-f2", name: { en: "Fruit Yogurt", ar: "زبادي بالفواكه" }, emoji: "🍓", allergens: ["dairy"] },
        ],
      },
      {
        id: "bf-g",
        label: { en: "Group G · Pastries", ar: "المجموعة ز · معجنات" },
        items: [
          { id: "bf-g1", name: { en: "Croissant", ar: "كرواسون" }, emoji: "🥐", allergens: ["gluten", "dairy", "eggs"], restrictedFor: ["DM"] },
          { id: "bf-g2", name: { en: "Muffin Cake", ar: "كيك مافن" }, emoji: "🧁", allergens: ["gluten", "dairy", "eggs"], restrictedFor: ["DM"] },
          { id: "bf-g3", name: { en: "Danish Pastry", ar: "معجنات دنماركية" }, emoji: "🥧", allergens: ["gluten", "dairy", "eggs"], restrictedFor: ["DM"] },
          { id: "bf-g4", name: { en: "Cinnamon Roll", ar: "لفائف القرفة" }, emoji: "🍩", allergens: ["gluten", "dairy", "eggs"], restrictedFor: ["DM"] },
        ],
      },
    ],
    includedForAll: forAll("bf"),
  },
  {
    id: "lunch",
    label: { en: "Lunch", ar: "الغداء" },
    icon: Coffee,
    window: { en: "1:00 – 2:00 PM", ar: "١:٠٠ – ٢:٠٠ م" },
    heroImage: "https://images.unsplash.com/photo-1604382440115-5f730e6ede1f?auto=format&fit=crop&w=900&q=70",
    groups: mainMealGroups("ln"),
    includedForAll: forAll("ln"),
  },
  {
    id: "dinner",
    label: { en: "Dinner", ar: "العشاء" },
    icon: Moon,
    window: { en: "7:00 – 8:00 PM", ar: "٧:٠٠ – ٨:٠٠ م" },
    heroImage: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&q=70",
    groups: mainMealGroups("dn"),
    includedForAll: forAll("dn"),
  },
];

/** Real dish photos for the selection-preview card, keyed by English dish name.
 *  Dishes without an entry (or whose photo fails to load) fall back to the
 *  enlarged per-item emoji, so a broken image icon is never shown. */
const ux = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`;
const DISH_PHOTOS: Record<string, string> = {
  // Breakfast
  "Scrambled Egg": ux("1525351484163-7529414344d8"),
  "Boiled Eggs": ux("1607690424560-35d967d6ad7c"),
  "Espanola Omelette": ux("1612240498936-65f5101365d2"),
  "Cheese Omelette": ux("1612240498936-65f5101365d2"),
  "Plain Omelette": ux("1612240498936-65f5101365d2"),
  "Corn Flakes": ux("1631077019185-84d961548731"),
  "Whole Bran Flakes": ux("1631077019185-84d961548731"),
  "Plain Yogurt": ux("1729368628910-2d58db8657a6"),
  "Fruit Yogurt": ux("1729368628910-2d58db8657a6"),
  Croissant: ux("1555507036-ab1f4038808a"),
  "Danish Pastry": ux("1509365465985-25d11c17e812"),
  "Cinnamon Roll": ux("1509365465985-25d11c17e812"),
  "Muffin Cake": ux("1607958996333-41aaf7caefaa"),
  // Lunch & Dinner — soups
  "Vegetable Soup": ux("1547592180-85f173990554"),
  "Orzo Soup": ux("1612108438004-257c47560118"),
  "Chicken Soup": ux("1612108438004-257c47560118"),
  "Vermicelli Soup with Chicken": ux("1612108438004-257c47560118"),
  // salads
  "Mix Green Salad": ux("1622756144420-6877b1b7476e"),
  "Fattoush Salad": ux("1622756144420-6877b1b7476e"),
  Mutable: ux("1743674453093-592bed88018e"),
  "Tahini Salad": ux("1743674453093-592bed88018e"),
  // mains
  "Grilled fish served with butter and lemon sauce": ux("1673436977947-0787164a9abc"),
  "Fish Panne": ux("1673436977947-0787164a9abc"),
  "Grilled Chicken with herbal sauce": ux("1604382440115-5f730e6ede1f"),
  "Grilled Chicken Kofta": ux("1604382440115-5f730e6ede1f"),
  "Chicken Panne": ux("1604382440115-5f730e6ede1f"),
  "Grilled Beef Kofta": ux("1432139555190-58524dae6a55"),
  // carbs & veg
  "Pasta of The Day": ux("1770350482632-2ac108790b58"),
  "Vegetable Sauteed": ux("1518164147695-36c13dd568f5"),
  "Vegetable Grilled": ux("1518164147695-36c13dd568f5"),
  // dessert
  "Dessert of The Day": ux("1673551494277-92204546b504"),
  "Fruit Salad": ux("1681840524567-732960c82f4c"),
};

type BlockReason = { type: "allergen"; allergen: Allergen } | { type: "diet"; code: DietCode };

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */

export function FoodOrdering({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { isRTL, fontFamily } = useLocale();
  const { placeOrder, orders } = useOrders();
  const nurse = useNurseStore();

  const loc = useCallback((v: Locale) => (isRTL ? v.ar : v.en), [isRTL]);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  /* ── Paper-form header fields: who the order is for + name + room ── */
  const [orderFor, setOrderFor] = useState<"patient" | "guest">("patient");
  const [patientName, setPatientName] = useState(nurse.patient.name);
  const [roomNumber, setRoomNumber] = useState(nurse.patient.room);

  /* ── Chart-derived defaults (the patient's clinical restrictions) ── */
  const defaults = useMemo(() => {
    const dietCodes = nurse.dietCodes
      .map((d) => d.code)
      .filter((c): c is DietCode => c in DIET_LABELS);
    const foodAllergens = nurse.allergies
      .map(normalizeAllergen)
      .filter((a): a is Allergen => a !== null);
    const nonFood = nurse.allergies.filter((a) => NON_FOOD_ALLERGY.has(a.toLowerCase().trim()));
    return { dietCodes, foodAllergens, nonFood };
  }, [nurse.dietCodes, nurse.allergies]);

  /* ── Live, in-page restriction state — never mutates the global nurse store ── */
  const [activeAllergens, setActiveAllergens] = useState<Set<Allergen>>(() => new Set(defaults.foodAllergens));
  const [activeDiet, setActiveDiet] = useState<Set<DietCode>>(() => new Set(defaults.dietCodes));
  const [activeNonFood, setActiveNonFood] = useState<Set<string>>(() => new Set(defaults.nonFood));

  const toggleAllergen = (a: Allergen) =>
    setActiveAllergens((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });
  const toggleDiet = (c: DietCode) =>
    setActiveDiet((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  const toggleNonFood = (raw: string) =>
    setActiveNonFood((prev) => {
      const next = new Set(prev);
      next.has(raw) ? next.delete(raw) : next.add(raw);
      return next;
    });

  const resetToDefaults = () => {
    setActiveAllergens(new Set(defaults.foodAllergens));
    setActiveDiet(new Set(defaults.dietCodes));
    setActiveNonFood(new Set(defaults.nonFood));
  };

  /* ── Blocking logic shared across all three meal columns ── */
  const blockReason = useCallback(
    (item: MenuItem): BlockReason | null => {
      const a = item.allergens.find((x) => activeAllergens.has(x));
      if (a) return { type: "allergen", allergen: a };
      const d = (item.restrictedFor ?? []).find((c) => activeDiet.has(c));
      if (d) return { type: "diet", code: d };
      return null;
    },
    [activeAllergens, activeDiet]
  );

  const blockedCount = useMemo(() => {
    let n = 0;
    for (const meal of MEALS)
      for (const group of meal.groups)
        for (const item of group.items) if (blockReason(item)) n++;
    return n;
  }, [blockReason]);

  /* ── Selection state: one item per group ── */
  const [selections, setSelections] = useState<Record<string, string>>({});

  /* ── Visual-confirmation preview for the most recently selected item ── */
  const [preview, setPreview] = useState<MenuItem | null>(null);

  const selectedItemFor = useCallback(
    (group: FoodGroup): MenuItem | undefined => {
      const id = selections[group.id];
      if (!id) return undefined;
      const item = group.items.find((i) => i.id === id);
      // A previously-chosen item silently clears if a restriction now blocks it.
      if (!item || blockReason(item)) return undefined;
      return item;
    },
    [selections, blockReason]
  );

  const selectItem = (group: FoodGroup, item: MenuItem) => {
    if (blockReason(item)) return;
    const wasSelected = selections[group.id] === item.id;
    setSelections((prev) => {
      const next = { ...prev };
      if (next[group.id] === item.id) delete next[group.id];
      else next[group.id] = item.id;
      return next;
    });
    // Selecting (or switching to) an item shows its photo; deselecting closes it.
    setPreview(wasSelected ? null : item);
  };

  const totalSelected = useMemo(
    () => MEALS.reduce((sum, m) => sum + m.groups.filter((g) => selectedItemFor(g)).length, 0),
    [selectedItemFor]
  );

  const mealSelectedCount = (meal: Meal) => meal.groups.filter((g) => selectedItemFor(g)).length;

  /* ── Submit ── */
  const [showOrders, setShowOrders] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const handleSubmit = () => {
    if (totalSelected === 0) return;
    const items: { id: string; name: Locale; quantity: number; calories: number; image: string }[] = [];
    const mealTypes: string[] = [];
    for (const meal of MEALS) {
      const chosen = meal.groups.map((g) => selectedItemFor(g)).filter(Boolean) as MenuItem[];
      if (chosen.length === 0) continue;
      mealTypes.push(loc(meal.label));
      for (const it of chosen) items.push({ id: it.id, name: it.name, quantity: 1, calories: 0, image: "" });
      for (const inc of meal.includedForAll) items.push({ id: inc.id, name: inc.name, quantity: 1, calories: 0, image: "" });
    }
    const whoLabel = orderFor === "patient" ? "Patient" : "Guest";
    const specialNotes = [
      patientName ? `Name: ${patientName}` : "",
      roomNumber ? `Room: ${roomNumber}` : "",
      `For: ${whoLabel}`,
    ]
      .filter(Boolean)
      .join(" · ");
    const placed = placeOrder({
      items,
      totalCalories: 0,
      specialNotes,
      estimatedDelivery: "25–35 min",
      mealType: mealTypes.join(", "),
    });
    setConfirmation(placed.orderNumber);
    setSelections({});
  };

  /* ── Chart restriction chips (diet + allergy) for the top banner ── */
  const chartChips = useMemo(() => {
    const diet = nurse.dietCodes
      .filter((d) => d.code in DIET_LABELS)
      .map((d) => ({ key: `diet:${d.code}`, kind: "diet" as const, code: d.code as DietCode, token: null, raw: d.code, label: d.label }));
    const allergy = nurse.allergies.map((raw) => ({
      key: `alg:${raw}`,
      kind: "allergy" as const,
      code: null,
      token: normalizeAllergen(raw),
      raw,
      label: raw,
    }));
    return [...diet, ...allergy];
  }, [nurse.dietCodes, nurse.allergies]);

  const chipActive = (chip: (typeof chartChips)[number]) => {
    if (chip.kind === "diet" && chip.code) return activeDiet.has(chip.code);
    if (chip.token) return activeAllergens.has(chip.token);
    return activeNonFood.has(chip.raw);
  };
  const toggleChip = (chip: (typeof chartChips)[number]) => {
    if (chip.kind === "diet" && chip.code) return toggleDiet(chip.code);
    if (chip.token) return toggleAllergen(chip.token);
    return toggleNonFood(chip.raw);
  };

  const isDirty =
    defaults.foodAllergens.length !== activeAllergens.size ||
    defaults.dietCodes.length !== activeDiet.size ||
    defaults.nonFood.length !== activeNonFood.size ||
    defaults.foodAllergens.some((a) => !activeAllergens.has(a)) ||
    defaults.dietCodes.some((c) => !activeDiet.has(c)) ||
    defaults.nonFood.some((n) => !activeNonFood.has(n));

  /* ════════════════════════════════════════════════════════════════════════ */

  return (
    <motion.div
      dir={isRTL ? "rtl" : "ltr"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: theme.gradientCanvas, fontFamily }}
    >
      <style>{`
        .meal-scroll::-webkit-scrollbar { width: 8px; }
        .meal-scroll::-webkit-scrollbar-track { background: transparent; }
        .meal-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 100px; }
      `}</style>

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-4" style={{ padding: `${SPACE[5]} ${SPACE[6]} ${SPACE[3]}` }}>
        <button
          onClick={onClose}
          className="flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          style={{ width: "56px", height: "56px", borderRadius: theme.radiusFull, backgroundColor: theme.surface, boxShadow: SHADOW.md }}
        >
          <BackArrow size={24} color={theme.primary} />
        </button>

        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: "56px", height: "56px", borderRadius: theme.radiusMd, backgroundColor: theme.primary }}
        >
          <Utensils size={28} color={theme.textInverse} />
        </div>

        <div className="flex-1 min-w-0">
          <h2 style={{ ...TEXT_STYLE.display, color: theme.primaryDark }}>{loc({ en: "Meal Ordering", ar: "طلب الوجبات" })}</h2>
          <p style={{ ...TEXT_STYLE.caption, color: theme.textMuted, marginTop: "2px" }}>
            {theme.hospitalName} · {loc({ en: "Select one item per group", ar: "اختر صنفاً واحداً لكل مجموعة" })}
          </p>
        </div>

        <button
          onClick={() => setShowOrders(true)}
          className="flex items-center gap-2 active:scale-95 transition-transform cursor-pointer"
          style={{ height: "56px", padding: `0 ${SPACE[3]}`, borderRadius: theme.radiusFull, backgroundColor: theme.surface, boxShadow: SHADOW.md }}
        >
          <ClipboardList size={20} color={theme.primary} />
          <span style={{ ...TEXT_STYLE.buttonSm, color: theme.primaryDark }}>{loc({ en: "My Orders", ar: "طلباتي" })}</span>
        </button>
      </div>

      {/* ── Clinical restrictions + allergen filter ── */}
      <div className="shrink-0 flex flex-col" style={{ padding: `0 ${SPACE[6]}`, gap: SPACE[2] }}>
        {/* Order-for + Name + Room (mirrors the paper menu card header) */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Patient / Guest toggle */}
          <div className="flex items-center" style={{ borderRadius: theme.radiusFull, backgroundColor: theme.primarySubtle, padding: "4px", gap: "2px" }}>
            {([
              { key: "patient", label: { en: "Patient", ar: "المريض" }, icon: User },
              { key: "guest", label: { en: "Guest", ar: "ضيف" }, icon: Users },
            ] as const).map((opt) => {
              const active = orderFor === opt.key;
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => setOrderFor(opt.key)}
                  className="flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  style={{ padding: "8px 16px", borderRadius: theme.radiusFull, backgroundColor: active ? theme.primary : "transparent" }}
                >
                  <OptIcon size={16} color={active ? theme.textInverse : theme.primaryDark} />
                  <span style={{ ...TEXT_STYLE.pill, color: active ? theme.textInverse : theme.primaryDark }}>{loc(opt.label)}</span>
                </button>
              );
            })}
          </div>

          {/* Patient Name */}
          <div
            className="flex items-center gap-2"
            style={{ height: "44px", padding: `0 ${SPACE[2]}`, borderRadius: theme.radiusFull, backgroundColor: theme.surface, boxShadow: SHADOW.sm, border: `1px solid ${theme.borderDefault}` }}
          >
            <User size={16} color={theme.primary} />
            <span style={{ ...TEXT_STYLE.label, color: theme.textMuted }}>{loc({ en: "Name", ar: "الاسم" })}</span>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder={loc({ en: "Patient name", ar: "اسم المريض" })}
              className="bg-transparent outline-none"
              style={{ ...TEXT_STYLE.bodyEmphasis, color: theme.primaryDark, width: "180px", textAlign: isRTL ? "right" : "left" }}
            />
          </div>

          {/* Room Number */}
          <div
            className="flex items-center gap-2"
            style={{ height: "44px", padding: `0 ${SPACE[2]}`, borderRadius: theme.radiusFull, backgroundColor: theme.surface, boxShadow: SHADOW.sm, border: `1px solid ${theme.borderDefault}` }}
          >
            <MapPin size={16} color={theme.primary} />
            <span style={{ ...TEXT_STYLE.label, color: theme.textMuted }}>{loc({ en: "Room", ar: "الغرفة" })}</span>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder={loc({ en: "Room", ar: "الغرفة" })}
              className="bg-transparent outline-none"
              style={{ ...TEXT_STYLE.bodyEmphasis, color: theme.primaryDark, width: "80px", textAlign: isRTL ? "right" : "left" }}
            />
          </div>
        </div>

        {/* Active Clinical Restrictions */}
        <div
          className="flex items-center gap-4 flex-wrap"
          style={{
            backgroundColor: theme.errorSubtle,
            border: `1.5px solid ${theme.error}33`,
            borderRadius: theme.radiusLg,
            padding: `${SPACE[2]} ${SPACE[3]}`,
          }}
        >
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center" style={{ width: "36px", height: "36px", borderRadius: theme.radiusFull, backgroundColor: `${theme.error}1F` }}>
              <ShieldAlert size={20} color={theme.error} />
            </div>
            <span style={{ ...TEXT_STYLE.label, color: theme.error }}>{loc({ en: "Active Clinical Restrictions", ar: "القيود السريرية النشطة" })}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-1">
            {chartChips.length === 0 && (
              <span style={{ ...TEXT_STYLE.caption, color: theme.textMuted }}>{loc({ en: "No restrictions on chart", ar: "لا توجد قيود على الملف" })}</span>
            )}
            {chartChips.map((chip) => {
              const active = chipActive(chip);
              return (
                <button
                  key={chip.key}
                  onClick={() => toggleChip(chip)}
                  className="flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  style={{
                    padding: "6px 14px",
                    borderRadius: theme.radiusFull,
                    backgroundColor: active ? theme.error : theme.surface,
                    border: `1.5px solid ${active ? theme.error : theme.borderDefault}`,
                    opacity: active ? 1 : 0.55,
                  }}
                >
                  {active && <Check size={14} color={theme.textInverse} />}
                  <span style={{ ...TEXT_STYLE.pill, color: active ? theme.textInverse : theme.textMuted }}>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {isDirty && (
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shrink-0"
              style={{ padding: "6px 14px", borderRadius: theme.radiusFull, backgroundColor: theme.surface, border: `1.5px solid ${theme.borderDefault}` }}
            >
              <RotateCcw size={14} color={theme.primary} />
              <span style={{ ...TEXT_STYLE.pill, color: theme.primary }}>{loc({ en: "Reset to defaults", ar: "إعادة التعيين" })}</span>
            </button>
          )}
        </div>

        {/* Allergen filter row */}
        <div className="flex items-center gap-3 flex-wrap" style={{ backgroundColor: theme.surface, borderRadius: theme.radiusLg, padding: `${SPACE[2]} ${SPACE[3]}`, boxShadow: SHADOW.sm }}>
          <span style={{ ...TEXT_STYLE.label, color: theme.textMuted, whiteSpace: "nowrap" }}>{loc({ en: "Flag allergy", ar: "إضافة حساسية" })}</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {ALLERGEN_ORDER.map((a) => {
              const active = activeAllergens.has(a);
              const meta = ALLERGEN_META[a];
              return (
                <button
                  key={a}
                  onClick={() => toggleAllergen(a)}
                  className="flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  style={{
                    padding: "6px 12px",
                    borderRadius: theme.radiusFull,
                    backgroundColor: active ? theme.primary : theme.primarySubtle,
                    border: `1.5px solid ${active ? theme.primary : "transparent"}`,
                  }}
                >
                  <span style={{ fontSize: TYPE_SCALE.sm, lineHeight: 1 }}>{meta.emoji}</span>
                  <span style={{ ...TEXT_STYLE.pill, color: active ? theme.textInverse : theme.primaryDark }}>{loc(meta.label)}</span>
                </button>
              );
            })}
          </div>
          <div
            className="flex items-center gap-2 shrink-0"
            style={{ padding: "4px 12px", borderRadius: theme.radiusFull, backgroundColor: blockedCount > 0 ? theme.errorSubtle : theme.successSubtle }}
          >
            <AlertTriangle size={15} color={blockedCount > 0 ? theme.error : theme.success} />
            <span style={{ ...TEXT_STYLE.caption, color: blockedCount > 0 ? theme.error : theme.success }}>
              {blockedCount > 0
                ? loc({ en: `${blockedCount} menu items currently hidden by active restrictions / allergies`, ar: `${blockedCount} صنفاً مخفياً حالياً بسبب القيود / الحساسية النشطة` })
                : loc({ en: "No conflicts — full menu available", ar: "لا تعارض — القائمة كاملة متاحة" })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Three meal columns ── */}
      <div className="meal-scroll flex-1 min-h-0 overflow-y-auto" style={{ padding: `${SPACE[3]} ${SPACE[6]} ${SPACE[4]}` }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: SPACE[3], alignItems: "start" }}>
          {MEALS.map((meal) => (
            <MealColumn
              key={meal.id}
              meal={meal}
              theme={theme}
              loc={loc}
              isRTL={isRTL}
              blockReason={blockReason}
              selectedItemFor={selectedItemFor}
              onSelect={selectItem}
              count={mealSelectedCount(meal)}
            />
          ))}
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div
        className="shrink-0 flex items-center gap-4"
        style={{ padding: `${SPACE[2]} ${SPACE[6]}`, backgroundColor: theme.surface, boxShadow: SHADOW.lg, borderTop: `1px solid ${theme.borderDefault}` }}
      >
        <div className="flex items-center justify-center shrink-0" style={{ width: "48px", height: "48px", borderRadius: theme.radiusMd, backgroundColor: theme.primarySubtle }}>
          <ShoppingBag size={22} color={theme.primary} />
        </div>
        <div className="flex-1">
          <p style={{ ...TEXT_STYLE.sectionTitle, color: theme.primaryDark }}>
            {totalSelected} {loc({ en: totalSelected === 1 ? "item selected" : "items selected", ar: "صنف مختار" })}
          </p>
          <p style={{ ...TEXT_STYLE.caption, color: theme.textMuted }}>
            {loc({ en: "Drinks & water included with every meal · Est. delivery 25–35 min", ar: "المشروبات والماء مع كل وجبة · التوصيل خلال ٢٥–٣٥ دقيقة" })}
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={totalSelected === 0}
          className="flex items-center gap-2 active:scale-95 transition-transform"
          style={{
            height: "56px",
            padding: `0 ${SPACE[5]}`,
            borderRadius: theme.radiusFull,
            backgroundColor: totalSelected === 0 ? theme.borderDefault : theme.primary,
            cursor: totalSelected === 0 ? "not-allowed" : "pointer",
            opacity: totalSelected === 0 ? 0.7 : 1,
          }}
        >
          <Check size={22} color={theme.textInverse} />
          <span style={{ ...TEXT_STYLE.button, color: theme.textInverse }}>{loc({ en: "Submit Order", ar: "إرسال الطلب" })}</span>
        </button>
      </div>

      {/* ── Confirmation overlay ── */}
      <AnimatePresence>
        {confirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center"
            style={{ backgroundColor: theme.overlay }}
            onClick={() => setConfirmation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center text-center"
              style={{ backgroundColor: theme.surface, borderRadius: theme.radiusXl, padding: SPACE[6], width: "440px", boxShadow: SHADOW.xl }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: "80px", height: "80px", borderRadius: theme.radiusFull, backgroundColor: theme.successSubtle, marginBottom: SPACE[3] }}
              >
                <CheckCircle2 size={44} color={theme.success} />
              </div>
              <h3 style={{ ...TEXT_STYLE.pageTitle, color: theme.primaryDark }}>{loc({ en: "Order Placed", ar: "تم إرسال الطلب" })}</h3>
              <p style={{ ...TEXT_STYLE.body, color: theme.textMuted, marginTop: SPACE[1] }}>
                {loc({ en: "Order", ar: "طلب" })} {confirmation} · {loc({ en: "the kitchen has been notified.", ar: "تم إبلاغ المطبخ." })}
              </p>
              <div className="flex gap-3" style={{ marginTop: SPACE[4] }}>
                <button
                  onClick={() => { setConfirmation(null); setShowOrders(true); }}
                  style={{ height: "52px", padding: `0 ${SPACE[4]}`, borderRadius: theme.radiusFull, backgroundColor: theme.surface, border: `1.5px solid ${theme.borderDefault}` }}
                >
                  <span style={{ ...TEXT_STYLE.buttonSm, color: theme.primaryDark }}>{loc({ en: "View Orders", ar: "عرض الطلبات" })}</span>
                </button>
                <button
                  onClick={() => setConfirmation(null)}
                  style={{ height: "52px", padding: `0 ${SPACE[4]}`, borderRadius: theme.radiusFull, backgroundColor: theme.primary }}
                >
                  <span style={{ ...TEXT_STYLE.buttonSm, color: theme.textInverse }}>{loc({ en: "Done", ar: "تم" })}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Selected-item photo preview (visual confirmation, non-blocking) ── */}
      <AnimatePresence>
        {preview && (
          <PreviewModal
            item={preview}
            photo={DISH_PHOTOS[preview.name.en] ?? ""}
            theme={theme}
            loc={loc}
            onClose={() => setPreview(null)}
          />
        )}
      </AnimatePresence>

      {/* ── My Orders overlay ── */}
      <AnimatePresence>
        {showOrders && <MyOrders orders={orders} theme={theme} loc={loc} isRTL={isRTL} onClose={() => setShowOrders(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MEAL HERO IMAGE — real food photo with a graceful solid-color fallback
 * ═══════════════════════════════════════════════════════════════════════════ */

function MealHero({ src, fallback, alt }: { src: string; fallback: string; alt: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="absolute inset-0" style={{ backgroundColor: fallback }}>
      {ok && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setOk(false)}
          className="w-full h-full object-cover"
          style={{ display: "block" }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DISH PHOTO — real photo with enlarged-emoji fallback (never a broken image)
 * ═══════════════════════════════════════════════════════════════════════════ */

function DishPhoto({ src, emoji, alt, theme }: { src: string; emoji: string; alt: string; theme: any }) {
  const [ok, setOk] = useState(!!src);
  const showImg = !!src && ok;
  return (
    <div
      className="flex items-center justify-center w-full"
      style={{ height: "210px", borderRadius: theme.radiusLg, overflow: "hidden", backgroundColor: theme.primarySubtle }}
    >
      {showImg ? (
        <img src={src} alt={alt} onError={() => setOk(false)} className="w-full h-full object-cover" style={{ display: "block" }} />
      ) : (
        <span style={{ fontSize: "84px", lineHeight: 1 }}>{emoji}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SELECTION PREVIEW MODAL — quick visual confirmation of the chosen dish
 * ═══════════════════════════════════════════════════════════════════════════ */

function PreviewModal({
  item,
  photo,
  theme,
  loc,
  onClose,
}: {
  item: MenuItem;
  photo: string;
  theme: any;
  loc: (v: Locale) => string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: theme.overlay }}
      onClick={onClose}
    >
      <motion.div
        key={item.id}
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col"
        style={{ backgroundColor: theme.surface, borderRadius: theme.radiusXl, padding: SPACE[3], width: "400px", boxShadow: SHADOW.xl }}
      >
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          style={{ top: SPACE[3], insetInlineEnd: SPACE[3], width: "40px", height: "40px", borderRadius: theme.radiusFull, backgroundColor: "rgba(255,255,255,0.85)", boxShadow: SHADOW.md, zIndex: 2 }}
        >
          <X size={20} color={theme.primaryDark} />
        </button>

        <DishPhoto src={photo} emoji={item.emoji} alt={loc(item.name)} theme={theme} />

        <div className="flex items-center gap-1.5" style={{ marginTop: SPACE[2] }}>
          <Check size={16} color={theme.success} />
          <span style={{ ...TEXT_STYLE.label, color: theme.success }}>{loc({ en: "Selected", ar: "تم الاختيار" })}</span>
        </div>

        <h3 style={{ ...TEXT_STYLE.cardTitle, color: theme.primaryDark, marginTop: "4px" }}>{loc(item.name)}</h3>

        <div className="flex flex-wrap gap-2" style={{ marginTop: SPACE[2] }}>
          {item.allergens.length > 0 ? (
            item.allergens.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5"
                style={{ padding: "5px 12px", borderRadius: theme.radiusFull, backgroundColor: theme.errorSubtle, border: `1px solid ${theme.error}33` }}
              >
                <AlertTriangle size={12} color={theme.error} />
                <span style={{ ...TEXT_STYLE.pill, color: theme.error }}>{loc(ALLERGEN_META[a].label)}</span>
              </span>
            ))
          ) : (
            <span
              className="flex items-center gap-1.5"
              style={{ padding: "5px 12px", borderRadius: theme.radiusFull, backgroundColor: theme.successSubtle, border: `1px solid ${theme.success}33` }}
            >
              <Check size={12} color={theme.success} />
              <span style={{ ...TEXT_STYLE.pill, color: theme.success }}>{loc({ en: "No major allergens", ar: "لا تحتوي على مسببات حساسية رئيسية" })}</span>
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
          style={{ height: "52px", borderRadius: theme.radiusFull, backgroundColor: theme.primary, marginTop: SPACE[3] }}
        >
          <Check size={20} color={theme.textInverse} />
          <span style={{ ...TEXT_STYLE.buttonSm, color: theme.textInverse }}>{loc({ en: "Confirm", ar: "تأكيد" })}</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MEAL COLUMN
 * ═══════════════════════════════════════════════════════════════════════════ */

function MealColumn({
  meal,
  theme,
  loc,
  isRTL,
  blockReason,
  selectedItemFor,
  onSelect,
  count,
}: {
  meal: Meal;
  theme: any;
  loc: (v: Locale) => string;
  isRTL: boolean;
  blockReason: (item: MenuItem) => BlockReason | null;
  selectedItemFor: (g: FoodGroup) => MenuItem | undefined;
  onSelect: (g: FoodGroup, item: MenuItem) => void;
  count: number;
}) {
  const Icon = meal.icon;
  return (
    <div style={{ backgroundColor: theme.surface, borderRadius: theme.radiusLg, boxShadow: SHADOW.md, overflow: "hidden" }}>
      {/* Column header — hero food photo with title overlaid (solid-color fallback) */}
      <div style={{ position: "relative", height: "150px", overflow: "hidden" }}>
        <MealHero src={meal.heroImage} fallback={theme.primary} alt={loc(meal.label)} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(180deg, ${theme.primaryDark}33 0%, ${theme.primaryDark}40 45%, ${theme.primaryDark}F2 100%)` }} />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3" style={{ padding: SPACE[3] }}>
          <div className="flex items-center justify-center shrink-0" style={{ width: "48px", height: "48px", borderRadius: theme.radiusMd, backgroundColor: "rgba(255,255,255,0.22)", backdropFilter: "blur(4px)" }}>
            <Icon size={26} color={theme.textInverse} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 style={{ ...TEXT_STYLE.sectionTitle, color: theme.textInverse }}>{loc(meal.label)}</h3>
            <div className="flex items-center gap-1.5" style={{ marginTop: "2px" }}>
              <Clock size={13} color={theme.textInverse} />
              <span style={{ ...TEXT_STYLE.caption, color: theme.textInverse, opacity: 0.85 }}>{loc(meal.window)}</span>
            </div>
          </div>
          {count > 0 && (
            <div className="flex items-center justify-center shrink-0" style={{ minWidth: "30px", height: "30px", padding: "0 9px", borderRadius: theme.radiusFull, backgroundColor: theme.textInverse }}>
              <span style={{ ...TEXT_STYLE.micro, color: theme.primary }}>{count}</span>
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="flex flex-col" style={{ padding: SPACE[3], gap: SPACE[3] }}>
        {meal.groups.map((group) => {
          const selected = selectedItemFor(group);
          return (
            <div key={group.id} className="flex flex-col" style={{ gap: SPACE[1] }}>
              <div className="flex items-center justify-between">
                <span style={{ ...TEXT_STYLE.label, color: theme.primaryDark }}>{loc(group.label)}</span>
                <span style={{ ...TEXT_STYLE.helper, color: selected ? theme.success : theme.textMuted }}>
                  {selected ? loc({ en: "✓ Chosen", ar: "✓ تم الاختيار" }) : loc({ en: "Choose one", ar: "اختر واحداً" })}
                </span>
              </div>
              <div className="flex flex-col" style={{ gap: "6px" }}>
                {group.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    theme={theme}
                    loc={loc}
                    isRTL={isRTL}
                    block={blockReason(item)}
                    selected={selected?.id === item.id}
                    onClick={() => onSelect(group, item)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Included for all */}
        <div style={{ borderTop: `1px dashed ${theme.borderDefault}`, paddingTop: SPACE[2] }} className="flex flex-col">
          <span style={{ ...TEXT_STYLE.label, color: theme.textMuted, marginBottom: "8px" }}>{loc({ en: "Included for all", ar: "مشمول للجميع" })}</span>
          <div className="flex flex-wrap gap-2">
            {meal.includedForAll.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center gap-2"
                style={{ padding: "6px 12px", borderRadius: theme.radiusFull, backgroundColor: theme.successSubtle, border: `1px solid ${theme.success}33` }}
              >
                <span style={{ fontSize: TYPE_SCALE.sm, lineHeight: 1 }}>{inc.emoji}</span>
                <span style={{ ...TEXT_STYLE.pill, color: theme.textBody }}>{loc(inc.name)}</span>
                <Check size={13} color={theme.success} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ITEM ROW
 * ═══════════════════════════════════════════════════════════════════════════ */

function ItemRow({
  item,
  theme,
  loc,
  isRTL,
  block,
  selected,
  onClick,
}: {
  item: MenuItem;
  theme: any;
  loc: (v: Locale) => string;
  isRTL: boolean;
  block: BlockReason | null;
  selected: boolean;
  onClick: () => void;
}) {
  const blockLabel = block
    ? block.type === "allergen"
      ? loc(ALLERGEN_META[block.allergen].label)
      : loc(DIET_LABELS[block.code])
    : "";

  return (
    <button
      onClick={onClick}
      disabled={!!block}
      className="flex items-center gap-3 w-full transition-all"
      style={{
        padding: "10px 12px",
        borderRadius: theme.radiusMd,
        textAlign: isRTL ? "right" : "left",
        cursor: block ? "not-allowed" : "pointer",
        backgroundColor: block ? theme.errorSubtle : selected ? theme.primarySubtle : theme.background,
        border: `1.5px solid ${block ? `${theme.error}33` : selected ? theme.primary : theme.borderDefault}`,
        opacity: block ? 0.6 : 1,
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: "38px",
          height: "38px",
          borderRadius: theme.radiusFull,
          backgroundColor: selected ? theme.primary : theme.surface,
          border: `1px solid ${theme.borderDefault}`,
          filter: block ? "grayscale(1)" : "none",
        }}
      >
        <span style={{ fontSize: TYPE_SCALE.md, lineHeight: 1 }}>{item.emoji}</span>
      </div>

      <span className="flex-1 min-w-0 truncate" style={{ ...TEXT_STYLE.bodyEmphasis, color: block ? theme.textMuted : theme.textHeading }}>
        {loc(item.name)}
      </span>

      {block ? (
        <span className="flex items-center gap-1 shrink-0" style={{ padding: "3px 9px", borderRadius: theme.radiusFull, backgroundColor: theme.error }}>
          <AlertTriangle size={11} color={theme.textInverse} />
          <span style={{ ...TEXT_STYLE.micro, color: theme.textInverse }}>{blockLabel}</span>
        </span>
      ) : selected ? (
        <div className="flex items-center justify-center shrink-0" style={{ width: "26px", height: "26px", borderRadius: theme.radiusFull, backgroundColor: theme.primary }}>
          <Check size={16} color={theme.textInverse} />
        </div>
      ) : (
        <div className="shrink-0" style={{ width: "26px", height: "26px", borderRadius: theme.radiusFull, border: `2px solid ${theme.borderDefault}` }} />
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MY ORDERS OVERLAY
 * ═══════════════════════════════════════════════════════════════════════════ */

function MyOrders({
  orders,
  theme,
  loc,
  isRTL,
  onClose,
}: {
  orders: ReturnType<typeof useOrders>["orders"];
  theme: any;
  loc: (v: Locale) => string;
  isRTL: boolean;
  onClose: () => void;
}) {
  const STATUS_LABEL: Record<string, Locale> = {
    preparing: { en: "Preparing", ar: "قيد التحضير" },
    "quality-check": { en: "Quality Check", ar: "فحص الجودة" },
    delivering: { en: "On the way", ar: "في الطريق" },
    delivered: { en: "Delivered", ar: "تم التوصيل" },
  };
  const statusColor = (s: string) => (s === "delivered" ? theme.success : s === "delivering" ? theme.warning : theme.primary);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex justify-end"
      style={{ backgroundColor: theme.overlay }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: isRTL ? "-100%" : "100%" }}
        animate={{ x: 0 }}
        exit={{ x: isRTL ? "-100%" : "100%" }}
        transition={{ type: "tween", duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col h-full"
        style={{ width: "560px", background: theme.gradientCanvas }}
      >
        <div className="flex items-center justify-between shrink-0" style={{ padding: SPACE[4] }}>
          <h3 style={{ ...TEXT_STYLE.pageTitle, color: theme.primaryDark }}>{loc({ en: "My Orders", ar: "طلباتي" })}</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            style={{ width: "48px", height: "48px", borderRadius: theme.radiusFull, backgroundColor: theme.surface, boxShadow: SHADOW.md }}
          >
            <X size={22} color={theme.primary} />
          </button>
        </div>

        <div className="meal-scroll flex-1 overflow-y-auto flex flex-col" style={{ padding: `0 ${SPACE[4]} ${SPACE[4]}`, gap: SPACE[3] }}>
          {orders.length === 0 && (
            <p style={{ ...TEXT_STYLE.body, color: theme.textMuted, textAlign: "center", marginTop: SPACE[8] }}>{loc({ en: "No orders yet", ar: "لا توجد طلبات بعد" })}</p>
          )}
          {orders.map((o) => (
            <div key={o.id} style={{ backgroundColor: theme.surface, borderRadius: theme.radiusLg, padding: SPACE[3], boxShadow: SHADOW.sm }}>
              <div className="flex items-center justify-between" style={{ marginBottom: SPACE[2] }}>
                <div>
                  <span style={{ ...TEXT_STYLE.cardTitle, color: theme.primaryDark }}>{o.orderNumber}</span>
                  <span style={{ ...TEXT_STYLE.caption, color: theme.textMuted, marginInlineStart: "10px" }}>{o.mealType}</span>
                </div>
                <span style={{ ...TEXT_STYLE.micro, color: theme.textInverse, padding: "5px 12px", borderRadius: theme.radiusFull, backgroundColor: statusColor(o.status) }}>
                  {loc(STATUS_LABEL[o.status] ?? { en: o.status, ar: o.status })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {o.items.map((it, idx) => (
                  <span
                    key={`${o.id}-${idx}`}
                    style={{ ...TEXT_STYLE.pill, color: theme.textBody, padding: "5px 12px", borderRadius: theme.radiusFull, backgroundColor: theme.primarySubtle }}
                  >
                    {loc(it.name)}
                    {it.quantity > 1 ? ` ×${it.quantity}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
