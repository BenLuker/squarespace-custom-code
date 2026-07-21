/**
 * Squarespace Custom Site JS
 * Loaded site-wide via Code Injection (FOOTER recommended,
 * so the DOM already exists by the time this runs).
 */

(function () {
  "use strict";

  /**
   * Squarespace pages are partly rendered by their own JS after initial load
   * (e.g. Ajax loading / Squarespace's own routing on some templates), so
   * relying only on DOMContentLoaded can miss elements added later.
   * `ready()` below covers both the normal case and Squarespace's own
   * 'mercury:load' event that fires after AJAX page loads.
   */
  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
    window.addEventListener("mercury:load", fn);
  }

  ready(function () {
    // ---------------------------------------------------------
    // Register your plugins/injections here. Keep each one
    // self-contained so they're easy to enable/disable.
    // ---------------------------------------------------------

    initExamplePlugin();
  });

  /**
   * Example plugin: logs a message once the page is ready.
   * Replace with your actual injection logic.
   */
  function initExamplePlugin() {
    console.log("[squarespace-custom-code] site.js loaded");
  }
})();
