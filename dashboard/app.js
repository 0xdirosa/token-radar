// Token Radar dashboard (`radar-2`). Reads window.RADAR (written beside
// dashboard/ by main.ts) and renders the ranked board, filters, and a
// per-protocol detail view with the model's own inputs and the protocol's farm
// plan. No network: every byte shown is already in data.js. The page
// re-derives the farm plan and the implied value from the snapshot figures,
// so the code and the board's data visibly agree.
(function () {
  'use strict';

  var DATA = window.RADAR;
  var app = document.getElementById('board');
  var live = document.getElementById('live');
  if (!DATA || !app) return;

  var state = { q: '', category: 'all', chain: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };
  var firstRender = true;

  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return Number(n).toFixed(4);
  }
  function fmtRatio(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return n.toFixed(3) + 'x';
  }

  // The model in one function: the same arithmetic main.ts runs, recomputed here
  // so a row's number can be checked against the one board.json carries.
  // implied = TVL x category multiple x growth x maturity x chain.
  function impliedOf(row, model) {
    var g = row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d;
    g = Math.min(model.growth_cap, Math.max(model.growth_floor, g));
    var growthMult = 1 + model.growth_weight * (g / 100);
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + model.maturity_range * (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days);
    var chainMult = 1 + model.chain_step * Math.min(Math.max((row.chains || []).length - 1, 0), model.chain_cap);
    return Math.max(1, Math.round(row.tvl_usd * row.multiple * growthMult * maturity * chainMult));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  // The farm plan, derived in the page exactly as main.ts derives it for
  // board.json (MODEL.md section e): capital by TVL, hold by age, gas by main
  // chain, action by category bucket. No name is special-cased.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 1e9) return 250;
    if (p.tvl_usd >= 1e8) return 150;
    if (p.tvl_usd >= 5e7) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 45;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  var L2_CHAINS = { Base: 1, Arbitrum: 1, Optimism: 1, Monad: 1, Polygon: 1, Ink: 1, Unichain: 1, Katana: 1, Linea: 1, Scroll: 1, Blast: 1 };
  function gasFor(chain) {
    if (chain === 'Ethereum') return { first: 'under $8', tx: '$5' };
    if (chain === 'Solana') return { first: 'under $1', tx: '$0.10' };
    if (L2_CHAINS[chain]) return { first: 'under $3', tx: '$2' };
    return { first: 'under $1', tx: '$1' };
  }
  function bucketFor(p) {
    var c = (p.category || '').toLowerCase();
    if (c.indexOf('risk curator') >= 0 || c.indexOf('onchain capital allocator') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'vault';
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'lending';
    if (c.indexOf('dex') >= 0 || c.indexOf('liquidity manager') >= 0) return 'dex';
    if (c.indexOf('rwa') >= 0) return 'rwa';
    if (c.indexOf('basis trading') >= 0) return 'basis';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'perp';
    if (c.indexOf('restak') >= 0) return 'restake';
    if (c.indexOf('staking') >= 0) return 'staking';
    if (c.indexOf('insurance') >= 0) return 'insurance';
    if (c.indexOf('payment') >= 0) return 'payments';
    if (c.indexOf('governance') >= 0) return 'governance';
    if (c.indexOf('cedefi') >= 0) return 'cedefi';
    if (c.indexOf('stable') >= 0) return 'stable';
    if (c.indexOf('bridge') >= 0) return 'bridge';
    if (c.indexOf('chain') >= 0) return 'chain';
    return 'default';
  }
  function coreAction(bucket, p, capital, chain) {
    var name = p.name;
    if (bucket === 'vault') return 'Deposit $' + capital + ' of USDC into a ' + name + ' vault on ' + chain + ' and keep the position open.';
    if (bucket === 'lending') return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (bucket === 'dex') return 'Provide $' + capital + " of liquidity to " + name + "'s main pool on " + chain + ' and keep the position open.';
    if (bucket === 'rwa') return 'Buy $' + capital + " of " + name + "'s yield-bearing asset on " + chain + ' and hold it in the wallet.';
    if (bucket === 'basis') return 'Deposit $' + capital + ' of USDC into a ' + name + ' basis-trading vault on ' + chain + ' and keep the position open.';
    if (bucket === 'perp') return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (bucket === 'restake') return "Restake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (bucket === 'staking') return 'Stake $' + capital + ' through ' + name + ' and keep the receipt.';
    if (bucket === 'insurance') return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (bucket === 'payments') return 'Keep $' + capital + ' in ' + name + ' on ' + chain + ' for payments and use it for one payment.';
    if (bucket === 'chain') return 'Bridge $' + capital + ' to ' + chain + ' and use its native apps.';
    if (bucket === 'governance') return 'Deposit $' + capital + ' into ' + name + ' and vote in its governance.';
    if (bucket === 'cedefi') return 'Deposit $' + capital + ' of USDC into a ' + name + ' vault on ' + chain + ' and keep the position open.';
    if (bucket === 'stable') return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (bucket === 'bridge') return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function weeklyAction(bucket, p, chain) {
    var name = p.name;
    if (bucket === 'vault') return 'Repeat one qualifying action each week, such as a deposit, a rebalance or a vote on a ' + name + ' vault.';
    if (bucket === 'lending') return 'Repeat one qualifying action each week, such as a deposit, a borrow or a repayment on ' + name + '.';
    if (bucket === 'dex') return 'Repeat one qualifying action each week, such as adding liquidity or a swap on ' + name + '.';
    if (bucket === 'rwa') return 'Repeat one qualifying action each week, such as adding to the position or using the asset in an ' + name + ' flow on ' + chain + '.';
    if (bucket === 'basis') return 'Repeat one qualifying action each week, such as a deposit or a rebalance in the ' + name + ' vault.';
    if (bucket === 'perp') return 'Repeat one qualifying action each week, such as adjusting the hedge or adding margin on ' + name + '.';
    if (bucket === 'restake' || bucket === 'staking') return 'Repeat one qualifying action each week, such as adding to the stake or claiming rewards through ' + name + '.';
    if (bucket === 'insurance') return 'Repeat one qualifying action each week, such as renewing cover or adding a second policy on ' + name + '.';
    if (bucket === 'payments') return 'Repeat one qualifying action each week, such as one payment through ' + name + ' on ' + chain + '.';
    if (bucket === 'chain') return 'Repeat one qualifying action each week, such as a bridge or a swap on ' + chain + ' through ' + name + '.';
    if (bucket === 'governance') return 'Repeat one qualifying action each week, such as a vote or a deposit on ' + name + '.';
    return 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var gas = gasFor(chain);
    var bucket = bucketFor(p);
    var subject = bucket === 'vault' ? 'the vault position' : bucket === 'insurance' ? 'the policy' : 'the position';
    var lead = bucket === 'rwa' ? 'Before you sell' : bucket === 'insurance' ? 'Before the policy ends' : 'Before you withdraw';
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: gas.first + ' of gas for the first transaction', time: '5 minutes' },
      { text: coreAction(bucket, p, capital, chain), cost: '$' + capital + ' of capital and about ' + gas.tx + ' of gas', time: '15 minutes to set up' },
      { text: weeklyAction(bucket, p, chain), cost: 'about ' + gas.tx + ' of gas a week', time: '10 minutes a week' },
      { text: 'Hold ' + subject + ' for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in ' + (subject === 'the policy' ? 'the policy' : 'the position'), time: hold + ' days' },
      { text: lead + ", open " + p.name + "'s own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }

  function readHash() {
    var params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tab') === 'live') state.tab = 'live';
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.tab === 'live') params.set('tab', 'live');
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    window.history.replaceState(null, '', next ? '#' + next : window.location.pathname + window.location.search);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && !(r.chains || []).includes(state.chain)) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'rank') { av = a.rank; bv = b.rank; }
      else if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model' })
      )
    );
  }

  function lede() {
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { id: 'page-title', tabindex: '-1', text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', { text: 'The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + DATA.early_size + ' pre-token protocols below that floor, every one that passes the watchlist rule. Implied value is a model, not a promise.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Early rows below the floor' }), el('b', { text: String(DATA.early_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols set aside' }), el('b', { text: String(DATA.live_size) }))
      )
    );
  }

  function optionList(values, current, allLabel) {
    var opts = [el('option', { value: 'all', text: allLabel, selected: current === 'all' ? 'selected' : null })];
    values.forEach(function (v) { opts.push(el('option', { value: v, text: v, selected: v === current ? 'selected' : null })); });
    return opts;
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var cat = el('select', { id: 'category', 'aria-label': 'Filter by category' }, optionList(categories, state.category, 'All categories'));
    cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var chain = el('select', { id: 'chain', 'aria-label': 'Filter by chain' }, optionList(chains, state.chain, 'All chains'));
    chain.addEventListener('change', function () { state.chain = chain.value; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; writeHash(); render(); } });
    var liveBtn = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; writeHash(); render(); } });
    var shown = state.tab === 'pre-token' ? filteredRows().length + ' of ' + DATA.board_size + ' rows shown' : DATA.live.length + ' live-token protocols';
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), cat),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chain),
      el('div', { class: 'field' }, el('span', { text: 'Token status' }), el('div', { class: 'tabs' }, pre, liveBtn)),
      el('span', { class: 'count', text: shown })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', 'aria-label': 'Sort by ' + label, onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' ↓' : ' ↑' }) : null
      )
    );
  }

  function protocolCell(r) {
    return el('td', null, el('div', { class: 'name' },
      el('b', { text: r.name }),
      el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
    ));
  }

  function boardTable() {
    var list = sortedRows(filteredRows());
    if (live) live.textContent = list.length + ' of ' + DATA.board_size + ' pre-token protocols shown.';
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category or chain to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; writeHash(); render(); } })
      ));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        protocolCell(r),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', null, el('span', { class: 'badge', text: 'no token' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.' }),
          el('thead', null, el('tr', null,
            sortHeader('rank', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('implied', 'Implied value'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    if (live) live.textContent = DATA.live.length + ' live-token protocols shown.';
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        protocolCell(r),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: fmtRatio(r.mcap_usd === null || r.tvl_usd === 0 ? null : r.mcap_usd / r.tvl_usd) }),
        el('td', null, el('span', { class: 'badge live', text: 'already trades' }))
      ));
    });
    return el('div', null,
      el('div', { class: 'panel' },
        el('div', { class: 'table-wrap' },
          el('table', null,
            el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.' }),
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'mcap / TVL' }), el('th', { scope: 'col', text: 'Token' }))),
            tbody
          )
        )
      ),
      multiplesPanel()
    );
  }

  // Where the model's multiples come from: the peer medians of the live
  // tokens above, shrunk toward the global median. A category with no peers
  // takes the global median.
  function multiplesPanel() {
    var entries = Object.keys(DATA.multiples || {}).map(function (k) { return { cat: k, mult: DATA.multiples[k] }; });
    entries.sort(function (a, b) { return b.mult - a.mult || (a.cat < b.cat ? -1 : 1); });
    return el('section', { class: 'panel multiples' },
      el('h2', { text: 'Category multiples, from the live tokens' }),
      el('p', { class: 'sub', text: 'Each multiple is the median market-cap-per-$1-TVL of the ' + DATA.peer_count + ' token-bearing protocols in that category, shrunk toward the global median ' + DATA.global_median + ' (k=5) and clamped to 0.05–1.00. A category with no live peers takes the global median.' }),
      el('div', { class: 'mult-grid' }, entries.map(function (e) {
        return el('div', null, el('span', { text: e.cat }), el('b', { text: fmtMult(e.mult) }));
      }))
    );
  }

  function modelPanel() {
    var m = DATA.model;
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed' }),
      el('p', { class: 'sub', text: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.' }),
      el('div', { class: 'formula' },
        'implied = round( tvl_usd x multiple(category) x (1 + ' + m.growth_weight + ' x clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100) x (' + m.maturity_floor + ' + ' + m.maturity_range + ' x min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ') x (1 + ' + m.chain_step + ' x min(chains - 1, ' + m.chain_cap + ')) )'
      ),
      el('p', { class: 'sub', text: 'The category multiple is the median market cap per $1 of TVL of the ' + DATA.peer_count + ' token-bearing protocols in that category, shrunk toward the global median ' + DATA.global_median + ' (k=' + m.shrinkage_k + ') and clamped to ' + m.multiple_floor + '–' + m.multiple_cap + '. TVL and seven-day growth come from the snapshot. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days. The early radar is every pre-token protocol below the watchlist floor that passes the watchlist rule, and the live-token protocols are set aside with their market caps shown.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = farmSteps(row);
    var recomputed = impliedOf(row, DATA.model);
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Category multiple' }), el('b', { class: 'num', text: fmtMult(row.multiple) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Growth multiplier' }), el('b', { class: 'num', text: String(row.growth_multiplier) })),
        el('div', null, el('span', { text: 'Maturity multiplier' }), el('b', { class: 'num', text: String(row.maturity_multiplier) })),
        el('div', null, el('span', { text: 'Chain multiplier (' + (row.chains || []).length + ' chains)' }), el('b', { class: 'num', text: String(row.chain_multiplier) })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) }))
      ),
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': the same function scores every protocol. The page recomputes this row as ' + fmtUsd(recomputed) + (recomputed === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan' }),
      el('ol', { class: 'steps' }, steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    if (state.tab === 'pre-token') shell.appendChild(modelPanel());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
    if (firstRender) {
      firstRender = false;
      var h1 = document.getElementById('page-title');
      if (h1) h1.focus();
    }
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
