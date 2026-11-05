"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertCircle, Check, Cpu, KeyRound, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

interface ProviderRow {
  id: string;
  label: string;
  example_model: string;
  has_key: boolean;
  key_hint: string | null;
  server_configured: boolean;
}

interface AiProviderSettings {
  providers: ProviderRow[];
  preferred_llm: string | null;
  server_llm: string;
  server_transcription_provider: string;
  allow_ollama: boolean;
}

const LOCAL_MODEL_SUGGESTIONS = ["ollama:qwen3:8b", "ollama:qwen3:14b", "ollama:gemma3:12b", "ollama:gpt-oss:20b"];

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return typeof data?.detail === "string" ? data.detail : fallback;
}

export default function AiProvidersPage() {
  const t = useTranslations("settings");
  const { data: session, isPending } = useSession();
  const [settings, setSettings] = useState<AiProviderSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/ai-providers", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response, t("aiProviders.loadFailed")));
      const data = (await response.json()) as AiProviderSettings;
      setSettings(data);
      setModel(data.preferred_llm ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiProviders.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (session?.user?.id) void load();
  }, [session?.user?.id, load]);

  const run = async (id: string, action: () => Promise<Response>, success: string) => {
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      const response = await action();
      if (!response.ok) throw new Error(await readError(response, t("aiProviders.saveFailed")));
      setNotice(success);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiProviders.saveFailed"));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveKey = async (provider: string) => {
    const apiKey = (drafts[provider] ?? "").trim();
    if (!apiKey) return;
    const saved = await run(
      provider,
      () =>
        fetch(`/api/ai-providers/keys/${provider}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey }),
        }),
      t("aiProviders.keySaved"),
    );
    if (saved) setDrafts((current) => ({ ...current, [provider]: "" }));
  };

  const removeKey = (provider: string) =>
    run(provider, () => fetch(`/api/ai-providers/keys/${provider}`, { method: "DELETE" }), t("aiProviders.keyRemoved"));

  const saveModel = (llm: string | null) =>
    run(
      "model",
      () =>
        fetch("/api/ai-providers/model", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ llm }),
        }),
      t("aiProviders.modelSaved"),
    );

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Skeleton className="h-32 w-full max-w-xl" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="mb-4 text-muted-foreground">{t("aiProviders.signIn")}</p>
          <Link href="/sign-in">
            <Button>{t("apiKeys.signInAction")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const suggestions = settings
    ? [
        ...(settings.allow_ollama ? LOCAL_MODEL_SUGGESTIONS : []),
        ...settings.providers
          .filter((p) => p.example_model && (p.has_key || p.server_configured))
          .map((p) => p.example_model),
      ]
    : [];
  const isLocal = (value: string) => value.startsWith("ollama:");
  const effectiveModel = settings?.preferred_llm || settings?.server_llm || "";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 md:py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("aiProviders.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("aiProviders.intro")}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="mb-6">
          <Check className="h-4 w-4" />
          <AlertDescription role="status">{notice}</AlertDescription>
        </Alert>
      )}

      {!settings ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-8">
          <section className="rounded-2xl border bg-background p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Cpu className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{t("aiProviders.modelTitle")}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("aiProviders.modelCurrent", { model: effectiveModel })}{" "}
                  {isLocal(effectiveModel) ? (
                    <Badge variant="secondary">{t("aiProviders.free")}</Badge>
                  ) : null}
                </p>
              </div>
            </div>
            <Label htmlFor="llm" className="mb-2 block">
              {t("aiProviders.modelLabel")}
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="llm"
                list="llm-suggestions"
                value={model}
                maxLength={255}
                placeholder={t("aiProviders.modelPlaceholder", { model: settings.server_llm })}
                onChange={(event) => setModel(event.target.value)}
                disabled={busy === "model"}
              />
              <datalist id="llm-suggestions">
                {suggestions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <Button onClick={() => void saveModel(model.trim() || null)} disabled={busy === "model"}>
                {t("aiProviders.save")}
              </Button>
              {settings.preferred_llm && (
                <Button variant="ghost" onClick={() => void saveModel(null)} disabled={busy === "model"}>
                  {t("aiProviders.useDefault")}
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("aiProviders.modelHint")}</p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("aiProviders.keysTitle")}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("aiProviders.keysIntro", { provider: settings.server_transcription_provider })}
            </p>
            <div className="space-y-3">
              {settings.providers.map((provider) => (
                <div key={provider.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground" />
                    <span className="font-medium">{provider.label}</span>
                    {provider.has_key ? (
                      <Badge>{t("aiProviders.saved", { hint: provider.key_hint ?? "" })}</Badge>
                    ) : provider.server_configured ? (
                      <Badge variant="secondary">{t("aiProviders.included")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("aiProviders.notSet")}</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="password"
                      autoComplete="off"
                      aria-label={t("aiProviders.keyLabel", { provider: provider.label })}
                      placeholder={provider.has_key ? t("aiProviders.replacePlaceholder") : t("aiProviders.keyPlaceholder")}
                      value={drafts[provider.id] ?? ""}
                      maxLength={500}
                      onChange={(event) => setDrafts((current) => ({ ...current, [provider.id]: event.target.value }))}
                      disabled={busy === provider.id}
                    />
                    <Button
                      variant="outline"
                      onClick={() => void saveKey(provider.id)}
                      disabled={busy === provider.id || !(drafts[provider.id] ?? "").trim()}
                    >
                      {t("aiProviders.save")}
                    </Button>
                    {provider.has_key && (
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                        onClick={() => void removeKey(provider.id)}
                        disabled={busy === provider.id}
                      >
                        <Trash2 className="size-4" />
                        {t("aiProviders.remove")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t("aiProviders.privacy")}</p>
          </section>
        </div>
      )}
    </main>
  );
}
