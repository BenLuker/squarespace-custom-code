/**
 * Plugin: scrolling-banner
 * An infinitely scrolling, edge-to-edge image banner built from an existing
 * Squarespace gallery, meant to sit as the first Section on a Page (title
 * hidden) so it renders full-bleed and behind a transparent/fixed site header.
 * It auto-scrolls continuously; grab-and-drag to scrub, and release either
 * snaps the nearest image to the active edge or glides to a natural stop via
 * momentum, depending on data-snap.
 *
 * HOW IT WORKS
 *   You drop a Gallery (Section or Block) on the page for the images, then add a
 *   Code Block with a config element that points at that gallery:
 *
 *     <div data-sqcc-plugin="scrolling-banner" data-gallery="#hero-strip"></div>
 *
 *   The script reads every image out of that gallery (URL, link, alt), hides the
 *   original gallery, and renders the banner inside the config element as a
 *   Swiper (https://swiperjs.com) instance — Swiper is loaded from jsDelivr at
 *   runtime if it isn't already on the page, so the Squarespace install stays a
 *   single link/div/script snippet. Swiper's `loop` mode handles seamless
 *   wrapping and its `freeMode` (with momentum) handles drag-and-glide; this
 *   file adds a small requestAnimationFrame loop on top for the continuous
 *   idle auto-scroll, which Swiper doesn't provide natively (its own autoplay
 *   module advances slide-to-slide on a delay, not a constant-speed marquee).
 *
 * OPTIONS  (every data-* is optional; see ./README.md for the full table)
 *   data-gallery         CSS selector of the source gallery (default: first gallery found)
 *   data-images          explicit "url | link | alt" list (newline or ;) — overrides gallery
 *   data-height          banner height in px (default 200)
 *   data-gap             space between images in px (default 16)
 *   data-speed           auto-scroll speed in px/sec (default 60)
 *   data-direction       "left" | "right" (default left)
 *   data-autoplay        auto-scroll on/off — "Automatically transition" (default true)
 *   data-loop            infinite scrolling on/off (default true)
 *   data-align           active alignment: "left" | "center" | "right" (default left)
 *   data-align-gap       spacing from the active edge when left/right-aligned, px (default 24)
 *   data-controls        show next/previous arrows (default true)
 *   data-dots            show pagination dots (default false)
 *   data-drag             enable click-drag scrubbing (default true)
 *   data-snap             release snaps nearest image to the active edge; false = free
 *                          glide to a stop via momentum, no forced alignment (default true)
 *   data-pause-on-hover   pause auto-scroll while hovered (default true)
 *   data-resume-delay     ms to hold after interaction before auto-scroll resumes (default 2500)
 *   data-radius           image corner radius in px (default 8)
 *   data-fade-edges       fade the left/right edges (default false)
 *   data-full-bleed       stretch edge-to-edge past the content column, 100vw (default true)
 */
(function () {
  "use strict";

  var PLUGIN = "scrolling-banner";
  var SWIPER_VERSION = "14.1.0";
  var SWIPER_JS = "https://cdn.jsdelivr.net/npm/swiper@" + SWIPER_VERSION + "/swiper-bundle.min.js";
  var SWIPER_CSS = "https://cdn.jsdelivr.net/npm/swiper@" + SWIPER_VERSION + "/swiper-bundle.min.css";

  /* =========================================================================
   * OPTIONS
   * ========================================================================= */
  function asInt(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  function asNum(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function asBool(v) { return v === "true" || v === "" || v === "1" || v === "yes"; }

  function readOptions(el) {
    var d = el.dataset;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      gallery: d.gallery || "",
      images: d.images || "",
      height: asInt(d.height, 200),
      gap: asInt(d.gap, 16),
      speed: asNum(d.speed, 60),
      direction: d.direction === "right" ? "right" : "left",
      autoplay: d.autoplay != null ? asBool(d.autoplay) : !reduce, // reduced-motion → default off
      loop: d.loop != null ? asBool(d.loop) : true,
      align: d.align === "center" || d.align === "right" ? d.align : "left",
      alignGap: asInt(d.alignGap, 24),
      controls: d.controls != null ? asBool(d.controls) : true,
      dots: d.dots != null ? asBool(d.dots) : false,
      drag: d.drag != null ? asBool(d.drag) : true,
      snap: d.snap != null ? asBool(d.snap) : true,
      pauseOnHover: d.pauseOnHover != null ? asBool(d.pauseOnHover) : true,
      resumeDelay: asInt(d.resumeDelay, 2500),
      radius: asInt(d.radius, 8),
      fadeEdges: d.fadeEdges != null ? asBool(d.fadeEdges) : false,
      fullBleed: d.fullBleed != null ? asBool(d.fullBleed) : true,
    };
  }

  /* =========================================================================
   * READING THE SOURCE GALLERY  (unchanged from v1)
   * ========================================================================= */
  function bestSrc(img) {
    // Squarespace lazy-loads: the real URL usually lives in data-src.
    return (
      img.getAttribute("data-src") ||
      img.currentSrc ||
      img.getAttribute("src") ||
      ""
    );
  }

  function collectFromGallery(root) {
    var imgs = root.querySelectorAll("img");
    var out = [];
    Array.prototype.forEach.call(imgs, function (img) {
      var src = bestSrc(img);
      if (!src || /^data:image\/svg/.test(src)) return; // skip placeholders
      var a = img.closest("a");
      var href = a && a.getAttribute("href");
      // ignore lightbox / javascript anchors
      if (href && (href === "#" || /^javascript:/i.test(href))) href = null;
      out.push({ src: src, href: href || "", alt: img.getAttribute("alt") || "" });
    });
    return out;
  }

  function parseImages(str) {
    return str
      .split(/[\n;]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .map(function (line) {
        var parts = line.split("|").map(function (p) { return p.trim(); });
        return { src: parts[0], href: parts[1] || "", alt: parts[2] || "" };
      })
      .filter(function (o) { return o.src; });
  }

  function findGallery(opts, configEl) {
    if (opts.gallery) return document.querySelector(opts.gallery);
    // Auto-detect: first thing that looks like a Squarespace gallery, not the config block.
    var sels = [
      ".sqs-gallery-block-grid", ".sqs-gallery-block-strip", ".sqs-gallery-block-slideshow",
      ".sqs-gallery-block-stacked", ".gallery-grid", ".gallery-strip", ".gallery-reel",
      "[data-block-type='8']", ".sqs-gallery",
    ];
    for (var i = 0; i < sels.length; i++) {
      var found = document.querySelector(sels[i]);
      if (found && !configEl.contains(found)) return found;
    }
    return null;
  }

  /* =========================================================================
   * LOAD SWIPER (once, on demand)
   * ========================================================================= */
  function ensureSwiper(cb) {
    if (window.Swiper) return cb();
    if (window.__sqccSwiperLoading) {
      window.__sqccSwiperCallbacks.push(cb);
      return;
    }
    window.__sqccSwiperLoading = true;
    window.__sqccSwiperCallbacks = [cb];

    if (!document.querySelector('link[href="' + SWIPER_CSS + '"]')) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SWIPER_CSS;
      document.head.appendChild(link);
    }
    var script = document.createElement("script");
    script.src = SWIPER_JS;
    script.onload = function () {
      var cbs = window.__sqccSwiperCallbacks || [];
      window.__sqccSwiperCallbacks = [];
      cbs.forEach(function (fn) { fn(); });
    };
    document.head.appendChild(script);
  }

  /* =========================================================================
   * BUILD + RUN ONE BANNER
   * ========================================================================= */
  function build(configEl, opts, slidesData) {
    configEl.style.display = "";

    // Swiper's loop mode needs a comfortably large real slide set to clone
    // from — a small gallery on a wide viewport isn't enough on its own
    // (Swiper warns and disables looping rather than duplicating for you).
    // Repeat the set until there's plenty, same idea as v1's manual cloning.
    // Note: if data-dots is also on, dot count reflects this padded count,
    // not the original unique image count — a known tradeoff for small
    // galleries with loop + dots both enabled.
    if (opts.loop) slidesData = padForLoop(slidesData);

    // ---- DOM ----
    var root = document.createElement("div");
    root.className = "sqcc-scrolling-banner";
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    root.setAttribute("aria-label", configEl.getAttribute("aria-label") || "Image banner");
    root.style.setProperty("--sqcc-sb-height", opts.height + "px");
    root.style.setProperty("--sqcc-sb-gap", opts.gap + "px");
    root.style.setProperty("--sqcc-sb-radius", opts.radius + "px");
    if (opts.fadeEdges) root.classList.add("sqcc-sb-fade");
    if (opts.fullBleed) root.classList.add("sqcc-sb-full-bleed");

    var swiperEl = document.createElement("div");
    swiperEl.className = "swiper sqcc-sb-swiper";
    var wrapperEl = document.createElement("div");
    wrapperEl.className = "swiper-wrapper";
    swiperEl.appendChild(wrapperEl);
    root.appendChild(swiperEl);

    function makeSlide(data) {
      var slide = document.createElement("div");
      slide.className = "swiper-slide sqcc-sb-slide";
      var inner = document.createElement(data.href ? "a" : "div");
      inner.className = "sqcc-sb-slide-inner";
      if (data.href) {
        inner.href = data.href;
        inner.setAttribute("draggable", "false");
      }
      var img = document.createElement("img");
      img.className = "sqcc-sb-img";
      img.src = data.src;
      img.alt = data.alt;
      img.setAttribute("draggable", "false");
      img.loading = "eager";
      inner.appendChild(img);
      slide.appendChild(inner);
      return slide;
    }
    slidesData.forEach(function (data) { wrapperEl.appendChild(makeSlide(data)); });

    // Controls
    var prevBtn, nextBtn, dotsEl;
    if (opts.controls) {
      prevBtn = ctrlButton("prev", "Previous");
      nextBtn = ctrlButton("next", "Next");
      root.appendChild(prevBtn);
      root.appendChild(nextBtn);
    }
    if (opts.dots) {
      dotsEl = document.createElement("div");
      dotsEl.className = "sqcc-sb-dots swiper-pagination";
      root.appendChild(dotsEl);
    }

    configEl.innerHTML = "";
    configEl.appendChild(root);

    // Swiper measures slide widths at init (slidesPerView:"auto" reads each
    // image's rendered width) — wait for images to load first, or every
    // slide measures near-zero and Swiper's loop math falls apart.
    whenImagesReady(wrapperEl, function () {
      initSwiper();
    });

    function ctrlButton(dir, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sqcc-sb-arrow sqcc-sb-arrow-" + dir;
      b.setAttribute("aria-label", label);
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
        '<path d="' + (dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") +
        '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      return b;
    }

    function initSwiper() {
      // ---- Swiper instance: handles loop cloning, drag, momentum/snap, nav, dots ----
      var swiper = new window.Swiper(swiperEl, {
        loop: opts.loop,
        slidesPerView: "auto",
        spaceBetween: opts.gap,
        speed: 420,
        grabCursor: true,
        allowTouchMove: opts.drag,
        centeredSlides: opts.align === "center",
        slidesOffsetBefore: opts.align === "left" ? opts.alignGap : 0,
        slidesOffsetAfter: opts.align === "right" ? opts.alignGap : 0,
        freeMode: {
          enabled: true,
          momentum: true,
          sticky: opts.snap, // true = snap nearest slide on release; false = pure momentum glide
        },
        navigation: opts.controls ? { nextEl: nextBtn, prevEl: prevBtn } : false,
        pagination: opts.dots ? { el: dotsEl, clickable: true } : false,
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: { enabled: true },
      });

      /* ---- continuous idle auto-scroll (the one thing Swiper doesn't do) ---- */
      var playing = opts.autoplay;
      var hovering = false;
      var dragging = false;
      var resumeTimer = null;
      var dir = opts.direction === "right" ? 1 : -1;

      function cancelResume() {
        if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
      }
      function pause() { playing = false; cancelResume(); }
      function scheduleResume() {
        cancelResume();
        if (!opts.autoplay) return;
        resumeTimer = setTimeout(function () {
          resumeTimer = null;
          if (!hovering) playing = true;
        }, opts.resumeDelay);
      }

      // Only genuine user interaction pauses/resumes autoplay. Swiper fires
      // transitionStart/transitionEnd for internal reasons too (loop
      // repositioning, momentum settling after our own setTranslate calls),
      // not just user-triggered slide changes — listening to those caused a
      // pause/resume race that could starve autoplay indefinitely. Drag and
      // explicit nav/dot clicks are unambiguous, so hook those directly.
      swiper.on("touchStart", function () { dragging = true; pause(); });
      swiper.on("touchEnd", function () { dragging = false; scheduleResume(); });
      if (prevBtn) prevBtn.addEventListener("click", function () { pause(); scheduleResume(); });
      if (nextBtn) nextBtn.addEventListener("click", function () { pause(); scheduleResume(); });
      if (dotsEl) dotsEl.addEventListener("click", function (e) {
        if (e.target.closest(".swiper-pagination-bullet")) { pause(); scheduleResume(); }
      });

      root.addEventListener("mouseenter", function () { hovering = true; });
      root.addEventListener("mouseleave", function () {
        hovering = false;
        // If a drag/nav resume timer already fired *while* still hovering, it
        // correctly declined to resume — nothing else would ever re-arm it.
        // Leaving hover is itself a reason to give resuming another chance.
        if (!playing && !dragging) scheduleResume();
      });

      var last = performance.now();
      var sinceLoopFix = 0;
      function frame(now) {
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (playing && !dragging && !swiper.animating && !(opts.pauseOnHover && hovering)) {
          var delta = dir * opts.speed * dt;
          swiper.setTranslate(swiper.translate + delta);
          swiper.updateProgress();
          swiper.updateActiveIndex();
          swiper.updateSlidesClasses();
          // Calling loopFix() every frame confuses Swiper's own transition
          // events (it looked like a real interaction and killed autoplay
          // for good) — only re-fix occasionally, well before we'd run past
          // the pre-cloned loop buffer.
          if (opts.loop) {
            sinceLoopFix += Math.abs(delta);
            if (sinceLoopFix > 300) {
              sinceLoopFix = 0;
              swiper.loopFix();
            }
          }
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
  function initOne(configEl) {
    if (configEl.dataset.sqccReady) return;
    var opts = readOptions(configEl);

    var slidesData = opts.images ? parseImages(opts.images) : null;

    if (!slidesData) {
      var gallery = findGallery(opts, configEl);
      if (!gallery) return; // let the retry loop try again later
      slidesData = collectFromGallery(gallery);
      if (!slidesData.length) return;
      gallery.setAttribute("data-sqcc-sb-source", "1");
      gallery.style.display = "none"; // hide the original; banner replaces it
    }

    configEl.dataset.sqccReady = "1";
    ensureSwiper(function () { build(configEl, opts, slidesData); });
  }

  function initAll() {
    var nodes = document.querySelectorAll('[data-sqcc-plugin="' + PLUGIN + '"]');
    Array.prototype.forEach.call(nodes, function (el) { initOne(el); });
  }

  /* =========================================================================
   * HELPERS
   * ========================================================================= */
  function padForLoop(data) {
    var MIN_SLIDES = 16;
    if (!data.length || data.length >= MIN_SLIDES) return data;
    var out = [];
    var i = 0;
    while (out.length < MIN_SLIDES) {
      out.push(data[i % data.length]);
      i++;
    }
    return out;
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
    // Safety net: never wait forever.
    setTimeout(function () { if (!done) { done = true; cb(); } }, 3000);
  }

  // Galleries can render a tick after DOMContentLoaded — retry briefly.
  function initWithRetry() {
    initAll();
    var tries = 0;
    var iv = setInterval(function () {
      var pending = document.querySelectorAll(
        '[data-sqcc-plugin="' + PLUGIN + '"]:not([data-sqcc-ready])'
      );
      if (!pending.length || ++tries > 20) { clearInterval(iv); return; }
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
