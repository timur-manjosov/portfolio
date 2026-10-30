/**
 * Theme toggle. Progressive enhancement: the button is `hidden` in the HTML
 * and only revealed here, because without JS the site simply follows the OS
 * setting. The initial attribute is set by /theme-init.js before paint.
 */
export {};

const STORAGE_KEY = "theme";
const root = document.documentElement;
const media = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function effectiveTheme(): "light" | "dark" {
  const explicit = root.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return media.matches ? "dark" : "light";
}

function sync(button: HTMLButtonElement): void {
  button.setAttribute("aria-pressed", String(effectiveTheme() === "dark"));
}

const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
if (button) {
  button.hidden = false;
  sync(button);
  button.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    const apply = () => {
      root.setAttribute("data-theme", next);
      sync(button);
    };
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice simply lasts for this page view.
    }
    // A short crossfade between the two palettes where same-document view
    // transitions exist and motion is welcome; an instant switch otherwise.
    if (document.startViewTransition && !reducedMotion.matches) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  });
  media.addEventListener("change", () => sync(button));
}
