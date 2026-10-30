# Final report: timurmanjosov.com redesign

# Revision 5 (2026-10-30)

Veröffentlichen ohne Code, vier Startartikel, pushfertiger Branch. Alles auf
`redesign` committet, daraus `redesign-clean` mit einem Commit gebaut.
Nichts gepusht, nichts deployt, kein Server-Zugriff, kein Branch umbenannt,
`redesign` nicht umgeschrieben. Belege: `docs/VERIFICATION.md` (Revision 5),
Entscheidungen: `docs/DECISIONS.md` R5-D1 bis R5-D7.

## Was sich geändert hat

- **Beispielartikel → Testfixtures** (`tests/fixtures/blog/`), nur in
  Testbuilds; ein Test beweist, dass Produktions- und Release-Build keine
  Spur davon enthalten.
- **Vier Startartikel** (Tabelle unten), jede Zahl aus einem Skript unter
  `tests/articles/` mit Asserts, Quellen gegen Primärquellen geprüft.
- **Geplante Veröffentlichung:** Datum nach dem Build-Tag (Berliner Zeit) →
  im Produktions-/Release-Build vollständig draußen, in Dev/Test als
  „geplant“ markiert.
- **`npm run publish`** (`--dry-run`, `--rollback`, `--keep`, `--no-sudo`):
  baut mit `build-release.sh`, zeigt neue/geänderte/entfernte URLs und
  geplante Artikel, lädt nur Inhalte hoch und schaltet auf dem Server den
  Symlink `current` um (ein `sudo`), prüft per HTTP und schaltet bei Fehler
  automatisch zurück. Caddy wird nie geändert oder neu geladen; steht eine
  Caddy-Änderung an, verweigert `publish` und verweist auf `./ship.sh`.
- **`new:post`, `new:project`, `edit`, `edit:now`:** Vorlagen mit Berliner
  Datum und Kollisionsprüfung; `edit` öffnet `$EDITOR`, setzt `updated` bei
  Seiten und Projekten, prüft das Frontmatter mit denselben Schemas wie der
  Build (`src/lib/content-schemas.ts`).
- **Bilder in Artikeln:** neben dem Artikel, beim Build optimiert;
  fehlender Alt-Text, externe Bilder und `<img>`-HTML lassen den Build
  scheitern.
- **GitHub-Daten:** `repo: owner/name` füllt beim Release leere Stack-Chips
  (Sprachen) und den Quellcode-Link; Cache 24 h, nie ein Build-Abbruch,
  standardmäßig aus, Frontmatter hat Vorrang.
- **`check:prepush`:** schlägt jetzt auch bei einer unlesbaren privaten
  Datei fehl (fail closed); Exit-Codes 0/1/2 getestet.
- **Doku:** neu `docs/PUBLISHING.md`; README, CLAUDE.md, GO-LIVE (Schritt 3
  angepasst, neuer Schritt 11), DEPLOY, CONTENT-TODO, PROGRESS aktuell.

## Gemessen

- `npm run check` grün (29 ✓-Zeilen, 9 Prüfungen neu in Revision 5), `check:browser:system`
  grün (66 Seiten Produktion, 108 Seiten Drafts, 0 CSP-Verstöße),
  Kontrast AA (116 Paare), Dunkelpalette unverändert, Budgets: `/en/`
  60,1 KB gzip, JS ≤ 4,5 KB, Lighthouse 100 in allen Kategorien und CLS 0
  auf `/de/`, `/en/`, `/en/projects/` und einem Artikel.
- Neue Tests: `check:publish` 49 Fälle, `check:new-content` 61 (inkl.
  Round-Trip ohne Diff über alle Inhaltsdateien), `check:images` 25,
  `check:github-meta` 31, `check:post-surfaces` 56, `check:prepush-exit` 6,
  `check:scheduled` 16 Unit-Tests + 5 Builds; ShellCheck 0 Befunde.
- **Editor (Keystatic, gemessen und verworfen):** @keystatic/astro 6.0.0,
  @keystatic/core 0.6.9 (August 2026, MIT, unterstützt Astro 7). Allein
  359 Pakete / 273 MB; **112 Pakete / 70 MB zusätzlich** zu diesem
  Repository (React 19, react-aria, react-stately, Keystar UI). Verworfen,
  weil laut eigener Doku HTML im MDX-Feld nicht unterstützt wird (zwei
  Artikel haben Inline-SVG) und weder Formeln noch Fußnoten dokumentiert
  sind: Speichern würde die Artikel umschreiben. Stattdessen der
  vorgeschriebene Fallback (`$EDITOR`), kein eigener Web-Editor.

## Nicht prüfbar (alles auf dem Server)

SSH, `sudo`, der Vergleich mit dem Live-Caddyfile in `publish`, die
HTTP-Prüfung auf dem Server, Besitz und Rechte des Webroots (Prüfbefehle:
`docs/PUBLISHING.md` §9). Der CI-Lauf (erst nach dem Push). Der optionale
Release-Schritt: **übersprungen**, weil `private/site.private.yaml` nicht
existiert (nur die Testdatei). Firefox/Safari.

## Abweichungen von den Vorgaben

- **Daten:** Sitzung 1 datierte zwei Artikel auf den 29.10.; der Lauf
  endete am 30.10. Alle vier Daten sind um einen Tag nach vorn gerückt,
  damit keines in der Vergangenheit liegt (R5-D2).
- **Kein `npm run admin`:** Keystatic passt nicht zum Inhaltsformat
  (R5-D5); `new:post` öffnet nichts, `edit` öffnet den Editor (getrennte
  Befehle, beide Vorgaben gelten).
- **Umschalten per Symlink statt Synchronisieren mit Sicherung:** Der
  Symlink existiert nach dem ersten Livegang ohnehin; atomar und ohne
  Caddy-Änderung (R5-D4). Variante B (ein `sudo`) ist Standard, Variante A
  als `--no-sudo` vorhanden.
- **Letzter Push und Sterne** werden gecacht, aber nicht angezeigt (kein
  passendes Feld im Layout; `updated` bleibt handgepflegt, R5-D7).
- **Sprachumschalter bei Einzelsprache:** sichtbar, führt zum Blog der
  anderen Sprache (R5-D6).

## Die vier Startartikel

| Titel | Kategorie | Sprachen | Datum |
|---|---|---|---|
| Das Gruppengesetz auf elliptischen Kurven, nachgerechnet / The group law on elliptic curves, worked through | Mathe & Kryptografie | DE + EN | 30.10.2026 |
| Die Doppelausgabe-Rechnung im Bitcoin-Whitepaper, nachgerechnet / The double-spend calculation in the Bitcoin white paper, recomputed | Blockchain-Technik | DE + EN | 30.10.2026 |
| Content-Security-Policy für statische Seiten | Technik | DE | 06.11.2026 (geplant) |
| Subset Sum: NP-vollständig und trotzdem oft leicht | Theorie & Systeme | DE | 13.11.2026 (geplant) |

Beim Lesen besonders prüfen:
- **Elliptische Kurven:** ob dir die Darstellung der Assoziativität (Verweis
  auf Washington und Silverman statt eigenem Beweis) genügt.
- **Doppelausgabe:** ob du die Kernaussage „die Tabellen stimmen, das
  Modell unterschätzt das Risiko“ so unter deinem Namen vertreten willst,
  samt Fußnote zu einem Tabellenwert bei Grunspan/Pérez-Marco.
- **CSP:** ob die allgemeinen Empfehlungen zu deiner eigenen Seite passen
  (sie nennt keine Details deines Servers).
- **Subset Sum:** den Abschnitt zum Phasenübergang (Mertens' Formel, die
  Tabelle mit 200 Zufallsinstanzen je Bitbreite).

Danach in jeder Datei `status: ready` setzen.

## Dein erster eigener Artikel in fünf Schritten

1. `npm run new:post -- --title "Dein Titel" --category math-crypto`
2. `npm run edit -- post dein-titel` – schreiben; Formeln mit `$…$`,
   Bilder neben den Artikel mit Alt-Text.
3. `npm run dev` – Vorschau unter `http://localhost:4321/de/blog/`.
4. `draft: false` setzen, `npm run check`, committen (noreply-Adresse).
5. `npm run publish -- --target <ssh-target> --dry-run`, Übersicht lesen,
   dann ohne `--dry-run` veröffentlichen.

## Was `push-clean.sh` gleich tut

Wenn `PUSH_AFTER_RUN=1` gesetzt ist, ruft das Startskript
`prompts/push-clean.sh` auf. Es pusht `redesign-clean` nach
`origin/redesign`, ohne Force und ohne Tags, nur wenn der Baum sauber ist,
`redesign` und `redesign-clean` identische Dateibäume haben, höchstens fünf
Commits hochgeladen würden (es ist einer, auf `origin/main` `77b9333`),
jede Autor- und Committer-Adresse eine noreply-Adresse ist und
`check:prepush` GO meldet (Exit-Code 0). Danach benennt es lokal um:
`redesign` → `redesign-alt`, `redesign-clean` → `redesign`.

## Nächste Schritte bis zum Livegang (Reihenfolge `docs/GO-LIVE.md`)

1. `private/site.private.yaml` ausfüllen; Texte mit `draft-review` lesen
   (CONTENT-TODO, zuerst Über mich und die vier Artikel).
2. `npm run check` und `npm run check:browser:system`.
3. Push (erledigt `push-clean.sh`, sonst GO-LIVE Schritt 3), Pull Request
   `redesign` → `main`, CI abwarten, mergen. Keine Tags pushen.
4. `deploy/build-release.sh --private private/site.private.yaml`.
5. `deploy/stage.sh <ssh-target>`.
6. Caddyfile-Diff und `apply-on-server.sh` lesen.
7. Dry Run auf dem Server.
8. Livegang mit einem `sudo`.
9. Nachprüfen (curl, Browser).
10. Bei Bedarf Rollback.
11. Danach jede Inhaltsänderung mit `npm run publish`; vorher einmal die
    Prüfbefehle aus `docs/PUBLISHING.md` §9 ausführen. Am 06.11. und 13.11.
    erscheinen die geplanten Artikel mit dem nächsten `publish`.

# Revision 4 (2026-10-28)

Letzter Durchgang vor Push und Live-Schaltung, auf `redesign`, lokal
committet. Nichts gepusht, kein Server-Zugriff, keine Historie
umgeschrieben. Belege: `docs/VERIFICATION.md` (Revision 4), Entscheidungen:
`docs/DECISIONS.md` R4-D1 bis R4-D10.

## Was sich geändert hat

- **Hellmodus nach Material 3:** fast weiße, leicht bläuliche Flächen,
  weiße Karten, dunkles Graublau als Text, klares Blau `#005bc0` als
  Primärfarbe, Pastell-Container, Petrol als zweiter Akzent, Grün und
  Amber nur im Projektstatus. Hero-Name: Blauviolett → Blau → Petrol.
  Werte aus Googles `material-color-utilities` (HCT, Seed `#1a73e8`), nicht
  aus dem Gedächtnis. Vorher/Nachher-Tabelle: DECISIONS R4-D2. Kein
  Google-Logo, keine Google-Schrift (Inter bleibt), das Wort "Google" steht
  nirgends auf der Seite.
- **Dunkelmodus:** jeder Farbwert gleich, abgesichert durch
  `tools/fixtures/dark-tokens.snapshot.json` und `npm run check:dark-tokens`
  (Teil von `npm run check`).
- **Boxen:** drei Typen (outlined, filled, elevated), Radien 4/8/12/16/24,
  Abstände im 4/8-Raster, Elevation in Stufen, ein Pfeil in jeder
  klickbaren Box (schräg für externe Links). Neu: /now als klickbare Karte,
  Kontaktbox gefüllt, /links als Kästchen-Raster, Faktenleiste auf Über
  mich, Filter als kompakte Leiste. Im Dunkelmodus nur Form, keine neuen
  Farben.
- **Bewegung beim Überfahren:** State-Layer (8 % Hover, 10 % Fokus/Druck),
  Karte hebt sich 4 px und bekommt Elevation 2 und die Verlaufskontur,
  Titel färbt sich, Pfeil rückt 3 px vor, Chips reagieren gestaffelt,
  Fokusring blendet ein, Theme-Icon dreht sich und blendet über,
  Erscheinen beim Scrollen 12 px / 80 ms. Hover nur auf Geräten mit Maus;
  Touch bekommt nur den Druckzustand; Reduced Motion bewegt nichts.
- **Über mich DE und EN** neu: Einstieg, Was ich mache, Studium,
  Womit ich arbeite (ehrlich gewichtet), Haltung, Was mich sonst
  interessiert, Kontakt. Nur aus öffentlichen Quellen;
  `private/about-notes.md` gab es nicht. `about-extra` wird per Konvention
  angehängt, wenn `private/content/<lang>/about-extra.md` existiert
  (getestet).
- **Leerer Blog:** ein ehrliches Panel mit RSS, Projekten und Über mich
  statt eines gestrichelten Platzhalters.
- **Politur:** neues Open-Graph-Bild und neue Favicons im neuen Design (das
  alte Bild behauptete "coaches others in sport"); kürzere
  Meta-Beschreibungen; 404 mit einem Haupt- und vier Textbuttons; tote
  Styles entfernt, doppelte Box-Deklarationen zusammengeführt;
  CI-Aktionen auf aktuelle Releases per Commit festgelegt.
- **`npm run check:prepush`:** prüft jeden Commit, der hochgeladen würde,
  und sagt GO oder NO-GO. Dazu `docs/GO-LIVE.md` Schritt 3 "Before the
  push": ein sauberer Branch mit einem Commit unter deiner
  noreply-Adresse, im Klon unter `.tmp/` durchgespielt (vorher NO-GO,
  danach GO, Dateibaum identisch).
- **Doku:** README, GO-LIVE, DEPLOY, CLAUDE.md, CONTENT-TODO auf Endstand,
  `docs/PROGRESS.md` aufgeräumt.

## Gemessen

| | Ergebnis |
|---|---|
| `npm run check` | grün |
| Browser-Suite Produktion / Entwürfe | grün, 42 / 63 Seiten, je 49 Bewegungsprüfungen, 0 CSP-Verstöße |
| Kontrast | 116 Paare AA in hell und dunkel; Name 3,63:1 (groß, min. 3) |
| Dunkelmodus-Snapshot | 32 Werte unverändert |
| Lighthouse mobil | 100/100/100/100 auf `/de/`, `/en/`, `/en/projects/`, `/en/projects/aura/` |
| Budgets | Startseite 59,9 KB gzip (≤ 120), JS 2,1 KB (≤ 15), CLS 0 |
| Screenshots | 6 Durchgänge, 320–1920 px, hell und dunkel, 0 Überlauf |
| Release-Probe | Testrelease gebaut und gesperrt, `--dry-run` mit den 8 erwarteten Problemen |
| `check:prepush` | heute NO-GO (gewollt), im Klon nach dem Zusammenfassen GO (zuletzt auf `a24de7d`, Dateibaum identisch) |

## Nicht prüfbar

- Der CI-Workflow selbst (läuft erst nach dem Push).
- Firefox und Safari (keine Browser hier; Rückfälle in DECISIONS R4-D4).
- Server-Teil (Staging, `caddy adapt`, Live-Schaltung): laut Auftrag kein
  Zugriff.
- Die visuelle Wirkung: deine Beurteilung.

## Abweichungen von deinen Vorgaben

- State-Layer für Fokus und Druck 10 % statt "etwa 12 %": das ist der
  aktuelle Material-3-Wert.
- Keine großen tonalen (farbig gefüllten) Boxen: im Dunkelmodus wären sie
  violette Flächen, also eine Farbänderung. Tonal bleibt bei kleinen
  Elementen.
- Keine skalierenden Vorschaubilder (es gibt keine); gestaffelt reagieren
  die Chips einer Karte, nicht ganze Listen.
- `check:prepush` liest zusätzlich `~/.ssh/config` und die git-ignorierte
  `private/prepush-denylist.txt`, damit Alias, Server und Web-Root
  erkannt werden, ohne dass sie in einer getrackten Datei stehen.

## Was du bis zum Push und zur Live-Schaltung tun musst (`docs/GO-LIVE.md`)

1. `private/site.private.yaml` ausfüllen (mindestens `contact.email` und
   den Verantwortlichen), Über mich und die anderen `draft-review`-Texte
   lesen (`CONTENT-TODO.md`).
2. `npm run check` und `npm run check:browser:system`.
3. Vor dem Push: auf GitHub "Block command line pushes that expose my
   email" einschalten, dann `redesign-clean` mit einem Commit unter
   `291018608+timur-manjosov@users.noreply.github.com` anlegen,
   `npm run check:prepush` muss GO sagen, `git push -u origin
   redesign-clean:redesign`, Pull Request, CI abwarten, mergen. Keine Tags
   pushen.
4. Release bauen, 5. auf dem Server stagen, 6. Caddyfile-Diff lesen,
   7. Dry Run, 8. live schalten, 9. nachprüfen, 10. im Notfall
   zurückrollen.

---

# Revision 3 (2026-10-28)

Reiner Designdurchgang auf `redesign`, lokal committet, nichts gepusht,
kein Server-Zugriff. Belege: `docs/VERIFICATION.md` (Revision 3),
Entscheidungen: `docs/DECISIONS.md` R3-D1 bis R3-D9. Texte, Routen,
Sprachlogik, Caddy und private Ebene unverändert.

## Was sich geändert hat

| | Vorher (R2) | Nachher (R3) |
|---|---|---|
| Überschriften | Gewicht 680, h1 760 | 600; Kartentitel, h3/h4 560 |
| Hero-Name | 800, bis 86 px, zwei Zeilen bei 1280 px | 600, bis 72 px, eine Zeile, Zeilenabstand 1,06 statt 0,98 |
| Labels, Eyebrows | 600, Versalien, gesperrt | 500, normale Schreibung, feine Linie davor |
| Buttons | 600, 17 px | 500, 15 px |
| Hero | gerahmte Box mit Verlaufsfüllung | keine Box, Farbschleier dahinter |
| /now-Karte | satt violett gefüllt | Kartenfläche mit 1-px-Kontur |
| Chips, Status, Badges | gefüllt bzw. kräftig | 1-px-Konturen, kleiner, Gewicht 500 |
| Rundungen Karten | 28 px | 20 px |
| Schatten | zweilagig | Haarlinie, beim Hover weich |
| Fußbereich | gefülltes Band | nur Haarlinie oben |
| Abstand zwischen Abschnitten | 72 px | 72–120 px (112 px bei 1280) |
| Hellmodus Grundfläche | fast Weiß `#fbfbfe` | leicht getönt `#f5f4f9`, Karten weiß |
| Hellmodus Akzente | `#5530d9` / `#09636d` | eigene Helligkeit `#5d3ce6` / `#087078` |
| Namensverlauf hell | 4,5:1 gerechnet, wirkte einfarbig blau | großer Text, 3:1: Violett → Blau → Petrol sichtbar (schlechtester Punkt 3,45:1) |
| Dunkelmodus | – | alle Farbwerte gleich; nur Unterstreichungsfarbe neu, Schatten weicher |

- **Bewegung:** Links (Unterstreichung blendet zur vollen Farbe, 150 ms),
  Buttons (2 px anheben, Druckzustand), Karten (3 px anheben,
  Verlaufskontur blendet ein, Schatten weicher), Navigation (Linie blendet
  ein, aktive Linie gleitet beim Seitenwechsel), Theme-Umschalter
  (Überblendung), Einblenden beim Scrollen (Opazität + 8 px, 60 ms
  gestaffelt, einmalig, Skript mit 595 Byte). Alles als Tokens (150/200/300
  ms, Ease-out). Mit „weniger Bewegung“ bewegt sich nichts, Farbwechsel
  dauern 80 ms.
- **Werkzeuge:** Kontrastprüfung mit Schwelle nach Verwendung; 3:1 nur für
  den Hero-Namen, und nur solange dessen Größen-Token ≥ 24 px ist, die
  Regel es verwendet und der Verlauf nirgends sonst sitzt.
  Browser-Tests für Hover, Fokus, Reveal, ohne JS, ohne
  IntersectionObserver, reduzierte Bewegung, CLS. Screenshot-Werkzeug mit
  `--tiles`.

## Gemessen

| Prüfung | Ergebnis |
|---|---|
| `npm run check` | grün |
| `npm run check:browser:system` | grün: 42 Seiten, 84 axe-Läufe, 40 Bewegungsprüfungen, 0 CSP-Verstöße; Entwurfs-Build 63 Seiten ebenfalls grün |
| Kontrast | 106 Paare hell + dunkel AA, Text 4,5:1, großer Text 3:1, UI 3:1 |
| Budgets | Startseite 59,1 KB gzip (≤ 120), JS höchstens 4,5 KB (≤ 15), CLS 0 |
| Lighthouse mobil | `/de/`, `/en/`, `/en/projects/`: je 100/100/100/100 |
| Screenshots | 6 Durchgänge (390/768/1000/1280, hell + dunkel), Funde und Korrekturen in R3-D8; 0 Überlauf bei 320 px |

## Nicht prüfbar

- Darstellung in Firefox und Safari: nur Chromium vorhanden. Rückfälle aus
  MDN BCD und caniuse dokumentiert (R3-D7). In Firefox fehlt nur die
  Überblendung beim Seitenwechsel.
- Die künstlerische Wirkung bewertest du selbst.

## Abweichungen von deinen Vorgaben

- **Druckzustand der Buttons in 60 ms**, unter 150 ms: ein Druck muss sofort
  antworten.
- **Einblenden per IntersectionObserver statt CSS scroll-driven
  animations:** die wären an die Scrollposition gekoppelt (halb sichtbar =
  halb transparent, rückwärts beim Hochscrollen), also scroll-linked und
  nicht einmalig.
- **Schatten-Tokens im Dunkelmodus weicher**, obwohl die Palette bleiben
  sollte. Alle Farben sind unverändert; zurücksetzen hieße zwei Zeilen
  aus `c704f13` übernehmen.
- **Karten heben sich um 3 px**, nicht um 4 (innerhalb der Obergrenze).

---

# Revision 2 (2026-10-27/28)

Branch `redesign`, lokal committet, nichts gepusht, auf dem Server nur
gelesen. Belege: `docs/VERIFICATION.md` (Abschnitt Revision 2),
Entscheidungen: `docs/DECISIONS.md` R2-D1 bis R2-D10.

## Was sich geändert hat

- **Sprachlogik:** `/` leitet per 302 nach der ersten
  `Accept-Language`-Angabe auf `/de/` (Deutsch, jede Region, jede
  Schreibweise) oder `/en/` (alles andere, auch ohne Header), mit
  `Vary: Accept-Language` und `Cache-Control: no-store`. Keine
  Auswahlseite mehr; nur `<noscript>` zeigt „Deutsch · English“. Ohne
  Server-Regel übernimmt das externe Skript `/lang-redirect.js` per
  `location.replace`. Eine Stelle für alles: `deploy/site-config.json` →
  `languageDoor`.
- **Design:** zwei Akzente (Violett, Petrol) auf kühler Neutralskala, hell
  und dunkel getrennt gestaltet; Name im Hero mit Verlaufstext, statische
  Farbschleier im Hero und oben auf jeder Seite, tonale /now-Karte,
  Bento-Raster, Status-Pills, Tech-Chips, Spec-Sheet in Monospace,
  halbtransparente Kopfleiste. Kein Canvas, keine Animationsschleife.
- **Inhalte:** Octo überall entfernt (alte URLs 301 auf die
  Projektübersicht). Aura, Epiphyte, Saeculum aus den Repositories neu
  geschrieben, Status belegt (Saeculum „pausiert“, kein Commit seit
  10.08.2026). Texte in der ersten Person, ohne Floskeln; drei
  Hero-Varianten je Sprache (R2-D1).
- **Private Ebene:** `private/site.private.yaml` (git-ignoriert, Schema,
  Beispieldatei), Build-Modi `public` und `release`, Impressum nur bei
  vollständigen Daten, Leak-Check `npm run check:private`, optionaler
  Pre-commit-Hook.
- **Hygiene:** Webroot-Pfad, SSH-Alias, Server-Benutzername,
  Caddy-Version und OS aus den getrackten Dateien entfernt. Funde in der
  bestehenden Historie: `docs/BLOCKERS.md` R2-B1 (Historie nicht
  umgeschrieben).
- **Go-live-Vorbereitung:** echte Caddyfile gelesen, Generator dagegen
  gelaufen, Datenschutzerklärung ohne Platzhalter, `--dry-run` im
  Apply-Skript, `docs/GO-LIVE.md`, `docs/DEPLOY.md` neu (ohne
  Serverdetails).

## Was gemessen wurde

| Messung | Ergebnis |
|---|---|
| `npm run check` | grün |
| Sprachregel, 8 geforderte + 4 weitere Header | alle richtig; `/de/`, `/en/` nie umgeleitet |
| Browser-Suite (Chromium 156, System) | 42 + 63 Seiten, 84 + 126 axe-Läufe, 0 Verstöße, 0 CSP-Verstöße, 0 Drittanbieter-Requests, 0 Cookies |
| Überlauf bei 320 px | 0 Seiten |
| Lighthouse mobil (13.6.0) | Start DE/EN und Projekte: 100/100/100/100; Beitrag 100/100/100, SEO 63 nur wegen `noindex` im Entwurfs-Build |
| CLS / LCP (mobil) | 0 / 0,9 s |
| Kontrast | 102 Paare hell + dunkel ≥ AA; Verlaufstext am schlechtesten Punkt 5,24:1 (hell), 6,31:1 (dunkel) |
| Budget Startseite | 57,6 KB gzip, 6 Requests, 1,0 KB JS |
| forced-colors / prefers-contrast (Emulation) | 0 axe-Verstöße, Verläufe ersetzt |
| Generator gegen echte Caddyfile | außerhalb des Blocks byte-identisch, Aura-Block SHA-256 gleich, kein Header schwächer |
| Release-Pipeline (test-only) | Archiv, Prüfsummen, `TEST-ONLY`-Sperre ok |
| `--dry-run` lokal | 8 erwartete Probleme, Exit 1, nichts geändert |
| ShellCheck 0.11.0 | 0 Befunde |

Unterwegs gefunden und behoben: zu kleine Klickflächen (Feed-Link auf
Kategorieseiten, Inhaltsverzeichnis), fehlende Cache-Header im lokalen
Testserver, fest verdrahtete UI-Texte im Hero, Beschreibungen in der
dritten Person, Singular „Schlagwort“ über mehreren Tags, ein verwaistes
Feld `server.web_root` in der privaten Datei.

## Was nicht prüfbar war

- **Firefox und Safari** nicht gerendert (kein Browser-Download erlaubt);
  abgesichert über MDN-Kompatibilitätsdaten und `@supports`-Rückfälle.
  Firefox kann keine dokumentübergreifenden View Transitions; die Seite
  navigiert dort einfach ohne Übergang.
- **`caddy adapt`** des Vorschlags: kein lokales Caddy, kein Upload
  erlaubt. Läuft in `stage.sh` und im Dry Run auf dem Server.
- **Echter Release** mit echten privaten Daten: die Datei gibt es nicht,
  und ich erfinde keine Werte.
- **Negativtests der Argumente** von `apply-on-server.sh`: die Sitzung
  erlaubte nur `--dry-run`-Aufrufe.
- **CI und externe Links (lychee):** nur nach einem Push.

## Was du tun musst (Reihenfolge aus `docs/GO-LIVE.md`)

1. `private/site.private.yaml` ausfüllen (mindestens `contact.email`,
   `legal.controller`).
2. `npm run check` und `npm run check:browser:system`.
3. Committen, dann `deploy/build-release.sh --private private/site.private.yaml`.
4. `deploy/stage.sh <ssh-target>`.
5. `release/<id>/Caddyfile.diff` und `deploy/apply-on-server.sh` lesen.
6. `ssh <ssh-target> bash deploy-staging/<id>/apply-on-server.sh --dry-run`.
7. `ssh -t <ssh-target> sudo bash deploy-staging/<id>/apply-on-server.sh`.
8. Prüfliste (GO-LIVE §8), in Firefox ansehen.
9. Rollback bei Bedarf (GO-LIVE §9).

Vorher entscheiden: Texte freigeben (`draft-review`, 16 Dateien),
Impressum ja/nein, Git-Autor-E-Mail vor dem Push (BLOCKERS R2-B1).

## Wo ich abweiche oder den Auftrag kritisiere

- **Erste `Accept-Language`-Angabe statt q-Werten:** wie verlangt umgesetzt,
  aber HTTP sortiert nach q-Wert, nicht nach Position. Für echte Browser
  gleichwertig, für handgeschriebene Header nicht (R2-D2).
- **`@view-transition`** eingebaut, wirkt aber in Firefox (deinem Browser)
  nicht.
- **Lighthouse „≥ 95 in allen Kategorien“** ist für eine Entwurfsseite mit
  `noindex` nicht erreichbar und soll es auch nicht sein (SEO 63 beim
  Beispielbeitrag).
- **Netcup in der Datenschutzerklärung** widerspricht D25 aus dem ersten
  Lauf („keine Hoster-Details“). Umgesetzt, weil die Erklärung den
  Auftragsverarbeiter nennen muss.
- **Lighthouse nur per `npx`**, nicht als Abhängigkeit (R2-D10).
- **Verlaufsname im hellen Modus** wirkt fast einfarbig blau; ein
  sichtbareres Petrol-Ende würde den Kontrast auf Weiß unter AA drücken.
  Ich habe Kontrast vor Effekt gestellt (R2-D8).

---

# First run (2026-10-26/27)

Branch `redesign` (local only, not pushed), starting point tag `pre-redesign`
(`ea40ee1`). Run: 2026-10-26 (phases 1–4, first pass) and 2026-10-27
(checks, deployment tooling, verification, hand-over).

## 1. What changed

**From a one-page card to a hub.** The Eleventy one-pager with a generative
canvas is replaced by a static Astro 7 site with real per-language URLs:

| Area | Before | Now |
|---|---|---|
| Pages | `/`, `/lab/` | Home, About, Projects (+ detail pages), Blog (posts, categories, tags, series, archive), Now, Links, Contact, Uses, Search, Privacy, Imprint, 404s, all in DE and EN |
| i18n | JS swaps text, one URL, no hreflang | `/de/…` + `/en/…`, `/` as x-default door, switcher to the same page, honest "translation missing" state, report |
| Content | HTML with `data-en`/`data-de` | Markdown + validated schemas, `npm run new` scaffolder |
| Blog | none | categories (extensible via YAML), tags, series, drafts, reading time, updated date, TOC, footnotes, heading permalinks, build-time MathML, syntax highlighting, RSS per language and per category |
| Machine-readable | title/OG only | JSON-LD (Person, WebSite, BlogPosting, SoftwareSourceCode/CreativeWork), sitemap with alternates, llms.txt, rel="me", security.txt prepared |
| JS | 71 KB, 3 animation loops | ~1–3 KB per page, no loops |
| Home page weight | ≈ 222 KB, ~10 requests | 54.7 KB gzip, 6 requests (`/en/`) |
| Quality checks | none | `npm run check` (15 automated checks) + browser suite + CI workflow |
| Deployment | server-side `git pull` + Docker build | local build → checksummed archive → staging → root apply script with smoke tests and auto-rollback |

All existing content was migrated: tagline, About text, the Epiphyte,
Saeculum and Aura descriptions (with source notes), GitHub link, favicons,
OG image, Inter. The canvas engine is intentionally gone (still in the tag).

Commits on `redesign`:
```
85e73fd test: HTTP checks against the local server; fix feed link and grid overflow
08cd19e docs: decisions, blockers and content todo; editorial review report
70e8f0f feat(deploy): release archives, staging, Caddy proposal and apply script
a4f72c8 test: add automated checks for CSP, links, SEO, a11y, contrast, drafts and i18n
3b4651a feat: rebuild site on Astro 7 with i18n, content collections, blog and search
47b0c25 docs: add audit, gap analysis and stack ADR for the redesign
```
(plus the hand-over commit containing this report)

## 2. Deployment result

**Not staged on the server.** The SSH target could not be read in this
unattended session (`echo $VPS_SSH_TARGET` was denied by the permission
system; nothing was attempted around it). So there was no SSH connection, no
`~/deploy-staging/`, and no proposal built from the real Caddyfile.
**The live site and Aura are untouched.** (`docs/BLOCKERS.md` B1.)

Ready to use instead:
- `deploy/build-release.sh`: `npm ci`, full check, reproducible archive + checksums
- `deploy/stage.sh <target>`: reads the live Caddyfile (read-only), replaces
  only the `timurmanjosov.com, www.timurmanjosov.com` block, **refuses** if
  anything outside it would change or a header gets weaker, uploads to
  `~/deploy-staging/<id>/`, runs `caddy adapt` on the server without sudo
- `deploy/apply-on-server.sh` (you run it with sudo): checksums, Aura
  baseline, root-owned release dir, Caddyfile backup, `caddy validate` as user
  `caddy`, atomic symlink, `systemctl reload caddy` only, smoke tests
  (pages, feeds, sitemap, 404s, all 31 redirects, exact security headers,
  caching, www → apex, Aura unchanged), automatic rollback
- `./ship.sh`: chains all three, asks before going live

Next step for you: `deploy/build-release.sh && deploy/stage.sh "$VPS_SSH_TARGET"`,
read `release/<id>/Caddyfile.diff` and `deploy/apply-on-server.sh`, then the
`sudo` line that `stage.sh` prints. Details: `docs/DEPLOY.md`.

The proposed Caddy block makes the security headers **stricter** than live:
the CSP loses the `sha256-` script hash (theme init is now an external file),
`Permissions-Policy`, `Cross-Origin-Opener-Policy` and `-Server` are added,
`www` gets a 308 to the apex, and `/_astro/*` (content-hashed) gets
`immutable` caching while HTML is revalidated.

## 3. Key decisions (details: `docs/DECISIONS.md`, ADR 0001)

- **Astro 7, static** over Eleventy 3 / Hugo / Next.js / SvelteKit: typed
  content collections with build-time validation, built-in i18n routing,
  zero JS by default, static output that runs under the strict CSP. Hugo was
  the runner-up (no schema validation). Next.js would need a server process
  for a nonce-based CSP.
- **Math as MathML (Temml)** instead of KaTeX HTML, and **Prism** instead of
  Shiki: both alternatives emit inline styles that the CSP blocks.
- **Own search index** instead of Pagefind: Pagefind's WASM needs
  `'wasm-unsafe-eval'`.
- **`/` is a language door**, no automatic language redirect.
  Language-less short paths (`/now`, `/about`, …) redirect 302 to English.
- **No invented data:** e-mail, PGP and further accounts stay empty until
  you provide them. The e-mail is entity-encoded on /contact and kept out of
  JSON-LD.
- **AI crawlers allowed**, llms.txt provided (its use by AI providers is not
  documented anywhere).
- **CI checks only, never deploys.** This contradicts the old CLAUDE.md
  ("no CI planned"), but the brief asks for it.

## 4. Where the brief was weaker than an alternative (critique)

From `docs/DECISIONS.md`, "Critique of the brief":
- "PGP key under `/.well-known/`": the actual standard is **WKD**
  (`/.well-known/openpgpkey/hu/<hash>` + `policy`). The Caddy block is
  prepared for it, and DEPLOY.md §6 explains it. A readable `.asc` file with
  the fingerprint on /contact complements it.
- Per-category feeds per language: 10 feeds, most empty for a long time.
  Built as asked. Cheap, but the two main feeds are what matters.
- Lighthouse ≥ 95 as the target: a lab score from one run. The site checks
  the underlying properties deterministically on every build instead.
- Privacy policy and imprint with visible `TODO(Timur)` markers would look
  unfinished live. Fill them in before going live (CONTENT-TODO §1).

## 5. Measured results (`docs/VERIFICATION.md`)

All green locally (`npm run check`):
- Biome 0 findings; `astro check` (strictest) 0 errors/warnings/hints
- builds: 46 pages (production), 71 (with drafts), ~0.7 s each
- CSP: 0 inline scripts/styles/handlers, 0 third-party resources
- links: 1682 / 2597 internal links resolve, anchors included
- html-validate (recommended + a11y): 0 errors
- SEO: one h1, lang, canonical, reciprocal hreflang + x-default, JSON-LD,
  `sameAs` = `rel="me"`, sitemap coverage: all pages
- HTTP: 132 / 174 checks (pages, language switch on every page, 31
  redirects, 404 per language, headers)
- WCAG 2.2 AA contrast: 34 colour pairs, light and dark, lowest text pair
  5.17:1
- axe-core (WCAG 2.2 A/AA + best practice) in jsdom: 0 violations on all pages
- drafts: 0 leaks into production
- schema: missing date / unknown category fail the build (tested)
- feeds and sitemaps well-formed (xmllint)
- `npm audit`: 3 low (katex via the remark-math parser, build-time only,
  not used for rendering), non-blocking and documented
- ShellCheck: 0 findings for all deploy scripts

**Not measured** (B2–B5): Lighthouse, the real-browser suite (overflow at
320 px, no-JS rendering, toggles, cookies, third-party requests in a real
browser), external links, `caddy adapt` of the real proposal. All are scripted
and run in CI or in `stage.sh`/`apply-on-server.sh`. Mobile layout from
320 px is reviewed statically (flex-wrap everywhere, scroll containers for
code/tables/math, `minmax(0, 1fr)` grids) but not measured.

## 6. Imprint: when it probably becomes necessary (not legal advice)

This is a general assessment, **not legal advice**. Have it checked if in
doubt.

- In Germany, § 5 DDG (Digitale-Dienste-Gesetz, the successor of § 5 TMG)
  requires an imprint for digital services that are offered on a
  business-like basis ("geschäftsmäßig"), usually for payment. A purely
  private, non-commercial personal site is generally considered exempt, but
  the boundary is drawn narrowly in practice.
- Likely triggers in your case: **monetising Aura** (paid tiers, donations
  with consideration, sponsorship), ads or affiliate links on the site,
  offering services or self-promotion for paid work.
- Separately, § 18 Abs. 2 MStV requires naming a responsible person for
  "journalistic-editorial" offerings, even non-commercial ones. A blog with
  regular opinion pieces ("Standpunkte") can fall under it.
- So: the imprint structure is prepared (`/de/imprint/`, `noindex`). Decide
  before the blog gets regular opinion posts, and at the latest before Aura
  makes money.

## 7. Open points

Everything you need to decide or write: **`CONTENT-TODO.md`**. The most
important ones:
1. Privacy policy (hoster, logs, rights) and imprint decision before going live.
2. Review the 16 `draft-review` texts (About, Now, Uses, Contact, Aura,
   Octo; `npm run report:i18n` lists them).
3. Public e-mail, PGP key, further accounts.
4. Publish or drop the 4 draft projects from GitHub (gauss-trainer is the
   strong candidate).
5. First real blog post, then delete the example posts.

Changes to your own CLAUDE.md rules, for review: the technical sections
were rewritten for Astro. In "GitHub-Workflow", the line "kein CI/CD …
geplant" now says that the CI only checks and never deploys. In "Testing",
"Aktuell keine Testsuite" was replaced by `npm run check`, and the
canvas-memory item became "no background CPU/memory use". The second
"# GitHub-Workflow" block is unchanged.

## 8. Recommended next steps

1. `npx playwright install chromium && npm run check:browser` locally, or
   push `redesign` and let CI run. Fix whatever the real browser finds
   (axe contrast in context, 320 px overflow).
2. Fill in the privacy policy, review the drafted texts (CONTENT-TODO §1).
3. Stage and go live (`docs/DEPLOY.md` §2). Afterwards compare
   `curl -sI https://aura.timurmanjosov.com/` with the baseline the script
   logs.
4. Merge `redesign` into `main` (PR; the old GitHub issues are mostly
   obsolete, CONTENT-TODO §6).
5. Optional: a calm new OG image; subset the math font (394 KB); a
   GitHub activity box generated at build time if wanted.
