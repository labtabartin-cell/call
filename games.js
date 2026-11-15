/* ================= مینی‌گیم‌ها =================
   همه‌ی محاسبه‌ها (انرژی، سقف روزانه، جایزه) سمت سرور است؛ اینجا فقط نمایش و ارسال ضربه‌هاست. */
const G = { st: null, loadedAt: 0, pend: 0, flushing: false, flushT: null, timer: null, spinning: false, rot: 0, stake: 50, box: null };
S.sub.games = 'miner';
const WHEEL = [20, 50, 100, 200, 500, 1000];

async function loadGame() {
  const { data, error } = await sb.rpc('game_state_get');
  if (error) return toast(errText(error));
  G.st = data; G.loadedAt = Date.now(); G.pend = 0; G.st.energy = +data.energy; setBalance(data.balance);
}
const gNow = () => G.st && { ...G.st, energy: Math.min(G.st.max_energy, G.st.energy + G.st.regen * (Date.now() - G.loadedAt) / 1000) };

/* ---------- نمایش ---------- */
function viewGames() {
  if (!G.st) return '<div class="empty">در حال بارگذاری…</div>';
  const sub = S.sub.games;
  return segHtml([['miner', 'ماینر'], ['wheel', 'چرخ شانس'], ['boxes', 'جعبه گنج']], sub, 'subGame') + (sub === 'miner' ? viewMiner() : sub === 'wheel' ? viewWheel() : viewBoxes());
}
function viewMiner() {
  const s = G.st, upT = s.tap_level >= s.max_tap_level, upE = s.energy_level >= s.max_energy_level;
  return `<div class="stats">
      <div class="stat"><div class="mut">سود ساعتی</div><b id="gPph">${money(s.pph)} / ساعت</b></div>
      <div class="stat"><div class="mut">جمع‌آوری نشده</div><div class="row"><b class="grow" id="gPend">0</b><button class="btn sm gold" data-act="collect">برداشت</button></div></div></div>
    <div class="card"><div class="row mut" style="margin-bottom:6px"><span class="grow">⚡ انرژی</span><span id="gEnT" class="ltr"></span></div><div class="bar en"><i id="gEn" style="width:0"></i></div>
      <div class="row mut" style="margin:10px 0 6px"><span class="grow">سقف درآمد امروز</span><span id="gCapT" class="ltr"></span></div><div class="bar cp"><i id="gCap" style="width:0"></i></div></div>
    <div class="coinwrap" id="coinwrap"><button id="tapCoin" aria-label="ضربه"><span>ا</span></button></div>
    <div class="mut" style="text-align:center;margin-bottom:14px">هر ضربه <b style="color:var(--gold)">${s.per_tap}</b> سکه · انرژی ثانیه‌ای ${s.regen} پر می‌شود</div>
    <b>ارتقاها</b><div style="height:8px"></div>
    <div class="gcards">
      <div class="gc"><div class="em">👆</div><b>قدرت ضربه</b><div class="mut">سطح ${s.tap_level} / ${s.max_tap_level}</div><div class="mut">هر ضربه ${s.per_tap} → ${s.per_tap + 1}</div>
        <button class="btn sm" ${upT ? 'disabled' : ''} data-act="upgrade" data-k="tap">${upT ? 'حداکثر' : money(s.tap_cost) + ' سکه'}</button></div>
      <div class="gc"><div class="em">🔋</div><b>ظرفیت انرژی</b><div class="mut">سطح ${s.energy_level} / ${s.max_energy_level}</div><div class="mut">${s.max_energy} → ${s.max_energy + 100}</div>
        <button class="btn sm" ${upE ? 'disabled' : ''} data-act="upgrade" data-k="energy">${upE ? 'حداکثر' : money(s.energy_cost) + ' سکه'}</button></div></div>
    <div style="height:16px"></div><b>کارت‌های سودآور</b><div class="mut" style="margin:2px 0 8px">هر کارت سود ساعتی می‌دهد (تا ۳ ساعت پشت‌سرهم جمع می‌شود؛ مرتب برداشت کنید).</div>
    <div class="gcards">${s.cards.map(c => `<div class="gc"><div class="em">${c.emoji}</div><b>${esc(c.name)}</b>
      <div class="mut">+${money(c.profit)} / ساعت</div><div>${Array.from({ length: c.max }, (_, i) => `<span class="pip ${i < c.level ? 'f' : ''}"></span>`).join('')}</div>
      <button class="btn sm ${c.level ? '' : 'gold'}" ${c.level >= c.max ? 'disabled' : ''} data-act="upgrade" data-k="card" data-id="${c.id}">${c.level >= c.max ? 'حداکثر' : (c.level ? 'ارتقا · ' : 'خرید · ') + money(c.cost)}</button></div>`).join('')}</div>`;
}
function viewWheel() {
  const n = G.st.wheel_next ? new Date(G.st.wheel_next).getTime() : 0, ready = n <= Date.now();
  const labels = WHEEL.map((p, i) => `<div class="lb" style="transform:rotate(${i * 60 + 30}deg)"><span>${money(p)}</span></div>`).join('');
  return `<div class="card hl" style="text-align:center"><b>🎡 چرخ شانس روزانه</b><div class="mut">هر ۲۴ ساعت یک بار رایگان بچرخانید</div></div>
    <div class="wheelbox"><div class="ptr"></div><div id="wheel" style="transform:rotate(${G.rot}deg)">${labels}</div><div class="hub">ا</div></div>
    <button class="btn gold" id="spinBtn" data-act="spin" ${ready && !G.spinning ? '' : 'disabled'}>${ready ? 'بچرخان!' : '<span id="spinWait"></span>'}</button>
    <div class="mut" style="text-align:center;margin-top:10px">جوایز: ${WHEEL.map(money).join(' · ')} سکه</div>`;
}
function viewBoxes() {
  const b = G.box;
  return `<div class="card hl" style="text-align:center"><b>🎁 جعبه گنج</b><div class="mut">یکی از سه جعبه را انتخاب کنید؛ فقط یکی برنده است و ۲٫۵ برابر شرط را می‌دهد.</div></div>
    <div class="mut" style="margin:6px 0">مبلغ شرط:</div><div class="qa">${[10, 50, 100, 500, 1000].map(v => `<button class="chip ${G.stake === v ? 'on' : ''}" data-act="stake" data-v="${v}">${money(v)}</button>`).join('')}</div>
    <div class="boxes">${[0, 1, 2].map(i => `<button class="box ${b ? (i === b.win ? 'win' : 'lose') : ''} ${b && b.pick === i ? 'pick' : ''}" data-act="pickBox" data-i="${i}" ${b && b.busy ? 'disabled' : ''}>${b && !b.busy ? (i === b.win ? '💰' : '💨') : '🎁'}</button>`).join('')}</div>
    <div class="mut" style="text-align:center;min-height:24px">${b && !b.busy ? (b.won ? `<b class="grn">برنده شدید! +${money(b.payout)} سکه</b>` : `<b class="red">این بار نشد…</b>`) : 'شانس برد ۱ از ۳'}</div>`;
}

/* ---------- تایمر زنده ---------- */
const fmtLeft = ms => { const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3); return `${h} ساعت ${m} دقیقه ${s} ثانیه`; };
function gameTick(on) {
  clearInterval(G.timer); G.timer = null; if (!on || !G.st) return;
  const upd = () => {
    const c = gNow(); if (!c) return;
    const en = Math.max(0, Math.floor(c.energy - G.pend));
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    const w = (id, p) => { const e = document.getElementById(id); if (e) e.style.width = Math.min(100, p) + '%'; };
    set('gEnT', `${en} / ${c.max_energy}`); w('gEn', en / c.max_energy * 100);
    const earned = c.earned_today + G.pend * c.per_tap; set('gCapT', `${money(earned)} / ${money(c.cap)}`); w('gCap', earned / c.cap * 100);
    const pend = Math.min(c.pph * 3, c.pending + c.pph * (Date.now() - G.loadedAt) / 36e5); set('gPend', money(Math.floor(pend)));
    const coin = document.getElementById('tapCoin'); if (coin) coin.classList.toggle('dead', en < 1 || earned >= c.cap);
    if (S.sub.games === 'wheel') { const n = G.st.wheel_next ? new Date(G.st.wheel_next).getTime() : 0, left = n - Date.now();
      if (left > 0) set('spinWait', 'چرخش بعدی: ' + fmtLeft(left)); else if (document.getElementById('spinBtn')?.disabled && !G.spinning) render(); }
  };
  upd(); G.timer = setInterval(upd, 1000);
}

/* ---------- ضربه ---------- */
function tapOnce(e) {
  const c = gNow(); if (!c) return;
  const en = c.energy - G.pend, earned = c.earned_today + G.pend * c.per_tap;
  const coin = document.getElementById('tapCoin');
  if (en < 1) { if (!G.warnE || Date.now() - G.warnE > 2500) { G.warnE = Date.now(); toast('انرژی تمام شد؛ کمی صبر کنید ⚡'); } return; }
  if (earned + c.per_tap > c.cap) { if (!G.warnC || Date.now() - G.warnC > 2500) { G.warnC = Date.now(); toast('به سقف درآمد امروز رسیدید؛ فردا دوباره بیایید'); } return; }
  G.pend++; setBalance((S.wallet?.balance || 0) + c.per_tap);
  coin.classList.add('press'); setTimeout(() => coin.classList.remove('press'), 70);
  const wrap = document.getElementById('coinwrap'), r = wrap.getBoundingClientRect(), f = document.createElement('div');
  f.className = 'fl'; f.textContent = '+' + c.per_tap; f.style.left = (e.clientX - r.left - 10) + 'px'; f.style.top = (e.clientY - r.top - 20) + 'px';
  wrap.appendChild(f); setTimeout(() => f.remove(), 900);
  if (navigator.vibrate) navigator.vibrate(8);
  clearTimeout(G.flushT); if (G.pend >= 40) flushTaps(); else G.flushT = setTimeout(flushTaps, 800);
}
document.addEventListener('pointerdown', e => { if (e.target.closest('#tapCoin')) { e.preventDefault(); tapOnce(e); } });

async function flushTaps() {
  clearTimeout(G.flushT);
  if (G.flushing || !G.pend || !G.st) return;
  G.flushing = true; const n = G.pend; G.pend = 0;
  const { data, error } = await sb.rpc('game_tap', { p_taps: n });
  G.flushing = false;
  if (error) { toast(errText(error)); await loadGame(); return; }
  /* سرور مرجع است: انرژی و موجودی را با جواب سرور هماهنگ می‌کنیم */
  G.st.energy = +data.energy; G.st.earned_today = +data.earned_today; G.loadedAt = Date.now();
  setBalance(data.balance + G.pend * G.st.per_tap);
  if (data.accepted < n) toast('بخشی از ضربه‌ها پذیرفته نشد (انرژی یا سقف روزانه)');
  if (G.pend) G.flushT = setTimeout(flushTaps, 400);
}
window.addEventListener('pagehide', () => { if (G.pend) flushTaps(); });

/* ---------- کنش‌ها ---------- */
Object.assign(H, {
  subGame: async d => { await flushTaps(); S.sub.games = d.s; await loadGame(); render(); },
  collect: async () => {
    await flushTaps(); const r = await rpc('game_collect'); if (!r) return;
    toast(r.amount > 0 ? `💰 ${money(r.amount)} سکه برداشت شد` : 'هنوز سودی جمع نشده'); await loadGame(); render();
  },
  upgrade: async d => {
    await flushTaps(); const r = await rpc('game_upgrade', { p_kind: d.k, p_card: d.id ? +d.id : null }); if (!r) return;
    toast('✅ ارتقا انجام شد'); await loadGame(); render();
  },
  spin: async () => {
    if (G.spinning) return; G.spinning = true;
    const btn = $('#spinBtn'); if (btn) btn.disabled = true;
    const r = await rpc('game_spin'); if (!r || !r.ok) { G.spinning = false; if (r && !r.ok) { await loadGame(); render(); } return; }
    G.rot += 360 * 5 + (360 - (G.rot % 360)) % 360 - (r.index * 60 + 30);   /* مرکز برش برنده زیر نشانگر بالا بایستد */
    const w = $('#wheel'); if (w) w.style.transform = `rotate(${G.rot}deg)`;
    setTimeout(async () => { G.spinning = false; toast(`🎉 ${money(r.prize)} سکه برنده شدید!`); setBalance(r.balance); await loadGame(); render(); }, 4300);
  },
  stake: d => { G.stake = +d.v; G.box = null; render(); },
  pickBox: async d => {
    if (G.box?.busy) return; const pick = +d.i; G.box = { pick, busy: true }; render();
    const r = await rpc('game_boxes', { p_stake: G.stake, p_pick: pick });
    if (!r) { G.box = null; return render(); }
    G.box = { pick, win: r.win_box, won: r.won, payout: r.payout }; setBalance(r.balance); render();
  }
});
