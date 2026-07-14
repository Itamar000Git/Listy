/**
 * Built-in generic task illustrations (specification §9/§10). There is
 * no image upload — every task stores only an `imageKey`; the frontend
 * resolves it to a bundled asset under /public/images/tasks. Unknown or
 * missing keys fall back to "generic".
 */
export const GENERIC_TASK_IMAGE_KEYS = [
  "generic",
  "toothbrush",
  "shower",
  "clothes",
  "bed",
  "backpack",
  "homework",
  "toys",
  "meal",
  "water",
  "sleep",
  "clean-room",
  "reading",
  "exercise",
  "helping-home",
  "toilet",
  "ponytail",
  "hairbrush",
  "wash-hands",
  "wash-face",
  "shoes",
  "pajamas",
  "snack",
  "coat",
] as const;

export type GenericTaskImageKey = (typeof GENERIC_TASK_IMAGE_KEYS)[number];

export const GENERIC_TASK_IMAGE_LABELS_HE: Record<GenericTaskImageKey, string> = {
  generic: "כללי",
  toothbrush: "צחצוח שיניים",
  shower: "מקלחת",
  clothes: "התלבשות",
  bed: "סידור מיטה",
  backpack: "אריזת תיק",
  homework: "שיעורי בית",
  toys: "סידור צעצועים",
  meal: "ארוחה",
  water: "שתיית מים",
  sleep: "שינה",
  "clean-room": "ניקיון חדר",
  reading: "קריאה",
  exercise: "פעילות גופנית",
  "helping-home": "עזרה בבית",
  toilet: "שירותים",
  ponytail: "קשירת שיער",
  hairbrush: "סירוק שיער",
  "wash-hands": "שטיפת ידיים",
  "wash-face": "שטיפת פנים",
  shoes: "נעילת נעליים",
  pajamas: "לבישת פיג'מה",
  snack: "אכילת חטיף",
  coat: "לבישת מעיל",
};

export function isGenericTaskImageKey(value: string): value is GenericTaskImageKey {
  return (GENERIC_TASK_IMAGE_KEYS as readonly string[]).includes(value);
}

export function resolveTaskImagePath(imageKey: string): string {
  const key = isGenericTaskImageKey(imageKey) ? imageKey : "generic";
  return `/images/tasks/${key}.svg`;
}
