/**
 * Plugin: _template
 * Loaded from the FOOTER injection. Runs after the DOM exists and
 * re-runs on Squarespace AJAX page transitions (mercury:load).
 */
(function () {
  "use strict";

  // Rename __sqccTemplateInit per plugin. Prevents running twice if the
  // tag ends up in both header and footer, or across AJAX reloads.
  if (window.__sqccTemplateInit) return;
  window.__sqccTemplateInit = true;

  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
    window.addEventListener("mercury:load", fn);
  }

  function init() {
    // your logic here
  }

  ready(init);
})();
