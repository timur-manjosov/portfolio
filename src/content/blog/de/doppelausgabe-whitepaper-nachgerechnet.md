---
title: "Die Doppelausgabe-Rechnung im Bitcoin-Whitepaper, nachgerechnet"
description: "Abschnitt 11 des Bitcoin-Whitepapers nachgerechnet: Die Tabellen stimmen, das Modell unterschätzt das Risiko. Mit Herleitung, Code und Simulation."
date: 2026-10-30
category: blockchain
tags: [bitcoin, proof-of-work, wahrscheinlichkeit, zufallsprozesse]
draft: false
translationKey: double-spend-race
status: draft-review
---

Wer eine Bitcoin-Zahlung annimmt, wartet, bis die Transaktion in einem Block
steht und weitere Blöcke darauf folgen. Der Grund ist die Doppelausgabe: Ein
Angreifer bezahlt, lässt die Ware liefern und versucht dann, eine alternative
Kette zu veröffentlichen, in der dieselben Coins an ihn selbst zurückgehen.
Gelingt das, verschwindet die Zahlung aus der Kette, die alle Knoten für
gültig halten.

Wie lange man warten sollte, rechnet Abschnitt 11 des Whitepapers von 2008 vor.
Das Ergebnis sind Tabellen, die bis heute zitiert werden. Nachprogrammiert
lassen sie sich exakt reproduzieren. Das Modell dahinter enthält aber eine
Vereinfachung, die das Risiko unterschätzt, und zwar umso stärker, je länger
man wartet.

Dieser Beitrag behandelt ein Wahrscheinlichkeitsmodell. Er sagt nichts darüber,
ob man Bitcoin benutzen oder kaufen sollte.

## Das Modell: ein Wettrennen zweier Ketten

Der Angreifer kontrolliert den Anteil $q$ der gesamten Rechenleistung, die
ehrlichen Miner den Anteil $p = 1 - q$. Blöcke entstehen durch unabhängige
Hash-Versuche, die Zeit bis zum nächsten Block ist daher gedächtnislos, und
die Blöcke jeder Seite bilden einen Poisson-Prozess. Daraus folgt eine
einfache Beschreibung: Jeder neu gefundene Block, egal auf welcher Seite,
stammt mit Wahrscheinlichkeit $q$ vom Angreifer und mit Wahrscheinlichkeit
$p$ von den ehrlichen Minern, unabhängig von allen früheren.

Der Rückstand des Angreifers macht also eine Irrfahrt: Er wächst mit
Wahrscheinlichkeit $p$ um eins und schrumpft mit Wahrscheinlichkeit $q$ um
eins. Das Whitepaper nennt das eine binomiale Irrfahrt und zerlegt den Angriff
in zwei Phasen:

1. Der Händler wartet, bis seine Transaktion in einem Block steht und $z$
   Blöcke darauf gefolgt sind. Währenddessen arbeitet der Angreifer heimlich
   an seiner Kette und schafft dabei eine zufällige Zahl $k$ von Blöcken.
2. Danach muss der Angreifer den verbleibenden Rückstand $z - k$ aufholen.

## Phase 2: Aufholen aus z Blöcken Rückstand

Sei $a_z$ die Wahrscheinlichkeit, einen Rückstand von $z$ Blöcken jemals
aufzuholen. Um $z$ Blöcke aufzuholen, muss man zuerst einen aufholen, dann
den nächsten, und so weiter. Weil die Irrfahrt kein Gedächtnis hat, sind das
unabhängige Teilstrecken mit derselben Erfolgswahrscheinlichkeit, also
$a_z = a_1^z$.

Für $a_1$ betrachtet man den ersten Block. Mit Wahrscheinlichkeit $q$ ist er
vom Angreifer, und der Rückstand ist weg. Mit Wahrscheinlichkeit $p$ ist er
ehrlich, und der Rückstand beträgt jetzt zwei:

$$
a_1 = q + p\,a_1^2 .
$$

Diese quadratische Gleichung hat die Lösungen $1$ und $q/p$. Ist $p > q$,
driftet der Rückstand nach dem Gesetz der großen Zahlen gegen unendlich, die
Aufholwahrscheinlichkeit kann also nicht 1 sein. Es bleibt $a_1 = q/p$ und

$$
a_z = \left(\frac{q}{p}\right)^{z} \qquad (p > q),
$$

und $a_z = 1$ für $p \le q$. Das ist das klassische Ruinproblem des Spielers,
die Formel steht genau so im Whitepaper. Für $q \ge 1/2$ gewinnt der Angreifer also mit Sicherheit, egal
wie lange der Händler wartet. Das ist der „51-Prozent-Angriff“.

## Phase 1: Was der Angreifer in der Wartezeit schafft

Während die ehrlichen Miner $z$ Blöcke finden, findet der Angreifer
durchschnittlich $z \cdot q/p$ Blöcke. Das Whitepaper nimmt an, dass die
ehrlichen Blöcke genau in der erwarteten Zeit kommen. Dann ist die Zahl $k$
der Angreiferblöcke Poisson-verteilt mit Erwartungswert

$$
\lambda = z\,\frac{q}{p} .
$$

Für jedes mögliche $k$ multipliziert man die Poisson-Wahrscheinlichkeit mit
der Wahrscheinlichkeit, den Rest aufzuholen. Hat der Angreifer schon mehr als
$z$ Blöcke, ist er vorn, und diese Wahrscheinlichkeit ist 1. Das Minimum fasst
beide Fälle zusammen:

$$
P_{\text{SN}}(z) = \sum_{k=0}^{\infty} \frac{\lambda^k e^{-\lambda}}{k!}
\min\left\{1, \left(\frac{q}{p}\right)^{z-k}\right\}.
$$

Weil die Wahrscheinlichkeiten aller $k$ zusammen 1 ergeben, lässt sich das
ohne unendliche Summe schreiben:

$$
P_{\text{SN}}(z) = 1 - \sum_{k=0}^{z} \frac{\lambda^k e^{-\lambda}}{k!}\left(1 - \left(\frac{q}{p}\right)^{z-k}\right).
$$

Diese zweite Form übersetzt das Whitepaper in eine kurze C-Funktion.

## Nachgerechnet

Dieselbe Rechnung in Python, Zeile für Zeile wie die C-Funktion:

```python
from math import exp

def nakamoto(q: float, z: int) -> float:
    p = 1.0 - q
    lam = z * (q / p)
    total = 1.0
    for k in range(z + 1):
        poisson = exp(-lam)
        for i in range(1, k + 1):
            poisson *= lam / i
        total -= poisson * (1 - (q / p) ** (z - k))
    return total

print(f"{nakamoto(0.1, 6):.7f}")   # 0.0002428
```

Auf sieben Nachkommastellen gerundet stimmen alle 22 Werte der beiden
Tabellen im Whitepaper ($q = 0{,}1$ für $z = 0$ bis $10$ und $q = 0{,}3$ für
$z = 0, 5, \dots, 50$) mit dieser Funktion überein. Auch die dritte Tabelle,
die für jedes $q$ das kleinste $z$ mit $P < 0{,}1\,\%$ angibt, ergibt sich
genau so: 5, 8, 11, 15, 24, 41, 89 und 340 Bestätigungen für $q = 0{,}10$ bis
$0{,}45$.[^1]

An der Arithmetik ist also nichts auszusetzen. Das Problem liegt eine Ebene
tiefer.

## Wo die Intuition täuscht: Die Wartezeit ist selbst zufällig

Die Annahme, dass die $z$ ehrlichen Blöcke genau in der erwarteten Zeit
kommen, klingt harmlos, weil sie im Mittel stimmt. Sie stimmt aber nur im
Mittel. Brauchen die ehrlichen Miner zufällig länger, hat der Angreifer mehr
Zeit. Gehen sie schneller, hat er weniger. Diese Schwankung gleicht sich im
Ergebnis nicht aus: Jeder zusätzliche Angreiferblock multipliziert die
Aufholwahrscheinlichkeit $(q/p)^{z-k}$ mit $p/q$, also bei $q = 0{,}1$ mit 9.
Eine lange Wartezeit hilft dem Angreifer deshalb mehr, als eine kurze ihm
schadet. Die Ausnahme ist der Bereich, in dem er ohnehin vorn liegt: Mehr als
Gewissheit gibt es nicht, und dort kehrt sich der Effekt um.

Ohne die Annahme ist die Rechnung sogar einfacher. Man zählt in der
Blockfolge, in der jeder Block unabhängig mit Wahrscheinlichkeit $q$ dem
Angreifer gehört, wie viele Angreiferblöcke vor dem $z$-ten ehrlichen Block
liegen. Das ist die negative Binomialverteilung:

$$
\Pr(k) = \binom{k + z - 1}{k} p^z q^k .
$$

Man erhält sie auch, wenn man im Poisson-Modell die Wartezeit nicht festhält,
sondern als Gamma-verteilte Zufallsgröße einsetzt. Mit dieser Verteilung und
derselben Aufholformel ergibt sich für $q < p$

$$
P(z) = 1 - \sum_{k=0}^{z} \binom{k + z - 1}{k} \left(p^z q^k - p^k q^z\right).
$$

Diese Formel hat Meni Rosenfeld 2014 veröffentlicht. Cyril Grunspan und
Ricardo Pérez-Marco haben 2017 gezeigt, dass sie eine geschlossene Form hat,
die regularisierte unvollständige Betafunktion:

$$
P(z) = I_{4pq}\left(z, 1/2\right).
$$

Beide Ausdrücke und die direkte Summe über die negative Binomialverteilung
stimmen für alle 20 nachgerechneten Kombinationen von $q$ und $z$ überein,
die Summen exakt, die Betafunktion bis auf den Fehler der numerischen
Integration.

### Der Unterschied in Zahlen

| *q* | *z* | Whitepaper | exakt | Faktor |
|---|---|---|---|---|
| 0,1 | 1 | 0,2045873 | 0,2000000 | 0,98 |
| 0,1 | 2 | 0,0509779 | 0,0560000 | 1,10 |
| 0,1 | 6 | 0,0002428 | 0,0005914 | 2,44 |
| 0,1 | 10 | 0,0000012 | 0,0000079 | 6,33 |
| 0,3 | 5 | 0,1773523 | 0,1976173 | 1,11 |
| 0,3 | 10 | 0,0416605 | 0,0651067 | 1,56 |
| 0,3 | 24 | 0,0008106 | 0,0040007 | 4,94 |

Nur bei einer einzigen Bestätigung liegt das Whitepaper über dem exakten
Wert, das ist der eben beschriebene Bereich.
Ab zwei Bestätigungen unterschätzt es das Risiko, und der Faktor wächst mit
$z$. Bei $q = 0{,}3$ und den 24 Bestätigungen, die das Whitepaper für weniger
als 0,1 % empfiehlt, liegt das tatsächliche Risiko bei 0,4 %.

<figure class="figure">
<svg viewBox="0 0 480 320" role="img" aria-labelledby="ds-title ds-desc" class="figure__svg">
<title id="ds-title">Erfolgswahrscheinlichkeit einer Doppelausgabe über der Zahl der Bestätigungen</title>
<desc id="ds-desc">Logarithmische Darstellung für z von 0 bis 30. Für einen Angreifer mit 10 % und mit 30 % der Rechenleistung liegt der Wert des Whitepapers (gestrichelt) unter dem exakten Wert (durchgezogen), und der Abstand wächst mit z.</desc>
<line x1="56" y1="12.0" x2="464" y2="12.0" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
<text x="48" y="16.0" fill="currentColor" font-size="12" text-anchor="end">1</text>
<line x1="56" y1="78.0" x2="464" y2="78.0" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
<text x="48" y="82.0" fill="currentColor" font-size="12" text-anchor="end">10<tspan dy="-6" font-size="10">-3</tspan></text>
<line x1="56" y1="144.0" x2="464" y2="144.0" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
<text x="48" y="148.0" fill="currentColor" font-size="12" text-anchor="end">10<tspan dy="-6" font-size="10">-6</tspan></text>
<line x1="56" y1="210.0" x2="464" y2="210.0" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
<text x="48" y="214.0" fill="currentColor" font-size="12" text-anchor="end">10<tspan dy="-6" font-size="10">-9</tspan></text>
<line x1="56" y1="276.0" x2="464" y2="276.0" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
<text x="48" y="280.0" fill="currentColor" font-size="12" text-anchor="end">10<tspan dy="-6" font-size="10">-12</tspan></text>
<text x="56.0" y="294" fill="currentColor" font-size="12" text-anchor="middle">0</text>
<text x="124.0" y="294" fill="currentColor" font-size="12" text-anchor="middle">5</text>
<text x="192.0" y="294" fill="currentColor" font-size="12" text-anchor="middle">10</text>
<text x="260.0" y="294" fill="currentColor" font-size="12" text-anchor="middle">15</text>
<text x="328.0" y="294" fill="currentColor" font-size="12" text-anchor="middle">20</text>
<text x="396.0" y="294" fill="currentColor" font-size="12" text-anchor="middle">25</text>
<text x="464.0" y="294" fill="currentColor" font-size="12" text-anchor="middle">30</text>
<line x1="56" y1="276" x2="464" y2="276" stroke="currentColor" stroke-opacity="0.5" stroke-width="1"/>
<text x="260.0" y="314" fill="currentColor" font-size="12" text-anchor="middle">Bestätigungen z</text>
<path d="M56.0 12.0 L69.6 27.4 L83.2 39.5 L96.8 50.9 L110.4 61.8 L124.0 72.5 L137.6 83.0 L151.2 93.4 L164.8 103.8 L178.4 114.1 L192.0 124.3 L205.6 134.5 L219.2 144.6 L232.8 154.8 L246.4 164.9 L260.0 174.9 L273.6 185.0 L287.2 195.0 L300.8 205.1 L314.4 215.1 L328.0 225.1 L341.6 235.0 L355.2 245.0 L368.8 255.0 L382.4 264.9 L396.0 274.9" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M56.0 12.0 L69.6 27.2 L83.2 40.4 L96.8 53.4 L110.4 66.2 L124.0 78.9 L137.6 91.5 L151.2 104.2 L164.8 116.8 L178.4 129.4 L192.0 141.9 L205.6 154.5 L219.2 167.1 L232.8 179.6 L246.4 192.2 L260.0 204.7 L273.6 217.3 L287.2 229.8 L300.8 242.3 L314.4 254.9 L328.0 267.4" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<path d="M56.0 12.0 L69.6 16.9 L83.2 20.0 L96.8 22.7 L110.4 25.2 L124.0 27.5 L137.6 29.7 L151.2 31.9 L164.8 34.0 L178.4 36.1 L192.0 38.1 L205.6 40.1 L219.2 42.1 L232.8 44.0 L246.4 46.0 L260.0 47.9 L273.6 49.8 L287.2 51.7 L300.8 53.6 L314.4 55.5 L328.0 57.4 L341.6 59.2 L355.2 61.1 L368.8 62.9 L382.4 64.8 L396.0 66.6 L409.6 68.4 L423.2 70.2 L436.8 72.0 L450.4 73.9 L464.0 75.7" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M56.0 12.0 L69.6 16.4 L83.2 19.7 L96.8 22.8 L110.4 25.7 L124.0 28.5 L137.6 31.3 L151.2 34.1 L164.8 36.9 L178.4 39.6 L192.0 42.4 L205.6 45.1 L219.2 47.8 L232.8 50.5 L246.4 53.2 L260.0 55.9 L273.6 58.6 L287.2 61.3 L300.8 64.0 L314.4 66.6 L328.0 69.3 L341.6 72.0 L355.2 74.7 L368.8 77.3 L382.4 80.0 L396.0 82.7 L409.6 85.3 L423.2 88.0 L436.8 90.7 L450.4 93.3 L464.0 96.0" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="184.4" y="106.1" fill="currentColor" font-size="13">q = 0,1</text>
<text x="388.4" y="56.8" fill="currentColor" font-size="13">q = 0,3</text>
</svg>
<figcaption>Gestrichelt: Whitepaper (Poisson). Durchgezogen: negativ-binomiales Modell (Rosenfeld; Grunspan und Pérez-Marco). Senkrechte Achse logarithmisch.</figcaption>
</figure>

Der Grund für den wachsenden Faktor ist die Abklingrate. Grunspan und
Pérez-Marco geben die Asymptotik beider Formeln an: Der exakte Wert fällt wie
$(4pq)^z$ (bis auf einen Faktor der Größenordnung $1/\sqrt{z}$), der
Whitepaper-Wert wie $e^{-z\,c}$ mit $c = \lambda - 1 - \ln \lambda$ und
$\lambda = q/p$. Für $q = 0{,}1$ heißt das: Jede weitere Bestätigung
multipliziert das exakte Risiko ungefähr mit 0,36, das Whitepaper-Risiko mit
0,27.

Die Tabelle der nötigen Bestätigungen für $P < 0{,}1\,\%$ verschiebt sich
entsprechend:

| *q* | Whitepaper | exakt |
|---|---|---|
| 0,10 | 5 | 6 |
| 0,15 | 8 | 9 |
| 0,20 | 11 | 13 |
| 0,25 | 15 | 20 |
| 0,30 | 24 | 32 |
| 0,35 | 41 | 58 |
| 0,40 | 89 | 133 |
| 0,45 | 340 | 539 |

Die bekannte Faustregel von sechs Bestätigungen ist keine Protokollregel. Das
Bitcoin-Wiki führt sie auf zwei willkürliche Annahmen zurück: höchstens 10 %
Rechenleistung beim Angreifer und weniger als 0,1 % Restrisiko. Nach der
Formel des Whitepapers würden dafür fünf Bestätigungen reichen, nach der
exakten Rechnung sind es genau sechs.

### Gegenprobe durch Simulation

Zwei Formeln, die sich widersprechen, kann man durch ein Experiment
entscheiden. Die Simulation spielt das Rennen direkt nach: Blöcke ziehen,
bis die ehrliche Kette $z$ Blöcke hat, dann die Irrfahrt laufen lassen, bis
der Angreifer aufgeholt hat oder 80 Blöcke zurückliegt. Bei 80 Blöcken
Rückstand ist die Aufholwahrscheinlichkeit für $q \le 0{,}3$ kleiner als
$10^{-29}$, der Abbruch verfälscht also nichts Messbares.

```python
import random

def simulate(q: float, z: int, trials: int, rng: random.Random) -> float:
    wins = 0
    for _ in range(trials):
        honest = attacker = 0
        while honest < z:                          # Phase 1
            if rng.random() < q:
                attacker += 1
            else:
                honest += 1
        deficit = z - attacker
        while 0 < deficit < 80:                    # Phase 2
            deficit += -1 if rng.random() < q else 1
        wins += deficit <= 0
    return wins / trials

rng = random.Random(20261029)
print(simulate(0.3, 5, 200_000, rng))     # 0.1979
print(simulate(0.1, 6, 1_000_000, rng))   # 0.000606
```

Für $q = 0{,}3$, $z = 5$ ergeben 200 000 Rennen 0,1979. Das exakte Modell
sagt 0,1976, das Whitepaper 0,1774. Für $q = 0{,}1$, $z = 6$ ergibt eine
Million Rennen 0,000606, gegenüber 0,000591 exakt und 0,000243 im Whitepaper.
Die Abweichung vom exakten Wert liegt in beiden Fällen innerhalb der
statistischen Schwankung, die vom Whitepaper-Wert weit außerhalb.

## Was das Modell nicht abbildet

Auch die korrigierte Formel ist ein Modell mit Annahmen, die man kennen
sollte, bevor man aus ihr eine Wartezeit ableitet.

- **Kein Vorsprung beim Start.** Beide Rechnungen nehmen an, dass der
  Angreifer erst in dem Moment zu minen beginnt, in dem er bezahlt. Das
  Whitepaper begründet das damit, dass der Empfänger sein Schlüsselpaar erst
  kurz vor der Zahlung erzeugt. Kann der Angreifer den Zeitpunkt frei wählen
  und vorab einen Block Vorsprung sammeln, steigt seine Chance.
- **Konstante Anteile.** $q$ ist als fest angenommen. In der Realität lässt
  sich Rechenleistung mieten, und niemand kann $q$ direkt beobachten. Die
  Rechnung liefert für ein angenommenes $q$ eine Wahrscheinlichkeit, nicht
  für den tatsächlichen Angreifer.
- **Keine Netzwerklaufzeiten.** Blöcke verbreiten sich nicht sofort. Verwaiste
  Blöcke der ehrlichen Seite verschenken Rechenleistung, die im Modell als
  voll wirksam zählt.
- **Ehrliche Miner bleiben ehrlich.** Eyal und Sirer haben 2013 gezeigt, dass
  ein Miner mit genügend Rechenleistung mehr verdienen kann, wenn er Blöcke
  zurückhält (Selfish Mining). Wer so vorgeht, verhält sich weder wie die
  ehrliche Seite noch wie der Angreifer in diesem Modell.
- **Ein Versuch, keine Kosten.** Die Formel gibt die Erfolgswahrscheinlichkeit
  eines einzelnen Versuchs an. Ob sich ein Angriff lohnt, hängt zusätzlich
  vom Betrag, von den Kosten der Rechenleistung und von der Zahl der Versuche
  ab. Rosenfeld behandelt diese Fragen im selben Aufsatz.

Für die eigentliche Frage des Abschnitts heißt das: Die Tabellen des
Whitepapers sind korrekt gerechnet, aber zu optimistisch. Wer aus ihnen eine
Zahl von Bestätigungen ableitet, sollte die exakte Formel verwenden, sie ist
nicht komplizierter.

## Weiterführende Quellen

- Satoshi Nakamoto: [Bitcoin: A Peer-to-Peer Electronic Cash System](https://bitcoin.org/bitcoin.pdf),
  2008. Abschnitt 11 „Calculations“, S. 6–8.
- Meni Rosenfeld: [Analysis of Hashrate-Based Double Spending](https://arxiv.org/abs/1402.2009),
  2014. Gleichung (1) und Tabelle 1.
- Cyril Grunspan, Ricardo Pérez-Marco: [Double spend races](https://arxiv.org/abs/1702.02867),
  International Journal of Theoretical and Applied Finance 21(8), 2018.
  Satz 1 (geschlossene Form), Satz 2 (Asymptotik), Tabelle 1.
- Ittay Eyal, Emin Gün Sirer: [Majority is not Enough: Bitcoin Mining is Vulnerable](https://arxiv.org/abs/1311.0243),
  2013.
- William Feller: *An Introduction to Probability Theory and Its
  Applications*, Band 1, 3. Auflage, Wiley 1968. Kapitel XIV (Irrfahrten und
  Ruinprobleme).
- Bitcoin-Wiki: [Confirmation](https://en.bitcoin.it/wiki/Confirmation), zur
  Herkunft der sechs Bestätigungen.
- Alle Zahlen dieses Beitrags erzeugt `tests/articles/double_spend.py` im
  [Repository dieser Seite](https://github.com/timur-manjosov/portfolio), die
  Grafik `tests/articles/double_spend_svg.py`.

[^1]: In Tabelle 1 bei Grunspan und Pérez-Marco steht in der Zeile mit
    Nakamotos Werten für $q = 0{,}40$ die Zahl 81. Die Formel des Whitepapers
    ergibt 89, wie dort gedruckt: Bei $z = 81$ liegt sie noch bei 0,18 %.
