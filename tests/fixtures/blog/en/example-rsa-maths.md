---
title: "[Example] RSA in a few lines: maths, code, footnotes"
description: Example post showing how formulas, code, footnotes, the table of contents and series look on the blog. Not a real post.
date: 2026-10-26
category: math-crypto
tags: [rsa, number-theory, example]
series: Example series cryptography
seriesPart: 1
draft: true
example: true
translationKey: example-rsa
---

> **Example post (test fixture).** This text only exists so that tests can
> check formulas, code, footnotes, the table of contents and series. It lives
> in `tests/fixtures/` and never appears in the production build.

## The idea

RSA rests on the fact that multiplying is easy and factoring is hard. Pick two
large primes $p$ and $q$ and set $n = pq$.[^1]

## Key generation

With Euler's totient function, $\varphi(n) = (p-1)(q-1)$. Choose $e$ with
$\gcd(e, \varphi(n)) = 1$ and compute $d$ as its inverse:

$$
e \cdot d \equiv 1 \pmod{\varphi(n)}
$$

## Encryption and decryption

For a message $m < n$:

$$
c = m^e \bmod n, \qquad m = c^d \bmod n.
$$

Why this works follows from Euler's theorem:
$m^{\varphi(n)} \equiv 1 \pmod n$ for $\gcd(m, n) = 1$.[^2]

## In code

```python
def rsa_demo(p: int, q: int, e: int, m: int) -> tuple[int, int]:
    n, phi = p * q, (p - 1) * (q - 1)
    d = pow(e, -1, phi)          # modular inverse (Python >= 3.8)
    c = pow(m, e, n)
    return c, pow(c, d, n)

print(rsa_demo(61, 53, 17, 65))  # (2790, 65)
```

## What is missing

Real RSA needs padding (e.g. OAEP). Without padding the scheme is
deterministic and attackable.

[^1]: In practice, $p$ and $q$ each have at least 1024 bits.
[^2]: The case $\gcd(m, n) \ne 1$ works too, but follows from the Chinese
    remainder theorem.
