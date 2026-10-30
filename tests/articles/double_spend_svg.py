"""Generates the inline SVG for the double-spend post: success probability
against confirmations z on a log scale, white-paper model (dashed) and
negative-binomial model (solid), for q = 0.1 and q = 0.3.

    python3 tests/articles/double_spend_svg.py [--lang en]
"""

import contextlib
import io
import sys
from math import log10
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
with contextlib.redirect_stdout(io.StringIO()):  # importing runs (and checks) double_spend.py
    from double_spend import nakamoto, rosenfeld  # noqa: E402

EN = "--lang" in sys.argv and sys.argv[sys.argv.index("--lang") + 1] == "en"
T = (
    {
        "title": "Success probability of a double spend against the number of confirmations",
        "desc": "Log-scale plot for z from 0 to 30. For an attacker with 10 % and with 30 % of the hash rate, the white-paper value (dashed) lies below the exact value (solid), and the gap grows with z.",
        "x": "confirmations z",
        "caption": "Dashed: white paper (Poisson). Solid: negative-binomial model (Rosenfeld; Grunspan and Pérez-Marco). Vertical axis logarithmic.",
    }
    if EN
    else {
        "title": "Erfolgswahrscheinlichkeit einer Doppelausgabe über der Zahl der Bestätigungen",
        "desc": "Logarithmische Darstellung für z von 0 bis 30. Für einen Angreifer mit 10 % und mit 30 % der Rechenleistung liegt der Wert des Whitepapers (gestrichelt) unter dem exakten Wert (durchgezogen), und der Abstand wächst mit z.",
        "x": "Bestätigungen z",
        "caption": "Gestrichelt: Whitepaper (Poisson). Durchgezogen: negativ-binomiales Modell (Rosenfeld; Grunspan und Pérez-Marco). Senkrechte Achse logarithmisch.",
    }
)

W, H = 480, 320
L, R, TOP, BOT = 56, 16, 12, 44  # margins
ZMAX, YMIN = 30, -12  # log10 range [-12, 0]


def sx(z):
    return L + z / ZMAX * (W - L - R)


def sy(p):
    return TOP + (0 - max(log10(p), YMIN)) / (0 - YMIN) * (H - TOP - BOT)


def path(f, q):
    pts = [(z, f(q, z)) for z in range(ZMAX + 1)]
    pts = [(z, pr) for z, pr in pts if pr > 10**YMIN]
    return "M" + " L".join(f"{sx(z):.1f} {sy(pr):.1f}" for z, pr in pts)


lines = []
for e in range(0, YMIN - 1, -3):
    y = sy(10**e)
    lines.append(
        f'<line x1="{L}" y1="{y:.1f}" x2="{W - R}" y2="{y:.1f}" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>'
    )
    label = "1" if e == 0 else f"10<tspan dy=\"-6\" font-size=\"10\">{e}</tspan>"
    lines.append(f'<text x="{L - 8}" y="{y + 4:.1f}" fill="currentColor" font-size="12" text-anchor="end">{label}</text>')
for z in range(0, ZMAX + 1, 5):
    x = sx(z)
    lines.append(f'<text x="{x:.1f}" y="{H - BOT + 18}" fill="currentColor" font-size="12" text-anchor="middle">{z}</text>')
lines.append(
    f'<line x1="{L}" y1="{H - BOT}" x2="{W - R}" y2="{H - BOT}" stroke="currentColor" stroke-opacity="0.5" stroke-width="1"/>'
)
lines.append(
    f'<text x="{(L + W - R) / 2:.1f}" y="{H - 6}" fill="currentColor" font-size="12" text-anchor="middle">{T["x"]}</text>'
)
for q in (0.1, 0.3):
    lines.append(f'<path d="{path(rosenfeld, q)}" fill="none" stroke="currentColor" stroke-width="2"/>')
    lines.append(
        f'<path d="{path(nakamoto, q)}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>'
    )
# Curve labels next to the solid curves
for q, z in ((0.1, 9), (0.3, 24)):
    label = f"{q:.1f}" if EN else f"{q:.1f}".replace(".", ",")  # German decimal comma
    lines.append(
        f'<text x="{sx(z) + 6:.1f}" y="{sy(rosenfeld(q, z)) - 8:.1f}" fill="currentColor" font-size="13">q = {label}</text>'
    )

body = "\n".join(lines)
print(f"""<figure class="figure">
<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="ds-title ds-desc" class="figure__svg">
<title id="ds-title">{T["title"]}</title>
<desc id="ds-desc">{T["desc"]}</desc>
{body}
</svg>
<figcaption>{T["caption"]}</figcaption>
</figure>""")
