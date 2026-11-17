# Token Radar — Model Implied Value & Farm Plan (MODEL v3, `radar-3`)

Analisis untuk bounty make.fun **token-radar-01** ($1.325). Snapshot:
`input/snapshot.json`, `as_of` **2026-11-14**, floor watchlist
**$50.000.000**, sumber DefiLlama `https://api.llama.fi/protocols`.
Dokumen ini adalah rancangan model untuk builder — bukan kode entry, bukan
submit, bukan tanda tangan apa pun. Semua angka di sini dihitung dari
snapshot yang sama oleh `lib/model.ts` (`buildRadar` → `data.js` →
`validation`); tidak ada angka yang ditulis tangan dari luar snapshot.

**Ringkasan keputusan:** model `radar-3` = **kurva ukuran log-log fitted
(Huber) pada token yang sudah diperdagangkan** × **offset kategori yang
di-shrink** × **growth 7 hari kecil**. Board **N = 198** (40 watchlist +
20 di atas floor di luar watchlist + 138 early di bawah floor). Nilai top
**$68,1 juta** (Sentora Curator), median **$7,12 juta**, minimum
**$2,74 juta**, monotonik menurun, 198 nilai berbeda. Validasi
out-of-sample: LOO miss **×3,28** vs flat **×5,02**; walk-forward
**×2,40** vs flat **×4,83**. Band per baris adalah *blind band* dari
residual LOO; rank range dari 200 bootstrap refits.

Dibanding `radar-2` (MODEL v2): keluarga model diganti total. `radar-2`
memakai TVL × multiple kategori linear tanpa size slope, sehingga
Steakhouse Financial dinilai **$1,96 miliar**. Kurva log-log `radar-3`
memberi Steakhouse **$67,4 juta** — dalam kisaran $28–126 juta yang
dipakai semua 10 besar leaderboard (GAP-ANALYSIS.md §2–§4). Tidak ada
satu pun konstanta `radar-2` yang bertahan: multiple kategori, maturity,
dan chain multiplier semuanya dibuang; yang bertahan hanya aturan
inklusi watchlist (§d) dan pemisahan Live view.

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

## (c) Formula model `radar-3`

### Formula

```
log10(implied) = a + b · log10(tvl_usd / $100M)
               + offset_kategori            // median residual kategori, shrink k=12
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

**(2) Offset kategori — median residual yang di-shrink.**
`offset(c) = (n_c × median_residual_c) / (n_c + 12)` dalam log10, dengan
12 pseudo-comps yang menarik offset ke 0. Offset dihitung dari residual
peer terhadap kurva, bukan dari rasio mcap/TVL mentah. Rentang offset:
Prediction Market +0,2175 (×1,65; n=1 peer — hampir seluruhnya
di-shrink) · Privacy +0,1763 · Collateral Management +0,1134 ·
Cross Chain Bridge +0,1122 · Basis Trading +0,0930 · RWA +0,0788 ·
Risk Curators +0,0644 · Dexs +0,0511 · … · Lending −0,0827 ·
Yield Aggregator −0,0796 · Liquid Staking −0,1457 · Staking Pool
−0,1637. Tabel lengkap (31 kategori) ada di `data.js` → `fit.offsets`.
Kategori tanpa peer: offset 0.

Mengapa offset dipertahankan padahal LOO median miss-nya sedikit
memburuk (curve-only ×3,18 → +kategori ×3,37)? Dengan mata terbuka:
(i) walk-forward tidak berubah (×2,38 → ×2,40 — dalam noise);
(ii) within-3× dan ρ juga tidak bergerak jelas (44,76–47,62%,
ρ 0,33–0,34 — tidak ada keuntungan atau kerugian yang tegas di
sana); (iii) tanpa offset, kategori dengan ekonomi token yang
jelas berbeda (Risk Curators vs Onchain Capital Allocator, selisih
offset 0,14 dex ≈ ×1,38) diperlakukan sama, dan itu bertentangan
dengan bukti peer-nya sendiri. Keputusan ini diambil atas dasar
campuran bukti — LOO sedikit negatif, WF netral, dan pembedaan
kategori yang nyata di data. Catatan jujur: pada 128 peer, offset
jelas membantu (within-3× 42% → 47%, ρ 0,40 → 0,43, miss tetap
×3,40); pada 105 peer yang dipakai, bantuannya menyusut sampai
hampir nol. Lihat tabel ablasi §(f) — tidak ada yang disembunyikan.

**(3) Growth 7 hari — kecil, dipertahankan tipis.** Suku
`+0,1 × clamp(change_7d, −60, 120)/100` dalam log10: efek maksimal
×1,15 (pada +120%) / ×0,87 (pada −60%); pada ±10% hanya ±2,3%.
Ablasi: +growth memperbaiki LOO (×3,37 → ×3,28; within-3× 44,76% →
46,67%) dengan WF hampir tidak berubah (×2,40 → ×2,40). Dipertahankan
karena LOO — sampel blind yang lebih besar (n=105) — membaik dan WF
tidak menolaknya; efeknya dibatasi sehingga satu minggu berisik tidak
pernah membajak ranking.

### Yang TIDAK dipakai (dan hasil ablasi yang membuangnya)

| Suku | Bentuk yang diuji | LOO | WF rata-rata | Keputusan |
|---|---|---|---|---|
| Tenure / seasoning | +0,1 × (log10(age) − log10(548)), age null → 548 | ×3,38 (vs ×3,37 tanpa) | ×2,47 (vs ×2,40) | **Dibuang.** Tidak membantu di satu pun metrik. Umur tetap ditampilkan sebagai kolom (age_days, launch odds) — hanya bukan pengali nilai. |
| Chain breadth | +0,02 × min(chains−1, 4) | ×3,61 | ×2,39 | **Dibuang.** LOO memburuk jelas; WF netral. Jumlah chain tetap ditampilkan di baris. |
| Growth+tenure+breadth sekaligus | ketiganya | ×3,83 | ×2,41 | **Dibuang.** Lebih buruk dari tiap suku sendiri. |
| Launch-odds multiplier | implied × odds(bucket umur) | ×3,82 | ×4,13 | **Dibuang — katastrofal.** Odds adalah peluang launch, bukan penentu harga bila launch terjadi; mengalikannya membuat model meramal harga token yang sudah launch dengan odds <1, dan blind test menghukumnya keras. Odds tetap ditampilkan per baris sebagai konteks, tidak dikalikan. |
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
// offsets: per kategori, (n*median(residual))/(n+12); tanpa peer -> 0
// implied(p) = 10^(a + b*log10(tvl/1e8) + offset(cat)
//                + 0.1*clamp(change_7d ?? 0, -60, 120)/100)
// band: implied * 10^q, q = kuantil residual LOO
//   (p10 -1.0727, p25 -0.4940, p75 0.5287, p90 0.9619)
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
| 6 | polymarket-international | Prediction Market | $320 jt |
| 13 | bitfi-basis | Basis Trading | $215 jt |
| 19 | defi-saver-asset-management | CDP Manager | $276 jt |
| 22 | theo-network-thusd | RWA | $139 jt |
| 24 | cian-yield-layer | Yield Aggregator | $280 jt |
| 29 | mellow-core | Onchain Capital Allocator | $233 jt |
| 31 | extended-perps | Derivatives | $96 jt |
| 33 | figure-markets-prime | Lending | $191 jt |
| 34 | figure-markets-exchange | OTC Marketplace | $131 jt |
| 40 | circle-gateway | Cross Chain Bridge | $65 jt |
| 44 | arcus-perps | Derivatives | $60 jt |
| 46 | stellar-defi-hub | Farm | $83 jt |
| 48 | azverse-perps | Derivatives | $52 jt |
| 51 | nado-spot | Dexs | $51 jt |
| 54 | avant-avusd | Onchain Capital Allocator | $95 jt |
| 56 | usdcx | Stablecoin Wrapper | $57 jt |
| 66 | ipor-fusion | Onchain Capital Allocator | $68 jt |
| 67 | loopscale-lending | Lending | $71 jt |
| 74 | solv-strategies | Onchain Capital Allocator | $57 jt |

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
| Time share | **90 / (age_days + 90)**; age null → 548 hari |
| Hold | **90 hari** (day 0 → day 90) |
| Transaksi on-chain | **15** (1 setup + 1 deposit + 12 mingguan + 1 exit) |
| Gas per transaksi | Ethereum **$5,00** · L2 (Base, Arbitrum, Optimism, Monad, Polygon, Ink, Unichain, Katana, Linea, Scroll, Blast) **$0,50** · Solana **$0,10** · chain lain **$1,00** |
| Forgone yield | T-bill **4,5%** per tahun atas deposit selama 90 hari (posisi farming diasumsikan menghasilkan 0% — konservatif; snapshot tidak berisi data yield) |
| Waktu kerja | **3,17 jam** (5 + 15 + 120 + 10 + 15 + 10 + 5 + 10 menit) |
| Verdict | **FARM** bila break-even ≤ 10% · **THIN** bila ≤ 33% · **SKIP** bila di atasnya |

### Formula

```
slice_usd      = 10% × implied × deposit/TVL × time_share
fees_usd       = 15 × gas_per_tx
forgone_usd    = deposit × 4,5% × 90/365
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
| $500 | 0 | 1 | 197 |
| **$1.000** | **0** | **2** | **196** |
| $5.000 | 0 | 4 | 194 |
| $10.000 | 0 | 6 | 192 |

**Tidak ada satu pun baris FARM pada ukuran berapa pun.** Ini temuan,
bukan bug — dan tidak disembunyikan dengan mengubah asumsi. Alasan
aritmetikanya: FARM butuh slice_rate ≥ ~0,111 per $1 deposit
(10× forgone rate 0,0111), sementara slice_rate = 0,1 ×
(implied/TVL) × time_share; nilai tertinggi di seluruh board hanya
0,059 (swan-dao: rasio 0,603 × time share 0,978) — jadi tidak satu
pun baris yang bisa mencapai FARM di bawah asumsi-asumsi ini. Dua
baris THIN pada $1.000 adalah yang paling dekat:

| Baris | Slice $1K | Net $1K | Break-even | Net/jam |
|---|---|---|---|---|
| loopscale-curation | $46,60 | +$34,01 | 0,27 | +$10,74/jam |
| goonfi | $41,40 | +$28,80 | 0,30 | +$9,09/jam |

THIN tambahan pada $10.000: hertzflow (BE 0,33), valantis-sthype-
restaking (0,27), monarq (0,29), swan-dao (0,32). Slice $1K terbesar:
swan-dao $58,97 — tetap SKIP karena gas Ethereum-nya $75 (15 × $5)
ditambah forgone $11,10. Sebaliknya, baris-baris raksasa (Sentora,
Steakhouse) punya slice $1K hanya $0,35–0,45: $1.000 adalah
0,000036% dari TVL $2,75 miliar, dan time share 90/(543+90) = 0,14
memotongnya lagi. Dashboard harus menampilkan ini sebagai "best
farms" yang sebenarnya (THIN teratas + penjelasan), bukan mengarang
FARM. Bila parent ingin ambang atau asumsi diubah (mis. yield posisi
3,5% seperti satu entry 10 besar, atau tanpa time share), itu
keputusan eksplisit — bukan perubahan diam-diam di model.

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

## (f) Hasil model — validasi, top 20 & sebaran nilai (N = 198, `radar-3`)

### Perbandingan metode fit (LOO n=105; WF = rata-rata 3 cutoff)

| Metode | Varian | LOO miss | LOO within-3× | LOO ρ | WF miss |
|---|---|---|---|---|---|
| OLS | curve-only | ×3,27 | 47,62% | 0,33 | ×2,53 |
| OLS | curve+category | ×3,45 | 45,71% | 0,32 | ×2,51 |
| **Huber** | **curve-only** | **×3,18** | **47,62%** | **0,34** | **×2,38** |
| **Huber** | **curve+category** | ×3,37 | 44,76% | 0,33 | ×2,40 |
| Theil–Sen | curve-only | ×3,19 | 43,81% | 0,30 | ×2,52 |
| Theil–Sen | curve+category | ×3,43 | 45,71% | 0,32 | ×2,52 |

### Ablasi (Huber, 105 peer)

| Varian | LOO miss | LOO within-3× | LOO ρ | WF miss |
|---|---|---|---|---|
| curve-only | ×3,18 | 47,62% | 0,34 | ×2,38 |
| curve+category | ×3,37 | 44,76% | 0,33 | ×2,40 |
| **curve+category+growth (final)** | **×3,28** | **46,67%** | **0,33** | **×2,40** |
| curve+category+tenure | ×3,38 | 44,76% | 0,32 | ×2,47 |
| curve+category+breadth | ×3,61 | 44,76% | 0,31 | ×2,39 |
| curve+category+growth+tenure+breadth | ×3,83 | 45,71% | 0,31 | ×2,41 |
| curve+category × launch-odds | ×3,82 | 39,05% | 0,28 | ×4,13 |

### Model final vs baseline flat (median rasio mcap/TVL, peer yang sama)

| | LOO miss | LOO within-3× | LOO ρ | WF miss | WF within-3× |
|---|---|---|---|---|---|
| **radar-3 (final)** | **×3,28** | **46,67%** | **0,33** | **×2,40** | **52,55%** |
| Flat multiple | ×5,02 | 35,24% | 0,37 | ×4,83 | 37,30% |

Walk-forward final per cutoff — fit pada `listed_at` lama, uji pada
token yang lebih baru: pre-2023 (train 19 / test 61) ×2,80, 54,10%,
ρ 0,31 · pre-2024 (36/44) ×2,12, 52,27%, ρ 0,34 · pre-2024-07
(41/39) ×2,27, 51,28%, ρ 0,36. Rata-rata ×2,40 / 52,55% / 0,34.
Catatan jujur: ρ flat (0,37) sedikit lebih tinggi dari ρ model (0,33)
di LOO — kurva mengorbankan sedikit urutan demi kesalahan absolut
yang jauh lebih kecil; ranking board tetap terutama ditentukan kurva
+ offset, dan ρ 0,33–0,34 sejalan dengan 0,34–0,41 yang dilaporkan
10 besar. Target patokan 10 besar (LOO ×2,68–×3,52 vs flat ×4,4–
×6,0) **tercapai**: LOO ×3,28 vs flat ×5,02; WF ×2,40 vs flat ×4,83.

### Band ketidakpastian (blind band + rank range)

Residual LOO (log10 actual/pred) kuantil: p10 −1,0727 · p25 −0,4940 ·
p75 +0,5287 · p90 +0,9619 — sebagai pengali: **0,085× / 0,321× /
3,38× / 9,16×**. Band tiap baris = implied × pengali itu. Cakupan
pada 105 peer: **P25–P75 menampung 50,48%** caps riil,
**P10–P90 menampung 79,05%** — sesuai konstruksi dan sejalan dengan
klaim 10 besar (48% / 80%). Band ini lebar karena memang begitu
ketidakpastiannya: Sentora P25–P75 $21,8–230,1 jt, P10–P90
$5,8–623,9 jt. Versi awal (band dari bootstrap refits saja) hanya
menampung 12,38% / 20,95% — band sempit yang menyesatkan — dan
dibuang; rank range tetap dari 200 bootstrap refits (mis. Sentora
1–3, Steakhouse 2–4, USDD 4–49, Bittensor dTAO 1–74 — lebar karena
banyak baris mengumpul di $20–40 jt).

### Top 20 (N = 198)

| Rank | Slug | Kategori | TVL | 7d | Umur (hari) | Kurva | ×Kat | ×Growth | Implied | P25–P75 | Rank range | Odds | Slice $1K | Net $1K | BE | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | sentora-curator | Risk Curators | $2,758 B | +2,37% | 407 | $58,4 jt | 1,160 | 1,005 | **$68,1 jt** | $21,8–230,1 jt | 1–3 | 0,38 | $0,45 | −$85,65 | 192,5 | SKIP |
| 2 | steakhouse-financial | Risk Curators | $2,754 B | −2,19% | 543 | $58,4 jt | 1,160 | 0,995 | **$67,4 jt** | $21,6–227,6 jt | 2–4 | 0,38 | $0,35 | −$18,25 | 53,5 | SKIP |
| 3 | gauntlet | Risk Curators | $1,578 B | +5,65% | 543 | $45,5 jt | 1,160 | 1,013 | **$53,5 jt** | $17,1–180,6 jt | 3–6 | 0,38 | $0,48 | −$18,11 | 38,6 | SKIP |
| 4 | veda | Onchain Capital Allocator | $1,563 B | −8,29% | 632 | $45,3 jt | 0,842 | 0,981 | **$37,5 jt** | $12,0–126,5 jt | 4–13 | 0,38 | $0,30 | −$18,30 | 62,3 | SKIP |
| 5 | usdd | CDP | $1,056 B | −2,81% | 611 | $38,0 jt | 0,972 | 0,994 | **$36,7 jt** | $11,8–124,0 jt | 4–49 | 0,38 | $0,45 | −$25,65 | 58,4 | SKIP |
| 6 | polymarket-international | Prediction Market | $320 jt | −1,08% | 1.845 | $22,3 jt | 1,650 | 0,998 | **$36,7 jt** | $11,8–124,0 jt | 1–21 | 0,80 | $0,53 | −$18,06 | 34,9 | SKIP |
| 7 | nonce-capital | Risk Curators | $514 jt | −9,74% | 45 | $27,6 jt | 1,160 | 0,978 | **$31,3 jt** | $10,0–105,6 jt | 4–14 | 0,26 | $4,06 | −$82,04 | 21,2 | SKIP |
| 8 | bittensor-dtao | Dexs | $376 jt | −6,56% | 56 | $24,0 jt | 1,125 | 0,985 | **$26,6 jt** | $8,5–89,7 jt | 1–74 | 0,26 | $4,35 | −$21,74 | 6,0 | SKIP |
| 9 | onre | RWA | $309 jt | +0,11% | 488 | $22,0 jt | 1,199 | 1,000 | **$26,3 jt** | $8,4–88,9 jt | 4–27 | 0,38 | $1,33 | −$11,27 | 9,5 | SKIP |
| 10 | rockawayx | Risk Curators | $293 jt | −2,55% | 233 | $21,4 jt | 1,160 | 0,994 | **$24,7 jt** | $7,9–83,5 jt | 6–19 | 0,40 | $2,35 | −$83,74 | 36,6 | SKIP |
| 11 | opentrade | RWA | $242 jt | −1,64% | 708 | $19,7 jt | 1,199 | 0,996 | **$23,5 jt** | $7,5–79,3 jt | 6–35 | 0,38 | $1,10 | −$25,00 | 23,8 | SKIP |
| 12 | upshift | Onchain Capital Allocator | $499 jt | +8,31% | 710 | $27,2 jt | 0,842 | 1,019 | **$23,4 jt** | $7,5–78,9 jt | 6–34 | 0,38 | $0,53 | −$85,57 | 163,5 | SKIP |
| 13 | bitfi-basis | Basis Trading | $215 jt | −10,26% | 638 | $18,7 jt | 1,239 | 0,977 | **$22,6 jt** | $7,2–76,3 jt | 1–32 | 0,38 | $1,30 | −$24,80 | 20,1 | SKIP |
| 14 | plume-vaults | RWA | $212 jt | −3,08% | 749 | $18,5 jt | 1,199 | 0,993 | **$22,1 jt** | $7,1–74,5 jt | 7–38 | 0,55 | $1,12 | −$84,98 | 76,9 | SKIP |
| 15 | hyperithm | Risk Curators | $222 jt | −4,38% | 543 | $18,9 jt | 1,160 | 0,990 | **$21,7 jt** | $7,0–73,4 jt | 8–27 | 0,38 | $1,39 | −$17,20 | 13,3 | SKIP |
| 16 | r25 | RWA | $198 jt | +0,30% | 199 | $18,0 jt | 1,199 | 1,001 | **$21,6 jt** | $6,9–73,0 jt | 9–41 | 0,40 | $3,39 | −$22,70 | 7,7 | SKIP |
| 17 | k3-capital | Risk Curators | $208 jt | −8,90% | 543 | $18,4 jt | 1,160 | 0,980 | **$20,9 jt** | $6,7–70,6 jt | 9–31 | 0,38 | $1,43 | −$17,17 | 13,0 | SKIP |
| 18 | hive-protocol | Chain | $199 jt | −10,18% | 925 | $18,0 jt | 1,171 | 0,977 | **$20,6 jt** | $6,6–69,6 jt | 7–32 | 0,55 | $0,92 | −$25,18 | 28,4 | SKIP |
| 19 | defi-saver-asset-management | CDP Manager | $276 jt | −19,58% | null | $20,9 jt | 1,000 | 0,956 | **$20,0 jt** | $6,4–67,5 jt | 11–30 | 0,79 | $1,02 | −$85,08 | 84,5 | SKIP |
| 20 | symbiotic | Collateral Markets | $254 jt | −12,03% | 886 | $20,1 jt | 1,000 | 0,973 | **$19,6 jt** | $6,3–66,1 jt | 12–31 | 0,55 | $0,71 | −$85,39 | 121,2 | SKIP |

(TVL dalam dolar, B = miliar, jt = juta; umur dalam hari. Build-up per
baris memeriksa eksak: kurva × ×Kat × ×Growth = implied ±$1 — faktor
disimpan presisi penuh di `board.json`.)

**Sebaran nilai board (N = 198):** maks **$68,1 jt** (Sentora Curator)
· median **$7,12 jt** · min **$2,74 jt** (Nucleus) · total board
**$1,99 miliar** · 198 nilai berbeda · monotonik menurun
terverifikasi. Watchlist menempati rank 2–93 (16 dari top-20 adalah
watchlist, 4 adalah above-floor). Lima terbawah: btcfi-cdp $3,59 jt ·
qearn $3,32 jt · granite $3,13 jt · flying-tulip-ftusd $3,06 jt ·
nucleus $2,74 jt.

**Bacaan top-20:** Sentora Curator #1 bukan karena namanya — TVL
$2,76 miliar yang nyaris sama dengan Steakhouse ($2,75 miliar),
kategori yang sama, growth +2,37% vs −2,19% yang menggesernya ke
depan. Polymarket International #6 menunjukkan kerja offset:
Prediction Market ×1,650 (dari satu peer, di-shrink kuat) mengangkat
TVL $320 jt ke $36,7 jt. Veda/Upshift jatuh karena offset allocator
0,842. Nonce Capital (#7, umur 45 hari) membuktikan tenure TIDAK
dipakai: ia naik murni karena kurva + kategori + growth, bukan karena
umurnya.

**Perbandingan vs `radar-2` (N=178):** top-1 $1,96 miliar → $68,1 jt
(29× lebih kecil); median $4,5 jt → $7,12 jt; board 178 → 198
(+20 above-floor). Overlap top-10 dengan `radar-2`: 8/10 nama sama,
urutan dan level berubah total.

**Verifikasi yang dijalankan** (Node 22.23.4,
`~/workspace/makefun/node22/bin/node main.ts` ke `/tmp/out1` dan
`/tmp/out2` pada snapshot yang sama): coverage watchlist 40/40; rank
1..198 unik; implied integer positif ≤ 1e14; monotonik menurun; 198
nilai berbeda; farm_steps 8 langkah × 130–267 karakter;
`diff -r` kedua run **byte-identik**; `data.js` 782.767 byte,
`board.json` 1.094.869 byte (di bawah cap gate 8 MiB). `makefun
check` kit: satu-satunya gagal adalah `transcripts_present` (tidak
ada transkrip yang disertakan pada pengecekan lokal ini — urusan
submit, bukan model); check ini tidak menilai board secara lokal
("there is no local grade of this competition, the server grades
every entry").

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
2. **Offset kategori lemah pada 105 peer.** Pada peer set yang
   dipakai, offset hampir tidak membantu blind test (lihat §c) — ia
   dipertahankan atas dasar WF netral + pembedaan kategori yang nyata,
   bukan karena LOO membaik. Satu peer (Rain, Prediction Market)
   tetap menggerakkan offset kategorinya meski sudah di-shrink k=12.
3. **Rank correlation moderat (ρ 0,33–0,34).** Model memprediksi
   level nilai jauh lebih baik daripada urutan persisnya; rank range
   yang lebar (mis. Bittensor dTAO 1–74) adalah konsekuensi yang
   jujur dari baris-baris yang mengumpul di $20–40 jt.
4. **Band lebar.** P10–P90 satu baris membentang ~100× (0,085×–
   9,16×). Itu ukuran ketidakpastian yang sebenarnya dari data ini —
   bukan cacat presentasi. Implied value adalah estimasi titik di
   tengah ketidakpastian sebesar itu.
5. **Farm economics memakai asumsi yang dinyatakan, bukan data.**
   Airdrop share 10%, time share 90/(age+90), gas per chain, dan
   T-bill 4,5% adalah asumsi — bila salah satunya salah, verdict
   berubah. Hasil yang paling sensitif: **tidak ada FARM pada ukuran
   berapa pun** (§e) — itu konsekuensi asumsi-asumsi tersebut, dan
   mengubah asumsi untuk mendapatkan FARM tanpa mengatakannya adalah
   manipulasi.
6. **Launch odds bukan probabilitas launch.** Odds adalah share
   historis protokol seumur yang mencatat token — korelasi umur,
   bukan prediksi bahwa protokol ini akan launch. Odds tidak pernah
   dikalikan ke implied value (§c).
7. **Snapshot beku 2026-11-14.** Semua angka mengikuti snapshot
   itu; TVL, harga, dan status token setelah tanggal itu tidak
   tercermin.

---

## Catatan untuk builder (dashboard)

1. Ganti `MODEL` dengan konstanta `radar-3` di atas; naikkan
   `MODEL_VERSION` ke `radar-3`. Konstanta fit (a, b, offsets)
   dihitung dari snapshot saat run — jangan hardcode angka §c ke
   dashboard; baca dari `data.js` → `fit`.
2. Tampilkan per baris: build-up (kurva × ×Kat × ×Growth = implied),
   band P10–P25–P75–P90, rank range, launch odds, nearest comps
   (TVL, mcap, model, miss ×), dan ekonomi farm lengkap (§e).
   Kontrak field per baris ada di laporan pekerja model ke parent
   (data contract) — field-field itu sudah ada di `board.json` /
   `data.js` hasil run ini.
3. Tampilkan di cover: rumus + scatter log-log (peer vs kurva +
   band) + tabel validasi (LOO ×3,28 vs flat ×5,02; WF ×2,40 vs
   ×4,83; within-3× 46,67%; band coverage 50,48%/79,05%) + strip
   akuntansi 758 = 198 + 416 + 144 + seal "page = board.json".
4. Farm steps dihasilkan dari template §e (8 langkah, day 0 /
   weekly / week 6 / day 90); jangan tulis langkah per protokol
   secara manual.
5. Satu-satunya hal yang boleh berubah antar run adalah snapshot itu
   sendiri: semua konstanta (§c, §e) adalah bagian dari model dan
   ditampilkan di dashboard.

*Disusun 2026-11-17 dari `snapshot.json` as_of 2026-11-14. Tidak ada
data luar snapshot yang dipakai; tidak ada nama protokol yang
di-hardcode dalam model.*
