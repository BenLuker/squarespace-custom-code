# scrolling-banner

An infinitely scrolling, edge-to-edge image banner built from an existing
Squarespace **Gallery**, powered by [Swiper](https://swiperjs.com). It
auto-scrolls continuously; grab and drag to scrub, and release either snaps
the nearest image to the active edge and holds before resuming, or glides to
a natural stop via momentum — your choice, see `data-snap`.

It's meant to sit as the **first Section on a Page**, with the page title
hidden. Squarespace Sections are edge-to-edge full-bleed by default and can
be the literal first thing on the page — so with a transparent/fixed site
header (a Site Styles setting, not something this plugin controls), the
banner renders full-width and behind the nav for free, the same way Squarespace's
own commercial slider plugins do it.

Open [`demo.html`](demo.html) in a browser to see every behavior working,
including a side-by-side of `data-snap="true"` vs `"false"`.

## How it works

You already have the images in a Squarespace Gallery. This plugin reads the
image URLs (and any links you set on them) out of that gallery, hides the
original, and renders the banner in a Code Block where you place it — built
as a [Swiper](https://swiperjs.com) instance, which is loaded from jsDelivr
automatically the first time it's needed (no extra tag to add). Swiper
handles seamless looping, drag, and momentum/snap physics on release; a small
`requestAnimationFrame` loop on top handles the continuous auto-scroll while
idle, which is the one thing Swiper's own autoplay (slide-to-slide on a
delay) doesn't do.

## Install

**HEADER** injection (or paste the `<link>` in the Code Block, as `block.html` does):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/scrolling-banner/scrolling-banner.css">
```

**FOOTER** injection:

```html
<script src="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/scrolling-banner/scrolling-banner.js" defer></script>
```

## Set it up on a Page

1. **Create or open a Page**, and in Page Settings hide the page title (so
   nothing renders above the banner).
2. **Make sure the banner's Section is the first Section on the page**, and
   that the Section itself is full-width (Squarespace's default for a plain
   content Section).
3. **Add the images.** Drop a **Gallery Section** or **Gallery Block** into
   that Section with your images. To make images clickable, set a
   **Clickthrough URL** on each image in the gallery — the banner carries
   those links over.
4. **Give the gallery an ID** so the plugin can find it, e.g. `hero-strip`,
   if there's more than one gallery on the page. (Section: open the section →
   *Edit Section* → add an ID.) With only one gallery on the page, skip this
   — auto-detect finds it.
5. **Add a Code Block** in the same Section and paste [`block.html`](block.html).
   Point `data-gallery` at your gallery (`#hero-strip`) if you set an ID.
   That's it — the original gallery hides itself and the banner appears in
   the Code Block.

If you don't set `data-gallery`, the plugin auto-detects the first gallery on
the page. That's fine when there's only one; name it explicitly if there are
several.

**The "behind the nav" effect depends on your site's own header being set to
transparent/fixed in Site Styles.** That's a per-site template capability,
not something this plugin can force — if your header isn't transparent, the
banner will still render full-bleed at the top of the page, just under an
opaque nav bar instead of behind it.

## Configure (data attributes)

Everything is set on the config `<div>` in the Code Block. Every attribute is
optional except `data-sqcc-plugin`; omit one to use its default.

| Attribute | Default | Meaning |
| --- | --- | --- |
| `data-gallery` | *(first gallery)* | CSS selector of the source gallery (`#hero-strip`). |
| `data-height` | `200` | Banner height in px, or `auto` to fill the height of the containing Fluid Engine block instead — resize the block's own resize handles in the page editor to control it. Images scale to this height, keeping aspect ratio. |
| `data-gap` | `16` | Space between images, px. |
| `data-speed` | `60` | Auto-scroll speed in px/second. |
| `data-direction` | `left` | Scroll direction: `left` or `right`. |
| `data-autoplay` | `true` | Auto-scroll on/off. When off, it only moves via drag, arrows, or dots. |
| `data-loop` | `true` | Seamless wrap. `false` stops at the ends instead. |
| `data-align` | `left` | Where a scrubbed/arrowed image anchors: `left`, `center`, or `right`. |
| `data-align-gap` | `24` | Spacing from the active edge when `left`/`right`-aligned. |
| `data-controls` | `true` | Show hover arrows that step one image at a time. |
| `data-dots` | `false` | Show clickable pagination dots under the banner. |
| `data-drag` | `true` | Enable click-and-drag scrubbing. |
| `data-snap` | `true` | Release snaps the nearest image to the active edge. `false` = free glide to a stop via momentum, no forced alignment. |
| `data-pause-on-hover` | `true` | Pause auto-scroll while the pointer is over the banner. |
| `data-resume-delay` | `2500` | How long (ms) to hold after you interact before auto-scroll resumes. |
| `data-radius` | `8` | Image corner radius, px. |
| `data-fade-edges` | `false` | Fade the left/right edges so images ease in and out. |
| `data-full-bleed` | `true` | Stretch edge-to-edge past the content column (`100vw` breakout). Set `false` to keep it content-width instead. |
| `aria-label` | `Image banner` | Accessible name for the banner region. |

### Advanced: skip the gallery and list images inline

If you'd rather not use a Squarespace gallery, provide images directly with
`data-images`. One image per line as `url | link | alt` (link and alt optional):

```html
<div data-sqcc-plugin="scrolling-banner"
     data-images="
       https://images.example.com/a.jpg | /blog/post-a | Post A
       https://images.example.com/b.jpg |               | Post B
     "></div>
```

When `data-images` is present it takes priority and no gallery is read.

## Interaction summary

- **Auto-scroll:** continuous, at `data-speed`, in `data-direction`, paused
  while dragging or (if `data-pause-on-hover`) hovered.
- **Drag:** press and drag horizontally to scrub. On release: with
  `data-snap="true"` (default) the nearest image snaps to the active edge and
  holds for `data-resume-delay`, then resumes; with `data-snap="false"` it
  glides to a stop via momentum instead, wherever that lands.
- **Click a linked image:** navigates to its link. A drag never triggers the
  link.
- **Arrows / dots / arrow keys:** step to a specific image, then hold before
  auto-scroll resumes.
- **Reduced motion:** if the visitor's OS is set to reduce motion, auto-scroll
  defaults off; they can still drag and use the controls. Set
  `data-autoplay="true"` to force it on.

## Squarespace placement notes

- The **config div** and **Code Block** control where the banner appears; the
  source **Gallery** just supplies images and can sit anywhere in the same
  Section (it's hidden once read).
- Links come from each gallery image's **Clickthrough URL**. Lightbox-only or
  empty links are ignored.
- Files: `scrolling-banner.css` → HEADER, `scrolling-banner.js` → FOOTER,
  `block.html` → a Code Block. `demo.html` is for local preview only. Swiper
  itself is loaded automatically by `scrolling-banner.js` — don't add it
  separately.

## jsDelivr URL pattern

```
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@VERSION/plugins/scrolling-banner/FILE
```

`VERSION` is a git tag (`v1.0.0`) in production, or `main` while testing.
