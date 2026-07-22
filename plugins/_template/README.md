# _template

Copy this folder to start a new plugin: `plugins/_template` → `plugins/your-plugin-name`.
Keep everything self-contained so the plugin can be enabled or disabled by
adding/removing one or two tags in Squarespace.

## Naming conventions

- Folder name is the plugin name, kebab-case: `plugins/sticky-header/`.
- CSS class prefix: `sqcc-<plugin-name>-...` so styles never collide with
  Squarespace's own classes or with other plugins.
- JS: wrap in an IIFE, guard against double-injection with a
  `window.__sqcc<Name>Init` flag (see `plugin.js`).

## The three injection points

Squarespace gives you three places to add code. Pick based on what the plugin does:

1. **HEADER** (site-wide or per-page) — for CSS (`<link>`) and for config
   that must exist before scripts run. Loaded in `<head>`.
2. **FOOTER** (site-wide or per-page) — for JS (`<script defer>`). Runs after
   the DOM exists, so no need to wait for load.
3. **Code Block** — drop a Code Block onto a specific page/section in the
   editor and paste a small HTML snippet. Use `block.html` for plugins that
   render *in place* where the block sits (a widget, embed, custom section)
   rather than floating/global behavior.

Delete whichever of `plugin.css` / `plugin.js` / `block.html` your plugin
doesn't need.

## jsDelivr URL pattern

```
https://cdn.jsdelivr.net/gh/BenLuker/squarespace-custom-code@VERSION/plugins/PLUGIN-NAME/FILE
```

`VERSION` is a git tag (`v1.0.0`) in production, or `main` while testing.
