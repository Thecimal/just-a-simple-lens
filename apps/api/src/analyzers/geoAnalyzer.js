// apps/api/src/analyzers/geoAnalyzer.js
//
// GEO (Generative Engine Optimization) Pipeline.
//
// This is the differentiated half of the product. It scores the page on
// signals that specifically affect whether an LLM (via RAG retrieval or a
// live crawl) will (a) successfully parse the content into clean chunks and
// (b) treat it as citable/quotable in a generated answer.
//
// Four sub-scores:
//   1. chunkability     – can this text be split into self-contained,
//                          semantically coherent chunks? (RAG-friendliness)
//   2. semanticHtml      – does markup use real semantic tags vs. div soup?
//   3. citationDensity   – stats, quotes, named entities per 100 words
//   4. directAnswerBlock – is there a front-loaded, extractable summary?

import { extractStructuralOutline, extractHeadingsFromHtml } from '../utils/htmlCleaner.js';

const SEMANTIC_TAGS = new Set([
  'article', 'section', 'header', 'footer', 'nav', 'aside', 'main',
  'figure', 'figcaption', 'table', 'thead', 'tbody', 'th', 'blockquote',
  'dl', 'dt', 'dd', 'time', 'cite',
]);

const STAT_PATTERN = /(\d{1,3}(,\d{3})*(\.\d+)?%?|\$\d[\d,.]*|\b\d+x\b)/g;
const QUOTE_PATTERN = /["“][^"”]{15,300}["”]/g;
// Very rough proper-noun / entity heuristic: capitalized multi-word spans
// not at the start of a sentence. A production build should swap this for
// a real NER model (e.g. compromise.js, spaCy via a Python microservice,
// or the LLM call itself — see llmCitationSimulator.js).
const ENTITY_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;

export function analyzeGeo(crawlResult) {
  const { rawCrawl, diff } = crawlResult;

  // IMPORTANT: every GEO subscore below must run against `rawCrawl`, not
  // `rendered`. The entire premise of the dual-crawl architecture (see
  // scraper.js) is that GEO measures what an AI crawler — which mostly
  // doesn't execute JS — actually receives. Scoring the JS-rendered DOM
  // here would let a page "pass" GEO checks on content that GPTBot/
  // ClaudeBot/CCBot never see, which defeats the point of crawling twice.
  const rawHeadings = extractHeadingsFromHtml(rawCrawl.html);

  const chunkResult = scoreChunkability(rawCrawl.text, rawHeadings);
  const semanticResult = scoreSemanticHtml(rawCrawl.html);
  const citationResult = scoreCitationDensity(rawCrawl.text);
  const directAnswerResult = scoreDirectAnswer(rawCrawl.text, rawHeadings);
  const jsResult = scoreJsDependency(diff);

  const weighted = [
    { ...chunkResult, weight: 0.25 },
    { ...semanticResult, weight: 0.15 },
    { ...citationResult, weight: 0.25 },
    { ...directAnswerResult, weight: 0.2 },
    { ...jsResult, weight: 0.15 },
  ];

  const score = Math.round(
    weighted.reduce((sum, s) => sum + s.score * s.weight, 0)
  );

  const findings = [
    ...chunkResult.findings,
    ...semanticResult.findings,
    ...citationResult.findings,
    ...directAnswerResult.findings,
    ...jsResult.findings,
  ];

  return {
    score,
    subscores: {
      chunkability: chunkResult.score,
      semanticHtml: semanticResult.score,
      citationDensity: citationResult.score,
      directAnswerBlock: directAnswerResult.score,
      jsDependency: jsResult.score,
    },
    extractedSignals: {
      statCount: citationResult.statCount,
      quoteCount: citationResult.quoteCount,
      candidateEntities: citationResult.candidateEntities,
      avgChunkWordCount: chunkResult.avgChunkWordCount,
      jsDependencyRatio: diff.jsDependencyRatio,
    },
    findings,
  };
}

/**
 * Chunkability: RAG pipelines and AI crawlers split content into chunks
 * (often 150-500 tokens) before embedding/retrieval. Content that is one
 * giant undifferentiated block, or where paragraphs depend heavily on
 * preceding context ("as mentioned above", "this"), chunks poorly and
 * loses meaning when retrieved in isolation.
 */
function scoreChunkability(text, headings) {
  const findings = [];
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const wordCounts = paragraphs.map((p) => p.split(/\s+/).filter(Boolean).length);
  const avgChunkWordCount = wordCounts.length
    ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
    : 0;

  let score = 100;

  if (paragraphs.length < 3) {
    score -= 30;
    findings.push(issue('critical', 'chunkability', 'Content is not paragraph-segmented', 'Break content into distinct, topic-focused paragraphs/sections. Undifferentiated text blocks chunk poorly for RAG retrieval and lose context when embedded.'));
  }

  const longParagraphs = wordCounts.filter((c) => c > 180).length;
  if (longParagraphs > paragraphs.length * 0.3) {
    score -= 20;
    findings.push(issue('warning', 'chunkability', 'Paragraphs too long for clean chunking', `${longParagraphs} paragraph(s) exceed ~180 words. Aim for 60-150 word, single-idea paragraphs so each chunk retrieved by a RAG system is self-contained.`));
  }

  const orphanReferences = countOrphanReferences(text);
  if (orphanReferences > 3) {
    score -= 15;
    findings.push(issue('warning', 'chunkability', 'Heavy reliance on context-dependent phrasing', `Found ${orphanReferences}+ phrases like "as mentioned above" / "this approach". These lose meaning when a chunk is retrieved in isolation — restate the subject rather than referring back to it.`));
  }

  const sectionsWithoutHeading = paragraphs.length - headings.length;
  if (headings.length > 0 && sectionsWithoutHeading > headings.length * 2) {
    score -= 10;
    findings.push(issue('minor', 'chunkability', 'Low heading-to-content ratio', 'Add more subheadings so each retrievable chunk can carry its parent heading as context (many RAG pipelines prepend the nearest heading to a chunk).'));
  }

  return { score: clamp(score), findings, avgChunkWordCount };
}

/**
 * Semantic HTML: <div class="header"> tells a crawler nothing; <header>
 * or <article> tells it exactly what the content is. LLM ingestion
 * pipelines that parse DOM structure (rather than pure text) use these
 * tags to decide what's boilerplate vs. core content.
 */
function scoreSemanticHtml(html) {
  const findings = [];
  const outline = extractStructuralOutline(html);

  const totalTags = outline.length || 1;
  const semanticTags = outline.filter((n) => SEMANTIC_TAGS.has(n.tag)).length;
  const divSpanTags = outline.filter((n) => n.tag === 'div' || n.tag === 'span').length;

  const semanticRatio = semanticTags / totalTags;
  const divRatio = divSpanTags / totalTags;

  let score = Math.round(semanticRatio * 200); // scale up since semantic tags are naturally sparse
  score = clamp(score);

  if (semanticTags === 0) {
    score = Math.min(score, 30);
    findings.push(issue('critical', 'semantic-html', 'No semantic HTML5 tags found', 'Replace generic <div>/<span> wrappers with <article>, <section>, <header>, <main> where structurally appropriate — this is a direct signal AI parsers use to isolate core content from boilerplate.'));
  } else if (divRatio > 0.6) {
    score -= 15;
    findings.push(issue('warning', 'semantic-html', '"Div soup" detected', `${Math.round(divRatio * 100)}% of tags are generic <div>/<span>. Consider semantic replacements for layout containers that represent real content regions.`));
  }

  if (!outline.some((n) => n.tag === 'main')) {
    findings.push(issue('minor', 'semantic-html', 'No <main> landmark', 'Wrap primary content in <main> so crawlers can unambiguously separate it from nav/sidebar/footer boilerplate.'));
  }

  return { score: clamp(score), findings };
}

/**
 * Citation density: this is the single strongest lever for GEO. LLMs
 * synthesizing an answer strongly prefer sources with concrete, quotable,
 * attributable claims (stats, named studies, direct quotes, named
 * entities) over vague marketing prose.
 */
function scoreCitationDensity(text) {
  const findings = [];
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;

  const stats = text.match(STAT_PATTERN) || [];
  const quotes = text.match(QUOTE_PATTERN) || [];
  const rawEntities = text.match(ENTITY_PATTERN) || [];
  const candidateEntities = [...new Set(rawEntities)]
    .filter((e) => e.split(' ').length <= 4)
    .slice(0, 25);

  const statsPer100 = (stats.length / wordCount) * 100;
  const quotesPer100 = (quotes.length / wordCount) * 100;

  let score = 40; // baseline; earn points for citable density
  score += Math.min(30, statsPer100 * 40);
  score += Math.min(20, quotesPer100 * 60);
  score += Math.min(10, candidateEntities.length);

  if (stats.length === 0) {
    findings.push(issue('warning', 'citations', 'No statistics or figures detected', 'Generative engines favor sources with concrete, checkable numbers. Add specific data points ("47% increase" beats "a significant increase") to raise citation likelihood.'));
  }

  if (quotes.length === 0) {
    findings.push(issue('minor', 'citations', 'No attributable quotes found', 'A short quoted statement from a named expert or source gives an LLM a clean, directly citable unit of text — add one where credible.'));
  }

  if (candidateEntities.length < 3) {
    findings.push(issue('warning', 'citations', 'Low named-entity density', 'Few identifiable people, organizations, or products were detected. Explicitly naming entities (companies, researchers, studies) helps an LLM anchor claims to verifiable sources.'));
  }

  return {
    score: clamp(score),
    findings,
    statCount: stats.length,
    quoteCount: quotes.length,
    candidateEntities,
  };
}

/**
 * Direct-answer block: does the page front-load a concise, extractable
 * summary of its own conclusion? This is the single highest-leverage GEO
 * tactic — LLMs answering a query often lift the first clear, self-
 * contained answer they find rather than synthesizing across a whole page.
 */
function scoreDirectAnswer(text, headings) {
  const findings = [];
  const firstParagraph = text.split(/\n\n+/).find(Boolean) || '';
  const firstWordCount = firstParagraph.split(/\s+/).filter(Boolean).length;

  let score = 50;

  const looksLikeDirectAnswer =
    firstWordCount > 0 &&
    firstWordCount <= 80 &&
    /[.!?]$/.test(firstParagraph.trim()) &&
    !/^(welcome|in this article|in today's|have you ever)/i.test(firstParagraph.trim());

  if (looksLikeDirectAnswer) {
    score = 90;
  } else if (firstWordCount > 80) {
    score = 40;
    findings.push(issue('critical', 'direct-answer', 'No front-loaded direct-answer block', `The opening block runs ${firstWordCount} words before reaching a clear point. Add a 2-3 sentence "Direct Answer" summary immediately after the H1 that states the conclusion plainly — this is what generative engines most often lift verbatim.`));
  } else {
    score = 55;
    findings.push(issue('warning', 'direct-answer', 'Opening lacks a clear direct-answer statement', 'Lead with a concise, self-contained answer to the page\'s core question before any preamble, narrative, or context-setting.'));
  }

  const h1 = headings.find((h) => h.level === 1);
  if (h1 && !isQuestionOrTopicClear(h1.text)) {
    score -= 10;
    findings.push(issue('minor', 'direct-answer', 'H1 doesn\'t clearly state the topic/question', 'Generative engines match queries to headings. Phrase the H1 close to how a user would ask the question, or state the topic unambiguously.'));
  }

  return { score: clamp(score), findings };
}

function scoreJsDependency({ jsDependencyRatio }) {
  const findings = [];
  let score = 100 - jsDependencyRatio;

  if (jsDependencyRatio > 50) {
    findings.push(issue('critical', 'rendering', 'Majority of content requires JS execution', `${jsDependencyRatio}% of visible text only appears after JavaScript runs. Most AI crawlers (GPTBot, ClaudeBot, CCBot) do not execute JS — implement SSR or static rendering so core content is present in the raw HTML.`));
  } else if (jsDependencyRatio > 20) {
    findings.push(issue('warning', 'rendering', 'Significant JS-dependent content', `${jsDependencyRatio}% of content is JS-rendered only. Consider server-side or static rendering for at least the primary content region.`));
  }

  return { score: clamp(score), findings };
}

// ---- helpers ----

function countOrphanReferences(text) {
  const patterns = [
    /\bas (mentioned|discussed|noted) (above|earlier|previously)\b/gi,
    /\b(this|that|these|those) (approach|method|technique|process)\b/gi,
    /\bas we (saw|discussed)\b/gi,
  ];
  return patterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);
}

function isQuestionOrTopicClear(headingText) {
  return headingText.trim().length > 10;
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function issue(severity, category, title, fix) {
  return { severity, category, title, fix, pipeline: 'geo' };
}
