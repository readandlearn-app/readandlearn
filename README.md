# Read & Learn

A Chrome extension that analyzes French articles for CEFR difficulty level (A1-C2), provides word definitions, and helps you build vocabulary decks for language learning.

## Features

- **CEFR Analysis**: Automatically assess reading difficulty of French articles
- **Smart Caching**: Vector similarity matching reduces API costs by 80%+
- **Word Definitions**: Instant translations with dictionary fallback
- **Vocabulary Deck**: Save words with context for spaced repetition
- **Comprehension Questions**: Generate practice questions from any article
- **Export**: Anki-compatible CSV, JSON formats

## Quick Start

### One-Liner Install

**Mac/Linux:**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/readandlearn-app/readandlearn/main/install.sh)
```

**Windows (PowerShell as Administrator):**
```powershell
iex (irm https://raw.githubusercontent.com/readandlearn-app/readandlearn/main/install.ps1)
```

The installer will:
- Check prerequisites (Docker, Docker Compose)
- Clone the repository
- Set up environment variables
- Start the backend server
- Guide you through extension installation

### Manual Installation

**Prerequisites:**
- Docker & Docker Compose
- AI API key from your provider

**Steps:**

1. **Clone the repository**
```bash
git clone https://github.com/readandlearn-app/readandlearn.git
cd readandlearn
```

2. **Configure environment**
```bash
cd translation-backend
cp .env.example .env
# Edit .env and add your AI API key
```

3. **Start services**
```bash
docker-compose up -d
```

4. **Verify backend is running**
```bash
curl http://localhost:3000/health
```

5. **Install Chrome Extension**
   - Open Chrome/Arc
   - Go to `chrome://extensions/` or `arc://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder
   - Pin the extension to your toolbar

## Usage

1. Navigate to any French article (e.g., [Le Monde](https://www.lemonde.fr))
2. Click the extension icon
3. View CEFR level, vocabulary complexity, and grammar analysis
4. Click words for instant definitions
5. Save words to your deck for later review
6. Generate comprehension questions to test your understanding

## Architecture

```
Chrome Extension → Backend API (Node.js/Express)
                   ├─ AI API (CEFR analysis, definitions)
                   ├─ PostgreSQL (caching, vocabulary storage)
                   └─ Local Embeddings (similarity matching)
```

## Cost Estimate

With smart caching enabled:
- ~$0.004 per article analysis (with 80%+ cache hit rate)
- ~$0.0001 per word definition
- 100 articles/month ≈ $12/month for heavy users
- Most users: $2-5/month with caching

## Development

**Run backend in development mode:**
```bash
cd translation-backend
npm install
npm run dev
```

**Database migrations:**
```bash
docker-compose exec postgres psql -U readandlearn -d readandlearn -f /docker-entrypoint-initdb.d/init.sql
```

**View logs:**
```bash
docker-compose logs -f
```

## Configuration

Edit `translation-backend/.env`:

```bash
# Required
CLAUDE_API_KEY=your-api-key-here

# Optional
PORT=3000
ENABLE_CACHING=true
ENABLE_ANALYTICS=true
MAX_TEXT_WORDS=800
```

## Troubleshooting

**Backend not starting?**
- Check Docker is running: `docker ps`
- Check logs: `docker-compose logs`
- Verify API key is set in `.env`

**Extension not working?**
- Ensure backend is running: `curl http://localhost:3000/health`
- Check browser console (F12) for errors
- Verify extension is enabled and pinned

**High API costs?**
- Enable caching: `ENABLE_CACHING=true` in `.env`
- Reduce text sampling: `MAX_TEXT_WORDS=600`
- Check cache hit rate: `curl http://localhost:3000/stats`

## Contributing

Contributions welcome! This project is licensed under AGPL-3.0.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

- [ ] Support for Spanish, German, Italian
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Community shared decks
- [ ] Sync across devices
- [ ] Advanced analytics

## License

AGPL-3.0 - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Xenova Transformers](https://github.com/xenova/transformers.js) for local embeddings
- Built with Express, PostgreSQL, and love for language learning

---

**Need help?** Open an issue or start a discussion.
