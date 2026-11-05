<h1 align="center">Shortsmith</h1>

<p align="center">
  Turn long videos into short, captioned vertical clips. Free on your own machine, or hosted with cloud AI.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License: AGPL-3.0" /></a>
  <a href="docs/README.md"><img src="https://img.shields.io/badge/docs-docs%2F-green.svg" alt="Documentation" /></a>
</p>

---

Shortsmith is an AI video clipping tool. Give it a long video, such as a podcast, a talk or a stream VOD, and it finds
the strongest moments, scores them and renders them as vertical 9:16 clips. Each clip gets face-centred cropping,
word-synced subtitles, a hook title and optional B-roll.

Shortsmith is a fork of [SupoClip](https://github.com/FujiwaraChoki/supoclip) by FujiwaraChoki and is licensed under
the same [AGPL-3.0](LICENSE). It adds:

- **Free local mode by default:** with no API keys configured, transcription runs on local
  [Whisper](https://github.com/openai/whisper) and clip selection on a local [Ollama](https://ollama.com) model
  (`qwen3:8b`), so it costs nothing to run.
- **Bring your own key:** each user can add their own OpenAI, Anthropic, Google Gemini, OpenRouter or AssemblyAI
  key under **Settings → AI models** and choose the model used for their videos. Keys are encrypted at rest, applied
  only to that user's jobs, and never shown again.

## Two ways to run it

| | Free (self-hosted) | Paid (hosted) |
|---|---|---|
| Who it's for | You, on your own computer or server | A service you run for other people |
| Transcription | Local Whisper | AssemblyAI (your key, or each user's own key) |
| Clip selection | Local Ollama model | Gemini, GPT, Claude or OpenRouter (your key, or each user's own key) |
| Billing | None: `SELF_HOST=true` (default) | Stripe plans (Pro and Creator): `SELF_HOST=false` |
| Cost to you | Nothing beyond your hardware | Whatever the AI providers charge for your keys |

## Features

- **YouTube, Twitch, Kick and uploads.** Paste a video or VOD link, or upload a file. Live streams are not supported.
- **AI clip selection:** an LLM picks the most clip-worthy segments from the transcript and scores each for hook,
  engagement, value and shareability.
- **Smart vertical cropping:** face detection keeps the speaker centred in the 9:16 frame.
- **Word-synced subtitles:** custom fonts and caption templates with animation styles.
- **Hook titles:** an AI-written headline in the opening seconds of each clip.
- **B-roll and transitions:** optional Pexels stock footage and transition effects.
- **Clip studio:** a full editor to trim, split, merge and re-caption clips, plus AI editing from a text prompt.
- **Publishing:** connect YouTube, TikTok and Instagram accounts, then post or schedule clips (off by default).
- **API, MCP server and API keys** for programmatic use.

## Install on a new computer (free and local)

### What you need

- [Git](https://git-scm.com/downloads) and [Docker](https://docs.docker.com/get-docker/) with Compose v2
  (Docker Desktop on Windows and macOS).
- About 16 GB of RAM is comfortable for the default `qwen3:8b` model, and several gigabytes of free disk space for
  the images and models (the model alone is about 5 GB).
- On Windows and macOS: [Ollama](https://ollama.com/download) installed on the computer. On Linux, use the Ollama
  container instead (step 3).

### 1. Get the code

```bash
git clone https://github.com/<your-username>/shortsmith.git
cd shortsmith
```

### 2. Create `.env`

Run this in the project folder. On Windows, use Git Bash, which comes with Git.

```bash
cat > .env <<EOF
FRONTEND_PORT=3107
BACKEND_CPU_ONLY=true
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BACKEND_AUTH_SECRET=$(openssl rand -hex 32)
APP_SETTINGS_ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF
```

- `FRONTEND_PORT=3107` serves the app on the port its sign-in and links expect. Without it, Docker publishes the
  legacy port `3001`.
- `BACKEND_CPU_ONLY=true` builds a much smaller CPU image. The backend containers are not given a GPU by default.
- The three secrets sign sessions and encrypt users' saved API keys. Keep `.env` private; it is ignored by Git. If
  you change `APP_SETTINGS_ENCRYPTION_KEY` later, users have to enter their saved keys again.

### 3. Get the AI model

**Windows and macOS** (Ollama installed on the computer):

```bash
ollama pull qwen3:8b
```

The containers reach it through `host.docker.internal`.

**Linux:** use the bundled Ollama container. A host install only listens on `127.0.0.1`, which containers cannot
reach. Add these lines to `.env`:

```env
COMPOSE_PROFILES=ollama
OLLAMA_BASE_URL=http://ollama:11434/v1
```

Then pull the model once the containers are running (after step 4):

```bash
docker compose exec ollama ollama pull qwen3:8b
```

### 4. Start it

```bash
docker compose up -d --build
```

The first build downloads and installs everything and can take a while. Check that every service is up with
`docker compose ps`.

### 5. Sign up and make yourself an admin

Open <http://localhost:3107>, create an account and paste a video link. The first video is slower because Whisper
downloads its model.

The admin panel (`/admin`) is for users marked as admins. To mark your account:

```bash
docker compose exec postgres psql -U supoclip -d supoclip -c "UPDATE users SET is_admin = true WHERE email = 'you@example.com';"
```

### Updating

```bash
git pull
docker compose up -d --build
```

Database changes are applied automatically when the backend starts.

### Tips for local models

- **Speed:** set `WHISPER_MODEL_SIZE` (`tiny`, `base`, `small`, `medium`, `large-v3`) in `.env` to trade accuracy
  for speed. `small` is the default.
- **Quality:** larger Ollama models (`qwen3:14b`, `gpt-oss:20b`) pick noticeably better clips. Change the server
  default with `LLM=ollama:<model>`, or let each user choose under **Settings → AI models**.
- **AI editing in the clip studio** uses Claude by default. For a free local editor, set
  `AI_EDIT_MODEL=ollama:qwen3:8b`.
- **GPU for the model:** Ollama installed on the computer uses an NVIDIA or Apple GPU automatically. For the Ollama
  container, uncomment the GPU block of the `ollama` service in `docker-compose.yml` (needs the NVIDIA Container
  Toolkit).

## Using cloud models

There are two ways, and they can be combined:

1. **Server keys** in `.env` apply to every user: for example `ASSEMBLY_AI_API_KEY=...`,
   `LLM=google-gla:gemini-3-flash-preview` and `GOOGLE_API_KEY=...`. Admins can also set them in the `/admin` panel.
   With an AssemblyAI key set, transcription switches to AssemblyAI automatically.
2. **Users' own keys:** each user opens **Settings → AI models**, pastes a key and picks a model id such as
   `openai:gpt-5.2`, `anthropic:claude-sonnet-5-5` or `google-gla:gemini-3-flash-preview`. Their key and model are used
   only for their videos. A saved AssemblyAI key switches their transcription to AssemblyAI.

Storing users' keys needs `APP_SETTINGS_ENCRYPTION_KEY` in `.env`, which step 2 of the install already sets.

Model ids change often. Check your provider's current model list.

## Running a paid hosted version

Set `SELF_HOST=false` to turn on accounts with plans, monthly minute limits and Stripe checkout. The Stripe price IDs,
webhook secret and plan limits are described in [docs/configuration.md](docs/configuration.md). Set your own
identity for the legal pages and footer:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_COMPANY_NAME=Your Company Ltd
NEXT_PUBLIC_COMPANY_ADDRESS=...
NEXT_PUBLIC_GITHUB_URL=https://github.com/<your-username>/shortsmith
```

On a hosted instance, users cannot choose local Ollama models unless you set `ALLOW_USER_OLLAMA=true`, so they cannot
run jobs on your GPU. They can never point the server at their own Ollama URL.

**Licence obligations:** because Shortsmith is AGPL-3.0, people who use your hosted version must be able to get the
complete source code of the version you run, including your changes. Keeping this repository public and linked from
the site (`NEXT_PUBLIC_GITHUB_URL`) covers that. You may charge for the hosted service.

## Documentation

| Guide | What it covers |
|---|---|
| [Setup](docs/setup.md) | Docker install, local development, first-run checklist |
| [Configuration](docs/configuration.md) | Every environment variable, operating modes, provider options |
| [App guide](docs/app-guide.md) | Screens, workflows, admin features, hosted vs self-host |
| [Architecture](docs/architecture.md) | How the frontend, API, worker, queue and pipeline fit together |
| [API reference](docs/api-reference.md) | Backend endpoints, API keys, admin and billing routes |
| [Development](docs/development.md) | Running without Docker, testing, contributing |
| [Troubleshooting](docs/troubleshooting.md) | Fixes for common problems |

## Development and testing

```bash
make test
```

The backend needs Linux or macOS (it uses `fcntl`); on Windows use Docker or WSL.

## Licence and credits

Shortsmith is free software under the [GNU AGPL-3.0](LICENSE). It is based on
[SupoClip](https://github.com/FujiwaraChoki/supoclip) by FujiwaraChoki. The SupoClip name and logo are not used for
this fork.

Only clip videos you own or have permission to use. Downloading from YouTube and other sites may be restricted by
their terms of service.
