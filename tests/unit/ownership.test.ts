import { describe, expect, it, vi } from "vitest";
import { isListActive, isProfileActive } from "@/lib/api/ownership";

function fakeDb(getResult: { exists: boolean; data?: () => Record<string, unknown> }) {
  const get = vi.fn(() => Promise.resolve(getResult));
  const doc = vi.fn(() => ({ get }));
  return { doc } as unknown as FirebaseFirestore.Firestore;
}

describe("isProfileActive", () => {
  it("returns false when the profile does not exist", async () => {
    const db = fakeDb({ exists: false });
    expect(await isProfileActive(db, "family-1", "profile-1")).toBe(false);
  });

  it("returns false when the profile is soft-deleted", async () => {
    const db = fakeDb({ exists: true, data: () => ({ isDeleted: true }) });
    expect(await isProfileActive(db, "family-1", "profile-1")).toBe(false);
  });

  it("returns true for an existing, active profile", async () => {
    const db = fakeDb({ exists: true, data: () => ({ isDeleted: false }) });
    expect(await isProfileActive(db, "family-1", "profile-1")).toBe(true);
  });
});

describe("isListActive", () => {
  it("returns false when the list is soft-deleted", async () => {
    const db = fakeDb({ exists: true, data: () => ({ isDeleted: true }) });
    expect(await isListActive(db, "family-1", "profile-1", "list-1")).toBe(false);
  });

  it("returns true for an existing, active list", async () => {
    const db = fakeDb({ exists: true, data: () => ({ isDeleted: false }) });
    expect(await isListActive(db, "family-1", "profile-1", "list-1")).toBe(true);
  });
});
