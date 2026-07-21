# Squarespace Custom Code

Personal collection of custom CSS/JS injections and snippets for my Squarespace site(s), version-controlled and served via a free CDN (jsDelivr) so I can inject a single `<script>`/`<link>` tag into Squarespace's Code Injection settings instead of pasting raw code every time I make a change.

## How this works

Squarespace doesn't let you upload arbitrary files, but its **Settings → Advanced → Code Injection** (site-wide) or **Page Settings → Advanced → Page Header/Footer** (per-page) fields accept raw HTML, which means you can point to hosted `.css`/`.js` files with normal `<link>` / `<script>` tags.

This repo is hosted on GitHub → GitHub raw files are auto-mirrored by **jsDelivr**, a free CDN → Squarespace loads the CDN URL. That gives you:

- Version control + history for every tweak
- Instant rollback (just re-point the tag at an older git tag)
- One shared file that can be injected across multiple pages/sites
- No repasting code into Squarespace every time you edit something

## Structure

```
squarespace-custom-code/
├── css/
│   └── site.css              # global custom styles
├── js/
│   └── site.js                # global custom scripts
├── snippets/
│   ├── header-injection.html  # paste into Site-Wide Code Injection > HEADER
│   └── footer-injection.html  # paste into Site-Wide Code Injection > FOOTER
├── docs/
│   └── USAGE.md               # step-by-step setup + versioning workflow
└── pages/                      # optional: per-page overrides, one folder per page
```

## Quick start

1. Edit `css/site.css` and/or `js/site.js`.
2. Commit and push:
   ```bash
   git add -A
   git commit -m "Tweak header styles"
   git push
   ```
3. (Recommended) Cut a version tag so your live site doesn't break on future edits:
   ```bash
   git tag v1.1.0
   git push --tags
   ```
4. In Squarespace, paste the contents of `snippets/header-injection.html` into
   **Settings → Advanced → Code Injection → HEADER** (replace `YOUR_USERNAME` and the version tag with your own).

Full instructions, jsDelivr URL format, and caching notes are in [`docs/USAGE.md`](docs/USAGE.md).

## License

MIT — see [LICENSE](LICENSE).
