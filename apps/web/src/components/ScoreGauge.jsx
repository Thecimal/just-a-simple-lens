// ScoreGauge.jsx
//
// The dashboard's signature visual: a single circular instrument split down
// the vertical seam into two semicircular gauges — SEO (blue, left) and GEO
// (amber, right) — each filling from the 12-o'clock seam outward in
// proportion to its score. It reads as one "lens" viewing the page through
// two halves rather than two separate widgets, which mirrors the product's
// actual architecture (one crawl, two analysis pipelines).

const CX = 100;
const CY = 100;
const R = 80;
const TICK_INNER = 84;
const TICK_OUTER = 92;

function polar(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

const LEFT_TICK_ANGLES = [-90, -135, 180, 135, 90];
const RIGHT_TICK_ANGLES = [-90, -45, 0, 45, 90];

export default function ScoreGauge({ seoScore = 0, geoScore = 0, overallScore = 0 }) {
  const top = polar(-90, R);
  const bottom = polar(90, R);

  // sweep=0 (counter-clockwise, top -> west -> bottom) draws the left half.
  const leftPath = `M ${top.x} ${top.y} A ${R} ${R} 0 1 0 ${bottom.x} ${bottom.y}`;
  // sweep=1 (clockwise, top -> east -> bottom) draws the right half.
  const rightPath = `M ${top.x} ${top.y} A ${R} ${R} 0 1 1 ${bottom.x} ${bottom.y}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-full max-w-[280px]" role="img"
        aria-label={`SEO score ${seoScore} of 100, GEO score ${geoScore} of 100`}>
        {/* background tracks */}
        <path d={leftPath} pathLength="100" fill="none" stroke="#262F3B" strokeWidth="14" strokeLinecap="round" />
        <path d={rightPath} pathLength="100" fill="none" stroke="#262F3B" strokeWidth="14" strokeLinecap="round" />

        {/* proportional score arcs, filling from the top seam */}
        <path
          d={leftPath}
          pathLength="100"
          fill="none"
          stroke="#4C8DFF"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${seoScore} ${100 - seoScore}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
        <path
          d={rightPath}
          pathLength="100"
          fill="none"
          stroke="#FFB84D"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${geoScore} ${100 - geoScore}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />

        {/* radial tick marks every 25% */}
        {LEFT_TICK_ANGLES.map((a) => {
          const i = polar(a, TICK_INNER);
          const o = polar(a, TICK_OUTER);
          return <line key={`l${a}`} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#8B93A3" strokeWidth="1.5" />;
        })}
        {RIGHT_TICK_ANGLES.map((a) => {
          const i = polar(a, TICK_INNER);
          const o = polar(a, TICK_OUTER);
          return <line key={`r${a}`} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#8B93A3" strokeWidth="1.5" />;
        })}

        {/* center seam */}
        <line x1={CX} y1={22} x2={CX} y2={178} stroke="#262F3B" strokeWidth="1" strokeDasharray="2 3" />

        {/* overall score, center */}
        <text x={CX} y={CY - 6} textAnchor="middle" className="fill-ash font-mono" style={{ fontSize: 34, fontWeight: 600 }}>
          {overallScore}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" className="fill-dim font-mono" style={{ fontSize: 9, letterSpacing: '0.15em' }}>
          OVERALL
        </text>
      </svg>

      <div className="mt-1 flex w-full max-w-[280px] justify-between px-2 font-mono text-sm">
        <div className="flex flex-col items-start">
          <span className="text-seo font-semibold">{seoScore}</span>
          <span className="text-[10px] tracking-widest text-dim">SEO LENS</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-geo font-semibold">{geoScore}</span>
          <span className="text-[10px] tracking-widest text-dim">GEO LENS</span>
        </div>
      </div>
    </div>
  );
}
