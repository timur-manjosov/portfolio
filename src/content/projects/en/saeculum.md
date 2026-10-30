---
title: Saeculum
summary: A world simulator for the terminal. Its history is never scripted, and every event knows its causes.
stage: paused
tags: [simulation, terminal, generative]
stack: [Python]
links:
  repo: https://github.com/timur-manjosov/saeculum
started: 2026-06-29
updated: 2026-08-10
order: 30
status: draft-review
---

## What it is about

Continents come from plate tectonics, rivers from the climate that follows.
Nations are run by rulers with fixed traits who don't plan ahead; they react
to whatever is next to them.

Every meaningful change produces an immutable event. It carries the weighted
factors that caused it and links to the events before it, so for any war or
collapse you can ask "why?" and follow the chain back to the start.

A world depends on a single number, the seed. Share it and someone else gets
the same history, down to identical event ids.

## Status

Paused. The last commit is from 10 August 2026, and there are still open
issues in the repository. MIT licence.

<!-- Sources (2026-10-27): saeculum/README.md (intro, "Highlights", "How it
     works"), commit history (last commit 2026-08-10), open issues and licence
     per GitHub. "Paused" is inferred from the commit gap, not confirmed by
     Timur (CONTENT-TODO.md). -->
