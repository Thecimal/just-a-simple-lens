// apps/api/src/analyzers/seoAnalyzer.js
//
// Traditional SEO Pipeline.
// Scores meta hygiene, heading hierarchy, keyword density, and schema
// markup. Returns a 0-100 score plus a `findings[]` array that the
// Suggestions Engine turns into actionable fixes.

const STOPWORDS = new Set(
  'a an the and or but if then else for of to in on at by with from as is are was were be been being this that these those it its into your you our we they he she'.split(
    ' '
  )
);

export function analyzeSeo(crawlResult) {
  const { meta, headings, rendered, links, images, schema } = crawlResult;

  const metaResult = scoreMeta(meta);
  const headingResult = scoreHeadings(headings);
  const keywordResult = scoreKeywordDensity(rendered.text, meta);
  const schemaResult = scoreSchema(schema);
  const linkResult = scoreLinks(links);
  const imageResult = scoreImages(images);

  const weighted = [
    { ...metaResult, weight: 0.25 },
    { ...headingResult, weight: 0.2 },
    { ...keywordResult, weight: 0.15 },
    { ...schemaResult, weight: 0.2 },
    { ...linkResult, weight: 0.1 },
    { ...imageResult, weight: 0.1 },
  ];

  const score = Math.round(
    weighted.reduce((sum, s) => sum + s.score * s.weight, 0)
  );

  const findings = [
    ...metaResult.findings,
    ...headingResult.findings,
    ...keywordResult.findings,
    ...schemaResult.findings,
    ...linkResult.findings,
    ...imageResult.findings,
  ];

  return {
    score,
    subscores: {
      meta: metaResult.score,
      headings: headingResult.score,
      keywordDensity: keywordResult.score,
      schema: schemaResult.score,
      links: linkResult.score,
      images: imageResult.score,
    },
    keywordDensity: keywordResult.topKeywords,
    findings,
  };
}

function scoreMeta(meta) {
  const findings = [];
  let score = 100;

  if (!meta.title) {
    score -= 30;
    findings.push(issue('critical', 'meta', 'Missing <title> tag', 'Add a unique, descriptive <title> (50-60 chars) — this is the single highest-weight on-page SEO signal.'));
  } else if (meta.title.length > 60) {
    score -= 8;
    findings.push(issue('warning', 'meta', 'Title tag too long', `Title is ${meta.title.length} chars; Google typically truncates around 60. Trim to keep the key phrase visible in SERPs.`));
  } else if (meta.title.length < 15) {
    score -= 8;
    findings.push(issue('warning', 'meta', 'Title tag too short', 'Titles under ~15 chars rarely carry enough descriptive signal. Expand with primary keyword + brand.'));
  }

  if (!meta.description) {
    score -= 20;
    findings.push(issue('critical', 'meta', 'Missing meta description', 'Add a 140-160 char meta description summarizing the page — improves CTR from SERPs even though it isn\'t a direct ranking factor.'));
  } else if (meta.description.length > 160) {
    score -= 5;
    findings.push(issue('minor', 'meta', 'Meta description too long', `${meta.description.length} chars will be truncated in search results. Tighten to ~155 chars.`));
  }

  if (!meta.canonical) {
    score -= 10;
    findings.push(issue('warning', 'meta', 'Missing canonical tag', 'Add <link rel="canonical"> to prevent duplicate-content dilution across URL variants.'));
  }

  if (!meta.ogTitle || !meta.ogDescription || !meta.ogImage) {
    score -= 10;
    findings.push(issue('minor', 'meta', 'Incomplete Open Graph tags', 'Fill in og:title, og:description, and og:image for clean link previews on social/messaging platforms.'));
  }

  if (meta.robots && /noindex/i.test(meta.robots)) {
    score -= 40;
    findings.push(issue('critical', 'meta', 'Page is set to noindex', 'robots meta tag blocks indexing entirely — remove noindex if this page should rank.'));
  }

  return { score: clamp(score), findings };
}

function scoreHeadings(headings) {
  const findings = [];
  let score = 100;

  const h1s = headings.filter((h) => h.level === 1);

  if (h1s.length === 0) {
    score -= 35;
    findings.push(issue('critical', 'headings', 'No H1 found', 'Every page needs exactly one H1 stating the primary topic — it anchors both crawler and reader understanding of page purpose.'));
  } else if (h1s.length > 1) {
    score -= 15;
    findings.push(issue('warning', 'headings', `${h1s.length} H1 tags found`, 'Multiple H1s dilute topical focus. Keep one H1; demote the rest to H2.'));
  }

  const levelsUsed = [...new Set(headings.map((h) => h.level))].sort();
  for (let i = 1; i < levelsUsed.length; i++) {
    if (levelsUsed[i] - levelsUsed[i - 1] > 1) {
      score -= 10;
      findings.push(issue('warning', 'headings', `Heading level skipped (H${levelsUsed[i - 1]} → H${levelsUsed[i]})`, 'Skipping levels breaks the document outline for screen readers and crawlers. Use sequential levels.'));
      break;
    }
  }

  if (headings.length < 2) {
    score -= 15;
    findings.push(issue('warning', 'headings', 'Very few headings', 'Sparse heading structure makes long-form content harder to scan and to featured-snippet-extract. Break content into H2/H3 sections.'));
  }

  return { score: clamp(score), findings };
}

function scoreKeywordDensity(text, meta) {
  const findings = [];
  const words = tokenize(text);
  const total = words.length || 1;

  const freq = new Map();
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 3) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const topKeywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({
      term,
      count,
      density: Number(((count / total) * 100).toFixed(2)),
    }));

  let score = 100;

  const top = topKeywords[0];
  if (top && top.density > 4) {
    score -= 25;
    findings.push(issue('warning', 'keywords', `Possible keyword stuffing: "${top.term}"`, `"${top.term}" appears at ${top.density}% density. Above ~3% reads unnaturally to both algorithmic and human readers — vary phrasing and use synonyms.`));
  }

  if (total < 300) {
    score -= 20;
    findings.push(issue('warning', 'content', 'Thin content', `Only ~${total} words of extractable text. Pages under 300 words rarely rank for competitive terms and give crawlers little to work with.`));
  }

  const titleWords = tokenize(meta.title || '');
  const overlap = titleWords.filter((w) => freq.has(w));
  if (meta.title && overlap.length === 0) {
    score -= 10;
    findings.push(issue('minor', 'keywords', 'Title/content mismatch', 'None of the title\'s key terms appear meaningfully in body content — reinforce topical relevance.'));
  }

  return { score: clamp(score), findings, topKeywords };
}

function scoreSchema(schema) {
  const findings = [];
  let score = schema.length > 0 ? 90 : 40;

  if (schema.length === 0) {
    findings.push(issue('warning', 'schema', 'No structured data found', 'Add JSON-LD schema (Article, Product, FAQPage, etc.) — it powers rich results and gives both search and AI crawlers explicit entity/type signals.'));
    return { score: clamp(score), findings };
  }

  const types = schema.map((s) => s['@type']).filter(Boolean);
  if (!types.length) {
    score -= 20;
    findings.push(issue('minor', 'schema', 'Schema present but missing @type', 'Structured data blocks should declare an explicit @type so crawlers can classify the entity correctly.'));
  }

  const hasFaq = types.some((t) => /faq/i.test(String(t)));
  if (!hasFaq) {
    findings.push(issue('minor', 'schema', 'No FAQPage schema', 'If the page answers common questions, FAQPage schema is a strong lever for both SERP rich results and AI answer extraction.'));
  }

  return { score: clamp(score), findings };
}

function scoreLinks(links) {
  const findings = [];
  let score = 100;
  const internal = links.filter((l) => !l.isExternal);
  const external = links.filter((l) => l.isExternal);
  const emptyAnchor = links.filter((l) => !l.text);

  if (internal.length < 2) {
    score -= 15;
    findings.push(issue('minor', 'links', 'Few internal links', 'Internal linking distributes authority and helps crawlers discover related pages. Link to 3+ relevant pages.'));
  }

  if (external.length === 0) {
    score -= 10;
    findings.push(issue('minor', 'links', 'No outbound citations', 'Linking to authoritative external sources signals trustworthiness — relevant for both SEO E-E-A-T and GEO citation credibility.'));
  }

  if (emptyAnchor.length > 0) {
    score -= 10;
    findings.push(issue('minor', 'links', `${emptyAnchor.length} link(s) with empty anchor text`, 'Descriptive anchor text helps crawlers and screen readers understand link destinations.'));
  }

  return { score: clamp(score), findings };
}

function scoreImages(images) {
  const findings = [];
  let score = 100;
  const missingAlt = images.filter((img) => !img.alt || !img.alt.trim());

  if (images.length > 0 && missingAlt.length > 0) {
    const pct = Math.round((missingAlt.length / images.length) * 100);
    score -= Math.min(30, pct / 3);
    findings.push(issue('warning', 'images', `${missingAlt.length}/${images.length} images missing alt text`, 'Alt text is an accessibility requirement and an indexing signal for image search — describe the image content, not just "image".'));
  }

  return { score: clamp(score), findings };
}

// ---- shared helpers ----

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function issue(severity, category, title, fix) {
  return { severity, category, title, fix, pipeline: 'seo' };
}
