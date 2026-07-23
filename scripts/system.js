// Core generative engine. A full-page canvas whose content morphs, by
// scroll position, through several mathematical systems -- a De Jong
// attractor at the hero, a growing/fading L-system by Epiphyte's card, a
// generating cellular automaton by Saeculum's card, and a Fourier-
// epicycle signature ("TM") at the footer -- plus two small, independent
// preview canvases embedded in the project cards.
//
// Kept in four parts:
//   - Shared input:  pointer/disturbance/scroll state, common to every
//                    system below (Phase 1's state manager, unchanged
//                    in spirit, now consumed by more than one system).
//   - Systems:        each is { anchorEl, weight, update(), render(),
//                    renderStatic() }. `weight` is eased continuously
//                    from that system's own anchor's IntersectionObserver
//                    ratio, so scrolling between two anchors is a genuine
//                    crossfade (both render, weighted) rather than a swap.
//   - Loop:           one rAF driver: shared fade, update every system
//                    (cheap), render only those with non-negligible
//                    weight (the expensive part).
//   - Card previews:  two small canvases inside the project cards,
//                    independent of the systems above -- always fully on
//                    while visible, paused via their own
//                    IntersectionObserver when scrolled out of view.
(function () {
  "use strict";

  function prefersReducedMotion() {
    return (
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function ease(current, target, factor) {
    return current + (target - current) * factor;
  }

  /* --------------------------------------------------------------------
     Colour: resolve the live Nord custom properties (one of which is a
     color-mix() in the light theme) to concrete RGB by handing the CSS
     string to a scratch canvas and reading the pixel back -- reuses the
     browser's own color parser instead of a hand-rolled one. Shared by
     the background engine and the card previews alike.
     -------------------------------------------------------------------- */

  var swatch = document.createElement("canvas");
  swatch.width = 1;
  swatch.height = 1;
  var swatchCtx = swatch.getContext("2d");

  function resolveColor(cssValue, fallback) {
    swatchCtx.fillStyle = "#000";
    swatchCtx.fillStyle = cssValue || fallback;
    swatchCtx.fillRect(0, 0, 1, 1);
    var d = swatchCtx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  }

  function rgba(c, alpha) {
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + Math.max(0, alpha) + ")";
  }

  var colors = {
    canvas: { r: 46, g: 52, b: 64 },
    signal: { r: 136, g: 192, b: 208 },
  };

  // Pure "resolve and store" -- deliberately has no knowledge of
  // needsHardClear (that flag lives inside backgroundEngine below); the
  // theme-change call sites there are responsible for setting it, since
  // this function is also reachable at a point before backgroundEngine
  // has finished setting itself up.
  function readThemeColors() {
    var computed = getComputedStyle(document.documentElement);
    colors.canvas = resolveColor(computed.getPropertyValue("--color-canvas").trim(), "#2e3440");
    colors.signal = resolveColor(computed.getPropertyValue("--color-signal-ink").trim(), "#88c0d0");
  }

  /* --------------------------------------------------------------------
     Shared math: pure step/generator functions with no canvas or DOM
     dependency, used at two different scales (full background systems,
     and the small independent card-preview canvases below).
     -------------------------------------------------------------------- */

  // De Jong map: x' = sin(a*y) - cos(b*x), y' = sin(c*x) - cos(d*y).
  // Every term is a bounded sin()/cos(), so (x, y) stays in [-2, 2] for
  // ANY (a, b, c, d) -- see Phase 1 for the parameter search/robustness
  // sweep behind BASE_PARAMS and POINTER_AMPLITUDE below.
  function stepDeJong(x, y, p) {
    return [Math.sin(p.a * y) - Math.cos(p.b * x), Math.sin(p.c * x) - Math.cos(p.d * y)];
  }

  // L-system: classic Prusinkiewicz fractal-plant ruleset, chosen (over
  // a plain binary tree and other angles) from an offline render-and-
  // compare -- see chat log -- for the most organic, weed-like asymmetry.
  // Axiom X; X -> F+[[X]-X]-F[-FX]+X; F -> FF.
  var LSYS_AXIOM = "X";
  var LSYS_RULES = { X: "F+[[X]-X]-F[-FX]+X", F: "FF" };
  var LSYS_BASE_ANGLE = (25 * Math.PI) / 180;

  function expandLSystem(depth) {
    var s = LSYS_AXIOM;
    for (var i = 0; i < depth; i++) {
      var next = "";
      for (var j = 0; j < s.length; j++) {
        var ch = s[j];
        next += LSYS_RULES[ch] !== undefined ? LSYS_RULES[ch] : ch;
      }
      s = next;
    }
    return s;
  }

  // Turtle-interprets the string into a flat [x0,y0,x1,y1, ...] segment
  // list in unit-step local space (turtle "up" = +y) -- NOT scaled to
  // screen pixels here, so a resize never needs to recompute this, only
  // the origin/stepLen used when it's drawn.
  function turtleSegments(str, angleRad) {
    var x = 0, y = 0, heading = Math.PI / 2;
    var stack = [];
    var segs = [];
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (c === "F") {
        var nx = x + Math.cos(heading);
        var ny = y + Math.sin(heading);
        segs.push(x, y, nx, ny);
        x = nx; y = ny;
      } else if (c === "+") {
        heading += angleRad;
      } else if (c === "-") {
        heading -= angleRad;
      } else if (c === "[") {
        stack.push(x, y, heading);
      } else if (c === "]") {
        heading = stack.pop(); y = stack.pop(); x = stack.pop();
      }
    }
    return segs;
  }

  function strokeSegments(ctx, segs, revealCount, originX, originY, stepLen, style) {
    var n = Math.min(revealCount, segs.length / 4) * 4;
    if (n <= 0) return;
    ctx.strokeStyle = style;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < n; i += 4) {
      ctx.moveTo(originX + segs[i] * stepLen, originY - segs[i + 1] * stepLen);
      ctx.lineTo(originX + segs[i + 2] * stepLen, originY - segs[i + 3] * stepLen);
    }
    ctx.stroke();
  }

  // Elementary 1D cellular automaton (wrapped/toroidal boundary). Rule 90
  // chosen over 30/54/110/122/126, both from single-seed and random
  // starts, for the clearest "generated, structured" read (a crisp
  // fractal triangle) that contrasts with the L-system's organic curves
  // -- see chat log for the rendered comparison.
  var CA_RULE = 90;

  function stepCA(row) {
    var n = row.length;
    var next = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var l = row[(i - 1 + n) % n];
      var c = row[i];
      var r = row[(i + 1) % n];
      var idx = (l << 2) | (c << 1) | r;
      next[i] = (CA_RULE >> idx) & 1;
    }
    return next;
  }

  // Fourier epicycles: "TM" digitized as one continuous stroke (hand-
  // planned anchor points). A DFT reconstruction is inherently periodic,
  // so the path's very first and very last point are always joined by a
  // closing segment once every loop, whatever they are -- three routings
  // for that segment were rendered and compared (see chat log): straight
  // across the letters read as a stray diagonal ruining both letters,
  // while routing it as a swoop outside and under the letters reads as a
  // deliberate frame. The last three points below are that swoop, not
  // part of the letterforms themselves.
  var TM_ANCHORS = [
    [10, 10], [58, 10], [34, 10], [34, 95], // T: bar left->right, back to center, down the stem
    [70, 95], // baseline connector into M
    [70, 10], [100, 60], [130, 10], [130, 95], // M: up, valley, peak, down
    [70, 108], [-8, 100], [-8, 15], // return swoop: under the baseline, up the outside-left
  ];

  function densifyPath(anchors, targetCount) {
    var segLens = [], total = 0;
    for (var i = 0; i < anchors.length - 1; i++) {
      var len = Math.hypot(anchors[i + 1][0] - anchors[i][0], anchors[i + 1][1] - anchors[i][1]);
      segLens.push(len);
      total += len;
    }
    var pts = [];
    for (var s = 0; s < targetCount; s++) {
      var dist = (s / targetCount) * total;
      var acc = 0;
      for (i = 0; i < segLens.length; i++) {
        if (dist <= acc + segLens[i] || i === segLens.length - 1) {
          var f = segLens[i] > 0 ? (dist - acc) / segLens[i] : 0;
          f = Math.max(0, Math.min(1, f));
          var a = anchors[i], b = anchors[i + 1];
          pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
          break;
        }
        acc += segLens[i];
      }
    }
    return pts;
  }

  // Discrete Fourier transform of the complex sequence z_n = x_n + i*y_n,
  // re-indexed to signed frequencies in (-N/2, N/2] (so roughly half the
  // resulting circles rotate clockwise, half counter-clockwise -- the
  // standard epicycle convention) and sorted by amplitude descending so
  // taking the first K terms means "the K most visually significant
  // circles", not an arbitrary frequency cutoff.
  function computeDFT(points) {
    var N = points.length;
    var coeffs = [];
    for (var k = 0; k < N; k++) {
      var re = 0, im = 0;
      for (var n = 0; n < N; n++) {
        var angle = (-2 * Math.PI * k * n) / N;
        var cos = Math.cos(angle), sin = Math.sin(angle);
        re += points[n][0] * cos - points[n][1] * sin;
        im += points[n][0] * sin + points[n][1] * cos;
      }
      re /= N; im /= N;
      var freq = k <= N / 2 ? k : k - N;
      coeffs.push({ freq: freq, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
    }
    coeffs.sort(function (a, b) { return b.amp - a.amp; });
    return coeffs;
  }

  var TM_DENSIFIED = densifyPath(TM_ANCHORS, 220);
  var TM_COEFFS = computeDFT(TM_DENSIFIED);
  // Fewest terms (of 8/15/20/25/30/45/70 rendered and compared -- see
  // chat log) that keeps both letters' corners crisp rather than melting
  // into rounded blobs; this path's sharp right angles need more of the
  // higher terms than a curvier shape would.
  var FOURIER_TERM_COUNT = 40;
  var TM_TOP_COEFFS = TM_COEFFS.slice(0, FOURIER_TERM_COUNT);

  function fourierChainPoint(t) {
    var x = 0, y = 0;
    for (var i = 0; i < TM_TOP_COEFFS.length; i++) {
      var c = TM_TOP_COEFFS[i];
      var angle = c.freq * t + c.phase;
      x += c.amp * Math.cos(angle);
      y += c.amp * Math.sin(angle);
    }
    return [x, y];
  }

  /* ======================================================================
     BACKGROUND ENGINE: the full-page #system-canvas and the four
     scroll-blended systems drawn on it.
     ====================================================================== */

  (function backgroundEngine() {
    var canvas = document.getElementById("system-canvas");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var heroEl = document.getElementById("hero");
    var epiphyteCardEl = document.getElementById("epiphyte-card");
    var saeculumCardEl = document.getElementById("saeculum-card");
    var footerEl = document.getElementById("site-footer");

    /* ------------------------------------------------------------------
       Shared input, exactly Phase 1's state manager: pointer position
       (eased) and disturbance pulses (decaying), computed once a frame
       and handed to whichever system(s) currently have weight. This is
       what makes interaction "travel with" the dominant system instead
       of staying tied to the De Jong attractor alone.
       ------------------------------------------------------------------ */

    var shared = {
      pointerX: 0, pointerY: 0, pointerTargetX: 0, pointerTargetY: 0,
      scrollProgress: 0,
      disturbances: [], // { start: performance.now() }
      disturbanceBoost: 0,
    };

    var DISTURBANCE_TAU_MS = 550; // ~3*tau to mostly settle, per spec's 1-2s
    var DISTURBANCE_MAX_BOOST = 1.5;

    function updateDisturbanceBoost(now) {
      var boost = 0;
      for (var i = shared.disturbances.length - 1; i >= 0; i--) {
        var elapsed = now - shared.disturbances[i].start;
        if (elapsed > DISTURBANCE_TAU_MS * 6) {
          shared.disturbances.splice(i, 1);
          continue;
        }
        boost += Math.exp(-elapsed / DISTURBANCE_TAU_MS);
      }
      shared.disturbanceBoost = Math.min(boost, DISTURBANCE_MAX_BOOST);
    }

    window.addEventListener(
      "pointermove",
      function (e) {
        shared.pointerTargetX = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
        shared.pointerTargetY = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
      },
      { passive: true }
    );
    function resetPointerTarget() {
      shared.pointerTargetX = 0;
      shared.pointerTargetY = 0;
    }
    window.addEventListener("pointercancel", resetPointerTarget, { passive: true });
    window.addEventListener(
      "pointerup",
      function (e) {
        if (e.pointerType === "touch" || e.pointerType === "pen") resetPointerTarget();
      },
      { passive: true }
    );

    // Disturbance dispatch: every system with non-negligible weight gets
    // notified, not just the single most-dominant one -- mid-crossfade,
    // a click plausibly affects everything currently on screen.
    document.addEventListener(
      "click",
      function () {
        shared.disturbances.push({ start: performance.now() });
        if (shared.disturbances.length > 8) shared.disturbances.shift();
        systems.forEach(function (s) {
          if (s.weight > 0.05 && s.onDisturbPulse) s.onDisturbPulse();
        });
      },
      { passive: true }
    );

    /* ------------------------------------------------------------------
       Sizing
       ------------------------------------------------------------------ */

    var dpr = 1;
    var cssWidth = 0;
    var cssHeight = 0;
    var resizePending = false;
    var needsHardClear = true;

    function resize() {
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsHardClear = true;
    }
    window.addEventListener("resize", function () { resizePending = true; }, { passive: true });

    function refreshThemeColors() {
      readThemeColors();
      needsHardClear = true; // avoid a muddy cross-theme trail smear
    }

    /* ------------------------------------------------------------------
       Weight: one IntersectionObserver, many thresholds (approximates a
       continuous ratio), rootMargin expanded so adjacent anchors overlap
       into real crossfade zones instead of both hitting zero between
       sections. Ratio -> targetWeight; the shared ease() above smooths
       the (otherwise stepped) threshold callbacks into a continuous feel.
       Using intersection ratio rather than raw scrollY is the point of
       the exercise: it's already resize/viewport-height robust, and an
       IntersectionObserver callback only fires on real visibility
       changes -- not on every scroll-event pixel -- so there's no need
       for an extra manual scroll-progress throttle on top of it.
       ------------------------------------------------------------------ */

    var WEIGHT_EASE = 0.05;
    var RENDER_THRESHOLD = 0.02;

    var thresholds = [];
    for (var t = 0; t <= 40; t++) thresholds.push(t / 40);

    /* ------------------------------------------------------------------
       System 1: De Jong attractor (hero). Same map/params/robustness
       bounds as Phase 1; only the alpha (now weight-scaled) and the
       removal of the old scroll-opacity mechanic change -- that's
       superseded by the general per-system weight below.
       ------------------------------------------------------------------ */

    var dejong = (function () {
      var BASE_PARAMS = { a: -0.827, b: -1.637, c: 1.659, d: -0.943 };
      // Asymmetric on purpose: an offline sweep showed the orbit stays
      // rich indefinitely going MORE negative, but collapses to a near-
      // empty periodic cycle surprisingly close to base in the positive
      // direction (`b` worst of all, collapse by +0.15). These caps keep
      // the full pointer range inside the healthy zone with margin.
      var POINTER_AMPLITUDE = { a: 0.15, b: 0.08, c: 0.25, d: 0.15 };
      var DISTURBANCE_PEAK = 0.35; // pulls params further into the safe zone, never toward collapse

      var FILL_FRACTION = 0.86;
      var POINT_ALPHA_DIM = 0.16;
      var POINT_ALPHA_BRIGHT = 0.4;
      var BRIGHT_EVERY_NTH = 5;
      var POINTS_PER_FRAME_INITIAL = 900;
      var POINTS_PER_FRAME_FLOOR = 150;

      var pointsPerFrame = POINTS_PER_FRAME_INITIAL;
      var frameX = new Float32Array(POINTS_PER_FRAME_INITIAL);
      var frameY = new Float32Array(POINTS_PER_FRAME_INITIAL);
      var orbitX = 0.1, orbitY = 0.1;
      var params = { a: BASE_PARAMS.a, b: BASE_PARAMS.b, c: BASE_PARAMS.c, d: BASE_PARAMS.d };

      function burnIn(p, steps) {
        var x = orbitX, y = orbitY;
        for (var i = 0; i < steps; i++) {
          var next = stepDeJong(x, y, p);
          x = next[0]; y = next[1];
        }
        orbitX = x; orbitY = y;
      }
      burnIn(BASE_PARAMS, 200);

      return {
        id: "dejong",
        anchorEl: heroEl,
        weight: 1,
        targetWeight: 1,
        qualityScale: 1,

        update: function (shared) {
          var negOffset = -DISTURBANCE_PEAK * shared.disturbanceBoost;
          params.a = BASE_PARAMS.a + shared.pointerX * POINTER_AMPLITUDE.a + negOffset;
          params.b = BASE_PARAMS.b + shared.pointerY * POINTER_AMPLITUDE.b + negOffset;
          params.c = BASE_PARAMS.c + shared.pointerX * POINTER_AMPLITUDE.c + negOffset;
          params.d = BASE_PARAMS.d + shared.pointerY * POINTER_AMPLITUDE.d + negOffset;
        },

        render: function (view) {
          var scale = (FILL_FRACTION * Math.min(view.width, view.height)) / 4;
          var cx = view.width / 2, cy = view.height / 2;
          var x = orbitX, y = orbitY;
          // pointsPerFrame is already quality-scaled (see setQualityScale)
          // -- applying qualityScale again here would compound it.
          var n = pointsPerFrame;

          for (var i = 0; i < n; i++) {
            var next = stepDeJong(x, y, params);
            x = next[0]; y = next[1];
            frameX[i] = cx + x * scale;
            frameY[i] = cy + y * scale;
          }
          orbitX = x; orbitY = y;

          view.ctx.fillStyle = rgba(colors.signal, POINT_ALPHA_DIM * this.weight);
          for (i = 0; i < n; i++) view.ctx.fillRect(Math.floor(frameX[i]), Math.floor(frameY[i]), 1, 1);

          view.ctx.fillStyle = rgba(colors.signal, POINT_ALPHA_BRIGHT * this.weight);
          for (i = 0; i < n; i += BRIGHT_EVERY_NTH) view.ctx.fillRect(Math.floor(frameX[i]), Math.floor(frameY[i]), 1, 1);
        },

        renderStatic: function (view) {
          burnIn(BASE_PARAMS, 200);
          var scale = (FILL_FRACTION * Math.min(view.width, view.height)) / 4;
          var cx = view.width / 2, cy = view.height / 2;
          var x = orbitX, y = orbitY;
          var count = 42000;
          var xs = new Float32Array(count), ys = new Float32Array(count);
          for (var i = 0; i < count; i++) {
            var next = stepDeJong(x, y, BASE_PARAMS);
            x = next[0]; y = next[1];
            xs[i] = cx + x * scale; ys[i] = cy + y * scale;
          }
          view.ctx.fillStyle = rgba(colors.signal, 0.22);
          for (i = 0; i < count; i++) view.ctx.fillRect(Math.floor(xs[i]), Math.floor(ys[i]), 1, 1);
          view.ctx.fillStyle = rgba(colors.signal, 0.5);
          for (i = 0; i < count; i += BRIGHT_EVERY_NTH) view.ctx.fillRect(Math.floor(xs[i]), Math.floor(ys[i]), 1, 1);
        },

        setQualityScale: function (q) { this.qualityScale = q; pointsPerFrame = Math.max(POINTS_PER_FRAME_FLOOR, Math.floor(POINTS_PER_FRAME_INITIAL * q)); },
      };
    })();

    /* ------------------------------------------------------------------
       System 2: L-system (Epiphyte). Cycles through increasing depths,
       redrawing its FULL current structure every frame it's visible (not
       just new growth) so it stays legible through its "hold" -- the
       shared per-frame fade is too fast (~1.4s) for a structure meant to
       read as a whole for a few seconds, unlike De Jong's stream of
       transient points. Branches only actually start fading once a new
       cycle begins and stops refreshing the old ones: a cross-dissolve
       from the old mature plant into the next young one, which is the
       "old branches fade slowly" behaviour asked for, without a second
       timing system -- it falls out of reusing the one fade already
       there for a different reason.
       ------------------------------------------------------------------ */

    var lsystem = (function () {
      var DEPTHS = [2, 3, 4, 5];
      var TARGET_REVEAL_FRAMES = 85;
      var HOLD_MS_INTERMEDIATE = 900;
      var HOLD_MS_FINAL = 3200;
      var ANGLE_JITTER = (6 * Math.PI) / 180;

      var depthIdx = 0;
      var angle = LSYS_BASE_ANGLE;
      var angleJitter = 0, angleJitterTarget = 0;
      var segs = turtleSegments(expandLSystem(DEPTHS[0]), angle);
      var revealCount = 0;
      var revealRate = 1;
      var phase = "growing"; // "growing" | "holding"
      var phaseStart = 0;
      var qualityScaleRef = 1; // kept in sync by setQualityScale; startDepth is a plain closure, not a method, so it can't read `this`

      // Depth 4/5 (360/1488 segments, redrawn whole every frame while
      // visible) are the actual cost here -- stepLen alone only changes
      // the ON-SCREEN SIZE, not the segment/draw-call count, so under
      // sustained pressure the cycle stops reaching them at all instead
      // of just shrinking them. One-directional like the rest of the
      // adaptive system: once capped, stays capped for the session.
      function maxDepthIdxAllowed() {
        return qualityScaleRef < 0.7 ? 1 : DEPTHS.length - 1;
      }

      function startDepth(idx, now) {
        depthIdx = Math.min(idx, maxDepthIdxAllowed());
        angle = LSYS_BASE_ANGLE + angleJitter;
        segs = turtleSegments(expandLSystem(DEPTHS[depthIdx]), angle);
        revealCount = 0;
        revealRate = Math.max(1, Math.ceil(segs.length / 4 / TARGET_REVEAL_FRAMES));
        phase = "growing";
        phaseStart = now;
      }

      return {
        id: "lsystem",
        anchorEl: epiphyteCardEl,
        weight: 0,
        targetWeight: 0,
        qualityScale: 1,

        update: function (shared, now) {
          angleJitterTarget = shared.pointerX * ANGLE_JITTER;
          angleJitter = ease(angleJitter, angleJitterTarget, 0.04);

          var boostedRate = revealRate * (1 + shared.disturbanceBoost);
          if (phase === "growing") {
            revealCount += boostedRate;
            if (revealCount >= segs.length / 4) {
              revealCount = segs.length / 4;
              phase = "holding";
              phaseStart = now;
            }
          } else {
            var holdMs = depthIdx === DEPTHS.length - 1 ? HOLD_MS_FINAL : HOLD_MS_INTERMEDIATE;
            if (now - phaseStart > holdMs) {
              startDepth((depthIdx + 1) % DEPTHS.length, now);
            }
          }
        },

        render: function (view) {
          var stepLen = Math.min(view.width, view.height) * 0.024 * this.qualityScale;
          var originX = view.width / 2;
          var originY = view.height * 0.72;
          var alpha = 0.5 * this.weight;
          strokeSegments(view.ctx, segs, revealCount, originX, originY, stepLen, rgba(colors.signal, alpha));
        },

        renderStatic: function (view) {
          var fixedSegs = turtleSegments(expandLSystem(4), LSYS_BASE_ANGLE);
          var stepLen = Math.min(view.width, view.height) * 0.024;
          strokeSegments(view.ctx, fixedSegs, fixedSegs.length / 4, view.width / 2, view.height * 0.72, stepLen, rgba(colors.signal, 0.5));
        },

        setQualityScale: function (q) { this.qualityScale = Math.max(0.5, q); qualityScaleRef = this.qualityScale; },
      };
    })();

    /* ------------------------------------------------------------------
       System 3: cellular automaton (Saeculum). Rule 90 sweeps top-to-
       bottom generating new rows; unlike the L-system it's a historical
       record (like De Jong's point stream) so it CAN just rely on the
       shared fade for old rows to age out -- only the newest row(s) are
       drawn each frame. Reseeds into a fresh single-cell start whenever
       a sweep completes (or a disturbance forces one early), so it is
       always "generating a new world", never repeating one indefinitely.
       ------------------------------------------------------------------ */

    var cellular = (function () {
      var CELL_SIZE = 5;
      var row = new Uint8Array(1);
      var width = 1;
      var rowIndex = 0;
      var maxRows = 1;
      var seedCol = 0;
      var seedColTarget = 0;
      var forceReseed = false;
      var lastW = 0, lastH = 0;

      function reseed(w, h) {
        width = Math.max(20, Math.floor(w / CELL_SIZE));
        maxRows = Math.max(10, Math.floor((h * 0.6) / CELL_SIZE));
        row = new Uint8Array(width);
        row[Math.max(0, Math.min(width - 1, seedCol))] = 1;
        rowIndex = 0;
      }

      return {
        id: "ca",
        anchorEl: saeculumCardEl,
        weight: 0,
        targetWeight: 0,
        qualityScale: 1,
        _sized: false,

        update: function (shared, now, view) {
          // Re-seed on the very first call AND whenever the viewport
          // itself has changed size -- otherwise a resize leaves the
          // cell grid computed for the old width/height until whatever
          // sweep is already in progress happens to finish on its own.
          if (!this._sized || view.width !== lastW || view.height !== lastH) {
            reseed(view.width, view.height);
            this._sized = true;
            lastW = view.width; lastH = view.height;
          }

          seedColTarget = Math.round(((shared.pointerX + 1) / 2) * (width - 1));
          seedCol = Math.round(ease(seedCol, seedColTarget, 0.05));

          if (forceReseed) {
            reseed(view.width, view.height);
            forceReseed = false;
          }

          // Each pushed row carries its OWN generation index rather than
          // being positioned by reconstructing one from the post-loop
          // rowIndex: a reseed can land mid-loop (when a multi-tick frame
          // crosses maxRows), and without the per-row index the row(s)
          // from just before that reseed would be drawn at the new
          // sweep's coordinates instead of the old one's.
          var ticks = 1 + Math.round(((shared.pointerY + 1) / 2) * 2 * this.qualityScale);
          this._newRows = [];
          for (var i = 0; i < ticks; i++) {
            row = stepCA(row);
            rowIndex++;
            this._newRows.push({ idx: rowIndex, cells: row.slice() });
            if (rowIndex >= maxRows) reseed(view.width, view.height);
          }
        },

        render: function (view) {
          if (!this._newRows || !this._newRows.length) return;
          var alpha = 0.42 * this.weight;
          view.ctx.fillStyle = rgba(colors.signal, alpha);
          var top = view.height * 0.15;
          for (var r = 0; r < this._newRows.length; r++) {
            var entry = this._newRows[r];
            var y = top + entry.idx * CELL_SIZE;
            var thisRow = entry.cells;
            for (var col = 0; col < thisRow.length; col++) {
              if (thisRow[col]) view.ctx.fillRect(col * CELL_SIZE, y, CELL_SIZE - 1, CELL_SIZE - 1);
            }
          }
        },

        renderStatic: function (view) {
          var w = Math.max(20, Math.floor(view.width / CELL_SIZE));
          var rows = Math.max(10, Math.floor((view.height * 0.6) / CELL_SIZE));
          var r = new Uint8Array(w);
          r[Math.floor(w / 2)] = 1;
          view.ctx.fillStyle = rgba(colors.signal, 0.42);
          var top = view.height * 0.15;
          for (var y = 0; y < rows; y++) {
            for (var col = 0; col < w; col++) {
              if (r[col]) view.ctx.fillRect(col * CELL_SIZE, top + y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
            }
            r = stepCA(r);
          }
        },

        onDisturbPulse: function () { forceReseed = true; },
        setQualityScale: function (q) { this.qualityScale = Math.max(0.4, q); },
      };
    })();

    /* ------------------------------------------------------------------
       System 4: Fourier-epicycle signature (footer). Deliberately the
       calmest system here -- no onDisturbPulse, and update() never reads
       shared.disturbanceBoost at all: this is the signature, not another
       experiment, so a click elsewhere must never make it flinch. The
       trace is redrawn in full every frame it's visible (same reasoning
       as the L-system: it has to read as one coherent, complete image
       while building), and only degrades by drawing fewer of the
       (already very faint) construction circles under load -- the traced
       letters themselves never lose resolution.
       ------------------------------------------------------------------ */

    var fourier = (function () {
      var LOOP_FRAMES = 570; // ~9.5s per loop at 60fps and speedMul=1
      var BASE_DT = (2 * Math.PI) / LOOP_FRAMES;
      var SPEED_MOD_RANGE = 0.4; // pointer keeps this in [0.6x, 1.4x] -- always forward, never stalls
      var HOLD_MS = 1600;
      var SHAPE_SPAN = 140; // TM_ANCHORS' rough bounding extent, incl. the return swoop

      var t = 0;
      var phase = "drawing"; // "drawing" | "holding"
      var phaseStart = 0;
      var speedMul = 1, speedTarget = 1;
      var trace = []; // flat [x0,y0, x1,y1, ...] in TM-local units, one loop's worth

      return {
        id: "fourier",
        anchorEl: footerEl,
        weight: 0,
        targetWeight: 0,
        qualityScale: 1,

        update: function (shared, now) {
          speedTarget = 1 + shared.pointerX * SPEED_MOD_RANGE;
          speedMul = ease(speedMul, speedTarget, 0.04);

          if (phase === "drawing") {
            t += BASE_DT * speedMul;
            var p = fourierChainPoint(Math.min(t, 2 * Math.PI));
            trace.push(p[0], p[1]);
            if (t >= 2 * Math.PI) {
              phase = "holding";
              phaseStart = now;
            }
          } else if (now - phaseStart > HOLD_MS) {
            t = 0;
            trace.length = 0;
            phase = "drawing";
          }
        },

        render: function (view) {
          var scale = (0.55 * Math.min(view.width, view.height)) / SHAPE_SPAN;
          var cx = view.width / 2, cy = view.height / 2;

          if (trace.length >= 4) {
            view.ctx.strokeStyle = rgba(colors.signal, 0.85 * this.weight);
            view.ctx.lineWidth = 1.5;
            view.ctx.beginPath();
            view.ctx.moveTo(cx + trace[0] * scale, cy + trace[1] * scale);
            for (var i = 2; i < trace.length; i += 2) {
              view.ctx.lineTo(cx + trace[i] * scale, cy + trace[i + 1] * scale);
            }
            view.ctx.stroke();
          }

          if (phase === "drawing") {
            var x = 0, y = 0;
            view.ctx.strokeStyle = rgba(colors.signal, 0.12 * this.weight);
            view.ctx.lineWidth = 1;
            // The chain sum itself always runs over every term, so it
            // still lands on the same endpoint the trace point (computed
            // separately in update()) uses -- qualityScale only skips
            // the draw call for the smallest, least-significant circles,
            // it never truncates the sum, which would visibly detach the
            // drawn chain's tip from the trace it's supposed to be
            // tracing under degradation.
            var maxCircles = Math.max(6, Math.floor(TM_TOP_COEFFS.length * this.qualityScale));
            for (var ci = 0; ci < TM_TOP_COEFFS.length; ci++) {
              var c = TM_TOP_COEFFS[ci];
              var angle = c.freq * t + c.phase;
              var nx = x + c.amp * Math.cos(angle);
              var ny = y + c.amp * Math.sin(angle);
              if (ci < maxCircles && c.amp * scale > 1.2) {
                view.ctx.beginPath();
                view.ctx.arc(cx + x * scale, cy + y * scale, c.amp * scale, 0, Math.PI * 2);
                view.ctx.moveTo(cx + x * scale, cy + y * scale);
                view.ctx.lineTo(cx + nx * scale, cy + ny * scale);
                view.ctx.stroke();
              }
              x = nx; y = ny;
            }
          }
        },

        renderStatic: function (view) {
          var scale = (0.55 * Math.min(view.width, view.height)) / SHAPE_SPAN;
          var cx = view.width / 2, cy = view.height / 2;
          var samples = 300;
          view.ctx.strokeStyle = rgba(colors.signal, 0.85);
          view.ctx.lineWidth = 1.5;
          view.ctx.beginPath();
          for (var s = 0; s <= samples; s++) {
            var p = fourierChainPoint((2 * Math.PI * s) / samples);
            var sx = cx + p[0] * scale, sy = cy + p[1] * scale;
            if (s === 0) view.ctx.moveTo(sx, sy); else view.ctx.lineTo(sx, sy);
          }
          view.ctx.stroke();
        },

        setQualityScale: function (q) { this.qualityScale = Math.max(0.3, q); },
      };
    })();

    var systems = [dejong, lsystem, cellular, fourier];

    /* ------------------------------------------------------------------
       Adaptive quality: sustained sub-50fps degrades one priority tier
       at a time (one-directional, as in Phase 1 -- recovering upward
       risks visible flicker), starting with the LOWEST-priority tier and
       only moving to the next once the current one is fully floored.
       Priority (highest first): hero attractor > footer signature >
       L-system/cellular automaton. Reasoning: the signature is the
       "unterschrift" and should never stutter; the two middle states are
       already the ones the brief singled out as allowed to give ground
       first, same spirit as the card previews' structurally lower budget.
       ------------------------------------------------------------------ */

    var degradeTiers = [
      { systems: [lsystem, cellular], scale: 1 },
      { systems: [fourier], scale: 1 },
      { systems: [dejong], scale: 1 },
    ];

    function degradeOneStep() {
      for (var i = 0; i < degradeTiers.length; i++) {
        var tier = degradeTiers[i];
        if (tier.scale > 0.3) {
          tier.scale = Math.max(0.3, tier.scale * 0.8);
          tier.systems.forEach(function (s) { s.setQualityScale(tier.scale); });
          return; // one tier per trigger -- higher-priority tiers untouched until this one floors
        }
      }
    }

    var frameDeltas = [];
    var lastTs = null;

    function trackFrameTime(timestamp) {
      if (lastTs !== null) {
        frameDeltas.push(timestamp - lastTs);
        if (frameDeltas.length >= 45) {
          var sum = 0;
          for (var i = 0; i < frameDeltas.length; i++) sum += frameDeltas[i];
          if (sum / frameDeltas.length > 20) degradeOneStep();
          frameDeltas.length = 0;
        }
      }
      lastTs = timestamp;
    }

    /* ------------------------------------------------------------------
       Loop
       ------------------------------------------------------------------ */

    var FADE_ALPHA = 0.045;
    var running = false;

    function renderFrame(now) {
      if (needsHardClear) {
        ctx.fillStyle = rgba(colors.canvas, 1);
        ctx.fillRect(0, 0, cssWidth, cssHeight);
        needsHardClear = false;
      } else {
        ctx.fillStyle = rgba(colors.canvas, FADE_ALPHA);
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      }

      var view = { ctx: ctx, width: cssWidth, height: cssHeight };
      systems.forEach(function (s) {
        s.weight = ease(s.weight, s.targetWeight, WEIGHT_EASE);
        s.update(shared, now, view);
      });
      systems.forEach(function (s) {
        if (s.weight > RENDER_THRESHOLD) s.render(view);
      });
    }

    function tick(timestamp) {
      if (!running) return;
      if (resizePending) { resize(); resizePending = false; }
      trackFrameTime(timestamp);

      shared.pointerX = ease(shared.pointerX, shared.pointerTargetX, 0.06);
      shared.pointerY = ease(shared.pointerY, shared.pointerTargetY, 0.06);
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var scrollY = window.scrollY || window.pageYOffset || 0;
      shared.scrollProgress = scrollable > 0 ? Math.min(1, Math.max(0, scrollY / scrollable)) : 0;
      updateDisturbanceBoost(timestamp);

      renderFrame(timestamp);
      requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      lastTs = null;
      requestAnimationFrame(tick);
    }
    function stop() { running = false; }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    if (window.MutationObserver) {
      new MutationObserver(refreshThemeColors).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }
    if (window.matchMedia) {
      var scheme = window.matchMedia("(prefers-color-scheme: light)");
      if (scheme.addEventListener) scheme.addEventListener("change", refreshThemeColors);
    }

    /* ------------------------------------------------------------------
       Reduced motion: no animated crossfade, no rAF loop at all -- just
       jump to whichever anchor is currently most visible and draw ONE
       static frame for it. IntersectionObserver callbacks are the only
       thing still listened to here: they fire on real visibility
       changes, driven by the user's own scrolling, not autoplaying
       motion, so re-picking the dominant system on each one stays
       within the spirit of "reduce motion", not just the letter of it.
       ------------------------------------------------------------------ */

    function reducedMotionInit() {
      resize();
      var view = { ctx: ctx, width: cssWidth, height: cssHeight };
      var current = dejong;

      function drawStatic(sys) {
        current = sys;
        ctx.fillStyle = rgba(colors.canvas, 1);
        ctx.fillRect(0, 0, cssWidth, cssHeight);
        sys.renderStatic(view);
      }

      drawStatic(dejong);

      if (window.IntersectionObserver) {
        var ratios = {};
        var staticIo = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              for (var i = 0; i < systems.length; i++) {
                if (systems[i].anchorEl === entry.target) ratios[systems[i].id] = entry.intersectionRatio;
              }
            });
            var best = dejong, bestRatio = -1;
            systems.forEach(function (s) {
              var r = ratios[s.id] || 0;
              if (r > bestRatio) { bestRatio = r; best = s; }
            });
            if (best !== current && bestRatio > 0.1) drawStatic(best);
          },
          { threshold: thresholds, rootMargin: "25% 0px 25% 0px" }
        );
        systems.forEach(function (s) { if (s.anchorEl) staticIo.observe(s.anchorEl); });
      }

      window.addEventListener(
        "resize",
        function () {
          resize();
          view.width = cssWidth; view.height = cssHeight;
          drawStatic(current);
        },
        { passive: true }
      );
    }

    /* ------------------------------------------------------------------
       Init
       ------------------------------------------------------------------ */

    readThemeColors();
    resize();

    if (prefersReducedMotion()) {
      reducedMotionInit();
    } else {
      // Crossfade weight observer: only wired up here, not under reduced
      // motion, so that mode truly registers no scroll/pointer/click
      // listeners at all beyond the (separate, simpler) one inside
      // reducedMotionInit.
      if (window.IntersectionObserver) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              var sys = null;
              for (var i = 0; i < systems.length; i++) {
                if (systems[i].anchorEl === entry.target) { sys = systems[i]; break; }
              }
              if (sys) sys.targetWeight = entry.intersectionRatio;
            });
          },
          { threshold: thresholds, rootMargin: "25% 0px 25% 0px" }
        );
        systems.forEach(function (s) { if (s.anchorEl) io.observe(s.anchorEl); });
      }
      start();
    }
  })();

  /* ======================================================================
     CARD PREVIEWS: small, independent canvases inside the Epiphyte and
     Saeculum project cards. Not part of the blended systems above -- each
     runs its own tiny, always-on-while-visible loop, deliberately at a
     lower resolution/rate than the main background (priority: the
     background engine gets full quality; these degrade first).
     ====================================================================== */

  (function cardPreviews() {
    var reduced = prefersReducedMotion();

    function makePreview(canvas, draw, drawStatic) {
      if (!canvas || !canvas.getContext) return;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cssW = 0, cssH = 0;
      var visible = false;
      var frame = 0;
      var rafId = null;

      function resize() {
        var rect = canvas.getBoundingClientRect();
        cssW = Math.max(1, Math.round(rect.width));
        cssH = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Deliberately throttled to ~15fps (every 4th rAF): this is an
      // ambient detail, not the main event, and it's the first thing the
      // brief's stated priority says should give ground under load.
      function loop() {
        if (!visible) return;
        frame++;
        if (frame % 4 === 0) draw(ctx, cssW, cssH);
        rafId = requestAnimationFrame(loop);
      }

      function start() {
        if (rafId !== null) return;
        resize();
        loop();
      }
      function stop() {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (reduced) {
        // A fully-formed one-shot frame, not one call of the incremental
        // `draw` (which starts from "just begun growing" and would show
        // almost nothing) -- a single static image per the brief means a
        // complete, legible one.
        resize();
        (drawStatic || draw)(ctx, cssW, cssH);
        return;
      }

      if (window.IntersectionObserver) {
        new IntersectionObserver(
          function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) start(); else stop();
          },
          { threshold: 0.01 }
        ).observe(canvas);
      } else {
        visible = true;
        start();
      }

      window.addEventListener("resize", function () { if (visible) resize(); }, { passive: true });
    }

    /* ---- Epiphyte: mini L-system, hover = a small growth burst ---- */

    (function () {
      var canvas = document.querySelector('[data-preview="lsystem"]');
      if (!canvas) return;
      var card = document.getElementById("epiphyte-card");

      var DEPTHS = [2, 3, 4];
      var depthIdx = 0;
      var segs = turtleSegments(expandLSystem(DEPTHS[0]), LSYS_BASE_ANGLE);
      var revealCount = 0;
      var revealRate = 1;
      var phase = "growing";
      var phaseStart = performance.now();
      var boostUntil = 0;

      function startDepth(idx) {
        depthIdx = idx;
        segs = turtleSegments(expandLSystem(DEPTHS[depthIdx]), LSYS_BASE_ANGLE);
        revealCount = 0;
        revealRate = Math.max(1, Math.ceil(segs.length / 4 / 20));
        phase = "growing";
        phaseStart = performance.now();
      }

      if (card) {
        card.addEventListener(
          "pointerenter",
          function () { boostUntil = performance.now() + 600; },
          { passive: true }
        );
      }

      makePreview(canvas, function (ctx, w, h) {
        var now = performance.now();
        var boosted = now < boostUntil ? 3 : 1;
        if (phase === "growing") {
          revealCount += revealRate * boosted;
          if (revealCount >= segs.length / 4) {
            revealCount = segs.length / 4;
            phase = "holding";
            phaseStart = now;
          }
        } else if (now - phaseStart > (depthIdx === DEPTHS.length - 1 ? 2200 : 700)) {
          startDepth((depthIdx + 1) % DEPTHS.length);
        }

        ctx.fillStyle = rgba(colors.canvas, 1);
        ctx.fillRect(0, 0, w, h);
        var stepLen = Math.min(w, h) * 0.16;
        strokeSegments(ctx, segs, revealCount, w / 2, h * 0.92, stepLen, rgba(colors.signal, 0.75));
      }, function (ctx, w, h) {
        var fixedSegs = turtleSegments(expandLSystem(DEPTHS[DEPTHS.length - 1]), LSYS_BASE_ANGLE);
        ctx.fillStyle = rgba(colors.canvas, 1);
        ctx.fillRect(0, 0, w, h);
        var stepLen = Math.min(w, h) * 0.16;
        strokeSegments(ctx, fixedSegs, fixedSegs.length / 4, w / 2, h * 0.92, stepLen, rgba(colors.signal, 0.75));
      });
    })();

    /* ---- Saeculum: mini terminal-style CA, monospace block characters ---- */

    (function () {
      var canvas = document.querySelector('[data-preview="ca"]');
      if (!canvas) return;

      var COLS = 26, ROWS = 9;
      var row = new Uint8Array(COLS);
      row[Math.floor(COLS / 2)] = 1;
      // Each generated row is kept as-is; age is derived at draw time as
      // (history.length - 1 - r), not tracked in a separate mutable
      // array -- simpler and avoids having to remember to age every
      // still-visible past row on every tick.
      var history = [];
      var CHAR_FRESH = "#", CHAR_MID = "+", CHAR_OLD = ".";

      function reseed() {
        row = new Uint8Array(COLS);
        row[Math.floor(Math.random() * COLS)] = 1;
        history = [];
      }

      makePreview(canvas, function (ctx, w, h) {
        ctx.fillStyle = rgba(colors.canvas, 1);
        ctx.fillRect(0, 0, w, h);

        history.push(row);
        row = stepCA(row);
        if (history.length >= ROWS) reseed();

        var cellW = w / COLS, cellH = h / ROWS;
        ctx.font = Math.max(8, Math.floor(cellH * 0.9)) + "px 'JetBrains Mono', monospace";
        ctx.textBaseline = "top";
        for (var r = 0; r < history.length; r++) {
          var age = history.length - 1 - r;
          var ch = age === 0 ? CHAR_FRESH : age < 3 ? CHAR_MID : age < 6 ? CHAR_OLD : null;
          if (!ch) continue;
          ctx.fillStyle = rgba(colors.signal, age === 0 ? 0.9 : age < 3 ? 0.55 : 0.3);
          var hr = history[r];
          for (var c = 0; c < COLS; c++) {
            if (hr[c]) ctx.fillText(ch, c * cellW, r * cellH);
          }
        }
      }, function (ctx, w, h) {
        ctx.fillStyle = rgba(colors.canvas, 1);
        ctx.fillRect(0, 0, w, h);
        var r = new Uint8Array(COLS);
        r[Math.floor(COLS / 2)] = 1;
        var cellW = w / COLS, cellH = h / ROWS;
        ctx.font = Math.max(8, Math.floor(cellH * 0.9)) + "px 'JetBrains Mono', monospace";
        ctx.textBaseline = "top";
        ctx.fillStyle = rgba(colors.signal, 0.8);
        for (var rr = 0; rr < ROWS; rr++) {
          for (var c = 0; c < COLS; c++) {
            if (r[c]) ctx.fillText(CHAR_FRESH, c * cellW, rr * cellH);
          }
          r = stepCA(r);
        }
      });
    })();
  })();
})();
