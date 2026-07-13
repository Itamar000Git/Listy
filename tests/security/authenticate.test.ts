import { describe, expect, it, vi } from "vitest";

const verifyRequestToken = vi.fn();

class FakeAuthenticationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthenticationError";
  }
}

vi.mock("@/lib/firebase/verify-token", () => ({
  verifyRequestToken,
  AuthenticationError: FakeAuthenticationError,
}));

const { authenticateFamily } = await import("@/lib/api/authenticate");

describe("authenticateFamily", () => {
  it("returns a 401 Response when the token is missing or invalid", async () => {
    verifyRequestToken.mockRejectedValueOnce(new FakeAuthenticationError());

    const result = await authenticateFamily(new Request("https://example.com"));

    expect("errorResponse" in result).toBe(true);
    if ("errorResponse" in result) {
      expect(result.errorResponse.status).toBe(401);
    }
  });

  it("returns a 500 Response for unexpected errors", async () => {
    verifyRequestToken.mockRejectedValueOnce(new Error("boom"));

    const result = await authenticateFamily(new Request("https://example.com"));

    expect("errorResponse" in result).toBe(true);
    if ("errorResponse" in result) {
      expect(result.errorResponse.status).toBe(500);
    }
  });

  it("returns the family ID (Firebase UID) on success", async () => {
    verifyRequestToken.mockResolvedValueOnce({ uid: "family-abc" });

    const result = await authenticateFamily(new Request("https://example.com"));

    expect(result).toEqual({ familyId: "family-abc" });
  });
});
