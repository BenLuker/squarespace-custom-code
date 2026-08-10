/**
 * Plugin: reel-autoscroll
 * Adds continuous auto-scroll and momentum drag to Squarespace's native
 * "Gallery Section → Slideshow: Reel" — no Code Block, no separate gallery
 * setup. Squarespace's own Reel is a proprietary, one-slide-at-a-time
 * component (data-controller="GalleryReel") with no autoplay option at all;
 * this plugin reads the same images straight out of its markup, hides it,
 * and rebuilds the gallery as a continuously-scrolling multi-image ribbon —
 * the same Embla-powered engine as the scrolling-banner plugin, just wired
 * to auto-detect Reel sections instead of a Code Block.
 *
 * INSTALL (site-wide, Settings → Advanced → Code Injection)
 *   HEADER: <link rel="stylesheet" href=".../reel-autoscroll.css">
 *   FOOTER: <script src=".../reel-autoscroll.js" defer></script>
 *
 * OPT IN, PER SECTION
 *   Not every Squarespace plan/template exposes a per-Section "Custom CSS
 *   Class" field, so targeting doesn't depend on one. Every Section
 *   Squarespace renders already carries a stable data-section-id attribute
 *   of its own — find it once (right-click the section → Inspect → look for
 *   data-section-id="..." on the .page-section element) and write a scoped
 *   rule for it in Design → Custom CSS (site-wide, not per page):
 *
 *     [data-section-id="6a778eef67351664a18b3ad6"] {
 *       --sqcc-reel-auto: 1;       required — turns this Reel into a ribbon
 *       --sqcc-reel-speed: 80;     auto-scroll speed, px/sec (default 60)
 *       --sqcc-reel-dir: right;    scroll right instead of left (default left)
 *       --sqcc-reel-gap: 24;       space between images, px (default 16)
 *       --sqcc-reel-radius: 12;    image corner radius, px (default 8)
 *       --sqcc-reel-align: center; or "right" (default left)
 *       --sqcc-reel-snap: 0;       0 = free momentum glide, no snap (default 1)
 *       --sqcc-reel-drag: 0;       0 = disable click-drag scrubbing (default 1)
 *       --sqcc-reel-autoplay: 0;   0 = layout + drag only, no auto-scroll (default 1)
 *       --sqcc-reel-controls: 0;   0 = hide the prev/next arrows (default 1)
 *       --sqcc-reel-dots: 1;       show pagination dots (default 0)
 *       --sqcc-reel-pause-hover: 0; 0 = keep scrolling while hovered (default 1)
 *       --sqcc-reel-resume: 1000;  ms to hold after motion settles (default 2500)
 *       --sqcc-reel-fade: 1;       fade the left/right edges (default 0)
 *     }
 *
 *   A .sqcc-reel-auto CSS class on the section works too, for templates that
 *   do expose a Custom CSS Class field — either mechanism opts a section in.
 *
 * See ./README.md for the full option table and setup steps.
 */
(function () {
  "use strict";

  if (window.__sqccReelAutoscrollInit) return; // guard against double-injection
  window.__sqccReelAutoscrollInit = true;

  var EMBLA_VERSION = "8.6.0";
  var EMBLA_JS = "https://cdn.jsdelivr.net/npm/embla-carousel@" + EMBLA_VERSION + "/embla-carousel.umd.js";
  var ENABLE_CLASS = "sqcc-reel-auto";

  /* =========================================================================
   * CONFIG — CSS custom properties scoped to the section via
   * [data-section-id="..."] in the site-wide Custom CSS panel, since not
   * every plan/template exposes a per-Section "Custom CSS Class" field to
   * use classes for this instead.
   * ========================================================================= */
  var VAR_PREFIX = "--sqcc-reel-";

  function cssVar(styles, name) {
    return styles.getPropertyValue(VAR_PREFIX + name).trim();
  }

  function isEnabled(section, styles) {
    if (section.classList.contains(ENABLE_CLASS)) return true; // class still works where available
    var v = cssVar(styles, "auto");
    return v === "1" || v === "true";
  }

  function parseConfig(styles) {
    function str(name, fallback) { var v = cssVar(styles, name); return v || fallback; }
    function num(name, fallback) {
      var v = cssVar(styles, name);
      var n = parseFloat(v);
      return v !== "" && !isNaN(n) ? n : fallback;
    }
    // "flag" options default true (e.g. controls, drag) and are turned off
    // with 0/false; direction/align/dots/fade default false/off and are
    // turned on with 1/true. Each call below picks the right default.
    function flag(name, defaultValue) {
      var v = cssVar(styles, name);
      if (v === "") return defaultValue;
      return v === "1" || v === "true";
    }
    var align = str("align", "left");
    return {
      speed: num("speed", 60),
      direction: str("dir", "left") === "right" ? "right" : "left",
      gap: num("gap", 16),
      radius: num("radius", 8),
      align: align === "center" || align === "right" ? align : "left",
      snap: flag("snap", true),
      drag: flag("drag", true),
      autoplay: flag("autoplay", true),
      controls: flag("controls", true),
      dots: flag("dots", false),
      pauseOnHover: flag("pause-hover", true),
      resumeDelay: num("resume", 2500),
      fadeEdges: flag("fade", false),
    };
  }

  /* =========================================================================
   * FINDING OPTED-IN REEL SECTIONS
   * ========================================================================= */
  function findReels() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll(".gallery-reel"), function (reel) {
      var section = reel.closest("[data-section-id]") || reel.closest(".page-section");
      if (!section) return;
      var styles = getComputedStyle(section);
      if (!isEnabled(section, styles)) return;
      out.push({ section: section, reel: reel });
    });
    return out;
  }

  // Squarespace's own responsive-image convention: the same asset URL takes
  // a "?format=Nw" query param for a pre-sized rendition.
  var SRCSET_WIDTHS = [100, 300, 500, 750, 1000, 1500, 2500];
  function buildSrcset(baseUrl) {
    return SRCSET_WIDTHS.map(function (w) { return baseUrl + "?format=" + w + "w " + w + "w"; }).join(", ");
  }

  function collectImages(reel) {
    var out = [];
    Array.prototype.forEach.call(reel.querySelectorAll(".gallery-reel-item img"), function (img) {
      var src = img.getAttribute("data-image") || img.getAttribute("data-src") || img.getAttribute("src") || "";
      if (!src) return;
      out.push({ src: src + "?format=1500w", srcset: buildSrcset(src), alt: img.getAttribute("alt") || "" });
    });
    return out;
  }

  /* =========================================================================
   * LOAD EMBLA (once, on demand) — headless: no CSS to load for the engine.
   * ========================================================================= */
  function ensureEmbla(cb) {
    if (window.EmblaCarousel) return cb();
    if (window.__sqccEmblaLoading) {
      window.__sqccEmblaCallbacks.push(cb);
      return;
    }
    window.__sqccEmblaLoading = true;
    window.__sqccEmblaCallbacks = [cb];

    var script = document.createElement("script");
    script.src = EMBLA_JS;
    script.onload = function () {
      var cbs = window.__sqccEmblaCallbacks || [];
      window.__sqccEmblaCallbacks = [];
      cbs.forEach(function (fn) { fn(); });
    };
    document.head.appendChild(script);
  }

  /* =========================================================================
   * BUILD + RUN ONE RIBBON
   * ========================================================================= */
  function padForLoop(data) {
    var MIN_SLIDES = 8; // halved: initEmbla() clones the real set once more for the loop's DOM buffer
    if (!data.length || data.length >= MIN_SLIDES) return data;
    var out = [];
    var i = 0;
    while (out.length < MIN_SLIDES) {
      out.push(data[i % data.length]);
      i++;
    }
    return out;
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function whenImagesReady(scope, cb) {
    var imgs = scope.querySelectorAll("img");
    var pending = imgs.length;
    if (!pending) return cb();
    var done = false;
    function tick() { if (!done && --pending <= 0) { done = true; cb(); } }
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.complete && img.naturalWidth) tick();
      else {
        img.addEventListener("load", tick, { once: true });
        img.addEventListener("error", tick, { once: true });
      }
    });
    setTimeout(function () { if (!done) { done = true; cb(); } }, 3000); // never wait forever
  }

  function replaceReel(section, reel, opts, imagesData) {
    var single = imagesData.length <= 1;
    var loop = opts.autoplay && !single;
    // Only pad the slide set when it'll actually loop — padding (repeating
    // images to fill a minimum count) a non-looping ribbon would leave
    // visible duplicate images stranded at the end with nowhere to wrap to.
    if (loop) imagesData = padForLoop(imagesData);

    // ---- DOM ----
    var root = document.createElement("div");
    root.className = "sqcc-reel-ribbon";
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    root.setAttribute("aria-label", "Image gallery");
    root.style.setProperty("--sqcc-rr-gap", opts.gap + "px");
    root.style.setProperty("--sqcc-rr-radius", opts.radius + "px");
    if (opts.fadeEdges) root.classList.add("sqcc-rr-fade");
    if (opts.drag && !single) root.classList.add("sqcc-rr-draggable");

    // Height: mirror whatever Section Height the editor picked for the native
    // Reel (its own data-props carries the same viewport-height percentage
    // Squarespace itself renders with), so this stays responsive without any
    // JS remeasuring on resize.
    var vh = 70;
    try {
      var props = JSON.parse(reel.getAttribute("data-props") || "{}");
      if (props.viewportHeight) vh = props.viewportHeight;
    } catch (e) { /* fall back to default */ }
    root.style.setProperty("--sqcc-rr-height", vh + "vh");

    var viewportEl = document.createElement("div");
    viewportEl.className = "sqcc-rr-viewport";
    var containerEl = document.createElement("div");
    containerEl.className = "sqcc-rr-container";
    viewportEl.appendChild(containerEl);
    root.appendChild(viewportEl);

    imagesData.forEach(function (data) {
      var slide = document.createElement("div");
      slide.className = "sqcc-rr-slide";
      var img = document.createElement("img");
      img.className = "sqcc-rr-img";
      img.src = data.src;
      img.srcset = data.srcset;
      img.alt = data.alt;
      img.setAttribute("draggable", "false");
      img.loading = "eager";
      slide.appendChild(img);
      containerEl.appendChild(slide);
    });

    var prevBtn, nextBtn, dotsEl;
    if (opts.controls && !single) {
      prevBtn = ctrlButton("prev", "Previous");
      nextBtn = ctrlButton("next", "Next");
      root.appendChild(prevBtn);
      root.appendChild(nextBtn);
    }
    if (opts.dots && !single) {
      dotsEl = document.createElement("div");
      dotsEl.className = "sqcc-rr-dots";
      root.appendChild(dotsEl);
    }

    // Same full-bleed breakout as scrolling-banner, only when the native
    // section itself was configured full-bleed — a Reel set to an inset
    // width should stay inset in its replacement too.
    var fullBleed = section.classList.contains("full-bleed-section");
    if (fullBleed) root.classList.add("sqcc-rr-full-bleed");
    var applyFullBleed = function () {
      root.style.width = "";
      root.style.marginLeft = "";
      var left = root.getBoundingClientRect().left;
      root.style.width = document.documentElement.clientWidth + "px";
      root.style.marginLeft = -left + "px";
    };

    // Hide (not remove) the native gallery — reversible by just deleting the
    // section's --sqcc-reel-auto CSS rule — and insert our replacement in
    // its place.
    var galleryWrapper = reel.closest(".gallery") || reel;
    galleryWrapper.style.display = "none";
    galleryWrapper.parentNode.insertBefore(root, galleryWrapper.nextSibling);

    if (fullBleed) {
      applyFullBleed();
      window.addEventListener("resize", debounce(applyFullBleed, 150));
    }

    function ctrlButton(dir, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sqcc-rr-arrow sqcc-rr-arrow-" + dir;
      b.setAttribute("aria-label", label);
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
        '<path d="' + (dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") +
        '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      return b;
    }

    function sizeSlide(slide) {
      var img = slide.querySelector("img");
      slide.style.flex = "0 0 " + img.getBoundingClientRect().width + "px";
    }

    whenImagesReady(containerEl, function () {
      if (single) {
        root.classList.add("is-ready");
        return;
      }
      initEmbla();
    });

    function initEmbla() {
      var realSlides = Array.prototype.slice.call(containerEl.children);
      realSlides.forEach(sizeSlide);

      var embla = window.EmblaCarousel(viewportEl, {
        loop: loop,
        axis: "x",
        direction: "ltr",
        align: opts.align === "center" ? "center" : opts.align === "right" ? "end" : "start",
        draggable: opts.drag,
        dragFree: !opts.snap,
        slidesToScroll: 1,
      });

      if (loop) {
        realSlides.forEach(function (slide) { containerEl.appendChild(slide.cloneNode(true)); });
        embla.reInit();
      }

      /* ---- continuous idle auto-scroll (see scrolling-banner.js for the full rationale) ---- */
      var playing = opts.autoplay;
      var hovering = false;
      var dragging = false;
      var resumeTimer = null;
      var dirSign = opts.direction === "right" ? 1 : -1;

      function cancelResume() { if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; } }
      function pause() { playing = false; cancelResume(); }
      function scheduleResume() {
        cancelResume();
        if (!opts.autoplay) return;
        resumeTimer = setTimeout(function () {
          resumeTimer = null;
          if (!hovering) playing = true;
        }, opts.resumeDelay);
      }

      embla.on("pointerDown", function () { dragging = true; root.classList.add("is-dragging"); pause(); });
      embla.on("pointerUp", function () { dragging = false; root.classList.remove("is-dragging"); });
      embla.on("settle", function () { if (!playing && !dragging) scheduleResume(); });
      if (prevBtn) prevBtn.addEventListener("click", function () { embla.scrollPrev(); pause(); });
      if (nextBtn) nextBtn.addEventListener("click", function () { embla.scrollNext(); pause(); });

      function syncArrows() {
        if (!prevBtn && !nextBtn) return;
        if (prevBtn) prevBtn.disabled = !embla.canScrollPrev();
        if (nextBtn) nextBtn.disabled = !embla.canScrollNext();
      }
      embla.on("select", syncArrows).on("init", syncArrows).on("reInit", syncArrows);
      syncArrows();

      if (dotsEl) {
        var dotEls = embla.scrollSnapList().map(function (_, i) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "sqcc-rr-dot";
          dot.setAttribute("aria-label", "Go to slide " + (i + 1));
          dot.addEventListener("click", function () { embla.scrollTo(i); pause(); });
          dotsEl.appendChild(dot);
          return dot;
        });
        var syncDots = function () {
          var selected = embla.selectedScrollSnap();
          dotEls.forEach(function (dot, i) { dot.classList.toggle("is-active", i === selected); });
        };
        embla.on("select", syncDots);
        syncDots();
      }

      root.addEventListener("mouseenter", function () { hovering = true; });
      root.addEventListener("mouseleave", function () {
        hovering = false;
        if (!playing && !dragging) scheduleResume();
      });

      var last = performance.now();
      function frame(now) {
        var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        if (playing && !dragging && !(opts.pauseOnHover && hovering)) {
          // playing can only be true when opts.autoplay was true at init,
          // which (see `loop` above) means loop is always true here too —
          // no non-looping edge-stop case to handle, autoplay always implies
          // a loop to auto-scroll around.
          var engine = embla.internalEngine();
          engine.location.add(dirSign * opts.speed * dt);
          engine.target.set(engine.location);
          engine.scrollLooper.loop(dirSign);
          engine.slideLooper.loop();
          engine.animation.render(1);
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      root.classList.add("is-ready");
    }
  }

  /* =========================================================================
   * INIT
   * ========================================================================= */
  function initOne(section, reel) {
    if (reel.dataset.sqccReady) return;
    reel.dataset.sqccReady = "1";

    var opts = parseConfig(getComputedStyle(section));
    var imagesData = collectImages(reel);
    if (!imagesData.length) return;

    ensureEmbla(function () { replaceReel(section, reel, opts, imagesData); });
  }

  function initAll() {
    findReels().forEach(function (pair) { initOne(pair.section, pair.reel); });
  }

  // Reel galleries can render a tick after DOMContentLoaded — retry briefly.
  function initWithRetry() {
    initAll();
    var tries = 0;
    var iv = setInterval(function () {
      var pending = findReels().some(function (pair) { return !pair.reel.dataset.sqccReady; });
      if (!pending || ++tries > 20) { clearInterval(iv); return; }
      initAll();
    }, 200);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
    window.addEventListener("mercury:load", fn); // Squarespace AJAX page transitions
  }

  ready(initWithRetry);
})();
