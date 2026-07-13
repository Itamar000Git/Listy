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
import type { ProfileDocument, ProfileWithId } from "@/lib/types/domain";

/**
 * Read-only, display-only Firestore listener (specification §23) — it
 * never mutates, resets, or grants anything. Sorting by displayOrder
 * happens client-side rather than via a Firestore orderBy() to avoid
 * requiring a composite index for the isDeleted-equality + displayOrder
 * combination at this small family scale. `onError` fires for genuine
 * connectivity/permission failures — distinct from "still loading".
 */
export function subscribeToActiveProfiles(
  familyId: string,
  onChange: (profiles: ProfileWithId[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const profilesQuery = query(
    collection(firestoreClient, "families", familyId, "profiles"),
    where("isDeleted", "==", false),
  );

  return onSnapshot(
    profilesQuery,
    (snapshot) => {
      const profiles = snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as ProfileDocument) }))
        .sort((a, b) => a.displayOrder - b.displayOrder);
      onChange(profiles);
    },
    onError,
  );
}

/** Read-only single-profile listener, used by the edit screen. */
export function subscribeToProfile(
  familyId: string,
  profileId: string,
  onChange: (profile: ProfileWithId | null) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const profileRef = doc(firestoreClient, "families", familyId, "profiles", profileId);

  return onSnapshot(
    profileRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange({ id: snapshot.id, ...(snapshot.data() as ProfileDocument) });
    },
    onError,
  );
}
