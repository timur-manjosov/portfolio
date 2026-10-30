---
title: Epiphyte
summary: Ein Discord-Bot, der pro Server eine Pflanze wachsen lässt. Sie lebt von sechs Aktivitätssignalen und vergisst nichts.
stage: active
tags: [discord, bot, generativ]
stack: [Python, discord.py]
links:
  repo: https://github.com/timur-manjosov/epiphyte
started: 2026-07-18
updated: 2026-10-21
featured: true
order: 20
status: draft-review
---

## Worum es geht

Jeder Server bekommt genau eine Pflanze. Sie wächst aus sechs Signalen, die
jeweils einen anderen Teil von ihr formen: wie viel geschrieben wird, wie
viele verschiedene Leute mitreden, wie gleichmäßig über den Tag verteilt,
Reaktionen, Tiefe von Threads und gemeinsame Zeit im Sprachkanal. Weil jedes
Signal nur einen Teil beeinflusst, kann eine einzelne Person die Pflanze nicht
allein hochziehen.

Was passiert, bleibt. Ein Ast, der in einer Dürre abstirbt, bleibt als Narbe
sichtbar. Eine gut gepflegte Pflanze kann blühen, Samen bilden und auf einem
alten Ast eine kleinere Epiphyte tragen. Wird sie ganz vernachlässigt, stirbt
sie, und an ihrer Stelle keimt eine verwandte neue Generation.

## Was der Bot nicht tut

Er nutzt nur die Standard-Intents von discord.py, ohne besondere Rechte. Er
merkt also, dass eine Nachricht kam, aber nie, was darin stand.

## Stand

Aktiv. Letzter Commit am 21. Oktober 2026, zuletzt ging es um sauberes
Herunterfahren und das Absichern der Datenbankdateien. MIT-Lizenz.

<!-- Quellen (2026-10-27): epiphyte/README.md ("The thesis", "Six ways a
     server shows up in the plant", "A body that keeps the record", "What it
     refuses to do"), Commit-Historie bis 2026-10-21, Lizenz laut GitHub. -->
