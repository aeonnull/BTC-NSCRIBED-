// Derive a clean marketplace display name from a URL (auto), with optional override.
const KNOWN = {
  "magiceden.io": "Magic Eden",
  "opensea.io": "OpenSea",
  "gamma.io": "Gamma",
  "ordinalswallet.com": "Ordinals Wallet",
  "ord.io": "Ord.io",
  "ord.net": "ord.net",
  "unisat.io": "UniSat",
  "looksrare.org": "LooksRare",
  "blur.io": "Blur",
  "objkt.com": "objkt",
  "foundation.app": "Foundation",
  "rarible.com": "Rarible",
  "ordzaar.com": "Ordzaar",
  "okx.com": "OKX",
};

export function marketLabel(url, name) {
  if (name && name.trim()) return name.trim();
  if (!url) return "";
  try {
    let h = new URL(url).hostname.replace(/^www\./, "");
    return KNOWN[h] || h;
  } catch {
    return "Marketplace";
  }
}
