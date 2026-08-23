function SignalStat({ label, value }) {
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2">
      <div className="font-mono text-lg font-semibold text-ash">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-dim">{label}</div>
    </div>
  );
}

function EntityChips({ entities }) {
  if (!entities?.length) {
    return <p className="text-sm text-dim">No entities extracted.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entities.map((e, i) => (
        <span
          key={i}
          className="rounded-full border border-geo/30 bg-geo-soft px-2.5 py-1 font-mono text-xs text-geo"
        >
          {e}
        </span>
      ))}
    </div>
  );
}

export default function EntityCitationPanel({ geo, llmVerdict }) {
  if (!geo) return null;
  const signals = geo.extractedSignals;

  return (
    <section className="rounded-lg border border-hairline bg-surface/40 p-4">
      <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-dim">
        Citation signals
      </h3>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SignalStat label="Stats found" value={signals.statCount} />
        <SignalStat label="Quotes found" value={signals.quoteCount} />
        <SignalStat label="Entities" value={signals.candidateEntities.length} />
        <SignalStat label="JS-only content" value={`${signals.jsDependencyRatio}%`} />
      </div>

      <div className="mt-4">
        <h4 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-dim">
          Candidate entities
        </h4>
        <EntityChips entities={signals.candidateEntities} />
      </div>

      {llmVerdict && (
        <div className="mt-5">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-dim">
            Claude citation simulation
          </h4>
          <div className="rounded-md border border-hairline bg-ink p-3 font-mono text-xs leading-relaxed">
            {llmVerdict.error ? (
              <p className="text-critical">{llmVerdict.message}</p>
            ) : (
              <>
                <p className="mb-2">
                  <span className="text-dim">would_cite:</span>{' '}
                  <span className={llmVerdict.wouldCite ? 'text-geo' : 'text-critical'}>
                    {String(llmVerdict.wouldCite)}
                  </span>{' '}
                  <span className="text-dim">confidence:</span>{' '}
                  <span className="text-ash">{llmVerdict.citationConfidence}/100</span>
                </p>
                <p className="text-ash">{llmVerdict.reasoning}</p>
                {llmVerdict.likelyQueryMatch?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-dim"># likely_query_match</span>
                    <ul className="ml-3 mt-1 list-disc text-ash">
                      {llmVerdict.likelyQueryMatch.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
