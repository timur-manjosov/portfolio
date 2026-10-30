/**
 * Reveal on scroll (docs/DECISIONS.md R3-D6, R4-D4). Boxes and section heads
 * that start below the fold fade in once (opacity + 12 px) when they scroll
 * into view, staggered by 80 ms within a batch. The hidden state lives in CSS
 * inside `prefers-reduced-motion: no-preference` only, and nothing is marked
 * when IntersectionObserver is missing or the visitor prefers less motion.
 * Without this script everything is simply visible. Elements already in view
 * at load are never touched, so there is no flash and no layout shift.
 */
export {};

const SELECTOR = "main .section-head, main .card, main .box, main .link-row, main .entry-list > .entry";
const MAX_STEP = 4;
// --duration-slow (350 ms) + MAX_STEP × --reveal-stagger (80 ms), plus slack.
const DONE_AFTER = 800;

if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const io = new IntersectionObserver(
    (entries) => {
      let step = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        el.dataset.revealStep = String(Math.min(step++, MAX_STEP));
        el.dataset.reveal = "shown";
        // Once shown, hand the element back to its own transitions (card
        // hover). A timer, not transitionend: that event never fires when no
        // transition ran (e.g. hidden and shown within one frame).
        setTimeout(() => {
          delete el.dataset.reveal;
          delete el.dataset.revealStep;
        }, DONE_AFTER);
      }
    },
    { rootMargin: "0px 0px -40px 0px" },
  );
  const fold = window.innerHeight;
  for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) {
    if (el.getBoundingClientRect().top < fold) continue;
    el.dataset.reveal = "hidden";
    io.observe(el);
  }
}
