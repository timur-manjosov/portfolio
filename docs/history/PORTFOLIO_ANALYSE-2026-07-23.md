# Portfolio-Analyse: timurmanjosov.com

> Reine Bestandsaufnahme, Stand 2026-07-23. Es wurden keine Änderungen am
> bestehenden Code vorgenommen — dieses Dokument ist die einzige neue Datei.

---

## 1. Tech-Stack

| Aspekt | Befund |
|---|---|
| Framework/Library | **Keins.** Vanilla HTML5 + CSS3 + Vanilla JS (IIFE). Kein React/Vue/Astro/Next.js. |
| Sprache | HTML, CSS, **JavaScript** (kein TypeScript, keine `.ts`-Dateien). JS ist ES5-nah gehalten (`function`-Deklarationen statt Arrow Functions/Classes) — vermutlich bewusst für maximale Browser-Kompatibilität ohne Transpiler. |
| Styling | **Plain CSS**, kein Tailwind/Sass/CSS-Modules/styled-components. Zwei Dateien: `reset.css` (Basis-Reset, farb-/layoutfrei) und `main.css` (alles Weitere). Nutzt moderne native CSS-Features: `clamp()`, `color-mix()`, Container Queries (`@container`), `:has()`-freie, aber Custom-Property-getriebene Architektur. |
| Build-Tooling | **Keines.** Kein `package.json`, kein `node_modules`, kein Bundler (Webpack/Vite/esbuild), kein Task Runner. Dateien werden 1:1 ausgeliefert. |
| Package Manager | **Keiner** — es gibt keine JS-Abhängigkeiten (0 externe Libraries, keine CDN-Einbindungen). |
| Fonts | Selbst gehostete Variable Fonts (`.woff2`, Latin-Subset): Space Grotesk, Inter, JetBrains Mono. Kein Google-Fonts-CDN-Aufruf. |
| Deployment | Laut `README.md`: **statische Dateien hinter Caddy** (eigener Server). Keine plattformspezifische Config-Datei im Repo (kein `vercel.json`, `netlify.toml`, `Dockerfile`, `Caddyfile`, keine GitHub-Pages-`CNAME`). Die Caddy-Konfiguration liegt offenbar außerhalb dieses Repos auf dem Server. |

**Fazit:** Bewusste Minimalismus-Entscheidung — "no build step, no framework" ist explizit im README dokumentiert. Für eine Ein-Seiten-Visitenkarte ein sehr schlanker, wartungsarmer Ansatz ohne Dependency-Risiko.

---

## 2. Projektstruktur

```
.
├── index.html          Einzige HTML-Datei — komplette Seite, beide Sprachen inline
├── styles/
│   ├── reset.css        109 Zeilen — Reset ohne Farb-/Typo-/Layout-Entscheidungen
│   └── main.css          651 Zeilen — Design-Tokens, Theming, komplettes Layout
├── scripts/
│   └── main.js           344 Zeilen — Theme-/Sprach-Toggle, Scroll-/Load-Motion
├── assets/
│   ├── fonts/            3× woff2 (Space Grotesk, Inter, JetBrains Mono)
│   └── images/           Favicons (svg + png-Fallbacks), OG-Bild (svg + png)
├── robots.txt
├── sitemap.xml
├── README.md
└── .gitignore
```

- **Routing:** Kein Routing im klassischen Sinn — **Single-Page mit Anchor-Sections** (`#hero`, `#about`, `#projects`, `#sport`, `#contact`). Keine In-Page-Navigation/`<nav>` mit Sprungmarken-Links vorhanden (Header enthält nur Sprach-/Theme-Toggle, keine Menüpunkte zu den Sections).
- **Komponentenstruktur:** Da kein Framework verwendet wird, existieren keine "Komponenten" im technischen Sinn. Wiederverwendung entsteht über CSS-Klassen (`.project-card`, `.section-divider`, `.contact-list` etc.) und Copy-Paste-Muster, die im README explizit als Vorlage dokumentiert sind ("Adding a project", "Adding/editing a translation").
- **Content-Ort:** Vollständig **hardcoded direkt in `index.html`**. Keine JSON-/YAML-/MDX-Datenquelle, kein Headless-CMS. Beide Sprachversionen jedes Textbausteins liegen als `data-en`/`data-de`-Attribut-Paar auf demselben Element (Ausnahme: der Theme-Toggle-Text, der zustandsabhängig ist und in einem `THEME_LABELS`-Objekt in `main.js` gepflegt wird).

---

## 3. Design-System

- **Design-Tokens:** Zentral in `styles/main.css` unter `:root` als CSS Custom Properties gebündelt — Farben, Typografie (fluid `clamp()`-Skala `--step--1` … `--step-4`), Spacing-Skala (`--space-1` … `--space-9`), Radii, Transition-Timings, Layout-Werte (`--content-max`, `--gutter`). Kein verstreutes Hardcoding von Hex-Werten oder px-Größen in den Komponentenregeln — das README fordert dies explizit als Konvention ein.
- **Farbpalette:** **Nord** (nord0–nord8), mit einer Ebene "semantischer" Tokens (`--color-canvas`, `--color-ink`, `--color-signal-ink` …) darüber, die je nach Theme umgemappt werden. Kommentar im Code dokumentiert einen bewusst korrigierten Kontrastwert (Nord-8-Akzent wird im Light-Theme Richtung Ink abgedunkelt, um WCAG-AA ≥4.5:1 zu erreichen — von ~1.7:1 auf ~4.8:1).
- **Responsiveness:** Mobile-first mit genau **einem** expliziten Breakpoint (`min-width: 60rem` für das Hero-Grid) plus fluidem Verhalten via `clamp()` für Typografie/Spacing/Gutter — dadurch werden viele klassische Breakpoints überflüssig. Zusätzlich eine **Container Query** (`@container project-card (min-width: 24rem)`) für kartenlokale Anpassung unabhängig vom Viewport.
- **Dark Mode/Theming:** Drei-Wege-Logik: `prefers-color-scheme`-Systemwert als Default, manueller Toggle überschreibt via `data-theme="light|dark"` auf `<html>`, Wahl wird in `localStorage` persistiert. Ein kleines inline-`<script>` im `<head>` setzt das Attribut synchron vor dem ersten Paint (kein Flash-of-wrong-theme).
- **Animationen:** **Reines CSS + Vanilla JS**, keine Animations-Library (keine GSAP/Framer Motion). Scroll-Reveal via `IntersectionObserver` + CSS-Klassen (`.reveal-init`/`.is-visible`), ein handgebauter Lissajous-Kurven-Signature-Effekt im Hero (mathematisch parametrisiert: `x = sin(a·t+δ), y = sin(b·t)`, mit Pointer-reaktivem Drift, gedrosselt auf ~20fps), sowie ein subtiler Lattice-Parallax-Effekt (Hintergrundraster folgt der Maus). Alles respektiert `prefers-reduced-motion` konsequent auf mehreren Ebenen: `main.js` überspringt Motion-Init komplett, und `reset.css` kollabiert als zweite Sicherheitsebene jede verbleibende Transition-Dauer auf ~0.

---

## 4. Content-Inventar

**Sections (in Reihenfolge):** Hero (Name + Selbstbeschreibung + Lissajous-Grafik) → About → Projects → Sport → Contact. Dazu Header (Brand-Initialen "TM" + Sprach-/Theme-Controls) und Footer (Copyright).

- **Projekte (Epiphyte, Saeculum):** Als **Karten-Grid** (`ul.project-grid` → `li > article.project-card`), Datenquelle ist ausschließlich das HTML selbst (kein JSON/API). Jede Karte: Titel, zweisprachige Beschreibung, Tech-Tag-Liste, GitHub-Link mit Pfeil-Icon. Das README dokumentiert das exakte Copy-Paste-Muster fürs Hinzufügen weiterer Projekte — aktuell nur 2 Einträge, Kommentar im HTML markiert die Stelle für zukünftige ("Future projects: add another `<li>`…").
- **Bilder/Assets:** Es gibt **keine einzige `<img>`-Einbindung** im gesamten Content — alle visuellen Elemente (Hero-Kurve, Section-Divider-Achsen) sind **inline SVG**, direkt im HTML, `aria-hidden="true"` da rein dekorativ. Echte Rasterbilder existieren nur "out-of-band" für Meta-Zwecke: Favicons (svg + 16px/32px PNG-Fallback + Apple-Touch-Icon) und ein OG-Share-Bild (`og-image.png`, 1200×630). Fonts sind self-hosted `.woff2`, per `<link rel="preload">` vorab geladen.

---

## 5. Qualitäts-Check (nur Beobachtung)

**Duplikate:**
- Der Section-Divider-SVG-Block (13 Zeilen: `<line>`-Serie + `<circle>`) ist **identisch 4× dupliziert** in `index.html` (vor About/Projects/Sport/Contact). Bei einem Framework wäre das eine Komponente; im Vanilla-Ansatz ist die Duplikation der Preis für "kein Build-Step" — bewusster Trade-off, keine versehentliche Redundanz.
- Die vier `[data-en]`/`data-de`-Sprachpaare sind naturgemäß pro Textknoten dupliziert (englischer Text steht sowohl als Attribut als auch als sichtbarer `textContent`) — das ist so vom README-Konzept vorgesehen, keine Code-Smell im engeren Sinn.

**Tote Dateien / ungenutzte Assets:**
- `assets/images/og-image.svg` wird **nirgends referenziert** (weder in HTML noch CSS/JS) — nur `og-image.png` wird im `<meta property="og:image">`-Tag verwendet. Die SVG ist vermutlich die Vektor-Quelldatei, aus der das PNG gerendert wurde, aber ungenutzt im ausgelieferten Produkt. Kein funktionales Problem, da sie nicht ausgeliefert wird, sofern der Server keine Verzeichnislisten offenlegt.
- Keine ungenutzten Dependencies möglich, da keine Dependencies existieren.

**Accessibility-Basics:** durchgehend solide.
- Semantisches HTML: `header`, `main`, `section` (je mit `aria-labelledby`), `footer`, korrekte Heading-Hierarchie (h1 → h2 → h3).
- Skip-Link vorhanden (`.skip-link`, wird bei Fokus sichtbar).
- Dekorative SVGs konsequent `aria-hidden="true"` bzw. `focusable="false"`.
- Sprach-/Theme-Toggle mit `aria-pressed`, `aria-label`, Gruppen-`role="group"`.
- `:focus-visible`-Outline global gestylt.
- Kontrast bewusst geprüft und dokumentiert (siehe Abschnitt 3).
- Es fehlt eine In-Page-Navigation/Landmark `<nav>` — bei nur 5 Sections und Anchor-losem Header vermutlich bewusst, aber Screenreader-Nutzer haben keinen Sprungmarken-Mechanismus außer dem einen Skip-Link zu `#main-content`.

**Performance-Auffälligkeiten:** keine.
- Gesamtes Repo (ohne `.git`) nur **~288 KB**, größte Einzeldatei ist `og-image.png` mit 84 KB.
- Keine In-Content-Rasterbilder → Lazy-Loading ist nicht nötig, da es nichts zu laden gibt außer den drei preloadeten Fonts (~104 KB gesamt) und Favicons.
- `font-display: swap` gesetzt, Fonts sind Latin-Subsets (klein gehalten).
- Motion-Code ist gedrosselt (~20fps für den Drift-Effekt) und nutzt `IntersectionObserver`, um Animationen zu pausieren, wenn das Element nicht sichtbar ist bzw. der Tab im Hintergrund ist.

---

## 6. SEO/Meta

| Element | Status |
|---|---|
| `<title>` | ✅ vorhanden, aussagekräftig |
| Meta-Description | ✅ vorhanden |
| Canonical-Link | ✅ `https://timurmanjosov.com/` |
| Open Graph | ✅ vollständig (`type`, `url`, `title`, `description`, `image` inkl. `width`/`height`/`alt`, `locale` + `locale:alternate` für `de_DE`) |
| Twitter Card | ✅ `summary_large_image` mit Title/Description/Image/Alt |
| Favicon | ✅ mehrstufig: SVG (modern) + 16px/32px PNG-Fallback + Apple-Touch-Icon fürs iOS-Homescreen |
| `sitemap.xml` | ✅ vorhanden, aber nur **eine URL** gelistet (die Startseite — logisch, da Single-Page) |
| `robots.txt` | ✅ vorhanden, erlaubt alles, verweist korrekt auf die Sitemap |
| `color-scheme`-Meta | ✅ `dark light` gesetzt, konsistent mit dem CSS-Theming |
| Strukturierte Daten (JSON-LD) | ❌ nicht vorhanden — für eine private Ein-Personen-Visitenkarte kein kritischer Mangel, aber ein `Person`-Schema wäre eine leichte Ergänzung |
| `hreflang` | ❌ nicht vorhanden — folgerichtig, da DE/EN nicht als getrennte URLs existieren, sondern rein clientseitig per JS umgeschaltet werden. Crawler sehen standardmäßig die englische Version (das ist der literale `textContent`), die deutsche Übersetzung ist für Suchmaschinen praktisch unsichtbar. |

---

## Gesamteinschätzung

Ein bewusst **radikal minimalistisches** Projekt: keine Frameworks, keine Build-Pipeline, keine Dependencies, dafür hoher Pflegeaufwand für Konsistenz "von Hand" (dokumentiert im README als Copy-Paste-Rezepte). Die Code-Qualität ist für den gewählten Ansatz hoch: durchdachtes Custom-Property-Token-System, sauberes progressive-enhancement-Prinzip (Seite funktioniert vollständig ohne JS), konsequente Beachtung von `prefers-reduced-motion` und Kontrast-Anforderungen. Die einzigen nennenswerten Beobachtungen sind die naturgemäße SVG-Blockduplikation (Preis des No-Build-Ansatzes), eine ungenutzte `og-image.svg` und das Fehlen von `hreflang`/strukturierten Daten — alles unkritisch für den Zweck (private "Hallo, das bin ich"-Seite, kein Portfolio-Showcase im klassischen Sinn).
