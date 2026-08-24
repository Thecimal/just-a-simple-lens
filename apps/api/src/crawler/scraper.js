// apps/api/src/crawler/scraper.js
//
// The Crawler Engine.
//
// Key architectural decision: we crawl the page TWICE with different strategies,
// because SEO bots and GEO (LLM) bots behave differently:
//
//   1. `renderedSnapshot`  – full Chromium render, JS executed, used to build the
//      "what a human/Googlebot-with-rendering sees" picture (SEO pipeline).
//   2. `rawCrawlSnapshot`  – JS disabled, fetched like GPTBot/ClaudeBot/CCBot do
//      (most AI crawlers do NOT execute JavaScript). This is what the GEO
//      pipeline scores, because it's the actual payload an LLM ingestion
//      pipeline will see.
//
// Diffing the two tells you a huge amount on its own (e.g. "68% of your visible
// text only exists after JS execution -> invisible to most AI crawlers").

import { chromium } from 'playwright';
import { cleanHtml, htmlToReadableText } from '../utils/htmlCleaner.js';
import { isSafeAnalyzeUrl } from '../utils/validateUrl.js';

const AI_CRAWLER_UA =
  'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)';
const STANDARD_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const NAV_TIMEOUT_MS = 20_000;

/**
 * @param {string} url
 * @returns {Promise<{
 *   url: string,
 *   fetchedAt: string,
 *   rendered: { html: string, text: string, title: string },
 *   rawCrawl: { html: string, text: string, statusCode: number },
 *   diff: { renderedWordCount: number, rawWordCount: number, jsDependencyRatio: number },
 *   meta: object,
 *   headings: Array<{level: number, text: string}>,
 *   links: Array<{href: string, text: string, isExternal: boolean}>,
 *   schema: Array<object>,
 *   images: Array<{src: string, alt: string|null}>,
 *   performance: { domContentLoadedMs: number, ttfbMs: number }
 * }>}
 */
export async function crawlPage(url) {
  // Re-validate here, not just at the route layer: this is the function
  // that actually hands the URL to a real browser, so it's the last line
  // of defense against SSRF (private IPs, cloud metadata endpoint, etc.)
  // and it protects any other caller of crawlPage() that might bypass the
  // HTTP routes entirely (scripts, tests, future callers).
  const check = await isSafeAnalyzeUrl(url);
  if (!check.ok) {
    throw new Error(`Refusing to crawl: ${check.reason}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const [rendered, rawCrawl] = await Promise.all([
      crawlRendered(browser, url),
      crawlRawForAI(browser, url),
    ]);

    const renderedWordCount = countWords(rendered.text);
    const rawWordCount = countWords(rawCrawl.text);

    return {
      url,
      fetchedAt: new Date().toISOString(),
      rendered,
      rawCrawl,
      diff: {
        renderedWordCount,
        rawWordCount,
        // % of visible content that ONLY exists after JS execution.
        // High ratio = big red flag for GEO, since most LLM crawlers skip JS.
        jsDependencyRatio:
          renderedWordCount === 0
            ? 0
            : Math.max(
                0,
                Number(
                  (
                    ((renderedWordCount - rawWordCount) / renderedWordCount) *
                    100
                  ).toFixed(1)
                )
              ),
      },
      meta: rendered.meta,
      headings: rendered.headings,
      links: rendered.links,
      schema: rendered.schema,
      images: rendered.images,
      performance: rendered.performance,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Full render pass: JS executed, used for SEO structural analysis
 * (headings, schema, meta, links, images, layout-dependent signals).
 */
async function crawlRendered(browser, url) {
  const context = await browser.newContext({
    userAgent: STANDARD_UA,
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  const t0 = Date.now();
  let ttfbMs = 0;

  page.on('response', (res) => {
    if (res.url() === url && ttfbMs === 0) {
      ttfbMs = Date.now() - t0;
    }
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
  const domContentLoadedMs = Date.now() - t0;

  const html = await page.content();
  const title = await page.title();

  const meta = await page.evaluate(extractMetaFromDom);
  const headings = await page.evaluate(extractHeadingsFromDom);
  const links = await page.evaluate(extractLinksFromDom, url);
  const images = await page.evaluate(extractImagesFromDom);
  const schema = await page.evaluate(extractSchemaFromDom);

  const cleaned = cleanHtml(html);
  const text = htmlToReadableText(cleaned);

  await context.close();

  return {
    html: cleaned,
    text,
    title,
    meta,
    headings,
    links,
    images,
    schema,
    performance: { domContentLoadedMs, ttfbMs },
  };
}

/**
 * No-JS pass: simulates GPTBot / ClaudeBot / CCBot, which fetch raw HTML
 * and generally do not execute client-side JavaScript. This is the
 * ground-truth input for the GEO pipeline.
 */
async function crawlRawForAI(browser, url) {
  const context = await browser.newContext({
    userAgent: AI_CRAWLER_UA,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();

  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: NAV_TIMEOUT_MS,
  });

  const html = await page.content();
  const cleaned = cleanHtml(html);
  const text = htmlToReadableText(cleaned);

  await context.close();

  return {
    html: cleaned,
    text,
    statusCode: response ? response.status() : 0,
  };
}

// ---- DOM extraction functions (run inside page.evaluate, browser context) ----

function extractMetaFromDom() {
  const get = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) ?? null;
  return {
    title: document.title || null,
    description: get('meta[name="description"]', 'content'),
    canonical: get('link[rel="canonical"]', 'href'),
    robots: get('meta[name="robots"]', 'content'),
    ogTitle: get('meta[property="og:title"]', 'content'),
    ogDescription: get('meta[property="og:description"]', 'content'),
    ogImage: get('meta[property="og:image"]', 'content'),
    twitterCard: get('meta[name="twitter:card"]', 'content'),
    lang: document.documentElement.getAttribute('lang'),
    viewport: get('meta[name="viewport"]', 'content'),
  };
}

function extractHeadingsFromDom() {
  return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((el) => ({
    level: Number(el.tagName.substring(1)),
    text: el.textContent.trim().replace(/\s+/g, ' '),
  }));
}

function extractLinksFromDom(baseUrl) {
  const origin = new URL(baseUrl).origin;
  return Array.from(document.querySelectorAll('a[href]'))
    .map((a) => {
      let href = a.getAttribute('href');
      try {
        href = new URL(href, baseUrl).href;
      } catch {
        return null;
      }
      return {
        href,
        text: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 200),
        isExternal: !href.startsWith(origin),
      };
    })
    .filter(Boolean);
}

function extractImagesFromDom() {
  return Array.from(document.querySelectorAll('img')).map((img) => ({
    src: img.getAttribute('src'),
    alt: img.getAttribute('alt'),
  }));
}

function extractSchemaFromDom() {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((el) => {
      try {
        return JSON.parse(el.textContent);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
