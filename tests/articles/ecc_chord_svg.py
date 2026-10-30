"""Generates the inline SVG of the chord construction in the elliptic-curve
post: the real curve y^2 = x^3 - 2x + 2, a line through P and Q, the third
intersection R and its mirror image P + Q = -R. Prints the coordinates (for
the text) and the <svg> element (pasted into the post).

    python3 tests/articles/ecc_chord_svg.py [--lang en]
"""

import sys
from math import sqrt

EN = "--lang" in sys.argv and sys.argv[sys.argv.index("--lang") + 1] == "en"
TEXT = (
    {
        "title": "Adding two points on an elliptic curve",
        "desc": "The real curve y² = x³ − 2x + 2. A line through P = (−1, √3) and Q = (1, 1) meets the curve in a third point R. Its mirror image in the x-axis is P + Q.",
        "caption": "A chord through P and Q on the real curve y² = x³ − 2x + 2: the third intersection R, mirrored in the x-axis, is P + Q.",
    }
    if EN
    else {
        "title": "Addition zweier Punkte auf einer elliptischen Kurve",
        "desc": "Die reelle Kurve y² = x³ − 2x + 2. Eine Gerade durch P = (−1, √3) und Q = (1, 1) schneidet die Kurve in einem dritten Punkt R. Dessen Spiegelbild an der x-Achse ist P + Q.",
        "caption": "Sekante durch P und Q auf der reellen Kurve y² = x³ − 2x + 2: Der dritte Schnittpunkt R, an der x-Achse gespiegelt, ist P + Q.",
    }
)

A, B = -2.0, 2.0


def f(x):
    return x**3 + A * x + B


P = (-1.0, sqrt(f(-1.0)))  # (-1, sqrt(3))
Q = (1.0, sqrt(f(1.0)))  # (1, 1)
lam = (Q[1] - P[1]) / (Q[0] - P[0])
x3 = lam * lam - P[0] - Q[0]
y3 = lam * (P[0] - x3) - P[1]
R = (x3, -y3)  # third intersection on the line
S = (x3, y3)  # P + Q
# R really lies on the line through P and Q and on the curve
assert abs(R[1] - (P[1] + lam * (R[0] - P[0]))) < 1e-12
assert abs(R[1] ** 2 - f(R[0])) < 1e-9
print(f"P = ({P[0]}, {P[1]:.4f}), Q = {Q}, lambda = {lam:.4f}")
print(f"R = ({R[0]:.4f}, {R[1]:.4f}), P + Q = ({S[0]:.4f}, {S[1]:.4f})")

# Plot window and mapping to a 480 x 360 viewBox
X0, X1, Y0, Y1 = -2.2, 2.4, -3.2, 3.2
W, H = 480, 360


def sx(x):
    return (x - X0) / (X1 - X0) * W


def sy(y):
    return H - (y - Y0) / (Y1 - Y0) * H


# Left end of the real curve: the real root of x^3 - 2x + 2
lo, hi = -2.0, -1.5
for _ in range(80):
    mid = (lo + hi) / 2
    if f(mid) < 0:
        lo = mid
    else:
        hi = mid
root = hi
xs = [root + (X1 - root) * (i / 160) ** 2 for i in range(161)]
upper = [(x, sqrt(max(f(x), 0.0))) for x in xs if sqrt(max(f(x), 0.0)) <= Y1 + 0.5]
pts = [(x, -y) for x, y in reversed(upper)] + upper
curve = "M" + " L".join(f"{sx(x):.1f} {sy(y):.1f}" for x, y in pts)


def line_y(x):
    return P[1] + lam * (x - P[0])


lx0, lx1 = X0, X1
svg = f"""<figure class="figure">
<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="ec-chord-title ec-chord-desc" class="figure__svg">
<title id="ec-chord-title">{TEXT["title"]}</title>
<desc id="ec-chord-desc">{TEXT["desc"]}</desc>
<line x1="0" y1="{sy(0):.1f}" x2="{W}" y2="{sy(0):.1f}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<line x1="{sx(0):.1f}" y1="0" x2="{sx(0):.1f}" y2="{H}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
<path d="{curve}" fill="none" stroke="currentColor" stroke-width="2"/>
<line x1="{sx(lx0):.1f}" y1="{sy(line_y(lx0)):.1f}" x2="{sx(lx1):.1f}" y2="{sy(line_y(lx1)):.1f}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<line x1="{sx(R[0]):.1f}" y1="{sy(R[1]):.1f}" x2="{sx(S[0]):.1f}" y2="{sy(S[1]):.1f}" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<circle cx="{sx(P[0]):.1f}" cy="{sy(P[1]):.1f}" r="5" fill="currentColor"/>
<circle cx="{sx(Q[0]):.1f}" cy="{sy(Q[1]):.1f}" r="5" fill="currentColor"/>
<circle cx="{sx(R[0]):.1f}" cy="{sy(R[1]):.1f}" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="{sx(S[0]):.1f}" cy="{sy(S[1]):.1f}" r="5" fill="currentColor"/>
<text x="{sx(P[0]) - 14:.1f}" y="{sy(P[1]) - 12:.1f}" fill="currentColor" font-size="16">P</text>
<text x="{sx(Q[0]) + 4:.1f}" y="{sy(Q[1]) - 12:.1f}" fill="currentColor" font-size="16">Q</text>
<text x="{sx(R[0]) + 10:.1f}" y="{sy(R[1]) + 18:.1f}" fill="currentColor" font-size="16">R</text>
<text x="{sx(S[0]) + 10:.1f}" y="{sy(S[1]) - 6:.1f}" fill="currentColor" font-size="16">P + Q</text>
</svg>
<figcaption>{TEXT["caption"]}</figcaption>
</figure>"""
print(svg)
