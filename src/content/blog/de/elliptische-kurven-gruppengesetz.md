---
title: "Das Gruppengesetz auf elliptischen Kurven, nachgerechnet"
description: "Warum Punktaddition auf elliptischen Kurven eine Gruppe ergibt, durchgerechnet an einer Kurve mit 19 Punkten, und warum der Logarithmus trotzdem schwer bleibt."
date: 2026-10-30
category: math-crypto
tags: [elliptische-kurven, gruppentheorie, diskreter-logarithmus, kryptografie]
draft: false
translationKey: ecc-group-law
status: draft-review
---

ECDH, ECDSA und Ed25519 benutzen eine Operation, die „Addition von Punkten“
heißt, und eine zweite, die eine Zahl $k$ mit einem Punkt $P$ „multipliziert“.
Ihre Sicherheit hängt an einer Annahme: Aus $P$ und $kP$ lässt sich $k$ nicht
effizient berechnen. Dahinter stecken zwei Fragen, die oft vermischt werden.
Warum ist diese Addition überhaupt eine Gruppenoperation, also assoziativ, mit
neutralem Element und Inversen? Und warum bleibt die Umkehrung schwer, obwohl
die Formeln aus Schulalgebra bestehen?

Die Formeln lassen sich in wenigen Zeilen herleiten. Danach wird alles auf
einer Kurve über $\mathbb{F}_{17}$ mit genau 19 Punkten nachgerechnet, klein
genug für Papier und für eine vollständige Prüfung am Rechner. Am Ende steht, was
dieses Beispiel nicht zeigen kann.

## Kurven in Weierstraß-Form

Sei $K$ ein Körper mit einer Charakteristik ungleich 2 und 3, und seien
$a, b \in K$ mit

$$
4a^3 + 27b^2 \neq 0 .
$$

Die elliptische Kurve $E$ ist die Menge der Lösungen $(x, y) \in K^2$ von

$$
y^2 = x^3 + ax + b ,
$$

zusammen mit einem zusätzlichen Punkt $\mathcal{O}$, dem Punkt im Unendlichen.
Die Bedingung an $a$ und $b$ sagt, dass das Polynom $x^3 + ax + b$ keine
mehrfache Nullstelle hat. Dann hat die Kurve weder Spitze noch
Selbstüberschneidung, und in jedem Punkt gibt es eine eindeutige Tangente.
Genau das braucht die Konstruktion im nächsten Abschnitt. Für $a = b = 0$ ist
die Bedingung verletzt: $y^2 = x^3$ hat im Ursprung eine Spitze, und dort
versagt die Tangentenkonstruktion.

Der Punkt $\mathcal{O}$ wirkt zunächst wie ein Kunstgriff. In der projektiven
Ebene schreibt man die Gleichung homogen als $Y^2 Z = X^3 + aXZ^2 + bZ^3$.
Für $Z = 0$ bleibt $X^3 = 0$, also genau ein Punkt $[0 : 1 : 0]$. Durch ihn
laufen alle senkrechten Geraden. Das ist $\mathcal{O}$.

## Sekante und Tangente

Über den reellen Zahlen lässt sich die Addition zeichnen. Eine Gerade durch
zwei Punkte $P$ und $Q$ der Kurve schneidet sie in einem dritten Punkt $R$.
Man definiert $P + Q$ als das Spiegelbild von $R$ an der $x$-Achse.

<figure class="figure">
<svg viewBox="0 0 480 360" role="img" aria-labelledby="ec-chord-title ec-chord-desc" class="figure__svg">
<title id="ec-chord-title">Addition zweier Punkte auf einer elliptischen Kurve</title>
<desc id="ec-chord-desc">Die reelle Kurve y² = x³ − 2x + 2. Eine Gerade durch P = (−1, √3) und Q = (1, 1) schneidet die Kurve in einem dritten Punkt R. Dessen Spiegelbild an der x-Achse ist P + Q.</desc>
<line x1="0" y1="180.0" x2="480" y2="180.0" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<line x1="229.6" y1="0" x2="229.6" y2="360" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<path d="M480.0 366.8 L474.6 360.1 L469.2 353.5 L463.8 347.1 L458.5 340.8 L453.2 334.7 L448.0 328.7 L442.8 322.8 L437.6 317.0 L432.4 311.4 L427.3 306.0 L422.2 300.7 L417.2 295.5 L412.2 290.5 L407.2 285.7 L402.3 281.0 L397.3 276.5 L392.5 272.1 L387.6 268.0 L382.8 264.0 L378.0 260.2 L373.3 256.7 L368.6 253.3 L363.9 250.2 L359.3 247.4 L354.7 244.8 L350.1 242.4 L345.6 240.3 L341.1 238.5 L336.6 237.0 L332.1 235.8 L327.7 234.9 L323.4 234.2 L319.0 233.8 L314.7 233.7 L310.5 233.8 L306.2 234.2 L302.1 234.7 L297.9 235.4 L293.8 236.3 L289.7 237.3 L285.6 238.5 L281.6 239.7 L277.6 241.0 L273.6 242.4 L269.7 243.8 L265.8 245.3 L261.9 246.8 L258.1 248.3 L254.3 249.8 L250.6 251.3 L246.9 252.8 L243.2 254.2 L239.5 255.7 L235.9 257.1 L232.3 258.5 L228.8 259.9 L225.2 261.2 L221.8 262.5 L218.3 263.7 L214.9 264.9 L211.5 266.1 L208.2 267.2 L204.8 268.2 L201.6 269.2 L198.3 270.2 L195.1 271.1 L191.9 272.0 L188.8 272.8 L185.7 273.6 L182.6 274.3 L179.6 274.9 L176.5 275.5 L173.6 276.1 L170.6 276.6 L167.7 277.1 L164.9 277.5 L162.0 277.8 L159.2 278.1 L156.4 278.4 L153.7 278.6 L151.0 278.7 L148.3 278.8 L145.7 278.9 L143.1 278.9 L140.5 278.8 L138.0 278.7 L135.5 278.6 L133.0 278.4 L130.6 278.1 L128.2 277.9 L125.9 277.5 L123.5 277.2 L121.2 276.7 L119.0 276.3 L116.7 275.8 L114.6 275.2 L112.4 274.6 L110.3 274.0 L108.2 273.3 L106.1 272.6 L104.1 271.9 L102.1 271.1 L100.2 270.2 L98.2 269.4 L96.4 268.5 L94.5 267.5 L92.7 266.5 L90.9 265.5 L89.1 264.5 L87.4 263.4 L85.7 262.3 L84.1 261.1 L82.5 259.9 L80.9 258.7 L79.4 257.5 L77.8 256.2 L76.4 254.9 L74.9 253.5 L73.5 252.2 L72.1 250.8 L70.8 249.4 L69.5 247.9 L68.2 246.4 L67.0 244.9 L65.8 243.4 L64.6 241.9 L63.5 240.3 L62.3 238.7 L61.3 237.1 L60.2 235.5 L59.2 233.8 L58.3 232.1 L57.3 230.4 L56.4 228.7 L55.6 227.0 L54.7 225.3 L53.9 223.5 L53.2 221.7 L52.4 219.9 L51.7 218.1 L51.1 216.3 L50.4 214.5 L49.9 212.6 L49.3 210.8 L48.8 208.9 L48.3 207.0 L47.8 205.1 L47.4 203.2 L47.0 201.3 L46.6 199.4 L46.3 197.5 L46.0 195.6 L45.8 193.6 L45.6 191.7 L45.4 189.7 L45.2 187.8 L45.1 185.9 L45.0 183.9 L45.0 182.0 L44.9 180.0 L44.9 180.0 L45.0 178.0 L45.0 176.1 L45.1 174.1 L45.2 172.2 L45.4 170.3 L45.6 168.3 L45.8 166.4 L46.0 164.4 L46.3 162.5 L46.6 160.6 L47.0 158.7 L47.4 156.8 L47.8 154.9 L48.3 153.0 L48.8 151.1 L49.3 149.2 L49.9 147.4 L50.4 145.5 L51.1 143.7 L51.7 141.9 L52.4 140.1 L53.2 138.3 L53.9 136.5 L54.7 134.7 L55.6 133.0 L56.4 131.3 L57.3 129.6 L58.3 127.9 L59.2 126.2 L60.2 124.5 L61.3 122.9 L62.3 121.3 L63.5 119.7 L64.6 118.1 L65.8 116.6 L67.0 115.1 L68.2 113.6 L69.5 112.1 L70.8 110.6 L72.1 109.2 L73.5 107.8 L74.9 106.5 L76.4 105.1 L77.8 103.8 L79.4 102.5 L80.9 101.3 L82.5 100.1 L84.1 98.9 L85.7 97.7 L87.4 96.6 L89.1 95.5 L90.9 94.5 L92.7 93.5 L94.5 92.5 L96.4 91.5 L98.2 90.6 L100.2 89.8 L102.1 88.9 L104.1 88.1 L106.1 87.4 L108.2 86.7 L110.3 86.0 L112.4 85.4 L114.6 84.8 L116.7 84.2 L119.0 83.7 L121.2 83.3 L123.5 82.8 L125.9 82.5 L128.2 82.1 L130.6 81.9 L133.0 81.6 L135.5 81.4 L138.0 81.3 L140.5 81.2 L143.1 81.1 L145.7 81.1 L148.3 81.2 L151.0 81.3 L153.7 81.4 L156.4 81.6 L159.2 81.9 L162.0 82.2 L164.9 82.5 L167.7 82.9 L170.6 83.4 L173.6 83.9 L176.5 84.5 L179.6 85.1 L182.6 85.7 L185.7 86.4 L188.8 87.2 L191.9 88.0 L195.1 88.9 L198.3 89.8 L201.6 90.8 L204.8 91.8 L208.2 92.8 L211.5 93.9 L214.9 95.1 L218.3 96.3 L221.8 97.5 L225.2 98.8 L228.8 100.1 L232.3 101.5 L235.9 102.9 L239.5 104.3 L243.2 105.8 L246.9 107.2 L250.6 108.7 L254.3 110.2 L258.1 111.7 L261.9 113.2 L265.8 114.7 L269.7 116.2 L273.6 117.6 L277.6 119.0 L281.6 120.3 L285.6 121.5 L289.7 122.7 L293.8 123.7 L297.9 124.6 L302.1 125.3 L306.2 125.8 L310.5 126.2 L314.7 126.3 L319.0 126.2 L323.4 125.8 L327.7 125.1 L332.1 124.2 L336.6 123.0 L341.1 121.5 L345.6 119.7 L350.1 117.6 L354.7 115.2 L359.3 112.6 L363.9 109.8 L368.6 106.7 L373.3 103.3 L378.0 99.8 L382.8 96.0 L387.6 92.0 L392.5 87.9 L397.3 83.5 L402.3 79.0 L407.2 74.3 L412.2 69.5 L417.2 64.5 L422.2 59.3 L427.3 54.0 L432.4 48.6 L437.6 43.0 L442.8 37.2 L448.0 31.3 L453.2 25.3 L458.5 19.2 L463.8 12.9 L469.2 6.5 L474.6 -0.1 L480.0 -6.8" fill="none" stroke="currentColor" stroke-width="2"/>
<line x1="0.0" y1="57.9" x2="480.0" y2="152.6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<line x1="243.5" y1="105.9" x2="243.5" y2="254.1" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<circle cx="125.2" cy="82.6" r="5" fill="currentColor"/>
<circle cx="333.9" cy="123.8" r="5" fill="currentColor"/>
<circle cx="243.5" cy="105.9" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="243.5" cy="254.1" r="5" fill="currentColor"/>
<text x="111.2" y="70.6" fill="currentColor" font-size="16">P</text>
<text x="337.9" y="111.8" fill="currentColor" font-size="16">Q</text>
<text x="253.5" y="123.9" fill="currentColor" font-size="16">R</text>
<text x="253.5" y="248.1" fill="currentColor" font-size="16">P + Q</text>
</svg>
<figcaption>Sekante durch P und Q auf der reellen Kurve y² = x³ − 2x + 2: Der dritte Schnittpunkt R, an der x-Achse gespiegelt, ist P + Q.</figcaption>
</figure>

Dass es diesen dritten Punkt gibt und dass er sich ohne Wurzelziehen
berechnen lässt, ist der Kern der Sache. Sei $P = (x_1, y_1)$,
$Q = (x_2, y_2)$ mit $x_1 \neq x_2$, und sei $y = \lambda x + \nu$ die Gerade
durch beide, also

$$
\lambda = \frac{y_2 - y_1}{x_2 - x_1}, \qquad \nu = y_1 - \lambda x_1 .
$$

Einsetzen in die Kurvengleichung ergibt $(\lambda x + \nu)^2 = x^3 + ax + b$,
umgestellt

$$
x^3 - \lambda^2 x^2 + (a - 2\lambda\nu)\,x + (b - \nu^2) = 0 .
$$

Das ist ein normiertes Polynom dritten Grades. Zwei seiner Nullstellen kennen
wir schon, $x_1$ und $x_2$. Nach dem Satz von Vieta ist die Summe aller drei
Nullstellen gleich dem negativen Koeffizienten von $x^2$, also
$x_1 + x_2 + x_3 = \lambda^2$. Damit liegt die dritte Nullstelle fest, und
sie ist ein rationaler Ausdruck in den Koordinaten von $P$ und $Q$:

$$
x_3 = \lambda^2 - x_1 - x_2 .
$$

Der dritte Schnittpunkt ist $R = (x_3, \lambda x_3 + \nu)$. Spiegeln ändert
das Vorzeichen der $y$-Koordinate. Mit $\nu = y_1 - \lambda x_1$ wird daraus

$$
P + Q = (x_3, y_3), \qquad y_3 = \lambda (x_1 - x_3) - y_1 .
$$

Weil nur addiert, multipliziert und dividiert wird, funktioniert dieselbe
Rechnung über jedem Körper, insbesondere über $\mathbb{F}_p$, wo es keine
Zeichnung mehr gibt.

Es bleiben drei Sonderfälle:

- **$P = Q$:** Die Sekante wird zur Tangente. Implizites Ableiten von
  $y^2 = x^3 + ax + b$ ergibt $2y\,y' = 3x^2 + a$, also
  $\lambda = (3x_1^2 + a) / (2y_1)$. Der Berührpunkt zählt als doppelte
  Nullstelle, deshalb gilt $x_3 = \lambda^2 - 2x_1$. Die Formel für $y_3$
  bleibt gleich.
- **$x_1 = x_2$ und $y_1 = -y_2$:** Die Gerade ist senkrecht und trifft die
  Kurve im Endlichen kein drittes Mal. Ihr dritter Schnittpunkt ist
  $\mathcal{O}$, und $P + Q = \mathcal{O}$. Das schließt die Verdopplung eines
  Punktes mit $y_1 = 0$ ein, dessen Tangente senkrecht steht.
- **Ein Summand ist $\mathcal{O}$:** $P + \mathcal{O} = P$.

## Die Gruppenaxiome

Drei der vier Axiome liest man direkt ab. $\mathcal{O}$ ist neutral. Das
Inverse von $(x, y)$ ist $(x, -y)$, denn die Gerade durch beide ist senkrecht.
Die Addition ist kommutativ, weil die Gerade durch $P$ und $Q$ dieselbe ist
wie die durch $Q$ und $P$. Abgeschlossen ist sie auch: Die Formeln liefern
Koordinaten in $K$, und der Punkt liegt nach Konstruktion auf der Kurve.

Die Assoziativität $(P + Q) + R = P + (Q + R)$ sieht man der Zeichnung nicht
an. Es gibt mehrere Beweise, keiner davon ist kurz. Washington führt in
Abschnitt 2.4 seines Lehrbuchs einen vergleichsweise elementaren Beweis.
Silverman leitet sie in Kapitel III aus dem Satz von Riemann-Roch ab: Die
Abbildung $P \mapsto (P) - (\mathcal{O})$ identifiziert die Punktgruppe mit
der Divisorenklassengruppe vom Grad null, und deren Verknüpfung ist von sich
aus assoziativ. Wer das Gruppengesetz nur über die Formeln kennt, sollte
wissen, dass gerade die Assoziativität der Teil mit Arbeit ist.

Auf einer kleinen Kurve lässt sich etwas anderes tun: alle Tripel prüfen. Das
beweist nichts für andere Kurven, findet aber Rechenfehler zuverlässig. Dazu
unten mehr.

## Ein Beispiel über $\mathbb{F}_{17}$

Die Kurve

$$
E:\; y^2 = x^3 + 2x + 2 \quad \text{über } \mathbb{F}_{17}
$$

ist ein gängiges Lehrbuchbeispiel, unter anderem in Kapitel 9 von Paar und
Pelzl. Die Diskriminantenbedingung ist erfüllt:
$4 \cdot 2^3 + 27 \cdot 2^2 = 140 \equiv 4 \pmod{17}$.

Um die Punkte zu zählen, prüft man für jedes $x \in \{0, \dots, 16\}$, ob
$x^3 + 2x + 2$ ein Quadrat modulo 17 ist. Das trifft für neun Werte von $x$
zu, jeweils mit zwei Lösungen $\pm y$. Zusammen mit $\mathcal{O}$ sind es
19 Punkte:

| *x* | 0 | 3 | 5 | 6 | 7 | 9 | 10 | 13 | 16 |
|---|---|---|---|---|---|---|---|---|---|
| *y* | 6, 11 | 1, 16 | 1, 16 | 3, 14 | 6, 11 | 1, 16 | 6, 11 | 7, 10 | 4, 13 |

Der Satz von Hasse sagt $|\#E(\mathbb{F}_p) - (p + 1)| \le 2\sqrt{p}$. Hier
liegt die Punktzahl also zwischen $18 - 8{,}25$ und $18 + 8{,}25$, und 19
passt. Weil 19 eine Primzahl ist, folgt aus dem Satz von Lagrange noch mehr:
Jeder Punkt außer $\mathcal{O}$ hat Ordnung 19, die Gruppe ist zyklisch, und
jeder Punkt erzeugt sie.

### Verdoppeln von P = (5, 1)

Division heißt jetzt Multiplikation mit dem Inversen modulo 17. Für die
Tangentensteigung gilt

$$
\lambda = \frac{3 \cdot 5^2 + 2}{2 \cdot 1} = 77 \cdot 2^{-1} .
$$

Es ist $77 \equiv 9$, und $2^{-1} \equiv 9$, weil $2 \cdot 9 = 18 \equiv 1$.
Also $\lambda \equiv 81 \equiv 13$. Dann

$$
x_3 = 13^2 - 2 \cdot 5 = 159 \equiv 6,
$$

$$
y_3 = 13 \cdot (5 - 6) - 1 = -14 \equiv 3 .
$$

Ergebnis: $2P = (6, 3)$. Probe: $3^2 = 9$ und
$6^3 + 2 \cdot 6 + 2 = 230 = 13 \cdot 17 + 9$.

### Addieren von P und 2P

Jetzt mit der Sekantensteigung:

$$
\lambda = \frac{3 - 1}{6 - 5} = 2,
$$

$$
x_3 = 4 - 5 - 6 = -7 \equiv 10,
$$

$$
y_3 = 2 \cdot (5 - 10) - 1 = -11 \equiv 6 .
$$

Also $3P = (10, 6)$. So weiter gerechnet ergibt sich die ganze Gruppe bis
$19P = \mathcal{O}$, hier paarweise:

| *k* | *kP* | 19 − *k* | (19 − *k*)*P* |
|---|---|---|---|
| 1 | (5, 1) | 18 | (5, 16) |
| 2 | (6, 3) | 17 | (6, 14) |
| 3 | (10, 6) | 16 | (10, 11) |
| 4 | (3, 1) | 15 | (3, 16) |
| 5 | (9, 16) | 14 | (9, 1) |
| 6 | (16, 13) | 13 | (16, 4) |
| 7 | (0, 6) | 12 | (0, 11) |
| 8 | (13, 7) | 11 | (13, 10) |
| 9 | (7, 6) | 10 | (7, 11) |

Die Paare zeigen die einzige sichtbare Struktur: $kP$ und $(19 - k)P$ haben
dieselbe $x$-Koordinate, weil $(19 - k)P = -kP$. Innerhalb der Spalten
springen die Koordinaten ohne erkennbares Muster.

## Skalarmultiplikation geht schnell

$kP$ berechnet man nicht durch $k - 1$ Additionen, sondern mit
Verdoppeln-und-Addieren über die Binärdarstellung von $k$. Für
$k = 13 = 1101_2$, von links gelesen:

| Bit | Schritt | Zwischenstand |
|---|---|---|
| 1 | addieren | $P$ |
| 1 | verdoppeln, addieren | $2P$, dann $3P$ |
| 0 | verdoppeln | $6P$ |
| 1 | verdoppeln, addieren | $12P$, dann $13P = (16, 4)$ |

Für eine Zahl mit $\ell$ Bits sind das $\ell - 1$ Verdopplungen und höchstens
$\ell - 1$ Additionen. Ein 256-Bit-Skalar kostet also höchstens rund 510
Gruppenoperationen.

## Der diskrete Logarithmus

Die umgekehrte Aufgabe: Gegeben $P$ und $Q = kP$, finde $k$. Für
$Q = (13, 7)$ liefert die Tabelle $k = 8$. Bei 19 Punkten ist Nachschlagen
kein Problem. Die Frage ist, wie der Aufwand mit der Gruppengröße $n$ wächst.

### Baby-Step-Giant-Step

Das einfachste Verfahren, das besser ist als Durchprobieren, stammt von
Shanks. Man schreibt $k = im + j$ mit $m = \lceil \sqrt{n} \rceil$ und
$0 \le i, j < m$. Dann ist $Q - i(mP) = jP$. Man speichert die „kleinen
Schritte“ $jP$ und geht mit „großen Schritten“ $Q, Q - mP, Q - 2mP, \dots$
so lange, bis man einen gespeicherten Punkt trifft.

Hier ist $m = \lceil \sqrt{19} \rceil = 5$. Die kleinen Schritte sind
$\mathcal{O}, (5, 1), (6, 3), (10, 6), (3, 1)$ für $j = 0, \dots, 4$. Es ist
$5P = (9, 16)$, also $-5P = (9, 1)$. Der erste große Schritt $Q = (13, 7)$
steht nicht in der Liste. Der zweite ist $Q - 5P = (13, 7) + (9, 1) = (10, 6)$,
das ist der kleine Schritt mit $j = 3$. Also $k = 1 \cdot 5 + 3 = 8$.

Zeit und Speicher wachsen wie $\sqrt{n}$. Pollards Rho-Methode von 1978
braucht ebenfalls etwa $\sqrt{n}$ Schritte, im Mittel rund
$\sqrt{\pi n / 4}$, kommt aber mit konstantem Speicher aus.

### Warum es nicht besser geht

Für Verfahren, die nur Gruppenoperationen benutzen und die Darstellung der
Punkte nicht ausnutzen, hat Shoup 1997 eine untere Schranke bewiesen: Ein
solcher „generischer“ Algorithmus braucht $\Omega(\sqrt{p})$
Gruppenoperationen, wobei $p$ der größte Primteiler der Gruppenordnung ist.
Baby-Step-Giant-Step und Rho sind in diesem Modell also optimal.

Im Zahlenbereich $\mathbb{F}_p^\times$ gibt es nicht-generische Verfahren, die
deutlich schneller sind (Index-Calculus), weil sich Zahlen in kleine Primzahlen
zerlegen lassen. Für Punkte auf allgemeinen elliptischen Kurven über
Primkörpern ist keine entsprechende Zerlegung bekannt, und kein Verfahren, das
wesentlich unter $\sqrt{n}$ bleibt.

Für eine echte Kurve heißt das: secp256k1, die Kurve von Bitcoin, ist
$y^2 = x^3 + 7$ über dem Primkörper mit $p = 2^{256} - 2^{32} - 977$. Ihre
Gruppenordnung $n$ ist eine Primzahl knapp unter $2^{256}$ (Kofaktor 1). Rho
braucht damit etwa $\sqrt{\pi n / 4} \approx 2^{127{,}8}$ Gruppenoperationen.

## Wo die Intuition täuscht

**„Einfache Formeln lassen sich auch einfach umkehren.“** Die Formeln für
$P + Q$ sind leicht umzukehren: Aus $P + Q$ und $P$ bekommt man $Q$ durch eine
Subtraktion. Schwer ist etwas anderes, nämlich herauszufinden, wie oft $P$
addiert wurde. Diese Frage beantworten die Formeln nicht. Dass sie schwer ist,
ist allerdings eine Annahme und kein Satz. Shoups Schranke gilt nur für
generische Algorithmen, und die Tabelle oben belegt gar nichts: Bei 19
Elementen ist jedes Problem leicht.

**„Eine große Gruppe ist eine sichere Gruppe.“** Entscheidend ist der größte
Primteiler der Gruppenordnung. Zerfällt $n$ in kleine Primfaktoren, zerlegt
das Verfahren von Pohlig und Hellman den Logarithmus in Logarithmen in den
kleinen Untergruppen, und der Aufwand richtet sich nach dem größten Faktor.
Deshalb haben die üblichen Kurven Primordnung oder einen sehr kleinen
Kofaktor.

**„Jede Kurve mit Primordnung ist gut.“** Auch das stimmt nicht. Ist
$\#E(\mathbb{F}_p) = p$ (anomale Kurve), löst Smarts Verfahren von 1999 den
Logarithmus in Polynomialzeit. Ist der Einbettungsgrad klein, also die
kleinste Zahl $B$ mit $p^B \equiv 1 \pmod n$, überträgt der MOV-Angriff von
Menezes, Okamoto und Vanstone das Problem in die Gruppe
$\mathbb{F}_{p^B}^\times$, wo Index-Calculus greift. SEC 1 schreibt deshalb bei
der Prüfung von Kurvenparametern vor, dass $p^B \not\equiv 1 \pmod n$ für alle
$1 \le B < 100$ gilt und $n \neq p$ ist. Die Spielzeugkurve fällt durch, nicht
nur wegen ihrer Größe: $17^9 \equiv 1 \pmod{19}$, ihr Einbettungsgrad ist 9.
secp256k1 besteht die Prüfung.

**„Wenn die Mathematik stimmt, stimmt das Programm.“** Die Fallunterscheidung
($P = Q$, $P = -Q$, ein Summand $\mathcal{O}$) ist eine bekannte
Fehlerquelle. Verdoppeln-und-Addieren hat einen zweiten Haken: Ob addiert
wird, hängt vom Bit des geheimen Skalars ab, und das lässt sich an Laufzeit
oder Stromverbrauch messen. Implementierungen benutzen deshalb Verfahren mit
fester Schrittfolge wie die Montgomery-Leiter, die etwa X25519 in RFC 7748
vorschreibt, oder vollständige Additionsformeln ohne Sonderfälle, wie sie
Renes, Costello und Batina für Kurven mit Primordnung angegeben haben.

## Nachrechnen

Das folgende Programm enthält alles, was oben steht: Addition mit allen
Sonderfällen, Verdoppeln-und-Addieren, Punktzählung, die vollständige
Prüfung der Gruppenaxiome und Baby-Step-Giant-Step.

```python
from math import isqrt

p, a, b = 17, 2, 2
O = None  # Punkt im Unendlichen

def on_curve(P):
    return P is O or (P[1] ** 2 - (P[0] ** 3 + a * P[0] + b)) % p == 0

def neg(P):
    return O if P is O else (P[0], -P[1] % p)

def add(P, Q):
    if P is O: return Q
    if Q is O: return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % p == 0:
        return O                                  # P + (-P)
    if P == Q:
        lam = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (lam * lam - x1 - x2) % p
    return (x3, (lam * (x1 - x3) - y1) % p)

def mul(k, P):                                    # verdoppeln und addieren
    R = O
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1":
            R = add(R, P)
    return R

points = [O] + [(x, y) for x in range(p) for y in range(p) if on_curve((x, y))]
assert len(points) == 19

for P in points:                                  # neutral, invers, kommutativ
    assert add(P, O) == P and add(P, neg(P)) is O
    for Q in points:
        assert add(P, Q) == add(Q, P) and on_curve(add(P, Q))
        for R in points:                          # assoziativ: 19³ = 6859 Tripel
            assert add(add(P, Q), R) == add(P, add(Q, R))

G, Q = (5, 1), (13, 7)
assert mul(2, G) == (6, 3) and mul(3, G) == (10, 6) and mul(19, G) is O

m = isqrt(len(points) - 1) + 1                    # ⌈√19⌉ = 5
baby = {mul(j, G): j for j in range(m)}
giant, step = Q, neg(mul(m, G))
for i in range(m):
    if giant in baby:
        print("log =", i * m + baby[giant])       # log = 8
        break
    giant = add(giant, step)
```

Die vollständige Prüfung ist mehr als eine Formalität. Vergisst man in der
Tangentensteigung den Faktor 2, landen alle 18 Verdopplungen neben der Kurve,
und 1152 der 6859 Tripel verletzen die Assoziativität. Gibt man versehentlich
den dritten Schnittpunkt $R$ statt $-R$ zurück, ist $\mathcal{O}$ für keinen
Punkt der Kurve mehr neutral, und 6498 Tripel scheitern. Beide Fehler fallen
nicht auf, wenn man nur ein paar Beispiele von Hand nachrechnet, die man
mit derselben falschen Formel erzeugt hat.

## Weiterführende Quellen

- Lawrence C. Washington: [*Elliptic Curves: Number Theory and Cryptography*](https://math.umd.edu/~lcw/ec.html),
  2. Auflage, CRC Press 2008. Kapitel 2 (Gruppengesetz, Abschnitt 2.4
  Beweis der Assoziativität), Kapitel 5 (diskreter Logarithmus, darunter
  Baby-Step-Giant-Step, Rho, MOV und anomale Kurven).
- Joseph H. Silverman: *The Arithmetic of Elliptic Curves*, 2. Auflage,
  Springer 2009 (Graduate Texts in Mathematics 106). Kapitel III, §2 und §3:
  Gruppengesetz und Beweis über Riemann-Roch.
- Christof Paar, Jan Pelzl: *Understanding Cryptography*, Springer 2010.
  Kapitel 9, mit der Kurve $y^2 = x^3 + 2x + 2$ über $\mathbb{F}_{17}$.
- Victor Shoup: [Lower Bounds for Discrete Logarithms and Related Problems](https://www.shoup.net/papers/dlbounds1.pdf),
  Eurocrypt 1997 (überarbeitete Fassung).
- Nigel P. Smart: [The Discrete Logarithm Problem on Elliptic Curves of Trace One](https://doi.org/10.1007/s001459900052),
  Journal of Cryptology 12 (1999), S. 193–196.
- Alfred Menezes, Tatsuaki Okamoto, Scott Vanstone: [Reducing elliptic curve logarithms to logarithms in a finite field](https://doi.org/10.1109/18.259647),
  IEEE Transactions on Information Theory 39(5), 1993, S. 1639–1646.
- Standards for Efficient Cryptography Group: [SEC 1: Elliptic Curve Cryptography](https://www.secg.org/sec1-v2.pdf),
  Version 2.0, 2009, Abschnitt 3.1.1.2.1 (Prüfung der Kurvenparameter), und
  [SEC 2: Recommended Elliptic Curve Domain Parameters](https://www.secg.org/sec2-v2.pdf),
  Version 2.0, 2010, Abschnitt 2.4.1 (secp256k1).
- Adam Langley, Mike Hamburg, Sean Turner: [RFC 7748: Elliptic Curves for Security](https://www.rfc-editor.org/rfc/rfc7748),
  2016, Abschnitt 5 (Montgomery-Leiter für X25519 und X448).
- Joost Renes, Craig Costello, Lejla Batina: [Complete addition formulas for prime order elliptic curves](https://eprint.iacr.org/2015/1060),
  Eurocrypt 2016.
- Das Skript mit allen Zahlen dieses Beitrags liegt im
  [Repository dieser Seite](https://github.com/timur-manjosov/portfolio) unter
  `tests/articles/ecc_toy_curve.py`, die Grafik erzeugt
  `tests/articles/ecc_chord_svg.py`.
