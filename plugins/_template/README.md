# _template

Copy this folder to start a new plugin: `plugins/_template` → `plugins/your-plugin-name`.
Keep everything self-contained so the plugin can be enabled or disabled by
adding/removing tags in Squarespace.

## The config convention (data attributes)

Users configure a plugin entirely from HTML attributes in Squarespace — they
never edit JS. This mirrors the standard Squarespace-plugin pattern
(`data-wm-plugin="..."` etc.).

- **Marker attribute:** `data-sqcc-plugin="<plugin-name>"` tells the script
  which elements belong to it. `sqcc` = *squarespace custom code*, your
  namespace so attributes never clash with Squarespace's own.
- **Option attributes:** every other `data-*` is one knob. `data-slides-per-view="3"`
  is read in JS as `el.dataset.slidesPerView` (kebab-case → camelCase, always a string).
- **Defaults + parsing:** `plugin.js` declares each option once in
  `OPTION_SCHEMA` with a default and a parser (string/int/bool). Missing
  attribute → default. This is the whole customization surface.

Put **behavior** knobs into the JS logic and **look** knobs into CSS custom
properties that JS sets from the attributes, so styling stays in the stylesheet.

## Naming conventions

- Folder + marker value: kebab-case, e.g. `plugins/sticky-header/` →
  `data-sqcc-plugin="sticky-header"`.
- CSS: scope to `[data-sqcc-plugin="<name>"]` or a `.sqcc-<name>-` class prefix.
- JS: IIFE + a double-init guard (`el.dataset.sqccReady` per element, or a
  `window.__sqcc<Name>Init` flag for global plugins).

## The three injection points

1. **HEADER** — CSS (`<link>`) and any config that must exist before scripts run.
2. **FOOTER** — JS (`<script defer>`).
3. **Code Block** — for in-place widgets: paste `block.html`, which pulls the
   plugin's own CSS + JS and includes the configurable `data-*` div.

Delete whichever of `plugin.css` / `plugin.js` / `block.html` you don't need.

## jsDelivr URL pattern

```
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@VERSION/plugins/PLUGIN-NAME/FILE
```

`VERSION` is a git tag (`v1.0.0`) in production, or `main` while testing.
