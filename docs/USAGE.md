# Usage guide

## 1. Push this repo to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/squarespace-custom-code.git
git branch -M main
git push -u origin main
```

## 2. Get a CDN URL for a file

jsDelivr serves any public GitHub repo file at:

```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/squarespace-custom-code@VERSION/PATH/TO/FILE
```

- `VERSION` can be a branch (`main`), a tag (`v1.0.0`), or a commit hash.
- **Use a tag or commit hash in production.** `@main` is fine while testing since it always serves the latest push, but it's also uncached-fresh and can change under you — pin a tag once things are stable so your live site never silently breaks.

Example, once you tag `v1.0.0`:

```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/squarespace-custom-code@v1.0.0/css/site.css
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/squarespace-custom-code@v1.0.0/js/site.js
```

## 3. Inject into Squarespace

**Site-wide** (affects every page): Settings → Advanced → Code Injection → paste into HEADER and/or FOOTER.

**Per-page**: open the page in the editor → gear icon → Advanced → Page Header Code Injection / Footer.

Use `snippets/header-injection.html` and `snippets/footer-injection.html` as your starting templates — just swap in your GitHub username and version tag.

## 4. Updating live code safely

1. Make changes locally, test them (see below).
2. Commit + push to `main`.
3. When happy, cut a new tag: `git tag v1.1.0 && git push --tags`.
4. Update the version number in your Squarespace injection snippet to match.

This way `main` can be a work-in-progress branch and your live site only ever points at a tested, tagged release.

## 5. Testing changes before they go live

jsDelivr caches aggressively (up to 7 days) once a tag is fetched, so for local testing:

- Point at `@main` temporarily (busts cache faster, still not instant — add `?v=timestamp` as a cache-buster query string if needed), or
- Test the CSS/JS locally by pasting the raw file contents directly into Squarespace's code injection while iterating, then switch to the CDN-hosted tagged version once finalized.

To force jsDelivr to refresh a specific tag/version early, use their purge tool:
`https://purge.jsdelivr.net/gh/YOUR_USERNAME/squarespace-custom-code@VERSION/PATH/TO/FILE`

## 6. Rolling back

If a change breaks something, just edit the version number in your Squarespace snippet back to the previous tag (e.g. `@v1.0.0`) — no need to revert git history.
