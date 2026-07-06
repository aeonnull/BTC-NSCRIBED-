// Marketplace display label: the user-typed name wins; otherwise fall back to a
// type-based label (digital vs. physical) rather than guessing from the URL.
export function marketLabel(url, name, type = "digital") {
  if (name && name.trim()) return name.trim();
  if (!url) return "";
  return type === "physical" ? "GALLERY / PHYSICAL" : "ONLINE STORE";
}
