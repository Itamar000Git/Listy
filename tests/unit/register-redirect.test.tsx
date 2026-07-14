// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const createUserWithEmailAndPassword = vi.fn();
const sendEmailVerification = vi.fn(() => Promise.resolve());
const callApi = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("firebase/auth", () => ({ createUserWithEmailAndPassword, sendEmailVerification }));
vi.mock("@/lib/firebase/client", () => ({ firebaseAuth: {} }));
vi.mock("@/lib/auth/get-auth-header", () => ({ callApi }));

const { RegisterFamilyForm } = await import("@/components/auth/RegisterFamilyForm");

afterEach(() => cleanup());

beforeEach(() => {
  push.mockClear();
  createUserWithEmailAndPassword.mockReset();
  sendEmailVerification.mockClear();
  callApi.mockReset();

  createUserWithEmailAndPassword.mockResolvedValue({
    user: { uid: "u1", emailVerified: false },
  });
});

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("שם המשפחה"), { target: { value: "משפחת כהן" } });
  fireEvent.change(screen.getByLabelText("אימייל"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText("אימות סיסמה"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: /יצירת חשבון/ }));
}

describe("RegisterFamilyForm — first-login navigation", () => {
  it("navigates to /profiles (not /profiles/new) after a successful bootstrap", async () => {
    callApi.mockResolvedValue({ ok: true });

    render(<RegisterFamilyForm />);
    await act(async () => {
      fillAndSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(push).toHaveBeenCalledWith("/profiles");
    expect(push).not.toHaveBeenCalledWith("/profiles/new");
  });

  it("does not navigate anywhere when bootstrap fails", async () => {
    callApi.mockResolvedValue({ ok: false, status: 500 });

    render(<RegisterFamilyForm />);
    await act(async () => {
      fillAndSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(push).not.toHaveBeenCalled();
  });
});
