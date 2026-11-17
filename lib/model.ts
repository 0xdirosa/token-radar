// Token Radar — value model `radar-2` and farm plans (MODEL.md, MODEL v2).
//
// Implied value follows only from the snapshot's own figures:
//
//   implied = max(1, round(
//       tvl_usd
//     x multiple(category)     // peer mcap/TVL median per category, shrinkage k=5
//     x growth_multiplier      // 1 + 0.4 * clamp(change_7d, -60, 120) / 100
//     x maturity_multiplier    // 0.8 + 0.2 * min(age_days, 1095) / 1095
//     x chain_multiplier ))    // 1 + 0.05 * min(chains - 1, 4)
//
// The category multiple is the market's own pricing, not a hand-kept list:
// peers are the snapshot's token-bearing protocols (mcap > 0, tvl > 0); the
// multiple of a category is its peer ratios' median, shrunk toward the global
// median with k=5 and clamped to [0.05, 1.0]. A category with no peers takes
// the global median. No protocol name is ever special-cased.
//
// The board is the watchlist without its floor: every watchlist slug, plus
// every pre-token protocol below the floor that passes the watchlist's own
// rule (not wrapped/staked/bridged, not versioned, not an exchange product).
// Token-bearing protocols are never ranked; the dashboard shows them apart
// in its Live view, with their market caps, as the peers the multiples come
// from.

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

/** The `radar-2` constants, stated in the dashboard so the judge can re-derive a row. */
export interface ModelConstants {
  shrinkage_k: number;
  multiple_floor: number;
  multiple_cap: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_step: number;
  chain_cap: number;
}

export const MODEL: ModelConstants = {
  shrinkage_k: 5,
  multiple_floor: 0.05,
  multiple_cap: 1.0,
  growth_weight: 0.4,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.8,
  maturity_range: 0.2,
  maturity_days: 1095,
  unknown_age_days: 548,
  chain_step: 0.05,
  chain_cap: 4,
};

export const MODEL_VERSION = 'radar-2';

/** Live-token protocols the dashboard's Live view carries, by market cap. */
export const LIVE_ROWS = 24;

export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

export interface BoardRow {
  rank: number;
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
  implied_value_usd: number;
  model: {
    multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** A board row slimmed down for data.js; the page rebuilds the farm plan from it. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
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

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  peer_count: number;
  global_median: number;
  multiples: Record<string, number>;
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
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const numOr = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** The lower median: sorted[(n - 1) / 2], the definition MODEL.md's pseudocode uses. */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)]!;
}

/** Whole days from `listedAt` to the snapshot date; null when the date is missing or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const snap = Date.parse(`${asOf}T00:00:00Z`);
  const listed = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(snap) || !Number.isFinite(listed)) return null;
  return Math.max(0, Math.floor((snap - listed) / DAY_MS));
}

/** The peer table: token-bearing protocols' mcap/TVL ratios, by category. */
export interface PeerTable {
  globalMedian: number;
  peerCount: number;
  byCategory: Map<string, number[]>;
  multiples: Map<string, number>;
}

export function peerTable(snapshot: Snapshot, m: ModelConstants = MODEL): PeerTable {
  const peers = snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.gecko_id !== null && p.symbol !== null && p.mcap_usd > 0 && p.tvl_usd > 0,
  );
  const byCategory = new Map<string, number[]>();
  for (const p of peers) {
    const key = p.category ?? '(null)';
    const list = byCategory.get(key);
    if (list === undefined) byCategory.set(key, [p.mcap_usd! / p.tvl_usd]);
    else list.push(p.mcap_usd! / p.tvl_usd);
  }
  const globalMedian = median(peers.map((p) => p.mcap_usd! / p.tvl_usd));
  const multiples = new Map<string, number>();
  for (const [key, ratios] of byCategory) {
    multiples.set(
      key,
      clamp((ratios.length * median(ratios) + m.shrinkage_k * globalMedian) / (ratios.length + m.shrinkage_k), m.multiple_floor, m.multiple_cap),
    );
  }
  return { globalMedian, peerCount: peers.length, byCategory, multiples };
}

/** One category's multiple: its shrunk peer median, or the global median when it has no peers. */
export function categoryMultiple(category: string | null, table: PeerTable): number {
  return table.multiples.get(category ?? '(null)') ?? table.globalMedian;
}

export interface Scored {
  implied: number;
  multiple: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  age: number | null;
}

/** One protocol's score under `radar-2`. */
export function scoreOne(p: SnapshotProtocol, asOf: string, table: PeerTable, m: ModelConstants = MODEL): Scored {
  const multiple = categoryMultiple(p.category, table);
  const growthPct = clamp(numOr(p.change_7d, 0), m.growth_floor, m.growth_cap);
  const growthMult = 1 + m.growth_weight * (growthPct / 100);
  const age = ageDays(asOf, p.listed_at);
  const ageForModel = age ?? m.unknown_age_days;
  const maturityMult = m.maturity_floor + m.maturity_range * (Math.min(ageForModel, m.maturity_days) / m.maturity_days);
  const chainMult = 1 + m.chain_step * Math.min(Math.max(p.chains.length - 1, 0), m.chain_cap);
  const implied = Math.max(1, Math.round(p.tvl_usd * multiple * growthMult * maturityMult * chainMult));
  return { implied, multiple, growthPct, growthMult, maturityMult, chainMult, age };
}

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

/**
 * The ranked board: every watchlist slug, plus every pre-token protocol below
 * the floor that passes the watchlist rule — all of them, no arbitrary cutoff.
 * Scored by the model, ranked by implied value, ties broken by slug.
 */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const table = peerTable(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const picked = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) picked.set(slug, p);
  }
  for (const p of snapshot.protocols) {
    if (!picked.has(p.slug) && p.tvl_usd < snapshot.floor_usd && passesWatchlistRule(p)) picked.set(p.slug, p);
  }

  const scored = [...picked.values()].map((p) => ({ p, s: scoreOne(p, snapshot.as_of, table, model) }));
  scored.sort((a, b) => b.s.implied - a.s.implied || slugOrder(a.p, b.p));
  return scored.map(({ p, s }, i) => ({
    rank: i + 1,
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
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      // Full precision: the page recomputes the row from this multiple, so a
      // rounded copy would disagree with board.json by a few dollars.
      multiple: s.multiple,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      age_days: s.age,
    },
    farm_steps: planFor(p, s.age).map(joinStep),
  }));
}

/** One step as a single string: action, then its cost and time, inside 20..600 chars. */
export function joinStep(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

function firstChain(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** Farm capital scales with the protocol's size (MODEL.md §e). */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 50_000_000) return 100;
  return 50;
}

/** Younger protocols need a longer qualifying window; unknown age takes 45 days. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** Gas per transaction by main chain: Ethereum ~$2–8, L2s ~$1–2, Solana ~$0.10, other ~$1. */
const L2_CHAINS = new Set(['Base', 'Arbitrum', 'Optimism', 'Monad', 'Polygon', 'Ink', 'Unichain', 'Katana', 'Linea', 'Scroll', 'Blast']);
function gasFor(chain: string): { first: string; tx: string } {
  if (chain === 'Ethereum') return { first: 'under $8', tx: '$5' };
  if (chain === 'Solana') return { first: 'under $1', tx: '$0.10' };
  if (L2_CHAINS.has(chain)) return { first: 'under $3', tx: '$2' };
  return { first: 'under $1', tx: '$1' };
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

function coreAction(bucket: ReturnType<typeof bucketFor>, p: SnapshotProtocol, capital: number, chain: string): string {
  const name = p.name;
  switch (bucket) {
    case 'vault': return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and keep the position open.`;
    case 'lending': return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
    case 'dex': return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
    case 'rwa': return `Buy $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it in the wallet.`;
    case 'basis': return `Deposit $${capital} of USDC into a ${name} basis-trading vault on ${chain} and keep the position open.`;
    case 'perp': return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
    case 'restake': return `Restake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
    case 'staking': return `Stake $${capital} through ${name} and keep the receipt.`;
    case 'insurance': return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
    case 'payments': return `Keep $${capital} in ${name} on ${chain} for payments and use it for one payment.`;
    case 'chain': return `Bridge $${capital} to ${chain} and use its native apps.`;
    case 'governance': return `Deposit $${capital} into ${name} and vote in its governance.`;
    case 'cedefi': return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and keep the position open.`;
    case 'stable': return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
    case 'bridge': return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
    default: return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
  }
}

function weeklyAction(bucket: ReturnType<typeof bucketFor>, p: SnapshotProtocol, chain: string): string {
  const name = p.name;
  switch (bucket) {
    case 'vault': return `Repeat one qualifying action each week, such as a deposit, a rebalance or a vote on a ${name} vault.`;
    case 'lending': return `Repeat one qualifying action each week, such as a deposit, a borrow or a repayment on ${name}.`;
    case 'dex': return `Repeat one qualifying action each week, such as adding liquidity or a swap on ${name}.`;
    case 'rwa': return `Repeat one qualifying action each week, such as adding to the position or using the asset in an ${name} flow on ${chain}.`;
    case 'basis': return `Repeat one qualifying action each week, such as a deposit or a rebalance in the ${name} vault.`;
    case 'perp': return `Repeat one qualifying action each week, such as adjusting the hedge or adding margin on ${name}.`;
    case 'restake':
    case 'staking': return `Repeat one qualifying action each week, such as adding to the stake or claiming rewards through ${name}.`;
    case 'insurance': return `Repeat one qualifying action each week, such as renewing cover or adding a second policy on ${name}.`;
    case 'payments': return `Repeat one qualifying action each week, such as one payment through ${name} on ${chain}.`;
    case 'chain': return `Repeat one qualifying action each week, such as a bridge or a swap on ${chain} through ${name}.`;
    case 'governance': return `Repeat one qualifying action each week, such as a vote or a deposit on ${name}.`;
    default: return `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`;
  }
}

/**
 * Six farm steps, each with a cost and a time, from the template in MODEL.md §e:
 * capital by TVL, hold by age, gas by main chain, action by category bucket.
 * Nothing is claimed about a points program the snapshot does not record.
 */
export function planFor(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = firstChain(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasFor(chain);
  const bucket = bucketFor(p);
  const subject = bucket === 'vault' ? 'the vault position' : bucket === 'insurance' ? 'the policy' : 'the position';
  const lead = bucket === 'rwa' ? 'Before you sell' : bucket === 'insurance' ? 'Before the policy ends' : 'Before you withdraw';
  return [
    { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: `${gas.first} of gas for the first transaction`, time: '5 minutes' },
    { text: coreAction(bucket, p, capital, chain), cost: `$${capital} of capital and about ${gas.tx} of gas`, time: '15 minutes to set up' },
    { text: weeklyAction(bucket, p, chain), cost: `about ${gas.tx} of gas a week`, time: '10 minutes a week' },
    { text: `Hold ${subject} for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in ${subject === 'the policy' ? 'the policy' : 'the position'}`, time: `${hold} days` },
    { text: `${lead}, open ${p.name}'s own points or rewards page and claim only from the link it publishes.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
  ];
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
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    multiple: row.model.multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const table = peerTable(snapshot, model);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const multiples: Record<string, number> = {};
  for (const key of [...table.multiples.keys()].sort()) multiples[key] = round4(table.multiples.get(key)!);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    peer_count: table.peerCount,
    global_median: round4(table.globalMedian),
    multiples,
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
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** The dashboard's whole dataset as one script: `window.RADAR = {...};` — no fetch, no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
