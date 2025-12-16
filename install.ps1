# Read & Learn - Windows Installation Script
# Run as Administrator: iex (irm https://raw.githubusercontent.com/readandlearn-app/readandlearn/main/install.ps1)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Read & Learn - Installation Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is installed
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is installed
$composeInstalled = Get-Command docker-compose -ErrorAction SilentlyContinue
if (-not $composeInstalled) {
    # Try docker compose (newer syntax)
    try {
        docker compose version | Out-Null
    } catch {
        Write-Host "❌ Docker Compose is not installed" -ForegroundColor Red
        Write-Host "Please install Docker Compose from: https://docs.docker.com/compose/install/" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✓ Docker is installed" -ForegroundColor Green
Write-Host "✓ Docker Compose is installed" -ForegroundColor Green
Write-Host ""

# Check if we're already in the repo
if (Test-Path "translation-backend\server.js") {
    Write-Host "Already in Read & Learn directory" -ForegroundColor Yellow
    $repoDir = Get-Location
} else {
    # Clone the repository
    Write-Host "📥 Cloning repository..." -ForegroundColor Cyan

    if (Test-Path "readandlearn") {
        Write-Host "Directory 'readandlearn' already exists. Using existing directory." -ForegroundColor Yellow
        $repoDir = "readandlearn"
    } else {
        git clone https://github.com/readandlearn-app/readandlearn.git
        $repoDir = "readandlearn"
    }
}

Set-Location "$repoDir\translation-backend"

# Setup .env file
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Keeping existing .env file" -ForegroundColor Yellow
    } else {
        Copy-Item ".env.example" ".env" -Force
        Write-Host "✓ Created new .env file" -ForegroundColor Green
    }
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file" -ForegroundColor Green
}

# Prompt for AI API key
Write-Host ""
Write-Host "🔑 AI API Key Setup" -ForegroundColor Cyan
Write-Host "Get your API key from your AI provider" -ForegroundColor White
Write-Host ""
$claudeKey = Read-Host "Enter your AI API key (or press Enter to skip)"

if ($claudeKey) {
    # Update .env file with the API key
    (Get-Content ".env") -replace "CLAUDE_API_KEY=.*", "CLAUDE_API_KEY=$claudeKey" | Set-Content ".env"
    Write-Host "✓ API key configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Skipped API key setup. You'll need to add it manually to .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Cyan

# Start Docker Compose
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend may still be starting. Check logs with: docker-compose logs -f" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Backend running at: http://localhost:3000" -ForegroundColor White
Write-Host "📊 Health check: http://localhost:3000/health" -ForegroundColor White
Write-Host "📈 Stats: http://localhost:3000/stats" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install the Chrome extension:" -ForegroundColor White
Write-Host "   - Open Chrome/Arc browser"
Write-Host "   - Go to chrome://extensions/ or arc://extensions/"
Write-Host "   - Enable 'Developer mode'"
Write-Host "   - Click 'Load unpacked'"
Write-Host "   - Select: $(Get-Location)\..\extension\"
Write-Host ""
Write-Host "2. Test it:" -ForegroundColor White
Write-Host "   - Visit https://www.lemonde.fr"
Write-Host "   - Click the extension icon"
Write-Host "   - Analyze a French article!"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  - View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "  - Stop services: docker-compose down" -ForegroundColor White
Write-Host "  - Restart: docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "Need help? https://github.com/readandlearn-app/readandlearn/issues" -ForegroundColor White
Write-Host ""
