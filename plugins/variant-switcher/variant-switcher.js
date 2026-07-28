/**
 * Plugin: variant-switcher
 * Lets a visitor pick options (e.g. form factor + flavor) and updates the page:
 * shows/hides sections, swaps words inline, swaps images, and repoints links.
 *
 * HOW IT WORKS
 *   The current selection is written to <html> as data-vs-<axis>="value".
 *   - Show/hide is CSS (elements are hidden until they match), so no flicker.
 *   - Word swap, image swap, and link swap run in JS on each change.
 *
 * CONFIG (in a Code Block — this element renders nothing):
 *   <div data-sqcc-plugin="variant-switcher"
 *        data-axes="form-factor,flavor"
 *        data-form-factor-options="capsule:Capsule,tablet:Tablet,powder:Powder"
 *        data-flavor-options="vanilla:Vanilla,berry:Mixed Berry,chocolate:Chocolate"
 *        data-form-factor-default="capsule"
 *        data-flavor-default="vanilla"
 *        data-remember="true"     <!-- persist choice in localStorage -->
 *        data-url="true"></div>    <!-- reflect choice in the URL query -->
 *
 * See ./README.md for the full attribute vocabulary used on page elements.
 */
(function () {
  "use strict";

  // ---------- small helpers ----------
  function splitList(str) {
    return (str || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  // "capsule:Capsule,tablet:Tablet" -> [{value,label}, ...]
  function parseOptions(str) {
    return splitList(str).map(function (pair) {
      var i = pair.indexOf(":");
      if (i === -1) return { value: pair, label: pair };
      return { value: pair.slice(0, i).trim(), label: pair.slice(i + 1).trim() };
    });
  }

  // Kebab attribute name -> dataset key. "vs-image-mixed-berry" -> "vsImageMixedBerry"
  function camel(str) {
    return str.replace(/-([a-z0-9])/gi, function (_, c) {
      return c.toUpperCase();
    });
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
    window.addEventListener("mercury:load", fn); // Squarespace AJAX transitions
  }

  // ---------- plugin ----------
  function boot() {
    var cfg = document.querySelector('[data-sqcc-plugin="variant-switcher"]');
    if (!cfg) return;
    cfg.style.display = "none";

    var axes = splitList(cfg.dataset.axes);
    if (!axes.length) return;

    // Per-axis options + label lookup.
    var options = {}; // axis -> [{value,label}]
    var labelOf = {}; // axis -> { value: label }
    axes.forEach(function (axis) {
      var raw = cfg.dataset[camel(axis) + "Options"];
      options[axis] = parseOptions(raw);
      labelOf[axis] = {};
      options[axis].forEach(function (o) { labelOf[axis][o.value] = o.label; });
    });

    var useUrl = cfg.dataset.url !== "false";
    var remember = cfg.dataset.remember !== "false";
    var storeKey = "sqcc-vs:" + location.pathname;

    // ---------- resolve initial state ----------
    // priority: URL param > stored > configured default > first option
    var stored = {};
    if (remember) {
      try { stored = JSON.parse(localStorage.getItem(storeKey)) || {}; }
      catch (e) { stored = {}; }
    }
    var params = new URLSearchParams(location.search);

    var state = {};
    axes.forEach(function (axis) {
      var valid = options[axis].map(function (o) { return o.value; });
      var pick =
        (useUrl && params.get(axis)) ||
        stored[axis] ||
        cfg.dataset[camel(axis) + "Default"] ||
        (options[axis][0] && options[axis][0].value);
      if (valid.indexOf(pick) === -1) pick = valid[0];
      state[axis] = pick;
    });

    // ---------- condition matching (show/hide) ----------
    // cond: "flavor:vanilla" | "form-factor:capsule;flavor:vanilla|berry"
    function matches(cond) {
      return splitList(cond.split(";").join(",")).every(function (clause) {
        var i = clause.indexOf(":");
        if (i === -1) return true;
        var axis = clause.slice(0, i).trim();
        var vals = clause.slice(i + 1).split("|").map(function (v) {
          return v.trim();
        });
        return vals.indexOf(state[axis]) !== -1;
      });
    }

    // ---------- text tokens ----------
    // Cache each text node's original template ({{axis}}) on first pass.
    var textNodes = [];
    function collectText() {
      textNodes = [];
      var hosts = document.querySelectorAll("[data-vs-text]");
      Array.prototype.forEach.call(hosts, function (host) {
        var walker = document.createTreeWalker(
          host,
          NodeFilter.SHOW_TEXT,
          null
        );
        var node;
        while ((node = walker.nextNode())) {
          if (node.__vsTpl == null) {
            if (node.nodeValue.indexOf("{{") === -1) continue;
            node.__vsTpl = node.nodeValue;
          }
          textNodes.push(node);
        }
      });
    }
    function applyText() {
      textNodes.forEach(function (node) {
        node.nodeValue = node.__vsTpl.replace(
          /\{\{\s*([\w-]+)\s*\}\}/g,
          function (m, axis) {
            if (state[axis] == null) return m;
            return (labelOf[axis] && labelOf[axis][state[axis]]) || state[axis];
          }
        );
      });
    }

    // ---------- attribute swaps (image src / link href) ----------
    function applySwaps(selector, axisAttr, apply) {
      var els = document.querySelectorAll(selector);
      Array.prototype.forEach.call(els, function (el) {
        var axis = el.getAttribute(axisAttr);
        if (!axis || state[axis] == null) return;
        var key = camel(axisAttr.replace("data-", "") + "-" + state[axis]);
        var val = el.dataset[key];
        if (val != null) apply(el, val);
      });
    }
    function applyImages() {
      applySwaps("[data-vs-image]", "data-vs-image", function (el, url) {
        if (el.tagName === "IMG") el.src = url;
        else el.style.backgroundImage = 'url("' + url + '")';
      });
    }
    function applyLinks() {
      applySwaps("[data-vs-link]", "data-vs-link", function (el, url) {
        el.setAttribute("href", url);
      });
    }

    // ---------- visibility ----------
    function applyVisibility() {
      Array.prototype.forEach.call(
        document.querySelectorAll("[data-vs-show]"),
        function (el) {
          el.classList.toggle("sqcc-vs-on", matches(el.getAttribute("data-vs-show")));
        }
      );
      Array.prototype.forEach.call(
        document.querySelectorAll("[data-vs-hide]"),
        function (el) {
          el.classList.toggle("sqcc-vs-on", matches(el.getAttribute("data-vs-hide")));
        }
      );
    }

    // ---------- controls ----------
    function renderControls() {
      Array.prototype.forEach.call(
        document.querySelectorAll("[data-vs-controls]"),
        function (host) {
          if (host.dataset.vsRendered) return;
          var axis = host.getAttribute("data-vs-controls");
          if (!options[axis]) return;
          host.dataset.vsRendered = "1";
          host.classList.add("sqcc-vs-controls");
          host.setAttribute("role", "group");
          options[axis].forEach(function (o) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "sqcc-vs-btn";
            b.textContent = o.label;
            b.setAttribute("data-vs-set", axis + ":" + o.value);
            host.appendChild(b);
          });
        }
      );
    }
    function syncControls() {
      Array.prototype.forEach.call(
        document.querySelectorAll("[data-vs-set]"),
        function (el) {
          var parts = el.getAttribute("data-vs-set").split(":");
          var on = state[parts[0]] === parts[1];
          el.classList.toggle("is-active", on);
          el.setAttribute("aria-pressed", on ? "true" : "false");
        }
      );
    }

    // ---------- apply everything ----------
    function apply() {
      axes.forEach(function (axis) {
        document.documentElement.setAttribute("data-vs-" + axis, state[axis]);
      });
      applyVisibility();
      applyText();
      applyImages();
      applyLinks();
      syncControls();

      if (remember) {
        try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch (e) {}
      }
      if (useUrl) {
        var p = new URLSearchParams(location.search);
        axes.forEach(function (axis) { p.set(axis, state[axis]); });
        history.replaceState(null, "", location.pathname + "?" + p.toString());
      }
      document.dispatchEvent(
        new CustomEvent("sqcc:variantchange", { detail: Object.assign({}, state) })
      );
    }

    function setState(axis, value) {
      if (state[axis] === value || !(axis in state)) return;
      state[axis] = value;
      apply();
    }

    // Expose this boot's setter so the single delegated handler always calls
    // the current page's state (avoids stacking stale handlers on AJAX reloads).
    window.__sqccVsSet = setState;
    if (!window.__sqccVsClick) {
      window.__sqccVsClick = true;
      document.addEventListener("click", function (e) {
        var setter = e.target.closest && e.target.closest("[data-vs-set]");
        if (!setter) return;
        var raw = setter.getAttribute("data-vs-set");
        var i = raw.indexOf(":");
        if (i === -1) return;
        e.preventDefault();
        if (window.__sqccVsSet) window.__sqccVsSet(raw.slice(0, i), raw.slice(i + 1));
      });
    }

    renderControls();
    collectText();
    apply();
  }

  ready(boot);
})();
