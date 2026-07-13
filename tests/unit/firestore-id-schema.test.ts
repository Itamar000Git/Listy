import { describe, expect, it } from "vitest";
import { firestoreIdSchema } from "@/lib/validation/schemas";

describe("firestoreIdSchema (path-injection guard)", () => {
  it("accepts a normal Firestore auto-generated ID", () => {
    expect(firestoreIdSchema.safeParse("aBcD1234EfGh5678").success).toBe(true);
  });

  it("rejects an ID containing a slash (path segment injection)", () => {
    expect(firestoreIdSchema.safeParse("families/other-family/profiles/x").success).toBe(false);
    expect(firestoreIdSchema.safeParse("a/b").success).toBe(false);
  });

  it("rejects '.' and '..' exactly", () => {
    expect(firestoreIdSchema.safeParse(".").success).toBe(false);
    expect(firestoreIdSchema.safeParse("..").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(firestoreIdSchema.safeParse("").success).toBe(false);
  });

  it("rejects an excessively long value", () => {
    expect(firestoreIdSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});
