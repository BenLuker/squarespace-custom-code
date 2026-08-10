# reel-autoscroll

Adds continuous auto-scroll and momentum drag to Squarespace's native
**Gallery Section → Slideshow: Reel** — no Code Block, no separate gallery
setup, nothing to wire up per page. You opt a Reel section in with one line
of CSS in the site-wide Custom CSS panel, and it becomes a continuously
auto-scrolling, drag-to-scrub image ribbon.

## Why this exists

Squarespace's Reel is its own closed component
(`data-controller="GalleryReel"`) — a one-slide-at-a-time slideshow with no
autoplay option at all. This plugin doesn't patch that component (it's
proprietary, webpack-split, and could change on any Squarespace update).
Instead it reads the same images straight out of the Reel's own markup,
hides it, and rebuilds the gallery from scratch as a multi-image ribbon —
the same [Embla Carousel](https://www.embla-carousel.com)-powered engine as
the [scrolling-banner](../scrolling-banner) plugin, just auto-detecting Reel
sections instead of needing a Code Block per banner.

## Install (site-wide)

Squarespace: **Settings → Advanced → Code Injection**.

Paste into **HEADER**:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/reel-autoscroll/reel-autoscroll.css">
```

Paste into **FOOTER**:

```html
<script src="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/reel-autoscroll/reel-autoscroll.js" defer></script>
```

Embla itself is loaded from jsDelivr automatically the first time it's
needed — no extra tag, and no separate CSS file for it (Embla is headless).

> Bump `@v1.0.0` to a newer tag when you want updates. Use `@main` only while
> testing (see the repo's [docs/USAGE.md](../../docs/USAGE.md)).

## Opt a section in

Not every Squarespace plan/template exposes a per-Section "Custom CSS
Class" field, so this doesn't depend on one. Instead, every Section
Squarespace renders already carries its own stable `data-section-id`
attribute — you find that ID once and write one scoped CSS rule for it in
the **site-wide** Custom CSS panel.

1. Add a **Gallery Section** to a page (or use an existing one) and set its
   design to **Slideshow: Reel** — the ordinary Squarespace way, no code
   involved yet.
2. Find the section's ID: on the published page, right-click the section →
   **Inspect** → look for `data-section-id="..."` on the `.page-section`
   element (the section's outermost wrapper). Copy that value.
3. Go to **Design → Custom CSS** (site-wide, not the per-page Code
   Injection) and add:

   ```css
   [data-section-id="PASTE-THE-ID-HERE"] {
     --sqcc-reel-auto: 1;
   }
   ```
4. Save. On page load, the plugin finds that custom property, hides the
   native Reel in that section, and replaces it with the auto-scrolling
   ribbon in the same spot.

Every other Reel gallery on the site — any section without that rule — is
left completely untouched, native Squarespace behavior.

To go back to the native Reel on a section, just delete its rule.

> A `sqcc-reel-auto` CSS **class** on the section works too, if your
> template does expose a Custom CSS Class field — either mechanism opts a
> section in, so use whichever is available to you.

## Configure (more properties in the same rule)

Squarespace sections can't carry `data-*` attributes or a config Code Block
the way a Code Block widget can, so every option is another CSS custom
property in that same scoped rule:

```css
[data-section-id="PASTE-THE-ID-HERE"] {
  --sqcc-reel-auto: 1;
  --sqcc-reel-speed: 90;
  --sqcc-reel-dir: right;
  --sqcc-reel-dots: 1;
}
```

| Property | Default | Meaning |
| --- | --- | --- |
| `--sqcc-reel-auto` | — | **Required.** `1` turns this Reel section into an auto-scrolling ribbon. |
| `--sqcc-reel-speed` | `60` | Auto-scroll speed, px/second. |
| `--sqcc-reel-dir` | `left` | Set to `right` to scroll right instead. |
| `--sqcc-reel-gap` | `16` | Space between images, px. |
| `--sqcc-reel-radius` | `8` | Image corner radius, px. |
| `--sqcc-reel-align` | `left` | Where a scrubbed/arrowed image anchors. `center` or `right` also valid. |
| `--sqcc-reel-snap` | `1` | Set to `0` for a free momentum glide on release instead of snapping to the nearest image. |
| `--sqcc-reel-drag` | `1` | Set to `0` to disable click-and-drag scrubbing. |
| `--sqcc-reel-autoplay` | `1` | Set to `0` for ribbon layout and drag only — no continuous auto-scroll. |
| `--sqcc-reel-controls` | `1` | Set to `0` to hide the hover prev/next arrows. |
| `--sqcc-reel-dots` | `0` | Set to `1` to show clickable pagination dots under the ribbon. |
| `--sqcc-reel-pause-hover` | `1` | Set to `0` to keep auto-scrolling while the pointer is over the ribbon. |
| `--sqcc-reel-resume` | `2500` | Ms to hold, once drag/snap motion settles, before auto-scroll resumes. |
| `--sqcc-reel-fade` | `0` | Set to `1` to fade the left/right edges. |

Full-bleed vs. inset width and the ribbon's height both carry over
automatically from whatever the Section's own **Section Height** and
**Content Width** settings already were — nothing to configure separately.

## Interaction summary

Same physics as scrolling-banner, applied here too:

- **Auto-scroll:** continuous, paused while dragging or (unless
  `--sqcc-reel-pause-hover: 0`) hovered.
- **Drag:** press and drag horizontally to scrub. Auto-scroll holds for
  `--sqcc-reel-resume` ms *after* the release's own snap/glide motion
  finishes settling — never the instant you let go, so it can't fight an
  in-flight release animation.
- **Click a linked image:** a drag never triggers a click.
- **Reduced motion:** if the visitor's OS is set to reduce motion,
  auto-scroll defaults off (drag and arrows still work).

## Known limitations

- Squarespace's own **lightbox** (click an image to view it full-size) isn't
  wired up — clicking an image in the ribbon does nothing. Scope for a
  future version.
- Per-image **click-through links** aren't read — Reel's own lightbox
  navigation IDs aren't real URLs, so there's nothing to carry over.
- A Reel with only one image is left as a single static image (no carousel
  needed).

## Files

| File | Injection point |
| --- | --- |
| `reel-autoscroll.css` | HEADER (`<link>`) |
| `reel-autoscroll.js` | FOOTER (`<script defer>`) |
| `--sqcc-reel-auto: 1;` (+ options) | Design → Custom CSS, scoped to `[data-section-id="..."]` |

`demo.html` is for local preview only — it mocks Squarespace's own Reel
markup so the plugin has something to detect without a live site.

## jsDelivr URL pattern

```
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@VERSION/plugins/reel-autoscroll/FILE
```

`VERSION` is a git tag (`v1.0.0`) in production, or `main` while testing.
