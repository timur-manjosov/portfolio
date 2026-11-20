---
title: Aporia
summary: A Monte Carlo laboratory for counterintuitive results in probability and game theory. Every simulation is tested against an independently derived exact value.
stage: active
tags: [probability, simulation, game-theory]
stack: [Rust, clap, rand_chacha, proptest]
links:
  repo: https://github.com/timur-manjosov/aporia
repo: timur-manjosov/aporia
updated: 2026-11-10
order: 25
status: draft-review
---

## What it is about

A command-line tool that checks six results where intuition fails. It does
not compute the answer, it simulates the mechanism: it plays the game, draws
the chord, reroutes the drivers. Every estimate is compared with an exact
value that separate code computes, and is reported with a confidence
interval. The principle, in the words of the README: “The simulator never
contains the answer; it can only agree with it.”

## The experiments

- **Monty Hall:** switching wins with probability 2/3, also with more doors
  and with a host who does not know where the prize is.
- **Birthday problem:** 23 people suffice for an even chance of a shared
  birthday, not around 183.
- **Bertrand's paradox:** a “random chord” has the probability 1/3, 1/2 or
  1/4, depending on how it is drawn.
- **Penney's game:** every pattern of length three or more can be beaten;
  checked against exact Markov-chain solutions for 310 ordered pattern pairs.
- **Parrondo's paradox:** two losing games that win when mixed.
- **Braess's paradox:** a free shortcut makes every driver's trip longer, 80
  instead of 65 minutes for 4,000 drivers.

## How it is tested

Independent oracles for the exact formulas, simulation against exact values
at a fixed seed, checks of the statistics (interval coverage, means),
property tests, a negative test that shows a wrong sampling method giving
the wrong answer, and tests of the command line (determinism, exit codes,
error messages). Continuous integration runs formatting, Clippy with
warnings as errors, the tests and the documentation build on every push.
MIT licence.

<!-- Sources (2026-11-17): aporia/README.md (introduction, experiment table,
     "Testing"), Cargo.toml (description, dependencies, licence),
     .github/workflows/ci.yml, GitHub API (created and last pushed
     2026-11-10). Stage "active" is inferred from the first publication a
     week before this entry, not confirmed by Timur (CONTENT-TODO.md). -->
