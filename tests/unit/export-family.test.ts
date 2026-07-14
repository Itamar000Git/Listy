import { beforeEach, describe, expect, it, vi } from "vitest";

const familyGet = vi.fn();
const profilesGet = vi.fn();
const listsGet = vi.fn();
const tasksGet = vi.fn();

const doc = vi.fn(() => ({ get: familyGet }));
const collection = vi.fn((path: string) => {
  if (path.includes("/tasks")) return { get: tasksGet };
  if (path.includes("/lists")) return { get: listsGet };
  return { get: profilesGet };
});

vi.mock("@/lib/firebase/admin", () => ({ adminFirestore: { doc, collection } }));

const { buildFamilyExport } = await import("@/lib/backup/export-family");

function fakeTimestamp(date = new Date("2026-01-01T00:00:00Z")) {
  return { toDate: () => date };
}

beforeEach(() => {
  doc.mockClear();
  collection.mockClear();
  familyGet.mockReset();
  profilesGet.mockReset();
  listsGet.mockReset();
  tasksGet.mockReset();

  familyGet.mockResolvedValue({ data: () => ({ name: "משפחה", timezone: "Asia/Jerusalem" }) });
  profilesGet.mockResolvedValue({
    docs: [
      {
        id: "profile-1",
        data: () => ({
          name: "דנה",
          avatar: null,
          themeColor: "lavender",
          displayOrder: 0,
          isDeleted: false,
          deletedAt: null,
          createdAt: fakeTimestamp(),
          updatedAt: fakeTimestamp(),
        }),
      },
    ],
  });
  listsGet.mockResolvedValue({
    docs: [
      {
        id: "list-1",
        data: () => ({
          name: "משימות בוקר",
          resetType: "daily",
          resetTime: "04:00",
          weeklyResetDay: null,
          timezone: "Asia/Jerusalem",
          nextResetAt: fakeTimestamp(),
          lastResetAt: null,
          currentCycle: 1,
          taskCount: 2,
          completedCount: 0,
          celebrationCycle: null,
          displayOrder: 0,
          isDeleted: false,
          deletedAt: null,
          createdAt: fakeTimestamp(),
          updatedAt: fakeTimestamp(),
        }),
      },
    ],
  });
});

describe("buildFamilyExport", () => {
  it("includes a task's description when present", async () => {
    tasksGet.mockResolvedValue({
      docs: [
        {
          id: "task-1",
          data: () => ({
            title: "לצחצח שיניים",
            description: "לצחצח במשך שתי דקות",
            imageKey: "toothbrush",
            completedCycle: null,
            displayOrder: 0,
            isDeleted: false,
            deletedAt: null,
            createdAt: fakeTimestamp(),
            updatedAt: fakeTimestamp(),
          }),
        },
      ],
    });

    const result = await buildFamilyExport("family-1");
    expect(result.tasks[0].description).toBe("לצחצח במשך שתי דקות");
  });

  it("defaults description to null for a task document with no such field (pre-existing data)", async () => {
    tasksGet.mockResolvedValue({
      docs: [
        {
          id: "task-1",
          data: () => ({
            title: "לצחצח שיניים",
            imageKey: "toothbrush",
            completedCycle: null,
            displayOrder: 0,
            isDeleted: false,
            deletedAt: null,
            createdAt: fakeTimestamp(),
            updatedAt: fakeTimestamp(),
          }),
        },
      ],
    });

    const result = await buildFamilyExport("family-1");
    expect(result.tasks[0].description).toBeNull();
  });
});
