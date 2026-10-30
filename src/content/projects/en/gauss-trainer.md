---
title: gauss-trainer
summary: A terminal trainer for Gaussian elimination with exact fraction arithmetic.
stage: active
tags: [linear-algebra, education, tui]
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

## What it is about

A terminal trainer for Gaussian elimination: you pick each elementary row
operation (scale, add a multiple of one row to another, swap), and the program
does the arithmetic exactly, in fractions, showing what is left until the
reduced row echelon form. It reproduces the row-operation trainer from the
FernUniversität in Hagen course _Mathematische Grundlagen_ as an offline
terminal app. The interface is in German.

## Highlights

- Exact rational arithmetic, no floating point; undo, redo and reset.
- Optional live analysis (pivots, entries still to clear, rank), three levels
  of hints, and an exam mode with a timer.
- Around 195 tests, including property and snapshot tests; prebuilt binaries
  for Linux, macOS and Windows with SHA256 checksums.
- MIT licence.

<!-- Candidate from public GitHub repositories (2026-10-26), written from its
     README. draft: true until Timur decides to publish it. -->
