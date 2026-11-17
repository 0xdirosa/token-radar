# Token Radar — Model Implied Value & Farm Plan (MODEL v2, `radar-2`)

Analisis untuk bounty make.fun **token-radar-01** ($1.325). Snapshot: `input/snapshot.json`,
`as_of` **2026-11-14**, floor watchlist **$50.000.000**, sumber DefiLlama
`https://api.llama.fi/protocols`. Dokumen ini adalah rancangan model untuk builder —
bukan kode entry, bukan submit, bukan tanda tangan apa pun.

**Ringkasan keputusan:** model `radar-2` = TVL × **multiple mcap/TVL peer per kategori
(dengan shrinkage)** × momentum 7 hari × maturitas umur × jangkauan chain. Board
**N = 178** (seluruh 40 watchlist + seluruh 138 pre-token di bawah floor yang lolos
aturan watchlist). Board hanya berisi protokol **pre-token**; protokol bertoken
ditampilkan terpisah sebagai pembanding (Live view), tidak masuk ranking. Nilai top
**$1,96 miliar** (Steakhouse Financial), median **$4,5 juta**, minimum **$657.684**,
monotonik menurun, 178 nilai berbeda.

---

## (a) Statistik snapshot & watchlist

| Ukuran | Nilai |
|---|---|
| Protokol di snapshot (TVL ≥ $5 jt) | 758 |
| Watchlist (TVL ≥ $50 jt, tanpa token, bukan wrapped/staked/bridged/versioned) | 40 |
| Pre-token di seluruh snapshot | 342 |
| Bertoken (mcap/gecko/symbol tercatat) | 416 |
| `change_7d` null | 4 dari 758 (watchlist: 0) |
| `listed_at` null | 113 dari 758 (watchlist: 2 — Lightning Network, Noble) |

**TVL (USD)**

| | Median | p90 | Maks | Min (watchlist) |
|---|---|---|---|---|
| Seluruh snapshot | $33,4 jt | $703,4 jt | $116,08 miliar | — |
| Watchlist | $151,3 jt | $513,8 jt | $2,75 miliar (Steakhouse Financial) | $51,3 jt (Firelight) |

**Umur (`as_of` − `listed_at`, hari)**

| | Median | p90 | Maks | Min |
|---|---|---|---|---|
| Seluruh snapshot | 677 | 1.469 | 1.851 | 2 |
| Watchlist | 488 | 710 | 1.563 (Lofty) | 45 (Nonce Capital) |

Sebaran umur watchlist: <180 hari: 9 · 180–365 hari: 6 · 1–2 tahun: 19 · 2–3 tahun: 3 · >3 tahun: 1.
Watchlist condong ke protokol berumur 1–2 tahun — cukup lama untuk mengakumulasi nilai
tertunda, cukup muda untuk masih pre-token.

**Momentum 7 hari (watchlist):** min −28,5% (b14g) · median −3,3% · maks +11,2%
(Galaxy Curation) · positif 12/40 · di bawah −10%: 9/40. Minggu snapshot ini bearish
untuk watchlist; model harus menghukum penurunan tanpa menghancurkan nilai dasar.

**Kategori — watchlist vs seluruh snapshot**

| Kategori | Watchlist | Seluruh snapshot |
|---|---|---|
| Risk Curators | 12 | 1 bertoken saja (lihat §b) |
| RWA | 7 | 33 |
| Onchain Capital Allocator | 3 | 29 |
| Basis Trading | 2 | 21 |
| Lending | 2 | 75 |
| Chain | 2 | — (kategori kecil) |
| Yield | 2 | 39 |
| Restaking, Dexs, CeDeFi, Insurance, Payments, Governance Incentives, Staking Pool, Stablecoin Wrapper, Collateral Markets | 1 masing-masing | beragam |

Catatan penting: watchlist **didominasi Risk Curators (12/40) dan RWA (7/40)** —
kategori kurator/vault yang baru muncul. Sebaliknya Dexs (99 protokol di snapshot)
hanya 1 di watchlist: hampir semua DEX besar sudah bertoken. Ini alasan kategori
harus masuk model: multiple pasar tiap kategori berbeda jauh.

**Chain — watchlist vs seluruh snapshot**

| Chain | Watchlist | Seluruh snapshot |
|---|---|---|
| Ethereum | 26 | 424 |
| Monad | 15 | 62 |
| Base | 12 | 176 |
| Binance | 11 | 178 |
| Arbitrum | 8 | 188 |
| Solana | 7 | 152 |
| Hyperliquid L1 | 7 | 71 |
| Avalanche | 7 | 125 |
| Plasma / Flare / Katana / Unichain | 5–6 | kecil |

Monad menonjol: 15 dari 40 watchlist ada di Monad, padahal hanya 62 dari 758
protokol snapshot — klaster kurator/vault baru di chain baru. Jumlah chain per
protokol watchlist: 1 chain: 16 · 2: 4 · 3: 7 · 5–9: 5 · 10–15: 7 · 23 (Lagoon): 1.
Sebaran ini bimodal (single-chain vs multi-chain luas), jadi faktor chain harus
dibatasi (cap), bukan linear.

**Daftar 40 watchlist (urut TVL menurun)**

| # | Slug | Kategori | TVL | 7d | Umur |
|---|---|---|---|---|---|
| 1 | steakhouse-financial | Risk Curators | $2,75 B | −2,19% | 543 h |
| 2 | gauntlet | Risk Curators | $1,58 B | +5,65% | 543 h |
| 3 | veda | Onchain Capital Allocator | $1,56 B | −8,29% | 632 h |
| 4 | usdd | CDP | $1,06 B | −2,81% | 611 h |
| 5 | nonce-capital | Risk Curators | $513,8 jt | −9,74% | 45 h |
| 6 | upshift | Onchain Capital Allocator | $499,1 jt | +8,31% | 710 h |
| 7 | bittensor-dtao | Dexs | $376,0 jt | −6,56% | 56 h |
| 8 | onre | RWA | $308,9 jt | +0,11% | 488 h |
| 9 | rockawayx | Risk Curators | $292,5 jt | −2,55% | 233 h |
| 10 | symbiotic | Collateral Markets | $253,9 jt | −12,03% | 886 h |
| 11 | opentrade | RWA | $241,5 jt | −1,64% | 708 h |
| 12 | hyperithm | Risk Curators | $221,6 jt | −4,38% | 543 h |
| 13 | lightning-network | Payments | $217,9 jt | −10,14% | null |
| 14 | plume-vaults | RWA | $211,5 jt | −3,08% | 749 h |
| 15 | k3-capital | Risk Curators | $207,7 jt | −8,90% | 543 h |
| 16 | hive-protocol | Chain | $198,8 jt | −10,18% | 925 h |
| 17 | r25 | RWA | $198,2 jt | +0,30% | 199 h |
| 18 | b14g | Restaking | $173,9 jt | −28,53% | 694 h |
| 19 | clearstar | Risk Curators | $161,8 jt | −10,09% | 543 h |
| 20 | saturn | Stablecoin Wrapper | $154,3 jt | −0,75% | 219 h |
| 21 | lagoon | Onchain Capital Allocator | $151,3 jt | −3,30% | 691 h |
| 22 | curvance | Lending | $136,3 jt | +0,68% | 352 h |
| 23 | galaxy-curation | Risk Curators | $130,0 jt | +11,23% | 177 h |
| 24 | tydro | Lending | $111,3 jt | −4,89% | 394 h |
| 25 | valos | RWA | $106,3 jt | +0,15% | 113 h |
| 26 | armitage-by-wintermute | Risk Curators | $103,5 jt | +5,77% | 178 h |
| 27 | lofty | RWA | $101,1 jt | +0,03% | 1.563 h |
| 28 | doppler-finance | CeDeFi | $93,3 jt | −14,49% | 638 h |
| 29 | ember | RWA | $90,0 jt | −5,96% | 423 h |
| 30 | keyrock | Risk Curators | $83,1 jt | −0,60% | 73 h |
| 31 | noble | Chain | $83,0 jt | −5,23% | null |
| 32 | tori-finance | Basis Trading | $77,4 jt | +4,64% | 143 h |
| 33 | infinifi | Yield | $70,7 jt | −3,28% | 535 h |
| 34 | axis | Basis Trading | $70,1 jt | +2,33% | 86 h |
| 35 | reti-pooling | Staking Pool | $65,3 jt | −10,69% | 659 h |
| 36 | gami-labs | Risk Curators | $63,1 jt | +9,03% | 169 h |
| 37 | yuzu-money | Yield | $57,3 jt | −9,05% | 365 h |
| 38 | mezo-earn | Governance Incentives | $53,6 jt | −12,22% | 186 h |
| 39 | tulipa-capital | Risk Curators | $52,4 jt | −9,35% | 543 h |
| 40 | firelight | Insurance | $51,3 jt | −14,41% | 340 h |

---

## (b) Analisis peer mcap/TVL per kategori

Dasar: 128 protokol bertoken dengan `mcap_usd > 0` dan `tvl_usd > 0`. Rasio =
`mcap_usd / tvl_usd` — berapa pasar menghargai $1 TVL dalam bentuk market cap token.

**Global:** n = 128 · median **0,205** · p25 0,044 · p75 1,043 · p90 2,947 · maks
400,2 (satu outlier Prediction Market). Sebaran sangat miring ke kanan: median
0,205 adalah jangkar yang waras, rata-rata tidak dipakai.

**Per kategori (median mentah, n ≥ 2) — dan multiple akhir setelah shrinkage:**

| Kategori | n | Median mentah | p25 | p75 | Multiple dipakai |
|---|---|---|---|---|---|
| Lending | 15 | 0,132 | 0,033 | 0,423 | 0,151 |
| Dexs | 11 | 0,342 | 0,068 | 1,524 | 0,299 |
| Liquid Staking | 9 | 0,041 | 0,032 | 0,186 | — (kategori dikecualikan dari board) |
| Yield | 9 | 0,191 | 0,121 | 0,999 | 0,196 |
| RWA | 9 | 0,275 | 0,140 | 0,414 | 0,250 |
| CEX | 9 | 0,075 | 0,034 | 0,182 | — (dikecualikan) |
| Canonical Bridge | 8 | 0,367 | 0,317 | 1,344 | — (dikecualikan) |
| Basis Trading | 7 | 0,654 | 0,204 | 0,998 | 0,467 |
| Bridge | 6 | 0,125 | 0,052 | 0,988 | — (dikecualikan) |
| Cross Chain Bridge | 4 | 0,236 | 0,195 | 2,205 | 0,219 |
| Yield Aggregator | 4 | 0,050 | 0,031 | 0,252 | 0,136 |
| Indexes | 3 | 0,148 | 0,051 | 0,148 | 0,183 |
| CDP | 3 | 0,169 | 0,008 | 0,169 | 0,191 |
| Privacy | 3 | 0,969 | 0,034 | 0,969 | 0,491 |
| Restaking | 2 | 0,017 | 0,017 | 0,017 | 0,151 |
| Onchain Capital Allocator | 2 | 0,006 | 0,006 | 0,006 | 0,148 |
| Derivatives | 2 | 1,376 | 1,376 | 1,376 | 0,540 |
| Staking Pool | 2 | 0,001 | 0,001 | 0,001 | 0,147 |
| Payments | 2 | 0,140 | 0,140 | 0,140 | 0,186 |
| Risk Curators | 1 | 2,975 | — | — | **0,667** |
| Chain | 1 | 3,026 | — | — | **0,675** |
| Collateral Management | 1 | 12,160 | — | — | 1,000 (cap) |
| Prediction Market | 1 | 400,204 | — | — | 1,000 (cap) |
| Kategori tanpa peer (CeDeFi, Collateral Markets, Governance Incentives, Insurance, Stablecoin Wrapper, dsb.) | 0 | — | — | — | **0,205** (median global) |

Kategori tanpa peer memakai median global 0,205. Rumus shrinkage
`(n×median_kategori + 5×0,205)/(n+5)` lalu clamp [0,05; 1,0] — builder memakai
rumus ini, bukan menyalin angka tabel.

**Tiga pelajaran dari data ini:**

1. **Median mentah per kategori tidak bisa dipakai apa adanya.** Kategori dengan
   n=1 memberi multiple absurd: Risk Curators 2,975, Chain 3,026, Prediction Market
   400,2. Tanpa koreksi, seluruh top board akan ditentukan oleh satu sampel.
   Karena itu multiple akhir memakai **shrinkage** (lihat §c) + clamp [0,05; 1,0].
   Risk Curators turun dari 2,975 → 0,667 — masih tertinggi kedua, tapi tidak lagi
   mendominasi segalanya.
2. **Multiple antar kategori berbeda ~10x bahkan pada n besar:** Lending 0,132
   vs Dexs 0,342 vs Basis Trading 0,654. Inilah yang membuat model ini bukan
   sekadar TVL: Veda ($1,56 B TVL, Onchain Capital Allocator, multiple 0,148)
   bernilai implied lebih rendah daripada Steakhouse ($2,75 B, Risk Curators,
   0,667) — dan memang begitu seharusnya menurut pasar peer-nya.
3. **Kategori dengan n kecil tapi konsisten memberi sinyal lemah, bukan nol:**
   Onchain Capital Allocator n=2 median 0,006 (sangat rendah — pasar menilai
   allocator hampir tanpa premium token), setelah shrinkage menjadi 0,148, dekat
   median global. Ini konservatif dan bisa dipertahankan: kita tidak mengklaim
   pasar menghargai allocator 0,006× TVL berdasarkan 2 sampel.

**Perbandingan dengan starter (`radar-1`):** starter memakai multiple tunggal
0,25 untuk semua kategori. Akibatnya top-5 starter: Steakhouse $543,6 jt,
Gauntlet $323,8 jt, Veda $311,3 jt, USDD $214,2 jt, Upshift $111,7 jt — urutan
hampir murni TVL. Model ini menggeser Veda dari #3 ke #4 dan Upshift dari #5 ke
#12 (multiple allocator rendah), dan mengangkat Nonce Capital dari #5 TVL ke #3
implied (Risk Curators + muda + multi-chain moderat). Dari 40 baris watchlist,
**36 mengubah posisi relatif terhadap urutan TVL murni** — model ini benar-benar
me-ranking, bukan mengurutkan ulang TVL.

---

## (c) Formula model `radar-2`

### Formula

```
implied_value_usd = max(1, round(
    tvl_usd
  × multiple_kategori            // (d) nilai wajar peer, shrinkage + clamp
  × growth_multiplier            // (b) momentum 7 hari
  × maturity_multiplier          // (c) umur tanpa token
  × chain_multiplier             // (e) jangkauan multi-chain
))
```

### Komponen

**(d) Multiple kategori — bobot terbesar, jangkar nilai.**

```
peer_ratio(p) = mcap_usd / tvl_usd   untuk p bertoken, mcap>0, tvl>0
median_kategori(c) = median(peer_ratio atas protokol bertoken berkategori c)
median_global      = median(peer_ratio atas semua peer) = 0,205
multiple(c) = clamp( (n_c × median_kategori(c) + 5 × median_global) / (n_c + 5),
                     0,05, 1,0 )
            = median_global bila kategori tanpa peer (n_c = 0)
```

- Alasan: pasar sudah memberi harga pada token sejenis; median per kategori
  adalah estimasi "bila protokol ini meluncurkan token, berapa market cap yang
  wajar per $1 TVL". Median (bukan rata-rata) karena sebaran miring (p90 2,947).
- Shrinkage k=5: kategori n=1 hampir sepenuhnya ditarik ke median global
  (contoh: Risk Curators (1×2,975 + 5×0,205)/6 = 0,667); kategori n=15 hampir
  murni median kategorinya (Lending → 0,151). Tanpa shrinkage, satu outlier
  menentukan board. Dengan k=5, tidak ada kategori yang multiple-nya ditentukan
  satu protokol.
- Clamp [0,05; 1,0]: mencegah implied melebihi TVL (token jarang bernilai
  > TVL-nya secara median; p75 global 1,043 menunjukkan 1,0 adalah batas atas
  yang konservatif) dan mencegah multiple ~0 menghapus protokol (Staking Pool
  mentah 0,001 → 0,147 setelah shrinkage, jadi clamp bawah jarang terpicu).

**(a) TVL — skala dasar.** Langsung `tvl_usd`, tanpa transformasi log. Alasan:
TVL adalah ukuran adopsi yang paling sebanding antar protokol; log akan
mengecilkan perbedaan skala yang memang nyata ($2,75 B vs $5 jt adalah 550×,
dan implied harus mencerminkannya). Perbedaan antar protokol justru dibuat
oleh multiple dan pengali lain, bukan dengan meratakan TVL.

**(b) Momentum — `growth_multiplier = 1 + 0,4 × clamp(change_7d, −60, +120) / 100`**

- `change_7d` null → 0 (netral, bukan hukuman; hanya 4 protokol snapshot yang
  null, 0 di watchlist).
- Clamp −60%/+120%: 7 hari adalah jendela berisik; tanpa clamp, satu minggu
  +300% akan mendominasi board. Rentang pengali yang dihasilkan: **0,76–1,48**.
- Bobot 0,4 (bukan 1,0 seperti starter yang memakai 0,5): momentum adalah
  sinyal, bukan nilai — protokol yang turun 10% dalam seminggu tidak kehilangan
  10% nilai fundamentalnya. Pada snapshot ini (median watchlist −3,3%), efek
  tipikal hanya ±2–4%.
- Negatif ditangani simetris: b14g (−28,53%) mendapat 0,886; Galaxy Curation
  (+11,23%) mendapat 1,045.

**(c) Maturitas — `maturity_multiplier = 0,8 + 0,2 × min(age_days, 1095) / 1095`**

- `age_days = as_of − listed_at` (hari, floor 0); `listed_at` null → 548 hari
  (median umur seluruh snapshot 677 h; dipakai 548 sebagai fallback netral —
  di tengah rentang, bukan 365 hari starter yang terlalu muda).
- Rentang **0,80–1,00**: protokol 45 hari (Nonce Capital) mendapat 0,808;
  protokol ≥3 tahun mendapat 1,00. Alasan: protokol yang bertahan 1–3 tahun
  tanpa token mengakumulasi nilai tertunda (pengguna, integrasi, reputasi)
  yang belum termonetisasi token — tapi efeknya dibatasi 20% karena umur saja
  bukan nilai; starter memakai rentang 0,6–1,0 (40%), terlalu besar sehingga
  umur bisa mengalahkan TVL.
- Cap 1095 hari (3 tahun): setelah 3 tahun, umur tambahan tidak menambah
  "nilai tertunda" — Lofty (1.563 hari) dan Hive (925 hari) dibedakan hanya
  sampai batas ini.

**(e) Jangkauan chain — `chain_multiplier = 1 + 0,05 × min(max(chains−1, 0), 4)`**

- Rentang **1,00–1,20**: single-chain 1,00; ≥5 chain 1,20. Alasan: multi-chain
  berarti distribusi dan permukaan pengguna lebih luas, tapi TVL sudah
  menghitung semua chain — menggandakan hitungan akan double-count. Cap 4
  (bukan linear sampai 23 chain seperti Lagoon) karena sebaran chain bimodal
  dan chain ke-10+ menambah sedikit.
- Contoh: Steakhouse (11 chain) 1,20; Gauntlet (14) 1,20; Veda (13) 1,20;
  Bittensor dTAO (1 chain) 1,00.

### Mengapa bobot ini (ringkasan sensitivitas)

| Komponen | Rentang pengali | Peran |
|---|---|---|
| Multiple kategori | 0,136–0,675 (≈5×) | Penentu utama — membedakan kategori |
| TVL | 5 jt–2,75 B (≈550×) | Skala — membedakan ukuran |
| Momentum | 0,76–1,48 (≈2×) | Koreksi jangka pendek |
| Maturitas | 0,80–1,00 (1,25×) | Koreksi umur, dibatasi |
| Chain | 1,00–1,20 (1,2×) | Koreksi jangkauan, dibatasi |

Urutan pengaruh yang disengaja: **kategori ≈ skala > momentum > maturitas ≈ chain**.
Tiga pengali terakhir bersama-sama maksimal mengubah nilai ±~50%, tidak pernah
membalikkan perbedaan TVL 10×. Ini yang membuat ranking stabil dan bisa
dipertahankan di depan juri: tidak ada satu komponen kecil yang membajak board.

### Pseudocode (untuk builder — implementasi persis)

```ts
// Input: snapshot { as_of, floor_usd, protocols[], watchlist[] }
// Output: board rows terurut, rank 1..N, implied strictly non-increasing.

const DAY_MS = 86_400_000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 1. Peer ratios dari protokol BERT token di snapshot yang sama.
const peers = protocols.filter(p =>
  p.mcap_usd !== null && p.gecko_id !== null && p.symbol !== null &&
  p.mcap_usd > 0 && p.tvl_usd > 0);
const ratio = p => p.mcap_usd / p.tvl_usd;
const median = xs => { const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)]; };
const globalMedian = median(peers.map(ratio));            // 0,205
const byCategory = groupBy(peers, p => p.category ?? "(null)");

// 2. Multiple per kategori (shrinkage k=5, clamp [0.05, 1.0]).
function multiple(category) {
  const rs = byCategory.get(category ?? "(null)");
  if (!rs) return globalMedian;
  return clamp((rs.length * median(rs) + 5 * globalMedian) / (rs.length + 5), 0.05, 1.0);
}

// 3. Umur.
function ageDays(p) {
  if (p.listed_at === null) return null;
  return Math.max(0, Math.floor(
    (Date.parse(as_of + "T00:00:00Z") - Date.parse(p.listed_at + "T00:00:00Z")) / DAY_MS));
}

// 4. Skor satu protokol.
function impliedValue(p) {
  const g = p.change_7d === null ? 0 : clamp(p.change_7d, -60, 120);
  const growthMult = 1 + 0.4 * g / 100;
  const age = ageDays(p);
  const ageForModel = age === null ? 548 : age;
  const maturityMult = 0.8 + 0.2 * Math.min(ageForModel, 1095) / 1095;
  const chainMult = 1 + 0.05 * Math.min(Math.max(p.chains.length - 1, 0), 4);
  const implied = Math.max(1, Math.round(
    p.tvl_usd * multiple(p.category) * growthMult * maturityMult * chainMult));
  return { implied, growthMult, maturityMult, chainMult, age,
           multiple: multiple(p.category) };
}

// 5. Pemilihan baris (lihat §d), lalu urutkan:
//    sort by implied DESC, tie-break slug ASC (deterministik).
//    rank = posisi + 1. Jaminan: implied[i] <= implied[i-1] karena pengurutan;
//    nilai dibulatkan ke integer — bila dua implied sama persis setelah
//    pembulatan, tie-break slug menjaga urutan deterministik dan gate
//    "tidak naik seiring rank" tetap lolos (sama, bukan naik).
```

**Determinisme:** semua input dari snapshot; tidak ada `Date.now()`, random, atau
data luar. Dua run pada snapshot yang sama menghasilkan board yang identik byte
demi byte (kecuali tie-break slug yang memang deterministik). Tidak ada nama
protokol yang di-hardcode: multiple dihitung dari kategori, bukan dari slug.

**Yang TIDAK dipakai (dan alasannya):** `mcap_usd` protokol itu sendiri (board
hanya pre-token — semuanya null); `gecko_id`/`symbol` (hanya dipakai untuk
menentukan pre-token vs bertoken); `name` kecuali untuk aturan eksklusi
watchlist; data harga/Yield/APR/points (tidak ada di snapshot — mengarangnya
akan melanggar "model mengikuti angka snapshot").

---

## (d) Aturan inklusi & ukuran board N

### Rekomendasi: **N = 178**

- **40 watchlist** (wajib — coverage 1,0 adalah gerbang pertama juri).
- **+ 138 pre-token di bawah floor** yang lolos **aturan watchlist yang sama**,
  diurutkan menurut skor model (bukan TVL).
- Total maksimum yang mungkin di bawah aturan ini adalah 178 — tidak ada baris
  ke-179 yang memenuhi syarat, jadi N bukan angka yang dipilih sembarangan:
  **board mencakup seluruh alam pre-token yang memenuhi definisi watchlist
  pada TVL ≥ $5 jt**.

### Aturan inklusi baris di bawah floor (aturan watchlist, floor dihapus)

Suatu protokol di bawah floor masuk board bila dan hanya bila:

1. Pre-token: `mcap_usd`, `gecko_id`, `symbol` ketiganya null;
2. `tvl_usd >= $5.000.000` (sudah dijamin snapshot) — **tanpa floor TVL minimum
   tambahan**; baris terbawah adalah Nucleus ($5,0 jt TVL, implied $657.684);
3. Bukan produk wrapped/staked/bridged: kategori **bukan** Bridge, Canonical
   Bridge, Liquid Staking, Liquid Restaking, Restaked BTC, CEX; nama tidak
   mengandung kata utuh `wrapped`/`staked`/`staking` (case-insensitive) dan
   tidak diawali nama exchange (Binance, Coinbase, Bybit, Kraken, Bitget, OKX,
   Bitfinex, Gemini);
4. Nama tidak berakhiran penanda versi (`\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$`).

Aturan ini **persis definisi watchlist di `input/README.md`, minus floor** —
jadi board adalah "watchlist tanpa floor", sebuah cerita yang satu kalimat dan
bisa dipertahankan di depan juri. Ke-40 watchlist lolos aturan ini (verifikasi:
0 gagal).

### Mengapa bukan N = 200 (starter) atau N = 226 (longgar)

| Opsi | Isi | Masalah |
|---|---|---|
| N = 200 (starter) | 40 + 160 di bawah floor **menurut TVL** | (i) Cutoff 160 arbitrer — tidak ada alasan 160 bukan 150/170. (ii) Pilihan menurut TVL, bukan skor model: baris ke-160 dipilih karena besar, bukan karena bernilai. (iii) Di bawah floor ada 186 kandidat longgar — 200 berarti membuang 26 tanpa alasan. |
| N = 226 (longgar) | 40 + 186 pre-token di bawah floor, filter starter (hanya CEX + versioned) | Memasukkan **48 produk yang definisi watchlist sendiri menolak**: 20 Liquid Staking, 13 Bridge, 7 Canonical Bridge, 3 Liquid Restaking, 3 Staking Pool, 1 Chain bernama staking, 1 Farm staking. Produk-produk ini — mis. `bitget-sol`, `marginfi-lst`, `morph-bridge` — adalah representasi token yang **sudah diperdagangkan** (SOL, dsb.), bukan protokol yang menunggu token sendiri. Memasukkannya merusak klaim "pre-token" di depan juri kriteria 2. |
| **N = 178 (direkomendasikan)** | 40 + 138, filter ketat = definisi watchlist | Tidak ada cutoff arbitrer (semua yang memenuhi syarat masuk); tidak ada produk wrapped/staked/bridged; board sepenuhnya pre-token. Kekurangan: lebih sedikit baris dari starter — tapi 178 masih jauh di atas minimum gate (100) dan setiap baris bisa dipertahankan. |

Di bawah filter ketat, 5 besar pre-token di bawah floor menurut model: re7-labs
$31,8 jt · ultrayield-curator $26,9 jt · y10k-capital $16,9 jt · august-digital
$16,7 jt · apex-omni $16,6 jt. TVL mereka $5–49,6 jt — inilah "early radar"
yang diminta bounty: protokol kecil yang model nilai tinggi karena kategori +
momentum + umur, bukan karena TVL-nya paling besar (top-10 di bawah floor
menurut TVL vs menurut model hanya cocok sebagian; contoh: `current` $49,6 jt
TVL tidak masuk top-10 model).

### Protokol bertoken: masuk board atau tidak?

**Rekomendasi: TIDAK masuk board ranking. Masuk dashboard sebagai view terpisah
("Live token" / pembanding), dengan nilai pasarnya sendiri (`mcap_usd`), bukan
implied value.**

Alasan, merujuk kriteria juri 2 ("board memisahkan protokol yang tokennya sudah
diperdagangkan dari yang belum"):

- Kriteria 2 menghargai pemisahan yang **jelas**. Mencampur bertoken ke dalam
  ranking yang sama — walau dengan label — mengaburkan jawaban atas pertanyaan
  bounty ("protokol pre-token mana yang layak di-farming?") dan memaksa juri
  menilai apakah labelnya cukup jelas. View terpisah adalah pemisahan yang
  tidak bisa disalahpahami.
- Implied value adalah klaim "berapa nilai token bila diluncurkan"; untuk
  protokol bertoken, nilai itu sudah ada (market cap) — menaruh keduanya dalam
  satu kolom angka mengundang perbandingan yang salah (market cap vs model).
- View terpisah justru **memperkuat** model: ia adalah tempat peer multiple
  (§b) ditampilkan sebagai bukti — "inilah 24 token yang sudah diperdagangkan,
  dan dari merekalah multiple kategori dihitung". Starter sudah melakukan ini
  (`LIVE_ROWS = 24`, urut market cap); pertahankan, dan tampilkan multiple
  kategori di view itu agar juri melihat asal angka model.
- Dampak ke kriteria 1 (liputan watchlist): tidak ada — coverage dihitung dari
  board, dan board 178 baris mencakup 40/40 watchlist (coverage 1,0).
- Dampak ke kriteria 4 (dashboard sortable/filterable): view Live menambah satu
  filter/tab tanpa mengorbankan board utama.

Implementasi: `liveRows` = protokol bertoken (bukan CEX), urut `mcap_usd`
menurun, tampilkan `mcap_usd` + `tvl_usd` + rasio `mcap/TVL` per baris. Jumlah
24 seperti starter sudah cukup sebagai pembanding (bukan ranking kedua).

---

## (e) Template farm_steps per kategori + 3 contoh lengkap

### Prinsip template

- **6 langkah** per protokol (dalam rentang gate 3–12). Struktur tetap:
  1) dompet baru, 2) aksi utama kategori, 3) aksi kualifikasi mingguan,
  4) masa hold, 5) cek halaman insentif resmi, 6) log + rencana keluar.
- **Setiap langkah satu string 20–600 karakter** dengan format
  `<aksi>. Cost: <biaya>. Time: <waktu>.` — biaya dan waktu selalu eksplisit
  (kriteria juri 3: "farm plan konkret dengan biaya dan waktu").
- **Modal menurut TVL:** ≥$1 B → $250 · ≥$100 jt → $150 · ≥$50 jt → $100 ·
  di bawah itu → $50. Modal kecil dan seragam agar rencana realistis untuk
  semua ukuran protokol.
- **Masa hold menurut umur:** umur <180 hari → 60 hari · <365 hari → 45 hari ·
  ≥365 hari → 30 hari · null → 45 hari. Protokol muda butuh jendela kualifikasi
  lebih panjang.
- **Gas menurut chain utama:** Ethereum ~$2–8 · L2/Base/Arbitrum/Monad/Flare
  ~$1–2 · Solana ~$0,10. Angka ini perkiraan wajar per chain, bukan janji.
- **Tidak mengarang program insentif.** Snapshot tidak berisi data points /
  airdrop / program insentif apa pun. Maka langkah 5 selalu berbunyi "cek
  halaman resmi protokol untuk program insentif" — tidak pernah mengklaim ada
  points program bila tidak ada datanya. Bila protokol memang punya program
  (diketahui dari halaman resminya saat builder memverifikasi), barulah langkah
  itu boleh menyebut nama programnya.
- Slot yang diisi dari snapshot: `{name}`, `{chain}` (chain pertama),
  `{capital}`, `{hold}`, `{gas}`. Tidak ada nama protokol yang di-hardcode
  di template.

### Aksi utama per kategori

| Kategori (cocok substring, lowercase) | Aksi utama |
|---|---|
| Risk Curators, Onchain Capital Allocator, Yield, Yield Aggregator, Leveraged Farming | Deposit `{capital}` ke vault `{name}` di `{chain}` |
| Lending, CDP, Collateral Markets | Supply `{capital}` USDC sebagai collateral / supply ke `{name}` di `{chain}` |
| Dexs, Liquidity Manager | Sediakan `{capital}` likuiditas di pool utama `{name}` di `{chain}` |
| RWA | Beli/mint `{capital}` aset yield-bearing `{name}` di `{chain}` dan hold |
| Basis Trading | Deposit `{capital}` ke vault basis-trading `{name}` di `{chain}` |
| Perpetuals / Derivatives | Deposit `{capital}` USDC sebagai margin di `{name}`, buka satu hedge kecil |
| Restaking | Restake `{capital}` aset staking chain melalui `{name}` |
| Staking Pool | Stake `{capital}` melalui `{name}` dan simpan receipt |
| Insurance | Beli `{capital}` cover dari `{name}` di `{chain}` |
| Payments | Gunakan `{name}` untuk pembayaran / simpan `{capital}` saldo di `{chain}` |
| Chain | Bridge `{capital}` ke `{chain}` dan gunakan aplikasi native-nya |
| Governance Incentives | Deposit `{capital}` ke `{name}` dan ikuti voting governance |
| CeDeFi | Deposit `{capital}` ke vault CeDeFi `{name}` di `{chain}` |
| Stablecoin Wrapper, Stablecoins | Mint/deposit `{capital}` aset stabil melalui `{name}` di `{chain}` |
| Bridge / Canonical Bridge (tidak ada di board — hanya untuk kelengkapan) | Bridge `{capital}` USDC ke `{chain}` melalui `{name}` |
| Default (kategori null / lain) | Deposit `{capital}` USDC ke `{name}` di `{chain}` |

Langkah 3 (mingguan) menyesuaikan kategori: deposit / borrow / swap / vote /
rebalance / renew cover — selalu satu aksi kecil per minggu, bukan daftar
tugas yang mustahil.

### Contoh 1 — besar: Steakhouse Financial (rank 1, Risk Curators, TVL $2,75 B, Base, implied $1,96 B)

1. `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. Cost: under $3 of gas for the first transaction. Time: 5 minutes.` (162 karakter)
2. `Deposit $250 of USDC into a Steakhouse Financial vault on Base and keep the position open. Cost: $250 of capital and about $2 of gas. Time: 15 minutes to set up.` (161 karakter)
3. `Repeat one qualifying action each week, such as a deposit, a rebalance or a vote on a Steakhouse Financial vault. Cost: about $2 of gas a week. Time: 10 minutes a week.` (168 karakter)
4. `Hold the vault position for at least 30 days so the activity is counted in more than one snapshot. Cost: the $250 stays in the position. Time: 30 days.` (151 karakter)
5. `Before you withdraw, open Steakhouse Financial's own points or rewards page and claim only from the link it publishes. Cost: no fee to check, and never pay to claim. Time: 10 minutes.` (183 karakter)
6. `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it. Cost: nothing but the log. Time: 5 minutes.` (152 karakter)

### Contoh 2 — menengah: OnRe (rank 14, RWA, TVL $308,9 jt, Solana, implied $68,6 jt)

1. `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. Cost: under $1 of gas for the first transaction. Time: 5 minutes.` (162 karakter)
2. `Buy $150 of OnRe's yield-bearing asset on Solana and hold it in the wallet. Cost: $150 of capital and about $0.10 of gas. Time: 15 minutes to set up.` (149 karakter)
3. `Repeat one qualifying action each week, such as adding to the position or using the asset in an OnRe flow on Solana. Cost: about $0.10 of gas a week. Time: 10 minutes a week.` (174 karakter)
4. `Hold the position for at least 30 days so the activity is counted in more than one snapshot. Cost: the $150 stays in the position. Time: 30 days.` (145 karakter)
5. `Before you sell, open OnRe's own points or rewards page and claim only from the link it publishes. Cost: no fee to check, and never pay to claim. Time: 10 minutes.` (163 karakter)
6. `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it. Cost: nothing but the log. Time: 5 minutes.` (152 karakter)

### Contoh 3 — kecil: Firelight (rank 63, Insurance, TVL $51,3 jt, Flare, implied $8,5 jt)

1. `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. Cost: under $1 of gas for the first transaction. Time: 5 minutes.` (162 karakter)
2. `Buy $100 of cover from Firelight on Flare and keep the policy active. Cost: $100 of capital and about $1 of gas. Time: 15 minutes to set up.` (140 karakter)
3. `Repeat one qualifying action each week, such as renewing cover or adding a second policy on Firelight. Cost: about $1 of gas a week. Time: 10 minutes a week.` (157 karakter)
4. `Hold the policy for at least 45 days so the activity is counted in more than one snapshot. Cost: the $100 stays in the policy. Time: 45 days.` (141 karakter)
5. `Before the policy ends, open Firelight's own points or rewards page and claim only from the link it publishes. Cost: no fee to check, and never pay to claim. Time: 10 minutes.` (175 karakter)
6. `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it. Cost: nothing but the log. Time: 5 minutes.` (152 karakter)

Semua 18 langkah di atas terverifikasi 140–183 karakter (dalam 20–600), 6 langkah
per protokol (dalam 3–12). Catatan Firelight: umur 340 hari → hold 45 hari
(<365 hari); modal $100 karena TVL $51,3 jt (tier ≥$50 jt).

---

## (f) Hasil model — top 20 & sebaran nilai (N = 178, `radar-2`)

| Rank | Slug | Kategori | TVL | 7d | Umur | Mult | Growth | Mat. | Chain | Implied |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | steakhouse-financial | Risk Curators | $2,75 B | −2,19% | 543 h | 0,667 | 0,991 | 0,899 | 1,20 | **$1,96 B** |
| 2 | gauntlet | Risk Curators | $1,58 B | +5,65% | 543 h | 0,667 | 1,023 | 0,899 | 1,20 | **$1,16 B** |
| 3 | nonce-capital | Risk Curators | $513,8 jt | −9,74% | 45 h | 0,667 | 0,961 | 0,808 | 1,05 | **$279,3 jt** |
| 4 | veda | Onchain Capital Allocator | $1,56 B | −8,29% | 632 h | 0,148 | 0,967 | 0,915 | 1,20 | **$245,8 jt** |
| 5 | usdd | CDP | $1,06 B | −2,81% | 611 h | 0,191 | 0,989 | 0,912 | 1,10 | **$200,3 jt** |
| 6 | rockawayx | Risk Curators | $292,5 jt | −2,55% | 233 h | 0,667 | 0,990 | 0,843 | 1,20 | **$195,1 jt** |
| 7 | hyperithm | Risk Curators | $221,6 jt | −4,38% | 543 h | 0,667 | 0,983 | 0,899 | 1,20 | **$156,6 jt** |
| 8 | k3-capital | Risk Curators | $207,7 jt | −8,90% | 543 h | 0,667 | 0,964 | 0,899 | 1,20 | **$144,1 jt** |
| 9 | hive-protocol | Chain | $198,8 jt | −10,18% | 925 h | 0,675 | 0,959 | 0,969 | 1,00 | **$124,7 jt** |
| 10 | clearstar | Risk Curators | $161,8 jt | −10,09% | 543 h | 0,667 | 0,960 | 0,899 | 1,20 | **$111,7 jt** |
| 11 | bittensor-dtao | Dexs | $376,0 jt | −6,56% | 56 h | 0,299 | 0,974 | 0,810 | 1,00 | **$88,8 jt** |
| 12 | upshift | Onchain Capital Allocator | $499,1 jt | +8,31% | 710 h | 0,148 | 1,033 | 0,930 | 1,20 | **$85,2 jt** |
| 13 | galaxy-curation | Risk Curators | $130,0 jt | +11,23% | 177 h | 0,667 | 1,045 | 0,832 | 1,10 | **$82,9 jt** |
| 14 | onre | RWA | $308,9 jt | +0,11% | 488 h | 0,250 | 1,000 | 0,889 | 1,00 | **$68,6 jt** |
| 15 | opentrade | RWA | $241,5 jt | −1,64% | 708 h | 0,250 | 0,993 | 0,929 | 1,10 | **$61,3 jt** |
| 16 | armitage-by-wintermute | Risk Curators | $103,5 jt | +5,77% | 178 h | 0,667 | 1,023 | 0,833 | 1,00 | **$58,7 jt** |
| 17 | plume-vaults | RWA | $211,5 jt | −3,08% | 749 h | 0,250 | 0,988 | 0,937 | 1,20 | **$58,7 jt** |
| 18 | noble | Chain | $83,0 jt | −5,23% | null | 0,675 | 0,979 | 0,900 | 1,00 | **$49,4 jt** |
| 19 | symbiotic | Collateral Markets | $253,9 jt | −12,03% | 886 h | 0,205 | 0,952 | 0,962 | 1,00 | **$47,6 jt** |
| 20 | keyrock | Risk Curators | $83,1 jt | −0,60% | 73 h | 0,667 | 0,998 | 0,813 | 1,05 | **$47,2 jt** |

**Sebaran nilai board (N = 178):** maks **$1,96 B** · median **$4,5 jt** ·
min **$657.684** (Nucleus) · 178 nilai berbeda · monotonik menurun terverifikasi
(tidak ada dua nilai berurutan yang naik; tidak semua sama). Top-20 seluruhnya
watchlist; seluruh 40 watchlist berada di rank 1–64. Lima terbawah board:
valantis-sthype-restaking $990.314 · swan-dao $940.552 · granite $820.089 ·
flying-tulip-ftusd $709.402 · nucleus $657.684.

**Bacaan top-20:** Risk Curators mendominasi puncak bukan karena namanya, tapi
karena kombinasi yang bisa diaudit: TVL besar + multiple kategori tertinggi
setelah shrinkage (0,667) + multi-chain. Veda/Upshift (TVL $1,56 B/$499 jt)
jatuh ke #4/#12 karena multiple allocator hanya 0,148 — pasar peer menilai
kategori itu murah. Nonce Capital (#3) menarik: TVL hanya $513,8 jt tapi umur
45 hari + multiple kurator mengangkatnya di atas Veda yang TVL-nya 3× lipat.
Bittensor dTAO (#11) menunjukkan batas model: TVL $376 jt tapi single-chain
dan umur 56 hari menahannya di bawah $100 jt.

**Perbandingan vs starter (`radar-1`, N=200):** starter top-5 maks $543,6 jt,
median $4,1 jt — model ini memberi top yang ~3,6× lebih besar karena multiple
kategori (0,667 vs 0,25 seragam) dan karena chain multiplier. Overlap top-10
dengan starter hanya 5/10 — model ini benar-benar ranking yang berbeda, bukan
starter dengan label baru.

**Verifikasi yang dijalankan** (skrip sekali jalan, Node 22.23.4,
`/tmp/token-radar-analysis.js` + `/tmp/check-strict-top.js` + `/tmp/check-filter.js`,
pada snapshot yang sama): coverage watchlist 40/40; rank 1..178 unik; implied
integer positif ≤ 1e14; monotonik menurun; 178 nilai berbeda; farm_steps 6
langkah × 20–600 karakter (contoh terverifikasi 140–183 karakter).

---

## Catatan untuk builder

1. Ganti `MODEL` starter dengan konstanta `radar-2` di atas; naikkan
   `MODEL_VERSION` ke `radar-2`; ganti `EARLY_ROWS = 160` (pilih menurut TVL)
   dengan seleksi menurut **skor model + filter ketat §d** (tidak ada angka
   cutoff — ambil semua yang lolos).
2. Tampilkan per baris: keempat pengali (multiple, growth, maturity, chain)
   dan umur — juri kriteria 2 menilai apakah model "mengikuti angka snapshot",
   dan angka itu harus terlihat di dashboard, bukan hanya di dossier.
3. Tampilkan multiple kategori di view Live ("dari 128 token yang sudah
   diperdagangkan inilah multiple tiap kategori dihitung") — ini bukti model.
4. Farm steps dihasilkan dari template §e; jangan tulis langkah per protokol
   secara manual (tidak scalable dan melanggar "bukan daftar nama hardcoded").
5. Satu-satunya hal yang boleh berubah antar run adalah snapshot itu sendiri:
   semua konstanta (k=5, clamp, bobot, cap) adalah bagian dari model dan
   ditampilkan di dashboard.

*Disusun 2026-11-17 dari `snapshot.json` as_of 2026-11-14. Tidak ada data luar
snapshot yang dipakai; tidak ada nama protokol yang di-hardcode dalam model.*
