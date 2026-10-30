---
title: "Subset Sum: NP-vollständig und trotzdem oft leicht"
description: "Subset Sum ist NP-vollständig, und doch löst eine Tabelle Instanzen mit tausend Zahlen sofort. Warum das kein Widerspruch ist, an Experimenten gezeigt."
date: 2026-11-13
category: theory
tags: [komplexitaetstheorie, np-vollstaendigkeit, dynamische-programmierung, algorithmen]
draft: false
status: draft-review
---

Gegeben sind ganze Zahlen $a_1, \dots, a_n$ und ein Ziel $T$. Gibt es eine
Auswahl der Zahlen, deren Summe genau $T$ ist? Das ist Subset Sum, eines der
21 Probleme, deren NP-Vollständigkeit Richard Karp 1972 gezeigt hat. Ein
Algorithmus, der jede Instanz in polynomieller Zeit löst, würde $P = NP$
beweisen.

Gleichzeitig steht in jedem Lehrbuch zu Algorithmen ein Verfahren, das
Subset Sum mit einer Tabelle löst. Es beantwortet die Frage für tausend
zufällige Zahlen in Sekunden. Beides stimmt, und der scheinbare Widerspruch
zeigt sehr genau, was NP-Vollständigkeit aussagt und was nicht. Die Zahlen in
diesem Beitrag stammen aus einem Python-Skript mit festen Zufallssamen. Es
liegt im Repository dieser Seite (Quellen am Ende).

## Das Problem und seine Verwandten

Partition ist der Spezialfall, in dem $T$ die halbe Gesamtsumme ist: Lassen
sich die Zahlen in zwei Gruppen mit gleicher Summe aufteilen? Auch Partition
steht auf Karps Liste, ebenso Knapsack, dessen Entscheidungsversion in Karps
Formulierung genau Subset Sum ist.

NP-vollständig heißt zweierlei. Eine Lösung lässt sich schnell prüfen: Wer
eine Teilmenge vorlegt, deren Summe $T$ ist, überzeugt jeden mit $n$
Additionen. Und jedes andere Problem in NP lässt sich in polynomieller Zeit
auf Subset Sum zurückführen. Ein schnelles Verfahren für Subset Sum wäre also
ein schnelles Verfahren für alles in NP. Niemand kennt eines, und die meisten
erwarten, dass es keines gibt.

Durchprobieren ist einfach und hoffnungslos: $n$ Zahlen haben $2^n$
Teilmengen. Bei 60 Zahlen sind das mehr als $10^{18}$.

## Eine Tabelle löst es trotzdem

Das Verfahren aus den Lehrbüchern geht auf Bellmans dynamische Programmierung
zurück. Man hält fest, welche Summen mit den ersten $i$ Zahlen erreichbar
sind. Eine Summe $s$ ist mit den ersten $i$ Zahlen erreichbar, wenn sie schon
mit den ersten $i - 1$ Zahlen erreichbar war, oder wenn $s - a_i$ es war:

$$
R_i(s) = R_{i-1}(s) \lor R_{i-1}(s - a_i).
$$

Am Anfang, ohne eine Zahl, ist nur die Summe 0 erreichbar: $R_0(s)$ ist
genau für $s = 0$ wahr.

Für $a = (3, 34, 4, 12, 5, 2)$ und $T = 9$ wächst die Menge der erreichbaren
Summen bis 9 so:

| nach | erreichbare Summen $\le 9$ |
|---|---|
| — | 0 |
| 3 | 0, 3 |
| 34 | 0, 3 |
| 4 | 0, 3, 4, 7 |
| 12 | 0, 3, 4, 7 |
| 5 | 0, 3, 4, 5, 7, 8, 9 |
| 2 | 0, 2, 3, 4, 5, 6, 7, 8, 9 |

Nach der Zahl 5 ist 9 erreichbar, die Antwort lautet ja. Die Lösungen sind
$4 + 5$ und $3 + 4 + 2$. Die 34 und die 12 spielen für Summen bis 9 keine
Rolle.

Die Tabelle hat $n \cdot (T + 1)$ Einträge, jeder kostet konstante Zeit, also
läuft das Verfahren in $O(nT)$. In Python lässt es sich noch kompakter
schreiben. Eine große Ganzzahl dient als Bitfeld, Bit $s$ steht für „Summe $s$
erreichbar“, und das Hinzunehmen einer Zahl ist eine Verschiebung mit
anschließendem Oder:

```python
def subset_sums(items: list[int]) -> int:
    reach = 1                      # nur die leere Summe 0
    for a in items:
        reach |= reach << a        # alte Summen, und alte Summen + a
    return reach

r = subset_sums([3, 34, 4, 12, 5, 2])
print((r >> 9) & 1)                # 1: die 9 ist erreichbar
```

Die sechs Zahlen haben 64 Teilmengen, aber nur 48 verschiedene Summen
zwischen 0 und 60. Viele Teilmengen treffen dieselbe Summe, und genau das
nutzt die Tabelle aus: Sie zählt Summen, nicht Teilmengen.

## Warum O(nT) nicht polynomiell ist

Polynomiell heißt in der Komplexitätstheorie: polynomiell in der Länge der
Eingabe, gemessen in Bits. Eine Zahl mit dem Wert $T$ braucht nur etwa
$\log_2 T$ Bits. Eine Instanz aus $n$ Zahlen mit je $b$ Bits ist also etwa
$n \cdot b$ Bits lang, das Ziel kann aber bis zu $n \cdot 2^b$ groß sein.
Gemessen an der Eingabelänge wächst $O(nT)$ exponentiell in $b$.

Hundert Zahlen mit je 64 Bit sind eine Eingabe von etwa 6400 Bits, kleiner
als dieser Absatz. Die Tabelle dafür hätte bis zu $100 \cdot 100 \cdot 2^{64}$
Einträge.

Ein solches Verfahren heißt pseudopolynomiell: polynomiell im Zahlenwert,
nicht in der Länge seiner Darstellung. Schriebe man die Zahlen unär, also
die Zahl $k$ als $k$ Striche, wäre $O(nT)$ polynomiell in der dann viel
längeren Eingabe. Garey und Johnson unterscheiden deshalb schwach und stark
NP-vollständige Probleme. Stark NP-vollständige bleiben schwer, selbst wenn
alle Zahlen in der Eingabe polynomiell klein sind (es sei denn,
$P = NP$). Subset Sum und Partition sind nur schwach NP-vollständig: Ihre
Härte steckt vollständig in großen Zahlen.

## Experiment 1: kleine Zahlen

1000 zufällige Zahlen mit 16 Bit, also Werte unter 65 536, haben zusammen die
Summe 33 585 543. Das Bitfeld aus dem Code oben enthält danach 33 582 956
erreichbare Summen. Nur 2588 Werte zwischen 0 und der Gesamtsumme sind nicht
erreichbar, und sie liegen alle an den Rändern. Die kleinste der Zahlen ist
15, also fehlen sicher 1 bis 14, und die größte nicht erreichbare Summe in
der unteren Hälfte ist 2268. Am oberen Ende sieht es spiegelbildlich aus, denn wenn $s$ erreichbar ist, dann über
die übrigen Zahlen auch die Gesamtsumme minus $s$.

Für fast jedes Ziel ist die Antwort also ja, und die Tabelle liefert sie in
einem einzigen Durchlauf. Das Bitfeld hat rund 33 Millionen Bits, gut 4 MB.
Die Instanz ist im Sinne der Komplexitätstheorie riesig ($2^{1000}$
Teilmengen) und praktisch trivial.

## Experiment 2: große Zahlen

Dieselbe Frage mit 40 zufälligen Zahlen von je 40 Bit, das Ziel die Summe von
20 zufällig gewählten davon. Das Ziel hat 44 Bit, eine Tabelle bräuchte rund
$40 \cdot 2^{44} \approx 7 \cdot 10^{14}$ Einträge. Das ist nicht mehr
machbar.

Hier hilft eine andere Idee, die auf Horowitz und Sahni (1974) zurückgeht:
Man teilt die Zahlen in zwei Hälften zu je 20, zählt für jede Hälfte alle
$2^{20}$ Teilsummen auf, sortiert eine der beiden Listen und sucht für jede
Summe $s$ der anderen Hälfte, ob $T - s$ darin vorkommt.

```python
from bisect import bisect_left

def meet_in_the_middle(items: list[int], target: int) -> bool:
    def sums(part):
        out = [0]
        for a in part:
            out += [s + a for s in out]
        return out

    half = len(items) // 2
    right = sorted(sums(items[half:]))
    for s in sums(items[:half]):
        j = bisect_left(right, target - s)
        if j < len(right) and right[j] == target - s:
            return True
    return False
```

Statt $2^{40} \approx 1{,}1 \cdot 10^{12}$ Teilmengen sind das rund zwei
Millionen Teilsummen. Das Verfahren findet die Lösung des Experiments in
wenigen Sekunden. Es bleibt aber exponentiell, nur mit halbem Exponenten,
$O(2^{n/2})$ Zeit und Speicher. Bei 80 Zahlen dieser Art müsste jede Hälfte
schon $2^{40}$ Summen aufzählen.

## Der Übergang zwischen leicht und schwer

Zwischen den beiden Experimenten liegt ein scharfer Übergang, den man am
besten an Partition sieht. Für $n = 20$ Zahlen mit je $b$ Bit, jeweils 200
Zufallsinstanzen mit gerader Gesamtsumme, zählt das Skript, wie viele eine
perfekte Aufteilung haben und wie viele es typischerweise gibt:

| Bits *b* | lösbar (von 200) | perfekte Aufteilungen (Median) |
|---|---|---|
| 4 | 200 | 10 067 |
| 8 | 200 | 630 |
| 12 | 200 | 39 |
| 14 | 200 | 10 |
| 16 | 184 | 2 |
| 18 | 98 | 1 |
| 20 | 36 | 1 |
| 22 | 10 | 1 |
| 24 | 3 | 1 |
| 28 | 0 | – |

Der Median ist über die lösbaren Instanzen genommen. Bei 28 Bit gab es
keine.

Bei kleinen Zahlen gibt es exponentiell viele perfekte Aufteilungen, und jedes
vernünftige Suchverfahren stolpert schnell über eine. Bei großen Zahlen gibt
es typischerweise keine, und um das zu beweisen, muss ein Verfahren im
Wesentlichen alle Möglichkeiten ausschließen. Dazwischen kippt das Verhalten
innerhalb weniger Bits.

Stephan Mertens hat diesen Übergang mit Methoden der statistischen Physik
berechnet. Die kritische Zahl von Bits pro Zahl ist für $n$ Zahlen

$$
B_c = n - \frac{\log_2 n}{2} - \frac{1}{2}\log_2 \frac{\pi}{6} .
$$

Für $n = 20$ ergibt das $B_c \approx 18{,}3$. Im Experiment ist bei 18 Bit
fast genau die Hälfte der Instanzen lösbar (98 von 200). Grob gesagt: Subset
Sum und Partition sind schwer, wenn die Zahlen ungefähr so viele Bits haben,
wie es Zahlen gibt. Haben sie deutlich weniger, gibt es zu viele Lösungen;
haben sie deutlich mehr, ist die Antwort fast immer nein. Brian Hayes'
Kolumne über diesen Übergang trägt den Titel „The Easiest Hard Problem“, und
Mertens hat ihn für seinen Übersichtsartikel übernommen.

## Wo die Intuition täuscht

**„NP-vollständig heißt: in der Praxis schwer.“** NP-Vollständigkeit ist eine
Aussage über den schlechtesten Fall. Sie sagt, dass es unter allen Instanzen
schwere gibt (falls $P \neq NP$), nicht, dass eine konkrete oder eine
zufällige Instanz schwer ist. Bei Subset Sum ist die große Mehrheit der
Instanzen, denen man im Alltag begegnet, leicht.

**„$O(nT)$ ist doch ein Polynom.“** In $n$ und $T$ schon, aber nicht in der
Eingabelänge. Wer die Laufzeit in der Größe der Zahlen statt in der Zahl ihrer
Bits misst, hat stillschweigend auf eine unäre Kodierung gewechselt.

**„Ein Verschlüsselungsverfahren auf Basis eines NP-vollständigen Problems
ist sicher.“** Das Knapsack-Verfahren von Merkle und Hellman (1978) beruhte
auf Subset Sum. Shamir hat 1982 gezeigt, dass sich die Grundversion in
Polynomialzeit brechen lässt. Lagarias und Odlyzko haben 1985 allgemein
gezeigt, dass Subset-Sum-Instanzen mit geringer Dichte
$d = n / \log_2 \max a_i$ mit Gitterbasisreduktion lösbar sind: unter der
Annahme eines Orakels für kürzeste Gittervektoren fast alle mit
$d < 0{,}6463$, mit einer späteren Verbesserung von Coster und anderen fast
alle mit $d < 0{,}9408$. Für die Sicherheit zählt nicht, wie schwer das
Problem im schlechtesten Fall ist, sondern wie schwer die Instanzen sind,
die das Verfahren tatsächlich erzeugt. Die 40-Bit-Instanz aus Experiment 2
hat übrigens Dichte 1,0 und liegt damit über beiden Schranken.

**„Schnellere Algorithmen widerlegen die NP-Vollständigkeit.“** Bringmann hat
2017 einen randomisierten Algorithmus angegeben, der bis auf logarithmische
Faktoren in Zeit $O(n + T)$ läuft, also fast linear in $T$ statt $O(nT)$. Das ist ein großer Fortschritt
für die Praxis, ändert aber nichts an der Theorie. Die Laufzeit hängt weiter
linear vom Zahlenwert ab, also exponentiell von seiner Bitlänge.

## Was daraus folgt

Wer vor einem Problem steht, das als NP-vollständig gilt, sollte zuerst
fragen, welche Instanzen tatsächlich vorkommen. Sind die Zahlen klein, löst
die Tabelle das Problem. Ist $n$ klein, löst es Meet in the Middle. Liegen
die Instanzen weit vom kritischen Bereich entfernt, finden einfache
Heuristiken schnell eine Lösung oder die Antwort ist fast sicher nein. Schwer
wird es erst, wo diese Auswege zusammen versagen: viele Zahlen, die etwa so
viele Bits haben, wie es Zahlen gibt.

## Weiterführende Quellen

- Richard M. Karp: Reducibility Among Combinatorial Problems. In R. E. Miller,
  J. W. Thatcher (Hrsg.): *Complexity of Computer Computations*, Plenum Press
  1972, S. 85–103. Die Liste der 21 Probleme mit Knapsack und Partition.
- Michael R. Garey, David S. Johnson: *Computers and Intractability: A Guide
  to the Theory of NP-Completeness*, W. H. Freeman 1979. Abschnitt 4.2
  (Zahlprobleme, starke NP-Vollständigkeit, pseudopolynomielle Algorithmen).
- Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein:
  *Introduction to Algorithms*, 3. Auflage, MIT Press 2009. Abschnitt 34.5.5
  (NP-Vollständigkeit von Subset Sum) und 35.5 (Approximation).
- Ellis Horowitz, Sartaj Sahni: [Computing Partitions with Applications to the Knapsack Problem](https://doi.org/10.1145/321812.321823),
  Journal of the ACM 21(2), 1974, S. 277–292.
- Stephan Mertens: [Phase Transition in the Number Partitioning Problem](https://arxiv.org/abs/cond-mat/9807077),
  Physical Review Letters 81, 1998, und [The Easiest Hard Problem: Number Partitioning](https://arxiv.org/abs/cond-mat/0310317),
  2003, Gleichung (12) (dort nach $N_c$ aufgelöst, für feste Bitzahl $B$).
- Brian Hayes: The Easiest Hard Problem. American Scientist 90(2), 2002,
  S. 113–117.
- J. C. Lagarias, A. M. Odlyzko: [Solving Low-Density Subset Sum Problems](https://doi.org/10.1145/2455.2461),
  Journal of the ACM 32(1), 1985. Matthijs J. Coster, Antoine Joux, Brian A.
  LaMacchia, Andrew M. Odlyzko, Claus-Peter Schnorr, Jacques Stern:
  [Improved low-density subset sum algorithms](https://doi.org/10.1007/BF01201999),
  Computational Complexity 2(2), 1992, S. 111–128.
- Karl Bringmann: [A Near-Linear Pseudopolynomial Time Algorithm for Subset Sum](https://arxiv.org/abs/1610.04712),
  SODA 2017.
- Alle Zahlen dieses Beitrags erzeugt `tests/articles/subset_sum.py` im
  [Repository dieser Seite](https://github.com/timur-manjosov/portfolio).
