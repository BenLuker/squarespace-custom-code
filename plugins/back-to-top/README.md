# back-to-top

A floating button that fades in once the visitor scrolls down and
smooth-scrolls back to the top when clicked. No dependencies.

## Install (site-wide)

Squarespace: **Settings → Advanced → Code Injection**.

Paste into **HEADER**:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/back-to-top/back-to-top.css">
```

Paste into **FOOTER**:

```html
<script src="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/back-to-top/back-to-top.js" defer></script>
```

That's it. The button injects itself into `<body>` on every page.

> Bump `@v1.0.0` to a newer tag when you want to pull in updates. Use
> `@main` only while testing (see the repo's [docs/USAGE.md](../../docs/USAGE.md)).

## Install (single page only)

Use the same two tags, but paste them into that page's
**Page Settings → Advanced → Page Header / Footer Code Injection** instead
of the site-wide fields.

## Configuration

Optional. Add this to the HEADER **above** the `<script>` tag to override defaults:

```html
<script>
  window.SQCC_BACK_TO_TOP = {
    showAfter: 600,        // px scrolled before the button appears (default 400)
    label: "Back to top"   // accessible aria-label
  };
</script>
```

To recolor the button, override the CSS variables in your own Custom CSS:

```css
.sqcc-back-to-top {
  --sqcc-btt-bg: #c9a227;   /* button background */
  --sqcc-btt-fg: #111111;   /* icon color */
}
```

## Files

| File | Injection point |
| --- | --- |
| `back-to-top.css` | HEADER (`<link>`) |
| `back-to-top.js` | FOOTER (`<script defer>`) |
