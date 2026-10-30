---
title: Privacy policy
description: Which data is processed when you visit timurmanjosov.com, for how long, and what your rights are.
updated: 2026-10-27
status: draft-review
---

This policy covers timurmanjosov.com. It describes what technically happens
when you visit, as the server is set up on the date above. The German version
is authoritative.

## Summary

- No cookies.
- No tracking, no analytics, no advertising.
- No content, fonts or scripts from other servers. Your browser only connects
  to this server when you visit.
- No contact form, no comments, no user accounts.
- No access log. Ordinary page requests are not stored.

## What happens when you load a page

The website consists of static files served by the Caddy web server. To send
your browser a page, the server has to receive your IP address, the requested
address and the usual information your browser sends (for example browser
type and language). It uses them to deliver the page and does not store them.

The exception is an error on the server itself (HTTP status 500 and above).
Then Caddy writes an error message to the server's system log (the systemd
journal). That message can contain your IP address, the requested address,
the time and your browser's information. Caddy leaves out cookies and
credentials. The log has no fixed deletion period: old entries are deleted
automatically once it reaches its size limit. I only use these messages to
find errors.

The legal basis is my legitimate interest in a working and secure website
(Art. 6(1)(f) GDPR).

## Hosting

The server is a virtual server I rent from netcup GmbH in Karlsruhe, Germany.
The data described in the previous section is stored there.

## Storage in your browser

If you pick a light or dark colour scheme with the switch, your browser
remembers that choice in local storage (`localStorage`, key `theme`). The
value stays in your browser and is never sent to the server. Nothing is
stored unless you make that choice. You can delete it at any time in your
browser settings.

## Search

Search runs entirely in your browser. It loads an index file from this
server. Your search terms are not transmitted.

## If you write to me

If you send me an e-mail, I process your address and your message to reply,
and delete them once they are no longer needed for that. The legal basis is
my legitimate interest in answering enquiries (Art. 6(1)(f) GDPR).

## Links to other websites

Links to other websites, such as GitHub, are plain links. Your browser only
connects to another website when you click one, and that website's privacy
policy applies there. This includes aura.timurmanjosov.com, which runs
separately from this website.

## Your rights

You have the right to access the data I process about you (Art. 15 GDPR), to
rectification (Art. 16), to erasure (Art. 17), to restriction of processing
(Art. 18) and to data portability (Art. 20). You can object to processing
based on my legitimate interest on grounds relating to your particular
situation (Art. 21). A message to the address above is enough.

You can also lodge a complaint with a data protection supervisory authority,
in particular in the EU member state where you live or work or where the
alleged infringement took place (Art. 77 GDPR).

<!-- Sources (2026-10-27): live Caddyfile on the server (timurmanjosov.com
     block has no `log` directive, neither does the new generated block),
     Caddy source modules/caddyhttp/server.go (handler errors with status
     >= 500 are logged at ERROR with the request, independent of access
     logging; Cookie/Authorization redacted by default), caddy.service
     (stderr → journal), journald.conf on the server (no MaxRetentionSec,
     persistent journal, rsyslog inactive). Hoster per brief. Re-check after
     every change to the Caddy configuration. -->
