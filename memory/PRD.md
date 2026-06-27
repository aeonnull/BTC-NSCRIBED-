# nscribed — by Blockheads

## Original problem statement
Visual "Link Tree" for crypto/Ordinals art. Twitter/X integration is fundamental.
Replace "Magic Eden" with free-form "Marketplaces" (user enters name + link).
Later: gate access by proving ownership of a specific Ordinal (holder verification),
delegated to a friend's ("Hamad's") external verifier app — no wallets inside nscribed.

## User choices (confirmed)
- Fullstack app (React + FastAPI + MongoDB)
- Real X/Twitter OAuth 1.0a login (app "Nscribed", id 32438062)
- Marketplaces: free-form name + link (profile-level + per-collection)
- Users create/edit their own profiles after X login
- Image upload: profile avatar + EVERY artwork individually; uploaded images only
  (no generated-art fallback for real users; demo profiles use baked generated SVG art)
- Pretty share links: `domain/<handle>` + copy button
- Remove all Emergent traces (done)
- Holder verification: connect to EXTERNAL friend's app (no wallet libs in nscribed)

## Architecture
- Backend FastAPI (/api), MongoDB (motor). Authlib OAuth1 + SessionMiddleware; JWT (pyjwt).
- Object storage via Emergent objstore (EMERGENT_LLM_KEY). Files served at /api/files/{path}.
- Frontend React Router. Routes: / , /edit , /access , /auth/callback , /:handle , /:handle/c/:cid
- Art generation ported to Python (art.py) only for seeding demo content.

## Key endpoints
- GET /api/auth/twitter/login | /callback ; GET /api/auth/me (returns holder flag, private)
- GET /api/profiles ; GET /api/profiles/{handle} (public; does NOT expose holder)
- PUT /api/profiles/me (name/type/bio/avatar/links/marketplaces/collections+works)
- POST /api/upload (auth, image) -> {path,url} ; GET /api/files/{path} (public)
- GET /api/holder/status (auth) ; POST /api/holder/start (auth) ; GET /api/holder/callback

## Holder verification — integration contract (for friend's app)
Not configured until env set: HOLDER_VERIFY_URL, HOLDER_SHARED_SECRET (backend/.env).
1. nscribed -> friend app:  GET {HOLDER_VERIFY_URL}?state=<jwt>&return_url={base}/api/holder/callback&handle=<x_handle>
2. friend app verifies wallet + Ordinal holdings (their side)
3. friend app -> nscribed:  GET {base}/api/holder/callback?state=<same jwt>&result=verified&secret=<shared>&wallet=<addr>
   -> sets user.holder=true, redirects to /access?holder=ok
state = short-lived (15 min) signed JWT identifying the nscribed user.

## Implemented (2026-06-27)
- Home/Profile/Collection/Lightbox/Footer ported from user's design + Edit dashboard.
- Marketplaces editable (replaces Magic Eden). Real X login verified (redirect to X works).
- Image upload (avatar + per-artwork) verified end-to-end. Clean /handle links + copy button.
- Emergent badge + posthog tracking removed from index.html.
- Holder-verification SEAM prepared (endpoints + /access page) with env placeholders;
  returns 503/"coming soon" until friend's app URL + shared secret are set.

## Backlog / Next
- Connect friend's verifier app: set HOLDER_VERIFY_URL + HOLDER_SHARED_SECRET, confirm callback params.
- Future: second access path = pay (paywall) in addition to holding an Ordinal.
- Confirm full X login round-trip with a real account (browser).
- Before deploy: longer (32+ byte) JWT_SECRET/SESSION_SECRET.
- Push to GitHub via the "Save to Github" button in the chat input (not done by agent).
