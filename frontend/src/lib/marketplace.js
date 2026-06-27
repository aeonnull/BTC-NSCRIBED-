// Derive a marketplace display name purely from the URL (the domain), with optional override.
// No preset/hardcoded marketplaces — whatever link the user pastes is what shows.
export function marketLabel(url, name) {
  if (name && name.trim()) return name.trim();
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Marketplace";
  }
}
