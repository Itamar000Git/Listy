import "client-only";

import {
  collection,
  doc,
  onSnapshot,
  where,
  query,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { firestoreClient } from "@/lib/firebase/client";
import type { TaskDocument, TaskWithId } from "@/lib/types/domain";

/**
 * Read-only, display-only Firestore listener (specification §23). Never
 * mutates, resets, or grants a celebration — that's exclusively the
 * trusted /api/tasks/toggle-completion route's job. `onError` fires for
 * genuine connectivity/permission failures.
 */
export function subscribeToActiveTasks(
  familyId: string,
  profileId: string,
  listId: string,
  onChange: (tasks: TaskWithId[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const tasksQuery = query(
    collection(
      firestoreClient,
      "families",
      familyId,
      "profiles",
      profileId,
      "lists",
      listId,
      "tasks",
    ),
    where("isDeleted", "==", false),
  );

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      const tasks = snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as TaskDocument) }))
        .sort((a, b) => {
          // Deterministic fallback for any task document that predates
          // displayOrder (or has an otherwise missing/equal value):
          // creation time, then document ID.
          const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          const createdA = a.createdAt?.toMillis() ?? 0;
          const createdB = b.createdAt?.toMillis() ?? 0;
          if (createdA !== createdB) return createdA - createdB;
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
      onChange(tasks);
    },
    onError,
  );
}

/** Read-only single-task listener, used by the edit screen. */
export function subscribeToTask(
  familyId: string,
  profileId: string,
  listId: string,
  taskId: string,
  onChange: (task: TaskWithId | null) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const taskRef = doc(
    firestoreClient,
    "families",
    familyId,
    "profiles",
    profileId,
    "lists",
    listId,
    "tasks",
    taskId,
  );

  return onSnapshot(
    taskRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange({ id: snapshot.id, ...(snapshot.data() as TaskDocument) });
    },
    onError,
  );
}
