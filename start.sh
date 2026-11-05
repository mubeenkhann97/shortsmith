#!/bin/bash

# Shortsmith - Quick Start Script
# This script helps you start Shortsmith with a single command

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "  Shortsmith - AI Video Clipping Tool"
echo "============================================"
echo ""

# .env is optional: with no keys, Shortsmith runs free on local Whisper + Ollama.
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo -e "${YELLOW}No .env file found: the app will use port 3001 and development secrets.${NC}"
    echo "Create .env first (README, 'Install on a new computer', step 2)."
    echo ""
fi

# Match Compose's host port, including its legacy deployment fallback.
FRONTEND_LOCAL_URL="http://localhost:${FRONTEND_PORT:-3001}"

if [ -n "${LLM:-}" ]; then
    case "$LLM" in
        google:*|google-gla:*|openai:*|openrouter:*|anthropic:*|ollama:*)
            ;;
        *)
            echo -e "${YELLOW}Warning: Unsupported LLM value '$LLM'${NC}"
            echo "Use google-gla:*, openai:*, openrouter:*, anthropic:*, or ollama:*"
            echo ""
            ;;
    esac
fi

if [ "${LLM:-}" = "ollama:" ]; then
    echo -e "${YELLOW}Warning: LLM=ollama: is missing a model name${NC}"
    echo "Use a value like LLM=ollama:qwen3:8b"
    echo ""
fi

if [ -z "${ASSEMBLY_AI_API_KEY:-}" ]; then
    echo "Transcription: local Whisper (set ASSEMBLY_AI_API_KEY to use AssemblyAI)."
fi

if [ -z "${OPENAI_API_KEY:-}${GOOGLE_API_KEY:-}${ANTHROPIC_API_KEY:-}${OPENROUTER_API_KEY:-}" ] || [[ "${LLM:-}" == ollama:* ]]; then
    MODEL="${LLM:-ollama:qwen3:8b}"
    echo "Clip selection: $MODEL"
    if command -v ollama > /dev/null 2>&1; then
        if ! ollama list 2>/dev/null | grep -q "${MODEL#ollama:}"; then
            echo -e "${YELLOW}Ollama model ${MODEL#ollama:} is not pulled yet. Run: ollama pull ${MODEL#ollama:}${NC}"
        fi
    else
        echo -e "${YELLOW}Ollama was not found on this machine. Install it from https://ollama.com,${NC}"
        echo -e "${YELLOW}or start the bundled one: COMPOSE_PROFILES=ollama OLLAMA_BASE_URL=http://ollama:11434/v1 ./start.sh${NC}"
    fi
fi
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running!${NC}"
    echo "Please start Docker Desktop and try again."
    echo ""
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed!${NC}"
    echo "Please install Docker Compose and try again."
    echo ""
    exit 1
fi

# Determine which docker compose command to use
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}Starting Shortsmith...${NC}"
echo ""

# Build and start containers
echo "Building and starting Docker containers..."
echo "(This may take a few minutes on the first run)"
echo ""

$DOCKER_COMPOSE up -d --build

echo ""
echo -e "${GREEN}Shortsmith is starting up!${NC}"
echo ""
echo "Services will be available at:"
echo "  - Frontend:  $FRONTEND_LOCAL_URL"
echo "  - Backend:   http://localhost:8000"
echo "  - API Docs:  http://localhost:8000/docs"
echo ""
echo "To view logs, run:"
echo "  $DOCKER_COMPOSE logs -f"
echo ""
echo "To stop all services, run:"
echo "  $DOCKER_COMPOSE down"
echo ""
echo "Waiting for services to be healthy..."

# Wait for services to be healthy
sleep 5

# Check if services are running
if $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo -e "${GREEN}Services are starting successfully!${NC}"
    echo ""
    echo "You can now:"
    echo "  1. Open $FRONTEND_LOCAL_URL in your browser"
    echo "  2. View logs: $DOCKER_COMPOSE logs -f"
    echo "  3. Stop services: $DOCKER_COMPOSE down"
else
    echo -e "${YELLOW}Services are starting... Check logs if you encounter issues:${NC}"
    echo "  $DOCKER_COMPOSE logs -f"
fi

echo ""
echo "============================================"
