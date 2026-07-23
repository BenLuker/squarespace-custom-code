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

> Bump `@v1.0.0` to a newer tag when you want updates. Use `@main` only while
> testing (see the repo's [docs/USAGE.md](../../docs/USAGE.md)).

## Install (single page only)

Use the same two tags, but paste them into that page's
**Page Settings → Advanced → Page Header / Footer Code Injection**.

## Customize it from Squarespace

Drop this into a **Code Block** anywhere on the page (or site) to change how the
button looks and behaves. It renders nothing itself — it just carries options.
Every attribute is optional; omit one to keep its default.

```html
<div
  data-sqcc-plugin="back-to-top"
  data-show-after="600"
  data-position="left"
  data-bg="#c9a227"
  data-fg="#111111"
  data-offset="2rem"
  data-label="Back to top"
></div>
```

### Options

| Attribute | Default | Options | Description |
| --- | --- | --- | --- |
| `data-show-after` | `400` | number (px) | How far the visitor scrolls before the button appears. |
| `data-position` | `right` | `right` \| `left` | Which side the button sits on. |
| `data-offset` | `1.5rem` | any CSS length | Distance from the bottom and from the side. |
| `data-bg` | `#111111` | any CSS color | Button background color. |
| `data-fg` | `#ffffff` | any CSS color | Arrow icon color. |
| `data-label` | `Back to top` | text | Accessible label (screen readers). |

Precedence, low to high: built-in defaults → `window.SQCC_BACK_TO_TOP` (if set in
the HEADER) → the `data-*` attributes on the Code Block element.

Prefer editing colors in your own Custom CSS? Override the variables instead:

```css
.sqcc-back-to-top { --sqcc-btt-bg: #c9a227; --sqcc-btt-fg: #111111; }
```

## Files

| File | Injection point |
| --- | --- |
| `back-to-top.css` | HEADER (`<link>`) |
| `back-to-top.js` | FOOTER (`<script defer>`) |
| config `<div>` | optional Code Block (see above) |
