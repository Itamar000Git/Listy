import { describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: { verifyIdToken },
}));

const { verifyRequestToken, AuthenticationError } = await import("@/lib/firebase/verify-token");

function requestWithHeader(headerValue: string | null) {
  const headers = new Headers();
  if (headerValue !== null) headers.set("authorization", headerValue);
  return new Request("https://example.com/api/test", { headers });
}

describe("verifyRequestToken", () => {
  it("throws AuthenticationError when the Authorization header is missing", async () => {
    await expect(verifyRequestToken(requestWithHeader(null))).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("throws AuthenticationError when the header does not use the Bearer scheme", async () => {
    await expect(
      verifyRequestToken(requestWithHeader("Basic abc123")),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("throws AuthenticationError when the bearer token is empty", async () => {
    await expect(verifyRequestToken(requestWithHeader("Bearer "))).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("throws AuthenticationError (not the raw Firebase error) when the token is invalid or expired", async () => {
    verifyIdToken.mockRejectedValueOnce(new Error("Firebase internal: id-token-expired"));

    const error = await verifyRequestToken(requestWithHeader("Bearer bad-token")).catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).not.toContain("Firebase internal");
  });

  it("returns the decoded token when verification succeeds", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "family-123" });

    const decoded = await verifyRequestToken(requestWithHeader("Bearer good-token"));

    expect(decoded).toEqual({ uid: "family-123" });
    expect(verifyIdToken).toHaveBeenCalledWith("good-token");
  });
});
