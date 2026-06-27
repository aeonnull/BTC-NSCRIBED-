# nscribed — by Blockheads

## Original problem statement
Visual "Link Tree" for digital art (Bitcoin Ordinals-first but multi-chain, avoid the word "NFT").
Real X/Twitter login is fundamental. Marketplaces are free-form (name+link) — replaced "Magic Eden".
Profiles publicly viewable by anyone; creating/editing a profile requires login (and later, holder
verification delegated to a friend's external app — no wallet code inside nscribed).

## Stack & access model
- React + FastAPI + MongoDB. Real X OAuth 1.0a (app "Nscribed", id 32438062).
- Public viewing = open to all. Membership (create/edit profile) = X login; can be gated to
  verified holders via REQUIRE_HOLDER flag (currently false).
- Object storage: user uploads (avatar + each artwork) stored in the app's own MongoDB
  via GridFS (bucket "uploads"), served at /api/files/{id}. No external storage — fully
  self-contained and portable with the database. No Emergent calls anywhere in the code.
- Pretty links: domain/<handle> + copy button. Support via X @nscribed + nscribed.xyz.

## Key endpoints
- Auth: /api/auth/twitter/login, /callback, /api/auth/me (private, includes holder)
- Public: GET /api/profiles, GET /api/profiles/{handle} (holder field NOT exposed)
- Edit: PUT /api/profiles/me (token-owner only; REQUIRE_HOLDER gate)
- Files: POST /api/upload (auth, image-only), GET /api/files/{path} (public)
- Holder seam: /api/holder/start (503 until configured), /callback, /status

## Holder verification — external integration contract (friend's app)
Set in backend/.env when connecting: HOLDER_VERIFY_URL, HOLDER_SHARED_SECRET, REQUIRE_HOLDER=true
1. nscribed -> {HOLDER_VERIFY_URL}?state=<jwt>&return_url={base}/api/holder/callback&handle=<h>
2. friend app checks wallet + Ordinal holdings
3. friend app -> {base}/api/holder/callback?state=<jwt>&result=verified&secret=<shared>&wallet=<addr>

## Implemented (2026-06-27)
- Full UI ported from user's design + Edit dashboard, /access gate page.
- Real X login verified; image upload (avatar + each artwork) verified; clean /handle links + copy.
- Marketplaces editable. Artist vs Collector distinction: inverted orange/black rectangle headings
  + role tags. Orange paint-splat logo overlay (cut-out transparent PNG at /public/splat.png).
- Hero copy: "One link for all your digital art" / sub B (multi-chain, no NFT/Bitcoin lock).
- Hardened: strong JWT/SESSION secrets; ownership-only edits; auth-gated upload; holder field private.
- Removed Emergent: badge, posthog, @emergentbase/visual-edits (craco+package.json), dead testIds,
  comments. Only functional server-side storage endpoint remains (invisible).
- Support: X @nscribed + nscribed.xyz in header/footer.
- QA: 15/15 backend + 100% frontend passed (test suite at backend/tests/backend_test.py).

## Next / Backlog
- DEPLOY-READY (2026-06-27): deployment health check PASSED. Fixed: removed .env from
  .gitignore (needed for Emergent deploy), optimized /api/profiles to two type-filtered queries.
- Added social share card: /public/og.png + Open Graph/Twitter meta tags in index.html
  (og:image -> https://nscribed.xyz/og.png). Professional README.md added.
- USER ACTION: push to GitHub via the "Save to Github" button.
- USER ACTION: deploy + connect domain nscribed.xyz (Deploy feature). After deploy:
  update APP_BASE_URL + REACT_APP_BACKEND_URL to the live domain, and add the production
  callback URL `https://<domain>/api/auth/twitter/callback` to the X app settings.
- Connect friend's verifier app (set the 3 env vars above) and flip REQUIRE_HOLDER=true.
- Future: second access path = pay (paywall) in addition to holding an Ordinal.
- Optional: migrate FastAPI startup/shutdown to lifespan; add data-testids per QA suggestion.
