# 🚀 Quick Start Guide — Lens (SEO & GEO Analyzer)

**Complete Production-Ready Setup in 15 Minutes**

---

## 📋 Table of Contents
1. [What You're Getting](#what-youre-getting)
2. [Prerequisites](#prerequisites)
3. [Step 1: Unzip & Setup](#step-1-unzip--setup)
4. [Step 2: Get Your API Key](#step-2-get-your-api-key-free)
5. [Step 3: Configure](#step-3-configure)
6. [Step 4: Install & Run](#step-4-install--run)
7. [Step 5: Your First Scan](#step-5-your-first-scan)
8. [Step 6: Upload to GitHub (Optional)](#step-6-upload-to-github-optional)
9. [Pricing & Free Tier](#pricing--free-tier)
10. [Troubleshooting](#troubleshooting)

---

## What You're Getting

**Lens** — A dual-pipeline SEO & GEO analyzer that:
- ✅ Crawls pages the way **both Googlebot AND GPTBot** see them
- ✅ Scores on traditional SEO (meta, headings, keywords, schema, links)
- ✅ Scores on AI citability (chunkability, semantic HTML, citations)
- ✅ Calls **Claude API** to judge if an AI would cite your page
- ✅ Returns actionable fixes (split into SEO vs GEO)

**Stack:**
- Backend: Node.js 20+ + Playwright + Express + Claude API
- Frontend: Astro 4 + React 18 + Tailwind CSS 3
- Deployment: Cloudflare Pages (frontend) + Ubuntu VPS (backend)

---

## Prerequisites

**You need:**
- Mac, Linux, or Windows with WSL
- Node.js 20+ (get from https://nodejs.org)
- Git (for GitHub upload)
- ~15 minutes
- A free Claude API key ($5 free credits)

**Check you have Node.js:**
```bash
node --version   # Should be v20+
npm --version    # Should be v10+
```

---

## Step 1: Unzip & Setup

### 1a. Unzip the project
```bash
unzip geo-seo-analyzer-complete.zip
cd geo-seo-analyzer
```

### 1b. View the structure
```bash
ls -la
# You should see:
# ├── README.md
# ├── PROJECT_STRUCTURE.md
# ├── FILE_MAP.txt
# ├── package.json
# ├── .gitignore
# └── apps/
#     ├── api/    (backend)
#     └── web/    (frontend)
```

---

## Step 2: Get Your API Key (FREE)

### 2a. Sign up for Claude API
Go to: **https://console.anthropic.com**

1. Click **Sign up**
2. Enter email + password (takes 2 minutes)
3. Verify email
4. Accept terms
5. **You automatically get $5 free credits!** 🎉

### 2b. Create an API key
1. Click **Settings** (top right)
2. Click **API Keys** (left sidebar)
3. Click **Create Key**
4. Give it a name: `lens-analyzer`
5. Click **Create**
6. **Copy the key** (starts with `sk-ant-`)
   - ⚠️ This is the only time you'll see it — save it!

### 2c. What $5 gets you
- ~100 page scans (at $0.05 per scan during dev)
- Enough to test thoroughly
- Expires after 3 months

---

## Step 3: Configure

### 3a. Copy environment template
```bash
cd apps/api
cp .env.example .env
```

### 3b. Edit `.env` file
```bash
# Choose your editor
nano .env              # Linux/Mac
code .env              # VS Code
notepad apps/api/.env  # Windows
```

### 3c. Add your API key
Find this line:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

Replace `sk-ant-xxxxxxxxxxxxx` with your actual key:
```
ANTHROPIC_API_KEY=sk-ant-xyzABCdef123456789...
```

Save the file (Ctrl+X → Y → Enter in nano).

### 3d. Verify configuration
```bash
cat .env  # Should show your key (don't share this with anyone!)
```

---

## Step 4: Install & Run

### 4a. Install dependencies (backend + frontend)
```bash
cd ../..  # Go back to project root
npm install
```

⏱️ Takes 2–3 minutes. You'll see lots of package names scroll by.

**What it does:**
- Installs Node packages for backend (`apps/api`)
- Installs Node packages for frontend (`apps/web`)
- Automatically downloads Chromium for Playwright (~100 MB)

### 4b. Start the backend (Terminal Tab 1)
```bash
npm run dev:api
```

You should see:
```
GEO/SEO Analyzer API listening on :8787
```

**Leave this running.**

### 4c. Start the frontend (Terminal Tab 2)
Open a **new terminal tab** or window, then:
```bash
npm run dev:web
```

You should see:
```
Local    http://localhost:4321/
```

**Leave this running too.**

---

## Step 5: Your First Scan

### 5a. Open your browser
Go to: **http://localhost:4321**

You'll see:
```
Lens
SEO & GEO Analyzer

analyze > [URL input box] [Run scan button]
```

### 5b. Analyze a page
1. Paste a URL in the input box:
   ```
   https://example.com
   ```
   (or any real URL)

2. Click **Run scan**

3. Watch the progress:
   ```
   Crawl → SEO pipeline → GEO pipeline → AI simulation → Suggestions
   ```
   (Takes ~10 seconds)

4. See your results:
   - **Top:** Dual split-gauge (SEO score left in blue, GEO score right in amber)
   - **Middle:** Citation signals (stats, quotes, entities, Claude's verdict)
   - **Bottom:** Suggested fixes (split into SEO vs GEO columns)

### 5c. Understand the scores
- **SEO Score (0-100):** How well your page follows traditional search engine signals
  - Checks: title, meta description, headings, keywords, schema, links, images
  
- **GEO Score (0-100):** How likely an AI would cite your page in a generated answer
  - Checks: chunkability, semantic HTML, citations (stats/quotes), direct-answer block
  
- **Overall:** Average of both scores

- **Claude's Verdict:** "Would Claude cite this?" (yes/no + confidence %)

### 5d. Read the suggestions
**Left column (SEO Fixes):**
- Traditional ranking factors
- Severity: critical (red) → warning (yellow) → minor (gray)

**Right column (GEO Fixes):**
- AI-specific improvements
- Same severity levels

---

## Step 6: Upload to GitHub (Optional)

### 6a. Create a GitHub repo
1. Go to **https://github.com/new**
2. Name: `geo-seo-analyzer`
3. Description: `Dual SEO & GEO Analyzer with Claude AI`
4. Leave empty (don't initialize with README)
5. Click **Create repository**

### 6b. Upload via CLI
```bash
cd /path/to/geo-seo-analyzer  # Go to project root

# Initialize and push
git init
git add .
git commit -m "Initial commit: Lens SEO & GEO Analyzer"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/geo-seo-analyzer.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

### 6c. Authenticate
GitHub will ask for credentials:
- **Username:** Your GitHub username
- **Password:** Use a personal access token (not your password)

**Get a personal access token:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Check `repo` scope
4. Copy and paste when prompted

### 6d. Verify
Open https://github.com/YOUR-USERNAME/geo-seo-analyzer

You should see all your files! ✅

---

## Pricing & Free Tier

### 🆓 During Development (Right Now)

**Claude API:**
- $5 free credits when you sign up
- ~100 page scans at typical dev rates
- Valid for 3 months
- No credit card required during free trial

**Everything else:**
- Cloudflare Pages: FREE
- Your VPS or local machine: FREE
- All code: Open source

**Cost during dev:** $0 (using free credits)

---

### 💰 After Free Trial Ends (Production)

#### **Option 1: Keep Using Claude (Recommended)**
Best quality, most reliable

| Usage | Cost |
|-------|------|
| 1 page/day | ~$0.90/month |
| 10 pages/day | ~$9/month |
| 100 pages/day | ~$90/month |
| Price per scan | ~$0.03 |

**Pricing breakdown:**
- Input tokens: ~$0.003 per 1K tokens
- Output tokens: ~$0.015 per 1K tokens
- Typical page: ~2,000 input + ~500 output = ~$0.007 per page
- Plus LLM call: ~1,000 input + ~500 output = ~$0.020 per page
- **Total: ~$0.03 per page**

**Setup:**
1. Go to https://console.anthropic.com/billing/overview
2. Add credit card to your account
3. Usage-based billing (no monthly fees)

---

#### **Option 2: Switch to Google Gemini (Cheapest)**
Much cheaper for high volume

| Tier | Cost |
|------|------|
| Free tier | 60 requests/day + FREE |
| Paid tier | $0.000075 per input token, $0.0003 per output token |
| Per page | ~$0.0001–$0.0005 |

**Setup:**
1. Get API key: https://ai.google.dev
2. Modify `apps/api/src/analyzers/llmCitationSimulator.js` (see code example below)
3. Add `GOOGLE_API_KEY` to `.env`

**Code swap:**
```javascript
// In llmCitationSimulator.js, replace the Claude call with:
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Then in simulateLlmCitation():
const response = await model.generateContent([
  { text: SYSTEM_PROMPT + "\n\n" + userPrompt }
]);
const raw = response.response.text();
// ... rest stays the same
```

---

#### **Option 3: Use Local LLM (Free Forever)**
Run Ollama locally, no API costs

**Setup:**
1. Download Ollama: https://ollama.ai
2. Run: `ollama pull mistral` (or `llama2`, `neural-chat`)
3. Start: `ollama serve` (runs on `localhost:11434`)
4. Modify `llmCitationSimulator.js`:

```javascript
export async function simulateLlmCitation({ url, text, title }) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral',  // or llama2, neural-chat
      prompt: userPrompt,
      stream: false,
    }),
  });

  const { response: raw } = await response.json();
  const parsed = safeParseJson(raw);
  return validateAndNormalize(parsed || heuristicFallback({ text, title }));
}
```

**Pros:** FREE, offline, no API limits  
**Cons:** Slower (~10s per page), lower quality than Claude

---

#### **Option 4: Remove LLM Entirely (Free)**
Skip the Claude call, use heuristics only

**Impact:** You lose the "would Claude cite this?" judgment, but keep 95% of the value (all SEO + GEO analysis)

**In `apps/api/src/routes/analyze.js`, replace:**
```javascript
const llmVerdict = await simulateLlmCitation({ ... });
```

With:
```javascript
const llmVerdict = {
  wouldCite: geo.score > 60,
  citationConfidence: geo.score,
  reasoning: 'Based on chunkability, citation density, and semantic HTML (LLM disabled)',
  coreEntities: [],
  extractableClaims: [],
  likelyQueryMatch: [],
  citationRisks: [],
  error: false,
};
```

---

### 🖥️ Hosting Costs

#### **Frontend (Cloudflare Pages)**
- FREE tier: Up to 500 deployments/month
- Pro tier: $20/month (if you need it)
- → **Recommendation: FREE tier is plenty**

#### **Backend (VPS)**
- AWS EC2 (t3.micro): ~$11/month
- Linode: $6/month
- DigitalOcean: $6/month
- Hetzner: $4/month
- Your own server: Whatever you pay

**Backend specs needed:**
- 1 GB RAM minimum
- 2 GB swap (for Chromium)
- 20 GB disk
- Doesn't need a lot of CPU

---

### 📊 Total Cost Scenarios

| Scenario | Monthly Cost |
|----------|--------------|
| **Development** (using $5 free credits) | $0 |
| **Small production** (10 pages/day, Claude) | ~$10 |
| **Medium production** (100 pages/day, Claude) | ~$100 |
| **High volume** (1000+ pages/day, Gemini) | ~$5–20 |
| **Self-hosted Ollama** (unlimited) | VPS cost only ($5–20) |
| **No LLM** (heuristics only) | VPS cost only ($5–20) |

---

## Troubleshooting

### ❌ "API key not set"
**Problem:** Backend can't find your Claude key

**Fix:**
1. Check file exists: `ls apps/api/.env`
2. Check file has your key: `cat apps/api/.env`
3. Restart backend:
   ```bash
   Ctrl+C  # Stop current backend
   npm run dev:api  # Start it again
   ```

---

### ❌ "Failed to connect to API" or "ECONNREFUSED"
**Problem:** Frontend can't reach backend

**Fix:**
1. Make sure `npm run dev:api` is running (Terminal 1)
2. Make sure it says `listening on :8787`
3. Check it's not on a different port in `.env`
4. Frontend should auto-connect to `http://localhost:8787`

---

### ❌ "Port 8787 already in use"
**Problem:** Something else is using that port

**Fix Option 1:** Kill the process
```bash
# Find what's using :8787
lsof -i :8787

# Kill it (replace PID with the number)
kill -9 <PID>
```

**Fix Option 2:** Use a different port
```bash
# Edit apps/api/.env
PORT=8888

# Then start:
npm run dev:api
```

---

### ❌ "npm: command not found"
**Problem:** Node.js not installed or not in PATH

**Fix:**
1. Install Node.js: https://nodejs.org (v20+)
2. Restart your terminal
3. Verify: `node --version` (should be v20+)

---

### ❌ "Playwright install failed"
**Problem:** Chromium didn't download

**Fix:**
```bash
cd apps/api
npx playwright install --with-deps chromium
```

If that fails:
```bash
# Install system dependencies (Linux)
sudo apt-get install libgconf-2-4

# Try again
npx playwright install --with-deps chromium
```

---

### ❌ Scan takes 30+ seconds
**Problem:** Normal for first run, but slow after that means something's wrong

**Fix:**
1. First scan is slowest (Chromium startup)
2. Check your internet speed (crawling a slow site takes time)
3. Check CPU usage: `top` or Task Manager
4. Try a different URL (some sites are slow)

---

### ❌ "Cannot find module '@anthropic-ai/sdk'"
**Problem:** Dependencies not installed

**Fix:**
```bash
npm install  # Install all dependencies
```

---

### ❌ Frontend won't load (blank page or 404)
**Problem:** Astro build didn't complete or development server crashed

**Fix:**
```bash
# Stop the frontend
Ctrl+C

# Clear Astro cache
rm -rf apps/web/.astro

# Restart
npm run dev:web
```

---

## Next Steps

### 🎯 This Week
1. ✅ Get your first scan working (you just did this!)
2. Analyze 5–10 of your own pages
3. Read the suggestions carefully
4. Pick your top 3 critical issues
5. Apply one fix to each page
6. Re-scan to verify the score improves

### 📈 This Month
7. Deploy to production (see README.md)
8. Add to your SEO workflow
9. Train your team to use it
10. Integrate with your CMS or analytics

### 🚀 For Production
11. Set up a proper VPS (DigitalOcean, Linode, AWS)
12. Configure Nginx/Caddy reverse proxy
13. Use pm2 or systemd for process management
14. Set up monitoring & logging
15. Consider a database to store scan history

---

## Common Questions

### Q: Can I use this without paying anything?
**A:** Yes, using the $5 free credits. After that:
- Switch to Ollama (self-hosted, free)
- Remove the LLM entirely (heuristics only, free)
- Use Gemini free tier (60 requests/day, free)
- Or pay for Claude/Gemini (cheapest: $0.0001/page with Gemini)

### Q: Does this run on Windows?
**A:** Yes, use WSL2 (Windows Subsystem for Linux). Or use Git Bash + Node.js for Windows directly.

### Q: Can I deploy to Vercel instead of Cloudflare Pages?
**A:** Yes, same process. Both are free for static sites. Backend still needs a VPS (can't run Playwright on Workers or Lambda).

### Q: What if I want to add a database?
**A:** See PROJECT_STRUCTURE.md for extension ideas. You can add PostgreSQL + Prisma without changing the core architecture.

### Q: How do I update to the latest code?
**A:** Pull from GitHub:
```bash
git pull origin main
npm install  # if dependencies changed
npm run dev:api &
npm run dev:web &
```

### Q: Can I analyze multiple pages at once?
**A:** Not yet (one scan at a time). To add: use a job queue (BullMQ + Redis) to handle concurrent Chromium instances.

---

## Support & Documentation

**Inside the zip you downloaded:**
- `README.md` — Full setup & deployment
- `PROJECT_STRUCTURE.md` — How it all works
- `FILE_MAP.txt` — Where every file is
- `00-START-HERE.txt` — Visual quick reference

**Online:**
- Claude API docs: https://docs.anthropic.com
- Playwright docs: https://playwright.dev
- Astro docs: https://docs.astro.build

---

## You're All Set! 🎉

You now have:
- ✅ A working dual SEO/GEO analyzer
- ✅ $5 free credits for 100+ scans
- ✅ All source code (open source)
- ✅ Full documentation
- ✅ Pricing options from free to $100+/month

**Next:** Go analyze your site. You've got this! 🚀

---

**Questions?** Check the Troubleshooting section above, or read the full README.md in the zip.
