import "server-only";

import { Timestamp, type WriteBatch } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { listsCollectionPath, profilesCollectionPath, tasksCollectionPath } from "@/lib/firestore/paths";
import type { BackupExport } from "@/lib/validation/schemas";

export type ImportSummary = {
  profilesImported: number;
  listsImported: number;
  tasksImported: number;
};

const MAX_OPS_PER_BATCH = 400; // Firestore's real limit is 500; leave headroom.

function toTimestampOrNull(value: string | null): Timestamp | null {
  return value ? Timestamp.fromDate(new Date(value)) : null;
}

/**
 * Imports a backup as a brand-new copy under the authenticated family
 * (specification §27): every profile/list/task gets a fresh Firestore
 * ID (never overwrites anything existing), taskCount/completedCount are
 * recalculated from the imported *active* task documents rather than
 * trusted from the file, and each list's currentCycle is preserved
 * as-is so imported tasks' completedCycle values stay meaningful.
 */
export async function importFamilyBackup(
  familyId: string,
  payload: BackupExport,
): Promise<ImportSummary> {
  const profileIdMap = new Map<string, string>();
  const listIdMap = new Map<string, string>();

  // Recalculate counts from active (non-deleted) tasks in the payload —
  // never trust the file's own taskCount/completedCount fields.
  const currentCycleByOldListId = new Map(payload.lists.map((l) => [l.id, l.currentCycle]));
  const countsByOldListId = new Map<string, { taskCount: number; completedCount: number }>(
    payload.lists.map((l) => [l.id, { taskCount: 0, completedCount: 0 }]),
  );
  for (const task of payload.tasks) {
    if (task.isDeleted) continue;
    const counts = countsByOldListId.get(task.listId);
    if (!counts) continue; // orphaned reference in the file — skip defensively
    counts.taskCount += 1;
    if (task.completedCycle === currentCycleByOldListId.get(task.listId)) {
      counts.completedCount += 1;
    }
  }

  let batch: WriteBatch = adminFirestore.batch();
  let opCount = 0;
  const pendingCommits: Promise<unknown>[] = [];

  function queueSet(ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>) {
    batch.set(ref, data);
    opCount += 1;
    if (opCount >= MAX_OPS_PER_BATCH) {
      pendingCommits.push(batch.commit());
      batch = adminFirestore.batch();
      opCount = 0;
    }
  }

  const profilesCollection = adminFirestore.collection(profilesCollectionPath(familyId));

  for (const profile of payload.profiles) {
    const newProfileRef = profilesCollection.doc();
    profileIdMap.set(profile.id, newProfileRef.id);

    queueSet(newProfileRef, {
      name: profile.name,
      avatar: profile.avatar,
      themeColor: profile.themeColor,
      displayOrder: profile.displayOrder,
      isDeleted: profile.isDeleted,
      deletedAt: toTimestampOrNull(profile.deletedAt),
      createdAt: toTimestampOrNull(profile.createdAt) ?? Timestamp.now(),
      updatedAt: toTimestampOrNull(profile.updatedAt) ?? Timestamp.now(),
    });
  }

  for (const list of payload.lists) {
    const newProfileId = profileIdMap.get(list.profileId);
    if (!newProfileId) continue; // orphaned reference in the file — skip defensively

    const newListRef = adminFirestore.collection(listsCollectionPath(familyId, newProfileId)).doc();
    listIdMap.set(list.id, newListRef.id);

    const counts = countsByOldListId.get(list.id) ?? { taskCount: 0, completedCount: 0 };

    queueSet(newListRef, {
      name: list.name,
      resetType: list.resetType,
      resetTime: list.resetTime,
      weeklyResetDay: list.weeklyResetDay,
      timezone: list.timezone,
      nextResetAt: toTimestampOrNull(list.nextResetAt),
      lastResetAt: toTimestampOrNull(list.lastResetAt),
      currentCycle: list.currentCycle,
      taskCount: counts.taskCount,
      completedCount: counts.completedCount,
      celebrationCycle: list.celebrationCycle,
      displayOrder: list.displayOrder,
      isDeleted: list.isDeleted,
      deletedAt: toTimestampOrNull(list.deletedAt),
      createdAt: toTimestampOrNull(list.createdAt) ?? Timestamp.now(),
      updatedAt: toTimestampOrNull(list.updatedAt) ?? Timestamp.now(),
    });
  }

  // Deterministic fallback order (specification: task reordering) for a
  // backup exported before displayOrder existed — position within the
  // file, per original list, in the order tasks appear in the payload.
  const fallbackOrderByOldListId = new Map<string, number>();

  let tasksImported = 0;
  for (const task of payload.tasks) {
    const newListId = listIdMap.get(task.listId);
    if (!newListId) continue; // orphaned reference (or parent list skipped) — skip defensively

    const originalList = payload.lists.find((l) => l.id === task.listId);
    if (!originalList) continue;
    const newProfileIdForTask = profileIdMap.get(originalList.profileId);
    if (!newProfileIdForTask) continue;

    const newTaskRef = adminFirestore
      .collection(tasksCollectionPath(familyId, newProfileIdForTask, newListId))
      .doc();

    let displayOrder = task.displayOrder;
    if (displayOrder === undefined) {
      const fallback = fallbackOrderByOldListId.get(task.listId) ?? 0;
      displayOrder = fallback;
      fallbackOrderByOldListId.set(task.listId, fallback + 1);
    }

    queueSet(newTaskRef, {
      title: task.title,
      description: task.description ?? null,
      imageKey: task.imageKey,
      completedCycle: task.completedCycle,
      displayOrder,
      isDeleted: task.isDeleted,
      deletedAt: toTimestampOrNull(task.deletedAt),
      createdAt: toTimestampOrNull(task.createdAt) ?? Timestamp.now(),
      updatedAt: toTimestampOrNull(task.updatedAt) ?? Timestamp.now(),
    });
    tasksImported += 1;
  }

  if (opCount > 0) {
    pendingCommits.push(batch.commit());
  }
  await Promise.all(pendingCommits);

  return {
    profilesImported: profileIdMap.size,
    listsImported: listIdMap.size,
    tasksImported,
  };
}
