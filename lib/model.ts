// Token Radar — value model `radar-4` and farm plans (MODEL.md, MODEL v4).
//
// Implied value follows only from the snapshot's own figures:
//
//   log10(implied) = a + b * log10(tvl_usd / $100M)   // size curve, Huber fit
//                    + category_offset(category)       // shrunk median residual, k=100
//                    + 0.1 * clamp(change_7d, -60, 120) / 100   // 7-day growth
//
//   implied = max(1, round(10 ^ log10(implied)))
//
// The size curve is fitted on the snapshot's token-bearing protocols, minus
// the categories the house rule itself excludes from the board (Bridge,
// Canonical Bridge, CEX: exchange and bridge tokens price a different thing
// from a protocol's own token). The fit method (Huber), the peer set, the
// shrinkage (k=100) and the extra terms were chosen by blind test, not by
// preference: see MODEL.md for the leave-one-out / walk-forward / ablation
// table. Terms the blind test did not keep — tenure, chain breadth, a
// launch-odds multiplier — are NOT in the formula; launch odds are shown per
// row as context only. Category offsets are kept but shrunk hard (k=100):
// the blind test keeps only a trace of category signal at n=105 peers, so a
// category moves a row only where its peers are plentiful.
//
// Uncertainty has two measured parts: the value band is the blind band —
// the point prediction times the leave-one-out residuals' quantiles, so
// P25–P75 holds ~50% of the traded peers' real caps and P10–P90 ~80% —
// and the rank range comes from 200 bootstrap refits with a seeded PRNG.
//
// Farm economics per row (default deposit $1,000, sizes $500/$1K/$5K/$10K):
//   slice = 10% airdrop share x implied x deposit/TVL (no dilution haircut:
//   the slice is conditional on the token launching; launch odds are shown
//   separately as context, never multiplied in);
//   costs = gas (15 tx) + forgone yield, where forgone is the T-bill rate
//   4.5% MINUS the yield the farmed position itself earns (3.5% a year for
//   yield-bearing buckets — vault, lending, LP, RWA, basis, perps, restake,
//   staking, CeDeFi — 0% where the position earns nothing), over 90 days;
//   break-even odds = costs / slice; FARM if break-even <= 10%, THIN if
//   <= 33%, else SKIP. All rates and shares are stated assumptions, not
//   snapshot facts.
//
// The board is the watchlist without its floor and without its ceiling:
// every watchlist slug, plus every pre-token protocol above the floor that
// passes the watchlist's own rule (20 of them — Sentora Curator and the
// like were never on the watchlist because DefiLlama records no parent
// protocol for them in this snapshot, and no sibling haircut can be
// verified from the snapshot, so none is applied), plus every pre-token
// protocol below the floor that passes the same rule. Token-bearing
// protocols are never ranked; the dashboard shows them apart in its Live
// view, with their market caps, as the peers the curve is fitted on.
//
// Determinism: no Date.now, no Math.random, no network. The bootstrap uses
// a seeded PRNG (mulberry32, seed 20261117) and every fit runs a fixed
// number of iterations, so two runs on the same snapshot are byte-identical.

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The `radar-4` assumptions. Fitted numbers (a, b, offsets) are computed
 *  from the snapshot at run time and live in `FitResult`, not here. */
export interface ModelConstants {
  fit_method: string;
  fit_peer_exclude_categories: string[];
  curve_reference_tvl_usd: number;
  cat_shrinkage_k: number;
  growth_weight_log10: number;
  growth_floor: number;
  growth_cap: number;
  unknown_age_days: number;
  airdrop_share: number;
  tbill_rate: number;
  /** Yield the farmed position itself earns per year (stated assumption):
   *  vaults, lending, LP and staking positions pay yield; netting it against
   *  the T-bill rate is what "forgone yield" means. Applied per bucket. */
  position_yield_rate: number;
  hold_days: number;
  tx_count: number;
  gas_usd_ethereum: number;
  gas_usd_l2: number;
  gas_usd_solana: number;
  gas_usd_other: number;
  verdict_farm_max_breakeven: number;
  verdict_thin_max_breakeven: number;
  bootstrap_refits: number;
  bootstrap_seed: number;
}

export const MODEL: ModelConstants = {
  fit_method: 'huber',
  fit_peer_exclude_categories: ['Bridge', 'Canonical Bridge', 'CEX'],
  curve_reference_tvl_usd: 100_000_000,
  cat_shrinkage_k: 100,
  growth_weight_log10: 0.1,
  growth_floor: -60,
  growth_cap: 120,
  unknown_age_days: 548,
  airdrop_share: 0.1,
  tbill_rate: 0.045,
  position_yield_rate: 0.035,
  hold_days: 90,
  tx_count: 15,
  gas_usd_ethereum: 5,
  gas_usd_l2: 0.5,
  gas_usd_solana: 0.1,
  gas_usd_other: 1,
  verdict_farm_max_breakeven: 0.1,
  verdict_thin_max_breakeven: 0.33,
  bootstrap_refits: 200,
  bootstrap_seed: 20261117,
};

export const MODEL_VERSION = 'radar-4';

/** Live-token protocols the dashboard's Live view carries, by market cap. */
export const LIVE_ROWS = 24;

/** Farm sizes the board prices every row at (default $1,000). */
export const FARM_SIZES = [500, 1000, 5000, 10000];

/** Walk-forward cutoffs: fit on listed_at before the cutoff, test on/after. */
export const WF_CUTOFFS = ['2023-01-01', '2024-01-01', '2024-07-01'];

export interface FarmStep {
  text: string;
  cost: string;
  time: string;
  cost_usd: number;
  time_min: number;
}

export interface FarmSize {
  deposit_usd: number;
  slice_usd: number;
  fees_usd: number;
  forgone_usd: number;
  total_cost_usd: number;
  net_usd: number;
  breakeven_odds: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
}

export interface FarmPlan {
  deposit_usd: number;
  tx_count: number;
  gas_usd_per_tx: number;
  fees_usd: number;
  forgone_usd: number;
  /** Net forgone rate per year (T-bill minus the position's own yield). */
  forgone_rate: number;
  /** Yield the farmed position itself earns per year (0 for non-yielding buckets). */
  position_yield_rate: number;
  total_cost_usd: number;
  hours: number;
  /** Always 1 in radar-4: no dilution haircut (see farmEconomics). Kept so the
   *  dashboard's data contract and the board's history stay comparable. */
  time_share: number;
  slice_usd: number;
  net_usd: number;
  breakeven_odds: number;
  net_per_hour_usd: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  stop_tvl_usd: number;
  exit_tvl_usd: number;
  sizes: FarmSize[];
  steps: FarmStep[];
}

export interface NearestComp {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
  model_usd: number;
  miss_x: number;
}

export interface BoardRow {
  rank: number;
  rank_lo: number;
  rank_hi: number;
  tier: 'watchlist' | 'above-floor' | 'early';
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  launch_odds: number;
  implied_value_usd: number;
  implied_p10_usd: number;
  implied_p25_usd: number;
  implied_p75_usd: number;
  implied_p90_usd: number;
  model: {
    size_curve_usd: number;
    category_offset_log10: number;
    category_multiplier: number;
    growth_multiplier: number;
    age_days: number | null;
  };
  farm: FarmPlan;
  nearest_comps: NearestComp[];
  farm_steps: string[];
}

/** A board row slimmed down for data.js; the page rebuilds the farm plan from it. */
export interface RadarRow {
  rank: number;
  rank_lo: number;
  rank_hi: number;
  tier: 'watchlist' | 'above-floor' | 'early';
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  launch_odds: number;
  implied_value_usd: number;
  implied_p10_usd: number;
  implied_p25_usd: number;
  implied_p75_usd: number;
  implied_p90_usd: number;
  size_curve_usd: number;
  category_offset_log10: number;
  category_multiplier: number;
  growth_multiplier: number;
  farm: FarmPlan;
  nearest_comps: NearestComp[];
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

export interface ValidationMetric {
  n: number;
  median_miss_x: number;
  within_3x_pct: number;
  spearman: number;
}

export interface Validation {
  fit_peers: number;
  fit_peers_excluded: number;
  loo: ValidationMetric;
  /** LOO log10 residuals (log10 actual/pred) quantiles: the blind band. */
  loo_residual_quantiles: { p10: number; p25: number; p75: number; p90: number };
  walk_forward: {
    cutoffs: { cutoff: string; train_n: number; test_n: number; median_miss_x: number; within_3x_pct: number; spearman: number }[];
    mean_median_miss_x: number;
    mean_within_3x_pct: number;
    mean_spearman: number;
  };
  flat: { loo: ValidationMetric; walk_forward_mean_median_miss_x: number; walk_forward_mean_within_3x_pct: number };
  methods: { method: string; variant: string; loo_median_miss_x: number; loo_within_3x_pct: number; loo_spearman: number; wf_mean_miss_x: number }[];
  ablation: { variant: string; loo_median_miss_x: number; loo_within_3x_pct: number; loo_spearman: number; wf_mean_miss_x: number }[];
  bands: { method: string; refits: number; n: number; p25_75_coverage_pct: number; p10_90_coverage_pct: number };
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  fit: { a: number; b: number; peer_count: number; excluded_peer_count: number; offsets: Record<string, number> };
  validation: Validation;
  accounting: { total: number; ranked: number; watchlist: number; above_floor: number; early: number; traded: number; set_aside: number };
  watchlist_size: number;
  board_size: number;
  above_floor_size: number;
  early_size: number;
  live_size: number;
  peer_count: number;
  rows: RadarRow[];
  live: LiveRow[];
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const numOr = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** Standard median (average of the two middles for even n). */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Linear-interpolation quantile of a sorted array. */
function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** Deterministic PRNG (mulberry32). The ONLY source of randomness in the model. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Spearman rank correlation (average ranks for ties), or 0 when undefined. */
function spearman(xs: number[], ys: number[]): number {
  const ranks = (vs: number[]): number[] => {
    const order = vs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(vs.length);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && order[j + 1]!.v === order[i]!.v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[order[k]!.i] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / rx.length;
  const my = ry.reduce((a, b) => a + b, 0) / ry.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) ** 2;
    dy += (ry[i]! - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

function missStats(preds: number[], actuals: number[]): ValidationMetric {
  const misses = preds.map((p, i) => Math.max(p / actuals[i]!, actuals[i]! / p));
  return {
    n: preds.length,
    median_miss_x: round2(median(misses)),
    within_3x_pct: round2((misses.filter((m) => m <= 3).length / misses.length) * 100),
    spearman: round2(spearman(preds, actuals)),
  };
}

/** Whole days from `listedAt` to the snapshot date; null when the date is missing or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const snap = Date.parse(`${asOf}T00:00:00Z`);
  const listed = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(snap) || !Number.isFinite(listed)) return null;
  return Math.max(0, Math.floor((snap - listed) / DAY_MS));
}

/* ------------------------------------------------------------------ */
/* The fit                                                             */
/* ------------------------------------------------------------------ */

export interface CurveFit {
  a: number;
  b: number;
}

function olsFit(xs: number[], ys: number[]): CurveFit {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  return { a: my - b * mx, b };
}

/** Huber M-estimator (IRLS, delta 1.345, 60 fixed iterations). */
function huberFit(xs: number[], ys: number[]): CurveFit {
  let fit = olsFit(xs, ys);
  const n = xs.length;
  for (let iter = 0; iter < 60; iter++) {
    const resid = ys.map((y, i) => y - (fit.a + fit.b * xs[i]!));
    const medResid = median(resid);
    const scale = 1.4826 * median(resid.map((r) => Math.abs(r - medResid))) + 1e-12;
    let sw = 0;
    let swx = 0;
    let swy = 0;
    let swxx = 0;
    let swxy = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.min(1, (1.345 * scale) / Math.max(Math.abs(resid[i]!), 1e-12));
      sw += w;
      swx += w * xs[i]!;
      swy += w * ys[i]!;
      swxx += w * xs[i]! * xs[i]!;
      swxy += w * xs[i]! * ys[i]!;
    }
    const det = sw * swxx - swx * swx;
    if (det === 0) break;
    const b = (sw * swxy - swx * swy) / det;
    const a = (swy - b * swx) / sw;
    if (Math.abs(a - fit.a) < 1e-12 && Math.abs(b - fit.b) < 1e-12) {
      fit = { a, b };
      break;
    }
    fit = { a, b };
  }
  return fit;
}

/** Theil–Sen: median pairwise slope, median intercept. */
function theilSenFit(xs: number[], ys: number[]): CurveFit {
  const slopes: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      if (xs[j] !== xs[i]) slopes.push((ys[j]! - ys[i]!) / (xs[j]! - xs[i]!));
    }
  }
  const b = median(slopes);
  return { a: median(ys.map((y, i) => y - b * xs[i]!)), b };
}

function fitCurve(method: string, xs: number[], ys: number[]): CurveFit {
  if (method === 'huber') return huberFit(xs, ys);
  if (method === 'theil-sen') return theilSenFit(xs, ys);
  return olsFit(xs, ys);
}

/** Categories the fit excludes: bridge and exchange tokens price a
 *  different thing from a protocol's own token (same categories the house
 *  rule excludes from the watchlist). */
const FIT_EXCLUDED = new Set(['Bridge', 'Canonical Bridge', 'CEX']);

export interface FitPeers {
  peers: SnapshotProtocol[];
  excluded: number;
}

export function fitPeers(snapshot: Snapshot, m: ModelConstants = MODEL): FitPeers {
  const all = snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.gecko_id !== null && p.symbol !== null && p.mcap_usd > 0 && p.tvl_usd > 0,
  );
  const peers = all.filter((p) => !FIT_EXCLUDED.has(p.category ?? ''));
  return { peers, excluded: all.length - peers.length };
}

export interface FitModel {
  curve: CurveFit;
  offsets: Map<string, number>;
  peerCount: number;
}

export interface FitOptions {
  method: string;
  useCat: boolean;
  useGrowth: boolean;
  useTenure: boolean;
  useBreadth: boolean;
  useOdds: boolean;
}

export const FINAL_OPTIONS: FitOptions = {
  method: 'huber',
  useCat: true,
  useGrowth: true,
  useTenure: false,
  useBreadth: false,
  useOdds: false,
};

/** Fit the curve on `train` peers, then shrunk category offsets from the
 *  residuals: offset(c) = (n_c * median_residual_c) / (n_c + k), k = 12
 *  pseudo-comps pulling the offset toward 0 (no offset). */
export function fitModel(train: SnapshotProtocol[], opts: FitOptions, m: ModelConstants = MODEL): FitModel {
  const xs = train.map((p) => Math.log10(p.tvl_usd / m.curve_reference_tvl_usd));
  const ys = train.map((p) => Math.log10(p.mcap_usd!));
  const curve = fitCurve(opts.method, xs, ys);
  const offsets = new Map<string, number>();
  if (opts.useCat) {
    const byCat = new Map<string, number[]>();
    for (let i = 0; i < train.length; i++) {
      const key = train[i]!.category ?? '(null)';
      const resid = ys[i]! - (curve.a + curve.b * xs[i]!);
      const list = byCat.get(key);
      if (list === undefined) byCat.set(key, [resid]);
      else list.push(resid);
    }
    for (const [key, rs] of byCat) {
      offsets.set(key, (rs.length * median(rs)) / (rs.length + m.cat_shrinkage_k));
    }
  }
  return { curve, offsets, peerCount: train.length };
}

function logValue(fit: FitModel, p: SnapshotProtocol, asOf: string, opts: FitOptions, odds: number, m: ModelConstants = MODEL): number {
  let v = fit.curve.a + fit.curve.b * Math.log10(p.tvl_usd / m.curve_reference_tvl_usd);
  if (opts.useCat) v += fit.offsets.get(p.category ?? '(null)') ?? 0;
  if (opts.useGrowth) {
    v += m.growth_weight_log10 * (clamp(numOr(p.change_7d, 0), m.growth_floor, m.growth_cap) / 100);
  }
  if (opts.useTenure) {
    const age = ageDays(asOf, p.listed_at);
    const logAge = Math.log10(Math.max(age ?? m.unknown_age_days, 1));
    v += 0.1 * (logAge - Math.log10(m.unknown_age_days));
  }
  if (opts.useBreadth) v += 0.02 * Math.min(Math.max(p.chains.length - 1, 0), 4);
  let value = 10 ** v;
  if (opts.useOdds) value *= odds;
  return value;
}

export function predictValue(fit: FitModel, p: SnapshotProtocol, asOf: string, opts: FitOptions, odds: number, m: ModelConstants = MODEL): number {
  return Math.max(1, Math.round(logValue(fit, p, asOf, opts, odds, m)));
}

/** Size-curve value alone (no offset, no growth): the build-up's first line. */
export function sizeCurveValue(fit: FitModel, p: SnapshotProtocol, m: ModelConstants = MODEL): number {
  return Math.max(1, Math.round(10 ** (fit.curve.a + fit.curve.b * Math.log10(p.tvl_usd / m.curve_reference_tvl_usd))));
}

/* ------------------------------------------------------------------ */
/* Launch odds (context only — never multiplied into implied value)    */
/* ------------------------------------------------------------------ */

/** Age buckets; odds = share of protocols in the bucket that record a
 *  token (gecko_id or symbol non-null), over all 758 snapshot protocols. */
export const ODDS_BUCKETS: [number, number][] = [
  [0, 180],
  [180, 365],
  [365, 730],
  [730, 1095],
  [1095, 1460],
  [1460, Number.POSITIVE_INFINITY],
];

/** Bucket odds computed once per snapshot (cached by snapshot object):
 *  odds = share of protocols in the age bucket that record a token
 *  (gecko_id or symbol non-null), over all snapshot protocols. */
const oddsCache = new WeakMap<Snapshot, Map<string, number>>();

export function launchOddsMap(snapshot: Snapshot, asOf: string): Map<string, number> {
  const cached = oddsCache.get(snapshot);
  if (cached !== undefined) return cached;
  const bucketOf = (q: SnapshotProtocol): string => {
    const a = ageDays(asOf, q.listed_at);
    if (a === null) return 'null';
    for (let i = 0; i < ODDS_BUCKETS.length; i++) {
      if (a >= ODDS_BUCKETS[i]![0] && a < ODDS_BUCKETS[i]![1]) return `b${i}`;
    }
    return 'null';
  };
  const totals = new Map<string, { n: number; token: number }>();
  for (const q of snapshot.protocols) {
    const key = bucketOf(q);
    const t = totals.get(key) ?? { n: 0, token: 0 };
    t.n++;
    if (q.gecko_id !== null || q.symbol !== null) t.token++;
    totals.set(key, t);
  }
  const map = new Map<string, number>();
  for (const q of snapshot.protocols) {
    const t = totals.get(bucketOf(q))!;
    map.set(q.slug, t.n === 0 ? 0 : t.token / t.n);
  }
  oddsCache.set(snapshot, map);
  return map;
}

export function launchOdds(snapshot: Snapshot, asOf: string, p: SnapshotProtocol): number {
  return launchOddsMap(snapshot, asOf).get(p.slug) ?? 0;
}

/* ------------------------------------------------------------------ */
/* Validation: leave-one-out, walk-forward, methods, ablation, flat    */
/* ------------------------------------------------------------------ */

function looMetric(peers: SnapshotProtocol[], asOf: string, snapshot: Snapshot, opts: FitOptions, m: ModelConstants = MODEL): { stat: ValidationMetric; residuals: number[] } {
  const preds: number[] = [];
  const actuals: number[] = [];
  for (let i = 0; i < peers.length; i++) {
    const train = peers.filter((_, j) => j !== i);
    const fit = fitModel(train, opts, m);
    preds.push(predictValue(fit, peers[i]!, asOf, opts, launchOdds(snapshot, asOf, peers[i]!), m));
    actuals.push(peers[i]!.mcap_usd!);
  }
  const residuals = preds.map((p, i) => Math.log10(actuals[i]! / p));
  return { stat: missStats(preds, actuals), residuals };
}

/** Blind-band quantiles: the LOO log10 residuals' quantiles. A row's band is
 *  its point prediction times 10^q — so by construction the P25–P75 band
 *  holds ~50% of the traded peers' real caps and P10–P90 ~80%. */
export function looResidualQuantiles(snapshot: Snapshot, m: ModelConstants = MODEL): { p10: number; p25: number; p75: number; p90: number } {
  const { peers } = fitPeers(snapshot, m);
  const { residuals } = looMetric(peers, snapshot.as_of, snapshot, FINAL_OPTIONS, m);
  const sorted = [...residuals].sort((a, b) => a - b);
  return {
    p10: round4(quantileSorted(sorted, 0.1)),
    p25: round4(quantileSorted(sorted, 0.25)),
    p75: round4(quantileSorted(sorted, 0.75)),
    p90: round4(quantileSorted(sorted, 0.9)),
  };
}

function wfMetric(peers: SnapshotProtocol[], asOf: string, snapshot: Snapshot, opts: FitOptions, m: ModelConstants = MODEL): Validation['walk_forward'] {
  const cutoffs = WF_CUTOFFS.map((cutoff) => {
    const train = peers.filter((p) => p.listed_at !== null && p.listed_at < cutoff);
    const test = peers.filter((p) => p.listed_at !== null && p.listed_at >= cutoff);
    const fit = fitModel(train, opts, m);
    const stat = missStats(
      test.map((p) => predictValue(fit, p, asOf, opts, launchOdds(snapshot, asOf, p), m)),
      test.map((p) => p.mcap_usd!),
    );
    return { cutoff, train_n: train.length, test_n: test.length, median_miss_x: stat.median_miss_x, within_3x_pct: stat.within_3x_pct, spearman: stat.spearman };
  });
  return {
    cutoffs,
    mean_median_miss_x: round2(cutoffs.reduce((s, c) => s + c.median_miss_x, 0) / cutoffs.length),
    mean_within_3x_pct: round2(cutoffs.reduce((s, c) => s + c.within_3x_pct, 0) / cutoffs.length),
    mean_spearman: round2(cutoffs.reduce((s, c) => s + c.spearman, 0) / cutoffs.length),
  };
}

function flatMetric(peers: SnapshotProtocol[], asOf: string, snapshot: Snapshot, m: ModelConstants = MODEL): { loo: ValidationMetric; walk_forward_mean_median_miss_x: number; walk_forward_mean_within_3x_pct: number } {
  const looPreds: number[] = [];
  const looActuals: number[] = [];
  for (let i = 0; i < peers.length; i++) {
    const ratios = peers.filter((_, j) => j !== i).map((q) => q.mcap_usd! / q.tvl_usd);
    looPreds.push(peers[i]!.tvl_usd * median(ratios));
    looActuals.push(peers[i]!.mcap_usd!);
  }
  const wfMeans: number[] = [];
  const wfWithin: number[] = [];
  for (const cutoff of WF_CUTOFFS) {
    const train = peers.filter((p) => p.listed_at !== null && p.listed_at < cutoff);
    const test = peers.filter((p) => p.listed_at !== null && p.listed_at >= cutoff);
    const med = median(train.map((p) => p.mcap_usd! / p.tvl_usd));
    const stat = missStats(
      test.map((p) => p.tvl_usd * med),
      test.map((p) => p.mcap_usd!),
    );
    wfMeans.push(stat.median_miss_x);
    wfWithin.push(stat.within_3x_pct);
  }
  return {
    loo: missStats(looPreds, looActuals),
    walk_forward_mean_median_miss_x: round2(wfMeans.reduce((a, b) => a + b, 0) / wfMeans.length),
    walk_forward_mean_within_3x_pct: round2(wfWithin.reduce((a, b) => a + b, 0) / wfWithin.length),
  };
}

export function validateModel(snapshot: Snapshot, m: ModelConstants = MODEL): Validation {
  const { peers, excluded } = fitPeers(snapshot, m);
  const looFull = looMetric(peers, snapshot.as_of, snapshot, FINAL_OPTIONS, m);
  const loo = looFull.stat;
  const sortedResid = [...looFull.residuals].sort((a, b) => a - b);
  const looResidualQuantiles = {
    p10: round4(quantileSorted(sortedResid, 0.1)),
    p25: round4(quantileSorted(sortedResid, 0.25)),
    p75: round4(quantileSorted(sortedResid, 0.75)),
    p90: round4(quantileSorted(sortedResid, 0.9)),
  };
  const in2575 = looFull.residuals.filter((r) => r >= looResidualQuantiles.p25 && r <= looResidualQuantiles.p75).length;
  const in1090 = looFull.residuals.filter((r) => r >= looResidualQuantiles.p10 && r <= looResidualQuantiles.p90).length;
  const walkForward = wfMetric(peers, snapshot.as_of, snapshot, FINAL_OPTIONS, m);
  const flat = flatMetric(peers, snapshot.as_of, snapshot, m);
  const methods: Validation['methods'] = [];
  for (const method of ['ols', 'huber', 'theil-sen']) {
    for (const useCat of [false, true]) {
      const opts: FitOptions = { ...FINAL_OPTIONS, method, useCat, useGrowth: false, useTenure: false, useBreadth: false, useOdds: false };
      const l = looMetric(peers, snapshot.as_of, snapshot, opts, m).stat;
      const w = wfMetric(peers, snapshot.as_of, snapshot, opts, m);
      methods.push({
        method,
        variant: useCat ? 'curve+category' : 'curve-only',
        loo_median_miss_x: l.median_miss_x,
        loo_within_3x_pct: l.within_3x_pct,
        loo_spearman: l.spearman,
        wf_mean_miss_x: w.mean_median_miss_x,
      });
    }
  }
  const ablation: Validation['ablation'] = [];
  const variants: { variant: string; opts: FitOptions }[] = [
    { variant: 'curve-only', opts: { ...FINAL_OPTIONS, useCat: false, useGrowth: false } },
    { variant: 'curve+category', opts: { ...FINAL_OPTIONS, useGrowth: false } },
    { variant: 'curve+category+growth (final)', opts: { ...FINAL_OPTIONS } },
    { variant: 'curve+category+tenure', opts: { ...FINAL_OPTIONS, useGrowth: false, useTenure: true } },
    { variant: 'curve+category+breadth', opts: { ...FINAL_OPTIONS, useGrowth: false, useBreadth: true } },
    { variant: 'curve+category+growth+tenure+breadth', opts: { ...FINAL_OPTIONS, useTenure: true, useBreadth: true } },
    { variant: 'curve+category x launch-odds', opts: { ...FINAL_OPTIONS, useGrowth: false, useOdds: true } },
  ];
  for (const { variant, opts } of variants) {
    const l = looMetric(peers, snapshot.as_of, snapshot, opts, m).stat;
    const w = wfMetric(peers, snapshot.as_of, snapshot, opts, m);
    ablation.push({ variant, loo_median_miss_x: l.median_miss_x, loo_within_3x_pct: l.within_3x_pct, loo_spearman: l.spearman, wf_mean_miss_x: w.mean_median_miss_x });
  }
  return {
    fit_peers: peers.length,
    fit_peers_excluded: excluded,
    loo,
    loo_residual_quantiles: looResidualQuantiles,
    walk_forward: walkForward,
    flat,
    methods,
    ablation,
    bands: {
      method: 'loo-residual',
      refits: m.bootstrap_refits,
      n: peers.length,
      p25_75_coverage_pct: round2((in2575 / peers.length) * 100),
      p10_90_coverage_pct: round2((in1090 / peers.length) * 100),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Inclusion: the watchlist rule, floor aside, ceiling aside           */
/* ------------------------------------------------------------------ */

/** A name ending in a release marker (V2, v2, 2.0, ...) is a pool of another protocol. */
const VERSIONED_NAME = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word wrapped, staked or staking, in any case. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** A name beginning with an exchange's name. */
const EXCHANGE_START = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;
/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORY = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** No token on record: no market cap, no CoinGecko id, no symbol. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol passes the watchlist's own rule (floor aside): pre-token,
 * not a wrapped/staked/bridged product, not versioned, not an exchange product.
 * No parentProtocol field exists in the snapshot, so no sibling haircut can be
 * verified from it — and none is applied (see MODEL.md).
 */
export function passesWatchlistRule(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !EXCLUDED_CATEGORY.has(p.category ?? '') &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGE_START.test(p.name) &&
    !VERSIONED_NAME.test(p.name)
  );
}

function bySlug(ps: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(ps.map((p) => [p.slug, p]));
}

function slugOrder(a: SnapshotProtocol, b: SnapshotProtocol): number {
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Farm economics                                                      */
/* ------------------------------------------------------------------ */

function firstChain(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** Gas per on-chain transaction, by main chain (stated assumption). */
export function gasPerTx(p: SnapshotProtocol, m: ModelConstants = MODEL): number {
  const chain = firstChain(p);
  if (chain === 'Ethereum') return m.gas_usd_ethereum;
  if (chain === 'Solana') return m.gas_usd_solana;
  const L2 = new Set(['Base', 'Arbitrum', 'Optimism', 'Monad', 'Polygon', 'Ink', 'Unichain', 'Katana', 'Linea', 'Scroll', 'Blast']);
  if (L2.has(chain)) return m.gas_usd_l2;
  return m.gas_usd_other;
}

function verdictFor(breakeven: number, m: ModelConstants = MODEL): 'FARM' | 'THIN' | 'SKIP' {
  if (breakeven <= m.verdict_farm_max_breakeven) return 'FARM';
  if (breakeven <= m.verdict_thin_max_breakeven) return 'THIN';
  return 'SKIP';
}

/** Yield the farmed position itself earns per year, by the plan's bucket
 *  (see bucketFor): yield-bearing positions (vault, lending, LP, RWA, basis,
 *  perps, restake, staking, CeDeFi) earn the stated 3.5% a year; a position
 *  that earns nothing (insurance, payments, chain, governance, stable,
 *  bridge, default) earns 0%. A stated assumption, not a snapshot fact. */
export function positionYieldFor(p: SnapshotProtocol, m: ModelConstants = MODEL): number {
  switch (bucketFor(p)) {
    case 'vault':
    case 'lending':
    case 'dex':
    case 'rwa':
    case 'basis':
    case 'perp':
    case 'restake':
    case 'staking':
    case 'cedefi':
      return m.position_yield_rate;
    default:
      return 0;
  }
}

/** One deposit size priced: slice scales with deposit, forgone yield scales
 *  with deposit, gas does not — so bigger tickets clear costs more easily.
 *  Forgone yield is net: the T-bill rate minus what the position itself
 *  earns, because the deposit is not idle while it farms. */
function priceSize(
  p: SnapshotProtocol,
  implied: number,
  deposit: number,
  gas: number,
  hours: number,
  posYield: number,
  m: ModelConstants = MODEL,
): FarmSize {
  const slice = m.airdrop_share * implied * (deposit / p.tvl_usd);
  const fees = m.tx_count * gas;
  const forgone = deposit * (m.tbill_rate - posYield) * (m.hold_days / 365);
  const totalCost = fees + forgone;
  const net = slice - totalCost;
  const breakeven = slice > 0 ? totalCost / slice : Number.POSITIVE_INFINITY;
  return {
    deposit_usd: deposit,
    slice_usd: round2(slice),
    fees_usd: round2(fees),
    forgone_usd: round2(forgone),
    total_cost_usd: round2(totalCost),
    net_usd: round2(net),
    breakeven_odds: breakeven === Number.POSITIVE_INFINITY ? 999 : round4(breakeven),
    verdict: verdictFor(breakeven, m),
  };
}

export function farmEconomics(p: SnapshotProtocol, implied: number, age: number | null, steps: FarmStep[], m: ModelConstants = MODEL): FarmPlan {
  const gas = gasPerTx(p, m);
  const posYield = positionYieldFor(p, m);
  // No dilution haircut in radar-4: the slice is conditional on the token
  // launching (10% of implied value, pro-rata by deposit/TVL). The launch
  // odds are shown per row as context and are never multiplied in — the same
  // reason MODEL.md §c gives for not multiplying implied value by odds.
  // radar-3's 90/(age+90) time share cut old protocols' slices up to 21x and
  // put the model outside the consensus of the field's best boards; it is
  // removed, not hidden: time_share stays 1 in the data so the change is visible.
  const timeShare = 1;
  const hours = steps.reduce((s, st) => s + st.time_min, 0) / 60;
  const main = priceSize(p, implied, 1000, gas, hours, posYield, m);
  return {
    deposit_usd: 1000,
    tx_count: m.tx_count,
    gas_usd_per_tx: gas,
    fees_usd: main.fees_usd,
    forgone_usd: main.forgone_usd,
    forgone_rate: round4(m.tbill_rate - posYield),
    position_yield_rate: posYield,
    total_cost_usd: main.total_cost_usd,
    hours: round2(hours),
    time_share: timeShare,
    slice_usd: main.slice_usd,
    net_usd: main.net_usd,
    breakeven_odds: main.breakeven_odds,
    net_per_hour_usd: round2(main.net_usd / hours),
    verdict: main.verdict,
    stop_tvl_usd: Math.round(p.tvl_usd * 0.8),
    exit_tvl_usd: Math.round(p.tvl_usd * 0.5),
    sizes: FARM_SIZES.map((d) => priceSize(p, implied, d, gas, hours, posYield, m)),
    steps,
  };
}

/** The category's bucket: one core action, one weekly action, one hold subject. */
function bucketFor(p: SnapshotProtocol): 'vault' | 'lending' | 'dex' | 'rwa' | 'basis' | 'perp' | 'restake' | 'staking' | 'insurance' | 'payments' | 'chain' | 'governance' | 'cedefi' | 'stable' | 'bridge' | 'default' {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('risk curator') || c.includes('onchain capital allocator') || c.includes('yield') || c.includes('leveraged farm')) return 'vault';
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'lending';
  if (c.includes('dex') || c.includes('liquidity manager')) return 'dex';
  if (c.includes('rwa')) return 'rwa';
  if (c.includes('basis trading')) return 'basis';
  if (c.includes('perpetual') || c.includes('derivative')) return 'perp';
  if (c.includes('restak')) return 'restake';
  if (c.includes('staking')) return 'staking';
  if (c.includes('insurance')) return 'insurance';
  if (c.includes('payment')) return 'payments';
  if (c.includes('governance')) return 'governance';
  if (c.includes('cedefi')) return 'cedefi';
  if (c.includes('stable')) return 'stable';
  if (c.includes('bridge')) return 'bridge';
  if (c.includes('chain')) return 'chain';
  return 'default';
}

function coreAction(bucket: ReturnType<typeof bucketFor>, p: SnapshotProtocol, chain: string): string {
  const name = p.name;
  switch (bucket) {
    case 'vault': return `deposit $1,000 of USDC into a ${name} vault on ${chain} and keep the position open`;
    case 'lending': return `supply $1,000 of USDC to ${name} on ${chain} and keep the position open`;
    case 'dex': return `provide $1,000 of liquidity to ${name}'s main pool on ${chain} and keep the position open`;
    case 'rwa': return `buy $1,000 of ${name}'s yield-bearing asset on ${chain} and hold it in the wallet`;
    case 'basis': return `deposit $1,000 of USDC into a ${name} basis-trading vault on ${chain} and keep the position open`;
    case 'perp': return `deposit $1,000 of USDC as margin on ${name} and open one small hedge`;
    case 'restake': return `restake $1,000 of the chain's staking asset through ${name} and keep the receipt`;
    case 'staking': return `stake $1,000 through ${name} and keep the receipt`;
    case 'insurance': return `buy $1,000 of cover from ${name} on ${chain} and keep the policy active`;
    case 'payments': return `keep $1,000 in ${name} on ${chain} for payments and use it for one payment`;
    case 'chain': return `bridge $1,000 to ${chain} and use its native apps`;
    case 'governance': return `deposit $1,000 into ${name} and vote in its governance`;
    case 'cedefi': return `deposit $1,000 of USDC into a ${name} vault on ${chain} and keep the position open`;
    case 'stable': return `mint or deposit $1,000 of the stable asset through ${name} on ${chain}`;
    case 'bridge': return `bridge $1,000 of USDC to ${chain} through ${name} and use the bridged funds in its app`;
    default: return `deposit $1,000 of USDC into ${name} on ${chain} and keep the position open`;
  }
}

function weeklyAction(bucket: ReturnType<typeof bucketFor>, p: SnapshotProtocol, chain: string): string {
  const name = p.name;
  switch (bucket) {
    case 'vault': return `a deposit, a rebalance or a vote on a ${name} vault`;
    case 'lending': return `a deposit, a borrow or a repayment on ${name}`;
    case 'dex': return `adding liquidity or a swap on ${name}`;
    case 'rwa': return `adding to the position or using the asset in an ${name} flow on ${chain}`;
    case 'basis': return `a deposit or a rebalance in the ${name} vault`;
    case 'perp': return `adjusting the hedge or adding margin on ${name}`;
    case 'restake':
    case 'staking': return `adding to the stake or claiming rewards through ${name}`;
    case 'insurance': return `renewing cover or adding a second policy on ${name}`;
    case 'payments': return `one payment through ${name} on ${chain}`;
    case 'chain': return `a bridge or a swap on ${chain} through ${name}`;
    case 'governance': return `a vote or a deposit on ${name}`;
    default: return `a deposit, a borrow, a swap or a vote`;
  }
}

function fmtGrouped(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * Eight dated farm steps. Costs count 15 on-chain transactions (1 setup +
 * 1 deposit + 12 weekly + 1 exit) at the main chain's gas; the week-6 stop
 * rule names the protocol's own TVL levels. Nothing is claimed about a
 * points program the snapshot does not record.
 */
export function planFor(p: SnapshotProtocol, m: ModelConstants = MODEL): FarmStep[] {
  const chain = firstChain(p);
  const gas = gasPerTx(p, m);
  const bucket = bucketFor(p);
  const stop = fmtGrouped(p.tvl_usd * 0.8);
  const tvl = fmtGrouped(p.tvl_usd);
  const weeklyGas = fmtMoney(12 * gas);
  return [
    { text: `Day 0 — Set up a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`, cost: `${fmtMoney(gas)} of gas for the funding transaction`, time: '5 minutes', cost_usd: gas, time_min: 5 },
    { text: `Day 0 — ${capFirst(coreAction(bucket, p, chain))}.`, cost: `$1,000 of capital and about ${fmtMoney(gas)} of gas`, time: '15 minutes to set up', cost_usd: 1000 + gas, time_min: 15 },
    { text: `Weeks 1–12 — Make one qualifying action each week, such as ${weeklyAction(bucket, p, chain)}.`, cost: `about ${weeklyGas} of gas for 12 weekly transactions`, time: '10 minutes a week (2 hours in all)', cost_usd: 12 * gas, time_min: 120 },
    { text: `Week 6 — Check ${p.name}'s 7-day TVL change: if TVL has closed below $${stop} (80% of $${tvl} at deposit), withdraw half the same day.`, cost: `no fee to check; withdrawing half costs one more transaction, about ${fmtMoney(gas)} of gas`, time: '10 minutes', cost_usd: 0, time_min: 10 },
    { text: `Day 90 — Open ${p.name}'s own points or rewards page and claim only from the link it publishes; never pay to claim.`, cost: 'no fee to check', time: '15 minutes', cost_usd: 0, time_min: 15 },
    { text: `Day 90 — Withdraw the $1,000 deposit from ${p.name} on ${chain} unless the week-6 stop rule already exited the position.`, cost: `about ${fmtMoney(gas)} of gas`, time: '10 minutes', cost_usd: gas, time_min: 10 },
    { text: `Day 90 — Write the wallet, the dates and every transaction hash in a farm log so you can repeat or unwind the position.`, cost: 'nothing but the log', time: '5 minutes', cost_usd: 0, time_min: 5 },
    { text: `Day 90 — Decide: if no token has launched and TVL is still above $${stop}, either hold for another 90 days or exit; do not add funds without a fresh check.`, cost: 'no fee to decide', time: '10 minutes', cost_usd: 0, time_min: 10 },
  ];
}

function capFirst(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

/** One step as a single string: action, then its cost and time, inside 20..600 chars. */
export function joinStep(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/* ------------------------------------------------------------------ */
/* Bootstrap rank ranges (seeded, deterministic)                       */
/* ------------------------------------------------------------------ */

/** 200 bootstrap refits of the final model; each row's rank range is its
 *  lowest and highest rank across the refits. The value band is NOT from
 *  the bootstrap — refit-only bands are far narrower than the blind
 *  residuals, so the band comes from the LOO residuals instead. */
function bootstrapRankRanges(
  candidates: SnapshotProtocol[],
  peers: SnapshotProtocol[],
  snapshot: Snapshot,
  m: ModelConstants = MODEL,
): Map<string, { rankLo: number; rankHi: number }> {
  const rng = mulberry32(m.bootstrap_seed);
  const n = peers.length;
  const candRanks = new Map<string, number[]>();
  for (const p of candidates) candRanks.set(p.slug, []);
  for (let r = 0; r < m.bootstrap_refits; r++) {
    const train: SnapshotProtocol[] = [];
    for (let i = 0; i < n; i++) train.push(peers[Math.floor(rng() * n)]!);
    const fit = fitModel(train, FINAL_OPTIONS, m);
    const scored = candidates.map((p) => ({
      slug: p.slug,
      v: predictValue(fit, p, snapshot.as_of, FINAL_OPTIONS, launchOdds(snapshot, snapshot.as_of, p), m),
    }));
    scored.sort((a, b) => b.v - a.v || (a.slug < b.slug ? -1 : 1));
    for (let i = 0; i < scored.length; i++) candRanks.get(scored[i]!.slug)!.push(i + 1);
  }
  const ranges = new Map<string, { rankLo: number; rankHi: number }>();
  for (const p of candidates) {
    const ranks = candRanks.get(p.slug)!;
    ranges.set(p.slug, { rankLo: Math.min(...ranks), rankHi: Math.max(...ranks) });
  }
  return ranges;
}

/* ------------------------------------------------------------------ */
/* Nearest traded comps                                                */
/* ------------------------------------------------------------------ */

function nearestComps(p: SnapshotProtocol, fit: FitModel, peers: SnapshotProtocol[], asOf: string, snapshot: Snapshot, m: ModelConstants = MODEL): NearestComp[] {
  const dist = (q: SnapshotProtocol): number => Math.abs(Math.log10(q.tvl_usd) - Math.log10(p.tvl_usd));
  const sameCat = peers.filter((q) => (q.category ?? '(null)') === (p.category ?? '(null)') && q.slug !== p.slug).sort((a, b) => dist(a) - dist(b) || slugOrder(a, b));
  const other = peers.filter((q) => (q.category ?? '(null)') !== (p.category ?? '(null)') && q.slug !== p.slug).sort((a, b) => dist(a) - dist(b) || slugOrder(a, b));
  return [...sameCat, ...other].slice(0, 4).map((q) => {
    const model = predictValue(fit, q, asOf, FINAL_OPTIONS, launchOdds(snapshot, asOf, q), m);
    return {
      slug: q.slug,
      name: q.name,
      category: q.category,
      tvl_usd: q.tvl_usd,
      mcap_usd: q.mcap_usd!,
      model_usd: model,
      miss_x: round2(Math.max(q.mcap_usd! / model, model / q.mcap_usd!)),
    };
  });
}

/* ------------------------------------------------------------------ */
/* The board                                                           */
/* ------------------------------------------------------------------ */

/**
 * The ranked board: every watchlist slug, plus every pre-token protocol
 * that passes the watchlist rule — above the floor as well as below it —
 * all of them, no arbitrary cutoff. Scored by the model, ranked by implied
 * value, ties broken by slug.
 */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  return buildBoardInternal(snapshot, model, looResidualQuantiles(snapshot, model)).board;
}

function buildBoardInternal(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
  bandQ: { p10: number; p25: number; p75: number; p90: number } | null = null,
): { board: BoardRow[] } {
  const { peers } = fitPeers(snapshot, model);
  const fit = fitModel(peers, FINAL_OPTIONS, model);
  const index = bySlug(snapshot.protocols);
  const picked = new Map<string, SnapshotProtocol>();
  const tiers = new Map<string, BoardRow['tier']>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) {
      picked.set(slug, p);
      tiers.set(slug, 'watchlist');
    }
  }
  for (const p of snapshot.protocols) {
    if (picked.has(p.slug)) continue;
    if (!passesWatchlistRule(p)) continue;
    picked.set(p.slug, p);
    tiers.set(p.slug, p.tvl_usd >= snapshot.floor_usd ? 'above-floor' : 'early');
  }
  const candidates = [...picked.values()];
  const quantiles = bandQ ?? looResidualQuantiles(snapshot, model);
  const rankRanges = bootstrapRankRanges(candidates, peers, snapshot, model);
  const scored = candidates.map((p) => {
    const age = ageDays(snapshot.as_of, p.listed_at);
    const implied = predictValue(fit, p, snapshot.as_of, FINAL_OPTIONS, launchOdds(snapshot, snapshot.as_of, p), model);
    const sizeCurve = sizeCurveValue(fit, p, model);
    const offset = fit.offsets.get(p.category ?? '(null)') ?? 0;
    const growthMult = 10 ** (model.growth_weight_log10 * (clamp(numOr(p.change_7d, 0), model.growth_floor, model.growth_cap) / 100));
    const steps = planFor(p, model);
    const farm = farmEconomics(p, implied, age, steps, model);
    const range = rankRanges.get(p.slug)!;
    const band = {
      p10: Math.max(1, Math.round(implied * 10 ** quantiles.p10)),
      p25: Math.max(1, Math.round(implied * 10 ** quantiles.p25)),
      p75: Math.max(1, Math.round(implied * 10 ** quantiles.p75)),
      p90: Math.max(1, Math.round(implied * 10 ** quantiles.p90)),
      rankLo: range.rankLo,
      rankHi: range.rankHi,
    };
    return { p, age, implied, sizeCurve, offset, growthMult, steps, farm, band };
  });
  scored.sort((a, b) => b.implied - a.implied || slugOrder(a.p, b.p));
  const board = scored.map(({ p, age, implied, sizeCurve, offset, growthMult, steps, farm, band }, i) => ({
    rank: i + 1,
    rank_lo: band.rankLo,
    rank_hi: band.rankHi,
    tier: tiers.get(p.slug)!,
    slug: p.slug,
    name: p.name,
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    mcap_usd: p.mcap_usd,
    listed_at: p.listed_at,
    gecko_id: p.gecko_id,
    symbol: p.symbol,
    token_status: 'pre-token',
    age_days: age,
    launch_odds: round4(launchOdds(snapshot, snapshot.as_of, p)),
    implied_value_usd: implied,
    implied_p10_usd: band.p10,
    implied_p25_usd: band.p25,
    implied_p75_usd: band.p75,
    implied_p90_usd: band.p90,
    model: {
      // Full precision: the page rebuilds the row from these factors, so a
      // rounded copy would disagree with board.json by more than a few dollars.
      size_curve_usd: sizeCurve,
      category_offset_log10: offset,
      category_multiplier: 10 ** offset,
      growth_multiplier: growthMult,
      age_days: age,
    },
    farm,
    nearest_comps: nearestComps(p, fit, peers, snapshot.as_of, snapshot, model),
    farm_steps: steps.map(joinStep),
  }));
  return { board };
}

/** Live-token protocols by market cap, for the dashboard's separate Live view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

function slim(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    rank_lo: row.rank_lo,
    rank_hi: row.rank_hi,
    tier: row.tier,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    launch_odds: row.launch_odds,
    implied_value_usd: row.implied_value_usd,
    implied_p10_usd: row.implied_p10_usd,
    implied_p25_usd: row.implied_p25_usd,
    implied_p75_usd: row.implied_p75_usd,
    implied_p90_usd: row.implied_p90_usd,
    size_curve_usd: row.model.size_curve_usd,
    category_offset_log10: row.model.category_offset_log10,
    category_multiplier: row.model.category_multiplier,
    growth_multiplier: row.model.growth_multiplier,
    farm: row.farm,
    nearest_comps: row.nearest_comps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const { peers, excluded } = fitPeers(snapshot, model);
  const fit = fitModel(peers, FINAL_OPTIONS, model);
  const validation = validateModel(snapshot, model);
  const { board } = buildBoardInternal(snapshot, model, validation.loo_residual_quantiles);
  const live = liveRows(snapshot);
  const traded = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const aboveFloor = board.filter((r) => r.tier === 'above-floor').length;
  const early = board.filter((r) => r.tier === 'early').length;
  const offsets: Record<string, number> = {};
  for (const key of [...fit.offsets.keys()].sort()) offsets[key] = round4(fit.offsets.get(key)!);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    fit: { a: round4(fit.curve.a), b: round4(fit.curve.b), peer_count: peers.length, excluded_peer_count: excluded, offsets },
    validation,
    accounting: {
      total: snapshot.protocols.length,
      ranked: board.length,
      watchlist: snapshot.watchlist.length,
      above_floor: aboveFloor,
      early,
      traded,
      set_aside: snapshot.protocols.length - board.length - traded,
    },
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    above_floor_size: aboveFloor,
    early_size: early,
    live_size: live.length,
    peer_count: peers.length,
    rows: board.map(slim),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared value, farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12) return `${r.slug} has ${r.farm_steps.length} farm steps`;
    for (const s of r.farm_steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 1e14) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** The dashboard's whole dataset as one script: `window.RADAR = {...};` — no fetch, no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
