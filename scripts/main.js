// Progressive enhancement only: every branch below assumes the page
// already works with this file absent (content visible, GitHub links
// live, default English copy, dark/light following the OS setting).

(function () {
  "use strict";

  /* --------------------------------------------------------------------
     Small safe helpers
     -------------------------------------------------------------------- */

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* Storage may be unavailable (private mode, disabled) — the toggle
         still works for the current page view, it just won't persist. */
    }
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* --------------------------------------------------------------------
     Theme: dark/light via [data-theme] on <html>.
     A saved choice (localStorage) always wins; absent that, the live
     result of prefers-color-scheme governs — both are already wired up
     in main.css, this just keeps the toggle's own label/state truthful.
     -------------------------------------------------------------------- */

  var themeToggleBtn = document.getElementById("theme-toggle");

  var THEME_LABELS = {
    en: { toLight: "Switch to light theme", toDark: "Switch to dark theme" },
    de: { toLight: "Zu hellem Design wechseln", toDark: "Zu dunklem Design wechseln" },
  };

  function getEffectiveTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  /* --------------------------------------------------------------------
     Language: DE/EN via data-en/data-de attributes set up in Phase 1.
     -------------------------------------------------------------------- */

  var langDeBtn = document.getElementById("lang-de");
  var langEnBtn = document.getElementById("lang-en");
  var langGroup = document.querySelector(".lang-toggle");

  function detectInitialLanguage() {
    var saved = storageGet("lang");
    if (saved === "de" || saved === "en") return saved;

    var nav = (navigator.language || "").toLowerCase();
    return nav.indexOf("de") === 0 ? "de" : "en";
  }

  var currentLang = detectInitialLanguage();

  /* --------------------------------------------------------------------
     One render pass keeps language and theme UI truthful together —
     both are re-derived from current state rather than tracked
     separately, so there's no ordering to get wrong between them.
     -------------------------------------------------------------------- */

  function render() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-en]").forEach(function (el) {
      el.textContent = currentLang === "de" ? el.dataset.de : el.dataset.en;
    });

    if (langGroup) {
      langGroup.setAttribute(
        "aria-label",
        currentLang === "de" ? langGroup.dataset.deLabel : langGroup.dataset.enLabel
      );
    }
    if (langDeBtn) langDeBtn.setAttribute("aria-pressed", String(currentLang === "de"));
    if (langEnBtn) langEnBtn.setAttribute("aria-pressed", String(currentLang === "en"));

    if (themeToggleBtn) {
      var theme = getEffectiveTheme();
      themeToggleBtn.setAttribute("aria-pressed", String(theme === "dark"));
      themeToggleBtn.textContent = THEME_LABELS[currentLang][theme === "dark" ? "toLight" : "toDark"];
    }
  }

  render();

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function () {
      var next = getEffectiveTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      storageSet("theme", next);
      render();
    });
  }

  function setLanguage(lang) {
    currentLang = lang;
    storageSet("lang", lang);
    render();
  }

  if (langDeBtn) langDeBtn.addEventListener("click", function () { setLanguage("de"); });
  if (langEnBtn) langEnBtn.addEventListener("click", function () { setLanguage("en"); });

  // Keep the toggle truthful if the OS theme changes mid-visit and the
  // visitor has never made an explicit choice of their own.
  if (window.matchMedia) {
    var scheme = window.matchMedia("(prefers-color-scheme: light)");
    if (scheme.addEventListener) scheme.addEventListener("change", render);
  }

  /* --------------------------------------------------------------------
     Motion. Everything here is additive: it only ever hides content that
     it will itself reveal a moment later, so a browser that skips a step
     (no IntersectionObserver, JS error, reduced motion) simply leaves the
     page in its normal, fully visible state.
     -------------------------------------------------------------------- */

  function revealHeroContent() {
    if (prefersReducedMotion()) return;
    var content = document.querySelector(".hero-content");
    if (!content) return;

    content.classList.add("reveal-init");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        content.classList.add("is-visible");
      });
    });
  }

  /* --------------------------------------------------------------------
     Generative dividers: one shared curve-drawing principle (a damped
     sine wave) instead of four identical hand-drawn axes. Each section's
     own id is hashed into that curve's frequency/phase/decay/amplitude,
     so every divider is a variation on the same idea rather than a
     repeat of it -- deterministic per id (stable across reloads), not
     randomized, matching the rest of the page's "precise, not decorative"
     use of math. Runs once at load; nothing here is reduced-motion-
     sensitive since it only ever sets a static path's `d`, the same as
     if it had been hand-authored -- the draw-on reveal is still handled
     entirely by main.css's existing .reveal-init/.is-visible rules.
     -------------------------------------------------------------------- */

  function hashSeed(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function dividerPathD(seed) {
    var freq = 1.4 + (seed % 100) / 100 * 2.2;
    var phase = ((seed >>> 8) % 100) / 100 * Math.PI * 2;
    var decay = 0.5 + ((seed >>> 16) % 100) / 100 * 1.5;
    var amp = 0.7 + ((seed >>> 24) % 100) / 100 * 1.1;

    var width = 34, baseY = 5, steps = 40;
    var d = "";
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = t * width;
      var y = baseY - amp * Math.exp(-decay * t * 3) * Math.sin(freq * t * Math.PI * 2 + phase);
      d += (i === 0 ? "M " : "L ") + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    return d.trim();
  }

  function initGenerativeDividers() {
    document.querySelectorAll(".section-divider .divider-line").forEach(function (path) {
      var section = path.closest("section");
      var seedSource = (section && section.id) || "divider";
      path.setAttribute("d", dividerPathD(hashSeed(seedSource)));
    });
  }

  function initScrollReveal() {
    if (prefersReducedMotion()) return;
    if (!("IntersectionObserver" in window)) return;

    var targets = document.querySelectorAll(
      "#chapter-1, #project-epiphyte, #chapter-2, #project-saeculum, #project-aura, #chapter-3, #contact"
    );
    targets.forEach(function (el) {
      el.classList.add("reveal-init");
    });

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  initGenerativeDividers();
  revealHeroContent();
  initScrollReveal();
})();
