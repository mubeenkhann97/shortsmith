"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { resetAnalytics } from "@/lib/posthog";

import { Button } from "@/components/ui/button";

// The sidebar's sign-out button is desktop-only; this keeps it reachable on phones.
export function SignOutSection({ email }: { email: string }) {
  const t = useTranslations("settings");
  const shell = useTranslations("shell");
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      resetAnalytics();
      window.location.assign("/sign-in");
    } catch {
      toast.error(shell("user.signOutError"));
      setSigningOut(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-background">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("account.title")}</p>
          <p className="truncate text-xs text-muted-foreground">{t("account.signedInAs", { email })}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleSignOut()} disabled={signingOut}>
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {signingOut ? shell("user.signingOut") : shell("user.signOut")}
        </Button>
      </div>
    </section>
  );
}
