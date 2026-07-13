import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const profileDocGet = vi.fn();
const doc = vi.fn(() => ({ get: profileDocGet }));
const listsWhereGet = vi.fn();
const listsAdd = vi.fn((data: Record<string, unknown>) => {
  void data;
  return Promise.resolve({ id: "new-list-id" });
});
const collectionWhere = vi.fn(() => ({ get: listsWhereGet }));
const collection = vi.fn(() => ({ where: collectionWhere, add: listsAdd }));

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({
  adminFirestore: { doc, collection },
}));

const { POST } = await import("@/app/api/lists/create/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/lists/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authenticateFamily.mockReset();
  profileDocGet.mockReset();
  listsWhereGet.mockReset();
  listsAdd.mockClear();
  doc.mockClear();
  collection.mockClear();

  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
  profileDocGet.mockResolvedValue({ exists: true, data: () => ({ isDeleted: false }) });
  listsWhereGet.mockResolvedValue({ size: 0 });
});

describe("POST /api/lists/create", () => {
  it("returns 401 when authentication fails", async () => {
    authenticateFamily.mockResolvedValueOnce({
      errorResponse: Response.json({ ok: false }, { status: 401 }),
    });

    const response = await POST(
      jsonRequest({ profileId: "p1", name: "רשימה", resetType: "daily" }),
    );

    expect(response.status).toBe(401);
    expect(listsAdd).not.toHaveBeenCalled();
  });

  it("returns 400 when the target profile does not exist", async () => {
    profileDocGet.mockResolvedValueOnce({ exists: false });

    const response = await POST(
      jsonRequest({ profileId: "missing", name: "רשימה", resetType: "daily" }),
    );

    expect(response.status).toBe(400);
    expect(listsAdd).not.toHaveBeenCalled();
  });

  it("rejects a weekly list submitted without weeklyResetDay", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", name: "רשימה", resetType: "weekly" }),
    );

    expect(response.status).toBe(400);
    expect(listsAdd).not.toHaveBeenCalled();
  });

  it("creates a daily list with correct default cycle/counter fields", async () => {
    const response = await POST(
      jsonRequest({ profileId: "p1", name: "משימות בוקר", resetType: "daily" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listsAdd).toHaveBeenCalledTimes(1);

    const created = listsAdd.mock.calls[0][0];
    expect(created).toMatchObject({
      name: "משימות בוקר",
      resetType: "daily",
      resetTime: "04:00",
      weeklyResetDay: null,
      timezone: "Asia/Jerusalem",
      lastResetAt: null,
      currentCycle: 1,
      taskCount: 0,
      completedCount: 0,
      celebrationCycle: null,
      displayOrder: 0,
      isDeleted: false,
      deletedAt: null,
    });
    expect(created.nextResetAt).toBeDefined();
    expect(body.list.id).toBe("new-list-id");
  });

  it("creates a never-reset list with null resetTime and null nextResetAt", async () => {
    await POST(jsonRequest({ profileId: "p1", name: "רשימה קבועה", resetType: "never" }));

    const created = listsAdd.mock.calls[0][0];
    expect(created.resetTime).toBeNull();
    expect(created.weeklyResetDay).toBeNull();
    expect(created.nextResetAt).toBeNull();
  });

  it("assigns displayOrder based on the count of existing active lists", async () => {
    listsWhereGet.mockResolvedValueOnce({ size: 3 });

    await POST(jsonRequest({ profileId: "p1", name: "רשימה נוספת", resetType: "daily" }));

    const created = listsAdd.mock.calls[0][0];
    expect(created.displayOrder).toBe(3);
  });
});
