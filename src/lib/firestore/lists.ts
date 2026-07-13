import "client-only";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { firestoreClient } from "@/lib/firebase/client";
import type { ListDocument, ListWithId } from "@/lib/types/domain";

/**
 * Read-only, display-only Firestore listener (specification §23) under
 * families/{familyId}/profiles/{profileId}/lists — sorting by
 * displayOrder happens client-side to avoid requiring a composite index
 * at this small family scale (see subscribeToActiveProfiles for the
 * same reasoning). `onError` fires for genuine connectivity/permission
 * failures — distinct from "still loading" or "not found".
 */
export function subscribeToActiveLists(
  familyId: string,
  profileId: string,
  onChange: (lists: ListWithId[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const listsQuery = query(
    collection(firestoreClient, "families", familyId, "profiles", profileId, "lists"),
    where("isDeleted", "==", false),
  );

  return onSnapshot(
    listsQuery,
    (snapshot) => {
      const lists = snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as ListDocument) }))
        .sort((a, b) => a.displayOrder - b.displayOrder);
      onChange(lists);
    },
    onError,
  );
}

/** Read-only single-list listener, used by the edit screen. */
export function subscribeToList(
  familyId: string,
  profileId: string,
  listId: string,
  onChange: (list: ListWithId | null) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const listRef = doc(firestoreClient, "families", familyId, "profiles", profileId, "lists", listId);

  return onSnapshot(
    listRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange({ id: snapshot.id, ...(snapshot.data() as ListDocument) });
    },
    onError,
  );
}
