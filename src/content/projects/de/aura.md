---
title: Aura
summary: Ein Discord-Bot, der weiß, was auf einem Server gerade stimmt, statt jede Nachricht zu archivieren. Mit eigener Weboberfläche.
stage: in-development
tags: [discord, bot, wissen]
stack: [Python, discord.py, SQLite, Docker]
links:
  repo: https://github.com/timur-manjosov/aura
  website: https://aura.timurmanjosov.com/
started: 2026-07-23
updated: 2026-10-10
featured: true
order: 10
status: draft-review
---

## Worum es geht

Auf einem aktiven Discord-Server steht die Antwort auf die meisten Fragen
irgendwo im Verlauf. Nur weiß niemand mehr, wo, und ob sie noch gilt. Aura
liest mit und hält ein kleines Wissensmodell darüber, was auf dem Server
gerade zutrifft. Ändert sich etwas, ersetzt die neue Aussage die alte, und der
Bot weiß, dass die alte einmal galt.

Aus diesem Modell beantwortet Aura Fragen, meldet sich von selbst, wenn es
sich bei einer Antwort sicher genug ist, begrüßt neue Mitglieder mit einer
aktuellen Zusammenfassung und fasst regelmäßig zusammen, was sich geändert
hat. Moderieren kann der Bot nichts: kein Kicken, kein Bannen, kein Löschen,
keine Rollen.

## Stand

In Entwicklung. Die README im Repository beschreibt noch das erste
Grundgerüst, die Commits sind weiter: Fakten werden aus Nachrichten
extrahiert, geprüft und bei Änderungen ersetzt, `/aura-ask` beantwortet
Fragen, und es gibt Befehle für Datenschutz-Auskunft, Export und Löschung.
Die Datenbank lässt sich optional verschlüsseln. Letzter Commit: 10. Oktober
2026.

Der Quellcode ist öffentlich, und der Bot lässt sich mit Docker Compose selbst
betreiben (Anleitung in der README).

## Weboberfläche

Unter [aura.timurmanjosov.com](https://aura.timurmanjosov.com/) läuft eine
eigene Weboberfläche, getrennt von dieser Seite. Dort meldet man sich mit
Discord an und sieht die Server, die man einrichten darf. Alles Weitere zu
Aura steht dort und im Repository.

<!-- Quellen (2026-10-27): aura/README.md (Funktion, keine Moderationsrechte,
     Docker Compose), Commit-Historie bis 2026-10-10 (Faktenextraktion,
     Ersetzung, /aura-ask, Datenschutzbefehle, Verschlüsselung), öffentliche
     Startseite von aura.timurmanjosov.com (Discord-Anmeldung, Serverliste),
     aura/web/README.md. Bewusst weggelassen: Preise, Bezahlung, Pläne.
     Kein LICENSE im Repo, deshalb steht hier nicht "Open Source". -->
