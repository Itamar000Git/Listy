import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateFamily = vi.fn();
const doc = vi.fn((path: string) => ({ path }));
const addedDocs: Array<{ path: string; data: unknown }> = [];

const collectionAdd = vi.fn((data: unknown) => {
  const id = "new-profile-id";
  addedDocs.push({ path: `collection/${id}`, data });
  return Promise.resolve({ id });
});
const collectionWhereGet = vi.fn(() => Promise.resolve({ size: 0 }));
const collection = vi.fn((path: string) => ({
  add: collectionAdd,
  where: () => ({ get: collectionWhereGet }),
  path,
}));
const docGet = vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) }));

vi.mock("@/lib/api/authenticate", () => ({ authenticateFamily }));
vi.mock("@/lib/firebase/admin", () => ({
  adminFirestore: { doc: (path: string) => ({ path, get: docGet }), collection },
}));

const { POST } = await import("@/app/api/profiles/create/route");

beforeEach(() => {
  authenticateFamily.mockReset();
  doc.mockClear();
  collection.mockClear();
  collectionAdd.mockClear();
  addedDocs.length = 0;

  authenticateFamily.mockResolvedValue({ familyId: "authenticated-family-id" });
});

describe("cross-family isolation — familyId always comes from the verified token", () => {
  it("ignores a familyId field smuggled in the request body", async () => {
    const request = new Request("https://example.com/api/profiles/create", {
      method: "POST",
      body: JSON.stringify({
        name: "דנה",
        // A malicious client trying to write into a different family's data.
        familyId: "someone-elses-family-id",
      }),
    });

    await POST(request);

    // The Firestore collection path used for the write must be scoped
    // under the AUTHENTICATED family, never the body-supplied one.
    expect(collection).toHaveBeenCalledWith(
      expect.stringContaining("authenticated-family-id"),
    );
    for (const call of collection.mock.calls) {
      expect(call[0]).not.toContain("someone-elses-family-id");
    }
  });
});
