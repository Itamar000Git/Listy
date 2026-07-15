import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { GENERIC_TASK_IMAGE_KEYS } from "@/lib/images/generic-task-images";

/**
 * IDs (profileId/listId/taskId) are interpolated directly into Firestore
 * document paths (e.g. `families/{id}/profiles/{profileId}/lists/{listId}`).
 * Firestore's Admin SDK resolves a path by splitting on "/", so an ID
 * containing a slash would inject extra path segments and could resolve
 * to a document outside the intended family/profile/list subtree. This
 * schema rejects that before the value ever reaches a path builder.
 */
export const firestoreIdSchema = z
  .string()
  .min(1, "מזהה לא תקין")
  .max(200, "מזהה לא תקין")
  .refine((value) => !value.includes("/") && value !== "." && value !== "..", {
    message: "מזהה לא תקין",
  });

export const familyNameSchema = z
  .string()
  .trim()
  .min(1, "יש להזין שם משפחה")
  .max(40, "שם המשפחה ארוך מדי");

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .default("Asia/Jerusalem")
  .refine(
    (value) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: "אזור זמן לא תקין" },
  );

export const familyBootstrapSchema = z.object({
  name: familyNameSchema.optional(),
  timezone: timezoneSchema.optional(),
});

export const familyUpdateSchema = z.object({
  name: familyNameSchema.optional(),
  timezone: timezoneSchema.optional(),
});

export const profileNameSchema = z
  .string()
  .trim()
  .min(1, "יש להזין שם")
  .max(20, "השם ארוך מדי (עד 20 תווים)");

export const themeColorSchema = z.enum([
  "lavender",
  "light-pink",
  "pink",
  "light-blue",
  "sky-blue",
]);

export const profileCreateSchema = z.object({
  name: profileNameSchema,
  avatar: z.string().max(8).nullable().optional(),
  themeColor: themeColorSchema.default("lavender"),
});

export const profileUpdateSchema = z.object({
  profileId: firestoreIdSchema,
  name: profileNameSchema.optional(),
  avatar: z.string().max(8).nullable().optional(),
  themeColor: themeColorSchema.optional(),
});

export const profileDeleteSchema = z.object({
  profileId: firestoreIdSchema,
});

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `לפחות ${PASSWORD_MIN_LENGTH} תווים`)
  .max(PASSWORD_MAX_LENGTH, "הסיסמה ארוכה מדי");

export const listNameSchema = z
  .string()
  .trim()
  .min(1, "יש להזין שם לרשימה")
  .max(40, "שם הרשימה ארוך מדי");

export const resetTypeSchema = z.enum(["daily", "weekly", "never"]);

export const resetTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "פורמט שעה לא תקין (HH:mm)");

export const weeklyResetDaySchema = z.number().int().min(0).max(6);

function requiresWeeklyResetDay(data: { resetType?: string; weeklyResetDay?: number }) {
  return data.resetType !== "weekly" || data.weeklyResetDay !== undefined;
}

export const listCreateSchema = z
  .object({
    profileId: firestoreIdSchema,
    name: listNameSchema,
    resetType: resetTypeSchema,
    resetTime: resetTimeSchema.optional(),
    weeklyResetDay: weeklyResetDaySchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine(requiresWeeklyResetDay, {
    message: "יש לבחור יום בשבוע לאיפוס",
    path: ["weeklyResetDay"],
  });

export const listUpdateSchema = z
  .object({
    profileId: firestoreIdSchema,
    listId: firestoreIdSchema,
    name: listNameSchema.optional(),
    resetType: resetTypeSchema.optional(),
    resetTime: resetTimeSchema.optional(),
    weeklyResetDay: weeklyResetDaySchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine(requiresWeeklyResetDay, {
    message: "יש לבחור יום בשבוע לאיפוס",
    path: ["weeklyResetDay"],
  });

export const listDeleteSchema = z.object({
  profileId: firestoreIdSchema,
  listId: firestoreIdSchema,
});

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "יש להזין שם למשימה")
  .max(60, "שם המשימה ארוך מדי");

export const imageKeySchema = z.enum(GENERIC_TASK_IMAGE_KEYS);

/**
 * Optional free-text task instructions. Trimmed, capped at 500
 * characters, and normalized so an empty/whitespace-only value is
 * stored as `null` rather than an empty string. `.nullable().optional()`
 * lets callers distinguish "field omitted — leave unchanged" (undefined,
 * relevant for updates) from "explicitly cleared" (null) from "set"
 * (a non-empty string) — a non-string, non-null value is rejected.
 */
export const taskDescriptionSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length <= 500, "התיאור ארוך מדי (עד 500 תווים)")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const taskCreateSchema = z.object({
  profileId: firestoreIdSchema,
  listId: firestoreIdSchema,
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  imageKey: imageKeySchema.default("generic"),
});

export const taskUpdateSchema = z.object({
  profileId: firestoreIdSchema,
  listId: firestoreIdSchema,
  taskId: firestoreIdSchema,
  title: taskTitleSchema.optional(),
  description: taskDescriptionSchema,
  imageKey: imageKeySchema.optional(),
});

export const taskDeleteSchema = z.object({
  profileId: firestoreIdSchema,
  listId: firestoreIdSchema,
  taskId: firestoreIdSchema,
});

export const taskToggleCompletionSchema = z.object({
  profileId: firestoreIdSchema,
  listId: firestoreIdSchema,
  taskId: firestoreIdSchema,
});

/**
 * Bounded (max 200 active tasks per list is generous at family scale —
 * see specification §34) ordered array of task IDs representing the
 * desired top-to-bottom display order. Duplicate-ID rejection happens
 * here; "matches the server's active set exactly" is re-verified inside
 * the route's transaction against live data, since that can't be judged
 * from the payload shape alone.
 */
export const taskReorderSchema = z.object({
  profileId: firestoreIdSchema,
  listId: firestoreIdSchema,
  orderedTaskIds: z
    .array(firestoreIdSchema)
    .min(1, "אין משימות לסידור")
    .max(200, "יותר מדי משימות")
    .refine((ids) => new Set(ids).size === ids.length, { message: "מזהה משימה כפול" }),
});

export const listCheckResetSchema = z.object({
  profileId: firestoreIdSchema,
  listId: firestoreIdSchema,
});

// --- Backup export/import (specification §27) ---

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "תאריך לא תקין" });

const isoDateNullableSchema = isoDateSchema.nullable();

export const backupProfileSchema = z.object({
  id: firestoreIdSchema,
  name: profileNameSchema,
  avatar: z.string().max(8).nullable(),
  themeColor: themeColorSchema,
  displayOrder: z.number().int().min(0),
  isDeleted: z.boolean(),
  deletedAt: isoDateNullableSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const backupListSchema = z.object({
  id: firestoreIdSchema,
  profileId: firestoreIdSchema,
  name: listNameSchema,
  resetType: resetTypeSchema,
  resetTime: resetTimeSchema.nullable(),
  weeklyResetDay: weeklyResetDaySchema.nullable(),
  timezone: timezoneSchema,
  nextResetAt: isoDateNullableSchema,
  lastResetAt: isoDateNullableSchema,
  currentCycle: z.number().int().min(1),
  taskCount: z.number().int().min(0),
  completedCount: z.number().int().min(0),
  celebrationCycle: z.number().int().min(1).nullable(),
  displayOrder: z.number().int().min(0),
  isDeleted: z.boolean(),
  deletedAt: isoDateNullableSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const backupTaskSchema = z.object({
  id: firestoreIdSchema,
  listId: firestoreIdSchema,
  title: taskTitleSchema,
  // Optional so backups exported before this field existed still
  // validate — an absent value normalizes to null on import, same as a
  // task document that predates the feature (see TaskDocument).
  description: taskDescriptionSchema,
  imageKey: imageKeySchema,
  completedCycle: z.number().int().min(1).nullable(),
  // Optional so a backup exported before task reordering existed still
  // validates — import-family.ts assigns a deterministic fallback order
  // (position within the file) when it's missing.
  displayOrder: z.number().int().min(0).optional(),
  isDeleted: z.boolean(),
  deletedAt: isoDateNullableSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const backupExportSchema = z.object({
  schemaVersion: z.number().int(),
  exportedAt: isoDateSchema,
  family: z.object({
    name: z.string().max(40),
    timezone: z.string().max(100),
  }),
  profiles: z.array(backupProfileSchema).max(200),
  lists: z.array(backupListSchema).max(2000),
  tasks: z.array(backupTaskSchema).max(20000),
});

export type BackupExport = z.infer<typeof backupExportSchema>;
