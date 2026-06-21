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

The Windows download bundles (`nmos-scout-portable.zip`,
`nmos-quartermaster-portable.zip`) are published as **GitHub Release assets**, not
committed to the tree, so the repo stays small and Cloudflare Pages deploys fast.

## Cloudflare Pages

This repo is a plain static site — no build command, output directory = `/`
(repo root). Custom domain: `nmos.teunkey.com`.

## Updating

- **Site:** edit `index.html`, commit, push → Pages redeploys automatically.
- **Downloads:** build new bundles (see the product repo's `build/` runbook) and
  upload them to a new GitHub Release; the site links to `releases/latest/...`,
  so it always points at the newest build.
