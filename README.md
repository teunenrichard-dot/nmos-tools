# NMOS Tools — website & downloads

Public site and download host for **NMOS Scout** and **NMOS Quartermaster** —
on-premises IS-04/IS-05 discovery, diagnostics and control for ST 2110 broadcast.

- **Live site:** https://nmos.teunkey.com (Cloudflare Pages, served from this repo)
- **Downloads:** see the [latest release](../../releases/latest) — the site's
  download buttons point at the release assets.

## What's here

| Path | Purpose |
|---|---|
| `index.html` | the marketing / download site (self-contained, no build step) |
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

- **Site copy / design:** edit `index.html`, commit, push → auto-deploys.
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

**To refresh the demo after a product update** — run from `broadcast-projects/`:

```bash
# 1. run the two apps locally (no registry → mock/demo data loads automatically)
node nmos-scout/server.js &                     # :3500
node nmos-quartermaster/backend/src/server.js & # :3011

# 2. capture fresh state into the (git-ignored) snapshots
curl -s localhost:3500/api/state > website/demo/_scout-state.json
curl -s localhost:3011/api/state > website/demo/_qm-state.json

# 3. regenerate the demo pages
cd website/demo && node build-demo.js

# 4. ship it (push auto-deploys)
cd .. && git add demo/*.html && git commit -m "refresh live demo" && git push
```

The generator curates the Quartermaster capture (drops leftover manual/phantom
nodes + registry-error alerts, marks demo nodes healthy, seeds a couple of live
connections) and forces the licence to **licensed** so nothing is gated. If an
app's API endpoints change, update the stub in `build-demo.js`.
