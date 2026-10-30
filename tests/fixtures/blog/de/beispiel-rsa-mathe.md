---
title: "[Beispiel] RSA in wenigen Zeilen: Mathe, Code, Fußnoten"
description: Beispielbeitrag, der zeigt, wie Formeln, Code, Fußnoten, Inhaltsverzeichnis und Serien im Blog aussehen. Kein echter Beitrag.
date: 2026-10-26
category: math-crypto
tags: [rsa, zahlentheorie, beispiel]
series: Beispielserie Kryptografie
seriesPart: 1
draft: true
example: true
translationKey: example-rsa
---

> **Beispielbeitrag (Testfixture).** Dieser Text existiert nur, damit Tests
> Formeln, Code, Fußnoten, Inhaltsverzeichnis und Serien prüfen können. Er
> liegt unter `tests/fixtures/` und erscheint nie im Produktions-Build.

## Die Idee

RSA beruht darauf, dass Multiplizieren leicht und Faktorisieren schwer ist.
Man wählt zwei große Primzahlen $p$ und $q$ und setzt $n = pq$.[^1]

## Schlüsselerzeugung

Mit der eulerschen Phi-Funktion gilt $\varphi(n) = (p-1)(q-1)$. Man wählt $e$
mit $\gcd(e, \varphi(n)) = 1$ und berechnet $d$ als Inverses:

$$
e \cdot d \equiv 1 \pmod{\varphi(n)}
$$

## Ver- und Entschlüsselung

Für eine Nachricht $m < n$ gilt

$$
c = m^e \bmod n, \qquad m = c^d \bmod n.
$$

Warum das funktioniert, folgt aus dem Satz von Euler:
$m^{\varphi(n)} \equiv 1 \pmod n$ für $\gcd(m, n) = 1$.[^2]

## Im Code

```python
def rsa_demo(p: int, q: int, e: int, m: int) -> tuple[int, int]:
    n, phi = p * q, (p - 1) * (q - 1)
    d = pow(e, -1, phi)          # modulares Inverses (Python ≥ 3.8)
    c = pow(m, e, n)
    return c, pow(c, d, n)

print(rsa_demo(61, 53, 17, 65))  # (2790, 65)
```

## Was fehlt

Echtes RSA braucht Padding (z. B. OAEP). Ohne Padding ist das Verfahren
deterministisch und angreifbar.

[^1]: In der Praxis haben $p$ und $q$ jeweils mindestens 1024 Bit.
[^2]: Der Fall $\gcd(m, n) \ne 1$ funktioniert auch, folgt aber aus dem
    chinesischen Restsatz.
