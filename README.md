# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/capptainjack/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/capptainjack/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks every pre-token protocol in a sealed DefiLlama snapshot by the implied value of the token it may one day issue, and shows a reader how to farm each one. The board covers all 40 protocols on the snapshot's watchlist plus every other rankable pre-token protocol below its floor — 198 rows in all — with a live-token view set aside and the wrapped, staked, bridged and exchange products set aside with their reasons. Implied value is a model, not a price, and never a prediction that a token will be issued.

## The model (radar-2)

Every row is scored by one function of the snapshot's own figures, and no protocol name is ever special-cased:

```
implied = round( tvl_usd x 0.30
  x (1 + clamp(change_7d, -50, 200) / 100 x 0.6)
  x (0.5 + min(age_days, 1460) / 1460 x 0.7)
  x (1 + 0.04 x min(chains - 1, 10)) )
```

- **TVL** is the protocol's size today.
- **Seven-day growth** is its direction, clamped so one wild week cannot decide the board.
- **Age with no token** is how long a launch has been pent up; an unlisted age uses 365 days.
- **Chains** is how wide its distribution already is: a protocol live on many networks reaches more farmers.

A protocol is rankable when it records no token and is a launch of its own: not a wrapped, staked or bridged product, not a centralised exchange, and not a versioned pool of another protocol. The farm plan is derived from the same record — category, chains, TVL and age decide the action, the capital, the gas and the hold. The dashboard recomputes each row's implied value from the same function and shows whether it agrees with the board.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes the ranked board to `out/board.json`, the dashboard's data to `out/data.js`, copies `dashboard/` and `screenshots/` to `out/`, and writes `out/dossier.json` with the vendored make.fun library. Open `out/dashboard/index.html` in a browser: the page renders with no network.

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
