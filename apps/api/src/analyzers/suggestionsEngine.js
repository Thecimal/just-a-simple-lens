// apps/api/src/analyzers/suggestionsEngine.js
//
// Merges SEO findings + GEO findings + the LLM's own stated citation_risks
// into one prioritized, JSON-formatted suggestions payload, split by
// pipeline so the dashboard can render two distinct fix lists.

const SEVERITY_WEIGHT = { critical: 3, warning: 2, minor: 1 };

export function buildSuggestions({ seo, geo, llmVerdict, crawlResult }) {
  const seoFixes = rank(seo.findings);
  const geoFixes = rank([
    ...geo.findings,
    ...llmDerivedFindings(llmVerdict),
  ]);

  return {
    summary: buildSummary({ seo, geo, llmVerdict, crawlResult }),
    seoFixes,
    geoFixes,
    quickWins: [...seoFixes, ...geoFixes]
      .filter((f) => f.severity === 'critical')
      .slice(0, 5),
  };
}

function llmDerivedFindings(llmVerdict) {
  if (!llmVerdict || llmVerdict.error) return [];

  const findings = (llmVerdict.citationRisks || []).map((risk) => ({
    severity: 'warning',
    category: 'llm-judgment',
    title: 'AI citation risk flagged by model',
    fix: risk,
    pipeline: 'geo',
  }));

  if (!llmVerdict.wouldCite) {
    findings.unshift({
      severity: 'critical',
      category: 'llm-judgment',
      title: 'Model would not cite this page as a primary source',
      fix: llmVerdict.reasoning || 'Address the citation risks below to become a viable generative-answer source.',
      pipeline: 'geo',
    });
  }

  return findings;
}

function rank(findings) {
  return [...findings].sort(
    (a, b) => (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0)
  );
}

function buildSummary({ seo, geo, llmVerdict, crawlResult }) {
  const parts = [];

  if (seo.score >= 80) parts.push('Traditional SEO fundamentals are solid.');
  else if (seo.score >= 50) parts.push('Traditional SEO has fixable gaps.');
  else parts.push('Traditional SEO needs significant work.');

  if (geo.score >= 80) parts.push('Content is well-structured for AI citation.');
  else if (geo.score >= 50) parts.push('AI-citability is moderate — structural and density gaps remain.');
  else parts.push('Content is unlikely to be cited by generative engines in its current form.');

  if (llmVerdict && !llmVerdict.error) {
    parts.push(
      llmVerdict.wouldCite
        ? `Claude simulation: would cite (confidence ${llmVerdict.citationConfidence}/100).`
        : `Claude simulation: would NOT cite (confidence ${llmVerdict.citationConfidence}/100).`
    );
  }

  if (crawlResult.diff.jsDependencyRatio > 30) {
    parts.push(`${crawlResult.diff.jsDependencyRatio}% of content is JS-only and invisible to most AI crawlers.`);
  }

  return parts.join(' ');
}
