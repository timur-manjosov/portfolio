---
title: gauss-trainer
summary: Ein Terminal-Trainer für das Gauß-Verfahren mit exakter Bruchrechnung.
stage: active
tags: [lineare-algebra, lernen, tui]
stack: [Rust, Ratatui, num-rational]
links:
  repo: https://github.com/timur-manjosov/gauss-trainer
  release: https://github.com/timur-manjosov/gauss-trainer/releases
started: 2026-10-18
updated: 2026-10-18
order: 35
draft: true
status: draft-review
---

## Worum es geht

Ein Terminal-Trainer für das Gauß-Verfahren: Man wählt jede elementare
Zeilenumformung selbst (skalieren, Vielfaches einer Zeile addieren,
vertauschen), und das Programm rechnet exakt in Brüchen und zeigt, was bis zur
Treppennormalform noch fehlt. Es bildet den Zeilenumformungs-Trainer aus dem
Kurs _Mathematische Grundlagen_ der FernUniversität in Hagen als
Offline-Terminal-Programm nach. Die Oberfläche ist deutsch.

## Besonderheiten

- Exakte rationale Arithmetik ohne Gleitkomma; Rückgängig, Wiederholen,
  Zurücksetzen.
- Optionale Live-Analyse (Pivots, noch zu eliminierende Einträge, Rang), drei
  Hinweisstufen und ein Prüfungsmodus mit Timer.
- Rund 195 Tests, darunter Property- und Snapshot-Tests; vorgebaute Binaries
  für Linux, macOS und Windows mit SHA256-Prüfsummen.
- MIT-Lizenz.

<!-- Kandidat aus den öffentlichen GitHub-Repositories (2026-10-26), aus der
     README geschrieben. draft: true, bis Timur über die Veröffentlichung
     entscheidet. -->
