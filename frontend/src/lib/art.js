// Seeded generative art (ported from original design)
function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function rng(seed) {
  const f = hashStr(seed);
  return () => f() / 4294967296;
}

const PALS = [
  { bg: '#0E0C0B', a: '#FF6A1A', b: '#3A332C' },
  { bg: '#11100E', a: '#F3EEE4', b: '#C24A12' },
  { bg: '#0C1014', a: '#5FA8B8', b: '#22303A' },
  { bg: '#120D14', a: '#B06AB3', b: '#2A1E2E' },
  { bg: '#13110A', a: '#D6B84A', b: '#2E2A12' },
  { bg: '#0A0908', a: '#FF6A1A', b: '#1B1816' },
  { bg: '#141414', a: '#E2DDD4', b: '#5A5550' },
];

export function artURI(seed) {
  const r = rng(seed);
  const p = PALS[Math.floor(r() * PALS.length)];
  const mode = Math.floor(r() * 3);
  const S = 240;
  let inner = '';
  if (mode === 0) {
    const g = [8, 10, 12][Math.floor(r() * 3)];
    const cell = S / g;
    for (let y = 0; y < g; y++) {
      for (let x = 0; x < Math.ceil(g / 2); x++) {
        const on = r() > 0.52;
        if (on) {
          const c = r() > 0.7 ? p.a : p.b;
          inner += `<rect x="${x * cell}" y="${y * cell}" width="${cell + 0.5}" height="${cell + 0.5}" fill="${c}"/>`;
          const mx = (g - 1 - x) * cell;
          inner += `<rect x="${mx}" y="${y * cell}" width="${cell + 0.5}" height="${cell + 0.5}" fill="${c}"/>`;
        }
      }
    }
  } else if (mode === 1) {
    const cx = S * (0.3 + r() * 0.4), cy = S * (0.3 + r() * 0.4);
    const rings = 3 + Math.floor(r() * 4);
    for (let i = rings; i > 0; i--) {
      const rad = (S * 0.62) * (i / rings);
      const c = i % 2 ? p.a : p.b;
      inner += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="${c}" stroke-width="${(S * 0.05).toFixed(1)}"/>`;
    }
    inner += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(S * 0.08).toFixed(1)}" fill="${p.a}"/>`;
  } else {
    const cols = 4 + Math.floor(r() * 5);
    const w = S / cols;
    for (let i = 0; i < cols; i++) {
      const h = S * (0.25 + r() * 0.75);
      const c = r() > 0.66 ? p.a : (r() > 0.4 ? p.b : p.bg);
      inner += `<rect x="${(i * w).toFixed(1)}" y="${(S - h).toFixed(1)}" width="${(w + 0.5).toFixed(1)}" height="${h.toFixed(1)}" fill="${c}"/>`;
    }
    inner += `<circle cx="${(S * (0.2 + r() * 0.6)).toFixed(1)}" cy="${(S * 0.28).toFixed(1)}" r="${(S * 0.1).toFixed(1)}" fill="${p.a}"/>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${S}' height='${S}' viewBox='0 0 ${S} ${S}'><rect width='${S}' height='${S}' fill='${p.bg}'/>${inner}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const NAMES = ['Untitled', 'Relic', 'Static', 'Ghost', 'Mono', 'Drift', 'Signal', 'Ash', 'Idol', 'Husk', 'Vapor', 'Node', 'Omen', 'Trace'];

// Build the works list for a collection from its piece count
export function buildWorks(userId, col) {
  const out = [];
  const n = Math.max(0, Math.min(60, col.pieces || 0));
  for (let i = 0; i < n; i++) {
    out.push({
      title: NAMES[(i + col.id.length) % NAMES.length] + ' #' + (101 + i),
      seed: userId + col.id + '-' + i,
      chain: col.chain,
      year: col.year,
    });
  }
  return out;
}
