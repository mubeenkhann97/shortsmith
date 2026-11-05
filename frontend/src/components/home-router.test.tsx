import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { HomeRouter } from "./home-router";

const session = vi.hoisted(() => ({ current: { data: null as unknown, isPending: true } }));

vi.mock("@/lib/auth-client", () => ({ useSession: () => session.current }));
vi.mock("@/components/landing-page", () => ({ default: () => <p>Landing page</p> }));
vi.mock("next/dynamic", () => ({ default: () => () => <p>Dashboard</p> }));

beforeEach(() => {
  session.current = { data: null, isPending: true };
});

it("shows the landing page to visitors while the session loads", () => {
  render(<HomeRouter />);
  expect(screen.getByText("Landing page")).toBeInTheDocument();
});

it("does not flash the landing page when a session cookie is present", () => {
  const { container } = render(<HomeRouter hasSessionCookie />);
  expect(screen.queryByText("Landing page")).not.toBeInTheDocument();
  expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
});

it("shows the dashboard once signed in and the landing page for a stale cookie", () => {
  session.current = { data: { user: { id: "user-1" } }, isPending: false };
  const { rerender } = render(<HomeRouter hasSessionCookie />);
  expect(screen.getByText("Dashboard")).toBeInTheDocument();

  session.current = { data: null, isPending: false };
  rerender(<HomeRouter hasSessionCookie />);
  expect(screen.getByText("Landing page")).toBeInTheDocument();
});
