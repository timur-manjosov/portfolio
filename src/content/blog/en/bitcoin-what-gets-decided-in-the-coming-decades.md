---
title: "Bitcoin: what gets decided in the coming decades"
description: "Bitcoin's open design questions: the security budget after the block reward, governance without a decision process, the quantum question and the market side."
date: 2026-11-18
category: opinion
tags: [bitcoin, security-budget, governance, quantum-computing, game-theory]
draft: false
translationKey: bitcoin-coming-decades
status: draft-review
---

<!-- Translation of Timur's German text (prompts/bitcoin-artikel-quelle.md),
same structure, numbers and corrections as the German post; to be read by
Timur (CONTENT-TODO.md). Every number is recomputed by
tests/articles/bitcoin_security_budget.py. Literal dollar signs are written
as \$ so that remark-math does not read them as a formula. -->

Bitcoin has two unresolved design questions that become acute from the 2030s on: how its security is paid for once the block reward runs out, and whether a network without a decision-making process can make a decision at all. This text collects what I have understood about them, and what follows from that for a position of my own.

## Where the value comes from

Bitcoin is a shared ledger without a bookkeeper. Thousands of computers hold the same list of all transactions, a block is added every ten minutes, and who gets to append it is decided by proof of work: a computational puzzle that can only be solved by trial and error. That costs electricity, and that is exactly where the protection lies. Forging the past would mean redoing all the computational work since then.

Everyone knows the cap of 21 million. More important is the mechanism behind it: every four years the reward per block halves, currently 3.125 BTC. The supply follows a schedule that was fixed in 2009 and responds to nothing – not to demand, not to the price, not to crises.

On the question of where the value comes from, people almost always cheat. Two common answers do not hold up:

Scarcity alone does not create value. I can create a file of which only one copy exists. It is worthless. Scarcity is a necessary condition, not a sufficient one.

Electricity consumption does not create value either. Here the causality runs exactly the opposite way: because bitcoin has a price, mining pays, and that is why electricity is consumed. Not the other way round. You can watch it in real time when the price falls: the hashprice drops, miners drop out, the difficulty adjusts. Production costs follow the price, they do not determine it.

What remains is a Schelling point. The concept comes from Thomas Schelling (1960): if two people want to meet in a city without being able to arrange it, both go to the main station – not because it is objectively the best place, but because both know that the other thinks the same. Bitcoin is valuable because sufficiently many people expect sufficiently many others to consider it valuable. A self-sustaining equilibrium, not grounded in cash flows.

That is not an argument against it. Gold has worked on the same principle for millennia, and so has paper money. But it is the argument for why the price has no floor. There is no earning power, no book value, no point at which one could say: objectively too cheap. Equilibria of this kind are stable until they are not, and then there is nothing to slow the fall.

## The security budget

This is the sorest spot in the design, and the white paper deals with it in a single sentence.

Miners have two sources of income: the block reward and transaction fees. Together they form the security budget. It determines how expensive an attack on the network would be.

Today: 3.125 BTC × 144 blocks per day = 450 BTC daily. At around 74,000 dollars, that is about 33 million dollars per day. Fees currently make up only less than one percent of it.

The reward keeps halving:

Table: Block reward per day and security budget after the next halvings

| Year  | BTC per day | Budget per day (at \$74,000) |
| ----- | ----------: | ---------------------------: |
| today |         450 |                   ~\$33M |
| 2028  |         225 |                   ~\$17M |
| 2032  |         112 |                    ~\$8M |
| 2036  |          56 |                    ~\$4M |
| 2040  |          28 |                    ~\$2M |

This leads to an uncomfortable condition: for the security budget in dollars merely to stay constant, the bitcoin price would have to double every four years. By 2040 that would be a sixteenfold increase, around 1.18 million dollars per coin and a market capitalisation of around 24 trillion dollars – roughly the order of magnitude of the entire gold market. That is 19 percent per year, permanently, forever. Mathematically impossible, because every quantity eventually runs into the world economy.

A common misunderstanding needs correcting here: mining never becomes unprofitable because of this. The difficulty adjusts every two weeks. If profitability falls, miners drop out, the difficulty falls, and for those who remain it pays again. What breaks away is not the operation but the absolute size of the sum an attacker would have to outbid.

So at some point fees have to take over. And here comes the contradiction that makes the problem hard in the first place: Bitcoin's block size is limited, about seven transactions per second. High fees only arise when many compete for this scarce space. The solution to Bitcoin's scaling problem is called Lightning, a second layer that settles transactions outside the blockchain. Precisely this lowers the demand for block space, and with it the fees.

So what makes Bitcoin usable undermines what secures Bitcoin. That is not a side issue but a structural trade-off in the design.

Two papers on this, both disputed, but neither an outsider position: Carlsten et al. (2016), On the Instability of Bitcoin Without the Block Reward, show that in a pure fee regime new attack strategies become profitable. The problem there is not only the size of the budget but its variance: with a constant reward, honest mining always pays; with purely fee-based income there are fat and lean blocks, and that changes the incentives. Budish (2018), The Economic Limits of Bitcoin and the Blockchain, argues that the running costs of security must stand in proportion to the value secured: the more valuable Bitcoin becomes, the more expensive its protection must be, permanently.

## The ways out and their price

There are exactly seven options that are seriously discussed. None of them is painless.

### 1. Do nothing and hope for fees

The status quo and, in effect, the answer so far. The bet is that block space becomes scarce enough.

### 2. Tail emission

A permanent residual reward that never falls to zero. Peter Todd proposed it publicly in 2022; the reaction was devastating.

Technically it is tiny and proven: Monero has been doing it for years. The order of magnitude would be ridiculously small. A fixed reward of 0.5 BTC per block would be 72 BTC daily, around 26,000 a year, that is about 0.12 percent inflation per year relative to 21 million – and falling. Annual gold mining amounts to 1.5 to 2 percent of the stock. So the idea would be more than ten times scarcer than gold and still permanently and securely funded.

Economically the argument is even stronger than fees. Network security is a public good from which every holder benefits, even those who never make a transaction. Fees are paid only by those who transact – the coins in the vault benefit for free. A tail emission spreads the costs through dilution across all holders, in proportion to their holdings. Whoever has the benefit bears the cost.

Why it will not happen anyway: the value of the 21 million does not lie in the number but in the fact that it is not negotiable. Change it once, and you have proven that it was negotiable. From then on the question is no longer whether but how much, and it is asked again in every cycle. In game-theoretic terms this is a textbook case of the time inconsistency of optimal plans (Kydland/Prescott 1977, Nobel Prize 2004): a rule only takes effect if it cannot be broken. As soon as it is known that the authority will intervene after all, everyone involved changes their behaviour in anticipation – and the rule loses its force before it is broken. That is exactly why central banks were made independent, and that is exactly Bitcoin's business model.

### 3. Coin recycling

Inactive coins returned to circulation after a long period, as a reward for miners. Formally the 21 million stay in place, and an estimated 3 to 4 million BTC are considered irretrievably lost. Politically this is easier to sell, because it can be told as a completion rather than a break.

It fails at a point that cannot be circumvented: there is no way to tell lost from patient. The protocol only sees that an address has not moved. A cold-storage holder who does not touch anything for twenty years behaves exactly like someone whose keys are in the rubbish – and that is precisely the exemplary behaviour Bitcoin culture has always preached. The consequence would be a compulsory proof of life: “your coins belong to you forever” would become “your coins belong to you as long as you check in”. On top of that comes the deadline dilemma: a short deadline yields enough coins and catches genuine holders by the dozen, a long deadline hits almost only truly lost coins and frees nothing until into the 2030s – that is, precisely not when the problem becomes acute.

Economically it is the same as a tail emission anyway, only with an unfair distribution: not everyone is diluted equally, the inattentive are expropriated.

### 4. Limit or lower the block size

Less space means more competition and higher fees, without breaking a rule. Makes Bitcoin useless for small amounts, and block size debates already led to a split once, in 2017.

### 5. Create demand for block space – covenants

Instead of making supply scarcer, increase demand. Covenants are rules that determine not only who may spend, but where the coins may go afterwards. With them, layer-2 constructions can be built in which many users share one on-chain entry and each can still exit alone at any time, without trusting anyone. More users mean more entries and exits, and each of them pays fees.

This is the only option that breaks no promise. No new coins, no interference with other people's property, no change to monetary policy. That is why the covenant dispute matters more than it looks from the outside.

### 6. Assisted merged mining

Other projects pay Bitcoin miners so that the same computational work also secures their chains. Additional income without a protocol change, already works on a small scale. The catch: Bitcoin's security would then partly depend on the success of other projects, and it favours large professional operators. Realistically a supplement, not a replacement.

### 7. Accept that the budget shrinks relatively

The thesis: an attack does not have to be unaffordable, only unprofitable. Specialised hardware cannot be rented, and whoever attacks destroys the value of what they have just captured. No change needed, just a different risk assessment. Plausible, but unproven.

The common thread: every solution throws some promise overboard – either the fixed cap, or the inviolability of other people's coins, or the affordability of use. There is no way out that keeps all three. That is not a lack of creativity; it is built into the design.

## The governance problem

Bitcoin has no procedure for deciding. That is intentional, because a decision-making body would be a point of attack. The price is that a change needs roughly unanimity among developers, miners, exchanges and users. That works excellently for preventing changes. It works badly when a change becomes necessary.

Since Taproot in November 2021, Bitcoin has gone almost five years without a consensus change.

The state of the covenant debate is the most telling data point there is at the moment:

Table: State of the covenant proposals in November 2026

| Proposal         | Status (Nov. 2026)                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| CTV + CSFS       | Activation client (CTV only) since 30 March 2026, threshold 90% of miners, window until March 2027, signalling at 0% |
| OP_CAT (BIP-347) | Specification complete since March 2026, over 74,000 transactions on the test network, no activation parameters for mainnet |
| BIP-110          | Soft-fork attempt failed in August 2026 for lack of miner support                                                     |

In June 2025, 66 developers signed an open letter for CTV and CSFS. The miners are nonetheless signalling zero percent, more than seven months into the window. Zero percent with 66 signing developers – that is no longer a technical question.

Behind this are two camps. The ossification position says Bitcoin should freeze, every change being an attack vector. Represented by the Knots side and by Michael Saylor, who calls well-funded developers the greatest danger to the protocol. The evolution position counters: a protocol that can neither defend itself against existential threats nor enable its own scaling does not harden into resilience but into irrelevance.

There are three more positions that are mentioned less often: voluntariness (new features optional, nobody is forced – does not solve the problem, because the coins of those who do nothing remain vulnerable), layer separation (the base layer deliberately freezes, innovation moves to layer 2 – in effect what is happening right now, without anyone having decided it) and a market decision through a fork (as in 2017 with Bitcoin Cash – but every split weakens the Schelling point that is the basis of the value).

The uncomfortable thing about the situation: the holders' intransigence is not irrational in game-theoretic terms. For the individual holder it is the dominant strategy – they benefit from everyone else staying firm, and weaken their own position if they signal flexibility. Everyone acts individually optimally. The result is nonetheless collectively bad: the network cannot act when it would have to. That is a coordination failure, not a stupidity problem. Against stupidity, education helps; against this incentive structure nothing helps – except the situation becoming dramatic enough that the calculation tips for the individual.

And then the irony: the network would probably only break the rule once it hurts, and then under the worst possible conditions.

A new factor that did not exist before: in a split, someone would have to decide which chain is “Bitcoin”. In the past, that was exchanges and users. Today BlackRock, Fidelity and the other ETF issuers join them, who manage holdings worth billions and have legal obligations towards investors, but no ideological ones towards the protocol. That is a quiet shift of power in Bitcoin's governance that has never been tested.

## The quantum question

Bitcoin signs transactions with ECDSA on the curve secp256k1. A sufficiently powerful quantum computer could use Shor's algorithm to compute the private key from the public one. The German BSI (Federal Office for Information Security) expects ten to fifteen years until a cryptographically relevant quantum computer. Today no machine exists that would be even remotely capable of it.

The debate nevertheless became concrete in 2026. In February, BIP-360 was added, a quantum-resistant address type. In April, BIP-361 by Jameson Lopp and five other developers followed, with a mandatory migration path.

And this is where it gets explosive: BIP-361 provides for eventually freezing quantum-vulnerable coins that remain unmoved. Changpeng Zhao proposed in June 2026 to do exactly that with Satoshi Nakamoto's roughly 1.1 million BTC.

Bitcoin was built on the promise that nobody can touch your coins without your private key. No government, no bank. For the first time in sixteen years, the developer community itself is calling this promise into question – for security reasons. Adam Back opposes this and argues for voluntary upgrades instead of forced decommissioning.

The dilemma has no third exit:

- Doing nothing means an attacker can take the coins. That would prove that “not your keys, not your coins” only holds as long as the mathematics holds. Moreover, supply that has been considered lost for sixteen years would come onto the market.
- Freezing means the network proves that it can very well decide who owns its coins. Exactly what Bitcoin was never supposed to be able to do.

Whatever is chosen, a fundamental promise falls. That is not a technical decision but a value decision about property.

## How others solve it and what it costs them

Monero solved exactly this problem by building in a fixed residual reward per block that never falls to zero. The security budget is permanently funded, without depending on rising fees or rising prices. In addition, Monero uses a mining algorithm for ordinary processors instead of specialised hardware, so the computing power is more widely distributed. And the community has changed its consensus mechanism several times as planned – the ability to act is proven there, not hoped for.

The price: no cap, and so no scarcity narrative. And from 10 July 2027, Article 79 of the EU Anti-Money Laundering Regulation prohibits all EU service providers from listing, trading or holding anonymising crypto-assets in custody. Private ownership remains legal; regulated access disappears.

Monero thus shows something important: the technically best design does not win automatically. It has the cleanest solution, has worked for years, and is nonetheless being pushed out of the regulated market because another property is politically undesirable. Survivability is not decided by the code.

Ethereum solves it structurally differently. Proof of stake pays for security not through external electricity consumption but through capital deposited in the system itself. Whoever cheats loses their stake. The budget thus scales automatically with the value of the network instead of shrinking, decoupled from it. In addition, a post-quantum roadmap: Lean Ethereum, presented in July 2026 by Vitalik Buterin and earlier by Justin Drake, aims at a complete post-quantum infrastructure by the end of 2029 through about seven hard forks.

The price: no cap and thus permanent dilution of indeterminate size. Strong stake concentration among a few large providers. And a problem that mirrors Bitcoin's: the rollups pull activity and thus fees away from the base layer, which is why Ethereum has become inflationary again. What happens to Bitcoin with Lightning happens to Ethereum with rollups.

Moreover, the flexibility cuts both ways: a foundation and a few client teams can fundamentally rebuild the protocol. That is the ability to act and at the same time a point of attack. Whoever can coordinate can be put under pressure.

The pattern behind it, and it applies everywhere:

Table: What the designs solve and what they create in return

|          | solves                  | creates                                         |
| -------- | ----------------------- | ----------------------------------------------- |
| Bitcoin  | credible scarcity       | security funding from the 2030s                 |
| Ethereum | security funding        | unlimited issuance, stake concentration         |
| Monero   | both, cleanly           | no scarcity narrative, regulatory exclusion     |
| Solana   | speed, usage            | validator concentration, outage history         |

These are not teething troubles that will grow out. They are trade-offs. You cannot have an immutable monetary policy and permanently funded security at the same time. And the faster and more flexible a protocol is, the more centralised it is. Bitcoin is slow and rigid because nobody coordinates.

Bitcoin's greatest strength, its immutability, is its greatest weakness here. Ethereum was able to replace its consensus mechanism completely. Bitcoin cannot do that without breaking precisely the promise its value rests on.

## The market side

Next to the design question there is a second, completely different one: how does Bitcoin behave when institutional capital flows not in but out?

The US spot bitcoin ETFs started on 11 January 2024. Bitcoin stood at about 46,000 dollars at the time; up to the peak in October 2025 at over 126,000 dollars, that was roughly 2.7 times. Cumulative net inflows reached their record of around 61 billion dollars in October 2025 – exactly in the month in which the price also marked its peak.

The decisive data point lies in the period after. Between November 2025 and February 2026, investors pulled 6.38 billion dollars out of the ETFs. In the same period, Bitcoin fell from over 100,000 to nearly 60,000 dollars.

Do the maths: 6.38 billion of outflows at a market capitalisation in the region of two trillion dollars is about 0.3 percent of the market capitalisation. The price lost around 40 percent in the process.

Behind this is the Inelastic Markets Hypothesis by Gabaix and Koijen (2021). Their finding for stock markets: one dollar flowing into the market moves the market capitalisation by about five dollars. The reason is that most holders will not sell their shares at any price. Only a tiny part of the stock is available at all, and the marginal buyer sets the price for everyone.

With Bitcoin the effect is stronger, for a structural reason: there is no supply response. When a stock rises, the company can issue new shares and cushion the pressure. Bitcoin cannot. The issuance is fixed, no matter what the price does.

Two honest caveats. First, the 6.38 billion was not the sole cause of the 40 percent – outflows and falling prices reinforced each other; no clean function can be derived from that. Second, the multiplier is probably smaller on the way up than on the way down: every rise lures out sellers who have been waiting for a higher level, while when prices fall, buyers disappear and the order book thins out.

### Why the thesis “institutions stabilise” does not hold

Institutional investors are not diamond hands. They have risk budgets, mandates and superiors. When a position runs against a limit, it is sold, regardless of conviction. A private investor can sit it out, a fund manager cannot. Add to that the asymmetry of his incentives: being right about Bitcoin brings him little, being wrong costs him his job. That is a classic principal–agent problem and leads to herd behaviour.

The ETFs cut both ways. What flows in with two clicks flows out again with two clicks. And a considerable part of the institutional demand was never conviction but a basis trade: hedge funds buy the spot ETF and at the same time sell the future to pocket the price difference. This capital has no opinion about Bitcoin and disappears, insensitive to price, as soon as the trade no longer pays.

The decisive point: we have zero observations of a complete institutional down cycle. The four big cycles were crises in a market without institutional capital. The ETF inflow was the first big institutional cycle – and only its upward leg. So for this question, the calculation with n = 4 is not even n = 4, but n = 0.

## Why four cycles prove nothing

Since 2011, Bitcoin has gone through four big cycles:

Table: The four big cycles since 2011

| Cycle | Peak               | Trough                 | Drawdown | To the next peak |
| ----- | ------------------ | ---------------------- | -------: | ---------------- |
| 2011  | ~\$32 (June)       | ~\$2 (Nov.)            |     −93% | ~1.5 years       |
| 2013  | ~\$1,150 (Dec.)    | ~\$170 (Jan. 2015)     |     −85% | ~3 years         |
| 2017  | ~\$19,800 (Dec.)   | ~\$3,200 (Dec. 2018)   |     −84% | ~3 years         |
| 2021  | ~\$69,000 (Nov.)   | ~\$15,500 (Nov. 2022)  |     −77% | ~2.3 years       |

In 2011 the market was so small that a hack at Mt. Gox was enough for −93 percent. 2013 ended with the collapse of Mt. Gox. 2017 was the ICO frenzy and burst without a single triggering event. 2021 was the first cycle with institutions and leveraged loans and ended as a chain reaction: Terra/Luna, Celsius, Three Arrows Capital, FTX.

The drawdowns are getting smaller: 93 → 85 → 84 → 77. That looks like maturing. With four points, it may just as well be chance. Rolling four descending numbers is not unusual. When a coin lands heads four times, you do not conclude it is rigged either – that happens with a fair coin in one case out of sixteen.

Worse still: the four cycles are not independent of one another, and each had a different cause – exchange hack, exchange collapse, bubble bursting, credit cascade. From four different mechanisms, no fifth can be predicted. And each took place under completely different conditions: 2013 without institutional participation, 2018 without ETFs, 2022 without pension funds.

The four-year cycle contradicts itself. The narrative goes: the halving makes supply scarcer, therefore the price rises. Except that the halving has been fixed in the protocol since 2009; everyone knows the date to the block. In a market that is even halfway efficient, a fully known, deterministic event cannot systematically lead to later price gains – it would long since have been priced in. The thesis claims that the market overlooks, every single time, something that is in every textbook.

The order of magnitude speaks against it too. At the 2024 halving, daily new supply fell from 900 to 450 BTC. With a trading volume in the billions, that is a small contribution. That the ETF inflows were running in 2024 and 2025 is a far more obvious explanation.

What you see instead are liquidity cycles. So far Bitcoin has behaved like a risk asset at the far end of the scale: when interest rates fall and money flows into the market, it rises disproportionately, and vice versa. That these cycles ran roughly in a four-year rhythm is a property of monetary policy, not of the Bitcoin protocol.

And that leads to a point that matters more to me than the cycle debate: Bitcoin has lived its entire history in an exceptional phase. The years 2009 to 2021 – zero interest rates, partly negative rates, massive bond purchases – were historically unique. The normal state from the 1990s to 2007 was policy rates between 3 and 6 percent. Bitcoin's big rises fell in times of extremely cheap money.

There was one test: 2022, the fastest interest-rate turnaround in history. Bitcoin lost around 77 percent, together with tech stocks, only more strongly. The result was clear – Bitcoin behaved like a risk asset, not like digital gold. What is still missing is a persistently higher interest-rate level over years. Whether Bitcoin finds a role in a world with 3 to 4 percent real interest rates is open.

For comparison, so that the order of magnitude becomes clear: the stock market has over a century of data, world wars, hyperinflation, depressions – and even there the sentence “stocks always rise in the long run” is open to challenge. Russian and Chinese stocks became worthless in the first half of the 20th century, and the Nikkei took more than 30 years from its 1989 peak to a new high. If such cases exist even with a hundred years of data, four Bitcoin cycles are simply nothing.

## What I conclude from this

The honest answer to the question of which cryptocurrency does not have these problems is: none. Every design solves something by creating something else. The search for the coin without an open question is the wrong search – and every month of searching costs spread, tax deadlines and attention.

That is why the right answer to “all options have unresolved questions” is not to keep searching, but to choose the position size so that the uncertainty does not knock you over.

My allocation is 70 percent world ETF, 30 percent Bitcoin. The reasoning behind it:

The ETF has a mechanism: companies earn profits, and you get a share of them. That works even when nobody is watching. Bitcoin does not have this mechanism. It works as long as enough people believe that it works. So the larger part sits on what has an explanatory reason, the smaller part on what is a bet.

The number 30 is not arbitrary. With 30 percent Bitcoin and an 80 percent crash, you lose 24 percent of the total portfolio from crypto alone. If, as usually happens, an ETF drawdown comes on top, it is around 45 percent. With 40 percent Bitcoin it would be about 50. The only robust test is: could I cope with 30 percent of my wealth being gone for good? This question needs no assumption about cycles.

Steering is done through band rebalancing, not through market assessment. The crypto share of the total portfolio decides how much fresh money goes where. If Bitcoin falls, the share drops, and the savings rate automatically steps up. If it rises sharply, crypto buying pauses. The rule set never asks whether the price is cheap – for an asset without a valuation anchor that question cannot be answered anyway.

One point that matters to me: rebalancing is done only with fresh money, never by selling the ETF. The rebalancing mathematics would demand both. The diversification return is approximately $\frac{1}{2} \times \bigl(\sum w_i \sigma_i^2 - \sigma_p^2\bigr) %% one half times, in parentheses: the sum of w i times sigma i squared, minus sigma p squared$ and is considerable with high volatility and low correlation. But it assumes that both parts have a positive expected value and that neither can permanently go to zero. For the world ETF that is plausible, for a single asset without a cash-flow anchor it is open. Selling ETF units to buy more Bitcoin would mean systematically selling the working part to feed the possibly broken one.

And the formula only knows weights anyway, not where the money comes from. As long as the monthly savings rate is large relative to the portfolio, fresh money restores the target allocation just as well as a sale – only without a transaction, without a tax event and without a decision that has to be made anew every time.

Two things I have learned over the last few weeks that are worth more than any analysis:

Changing theses is expensive. Every switch costs spread, restarts the 12-month holding period and, in a coin swap, creates a taxable private sale under § 23 EStG (the German Income Tax Act). With small amounts that is cheap, with larger ones it is not. The more individual decisions you have, the more opportunities there are to take a wrong turn.

Digging deep always produces a negative picture. Whoever spends two days dissecting only the weaknesses of an asset ends up considering every alternative better – not because it is, but because you have not looked there just as closely. That is an availability effect. The consequence is not to drop the analysis, but to make no decision on the day after.

## The four signals

The questions in this text are not answered by more thinking but by observation over years. That is why I have translated them into four measurable signals that I check once a year – always in January, deliberately independent of the price trend and never in a phase of sharply falling prices. Otherwise you find arguments for a bad price that existed before as well.

Table: The four signals, checked once a year

| Signal                  | What is measured                                                  | Red if                                                     |
| ----------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Ability to act          | Any activated consensus change since Taproot (Nov. 2021)?         | none by 2034 (by 2030: warning sign)                       |
| Fee share               | Share of fees in miner revenue, moving annual average             | below 10% in 2032 (above 20% = green)                      |
| Quantum response        | Does a migration path come, and without a chain split?            | debate without a result                                    |
| Hashrate concentration  | Distribution across pools and jurisdictions                       | top 3 pools above 50% or concentration with state-affiliated operators |

Sources for this: the Bitcoin Improvement Proposals on GitHub, mempool.space, Glassnode or Coin Metrics for the fee share, the Cambridge Mining Map for the geographical distribution.

The consequence is fixed in advance so that it is not negotiated in a moment of emotion:

- 0 to 1 red: thesis holds, continue by the rule set
- 2 red: lower the target allocation from 30 to 20 percent
- 3 red: lower it to 10 percent
- 4 red: close the position

Lowering is done via the savings rate, not via sales. And the finding is noted every year with a date, one sentence per signal – without a record, in 2032 you remember that it “was always bad”, and that is then a memory constructed after the fact.

On the time frame, so that expectations are right: until about 2030, no robust development is to be expected. The reward stays above 0.78 BTC per block until 2032, the budget is comfortable. The check becomes seriously relevant from 2032 to 2036. The next concrete data point is the CTV activation window, which runs until March 2027.

One caveat I keep in mind: the signals measure whether Bitcoin is viable in the long term. They do not measure how the price develops. These two things can diverge for years. It is even conceivable that precisely the decision that would convince me – a tail emission, for instance – makes the price collapse, because non-negotiability is the reason many hold.

And the point that in the end decides more than any analysis: the rule set prescribes putting the full savings rate into Bitcoin when the crypto share is below 15 percent. That would be the moment when Bitcoin has lost around two thirds and the headlines read “Bitcoin is dead”. Whether you hold out then decides more about the result than anything written here.

## Status and sources

Market data in this text: as of 13/14 November 2026. Bitcoin was trading below 70,000 dollars, around 46 percent below the October 2025 peak of 126,000 dollars. The Fear and Greed Index stood at 20, that is extreme fear. The US spot bitcoin ETFs were at 1.56 billion dollars of net outflows for the year 2026. The market is pricing in a Fed rate hike for 9 December with a probability of around 88 percent. Price data age quickly – the arguments of this text do not depend on them.

### Literature

- Carlsten, Kalodner, Weinberg, Narayanan (2016): [On the Instability of Bitcoin Without the Block Reward](https://www.cs.princeton.edu/~arvindn/publications/mining_CCS.pdf)
- Budish (2018): [The Economic Limits of Bitcoin and the Blockchain](https://www.nber.org/papers/w24717)
- Gabaix, Koijen (2021): [In Search of the Origins of Financial Fluctuations: The Inelastic Markets Hypothesis](https://www.nber.org/papers/w28967)
- Kydland, Prescott (1977): [Rules Rather than Discretion: The Inconsistency of Optimal Plans](https://doi.org/10.1086/260580)
- Schelling (1960): [The Strategy of Conflict](https://www.hup.harvard.edu/books/9780674840317)

### Market data and protocol status

- CoinDesk: [Bitcoin ETFs at over \$1.5 billion of net outflows for the year](https://www.coindesk.com/markets/2026/11/13/bitcoin-etfs-are-now-down-over-usd1-5-billion-in-net-outflows-for-the-year) (13 Nov 2026)
- AMINA Bank: [Bitcoin Fork August 2026 – BIP-110, Covenants and the Quantum Clock](https://aminagroup.com/research/bitcoin-fork-august-2026-bip-110-ecash-covenants-and-the-quantum-clock/) (30 Jul 2026)
- Spark Research: [Should Bitcoin Stop Changing? The Ossification Debate](https://www.spark.money/research/bitcoin-ossification-debate-protocol-evolution) (15 Sep 2026)
- CoinDesk: [Bitcoin's Quantum Debate Splits as Adam Back Pushes Optional Upgrades](https://www.coindesk.com/tech/2026/04/16/bitcoin-s-quantum-debate-splits-as-adam-back-pushes-optional-upgrades-over-forced-freeze) (16 Apr 2026)
- extraETF: [„Die Bedrohung von Bitcoin durch Quantencomputer ist real, aber nicht akut“](https://extraetf.com/de/news/etf-news/die-bedrohung-von-bitcoin-durch-quantencomputer-ist-real-aber-nicht-akut) (in German: “The threat to Bitcoin from quantum computers is real, but not acute”)
- Blockhead: [Bitcoin Miners' Q3 – Hashprice Competing With AI Leases](https://www.blockhead.co/2026/11/11/bitcoin-miners-q3-three-majors-earn-most-of-their-revenue-from-ai-while-others-sell-bitcoin-to-fund-the-pivot/) (11 Nov 2026)
- Crypto Briefing: [Ethereum outlines fork plan to reach Lean Ethereum by 2029](https://cryptobriefing.com/ethereum-fork-plan-lean-ethereum-2029/)
- block-builders.de: Monero ab 10. Juli 2027 – EU verbietet Börsen, nicht deine Wallet (in German: “Monero from 10 July 2027 – the EU bans exchanges, not your wallet”)
- investing.com: [Fed rate hike priced in at 88.8%](https://www.investing.com/news/economy-news/fed-rate-hike-odds-in-december-at-88-after-hot-cpi-cme-fedwatch-5017585) (11 Nov 2026)

This text is not investment advice. It describes how I arrived at my own position and the criteria by which I review it. Anyone who takes something from it should take the method, not the allocation.
