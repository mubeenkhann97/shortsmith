"use client";

import dynamic from "next/dynamic";

import LandingPage from "@/components/landing-page";
import { useSession } from "@/lib/auth-client";
import { isLandingOnlyModeEnabled } from "@/lib/app-flags";

const HomeApp = dynamic(() => import("@/components/home-app"), {
  ssr: false,
});

export function HomeRouter({ hasSessionCookie = false }: { hasSessionCookie?: boolean }) {
  const { data: session, isPending } = useSession();

  if (!isLandingOnlyModeEnabled && !isPending && session?.user) {
    return <HomeApp />;
  }

  // Signed-in visitors wait for their session instead of flashing the landing page.
  if (!isLandingOnlyModeEnabled && isPending && hasSessionCookie) {
    return <main aria-busy="true" className="min-h-svh bg-background" />;
  }

  return <LandingPage />;
}
