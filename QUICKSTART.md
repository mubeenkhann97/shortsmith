# Shortsmith Quick Start Guide

Run Shortsmith with Docker in just one command!

## Prerequisites

1. **Docker Desktop** installed and running
2. **For the free mode:** [Ollama](https://ollama.com/) with a model pulled (`ollama pull qwen3:8b`).
   No API keys are needed: transcription uses local Whisper.
3. **Optional cloud keys** (server-wide, or each user adds their own under Settings → AI models):
   - [AssemblyAI](https://www.assemblyai.com/) for faster, more accurate transcription
   - [OpenAI](https://platform.openai.com/api-keys), [Google AI](https://aistudio.google.com/apikey),
     [Anthropic](https://console.anthropic.com/) or [OpenRouter](https://openrouter.ai/) for clip selection

## Quick Start (Single Command)

```bash
./start.sh
```

That's it! The script will:
- Check prerequisites
- Build Docker images
- Start all services
- Show you where to access the app

## First Time Setup

### 1. Configure Environment Variables

Create `.env` in the project root with the port, a CPU-only build and three random secrets (step 2 of
"Install on a new computer" in the [README](README.md#2-create-env)). The free mode needs nothing else.

To use cloud models server-wide, add their keys to the same `.env`:

```bash
# Optional: AssemblyAI transcription (otherwise local Whisper is used)
ASSEMBLY_AI_API_KEY=your_assemblyai_key_here

# Optional: a cloud model for clip selection (otherwise ollama:qwen3:8b is used)
OPENAI_API_KEY=your_openai_key_here
LLM=openai:gpt-5.2

# Optional: Amazon SES for subscription lifecycle emails
# Required if you want hosted billing emails when SELF_HOST=false
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_aws_access_key_id
# AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
# SES_FROM_EMAIL="Shortsmith <onboarding@example.com>"
```

### 2. Start Shortsmith

```bash
./start.sh
```

### 3. Access the Application

- **Frontend**: http://localhost:3107
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

These URLs assume `FRONTEND_PORT=3107` in `.env`.
Existing `.env` files without that setting keep Docker host port `3001`.
Preserve your existing port when using a production reverse proxy.

## Manual Docker Commands

If you prefer to use Docker commands directly:

```bash
# Start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Environment Configuration

### AI Variables (all optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `ASSEMBLY_AI_API_KEY` | - | AssemblyAI transcription; without it, local Whisper is used |
| `TRANSCRIPTION_PROVIDER` | auto | `assemblyai`, `whisper` or `youtube_captions`; empty picks automatically |
| `LLM` | `ollama:qwen3:8b` when no cloud key is set | Clip selection model, e.g. `openai:gpt-5.2` |
| `APP_SETTINGS_ENCRYPTION_KEY` | - | Needed to store users' own API keys and admin settings |
| `ALLOW_USER_OLLAMA` | same as `SELF_HOST` | Lets users pick local Ollama models for their videos |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL_SIZE` | `small` | Whisper model size (tiny/base/small/medium/large) |
| `BETTER_AUTH_SECRET` | dev secret | Auth secret (change in production!) |
| `GOOGLE_API_KEY` | - | For Google Gemini models |
| `ANTHROPIC_API_KEY` | - | For Claude models |
| `OPENROUTER_API_KEY` | - | For `openrouter:*` models |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | For local/self-hosted Ollama endpoint |
| `OLLAMA_API_KEY` | - | Optional, required for Ollama Cloud |
| `AWS_REGION` | `us-east-1` | Optional in self-host mode, required for hosted billing emails |
| `AWS_ACCESS_KEY_ID` | - | Optional in self-host mode, required for hosted billing emails |
| `AWS_SECRET_ACCESS_KEY` | - | Optional in self-host mode, required for hosted billing emails |
| `SES_FROM_EMAIL` | `Shortsmith <onboarding@example.com>` | Verified sender for backend subscription emails |

### Hosted Billing Email Setup

If you enable hosted monetization with `SELF_HOST=false`, set these as well:

| Variable | Description |
|----------|-------------|
| `BACKEND_AUTH_SECRET` | Shared secret used by frontend API routes to call the backend |
| `STRIPE_SECRET_KEY` | Stripe server-side API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for the $9.99/month Pro subscription |
| `STRIPE_SCALE_PRICE_ID` | Stripe price ID for the $24.99/month Creator subscription |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe price ID for the $99.90/year Pro subscription |
| `STRIPE_SCALE_ANNUAL_PRICE_ID` | Stripe price ID for the $249.90/year Creator subscription |
| `STRIPE_PRICE_ID` | Legacy fallback Stripe price ID for the Pro subscription |
| `PRO_PLAN_MINUTE_LIMIT` | Pro monthly allowance in minutes of source video, usually `600` |
| `SCALE_PLAN_MINUTE_LIMIT` | Creator monthly allowance in minutes of source video, usually `1500` |
| `AWS_REGION` | AWS region used for Amazon SES, default `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key ID used to send subscription emails via Amazon SES |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key used to send subscription emails via Amazon SES |
| `SES_FROM_EMAIL` | Verified sender address used for subscription emails |

The billing flow sends:

- A thank-you email after `checkout.session.completed`
- A cancellation email after `customer.subscription.deleted`

## Supported AI Models

### OpenAI (Recommended)
```bash
LLM=openai:gpt-4
LLM=openai:gpt-4-turbo
LLM=openai:gpt-3.5-turbo
```

### Anthropic
```bash
LLM=anthropic:claude-3-5-sonnet-20241022
LLM=anthropic:claude-3-opus
LLM=anthropic:claude-3-haiku
```

### Google
```bash
LLM=google-gla:gemini-3-flash-preview
LLM=google-gla:gemini-3-pro-preview
```

### Ollama
```bash
LLM=ollama:gpt-oss:20b
OLLAMA_BASE_URL=http://localhost:11434/v1
```

## Troubleshooting

### Services not starting?

1. **Check Docker is running**:
   ```bash
   docker info
   ```

2. **View service logs**:
   ```bash
   docker-compose logs -f
   ```

3. **Check service health**:
   ```bash
   docker-compose ps
   ```

### API Keys not working?

1. Verify keys are set in `.env` file
2. Ensure no extra spaces around the `=` sign
3. Restart services after changing `.env`:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Database issues?

Reset the database:
```bash
docker-compose down -v  # WARNING: This deletes all data!
docker-compose up -d
```

## Architecture

Shortsmith runs these Docker containers (plus an optional `ollama` service):

1. **Frontend** (Next.js 15) - Port 3107
2. **Backend** (FastAPI + Python) - Port 8000
3. **Worker** (video processing) and **AI worker** (clip studio AI edits)
4. **MCP server** for MCP clients
5. **PostgreSQL** - Port 5432
6. **Redis** - Port 6379

All services are connected via a Docker network and start automatically with proper health checks.

## What Happens When You Run `./start.sh`?

1. Checks for a `.env` file (optional for the free mode)
2. Verifies Docker is running
3. Builds Docker images (first time: ~5-10 minutes)
4. Starts PostgreSQL and waits for it to be healthy
5. Starts Redis cache
6. Starts backend API server
7. Starts frontend web server
8. Displays URLs for accessing the application

## Production Deployment

For production use:

1. Change `BETTER_AUTH_SECRET` to a secure random string
2. Use strong database passwords
3. Enable HTTPS with a reverse proxy (nginx/Caddy)
4. Set up persistent volumes for data
5. Configure backup strategies

## Next Steps

- Read the full documentation in `CLAUDE.md`
- Check out the API docs at http://localhost:8000/docs
- View example clips in the frontend
- Customize fonts by adding TTF files to `backend/fonts/`
- Add transition effects by adding MP4 files to `backend/transitions/`

## Getting Help

- Check logs: `docker-compose logs -f`
- View API documentation: http://localhost:8000/docs
- Report issues: Create a GitHub issue with logs and error messages
