#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================="
echo "  Read & Learn - Installation Script"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"
echo -e "${GREEN}✓ Docker Compose is installed${NC}"
echo ""

# Check if we're already in the repo
if [ -f "translation-backend/server.js" ]; then
    echo -e "${YELLOW}Already in Read & Learn directory${NC}"
    REPO_DIR=$(pwd)
else
    # Clone the repository
    echo "📥 Cloning repository..."
    if [ -d "readandlearn" ]; then
        echo -e "${YELLOW}Directory 'readandlearn' already exists. Using existing directory.${NC}"
        REPO_DIR="readandlearn"
    else
        git clone https://github.com/readandlearn-app/readandlearn.git
        REPO_DIR="readandlearn"
    fi
fi

cd "$REPO_DIR/translation-backend"

# Setup .env file
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
    else
        cp .env.example .env
        echo -e "${GREEN}✓ Created new .env file${NC}"
    fi
else
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

# Prompt for AI API key
echo ""
echo "🔑 AI API Key Setup"
echo "Get your API key from your AI provider"
echo ""
read -p "Enter your AI API key (or press Enter to skip): " CLAUDE_KEY

if [ ! -z "$CLAUDE_KEY" ]; then
    # Update .env file with the API key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/CLAUDE_API_KEY=.*/CLAUDE_API_KEY=$CLAUDE_KEY/" .env
    else
        # Linux
        sed -i "s/CLAUDE_API_KEY=.*/CLAUDE_API_KEY=$CLAUDE_KEY/" .env
    fi
    echo -e "${GREEN}✓ API key configured${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped API key setup. You'll need to add it manually to .env${NC}"
fi

echo ""
echo "🚀 Starting services..."

# Start Docker Compose
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may still be starting. Check logs with: docker-compose logs -f${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo "========================================="
echo ""
echo "📍 Backend running at: http://localhost:3000"
echo "📊 Health check: http://localhost:3000/health"
echo "📈 Stats: http://localhost:3000/stats"
echo ""
echo "Next steps:"
echo "1. Install the Chrome extension:"
echo "   - Open Chrome/Arc browser"
echo "   - Go to chrome://extensions/ or arc://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select: $(pwd)/../extension/"
echo ""
echo "2. Test it:"
echo "   - Visit https://www.lemonde.fr"
echo "   - Click the extension icon"
echo "   - Analyze a French article!"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart: docker-compose restart"
echo ""
echo "Need help? https://github.com/readandlearn-app/readandlearn/issues"
echo ""
