/**
 * Plugin: scrolling-banner
 * An infinitely scrolling image banner (marquee) built from an existing
 * Squarespace gallery. It auto-scrolls; grab-and-drag to scrub to any image and
 * it snaps that image to the active edge, holds for a beat, then resumes.
 *
 * HOW IT WORKS
 *   You drop a Gallery (Section or Block) on the page for the images, then add a
 *   Code Block with a config element that points at that gallery:
 *
 *     <div data-sqcc-plugin="scrolling-banner" data-gallery="#hero-strip"></div>
 *
 *   The script reads every image out of that gallery (URL, link, alt), hides the
 *   original gallery, and renders the banner inside the config element. One set
 *   of slides is measured, then cloned enough times to loop seamlessly. Motion is
 *   a single requestAnimationFrame loop translating the track; looping is a modulo
 *   over one set's width, so it never hits an end.
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
 *   data-align           active alignment on snap: "left" | "center" | "right" (default left)
 *   data-align-gap       spacing from the active edge when anchored, px (default 24)
 *   data-controls        show next/previous arrows (default true)
 *   data-dots            show pagination dots (default false)
 *   data-drag            enable click-drag scrubbing (default true)
 *   data-pause-on-hover  pause auto-scroll while hovered (default true)
 *   data-resume-delay    ms to hold on an image after interaction before resuming (default 2500)
 *   data-radius          image corner radius in px (default 8)
 *   data-fade-edges      fade the left/right edges (default false)
 */
(function () {
  "use strict";

  var PLUGIN = "scrolling-banner";

  /* =========================================================================
   * PURE GEOMETRY  (no DOM — unit-tested in node via module.exports below)
   * All positions are in "track pixels". `offset` is how far the track has
   * scrolled: a track point at x maps to screen x = x - offset.
   * ========================================================================= */

  // Keep offset inside [0, setWidth) so the modular track stays in range.
  function wrap(offset, setWidth) {
    if (!(setWidth > 0)) return 0;
    var m = offset % setWidth;
    return m < 0 ? m + setWidth : m;
  }

  // Screen x where slide i's left edge should land, given alignment.
  // viewport = visible width, w = that slide's width.
  function anchorX(align, alignGap, viewport, w) {
    if (align === "center") return Math.max(0, (viewport - w) / 2);
    if (align === "right") return Math.max(0, viewport - w - alignGap);
    return alignGap; // left
  }

  // Offset (unwrapped, nearest to `ref`) that anchors slide i.
  //   lefts[i]  = left edge of slide i within one set
  //   widths[i] = width of slide i
  function offsetForIndex(i, lefts, widths, align, alignGap, viewport, setWidth, ref) {
    var base = lefts[i] - anchorX(align, alignGap, viewport, widths[i]);
    return nearestPeriodic(base, ref || 0, setWidth);
  }

  // Return `base + k*period` closest to `ref`.
  function nearestPeriodic(base, ref, period) {
    if (!(period > 0)) return base;
    var k = Math.round((ref - base) / period);
    return base + k * period;
  }

  // Which slide is currently closest to the active anchor, for arrow stepping.
  function activeIndex(offset, lefts, widths, align, alignGap, viewport, setWidth) {
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < lefts.length; i++) {
      var target = wrap(lefts[i] - anchorX(align, alignGap, viewport, widths[i]), setWidth);
      var d = Math.abs(shortestGap(wrap(offset, setWidth), target, setWidth));
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  // Signed shortest distance from a to b on a ring of circumference period.
  function shortestGap(a, b, period) {
    var d = b - a;
    d = ((d % period) + period) % period;
    if (d > period / 2) d -= period;
    return d;
  }

  var GEO = {
    wrap: wrap,
    anchorX: anchorX,
    nearestPeriodic: nearestPeriodic,
    shortestGap: shortestGap,
    offsetForIndex: offsetForIndex,
    activeIndex: activeIndex,
  };

  // In node (tests) there's no document — export and stop.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = GEO;
    if (typeof document === "undefined") return;
  }

  /* =========================================================================
   * OPTIONS
   * ========================================================================= */
  function asStr(v) { return v; }
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
      pauseOnHover: d.pauseOnHover != null ? asBool(d.pauseOnHover) : true,
      resumeDelay: asInt(d.resumeDelay, 2500),
      radius: asInt(d.radius, 8),
      fadeEdges: d.fadeEdges != null ? asBool(d.fadeEdges) : false,
    };
  }

  /* =========================================================================
   * READING THE SOURCE GALLERY
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
   * BUILD + RUN ONE BANNER
   * ========================================================================= */
  function build(configEl, opts, slidesData) {
    configEl.style.display = "";

    // ---- DOM ----
    var root = document.createElement("div");
    root.className = "sqcc-scrolling-banner";
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    root.setAttribute("aria-label", configEl.getAttribute("aria-label") || "Image banner");
    root.tabIndex = 0;
    root.style.setProperty("--sqcc-sb-height", opts.height + "px");
    root.style.setProperty("--sqcc-sb-gap", opts.gap + "px");
    root.style.setProperty("--sqcc-sb-radius", opts.radius + "px");
    if (opts.fadeEdges) root.classList.add("sqcc-sb-fade");
    root.classList.add("sqcc-sb-align-" + opts.align);

    var viewportEl = document.createElement("div");
    viewportEl.className = "sqcc-sb-viewport";

    var track = document.createElement("div");
    track.className = "sqcc-sb-track";
    viewportEl.appendChild(track);
    root.appendChild(viewportEl);

    // Build ONE set of slides.
    function makeSlide(data) {
      var slide = document.createElement(data.href ? "a" : "div");
      slide.className = "sqcc-sb-slide";
      if (data.href) {
        slide.href = data.href;
        slide.setAttribute("draggable", "false");
      }
      var img = document.createElement("img");
      img.className = "sqcc-sb-img";
      img.src = data.src;
      img.alt = data.alt;
      img.setAttribute("draggable", "false");
      img.loading = "eager";
      slide.appendChild(img);
      return slide;
    }
    slidesData.forEach(function (data) { track.appendChild(makeSlide(data)); });

    // Controls
    var prevBtn, nextBtn, dotsWrap;
    if (opts.controls) {
      prevBtn = ctrlButton("prev", "Previous");
      nextBtn = ctrlButton("next", "Next");
      root.appendChild(prevBtn);
      root.appendChild(nextBtn);
    }
    if (opts.dots) {
      dotsWrap = document.createElement("div");
      dotsWrap.className = "sqcc-sb-dots";
      slidesData.forEach(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "sqcc-sb-dot";
        dot.setAttribute("aria-label", "Go to image " + (i + 1));
        dot.addEventListener("click", function () { userSnapTo(i); });
        dotsWrap.appendChild(dot);
      });
      root.appendChild(dotsWrap);
    }

    configEl.innerHTML = "";
    configEl.appendChild(root);

    function ctrlButton(dir, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sqcc-sb-arrow sqcc-sb-arrow-" + dir;
      b.setAttribute("aria-label", label);
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
        '<path d="' + (dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") +
        '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      b.addEventListener("click", function () { step(dir === "next" ? 1 : -1); });
      return b;
    }

    /* ---- geometry state ---- */
    var lefts = [], widths = [], setWidth = 0, viewportW = 0;
    var n = slidesData.length;

    function measure() {
      viewportW = viewportEl.clientWidth;
      var slides = track.querySelectorAll(".sqcc-sb-slide");
      lefts = []; widths = [];
      var x = 0;
      for (var i = 0; i < n; i++) {
        var w = slides[i].getBoundingClientRect().width;
        lefts.push(x);
        widths.push(w);
        x += w + opts.gap;
      }
      setWidth = x; // includes trailing gap so copies butt together evenly
    }

    // Clone the set enough times to always cover viewport + one set.
    function fillClones() {
      // remove existing clones
      var clones = track.querySelectorAll(".sqcc-sb-clone");
      Array.prototype.forEach.call(clones, function (c) { c.remove(); });
      if (!(setWidth > 0) || !opts.loop) return;
      var copiesNeeded = Math.ceil((viewportW + setWidth) / setWidth) + 1;
      for (var c = 1; c < copiesNeeded; c++) {
        for (var i = 0; i < n; i++) {
          var clone = makeSlide(slidesData[i]);
          clone.classList.add("sqcc-sb-clone");
          clone.setAttribute("aria-hidden", "true");
          if (clone.tagName === "A") clone.tabIndex = -1;
          track.appendChild(clone);
        }
      }
    }

    /* ---- motion state ---- */
    var offset = 0;
    var playing = opts.autoplay;
    var hovering = false;
    var dragging = false;
    var tween = null;         // {from,to,start,dur}
    var resumeTimer = null;
    var dir = opts.direction === "right" ? -1 : 1;

    function apply() {
      var o = opts.loop ? wrap(offset, setWidth) : clampNoLoop(offset);
      offset = o;
      track.style.transform = "translate3d(" + (-o) + "px,0,0)";
      if (dotsWrap) updateDots();
    }

    function clampNoLoop(o) {
      var max = Math.max(0, setWidth - viewportW);
      return Math.min(max, Math.max(0, o));
    }

    function updateDots() {
      var active = GEO.activeIndex(offset, lefts, widths, opts.align, opts.alignGap, viewportW, setWidth);
      var dots = dotsWrap.children;
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle("is-active", i === active);
      }
    }

    /* ---- snapping ---- */
    function targetForIndex(i) {
      var base = lefts[i] - GEO.anchorX(opts.align, opts.alignGap, viewportW, widths[i]);
      return opts.loop ? GEO.nearestPeriodic(base, offset, setWidth) : clampNoLoop(base);
    }

    function startTween(to, dur) {
      tween = { from: offset, to: to, start: performance.now(), dur: dur || 420 };
    }

    function userSnapTo(i) {
      cancelResume();
      playing = false;
      startTween(targetForIndex(i));
      scheduleResume();
    }

    function step(delta) {
      var cur = GEO.activeIndex(offset, lefts, widths, opts.align, opts.alignGap, viewportW, setWidth);
      var next = cur + delta;
      if (opts.loop) next = ((next % n) + n) % n;
      else next = Math.min(n - 1, Math.max(0, next));
      userSnapTo(next);
    }

    function scheduleResume() {
      if (!opts.autoplay) return;
      resumeTimer = setTimeout(function () {
        resumeTimer = null;
        if (!hovering) playing = true;
      }, opts.resumeDelay);
    }
    function cancelResume() {
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
    }

    /* ---- rAF loop ---- */
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (tween) {
        var t = (now - tween.start) / tween.dur;
        if (t >= 1) { offset = tween.to; tween = null; }
        else { offset = tween.from + (tween.to - tween.from) * easeOutCubic(t); }
        apply();
      } else if (playing && !dragging && !hoverPause()) {
        offset += dir * opts.speed * dt;
        apply();
      }
      raf = requestAnimationFrame(frame);
    }
    function hoverPause() { return opts.pauseOnHover && hovering; }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    /* ---- hover ---- */
    root.addEventListener("mouseenter", function () { hovering = true; });
    root.addEventListener("mouseleave", function () { hovering = false; });

    /* ---- drag to scrub ---- */
    var dragStartX = 0, dragStartOffset = 0, moved = 0, pointerId = null;
    if (opts.drag) {
      viewportEl.addEventListener("pointerdown", function (e) {
        if (e.button != null && e.button !== 0) return;
        dragging = true;
        tween = null;
        cancelResume();
        pointerId = e.pointerId;
        dragStartX = e.clientX;
        dragStartOffset = offset;
        moved = 0;
        root.classList.add("is-dragging");
        try { viewportEl.setPointerCapture(pointerId); } catch (_) {}
      });
      viewportEl.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var dx = e.clientX - dragStartX;
        moved = Math.max(moved, Math.abs(dx));
        offset = dragStartOffset - dx;
        apply();
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        root.classList.remove("is-dragging");
        try { viewportEl.releasePointerCapture(pointerId); } catch (_) {}
        // Snap the nearest image to the active edge, then hold.
        var i = GEO.activeIndex(offset, lefts, widths, opts.align, opts.alignGap, viewportW, setWidth);
        playing = false;
        startTween(targetForIndex(i));
        scheduleResume();
      }
      viewportEl.addEventListener("pointerup", endDrag);
      viewportEl.addEventListener("pointercancel", endDrag);
      // Swallow the click that follows a real drag so links don't fire.
      root.addEventListener("click", function (e) {
        if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; }
      }, true);
    }

    /* ---- keyboard ---- */
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
    });

    /* ---- resize ---- */
    var ro;
    function relayout() {
      var frac = setWidth > 0 ? offset / setWidth : 0;
      measure();
      fillClones();
      offset = frac * setWidth; // keep roughly the same scroll position
      apply();
    }
    if (window.ResizeObserver) {
      ro = new ResizeObserver(debounce(relayout, 150));
      ro.observe(viewportEl);
    } else {
      window.addEventListener("resize", debounce(relayout, 150));
    }

    /* ---- go: wait for images, then measure + start ---- */
    var raf;
    whenImagesReady(track, function () {
      measure();
      fillClones();
      apply();
      raf = requestAnimationFrame(frame);
      root.classList.add("is-ready");
    });
  }

  /* =========================================================================
   * HELPERS
   * ========================================================================= */
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

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
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
    build(configEl, opts, slidesData);
  }

  function initAll() {
    var nodes = document.querySelectorAll('[data-sqcc-plugin="' + PLUGIN + '"]');
    Array.prototype.forEach.call(nodes, function (el) { initOne(el); });
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
