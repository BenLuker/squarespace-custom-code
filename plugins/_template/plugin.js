/**
 * Plugin: _template  (in-place widget pattern — the Squarespace standard)
 *
 * The buyer drops a marker element into a Code Block with data-* options:
 *
 *   <div data-sqcc-plugin="_template"
 *        data-text="Hello world"
 *        data-color="#c9a227"></div>
 *
 * This script finds every element with data-sqcc-plugin="_template", reads its
 * data-* attributes (via el.dataset), fills in defaults for anything missing,
 * and renders in place. No JS editing required by the user.
 *
 * To make a new plugin: copy this file, change PLUGIN below to your plugin
 * name, define OPTION_SCHEMA, and write render().
 */
(function () {
  "use strict";

  var PLUGIN = "_template"; // must match data-sqcc-plugin="..."

  // Declare each option once: its default and how to parse the string value.
  // Parsers turn the always-string data-* value into the type you want.
  var OPTION_SCHEMA = {
    text: { default: "Hello world", parse: asString },
    color: { default: "#111111", parse: asString },
    // count:   { default: 3,     parse: asInt },
    // enabled: { default: true,  parse: asBool },
  };

  // --- parsers ---
  function asString(v) {
    return v;
  }
  function asInt(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? undefined : n;
  }
  function asBool(v) {
    return v === "true" || v === "" || v === "1";
  }

  // Merge defaults with whatever attributes the user actually set.
  function readOptions(el) {
    var opts = {};
    Object.keys(OPTION_SCHEMA).forEach(function (key) {
      var schema = OPTION_SCHEMA[key];
      var raw = el.dataset[key]; // data-text -> dataset.text
      var parsed = raw != null ? schema.parse(raw) : undefined;
      opts[key] = parsed !== undefined ? parsed : schema.default;
    });
    return opts;
  }

  // Build the widget's DOM inside the marker element.
  function render(el, opts) {
    el.textContent = opts.text;
    el.style.color = opts.color;
  }

  function initAll() {
    var nodes = document.querySelectorAll('[data-sqcc-plugin="' + PLUGIN + '"]');
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.dataset.sqccReady) return; // don't init the same element twice
      el.dataset.sqccReady = "1";
      render(el, readOptions(el));
    });
  }

  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
    window.addEventListener("mercury:load", fn); // Squarespace AJAX transitions
  }

  ready(initAll);
})();
