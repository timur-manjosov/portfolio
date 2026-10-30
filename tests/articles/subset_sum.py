"""Computations behind the post on subset sum: NP-complete, yet often easy.
Standard library only; fixed seeds, so every run prints the same numbers.
The asserts fail if a number quoted in the post changes.

    python3 tests/articles/subset_sum.py
"""

import random
from bisect import bisect_left
from itertools import combinations


def dp_table(items, target):
    """Classic table: reach[i][s] = some subset of the first i items sums to s."""
    reach = [[False] * (target + 1) for _ in range(len(items) + 1)]
    reach[0][0] = True
    for i, a in enumerate(items, start=1):
        for s in range(target + 1):
            reach[i][s] = reach[i - 1][s] or (s >= a and reach[i - 1][s - a])
    return reach


def bitset_sums(items):
    """All subset sums as the set bits of one big integer."""
    reach = 1
    for a in items:
        reach |= reach << a
    return reach


def meet_in_the_middle(items, target):
    """Horowitz-Sahni idea: split, enumerate both halves, search the sorted right half."""
    half = len(items) // 2
    left, right = items[:half], items[half:]

    def sums(part):
        out = [0]
        for a in part:
            out += [s + a for s in out]
        return out

    right_sums = sorted(sums(right))
    for s in sums(left):
        j = bisect_left(right_sums, target - s)
        if j < len(right_sums) and right_sums[j] == target - s:
            return True
    return False


def count_perfect_partitions(items):
    """Number of subsets with sum exactly total/2 (each partition counted twice)."""
    total = sum(items)
    if total % 2:
        return 0
    half = len(items) // 2
    left, right = items[:half], items[half:]

    def sums(part):
        out = [0]
        for a in part:
            out += [s + a for s in out]
        return out

    counts = {}
    for s in sums(right):
        counts[s] = counts.get(s, 0) + 1
    return sum(counts.get(total // 2 - s, 0) for s in sums(left))


# 1. The worked example
S, T = [3, 34, 4, 12, 5, 2], 9
table = dp_table(S, T)
assert table[len(S)][T]
solutions = [c for r in range(len(S) + 1) for c in combinations(S, r) if sum(c) == T]
print("subsets of", S, "with sum", T, ":", solutions)
assert solutions == [(4, 5), (3, 4, 2)]
for i, row in enumerate(table):
    print(f"  after {S[:i]!s:24} reachable: {[s for s, ok in enumerate(row) if ok]}")
assert [s for s, ok in enumerate(table[3]) if ok] == [0, 3, 4, 7]
reach = bitset_sums(S)
assert (reach >> T) & 1
print("bitset of all subset sums, lowest 10 bits:", bin(reach & 0b1111111111)[2:].zfill(10)[::-1])
sums_all = [s for s in range(sum(S) + 1) if (reach >> s) & 1]
print(f"distinct subset sums: {len(sums_all)} of 2^{len(S)} = {2 ** len(S)} subsets; max {sum(S)}")
assert len(sums_all) == 48

# 2. Input size: n numbers of b bits take about n*b bits, the table has n*T cells
n, b = 100, 64
print(f"n = {n} numbers of {b} bits: input about {n * b} bits, table up to {n} x {n} * 2^{b} cells")

# 3. Small numbers: bitset DP on 1000 random 16-bit numbers
rng = random.Random(2026)
small = [rng.randrange(1, 2**16) for _ in range(1000)]
r = bitset_sums(small)
total = sum(small)
distinct = bin(r).count("1")
print(f"1000 random 16-bit numbers: total {total}, distinct subset sums {distinct} ({distinct / (total + 1):.6f} of 0..total)")
bits = bin(r)[2:][::-1]  # bits[s] == "1" iff s is a subset sum
missing = [s for s, bit in enumerate(bits) if bit == "0"]
print(f"  unreachable sums: {len(missing)}, smallest {missing[:5]}")

# 4. Big numbers: 40 random 40-bit numbers, target = sum of a random half
rng = random.Random(40)
big = [rng.randrange(2**39, 2**40) for _ in range(40)]
chosen = rng.sample(range(40), 20)
target = sum(big[i] for i in chosen)
print(f"40 numbers of 40 bits: target has {target.bit_length()} bits; a table would need about 40 * 2^{target.bit_length()} cells")
assert meet_in_the_middle(big, target)
print(f"  meet in the middle: 2 * 2^20 = {2 * 2**20} partial sums instead of 2^40 = {2**40} subsets")

# 5. Phase transition of number partitioning, n = 20, b bits per number
rng = random.Random(1998)
n = 20
print(f"\nperfect partition (sum difference 0) for n = {n}, 200 random instances per b:")
results = {}
for b in (4, 8, 12, 14, 16, 18, 20, 22, 24, 28):
    solvable = 0
    sol_counts = []
    for _ in range(200):
        items = [rng.randrange(1, 2**b) for _ in range(n)]
        if sum(items) % 2:
            items[0] ^= 1  # make the total even, so difference 0 is possible at all
            if items[0] == 0:
                items[0] = 2
        c = count_perfect_partitions(items)
        if c:
            solvable += 1
            sol_counts.append(c // 2)
    median = sorted(sol_counts)[len(sol_counts) // 2] if sol_counts else 0
    results[b] = (solvable, median)
    print(f"  b = {b:2d}: {solvable:3d} / 200 solvable, median number of perfect partitions {median}")
print(results)
assert results == {4: (200, 10067), 8: (200, 630), 12: (200, 39), 14: (200, 10), 16: (184, 2), 18: (98, 1),
                   20: (36, 1), 22: (10, 1), 24: (3, 1), 28: (0, 0)}  # fmt: skip
assert (total, distinct, len(missing)) == (33585543, 33582956, 2588)
assert target.bit_length() == 44

# 6. Mertens (2003), eq. (12): critical bits per number B_c = N (1 - log2 N / (2N) - log2(pi/6) / (2N))
from math import log2, pi  # noqa: E402

N = 20
B_c = N * (1 - log2(N) / (2 * N) - log2(pi / 6) / (2 * N))
print(f"Mertens: critical number of bits for N = {N}: {B_c:.2f} (experiment: 98/200 solvable at b = 18)")
assert f"{B_c:.1f}" == "18.3"
print(f"table for 40 numbers of 40 bits, target with 44 bits: 40 * 2^44 = {40 * 2**44:.2e} cells")
# Lagarias-Odlyzko density d = n / log2(max a_i) of the 40-bit instance
print(f"density of the 40-bit instance: {40 / log2(max(big)):.3f}")

# 7. Experiment 1: the unreachable sums lie only at the two edges
print(f"smallest of the 1000 numbers: {min(small)}")
low = [s for s in missing if s < total // 2]
high = [s for s in missing if s >= total // 2]
print(f"unreachable below the middle: max {max(low)}; above: min {min(high)} (total - {total - min(high)})")
assert min(small) == 15
assert sorted(total - s for s in high) == low  # mirror image
assert max(low) == 2268
