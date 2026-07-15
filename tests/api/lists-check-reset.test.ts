import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const authenticateFamily = vi.fn();
const doc = vi.fn((path: string) => ({ path }));

let listData: Record<string, unknown> | null;
const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

const runTransaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
  const transaction = {
    get: vi.fn(async () => {
      if (listData === null) return { exists: false, data: () => undefined };
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

const { POST } = await import("@/app/api/lists/check-reset/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/lists/check-reset", {
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
  listData = {
    resetType: "daily",
    resetTime: "04:00",
    weeklyResetDay: null,
    timezone: "Asia/Jerusalem",
    nextResetAt: Timestamp.fromDate(new Date(Date.now() - 25 * 3600 * 1000)),
    currentCycle: 1,
    completedCount: 2,
    celebrationCycle: 1,
    isDeleted: false,
  };
});

describe("POST /api/lists/check-reset", () => {
  it("returns 401 when authentication fails", async () => {
    authenticateFamily.mockResolvedValueOnce({
      errorResponse: Response.json({ ok: false }, { status: 401 }),
    });
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1" }));
    expect(response.status).toBe(401);
    expect(updates).toHaveLength(0);
  });

  it("returns 400 when the list does not exist", async () => {
    listData = null;
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when the list is soft-deleted", async () => {
    listData!.isDeleted = true;
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1" }));
    expect(response.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("resets an overdue list and reports wasReset: true", async () => {
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, currentCycle: 2, wasReset: true });
    expect(updates).toHaveLength(1);
    expect(updates[0].data).toMatchObject({ currentCycle: 2, completedCount: 0, celebrationCycle: null });
  });

  it("does not touch the list when nextResetAt is still in the future", async () => {
    listData!.nextResetAt = Timestamp.fromDate(new Date(Date.now() + 3600 * 1000));
    const response = await POST(jsonRequest({ profileId: "p1", listId: "l1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ wasReset: false, currentCycle: 1 });
    expect(updates).toHaveLength(0);
  });

  it("a second check-reset call against the already-reset list is a safe no-op (simulated concurrent request)", async () => {
    const first = await POST(jsonRequest({ profileId: "p1", listId: "l1" }));
    const firstBody = await first.json();
    expect(firstBody.wasReset).toBe(true);

    // Simulate the transaction's re-read for a second, concurrent request:
    // by the time it re-reads, the list already reflects the first reset.
    listData = {
      ...listData,
      currentCycle: firstBody.currentCycle,
      completedCount: 0,
      celebrationCycle: null,
      nextResetAt: updates[0].data.nextResetAt,
    };

    const second = await POST(jsonRequest({ profileId: "p1", listId: "l1" }));
    const secondBody = await second.json();

    expect(secondBody.wasReset).toBe(false);
    expect(secondBody.currentCycle).toBe(firstBody.currentCycle);
    expect(updates).toHaveLength(1); // still only the first reset's write
  });

  it("rejects invalid input", async () => {
    const response = await POST(jsonRequest({ profileId: "p1" }));
    expect(response.status).toBe(400);
  });
});
