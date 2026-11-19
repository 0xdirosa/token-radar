[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/0xdirosa/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/0xdirosa/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

# Token Radar

A token launch radar for [make.fun's token-radar-01 bounty](https://make.fun/bounty/token-radar-01): it reads a sealed snapshot of every protocol DefiLlama tracks, ranks the protocols that record no token yet by what their launch would be worth, and shows a reader how to farm each one.

The board covers the whole 40-protocol watchlist (every protocol with at least $50M of TVL and no token on record) plus 138 early pre-token protocols below that floor that pass the watchlist's own rule, 198 rows in all. Implied value follows from the snapshot's own figures — TVL, the peer market-cap-per-$1-TVL multiple of the protocol's category, seven-day growth, age with no token, and chain reach — never from a hand-kept list of names. Live-token protocols are set aside in their own view with their market caps shown, not mixed into the ranking. Every row carries a six-step farm plan with what each step costs and how long it takes.

## Run

Node 22 or later, standard library only — nothing to install:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

That writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`. Open `out/dashboard/index.html` in a browser (it loads `out/data.js` beside it, no network). The program is deterministic: two runs on the same snapshot write byte-identical outputs.

## Status

Model `radar-2` (`lib/model.ts`, per `MODEL.md`): peer category multiples with shrinkage k=5, board N=178 (40 watchlist + 138 early). The three screenshots in `screenshots/` are captures of this dashboard (board, detail view, filtered view) rendered at 1440x900.

Referral code: `e1r32wxx`
