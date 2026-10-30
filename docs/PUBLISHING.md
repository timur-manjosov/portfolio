# Veröffentlichen ohne Code

Für Timur. Inhalte sind Markdown-Dateien unter `src/content/`. Veröffentlichen
heißt: Datei schreiben, committen, `npm run publish`. Es gibt keinen Admin im
Internet, kein Login und keinen zusätzlichen Server-Prozess. Caddy wird dabei
weder geändert noch neu geladen.

Voraussetzung: Die **erste** Veröffentlichung ist über die vorhandene Kette
gelaufen (`docs/GO-LIVE.md`, Schritte 1–10). Erst danach gibt es auf dem
Server `<web root>/releases/` und den Symlink `current`, auf den `publish`
umschaltet. Vorher bricht `publish` mit einem Hinweis darauf ab.

## 1. Einen Artikel schreiben

```sh
npm run new:post -- --title "Mein Titel" --lang de --category math-crypto
```

- `--lang de|en|both` (Standard `de`). `both` legt beide Dateien an, verbunden
  über `translationKey`.
- `--category`: eine `id` aus `src/content/categories.yaml` (Standard `tech`).
  Neue Kategorie: dort einen Eintrag ergänzen, kein Code.
- Ergebnis: `src/content/blog/de/mein-titel.md` mit `draft: true` und dem
  heutigen Datum (Berliner Zeit). Der Befehl öffnet nichts und ändert nichts
  anderes. Gibt es den Slug schon (in einer der beiden Sprachen), bricht er
  ab, ohne zu schreiben; dann `--slug anderer-slug` angeben.

Bearbeiten im eigenen Editor (`$VISUAL`/`$EDITOR`, sonst nano):

```sh
npm run edit -- post mein-titel            # deutsche Fassung
npm run edit -- post mein-titel --lang en
```

Nach dem Schließen wird das Frontmatter gegen dasselbe Schema geprüft, das
der Build benutzt. Ein Tippfehler im Feldnamen wird sofort gemeldet.

**Frontmatter:**

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `title` | ja | Titel |
| `description` | ja | 20–300 Zeichen, für Suchmaschinen am besten ≤ 160 |
| `date` | ja | Erscheinungstag (siehe Abschnitt 3) |
| `category` | ja | `id` aus `categories.yaml` |
| `tags` | nein | `[tag-eins, tag-zwei]` |
| `draft` | nein | `true`: nur in `npm run dev` sichtbar |
| `translationKey` | nein | verbindet DE und EN mit verschiedenen Slugs |
| `updated` | nein | setzen, wenn sich ein veröffentlichter Artikel inhaltlich ändert |
| `status` | nein | `draft-review` erscheint in `npm run report:i18n` |

**Im Text:** Formeln mit `$…$` und `$$…$$` (werden beim Build zu MathML),
Code in Blöcken mit Sprachangabe (` ```python `), Fußnoten mit `[^1]`.
**Bilder** neben den Artikel legen, etwa
`src/content/blog/de/mein-titel/abbildung.png`, und so einbinden:
`![Was die Abbildung zeigt](./mein-titel/abbildung.png)`. Ohne Alt-Text,
mit einer externen Adresse oder als `<img>`-HTML scheitert der Build mit
Datei und Zeile. Das Bild wird beim Build verkleinert und als WebP
ausgeliefert.

**Nur eine Sprache ist kein Fehler.** Der Sprachumschalter führt dann zum
Blog der anderen Sprache, und die andere Sprache listet den Artikel mit dem
Hinweis „nur auf Deutsch/Englisch“.

## 2. Vorschau

```sh
npm run dev          # http://localhost:4321/de/blog/ – Entwürfe und geplante Artikel sichtbar
```

Speichern genügt, die Seite lädt neu. Für die echte Ansicht mit allen
Prüfungen: `npm run check`.

## 3. Veröffentlichen

1. Im Frontmatter `draft: false` setzen.
2. Committen (mit der noreply-Adresse, `docs/GO-LIVE.md` Schritt 3):
   `git add -A && git commit -m "feat(blog): …"`.
3. Erst ansehen, dann veröffentlichen:

```sh
npm run publish -- --target <ssh-target> --dry-run
npm run publish -- --target <ssh-target>
```

`publish` macht der Reihe nach:

1. **Vorprüfung:** sauberer Git-Baum (sonst Abbruch; `--allow-dirty` geht
   mit deutlicher Warnung), Branch aus `deploy/site-config.json`
   (`publish.branches`, Standard `main`; sonst `--any-branch`), private Datei
   vorhanden.
2. **Bauen:** `deploy/build-release.sh` (frisches `npm ci`, `npm run check`
   einschließlich `check:private`, Release-Build mit der privaten Datei,
   GitHub-Daten für Projekte mit `repo:`). Dauert einige Minuten.
3. **Änderungsübersicht** gegenüber der Version, die gerade live ist: neue,
   geänderte und entfernte Seiten, Feeds und Sitemap, Anzahl der Assets,
   **geplante Artikel mit Erscheinungsdatum**, Warnung, wenn `/now` geändert
   wurde, `updated` aber nicht.
4. **Bestätigung** (`--yes` überspringt sie), dann Hochladen nur der Inhalte
   nach `~/deploy-staging/publish/<id>/` und ein Befehl mit `sudo`
   (Passwortabfrage). Der Caddyfile bleibt unberührt.
5. **Auf dem Server:** Entpacken nach `<web root>/releases/<id>/`,
   Umschalten von `current` (atomar), Nachprüfung per HTTP: geänderte
   Seiten und feste Seiten liefern 200, Sicherheitsheader und CSP sind
   genau wie konfiguriert. Schlägt etwas fehl, wird **automatisch
   zurückgeschaltet** und die neue Version gelöscht.

Mit `--dry-run` wird gebaut und verglichen, aber nichts hochgeladen und auf
dem Server nichts verändert (gelesen wird der Caddyfile und der Inhalt der
Live-Version).

**Statt `--target` jedes Mal:** `export PUBLISH_SSH_TARGET=<ssh-target>` in der
eigenen Shell-Konfiguration. Das Ziel steht nie im Repository (es ist
öffentlich).

### Geplante Artikel

Ein Artikel, dessen `date` in der Zukunft liegt, ist im veröffentlichten
Build **vollständig draußen** (Seite, Listen, Tags, Feeds, Sitemap, Suche,
llms.txt). Er erscheint mit dem ersten `publish` **an oder nach** seinem
Datum (Berliner Kalendertag). Es gibt keinen Zeitplaner auf dem Server:
Ist das Datum erreicht, einfach `npm run publish` ausführen. Die
Änderungsübersicht nennt die geplanten Artikel mit Datum.

Daten nie in die Vergangenheit setzen: ein rückdatierter Artikel behauptet,
früher geschrieben worden zu sein.

## 4. Prüfen und zurückrollen

Nach `publish` im Browser: die neue Seite, `/de/feed.xml`, die Konsole ohne
CSP-Fehler. Per Kommandozeile:

```sh
curl -sI https://timurmanjosov.com/de/blog/mein-titel/   # 200, strenge CSP
```

Zurück zur vorigen Version (wird per HTTP geprüft, sonst bleibt alles wie
es ist):

```sh
npm run publish -- --target <ssh-target> --rollback --dry-run   # zeigt nur, wohin
npm run publish -- --target <ssh-target> --rollback
```

Wiederholtes `--rollback` geht weiter zurück. Auf dem Server bleiben die
letzten 5 veröffentlichten Versionen (`publish.keep` in
`deploy/site-config.json` oder `--keep <n>`, 2–50). Die alte Eleventy-Seite
(`releases/legacy-…`) wird nie automatisch gelöscht.

## 5. /now, Projekte, Über mich

```sh
npm run edit:now                 # /now, deutsch
npm run edit:now -- --lang en
npm run edit -- about            # Über mich (ebenso: uses, contact, privacy)
npm run new:project -- --title "Mein Projekt" --lang both
npm run edit -- project mein-projekt
```

Bei Seiten und Projekten setzt `edit` nach einer Änderung `updated` auf
heute; ohne Änderung bleibt die Datei unverändert. Danach committen und
`npm run publish`.

**Projekte und GitHub:** Mit `repo: owner/name` im Frontmatter holt
`publish` beim Release-Build die Sprachen des öffentlichen Repositorys und
zeigt sie als Stack-Chips, wenn `stack` leer ist; der Link „Quellcode“
entsteht aus `repo`, wenn `links.repo` fehlt. **Was im Frontmatter steht,
hat Vorrang.** Ist GitHub nicht erreichbar oder das Limit erreicht, gilt der
letzte Stand aus `.cache/github-meta.json` (24 Stunden), sonst fehlt das
Feld; der Build scheitert nie daran. Besucher fragen GitHub nie an.

Ein persönlicher Zusatz zu „Über mich“, der nicht ins öffentliche
Repository soll, gehört nach `private/content/<lang>/about-extra.md`.

## 6. Spickzettel

| Was | Befehl |
|---|---|
| Neuer Artikel | `npm run new:post -- --title "…" [--lang de\|en\|both] [--category …]` |
| Neues Projekt | `npm run new:project -- --title "…" [--lang …]` |
| Bearbeiten | `npm run edit -- post <slug>` · `project <slug>` · `about` · `npm run edit:now` |
| Vorschau | `npm run dev` |
| Alle Prüfungen | `npm run check` |
| Rechnungen der Artikel | `npm run check:articles:system` |
| Ansehen, was sich ändert | `npm run publish -- --target <ssh-target> --dry-run` |
| Veröffentlichen | `npm run publish -- --target <ssh-target>` |
| Zurück | `npm run publish -- --target <ssh-target> --rollback` |
| Header, Redirects, Caching ändern | `deploy/site-config.json`, dann `./ship.sh <ssh-target>` (nicht `publish`) |

## 7. Typische Fehlerbilder

| Meldung | Bedeutung, was tun |
|---|---|
| `the working tree has uncommitted changes` | Erst committen. |
| `branch … is not in publish.branches` | Auf `main` wechseln (oder bewusst `--any-branch`). |
| `the Caddy site block would change` | In `deploy/site-config.json` hat sich etwas an Headern, Redirects oder Caching geändert. Das geht nur über `./ship.sh` (`docs/DEPLOY.md`). |
| `… is not a symlink: the first go-live goes through ./ship.sh` | Die erste Veröffentlichung ist noch nicht passiert. |
| `Image policy … has no alt text` | Alt-Text in `![…](…)` ergänzen. |
| `Unknown category` / Schemafehler beim Build | Feldname oder Kategorie im Frontmatter prüfen; `npm run edit` zeigt dasselbe sofort. |
| `… check(s) failed; switching back` | Die neue Version lieferte auf dem Server einen Fehler; die alte ist wieder live. Meldung lesen, lokal `npm run check`, erneut versuchen. |
| `another publish is running` | Ein zweiter Lauf parallel; warten. |
| Artikel fehlt nach `publish` | `draft: true`? Datum in der Zukunft? Die Übersicht listet geplante Artikel. |

## 8. Was man nie tut

- Dateien im Web-Root von Hand ändern oder löschen. Immer `publish` oder
  `--rollback`.
- Den generierten Block im Caddyfile von Hand bearbeiten.
- Werte aus `private/` in versionierte Dateien schreiben
  (`npm run check:private` fängt das ab).
- Mit der privaten E-Mail-Adresse committen und pushen
  (`npm run check:prepush` vor jedem Push).
- Artikel rückdatieren.
- Bilder von fremden Servern einbinden.

## 9. Prüfbefehle: Webroot-Rechte (Variante A oder B)

In diesem Repository ist nicht belegt, wem der Webroot auf dem Server
gehört. Belegt ist: Die erste Veröffentlichung (`apply-on-server.sh`) legt
jede Version **als root** unter `<web root>/releases/` an. Die folgenden
Befehle **lesen nur**:

```sh
# 1. Der Webroot, wie er im Caddyfile steht (Zeile "root * <web root>/current")
ssh <ssh-target> grep -n 'root \*' /etc/caddy/Caddyfile

# 2. Besitzer, Gruppe und Rechte (für <web root> den Pfad aus 1. ohne /current)
ssh <ssh-target> stat -c '%U:%G %a %n' <web root> <web root>/releases <web root>/current
ssh <ssh-target> readlink <web root>/current
ssh <ssh-target> id -un

# 3. Werkzeuge, die publish-on-server.sh braucht
ssh <ssh-target> command -v curl tar sha256sum flock awk sed find
```

| Ergebnis | Variante |
|---|---|
| `<web root>` oder `releases` gehören `root` (Normalfall nach dem ersten Livegang) | **B** (Standard): `npm run publish -- --target <ssh-target>`, ein `sudo` pro Veröffentlichung |
| `<web root>` und `releases` gehören deinem SSH-Benutzer und sind schreibbar (`7xx`) | **A** möglich: `--no-sudo`. Empfehlung trotzdem B: root-eigene Versionen kann ein kompromittierter SSH-Zugang nicht verändern. |
| `current` ist ein Verzeichnis, kein Symlink, oder `releases` fehlt | Erster Livegang noch nicht erfolgt: `docs/GO-LIVE.md` |
| ein Werkzeug fehlt | nachinstallieren, sonst bricht das Skript in der Vorprüfung ab |

Auf dem Server sammeln sich hochgeladene Pakete unter
`~/deploy-staging/publish/`; sie können nach einer erfolgreichen
Veröffentlichung gelöscht werden (`publish` löscht dort nichts).
