// Applies an explicitly chosen colour scheme before first paint, so there is
// no flash of the wrong theme. Loaded as a blocking, external <script> in
// <head> (not inline), so the CSP needs no hash for it.
(function () {
  // "js" on <html> before first paint: CSS then reserves the place of
  // controls that the module scripts reveal a moment later (theme toggle,
  // project filter, search field), so revealing them shifts nothing (CLS 0).
  // Only where module scripts can run; without JS the class never appears.
  if ("noModule" in HTMLScriptElement.prototype) {
    document.documentElement.classList.add("js");
  }
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (e) {
    // localStorage unavailable (privacy mode, disabled storage): follow the OS.
  }
})();
