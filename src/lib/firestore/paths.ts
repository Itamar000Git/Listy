import "server-only";

/**
 * Central Firestore path builders. The Firebase Authentication UID is
 * used directly as the family document ID throughout the app
 * (see specification §17 and §24).
 */

export function familyPath(familyId: string): string {
  return `families/${familyId}`;
}

export function profilesCollectionPath(familyId: string): string {
  return `families/${familyId}/profiles`;
}

export function profilePath(familyId: string, profileId: string): string {
  return `families/${familyId}/profiles/${profileId}`;
}

/**
 * Task lists live at families/{familyId}/profiles/{profileId}/lists/{listId}
 * — the collection is named "lists", not "taskLists".
 */
export function listsCollectionPath(familyId: string, profileId: string): string {
  return `families/${familyId}/profiles/${profileId}/lists`;
}

export function listPath(familyId: string, profileId: string, listId: string): string {
  return `families/${familyId}/profiles/${profileId}/lists/${listId}`;
}

/**
 * Tasks live at
 * families/{familyId}/profiles/{profileId}/lists/{listId}/tasks/{taskId}
 */
export function tasksCollectionPath(familyId: string, profileId: string, listId: string): string {
  return `families/${familyId}/profiles/${profileId}/lists/${listId}/tasks`;
}

export function taskPath(
  familyId: string,
  profileId: string,
  listId: string,
  taskId: string,
): string {
  return `families/${familyId}/profiles/${profileId}/lists/${listId}/tasks/${taskId}`;
}
