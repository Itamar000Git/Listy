import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const creates: Array<{ path: string; data: Record<string, unknown> }> = [];
const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

let profileData: Record<string, unknown>;
let listData: Record<string, unknown>;

const doc = vi.fn((path: string) => ({ path }));
const taskDocRef = { id: "new-task-id", path: "families/family-1/profiles/p1/lists/l1/tasks/new-task-id" };
const collection = vi.fn(() => ({ doc: () => taskDocRef }));

const runTransaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
  const transaction = {
    get: vi.fn(async (ref: { path: string }) => {
      if (ref.path.includes("/lists/")) return { exists: true, data: () => listData };
      return { exists: true, data: () => profileData };
    }),
    create: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
      creates.push({ path: ref.path, data });
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

const { POST } = await import("@/app/api/tasks/create/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/tasks/create", {
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
  creates.length = 0;
  updates.length = 0;

  profileData = { isDeleted: false };
  listData = { isDeleted: false, taskCount: 0 };
});

describe("POST /api/tasks/create", () => {
  it("creates a task without a description — stored as null", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", title: "לצחצח שיניים" }),
    );
    expect(response.status).toBe(200);

    expect(creates).toHaveLength(1);
    expect(creates[0].data.description).toBeNull();

    const body = await response.json();
    expect(body.task.description).toBeNull();
  });

  it("creates a task with a trimmed description", async () => {
    const response = await POST(
      jsonRequest({
        profileId: "p1",
        listId: "l1",
        title: "לצחצח שיניים",
        description: "  לצחצח במשך שתי דקות ולא לשכוח את השיניים האחוריות  ",
      }),
    );
    expect(response.status).toBe(200);

    expect(creates[0].data.description).toBe(
      "לצחצח במשך שתי דקות ולא לשכוח את השיניים האחוריות",
    );
  });

  it("rejects an overlong description", async () => {
    const response = await POST(
      jsonRequest({
        profileId: "p1",
        listId: "l1",
        title: "משימה",
        description: "a".repeat(501),
      }),
    );
    expect(response.status).toBe(400);
    expect(creates).toHaveLength(0);
  });

  it("rejects a non-string description", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", title: "משימה", description: 5 }),
    );
    expect(response.status).toBe(400);
    expect(creates).toHaveLength(0);
  });

  it("rejects creation when the parent profile is soft-deleted", async () => {
    profileData = { isDeleted: true };
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1", title: "משימה" }));
    expect(response.status).toBe(400);
    expect(creates).toHaveLength(0);
  });
});
