---
title: Epiphyte
summary: A Discord bot that grows one plant per server. It feeds on six activity signals and never forgets.
stage: active
tags: [discord, bot, generative]
stack: [Python, discord.py]
links:
  repo: https://github.com/timur-manjosov/epiphyte
started: 2026-07-18
updated: 2026-10-21
featured: true
order: 20
status: draft-review
---

## What it is about

Every server gets exactly one plant. It grows from six signals, each shaping a
different part of it: how much people write, how many different people take
part, how evenly that's spread over the day, reactions, thread depth, and
time spent together in voice. Since each signal only moves one part, no
single person can grow the plant alone.

What happens to it stays. A branch killed by a drought remains as a scar. A
well-tended plant can bloom, set seed, and grow a smaller epiphyte on an old
branch. Neglect it completely and it dies, and a related new generation
sprouts in its place.

## What the bot doesn't do

It uses discord.py's default intents only, with no privileged access. It
notices that a message arrived, never what it said.

## Status

Active. Last commit on 21 October 2026, most recently about shutting down
cleanly and keeping database files out of the repository. MIT licence.

<!-- Sources (2026-10-27): epiphyte/README.md ("The thesis", "Six ways a
     server shows up in the plant", "A body that keeps the record", "What it
     refuses to do"), commit history up to 2026-10-21, licence per GitHub. -->
