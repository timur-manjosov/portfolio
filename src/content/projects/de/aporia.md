---
title: Aporia
summary: Ein Monte-Carlo-Labor für Paradoxa der Wahrscheinlichkeits- und Spieltheorie. Jede Simulation wird gegen einen unabhängig hergeleiteten exakten Wert getestet.
stage: active
tags: [wahrscheinlichkeit, simulation, spieltheorie]
stack: [Rust, clap, rand_chacha, proptest]
links:
  repo: https://github.com/timur-manjosov/aporia
repo: timur-manjosov/aporia
updated: 2026-11-10
order: 25
status: draft-review
---

## Worum es geht

Ein Kommandozeilenwerkzeug, das sechs Ergebnisse prüft, bei denen die
Intuition versagt. Es rechnet die Antwort nicht aus, sondern simuliert den
Mechanismus: Es spielt das Spiel, zieht die Sehne, leitet die Fahrer um. Jede
Schätzung wird mit einem exakten Wert verglichen, den getrennter Code
berechnet, und mit einem Konfidenzintervall ausgegeben. Das Prinzip, in den
Worten der README: „The simulator never contains the answer; it can only
agree with it.“

## Die Experimente

- **Ziegenproblem (Monty Hall):** Wechseln gewinnt mit Wahrscheinlichkeit
  2/3, auch mit mehr Türen und mit einem Moderator, der nicht weiß, wo der
  Preis ist.
- **Geburtstagsproblem:** Für eine gerade Chance auf einen gemeinsamen
  Geburtstag reichen 23 Personen, nicht etwa 183.
- **Bertrand-Paradoxon:** Eine „zufällige Sehne“ hat die Wahrscheinlichkeit
  1/3, 1/2 oder 1/4, je nachdem, wie sie gezogen wird.
- **Penney-Spiel:** Jedes Muster der Länge drei oder mehr lässt sich
  schlagen; geprüft gegen exakte Markow-Ketten-Lösungen für 310 geordnete
  Musterpaare.
- **Parrondo-Paradoxon:** Zwei Verlustspiele, die gemischt gewinnen.
- **Braess-Paradoxon:** Eine kostenlose Abkürzung macht jede Fahrt länger,
  80 statt 65 Minuten bei 4.000 Fahrern.

## Wie es getestet wird

Unabhängige Orakel für die exakten Formeln, Simulation gegen exakte Werte
mit festem Seed, Prüfungen der Statistik (Abdeckung der Intervalle,
Mittelwerte), Property-Tests, ein Negativtest, der zeigt, dass ein falsches
Ziehverfahren die falsche Antwort liefert, und Tests der Kommandozeile
(Determinismus, Exit-Codes, Fehlermeldungen). Die CI prüft bei jedem Push
Formatierung, Clippy mit Warnungen als Fehler, die Tests und den Bau der
Dokumentation. MIT-Lizenz.

<!-- Quellen (2026-11-17): aporia/README.md (Einleitung, Tabelle der
     Experimente, "Testing"), Cargo.toml (Beschreibung, Abhängigkeiten,
     Lizenz), .github/workflows/ci.yml, GitHub-API (angelegt und zuletzt
     gepusht am 2026-11-10). Status "aktiv" ist aus der Veröffentlichung eine
     Woche vor diesem Eintrag abgeleitet, nicht von Timur bestätigt
     (CONTENT-TODO.md). -->
