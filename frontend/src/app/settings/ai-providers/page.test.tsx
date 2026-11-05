import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AiProvidersPage from "./page";

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { id: "user-1", email: "owner@example.com" } }, isPending: false }),
}));

const SETTINGS = {
  providers: [
    { id: "openai", label: "OpenAI", example_model: "openai:gpt-5.2", has_key: true, key_hint: "…1234", server_configured: false },
    { id: "anthropic", label: "Anthropic", example_model: "anthropic:claude-sonnet-5-5", has_key: false, key_hint: null, server_configured: false },
  ],
  preferred_llm: null,
  server_llm: "ollama:qwen3:8b",
  server_transcription_provider: "whisper",
  allow_ollama: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify(SETTINGS), { status: 200 })));
});

it("shows the free default model and saved key hints, never full keys", async () => {
  render(<AiProvidersPage />);
  expect(await screen.findByText("Your videos use ollama:qwen3:8b.")).toBeInTheDocument();
  expect(screen.getByText("Free")).toBeInTheDocument();
  expect(screen.getByText("Saved …1234")).toBeInTheDocument();
  expect(screen.getByText("Not set")).toBeInTheDocument();
});

it("saves a key and a model choice", async () => {
  render(<AiProvidersPage />);
  const input = await screen.findByLabelText("Anthropic API key");
  fireEvent.change(input, { target: { value: "sk-ant-new-key-0001" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Save" })[2]);
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith("/api/ai-providers/keys/anthropic", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ api_key: "sk-ant-new-key-0001" }),
    })),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("Key saved.");

  fireEvent.change(screen.getByLabelText("Model id"), { target: { value: "openai:gpt-5.2" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith("/api/ai-providers/model", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ llm: "openai:gpt-5.2" }),
    })),
  );
});

it("shows the server's error message when saving fails", async () => {
  vi.mocked(fetch).mockImplementation(async (_url, options) =>
    options?.method === "PUT"
      ? new Response(JSON.stringify({ detail: "That does not look like a valid API key." }), { status: 400 })
      : new Response(JSON.stringify(SETTINGS), { status: 200 }),
  );
  render(<AiProvidersPage />);
  fireEvent.change(await screen.findByLabelText("Anthropic API key"), { target: { value: "bad key" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Save" })[2]);
  expect(await screen.findByText("That does not look like a valid API key.")).toBeInTheDocument();
});
