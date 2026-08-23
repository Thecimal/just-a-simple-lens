# Project Structure — Lens (SEO & GEO Analyzer)

Complete monorepo with backend API (Node.js + Playwright) and frontend (Astro + React + Tailwind).

```
geo-seo-analyzer/
│
├── README.md                      ← Start here
├── PROJECT_STRUCTURE.md           ← This file
├── .gitignore
├── package.json                   ← Root workspace config (npm workspaces)
│
├── apps/
│   │
│   ├── api/                       BACKEND: Node.js + Playwright + Express
│   │   ├── .env.example           ← Copy to .env and add ANTHROPIC_API_KEY
│   │   ├── package.json           ← Dependencies: playwright, express, anthropic SDK, etc.
│   │   │
│   │   └── src/
│   │       ├── server.js          ← Express entrypoint (port 8787)
│   │       │
│   │       ├── crawler/
│   │       │   └── scraper.js     ← Core Playwright crawler (dual crawl: rendered + raw)
│   │       │
│   │       ├── analyzers/
│   │       │   ├── seoAnalyzer.js ─────────────────┐
│   │       │   ├── geoAnalyzer.js                  │ Pipeline returns:
│   │       │   ├── llmCitationSimulator.js          ├─ score (0-100)
│   │       │   │   (calls Claude to judge           │ subscores (individual metrics)
│   │       │   │    citability via JSON)            │ findings (actionable issues)
│   │       │   │                                    │ extractedSignals (stats/quotes/entities)
│   │       │   └── suggestionsEngine.js ───────────┘
│   │       │       (merges all findings → prioritized fixes)
│   │       │
│   │       ├── routes/
│   │       │   └── analyze.js     ← POST /api/analyze (blocking)
│   │       │                        GET /api/analyze/stream?url=... (SSE progress)
│   │       │
│   │       └── utils/
│   │           ├── htmlCleaner.js ─ Strips scripts/ads/boilerplate, cleans HTML
│   │           └── validateUrl.js ─ URL validation
│   │
│   └── public/                    ← (empty; static assets would go here)
│
└── apps/
    │
    └── web/                       FRONTEND: Astro + React + Tailwind
        ├── astro.config.mjs       ← Astro config (React + Tailwind integrations)
        ├── tailwind.config.js     ← Design tokens (colors, fonts, shadows)
        ├── package.json           ← Dependencies: astro, react, tailwindcss, etc.
        │
        ├── public/                ← Static assets (favicon, etc.)
        │
        └── src/
            ├── pages/
            │   └── index.astro    ← Main page (mounts React Dashboard island)
            │
            ├── layouts/
            │   └── Layout.astro   ← HTML wrapper, global styles
            │
            ├── components/
            │   ├── Dashboard.jsx          ← Top-level state manager
            │   │                           (handles scan lifecycle, SSE progress)
            │   ├── ScoreGauge.jsx         ← Dual split-gauge (SEO left, GEO right)
            │   │                           Signature visual element
            │   ├── SuggestionsPanel.jsx   ← Two-column: SEO fixes | GEO fixes
            │   ├── EntityCitationPanel.jsx ← Signals (stats/quotes/entities) + 
            │   │                             Claude verdict (JSON code block)
            │   └── UrlInputForm.jsx       ← Terminal-style URL input bar
            │
            ├── lib/
            │   └── api.js         ← SSE client (analyzeStream function)
            │
            └── styles/
                └── global.css     ← Tailwind imports + base layer overrides
```

---

## Key Files at a Glance

### Backend

| File | Purpose | Lines |
|------|---------|-------|
| `scraper.js` | **Crawler Engine** — dual crawl (rendered + raw/no-JS), extracts DOM structure, meta, headings, links, images, schema | 200 |
| `seoAnalyzer.js` | **SEO Pipeline** — meta tags, heading hierarchy, keyword density, schema, links, images → score + findings | 280 |
| `geoAnalyzer.js` | **GEO Pipeline** — chunkability, semantic HTML, citation density, direct-answer block, JS-dependency → score + findings | 350 |
| `llmCitationSimulator.js` | **LLM Simulation** — sends content to Claude, asks "would you cite this?", returns JSON verdict or heuristic fallback | 180 |
| `suggestionsEngine.js` | **Suggestions Merger** — combines SEO + GEO findings + LLM risks into one prioritized, severity-ranked list | 80 |
| `analyze.js` | **Route Handler** — POST /api/analyze (blocking) and GET /api/analyze/stream (SSE) | 120 |
| `server.js` | **Express Setup** — CORS, rate limiting, health check, logging | 45 |
| `htmlCleaner.js` | **HTML Processor** — strips noise, converts to readable text, extracts structural outline | 110 |

### Frontend

| File | Purpose | Lines |
|------|---------|-------|
| `Dashboard.jsx` | **State Manager** — scan lifecycle, SSE listener, stage progress, composes all child components | 180 |
| `ScoreGauge.jsx` | **Dual Gauge** — SVG split-circle, SEO fills left (blue), GEO fills right (amber), animates proportionally | 140 |
| `SuggestionsPanel.jsx` | **Fix Columns** — left: SEO findings, right: GEO findings, severity tags, actionable copy | 100 |
| `EntityCitationPanel.jsx` | **Signals Panel** — stat cards (stats found, quotes, entities, JS%), entity chips, Claude verdict in code block | 140 |
| `UrlInputForm.jsx` | **Input Bar** — terminal-style command prompt for URL submission | 50 |
| `api.js` | **SSE Client** — EventSource listener, stages, final report resolve | 30 |
| `Layout.astro` | **Base HTML** — doctype, head, meta, global.css import | 25 |
| `index.astro` | **Index Page** — mounts Dashboard as Astro island (`client:load`) | 10 |
| `global.css` | **Base Styles** — Tailwind layers, fonts, focus/motion preferences | 35 |
| `tailwind.config.js` | **Design Tokens** — colors (ink/surface/seo/geo/critical), fonts (IBM Plex), shadows | 60 |
| `astro.config.mjs` | **Astro Config** — React + Tailwind integrations, output mode | 25 |

---

## Data Flow

```
User enters URL in Dashboard
         ↓
    UrlInputForm submits → api.js initiates SSE connection
         ↓
    /api/analyze/stream?url=...
         ↓
    ┌─────────────────────────────────────────────────┐
    │  Backend Pipeline (apps/api)                    │
    ├─────────────────────────────────────────────────┤
    │                                                 │
    │  1. scraper.js                                  │
    │     ├─ crawlRendered() → full JS render         │
    │     └─ crawlRawForAI() → no-JS (GPTBot UA)      │
    │     Returns: {html, text, meta, headings, ...}  │
    │                          ↓                      │
    │  2a. seoAnalyzer.js (analyzed rendered version) │
    │      └─ score: 0-100, subscores, findings       │
    │                          ↓                      │
    │  2b. geoAnalyzer.js (analyzed raw version)      │
    │      └─ score: 0-100, subscores, signals        │
    │                          ↓                      │
    │  3. llmCitationSimulator.js                      │
    │     └─ sends raw.text to Claude                 │
    │        returns: {wouldCite, confidence, risks}  │
    │                          ↓                      │
    │  4. suggestionsEngine.js                        │
    │     └─ merges all findings → {seoFixes, geoFixes}
    │                                                 │
    └─────────────────────────────────────────────────┘
         ↓
    SSE: stage events (crawling → seo → geo → llm → suggestions)
         ↓
    SSE: done event with full report JSON
         ↓
    Frontend receives report
         ↓
    Dashboard.jsx state update → renders:
    ├─ ScoreGauge (seo + geo scores)
    ├─ EntityCitationPanel (signals + llmVerdict)
    └─ SuggestionsPanel (seoFixes + geoFixes)
```

---

## Environment Variables

### Backend (`apps/api/.env`)
```
PORT=8787
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
ALLOWED_ORIGIN=https://your-pages-domain.pages.dev,http://localhost:4321
```

### Frontend (`apps/web/.env` or build-time)
```
PUBLIC_API_BASE_URL=https://api.yourdomain.com
```
(defaults to `http://localhost:8787` if not set)

---

## Installation & Running

```bash
# Install both apps at once (npm workspaces)
npm install

# Dev: Backend
npm run dev:api       # :8787

# Dev: Frontend
npm run dev:web       # :4321

# Build frontend for production
npm run build:web     # outputs to apps/web/dist/
```

---

## Deployment

**Frontend → Cloudflare Pages**
```bash
cd apps/web
npm run build
npx wrangler pages deploy dist --project-name=geo-seo-analyzer
```

**Backend → Ubuntu VPS**
```bash
cd apps/api
npm install
cp .env.example .env && nano .env
npm install -g pm2
pm2 start src/server.js --name geo-seo-api
```
Then Nginx/Caddy reverse proxy on port 443 to localhost:8787.

---

## Technology Choices

| Layer | Tech | Why |
|-------|------|-----|
| **Crawling** | Playwright | Can render JS for SEO, can disable JS for GEO (dual crawl) |
| **Backend** | Node.js + Express | Fast, good async, works with Playwright |
| **Frontend Framework** | Astro | Static-by-default, React islands where needed, minimal overhead |
| **UI Library** | React | Rich component state (scan progress, SSE events) |
| **Styling** | Tailwind CSS | Design tokens, dark mode, responsive |
| **LLM** | Anthropic Claude API | Best citation-judgment capabilities for this task |
| **Deployment** | Cloudflare (frontend) + VPS (backend) | Workers can't run Playwright; Pages is perfect for static + React islands |

---

## Common Tasks

**Add a new SEO check**
→ Edit `apps/api/src/analyzers/seoAnalyzer.js`, add a scoring function, return finding

**Swap LLM (Claude → Gemini/Groq/local Ollama)**
→ Modify `simulateLlmCitation()` in `llmCitationSimulator.js`

**Change design/colors**
→ Edit `apps/web/tailwind.config.js` (colors, fonts, shadows), components reference via Tailwind classes

**Add a new metric to the gauge**
→ Modify `ScoreGauge.jsx` (add new SVG path, tick marks, label)

**Add more detailed findings**
→ Update `SuggestionsPanel.jsx` to render additional fields from findings objects

---

## API Contract

### POST `/api/analyze`
**Request:**
```json
{ "url": "https://example.com/page" }
```

**Response:**
```json
{
  "url": "...",
  "fetchedAt": "2026-08-23T10:00:00Z",
  "scores": { "seo": 78, "geo": 54, "overall": 66 },
  "seo": { "subscores": {...}, "keywordDensity": [...] },
  "geo": { "subscores": {...}, "extractedSignals": {...} },
  "llmVerdict": { "wouldCite": false, "citationConfidence": 42, ... },
  "diff": { "renderedWordCount": 1200, "rawWordCount": 340, "jsDependencyRatio": 71.7 },
  "suggestions": { "summary": "...", "seoFixes": [...], "geoFixes": [...], "quickWins": [...] }
}
```

### GET `/api/analyze/stream?url=...`
**Events:**
```
event: stage
data: {"stage":"crawling","label":"Fetching page..."}

event: stage
data: {"stage":"seo","label":"Running SEO pipeline..."}

...

event: done
data: { ...full report JSON... }
```

---

## Support & Next Steps

- **Not working?** Check `apps/api/.env` has `ANTHROPIC_API_KEY` set
- **Want to deploy?** See README.md Deployment section
- **Want to modify?** Each analyzer is self-contained; changes don't ripple unexpectedly
- **Want to integrate?** Use the POST `/api/analyze` endpoint for headless analysis
