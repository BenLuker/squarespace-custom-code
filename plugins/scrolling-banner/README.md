# scrolling-banner

An infinitely scrolling image banner (marquee) for the top of your blog pages,
built from an existing Squarespace **Gallery**. It auto-scrolls; grab and drag
to scrub to any image and it snaps that image to the active edge (left by
default, with a little spacing), holds for a beat, then resumes on its own.

It gives you the same knobs as a native Squarespace carousel gallery — image
selection, infinite scrolling, scroll speed, auto-transition, active alignment,
and next/previous controls — plus a few extras (drag-to-scrub, pagination dots,
edge fade, pause-on-hover, reduced-motion support, keyboard control).

Open [`demo.html`](demo.html) in a browser to see every behavior working.

## How it works

You already have the images in a Squarespace Gallery. This plugin reads the
image URLs (and any links you set on them) out of that gallery, hides the
original, and renders the scrolling banner in a Code Block where you place it.
One set of slides is measured and cloned enough times to loop seamlessly; motion
is a single `requestAnimationFrame` loop, and looping is a modulo over one set's
width, so it never reaches an end. Drag scrubbing snaps the nearest image to the
active edge and holds before resuming.

## Install

**HEADER** injection (or paste the `<link>` in the Code Block, as `block.html` does):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/scrolling-banner/scrolling-banner.css">
```

**FOOTER** injection:

```html
<script src="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/scrolling-banner/scrolling-banner.js" defer></script>
```

## Set it up on a blog page

1. **Add the images.** Drop a **Gallery Section** or **Gallery Block** onto the
   page and add your images. To make images clickable, set a **Clickthrough URL**
   on each image in the gallery — the banner carries those links over.
2. **Give the gallery an ID** so the plugin can find it, e.g. `hero-strip`.
   (Section: open the section → *Edit Section* → add an ID; or use the auto-detect
   fallback below and skip this.)
3. **Add a Code Block** where you want the banner and paste
   [`block.html`](block.html). Point `data-gallery` at your gallery
   (`#hero-strip`). That's it — the original gallery hides itself and the banner
   appears in the Code Block.

If you don't set `data-gallery`, the plugin auto-detects the first gallery on the
page. That's fine when there's only one; name it explicitly if there are several.

## Configure (data attributes)

Everything is set on the config `<div>` in the Code Block. Every attribute is
optional except `data-sqcc-plugin`; omit one to use its default.

| Attribute | Default | Squarespace equivalent | Meaning |
| --- | --- | --- | --- |
| `data-gallery` | *(first gallery)* | Image selection | CSS selector of the source gallery (`#hero-strip`). |
| `data-height` | `200` | — | Banner height in px. Images scale to this height, keeping aspect ratio. |
| `data-gap` | `16` | — | Space between images, px. |
| `data-speed` | `60` | Scroll speed | Auto-scroll speed in px/second. |
| `data-direction` | `left` | — | Scroll direction: `left` or `right`. |
| `data-autoplay` | `true` | Automatically transition between slides | Auto-scroll on/off. When off, it only moves via drag, arrows, or dots. |
| `data-loop` | `true` | Infinite scrolling | Seamless wrap. `false` stops at the ends instead. |
| `data-align` | `left` | Active alignment | Where a scrubbed/arrowed image anchors: `left`, `center`, or `right`. |
| `data-align-gap` | `24` | — | Spacing from the active edge when an image is anchored (used by `left`/`right`). |
| `data-controls` | `true` | Show next and previous controls | Show hover arrows that step one image at a time. |
| `data-dots` | `false` | — | Show clickable pagination dots under the banner. |
| `data-drag` | `true` | — | Enable click-and-drag scrubbing. |
| `data-pause-on-hover` | `true` | — | Pause auto-scroll while the pointer is over the banner. |
| `data-resume-delay` | `2500` | — | How long (ms) to hold on an image after you interact before auto-scroll resumes. |
| `data-radius` | `8` | — | Image corner radius, px. |
| `data-fade-edges` | `false` | — | Fade the left/right edges so images ease in and out. |
| `aria-label` | `Image banner` | — | Accessible name for the banner region. |

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

- **Auto-scroll:** continuous, at `data-speed`, in `data-direction`.
- **Drag:** press and drag horizontally to scrub; release and the nearest image
  snaps to the active edge and holds for `data-resume-delay`, then resumes.
- **Click a linked image:** navigates to its link. A drag never triggers the
  link (a small movement threshold distinguishes the two).
- **Arrows / dots / arrow keys:** step to a specific image, anchored and held.
- **Hover:** pauses (if `data-pause-on-hover`).
- **Reduced motion:** if the visitor's OS is set to reduce motion, auto-scroll
  defaults off; they can still drag and use the controls. Set `data-autoplay="true"`
  to force it on.

## Squarespace placement notes

- The **config div** and **Code Block** control where the banner appears; the
  source **Gallery** just supplies images and can sit anywhere on the page (it's
  hidden once read).
- Links come from each gallery image's **Clickthrough URL**. Lightbox-only or
  empty links are ignored.
- Files: `scrolling-banner.css` → HEADER, `scrolling-banner.js` → FOOTER,
  `block.html` → a Code Block. `demo.html` is for local preview only.

## jsDelivr URL pattern

```
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@VERSION/plugins/scrolling-banner/FILE
```

`VERSION` is a git tag (`v1.0.0`) in production, or `main` while testing.
