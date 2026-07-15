import { beforeEach, describe, expect, it, vi } from "vitest";

const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
let autoIdCounter = 0;

function fakeDocRef(basePath: string) {
  autoIdCounter += 1;
  return { path: `${basePath}/auto-${autoIdCounter}`, id: `auto-${autoIdCounter}` };
}

const batchSet = vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
  writes.push({ path: ref.path, data });
});
const batchCommit = vi.fn(() => Promise.resolve());
const batch = vi.fn(() => ({ set: batchSet, commit: batchCommit }));

const collection = vi.fn((path: string) => ({
  doc: () => fakeDocRef(path),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminFirestore: { batch, collection },
}));

const { importFamilyBackup } = await import("@/lib/backup/import-family");

function makeBackup() {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1 as const,
    exportedAt: now,
    family: { name: "משפחה", timezone: "Asia/Jerusalem" },
    profiles: [
      {
        id: "old-profile-1",
        name: "דנה",
        avatar: null,
        themeColor: "lavender" as const,
        displayOrder: 0,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    lists: [
      {
        id: "old-list-1",
        profileId: "old-profile-1",
        name: "משימות בוקר",
        resetType: "daily" as const,
        resetTime: "04:00",
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        nextResetAt: now,
        lastResetAt: null,
        currentCycle: 3,
        // Deliberately wrong/stale counts in the file — the import must
        // NOT trust these and must recompute from the task list instead.
        taskCount: 999,
        completedCount: 999,
        celebrationCycle: null,
        displayOrder: 0,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    tasks: [
      // Active, completed in the current cycle (3) → counts toward both.
      {
        id: "old-task-1",
        listId: "old-list-1",
        title: "משימה א",
        description: "לצחצח במשך שתי דקות",
        imageKey: "generic" as const,
        completedCycle: 3,
        displayOrder: 0,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      // Active, NOT completed in the current cycle → counts toward taskCount only.
      // No `description` field at all — simulates a backup exported before
      // the description feature existed.
      {
        id: "old-task-2",
        listId: "old-list-1",
        title: "משימה ב",
        imageKey: "generic" as const,
        completedCycle: null,
        displayOrder: 1,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      // Soft-deleted → must NOT count toward taskCount or completedCount,
      // but IS still recreated (history preserved).
      {
        id: "old-task-3",
        listId: "old-list-1",
        title: "משימה ג (נמחקה)",
        imageKey: "generic" as const,
        completedCycle: 3,
        displayOrder: 2,
        isDeleted: true,
        deletedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

beforeEach(() => {
  writes.length = 0;
  autoIdCounter = 0;
  batchSet.mockClear();
  batchCommit.mockClear();
  batch.mockClear();
  collection.mockClear();
});

describe("importFamilyBackup", () => {
  it("recalculates taskCount/completedCount from active tasks, ignoring the file's own counts", async () => {
    const summary = await importFamilyBackup("family-1", makeBackup());

    expect(summary).toEqual({ profilesImported: 1, listsImported: 1, tasksImported: 3 });

    const listWrite = writes.find((w) => w.path.includes("/lists/"));
    expect(listWrite?.data).toMatchObject({
      taskCount: 2, // 2 active tasks, not the file's bogus 999
      completedCount: 1, // only the one active task completed in cycle 3
      currentCycle: 3, // preserved as-is from the file
    });
  });

  it("still recreates soft-deleted tasks (history preserved) even though they don't count toward the totals", async () => {
    await importFamilyBackup("family-1", makeBackup());

    const taskWrites = writes.filter((w) => w.path.includes("/tasks/"));
    expect(taskWrites).toHaveLength(3);

    const deletedTaskWrite = taskWrites.find((w) => w.data.title === "משימה ג (נמחקה)");
    expect(deletedTaskWrite?.data).toMatchObject({ isDeleted: true });
  });

  it("creates every profile/list/task as a brand-new document (new IDs), never overwriting", async () => {
    await importFamilyBackup("family-1", makeBackup());

    // All doc refs came from collection().doc() with no argument (auto-ID),
    // never collection().doc(existingId) — verified indirectly: every
    // write path contains our fake "auto-N" id, never the original
    // "old-profile-1" / "old-list-1" / "old-task-*" ids.
    for (const write of writes) {
      expect(write.path).not.toContain("old-profile-1");
      expect(write.path).not.toContain("old-list-1");
      expect(write.path).not.toMatch(/old-task-\d/);
    }
  });

  it("preserves an imported task's description", async () => {
    await importFamilyBackup("family-1", makeBackup());

    const taskWrites = writes.filter((w) => w.path.includes("/tasks/"));
    const withDescription = taskWrites.find((w) => w.data.title === "משימה א");
    expect(withDescription?.data.description).toBe("לצחצח במשך שתי דקות");
  });

  it("normalizes a task with no description field (older backup) to null, not undefined", async () => {
    await importFamilyBackup("family-1", makeBackup());

    const taskWrites = writes.filter((w) => w.path.includes("/tasks/"));
    const withoutDescription = taskWrites.find((w) => w.data.title === "משימה ב");
    expect(withoutDescription?.data.description).toBeNull();
  });

  it("assigns a deterministic fallback displayOrder (position within the file, per list) when the backup predates task ordering", async () => {
    const backup = makeBackup();
    // Simulate an older export: no task in this backup has displayOrder.
    for (const task of backup.tasks) {
      delete (task as { displayOrder?: number }).displayOrder;
    }

    await importFamilyBackup("family-1", backup);

    const taskWrites = writes.filter((w) => w.path.includes("/tasks/"));
    const orderByTitle: Record<string, unknown> = {};
    for (const w of taskWrites) orderByTitle[w.data.title as string] = w.data.displayOrder;

    expect(orderByTitle["משימה א"]).toBe(0);
    expect(orderByTitle["משימה ב"]).toBe(1);
    expect(orderByTitle["משימה ג (נמחקה)"]).toBe(2);
  });

  it("skips tasks/lists that reference a parent not present in the file (defensive, no crash)", async () => {
    const backup = makeBackup();
    backup.tasks.push({
      id: "orphan-task",
      listId: "list-that-does-not-exist",
      title: "יתום",
      imageKey: "generic" as const,
      completedCycle: null,
      displayOrder: 99,
      isDeleted: false,
      deletedAt: null,
      createdAt: backup.exportedAt,
      updatedAt: backup.exportedAt,
    });

    const summary = await importFamilyBackup("family-1", backup);
    expect(summary.tasksImported).toBe(3); // the orphan is not imported
  });
});
