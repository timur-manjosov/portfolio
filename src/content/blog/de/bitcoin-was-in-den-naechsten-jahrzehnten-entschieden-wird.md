---
title: "Bitcoin: Was in den nächsten Jahrzehnten entschieden wird"
description: "Bitcoins offene Konstruktionsfragen: das Sicherheitsbudget nach der Blockbelohnung, Governance ohne Entscheidungsverfahren, die Quantenfrage und die Marktseite."
date: 2026-11-18
category: opinion
tags: [bitcoin, sicherheitsbudget, governance, quantencomputer, spieltheorie]
draft: false
translationKey: bitcoin-coming-decades
---

<!-- Text: Timur Manjosov (prompts/bitcoin-artikel-quelle.md), gesetzt und
faktengeprüft in Revision 6. Jede Änderung am Wortlaut steht mit Quelle in
docs/VERIFICATION.md, Abschnitt "Bitcoin-Artikel". Alle Zahlen rechnet
tests/articles/bitcoin_security_budget.py nach. Literale Dollarzeichen sind
als \$ geschrieben, damit remark-math sie nicht als Formel liest. -->

Bitcoin hat zwei ungelöste Konstruktionsfragen, die ab den 2030er Jahren akut werden: wie seine Sicherheit bezahlt wird, wenn die Blockbelohnung ausläuft, und ob ein Netzwerk ohne Entscheidungsverfahren überhaupt eine Entscheidung treffen kann. Dieser Text sammelt, was ich dazu verstanden habe, und was daraus für eine eigene Position folgt.

## Woher der Wert kommt

Bitcoin ist ein gemeinsames Kassenbuch ohne Buchhalter. Tausende Rechner halten dieselbe Liste aller Transaktionen, alle zehn Minuten kommt ein Block dazu, und wer ihn anfügen darf, entscheidet sich über Proof of Work: eine Rechenaufgabe, die nur durch Ausprobieren zu lösen ist. Das kostet Strom, und genau darin liegt der Schutz. Die Vergangenheit zu fälschen hieße, die gesamte Rechenarbeit seitdem erneut zu leisten.

Die Obergrenze von 21 Millionen kennt jeder. Wichtiger ist der Mechanismus dahinter: Alle vier Jahre halbiert sich die Belohnung pro Block, aktuell 3,125 BTC. Das Angebot folgt einem Fahrplan, der 2009 festgeschrieben wurde und auf nichts reagiert – nicht auf Nachfrage, nicht auf den Preis, nicht auf Krisen.

Bei der Frage, woher der Wert kommt, wird fast immer geschummelt. Zwei verbreitete Antworten tragen nicht:

Knappheit allein erzeugt keinen Wert. Ich kann eine Datei erzeugen, von der es nur ein Exemplar gibt. Sie ist wertlos. Knappheit ist eine notwendige, keine hinreichende Bedingung.

Der Stromverbrauch erzeugt ebenfalls keinen Wert. Hier läuft die Kausalität genau andersherum: Weil Bitcoin einen Preis hat, lohnt sich Mining, und deshalb wird Strom verbraucht. Nicht umgekehrt. Man sieht es in Echtzeit, wenn der Kurs fällt: Der Hashprice sinkt, Miner steigen aus, die Difficulty passt sich an. Die Produktionskosten folgen dem Preis, sie bestimmen ihn nicht.

Was bleibt, ist ein Schelling-Punkt. Das Konzept stammt von Thomas Schelling (1960): Wenn sich zwei Menschen in einer Stadt treffen wollen, ohne sich absprechen zu können, gehen beide zum Hauptbahnhof – nicht weil der objektiv der beste Ort wäre, sondern weil beide wissen, dass der andere dasselbe denkt. Bitcoin ist wertvoll, weil hinreichend viele Menschen erwarten, dass hinreichend viele andere es für wertvoll halten. Ein sich selbst tragendes Gleichgewicht, nicht fundiert in Cashflows.

Das ist kein Argument dagegen. Gold funktioniert seit Jahrtausenden nach demselben Prinzip, Papiergeld ebenfalls. Es ist aber das Argument dafür, warum der Preis keine Untergrenze hat. Es gibt keine Ertragskraft, keinen Buchwert, keinen Punkt, an dem man sagen könnte: objektiv zu billig. Gleichgewichte dieser Art sind stabil, bis sie es nicht mehr sind, und dann gibt es nichts, was den Fall bremst.

## Das Sicherheitsbudget

Das ist die wundeste Stelle im Design, und sie ist im Whitepaper mit einem einzigen Satz abgehandelt.

Miner haben zwei Einnahmequellen: die Blockbelohnung und die Transaktionsgebühren. Zusammen bilden sie das Sicherheitsbudget. Es bestimmt, wie teuer ein Angriff auf das Netzwerk wäre.

Heute: 3,125 BTC × 144 Blöcke pro Tag = 450 BTC täglich. Bei rund 74.000 Dollar sind das etwa 33 Millionen Dollar pro Tag. Gebühren machen davon derzeit nur unter einem Prozent aus.

Die Belohnung halbiert sich weiter:

Tabelle: Blockbelohnung pro Tag und Sicherheitsbudget nach den nächsten Halvings

| Jahr  | BTC pro Tag | Budget pro Tag (bei 74.000 \$) |
| ----- | ----------: | -----------------------------: |
| heute |         450 |                   ~33 Mio. \$ |
| 2028  |         225 |                   ~17 Mio. \$ |
| 2032  |         112 |                    ~8 Mio. \$ |
| 2036  |          56 |                    ~4 Mio. \$ |
| 2040  |          28 |                    ~2 Mio. \$ |

Daraus folgt eine unbequeme Bedingung: Damit das Sicherheitsbudget in Dollar nur konstant bleibt, müsste sich der Bitcoin-Preis alle vier Jahre verdoppeln. Bis 2040 wäre das eine Versechzehnfachung, also rund 1,18 Millionen Dollar pro Coin und eine Marktkapitalisierung um 24 Billionen Dollar – etwa die Größenordnung des gesamten Goldmarkts. Das sind 19 Prozent pro Jahr, dauerhaft, für immer. Mathematisch unmöglich, weil jede Größe irgendwann an die Weltwirtschaft stößt.

Ein verbreitetes Missverständnis gehört hier korrigiert: Mining wird dadurch nie unrentabel. Die Difficulty passt sich alle zwei Wochen an. Fällt die Rentabilität, steigen Miner aus, die Schwierigkeit sinkt, für die Verbleibenden rechnet es sich wieder. Was wegbricht, ist nicht der Betrieb, sondern die absolute Höhe der Summe, die ein Angreifer überbieten müsste.

Irgendwann müssen also die Gebühren übernehmen. Und hier kommt der Widerspruch, der das Problem erst schwierig macht: Bitcoins Blockgröße ist begrenzt, etwa sieben Transaktionen pro Sekunde. Hohe Gebühren entstehen nur, wenn viele um diesen knappen Platz konkurrieren. Die Lösung für Bitcoins Skalierungsproblem heißt Lightning, also eine zweite Schicht, die Transaktionen außerhalb der Blockchain abwickelt. Genau dadurch sinkt die Nachfrage nach Blockplatz, und damit sinken die Gebühren.

Was Bitcoin benutzbar macht, untergräbt also das, was Bitcoin sichert. Das ist kein Randproblem, sondern ein struktureller Zielkonflikt im Design.

Zwei Arbeiten dazu, beide umstritten, aber keine Außenseiterpositionen: Carlsten et al. (2016), On the Instability of Bitcoin Without the Block Reward, zeigen, dass in einem reinen Gebührenregime neue Angriffsstrategien profitabel werden. Das Problem ist dort nicht nur die Höhe des Budgets, sondern dessen Schwankung: Bei konstanter Belohnung lohnt sich ehrliches Mining immer, bei rein gebührenbasierten Einnahmen gibt es fette und magere Blöcke, und das verändert die Anreize. Budish (2018), The Economic Limits of Bitcoin and the Blockchain, argumentiert, dass die laufenden Sicherheitskosten in einem Verhältnis zum abgesicherten Wert stehen müssen: Je wertvoller Bitcoin wird, desto teurer muss seine Absicherung sein, dauerhaft.

## Die Auswege und ihr Preis

Es gibt genau sieben Optionen, die ernsthaft diskutiert werden. Keine davon ist schmerzfrei.

### 1. Nichts tun und auf Gebühren hoffen

Der Status quo und faktisch die bisherige Antwort. Die Wette lautet, dass Blockplatz knapp genug wird.

### 2. Tail Emission

Eine dauerhafte Restbelohnung, die nie auf null fällt. Peter Todd hat das 2022 öffentlich vorgeschlagen, die Reaktion war vernichtend.

Technisch ist es winzig und erprobt: Monero macht es seit Jahren. Die Größenordnung wäre lächerlich klein. Eine feste Belohnung von 0,5 BTC pro Block wären 72 BTC täglich, rund 26.000 im Jahr, also etwa 0,12 Prozent Inflation jährlich bezogen auf 21 Millionen – und fallend. Die jährliche Goldförderung liegt bei 1,5 bis 2 Prozent des Bestands. Die Idee wäre also mehr als zehnmal knapper als Gold und trotzdem dauerhaft sicher finanziert.

Ökonomisch ist das Argument sogar stärker als Gebühren. Netzwerksicherheit ist ein öffentliches Gut, von dem jeder Halter profitiert, auch wer nie eine Transaktion macht. Gebühren zahlen nur diejenigen, die transagieren – die Coins im Tresor profitieren gratis. Eine Tail Emission verteilt die Kosten durch Verwässerung auf alle Halter, proportional zum Bestand. Wer den Nutzen hat, trägt die Kosten.

Warum es trotzdem nicht passieren wird: Der Wert der 21 Millionen liegt nicht in der Zahl, sondern darin, dass sie nicht verhandelbar ist. Ändert man sie einmal, hat man bewiesen, dass sie verhandelbar war. Von da an ist die Frage nicht mehr ob, sondern wie viel, und sie wird in jedem Zyklus neu gestellt. Spieltheoretisch ist das ein Lehrbuchfall von Zeitinkonsistenz optimaler Pläne (Kydland/Prescott 1977, Nobelpreis 2004): Eine Regel entfaltet ihre Wirkung nur, wenn sie nicht gebrochen werden kann. Sobald bekannt ist, dass die Instanz doch eingreift, ändern alle Beteiligten ihr Verhalten im Vorgriff darauf – und die Regel verliert ihre Kraft, bevor sie gebrochen wird. Genau deshalb wurden Zentralbanken unabhängig gemacht, und genau das ist Bitcoins Geschäftsmodell.

### 3. Coin Recycling

Inaktive Coins nach langer Frist zurück in den Umlauf, als Belohnung für Miner. Formal bleiben die 21 Millionen stehen, und geschätzt 3 bis 4 Millionen BTC gelten als unwiederbringlich verloren. Politisch ist das leichter zu verkaufen, weil es sich als Vollendung statt als Bruch erzählen lässt.

Es scheitert an einem Punkt, der sich nicht umgehen lässt: Es gibt keinen Weg, verloren von geduldig zu unterscheiden. Das Protokoll sieht nur, dass sich eine Adresse nicht bewegt hat. Ein Cold-Storage-Halter, der zwanzig Jahre nicht anfässt, verhält sich exakt identisch zu jemandem, dessen Schlüssel im Müll liegt – und das ist genau das vorbildliche Verhalten, das die Bitcoin-Kultur immer gepredigt hat. Die Folge wäre ein Zwang zum Lebendigkeitsnachweis: Aus „deine Coins gehören dir für immer“ würde „deine Coins gehören dir, solange du dich meldest“. Dazu kommt das Fristdilemma: Eine kurze Frist liefert genug Coins und erwischt reihenweise echte Halter, eine lange Frist trifft fast nur wirklich verlorene Coins und gibt bis in die 2030er nichts frei – also genau dann nicht, wenn das Problem akut wird.

Wirtschaftlich ist es ohnehin dasselbe wie eine Tail Emission, nur mit unfairer Verteilung: Verwässert werden nicht alle gleichmäßig, enteignet werden die Unaufmerksamen.

### 4. Blockgröße begrenzen oder senken

Weniger Platz bedeutet mehr Konkurrenz und höhere Gebühren, ohne eine Regel zu brechen. Macht Bitcoin für kleine Beträge unbrauchbar, und Blockgrößendebatten haben 2017 schon einmal zur Spaltung geführt.

### 5. Nachfrage nach Blockplatz erzeugen – Covenants

Statt das Angebot zu verknappen, die Nachfrage steigern. Covenants sind Regeln, die festlegen, nicht nur wer ausgeben darf, sondern wohin die Coins danach dürfen. Damit lassen sich Layer-2-Konstruktionen bauen, bei denen sich viele Nutzer einen On-Chain-Eintrag teilen und jeder trotzdem jederzeit allein aussteigen kann, ohne jemandem zu vertrauen. Mehr Nutzer bedeuten mehr Ein- und Ausstiege, und jeder davon zahlt Gebühren.

Das ist die einzige Option, die kein Versprechen bricht. Keine neuen Coins, kein Eingriff in fremdes Eigentum, keine Änderung der Geldpolitik. Deshalb ist der Covenant-Streit wichtiger, als er von außen aussieht.

### 6. Assisted Merged Mining

Andere Projekte zahlen Bitcoin-Minern dafür, dass dieselbe Rechenarbeit auch deren Ketten sichert. Zusätzliche Einnahmen ohne Protokolländerung, funktioniert bereits in kleinem Maßstab. Der Haken: Bitcoins Sicherheit hänge dann teilweise am Erfolg fremder Projekte, und es begünstigt große professionelle Betreiber. Realistisch eine Ergänzung, kein Ersatz.

### 7. Akzeptieren, dass das Budget relativ schrumpft

Die These: Ein Angriff muss nicht unbezahlbar sein, nur unrentabel. Spezialhardware ist nicht mietbar, und wer angreift, vernichtet den Wert dessen, was er gerade erbeutet. Keine Änderung nötig, nur eine andere Risikoeinschätzung. Plausibel, aber unbewiesen.

Der rote Faden: Jede Lösung wirft irgendein Versprechen über Bord – entweder die feste Obergrenze, oder die Unantastbarkeit fremder Coins, oder die Erschwinglichkeit der Nutzung. Es gibt keinen Ausweg, der alle drei hält. Das ist kein Mangel an Kreativität, das ist im Design angelegt.

## Das Governance-Problem

Bitcoin hat kein Verfahren, um zu entscheiden. Das ist Absicht, denn ein Entscheidungsgremium wäre ein Angriffspunkt. Der Preis dafür ist, dass eine Änderung ungefähr Einstimmigkeit zwischen Entwicklern, Minern, Börsen und Nutzern braucht. Das funktioniert hervorragend, um Änderungen zu verhindern. Es funktioniert schlecht, wenn eine Änderung nötig wird.

Seit Taproot im November 2021 hat Bitcoin fast fünf Jahre keine Konsensänderung mehr gehabt.

Der Stand der Covenant-Debatte ist der aussagekräftigste Datenpunkt, den es derzeit gibt:

Tabelle: Stand der Covenant-Vorschläge im November 2026

| Vorschlag        | Stand (Nov. 2026)                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| CTV + CSFS       | Aktivierungsclient (nur CTV) seit 30.03.2026, Schwelle 90 % der Miner, Fenster bis März 2027, Signalisierung bei 0 %      |
| OP_CAT (BIP-347) | Spezifikation seit März 2026 vollständig, über 74.000 Transaktionen im Testnetz, keine Aktivierungsparameter fürs Hauptnetz |
| BIP-110          | Soft-Fork-Versuch im August 2026 an fehlender Miner-Zustimmung gescheitert                                                |

Im Juni 2025 unterzeichneten 66 Entwickler einen offenen Brief für CTV und CSFS. Die Miner signalisieren trotzdem null Prozent, über sieben Monate ins Fenster hinein. Null Prozent bei 66 unterzeichnenden Entwicklern – das ist keine technische Frage mehr.

Dahinter stehen zwei Lager. Die Ossifikationsposition sagt, Bitcoin solle einfrieren, jede Änderung sei ein Angriffsvektor. Vertreten von der Knots-Seite und von Michael Saylor, der gut finanzierte Entwickler als größte Gefahr für das Protokoll bezeichnet. Die Evolutionsposition hält dagegen: Ein Protokoll, das sich weder gegen existenzielle Bedrohungen wehren noch seine eigene Skalierung ermöglichen kann, erstarrt nicht zu Widerstandsfähigkeit, sondern in die Bedeutungslosigkeit.

Es gibt noch drei weitere Positionen, die seltener genannt werden: Freiwilligkeit (neue Funktionen optional, niemand wird gezwungen – löst das Problem nicht, weil die Coins der Untätigen verwundbar bleiben), Schichtentrennung (die Basisschicht erstarrt bewusst, Innovation wandert in Layer 2 – faktisch das, was gerade passiert, ohne dass es jemand beschlossen hätte) und Marktentscheid durch Fork (wie 2017 bei Bitcoin Cash – jede Spaltung schwächt aber den Schelling-Punkt, der die Grundlage des Werts ist).

Das Unangenehme an der Lage: Die Unnachgiebigkeit der Halter ist spieltheoretisch nicht irrational. Für den einzelnen Halter ist sie die dominante Strategie – er profitiert davon, dass alle anderen hart bleiben, und schwächt die eigene Position, wenn er Flexibilität signalisiert. Jeder handelt individuell optimal. Das Ergebnis ist trotzdem kollektiv schlecht: Das Netzwerk kann nicht handeln, wenn es handeln müsste. Das ist ein Koordinationsversagen, kein Dummheitsproblem. Gegen Dummheit hilft Aufklärung, gegen diese Anreizstruktur hilft nichts – außer dass die Lage dramatisch genug wird, dass die Rechnung für den Einzelnen kippt.

Und dann die Ironie: Das Netzwerk würde die Regel vermutlich erst brechen, wenn es weh tut, und dann unter schlechtestmöglichen Bedingungen.

Ein neuer Faktor, den es früher nicht gab: Bei einer Spaltung müsste jemand entscheiden, welche Kette „Bitcoin“ ist. Früher waren das Börsen und Nutzer. Heute kommen BlackRock, Fidelity und die anderen ETF-Emittenten dazu, die Milliardenbestände verwalten und rechtliche Verpflichtungen gegenüber Anlegern haben, aber keine ideologischen gegenüber dem Protokoll. Das ist eine stille Machtverschiebung in Bitcoins Governance, die noch nie getestet wurde.

## Die Quantenfrage

Bitcoin signiert Transaktionen mit ECDSA auf der Kurve secp256k1. Ein ausreichend starker Quantencomputer könnte mit Shors Algorithmus aus dem öffentlichen Schlüssel den privaten berechnen. Das deutsche BSI rechnet mit zehn bis fünfzehn Jahren bis zu einem kryptografisch relevanten Quantenrechner. Heute existiert keine Maschine, die auch nur annähernd dazu fähig wäre.

Die Debatte ist 2026 trotzdem konkret geworden. Im Februar wurde BIP-360 aufgenommen, ein quantenresistenter Adresstyp. Im April folgte BIP-361 von Jameson Lopp und fünf weiteren Entwicklern, mit einem verbindlichen Migrationspfad.

Und hier wird es brisant: BIP-361 sieht vor, quantenanfällige Coins, die unbewegt bleiben, irgendwann einzufrieren. Changpeng Zhao schlug im Juni 2026 vor, genau das mit Satoshi Nakamotos rund 1,1 Millionen BTC zu tun.

Bitcoin wurde mit dem Versprechen gebaut, dass niemand deine Coins ohne deinen privaten Schlüssel anfassen kann. Keine Regierung, keine Bank. Zum ersten Mal in sechzehn Jahren stellt die Entwicklergemeinschaft dieses Versprechen selbst infrage – aus Sicherheitsgründen. Adam Back hält dagegen und plädiert für freiwillige Upgrades statt erzwungenem Stilllegen.

Die Zwickmühle hat keinen dritten Ausgang:

- Nichts tun heißt, ein Angreifer kann die Coins nehmen. Das wäre der Beweis, dass „nicht dein Schlüssel, nicht deine Coins“ nur gilt, solange die Mathematik hält. Außerdem käme Angebot auf den Markt, das seit sechzehn Jahren als verloren gilt.
- Einfrieren heißt, das Netzwerk beweist, dass es sehr wohl entscheiden kann, wem seine Coins gehören. Genau das, was Bitcoin nie können sollte.

Egal was gewählt wird, ein Grundversprechen fällt. Das ist keine technische Entscheidung, sondern eine Wertentscheidung über Eigentum.

## Wie andere es lösen und was es sie kostet

Monero hat genau das Problem gelöst, indem es eine feste Restbelohnung pro Block eingebaut hat, die nie auf null fällt. Das Sicherheitsbudget ist dauerhaft finanziert, ohne auf steigende Gebühren oder steigende Kurse angewiesen zu sein. Dazu nutzt Monero einen Mining-Algorithmus für normale Prozessoren statt für Spezialhardware, die Rechenleistung ist dadurch breiter verteilt. Und die Community hat ihren Konsensmechanismus mehrfach planmäßig geändert – Handlungsfähigkeit ist dort bewiesen, nicht erhofft.

Der Preis: keine Obergrenze, also auch kein Knappheitsnarrativ. Und ab dem 10. Juli 2027 verbietet Artikel 79 der EU-Geldwäscheverordnung allen EU-Dienstleistern, anonymisierende Kryptowerte zu führen, zu handeln oder zu verwahren. Der private Besitz bleibt legal, der regulierte Zugang verschwindet.

Monero zeigt damit etwas Wichtiges: Das technisch beste Design gewinnt nicht automatisch. Es hat die sauberste Lösung, funktioniert seit Jahren, und wird trotzdem aus dem regulierten Markt gedrängt, weil eine andere Eigenschaft politisch unerwünscht ist. Überlebensfähigkeit entscheidet sich nicht am Code.

Ethereum löst es strukturell anders. Proof of Stake bezahlt Sicherheit nicht durch externen Stromverbrauch, sondern durch hinterlegtes Kapital im System selbst. Wer betrügt, verliert seinen Einsatz. Das Budget skaliert damit automatisch mit dem Wert des Netzwerks, statt davon abgekoppelt zu schrumpfen. Dazu eine Post-Quanten-Roadmap: Lean Ethereum, im Juli 2026 von Vitalik Buterin und zuvor von Justin Drake vorgestellt, zielt auf vollständige Post-Quanten-Infrastruktur bis Ende 2029 über etwa sieben Hard Forks.

Der Preis: keine Obergrenze und damit dauerhafte Verwässerung in unbestimmter Höhe. Starke Stake-Konzentration bei wenigen großen Anbietern. Und ein Problem, das Bitcoin spiegelt: Die Rollups ziehen Aktivität und damit Gebühren von der Basisschicht ab, weshalb Ethereum wieder inflationär geworden ist. Was Bitcoin mit Lightning passiert, passiert Ethereum mit Rollups.

Außerdem ist die Flexibilität zweischneidig: Eine Stiftung und ein paar Client-Teams können das Protokoll grundlegend umbauen. Das ist Handlungsfähigkeit und zugleich ein Angriffspunkt. Wer koordinieren kann, kann unter Druck gesetzt werden.

Das Muster dahinter, und es gilt überall:

Tabelle: Was die Designs lösen und was sie dafür erzeugen

|          | löst                   | erzeugt                                         |
| -------- | ---------------------- | ----------------------------------------------- |
| Bitcoin  | glaubwürdige Knappheit | Sicherheitsfinanzierung ab den 2030ern          |
| Ethereum | Sicherheitsfinanzierung | unbegrenzte Emission, Stake-Konzentration      |
| Monero   | beides sauber          | kein Knappheitsnarrativ, regulatorischer Ausschluss |
| Solana   | Geschwindigkeit, Nutzung | Validator-Konzentration, Ausfallhistorie      |

Das sind keine Kinderkrankheiten, die sich auswachsen. Es sind Zielkonflikte. Man kann nicht gleichzeitig eine unveränderliche Geldpolitik und eine dauerhaft finanzierte Sicherheit haben. Und je schneller und flexibler ein Protokoll ist, desto zentralisierter ist es. Bitcoin ist langsam und starr, weil niemand koordiniert.

Bitcoins größte Stärke, seine Unveränderlichkeit, ist hier seine größte Schwäche. Ethereum konnte seinen Konsensmechanismus komplett austauschen. Bitcoin kann das nicht, ohne genau das Versprechen zu brechen, auf dem sein Wert beruht.

## Die Marktseite

Neben der Designfrage steht eine zweite, völlig andere: Wie verhält sich Bitcoin, wenn institutionelles Kapital nicht hinein-, sondern hinausfließt?

Die US-Spot-Bitcoin-ETFs starteten am 11. Januar 2024. Bitcoin stand damals bei etwa 46.000 Dollar, bis zum Hoch im Oktober 2025 bei über 126.000 Dollar war das rund das 2,7-Fache. Die kumulierten Nettozuflüsse erreichten im Oktober 2025 ihren Rekord bei rund 61 Milliarden Dollar – exakt in dem Monat, in dem auch der Kurs sein Hoch markierte.

Der entscheidende Datenpunkt liegt im Zeitraum danach. Zwischen November 2025 und Februar 2026 zogen Anleger 6,38 Milliarden Dollar aus den ETFs ab. Im selben Zeitraum fiel Bitcoin von über 100.000 auf nahezu 60.000 Dollar.

Rechne das durch: 6,38 Milliarden Abfluss bei einer Marktkapitalisierung im Bereich von zwei Billionen Dollar sind etwa 0,3 Prozent der Marktkapitalisierung. Der Kurs verlor dabei rund 40 Prozent.

Dahinter steht die Inelastic Markets Hypothesis von Gabaix und Koijen (2021). Deren Befund für Aktienmärkte: Ein Dollar, der in den Markt fließt, bewegt die Marktkapitalisierung um etwa fünf Dollar. Der Grund ist, dass die meisten Halter ihre Anteile zu keinem Preis verkaufen wollen. Nur ein winziger Teil des Bestands ist überhaupt verfügbar, und der marginale Käufer setzt den Preis für alle.

Bei Bitcoin ist der Effekt stärker, aus einem strukturellen Grund: Es gibt keine Angebotsreaktion. Wenn eine Aktie steigt, kann das Unternehmen neue Aktien ausgeben und den Druck abfedern. Bitcoin kann das nicht. Die Ausgabemenge ist fix, egal was der Preis macht.

Zwei ehrliche Einschränkungen dazu. Erstens waren die 6,38 Milliarden nicht die alleinige Ursache für die 40 Prozent – Abflüsse und fallende Kurse haben sich gegenseitig verstärkt, daraus lässt sich keine saubere Funktion ableiten. Zweitens ist der Multiplikator nach oben vermutlich kleiner als nach unten: Jeder Anstieg lockt Verkäufer hervor, die auf ein höheres Niveau gewartet haben, während bei fallenden Kursen Käufer verschwinden und das Orderbuch ausdünnt.

### Warum die These „Institutionen stabilisieren“ nicht trägt

Institutionelle Investoren sind keine Diamond Hands. Sie haben Risikobudgets, Mandate und Vorgesetzte. Wenn eine Position gegen ein Limit läuft, wird verkauft, unabhängig von der Überzeugung. Ein Privatanleger kann aussitzen, ein Fondsmanager nicht. Dazu kommt die Asymmetrie seiner Anreize: Mit Bitcoin recht zu haben bringt ihm wenig, falsch zu liegen kostet ihn den Job. Das ist ein klassisches Principal-Agent-Problem und führt zu Herdenverhalten.

Die ETFs schneiden in beide Richtungen. Was mit zwei Klicks hineinfließt, fließt mit zwei Klicks wieder hinaus. Und ein erheblicher Teil der institutionellen Nachfrage war nie Überzeugung, sondern Basis-Trade: Hedgefonds kaufen den Spot-ETF und verkaufen gleichzeitig den Future, um die Preisdifferenz einzustreichen. Dieses Kapital hat keine Meinung zu Bitcoin und verschwindet preisunempfindlich, sobald sich der Trade nicht mehr lohnt.

Das Entscheidende: Wir haben null Beobachtungen für einen vollständigen institutionellen Abwärtszyklus. Die vier großen Zyklen waren Krisen in einem Markt ohne institutionelles Kapital. Der ETF-Zufluss war der erste große institutionelle Zyklus – und zwar nur die Aufwärtsbewegung. Die Rechnung mit n = 4 ist für diese Frage also nicht einmal n = 4, sondern n = 0.

## Warum vier Zyklen nichts beweisen

Bitcoin hat seit 2011 vier große Zyklen durchlaufen:

Tabelle: Die vier großen Zyklen seit 2011

| Zyklus | Hoch              | Tief                  | Drawdown | Bis zum neuen Hoch |
| ------ | ----------------- | --------------------- | -------: | ------------------ |
| 2011   | ~32 \$ (Juni)     | ~2 \$ (Nov.)          |    −93 % | ~1,5 Jahre         |
| 2013   | ~1.150 \$ (Dez.)  | ~170 \$ (Jan. 2015)   |    −85 % | ~3 Jahre           |
| 2017   | ~19.800 \$ (Dez.) | ~3.200 \$ (Dez. 2018) |    −84 % | ~3 Jahre           |
| 2021   | ~69.000 \$ (Nov.) | ~15.500 \$ (Nov. 2022) |   −77 % | ~2,3 Jahre         |

2011 war der Markt so klein, dass ein Hack bei Mt. Gox für −93 Prozent reichte. 2013 endete mit dem Zusammenbruch von Mt. Gox. 2017 war der ICO-Rausch und platzte ohne einzelnes auslösendes Ereignis. 2021 war der erste Zyklus mit Institutionen und gehebelten Krediten und endete als Kettenreaktion: Terra/Luna, Celsius, Three Arrows Capital, FTX.

Die Drawdowns werden kleiner: 93 → 85 → 84 → 77. Das sieht nach Reifung aus. Bei vier Punkten ist es genauso gut Zufall. Vier absteigende Zahlen zu würfeln ist nicht ungewöhnlich. Wenn eine Münze viermal auf Kopf fällt, schließt man auch nicht auf eine gezinkte Münze – das passiert bei einer fairen Münze in einem von sechzehn Fällen.

Schlimmer noch: Die vier Zyklen sind nicht unabhängig voneinander, und jeder hatte eine andere Ursache – Börsenhack, Börsenkollaps, Blasenplatzen, Kreditkaskade. Aus vier verschiedenen Mechanismen lässt sich kein fünfter vorhersagen. Und jeder fand unter völlig anderen Bedingungen statt: 2013 ohne institutionelle Beteiligung, 2018 ohne ETFs, 2022 ohne Pensionsfonds.

Der Vierjahres-Zyklus widerspricht sich selbst. Die Erzählung lautet: Das Halving verknappt das Angebot, deshalb steigt der Preis. Nur ist das Halving seit 2009 im Protokoll festgeschrieben, jeder kennt den Termin auf den Block genau. In einem auch nur halbwegs effizienten Markt kann ein vollständig bekanntes, deterministisches Ereignis nicht systematisch zu späteren Kursgewinnen führen – es wäre längst eingepreist. Die These behauptet, der Markt übersehe jedes Mal etwas, was in jedem Lehrbuch steht.

Die Größenordnung spricht ebenfalls dagegen. Beim Halving 2024 sank das tägliche Neuangebot von 900 auf 450 BTC. Bei einem Handelsvolumen in Milliardenhöhe ist das ein kleiner Beitrag. Dass 2024 und 2025 die ETF-Zuflüsse liefen, ist als Erklärung sehr viel naheliegender.

Was man stattdessen sieht, sind Liquiditätszyklen. Bitcoin hat sich bisher wie ein Risiko-Asset am äußersten Ende der Skala verhalten: Wenn Zinsen fallen und Geld in den Markt strömt, steigt es überproportional, und umgekehrt. Dass diese Zyklen ungefähr im Vierjahresrhythmus liefen, ist eine Eigenschaft der Geldpolitik, nicht des Bitcoin-Protokolls.

Und das führt zu einem Punkt, der mir wichtiger ist als die Zyklusdebatte: Bitcoin hat seine gesamte Geschichte in einer Ausnahmephase erlebt. Die Jahre 2009 bis 2021 – Nullzins, teils Negativzins, massive Anleihekäufe – waren historisch einmalig. Der Normalzustand der 1990er bis 2007 lag bei Leitzinsen zwischen 3 und 6 Prozent. Bitcoins große Anstiege fielen in Zeiten extrem billigen Geldes.

Einen Test gab es: 2022, die schnellste Zinswende der Geschichte. Bitcoin verlor rund 77 Prozent, gemeinsam mit Technologiewerten, nur stärker. Das Ergebnis war eindeutig – Bitcoin verhielt sich wie ein Risiko-Asset, nicht wie digitales Gold. Was noch fehlt, ist ein dauerhaft höheres Zinsniveau über Jahre. Ob Bitcoin in einer Welt mit 3 bis 4 Prozent Realzins eine Rolle findet, ist offen.

Zum Vergleich, damit die Größenordnung klar wird: Der Aktienmarkt hat über ein Jahrhundert Daten, Weltkriege, Hyperinflation, Depressionen – und selbst dort ist der Satz „Aktien steigen langfristig immer“ angreifbar. Russische und chinesische Aktien wurden in der ersten Hälfte des 20. Jahrhunderts wertlos, der Nikkei brauchte vom Hoch 1989 über 30 Jahre bis zum neuen Höchststand. Wenn schon bei hundert Jahren Daten solche Fälle existieren, sind vier Bitcoin-Zyklen schlicht nichts.

## Was ich daraus ableite

Die ehrliche Antwort auf die Frage, welche Kryptowährung diese Probleme nicht hat, lautet: keine. Jedes Design löst etwas, indem es etwas anderes erzeugt. Die Suche nach dem Coin ohne offene Frage ist die falsche Suche – und jeder Monat Suche kostet Spread, Steuerfristen und Aufmerksamkeit.

Deshalb ist die richtige Antwort auf „alle Optionen haben ungelöste Fragen“ nicht, weiterzusuchen, sondern die Positionsgröße so zu wählen, dass die Unsicherheit einen nicht umwirft.

Meine Aufteilung ist 70 Prozent Welt-ETF, 30 Prozent Bitcoin. Die Begründung dahinter:

Der ETF hat einen Mechanismus: Unternehmen erwirtschaften Gewinne, davon bekommt man einen Anteil. Das funktioniert auch, wenn niemand hinschaut. Bitcoin hat diesen Mechanismus nicht. Es funktioniert, solange genug Menschen glauben, dass es funktioniert. Der größere Teil liegt also auf dem, was einen Erklärungsgrund hat, der kleinere auf dem, was eine Wette ist.

Die Zahl 30 ist nicht beliebig. Bei 30 Prozent Bitcoin und einem 80-Prozent-Crash verliert man 24 Prozent des Gesamtportfolios allein aus Krypto. Kommt, wie meist, ein ETF-Drawdown dazu, sind es rund 45 Prozent. Bei 40 Prozent Bitcoin wären es etwa 50. Der einzig belastbare Test ist: Verkrafte ich 30 Prozent meines Vermögens dauerhaft weg? Diese Frage braucht keine Annahme über Zyklen.

Gesteuert wird über Band-Rebalancing, nicht über Markteinschätzung. Der Krypto-Anteil am Gesamtportfolio entscheidet, wie viel frisches Geld wohin geht. Fällt Bitcoin, sinkt der Anteil, und die Sparrate schaltet automatisch höher. Steigt er stark, pausiert der Krypto-Kauf. Das Regelwerk fragt nie, ob der Kurs billig ist – diese Frage ist bei einem Asset ohne Bewertungsanker ohnehin nicht beantwortbar.

Ein Punkt, der mir wichtig ist: Rebalanciert wird nur mit frischem Geld, nie durch Verkauf des ETF. Die Rebalancing-Mathematik würde beides verlangen. Die Diversifikationsrendite beträgt näherungsweise $\frac{1}{2} \times \bigl(\sum w_i \sigma_i^2 - \sigma_p^2\bigr) %% ein halb mal, in Klammern: die Summe aus w i mal sigma i Quadrat, minus sigma p Quadrat$ und ist bei hoher Volatilität und niedriger Korrelation beträchtlich. Sie setzt aber voraus, dass beide Teile positiven Erwartungswert haben und keiner dauerhaft auf null gehen kann. Beim Welt-ETF ist das plausibel, bei einem einzelnen Asset ohne Cashflow-Anker offen. ETF-Anteile zu verkaufen, um Bitcoin nachzukaufen, hieße, systematisch den funktionierenden Teil zu verkaufen, um den möglicherweise kaputten zu füttern.

Und die Formel kennt ohnehin nur Gewichte, nicht die Herkunft des Geldes. Solange die monatliche Sparrate groß gegenüber dem Portfolio ist, stellt frisches Geld die Zielquote genauso her wie ein Verkauf – nur ohne Transaktion, ohne Steuerereignis und ohne eine Entscheidung, die jedes Mal neu getroffen werden muss.

Zwei Dinge, die ich aus den letzten Wochen gelernt habe und die mehr wert sind als jede Analyse:

Thesenwechsel sind teuer. Jeder Wechsel kostet Spread, setzt die 12-Monats-Haltefrist neu an und erzeugt bei einem Coin-Tausch ein steuerpflichtiges Veräußerungsgeschäft nach § 23 EStG. Bei kleinen Beträgen ist das billig, bei größeren nicht. Je mehr Einzelentscheidungen man hat, desto mehr Gelegenheiten gibt es, falsch abzubiegen.

Tiefes Durchleuchten erzeugt immer ein negatives Bild. Wer zwei Tage lang nur die Schwächen eines Assets seziert, hält am Ende jede Alternative für besser – nicht weil sie es ist, sondern weil man dort noch nicht genauso hingeschaut hat. Das ist ein Verfügbarkeitseffekt. Die Konsequenz ist nicht, die Analyse zu lassen, sondern am Tag danach keine Entscheidung zu treffen.

## Die vier Signale

Die Fragen aus diesem Text beantworten sich nicht durch mehr Nachdenken, sondern durch Beobachtung über Jahre. Deshalb habe ich sie in vier messbare Signale übersetzt, die ich einmal jährlich prüfe – immer im Januar, bewusst unabhängig vom Kursverlauf und nie in einer Phase stark fallender Kurse. Sonst findet man zu einem schlechten Kurs Argumente, die es vorher auch schon gab.

Tabelle: Die vier Signale, einmal im Jahr geprüft

| Signal                 | Was gemessen wird                                                    | Rot, wenn                                               |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| Handlungsfähigkeit     | Irgendeine aktivierte Konsensänderung seit Taproot (Nov. 2021)?      | keine bis 2034 (bis 2030: Warnsignal)                   |
| Gebührenanteil         | Anteil der Gebühren am Minerumsatz, gleitender Jahresdurchschnitt    | 2032 unter 10 % (über 20 % = grün)                      |
| Quantenantwort         | Kommt ein Migrationspfad, und ohne Kettenspaltung?                   | Debatte ohne Ergebnis                                   |
| Hashrate-Konzentration | Verteilung auf Pools und Jurisdiktionen                              | Top-3-Pools über 50 % oder Schwerpunkt bei staatsnahen Betreibern |

Quellen dafür: die Bitcoin Improvement Proposals auf GitHub, mempool.space, Glassnode oder Coin Metrics für den Gebührenanteil, die Cambridge Mining Map für die geografische Verteilung.

Die Konsequenz steht vorher fest, damit sie nicht im Moment der Emotion verhandelt wird:

- 0 bis 1 rot: These hält, weiter nach Regelwerk
- 2 rot: Zielquote von 30 auf 20 Prozent senken
- 3 rot: auf 10 Prozent senken
- 4 rot: Position auflösen

Gesenkt wird über die Sparrate, nicht über Verkäufe. Und der Befund wird jedes Jahr mit Datum notiert, ein Satz pro Signal – ohne Protokoll erinnert man sich 2032 daran, es sei „schon immer schlecht gewesen“, und das ist dann eine nachträglich konstruierte Erinnerung.

Zum Zeitrahmen, damit die Erwartung stimmt: Bis etwa 2030 ist mit keiner belastbaren Entwicklung zu rechnen. Die Belohnung liegt bis 2032 noch über 0,78 BTC pro Block, das Budget ist komfortabel. Ernsthaft relevant wird die Prüfung ab 2032 bis 2036. Der nächste konkrete Datenpunkt ist das CTV-Aktivierungsfenster, das bis März 2027 läuft.

Eine Einschränkung, die ich mitdenke: Die Signale messen, ob Bitcoin langfristig überlebensfähig ist. Sie messen nicht, wie sich der Preis entwickelt. Diese beiden Dinge können jahrelang auseinanderlaufen. Es ist sogar denkbar, dass genau die Entscheidung, die mich überzeugen würde – etwa eine Tail Emission – den Preis einbrechen lässt, weil die Unverhandelbarkeit der Grund ist, warum viele halten.

Und der Punkt, der am Ende mehr entscheidet als jede Analyse: Das Regelwerk schreibt vor, bei einem Krypto-Anteil unter 15 Prozent die volle Sparrate in Bitcoin zu stecken. Das wäre der Moment, in dem Bitcoin rund zwei Drittel verloren hat und die Schlagzeilen „Bitcoin ist tot“ lauten. Ob man das dann durchhält, entscheidet mehr über das Ergebnis als alles, was hier steht.

## Stand und Quellen

Marktdaten in diesem Text: Stand 13./14. November 2026. Bitcoin notierte unter 70.000 Dollar, rund 46 Prozent unter dem Hoch von 126.000 Dollar aus dem Oktober 2025. Der Fear-and-Greed-Index stand bei 20, also extreme Angst. Die US-Spot-Bitcoin-ETFs lagen 2026 bei 1,56 Milliarden Dollar Nettoabfluss im Jahresverlauf. Der Markt preist für den 9. Dezember eine Fed-Zinserhöhung mit rund 88 Prozent Wahrscheinlichkeit ein. Kursangaben altern schnell – die Argumente dieses Textes hängen nicht daran.

### Literatur

- Carlsten, Kalodner, Weinberg, Narayanan (2016): [On the Instability of Bitcoin Without the Block Reward](https://www.cs.princeton.edu/~arvindn/publications/mining_CCS.pdf)
- Budish (2018): [The Economic Limits of Bitcoin and the Blockchain](https://www.nber.org/papers/w24717)
- Gabaix, Koijen (2021): [In Search of the Origins of Financial Fluctuations: The Inelastic Markets Hypothesis](https://www.nber.org/papers/w28967)
- Kydland, Prescott (1977): [Rules Rather than Discretion: The Inconsistency of Optimal Plans](https://doi.org/10.1086/260580)
- Schelling (1960): [The Strategy of Conflict](https://www.hup.harvard.edu/books/9780674840317)

### Marktdaten und Protokollstand

- CoinDesk: [Bitcoin-ETFs im Jahresverlauf bei über 1,5 Mrd. \$ Nettoabfluss](https://www.coindesk.com/markets/2026/11/13/bitcoin-etfs-are-now-down-over-usd1-5-billion-in-net-outflows-for-the-year) (13.11.2026)
- AMINA Bank: [Bitcoin Fork August 2026 – BIP-110, Covenants and the Quantum Clock](https://aminagroup.com/research/bitcoin-fork-august-2026-bip-110-ecash-covenants-and-the-quantum-clock/) (30.07.2026)
- Spark Research: [Should Bitcoin Stop Changing? The Ossification Debate](https://www.spark.money/research/bitcoin-ossification-debate-protocol-evolution) (15.09.2026)
- CoinDesk: [Bitcoin's Quantum Debate Splits as Adam Back Pushes Optional Upgrades](https://www.coindesk.com/tech/2026/04/16/bitcoin-s-quantum-debate-splits-as-adam-back-pushes-optional-upgrades-over-forced-freeze) (16.04.2026)
- extraETF: [„Die Bedrohung von Bitcoin durch Quantencomputer ist real, aber nicht akut“](https://extraetf.com/de/news/etf-news/die-bedrohung-von-bitcoin-durch-quantencomputer-ist-real-aber-nicht-akut)
- Blockhead: [Bitcoin Miners' Q3 – Hashprice Competing With AI Leases](https://www.blockhead.co/2026/11/11/bitcoin-miners-q3-three-majors-earn-most-of-their-revenue-from-ai-while-others-sell-bitcoin-to-fund-the-pivot/) (11.11.2026)
- Crypto Briefing: [Ethereum outlines fork plan to reach Lean Ethereum by 2029](https://cryptobriefing.com/ethereum-fork-plan-lean-ethereum-2029/)
- block-builders.de: Monero ab 10. Juli 2027 – EU verbietet Börsen, nicht deine Wallet
- investing.com: [Fed-Zinserhöhung zu 88,8 % eingepreist](https://www.investing.com/news/economy-news/fed-rate-hike-odds-in-december-at-88-after-hot-cpi-cme-fedwatch-5017585) (11.11.2026)

Dieser Text ist keine Anlageberatung. Er beschreibt, wie ich zu meiner eigenen Position gekommen bin, und die Kriterien, nach denen ich sie überprüfe. Wer daraus etwas mitnimmt, sollte es die Methode sein und nicht die Allokation.
