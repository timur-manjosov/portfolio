"""Computations behind the post on the double-spend calculation in the Bitcoin
white paper (section 11). Standard library only. Every number quoted in the
post comes from this script; the asserts fail if one of them changes.

    python3 tests/articles/double_spend.py
"""

import random
from fractions import Fraction
from math import comb, exp, lgamma, log


def nakamoto(q, z):
    """Section 11 of the white paper: attacker progress ~ Poisson(z q / p)."""
    p = 1.0 - q
    lam = z * (q / p)
    total = 1.0
    for k in range(z + 1):
        poisson = exp(-lam)
        for i in range(1, k + 1):
            poisson *= lam / i
        total -= poisson * (1 - (q / p) ** (z - k))
    return total


def rosenfeld(q, z):
    """Rosenfeld (2014), eq. (1): attacker progress ~ negative binomial.

    Exact rational arithmetic: for z in the hundreds the binomial coefficients
    overflow a float, and the result is a small difference of numbers near 1.
    """
    q = Fraction(str(q))
    p = 1 - q
    if q >= p or z == 0:
        return 1.0
    return float(1 - sum(comb(m + z - 1, m) * (p**z * q**m - p**m * q**z) for m in range(z + 1)))


def negbin_catch_up(q, z):
    """Negative binomial progress, combined with the gambler's-ruin catch-up of the white paper."""
    q = Fraction(str(q))
    p = 1 - q
    head = sum(comb(m + z - 1, m) * p**z * q**m * (q / p) ** (z - m) for m in range(z))
    tail = 1 - sum(comb(m + z - 1, m) * p**z * q**m for m in range(z))
    return float(head + tail)


def reg_inc_beta(x, a, b, steps=200_000):
    """Regularized incomplete beta I_x(a, b) by the midpoint rule in t = x u^(1/a).

    Substituting t = x u^(1/a) removes the singularity of t^(a-1) at 0:
    integral_0^x t^(a-1) (1-t)^(b-1) dt = (x^a / a) integral_0^1 (1 - x u^(1/a))^(b-1) du.
    """
    h = 1.0 / steps
    s = sum((1.0 - x * ((i + 0.5) * h) ** (1.0 / a)) ** (b - 1.0) for i in range(steps)) * h
    log_beta = lgamma(a) + lgamma(b) - lgamma(a + b)
    return exp(a * log(x) - log(a) - log_beta) * s


def grunspan_perez_marco(q, z):
    """Theorem 1 of Grunspan and Perez-Marco (2017): P(z) = I_{4pq}(z, 1/2)."""
    p = 1.0 - q
    return reg_inc_beta(4 * p * q, z, 0.5)


def simulate(q, z, trials, rng, give_up=80):
    """Monte Carlo of the race itself: each new block is the attacker's with probability q.

    Phase 1: count attacker blocks until the honest chain has z blocks.
    Phase 2: random walk of the deficit until it reaches 0 (the attacker has
    caught up, as in the white paper) or `give_up` blocks (then (q/p)^80 is
    below 1e-29 for q <= 0.3, so stopping there changes nothing measurable).
    """
    wins = 0
    for _ in range(trials):
        honest = attacker = 0
        while honest < z:
            if rng.random() < q:
                attacker += 1
            else:
                honest += 1
        deficit = z - attacker
        while 0 < deficit < give_up:
            deficit += -1 if rng.random() < q else 1
        wins += deficit <= 0
    return wins / trials


# 1. Reproduce the white-paper tables exactly (7 decimals, as printed there)
TABLE_01 = {0: "1.0000000", 1: "0.2045873", 2: "0.0509779", 3: "0.0131722", 4: "0.0034552",
            5: "0.0009137", 6: "0.0002428", 7: "0.0000647", 8: "0.0000173", 9: "0.0000046",
            10: "0.0000012"}  # fmt: skip
TABLE_03 = {0: "1.0000000", 5: "0.1773523", 10: "0.0416605", 15: "0.0101008", 20: "0.0024804",
            25: "0.0006132", 30: "0.0001522", 35: "0.0000379", 40: "0.0000095", 45: "0.0000024",
            50: "0.0000006"}  # fmt: skip
for q, table in ((0.1, TABLE_01), (0.3, TABLE_03)):
    for z, printed in table.items():
        assert f"{nakamoto(q, z):.7f}" == printed, (q, z, nakamoto(q, z), printed)
print("white-paper tables for q = 0.1 and q = 0.3: all 22 values reproduced")


def min_z(model, q, limit=0.001):
    z = 0
    while model(q, z) >= limit:
        z += 1
    return z


QS = (0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45)
z_nak = [min_z(nakamoto, q) for q in QS]
z_ros = [min_z(rosenfeld, q) for q in QS]
print("P < 0.1 %, Nakamoto: ", dict(zip(QS, z_nak)))
print("P < 0.1 %, Rosenfeld:", dict(zip(QS, z_ros)))
# White paper prints 5, 8, 11, 15, 24, 41, 89, 340: reproduced. (The z_SN row
# of Grunspan/Perez-Marco's Table 1 has 81 for q = 0.40, a transcription slip.)
assert z_nak == [5, 8, 11, 15, 24, 41, 89, 340], z_nak
# Grunspan/Perez-Marco, Table 1: 6, 9, 13, 20, 32, 58, 133, 539
assert z_ros == [6, 9, 13, 20, 32, 58, 133, 539], z_ros
print(f"Nakamoto P(q=0.4, z=81) = {nakamoto(0.4, 81):.6f}, P(z=88) = {nakamoto(0.4, 88):.6f}, P(z=89) = {nakamoto(0.4, 89):.6f}")
assert nakamoto(0.4, 81) > 0.001 > nakamoto(0.4, 89)

# 2. Rosenfeld = negative binomial + gambler's ruin = Grunspan/Perez-Marco
for q in (0.1, 0.2, 0.3, 0.4):
    for z in (1, 2, 3, 6, 10):
        r, n, g = rosenfeld(q, z), negbin_catch_up(q, z), grunspan_perez_marco(q, z)
        assert abs(r - n) < 1e-12, (q, z, r, n)
        assert abs(r - g) < 1e-6 * max(r, 1e-12) + 1e-9, (q, z, r, g)
print("Rosenfeld eq. (1) = negative binomial with catch-up = I_{4pq}(z, 1/2), checked for 20 (q, z) pairs")

assert f"{rosenfeld(0.1, 2):.5f}" == "0.05600"  # Rosenfeld, Table 1: 5.600 %
assert f"{rosenfeld(0.1, 6):.5f}" == "0.00059"  # Rosenfeld, Table 1: 0.059 %

# 3. The comparison table of the post
print()
print(" q     z   Nakamoto     exact (NB)   ratio")
rows = [(0.1, 1), (0.1, 2), (0.1, 6), (0.1, 10), (0.3, 5), (0.3, 10), (0.3, 24)]
for q, z in rows:
    a, b = nakamoto(q, z), rosenfeld(q, z)
    print(f"{q:.1f}  {z:3d}   {a:.7f}    {b:.7f}    {b / a:5.2f}")
assert f"{rosenfeld(0.1, 6):.7f}" == "0.0005914"
assert f"{rosenfeld(0.3, 24):.7f}" == "0.0040007"
assert f"{nakamoto(0.3, 24):.7f}" == "0.0008106"
# z = 1: the white paper overestimates (Grunspan/Perez-Marco: P(1) <= P_SN(1))
assert rosenfeld(0.1, 1) < nakamoto(0.1, 1)
assert f"{rosenfeld(0.1, 1):.7f}" == "0.2000000"

# 4. Monte Carlo of the race (fixed seed: reproducible)
rng = random.Random(20261029)
mc_03 = simulate(0.3, 5, 200_000, rng)
mc_01 = simulate(0.1, 6, 1_000_000, rng)
print()
print(f"Monte Carlo q=0.3, z=5, 200000 races:   {mc_03:.4f} (Nakamoto {nakamoto(0.3, 5):.4f}, exact {rosenfeld(0.3, 5):.4f})")
print(f"Monte Carlo q=0.1, z=6, 1000000 races:  {mc_01:.6f} (Nakamoto {nakamoto(0.1, 6):.6f}, exact {rosenfeld(0.1, 6):.6f})")
assert abs(mc_03 - rosenfeld(0.3, 5)) < 0.004 and abs(mc_03 - nakamoto(0.3, 5)) > 0.02
assert abs(mc_01 - rosenfeld(0.1, 6)) < 0.0001 and abs(mc_01 - nakamoto(0.1, 6)) > 0.0002

# 5. Decay rates (Grunspan/Perez-Marco, Theorem 2): exact P(z) ~ s^z / sqrt(pi (1 - s) z)
# with s = 4pq, Nakamoto P_SN(z) ~ exp(-z c) / 2 with c = lam - 1 - log(lam), lam = q/p.
q = 0.1
p = 1 - q
s_rate = 4 * p * q
lam_ = q / p
c_rate = lam_ - 1 - log(lam_)
print(f"q = 0.1: exact decays like {s_rate:.3f}^z, Nakamoto like exp(-{c_rate:.3f} z) = {exp(-c_rate):.3f}^z")
assert f"{s_rate:.2f}" == "0.36" and f"{c_rate:.3f}" == "1.308" and f"{exp(-c_rate):.3f}" == "0.270"
# So c > -log(s): the white-paper value falls off faster, the gap grows with z.
assert c_rate > -log(s_rate)
