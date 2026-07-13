import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const doc = vi.fn((path: string) => ({ path }));

let profileData: Record<string, unknown>;
let listData: Record<string, unknown>;

const runTransaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
  const transaction = {
    get: vi.fn(async (ref: { path: string }) => {
      if (ref.path.includes("/profiles/") && !ref.path.includes("/lists/")) {
        return { exists: true, data: () => profileData };
      }
      return { exists: true, data: () => listData };
    }),
    create: vi.fn(),
    update: vi.fn(),
  };
  return callback(transaction);
});

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({ adminFirestore: { doc, runTransaction, collection: vi.fn(() => ({ doc: () => doc("auto") })) } }));

const { POST: createTask } = await import("@/app/api/tasks/create/route");

function jsonRequest(url: string, body: unknown) {
  return new Request(url, { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  authenticateFamily.mockReset();
  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
  doc.mockClear();
  runTransaction.mockClear();

  profileData = { isDeleted: false };
  listData = { isDeleted: false, taskCount: 0 };
});

describe("soft-deleted ancestor guard — /api/tasks/create", () => {
  it("rejects creating a task when the parent profile is soft-deleted", async () => {
    profileData = { isDeleted: true };

    const response = await createTask(
      jsonRequest("https://example.com/api/tasks/create", {
        profileId: "p1",
        listId: "l1",
        title: "משימה",
        imageKey: "generic",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects creating a task when the parent list is soft-deleted", async () => {
    listData = { isDeleted: true, taskCount: 0 };

    const response = await createTask(
      jsonRequest("https://example.com/api/tasks/create", {
        profileId: "p1",
        listId: "l1",
        title: "משימה",
        imageKey: "generic",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("allows creating a task when both ancestors are active", async () => {
    const response = await createTask(
      jsonRequest("https://example.com/api/tasks/create", {
        profileId: "p1",
        listId: "l1",
        title: "משימה",
        imageKey: "generic",
      }),
    );

    expect(response.status).toBe(200);
  });
});
