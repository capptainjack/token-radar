# Token Radar

A read-only ranking of pre-token protocols by implied value, built from a
single sealed snapshot. No live data, no wallet, no network at run time.

## What it ranks

The board covers every protocol on the snapshot's watchlist, and every
other rankable protocol too: 198 rows in all. A protocol is rankable when
its snapshot record carries no token at all (no market cap, no CoinGecko
id, no symbol) and it is a launch of its own — not a centralised exchange,
not a bridge, not liquid staking, liquid restaking or restaked BTC, not a
wrapped or staked product of a token that already trades, not a versioned
pool, and not a product of a centralised exchange.

Protocols whose token already trades are set aside in the Live view, with
their market caps shown. Pre-token protocols that are not a launch of
their own are set aside with the reason each one is not ranked.

## How the ranking works (model radar-2)

Implied value follows only from the snapshot's own figures:

```
implied = round( tvl_usd x 0.30
                 x (1 + clamp(change_7d, -50, 200) / 100 x 0.6)
                 x (0.5 + min(age_days, 1460) / 1460 x 0.7)
                 x (1 + 0.04 x min(max(chains - 1, 0), 10)) )
```

- **Base** is TVL times 0.30.
- **Growth** uses the seven-day TVL change, clamped to -50%..+200%,
  weighted 0.6. A missing change counts as zero.
- **Maturity** grows with age since first listing, from 0.5 to 1.2 over
  four years. A missing listing date counts as 365 days.
- **Chains** adds 0.04 per extra chain, up to ten extra chains.
- No protocol name is special-cased. The same function scores every row,
  and the dashboard recomputes each row from the same figures and says
  whether it agrees with the board.

Each row also carries a farm plan: six steps, seven when the protocol
runs on more than one chain. The plan is derived from the protocol's own
record — its category decides the action, its TVL decides the capital
($50 to $250), its first chain decides the gas (Ethereum dear, Solana
near-free, the rest under a dollar), and its age decides the hold
(30 to 60 days). It never invents a points program, a reward, a date,
or a partnership. Saying a protocol records no token is not saying it
has none.

## How to run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the snapshot, validates
it first (at least 100 protocols, no duplicate slugs, no negative TVL, a
non-empty watchlist with no duplicates and every slug present, and a
positive floor), writes `board.json` and `data.js`, copies `dashboard/`
and `screenshots/` to the output, and writes `dossier.json` with the
vendored library in `vendor/makefun-board.ts`.

## The dashboard

`dashboard/` is a static page with no network: `index.html`, `app.css`
and `app.js`. It renders the board from `data.js`, with a top-five
spotlight, search, category, chain, minimum-TVL and watchlist-only
filters, sorting by implied value, name, TVL, seven-day change, age and
chain count, tabs for the pre-token board, the live-token view and the
set-aside view, and a detail view for each protocol showing why it ranks
where it does, its multipliers and its farm plan. Filter state survives
in the page's share link, including the minimum TVL. Implied-value bars
scale against the board's highest value.

## Screenshots

`screenshots/` holds three 1440x900 PNGs: the board, a protocol's detail
view, and a filtered view.

## Disclaimer

Implied value is this entry's own claim, never a price, never a
prediction that a token will be issued, and not financial advice.
