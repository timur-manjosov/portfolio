# Audit: timurmanjosov.com — Ist-Zustand

> Reine Bestandsaufnahme, Stand 2026-07-29 (HEAD `26322aa`). Keine Codeänderungen,
> keine neuen Dateien außer dieser. Ziel: Entscheidungsgrundlage für einen
> späteren Umbau der Seite zu einem Hub/Knotenpunkt, von dem aus zukünftige
> Projekte (Discord-Bots, weitere Tools) als eigenständige, verlinkte
> Erweiterungen abzweigen.
>
> Es gibt kein `CLAUDE.md` in diesem Repo. Die Projektphilosophie wurde daher
> aus `README.md` (explizit dokumentiert) und dem Code selbst abgeleitet, nicht
> angenommen: radikaler Minimalismus, kein Build-Step, keine Dependencies,
> Progressive Enhancement als harte Regel, Nord-Palette, Caddy-Deployment.
>
> **Verhältnis zu `PORTFOLIO_ANALYSE.md`:** Dieses Dokument existiert bereits im
> Repo-Root (Stand 2026-07-23) und ist eine frühere, in sich saubere
> Bestandsaufnahme — aber sie beschreibt einen Code-Stand, der zwei Commits
> alt ist. Sie kennt weder `scripts/system.js` (beschreibt stattdessen einen
> einzelnen Lissajous-Effekt direkt in `main.js`) noch das dritte Projekt
> "Aura", noch die aktuelle Drei-Chapter-Struktur — und erwähnt eine dedizierte
> "Sport"-Section, die im aktuellen DOM nicht mehr existiert (vermutlich beim
> Rebuild in `b2ca713` entfernt/aufgelöst). Sie ist als historisches Dokument
> unverändert nützlich, aber als *aktueller* Stand überholt. Dieses `AUDIT.md`
> ersetzt sie faktisch für den aktuellen Stand; ob `PORTFOLIO_ANALYSE.md`
> gelöscht, archiviert oder belassen wird, ist eine Entscheidung für den Nutzer,
> nicht Teil dieses Audits.

---

## 1. Überblick

| Aspekt | Befund |
|---|---|
| Stack | Vanilla HTML5 + CSS3 + JS (ES5-Stil: `function`-Deklarationen, keine Klassen/Arrow Functions außerhalb von Callbacks). Kein Framework, kein Build-Step, keine einzige externe Laufzeit-Dependency, kein `package.json`. |
| Dateien | 5 Code-Dateien: `index.html` (299 Zeilen), `styles/main.css` (638), `styles/reset.css` (109), `scripts/main.js` (228), `scripts/system.js` (1205). **Insgesamt ~2479 Zeilen.** `system.js` allein ist knapp die Hälfte des gesamten Codes und mit Abstand die komplexeste Datei im Repo. |
| Repo-Größe | ~364 KB ohne `.git`. Größte Einzeldatei `assets/images/og-image.png` (84 KB), gefolgt von den drei self-hosted Variable-Fonts (zusammen ~102 KB). Keine Rasterbilder im Content selbst. |
| Deployment | Laut README: statische Dateien hinter Caddy. Keine Caddyfile, kein Dockerfile, keine CI-Konfiguration im Repo — der Deploy-Weg (`git pull` auf dem Server, vermutlich mit Caddy, das direkt aus dem Arbeitsverzeichnis ausliefert) existiert vollständig außerhalb dieses Repos. Das ist konsistent mit dem "kein Dependency-Chaos"-Prinzip: Es gibt nichts zu installieren, nichts zu bauen, nichts zu cachen. |
| Einordnung | Eine bewusst schlanke Ein-Personen-Visitenkarte ("this is me", nicht "Portfolio-Showcase" — README, Zeile 3-4), deren einziges aufwendiges Element ein handgebautes generatives Canvas-System ist. Die Code-Qualität ist für den gewählten Ansatz durchgehend hoch: dichte, ehrliche Inline-Kommentare, die Entwurfsentscheidungen und deren Gründe festhalten (teils mit Verweis auf "Phase 1/4" und "chat log" — sichtbare Spuren einer iterativen, dokumentierten Bauweise), konsequente Design-Token-Nutzung, durchgängige Progressive-Enhancement-Disziplin. |

---

## 2. Aktuelle Struktur (tatsächliche DOM-Reihenfolge)

1. `<canvas id="system-canvas">` — fixiert, hinter allem Content, `aria-hidden`, außerhalb von `<main>`.
2. `.skip-link` — Sprung zu `#main-content`.
3. `<header>` — Markenkürzel "TM" (dekorativ), Sprach-Toggle (DE/EN), Theme-Toggle. **Keine Navigation** — kein `<nav>`-Element, keine Sprungmarken-Links zu den Sections.
4. `<main id="main-content">`:
   - `#hero` — Name, Eyebrow "Welcome", H1 "Timur Manjosov", ein Satz Selbstbeschreibung (Mathematik + Code + "man versteht Dinge erst, wenn man sie selbst baut" — das erklärte Leitmotiv der ganzen Seite).
   - `#chapter-1` (`.chapter`) — erstes Bio-Fragment: FernUni Hagen, Mathematikstudium, Ziel quantitative Finance, Programmieren als Ort gelebter Mathematik.
   - `#project-epiphyte` (`.project-section`) — trägt die einzige `<h2>` "Projects" der ganzen Seite; enthält Karte "Epiphyte" (Discord-Bot, generative Pflanze pro Server) inkl. Live-Preview-Canvas.
   - `#chapter-2` (`.chapter`) — zweites Bio-Fragment: unabhängige Denkweise, Spieltheorie als Werkzeug.
   - `#project-saeculum` (`.project-section`) — Karte "Saeculum" (terminalbasierter Weltgenerator) inkl. Live-Preview-Canvas.
   - `#project-aura` (`.project-section`) — Karte "Aura" (Discord-Bot, "Work in progress"-Badge, kein Preview-Canvas, keine Tech-Tags, kein Link) — HTML-Kommentar markiert diese Section explizit als Einfügepunkt für künftige Projekte.
   - `#chapter-3` (`.chapter`) — drittes Bio-Fragment: generative/komplexe Systeme, privatsphäre-bewusstes Computing (Arch Linux, Neovim), Wissen als Selbstzweck.
   - `#contact` — H2 "Contact", eine Kontaktliste mit genau einem Eintrag (GitHub), Kommentar markiert Einfügepunkt für weitere Kontaktwege.
5. `<footer id="site-footer">` — Copyright, plus eine visually-hidden Beschreibung der Fourier-Signatur-Animation.

**Beobachtung zur Struktur selbst:** Drei separate `<section class="project-section">`-Elemente teilen sich eine einzige `<h2 id="projects-heading">` (nur auf der ersten definiert), referenziert per `aria-labelledby` auf allen dreien. Das ist funktional korrekt für Screenreader, macht aber sichtbar, dass "Projects" konzeptionell kein zusammenhängender Grid-Block mehr ist, sondern in die Erzählung der drei Chapter eingewebt ist — die About-Inhalte sind, anders als in der vorherigen Analyse beschrieben, nicht mehr eine Section, sondern drei über die Seite verteilte Fragmente.

---

## 3. Die vier Effekte

Alle vier leben vollständig in `scripts/system.js`, innerhalb der IIFE `backgroundEngine()` (Zeilen 265–1005). Gemeinsame Infrastruktur (Farbe, Ease-Funktion, reine Mathe-Funktionen) liegt darüber auf Modulebene (Zeilen 24–258) und wird sowohl vom Hintergrund-Engine als auch von den zwei Karten-Live-Previews (Zeilen 1015–1204) wiederverwendet.

Trigger-Mechanik ist für alle vier **identisch und zentral**: ein einziger `IntersectionObserver` pro Modus (normal vs. reduced-motion) beobachtet die vier Anker-Elemente (`#hero`, `#epiphyte-card`, `#saeculum-card`, `#site-footer`) mit 41 Schwellenwerten (`0, 1/40, 2/40, …, 1`) und erweitertem `rootMargin` (`"25% 0px 25% 0px"`). Der gemeldete `intersectionRatio` wird zum `targetWeight` des jeweiligen Systems; ein einziger `ease()`-Aufruf pro Frame in `renderFrame()` (Zeile 871) glättet das in ein kontinuierliches Überblenden. Es gibt **keine** vier getrennten Scroll-Handler — das ist explizit vermieden und gut gelöst.

### De-Jong-Attraktor (Hero)
- **Fundstelle:** `stepDeJong()` (Z. 84–90, reine Funktion), System-Objekt `dejong` (Z. 395–486).
- **Trigger:** Anker `#hero`; da `weight`/`targetWeight` beide mit `1` initialisiert werden (nicht `0` wie bei den anderen drei), ist dies das einzige System, das schon vor dem ersten IntersectionObserver-Callback sichtbar ist — passend, da es das Hero-System ist, aber eine Altlast für Wiederverwendbarkeit (siehe Abschnitt 6).
- **Codequalität:** Sehr sauber. Parameterwahl (`BASE_PARAMS`, asymmetrische `POINTER_AMPLITUDE`) ist mit einem dokumentierten Offline-Sweep begründet (Kommentar Z. 397–401: Kollaps-Verhalten nahe der Basis in eine Richtung, stabil reiches Verhalten in die andere). Nutzt vorallozierte `Float32Array`s statt Objekt-Allokation pro Frame — bewusste Perf-Entscheidung. Höchste Priorität in der Degradations-Hierarchie (Z. 812–816).

### L-System-Fraktalpflanze (Epiphyte-Karte)
- **Fundstelle:** `expandLSystem()`/`turtleSegments()`/`strokeSegments()` (Z. 100–152, geteilt mit der Karten-Preview), System-Objekt `lsystem` (Z. 502–582).
- **Trigger:** Anker `#epiphyte-card` (das `<article>`, nicht die ganze Section).
- **Codequalität:** Gut, mit einer erwähnenswerten Eigenheit: Tiefe 4/5 (360/1488 Segmente) werden *jeden sichtbaren Frame komplett neu gezeichnet*, nicht inkrementell — bewusst begründet (Z. 493–500: die Struktur soll als Ganzes ein paar Sekunden lesbar bleiben, der gemeinsame Fade ist dafür zu schnell). Das ist die teuerste der vier Zeichenroutinen pro Frame, folgerichtig auch das zuerst degradierte Tier (`degradeTiers[0]`, Z. 820).

### Rule-90-Zellularautomat (Saeculum-Karte)
- **Fundstelle:** `stepCA()` (Z. 161–172, geteilt mit der Karten-Preview), System-Objekt `cellular` (Z. 594–689).
- **Trigger:** Anker `#saeculum-card`.
- **Codequalität:** Solide, mit der durchdachtesten Kommentierung der vier Systeme zu einer echten Edge-Case-Falle: ein Reseed kann *mitten in einer Multi-Tick-Schleife* passieren (wenn ein Frame mehrere CA-Ticks berechnet und dabei `maxRows` überschreitet); ohne den pro-Zeile mitgeführten Generationsindex (`_newRows`, Z. 640–653) würden Zeilen kurz vor einem Reseed an den Koordinaten des *neuen* Sweeps landen. Das ist echte, in Kommentaren sichtbar gemachte Sorgfalt, keine zufällig richtige Lösung.

### Fourier-Epizyklen-Signatur (Footer)
- **Fundstelle:** `densifyPath()`/`computeDFT()`/`fourierChainPoint()` (Z. 190–258), System-Objekt `fourier` (Z. 703–803).
- **Trigger:** Anker `#site-footer`.
- **Codequalität:** Die DFT selbst ist eine naive O(N²)-Implementierung (Z. 221–238) — für `N = 220` Punkte (48 400 Operationen) läuft das aber genau **einmal** beim Skript-Laden als Modul-Level-Berechnung (Z. 240–241), nicht pro Frame, also unproblematisch. Einziges System ohne `onDisturbPulse` — bewusst und explizit begründet (Z. 692–701: "das ist die Signatur, nicht ein weiteres Experiment").

### Duplikation zwischen den vier Systemen
Es gibt eine gemeinsame Abstraktionsebene bereits — aber nur für die **reine Mathematik** (Zeilen 24–258: Farbe, Ease, `stepDeJong`, L-System-Turtle, `stepCA`, DFT), nicht für die **Struktur der Systeme selbst**. Jedes der vier Objekte (`dejong`, `lsystem`, `cellular`, `fourier`) reimplementiert unabhängig voneinander:
- sein eigenes `qualityScale`-Feld + `setQualityScale()`-Methode (vier separate, leicht unterschiedliche `Math.max(floor, q)`-Klammern: `0` beim De-Jong, `0.5`/`0.4`/`0.3` bei den anderen dreien — keine gemeinsame Konstante),
- das Muster "eigener Modul-lokaler State + `{id, anchorEl, weight, targetWeight, update, render, renderStatic}`"-Objektform (faktisch ein informelles Interface, aber nirgends als Fabrik/Basisklasse festgehalten — vier Kopien derselben Objektform).

Eine generische `createSystem({anchorEl, update, render, renderStatic, minQuality})`-Fabrik oder ein gemeinsames Animation-Loop-Modul (das den rAF-Treiber, die Degradations-Logik und die Objektform kapselt) wäre die naheliegende Auslagerung — aber der Umfang der Wiederholung ist gering (ein paar Zeilen Objektform pro System, keine wiederholte Geschäftslogik), und bei nur vier Instanzen ist der Nutzen einer Fabrik überschaubar. Das ist eher eine stilistische Verbesserung als eine, die ein echtes Wartungsproblem löst.

---

## 4. Technische Schulden

Konkrete Fundstellen, keine Pauschalaussagen.

- **`shared.scrollProgress` wird berechnet, aber nie gelesen** (`scripts/system.js:886-888`). Wird jeden Frame aus `scrollY`/`scrollHeight` neu berechnet und in `shared` abgelegt, aber keines der vier Systeme liest dieses Feld in `update()` oder `render()`. Totes Feld, vermutlich ein Überbleibsel aus einer früheren Iteration (die Kommentare an anderer Stelle verweisen wiederholt auf "Phase 1").
- **`dejong` startet mit `weight`/`targetWeight = 1`, alle anderen drei mit `0`** (Vergleich `system.js:431-432` mit `system.js:543-544`, `617-618`, `720-721`). Funktioniert auf der aktuellen Seite korrekt (Hero ist beim Laden sichtbar), ist aber eine harte Annahme "dieses System ist immer initial das dominante" statt aus dem tatsächlichen IntersectionObserver-Zustand abgeleitet — siehe Abschnitt 6, wo das für Wiederverwendung relevant wird.
- **Doppelter, teilweise toter `resize`-Listener unter `prefers-reduced-motion`.** Der oberste `window.addEventListener("resize", ...)` (`system.js:362`) wird unbedingt registriert und setzt nur `resizePending = true`; dieses Flag wird ausschließlich in `tick()` konsumiert (`system.js:881`). Unter reduzierter Bewegung läuft `tick()` aber nie (`start()` wird im reduced-motion-Zweig gar nicht aufgerufen, Z. 981-1004) — `reducedMotionInit()` registriert stattdessen ihren eigenen, zweiten `resize`-Listener (`system.js:963-971`), der direkt neu zeichnet. Ergebnis: Unter reduzierter Bewegung feuert ein Resize-Event zwei unabhängige Listener, von denen einer nichts bewirkt außer ein nie gelesenes Flag zu setzen. Harmlos, aber unsauber.
- **`prefers-reduced-motion` wird nur einmal beim Laden geprüft, nicht live beobachtet.** `prefersReducedMotion()` (`system.js:27-31`, `main.js:29-33`) wird an allen Aufrufstellen (`system.js:981`, `main.js:139`, `main.js:198`) exakt einmal zur Init-Zeit ausgewertet. Im Gegensatz dazu *wird* `prefers-color-scheme` live beobachtet (`scheme.addEventListener("change", ...)` in `system.js:915` und `main.js:128`). Ändert ein:e Besucher:in die OS-Einstellung "Bewegung reduzieren" mitten in der Sitzung, bleibt die Seite in ihrem bisherigen Modus (voll animiert oder statisch), bis neu geladen wird — inkonsistent zur sonst durchgehend sorgfältigen Beachtung dieser Präferenz.
- **Kein `@supports`-Fallback für `color-mix()` oder Container Queries** (`styles/main.css`, durchgehend: `--color-rule` Z. 53/118/136/147, `--color-signal-ink` Z. 122/137, `.project-preview`/`.tech-tags`-Hintergründe Z. 475/494, `@container project-card` Z. 536). Beide Features sind erst seit 2023 breit unterstützt (`color-mix()`: Chrome 111+/Safari 16.4+/Firefox 113+; Container Queries: Chrome 105+/Safari 16+/Firefox 110+). Fehlt die Unterstützung, wird der Custom-Property-Wert "invalid at computed-value time" und fällt still auf den ererbten/initialen Wert zurück — kein Crash, aber unstyled Ränder/Hintergründe ohne sichtbaren Hinweis. Steht im Kontrast zur sonst expliziten ES5-Vorsicht in `scripts/*.js` ("vermutlich bewusst für maximale Browser-Kompatibilität", so schon die vorherige Analyse) — die CSS-Seite trifft diese Kompatibilitätsentscheidung nicht mit derselben Konsequenz.
- **Vier informelle, aber nicht als Interface festgehaltene System-Objekte** — siehe Abschnitt 3, "Duplikation zwischen den vier Systemen".
- **`assets/images/og-image.svg` ist im ausgelieferten Produkt tot** (per `grep` verifiziert: keine Referenz in HTML/CSS/JS). Nur `og-image.png` wird im `<meta property="og:image">` genutzt; die SVG ist vermutlich die Vektorquelle. Kein Laufzeitproblem, aber ungenutzter Ballast im Repo.
- **Kein `<nav>`-Landmark, keine Sprungmarken zu den Sections** (verifiziert: kein `<nav`-Tag im gesamten `index.html`). Für eine Fünf-Wort-Visitenkarte vertretbar, wird aber beim Hub-Umbau (mehrere verlinkte Erweiterungen) zum echten Problem — siehe Abschnitt 6.

### Kritische Funde ("Attack It")

Wie im Auftrag gefordert, gezielt nach Dingen gesucht, die schlechter sind als sie auf den ersten Blick wirken. Drei substanzielle Funde, plus eine explizite Entwarnung:

1. **Die Live-Farbauflösung ist gegen genau die Browser fragil, die zur Zielgruppe der Seite passen.** `resolveColor()` (`system.js:50-56`) löst CSS-Custom-Properties (inkl. `color-mix()`-Ergebnisse) auf, indem der String auf einen 1×1-Scratch-Canvas gemalt und per `getImageData()` zurückgelesen wird — ein cleverer Trick, um den Browser-eigenen Farbparser zu nutzen. Genau diese Technik (CSS-Wert → Canvas → `getImageData()`) ist aber auch der Standard-Weg für Canvas-Fingerprinting, und genau deshalb fügen Privacy-Browser und -Erweiterungen (Tor Browser, Brave mit aktivem Fingerprinting-Schutz, LibreWolf/Firefox mit `privacy.resistFingerprinting`, einige Anti-Tracking-Extensions) dem Rückgabewert von `getImageData()` gezielt Rauschen hinzu, um genau diese Auslesetechnik unzuverlässig zu machen. Auf einem solchen Browser bekäme `colors.canvas`/`colors.signal` verrauschte, leicht falsche RGB-Werte — das gesamte generative System würde in leicht falschen, möglicherweise sichtbar inkonsistenten Farbtönen rendern, ohne Fehler oder Fallback. Die Ironie: Der Seiteninhalt selbst positioniert den Autor explizit als privatsphäre-bewusst ("privacy-conscious computing … Arch Linux, Neovim", Chapter III) — die eigene Implementierung ist gegen genau die Browser-Härtungen nicht robust, die diese Haltung in der Praxis mit sich bringt.
2. **Reduced-Motion wird nicht live beobachtet** (bereits oben unter Technische Schulden aufgeführt) — hier nochmal hervorgehoben, weil es das direkte Gegenstück zu einer vorhandenen, funktionierenden Lösung ist (color-scheme wird live beobachtet, reduced-motion nicht), also kein grundsätzliches Unvermögen, sondern eine konkret nachweisbare Lücke in sonst sorgfältiger Behandlung.
3. **Bis zu drei unabhängige `requestAnimationFrame`-Loops können gleichzeitig aktiv sein**, ohne dass eine "Race Condition" im klassischen Sinn vorliegt (JS ist single-threaded — es gibt keine Daten-Wettläufe). Der Hintergrund-Engine-Loop (`tick()`, `system.js:879`) und die zwei Karten-Preview-Loops (`loop()`, `system.js:1041`, je einmal für Epiphyte und Saeculum instanziiert) laufen völlig unkoordiniert nebeneinander, sobald beide Projekt-Karten gleichzeitig im Viewport sind (auf hohen Viewports/kurzen Seiten plausibel, da `#project-epiphyte` und `#project-saeculum` nur durch `#chapter-2` getrennt sind). Jeder Loop löst unabhängig voneinander Canvas-Zeichenoperationen aus, die der Browser potenziell in getrennten Compositing-/Paint-Schritten bearbeitet, statt in einem gemeinsam getakteten Frame. Kein Bug, aber eine reale, unnötige Verdopplung von Zeichenarbeit pro Frame in genau der Situation (zwei Live-Previews gleichzeitig sichtbar), in der die Seite ohnehin am meisten zeichnet.

**Explizite Entwarnung:** Für die im Auftrag explizit genannten Verdachtsmomente **Memory Leaks durch nicht entfernte Event-Listener** und **Layout-Thrashing durch synchrones Style-Reading im Scroll-Handler** wurde nichts Kritisches gefunden, und das ist hier vertrauenswürdig, nicht beschönigt:
- Es gibt keinen manuellen Scroll-Handler überhaupt — die gesamte Trigger-Logik läuft über `IntersectionObserver`, der nur bei echten Sichtbarkeitsänderungen feuert, nicht bei jedem Scroll-Pixel (das ist explizit die im Code dokumentierte Design-Entscheidung, Z. 369-380). Layout-lesende Aufrufe wie `getBoundingClientRect()` (Karten-Previews, `system.js:1030`) passieren nur bei Resize/Sichtbarkeitswechsel, nie im Hot-Path eines Animation-Frames.
- Event-Listener werden zwar nie explizit entfernt — aber es gibt in dieser Seite (Single-Page, kein clientseitiges Routing, keine dynamisch entfernten DOM-Knoten) auch keinen einzigen Zeitpunkt, an dem ein "Unmount" überhaupt stattfindet. Ein Leak setzt voraus, dass etwas wiederholt angehängt und nie wieder freigegeben wird, während der referenzierte Kontext mehrfach neu entsteht; hier entsteht der Kontext genau einmal pro Seitenaufruf und stirbt komplett mit dem Tab/Reload. Das ist kein Leak im technischen Sinn, sondern die korrekte Konsequenz einer Architektur ohne Teilseiten-Lifecycle.

---

## 5. Bibliotheks-Kandidaten

Jeder Kandidat gegen den bestehenden Minimalismus (Vanilla, kein Build-Step, Caddy+`git pull`-Deployment) abgewogen. Bundle-Größen sind gerundete, allgemein bekannte Richtwerte (min+gzip), keine exakte Messung dieses Projekts.

| Kandidat | Löst welches Problem | Trade-off gegen Vanilla | Empfehlung |
|---|---|---|---|
| **GSAP + ScrollTrigger** | Deklarative, scrubbare Scroll-Choreografie statt handgebauter `IntersectionObserver`+`ease()`-Logik. | ~27 KB (Core) + ~12 KB (ScrollTrigger) gzip zusätzlicher JS-Payload; externe Lizenz-/Update-Abhängigkeit; würde eine bereits funktionierende, gut dokumentierte Eigenlösung ersetzen, nicht ergänzen. Aktivierung eines Node-Toolchains für lokale Entwicklung wäre nicht zwingend (GSAP kann per `<script>`-Tag ohne Bundler eingebunden werden), aber der Kern des Arguments — "kein Dependency-Chaos" — trifft trotzdem zu, sobald eine externe Bibliothek für Kernfunktionalität verantwortlich ist. | **Nein.** Das bestehende IntersectionObserver+ease()-Crossfade-System ist bereits performant, gut verstanden und dokumentiert; GSAP würde ein Problem lösen, das aktuell nicht existiert. |
| **Lenis** (Smooth-Scroll) | Butterweiches, physikbasiertes Scroll-Gefühl. | ~6-8 KB gzip; steht im Konflikt mit der nativen Scroll-Position, auf die sich der `IntersectionObserver`-Ansatz verlässt (Lenis überschreibt i. d. R. das native Scroll-Verhalten und müsste mit dem eigenen System synchron gehalten werden); Smooth-Scroll-Libraries sind zudem ein bekannter Accessibility-/Motion-Sensitivitäts-Kompromiss, der aktiv gegen die vorbildliche `prefers-reduced-motion`-Disziplin dieser Seite arbeiten würde. | **Nein.** Löst kein artikuliertes Problem, schafft potenziell neue Reibung mit vorhandenen guten Eigenschaften. |
| **Canvas-/Creative-Coding-Library** (p5.js, two.js, paper.js) | Weniger Boilerplate für Punkte/Linien/Kreise auf Canvas. | p5.js allein ist, selbst minimiert, deutlich größer als der gesamte restliche JS-Code dieser Seite zusammen (deutlich über 100 KB); two.js/paper.js kleiner, aber lösen ein Problem, das hier gar nicht besteht — die vier Systeme sind bereits kompakte, pure Canvas-2D-Primitiven ohne komplexe Szenengraph-Anforderungen. Würde zudem dem im Hero-Text selbst formulierten Leitmotiv widersprechen ("man versteht Dinge erst, wenn man sie selbst baut"). | **Nein**, grundsätzlich — nicht nur aus Performance-, sondern aus Kohärenzgründen zum eigenen Content. |
| **Alpine.js / htmx** | Falls der Hub künftig mehrere verlinkte Microsites mit eigener, aber konsistenter Interaktivität (Theme-Sync, Sprach-Sync, wiederkehrende Steuerelemente) bekommt, böte ein deklaratives, Attribut-getriebenes Modell weniger Copy-Paste als das aktuelle Muster ("Adding a project"/"Adding a translation" in README sind explizit Copy-Paste-Rezepte). | Alpine ~15 KB gzip, htmx ~14 KB gzip — beide ohne Build-Step per `<script>`-Tag einbindbar, damit unter den hier bewerteten Kandidaten am ehesten mit dem bestehenden Deployment-Modell (Caddy, `git pull`, keine Toolchain) vereinbar. Lösen aber ein Problem, das heute (eine Seite, ein `main.js`) noch nicht existiert. | **Später**, und gezielt an den Hub-Umbau geknüpft — nicht für die aktuelle Einzelseite, sondern erst wenn tatsächlich mehrere Microsites gemeinsame Interaktions-Bausteine brauchen. |
| **Statischer Site-Generator/Templating** (z. B. 11ty) — nicht explizit im Auftrag genannt, aber direkt relevant für Abschnitt 6 | Verhindert, dass Header/Footer/Theme-Toggle/Design-Tokens bei jeder neuen Microsite erneut von Hand kopiert werden müssen. | Fügt einen Node-basierten Autorenzeit-Build-Step hinzu (Widerspruch zum aktuellen "kein Build-Step"-Prinzip) — aber nur zur Erzeugungszeit, nicht zur Laufzeit: das Deployment bliebe weiterhin reine statische Dateien hinter Caddy, `git pull` änderte sich nicht grundsätzlich (ggf. + ein Build-Schritt vor dem Pull oder als Teil eines Postreceive-Hooks). | **Später, explizit zur Prüfung im Hub-Restrukturierungs-Task selbst** — nicht Teil dieses Audits, aber die einzige hier evaluierte Option, die tatsächlich am Kernproblem aus Abschnitt 6 ansetzt (fehlende Wiederverwendbarkeit von Header/Tokens/Komponenten über mehrere Seiten hinweg). |

---

## 6. Hub-Tauglichkeit

Ehrliche Einschätzung, ohne Beschönigung: **die aktuelle Architektur ist für eine einzelne, in sich geschlossene Seite optimiert — nicht für mehrere verlinkte Erweiterungen.** Konkret:

**Was bereits gut überträgt:**
- Das Design-Token-System (`:root`-Custom-Properties in `styles/main.css`, Z. 34–150: Farben, Typografie-Skala, Spacing, Radii, Timings) ist sauber zentralisiert und *inhaltlich* portabel — jede künftige Microsite könnte dieselben Nord-Tokens übernehmen und optisch konsistent wirken.
- Die Progressive-Enhancement-Disziplin (Seite funktioniert vollständig ohne JS, README Z. 47-53) und die Philosophie "kein Build-Step, keine Dependencies" sind gut kommunizierbare, wiederholbare Prinzipien für jede neue Erweiterung — kein Framework-Lock-in, das eine künftige Microsite zwingend mitschleppen müsste.
- Kein SPA-Routing, keine clientseitige State-Verwaltung über Seitenwechsel hinweg — eine künftige Microsite kann komplett unabhängig (eigener Ordner, eigenes Repo, eigene Subdomain) existieren, ohne mit einem bestehenden Client-Framework kompatibel sein zu müssen.

**Was fehlt bzw. konkret im Weg steht:**
- **Es gibt keine tatsächlich wiederverwendbare Einheit** — weder Header/Footer/Theme-Toggle noch die Design-Tokens sind als eigenständige, importierbare Datei/Partial ausgekoppelt. Alles liegt in genau einer `index.html` + genau einer `main.css`. Jede neue Microsite müsste Header-Markup, Theme-Toggle-Logik und Tokens von Hand erneut abschreiben — exakt das Copy-Paste-Muster, das README für "ein weiteres Projekt auf *dieser* Seite" bereits als akzeptierten Trade-off dokumentiert (Z. 109-141), nur jetzt eine Ebene höher (ganze Seiten statt einzelner Karten).
- **`scripts/system.js` ist keine wiederverwendbare Engine, sondern hart an die IDs dieser einen Seite gekoppelt.** `backgroundEngine()` sucht `#hero`, `#epiphyte-card`, `#saeculum-card`, `#site-footer` per `getElementById` (Z. 271-274) — fehlen diese IDs auf einer künftigen Microsite (z. B. einer Discord-Bot-Dashboard-Seite), scheitert das nicht laut mit einem Fehler, sondern still: Da `dejong.weight`/`targetWeight` mit `1` initialisiert sind (siehe Abschnitt 4) und `#hero` fehlt, würde der De-Jong-Attraktor **dauerhaft mit voller Deckkraft rendern und nie ausblenden**, weil ihn kein IntersectionObserver-Eintrag je auf einen anderen Wert herunterregelt. Ein Wiederverwenden dieser Datei "so wie sie ist" auf einer strukturell anderen Seite würde also nicht einfach nichts tun, sondern einen sichtbaren, aber falschen Dauerzustand erzeugen — ein konkretes technisches Hindernis für genau das im Auftrag beschriebene Hub-Szenario.
- **Keine In-Page-Navigation, kein Konzept für Cross-Page-Navigation.** Es gibt kein `<nav>`, keine Sprungmarken innerhalb der Seite — und erst recht keinen Mechanismus (Header-Link, Footer-Link, Breadcrumb), über den eine künftige Microsite zurück zum Hub verlinken oder der Hub auf sie verweisen würde. Das ist heute unproblematisch (Ein-Seiten-Visitenkarte), wird aber der erste konkrete Bauteil sein, den ein Hub-Umbau liefern muss.
- **`sitemap.xml`, `robots.txt` und der `<link rel="canonical">` sind fest auf genau eine URL zugeschnitten** (`sitemap.xml` listet exakt `https://timurmanjosov.com/`; der Canonical-Tag in `index.html:26` ist hart auf die Root-URL gesetzt). Ein Hub mit mehreren verlinkten Eigenschaften (eigene Subdomains oder Unterpfade) bräuchte hier mindestens eine überarbeitete Sitemap-Strategie — heute nicht vorbereitet, aber auch keine Entscheidung, die dieses Audit trifft (siehe Out of Scope).
- **Content ist vollständig hartcodiertes Markup, keine Datenquelle.** Für die aktuellen drei Projektkarten unproblematisch (README dokumentiert das bewusst als Copy-Paste-Vorlage), aber ein Hub, der perspektivisch mehrere Erweiterungen *auflistet* (nicht selbst *ist*), würde von einer minimalen datengetriebenen Liste (und sei es nur ein kleines JS-Array oder eine JSON-Datei) mehr profitieren als von noch mehr Copy-Paste-`<article>`-Blöcken.

**Fazit:** Die Seite ist heute technisch und philosophisch ein gutes *Fundament* für einen Hub (Tokens, Prinzipien, Deployment-Modell sind alle sinnvoll übertragbar), aber sie ist selbst noch kein Hub und auch keine wiederverwendbare Bibliothek — sie ist eine einzelne, in sich geschlossene Seite, die zufällig gute Bausteine enthält. Ein Restrukturierungs-Task müsste mindestens (a) Design-Tokens in eine eigenständige, page-agnostische Datei extrahieren, (b) `system.js`s ID-Kopplung auflösen oder das Skript bewusst als "nur für diese eine Seite" markieren statt es wiederzuverwenden, und (c) ein Navigations-/Verlinkungskonzept einführen, das heute an keiner Stelle existiert.
