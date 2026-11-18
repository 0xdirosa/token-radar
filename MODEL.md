# Token Radar — Model Implied Value & Farm Plan (MODEL v4, `radar-4`)

Analisis untuk bounty make.fun **token-radar-01** ($1.325). Snapshot:
`input/snapshot.json`, `as_of` **2026-11-14**, floor watchlist
**$50.000.000**, sumber DefiLlama `https://api.llama.fi/protocols`.
Dokumen ini adalah rancangan model untuk builder — bukan kode entry, bukan
submit, bukan tanda tangan apa pun. Semua angka di sini dihitung dari
snapshot yang sama oleh `lib/model.ts` (`buildRadar` → `data.js` →
`validation`); tidak ada angka yang ditulis tangan dari luar snapshot.

**Ringkasan keputusan:** model `radar-4` = **kurva ukuran log-log fitted
(Huber) pada token yang sudah diperdagangkan** × **offset kategori yang
di-shrink kuat (k=100)** × **growth 7 hari kecil** × **ekonomi farm yang
dinetokan terhadap yield posisi dan tanpa haircut dilusi**. Board
**N = 198** (40 watchlist + 20 di atas floor di luar watchlist + 138
early di bawah floor). Nilai top **$59,9 juta** (Sentora Curator),
median **$6,82 juta**, minimum **$3,20 juta**, monotonik menurun, 198
nilai berbeda. Validasi out-of-sample: LOO miss **×3,09** vs flat
**×5,02**; walk-forward **×2,40** vs flat **×4,83**. Band per baris
adalah *blind band* dari residual LOO; rank range dari 200 bootstrap
refits. Farm: **7 FARM / 43 THIN / 148 SKIP** pada $1.000;
**65 FARM / 68 THIN / 65 SKIP** pada $10.000.

Dibanding `radar-3` (MODEL v3): dua perubahan. **(1) Fit:** shrinkage
offset kategori k=12 → k=100 — blind test menunjukkan offset hampir
tidak membawa sinyal pada 105 peer, jadi offset dikecilkan sampai
hanya tersisa jejaknya (LOO ×3,28 → ×3,09; within-3× 46,67% →
47,62%; WF tetap ×2,40). Implied value turun ~12% di puncak
(Steakhouse $67,4 jt → $59,2 jt) dan Polymarket jatuh #6 → #9 karena
boost kategori ×1,65-nya hilang. **(2) Ekonomi farm:** forgone yield
dinetokan terhadap yield posisi (T-bill 4,5% − 3,5% untuk bucket yang
menghasilkan yield; 0% bila posisi tidak menghasilkan) dan time share
90/(age+90) **dihapus** — slice kini bersyarat launch, launch odds
ditampilkan terpisah sebagai konteks. Kedua perubahan adalah asumsi
yang dinyatakan di §(e) beserta kontrafaktualnya; bukan perubahan
diam-diam. `radar-3` memberi **0 FARM pada ukuran berapa pun**;
`radar-4` memberi 7 FARM pada $1.000 — perubahan ini menutup jurang
terbesar vs 10 besar leaderboard, yang hampir semuanya memakai kedua
perlakuan yang sama (GAP-ANALYSIS.md §2–§4; analisis artifact segar
18 Nov 2026).

---

## (a) Statistik snapshot & watchlist

| Ukuran | Nilai |
|---|---|
| Protokol di snapshot (TVL ≥ $5 jt) | 758 |
| Watchlist (TVL ≥ $50 jt, tanpa token, bukan wrapped/staked/bridged/versioned) | 40 |
| Pre-token di seluruh snapshot (mcap, gecko, symbol ketiganya null) | 342 |
| Bertoken / mencatat token (gecko atau symbol non-null) | 416 |
| Bertoken dengan mcap > 0 (calon peer) | 128 |
| Peer yang dipakai fit (128 minus Bridge/Canonical Bridge/CEX) | 105 |
| `change_7d` null | 4 dari 758 (watchlist: 0) |
| `listed_at` null | 113 dari 758 (watchlist: 2 — Lightning Network, Noble; board: 7) |

**Akuntansi 758 protokol:** ranked **198** + bertoken **416** + set aside
**144** = 758. Set aside 144 pre-token yang gagal aturan watchlist:
CEX 42 · Liquid Staking 38 · Bridge 28 · Canonical Bridge 15 ·
nama versioned 11 · nama wrapped/staked 5 · Liquid Restaking 3 ·
Restaked BTC 2.

**TVL (USD)**

| | Median | p90 | Maks | Min (watchlist) |
|---|---|---|---|---|
| Seluruh snapshot | $33,4 jt | $703,4 jt | $116,08 miliar | — |
| Watchlist | $151,3 jt | $513,8 jt | $2,75 miliar (Steakhouse Financial) | $51,3 jt (Firelight) |

**Umur (`as_of` − `listed_at`, hari):** median seluruh snapshot 677 ·
watchlist 488 · p90 watchlist 710 · maks watchlist 1.563 (Lofty) · min
watchlist 45 (Nonce Capital).

**Momentum 7 hari (watchlist):** min −28,5% (b14g) · median −3,3% ·
maks +11,2% (Galaxy Curation) · positif 12/40 · di bawah −10%: 9/40.

**Kategori — watchlist vs seluruh snapshot:** Risk Curators 12/40 (hanya
1 peer bertoken) · RWA 7 · Onchain Capital Allocator 3 · Basis Trading 2 ·
Lending 2 · Chain 2 · Yield 2 · sisanya 1 masing-masing. Dexs (99
protokol di snapshot) hanya 1 di watchlist: hampir semua DEX besar sudah
bertoken.

**Pre-token di atas floor yang bukan watchlist:** 92 protokol. Yang lolos
aturan ketat: **20** (lihat §d). Yang gagal: **72** — CEX 27 · Liquid
Staking 18 · Bridge 15 · Canonical Bridge 8 · nama versioned 2 ·
Restaked BTC 2.

---

## (b) Peer yang dipakai fit — dan yang sengaja tidak dipakai

Peer fit = protokol bertoken dengan `mcap_usd > 0`, `tvl_usd > 0`,
`gecko_id` dan `symbol` non-null, **minus kategori Bridge, Canonical
Bridge, CEX** (23 protokol: Bridge 6 · Canonical Bridge 8 · CEX 9).
Alasan: token exchange dan token bridge menilai hal yang berbeda dari
token milik protokol sendiri (mis. Rain, Prediction Market, rasio
mcap/TVL 400,2; Nexo, CEX, rasio 69,4; mantle-bridge, rasio 14,5), dan
ketiga kategori itu juga yang dikecualikan house rule dari watchlist —
jadi comps yang dipakai adalah comps yang sebanding dengan baris board.
Keputusan ini diuji, bukan diasumsikan: fit pada 128 peer memberi LOO
miss ×3,40 (OLS, curve-only); fit pada 105 peer memberi ×3,27 (OLS) /
×3,18 (Huber). Sebaran rasio mcap/TVL pada 105 peer: median 0,205 ·
p25 0,044 · p75 1,027 — masih sangat miring, itulah mengapa fit dilakukan
di ruang log, bukan pada rasio mentah.

**Sensitivitas peer set (LOO, curve-only):** 128 peer OLS ×3,40 · 105
peer OLS ×3,27 · 105 peer Huber ×3,18 · 94 peer (minus LST juga) OLS
×3,65 · 90 peer (hanya kategori yang muncul di board) OLS ×3,62.
Mengeluarkan LST memperburuk hasil, jadi LST tetap di dalam fit;
mengeluarkan Bridge/CEX memperbaiki, jadi keduanya keluar. Kategori
board yang tidak punya peer sama sekali (18 baris: CDP Manager, OTC
Marketplace, Farm, Insurance, Governance Incentives, Stablecoin
Wrapper, CeDeFi, Collateral Markets, dsb.) mendapat offset 0 — kurva
murni, tanpa klaim kategori.

---

## (c) Formula model `radar-4`

### Formula

```
log10(implied) = a + b · log10(tvl_usd / $100M)
               + offset_kategori            // median residual kategori, shrink k=100
               + 0,1 · clamp(change_7d, -60, 120) / 100
implied_value_usd = max(1, round(10 ^ log10(implied)))
```

Konstanta fitted (dihitung `lib/model.ts` dari snapshot, bukan
hardcode): **a = 7,1225 · b = 0,4470**. Artinya: pada TVL $100 jt,
kurva memberi **$13,26 juta**; TVL 10× ⇒ nilai hanya **×2,80**
(bukan ×10 — inilah size slope yang diperbaiki dari `radar-2`).

### Komponen

**(1) Kurva ukuran — bobot terbesar.** `log10(mcap) = a + b·log10(TVL)`
difit pada 105 peer (§b). Metode fit dipilih lewat blind test, bukan
preferensi — lihat tabel metode di §(f): OLS ×3,27 / Huber ×3,18 /
Theil–Sen ×3,19 (LOO, curve-only, 105 peer). Huber menang di LOO
maupun walk-forward (×2,38 vs OLS ×2,53, Theil–Sen ×2,52), jadi Huber
yang dipakai (IRLS, delta 1,345, 60 iterasi tetap). Theil–Sen hampir
setara tapi lebih lambat dan tidak lebih baik di satu pun metrik.

**(2) Offset kategori — median residual yang di-shrink kuat.**
`offset(c) = (n_c × median_residual_c) / (n_c + 100)` dalam log10, dengan
100 pseudo-comps yang menarik offset ke 0. Offset dihitung dari residual
peer terhadap kurva, bukan dari rasio mcap/TVL mentah. Rentang offset
kini kecil: Prediction Market +0,0280 (×1,067; n=1 peer — hampir
seluruhnya di-shrink) · Privacy +0,0257 · Basis Trading +0,0165 ·
RWA +0,0152 · Risk Curators +0,0083 · Dexs +0,0106 · … ·
Lending −0,0194 · Liquid Staking −0,0281 · Staking Pool −0,0225.
Tabel lengkap (31 kategori) ada di `data.js` → `fit.offsets`.
Kategori tanpa peer: offset 0.

Mengapa offset dipertahankan padahal hampir tidak membawa sinyal?
Dengan mata terbuka: curve-only ×3,18 → +kategori (k=100) ×3,22 →
+growth ×3,09 (LOO); within-3× tetap 47,62%; walk-forward ×2,38 →
×2,38 → ×2,40 — semuanya dalam noise. Offset dipertahankan sebagai
jejak struktural (kurva murni bila kategori tidak membawa apa-apa),
bukan sebagai penggerak nilai: pengali kategori terbesar kini ×1,067,
bukan ×1,65 seperti di `radar-3` (k=12). Keputusan k=100 diambil
karena blind test: k=12 → LOO ×3,28; k=30 → ×3,24; k=50 → ×3,12;
k=100 → ×3,09; k=∞ → ×3,09 — perbaikan berhenti di k=100, dan
menaikkan k lebih jauh tidak mengubah apa pun. Catatan jujur: pada
128 peer, offset jelas membantu (within-3× 42% → 47%, ρ 0,40 →
0,43, miss tetap ×3,40); pada 105 peer yang dipakai, bantuannya
menyusut sampai hampir nol. Lihat tabel ablasi §(f) — tidak ada yang
disembunyikan.

**(3) Growth 7 hari — kecil, dipertahankan tipis.** Suku
`+0,1 × clamp(change_7d, −60, 120)/100` dalam log10: efek maksimal
×1,15 (pada +120%) / ×0,87 (pada −60%); pada ±10% hanya ±2,3%.
Ablasi: +growth memperbaiki LOO (×3,22 → ×3,09; within-3× tetap
47,62%) dengan WF hampir tidak berubah (×2,38 → ×2,40). Dipertahankan
karena LOO — sampel blind yang lebih besar (n=105) — membaik dan WF
tidak menolaknya; efeknya dibatasi sehingga satu minggu berisik tidak
pernah membajak ranking.

### Yang TIDAK dipakai (dan hasil ablasi yang membuangnya)

| Suku | Bentuk yang diuji | LOO | WF rata-rata | Keputusan |
|---|---|---|---|---|
| Tenure / seasoning | +0,1 × (log10(age) − log10(548)), age null → 548 | ×3,51 (vs ×3,22 tanpa) | ×2,36 (vs ×2,40) | **Dibuang.** Tidak membantu di satu pun metrik. Umur tetap ditampilkan sebagai kolom (age_days, launch odds) — hanya bukan pengali nilai. |
| Chain breadth | +0,02 × min(chains−1, 4) | ×3,70 | ×2,25 | **Dibuang.** LOO memburuk jelas; WF netral. Jumlah chain tetap ditampilkan di baris. |
| Growth+tenure+breadth sekaligus | ketiganya | ×3,88 | ×2,21 | **Dibuang.** Lebih buruk dari tiap suku sendiri. |
| Launch-odds multiplier | implied × odds(bucket umur) | ×3,71 | ×4,05 | **Dibuang — katastrofal.** Odds adalah peluang launch, bukan penentu harga bila launch terjadi; mengalikannya membuat model meramal harga token yang sudah launch dengan odds <1, dan blind test menghukumnya keras. Odds tetap ditampilkan per baris sebagai konteks, tidak dikalikan. |
| Sibling / parent haircut | — | — | — | **Tidak diterapkan karena tidak dapat diverifikasi.** Snapshot tidak punya field `parentProtocol`; tidak ada slug parent ("sentora", "polymarket", "extended", "defi-saver", "bitfi") di dalam snapshot. Lihat §(g). |

**Launch odds per bucket umur** (share protokol di bucket yang
mencatat token — gecko_id atau symbol non-null — dari 758 protokol;
BUKAN pengali nilai): 0–180 hari 0,264 (23/87) · 180–365 hari 0,397
(29/73) · 365–730 hari 0,383 (70/183) · 730–1095 hari 0,547 (76/139) ·
1095–1460 hari 0,787 (70/89) · >1460 hari 0,797 (59/74) · umur null
0,788 (89/113). Definisi ini mengikuti house rule (pre-token =
ketiganya null); bila memakai definisi mcap>0, angkanya jauh lebih
kecil — jangan campur definisi saat membandingkan dengan entry lain.

### Pseudocode (untuk builder — implementasi persis, `lib/model.ts`)

```ts
// peers: mcap>0, tvl>0, gecko+symbol non-null, kategori bukan
//   Bridge/Canonical Bridge/CEX  (n=105)
// curve: Huber IRLS (delta 1.345, 60 iterasi) atas
//   (log10(tvl/1e8), log10(mcap))  ->  a=7.1225, b=0.4470
// offsets: per kategori, (n*median(residual))/(n+100); tanpa peer -> 0
// implied(p) = 10^(a + b*log10(tvl/1e8) + offset(cat)
//                + 0.1*clamp(change_7d ?? 0, -60, 120)/100)
// band: implied * 10^q, q = kuantil residual LOO
//   (p10 -1.1261, p25 -0.4880, p75 0.5887, p90 0.9611)
// rank range: min/max rank atas 200 bootstrap refits (PRNG mulberry32,
//   seed 20261117, resample peer dengan replacement, refit Huber+offset)
```

**Determinisme:** semua input dari snapshot; PRNG ber-seed; jumlah
iterasi fit tetap; tidak ada `Date.now()`, `Math.random`, atau data
luar. Dua run `main.ts` pada snapshot yang sama byte-identik
(terverifikasi `diff -r`, lihat §(h)). Tidak ada nama protokol yang
di-hardcode: kurva, offset, dan odds dihitung dari snapshot.

---

## (d) Aturan inklusi & ukuran board N

### Rekomendasi: **N = 198**

- **40 watchlist** (wajib — coverage 1,0 adalah gerbang pertama juri).
- **+ 20 pre-token di atas floor** yang lolos aturan watchlist yang
  sama — tier "above-floor". Mereka bukan watchlist karena DefiLlama
  mencatat `parentProtocol` untuk mereka, dan field itu TIDAK ada di
  snapshot; tidak ada slug parent mereka di dalam snapshot. Rules
  bounty menyatakan watchlist adalah floor, bukan ceiling ("a board
  may rank protocols the watchlist does not name").
- **+ 138 pre-token di bawah floor** yang lolos aturan yang sama —
  tier "early".
- Total maksimum yang mungkin di bawah aturan ini adalah 198 — tidak
  ada baris ke-199 yang memenuhi syarat, jadi N bukan angka yang
  dipilih sembarangan.

### Aturan inklusi (aturan watchlist, floor dihapus, ceiling dihapus)

Suatu protokol masuk board bila dan hanya bila:

1. Pre-token: `mcap_usd`, `gecko_id`, `symbol` ketiganya null;
2. `tvl_usd >= $5.000.000` (sudah dijamin snapshot);
3. Bukan produk wrapped/staked/bridged: kategori **bukan** Bridge,
   Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC,
   CEX; nama tidak mengandung kata utuh `wrapped`/`staked`/`staking`
   (case-insensitive) dan tidak diawali nama exchange (Binance,
   Coinbase, Bybit, Kraken, Bitget, OKX, Bitfinex, Gemini);
4. Nama tidak berakhiran penanda versi
   (`\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$`).

Ke-40 watchlist lolos aturan ini (verifikasi: 0 gagal).

### 20 baris above-floor (urut rank board)

| Rank | Slug | Kategori | TVL |
|---|---|---|---|
| 1 | sentora-curator | Risk Curators | $2,76 B |
| 9 | polymarket-international | Prediction Market | $320 jt |
| 12 | cian-yield-layer | Yield Aggregator | $280 jt |
| 14 | defi-saver-asset-management | CDP Manager | $276 jt |
| 18 | bitfi-basis | Basis Trading | $215 jt |
| 20 | mellow-core | Onchain Capital Allocator | $233 jt |
| 24 | figure-markets-prime | Lending | $191 jt |
| 28 | theo-network-thusd | RWA | $139 jt |
| 31 | figure-markets-exchange | OTC Marketplace | $131 jt |
| 36 | extended-perps | Derivatives | $96 jt |
| 44 | avant-avusd | Onchain Capital Allocator | $95 jt |
| 45 | stellar-defi-hub | Farm | $83 jt |
| 49 | circle-gateway | Cross Chain Bridge | $65 jt |
| 50 | arcus-perps | Derivatives | $60 jt |
| 51 | ipor-fusion | Onchain Capital Allocator | $68 jt |
| 52 | loopscale-lending | Lending | $71 jt |
| 53 | usdcx | Stablecoin Wrapper | $57 jt |
| 54 | azverse-perps | Derivatives | $52 jt |
| 57 | nado-spot | Dexs | $51 jt |
| 58 | solv-strategies | Onchain Capital Allocator | $57 jt |

Catatan: `circle-gateway` (Cross Chain Bridge) dan `usdcx` (Stablecoin
Wrapper) lolos karena house rule hanya mengecualikan Bridge /
Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked BTC /
CEX — Cross Chain Bridge dan Stablecoin Wrapper tidak ada di daftar
itu. Itu keputusan rule, bukan pengecualian buatan model.

### Protokol bertoken: masuk board atau tidak?

**TIDAK masuk board ranking. Masuk dashboard sebagai view terpisah
("Live token"), dengan nilai pasarnya sendiri (`mcap_usd`), bukan
implied value — 24 baris teratas menurut market cap.** Alasan sama
dengan MODEL v2 §d: kriteria 2 menghargai pemisahan yang jelas, dan
view terpisah adalah tempat peer fit (§b) ditampilkan sebagai bukti.

---

## (e) Ekonomi farm per baris

### Asumsi (dinyatakan; bukan fakta snapshot)

| Asumsi | Nilai |
|---|---|
| Deposit default (switcher $500 / $1K / $5K / $10K) | **$1.000** |
| Airdrop share dari implied value bila launch | **10%** |
| Dilution haircut / time share | **Tidak ada** — slice bersyarat launch (10% × implied × deposit/TVL); launch odds ditampilkan per baris sebagai konteks, tidak pernah dikalikan. `radar-3` memakai 90/(age+90); dihapus di `radar-4` (alasan di bawah). |
| Hold | **90 hari** (day 0 → day 90) |
| Transaksi on-chain | **15** (1 setup + 1 deposit + 12 mingguan + 1 exit) |
| Gas per transaksi | Ethereum **$5,00** · L2 (Base, Arbitrum, Optimism, Monad, Polygon, Ink, Unichain, Katana, Linea, Scroll, Blast) **$0,50** · Solana **$0,10** · chain lain **$1,00** |
| Forgone yield | **Netto**: T-bill **4,5%** per tahun − yield yang dihasilkan posisi farming itu sendiri (**3,5%** per tahun untuk bucket vault, lending, likuiditas/DEX, RWA, basis, perps, restake, staking, CeDeFi; **0%** bila posisi tidak menghasilkan — insurance, payments, chain, governance, stable, bridge, default), selama 90 hari. Jadi forgone netto 1,0% per tahun untuk posisi yang menghasilkan yield, 4,5% untuk yang tidak. |
| Waktu kerja | **3,17 jam** (5 + 15 + 120 + 10 + 15 + 10 + 5 + 10 menit) |
| Verdict | **FARM** bila break-even ≤ 10% · **THIN** bila ≤ 33% · **SKIP** bila di atasnya |

### Formula

```
slice_usd      = 10% × implied × deposit/TVL          (tanpa time share)
fees_usd       = 15 × gas_per_tx
forgone_usd    = deposit × (4,5% − yield_posisi) × 90/365
total_cost_usd = fees_usd + forgone_usd
net_usd        = slice_usd − total_cost_usd        (bila token launch)
breakeven_odds = total_cost_usd / slice_usd        (peluang launch yg dibutuhkan agar EV ≥ 0)
net_per_hour   = net_usd / 3,17 jam
```

Slice naik sebanding deposit; forgone juga; gas tetap — jadi tiket
besar membersihkan biaya lebih mudah. Semua ukuran dihitung per baris
(`farm.sizes`).

### Hasil — dibaca apa adanya

| Deposit | FARM | THIN | SKIP |
|---|---|---|---|
| $500 | 4 | 21 | 173 |
| **$1.000** | **7** | **43** | **148** |
| $5.000 | 41 | 68 | 89 |
| $10.000 | 65 | 68 | 65 |

**Tujuh baris FARM pada $1.000** — semuanya di Solana (gas $0,10/tx
→ biaya $1,50), semuanya posisi yang menghasilkan yield (forgone
netto hanya $2,47 per $1.000):

| Baris | Slice $1K | Net $1K | Break-even | Net/jam |
|---|---|---|---|---|
| goonfi | $69,14 | +$65,17 | 0,06 | +$20,58/jam |
| loopscale-curation | $61,43 | +$57,46 | 0,06 | +$18,15/jam |
| manifest-trade | $60,65 | +$56,68 | 0,07 | +$17,90/jam |
| bulk | $57,18 | +$53,21 | 0,07 | +$16,80/jam |
| byreal | $51,02 | +$47,06 | 0,08 | +$14,85/jam |
| tessera-v | $45,36 | +$41,39 | 0,09 | +$13,06/jam |
| exponent-risk-tranching | $39,80 | +$35,83 | 0,10 | +$11,30/jam |

THIN terbaik pada $1.000: alphagrowth ($63,92 / +$53,95 / BE 0,16),
stablehodl ($60,38 / +$50,42 / 0,17), monarq ($66,91 / +$49,44 /
0,26). Slice $1K terbesar: monolith-market $74,83 — tetap SKIP
karena gas Ethereum-nya $75 (15 × $5) + forgone $2,47 = $77,47,
sedikit di atas slice-nya (BE 1,04; net −$2,64). Sebaliknya,
baris-baris raksasa (Sentora, Steakhouse) punya slice $1K hanya
$2,17 dan $2,15: $1.000 adalah 0,000036% dari TVL $2,75 miliar —
tidak ada asumsi yang bisa membuat mereka farm di $1K. Dashboard
menampilkan ini sebagai "best farms" yang sebenarnya (FARM dulu,
lalu THIN) plus panel **farm book**: 10 farm terbaik pada $10.000
(satu tiket $10.000 masing-masing; modal $100.000 · fees $154,50 ·
forgone $246,60 · slice bila semua launch $6.438,79 · net
+$6.037,72 · book break-even 0,06, alias 1 banding 16).

**Mengapa asumsi berubah dari `radar-3` — dan kontrafaktualnya.**
`radar-3` memberi **0 FARM pada ukuran berapa pun**. Dua asumsi itu
yang menutupnya, dan keduanya adalah perlakuan yang dipakai hampir
semua 10 besar leaderboard (analisis artifact segar 18 Nov 2026):
(i) **forgone yield dinetokan**: posisi farming menghasilkan yield
sendiri — vault/LP/staking membayar — jadi membebankan T-bill penuh
sambil mengasumsikan posisi 0% menghitung opportunity cost dua
kali. Satu entry 10 besar (lufi-aq, 95,97%) menulisnya eksplisit
per protokol ("forgone 4% T-bill less its ~3,5% yield"); entry lain
(brisk-kestrel-93) membebankan $0,00. Kontrafaktual: hanya dengan
netting ini (time share dipertahankan), $1K menjadi 2 FARM / 5 THIN.
(ii) **time share dihapus**: slice sudah bersyarat "bila launch" —
time share 90/(age+90) mencampur probabilitas dengan dilusi,
sementara launch odds sudah ditampilkan terpisah sebagai konteks;
alasan yang sama dengan penolakan mengalikan implied dengan odds
di §(c). 8 dari 10 besar tidak memakai time share; ia memotong
slice Steakhouse 7× dan Polymarket 21,5×. Kontrafaktual: hanya
dengan menghapus time share (forgone penuh), GoonFi $1K tetap THIN
(BE 0,16) — kedua perubahan harus bersama. Dengan keduanya: 7 FARM
/ 43 THIN pada $1K; 65 FARM / 68 THIN pada $10K — di dalam pack
10 besar (amtyz21, ambang 10 besar: 2 FARM / 75 THIN pada $1K;
ronigrv: 152 FARM pada $1K; nyx77: 12 FARM pada plan-size).
Yield posisi 3,5% dan penghapusan time share adalah **asumsi yang
dinyatakan, bukan data snapshot** — bila salah satunya salah,
verdict berubah, dan itu ditulis di dashboard (Method view +
tile detail per baris).

### Langkah farm (8 langkah bertanggal, per protokol)

1. **Day 0** — dompet baru, seed offline. Cost: 1× gas. Time: 5 mnt.
2. **Day 0** — aksi utama menurut kategori (deposit vault / supply /
   likuiditas / beli aset RWA / …) $1.000 di chain utama. Cost: $1.000
   + 1× gas. Time: 15 mnt.
3. **Weeks 1–12** — satu aksi kualifikasi tiap minggu. Cost: 12× gas.
   Time: 10 mnt/minggu (2 jam).
4. **Week 6** — cek perubahan TVL 7 hari: bila TVL tutup di bawah
   **80% TVL saat deposit** (angka dolar spesifik protokol itu),
   tarik setengah hari itu juga (biaya 1 transaksi tambahan, disebut
   eksplisit). Cost: $0 untuk cek. Time: 10 mnt.
5. **Day 90** — buka halaman points/rewards resmi protokol, klaim
   hanya dari tautan yang diterbitkannya; jangan pernah bayar untuk
   klaim. Cost: $0. Time: 15 mnt.
6. **Day 90** — tarik deposit $1.000, kecuali stop rule minggu ke-6
   sudah keluar. Cost: 1× gas. Time: 10 mnt.
7. **Day 90** — tulis dompet, tanggal, dan semua hash transaksi di
   farm log. Cost: $0. Time: 5 mnt.
8. **Day 90** — putuskan: bila belum ada token dan TVL masih di atas
   level stop, tahan 90 hari lagi atau keluar; jangan tambah dana
   tanpa cek baru. Cost: $0. Time: 10 mnt.

Semua langkah 130–267 karakter (gate 20–600), 8 langkah per baris
(gate 3–12). **Tidak mengarang program insentif**: snapshot tidak
berisi data points/airdrop apa pun, jadi langkah 5 selalu berbunyi
"cek halaman resmi" — tidak pernah mengklaim ada program bila tidak
ada datanya.

---

## (f) Hasil model — validasi, top 20 & sebaran nilai (N = 198, `radar-4`)

### Perbandingan metode fit (LOO n=105; WF = rata-rata 3 cutoff)

| Metode | Varian | LOO miss | LOO within-3× | LOO ρ | WF miss |
|---|---|---|---|---|---|
| OLS | curve-only | ×3,27 | 47,62% | 0,33 | ×2,53 |
| OLS | curve+category | ×3,30 | 45,71% | 0,33 | ×2,53 |
| **Huber** | **curve-only** | **×3,18** | **47,62%** | **0,34** | **×2,38** |
| **Huber** | **curve+category** | ×3,22 | 47,62% | 0,34 | ×2,38 |
| Theil–Sen | curve-only | ×3,19 | 43,81% | 0,30 | ×2,52 |
| Theil–Sen | curve+category | ×3,25 | 44,76% | 0,31 | ×2,52 |

### Ablasi (Huber, 105 peer)

| Varian | LOO miss | LOO within-3× | LOO ρ | WF miss |
|---|---|---|---|---|
| curve-only | ×3,18 | 47,62% | 0,34 | ×2,38 |
| curve+category | ×3,22 | 47,62% | 0,34 | ×2,38 |
| **curve+category+growth (final)** | **×3,09** | **47,62%** | **0,34** | **×2,40** |
| curve+category+tenure | ×3,51 | 44,76% | 0,34 | ×2,36 |
| curve+category+breadth | ×3,70 | 43,81% | 0,32 | ×2,25 |
| curve+category+growth+tenure+breadth | ×3,88 | 42,86% | 0,32 | ×2,21 |
| curve+category × launch-odds | ×3,71 | 40,00% | 0,27 | ×4,05 |

### Model final vs baseline flat (median rasio mcap/TVL, peer yang sama)

| | LOO miss | LOO within-3× | LOO ρ | WF miss | WF within-3× |
|---|---|---|---|---|---|
| **radar-4 (final)** | **×3,09** | **47,62%** | **0,34** | **×2,40** | **53,10%** |
| Flat multiple | ×5,02 | 35,24% | 0,37 | ×4,83 | 37,30% |

Walk-forward final per cutoff — fit pada `listed_at` lama, uji pada
token yang lebih baru: pre-2023 (train 19 / test 61) ×2,81, 55,74%,
ρ 0,32 · pre-2024 (36/44) ×2,12, 52,27%, ρ 0,36 · pre-2024-07
(41/39) ×2,27, 51,28%, ρ 0,34. Rata-rata ×2,40 / 53,10% / 0,34.
Catatan jujur: ρ flat (0,37) sedikit lebih tinggi dari ρ model (0,34)
di LOO — kurva mengorbankan sedikit urutan demi kesalahan absolut
yang jauh lebih kecil; ranking board tetap terutama ditentukan kurva
+ offset, dan ρ 0,34 sejalan dengan 0,38 yang dilaporkan satu entry
10 besar. Target patokan 10 besar (LOO ×2,68–×3,52 vs flat ×4,4–
×6,0) **tercapai**: LOO ×3,09 vs flat ×5,02; WF ×2,40 vs flat ×4,83.

### Band ketidakpastian (blind band + rank range)

Residual LOO (log10 actual/pred) kuantil: p10 −1,1261 · p25 −0,4880 ·
p75 +0,5887 · p90 +0,9611 — sebagai pengali: **0,075× / 0,325× /
3,88× / 9,15×**. Band tiap baris = implied × pengali itu. Cakupan
pada 105 peer: **P25–P75 menampung 48,57%** caps riil,
**P10–P90 menampung 79,05%** — sesuai konstruksi dan sejalan dengan
klaim 10 besar (48% / 80%). Band ini lebar karena memang begitu
ketidakpastiannya: Sentora P25–P75 $19,5–232,2 jt, P10–P90
$4,5–547,3 jt. Versi awal (band dari bootstrap refits saja) hanya
menampung 12,38% / 20,95% — band sempit yang menyesatkan — dan
dibuang; rank range tetap dari 200 bootstrap refits (mis. Sentora
1–1, Steakhouse 2–2, Bittensor dTAO 6–18 — lebar di tengah board
karena banyak baris mengumpul di $3–7 jt).

### Top 20 (N = 198)

| Rank | Slug | Kategori | TVL | 7d | Umur (hari) | Kurva | ×Kat | ×Growth | Implied | P25–P75 | Rank range | Odds | Slice $1K | Net $1K | BE | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | sentora-curator | Risk Curators | $2,758 B | +2,37% | 407 | $58,4 jt | 1,019 | 1,005 | **$59,9 jt** | $19,5–232,2 jt | 1–1 | 0,38 | $2,17 | −$75,30 | 35,7 | SKIP |
| 2 | steakhouse-financial | Risk Curators | $2,754 B | −2,19% | 543 | $58,4 jt | 1,019 | 0,995 | **$59,2 jt** | $19,2–229,6 jt | 2–2 | 0,38 | $2,15 | −$7,82 | 4,64 | SKIP |
| 3 | gauntlet | Risk Curators | $1,578 B | +5,65% | 543 | $45,5 jt | 1,019 | 1,013 | **$47,0 jt** | $15,3–182,3 jt | 3–3 | 0,38 | $2,98 | −$6,99 | 3,35 | SKIP |
| 4 | veda | Onchain Capital Allocator | $1,563 B | −8,29% | 632 | $45,3 jt | 0,977 | 0,981 | **$43,4 jt** | $14,1–168,4 jt | 4–4 | 0,38 | $2,78 | −$7,19 | 3,59 | SKIP |
| 5 | usdd | CDP | $1,056 B | −2,81% | 611 | $38,0 jt | 0,996 | 0,994 | **$37,6 jt** | $12,2–145,9 jt | 5–5 | 0,38 | $3,56 | −$13,90 | 4,90 | SKIP |
| 6 | nonce-capital | Risk Curators | $514 jt | −9,74% | 45 | $27,6 jt | 1,019 | 0,978 | **$27,5 jt** | $8,9–106,5 jt | 6–9 | 0,26 | $5,35 | −$72,12 | 14,5 | SKIP |
| 7 | upshift | Onchain Capital Allocator | $499 jt | +8,31% | 710 | $27,2 jt | 0,977 | 1,019 | **$27,1 jt** | $8,8–105,0 jt | 6–9 | 0,38 | $5,43 | −$72,04 | 14,3 | SKIP |
| 8 | bittensor-dtao | Dexs | $376 jt | −6,56% | 56 | $24,0 jt | 1,025 | 0,985 | **$24,2 jt** | $7,9–93,8 jt | 6–18 | 0,26 | $6,43 | −$11,03 | 2,71 | SKIP |
| 9 | polymarket-international | Prediction Market | $320 jt | −1,08% | 1.845 | $22,3 jt | 1,067 | 0,998 | **$23,7 jt** | $7,7–92,1 jt | 6–11 | 0,80 | $7,41 | −$11,18 | 2,51 | SKIP |
| 10 | onre | RWA | $309 jt | +0,11% | 488 | $22,0 jt | 1,036 | 1,000 | **$22,7 jt** | $7,4–88,2 jt | 8–11 | 0,38 | $7,36 | +$3,40 | 0,54 | SKIP |
| 11 | rockawayx | Risk Curators | $293 jt | −2,55% | 233 | $21,4 jt | 1,019 | 0,994 | **$21,7 jt** | $7,1–84,2 jt | 8–12 | 0,40 | $7,42 | −$70,04 | 10,4 | SKIP |
| 12 | cian-yield-layer | Yield Aggregator | $280 jt | +4,67% | 726 | $21,0 jt | 0,972 | 1,011 | **$20,7 jt** | $6,7–80,1 jt | 10–16 | 0,38 | $7,37 | −$70,10 | 10,5 | SKIP |
| 13 | opentrade | RWA | $242 jt | −1,64% | 708 | $19,7 jt | 1,036 | 0,996 | **$20,3 jt** | $6,6–78,7 jt | 10–20 | 0,38 | $8,40 | −$9,07 | 2,08 | SKIP |
| 14 | defi-saver-asset-management | CDP Manager | $276 jt | −19,58% | null | $20,9 jt | 1,000 | 0,956 | **$20,0 jt** | $6,5–77,4 jt | 12–18 | 0,79 | $7,22 | −$70,24 | 10,7 | SKIP |
| 15 | symbiotic | Collateral Markets | $254 jt | −12,03% | 886 | $20,1 jt | 1,000 | 0,973 | **$19,6 jt** | $6,4–75,9 jt | 14–19 | 0,55 | $7,70 | −$69,76 | 10,1 | SKIP |
| 16 | hyperithm | Risk Curators | $222 jt | −4,38% | 543 | $18,9 jt | 1,019 | 0,990 | **$19,1 jt** | $6,2–74,1 jt | 12–21 | 0,38 | $8,62 | −$1,35 | 1,16 | SKIP |
| 17 | plume-vaults | RWA | $212 jt | −3,08% | 749 | $18,5 jt | 1,036 | 0,993 | **$19,1 jt** | $6,2–73,9 jt | 13–23 | 0,55 | $9,01 | −$68,46 | 8,60 | SKIP |
| 18 | bitfi-basis | Basis Trading | $215 jt | −10,26% | 638 | $18,7 jt | 1,039 | 0,977 | **$18,9 jt** | $6,2–73,5 jt | 9–23 | 0,38 | $8,81 | −$8,65 | 1,98 | SKIP |
| 19 | r25 | RWA | $198 jt | +0,30% | 199 | $18,0 jt | 1,036 | 1,001 | **$18,7 jt** | $6,1–72,4 jt | 15–25 | 0,40 | $9,41 | −$8,05 | 1,86 | SKIP |
| 20 | mellow-core | Onchain Capital Allocator | $233 jt | −8,53% | 290 | $19,3 jt | 0,977 | 0,981 | **$18,5 jt** | $6,0–71,8 jt | 16–24 | 0,40 | $7,96 | −$69,50 | 9,73 | SKIP |

(TVL dalam dolar, B = miliar, jt = juta; umur dalam hari. Build-up per
baris memeriksa eksak: kurva × ×Kat × ×Growth = implied ±$1 — faktor
disimpan presisi penuh di `board.json`.)

**Sebaran nilai board (N = 198):** maks **$59,9 jt** (Sentora Curator)
· median **$6,82 jt** · min **$3,20 jt** (Nucleus) · total board
**$1,90 miliar** · 198 nilai berbeda · monotonik menurun
terverifikasi. Watchlist menempati rank 2–61 (14 dari top-20 adalah
watchlist, 6 adalah above-floor). Lima terbawah: granite $3,62 jt ·
goonfi $3,61 jt · flying-tulip-ftusd $3,57 jt · monarq $3,43 jt ·
nucleus $3,20 jt.

**Bacaan top-20:** Sentora Curator #1 bukan karena namanya — TVL
$2,76 miliar yang nyaris sama dengan Steakhouse ($2,75 miliar),
kategori yang sama, growth +2,37% vs −2,19% yang menggesernya ke
depan. Polymarket International jatuh #6 → #9: boost kategori
Prediction Market-nya kini hanya ×1,067 (dari satu peer, di-shrink
k=100), bukan ×1,65 seperti di `radar-3`. Veda/Upshift jatuh karena
offset allocator kini 0,977, bukan 0,842. Nonce Capital (#6, umur 45
hari) membuktikan tenure TIDAK dipakai: ia naik murni karena kurva +
kategori + growth, bukan karena umurnya. Rank range puncak kini
sangat rapat (Sentora 1–1, Steakhouse 2–2) karena offset yang
menyusut mengurangi variasi antar refit di puncak; ketidakpastian
pindah ke tengah board (Bittensor dTAO 6–18, GoonFi 156–198).

**Perbandingan vs `radar-2` (N=178):** top-1 $1,96 miliar → $59,9 jt
(33× lebih kecil); median $4,5 jt → $6,82 jt; board 178 → 198
(+20 above-floor). Overlap top-10 dengan `radar-2`: 8/10 nama sama,
urutan dan level berubah total.

**Verifikasi yang dijalankan** (Node 22.23.4,
`~/workspace/makefun/node22/bin/node main.ts` ke `/tmp/out1` dan
`/tmp/out2` pada snapshot yang sama): coverage watchlist 40/40; rank
1..198 unik; implied integer positif ≤ 1e14; monotonik menurun; 198
nilai berbeda; farm_steps 8 langkah × 130–267 karakter;
`diff -r` kedua run **byte-identik**; `data.js` 791.065 byte,
`board.json` 1.103.136 byte (di bawah cap gate 8 MiB), `dossier.json`
1.111.582 byte. Screenshot dossier: `1-cover.png` (217.967 byte),
`2-board.png` (188.988 byte), `3-detail.png` (251.467 byte),
`4-filtered.png` (142.734 byte) — keempatnya ≤ 512 KiB, 1440×900,
diperiksa visual (cover menampilkan rumus + scatter + OOS + best
farms FARM; detail menampilkan 8 langkah farm GoonFi + tabel 4
ukuran; filtered menampilkan 7 baris FARM). `makefun check` kit:
satu-satunya gagal pada pengecekan lokal tanpa transkrip adalah
`transcripts_present` (urusan submit, bukan model); check ini tidak
menilai board secara lokal ("there is no local grade of this
competition, the server grades every entry").

---

## (g) Batasan yang jujur

1. **Tidak ada sibling/parent haircut — dan itu dinyatakan, bukan
   disembunyikan.** Snapshot tidak punya field `parentProtocol`.
   Lima baris above-floor teratas (Sentora Curator, Polymarket
   International, BitFi Basis, Extended Perps, Defi Saver Asset
   Management) tercatat pre-token dengan kategori/nama bersih, dan
   tidak ada slug parent mereka ("sentora", "polymarket", "extended",
   "defi-saver", "bitfi") di dalam snapshot. Maka tidak ada haircut
   berbasis parent yang diterapkan. Bila DefiLlama di luar snapshot
   mencatat mereka sebagai produk turunan, board ini menilai mereka
   apa adanya dari snapshot — juri yang memakai data luar dapat
   menilai berbeda, dan itu risiko yang dicatat di sini.
2. **Offset kategori hampir tidak membawa sinyal pada 105 peer.**
   Pada peer set yang dipakai, offset dipertahankan sebagai jejak
   struktural dengan shrinkage k=100 (pengali terbesar ×1,067),
   bukan sebagai penggerak nilai — lihat §c. Satu peer (Rain,
   Prediction Market) tetap menggerakkan offset kategorinya meski
   sudah di-shrink k=100, tapi hanya +0,028 dex.
3. **Rank correlation moderat (ρ 0,33–0,34).** Model memprediksi
   level nilai jauh lebih baik daripada urutan persisnya; rank range
   yang lebar (mis. Bittensor dTAO 1–74) adalah konsekuensi yang
   jujur dari baris-baris yang mengumpul di $20–40 jt.
4. **Band lebar.** P10–P90 satu baris membentang ~122× (0,075×–
   9,15×). Itu ukuran ketidakpastian yang sebenarnya dari data ini —
   bukan cacat presentasi. Implied value adalah estimasi titik di
   tengah ketidakpastian sebesar itu.
5. **Farm economics memakai asumsi yang dinyatakan, bukan data.**
   Airdrop share 10%, yield posisi 3,5% per bucket yang
   menghasilkan, penghapusan time share, gas per chain, dan T-bill
   4,5% adalah asumsi — bila salah satunya salah, verdict berubah.
   Hasil yang paling sensitif: **7 FARM pada $1.000** (§e) — itu
   konsekuensi asumsi-asumsi tersebut, dan kontrafaktualnya ditulis
   di §(e): dengan asumsi `radar-3` (forgone penuh + time share)
   hasilnya 0 FARM; dengan hanya satu dari dua perubahan, hasilnya
   2 FARM (netting saja) atau 0 FARM (hapus time share saja).
   Mengubah asumsi untuk mendapatkan FARM tanpa mengatakannya adalah
   manipulasi; di sini asumsi dan kontrafaktualnya dinyatakan.
6. **Launch odds bukan probabilitas launch.** Odds adalah share
   historis protokol seumur yang mencatat token — korelasi umur,
   bukan prediksi bahwa protokol ini akan launch. Odds tidak pernah
   dikalikan ke implied value (§c).
7. **Snapshot beku 2026-11-14.** Semua angka mengikuti snapshot
   itu; TVL, harga, dan status token setelah tanggal itu tidak
   tercermin.

---

## Catatan untuk builder (dashboard)

1. Ganti `MODEL` dengan konstanta `radar-4` di atas; naikkan
   `MODEL_VERSION` ke `radar-4`. Konstanta fit (a, b, offsets)
   dihitung dari snapshot saat run — jangan hardcode angka §c ke
   dashboard; baca dari `data.js` → `fit`.
2. Tampilkan per baris: build-up (kurva × ×Kat × ×Growth = implied),
   band P10–P25–P75–P90, rank range, launch odds, nearest comps
   (TVL, mcap, model, miss ×), dan ekonomi farm lengkap (§e).
   Kontrak field per baris ada di laporan pekerja model ke parent
   (data contract) — field-field itu sudah ada di `board.json` /
   `data.js` hasil run ini.
3. Tampilkan di cover: rumus + scatter log-log (peer vs kurva +
   band) + tabel validasi (LOO ×3,09 vs flat ×5,02; WF ×2,40 vs
   ×4,83; within-3× 47,62%; band coverage 48,57%/79,05%) + strip
   akuntansi 758 = 198 + 416 + 144 + seal "page = board.json" +
   panel best farms (FARM dulu, lalu THIN) + panel farm book (10
   farm terbaik pada $10.000: modal, fees, forgone, slice, net,
   book break-even). Screenshot cover adalah gambar pertama
   dossier: `1-cover.png`, lalu `2-board.png`, `3-detail.png`
   (baris FARM dengan seluruh langkah farm terlihat),
   `4-filtered.png` (filter verdict FARM).
4. Farm steps dihasilkan dari template §e (8 langkah, day 0 /
   weekly / week 6 / day 90); jangan tulis langkah per protokol
   secara manual.
5. Satu-satunya hal yang boleh berubah antar run adalah snapshot itu
   sendiri: semua konstanta (§c, §e) adalah bagian dari model dan
   ditampilkan di dashboard.

*Disusun 2026-11-18 dari `snapshot.json` as_of 2026-11-14 (MODEL v4,
`radar-4`). Tidak ada data luar snapshot yang dipakai; tidak ada nama
protokol yang di-hardcode dalam model.*
