# Usage guide

How to load a plugin from this repo into Squarespace, version it, test it, and
roll it back.

## 1. The jsDelivr URL

jsDelivr serves any file in this public GitHub repo at:

```
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@VERSION/plugins/PLUGIN/FILE
```

- `VERSION` — a git tag (`v1.0.0`), a branch (`main`), or a commit hash.
- **Production: always pin a tag or commit hash.** A tagged URL is immutable and
  cached hard, so your live site keeps loading exactly what you tested.
- `@main` always serves the latest push — handy while iterating, risky in
  production because it can change under you.

Example (back-to-top, tagged release):

```
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/back-to-top/back-to-top.css
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/back-to-top/back-to-top.js
```

## 2. Inject into Squarespace

- **Site-wide:** Settings → Advanced → Code Injection → HEADER / FOOTER.
- **Per-page:** open the page → gear/settings → Advanced → Page Header / Footer
  Code Injection.
- **Code Block:** add a Code Block in the editor and paste an HTML snippet
  (see a plugin's `block.html`).

Convention in this repo:

- CSS (`<link>`) → **HEADER**
- JS (`<script defer>`) → **FOOTER**

## 3. Versioning workflow

`main` is your work-in-progress; tags are your releases.

```bash
# 1. Edit a plugin locally
# 2. Commit + push
git add -A
git commit -m "back-to-top: raise scroll threshold"
git push

# 3. When happy, cut a new tag
git tag v1.1.0
git push --tags
```

Then bump the version in the Squarespace snippet (`@v1.0.0` → `@v1.1.0`) when
you want the change to go live. Because each injected snippet pins its own tag,
bumping the repo tag doesn't move anything until you edit that snippet.

**One tag for the whole repo** is the simplest scheme and what the README
assumes. If one plugin changes far more often than the rest and you want to
version it independently, use a per-plugin tag prefix instead
(`git tag back-to-top-v2.0.0`) and pin that tag in only that plugin's URL.
Start simple; switch only if you feel the need.

## 4. Testing before it goes live

jsDelivr caches tagged versions aggressively (up to 7 days), so while iterating:

- Point the snippet at `@main` to always get your latest push. It's not
  instant either; add a throwaway query string to force a fresh fetch:
  `...back-to-top.js?v=20260722a`.
- Or paste the raw file contents straight into a Code Injection field while you
  iterate, then switch to the tagged CDN URL once finalized.

Force jsDelivr to refresh a specific file early with the purge endpoint:

```
https://purge.jsdelivr.net/gh/BenLuker/squarespace-custom-code@main/plugins/back-to-top/back-to-top.js
```

## 5. Rolling back

If a release breaks something, edit the version in the Squarespace snippet back
to the previous tag (e.g. `@v1.1.0` → `@v1.0.0`). No git revert needed — the old
tag still resolves.

## 6. First push (already done for this repo)

For reference, the repo was connected to GitHub with:

```bash
git remote add origin https://github.com/BenLuker/squarespace-custom-code.git
git branch -M main
git push -u origin main
```

The repo must be **public** for jsDelivr's `/gh/` endpoint to serve it.
