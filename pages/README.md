# Per-page overrides (optional)

If a tweak only applies to one page, create a folder here named after that
page (e.g. `pages/shop/style.css`) and inject it via that page's own
**Page Settings → Advanced → Page Header/Footer Code Injection**, rather than
the site-wide one — this keeps site-wide `css/site.css` / `js/site.js` clean
and avoids selector collisions across pages.

Example CDN link for a per-page file:

```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/squarespace-custom-code@main/pages/shop/style.css
```
