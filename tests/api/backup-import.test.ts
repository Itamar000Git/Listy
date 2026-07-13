import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const importFamilyBackup = vi.fn();

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/backup/import-family", () => ({ importFamilyBackup }));

const { POST } = await import("@/app/api/backup/import/route");

function validBackup() {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    exportedAt: now,
    family: { name: "משפחה", timezone: "Asia/Jerusalem" },
    profiles: [],
    lists: [],
    tasks: [],
  };
}

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/backup/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authenticateFamily.mockReset();
  importFamilyBackup.mockReset();
  authenticateFamily.mockResolvedValue({ familyId: "family-1" });
  importFamilyBackup.mockResolvedValue({ profilesImported: 0, listsImported: 0, tasksImported: 0 });
});

describe("POST /api/backup/import", () => {
  it("returns 401 when authentication fails", async () => {
    authenticateFamily.mockResolvedValueOnce({
      errorResponse: Response.json({ ok: false }, { status: 401 }),
    });

    const response = await POST(jsonRequest(validBackup()));
    expect(response.status).toBe(401);
    expect(importFamilyBackup).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("https://example.com/api/backup/import", {
      method: "POST",
      body: "{not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects a payload that doesn't match the backup schema", async () => {
    const response = await POST(jsonRequest({ schemaVersion: 1 }));
    expect(response.status).toBe(400);
    expect(importFamilyBackup).not.toHaveBeenCalled();
  });

  it("rejects an unsupported schemaVersion", async () => {
    const backup = validBackup();
    backup.schemaVersion = 999;
    const response = await POST(jsonRequest(backup));
    expect(response.status).toBe(400);
    expect(importFamilyBackup).not.toHaveBeenCalled();
  });

  it("imports a valid backup and returns the summary from importFamilyBackup", async () => {
    importFamilyBackup.mockResolvedValueOnce({
      profilesImported: 2,
      listsImported: 3,
      tasksImported: 10,
    });

    const response = await POST(jsonRequest(validBackup()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, profilesImported: 2, listsImported: 3, tasksImported: 10 });
    expect(importFamilyBackup).toHaveBeenCalledWith("family-1", expect.any(Object));
  });
});
