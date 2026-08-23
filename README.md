# Lens — Dual SEO & GEO Analyzer

Crawls a URL the way both a traditional search bot and an AI/LLM crawler see
it, then scores it on two independent pipelines and returns actionable,
JSON-formatted fixes for each.

## Why this architecture

**Playwright cannot run on Cloudflare Workers.** Workers run on the V8
isolate runtime — there's no OS process to spawn a Chromium binary. So the
crawler/analyzer API is a standard Node.js service on a VPS (or any
Ubuntu box), while the Astro/React frontend deploys to Cloudflare Pages as a
static build that calls that API over HTTPS. If you later want to run the
*frontend's* build on Workers instead of Pages, nothing here changes — the
API stays on the VPS either way.

**Two crawls, not one.** `apps/api/src/crawler/scraper.js` fetches every
page twice: once with full JS execution (for SEO structural analysis — the
DOM Googlebot's rendering service would see), and once with JavaScript
disabled under a GPTBot user agent (for GEO analysis — the raw payload most
AI crawlers actually ingest, since the majority don't execute JS). Diffing
the two word counts is itself one of the highest-signal GEO findings.

## Project structure

```
geo-seo-analyzer/
├── apps/
│   ├── web/                        Astro + React + Tailwind frontend (Cloudflare Pages)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Dashboard.jsx           top-level state + SSE progress
│   │   │   │   ├── ScoreGauge.jsx          signature dual split-gauge
│   │   │   │   ├── SuggestionsPanel.jsx    SEO fixes | GEO fixes columns
│   │   │   │   ├── EntityCitationPanel.jsx entities, stats, LLM verdict
│   │   │   │   └── UrlInputForm.jsx
│   │   │   ├── layouts/Layout.astro
│   │   │   ├── pages/index.astro
│   │   │   ├── lib/api.js                  SSE client
│   │   │   └── styles/global.css
│   │   ├── astro.config.mjs
│   │   └── tailwind.config.js
│   │
│   └── api/                        Node.js + Playwright backend (VPS / Ubuntu)
│       ├── src/
│       │   ├── crawler/scraper.js          The Crawler Engine
│       │   ├── analyzers/
│       │   │   ├── seoAnalyzer.js          Traditional SEO pipeline
│       │   │   ├── geoAnalyzer.js          GEO pipeline
│       │   │   ├── llmCitationSimulator.js Claude citation simulation
│       │   │   └── suggestionsEngine.js    Merges findings -> JSON fixes
│       │   ├── routes/analyze.js           POST /api/analyze (+ SSE stream)
│       │   ├── utils/htmlCleaner.js
│       │   └── server.js
│       └── .env.example
├── package.json                    npm workspaces root
└── README.md
```

## Setup

```bash
# 1. Clone / unzip, then install everything from the root (npm workspaces)
npm install

# 2. Install Chromium for Playwright (also runs automatically via postinstall)
npx playwright install --with-deps chromium

# 3. Configure the API
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env and set ANTHROPIC_API_KEY

# 4. Run both apps in dev
npm run dev:api    # -> http://localhost:8787
npm run dev:web    # -> http://localhost:4321
```

Set `PUBLIC_API_BASE_URL` when building the frontend against a deployed API:

```bash
PUBLIC_API_BASE_URL=https://api.yourdomain.com npm run build:web
```

## Deployment

**Frontend — Cloudflare Pages**
```bash
cd apps/web
npm run build
npx wrangler pages deploy dist --project-name=geo-seo-analyzer
```

**Backend — Ubuntu VPS**
```bash
# on the server
git clone <repo> && cd geo-seo-analyzer/apps/api
npm install                       # triggers `playwright install --with-deps`
cp .env.example .env && nano .env
npm install -g pm2
pm2 start src/server.js --name geo-seo-api
pm2 save
```
Put Nginx (or Caddy) in front for TLS + reverse proxy to port 8787, and set
`ALLOWED_ORIGIN` in `.env` to your Pages domain so CORS only allows your
frontend.

## API contract

`GET /api/analyze/stream?url=https://example.com` — Server-Sent Events:
`stage` events while the pipeline runs, then one `done` event with the full
report (shape consumed by `Dashboard.jsx`):

```jsonc
{
  "url": "...",
  "fetchedAt": "...",
  "scores": { "seo": 78, "geo": 54, "overall": 66 },
  "seo": { "subscores": { ... }, "keywordDensity": [ ... ] },
  "geo": { "subscores": { ... }, "extractedSignals": { ... } },
  "llmVerdict": { "wouldCite": false, "citationConfidence": 42, "reasoning": "...", ... },
  "diff": { "renderedWordCount": 1200, "rawWordCount": 340, "jsDependencyRatio": 71.7 },
  "suggestions": {
    "summary": "...",
    "seoFixes": [ { "severity": "critical", "title": "...", "fix": "..." } ],
    "geoFixes": [ { "severity": "warning", "title": "...", "fix": "..." } ],
    "quickWins": [ ... ]
  }
}
```

`POST /api/analyze` `{ "url": "..." }` returns the same report shape
non-streamed, for programmatic/CI use.
