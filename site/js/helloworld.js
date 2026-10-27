/* ==========================================================================
   Gemini: hello world as twin circuit traces
   Builds the board inside #hwBoard and runs one pass every 13 seconds, the
   same rhythm as the rails in /assets/circuit.js.

   One signal comes in at the board's left edge and splits at a junction.
   Each branch draws one word, and the two words draw letter for letter in
   lockstep: "hello" and "world" are five letters each, so the twins finish
   together. Then both flash, hold, fade from the left, and the board waits
   for the next pass.

   Every trace is also etched faintly and permanently, so the signal reads as
   lighting a track that was always there -- the same rule as the rails.
   ========================================================================== */

(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const W = 600;
  const H = 372;
  const PASS = 13000;   // one full pass, matching --circuit-pass
  const HEAD = 16;      // length of the bright dash riding each trace

  /* Lowercase on a 5 x 10 grid: ascenders start at 0, the x-height is 4, the
     baseline is 10. Each stroke is a polyline with 45-degree chamfers, so the
     letters are routed the way a board would route them. */
  const GLYPHS = {
    h: [[[0, 0], [0, 10]], [[0, 6], [2, 4], [3, 4], [5, 6], [5, 10]]],
    e: [[[0, 7], [5, 7], [5, 6], [3, 4], [2, 4], [0, 6], [0, 8], [2, 10], [5, 10]]],
    l: [[[1, 0], [2, 0], [2, 8], [4, 10]]],
    o: [[[2, 4], [3, 4], [5, 6], [5, 8], [3, 10], [2, 10], [0, 8], [0, 6], [2, 4]]],
    w: [[[0, 4], [0, 9], [1, 10], [2.5, 8.5], [4, 10], [5, 9], [5, 4]], [[2.5, 8.5], [2.5, 6]]],
    r: [[[0, 4], [0, 10]], [[0, 7], [3, 4], [4, 4], [5, 5]]],
    d: [[[5, 0], [5, 10]], [[5, 6], [3, 4], [2, 4], [0, 6], [0, 8], [2, 10], [3, 10], [5, 8]]],
  };

  const U = 12;          // board units per grid step, so letters sit on the dot grid
  const ADVANCE = 90;    // letter to letter
  const LEFT = 90;       // x of the first letter
  const WORDS = [
    { text: "hello", top: 42 },
    { text: "world", top: 210 },
  ];

  /* The signal enters at the left edge, runs a short trunk to a junction, and
     splits. Each branch lands on the first pad of its word. */
  const TRUNK = [[0, 186], [30, 186]];
  const BRANCHES = [
    [[30, 186], [42, 174], [42, 78], [54, 66], [66, 66], [90, 42]],
    [[30, 186], [42, 198], [42, 270], [54, 282], [66, 282], [90, 258]],
  ];

  /* The pass, in milliseconds. Stagger index k is 0 for the feed and i + 1
     for letter i, so the flash and the fade both sweep left to right. */
  const TRUNK_AT = [300, 420];
  const BRANCH_AT = [420, 1100];
  const LETTER_AT = (i) => 1100 + i * 900;
  const LETTER_LEN = 800;
  const LOCKED = LETTER_AT(4) + LETTER_LEN;
  const FLASH_AT = (k) => LOCKED + 100 + k * 90;
  const FLASH_LEN = 700;
  const FADE_AT = (k) => 10400 + k * 110;
  const FADE_LEN = 900;
  const DIM = 0.2;       // an unlit pad

  /* Gemini's brighter stars: right ascension and declination in degrees, then
     visual magnitude. Joined the way star charts draw the twins, as dashed
     ratsnest lines -- the unrouted connections on a board. */
  const STARS = {
    castor: [113.650, 31.888, 1.58],
    pollux: [116.329, 28.026, 1.14],
    alhena: [99.428, 16.399, 1.93],
    tejat: [95.740, 22.514, 2.88],
    mebsuta: [100.983, 25.131, 2.98],
    propus: [93.719, 22.507, 3.28],
    alzirr: [101.322, 12.896, 3.35],
    wasat: [110.031, 21.982, 3.53],
    kappa: [116.112, 24.398, 3.57],
    lambda: [109.523, 16.540, 3.58],
    theta: [103.197, 33.961, 3.60],
    iota: [111.432, 27.798, 3.78],
    mekbuda: [106.027, 20.570, 3.79],
    upsilon: [113.981, 26.896, 4.06],
    nu: [97.241, 20.212, 4.15],
    tau: [107.785, 30.245, 4.41],
  };
  const FIGURE = [
    ["castor", "tau"], ["tau", "theta"], ["tau", "mebsuta"], ["mebsuta", "nu"],
    ["mebsuta", "tejat"], ["tejat", "propus"], ["tau", "iota"], ["iota", "upsilon"],
    ["upsilon", "pollux"], ["upsilon", "kappa"], ["upsilon", "wasat"], ["wasat", "mekbuda"],
    ["mekbuda", "alhena"], ["wasat", "lambda"], ["lambda", "alzirr"],
  ];

  /* North up, east left, centred on the board. */
  function project([ra, dec]) {
    const RA0 = 105;
    const DEC0 = 23.4;
    const SCALE = 15;
    return [
      W / 2 - (ra - RA0) * Math.cos(DEC0 * Math.PI / 180) * SCALE,
      H / 2 - (dec - DEC0) * SCALE,
    ];
  }

  /* ---------- Geometry ---------- */

  const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  const pathData = (pts) => "M" + pts.map((p) => p[0] + " " + p[1]).join(" L");
  const lengthOf = (pts) =>
    pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

  function inside(p, a, b) {
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cross) > 1e-6) return false;
    const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1]);
    const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    return dot > 1e-6 && dot < len2 - 1e-6;
  }

  /* An end that lands on another stroke, or on one of its corners, is a
     junction and gets a via. A free end gets a pad. */
  function isJunction(point, strokes) {
    return strokes.some((pts) => pts.some((q, i) =>
      (i > 0 && inside(point, pts[i - 1], q)) ||
      (i > 0 && i < pts.length - 1 && same(point, q))));
  }

  /* Every trace with its window in the pass, and every pad and via with the
     moment the signal reaches it. */
  function plan() {
    const traces = [
      { pts: TRUNK, start: TRUNK_AT[0], end: TRUNK_AT[1], k: 0 },
      ...BRANCHES.map((pts) => ({ pts, start: BRANCH_AT[0], end: BRANCH_AT[1], k: 0 })),
    ];
    const nodes = [{ at: TRUNK[1], via: true, lit: TRUNK_AT[1], k: 0 }];

    WORDS.forEach((word) => {
      [...word.text].forEach((ch, i) => {
        const strokes = GLYPHS[ch];
        const place = ([x, y]) => [LEFT + i * ADVANCE + x * U, word.top + y * U];
        const total = strokes.reduce((sum, s) => sum + lengthOf(s), 0);
        let t = LETTER_AT(i);

        // Strokes run one after another at a steady speed, sized so both
        // twins fill the same slot whatever their letters' lengths.
        strokes.forEach((stroke) => {
          const span = LETTER_LEN * lengthOf(stroke) / total;
          traces.push({ pts: stroke.map(place), start: t, end: t + span, k: i + 1 });

          const first = stroke[0];
          const last = stroke[stroke.length - 1];
          if (!same(first, last)) {
            nodes.push({ at: place(first), via: isJunction(first, strokes), lit: t, k: i + 1 });
            nodes.push({ at: place(last), via: isJunction(last, strokes), lit: t + span, k: i + 1 });
          }
          t += span;
        });
      });
    });

    traces.forEach((trace) => { trace.len = lengthOf(trace.pts); });
    return { traces, nodes };
  }

  /* ---------- Markup ---------- */

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function draw(host, { traces, nodes }) {
    const svg = el("svg", {
      class: "hw-svg", viewBox: `0 0 ${W} ${H}`, focusable: "false", "aria-hidden": "true",
    });

    const grid = el("pattern", {
      id: "hw-grid", width: 12, height: 12, patternUnits: "userSpaceOnUse",
    }, el("defs", {}, svg));
    el("circle", { cx: 6, cy: 6, r: 0.75 }, grid);
    el("rect", { class: "hw-grid", width: W, height: H, fill: "url(#hw-grid)" }, svg);

    const sky = el("g", { class: "hw-sky" }, svg);
    FIGURE.forEach(([a, b]) => {
      const [x1, y1] = project(STARS[a]);
      const [x2, y2] = project(STARS[b]);
      el("line", { x1, y1, x2, y2 }, sky);
    });
    const stars = {};
    Object.entries(STARS).forEach(([name, star], i) => {
      const [cx, cy] = project(star);
      stars[name] = el("circle", {
        cx, cy,
        r: Math.max(0.9, 2.7 - 0.5 * (star[2] - 1)),
        class: "hw-star",
        style: `--tw:${(3 + (i * 0.73) % 3).toFixed(2)}s;--tw-delay:${(-(i * 1.37) % 4).toFixed(2)}s`,
      }, sky);
    });

    // Silkscreen: mounting holes, the board's name, and the input pin.
    const silk = el("g", { class: "hw-silk" }, svg);
    [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]].forEach(([cx, cy]) => {
      el("circle", { cx, cy, r: 5.5 }, silk);
      el("circle", { cx, cy, r: 2.2 }, silk);
    });
    el("text", { x: 32, y: H - 15 }, silk).textContent = "DR-GEMINI · REV A";
    el("text", { x: 6, y: 175 }, silk).textContent = "SIG";
    el("rect", { class: "hw-pin", x: 0, y: 180, width: 7, height: 12, rx: 1.5 }, svg);

    const etched = el("g", { class: "hw-etched" }, svg);
    const trails = el("g", { class: "hw-trails" }, svg);
    const flashes = el("g", { class: "hw-flash" }, svg);
    const pads = el("g", { class: "hw-nodes" }, svg);
    const heads = el("g", { class: "hw-heads" }, svg);

    traces.forEach((trace) => {
      const d = pathData(trace.pts);
      el("path", { d }, etched);
      trace.trail = el("path", {
        d, "stroke-dasharray": `${trace.len} ${trace.len}`, "stroke-dashoffset": trace.len,
      }, trails);
      trace.flash = el("path", { d }, flashes);
      trace.head = el("path", {
        d, "stroke-dasharray": `${HEAD} ${trace.len + HEAD}`, "stroke-dashoffset": HEAD,
      }, heads);
    });
    nodes.forEach((node) => {
      node.el = el("circle", {
        cx: node.at[0], cy: node.at[1], r: node.via ? 2.6 : 4.4, class: node.via ? "via" : "pad",
      }, pads);
    });

    host.appendChild(svg);
    return { svg, stars };
  }

  /* ---------- Motion ---------- */

  const at = (ms) => ms / PASS;
  const px = (n) => `${n}px`;

  function animate({ traces, nodes }, stars) {
    const timing = { duration: PASS, iterations: Infinity };
    const anims = [];
    const run = (node, frames) => anims.push(node.animate(frames, timing));

    traces.forEach((t) => {
      const fade = FADE_AT(t.k);
      const flash = FLASH_AT(t.k);

      // Opacity is held at 0 until a millisecond before the trace starts: a
      // round-capped dash parked at the start of a path still paints a dot.
      run(t.trail, [
        { offset: 0, strokeDashoffset: px(t.len), opacity: 0 },
        { offset: at(t.start - 1), strokeDashoffset: px(t.len), opacity: 0 },
        { offset: at(t.start), strokeDashoffset: px(t.len), opacity: 1 },
        { offset: at(t.end), strokeDashoffset: px(0), opacity: 1 },
        { offset: at(fade), strokeDashoffset: px(0), opacity: 1 },
        { offset: at(fade + FADE_LEN), strokeDashoffset: px(0), opacity: 0 },
        { offset: 1, strokeDashoffset: px(0), opacity: 0 },
      ]);
      run(t.head, [
        { offset: 0, strokeDashoffset: px(HEAD), opacity: 0 },
        { offset: at(t.start - 1), strokeDashoffset: px(HEAD), opacity: 0 },
        { offset: at(t.start), strokeDashoffset: px(HEAD), opacity: 1 },
        { offset: at(t.end), strokeDashoffset: px(HEAD - t.len), opacity: 1 },
        { offset: at(t.end + 220), strokeDashoffset: px(HEAD - t.len), opacity: 0 },
        { offset: 1, strokeDashoffset: px(HEAD - t.len), opacity: 0 },
      ]);
      run(t.flash, [
        { offset: 0, opacity: 0 },
        { offset: at(flash), opacity: 0 },
        { offset: at(flash + 140), opacity: 0.9 },
        { offset: at(flash + FLASH_LEN), opacity: 0 },
        { offset: 1, opacity: 0 },
      ]);
    });

    // A pad pops when the signal reaches it, then settles lit.
    nodes.forEach((n) => {
      const fade = FADE_AT(n.k);
      run(n.el, [
        { offset: 0, opacity: DIM, transform: "scale(1)" },
        { offset: at(n.lit), opacity: DIM, transform: "scale(1)" },
        { offset: at(n.lit + 60), opacity: 1, transform: "scale(1.9)" },
        { offset: at(n.lit + 460), opacity: 1, transform: "scale(1)" },
        { offset: at(fade), opacity: 1, transform: "scale(1)" },
        { offset: at(fade + FADE_LEN), opacity: DIM, transform: "scale(1)" },
        { offset: 1, opacity: DIM, transform: "scale(1)" },
      ]);
    });

    // Castor and Pollux flare together the moment both words lock.
    [stars.castor, stars.pollux].forEach((star) => run(star, [
      { offset: 0, transform: "scale(1)" },
      { offset: at(LOCKED), transform: "scale(1)" },
      { offset: at(LOCKED + 120), transform: "scale(2.6)" },
      { offset: at(LOCKED + 1400), transform: "scale(1)" },
      { offset: 1, transform: "scale(1)" },
    ]));

    // A background tab should cost nothing. Pausing them all at once keeps
    // every animation on the same clock.
    document.addEventListener("visibilitychange", () => {
      anims.forEach((a) => (document.hidden ? a.pause() : a.play()));
    });

    return anims;
  }

  /* ---------- Readout ----------
     The line under the board: each twin's word as received so far, and the
     state of the pass. Read off the animations' own clock, so it cannot drift
     from what the board shows. */

  function readout(clock) {
    const words = WORDS.map((word, w) => {
      const out = document.getElementById(`hwOut${w}`);
      if (!out) return [];
      out.textContent = "";
      return [...word.text].map((ch) => {
        const span = document.createElement("span");
        span.textContent = ch;
        out.appendChild(span);
        return span;
      });
    });
    const status = document.getElementById("hwStatus");
    const state = document.getElementById("hwState");
    const pass = document.getElementById("hwPass");

    function show(phase, n) {
      words.forEach((spans) => spans.forEach((span, i) => {
        span.classList.toggle("on",
          phase >= LETTER_AT(i) + LETTER_LEN && phase < FADE_AT(i + 1) + FADE_LEN / 2);
      }));
      const label = phase < TRUNK_AT[0] ? "standby"
        : phase < LOCKED ? "transmitting"
        : phase < FADE_AT(0) ? "locked"
        : "standby";
      if (status && status.dataset.state !== label) {
        status.dataset.state = label;
        state.textContent = label;
      }
      if (pass && n) pass.textContent = String(n).padStart(4, "0");
    }

    if (!clock) {
      show(LOCKED, 0);
      return;
    }

    (function tick() {
      const time = Number(clock.currentTime) || 0;
      show(time % PASS, Math.floor(time / PASS) + 1);
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- Reduced motion ----------
     The finished frame: both words lit, every pad on, nothing moving. */

  function still({ traces }, svg) {
    svg.classList.add("hw-still");
    traces.forEach((t) => t.trail.setAttribute("stroke-dashoffset", 0));
    readout(null);
  }

  function init() {
    const host = document.getElementById("hwBoard");
    if (!host) return;

    const model = plan();
    const { svg, stars } = draw(host, model);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof svg.animate !== "function") {
      still(model, svg);
      return;
    }
    readout(animate(model, stars)[0]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
