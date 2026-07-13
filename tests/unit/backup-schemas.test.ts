import { describe, expect, it } from "vitest";
import { backupExportSchema } from "@/lib/validation/schemas";

function validBackup() {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    family: { name: "משפחת כהן", timezone: "Asia/Jerusalem" },
    profiles: [
      {
        id: "profile-1",
        name: "דנה",
        avatar: "🙂",
        themeColor: "lavender",
        displayOrder: 0,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    lists: [
      {
        id: "list-1",
        profileId: "profile-1",
        name: "משימות בוקר",
        resetType: "daily",
        resetTime: "04:00",
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        nextResetAt: new Date().toISOString(),
        lastResetAt: null,
        currentCycle: 1,
        taskCount: 1,
        completedCount: 0,
        celebrationCycle: null,
        displayOrder: 0,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    tasks: [
      {
        id: "task-1",
        listId: "list-1",
        title: "לצחצח שיניים",
        imageKey: "toothbrush",
        completedCycle: null,
        displayOrder: 0,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}

describe("backupExportSchema", () => {
  it("accepts a well-formed backup", () => {
    expect(backupExportSchema.safeParse(validBackup()).success).toBe(true);
  });

  it("rejects a malformed date string", () => {
    const backup = validBackup();
    backup.exportedAt = "not-a-date";
    expect(backupExportSchema.safeParse(backup).success).toBe(false);
  });

  it("rejects a negative taskCount", () => {
    const backup = validBackup();
    backup.lists[0].taskCount = -1;
    expect(backupExportSchema.safeParse(backup).success).toBe(false);
  });

  it("rejects an unknown imageKey", () => {
    const backup = validBackup();
    backup.tasks[0].imageKey = "not-a-real-key";
    expect(backupExportSchema.safeParse(backup).success).toBe(false);
  });

  it("rejects an unknown resetType", () => {
    const backup = validBackup();
    backup.lists[0].resetType = "monthly";
    expect(backupExportSchema.safeParse(backup).success).toBe(false);
  });

  it("rejects a profileId/listId/taskId containing a slash", () => {
    const backup = validBackup();
    backup.profiles[0].id = "a/b";
    expect(backupExportSchema.safeParse(backup).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const backup = validBackup();
    // @ts-expect-error intentionally invalid for the test
    delete backup.family.timezone;
    expect(backupExportSchema.safeParse(backup).success).toBe(false);
  });
});
