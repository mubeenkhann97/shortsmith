import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SignOutSection } from "./sign-out-section";

const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth-client", () => ({ signOut }));
vi.mock("@/lib/posthog", () => ({ resetAnalytics: vi.fn() }));

it("signs out from settings and returns to the sign-in page", async () => {
  signOut.mockResolvedValue({});
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });

  render(<SignOutSection email="owner@example.com" />);
  expect(screen.getByText("Signed in as owner@example.com")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await waitFor(() => expect(assign).toHaveBeenCalledWith("/sign-in"));
  expect(signOut).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
