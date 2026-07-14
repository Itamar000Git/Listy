import type { Timestamp } from "firebase/firestore";

/**
 * Client-facing Firestore document shapes (specification §17).
 * Used for typing `onSnapshot` listener results in Client Components.
 * Server-side Route Handlers use the Admin SDK's own Timestamp type
 * directly rather than importing this file.
 */

export type FamilyDocument = {
  name: string;
  timezone: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ProfileDocument = {
  name: string;
  avatar: string | null;
  themeColor: string;
  displayOrder: number;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ProfileWithId = ProfileDocument & { id: string };

export type ResetType = "daily" | "weekly" | "never";

/**
 * families/{familyId}/profiles/{profileId}/lists/{listId}
 * Cycle-based reset bookkeeping (specification §18): a reset only ever
 * touches this document, never the tasks in the lists's subcollection.
 */
export type ListDocument = {
  name: string;
  resetType: ResetType;
  resetTime: string | null;
  weeklyResetDay: number | null;
  timezone: string;
  nextResetAt: Timestamp | null;
  lastResetAt: Timestamp | null;
  currentCycle: number;
  taskCount: number;
  completedCount: number;
  celebrationCycle: number | null;
  displayOrder: number;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ListWithId = ListDocument & { id: string };

/**
 * families/{familyId}/profiles/{profileId}/lists/{listId}/tasks/{taskId}
 * A task is completed when task.completedCycle === list.currentCycle
 * (specification §17-18) — isCompleted is deliberately not stored.
 *
 * `description` is optional free text added after the initial launch;
 * task documents created before it existed simply lack the field, so
 * readers treat a missing value the same as `null` rather than
 * requiring a migration.
 */
export type TaskDocument = {
  title: string;
  description: string | null;
  imageKey: string;
  completedCycle: number | null;
  displayOrder: number;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TaskWithId = TaskDocument & { id: string };
