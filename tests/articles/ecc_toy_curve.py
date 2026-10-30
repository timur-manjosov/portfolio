"""Computations behind the post "Das Gruppengesetz auf elliptischen Kurven,
nachgerechnet" / "The group law on elliptic curves, worked through".

Toy curve E: y^2 = x^3 + 2x + 2 over F_17. Every number quoted in the post
comes from this script; the asserts fail if one of them changes.

    python3 tests/articles/ecc_toy_curve.py
"""

from math import isqrt

P_MOD, A, B = 17, 2, 2
O = None  # point at infinity


def on_curve(pt):
    if pt is O:
        return True
    x, y = pt
    return (y * y - (x**3 + A * x + B)) % P_MOD == 0


def neg(pt):
    return O if pt is O else (pt[0], (-pt[1]) % P_MOD)


def add(p1, p2):
    if p1 is O:
        return p2
    if p2 is O:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and (y1 + y2) % P_MOD == 0:
        return O  # P + (-P), also covers doubling a point with y = 0
    if p1 == p2:
        lam = (3 * x1 * x1 + A) * pow(2 * y1, -1, P_MOD) % P_MOD
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, P_MOD) % P_MOD
    x3 = (lam * lam - x1 - x2) % P_MOD
    y3 = (lam * (x1 - x3) - y1) % P_MOD
    return (x3, y3)


def mul(k, pt):
    """Double-and-add, bits from the most significant one."""
    result = O
    for bit in bin(k)[2:]:
        result = add(result, result)
        if bit == "1":
            result = add(result, pt)
    return result


# Non-singular: 4a^3 + 27b^2 != 0 (mod p)
disc = (4 * A**3 + 27 * B**2) % P_MOD
assert disc == 140 % 17 == 4, disc

points = [O] + [(x, y) for x in range(P_MOD) for y in range(P_MOD) if on_curve((x, y))]
N = len(points)
assert N == 19, N
# Hasse: |N - (p + 1)| <= 2 sqrt(p)
assert abs(N - (P_MOD + 1)) <= 2 * P_MOD**0.5
print(f"#E(F_17) = {N}; Hasse interval [{P_MOD + 1 - 2 * P_MOD**0.5:.2f}, {P_MOD + 1 + 2 * P_MOD**0.5:.2f}]")
print("affine points:", sorted(p for p in points if p is not O))  # type: ignore[type-var]

# Worked example: doubling P = (5, 1)
G = (5, 1)
lam = (3 * 5 * 5 + A) * pow(2 * 1, -1, P_MOD) % P_MOD
assert (3 * 25 + 2) % P_MOD == 9 and pow(2, -1, P_MOD) == 9 and lam == 13
assert add(G, G) == (6, 3)
# Worked example: adding P + 2P
lam2 = (3 - 1) * pow(6 - 5, -1, P_MOD) % P_MOD
assert lam2 == 2 and add(G, (6, 3)) == (10, 6)

multiples = [mul(k, G) for k in range(1, 20)]
print("kP for k = 1..19:", multiples)
assert multiples[-1] is O and multiples[17] == (5, 16)  # 18P = -P
assert len({m for m in multiples[:-1]}) == 18  # P generates the whole group

# Group axioms, exhaustively on this curve (evidence, not a proof)
for p1 in points:
    assert add(p1, O) == p1 and add(p1, neg(p1)) is O
    for p2 in points:
        assert add(p1, p2) == add(p2, p1)
        assert on_curve(add(p1, p2))
triples = 0
for p1 in points:
    for p2 in points:
        s12 = add(p1, p2)
        for p3 in points:
            assert add(s12, p3) == add(p1, add(p2, p3))
            triples += 1
assert triples == 19**3 == 6859
print(f"associativity holds for all {triples} triples")

# Discrete logarithm of Q = (13, 7) to base P by baby-step giant-step
Q = (13, 7)
m = isqrt(N - 1) + 1  # ceil(sqrt(19)) = 5
assert m == 5
baby = {}
cur = O
for j in range(m):
    baby[cur] = j
    cur = add(cur, G)
step = neg(mul(m, G))  # -mP
gamma = Q
found = None
for i in range(m):
    if gamma in baby:
        found = i * m + baby[gamma]
        break
    gamma = add(gamma, step)
print(f"baby steps: {[(j, pt) for pt, j in baby.items()]}")
print(f"5P = {mul(5, G)}, -5P = {step}")
print(f"log_P Q = {found}")
assert found == 8 and mul(8, G) == Q

# Giant-step trace for the post: Q, Q - 5P, ...
trace = [Q, add(Q, step)]
print("giant steps:", trace)
assert trace[1] == (10, 6) and baby[(10, 6)] == 3  # i = 1, j = 3: 1*5 + 3 = 8

# Double-and-add for k = 13 = 0b1101: number of doublings and additions
k = 13
print(f"13P = {mul(13, G)}")
assert mul(13, G) == (16, 4)


# Two typical mistakes and what the exhaustive check says about them
def add_missing_two(p1, p2):
    """Tangent slope (3x^2 + a) / y instead of (3x^2 + a) / (2y)."""
    if p1 is O:
        return p2
    if p2 is O:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and (y1 + y2) % P_MOD == 0:
        return O
    if p1 == p2:
        lam = (3 * x1 * x1 + A) * pow(y1, -1, P_MOD) % P_MOD
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, P_MOD) % P_MOD
    x3 = (lam * lam - x1 - x2) % P_MOD
    return (x3, (lam * (x1 - x3) - y1) % P_MOD)


def add_third_point(p1, p2):
    """Returns R, the third intersection, instead of its mirror image -R."""
    return neg(add(p1, p2))


def failing_triples(op):
    bad = 0
    for p1 in points:
        for p2 in points:
            for p3 in points:
                try:
                    if op(op(p1, p2), p3) != op(p1, op(p2, p3)):
                        bad += 1
                except ValueError:  # inverse of 0 after leaving the curve
                    bad += 1
    return bad


bug1, bug2 = failing_triples(add_missing_two), failing_triples(add_third_point)
off_curve = sum(1 for p1 in points if p1 is not O and not on_curve(add_missing_two(p1, p1)))
print(f"missing factor 2: {bug1} failing triples, {off_curve} doublings off the curve")
print(f"R instead of -R: {bug2} failing triples, O neutral for {sum(add_third_point(p, O) == p for p in points)} points")
assert (bug1, off_curve, bug2) == (1152, 18, 6498)

# SEC 1 v2, 3.1.1.2.1 step 8: p^B != 1 (mod n) for 1 <= B < 100 (MOV / Frey-Rueck).
# The toy curve fails it: its embedding degree is 9.
embedding_degree = next(b for b in range(1, 100) if pow(P_MOD, b, N) == 1)
print(f"embedding degree of the toy curve: {embedding_degree}")
assert embedding_degree == 9

# secp256k1 (SEC 2 v2, 2.4.1) passes the same check
n_k1 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
p_k1 = 2**256 - 2**32 - 977
assert p_k1 == 2**256 - 2**32 - 2**9 - 2**8 - 2**7 - 2**6 - 2**4 - 1
assert all(pow(p_k1, b, n_k1) != 1 for b in range(1, 100)) and n_k1 != p_k1
# Pollard rho needs about sqrt(pi n / 4) group operations
from math import log2, pi, sqrt  # noqa: E402

print(f"secp256k1: log2 sqrt(pi n / 4) = {log2(sqrt(pi * n_k1 / 4)):.1f}")
assert round(log2(sqrt(pi * n_k1 / 4)), 1) == 127.8
