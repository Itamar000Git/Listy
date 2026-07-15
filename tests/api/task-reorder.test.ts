import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

let profileData: Record<string, unknown>;
let listData: Record<string, unknown>;
let activeTaskIds: string[];

const doc = vi.fn((path: string) => ({ path }));
const collectionWhereGet = vi.fn();
const collection = vi.fn(() => ({ where: () => ({ get: collectionWhereGet }) }));

const runTransaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
  const transaction = {
    get: vi.fn(async (refOrQuery: { path?: string } | { get: unknown }) => {
      if ("path" in refOrQuery) {
        if (refOrQuery.path!.includes("/lists/")) return { exists: true, data: () => listData };
        return { exists: true, data: () => profileData };
      }
      // The tasks query
      return {
        docs: activeTaskIds.map((id) => ({ id })),
      };
    }),
    update: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
      updates.push({ path: ref.path, data });
    }),
  };
  return callback(transaction);
});

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({
  adminFirestore: { doc, collection, runTransaction },
}));

const { POST } = await import("@/app/api/tasks/reorder/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/tasks/reorder", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authenticateFamily.mockReset();
  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
  doc.mockClear();
  collection.mockClear();
  runTransaction.mockClear();
  collectionWhereGet.mockClear();
  updates.length = 0;

  profileData = { isDeleted: false };
  listData = { isDeleted: false };
  activeTaskIds = ["t1", "t2", "t3"];
});

describe("POST /api/tasks/reorder", () => {
  it("returns 401 when authentication fails", async () => {
    authenticateFamily.mockResolvedValueOnce({
      errorResponse: Response.json({ ok: false }, { status: 401 }),
    });
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t1", "t2", "t3"] }),
    );
    expect(response.status).toBe(401);
    expect(updates).toHaveLength(0);
  });

  it("persists the new order for a valid reorder matching the active set", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t3", "t1", "t2"] }),
    );
    expect(response.status).toBe(200);

    expect(updates).toHaveLength(3);
    const orderByTaskId = Object.fromEntries(
      updates.map((u) => [u.path.split("/").pop(), u.data.displayOrder]),
    );
    expect(orderByTaskId).toEqual({ t3: 0, t1: 1, t2: 2 });
  });

  it("rejects duplicate task IDs", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t1", "t1", "t2"] }),
    );
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("rejects an unknown task ID not present in the list's active tasks", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t1", "t2", "unknown"] }),
    );
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("rejects when the submitted set omits an active task (partial set)", async () => {
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t1", "t2"] }));
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("rejects a soft-deleted task submitted as if it were active (won't be in the active set)", async () => {
    activeTaskIds = ["t1", "t2"]; // t3 is soft-deleted, no longer active
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t1", "t2", "t3"] }),
    );
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("rejects reorder under a soft-deleted profile", async () => {
    profileData = { isDeleted: true };
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t1", "t2", "t3"] }),
    );
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("rejects reorder under a soft-deleted list", async () => {
    listData = { isDeleted: true };
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t1", "t2", "t3"] }),
    );
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("only ever writes displayOrder and updatedAt — never touches completion or other fields", async () => {
    await POST(jsonRequest({ profileId: "p1", listId: "l1", orderedTaskIds: ["t2", "t3", "t1"] }));
    for (const update of updates) {
      expect(Object.keys(update.data).sort()).toEqual(["displayOrder", "updatedAt"]);
    }
  });
});
