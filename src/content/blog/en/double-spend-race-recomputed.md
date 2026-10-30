---
title: "The double-spend calculation in the Bitcoin white paper, recomputed"
description: "Section 11 of the Bitcoin white paper recomputed: the tables are right, the model understates the risk. Derivation, code and a simulation."
date: 2026-10-30
category: blockchain
tags: [bitcoin, proof-of-work, probability, stochastic-processes]
draft: false
translationKey: double-spend-race
status: draft-review
---

A merchant who accepts a Bitcoin payment waits until the transaction is in a
block and a few more blocks have been built on top of it. The reason is the
double spend. An attacker pays, receives the goods, and then tries to publish
an alternative chain in which the same coins go back to himself. If that
chain wins, the payment disappears from the history every node accepts.

Section 11 of the 2008 white paper works out how long to wait. Its result,
a handful of tables, is still quoted today. Reimplemented, those tables come
out exactly as printed. The model behind them, however, contains a
simplification that understates the risk, and the longer the merchant waits,
the larger the error.

This is about a probability model. It says nothing about whether anyone
should use or buy Bitcoin.

## A race between two chains

The attacker controls a fraction $q$ of the total hash rate, the honest
miners the rest, $p = 1 - q$. Blocks result from independent hash attempts,
so waiting times are memoryless and each side produces blocks as a Poisson
process. That has a convenient consequence: every newly found block, on
either side, belongs to the attacker with probability $q$ and to the honest
miners with probability $p$, independently of everything before.

The attacker's deficit therefore performs a random walk, one step up with
probability $p$ and one step down with probability $q$. The white paper
splits the attack in two phases. First the merchant waits until the
transaction is in a block followed by $z$ more; meanwhile the attacker mines
in secret and gets some random number $k$ of blocks. Then the attacker has to
close the remaining gap of $z - k$.

## Catching up from z blocks behind

Let $a_z$ be the probability of ever closing a gap of $z$ blocks. Closing
$z$ blocks means closing one, then the next, and so on; because the walk has
no memory, these are independent stages with the same success probability,
and $a_z = a_1^z$. Conditioning on the next block gives

$$
a_1 = q + p\,a_1^2 ,
$$

whose roots are $1$ and $q/p$. When $p > q$, the law of large numbers sends
the deficit to infinity, so $a_1 < 1$, which leaves $a_1 = q/p$:

$$
a_z = \left(\frac{q}{p}\right)^{z} \qquad (p > q),
$$

and $a_z = 1$ for $p \le q$. This is the gambler's ruin, and it appears in
exactly this form in the white paper. With half the hash rate or more, the attacker succeeds with
certainty, however long the merchant waits.

## What the attacker manages while the merchant waits

While the honest network finds $z$ blocks, the attacker finds $z\,q/p$ blocks
on average. The white paper assumes that the honest blocks take exactly the
expected time. Then the attacker's progress $k$ is Poisson with mean
$\lambda = z\,q/p$. Weighting each $k$ with the chance of catching up from
there, which is 1 once the attacker is ahead, gives

$$
P_{\text{SN}}(z) = \sum_{k=0}^{\infty} \frac{\lambda^k e^{-\lambda}}{k!}
\min\left\{1, \left(\frac{q}{p}\right)^{z-k}\right\},
$$

or, since the probabilities of all $k$ add up to 1, without the infinite sum,

$$
P_{\text{SN}}(z) = 1 - \sum_{k=0}^{z} \frac{\lambda^k e^{-\lambda}}{k!}\left(1 - \left(\frac{q}{p}\right)^{z-k}\right).
$$

The paper turns this into a short C function. Here it is in Python, line by
line:

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

Rounded to seven decimals, it reproduces all 22 values of the two result
tables ($q = 0.1$ for $z = 0$ to $10$, $q = 0.3$ for $z = 0, 5, \dots, 50$),
and the table of the smallest $z$ with $P < 0.1\,\%$: 5, 8, 11, 15, 24, 41, 89
and 340 confirmations for $q = 0.10$ to $0.45$.[^1] The arithmetic is fine.

## Where intuition misleads: the waiting time is random too

Assuming the honest blocks arrive in exactly the expected time sounds
harmless because it is true on average. But only on average. If the honest
network happens to be slow, the attacker gets more time; if it is fast, less.
These deviations do not cancel out. Each extra attacker block multiplies the
catch-up probability $(q/p)^{z-k}$ by $p/q$, a factor of 9 when $q = 0.1$, so
a long wait helps the attacker more than a short one hurts. The exception is
the region where he is already ahead: probabilities stop at 1, and there the
effect reverses.

Without the assumption the calculation actually gets simpler. In the
sequence of blocks, each one the attacker's with probability $q$, count the
attacker blocks that come before the $z$-th honest one. That count has a
negative binomial distribution,

$$
\Pr(k) = \binom{k + z - 1}{k} p^z q^k ,
$$

which is also what the Poisson model gives once the waiting time is treated
as a gamma-distributed random variable instead of a constant. Combined with
the same catch-up rule, this yields, for $q < p$,

$$
P(z) = 1 - \sum_{k=0}^{z} \binom{k + z - 1}{k} \left(p^z q^k - p^k q^z\right),
$$

the formula Meni Rosenfeld published in 2014. Cyril Grunspan and Ricardo
Pérez-Marco showed in 2017 that it has a closed form in terms of the
regularized incomplete beta function:

$$
P(z) = I_{4pq}\left(z, 1/2\right).
$$

For all 20 combinations of $q$ and $z$ in the accompanying script, the two
expressions and a direct sum over the negative binomial distribution agree,
the sums exactly and the beta function up to the error of numerical
integration.

### The difference in numbers

| *q* | *z* | white paper | exact | ratio |
|---|---|---|---|---|
| 0.1 | 1 | 0.2045873 | 0.2000000 | 0.98 |
| 0.1 | 2 | 0.0509779 | 0.0560000 | 1.10 |
| 0.1 | 6 | 0.0002428 | 0.0005914 | 2.44 |
| 0.1 | 10 | 0.0000012 | 0.0000079 | 6.33 |
| 0.3 | 5 | 0.1773523 | 0.1976173 | 1.11 |
| 0.3 | 10 | 0.0416605 | 0.0651067 | 1.56 |
| 0.3 | 24 | 0.0008106 | 0.0040007 | 4.94 |

Only for a single confirmation is the white-paper value too high, which is
the capped region just described. From two confirmations on it understates
the risk, by a factor that grows with $z$. For $q = 0.3$ and the 24
confirmations the white paper recommends for less than 0.1 %, the actual
risk is 0.4 %.

<figure class="figure">
<svg viewBox="0 0 480 320" role="img" aria-labelledby="ds-title ds-desc" class="figure__svg">
<title id="ds-title">Success probability of a double spend against the number of confirmations</title>
<desc id="ds-desc">Log-scale plot for z from 0 to 30. For an attacker with 10 % and with 30 % of the hash rate, the white-paper value (dashed) lies below the exact value (solid), and the gap grows with z.</desc>
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
<text x="260.0" y="314" fill="currentColor" font-size="12" text-anchor="middle">confirmations z</text>
<path d="M56.0 12.0 L69.6 27.4 L83.2 39.5 L96.8 50.9 L110.4 61.8 L124.0 72.5 L137.6 83.0 L151.2 93.4 L164.8 103.8 L178.4 114.1 L192.0 124.3 L205.6 134.5 L219.2 144.6 L232.8 154.8 L246.4 164.9 L260.0 174.9 L273.6 185.0 L287.2 195.0 L300.8 205.1 L314.4 215.1 L328.0 225.1 L341.6 235.0 L355.2 245.0 L368.8 255.0 L382.4 264.9 L396.0 274.9" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M56.0 12.0 L69.6 27.2 L83.2 40.4 L96.8 53.4 L110.4 66.2 L124.0 78.9 L137.6 91.5 L151.2 104.2 L164.8 116.8 L178.4 129.4 L192.0 141.9 L205.6 154.5 L219.2 167.1 L232.8 179.6 L246.4 192.2 L260.0 204.7 L273.6 217.3 L287.2 229.8 L300.8 242.3 L314.4 254.9 L328.0 267.4" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<path d="M56.0 12.0 L69.6 16.9 L83.2 20.0 L96.8 22.7 L110.4 25.2 L124.0 27.5 L137.6 29.7 L151.2 31.9 L164.8 34.0 L178.4 36.1 L192.0 38.1 L205.6 40.1 L219.2 42.1 L232.8 44.0 L246.4 46.0 L260.0 47.9 L273.6 49.8 L287.2 51.7 L300.8 53.6 L314.4 55.5 L328.0 57.4 L341.6 59.2 L355.2 61.1 L368.8 62.9 L382.4 64.8 L396.0 66.6 L409.6 68.4 L423.2 70.2 L436.8 72.0 L450.4 73.9 L464.0 75.7" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M56.0 12.0 L69.6 16.4 L83.2 19.7 L96.8 22.8 L110.4 25.7 L124.0 28.5 L137.6 31.3 L151.2 34.1 L164.8 36.9 L178.4 39.6 L192.0 42.4 L205.6 45.1 L219.2 47.8 L232.8 50.5 L246.4 53.2 L260.0 55.9 L273.6 58.6 L287.2 61.3 L300.8 64.0 L314.4 66.6 L328.0 69.3 L341.6 72.0 L355.2 74.7 L368.8 77.3 L382.4 80.0 L396.0 82.7 L409.6 85.3 L423.2 88.0 L436.8 90.7 L450.4 93.3 L464.0 96.0" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="184.4" y="106.1" fill="currentColor" font-size="13">q = 0.1</text>
<text x="388.4" y="56.8" fill="currentColor" font-size="13">q = 0.3</text>
</svg>
<figcaption>Dashed: white paper (Poisson). Solid: negative-binomial model (Rosenfeld; Grunspan and Pérez-Marco). Vertical axis logarithmic.</figcaption>
</figure>

The growing ratio comes from different decay rates. Grunspan and Pérez-Marco
give the asymptotics of both: the exact value falls like $(4pq)^z$, up to a
factor of order $1/\sqrt{z}$, the white-paper value like $e^{-z c}$ with
$c = \lambda - 1 - \ln\lambda$ and $\lambda = q/p$. At $q = 0.1$, every extra
confirmation multiplies the exact risk by about 0.36, the white-paper risk by
about 0.27.

The number of confirmations needed for $P < 0.1\,\%$ shifts accordingly:

| *q* | white paper | exact |
|---|---|---|
| 0.10 | 5 | 6 |
| 0.15 | 8 | 9 |
| 0.20 | 11 | 13 |
| 0.25 | 15 | 20 |
| 0.30 | 24 | 32 |
| 0.35 | 41 | 58 |
| 0.40 | 89 | 133 |
| 0.45 | 340 | 539 |

The familiar rule of six confirmations is a convention, not part of the
protocol. The Bitcoin wiki traces it to two arbitrary assumptions: an
attacker with at most 10 % of the hash rate, and an accepted risk below
0.1 %. The white-paper formula would need five confirmations for that; the
exact one needs precisely six.

### Settling it by simulation

When two formulas disagree, an experiment decides. The simulation replays
the race: draw blocks until the honest chain has $z$, then run the walk until
the attacker has caught up or fallen 80 blocks behind. At that point the
remaining chance is below $10^{-29}$ for $q \le 0.3$, so stopping there
changes nothing measurable.

```python
import random

def simulate(q: float, z: int, trials: int, rng: random.Random) -> float:
    wins = 0
    for _ in range(trials):
        honest = attacker = 0
        while honest < z:                          # phase 1
            if rng.random() < q:
                attacker += 1
            else:
                honest += 1
        deficit = z - attacker
        while 0 < deficit < 80:                    # phase 2
            deficit += -1 if rng.random() < q else 1
        wins += deficit <= 0
    return wins / trials

rng = random.Random(20261029)
print(simulate(0.3, 5, 200_000, rng))     # 0.1979
print(simulate(0.1, 6, 1_000_000, rng))   # 0.000606
```

For $q = 0.3$ and $z = 5$, 200,000 races give 0.1979, against 0.1976 exact
and 0.1774 in the white paper. For $q = 0.1$ and $z = 6$, a million races
give 0.000606, against 0.000591 exact and 0.000243 in the white paper. Both
times the exact value is well within the statistical noise and the
white-paper value far outside it.

## What the model leaves out

The corrected formula is still a model, and its assumptions matter before
turning it into a waiting time.

- **No head start.** Both calculations assume the attacker starts mining at
  the moment of payment. The white paper justifies this by having the
  receiver create a fresh key pair just before the payment. An attacker who
  can choose the moment and pre-mine a block first does better.
- **Fixed shares.** $q$ is treated as a constant. Hash power can be rented,
  and nobody observes $q$ directly. The result is a probability for an
  assumed $q$, not for the actual attacker.
- **No propagation delay.** Blocks take time to spread. Orphaned honest
  blocks waste hash power that the model counts as fully effective.
- **Honest miners stay honest.** Eyal and Sirer showed in 2013 that a large
  enough miner can earn more by withholding blocks (selfish mining). Such a
  miner behaves neither like the honest side nor like the attacker here.
- **One attempt, no cost.** The formula is the success probability of a
  single attempt. Whether an attack pays also depends on the amount, the
  cost of hash power and the number of attempts; Rosenfeld's paper covers
  those questions as well.

For the question the section set out to answer, the conclusion is short:
the white-paper tables are computed correctly but are too optimistic, and
the exact formula is no harder to use.

## Further reading

- Satoshi Nakamoto, [Bitcoin: A Peer-to-Peer Electronic Cash System](https://bitcoin.org/bitcoin.pdf),
  2008. Section 11, "Calculations", pp. 6–8.
- Meni Rosenfeld, [Analysis of Hashrate-Based Double Spending](https://arxiv.org/abs/1402.2009),
  2014. Equation (1) and Table 1.
- Cyril Grunspan, Ricardo Pérez-Marco, [Double spend races](https://arxiv.org/abs/1702.02867),
  International Journal of Theoretical and Applied Finance 21(8), 2018.
  Theorem 1 (closed form), Theorem 2 (asymptotics), Table 1.
- Ittay Eyal, Emin Gün Sirer, [Majority is not Enough: Bitcoin Mining is Vulnerable](https://arxiv.org/abs/1311.0243),
  2013.
- William Feller, *An Introduction to Probability Theory and Its
  Applications*, Vol. 1, 3rd edition, Wiley 1968. Chapter XIV (random walk
  and ruin problems).
- Bitcoin wiki, [Confirmation](https://en.bitcoin.it/wiki/Confirmation), on
  where the six confirmations come from.
- Every number in this post comes from `tests/articles/double_spend.py` in
  the [repository of this site](https://github.com/timur-manjosov/portfolio),
  the figure from `tests/articles/double_spend_svg.py --lang en`.

[^1]: Table 1 of Grunspan and Pérez-Marco lists 81 in the row with
    Nakamoto's values for $q = 0.40$. The white-paper formula gives 89, as
    printed there: at $z = 81$ it is still at 0.18 %.
