import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const doc = vi.fn((path: string) => ({ path }));
const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

let listData: Record<string, unknown>;
let taskData: Record<string, unknown>;

const runTransaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
  const transaction = {
    get: vi.fn(async (ref: { path: string }) => {
      if (ref.path.includes("/tasks/")) return { exists: true, data: () => taskData };
      return { exists: true, data: () => listData };
    }),
    update: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
      updates.push({ path: ref.path, data });
    }),
  };
  return callback(transaction);
});

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({ adminFirestore: { doc, runTransaction } }));

const { POST } = await import("@/app/api/tasks/delete/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/tasks/delete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authenticateFamily.mockReset();
  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
  doc.mockClear();
  runTransaction.mockClear();
  updates.length = 0;

  listData = { currentCycle: 1, taskCount: 3, completedCount: 1 };
  taskData = { isDeleted: false, completedCycle: null };
});

describe("POST /api/tasks/delete", () => {
  it("decrements taskCount but leaves completedCount untouched for an incomplete task", async () => {
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    expect(response.status).toBe(200);

    const listUpdate = updates.find((u) => !u.path.includes("/tasks/"));
    expect(listUpdate?.data.taskCount).toBe(2);
    // completedCount is omitted entirely (not rewritten) since it isn't
    // changing — Firestore's stored value (1) is left as-is.
    expect(listUpdate?.data.completedCount).toBeUndefined();
  });

  it("decrements both taskCount and completedCount for a task completed in the current cycle", async () => {
    taskData = { isDeleted: false, completedCycle: 1 };

    await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));

    const listUpdate = updates.find((u) => !u.path.includes("/tasks/"));
    expect(listUpdate?.data).toMatchObject({ taskCount: 2, completedCount: 0 });
  });

  it("never lets counters go negative", async () => {
    listData = { currentCycle: 1, taskCount: 0, completedCount: 0 };
    taskData = { isDeleted: false, completedCycle: 1 };

    await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));

    const listUpdate = updates.find((u) => !u.path.includes("/tasks/"));
    expect(listUpdate?.data).toMatchObject({ taskCount: 0, completedCount: 0 });
  });

  it("is idempotent — deleting an already-deleted task is a no-op success", async () => {
    taskData = { isDeleted: true, completedCycle: null };

    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updates).toHaveLength(0);
  });
});
