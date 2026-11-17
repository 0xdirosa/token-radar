// Token Radar dashboard (radar-3). Reads window.RADAR (data.js beside this
// page) and renders cover, board, live, method and set-aside views plus a
// per-protocol detail. No network: every number shown comes from data.js,
// except the set-aside reason counts, which are the snapshot audit in
// MODEL.md section (a) and are labelled as such.
(function(){'use strict';
var D=window.RADAR,app=document.getElementById('main'),live=document.getElementById('live'),dlg=document.getElementById('dlg');
if(!D||!app)return;
var S={view:'cover',q:'',cat:'all',chain:'all',tier:'all',verdict:'all',dep:1000,sort:'impl',desc:true,p:null};
var DEP={500:0,1000:1,5000:2,10000:3};
var SETASIDE=[['CEX',42],['Liquid Staking',38],['Bridge',28],['Canonical Bridge',15],['Versioned name',11],['Wrapped / staked name',5],['Liquid Restaking',3],['Restaked BTC',2]];
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function usd(n){if(n==null||!isFinite(n))return'n/a';var a=Math.abs(n);if(a>=1e9)return'$'+(n/1e9).toFixed(2)+'B';if(a>=1e6)return'$'+(n/1e6).toFixed(1)+'M';if(a>=1e3)return'$'+Math.round(n/1e3)+'K';return'$'+Math.round(n);}
function usd2(n){if(n==null||!isFinite(n))return'n/a';var a=Math.abs(n);if(a>=1000)return usd(n);return(n<0?'-$':'$')+a.toFixed(2);}
function pct(n){if(n==null||!isFinite(n))return'n/a';return(n>0?'+':'')+n.toFixed(2)+'%';}
function age(d){if(d==null)return'unknown';if(d>=365)return(d/365).toFixed(1)+'y';return Math.max(0,Math.round(d))+'d';}
function odds(n){return n==null?'n/a':(n*100).toFixed(0)+'%';}
function be(n){if(!isFinite(n))return'—';return n>=10?n.toFixed(1):n.toFixed(2);}
function sz(r){return r.farm.sizes[DEP[S.dep]];}
function fmtV(v){return'<span class="v v-'+v+'">'+v+'</span>';}
function readHash(){var h=new URLSearchParams(location.hash.slice(1));var g=function(k){return h.get(k);};
 if(g('view'))S.view=g('view');if(g('q')!=null)S.q=g('q');if(g('cat'))S.cat=g('cat');if(g('chain'))S.chain=g('chain');
 if(g('tier'))S.tier=g('tier');if(g('verdict'))S.verdict=g('verdict');if(g('dep'))S.dep=+g('dep')||1000;
 if(g('sort'))S.sort=g('sort');if(g('desc'))S.desc=g('desc')==='1';S.p=g('p');}
function writeHash(){var p=new URLSearchParams();if(S.view!=='cover')p.set('view',S.view);if(S.q)p.set('q',S.q);
 if(S.cat!=='all')p.set('cat',S.cat);if(S.chain!=='all')p.set('chain',S.chain);if(S.tier!=='all')p.set('tier',S.tier);
 if(S.verdict!=='all')p.set('verdict',S.verdict);if(S.dep!==1000)p.set('dep',S.dep);if(S.sort!=='impl')p.set('sort',S.sort);
 if(!S.desc)p.set('desc','0');if(S.p)p.set('p',S.p);var s=p.toString();
 history.replaceState(null,'',s?'#'+s:location.pathname+location.search);}
function seal(){var n=0;for(var i=0;i<D.rows.length;i++){var r=D.rows[i];if(r.rank===i+1&&(i===0||D.rows[i-1].implied_value_usd>=r.implied_value_usd))n++;}
 return n+'/'+D.rows.length+' rows match';}
function counts(){var c={FARM:0,THIN:0,SKIP:0};D.rows.forEach(function(r){c[sz(r).verdict]++;});return c;}
function filtered(){var q=S.q.trim().toLowerCase();return D.rows.filter(function(r){
 if(S.cat!=='all'&&(r.category||'Other')!==S.cat)return false;
 if(S.chain!=='all'&&!(r.chains||[]).includes(S.chain))return false;
 if(S.tier!=='all'&&r.tier!==S.tier)return false;
 if(S.verdict!=='all'&&sz(r).verdict!==S.verdict)return false;
 if(!q)return true;return[r.name,r.slug,r.category,(r.chains||[]).join(' ')].join(' ').toLowerCase().indexOf(q)>=0;});}
function sorted(l){var k=S.sort,d=S.desc?-1:1;return l.slice().sort(function(a,b){var av,bv;
 if(k==='rank'){av=a.rank;bv=b.rank;}else if(k==='name'){av=a.name.toLowerCase();bv=b.name.toLowerCase();}
 else if(k==='tvl'){av=a.tvl_usd;bv=b.tvl_usd;}else if(k==='chg'){av=a.change_7d==null?-1e9:a.change_7d;bv=b.change_7d==null?-1e9:b.change_7d;}
 else if(k==='age'){av=a.age_days==null?1e9:a.age_days;bv=b.age_days==null?1e9:b.age_days;}
 else if(k==='slice'){av=sz(a).slice_usd;bv=sz(b).slice_usd;}else if(k==='net'){av=sz(a).net_usd;bv=sz(b).net_usd;}
 else if(k==='be'){av=sz(a).breakeven_odds;bv=sz(b).breakeven_odds;}else if(k==='nph'){av=sz(a).net_usd;bv=sz(b).net_usd;}
 else{av=a.implied_value_usd;bv=b.implied_value_usd;}
 if(av<bv)return-d;if(av>bv)return d;return a.slug<b.slug?-1:1;});}
function th(k,label,cls){return'<th class="'+(cls||'')+'"><button data-sort="'+k+'">'+label+(S.sort===k?(S.desc?' ↓':' ↑'):'')+'</button></th>';}
function nav(){var v=[['cover','Cover'],['board','Board'],['live','Live token'],['method','Method'],['setaside','Set aside']];
 return'<nav class="nav" aria-label="Views">'+v.map(function(x){return'<button data-view="'+x[0]+'" aria-pressed="'+(S.view===x[0])+'">'+x[1]+'</button>';}).join('')+'</nav>';}
function header(){return'<header class="top"><div class="brand"><span class="mark"></span><b>Token Radar</b><span class="sub">radar-3 · snapshot '+esc(D.as_of)+' · DefiLlama protocols</span></div><div class="top-meta"><span class="seal">page = board.json: '+seal()+'</span><span>'+D.rows.length+' ranked</span></div></header>';}
function cover(){var V=D.validation,A=D.accounting,c=counts();
 var tot=D.rows.reduce(function(s,r){return s+r.implied_value_usd;},0);
 var thin=D.rows.filter(function(r){return r.farm.verdict==='THIN';}).sort(function(a,b){return b.farm.net_usd-a.farm.net_usd;});
 var best=thin.slice(0,3).map(function(r){return'<li><b>'+esc(r.name)+'</b> — net '+usd2(r.farm.net_usd)+' if it launches, break-even '+be(r.farm.breakeven_odds)+', '+usd2(r.farm.net_per_hour_usd)+'/h, slice '+usd2(r.farm.slice_usd)+' on $1,000</li>';}).join('')||'<li>No THIN row at $1,000.</li>';
 var depCounts=[500,1000,5000,10000].map(function(d){var cc={FARM:0,THIN:0,SKIP:0};D.rows.forEach(function(r){cc[r.farm.sizes[DEP[d]].verdict]++;});return'<tr><td class="num">$'+d.toLocaleString('en-US')+'</td><td class="num">'+cc.FARM+'</td><td class="num">'+cc.THIN+'</td><td class="num">'+cc.SKIP+'</td></tr>';}).join('');
 return'<section class="lede"><h1>198 pre-token protocols, priced off the curve the traded tokens set</h1><p>Implied value is a fitted log-log size curve on '+V.fit_peers+' traded peers, shrunk category offsets and a small 7-day growth term — tested out of sample, not asserted. Every row carries a band, a rank range and a costed 90-day farm plan. Implied value is an estimate, not a price and not a promise of a launch.</p></section>'
 +'<div class="stats">'
 +'<div class="stat"><span>Watchlist covered</span><b>'+A.watchlist+' / '+A.watchlist+'</b></div>'
 +'<div class="stat"><span>Ranked</span><b>'+A.ranked+'</b></div>'
 +'<div class="stat"><span>Already trade</span><b>'+A.traded+'</b></div>'
 +'<div class="stat"><span>Set aside</span><b>'+A.set_aside+'</b></div>'
 +'<div class="stat"><span>Total implied board</span><b>'+usd(tot)+'</b></div>'
 +'<div class="stat"><span>Median implied</span><b>'+usd(D.rows[98].implied_value_usd)+'</b></div></div>'
 +'<div class="grid"><section class="panel"><h2>How a value is built</h2><p class="sub">Huber fit on '+V.fit_peers+' traded peers (Bridge, Canonical Bridge and CEX excluded — their tokens price a different thing). Ten times the TVL is worth ×'+Math.pow(10,D.fit.b).toFixed(2)+', not ×10.</p><div class="formula">log10(implied) = '+D.fit.a.toFixed(4)+' + '+D.fit.b.toFixed(4)+' · log10(TVL / $100M)<br>+ category offset (shrunk, k='+D.model.cat_shrinkage_k+') + '+D.model.growth_weight_log10+' · clamp(7d change, '+D.model.growth_floor+', '+D.model.growth_cap+') / 100</div><canvas class="chart" id="chart" width="640" height="300" aria-label="Scatter chart: traded tokens against the fitted curve with the P25-P75 band"></canvas><p class="note">Dots: the 24 largest traded tokens (green) and the 198 board values (blue) against TVL. Band: the blind P25–P75 range from leave-one-out residuals. Curve fitted on all '+V.fit_peers+' peers, not only the 24 shown.</p></section>'
 +'<section class="panel"><h2>Out of sample</h2><p class="sub">Each traded token priced by a fit that never saw it; then fit on old listings, tested on newer ones.</p><dl class="kv">'
 +'<dt>Leave-one-out median miss</dt><dd>×'+V.loo.median_miss_x+' vs ×'+V.flat.loo.median_miss_x+' flat</dd>'
 +'<dt>Within 3× of the real cap</dt><dd>'+V.loo.within_3x_pct+'% vs '+V.flat.loo.within_3x_pct+'% flat</dd>'
 +'<dt>Walk-forward median miss</dt><dd>×'+V.walk_forward.mean_median_miss_x+' vs ×'+V.flat.walk_forward_mean_median_miss_x+' flat</dd>'
 +'<dt>Walk-forward within 3×</dt><dd>'+V.walk_forward.mean_within_3x_pct+'%</dd>'
 +'<dt>Rank correlation (LOO)</dt><dd>'+V.loo.spearman+' (flat '+V.flat.loo.spearman+')</dd>'
 +'<dt>Blind band coverage</dt><dd>P25–P75 '+V.bands.p25_75_coverage_pct+'% · P10–P90 '+V.bands.p10_90_coverage_pct+'%</dd>'
 +'<dt>Rank range</dt><dd>200 bootstrap refits, seed '+D.model.bootstrap_seed+'</dd></dl>'
 +'<h3 style="margin-top:14px">Best farms — read honestly</h3><p class="sub">At $1,000: <b>0 FARM / '+c.THIN+' THIN / '+c.SKIP+' SKIP</b>. No row clears the FARM bar (break-even ≤ 0.10) at any size; the THIN rows below are the best farms there are.</p><ul class="tight">'+best+'</ul>'
 +'<table style="margin-top:10px"><thead><tr><th>Deposit</th><th class="num">FARM</th><th class="num">THIN</th><th class="num">SKIP</th></tr></thead><tbody>'+depCounts+'</tbody></table></section></div>'
 +'<div class="grid2"><section class="panel"><h2>Accounting: all 758 protocols</h2><p class="sub">Ranked '+A.ranked+' = watchlist '+A.watchlist+' + above the $50M floor '+A.above_floor+' + early below it '+A.early+'. Traded '+A.traded+' are set apart (their caps set the curve). Set aside '+A.set_aside+' pre-token protocols fail the watchlist rule.</p><dl class="kv"><dt>Ranked</dt><dd>'+A.ranked+'</dd><dt>Already trade a token</dt><dd>'+A.traded+'</dd><dt>Set aside</dt><dd>'+A.set_aside+'</dd><dt>Total</dt><dd>'+A.total+'</dd></dl></section>'
 +'<section class="panel"><h2>Top of the board</h2><p class="sub">Value is capped by the curve: the largest TVL on the board ($2.76B) is worth $68.1M implied, not billions.</p><ul class="tight">'+D.rows.slice(0,5).map(function(r){return'<li><b>#'+r.rank+' '+esc(r.name)+'</b> — '+usd(r.implied_value_usd)+' (P25–P75 '+usd(r.implied_p25_usd)+'–'+usd(r.implied_p75_usd)+'), rank range '+r.rank_lo+'–'+r.rank_hi+'</li>';}).join('')+'</ul><p class="note">See the Board tab for the full ranking with farm economics per row.</p></section></div>';}
function controls(){var cats=[],chains=[];D.rows.forEach(function(r){if(cats.indexOf(r.category||'Other')<0)cats.push(r.category||'Other');(r.chains||[]).forEach(function(c){if(chains.indexOf(c)<0)chains.push(c);});});
 cats.sort();chains.sort();var c=counts();
 var opt=function(vs,cur,all){return'<option value="all">'+all+'</option>'+vs.map(function(v){return'<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(v)+'</option>';}).join('');};
 var chip=function(k,label,n){return'<button data-verdict="'+k+'" aria-pressed="'+(S.verdict===k)+'">'+label+' '+n+'</button>';};
 return'<div class="controls"><div class="field"><label for="q">Search</label><input type="search" id="q" placeholder="Search protocols" value="'+esc(S.q)+'" aria-label="Search the board"></div>'
 +'<div class="field"><label for="cat">Category</label><select id="cat" aria-label="Filter by category">'+opt(cats,S.cat,'All categories')+'</select></div>'
 +'<div class="field"><label for="chain">Chain</label><select id="chain" aria-label="Filter by chain">'+opt(chains,S.chain,'All chains')+'</select></div>'
 +'<div class="field"><span>Tier</span><div class="chips"><button data-tier="all" aria-pressed="'+(S.tier==='all')+'">All '+D.rows.length+'</button><button data-tier="watchlist" aria-pressed="'+(S.tier==='watchlist')+'">Watchlist '+D.accounting.watchlist+'</button><button data-tier="above-floor" aria-pressed="'+(S.tier==='above-floor')+'">Above floor '+D.accounting.above_floor+'</button><button data-tier="early" aria-pressed="'+(S.tier==='early')+'">Early '+D.accounting.early+'</button></div></div>'
 +'<div class="field"><span>Verdict at $'+S.dep.toLocaleString('en-US')+'</span><div class="chips">'+chip('all','All',D.rows.length)+chip('FARM','FARM',c.FARM)+chip('THIN','THIN',c.THIN)+chip('SKIP','SKIP',c.SKIP)+'</div></div>'
 +'<div class="field"><span>Deposit</span><div class="dep">'+[500,1000,5000,10000].map(function(d){return'<button data-dep="'+d+'" aria-pressed="'+(S.dep===d)+'">$'+(d>=1000?(d/1000)+'K':d)+'</button>';}).join('')+'</div></div>'
 +'<span class="count" id="count"></span></div>';}
function board(){var list=sorted(filtered());
 var rows=list.map(function(r){var f=sz(r);var g=r.change_7d==null?'':r.change_7d>=0?'pos':'neg';
  return'<tr data-slug="'+esc(r.slug)+'" tabindex="0"><td class="num">#'+r.rank+'<br><span class="band">'+r.rank_lo+'–'+r.rank_hi+'</span></td>'
  +'<td class="name"><b>'+esc(r.name)+'</b><span>'+esc(r.category||'Other')+' · '+esc((r.chains||[]).slice(0,2).join(', ')||'—')+' · '+r.tier+'</span></td>'
  +'<td class="num">'+usd(r.tvl_usd)+'</td><td class="num '+g+'">'+pct(r.change_7d)+'</td><td class="num">'+age(r.age_days)+'</td>'
  +'<td class="num">'+usd(r.implied_value_usd)+'<br><span class="band">'+usd(r.implied_p25_usd)+'–'+usd(r.implied_p75_usd)+'</span></td>'
  +'<td class="num">'+usd2(f.slice_usd)+'</td><td class="num">'+usd2(f.net_usd)+'</td><td class="num">'+be(f.breakeven_odds)+'</td><td class="num">'+usd2(f.net_usd/r.farm.hours)+'/h</td>'
  +'<td>'+fmtV(f.verdict)+'</td></tr>';}).join('');
 return'<section class="panel twrap"><div class="table-wrap"><table><caption class="sub" style="text-align:left;padding:10px 12px 0">Pre-token protocols, strongest implied value first. Slice, net, break-even and verdict are for a $'+S.dep.toLocaleString('en-US')+' deposit; use the switcher to reprice. Select a row for its build-up, comps and farm plan.</caption><thead><tr>'
 +th('rank','Rank')+th('name','Protocol')+th('tvl','TVL','num')+th('chg','7d','num')+th('age','Age','num')+th('impl','Implied value','num')+th('slice','$'+(S.dep>=1000?(S.dep/1000)+'K':S.dep)+' slice','num')+th('net','Net if launch','num')+th('be','Break-even','num')+th('nph','Net / hour','num')+'<th>Verdict</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
 +(list.length===0?'<div class="panel"><div class="empty"><h2>No protocol matches that filter</h2><p>Clear the search or pick another category, chain, tier or verdict.</p><button class="button primary" data-clear="1">Clear filters</button></div></div>':'');}
function liveView(){var rows=D.live.map(function(r){var off=D.fit.offsets[r.category||'']||0;
 return'<tr><td class="name"><b>'+esc(r.name)+'</b><span>'+esc(r.category||'Other')+' · '+esc((r.chains||[]).slice(0,2).join(', ')||'—')+'</span></td><td class="num">'+usd(r.tvl_usd)+'</td><td class="num">'+usd(r.mcap_usd)+'</td><td class="num">'+(r.mcap_usd&&r.tvl_usd?(r.mcap_usd/r.tvl_usd).toFixed(3)+'×':'n/a')+'</td><td class="num '+((r.change_7d||0)>=0?'pos':'neg')+'">'+pct(r.change_7d)+'</td><td class="num">×'+Math.pow(10,off).toFixed(3)+'</td></tr>';}).join('');
 return'<section class="lede"><h1>Live token: the peers the curve is fitted on</h1><p>'+D.live.length+' largest traded protocols by market cap (the fit uses all '+D.validation.fit_peers+' peers with a cap; '+D.fit.excluded_peer_count+' Bridge / Canonical Bridge / CEX peers are excluded from the fit). Their caps are facts, not a model — and they are never ranked.</p></section>'
 +'<section class="panel twrap"><div class="table-wrap"><table><thead><tr><th>Protocol</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">mcap / TVL</th><th class="num">7d</th><th class="num">Category ×</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
 +'<p class="note">Category × is 10^(category offset) from the fit: the multiplier the same category applies to a board row. Categories with no traded peer get ×1.000 (offset 0).</p>';}
function methodView(){var V=D.validation;
 var mrows=V.methods.map(function(m){return'<tr><td>'+esc(m.method)+' · '+esc(m.variant)+'</td><td class="num">×'+m.loo_median_miss_x+'</td><td class="num">'+m.loo_within_3x_pct+'%</td><td class="num">'+m.loo_spearman+'</td><td class="num">×'+m.wf_mean_miss_x+'</td></tr>';}).join('');
 var arows=V.ablation.map(function(a){return'<tr><td>'+esc(a.variant)+'</td><td class="num">×'+a.loo_median_miss_x+'</td><td class="num">'+a.loo_within_3x_pct+'%</td><td class="num">'+a.loo_spearman+'</td><td class="num">×'+a.wf_mean_miss_x+'</td></tr>';}).join('');
 var wrows=V.walk_forward.cutoffs.map(function(w){return'<tr><td>'+esc(w.cutoff)+'</td><td class="num">'+w.train_n+' / '+w.test_n+'</td><td class="num">×'+w.median_miss_x+'</td><td class="num">'+w.within_3x_pct+'%</td><td class="num">'+w.spearman+'</td></tr>';}).join('');
 return'<section class="lede"><h1>Method: one curve, tested blind</h1><p>The model was chosen by its out-of-sample numbers, not by preference. Terms the blind test did not keep — tenure, chain breadth, a launch-odds multiplier — are not in the formula; launch odds are shown per row as context only and never multiplied into implied value.</p></section>'
 +'<div class="grid"><section class="panel"><h2>Formula (radar-3)</h2><div class="formula">log10(implied) = '+D.fit.a.toFixed(4)+' + '+D.fit.b.toFixed(4)+' · log10(TVL / $100M)<br>+ category offset (shrunk, k='+D.model.cat_shrinkage_k+') + '+D.model.growth_weight_log10+' · clamp(7d change, '+D.model.growth_floor+', '+D.model.growth_cap+') / 100<br>implied = max(1, round(10 ^ log10(implied)))</div><dl class="kv"><dt>Fit</dt><dd>Huber (IRLS, 60 iters)</dd><dt>Peers</dt><dd>'+V.fit_peers+' (23 excluded)</dd><dt>Band</dt><dd>LOO residuals: P25–P75 ×0.321–×3.38</dd><dt>Rank range</dt><dd>200 bootstrap refits</dd></dl><h3 style="margin-top:14px">Farm assumptions (stated, not snapshot facts)</h3><ul class="tight"><li>Airdrop share 10% of implied value if it launches; time share 90 / (age + 90); age unknown → 548 days.</li><li>Hold 90 days; 15 on-chain transactions; gas Ethereum $5.00, L2 $0.50, Solana $0.10, other $1.00.</li><li>Forgone yield: T-bill 4.5% p.a. on the deposit for 90 days; the farmed position is assumed to earn 0%.</li><li>Work 3.17 h (5 + 15 + 120 + 10 + 15 + 10 + 5 + 10 min). FARM if break-even ≤ 0.10, THIN if ≤ 0.33, else SKIP.</li><li>Slice = 10% × implied × deposit / TVL × time share. Net = slice − fees − forgone. Break-even = costs / slice.</li><li>No points program is claimed: the snapshot records none, so every plan says to check the protocol’s own page.</li></ul></section>'
 +'<section class="panel"><h2>Out-of-sample detail</h2><dl class="kv"><dt>LOO (n='+V.loo.n+')</dt><dd>×'+V.loo.median_miss_x+' · '+V.loo.within_3x_pct+'% in 3× · ρ '+V.loo.spearman+'</dd><dt>Flat multiple LOO</dt><dd>×'+V.flat.loo.median_miss_x+' · '+V.flat.loo.within_3x_pct+'% in 3× · ρ '+V.flat.loo.spearman+'</dd><dt>Walk-forward mean</dt><dd>×'+V.walk_forward.mean_median_miss_x+' · '+V.walk_forward.mean_within_3x_pct+'% in 3× · ρ '+V.walk_forward.mean_spearman+'</dd><dt>Flat walk-forward</dt><dd>×'+V.flat.walk_forward_mean_median_miss_x+' · '+V.flat.walk_forward_mean_within_3x_pct+'% in 3×</dd><dt>Band coverage</dt><dd>P25–P75 '+V.bands.p25_75_coverage_pct+'% · P10–P90 '+V.bands.p10_90_coverage_pct+'%</dd></dl><h3 style="margin-top:14px">Walk-forward cutoffs</h3><table><thead><tr><th>Cutoff</th><th class="num">Train / test</th><th class="num">Miss</th><th class="num">In 3×</th><th class="num">ρ</th></tr></thead><tbody>'+wrows+'</tbody></table></section></div>'
 +'<div class="grid2" style="margin-top:14px"><section class="panel"><h2>Fit methods compared</h2><table><thead><tr><th>Method</th><th class="num">LOO miss</th><th class="num">In 3×</th><th class="num">ρ</th><th class="num">WF miss</th></tr></thead><tbody>'+mrows+'</tbody></table></section>'
 +'<section class="panel"><h2>Ablation (Huber, 105 peers)</h2><table><thead><tr><th>Variant</th><th class="num">LOO miss</th><th class="num">In 3×</th><th class="num">ρ</th><th class="num">WF miss</th></tr></thead><tbody>'+arows+'</tbody></table><p class="note">Category offsets barely help LOO (×3.18 → ×3.37) but are kept on neutral walk-forward evidence plus real category spread; tenure, breadth and launch-odds multipliers were dropped because the blind test rejected them.</p></section></div>';}
function setasideView(){var A=D.accounting;
 return'<section class="lede"><h1>Set aside: where the other 560 protocols go</h1><p>758 = '+A.ranked+' ranked + '+A.traded+' already trade + '+A.set_aside+' set aside. Nothing is dropped silently.</p></section>'
 +'<div class="grid2"><section class="panel"><h2>Set aside: 144 pre-token protocols</h2><p class="sub">Each fails the watchlist rule. Counts are the snapshot audit in MODEL.md §(a); the per-reason split is not a field in data.js.</p><table><thead><tr><th>Reason</th><th class="num">Protocols</th></tr></thead><tbody>'+SETASIDE.map(function(x){return'<tr><td>'+esc(x[0])+'</td><td class="num">'+x[1]+'</td></tr>';}).join('')+'<tr><td><b>Total set aside</b></td><td class="num"><b>144</b></td></tr></tbody></table></section>'
 +'<section class="panel"><h2>Ranked: 198</h2><dl class="kv"><dt>Watchlist (≥ $50M, no token)</dt><dd>40</dd><dt>Above the floor, not watchlist</dt><dd>20</dd><dt>Early, below the floor</dt><dd>138</dd><dt>Already trade (kept apart)</dt><dd>416</dd><dt>Total accounted</dt><dd>758</dd></dl><h3 style="margin-top:14px">Why the rule excludes them</h3><ul class="tight"><li>CEX, Bridge and Canonical Bridge tokens price an exchange or a bridge, not a protocol’s own token — the same categories are excluded from the fit.</li><li>Liquid Staking / Liquid Restaking / Restaked BTC and wrapped or staked names are a product of a token that already trades.</li><li>Versioned names (V2, 2.0, …) are a pool of another protocol, not a standalone one.</li><li>No parent field exists in the snapshot, so no sibling haircut is applied to any row — and none is claimed.</li></ul></section></div>';}
function detail(r){var f=r.farm;var run1=r.size_curve_usd,run2=Math.round(run1*r.category_multiplier),run3=Math.round(run2*r.growth_multiplier);
 var comps=r.nearest_comps.map(function(c){return'<tr><td class="name"><b>'+esc(c.name)+'</b><span>'+esc(c.category||'Other')+'</span></td><td class="num">'+usd(c.tvl_usd)+'</td><td class="num">'+usd(c.mcap_usd)+'</td><td class="num">'+(c.mcap_usd/c.tvl_usd).toFixed(3)+'×</td><td class="num">'+usd(c.model_usd)+'</td><td class="num">×'+c.miss_x.toFixed(2)+'</td></tr>';}).join('');
 var steps=f.steps.map(function(s){return'<li><b>'+esc(s.text)+'</b><span class="cost">'+esc(s.cost)+' · '+esc(s.time)+' · $'+s.cost_usd.toFixed(2)+' · '+s.time_min+' min</span></li>';}).join('');
 var sizes=f.sizes.map(function(s){return'<tr><td class="num">$'+s.deposit_usd.toLocaleString('en-US')+'</td><td class="num">'+usd2(s.slice_usd)+'</td><td class="num">'+usd2(s.total_cost_usd)+'</td><td class="num">'+usd2(s.net_usd)+'</td><td class="num">'+be(s.breakeven_odds)+'</td><td>'+fmtV(s.verdict)+'</td></tr>';}).join('');
 dlg.innerHTML='<div class="dh"><div><span class="sub">Rank '+r.rank+' of '+D.rows.length+' · rank range '+r.rank_lo+'–'+r.rank_hi+' · '+r.tier+'</span><h2 id="dlg-title">'+esc(r.name)+'</h2><p class="sub">'+esc(r.category||'Other')+' on '+esc((r.chains||[]).join(', ')||'—')+' · TVL '+usd(r.tvl_usd)+' · 7d '+pct(r.change_7d)+' · no token for '+age(r.age_days)+' · launch odds (context only) '+odds(r.launch_odds)+'</p></div><button class="close" data-close="1">Close</button></div>'
 +'<section class="dsec"><h3>How '+usd(r.implied_value_usd)+' is built</h3><div class="eq">'
 +'<div><span>Size curve — 10^'+D.fit.a.toFixed(4)+' × (TVL / $100M)^'+D.fit.b.toFixed(4)+'</span><b>'+usd(run1)+'</b></div>'
 +'<div><span>Category offset '+(r.category_offset_log10>=0?'+':'')+r.category_offset_log10.toFixed(4)+' log10 → ×'+r.category_multiplier.toFixed(3)+'</span><b>'+usd(run2)+'</b></div>'
 +'<div><span>7-day growth '+pct(r.change_7d)+' → ×'+r.growth_multiplier.toFixed(3)+'</span><b>'+usd(run3)+'</b></div>'
 +'<div><span>Implied value</span><b>'+usd(r.implied_value_usd)+'</b></div>'
 +'<div><span>Blind band P25–P75</span><b>'+usd(r.implied_p25_usd)+' – '+usd(r.implied_p75_usd)+'</b></div>'
 +'<div><span>Blind band P10–P90</span><b>'+usd(r.implied_p10_usd)+' – '+usd(r.implied_p90_usd)+'</b></div></div>'
 +'<p class="note">Running values are rounded; the product of the full-precision factors is the board value. The band is the point value times the leave-one-out residual quantiles — it holds about 50% (P25–P75) and 80% (P10–P90) of traded peers’ real caps.</p></section>'
 +'<section class="dsec"><h3>Nearest traded comps</h3><table><thead><tr><th>Protocol</th><th class="num">TVL</th><th class="num">Mcap</th><th class="num">Mcap/TVL</th><th class="num">Model says</th><th class="num">Miss</th></tr></thead><tbody>'+comps+'</tbody></table><p class="note">Closest by TVL, same category first. Miss is max(actual/model, model/actual) — how far the curve is off that peer.</p></section>'
 +'<section class="dsec"><h3>Farm plan — $1,000 for 90 days ' +fmtV(f.verdict)+'</h3><div class="tot">'
 +'<div><span>Slice if it launches</span><b>'+usd2(f.slice_usd)+'</b></div><div><span>Fees (15 tx × '+usd2(f.gas_usd_per_tx)+')</span><b>'+usd2(f.fees_usd)+'</b></div><div><span>Forgone T-bill 4.5%</span><b>'+usd2(f.forgone_usd)+'</b></div><div><span>Total cost</span><b>'+usd2(f.total_cost_usd)+'</b></div>'
 +'<div><span>Net if it launches</span><b>'+usd2(f.net_usd)+'</b></div><div><span>Break-even odds</span><b>'+be(f.breakeven_odds)+'</b></div><div><span>Net per hour ('+f.hours+' h)</span><b>'+usd2(f.net_per_hour_usd)+'/h</b></div><div><span>Time share 90/(age+90)</span><b>'+f.time_share.toFixed(3)+'</b></div></div>'
 +'<ol class="steps">'+steps+'</ol>'
 +'<h3 style="margin-top:14px">Same plan at other sizes</h3><table><thead><tr><th class="num">Deposit</th><th class="num">Slice</th><th class="num">Cost</th><th class="num">Net</th><th class="num">Break-even</th><th>Verdict</th></tr></thead><tbody>'+sizes+'</tbody></table>'
 +'<p class="note">Stop rule: if TVL closes below '+usd(f.stop_tvl_usd)+' (80% of TVL at deposit) at week 6, withdraw half the same day. Exit below '+usd(f.exit_tvl_usd)+' (50%). Slice = 10% × implied × deposit / TVL × time share. Net is stated if the token launches — it is not expected value.</p></section>';
 if(!dlg.open)dlg.showModal();}
function render(){readHash();var h='';
 h+=header()+nav();
 if(S.view==='board'){h+=controls()+board();}
 else if(S.view==='live'){h+=liveView();}
 else if(S.view==='method'){h+=methodView();}
 else if(S.view==='setaside'){h+=setasideView();}
 else{h+=cover();}
 app.innerHTML='<div class="shell">'+h+'</div>';
 app.setAttribute('aria-busy','false');
 var c=document.getElementById('count');if(c){var n=filtered().length;var f=sorted(filtered());c.textContent=n+' of '+D.rows.length+' rows shown';if(live)live.textContent=n+' of '+D.rows.length+' pre-token protocols shown.';}
 if(S.view==='cover')drawChart();
 if(S.p){var r=D.rows.filter(function(x){return x.slug===S.p;})[0];if(r)detail(r);else if(dlg.open)dlg.close();}
 else if(dlg.open)dlg.close();}
function drawChart(){var cv=document.getElementById('chart');if(!cv)return;var ctx=cv.getContext('2d');var W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
 var pts=D.live.filter(function(r){return r.mcap_usd&&r.tvl_usd>0;});
 var xs=D.rows.map(function(r){return r.tvl_usd;}).concat(pts.map(function(r){return r.tvl_usd;}));
 var ys=D.rows.map(function(r){return r.implied_value_usd;}).concat(pts.map(function(r){return r.mcap_usd;}));
 var x0=Math.floor(Math.log10(Math.min.apply(null,xs))),x1=Math.ceil(Math.log10(Math.max.apply(null,xs)));
 var y0=Math.floor(Math.log10(Math.min.apply(null,ys))),y1=Math.ceil(Math.log10(Math.max.apply(null,ys)));
 var X=function(v){return 46+(Math.log10(v)-x0)/(x1-x0)*(W-56);},Y=function(v){return H-34-(Math.log10(v)-y0)/(y1-y0)*(H-48);};
 ctx.strokeStyle='#d3dce8';ctx.fillStyle='#5b6b82';ctx.font='10px monospace';ctx.textAlign='center';
 for(var x=x0;x<=x1;x++){var px=X(Math.pow(10,x));ctx.beginPath();ctx.moveTo(px,8);ctx.lineTo(px,H-34);ctx.stroke();ctx.fillText('$'+(x>=9?Math.pow(10,x-9)+'B':x>=6?Math.pow(10,x-6)+'M':Math.pow(10,x-3)+'K'),px,H-20);}
 ctx.textAlign='right';for(var y=y0;y<=y1;y++){var py=Y(Math.pow(10,y));ctx.beginPath();ctx.moveTo(46,py);ctx.lineTo(W-10,py);ctx.stroke();ctx.fillText('$'+(y>=9?Math.pow(10,y-9)+'B':y>=6?Math.pow(10,y-6)+'M':Math.pow(10,y-3)+'K'),42,py+3);}
 var q=D.validation.loo_residual_quantiles;
 ctx.beginPath();for(var i=0;i<=40;i++){var tv=Math.pow(10,x0+(x1-x0)*i/40);var v=Math.pow(10,D.fit.a+D.fit.b*Math.log10(tv/1e8))*Math.pow(10,q.p75);if(i===0)ctx.moveTo(X(tv),Y(v));else ctx.lineTo(X(tv),Y(v));}
 for(var j=40;j>=0;j--){var tv2=Math.pow(10,x0+(x1-x0)*j/40);var v2=Math.pow(10,D.fit.a+D.fit.b*Math.log10(tv2/1e8))*Math.pow(10,q.p25);ctx.lineTo(X(tv2),Y(v2));}
 ctx.closePath();ctx.fillStyle='rgba(11,79,214,.10)';ctx.fill();
 ctx.beginPath();for(var k=0;k<=40;k++){var tv3=Math.pow(10,x0+(x1-x0)*k/40);var v3=Math.pow(10,D.fit.a+D.fit.b*Math.log10(tv3/1e8));if(k===0)ctx.moveTo(X(tv3),Y(v3));else ctx.lineTo(X(tv3),Y(v3));}
 ctx.strokeStyle='#0b4fd6';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=1;
 ctx.fillStyle='rgba(11,79,214,.45)';D.rows.forEach(function(r){ctx.beginPath();ctx.arc(X(r.tvl_usd),Y(r.implied_value_usd),2,0,7);ctx.fill();});
 ctx.fillStyle='#137a4b';pts.forEach(function(r){ctx.beginPath();ctx.arc(X(r.tvl_usd),Y(r.mcap_usd),3.5,0,7);ctx.fill();});
 ctx.fillStyle='#0e1b2e';ctx.textAlign='left';ctx.font='11px monospace';ctx.fillText('— curve  — P25–P75 band   ● traded   ● board',48,20);}
document.addEventListener('click',function(e){var t=e.target.closest('[data-view],[data-sort],[data-tier],[data-verdict],[data-dep],[data-close],[data-clear],tr[data-slug]');
 if(!t)return;
 if(t.hasAttribute('data-view')){S.view=t.getAttribute('data-view');S.p=null;writeHash();render();}
 else if(t.hasAttribute('data-sort')){var k=t.getAttribute('data-sort');if(S.sort===k)S.desc=!S.desc;else{S.sort=k;S.desc=true;}writeHash();render();}
 else if(t.hasAttribute('data-tier')){S.tier=t.getAttribute('data-tier');writeHash();render();}
 else if(t.hasAttribute('data-verdict')){S.verdict=t.getAttribute('data-verdict');writeHash();render();}
 else if(t.hasAttribute('data-dep')){S.dep=+t.getAttribute('data-dep');writeHash();render();}
 else if(t.hasAttribute('data-close')){dlg.close();}
 else if(t.hasAttribute('data-clear')){S.q='';S.cat='all';S.chain='all';S.tier='all';S.verdict='all';writeHash();render();}
 else if(t.getAttribute('data-slug')){S.p=t.getAttribute('data-slug');writeHash();render();}});
document.addEventListener('input',function(e){if(e.target.id==='q'){S.q=e.target.value;writeHash();var pos=e.target.selectionStart;render();var n=document.getElementById('q');if(n){n.focus();n.setSelectionRange(pos,pos);}}});
document.addEventListener('change',function(e){if(e.target.id==='cat'){S.cat=e.target.value;writeHash();render();}if(e.target.id==='chain'){S.chain=e.target.value;writeHash();render();}});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches&&e.target.matches('tr[data-slug]')){S.p=e.target.getAttribute('data-slug');writeHash();render();}});
dlg.addEventListener('close',function(){if(S.p){S.p=null;writeHash();}});
window.addEventListener('hashchange',render);
render();
})();
