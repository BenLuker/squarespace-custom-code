# Squarespace Custom Code

A monorepo of self-contained custom plugins for my Squarespace site(s).
Each plugin lives in its own folder and is loaded into Squarespace by pointing
a `<link>` / `<script>` tag at a free CDN (jsDelivr), which mirrors this GitHub
repo. I edit here, push, tag a version, and update one URL in Squarespace
instead of pasting raw code every time.

## Why this setup

Squarespace won't let you upload files, but its **Code Injection** fields
(and Code Blocks) accept raw HTML, so you can load hosted `.css` / `.js` with
normal tags. Serving from a tagged git release gives you version history,
one-line rollback, and shared code across pages/sites.

## Structure

```
squarespace-custom-code/
├── plugins/
│   ├── _template/            # copy this to start a new plugin
│   │   ├── plugin.css
│   │   ├── plugin.js
│   │   ├── block.html        # optional: for Code Block plugins
│   │   └── README.md
│   └── back-to-top/          # first working plugin
│       ├── back-to-top.css   # → HEADER injection
│       ├── back-to-top.js    # → FOOTER injection
│       └── README.md
├── docs/
│   └── USAGE.md              # jsDelivr URLs, versioning, testing, rollback
├── README.md
└── LICENSE
```

There is no global `site.css` / `site.js`. Anything site-wide is just a plugin
you inject site-wide. Anything page-specific is the same plugin injected on
one page. One model for everything.

## Each plugin is one folder

- Its own CSS, JS, and (optionally) a `block.html` for Code Block use.
- CSS classes prefixed `sqcc-<plugin>-` so nothing collides.
- Enabled/disabled by adding or removing its tag(s) in Squarespace.

## The three injection points

| Where | Squarespace location | Use for |
| --- | --- | --- |
| **Header** | Settings → Advanced → Code Injection → HEADER (or per-page) | CSS via `<link>`; pre-script config |
| **Footer** | Settings → Advanced → Code Injection → FOOTER (or per-page) | JS via `<script defer>` |
| **Code Block** | Add a Code Block in the page editor | Plugins that render *in place* (widgets, embeds) |

## Versioning

Pin a git tag in your Squarespace URL so a future edit can never silently
break your live site. Workflow:

```bash
git add -A
git commit -m "back-to-top: appear later on long pages"
git push
git tag v1.1.0        # bump the version
git push --tags
```

Then change `@v1.0.0` → `@v1.1.0` in the Squarespace snippet when you're ready
for the update. To roll back, point the tag back to the older version. One
repo-wide semver tag keeps this simple; every injection pins its own tag, so
bumping only affects the snippets you actually update.

Full URL format, testing against `@main`, cache-busting, and purge instructions
are in [`docs/USAGE.md`](docs/USAGE.md).

## Quick start (back-to-top)

1. In Squarespace, paste into **HEADER**:
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/back-to-top/back-to-top.css">
   ```
2. Paste into **FOOTER**:
   ```html
   <script src="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/back-to-top/back-to-top.js" defer></script>
   ```
3. Reload your site and scroll down. See [`plugins/back-to-top/README.md`](plugins/back-to-top/README.md) for config.

## Adding a new plugin

1. Copy `plugins/_template` to `plugins/<your-plugin>`.
2. Rename files, write your CSS/JS, prefix classes with `sqcc-<your-plugin>-`.
3. Commit, push, tag a release.
4. Add the plugin's injection snippet in Squarespace.

## License

MIT — see [LICENSE](LICENSE).
