const SEVERITY_STYLES = {
  critical: 'border-critical/40 text-critical',
  warning: 'border-warn/40 text-warn',
  minor: 'border-minor/40 text-minor',
};

function FindingRow({ finding }) {
  return (
    <li className="rounded-md border border-hairline bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-ash">{finding.title}</h4>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.minor}`}
        >
          {finding.severity}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-dim">{finding.fix}</p>
    </li>
  );
}

function FixColumn({ title, accent, findings }) {
  return (
    <div className="flex-1">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accent === 'seo' ? 'bg-seo' : 'bg-geo'}`} />
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-dim">
          {title}
        </h3>
        <span className="ml-auto font-mono text-xs text-dim">{findings.length}</span>
      </div>
      {findings.length === 0 ? (
        <p className="rounded-md border border-dashed border-hairline p-4 text-sm text-dim">
          No issues found in this pipeline.
        </p>
      ) : (
        <ul className="space-y-2">
          {findings.map((f, i) => (
            <FindingRow key={i} finding={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SuggestionsPanel({ suggestions }) {
  if (!suggestions) return null;

  return (
    <section>
      <div className="mb-4 rounded-md border border-hairline bg-surface/60 p-4">
        <p className="text-sm leading-relaxed text-ash">{suggestions.summary}</p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <FixColumn title="Traditional SEO fixes" accent="seo" findings={suggestions.seoFixes} />
        <div className="hidden w-px self-stretch bg-hairline md:block" />
        <FixColumn title="GEO fixes" accent="geo" findings={suggestions.geoFixes} />
      </div>
    </section>
  );
}
