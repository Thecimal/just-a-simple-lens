// apps/api/src/utils/htmlCleaner.js
//
// Strips the DOM down to what a text-ingestion pipeline (GPTBot, ClaudeBot,
// a RAG indexer, etc.) actually cares about. This is intentionally more
// aggressive than a typical "reader mode" — anything that doesn't carry
// citable semantic meaning gets removed before we hand text to the analyzers
// or the LLM simulation step, so token counts and chunkability metrics stay
// accurate.

import * as cheerio from 'cheerio';

const STRIP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'iframe',
  'canvas',
  'link[rel="stylesheet"]',
  '[aria-hidden="true"]',
  'nav',
  'footer',
  '[role="navigation"]',
  '[role="banner"]',
  '.cookie-banner',
  '.ad',
  '.advertisement',
];

/**
 * Returns cleaned HTML (structure preserved, noise removed).
 * @param {string} rawHtml
 * @returns {string}
 */
export function cleanHtml(rawHtml) {
  const $ = cheerio.load(rawHtml);

  STRIP_SELECTORS.forEach((sel) => $(sel).remove());

  // Strip HTML comments
  $('*')
    .contents()
    .each(function () {
      if (this.type === 'comment') $(this).remove();
    });

  // Strip inline event handlers / style attrs — irrelevant to a text crawler
  // and they inflate the "content" we hand to the LLM simulator.
  $('[onclick],[onload],[style]').each((_, el) => {
    const $el = $(el);
    $el.removeAttr('onclick');
    $el.removeAttr('onload');
    $el.removeAttr('style');
  });

  return $.html();
}

/**
 * Converts cleaned HTML into plain, whitespace-normalized readable text,
 * preserving paragraph breaks (important for chunkability analysis).
 * @param {string} cleanedHtml
 * @returns {string}
 */
export function htmlToReadableText(cleanedHtml) {
  const $ = cheerio.load(cleanedHtml);
  const blockTags = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,td,th,pre,figcaption';

  const blocks = [];
  $('body')
    .find(blockTags)
    .each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text) blocks.push(text);
    });

  // Fallback: if the page has no semantic block tags at all (a GEO red flag
  // in itself — we surface this in the analyzer), fall back to body text.
  if (blocks.length === 0) {
    return $('body').text().trim().replace(/\s+/g, ' ');
  }

  return blocks.join('\n\n');
}

/**
 * Extracts heading structure straight from static HTML via cheerio (no
 * browser needed). Used by the GEO pipeline so heading-dependent checks
 * (direct-answer H1, heading-to-content ratio) run against the *raw*
 * no-JS payload — the same thing scraper.js's rawCrawl pass fetches —
 * rather than the JS-rendered DOM, which most AI crawlers never see.
 * @param {string} cleanedHtml
 * @returns {Array<{level: number, text: string}>}
 */
export function extractHeadingsFromHtml(cleanedHtml) {
  const $ = cheerio.load(cleanedHtml);
  return $('h1,h2,h3,h4,h5,h6')
    .map((_, el) => ({
      level: Number(el.tagName.substring(1)),
      text: $(el).text().trim().replace(/\s+/g, ' '),
    }))
    .get();
}

/**
 * Returns the DOM as a lightweight structural outline (tag + depth),
 * used by the GEO analyzer to score semantic HTML usage.
 * @param {string} cleanedHtml
 * @returns {Array<{tag: string, depth: number}>}
 */
export function extractStructuralOutline(cleanedHtml) {
  const $ = cheerio.load(cleanedHtml);
  const outline = [];

  const walk = (el, depth) => {
    if (el.type !== 'tag') return;
    outline.push({ tag: el.tagName, depth });
    (el.children || []).forEach((child) => walk(child, depth + 1));
  };

  $('body')
    .get(0)
    ?.children.forEach((child) => walk(child, 0));

  return outline;
}
