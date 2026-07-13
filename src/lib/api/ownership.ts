import "server-only";

import type { Firestore, Transaction } from "firebase-admin/firestore";
import { profilePath, listPath } from "@/lib/firestore/paths";

/**
 * Guards against mutating anything under a soft-deleted parent (a
 * soft-deleted profile's lists, or a soft-deleted list's tasks) — the
 * parent being soft-deleted must block further writes to its children,
 * not just reads/selection. Reads happen via the caller's own
 * transaction where one is in flight, so the check stays consistent
 * with the rest of that transaction's writes.
 */

export async function isProfileActive(
  db: Firestore,
  familyId: string,
  profileId: string,
  transaction?: Transaction,
): Promise<boolean> {
  const ref = db.doc(profilePath(familyId, profileId));
  const snapshot = transaction ? await transaction.get(ref) : await ref.get();
  return snapshot.exists && !snapshot.data()?.isDeleted;
}

export async function isListActive(
  db: Firestore,
  familyId: string,
  profileId: string,
  listId: string,
  transaction?: Transaction,
): Promise<boolean> {
  const ref = db.doc(listPath(familyId, profileId, listId));
  const snapshot = transaction ? await transaction.get(ref) : await ref.get();
  return snapshot.exists && !snapshot.data()?.isDeleted;
}
