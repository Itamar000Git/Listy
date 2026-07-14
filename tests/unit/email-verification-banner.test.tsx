// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useAuth = vi.fn();
const sendEmailVerification = vi.fn(() => Promise.resolve());

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth }));
vi.mock("firebase/auth", () => ({ sendEmailVerification }));

const { EmailVerificationBanner } = await import("@/components/auth/EmailVerificationBanner");

afterEach(() => cleanup());

beforeEach(() => {
  useAuth.mockReset();
  sendEmailVerification.mockClear();
});

describe("EmailVerificationBanner", () => {
  it("mentions checking the spam folder when the email is unverified", () => {
    useAuth.mockReturnValue({
      user: { uid: "u1" },
      emailVerified: false,
      loading: false,
      refreshEmailVerified: vi.fn(),
    });

    render(<EmailVerificationBanner />);
    expect(screen.getByText(/ספאם/)).toBeTruthy();
  });

  it("keeps the resend and refresh actions", () => {
    useAuth.mockReturnValue({
      user: { uid: "u1" },
      emailVerified: false,
      loading: false,
      refreshEmailVerified: vi.fn(),
    });

    render(<EmailVerificationBanner />);
    expect(screen.getByText("שליחת קישור אימות מחדש")).toBeTruthy();
    expect(screen.getByText("רענון סטטוס האימות")).toBeTruthy();
  });

  it("disappears once emailVerified is true", () => {
    useAuth.mockReturnValue({
      user: { uid: "u1" },
      emailVerified: true,
      loading: false,
      refreshEmailVerified: vi.fn(),
    });

    const { container } = render(<EmailVerificationBanner />);
    expect(container.firstChild).toBeNull();
  });
});
