---
title: Aura
summary: A Discord bot that knows what is currently true on a server instead of archiving every message. Comes with its own web interface.
stage: in-development
tags: [discord, bot, knowledge]
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

## What it is about

On a busy Discord server, the answer to most questions is somewhere in the
history. Nobody remembers where, or whether it still holds. Aura reads along
and keeps a small knowledge model of what is true on the server right now.
When something changes, the new statement replaces the old one, and the bot
remembers that the old one used to be true.

From that model Aura answers questions, chimes in on its own when it is
confident enough, greets new members with a current summary and posts a
regular digest of what changed. It cannot moderate anything: no kicks, no
bans, no deleting messages, no roles.

## Status

In development. The README in the repository still describes the first
skeleton; the commits are further along. Facts are extracted from messages,
verified and replaced when they change, `/aura-ask` answers questions, and
there are commands for a privacy summary, data export and deletion. The
database can optionally be encrypted. Last commit: 10 October 2026.

The source is public, and you can run the bot yourself with Docker Compose
(instructions in the README).

## Web interface

[aura.timurmanjosov.com](https://aura.timurmanjosov.com/) is Aura's own web
interface, separate from this site. You sign in with Discord and see the
servers you are allowed to set up. Everything else about Aura lives there and
in the repository.

<!-- Sources (2026-10-27): aura/README.md (purpose, no moderation, Docker
     Compose), commit history up to 2026-10-10 (fact extraction, replacement,
     /aura-ask, privacy commands, encryption), public start page of
     aura.timurmanjosov.com (Discord sign-in, server list), aura/web/README.md.
     Left out on purpose: prices, payment, plans. The repo has no LICENSE
     file, so the text does not say "open source". -->
