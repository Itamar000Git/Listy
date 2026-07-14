import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

let profileData: Record<string, unknown>;
let listData: Record<string, unknown>;
let taskData: Record<string, unknown>;

const doc = vi.fn((path: string) => ({
  path,
  get: vi.fn(async () => {
    if (path.includes("/tasks/")) return { exists: true, data: () => taskData };
    if (path.includes("/lists/")) return { exists: true, data: () => listData };
    return { exists: true, data: () => profileData };
  }),
  update: vi.fn((data: Record<string, unknown>) => {
    updates.push({ path, data });
    return Promise.resolve();
  }),
}));

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({ adminFirestore: { doc } }));

const { POST } = await import("@/app/api/tasks/update/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/tasks/update", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authenticateFamily.mockReset();
  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
  doc.mockClear();
  updates.length = 0;

  profileData = { isDeleted: false };
  listData = { isDeleted: false };
  taskData = { isDeleted: false, title: "לצחצח שיניים", description: "תיאור קיים", imageKey: "toothbrush" };
});

describe("POST /api/tasks/update", () => {
  it("adds a description to a task that didn't have one", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1", description: "הסבר חדש" }),
    );
    expect(response.status).toBe(200);

    const taskUpdate = updates.find((u) => u.path.includes("/tasks/"));
    expect(taskUpdate?.data.description).toBe("הסבר חדש");
  });

  it("removes an existing description by sending null", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1", description: null }),
    );
    expect(response.status).toBe(200);

    const taskUpdate = updates.find((u) => u.path.includes("/tasks/"));
    expect(taskUpdate?.data.description).toBeNull();
  });

  it("leaves the description untouched when only the title changes", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1", title: "שם חדש" }),
    );
    expect(response.status).toBe(200);

    const taskUpdate = updates.find((u) => u.path.includes("/tasks/"));
    expect(taskUpdate?.data).not.toHaveProperty("description");
    expect(taskUpdate?.data.title).toBe("שם חדש");
  });

  it("rejects an overlong description", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1", description: "a".repeat(501) }),
    );
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("rejects the update when the parent list is soft-deleted", async () => {
    listData = { isDeleted: true };
    const response = await POST(
      jsonRequest({ profileId: "p1", listId: "l1", taskId: "t1", description: "הסבר" }),
    );
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});
