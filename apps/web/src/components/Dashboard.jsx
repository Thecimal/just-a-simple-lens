import { useState, useCallback } from 'react';
import UrlInputForm from './UrlInputForm.jsx';
import ScoreGauge from './ScoreGauge.jsx';
import SuggestionsPanel from './SuggestionsPanel.jsx';
import EntityCitationPanel from './EntityCitationPanel.jsx';
import { analyzeStream } from '../lib/api.js';

const STAGES = [
  { key: 'crawling', label: 'Crawl' },
  { key: 'seo', label: 'SEO pipeline' },
  { key: 'geo', label: 'GEO pipeline' },
  { key: 'llm', label: 'AI simulation' },
  { key: 'suggestions', label: 'Suggestions' },
];

function StageProgress({ activeStage }) {
  const activeIndex = STAGES.findIndex((s) => s.key === activeStage);
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {STAGES.map((s, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                state === 'active'
                  ? 'border-seo text-seo'
                  : state === 'done'
                  ? 'border-geo/50 text-geo'
                  : 'border-hairline text-dim'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  state === 'active' ? 'animate-pulse bg-seo' : state === 'done' ? 'bg-geo' : 'bg-hairline'
                }`}
              />
              {s.label}
            </span>
            {i < STAGES.length - 1 && <span className="text-hairline">→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [activeStage, setActiveStage] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const runScan = useCallback(async (url) => {
    setStatus('loading');
    setError(null);
    setReport(null);
    try {
      const result = await analyzeStream(url, (stage) => setActiveStage(stage.stage));
      setReport(result);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-geo">Lens</p>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ash sm:text-3xl">
          SEO &amp; GEO Analyzer
        </h1>
        <p className="mt-2 max-w-xl text-sm text-dim">
          Crawls a page the way both Googlebot and an AI crawler see it, then scores it on
          traditional SEO fundamentals and generative-engine citability.
        </p>
      </header>

      <UrlInputForm onSubmit={runScan} isLoading={status === 'loading'} />

      {status === 'loading' && (
        <div className="mt-6 rounded-lg border border-hairline bg-surface/40 p-4">
          <StageProgress activeStage={activeStage} />
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6 rounded-lg border border-critical/40 bg-critical/5 p-4 text-sm text-critical">
          Scan failed: {error}
        </div>
      )}

      {status === 'done' && report && (
        <div className="mt-8 space-y-8">
          <section className="flex flex-col items-center gap-6 rounded-lg border border-hairline bg-surface/40 p-6 sm:flex-row sm:justify-between">
            <ScoreGauge
              seoScore={report.scores.seo}
              geoScore={report.scores.geo}
              overallScore={report.scores.overall}
            />
            <dl className="grid w-full grid-cols-2 gap-3 sm:max-w-xs">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-dim">JS-dependent content</dt>
                <dd className="font-mono text-sm text-ash">{report.diff.jsDependencyRatio}%</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-dim">Rendered words</dt>
                <dd className="font-mono text-sm text-ash">{report.diff.renderedWordCount}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-dim">Raw-crawl words</dt>
                <dd className="font-mono text-sm text-ash">{report.diff.rawWordCount}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-dim">Fetched</dt>
                <dd className="font-mono text-sm text-ash">
                  {new Date(report.fetchedAt).toLocaleTimeString()}
                </dd>
              </div>
            </dl>
          </section>

          <EntityCitationPanel geo={report.geo} llmVerdict={report.llmVerdict} />
          <SuggestionsPanel suggestions={report.suggestions} />
        </div>
      )}
    </main>
  );
}
