import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const doc = vi.fn((path: string) => ({ path }));
const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

let listData: Record<string, unknown>;
let taskData: Record<string, unknown>;

const runTransaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
  const transaction = {
    get: vi.fn(async (ref: { path: string }) => {
      if (ref.path.includes("/tasks/")) {
        return { exists: true, data: () => taskData };
      }
      return { exists: true, data: () => listData };
    }),
    update: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
      updates.push({ path: ref.path, data });
    }),
  };
  return callback(transaction);
});

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({
  adminFirestore: { doc, runTransaction },
}));

const { POST } = await import("@/app/api/tasks/toggle-completion/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/tasks/toggle-completion", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function defaultListData(overrides: Record<string, unknown> = {}) {
  return {
    isDeleted: false,
    resetType: "never",
    resetTime: null,
    weeklyResetDay: null,
    timezone: "Asia/Jerusalem",
    nextResetAt: null,
    currentCycle: 1,
    taskCount: 3,
    completedCount: 0,
    celebrationCycle: null,
    ...overrides,
  };
}

beforeEach(() => {
  authenticateFamily.mockReset();
  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
  doc.mockClear();
  runTransaction.mockClear();
  updates.length = 0;

  listData = defaultListData();
  taskData = { isDeleted: false, completedCycle: null };
});

describe("POST /api/tasks/toggle-completion", () => {
  it("returns 401 when authentication fails", async () => {
    authenticateFamily.mockResolvedValueOnce({
      errorResponse: Response.json({ ok: false }, { status: 401 }),
    });

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    expect(response.status).toBe(401);
  });

  it("completes an incomplete task", async () => {
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      completed: true,
      completedCount: 1,
      taskCount: 3,
      allCompleted: false,
      celebrationTriggered: false,
      currentCycle: 1,
    });
  });

  it("uncompletes an already-completed task and preserves celebrationCycle's existing value", async () => {
    // celebrationCycle already set from an earlier completion of the list —
    // uncompleting one task must not clear it (specification §20).
    listData = defaultListData({ completedCount: 1, celebrationCycle: 1 });
    taskData = { isDeleted: false, completedCycle: 1 }; // matches currentCycle → completed

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    const body = await response.json();

    expect(body).toMatchObject({ completed: false, completedCount: 0 });

    const listUpdate = updates.find((u) => !u.path.includes("/tasks/"));
    expect(listUpdate?.data.celebrationCycle).toBe(1);
  });

  it("triggers the celebration exactly when the last task is completed", async () => {
    listData = defaultListData({ taskCount: 1, completedCount: 0, celebrationCycle: null });

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    const body = await response.json();

    expect(body).toMatchObject({
      completed: true,
      completedCount: 1,
      taskCount: 1,
      allCompleted: true,
      celebrationTriggered: true,
    });
  });

  it("does not re-trigger the celebration if it already fired for this cycle", async () => {
    // e.g. uncomplete-then-recomplete the last task within the same cycle.
    listData = defaultListData({ taskCount: 1, completedCount: 0, celebrationCycle: 1 });

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    const body = await response.json();

    expect(body.allCompleted).toBe(true);
    expect(body.celebrationTriggered).toBe(false);
  });

  it("never lets completedCount exceed taskCount", async () => {
    listData = defaultListData({ taskCount: 1, completedCount: 1 });
    taskData = { isDeleted: false, completedCycle: null }; // inconsistent state, defensive check

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    const body = await response.json();

    expect(body.completedCount).toBeLessThanOrEqual(1);
  });

  it("applies a due lazy reset within the same transaction before toggling", async () => {
    listData = defaultListData({
      resetType: "daily",
      resetTime: "04:00",
      nextResetAt: { toDate: () => new Date("2020-01-01T00:00:00Z") }, // far in the past
      currentCycle: 5,
      completedCount: 3,
      celebrationCycle: 5,
    });
    taskData = { isDeleted: false, completedCycle: 5 }; // was completed under the OLD cycle

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    const body = await response.json();

    // After the reset, cycle advances to 6 and the task (still tagged
    // with cycle 5) reads as incomplete, so tapping it completes it
    // under the new cycle rather than uncompleting it.
    expect(body.currentCycle).toBe(6);
    expect(body.completed).toBe(true);
    expect(body.completedCount).toBe(1);

    const listUpdate = updates.find((u) => !u.path.includes("/tasks/"));
    expect(listUpdate?.data).toMatchObject({ currentCycle: 6, completedCount: 1 });
  });

  it("returns 400 when the task does not exist", async () => {
    // Simulate a missing task by overriding get() for this one call.
    runTransaction.mockImplementationOnce(async (callback: (txn: unknown) => Promise<unknown>) => {
      const transaction = {
        get: vi.fn(async (ref: { path: string }) => {
          if (ref.path.includes("/tasks/")) return { exists: false, data: () => undefined };
          return { exists: true, data: () => listData };
        }),
        update: vi.fn(),
      };
      return callback(transaction);
    });

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "missing" }));
    expect(response.status).toBe(400);
  });
});
