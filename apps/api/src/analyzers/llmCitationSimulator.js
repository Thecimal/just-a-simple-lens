// apps/api/src/analyzers/llmCitationSimulator.js
//
// The "ask the model directly" step of the GEO pipeline. Everything else in
// this codebase is heuristic (regex, DOM structure). This module closes the
// loop by asking an actual LLM to behave like a generative search engine
// evaluating the page as a candidate source — which is the only way to
// capture judgment calls (tone, authority, coherence) that heuristics miss.
//
// Uses Claude with a strict JSON-only system prompt + our own schema
// validation, since we render this straight into the dashboard.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';
const MAX_INPUT_CHARS = 12_000; // keep prompt cost/latency predictable

const SYSTEM_PROMPT = `You are simulating how a generative search engine (e.g. an AI Overview or a chat assistant with browsing/RAG) evaluates a web page as a potential SOURCE to cite in an answer.

You will be given raw extracted text from a page (scripts/nav/styling already stripped). Evaluate it exactly as a citation-selection model would: on clarity, authority, extractability of concrete claims, and whether it directly answers a plausible user query.

Respond with ONLY valid JSON matching this exact shape, no markdown fences, no prose before or after:

{
  "would_cite": boolean,
  "citation_confidence": number,       // 0-100
  "primary_topic": string,             // one sentence
  "core_entities": string[],           // people/orgs/products/concepts explicitly named, max 12
  "extractable_claims": string[],      // concrete, quotable factual claims found verbatim in the text, max 8
  "likely_query_match": string[],      // example user questions this page would plausibly be cited for, max 5
  "citation_risks": string[],          // reasons a generative engine might SKIP this source (vagueness, no attribution, thin content, etc), max 5
  "reasoning": string                  // 2-3 sentences explaining the would_cite verdict
}`;

/**
 * @param {{ url: string, text: string, title: string }} page
 * @returns {Promise<object>} parsed, schema-validated JSON verdict
 */
export async function simulateLlmCitation({ url, text, title }) {
  const truncated = text.length > MAX_INPUT_CHARS
    ? text.slice(0, MAX_INPUT_CHARS) + '\n\n[...truncated]'
    : text;

  const userPrompt = `URL: ${url}
TITLE: ${title || '(none)'}

EXTRACTED PAGE TEXT:
"""
${truncated}
"""

Based on this extracted text, extract the core entities and evaluate whether you would cite this page as a primary source in a generative answer. Respond with the JSON object only.`;

  let raw;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    raw = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  } catch (err) {
    return {
      error: true,
      message: `LLM simulation call failed: ${err.message}`,
      fallback: heuristicFallback({ text, title }),
    };
  }

  const parsed = safeParseJson(raw);
  if (!parsed) {
    return {
      error: true,
      message: 'LLM response was not valid JSON',
      raw: raw.slice(0, 500),
      fallback: heuristicFallback({ text, title }),
    };
  }

  return validateAndNormalize(parsed);
}

function safeParseJson(raw) {
  const cleaned = raw.trim().replace(/^```json\s*|```$/g, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    // Model occasionally wraps JSON in prose despite instructions —
    // try to salvage the first {...} block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function validateAndNormalize(obj) {
  return {
    error: false,
    wouldCite: Boolean(obj.would_cite),
    citationConfidence: clampNumber(obj.citation_confidence, 0, 100),
    primaryTopic: String(obj.primary_topic || '').slice(0, 300),
    coreEntities: toStringArray(obj.core_entities, 12),
    extractableClaims: toStringArray(obj.extractable_claims, 8),
    likelyQueryMatch: toStringArray(obj.likely_query_match, 5),
    citationRisks: toStringArray(obj.citation_risks, 5),
    reasoning: String(obj.reasoning || '').slice(0, 800),
  };
}

function toStringArray(val, max) {
  if (!Array.isArray(val)) return [];
  return val.filter((v) => typeof v === 'string').slice(0, max);
}

function clampNumber(n, min, max) {
  const num = Number(n);
  if (Number.isNaN(num)) return 0;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/**
 * If the LLM call fails (rate limit, network, bad key), degrade gracefully
 * rather than failing the whole report — return a heuristic best-guess
 * so the dashboard still renders something useful.
 */
function heuristicFallback({ text, title }) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return {
    wouldCite: wordCount > 300,
    citationConfidence: wordCount > 300 ? 40 : 15,
    primaryTopic: title || 'Unknown',
    coreEntities: [],
    extractableClaims: [],
    likelyQueryMatch: [],
    citationRisks: ['LLM simulation unavailable — this is a heuristic fallback, not a model judgment.'],
    reasoning: 'LLM call failed; confidence derived from content length only.',
  };
}
