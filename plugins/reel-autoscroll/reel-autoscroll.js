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
 *   Squarespace has no way to add data-* attributes or a config element to a
 *   native Section, so configuration is encoded as extra CSS classes in the
 *   Section's own "Custom CSS Class" field (Section editor → Design):
 *
 *     sqcc-reel-auto                 required — turns this Reel into a ribbon
 *     sqcc-reel-speed-80              auto-scroll speed, px/sec (default 60)
 *     sqcc-reel-dir-right             scroll right instead of left (default left)
 *     sqcc-reel-gap-24                space between images, px (default 16)
 *     sqcc-reel-radius-12             image corner radius, px (default 8)
 *     sqcc-reel-align-center          sqcc-reel-align-right also valid (default left)
 *     sqcc-reel-no-snap               free momentum glide on release, no snap
 *     sqcc-reel-no-drag               disable click-drag scrubbing
 *     sqcc-reel-no-autoplay           layout + drag only, no auto-scroll
 *     sqcc-reel-no-controls           hide the prev/next arrows
 *     sqcc-reel-dots                  show pagination dots (default off)
 *     sqcc-reel-no-pause-hover        keep auto-scrolling while hovered
 *     sqcc-reel-resume-1000           ms to hold after motion settles (default 2500)
 *     sqcc-reel-fade                  fade the left/right edges
 *
 *   Example: "sqcc-reel-auto sqcc-reel-speed-80 sqcc-reel-dir-right sqcc-reel-dots"
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
   * CONFIG — parsed from extra classes on the same element as ENABLE_CLASS
   * ========================================================================= */
  function parseConfig(marker) {
    var cls = " " + marker.className + " ";
    function has(token) { return cls.indexOf(" " + token + " ") !== -1; }
    function num(prefix, fallback) {
      var m = cls.match(new RegExp("\\s" + prefix + "-(\\d+(?:\\.\\d+)?)\\s"));
      return m ? parseFloat(m[1]) : fallback;
    }
    return {
      speed: num("sqcc-reel-speed", 60),
      direction: has("sqcc-reel-dir-right") ? "right" : "left",
      gap: num("sqcc-reel-gap", 16),
      radius: num("sqcc-reel-radius", 8),
      align: has("sqcc-reel-align-center") ? "center" : has("sqcc-reel-align-right") ? "right" : "left",
      snap: !has("sqcc-reel-no-snap"),
      drag: !has("sqcc-reel-no-drag"),
      autoplay: !has("sqcc-reel-no-autoplay"),
      controls: !has("sqcc-reel-no-controls"),
      dots: has("sqcc-reel-dots"),
      pauseOnHover: !has("sqcc-reel-no-pause-hover"),
      resumeDelay: num("sqcc-reel-resume", 2500),
      fadeEdges: has("sqcc-reel-fade"),
    };
  }

  /* =========================================================================
   * FINDING OPTED-IN REEL SECTIONS
   * ========================================================================= */
  function findReels() {
    var out = [];
    var seen = [];
    Array.prototype.forEach.call(document.querySelectorAll("." + ENABLE_CLASS), function (marker) {
      var reel = marker.classList.contains("gallery-reel") ? marker : marker.querySelector(".gallery-reel");
      if (!reel || seen.indexOf(reel) !== -1) return;
      seen.push(reel);
      out.push({ marker: marker, reel: reel });
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

  function replaceReel(section, marker, reel, opts, imagesData) {
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

    // Hide (not remove) the native gallery — reversible by just dropping the
    // opt-in class — and insert our replacement in its place.
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
  function initOne(marker, reel) {
    if (reel.dataset.sqccReady) return;
    reel.dataset.sqccReady = "1";

    var section = marker.closest(".page-section") || marker;
    var opts = parseConfig(marker);
    var imagesData = collectImages(reel);
    if (!imagesData.length) return;

    ensureEmbla(function () { replaceReel(section, marker, reel, opts, imagesData); });
  }

  function initAll() {
    findReels().forEach(function (pair) { initOne(pair.marker, pair.reel); });
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
