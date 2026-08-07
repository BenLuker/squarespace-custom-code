# variant-switcher

Let a visitor pick options (e.g. **form factor** + **flavor**) and update the
page live: show/hide sections, swap words inside sentences, swap images, and
repoint links. Two or more independent axes. No page reload.

Open [`demo.html`](demo.html) in a browser to see every behavior working.

## How it works

The current selection is written to `<html>` as `data-vs-<axis>="value"`.
Show/hide is done in CSS (elements stay hidden until they match, so there's no
flicker); word/image/link swaps run in JS whenever the selection changes.

## Install

**HEADER** injection:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/variant-switcher/variant-switcher.css">
```

**FOOTER** injection:

```html
<script src="https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@v1.0.0/plugins/variant-switcher/variant-switcher.js" defer></script>
```

## Configure (one Code Block on the recipe page)

This element renders nothing — it just declares your axes and options:

```html
<div
  data-sqcc-plugin="variant-switcher"
  data-axes="form-factor,flavor"
  data-form-factor-options="capsule:Capsule,tablet:Tablet,powder:Powder"
  data-flavor-options="vanilla:Vanilla,berry:Mixed Berry,chocolate:Chocolate"
  data-form-factor-default="capsule"
  data-flavor-default="vanilla"
  data-remember="true"
  data-url="true"
></div>
```

| Attribute | Meaning |
| --- | --- |
| `data-axes` | Comma list of axis names (kebab-case). Order = display order. |
| `data-<axis>-options` | `value:Label` pairs, comma-separated. `value` is used in markup; `Label` is what the visitor sees and what word swaps insert. |
| `data-<axis>-default` | Starting value (optional; defaults to the first option). |
| `data-remember` | `true` (default) remembers the choice in the browser. `false` to disable. |
| `data-url` | `true` (default) reflects the choice in the URL (`?flavor=vanilla`) so it's shareable. `false` to disable. |

## Add the selector controls

Drop an empty element where you want each set of buttons; the plugin fills it:

```html
<span data-vs-controls="form-factor"></span>
<span data-vs-controls="flavor"></span>
```

Prefer your own buttons/links (any markup, anywhere)? Give them
`data-vs-set="axis:value"` instead — the plugin wires clicks and adds
`.is-active` to the current one:

```html
<button data-vs-set="flavor:vanilla">Vanilla</button>
```

## Make elements react

All of these go on elements **inside a Code Block** (where you control the
markup). Simple whole-section show/hide can also target native Squarespace
blocks — see the note at the bottom.

**Show / hide**

```html
<div data-vs-show="form-factor:powder"> ...only for powder... </div>
<div data-vs-hide="flavor:chocolate"> ...hidden when chocolate... </div>
```

Conditions: `axis:value`. Combine axes with `;` (all must match), or allow
several values with `|`:

```html
<div data-vs-show="form-factor:capsule|tablet;flavor:vanilla"> ... </div>
```

**Swap words inline** — put `data-vs-text` on any container and use
`{{axis}}` tokens; they're replaced with the selected option's **Label**:

```html
<p data-vs-text>Stir in {{flavor}} until the {{form-factor}} dissolves.</p>
```

**Swap an image** — one axis decides the source:

```html
<img data-vs-image="flavor"
     data-vs-image-vanilla="https://.../vanilla.jpg"
     data-vs-image-berry="https://.../berry.jpg"
     data-vs-image-chocolate="https://.../chocolate.jpg"
     alt="Product">
```

(Works on any element too — non-`<img>` elements get it as a background image.)

**Swap a link/button target**:

```html
<a data-vs-link="flavor"
   data-vs-link-vanilla="https://shop.example.com/vanilla"
   data-vs-link-berry="https://shop.example.com/berry"
   href="#">Buy {{flavor}}</a>
```

## Reacting in your own code (optional)

On every change the plugin fires a `sqcc:variantchange` event on `document`
with the current selection in `event.detail`.

## Squarespace placement notes

- The **config** div and any **word-swap / image / link** markup must live in a
  **Code Block**, because Squarespace won't let you add `data-*` attributes to
  native text/image blocks.
- For **whole-section show/hide** you can stay with native blocks: give the
  section or block an ID in its settings, then in a small Code Block add a CSS
  rule tied to the root state, e.g.
  `html[data-vs-form-factor="powder"] #your-section-id { display:block }`
  and hide it by default. Ask me and I'll generate those rules for your IDs.
- Files: `variant-switcher.css` → HEADER, `variant-switcher.js` → FOOTER,
  everything else is page markup.
