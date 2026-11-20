"""Every number of the post "Bitcoin: Was in den nächsten Jahrzehnten
entschieden wird" (DE) and its translation (EN), recomputed and checked
against both texts.

Standard library only. Two kinds of values:

- computed from Bitcoin's consensus parameters (50 BTC initial reward,
  210,000 blocks per halving, 144 blocks per day);
- inputs the text names itself, with their date (the price of 74,000 $,
  the ETF flows, the cycle highs and lows, the scenarios of the closing
  sections). They
  are Timur's inputs as of 13/14 November 2026; this script does not update
  them, it only checks what the text derives from them.

Every number in the text is asserted in both languages. Where the text
deliberately deviates from the computed value (rounding, an input it
chose), the deviation is a NAMED EXCEPTION below, with its reason, and the
script checks that it stays within the stated bound. Anything else that
differs fails.

    python3 -B tests/articles/bitcoin_security_budget.py
"""

import math
import re
import sys
from datetime import date
from itertools import permutations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DE = ROOT / "src/content/blog/de/bitcoin-was-in-den-naechsten-jahrzehnten-entschieden-wird.md"
EN = ROOT / "src/content/blog/en/bitcoin-what-gets-decided-in-the-coming-decades.md"
# Optional: --de <file> --en <file> (to prove the checks fail on a changed copy).
_args = sys.argv[1:]
if "--de" in _args:
    DE = Path(_args[_args.index("--de") + 1])
if "--en" in _args:
    EN = Path(_args[_args.index("--en") + 1])

# ---- consensus parameters -------------------------------------------------
INITIAL_REWARD = 50.0
HALVING_INTERVAL = 210_000
BLOCKS_PER_DAY = 144  # one block per ten minutes on average
CAP = 21_000_000


def reward(halvings: int) -> float:
    return INITIAL_REWARD / 2**halvings


def supply_at(height: int) -> float:
    """Coins issued up to (excluding) `height`."""
    total, h, n = 0.0, 0, 0
    while h < height and reward(n) > 0:
        step = min(HALVING_INTERVAL, height - h)
        total += step * reward(n)
        h += step
        n += 1
    return total


# Halvings: 2024 was the fourth (block 840,000), then every 210,000 blocks,
# about every four years (210,000 / 144 / 365.25 = 3.99 years).
YEARS = {"heute": 4, 2028: 5, 2032: 6, 2036: 7, 2040: 8}
assert abs(HALVING_INTERVAL / BLOCKS_PER_DAY / 365.25 - 4) < 0.02

# ---- the text's dated inputs ---------------------------------------------
PRICE = 74_000  # $ per BTC used for the budget table (text, Z. 15)
HEIGHT_NOV_2026 = 975_000  # about the block height on 13 Nov 2026 (840,000 + 144 × 937 days)
FEE_SHARE_PERCENT = 0.67  # CCAF, 90 days to 4 Oct 2026 (fact check, VERIFICATION)
TAIL = 0.5  # BTC per block in the tail-emission example
GOLD_GROWTH = (1.5, 2.0)  # percent of the stock mined per year
ETF_START_PRICE, ETF_PEAK_PRICE = 46_000, 126_000
OUTFLOW_BN, MARKET_CAP_BN = 6.38, 2_000
FALL_FROM, FALL_TO = 100_000, 60_000
CYCLES = {  # high, low in $ (text table "Die vier großen Zyklen")
    2011: (32, 2),
    2013: (1_150, 170),
    2017: (19_800, 3_200),
    2021: (69_000, 15_500),
}
SCENARIO = {"btc": 0.30, "btc_alt": 0.40, "btc_crash": 0.80, "etf_drawdown": 0.30}
HIGH_NOV_2026, BELOW_HIGH = 126_000, 0.46
TAPROOT = date(2021, 11, 14)  # activation, block 709,632
CTV_WINDOW_START = date(2026, 3, 30)
AS_OF = date(2026, 11, 13)  # "Stand 13./14. November 2026"

# ---- computations ---------------------------------------------------------
per_day = {y: reward(n) * BLOCKS_PER_DAY for y, n in YEARS.items()}
budget_m = {y: per_day[y] * PRICE / 1e6 for y in YEARS}
factor_2040 = per_day["heute"] / per_day[2040]
price_2040 = PRICE * factor_2040
supply_now = supply_at(HEIGHT_NOV_2026)
supply_2040 = supply_at(HALVING_INTERVAL * YEARS[2040])  # at the 2040 halving
cap_now_t = price_2040 * supply_now / 1e12
cap_2040_t = price_2040 * supply_2040 / 1e12
cagr = 2 ** (1 / 4) - 1
tail_day = TAIL * BLOCKS_PER_DAY
tail_year = tail_day * 365
tail_pct = tail_year / CAP * 100
gold_factor = min(GOLD_GROWTH) / tail_pct
etf_multiple = ETF_PEAK_PRICE / ETF_START_PRICE
outflow_pct = OUTFLOW_BN / MARKET_CAP_BN * 100
fall_pct = (1 - FALL_TO / FALL_FROM) * 100
drawdown = {y: (1 - lo / hi) * 100 for y, (hi, lo) in CYCLES.items()}
issuance_2020 = reward(3) * BLOCKS_PER_DAY
issuance_2024 = reward(4) * BLOCKS_PER_DAY
loss_30 = SCENARIO["btc"] * SCENARIO["btc_crash"]
loss_30_etf = loss_30 + (1 - SCENARIO["btc"]) * SCENARIO["etf_drawdown"]
loss_40_etf = SCENARIO["btc_alt"] * SCENARIO["btc_crash"] + (1 - SCENARIO["btc_alt"]) * SCENARIO["etf_drawdown"]
implied_price = HIGH_NOV_2026 * (1 - BELOW_HIGH)
taproot_years = (AS_OF - TAPROOT).days / 365.25
window_months = (AS_OF - CTV_WINDOW_START).days / (365.25 / 12)
# Four independent draws are strictly falling in 1 of 4! orders; four heads in 1 of 2^4.
falling_orders = sum(1 for p in permutations(range(4)) if list(p) == sorted(p, reverse=True))
p_falling = falling_orders / math.factorial(4)
p_heads = 1 / 2**4
# Report only, for the last paragraph of "Die vier Signale": how far
# Bitcoin falls before the share named there is reached ("rund zwei
# Drittel"), with the other part flat and 30 % down.
fall_to_15 = 1 - 0.15 * 0.70 / (0.30 * 0.85)
fall_to_15_etf = 1 - 0.15 * 0.70 * 0.70 / (0.30 * 0.85)

# ---- formatting -------------------------------------------------------------


def de(x: float, decimals: int = 0) -> str:
    s = f"{x:,.{decimals}f}"
    return s.replace(",", "_").replace(".", ",").replace("_", ".")


def en(x: float, decimals: int = 0) -> str:
    return f"{x:,.{decimals}f}"


def table(md: str, header_start: str) -> list[list[str]]:
    """Rows (cells stripped) of the Markdown table whose header starts with `header_start`."""
    lines = md.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("|") and line.strip("| ").startswith(header_start):
            rows = []
            for row in lines[i + 2 :]:
                if not row.startswith("|"):
                    break
                rows.append([c.strip() for c in row.strip().strip("|").split("|")])
            return rows
    raise AssertionError(f"table starting with {header_start!r} not found")


failures: list[str] = []
checks = 0


def expect(cond: bool, msg: str) -> None:
    global checks
    checks += 1
    if not cond:
        failures.append(msg)


def contains(md: str, lang: str, phrase: str) -> None:
    expect(phrase in md, f"[{lang}] missing: {phrase!r}")


texts = {"de": DE.read_text(encoding="utf-8"), "en": EN.read_text(encoding="utf-8")}
de_md, en_md = texts["de"], texts["en"]

# ---- the security budget ------------------------------------------------------
expect(reward(4) == 3.125 and per_day["heute"] == 450, "reward/day today")
contains(de_md, "de", f"aktuell {de(reward(4), 3)} BTC")
contains(en_md, "en", f"currently {en(reward(4), 3)} BTC")
contains(de_md, "de", f"{de(reward(4), 3)} BTC × {BLOCKS_PER_DAY} Blöcke pro Tag = {de(per_day['heute'])} BTC täglich")
contains(en_md, "en", f"{en(reward(4), 3)} BTC × {BLOCKS_PER_DAY} blocks per day = {en(per_day['heute'])} BTC daily")
contains(de_md, "de", f"Bei rund {de(PRICE)} Dollar sind das etwa {round(budget_m['heute'])} Millionen Dollar pro Tag")
contains(en_md, "en", f"At around {en(PRICE)} dollars, that is about {round(budget_m['heute'])} million dollars per day")
expect(FEE_SHARE_PERCENT < 1, "fee share below one percent")
contains(de_md, "de", "Gebühren machen davon derzeit nur unter einem Prozent aus")
contains(en_md, "en", "Fees currently make up only less than one percent of it")

# Table 1. NAMED EXCEPTION "Tabelle 1, BTC pro Tag": the text truncates
# 112.5, 56.25 and 28.125 to 112, 56 and 28 (Timur's rounding); the check
# allows a difference below 1 BTC and requires the truncated value.
for lang, md, head, fmt in (
    ("de", de_md, "Jahr", lambda m: f"~{round(m)} Mio. \\$"),
    ("en", en_md, "Year", lambda m: f"~\\${round(m)}M"),
):
    rows = table(md, head)
    expect(len(rows) == 5, f"[{lang}] table 1 has {len(rows)} rows")
    for row, (year, _) in zip(rows, YEARS.items(), strict=False):
        label = {"de": "heute", "en": "today"}[lang] if year == "heute" else str(year)
        expect(row[0] == label, f"[{lang}] table 1 row {row[0]} ≠ {label}")
        expect(row[1] == str(math.floor(per_day[year])), f"[{lang}] {label}: {row[1]} BTC ≠ {per_day[year]}")
        expect(row[2] == fmt(budget_m[year]), f"[{lang}] {label}: {row[2]} ≠ {fmt(budget_m[year])}")
    contains(md, lang, {"de": "(bei 74.000 \\$)", "en": "(at \\$74,000)"}[lang])

expect(factor_2040 == 16, "factor 16 by 2040")
contains(de_md, "de", "Versechzehnfachung")
contains(en_md, "en", "sixteenfold")
contains(de_md, "de", f"rund {de(price_2040 / 1e6, 2)} Millionen Dollar pro Coin")
contains(en_md, "en", f"around {en(price_2040 / 1e6, 2)} million dollars per coin")
# The market cap uses today's supply (~20.1 M): 23.8 T → "um 24 Billionen".
# Report only: with the 2040 supply (~20.9 M) it would be about 24.8 T.
expect(round(cap_now_t) == 24 and round(supply_now / 1e6, 1) == 20.1, f"market cap {cap_now_t:.1f} T")
contains(de_md, "de", f"Marktkapitalisierung um {round(cap_now_t)} Billionen Dollar")
contains(en_md, "en", f"market capitalisation of around {round(cap_now_t)} trillion dollars")
expect(round(cagr * 100) == 19, "19 percent per year")
contains(de_md, "de", f"Das sind {round(cagr * 100)} Prozent pro Jahr")
contains(en_md, "en", f"That is {round(cagr * 100)} percent per year")
contains(de_md, "de", "alle vier Jahre verdoppeln")
contains(en_md, "en", "double every four years")

# ---- tail emission ------------------------------------------------------------
# NAMED EXCEPTION "0,12 Prozent": 26,280 / 21 M = 0.1251 %; the text writes
# "etwa 0,12" (two decimals, truncated). Bound: within 0.01 percentage points.
expect(tail_day == 72 and tail_year == 26_280, "tail emission 72/day, 26,280/year")
expect(abs(tail_pct - 0.12) < 0.01, f"tail emission {tail_pct:.4f} %")
contains(de_md, "de", f"{de(TAIL, 1)} BTC pro Block wären {de(tail_day)} BTC täglich, rund {de(round(tail_year, -3))} im Jahr, also etwa 0,12 Prozent Inflation")
contains(en_md, "en", f"{en(TAIL, 1)} BTC per block would be {en(tail_day)} BTC daily, around {en(round(tail_year, -3))} a year, that is about 0.12 percent inflation")
contains(de_md, "de", "1,5 bis 2 Prozent des Bestands")
contains(en_md, "en", "1.5 to 2 percent of the stock")
expect(gold_factor > 10, f"gold factor {gold_factor:.1f}")  # 12 (16 at 2 %)
contains(de_md, "de", "mehr als zehnmal knapper als Gold")
contains(en_md, "en", "more than ten times scarcer than gold")
contains(de_md, "de", "geschätzt 3 bis 4 Millionen BTC")
contains(en_md, "en", "an estimated 3 to 4 million BTC")

# ---- governance and quantum ---------------------------------------------------
expect(4.9 < taproot_years < 5, f"Taproot {taproot_years:.3f} years before the text date")
contains(de_md, "de", "fast fünf Jahre keine Konsensänderung")
contains(en_md, "en", "almost five years without a consensus change")
expect(7 < window_months < 8, f"CTV window {window_months:.2f} months")
contains(de_md, "de", "über sieben Monate ins Fenster hinein")
contains(en_md, "en", "more than seven months into the window")
for lang, md, phrases in (
    ("de", de_md, ["seit 30.03.2026, Schwelle 90 %", "über 74.000 Transaktionen", "Im Juni 2025 unterzeichneten 66 Entwickler", "bei 66 unterzeichnenden", "rund 1,1 Millionen BTC", "zehn bis fünfzehn Jahren"]),
    ("en", en_md, ["since 30 March 2026, threshold 90%", "over 74,000 transactions", "In June 2025, 66 developers signed", "with 66 signing", "roughly 1.1 million BTC", "ten to fifteen years"]),
):
    for p in phrases:
        contains(md, lang, p)

# ---- the market side ------------------------------------------------------------
expect(round(etf_multiple, 1) == 2.7, f"ETF multiple {etf_multiple:.3f}")
contains(de_md, "de", f"bei etwa {de(ETF_START_PRICE)} Dollar, bis zum Hoch im Oktober 2025 bei über {de(ETF_PEAK_PRICE)} Dollar war das rund das {de(round(etf_multiple, 1), 1)}-Fache")
contains(en_md, "en", f"at about {en(ETF_START_PRICE)} dollars at the time; up to the peak in October 2025 at over {en(ETF_PEAK_PRICE)} dollars, that was roughly {en(round(etf_multiple, 1), 1)} times")
contains(de_md, "de", "Rekord bei rund 61 Milliarden Dollar")
contains(en_md, "en", "record of around 61 billion dollars")
expect(round(outflow_pct, 1) == 0.3, f"outflow {outflow_pct:.3f} %")
contains(de_md, "de", f"{de(OUTFLOW_BN, 2)} Milliarden Abfluss bei einer Marktkapitalisierung im Bereich von zwei Billionen Dollar sind etwa {de(round(outflow_pct, 1), 1)} Prozent")
contains(en_md, "en", f"{en(OUTFLOW_BN, 2)} billion of outflows at a market capitalisation in the region of two trillion dollars is about {en(round(outflow_pct, 1), 1)} percent")
contains(de_md, "de", f"von über {de(FALL_FROM)} auf nahezu {de(FALL_TO)} Dollar")
contains(en_md, "en", f"from over {en(FALL_FROM)} to nearly {en(FALL_TO)} dollars")
expect(round(fall_pct) == 40, "price fall 40 %")
for lang, md in (("de", de_md), ("en", en_md)):
    contains(md, lang, {"de": f"Der Kurs verlor dabei rund {round(fall_pct)} Prozent", "en": f"The price lost around {round(fall_pct)} percent"}[lang])
    contains(md, lang, {"de": f"die {de(OUTFLOW_BN, 2)} Milliarden nicht die alleinige Ursache für die {round(fall_pct)} Prozent", "en": f"the {en(OUTFLOW_BN, 2)} billion was not the sole cause of the {round(fall_pct)} percent"}[lang])
    contains(md, lang, {"de": "um etwa fünf Dollar", "en": "by about five dollars"}[lang])

# ---- the four cycles ---------------------------------------------------------------
# NAMED EXCEPTION "Drawdowns": the table rounds the computed drawdowns of its
# own rounded highs and lows (93.75, 85.2, 83.8, 77.5 %) to 93, 85, 84 and
# 77. The text's values must lie within one percentage point (brief R6 §2.6).
for lang, md, head, money, years in (
    ("de", de_md, "Zyklus", lambda v: f"~{de(v)} \\$", {1.5: "~1,5 Jahre", 3: "~3 Jahre", 2.3: "~2,3 Jahre"}),
    ("en", en_md, "Cycle", lambda v: f"~\\${en(v)}", {1.5: "~1.5 years", 3: "~3 years", 2.3: "~2.3 years"}),
):
    rows = table(md, head)
    expect(len(rows) == 4, f"[{lang}] cycle table has {len(rows)} rows")
    shown = []
    for row, (year, (hi, lo)) in zip(rows, CYCLES.items(), strict=False):
        expect(row[0] == str(year), f"[{lang}] cycle {row[0]}")
        expect(row[1].startswith(money(hi)), f"[{lang}] {year} high {row[1]}")
        expect(row[2].startswith(money(lo)), f"[{lang}] {year} low {row[2]}")
        m = re.match(r"−(\d+) ?%", row[3])
        expect(m is not None, f"[{lang}] {year} drawdown cell {row[3]!r}")
        value = int(m.group(1)) if m else -1
        shown.append(value)
        expect(abs(value - drawdown[year]) < 1, f"[{lang}] {year} drawdown {value} vs {drawdown[year]:.2f}")
    expect([r[4] for r in rows] == list(years.values())[:1] + [years[3], years[3], years[2.3]], f"[{lang}] years to the next peak")
    contains(md, lang, " → ".join(map(str, shown)))
    contains(md, lang, {"de": "für −93 Prozent reichte", "en": "was enough for −93 percent"}[lang])
    contains(md, lang, {"de": f"Bitcoin verlor rund {shown[3]} Prozent", "en": f"Bitcoin lost around {shown[3]} percent"}[lang])
expect(p_heads == 1 / 16, "four heads: 1 in 16")
contains(de_md, "de", "in einem von sechzehn Fällen")
contains(en_md, "en", "in one case out of sixteen")
# Report only (not changed): four falling values among four independent
# draws have probability 1/24, not 1/16; the coin comparison is the text's.
expect(abs(p_falling - 1 / 24) < 1e-12, "four strictly falling draws: 1 in 24")
expect(issuance_2020 == 900 and issuance_2024 == 450, "halving 2024: 900 → 450")
contains(de_md, "de", "von 900 auf 450 BTC")
contains(en_md, "en", "from 900 to 450 BTC")

# ---- "Was ich daraus ableite" and "Die vier Signale" -------------------------------
expect(round(loss_30 * 100) == 24 and round(loss_30_etf * 100) == 45 and round(loss_40_etf * 100) == 50, "scenarios")
contains(de_md, "de", f"Bei 30 Prozent Bitcoin und einem 80-Prozent-Crash verliert man {round(loss_30 * 100)} Prozent")
contains(en_md, "en", f"With 30 percent Bitcoin and an 80 percent crash, you lose {round(loss_30 * 100)} percent")
contains(de_md, "de", f"sind es rund {round(loss_30_etf * 100)} Prozent. Bei 40 Prozent Bitcoin wären es etwa {round(loss_40_etf * 100)}")
contains(en_md, "en", f"it is around {round(loss_30_etf * 100)} percent. With 40 percent Bitcoin it would be about {round(loss_40_etf * 100)}")
contains(de_md, "de", "70 Prozent Welt-ETF, 30 Prozent Bitcoin")
contains(en_md, "en", "70 percent world ETF, 30 percent Bitcoin")
contains(de_md, "de", "Zielquote von 30 auf 20 Prozent senken")
contains(en_md, "en", "lower the target allocation from 30 to 20 percent")
contains(de_md, "de", "auf 10 Prozent senken")
contains(en_md, "en", "lower it to 10 percent")
# Report only: the computed fall lies between 0.58 and 0.72; the text says
# "rund zwei Drittel".
expect(0.58 < fall_to_15 < 0.6 and 0.7 < fall_to_15_etf < 0.72, f"15 % rule {fall_to_15:.3f}/{fall_to_15_etf:.3f}")
contains(de_md, "de", "Krypto-Anteil unter 15 Prozent")
contains(en_md, "en", "crypto share is below 15 percent")
expect(reward(6) == 0.78125 and reward(6) > 0.78, "reward from 2032")
contains(de_md, "de", "bis 2032 noch über 0,78 BTC pro Block")
contains(en_md, "en", "above 0.78 BTC per block until 2032")

# ---- status ------------------------------------------------------------------------
# NAMED EXCEPTION "Preis": the budget table uses 74,000 $ (Timur's input);
# the status paragraph says "unter 70.000 Dollar, rund 46 Prozent unter dem
# Hoch von 126.000", which implies about 68,000 $. Both are Timur's inputs;
# the script only checks that the 46 % and the "unter 70.000" agree.
expect(implied_price < 70_000, f"46 % below 126,000 = {implied_price:.0f}")
contains(de_md, "de", f"unter {de(70_000)} Dollar, rund {round(BELOW_HIGH * 100)} Prozent unter dem Hoch von {de(HIGH_NOV_2026)} Dollar")
contains(en_md, "en", f"below {en(70_000)} dollars, around {round(BELOW_HIGH * 100)} percent below the October 2025 peak of {en(HIGH_NOV_2026)} dollars")
contains(de_md, "de", "stand bei 20, also extreme Angst")
contains(en_md, "en", "stood at 20, that is extreme fear")
contains(de_md, "de", "1,56 Milliarden Dollar Nettoabfluss")
contains(en_md, "en", "1.56 billion dollars of net outflows")
contains(de_md, "de", "mit rund 88 Prozent Wahrscheinlichkeit")
contains(en_md, "en", "with a probability of around 88 percent")

if failures:
    print(f"✗ bitcoin_security_budget: {len(failures)} of {checks} checks failed", file=sys.stderr)
    for f in failures:
        print(f"  - {f}", file=sys.stderr)
    sys.exit(1)

print(
    f"✓ bitcoin_security_budget: {checks} checks in DE + EN. "
    f"Budget today {budget_m['heute']:.2f} M$/day; 2040 price {price_2040:,.0f} $, "
    f"cap {cap_now_t:.2f} T$ (2040 supply: {cap_2040_t:.2f} T$); CAGR {cagr * 100:.2f} %; "
    f"tail {tail_pct:.4f} %/year, gold factor {gold_factor:.1f}; ETF ×{etf_multiple:.3f}, "
    f"outflow {outflow_pct:.3f} % (at 1.2–2.0 T$: {OUTFLOW_BN / 2000 * 100:.2f}–{OUTFLOW_BN / 1200 * 100:.2f} %); "
    f"drawdowns {', '.join(f'{drawdown[y]:.2f}' for y in CYCLES)} %; "
    f"P(4 falling) = 1/{round(1 / p_falling)}, P(4 heads) = 1/{round(1 / p_heads)}; "
    f"46 % below 126k = {implied_price:,.0f} $"
)
