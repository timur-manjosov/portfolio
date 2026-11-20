# Auffindbarkeit: Suchmaschinen und KI-Systeme

Stand: Revision 6 (2026-11-17). Kurz: was umgesetzt ist, wie es geprüft
wird, was sich nicht prüfen lässt, und was Timur optional selbst tun kann.
Versprochen wird nichts: weder Rankings noch Zitate durch KI-Systeme. Der
Build pingt keine Suchmaschine an und meldet nichts irgendwohin.

## Umgesetzt

**Pro Seite (Head, `src/components/Head.astro`):** eindeutiger `<title>`
und eine Meta-Description (höchstens 160 Zeichen, eindeutig je Sprache),
absolute kanonische URL mit Schrägstrich am Ende, `<html lang>`,
`hreflang` nur für echte Sprachpaare plus `x-default`, Open Graph und
Twitter Card mit absoluten URLs (`og:type` `article` für Beiträge, sonst
`website`; `article:published_time`, `article:modified_time`,
`article:section`, `article:tag`), `meta author`. `noindex` tragen nur die
404-Seiten (und in Testbuilds Entwürfe und geplante Beiträge).

**Open-Graph-Bilder (1200×630):** jede Startseite, Blog- und
Projektübersicht, Über mich, Jetzt, Uses, Kontakt, Links, jeder Beitrag und
jedes Projekt bekommt ein eigenes Bild mit Titel, Rubrik, Datum und Sprache
(`src/lib/og.ts`, `tools/og-images.mjs`). Erzeugt nach `astro build` aus den
Meta-Tags der Seite, lokal mit Chromium, ohne Netz; Cache in `.cache/og/`.
Alle anderen Seiten nutzen `/images/og-default.png`.

**Strukturierte Daten (JSON-LD, ein `@graph` pro Seite, `src/lib/seo.ts`):**
`Person` und `WebSite` auf jeder Seite; jede indexierbare Seite hat einen
Seitenknoten (`WebPage`, `ProfilePage` für Über mich, `CollectionPage` für
Übersichten mit `ItemList`) und unterhalb der Startseite eine
`BreadcrumbList`. Beiträge: `BlogPosting` (Titel, Beschreibung, Datum,
Änderungsdatum, Sprache, Autor, Rubrik, Schlagwörter, Wortzahl, Bild,
`citation` aus dem Quellenabschnitt) im `Blog` ihrer Sprache. Projekte:
`SoftwareSourceCode` mit `codeRepository` und `programmingLanguage`, ohne
öffentliches Repository `CreativeWork`. Stabile `@id`s
(`https://timurmanjosov.com/#person`, `…/#website`, `<URL>#webpage`,
`<URL>#post`, `/<lang>/blog/#blog`). Kein FAQ-, HowTo-, Review- oder
Bewertungs-Markup, nichts, was nicht sichtbar auf der Seite steht.

**Eine Quelle für die Identität:** Name, Rolle, Kurzbeschreibung, Studium
und Schwerpunkt stehen nur in `src/data/site.ts` (`profile`). Daraus
kommen die Description der Startseiten, `Person.description`, `llms.txt`,
der Faktenblock auf Über mich und das Bild der Startseite.

**Sitemap und Feeds:** `sitemap.xml` mit `lastmod` aus dem echten
Änderungsdatum und Sprachalternativen, ohne Entwürfe, geplante Beiträge und
`noindex`-Seiten; `robots.txt` verweist auf sie. RSS pro Sprache (und pro
Rubrik) mit **Volltext** (`content:encoded`), Autodiscovery per
`<link rel="alternate">`.

**KI-Auffindbarkeit:**
- `/llms.txt` nach llmstxt.org (gelesen am 2026-11-17): H1, Zusammenfassung
  als Blockquote, Fakten, Abschnitte mit Links und je einem Satz,
  „Optional“ zuletzt. Jede indexierbare Seite verweist mit `rel="describedby"` darauf.
- `/llms-full.txt`: alle veröffentlichten Beiträge als Markdown in einer
  Datei (derzeit rund 110 KB, Grenze 1,5 MB).
- **Markdown-Zwillinge:** jeder Beitrag, jedes Projekt und Über mich, Jetzt,
  Uses zusätzlich unter `<URL>index.md` (Kopf mit Titel, URL, Datum,
  Sprache, Autor, Beschreibung; Formeln als TeX; Grafiken als ihr
  Textäquivalent), verlinkt mit
  `<link rel="alternate" type="text/markdown">`. Rechtliche Seiten und
  Kontakt haben keinen Zwilling (sie hängen an privaten Daten).
- **Zitierbarkeit:** stabile URLs, sichtbares Veröffentlichungs- und
  Änderungsdatum, Autor, Quellenabschnitt, Anker an Überschriften und die
  Zeile „So zitierst du diesen Beitrag“.

## robots.txt und der Schalter

Die Datei entsteht aus **`src/data/crawlers.ts`**: zwei Gruppen mit je einem
Schalter, danach `User-agent: *` (alles erlaubt) und die Sitemap.

| Gruppe | Wer (Token aus den Anbieter-Dokumentationen) | Standard |
|---|---|---|
| `search` (Suche und Antworten) | Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot | erlaubt |
| `training` | GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot | erlaubt |

**Trainings-Crawler sperren:** in `src/data/crawlers.ts` bei `training`
`allow: true` auf `allow: false` setzen, bauen, veröffentlichen. Dann steht
für genau diese Gruppe `Disallow: /` in `robots.txt` (`check:ai` prüft das).

`robots.txt` ist eine **Bitte, keine Durchsetzung**: Seriöse Crawler halten
sich daran, verhindern kann sie nichts. Abrufe, die ein Mensch in einem
Assistenten auslöst (ChatGPT-User, Perplexity-User), wenden die Regeln laut
OpenAI und Perplexity unter Umständen gar nicht an. `Google-Extended` und
`Applebot-Extended` crawlen nicht selbst; sie steuern nur, ob die von
Googlebot bzw. Applebot geholten Inhalte für Modelle verwendet werden.
`Google-Extended` beeinflusst laut Google weder die Aufnahme in die Suche
noch das Ranking.

Quellen (alle gelesen am 2026-11-17):
- OpenAI: https://developers.openai.com/api/docs/bots (OAI-SearchBot,
  ChatGPT-User, GPTBot)
- Anthropic: https://support.claude.com/en/articles/8896518 (ClaudeBot,
  Claude-User, Claude-SearchBot)
- Perplexity: https://docs.perplexity.ai/guides/bots (PerplexityBot,
  Perplexity-User)
- Google: https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
  (Googlebot, Google-Extended)
- Microsoft: https://www.bing.com/webmaster/help/which-crawlers-does-bing-use-8c184ec0
  (Bingbot)
- Apple: https://support.apple.com/en-us/119829 (Applebot,
  Applebot-Extended)
- Common Crawl: https://commoncrawl.org/ccbot (CCBot)

## Nutzt jemand llms.txt?

Befund (2026-11-17): **Nutzen unbelegt.** Keine der oben genannten
Crawler-Dokumentationen von OpenAI, Anthropic, Google, Perplexity, Apple
oder Microsoft erwähnt `llms.txt`. Sekundärquellen (Auswertungen von
SEO-Anbietern, z. B. eine Logfile-Analyse von Ahrefs vom Mai 2026) berichten,
dass die allermeisten `llms.txt`-Dateien von KI-Crawlern gar nicht abgerufen
werden; genutzt wird das Format vor allem von Entwicklerwerkzeugen, denen man
eine Dokumentationsseite gibt. Diese Zahlen sind nicht selbst geprüft. Die
Datei ist billig (aus denselben Daten wie die Seite erzeugt), deshalb wird
sie geliefert.

## Wie geprüft

- `npm run check:seo` (Teil von `npm run check`): `tools/check-seo.mjs`
  (ein `h1`, `lang`, Canonical, reziproke `hreflang`, Titel und Description
  eindeutig und ≤ 160 Zeichen, Open-Graph-/Twitter-Tags, Bild vorhanden,
  `og:type`, `article:*`, `noindex` nur wo gewollt, Feeds mit Volltext,
  Sitemap-Abdeckung) und `tools/check-jsonld.mjs` (Pflichtfelder und Typen
  je Knoten, jede `@id`-Referenz löst im selben Graphen auf, verbotene
  Typen, Übereinstimmung mit dem sichtbaren Text: Überschrift, Description,
  Daten, Rubrik, Schlagwörter, Quellen, Repository-Link, Listeneinträge;
  Identität gleich auf allen Seiten). Ersetzt Online-Validatoren.
- `npm run check:ai`: Form von `llms.txt`, `llms-full.txt` vollständig und
  klein genug, Markdown-Zwillinge stimmen in Titel, URL, Datum, Sprache und
  Textumfang (±15 %) mit der Seite überein, `robots.txt` entspricht der
  Konfiguration und der Schalter wirkt, und ein Build mit Datum vor dem
  neuesten Beitrag enthält in **keinem** Artefakt einen geplanten Beitrag
  (HTML, Feeds, Sitemap, Suche, `llms*.txt`, Zwillinge, Open-Graph-Bild).
- `npm run check:post-surfaces`, `check:scheduled`: jeder öffentliche
  Beitrag erscheint überall, geplante nirgends.
- Nach dem Hochladen: `npm run verify:live` (Statuscodes, Header,
  `robots.txt`, `llms*.txt`, Feeds, JSON-LD, Content-Type der Zwillinge).

## Nicht prüfbar (lokal)

- Wie Suchmaschinen und KI-Systeme die Seite tatsächlich crawlen, bewerten
  oder zitieren.
- Welchen `Content-Type` Caddy für `.md` sendet: hängt von der
  MIME-Tabelle des Servers ab (Vorschlag: `docs/DECISIONS.md` R6-D12).
  `verify:live` meldet es als Warnung.
- Wie Plattformen die Open-Graph-Bilder zuschneiden oder zwischenspeichern.

## Optionale manuelle Schritte (Timur)

1. **Google Search Console:** https://search.google.com/search-console →
   Property „Domain“ `timurmanjosov.com` → per DNS-TXT-Eintrag bestätigen →
   unter „Sitemaps“ `https://timurmanjosov.com/sitemap.xml` einreichen.
2. **Bing Webmaster Tools:** https://www.bing.com/webmasters → Website
   hinzufügen (oder aus der Search Console importieren) → bestätigen →
   Sitemap einreichen.
3. Danach dort gelegentlich die Berichte zu Indexierung und Fehlern lesen.
   Nichts davon ist für den Betrieb nötig.
