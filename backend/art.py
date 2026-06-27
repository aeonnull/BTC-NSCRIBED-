from urllib.parse import quote

PALS = [
    {"bg": "#0E0C0B", "a": "#FF6A1A", "b": "#3A332C"},
    {"bg": "#11100E", "a": "#F3EEE4", "b": "#C24A12"},
    {"bg": "#0C1014", "a": "#5FA8B8", "b": "#22303A"},
    {"bg": "#120D14", "a": "#B06AB3", "b": "#2A1E2E"},
    {"bg": "#13110A", "a": "#D6B84A", "b": "#2E2A12"},
    {"bg": "#0A0908", "a": "#FF6A1A", "b": "#1B1816"},
    {"bg": "#141414", "a": "#E2DDD4", "b": "#5A5550"},
]

MASK = 0xFFFFFFFF


def _hash_str(s: str):
    h = (1779033703 ^ len(s)) & MASK
    for ch in s:
        h = ((h ^ ord(ch)) * 3432918353) & MASK
        h = (((h << 13) | (h >> 19))) & MASK
    state = {"h": h}

    def nxt():
        hh = state["h"]
        hh = ((hh ^ (hh >> 16)) * 2246822507) & MASK
        hh = ((hh ^ (hh >> 13)) * 3266489909) & MASK
        hh ^= hh >> 16
        hh &= MASK
        state["h"] = hh
        return hh

    return nxt


def _rng(seed: str):
    f = _hash_str(seed)
    return lambda: f() / 4294967296.0


def art_uri(seed: str) -> str:
    r = _rng(seed)
    p = PALS[int(r() * len(PALS))]
    mode = int(r() * 3)
    S = 240
    inner = ""
    if mode == 0:
        g = [8, 10, 12][int(r() * 3)]
        cell = S / g
        for y in range(g):
            for x in range((g + 1) // 2):
                if r() > 0.52:
                    c = p["a"] if r() > 0.7 else p["b"]
                    inner += f'<rect x="{x*cell}" y="{y*cell}" width="{cell+0.5}" height="{cell+0.5}" fill="{c}"/>'
                    mx = (g - 1 - x) * cell
                    inner += f'<rect x="{mx}" y="{y*cell}" width="{cell+0.5}" height="{cell+0.5}" fill="{c}"/>'
    elif mode == 1:
        cx = S * (0.3 + r() * 0.4)
        cy = S * (0.3 + r() * 0.4)
        rings = 3 + int(r() * 4)
        for i in range(rings, 0, -1):
            rad = (S * 0.62) * (i / rings)
            c = p["a"] if i % 2 else p["b"]
            inner += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rad:.1f}" fill="none" stroke="{c}" stroke-width="{S*0.05:.1f}"/>'
        inner += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{S*0.08:.1f}" fill="{p["a"]}"/>'
    else:
        cols = 4 + int(r() * 5)
        w = S / cols
        for i in range(cols):
            h = S * (0.25 + r() * 0.75)
            c = p["a"] if r() > 0.66 else (p["b"] if r() > 0.4 else p["bg"])
            inner += f'<rect x="{i*w:.1f}" y="{S-h:.1f}" width="{w+0.5:.1f}" height="{h:.1f}" fill="{c}"/>'
        inner += f'<circle cx="{S*(0.2+r()*0.6):.1f}" cy="{S*0.28:.1f}" r="{S*0.1:.1f}" fill="{p["a"]}"/>'
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='{S}' height='{S}' "
           f"viewBox='0 0 {S} {S}'><rect width='{S}' height='{S}' fill='{p['bg']}'/>{inner}</svg>")
    return "data:image/svg+xml;utf8," + quote(svg)


NAMES = ["Untitled", "Relic", "Static", "Ghost", "Mono", "Drift", "Signal",
         "Ash", "Idol", "Husk", "Vapor", "Node", "Omen", "Trace"]


def build_demo_works(seed_prefix: str, n: int):
    out = []
    for i in range(n):
        out.append({
            "id": f"{seed_prefix}-{i}",
            "title": NAMES[(i + len(seed_prefix)) % len(NAMES)] + " #" + str(101 + i),
            "image": art_uri(seed_prefix + "-" + str(i)),
        })
    return out
