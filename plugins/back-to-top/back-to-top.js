/**
 * Plugin: back-to-top
 * A floating button that appears after the visitor scrolls down and
 * smooth-scrolls to the top on click.
 *
 * CONFIG (Squarespace-friendly): drop a config element into a Code Block
 * anywhere on the page/site. It renders nothing; it just carries options:
 *
 *   <div data-sqcc-plugin="back-to-top"
 *        data-show-after="600"
 *        data-position="right"
 *        data-bg="#c9a227"
 *        data-fg="#111111"
 *        data-label="Back to top"></div>
 *
 * Every attribute is optional. Precedence (low to high):
 *   built-in defaults  <  window.SQCC_BACK_TO_TOP  <  data-* attributes
 *
 * See ./README.md for the attribute table.
 */
(function () {
  "use strict";

  if (window.__sqccBackToTopInit) return; // guard against double-injection
  window.__sqccBackToTopInit = true;

  var DEFAULTS = {
    showAfter: 400, // px scrolled before the button appears
    position: "right", // "right" | "left"
    offset: "1.5rem", // distance from the bottom and from the side
    bg: "#111111", // button background color
    fg: "#ffffff", // icon color
    label: "Back to top", // accessible aria-label
  };

  // --- helpers to parse string attributes into real values ---
  function toInt(value, fallback) {
    var n = parseInt(value, 10);
    return isNaN(n) ? fallback : n;
  }

  function readConfig() {
    var cfg = Object.assign({}, DEFAULTS, window.SQCC_BACK_TO_TOP || {});

    // A config element in a Code Block wins over everything.
    var el = document.querySelector('[data-sqcc-plugin="back-to-top"]');
    if (el) {
      var d = el.dataset;
      if (d.showAfter != null) cfg.showAfter = toInt(d.showAfter, cfg.showAfter);
      if (d.position) cfg.position = d.position === "left" ? "left" : "right";
      if (d.offset) cfg.offset = d.offset;
      if (d.bg) cfg.bg = d.bg;
      if (d.fg) cfg.fg = d.fg;
      if (d.label) cfg.label = d.label;
      el.style.display = "none"; // config carrier renders nothing
    }
    return cfg;
  }

  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
    window.addEventListener("mercury:load", fn); // Squarespace AJAX transitions
  }

  function init() {
    if (document.querySelector(".sqcc-back-to-top")) return; // already added

    var cfg = readConfig();

    var btn = document.createElement("button");
    btn.className = "sqcc-back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", cfg.label);

    // Look knobs -> CSS custom properties + position, so styling stays in CSS.
    btn.style.setProperty("--sqcc-btt-bg", cfg.bg);
    btn.style.setProperty("--sqcc-btt-fg", cfg.fg);
    btn.style.bottom = cfg.offset;
    if (cfg.position === "left") {
      btn.style.left = cfg.offset;
      btn.style.right = "auto";
    } else {
      btn.style.right = cfg.offset;
      btn.style.left = "auto";
    }

    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>';

    document.body.appendChild(btn);

    function onScroll() {
      var scrolled =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle("is-visible", scrolled > cfg.showAfter);
    }

    btn.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  ready(init);
})();
