/**
 * Plugin: back-to-top
 * Injects a floating button that appears after the visitor scrolls
 * past a threshold and smooth-scrolls back to the top on click.
 *
 * Load site-wide from the FOOTER injection (so the DOM exists),
 * paired with back-to-top.css in the HEADER. See ./README.md.
 *
 * Config: override defaults before this script loads, e.g.
 *   <script>window.SQCC_BACK_TO_TOP = { showAfter: 600 };</script>
 */
(function () {
  "use strict";

  var CONFIG = Object.assign(
    {
      showAfter: 400, // px scrolled before the button appears
      label: "Back to top", // accessible label
    },
    window.SQCC_BACK_TO_TOP || {}
  );

  // Guard against double-injection (e.g. header + footer, or AJAX reloads).
  if (window.__sqccBackToTopInit) return;
  window.__sqccBackToTopInit = true;

  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
    // Squarespace fires this after its own AJAX page transitions.
    window.addEventListener("mercury:load", fn);
  }

  function init() {
    if (document.querySelector(".sqcc-back-to-top")) return; // already added

    var btn = document.createElement("button");
    btn.className = "sqcc-back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", CONFIG.label);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>';

    document.body.appendChild(btn);

    function onScroll() {
      var scrolled =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle("is-visible", scrolled > CONFIG.showAfter);
    }

    btn.addEventListener("click", function () {
      var reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // set initial state
  }

  ready(init);
})();
