import "server-only";

import type { Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import {
  familyPath,
  listsCollectionPath,
  profilesCollectionPath,
  tasksCollectionPath,
} from "@/lib/firestore/paths";
import { BACKUP_SCHEMA_VERSION } from "@/lib/backup/schema-version";

function tsToIso(value: Timestamp | null | undefined): string | null {
  return value ? value.toDate().toISOString() : null;
}

/**
 * Builds the full backup export for a family (specification §27):
 * family metadata, and every profile/list/task — including
 * soft-deleted ones, so a restore can faithfully reproduce history.
 * Never includes credentials: only Firestore document fields, no
 * Firebase Auth data, no tokens, no password.
 */
export async function buildFamilyExport(familyId: string) {
  const familySnapshot = await adminFirestore.doc(familyPath(familyId)).get();
  const familyData = familySnapshot.data() ?? {};

  const profiles: Record<string, unknown>[] = [];
  const lists: Record<string, unknown>[] = [];
  const tasks: Record<string, unknown>[] = [];

  const profileDocs = await adminFirestore.collection(profilesCollectionPath(familyId)).get();

  for (const profileDoc of profileDocs.docs) {
    const p = profileDoc.data();
    profiles.push({
      id: profileDoc.id,
      name: p.name,
      avatar: p.avatar ?? null,
      themeColor: p.themeColor,
      displayOrder: p.displayOrder ?? 0,
      isDeleted: Boolean(p.isDeleted),
      deletedAt: tsToIso(p.deletedAt),
      createdAt: tsToIso(p.createdAt) ?? new Date(0).toISOString(),
      updatedAt: tsToIso(p.updatedAt) ?? new Date(0).toISOString(),
    });

    const listDocs = await adminFirestore
      .collection(listsCollectionPath(familyId, profileDoc.id))
      .get();

    for (const listDoc of listDocs.docs) {
      const l = listDoc.data();
      lists.push({
        id: listDoc.id,
        profileId: profileDoc.id,
        name: l.name,
        resetType: l.resetType,
        resetTime: l.resetTime ?? null,
        weeklyResetDay: l.weeklyResetDay ?? null,
        timezone: l.timezone,
        nextResetAt: tsToIso(l.nextResetAt),
        lastResetAt: tsToIso(l.lastResetAt),
        currentCycle: l.currentCycle ?? 1,
        taskCount: l.taskCount ?? 0,
        completedCount: l.completedCount ?? 0,
        celebrationCycle: l.celebrationCycle ?? null,
        displayOrder: l.displayOrder ?? 0,
        isDeleted: Boolean(l.isDeleted),
        deletedAt: tsToIso(l.deletedAt),
        createdAt: tsToIso(l.createdAt) ?? new Date(0).toISOString(),
        updatedAt: tsToIso(l.updatedAt) ?? new Date(0).toISOString(),
      });

      const taskDocs = await adminFirestore
        .collection(tasksCollectionPath(familyId, profileDoc.id, listDoc.id))
        .get();

      for (const taskDoc of taskDocs.docs) {
        const t = taskDoc.data();
        tasks.push({
          id: taskDoc.id,
          listId: listDoc.id,
          title: t.title,
          imageKey: t.imageKey,
          completedCycle: t.completedCycle ?? null,
          displayOrder: t.displayOrder ?? 0,
          isDeleted: Boolean(t.isDeleted),
          deletedAt: tsToIso(t.deletedAt),
          createdAt: tsToIso(t.createdAt) ?? new Date(0).toISOString(),
          updatedAt: tsToIso(t.updatedAt) ?? new Date(0).toISOString(),
        });
      }
    }
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    family: {
      name: typeof familyData.name === "string" ? familyData.name : "",
      timezone: typeof familyData.timezone === "string" ? familyData.timezone : "Asia/Jerusalem",
    },
    profiles,
    lists,
    tasks,
  };
}
