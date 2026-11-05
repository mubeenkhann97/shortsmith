# Shortsmith MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for
Shortsmith — turn long-form videos (YouTube links or
direct URLs) into short, vertical, subtitled viral clips from any MCP client
(Claude Desktop, Claude Code, Cursor, etc.).

By default it talks to a local backend at `http://localhost:8000`. Point it at
your own hosted deployment by setting `SHORTSMITH_API_URL`. Every `SHORTSMITH_*`
variable also accepts the legacy upstream `SUPOCLIP_*` name, which
`docker-compose.yml` still sets.

## What it can do

| Tool | Auth | Description |
|------|:----:|-------------|
| `shortsmith_health` | – | API status + how this server is configured |
| `shortsmith_list_caption_templates` | – | Available caption styles (default, hormozi, mrbeast, …) |
| `shortsmith_list_transitions` | – | Available transition effects |
| `shortsmith_broll_status` | – | Whether B-roll overlays are configured |
| `shortsmith_list_fonts` | ✓ | Subtitle fonts available to your account |
| `shortsmith_billing_summary` | ✓ | Plan, usage and remaining quota |
| `shortsmith_create_clip_task` | ✓ | Start clipping a video → returns a `task_id` |
| `shortsmith_list_tasks` | ✓ | List your tasks |
| `shortsmith_get_task` | ✓ | Task status, progress and clips |
| `shortsmith_wait_for_task` | ✓ | Poll until a task finishes |
| `shortsmith_list_clips` | ✓ | List a task's generated clips |
| `shortsmith_download_clip` | ✓ | Save a clip's MP4 to disk |
| `shortsmith_export_clip` | ✓ | Re-encode + save with a platform preset (tiktok/reels/shorts) |
| `shortsmith_cancel_task` / `shortsmith_resume_task` / `shortsmith_delete_task` | ✓ | Manage tasks |

Tools marked ✓ require an API key (or self-host credentials, see below).

## Getting an API key

1. Sign in to your Shortsmith deployment.
2. Go to **Settings → API Keys**.
3. Create a key and copy it (it's shown only once). It looks like `sk_…`.

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SHORTSMITH_API_KEY` | – | Your API key (recommended auth). |
| `SHORTSMITH_API_URL` | `http://localhost:8000` | Backend base URL. Set it to your deployment API URL. |
| `SHORTSMITH_DOWNLOAD_DIR` | `./shortsmith-downloads` | Where downloaded/exported clips are written. |
| `SHORTSMITH_TIMEOUT` | `60` | HTTP timeout (seconds) for non-download requests. |
| `SHORTSMITH_USER_ID` | – | Self-host only: authenticate by user id (see below). |
| `SHORTSMITH_AUTH_SECRET` | – | Self-host only: backend `BACKEND_AUTH_SECRET` for HMAC signing. |

### Self-hosting auth

If you run your own backend you have three options:

- **API key** (same as hosted): create a key and set `SHORTSMITH_API_KEY`.
- **Signed headers**: set `SHORTSMITH_USER_ID` + `SHORTSMITH_AUTH_SECRET` (your
  backend's `BACKEND_AUTH_SECRET`).
- **Unsigned**: if the backend runs with `ALLOW_UNSIGNED_BACKEND_AUTH=true`,
  just set `SHORTSMITH_USER_ID`.

Auth precedence is: API key → signed headers → unsigned user id.

## Install & run

Requires Python 3.10+. With [uv](https://docs.astral.sh/uv/):

```bash
cd mcp
uv run shortsmith-mcp        # runs the stdio server
```

Or install into the current environment:

```bash
pip install -e .
shortsmith-mcp
```

## Hosted SSE server

For clients that add a remote MCP URL, run the server over SSE and require a
Shortsmith API key as the client Bearer token:

```bash
SHORTSMITH_API_URL=https://api.example.com \
SHORTSMITH_MCP_TRANSPORT=sse \
SHORTSMITH_MCP_HOST=0.0.0.0 \
SHORTSMITH_MCP_PORT=9100 \
SHORTSMITH_MCP_PUBLIC_URL=https://mcp.example.com \
SHORTSMITH_MCP_REQUIRE_BEARER_AUTH=true \
shortsmith-mcp
```

Then configure the MCP client with:

```text
Server URL: https://mcp.example.com/sse
Transport: SSE
Authentication: Bearer Token
Token: sk_your_shortsmith_api_key
```

With Docker Compose, the `mcp` service runs this mode by default and binds to
`127.0.0.1:9100` for a reverse proxy.

## Use with Claude Desktop / Claude Code

Add to your MCP client config (e.g. `claude_desktop_config.json`, or via
`claude mcp add`). Example using `uv` to run from a checkout:

```json
{
  "mcpServers": {
    "shortsmith": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/shortsmith/mcp", "run", "shortsmith-mcp"],
      "env": {
        "SHORTSMITH_API_KEY": "sk_your_key_here"
      }
    }
  }
}
```

For a self-hosted backend, add `"SHORTSMITH_API_URL": "http://localhost:8000"` to `env`.

With Claude Code:

```bash
claude mcp add shortsmith -e SHORTSMITH_API_KEY=sk_your_key_here \
  -- uv --directory /absolute/path/to/shortsmith/mcp run shortsmith-mcp
```

## Example prompts

- "Use shortsmith to make clips from https://youtu.be/… with the hormozi caption template, then wait for it and download the top clip."
- "List my recent shortsmith tasks and show the virality scores of the latest one's clips."
- "Export clip <id> from task <id> as a TikTok preset."

## License

AGPL-3.0-or-later, matching the Shortsmith project.

### Clip length

`shortsmith_create_clip_task` accepts `clip_length`: `auto` (default, 15–60s),
`short` (15–30s), `medium` (30–60s), or `long` (1–2 min). This controls the
selection range and rendering limit. Removing pauses and filler words can
shorten the finished clips.
