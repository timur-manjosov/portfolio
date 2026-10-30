---
title: Datenschutzerklärung
description: Welche Daten beim Besuch von timurmanjosov.com verarbeitet werden, wie lange, und welche Rechte du hast.
updated: 2026-10-27
status: draft-review
---

Diese Erklärung gilt für timurmanjosov.com. Sie beschreibt, was beim Besuch
technisch tatsächlich passiert, so wie der Server am oben genannten Datum
eingerichtet ist.

## Kurzfassung

- Keine Cookies.
- Kein Tracking, keine Analyse-Werkzeuge, keine Werbung.
- Keine Inhalte, Schriften oder Skripte von anderen Servern. Dein Browser
  verbindet sich beim Besuch nur mit diesem Server.
- Kein Kontaktformular, keine Kommentare, keine Benutzerkonten.
- Kein Zugriffsprotokoll. Normale Seitenaufrufe werden nicht gespeichert.

## Was beim Aufruf passiert

Die Website besteht aus statischen Dateien, die der Webserver Caddy ausliefert.
Damit dein Browser eine Seite bekommt, muss der Server deine IP-Adresse, die
angefragte Adresse und die üblichen Angaben deines Browsers (zum Beispiel
Browsertyp und Sprache) empfangen. Er nutzt sie, um die Seite auszuliefern,
und speichert sie dabei nicht.

Ausnahme sind Fehler des Servers selbst (HTTP-Statuscodes ab 500). Dann
schreibt Caddy eine Fehlermeldung in das Systemprotokoll des Servers
(systemd-Journal). Diese Meldung kann die IP-Adresse, die angefragte Adresse,
den Zeitpunkt und die Angaben deines Browsers enthalten. Cookies und
Zugangsdaten nimmt Caddy nicht auf. Das Protokoll hat keine feste Löschfrist:
Alte Einträge werden automatisch gelöscht, sobald es seine Größengrenze
erreicht. Ich nutze diese Meldungen nur, um Fehler zu finden.

Rechtsgrundlage ist mein berechtigtes Interesse an einer funktionierenden und
sicheren Website (Art. 6 Abs. 1 lit. f DSGVO).

## Hosting

Der Server ist ein virtueller Server, den ich bei der netcup GmbH in Karlsruhe
miete. Die Daten aus dem vorigen Abschnitt liegen dort.

## Speicherung im Browser

Wählst du über den Schalter selbst ein helles oder dunkles Farbschema, merkt
sich dein Browser diese Wahl im lokalen Speicher (`localStorage`, Schlüssel
`theme`). Der Wert bleibt in deinem Browser und wird nie an den Server
geschickt. Ohne diese Wahl wird nichts gespeichert. Du kannst den Eintrag
jederzeit in den Einstellungen deines Browsers löschen.

## Suche

Die Suche läuft vollständig in deinem Browser. Dafür lädt sie eine Indexdatei
von diesem Server. Deine Suchbegriffe werden nicht übertragen.

## Wenn du mir schreibst

Schreibst du mir eine E-Mail, verarbeite ich deine Adresse und deine
Nachricht, um zu antworten, und lösche sie, wenn sie dafür nicht mehr nötig
sind. Rechtsgrundlage ist mein berechtigtes Interesse, Anfragen zu beantworten
(Art. 6 Abs. 1 lit. f DSGVO).

## Links zu anderen Websites

Links zu anderen Websites, etwa zu GitHub, sind normale Links. Erst wenn du
einen anklickst, verbindet sich dein Browser mit der anderen Website. Dort
gilt deren Datenschutzerklärung. Das gilt auch für aura.timurmanjosov.com, das
getrennt von dieser Website läuft.

## Deine Rechte

Du hast das Recht auf Auskunft über die Daten, die ich über dich verarbeite
(Art. 15 DSGVO), auf Berichtigung (Art. 16), auf Löschung (Art. 17), auf
Einschränkung der Verarbeitung (Art. 18) und auf Datenübertragbarkeit
(Art. 20). Gegen eine Verarbeitung, die auf meinem berechtigten Interesse
beruht, kannst du aus Gründen, die sich aus deiner besonderen Situation
ergeben, Widerspruch einlegen (Art. 21). Dafür genügt eine Nachricht an die
oben genannte Adresse.

Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren,
insbesondere in dem EU-Mitgliedstaat, in dem du wohnst oder arbeitest oder in
dem der mutmaßliche Verstoß stattgefunden hat (Art. 77 DSGVO).

<!-- Quellen (2026-10-27): Live-Caddyfile auf dem Server (Block
     timurmanjosov.com ohne `log`-Direktive, auch im neuen generierten Block
     nicht), Caddy-Quellcode modules/caddyhttp/server.go (Handler-Fehler ab
     Status 500 werden auf Level ERROR mit dem Request geloggt, unabhängig vom
     Zugriffsprotokoll; Cookie/Authorization werden standardmäßig redigiert),
     caddy.service (stderr → Journal), journald.conf auf dem Server (keine
     MaxRetentionSec, persistentes Journal, rsyslog inaktiv). Hoster laut
     Auftrag. Bei jeder Änderung an der Caddy-Konfiguration erneut prüfen. -->
