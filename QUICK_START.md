# 🚀 Quick Start Checklist

**Complete zip downloaded?** → Unzip it first!

```bash
unzip geo-seo-analyzer-complete.zip
cd geo-seo-analyzer
```

---

## ✅ Step 1: Get Your Claude API Key (Free)

Go to **https://console.anthropic.com**
1. Sign up with email (takes 2 min)
2. You get **$5 free credits** automatically
3. Go to **Settings → API Keys**
4. Click **Create Key** and copy it

This $5 is enough for **~50–100 page scans**. After it runs out, see the pricing guide at the bottom.

---

## ✅ Step 2: Install Dependencies

```bash
npm install
```

This installs packages for both `apps/web` (frontend) and `apps/api` (backend).

⏱️ Takes ~2–3 minutes.

**Troubleshooting:**
- Node.js not installed? Get it from https://nodejs.org (v20+)
- Playwright install fails? Run `npx playwright install --with-deps chromium` separately

---

## ✅ Step 3: Set Up Your API Key

```bash
cd apps/api
cp .env.example .env
nano .env
```

Edit the file and replace:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

with your key from Step 1. Save and close.

---

## ✅ Step 4: Run Both Apps (Two Terminal Tabs)

**Tab 1 — Backend (port 8787):**
```bash
npm run dev:api
```
You should see:
```
GEO/SEO Analyzer API listening on :8787
```

**Tab 2 — Frontend (port 4321):**
```bash
npm run dev:web
```
You should see:
```
Local    http://localhost:4321/
```

---

## ✅ Step 5: Open Your Browser

Go to **http://localhost:4321**

You'll see:
- **Lens** header (with "SEO & GEO Analyzer" subtitle)
- A terminal-style input bar saying `analyze > [URL input] [Run scan]`

---

## ✅ Step 6: Analyze Your First Page

1. Paste a URL (e.g., `https://example.com`)
2. Click **"Run scan"**
3. Watch the progress stages:
   - **Crawl** (fetching page with & without JS)
   - **SEO pipeline** (checking traditional signals)
   - **GEO pipeline** (checking AI-citability)
   - **AI simulation** (Claude judges citability)
   - **Suggestions** (building fixes)

Takes ~8–15 seconds for the first page (Chromium startup is slow).

---

## 📊 What You'll See

### Dual Score Gauge (Top)
- One circle split in half
- **Left (blue)** = SEO score
- **Right (amber)** = GEO score
- **Center** = Overall average

### Citation Signals (Middle)
- Stats found / Quotes found / Entities / JS-only content %
- Claude's verdict: "would cite? (yes/no, confidence %)"

### Suggestions (Bottom)
- **Left column:** Traditional SEO fixes (title, meta, headings, schema, links, images)
- **Right column:** GEO fixes (chunkability, semantic HTML, citation density, direct-answer blocks)

Each fix has:
- **Red tag** = Critical (fix this first)
- **Yellow tag** = Warning (matters for some queries)
- **Gray tag** = Minor (nice-to-have)

---

## 🛑 Troubleshooting

**"Failed to connect to API"**
- Make sure `npm run dev:api` is running in another terminal
- Check it says "listening on :8787"

**"ANTHROPIC_API_KEY not set"**
- Did you copy the .env file? `cp .env.example .env`
- Did you edit it with your key?
- Did you save it?
- Restart the backend: `Ctrl+C` and re-run `npm run dev:api`

**"Playwright install failed"**
```bash
cd apps/api
npx playwright install --with-deps chromium
```

**"Port 8787 already in use"**
```bash
# Kill whatever's using it
lsof -i :8787
kill -9 <PID>
```

**"npm: command not found"**
- Install Node.js: https://nodejs.org (v20+)
- Restart your terminal

**Scan takes 20+ seconds**
- Normal for first run (Chromium startup)
- Subsequent scans are ~8–10s
- If it hangs, check if your internet is working

---

## 💰 Pricing After Free Trial

After your $5 runs out (or you want to keep using it):

### **Option A: Keep Using Claude (Recommended for Production)**
- ~$0.03 per page scan
- Best quality judgment for citation-worthiness
- No setup needed, just add your card to Anthropic billing

### **Option B: Switch to Google Gemini (Cheapest)**
- Free tier: 60 requests/day
- ~$0.0001 per scan after free tier
- See the README "Using Free APIs" section

### **Option C: Use a Local LLM (Free Forever)**
- Download Ollama: https://ollama.ai
- Run: `ollama pull mistral`
- Modify `llmCitationSimulator.js` to call `localhost:11434`
- See README for code example

### **Option D: Remove LLM Entirely (Free, Simpler)**
- All the SEO + GEO analysis still works (95% of value)
- Just lose the "would Claude cite this?" judgment layer
- See README for code example

---

## 📁 What's in the Zip

```
geo-seo-analyzer/
├── README.md                  ← Full setup & deployment guide
├── PROJECT_STRUCTURE.md       ← Detailed architecture
├── FILE_MAP.txt              ← Visual directory tree
│
├── apps/api/                 ← Backend (Node.js + Playwright)
│   ├── src/
│   │   ├── crawler/scraper.js                   (dual crawl)
│   │   ├── analyzers/seoAnalyzer.js            (SEO scoring)
│   │   ├── analyzers/geoAnalyzer.js            (GEO scoring)
│   │   ├── analyzers/llmCitationSimulator.js   (Claude judgment)
│   │   ├── analyzers/suggestionsEngine.js      (merge findings)
│   │   ├── routes/analyze.js                   (Express routes)
│   │   └── utils/                              (helpers)
│   └── package.json
│
└── apps/web/                 ← Frontend (Astro + React + Tailwind)
    ├── src/
    │   ├── components/Dashboard.jsx            (main component)
    │   ├── components/ScoreGauge.jsx           (dual gauge visual)
    │   ├── components/SuggestionsPanel.jsx     (fixes columns)
    │   ├── components/EntityCitationPanel.jsx  (signals + verdict)
    │   ├── pages/index.astro                   (main page)
    │   └── lib/api.js                          (SSE client)
    └── tailwind.config.js                      (design tokens)
```

---

## 🎯 Next Steps (After First Run)

1. **Understand the scores:**
   - Read the findings — they explain *why* each score is what it is
   - SEO score focuses on search engine visibility
   - GEO score focuses on AI/LLM citability

2. **Apply one fix:**
   - Pick a critical item from the suggestions
   - Make the change on your site
   - Scan again to verify improvement

3. **Analyze competitors:**
   - Scan 3–5 competitor pages on the same topic
   - Compare their GEO scores
   - See who has more citations (stats/quotes)

4. **Deploy (optional):**
   - See README.md for Cloudflare Pages + VPS setup
   - Makes it accessible to your whole team

---

## 💬 Questions?

Check these files:
- **README.md** — setup, deployment, API contract
- **PROJECT_STRUCTURE.md** — architecture, data flow, tech stack
- **FILE_MAP.txt** — visual directory tree with file descriptions

Stuck? Common issues are usually:
1. API key not set → check `apps/api/.env`
2. Port already in use → close other apps
3. Node.js version too old → upgrade to v20+
4. Missing `npm install` step → run it!

---

**Ready?** Go to Step 1 and get your API key! 🎉
