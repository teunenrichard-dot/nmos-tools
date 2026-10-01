# NMOS Tools — website & downloads

Public site and download host for **NMOS Scout** and **NMOS Quartermaster** —
on-premises IS-04/IS-05 discovery, diagnostics and control for ST 2110 broadcast.

- **Live site:** https://nmos.teunkey.com (Cloudflare Pages, served from this repo)
- **Downloads:** see the [latest release](../../releases/latest) — the site's
  download buttons point at the release assets.

## What's here

| Path | Purpose |
|---|---|
| `index.html` | the marketing / download site (no build step) |
| `range/` | the Teunkey Broadcast range's stylesheet + backdrop, a **copy** written by `broadcast-projects/tools/sync-range.mjs`: never edit it here |
| `assets/` | the two products' logos (copied from the apps by `demo/build-demo.js`) |
| `demo/scout.html`, `demo/quartermaster.html` | the embedded **live demos** — generated, do not hand-edit |
| `demo/build-demo.js`, `demo/_*.json` | demo generator + captured state — **git-ignored** (local only); see "Live demo" |
| `.github/workflows/deploy.yml` | auto-deploy to Cloudflare Pages on every push |

The Windows download bundles (`nmos-scout-portable.zip`,
`nmos-quartermaster-portable.zip`) are published as **GitHub Release assets**, not
committed to the tree, so the repo stays small and Cloudflare Pages deploys fast.

## Deployment (Cloudflare Pages — automatic)

Every push to `main` auto-publishes to **nmos.teunkey.com** via the GitHub Action
in `.github/workflows/deploy.yml` (`wrangler pages deploy` → the `nmos-tools`
Pages project; custom domain `nmos.teunkey.com`). No dashboard step.

The Action needs one repo secret: **`CLOUDFLARE_API_TOKEN`** — a Cloudflare token
with *Account → Cloudflare Pages → Edit*. ⚠ If that token has an expiry, deploys
start failing when it lapses; roll the token and update the secret. (Wrangler is
pinned to v3 because the runner uses Node 20.)

## Updating

- **Site copy / design:** edit `index.html`, commit, push → auto-deploys. The look is the
  Teunkey Broadcast range (Signal Captain, Deck Planner, NMOS Quartermaster, NMOS Scout):
  colours, type and buttons come from `range/range.css` (`--tkr-*`, `.tkr-btn`), so the
  page follows the products. Run `node tools/sync-range.mjs --check` in `broadcast-projects/`
  before a push.
- **Downloads:** build new bundles (product repo's `build/` runbook), upload them
  to a **new GitHub Release**. The site links to `releases/latest/…`, so it always
  serves the newest build — no site change needed.
- **Live demo:** see below.

## Live demo

The home page embeds the *real* Scout and Quartermaster UIs
(`demo/scout.html`, `demo/quartermaster.html`), each running against a small
in-browser mock of its backend — canned NMOS data, licence shown unlocked, routing
works. Per-visitor, no server.

Those two pages are **generated** by `demo/build-demo.js` from the apps' own
frontends plus a captured state snapshot. The generator + snapshots are git-ignored
(kept local); only the generated `.html` is committed and deployed.

**To refresh the demo after a product update** — run from `broadcast-projects/website/demo/`:

```bash
# 1. start both apps from source on throwaway data (no registry, so each loads its own
#    sample data), sign in, capture their state, and build the two pages
node build-demo.js --capture

# 2. bump V in index.html's demo script (?v=, so browsers fetch the new pages), then ship
cd .. && git add demo/*.html assets index.html && git commit -m "refresh live demo" && git push
```

Since 2026-10-01 the apps sign in first, so a plain `curl /api/state` answers 401: the
capture signs in through the apps' own first-run set-up. In the demo the visitor is signed
in as "Demo" (an Operator), the range kit is written into each page, and the account
menu's product list holds only the two demos.

The generator curates the Quartermaster capture (drops leftover manual/phantom
nodes + registry-error alerts, marks demo nodes healthy, seeds a couple of live
connections) and forces the licence to **licensed** so nothing is gated. If an
app's API endpoints change, update the stub in `build-demo.js`.
