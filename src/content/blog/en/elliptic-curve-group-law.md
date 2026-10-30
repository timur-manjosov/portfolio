---
title: "The group law on elliptic curves, worked through"
description: "Why adding points on an elliptic curve gives a group, checked on a curve with 19 points, and why the discrete logarithm stays hard anyway."
date: 2026-10-30
category: math-crypto
tags: [elliptic-curves, group-theory, discrete-logarithm, cryptography]
draft: false
translationKey: ecc-group-law
status: draft-review
---

Elliptic-curve cryptography rests on two operations: adding two points, and
"multiplying" a point $P$ by an integer $k$. The security assumption is that
$k$ cannot be recovered efficiently from $P$ and $kP$. That statement hides
two separate questions. Why is point addition a group operation at all,
associative, with an identity and inverses? And why is undoing the
multiplication hard when the formulas involved are high-school algebra?

The formulas take a few lines to derive. After that, everything is checked on
a curve over $\mathbb{F}_{17}$ with exactly 19 points: small enough to do on
paper, and small enough to test every case by machine. The last part is about
what such a small example cannot tell you.

## The curve and the point at infinity

Let $K$ be a field whose characteristic is neither 2 nor 3, and pick
$a, b \in K$ with $4a^3 + 27b^2 \neq 0$. The elliptic curve

$$
E:\; y^2 = x^3 + ax + b
$$

consists of all solutions $(x, y) \in K^2$ plus one extra point
$\mathcal{O}$. The condition on $a$ and $b$ means that $x^3 + ax + b$ has no
repeated root, so the curve has no cusp and no self-intersection, and every
point has a unique tangent line. The curve $y^2 = x^3$ violates it: it has a
cusp at the origin, and the tangent construction below breaks down there.

$\mathcal{O}$ comes from projective geometry. Written homogeneously, the
equation is $Y^2 Z = X^3 + aXZ^2 + bZ^3$. Setting $Z = 0$ forces $X = 0$, which
leaves the single point $[0 : 1 : 0]$. Every vertical line passes through it.

## Chords and tangents

Over the reals, addition has a picture. The line through two points $P$ and
$Q$ on the curve meets it in a third point $R$, and $P + Q$ is defined as the
reflection of $R$ in the $x$-axis.

<figure class="figure">
<svg viewBox="0 0 480 360" role="img" aria-labelledby="ec-chord-title ec-chord-desc" class="figure__svg">
<title id="ec-chord-title">Adding two points on an elliptic curve</title>
<desc id="ec-chord-desc">The real curve y² = x³ − 2x + 2. A line through P = (−1, √3) and Q = (1, 1) meets the curve in a third point R. Its mirror image in the x-axis is P + Q.</desc>
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
<figcaption>A chord through P and Q on the real curve y² = x³ − 2x + 2: the third intersection R, mirrored in the x-axis, is P + Q.</figcaption>
</figure>

The useful fact is that $R$ can be computed without taking any roots. Take
$P = (x_1, y_1)$ and $Q = (x_2, y_2)$ with $x_1 \neq x_2$, and the line
$y = \lambda x + \nu$ through both:

$$
\lambda = \frac{y_2 - y_1}{x_2 - x_1}, \qquad \nu = y_1 - \lambda x_1 .
$$

Substituting it into the curve equation and collecting terms gives a monic
cubic,

$$
x^3 - \lambda^2 x^2 + (a - 2\lambda\nu)\,x + (b - \nu^2) = 0 ,
$$

two of whose roots, $x_1$ and $x_2$, are already known. By Vieta's formulas
the three roots add up to minus the $x^2$ coefficient, so
$x_1 + x_2 + x_3 = \lambda^2$ and

$$
x_3 = \lambda^2 - x_1 - x_2 .
$$

$R = (x_3, \lambda x_3 + \nu)$ lies on the line. Reflecting flips the sign
of the second coordinate, and substituting $\nu$ gives

$$
P + Q = (x_3, y_3), \qquad y_3 = \lambda (x_1 - x_3) - y_1 .
$$

Only field operations appear, so the same formulas work over any field,
including $\mathbb{F}_p$, where there is nothing left to draw.

The remaining cases:

- **Doubling, $P = Q$:** the chord becomes the tangent. Differentiating
  implicitly, $2y\,y' = 3x^2 + a$, so $\lambda = (3x_1^2 + a)/(2y_1)$. The
  point of contact is a double root, which gives $x_3 = \lambda^2 - 2x_1$;
  the formula for $y_3$ is unchanged.
- **$x_1 = x_2$, $y_1 = -y_2$:** the line is vertical and its third
  intersection is $\mathcal{O}$, so $P + Q = \mathcal{O}$. This includes
  doubling a point with $y_1 = 0$, whose tangent is vertical.
- **$\mathcal{O}$ as a summand:** $P + \mathcal{O} = P$.

## Which axioms are easy

Closure, identity, inverses and commutativity are immediate. $\mathcal{O}$ is
the identity. The inverse of $(x, y)$ is $(x, -y)$, because the line through
the two is vertical. The line through $P$ and $Q$ is the line through $Q$ and
$P$, so the operation is commutative. And the formulas produce coordinates
in $K$ that satisfy the curve equation by construction.

Associativity is a different matter. Nothing in the picture suggests that
$(P + Q) + R = P + (Q + R)$, and none of the known proofs is short. Washington
gives a fairly elementary one in Section 2.4 of his book. Silverman derives it
in Chapter III from the Riemann–Roch theorem: the map
$P \mapsto (P) - (\mathcal{O})$ identifies the points with the group of
degree-zero divisor classes, whose operation is associative for free. If you
only know the group law through its formulas, it is worth knowing that this
is where the work is hidden.

What a small curve allows instead is brute force: check every triple. That
proves nothing about other curves, but it is very good at catching mistakes,
as the end of this post shows.

## A curve with 19 points

The curve

$$
E:\; y^2 = x^3 + 2x + 2 \quad \text{over } \mathbb{F}_{17}
$$

is a standard textbook example; Paar and Pelzl use it in Chapter 9. The
non-singularity condition holds, since
$4 \cdot 2^3 + 27 \cdot 2^2 = 140 \equiv 4 \pmod{17}$.

To list its points, test for each $x$ from 0 to 16 whether $x^3 + 2x + 2$
is a square modulo 17. Nine values of $x$ qualify, each with two square
roots $\pm y$, which gives 18 points, plus $\mathcal{O}$:

| *x* | 0 | 3 | 5 | 6 | 7 | 9 | 10 | 13 | 16 |
|---|---|---|---|---|---|---|---|---|---|
| *y* | 6, 11 | 1, 16 | 1, 16 | 3, 14 | 6, 11 | 1, 16 | 6, 11 | 7, 10 | 4, 13 |

Hasse's theorem bounds the count by
$|\#E(\mathbb{F}_p) - (p + 1)| \le 2\sqrt{p}$, which here means somewhere
between about 9.75 and 26.25. Since 19 is prime, Lagrange's theorem does the
rest: every point other than $\mathcal{O}$ has order 19, so the group is
cyclic and any such point generates it.

**Doubling $P = (5, 1)$.** Division now means multiplying by an inverse mod
17. The tangent slope is $\lambda = (3 \cdot 25 + 2) \cdot 2^{-1}$. Here
$77 \equiv 9$ and $2^{-1} \equiv 9$ (because $2 \cdot 9 = 18 \equiv 1$), so
$\lambda \equiv 81 \equiv 13$, and

$$
x_3 = 13^2 - 2 \cdot 5 = 159 \equiv 6,
$$

$$
y_3 = 13 \cdot (5 - 6) - 1 = -14 \equiv 3 .
$$

So $2P = (6, 3)$. To check: $3^2 = 9$, and $6^3 + 12 + 2 = 230 = 13 \cdot 17 + 9$.

**Adding $P$ and $2P$.** The chord slope is $\lambda = (3 - 1)/(6 - 5) = 2$,
so $x_3 = 4 - 5 - 6 \equiv 10$ and $y_3 = 2 \cdot (5 - 10) - 1 \equiv 6$,
that is, $3P = (10, 6)$. Carrying on gives all multiples up to
$19P = \mathcal{O}$, here in pairs:

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

The pairing shows the only visible regularity: $kP$ and $(19 - k)P = -kP$
share their $x$-coordinate. Down the columns, the coordinates follow no
pattern.

## Fast in one direction

Nobody computes $kP$ with $k - 1$ additions. Double-and-add walks through
the bits of $k$ from the top: double at every bit, add $P$ when the bit is
1. For $k = 13 = 1101_2$ the intermediate results are $P$, then $2P$ and
$3P$, then $6P$, then $12P$ and $13P = (16, 4)$. An $\ell$-bit scalar costs
$\ell - 1$ doublings and at most $\ell - 1$ additions, so about 510 group
operations for a 256-bit $k$.

## The other direction

Given $P$ and $Q = kP$, find $k$. For $Q = (13, 7)$ the table says $k = 8$.
With 19 points, looking it up is the whole algorithm. The real question is
how the cost grows with the group order $n$.

**Baby-step giant-step** (Shanks) writes $k = im + j$ with
$m = \lceil \sqrt{n} \rceil$, stores the baby steps $jP$ for $0 \le j < m$,
and walks with giant steps $Q, Q - mP, Q - 2mP, \dots$ until it lands on a
stored point. Here $m = 5$, the stored points are
$\mathcal{O}, (5, 1), (6, 3), (10, 6), (3, 1)$, and $-5P = (9, 1)$. The first
giant step, $(13, 7)$, is not stored; the second,
$(13, 7) + (9, 1) = (10, 6)$, is the baby step $j = 3$. Hence
$k = 1 \cdot 5 + 3 = 8$.

Both time and memory grow like $\sqrt{n}$. Pollard's rho method (1978) needs
about the same number of steps, on average roughly $\sqrt{\pi n / 4}$, with
constant memory.

**Why nothing much better is known.** Shoup proved in 1997 that any generic
algorithm, one that uses only group operations and ignores how elements are
encoded, needs $\Omega(\sqrt{p})$ group operations, where $p$ is the largest
prime factor of the group order. In that model, baby-step giant-step and rho
are optimal. In $\mathbb{F}_p^\times$, index calculus beats the bound by
exploiting the fact that integers factor into small primes. For points on a
general elliptic curve over a prime field, no comparable notion is known, and
neither is an algorithm that does substantially better than $\sqrt{n}$.

For scale: secp256k1, the curve Bitcoin uses, is $y^2 = x^3 + 7$ over the
prime field with $p = 2^{256} - 2^{32} - 977$. Its group order is a prime just
below $2^{256}$ (cofactor 1), so rho needs about
$\sqrt{\pi n / 4} \approx 2^{127.8}$ group operations.

## Where intuition misleads

**Simple formulas, simple inversion.** The addition formulas are easy to
invert: given $P + Q$ and $P$, subtracting gives $Q$. What is hard is
counting how many times $P$ was added, and the formulas say nothing about
that. Its hardness is an assumption, not a theorem. Shoup's bound covers
generic algorithms only, and the toy table is no evidence at all, since
every problem with 19 elements is easy.

**Large group, secure group.** What matters is the largest prime factor of
the group order. If $n$ splits into small primes, the Pohlig–Hellman method
reduces the logarithm to logarithms in the small subgroups, and the cost is
set by the largest factor. That is why curves in use have prime order or a
tiny cofactor.

**Prime order is enough.** It is not. If $\#E(\mathbb{F}_p) = p$ (an
anomalous curve), Smart's 1999 method solves the logarithm in polynomial
time. If the embedding degree, the smallest $B$ with $p^B \equiv 1 \pmod n$,
is small, the MOV attack of Menezes, Okamoto and Vanstone moves the problem
into $\mathbb{F}_{p^B}^\times$, where index calculus applies. SEC 1 therefore
requires, when validating curve parameters, that $p^B \not\equiv 1 \pmod n$
for all $1 \le B < 100$ and that $n \neq p$. The toy curve fails this
independently of its size: $17^9 \equiv 1 \pmod{19}$, so its embedding
degree is 9. secp256k1 passes.

**Correct maths, correct code.** The case distinctions ($P = Q$, $P = -Q$,
$\mathcal{O}$) are a known source of bugs. Double-and-add has a second
problem: whether an addition happens depends on a bit of the secret scalar,
which can show up in timing or power consumption. Implementations therefore
use fixed operation sequences such as the Montgomery ladder, which RFC 7748
specifies for X25519, or complete addition formulas without special cases,
such as those Renes, Costello and Batina give for prime-order curves.

## Checking it by machine

This program contains everything above: addition with all cases,
double-and-add, point counting, an exhaustive test of the group axioms, and
baby-step giant-step.

```python
from math import isqrt

p, a, b = 17, 2, 2
O = None  # point at infinity

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

def mul(k, P):                                    # double-and-add
    R = O
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1":
            R = add(R, P)
    return R

points = [O] + [(x, y) for x in range(p) for y in range(p) if on_curve((x, y))]
assert len(points) == 19

for P in points:                                  # identity, inverse, commutative
    assert add(P, O) == P and add(P, neg(P)) is O
    for Q in points:
        assert add(P, Q) == add(Q, P) and on_curve(add(P, Q))
        for R in points:                          # associative: 19³ = 6859 triples
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

The exhaustive test earns its keep. Drop the factor 2 from the tangent
slope, and all 18 doublings land off the curve while 1152 of the 6859
triples violate associativity. Return the third intersection $R$ instead of
$-R$, and $\mathcal{O}$ stops being the identity for every point on the
curve, with 6498 failing triples. Neither mistake shows up if you only
check a few examples by hand that were produced with the same wrong formula.

## Further reading

- Lawrence C. Washington, [*Elliptic Curves: Number Theory and Cryptography*](https://math.umd.edu/~lcw/ec.html),
  2nd edition, CRC Press 2008. Chapter 2 (the group law; Section 2.4, proof
  of associativity) and Chapter 5 (the discrete logarithm problem:
  baby-step giant-step, rho, MOV, anomalous curves).
- Joseph H. Silverman, *The Arithmetic of Elliptic Curves*, 2nd edition,
  Springer 2009 (Graduate Texts in Mathematics 106). Chapter III, §2 and §3.
- Christof Paar, Jan Pelzl, *Understanding Cryptography*, Springer 2010.
  Chapter 9, with the curve $y^2 = x^3 + 2x + 2$ over $\mathbb{F}_{17}$.
- Victor Shoup, [Lower Bounds for Discrete Logarithms and Related Problems](https://www.shoup.net/papers/dlbounds1.pdf),
  Eurocrypt 1997 (revised version).
- Nigel P. Smart, [The Discrete Logarithm Problem on Elliptic Curves of Trace One](https://doi.org/10.1007/s001459900052),
  Journal of Cryptology 12 (1999), pp. 193–196.
- Alfred Menezes, Tatsuaki Okamoto, Scott Vanstone, [Reducing elliptic curve logarithms to logarithms in a finite field](https://doi.org/10.1109/18.259647),
  IEEE Transactions on Information Theory 39(5), 1993, pp. 1639–1646.
- Standards for Efficient Cryptography Group, [SEC 1: Elliptic Curve Cryptography](https://www.secg.org/sec1-v2.pdf),
  version 2.0, 2009, Section 3.1.1.2.1 (parameter validation), and
  [SEC 2: Recommended Elliptic Curve Domain Parameters](https://www.secg.org/sec2-v2.pdf),
  version 2.0, 2010, Section 2.4.1 (secp256k1).
- Adam Langley, Mike Hamburg, Sean Turner, [RFC 7748: Elliptic Curves for Security](https://www.rfc-editor.org/rfc/rfc7748),
  2016, Section 5 (the Montgomery ladder for X25519 and X448).
- Joost Renes, Craig Costello, Lejla Batina, [Complete addition formulas for prime order elliptic curves](https://eprint.iacr.org/2015/1060),
  Eurocrypt 2016.
- The script behind every number in this post is in the
  [repository of this site](https://github.com/timur-manjosov/portfolio) at
  `tests/articles/ecc_toy_curve.py`; the figure comes from
  `tests/articles/ecc_chord_svg.py --lang en`.
