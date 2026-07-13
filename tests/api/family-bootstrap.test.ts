import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const docGet = vi.fn();
const docCreate = vi.fn();
const doc = vi.fn(() => ({ get: docGet, create: docCreate }));

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({
  adminFirestore: { doc },
}));

const { POST } = await import("@/app/api/family/bootstrap/route");

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/family/bootstrap", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authenticateFamily.mockReset();
  docGet.mockReset();
  docCreate.mockReset();
  doc.mockClear();
  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
});

describe("POST /api/family/bootstrap", () => {
  it("returns 401 when authentication fails", async () => {
    authenticateFamily.mockResolvedValueOnce({
      errorResponse: Response.json({ ok: false }, { status: 401 }),
    });

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(401);
    expect(docGet).not.toHaveBeenCalled();
  });

  it("creates the family document when it does not already exist", async () => {
    docGet.mockResolvedValueOnce({ exists: false });

    const response = await POST(jsonRequest({ name: "משפחת כהן", timezone: "Asia/Jerusalem" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.created).toBe(true);
    expect(docCreate).toHaveBeenCalledTimes(1);
    expect(docCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "משפחת כהן", timezone: "Asia/Jerusalem" }),
    );
  });

  it("does not overwrite an existing family document (idempotent retry)", async () => {
    docGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ name: "משפחת לוי", timezone: "Asia/Jerusalem" }),
    });

    const response = await POST(jsonRequest({ name: "שם אחר לגמרי" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.created).toBe(false);
    expect(body.family.name).toBe("משפחת לוי");
    expect(docCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid input with 400", async () => {
    const response = await POST(jsonRequest({ name: "a".repeat(41) }));
    expect(response.status).toBe(400);
    expect(docGet).not.toHaveBeenCalled();
  });
});
