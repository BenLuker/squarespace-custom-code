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
 *   original gallery, and renders the banner inside the config element as an
 *   Embla Carousel (https://www.embla-carousel.com) instance — Embla is loaded
 *   from jsDelivr at runtime if it isn't already on the page, so the Squarespace
 *   install stays a single link/div/script snippet. Embla is headless (ships no
 *   CSS of its own, unlike Swiper) and handles drag/momentum/snap physics; the
 *   continuous idle auto-scroll — a marquee, not the slide-to-slide paging every
 *   carousel library ships as "autoplay" — is driven by reaching directly into
 *   Embla's internal engine every animation frame and nudging its scroll
 *   location, target, loop bookkeeping, and translate together in one step, the
 *   same technique Shopify's own theme uses for its auto-scrolling image rails.
 *   Calling only a library's public API in a tight per-frame loop fights its own
 *   drag/settle machinery instead of cooperating with it — that fight is what
 *   shows up as stutter.
 *
 * OPTIONS  (every data-* is optional; see ./README.md for the full table)
 *   data-gallery         CSS selector of the source gallery (default: first gallery found)
 *   data-images          explicit "url | link | alt" list (newline or ;) — overrides gallery
 *   data-height          banner height in px, or "auto" to fill the height of the
 *                        containing Fluid Engine block/section instead of a fixed
 *                        px value (default 200)
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
 *   data-resume-delay     ms to hold, once drag/snap/scrollTo motion settles, before
 *                          auto-scroll resumes (default 2500)
 *   data-radius           image corner radius in px (default 8)
 *   data-fade-edges       fade the left/right edges (default false)
 *   data-full-bleed       stretch edge-to-edge past the content column, 100vw (default true)
 */
(function () {
  "use strict";

  var PLUGIN = "scrolling-banner";
  var EMBLA_VERSION = "8.6.0";
  var EMBLA_JS = "https://cdn.jsdelivr.net/npm/embla-carousel@" + EMBLA_VERSION + "/embla-carousel.umd.js";

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
      heightAuto: d.height === "auto",
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
   * BUILD + RUN ONE BANNER
   * ========================================================================= */
  function build(configEl, opts, slidesData) {
    configEl.style.display = "";

    // Embla's loop mode repositions the real slide nodes at the boundary
    // rather than cloning like Swiper does — but our own continuous per-frame
    // engine nudging (below) bypasses the normal drag/settle path that
    // repositioning is triggered from, so there needs to be a real DOM width
    // buffer ahead of the advancing position at all times. Pad the unique set
    // first (small galleries), then duplicate the whole real slide set once
    // after the DOM is built and measured — same fix Shopify's theme uses for
    // its own continuously-nudged Embla instances.
    if (opts.loop) slidesData = padForLoop(slidesData);

    var single = slidesData.length <= 1;

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
    if (opts.drag && !single) root.classList.add("sqcc-sb-draggable");

    // Embla's own convention: a "viewport" (the overflow-hidden clipping
    // window, passed to EmblaCarousel()) containing a single "container"
    // (the flex row that gets translated) whose children are the slides.
    var viewportEl = document.createElement("div");
    viewportEl.className = "sqcc-sb-viewport";
    var containerEl = document.createElement("div");
    containerEl.className = "sqcc-sb-container";
    viewportEl.appendChild(containerEl);
    root.appendChild(viewportEl);

    // Spacing from the active edge for left/right alignment: Embla has no
    // "slidesOffsetBefore/After" option like Swiper — the documented way to
    // offset the first/last snap point is padding on the viewport itself.
    if (opts.align === "left" && opts.alignGap) viewportEl.style.paddingLeft = opts.alignGap + "px";
    if (opts.align === "right" && opts.alignGap) viewportEl.style.paddingRight = opts.alignGap + "px";

    function makeSlide(data) {
      var slide = document.createElement("div");
      slide.className = "sqcc-sb-slide";
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
    slidesData.forEach(function (data) { containerEl.appendChild(makeSlide(data)); });

    // Controls
    var prevBtn, nextBtn, dotsEl;
    if (opts.controls && !single) {
      prevBtn = ctrlButton("prev", "Previous");
      nextBtn = ctrlButton("next", "Next");
      root.appendChild(prevBtn);
      root.appendChild(nextBtn);
    }
    if (opts.dots && !single) {
      dotsEl = document.createElement("div");
      dotsEl.className = "sqcc-sb-dots";
      root.appendChild(dotsEl);
    }

    configEl.innerHTML = "";
    configEl.appendChild(root);

    // Squarespace page builders (Fluid Engine) position blocks in an
    // absolutely-placed, often narrow/off-center canvas column — the classic
    // `left:50%; margin-left:-50vw` breakout assumes the containing block is
    // itself centered in the viewport, which isn't true there, and silently
    // shifts the banner off to one side instead of reaching the edges.
    // Measuring the real offset and compensating directly always works.
    if (opts.fullBleed) {
      var applyFullBleed = function () {
        root.style.width = "";
        root.style.marginLeft = "";
        var left = root.getBoundingClientRect().left;
        root.style.width = document.documentElement.clientWidth + "px";
        root.style.marginLeft = -left + "px";
      };
      applyFullBleed();
      window.addEventListener("resize", debounce(applyFullBleed, 150));
    }

    // data-height="auto": fill the containing Fluid Engine block's own
    // height instead of a fixed px value, so resizing the block (its resize
    // handles in the page editor) is what controls the banner's height.
    if (opts.heightAuto) {
      var blockEl = findBlockAncestor(configEl);
      var applyFullHeight = function () {
        if (!blockEl) return;
        root.style.setProperty("--sqcc-sb-height", blockEl.getBoundingClientRect().height + "px");
      };
      applyFullHeight();
      window.addEventListener("resize", debounce(applyFullHeight, 150));
    }

    // Embla (like Swiper) measures slide widths at init from the live DOM —
    // wait for images to load first, or every slide measures near-zero and
    // the loop/snap math falls apart.
    whenImagesReady(containerEl, function () {
      if (single) {
        root.classList.add("is-ready");
      } else {
        initEmbla();
      }
      if (opts.fullBleed) applyFullBleed();
      if (opts.heightAuto) applyFullHeight();
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

    function sizeSlide(slide) {
      // A fixed px flex-basis, read from the slide's own rendered image
      // width — Embla measures each slide once at init via
      // getBoundingClientRect(), and an unconstrained flex item can race the
      // image's intrinsic-size layout, especially for the clones appended a
      // moment later (cloneNode copies inline styles, not layout timing). A
      // fixed basis makes that measurement, and the loop math built on top
      // of it, deterministic.
      var img = slide.querySelector("img");
      slide.style.flex = "0 0 " + img.getBoundingClientRect().width + "px";
    }

    function initEmbla() {
      var realSlides = Array.prototype.slice.call(containerEl.children);
      realSlides.forEach(sizeSlide);

      // ---- Embla instance: headless — options in, no built-in CSS or UI ----
      var embla = window.EmblaCarousel(viewportEl, {
        loop: opts.loop,
        axis: "x",
        direction: "ltr",
        align: opts.align === "center" ? "center" : (opts.align === "right" ? "end" : "start"),
        draggable: opts.drag,
        dragFree: !opts.snap, // snap=true → normal snap-to-nearest drag; snap=false → free momentum glide
        slidesToScroll: 1,
      });

      if (opts.loop) {
        // Duplicate the real slide set once for a real DOM width buffer,
        // then reInit so Embla's loop math accounts for the doubled content
        // — the same trick Shopify's theme uses for a continuously-nudged
        // Embla instance.
        realSlides.forEach(function (slide) {
          containerEl.appendChild(slide.cloneNode(true));
        });
        embla.reInit();
      }

      /* ---- continuous idle auto-scroll (the one thing no carousel library ships) ---- */
      var playing = opts.autoplay;
      var hovering = false;
      var dragging = false;
      var resumeTimer = null;
      var dirSign = opts.direction === "right" ? 1 : -1;

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

      // Genuine user interaction pauses autoplay: drag start and explicit
      // nav/dot clicks. Resuming waits for Embla's own "settle" event — the
      // same physics-settled signal Shopify's theme resumes on — instead of
      // starting the resume-delay hold the instant you let go or click.
      // Embla's own release momentum (data-snap="false") or snap/scrollTo
      // animation (arrows, dots, data-snap="true") is still actively moving
      // the carousel for a while after that instant; starting our hold timer
      // early enough to resume before that motion is done would have our own
      // per-frame nudging fight Embla's still-running animation for control
      // of the same transform.
      embla.on("pointerDown", function () {
        dragging = true;
        root.classList.add("is-dragging");
        pause();
      });
      embla.on("pointerUp", function () {
        dragging = false;
        root.classList.remove("is-dragging");
      });
      embla.on("settle", function () {
        if (!playing && !dragging) scheduleResume();
      });
      if (prevBtn) prevBtn.addEventListener("click", function () { embla.scrollPrev(); pause(); });
      if (nextBtn) nextBtn.addEventListener("click", function () { embla.scrollNext(); pause(); });

      // Arrows: disable at the ends when not looping (loop mode can always
      // scroll further, so they stay enabled).
      function syncArrows() {
        if (!prevBtn && !nextBtn) return;
        if (prevBtn) prevBtn.disabled = !embla.canScrollPrev();
        if (nextBtn) nextBtn.disabled = !embla.canScrollNext();
      }
      embla.on("select", syncArrows).on("init", syncArrows).on("reInit", syncArrows);
      syncArrows();

      // Dots: Embla ships no pagination UI (unlike Swiper) — build bullets
      // straight off its scroll-snap list and keep the active one in sync.
      if (dotsEl) {
        var dotEls = embla.scrollSnapList().map(function (_, i) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "sqcc-sb-dot";
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
        // If a drag/nav resume timer already fired *while* still hovering, it
        // correctly declined to resume — nothing else would ever re-arm it.
        // Leaving hover is itself a reason to give resuming another chance.
        if (!playing && !dragging) scheduleResume();
      });

      var last = performance.now();
      function frame(now) {
        var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        if (playing && !dragging && !(opts.pauseOnHover && hovering)) {
          // Reach directly into Embla's internal engine, same as Shopify's
          // own auto-scrolling rails: nudge the scroll location, keep the
          // target in sync so nothing fights it on the next user
          // interaction, let Embla's own loop/slide-loop bookkeeping
          // reposition anything that crossed a boundary, then force an
          // immediate (non-eased) render. This is the whole reason the
          // marquee doesn't stutter — Embla's public scrollTo()/settle path
          // is built for occasional discrete moves, not a continuous nudge
          // every frame, and driving it only through that public API fights
          // it instead of cooperating with it. animation.render(1) is the
          // same "flush to the DOM now" step Embla's own drag loop uses
          // internally, called with alpha=1 (fully caught up, no lag) so it
          // never falls behind our own per-frame nudges the way starting
          // Embla's self-paced animation loop would.
          var engine = embla.internalEngine();
          engine.location.add(dirSign * opts.speed * dt);
          engine.target.set(engine.location);
          if (opts.loop) {
            engine.scrollLooper.loop(dirSign);
            engine.slideLooper.loop();
          } else {
            // No loop buffer to fall back on: stop cleanly at the edge
            // instead of scrolling on into blank space forever.
            var pos = engine.location.get();
            if (pos <= engine.limit.min || pos >= engine.limit.max) {
              engine.location.set(engine.limit.constrain(pos));
              engine.target.set(engine.location);
              pause();
            }
          }
          engine.animation.render(1);
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      // Click-through prevention: a drag release should never fire a link's
      // click, only a genuine tap/click — Embla exposes exactly that
      // distinction itself.
      Array.prototype.forEach.call(containerEl.querySelectorAll("a.sqcc-sb-slide-inner"), function (link) {
        link.addEventListener("click", function (e) {
          if (!embla.clickAllowed()) { e.preventDefault(); e.stopImmediatePropagation(); }
        });
      });

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
    ensureEmbla(function () { build(configEl, opts, slidesData); });
  }

  function initAll() {
    var nodes = document.querySelectorAll('[data-sqcc-plugin="' + PLUGIN + '"]');
    Array.prototype.forEach.call(nodes, function (el) { initOne(el); });
  }

  /* =========================================================================
   * HELPERS
   * ========================================================================= */
  // Walk up from the config element to the Fluid Engine block that contains
  // it (its resize handles in the page editor) — a page builder's own block
  // boundary, not any particular wrapper div, so ancestor markup can shift
  // between templates without breaking this.
  function findBlockAncestor(el) {
    var node = el.parentElement;
    while (node && node !== document.body) {
      var cls = node.className;
      if (typeof cls === "string" && /(^|\s)fe-block(\s|$)/.test(cls)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function padForLoop(data) {
    // Half of the old threshold: the real slide set gets duplicated once
    // more in initEmbla() for the continuous-scroll DOM buffer, so this only
    // needs to get small galleries up to a reasonable *pre-doubling* count.
    var MIN_SLIDES = 8;
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
