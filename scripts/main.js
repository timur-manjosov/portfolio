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
     Hero signature: a Lissajous curve (x = sin(a·t + delta), y = sin(b·t))
     that draws itself in, then hands off to a slow continuous drift —
     delta breathes around its base value, b eases toward a value nudged
     by pointer position. Every frame is still a real member of the same
     curve family, never an arbitrary wobble. Reduced motion leaves the
     hand-authored static path (a = 3, b = 2, delta = pi/2) untouched.
     -------------------------------------------------------------------- */

  var HERO_A = 3;
  var HERO_B_BASE = 2;
  var HERO_DELTA_BASE = Math.PI / 2;
  var HERO_NUM_POINTS = 120;
  var HERO_CX = 120;
  var HERO_CY = 120;
  var HERO_R = 96;

  function lissajousPath(a, b, delta, numPoints, cx, cy, r) {
    var parts = [];
    var step = (Math.PI * 2) / numPoints;
    for (var i = 0; i <= numPoints; i++) {
      var t = i * step;
      var x = cx + r * Math.sin(a * t + delta);
      var y = cy + r * Math.sin(b * t);
      parts.push((i === 0 ? "M" : "L") + " " + x.toFixed(2) + " " + y.toFixed(2));
    }
    return parts.join(" ") + " Z";
  }

  function startHeroDrift(path, heroFigure) {
    var active = true;
    var looping = false;
    var frame = 0;
    var start = null;
    var currentB = HERO_B_BASE;
    var targetB = HERO_B_BASE;

    function onPointerMove(e) {
      if (!heroFigure) return;
      var rect = heroFigure.getBoundingClientRect();
      var half = rect.width / 2 || 1;
      var rel = (e.clientX - (rect.left + half)) / half;
      rel = Math.max(-1, Math.min(1, rel));
      targetB = HERO_B_BASE + rel * 0.22;
    }

    function onPointerLeave() {
      targetB = HERO_B_BASE;
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    if (heroFigure) heroFigure.addEventListener("pointerleave", onPointerLeave, { passive: true });

    function tick(ts) {
      if (!active) {
        looping = false;
        return;
      }
      if (start === null) start = ts;
      frame++;

      // Throttled to ~20fps: the drift is slow enough that a higher
      // rate would burn frames without being perceptibly smoother.
      if (frame % 3 === 0) {
        var elapsed = (ts - start) / 1000;
        var delta = HERO_DELTA_BASE + Math.sin(elapsed * 0.12) * 0.35;
        currentB += (targetB - currentB) * 0.04;
        path.setAttribute(
          "d",
          lissajousPath(HERO_A, currentB, delta, HERO_NUM_POINTS, HERO_CX, HERO_CY, HERO_R)
        );
      }

      requestAnimationFrame(tick);
    }

    function resume() {
      if (looping || !active) return;
      looping = true;
      start = null;
      requestAnimationFrame(tick);
    }

    document.addEventListener("visibilitychange", function () {
      active = !document.hidden;
      if (active) resume();
    });

    if ("IntersectionObserver" in window && heroFigure) {
      var io = new IntersectionObserver(
        function (entries) {
          active = entries[0].isIntersecting && !document.hidden;
          if (active) resume();
        },
        { threshold: 0 }
      );
      io.observe(heroFigure);
    }

    resume();
  }

  function initHeroSignature() {
    if (prefersReducedMotion()) return;
    var path = document.querySelector(".hero-figure path");
    var heroFigure = document.querySelector(".hero-figure");
    if (!path || typeof path.getTotalLength !== "function") return;

    var length;
    try {
      length = path.getTotalLength();
    } catch (e) {
      return;
    }

    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        path.style.transition = "stroke-dashoffset 1400ms ease";
        path.style.strokeDashoffset = "0";
      });
    });

    window.setTimeout(function () {
      path.style.transition = "";
      path.style.strokeDasharray = "none";
      path.style.strokeDashoffset = "0";
      startHeroDrift(path, heroFigure);
    }, 1450);
  }

  /* --------------------------------------------------------------------
     Lattice parallax: the coordinate grid drifts a few px toward the
     pointer. Purely a background-position nudge (no layout cost); CSS
     eases it back via transition, so this just sets two custom
     properties, throttled to one write per animation frame.
     -------------------------------------------------------------------- */

  function initLatticeParallax() {
    if (prefersReducedMotion()) return;
    var root = document.documentElement;
    var ticking = false;
    var maxShift = 6;

    window.addEventListener(
      "pointermove",
      function (e) {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var nx = (e.clientX / window.innerWidth) * 2 - 1;
          var ny = (e.clientY / window.innerHeight) * 2 - 1;
          root.style.setProperty("--lattice-shift-x", (nx * maxShift).toFixed(1) + "px");
          root.style.setProperty("--lattice-shift-y", (ny * maxShift).toFixed(1) + "px");
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  function initScrollReveal() {
    if (prefersReducedMotion()) return;
    if (!("IntersectionObserver" in window)) return;

    var targets = document.querySelectorAll("#about, #projects, #sport, #contact");
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

  revealHeroContent();
  initHeroSignature();
  initScrollReveal();
  initLatticeParallax();
})();
