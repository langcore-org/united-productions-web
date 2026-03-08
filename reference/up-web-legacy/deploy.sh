#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  CLI Proxy Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create logs directory
mkdir -p logs

# Check prerequisites
echo -e "\n${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python3 is not installed${NC}"
    exit 1
fi

if ! command -v poetry &> /dev/null; then
    echo -e "${RED}Error: Poetry is not installed${NC}"
    echo "Install with: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2 globally...${NC}"
    npm install -g pm2
fi

echo -e "${GREEN}All prerequisites satisfied${NC}"

# Install Next.js dependencies and build
echo -e "\n${YELLOW}[2/6] Setting up Next.js Chat UI...${NC}"
cd "$SCRIPT_DIR/next-chat-ui-cc-wrapper"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo -e "${YELLOW}Creating .env from .env.example${NC}"
    cp .env.example .env
fi

echo "Installing npm dependencies..."
npm install

echo "Building Next.js application..."
npm run build

# Install Python dependencies
echo -e "\n${YELLOW}[3/6] Setting up Python API Wrapper...${NC}"
cd "$SCRIPT_DIR/claude-code-openai-wrapper"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo -e "${YELLOW}Creating .env from .env.example${NC}"
    cp .env.example .env
    echo -e "${RED}Please edit .env and add your API keys!${NC}"
fi

echo "Installing Poetry dependencies..."
poetry install --no-dev

# Stop existing PM2 processes
echo -e "\n${YELLOW}[4/6] Stopping existing processes...${NC}"
cd "$SCRIPT_DIR"
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start PM2 processes
echo -e "\n${YELLOW}[5/6] Starting services with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration for startup
echo -e "\n${YELLOW}[6/6] Saving PM2 configuration...${NC}"
pm2 save

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nServices running:"
echo -e "  - Chat UI:     http://localhost:3120"
echo -e "  - API Wrapper: http://localhost:8120"
echo -e "\nUseful commands:"
echo -e "  pm2 status          - Check status"
echo -e "  pm2 logs            - View all logs"
echo -e "  pm2 logs chat-ui    - View Chat UI logs"
echo -e "  pm2 logs api-wrapper - View API logs"
echo -e "  pm2 restart all     - Restart all services"
echo -e "  pm2 stop all        - Stop all services"
echo -e "\nTo enable auto-start on system boot:"
echo -e "  pm2 startup"
echo -e "  (follow the instructions, then run: pm2 save)"

pm2 status
