import { describe, expect, it } from "vitest";
import { isPasswordValid, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

describe("isPasswordValid", () => {
  it("rejects passwords shorter than the minimum", () => {
    expect(isPasswordValid("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
  });

  it("accepts a password at exactly the minimum length", () => {
    expect(isPasswordValid("a".repeat(PASSWORD_MIN_LENGTH))).toBe(true);
  });

  it("accepts a password with no uppercase, number, or symbol", () => {
    expect(isPasswordValid("simplepassword")).toBe(true);
  });

  it("rejects a password longer than the maximum", () => {
    expect(isPasswordValid("a".repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });
});
