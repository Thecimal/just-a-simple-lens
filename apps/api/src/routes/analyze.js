// apps/api/src/routes/analyze.js
//
// POST /api/analyze  { url }  -> full report (blocking, ~8-15s)
// GET  /api/analyze/stream?url=...  -> same pipeline, but streamed as SSE
//      progress events so the dashboard can show live stage status
//      (crawling -> SEO -> GEO -> LLM simulation -> done). A crawl + two
//      full analysis passes + an LLM call is slow enough that a "spinner
//      with no feedback" is a bad UX default.

import { Router } from 'express';
import { crawlPage } from '../crawler/scraper.js';
import { analyzeSeo } from '../analyzers/seoAnalyzer.js';
import { analyzeGeo } from '../analyzers/geoAnalyzer.js';
import { simulateLlmCitation } from '../analyzers/llmCitationSimulator.js';
import { buildSuggestions } from '../analyzers/suggestionsEngine.js';
import { isValidHttpUrl } from '../utils/validateUrl.js';

export const analyzeRouter = Router();

analyzeRouter.post('/analyze', async (req, res) => {
  const { url } = req.body || {};
  if (!isValidHttpUrl(url)) {
    return res.status(400).json({ error: 'Provide a valid http(s) URL.' });
  }

  try {
    const report = await runFullAnalysis(url);
    res.json(report);
  } catch (err) {
    req.log?.error(err);
    res.status(502).json({ error: 'Analysis failed', detail: err.message });
  }
});

analyzeRouter.get('/analyze/stream', async (req, res) => {
  const url = req.query.url;
  if (!isValidHttpUrl(url)) {
    return res.status(400).json({ error: 'Provide a valid http(s) URL.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    send('stage', { stage: 'crawling', label: 'Fetching page (rendered + raw)…' });
    const crawlResult = await crawlPage(url);

    send('stage', { stage: 'seo', label: 'Running SEO pipeline…' });
    const seo = analyzeSeo(crawlResult);

    send('stage', { stage: 'geo', label: 'Running GEO pipeline…' });
    const geo = analyzeGeo(crawlResult);

    send('stage', { stage: 'llm', label: 'Simulating AI citation judgment…' });
    const llmVerdict = await simulateLlmCitation({
      url,
      text: crawlResult.rawCrawl.text,
      title: crawlResult.meta.title,
    });

    send('stage', { stage: 'suggestions', label: 'Building suggestions…' });
    const suggestions = buildSuggestions({ seo, geo, llmVerdict, crawlResult });

    const report = assembleReport({ url, crawlResult, seo, geo, llmVerdict, suggestions });
    send('done', report);
  } catch (err) {
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

async function runFullAnalysis(url) {
  const crawlResult = await crawlPage(url);
  const seo = analyzeSeo(crawlResult);
  const geo = analyzeGeo(crawlResult);
  const llmVerdict = await simulateLlmCitation({
    url,
    text: crawlResult.rawCrawl.text,
    title: crawlResult.meta.title,
  });
  const suggestions = buildSuggestions({ seo, geo, llmVerdict, crawlResult });

  return assembleReport({ url, crawlResult, seo, geo, llmVerdict, suggestions });
}

function assembleReport({ url, crawlResult, seo, geo, llmVerdict, suggestions }) {
  return {
    url,
    fetchedAt: crawlResult.fetchedAt,
    scores: {
      seo: seo.score,
      geo: geo.score,
      overall: Math.round(seo.score * 0.5 + geo.score * 0.5),
    },
    seo: { subscores: seo.subscores, keywordDensity: seo.keywordDensity },
    geo: { subscores: geo.subscores, extractedSignals: geo.extractedSignals },
    llmVerdict,
    diff: crawlResult.diff,
    suggestions,
  };
}
