/* ================= امون — سوپراپ ================= */
const SB_URL = 'https://pqfeqweoxpqrrnlmngmd.supabase.co';
const SB_KEY = 'sb_publishable_ef-EOvmOOispUBMlv9Esfw_R6cFIBPB';
const VAPID_PUB = 'BHVTq8KKHMDka3SXJ63Z0dCz10pOMiLxi4DSiTNsApTUZrvZkjBu2xdv_lhZQrkT__aglwGTZ1fnJsCuvSaYCNk';
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }] };

const sb = supabase.createClient(SB_URL, SB_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = n => String(n).replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');
const money = n => Number(n).toLocaleString('fa-IR');
const isNum = n => /^08\d{9}$/.test(n);
const tm = d => new Date(d).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
const dt = d => new Date(d).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
const dtm = d => new Date(d).toLocaleString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const TIER = { normal: 'معمولی', trendy: 'رند', premium: 'ویژه', legendary: 'افسانه‌ای' };
const tierTag = t => `<span class="tier t-${t}">${TIER[t]}</span>`;
const ERR = {
  not_authenticated: 'ابتدا وارد شوید', invalid: 'شماره یا کد نادرست است', locked: 'به‌دلیل تلاش‌های ناموفق، موقتاً قفل شد؛ بعداً دوباره امتحان کنید',
  sender_number_not_active: 'شماره فرستنده فعال نیست', unknown_destination: 'این شماره در شبکه ثبت نشده است', cannot_call_self: 'نمی‌توانید به خودتان زنگ بزنید',
  invalid_transition: 'وضعیت تماس تغییر کرده است', empty_message: 'پیام خالی است', username_taken: 'این نام کاربری قبلاً گرفته شده',
  invalid_username: 'نام کاربری: ۳ تا ۲۰ حرف انگلیسی کوچک/عدد/_', invalid_password: 'رمز عبور حداقل ۶ نویسه باشد',
  'Invalid login credentials': 'نام کاربری یا رمز عبور اشتباه است', signup_failed: 'ثبت‌نام انجام نشد',
  insufficient_funds: 'موجودی کیف پول کافی نیست', number_not_available: 'این شماره دیگر موجود نیست', invalid_number: 'شماره نامعتبر است (۰۸ + ۹ رقم)',
  not_owner: 'این شماره مال شما نیست', already_listed: 'این شماره قبلاً در ویترین گذاشته شده', listing_unavailable: 'این آگهی دیگر فعال نیست',
  cannot_buy_own: 'نمی‌توانید شماره خودتان را بخرید', account_not_found: 'شماره حساب پیدا نشد', cannot_transfer_to_self: 'انتقال به حساب خودتان ممکن نیست',
  invalid_amount: 'مبلغ نامعتبر است'
};
const errText = e => ERR[String(e?.message || e || '').trim()] || (e?.message || 'خطا');
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 3500); }

const S = {
  user: null, tab: 'call', sub: { call: 'dial', market: 'shop' },
  lines: [], line: localStorage.getItem('amoon_line'), contacts: [], messages: [], calls: [], dial: '', thread: null, unread: 0,
  wallet: null, tx: [], shop: [], shopTier: 'all', shopSort: 'asc', shopLimit: 30, mine: [], mineListings: {}, listings: [], showCode: {}
};
let CALL = null, feeds = [], authMode = 'login', giftT = null;

/* ================= شروع ================= */
(async function init() {
  registerSW();
  const { data: { session } } = await sb.auth.getSession();
  if (session) await boot(session.user); else renderAuth();
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') { S.user = null; feeds.forEach(c => sb.removeChannel(c)); feeds = []; renderAuth(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.user) checkPending(); });
})();

async function boot(user) {
  S.user = user;
  await Promise.all([loadLines(), loadContacts(), loadMessages(), loadCalls(), loadWallet()]);
  subscribe(); render();
  syncPush(); checkPending();
}

/* ================= Web Push ================= */
const pushSupported = () => isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
async function registerSW() {
  if (!('serviceWorker' in navigator) || !isSecureContext) return;
  try {
    await navigator.serviceWorker.register('sw.js');
    navigator.serviceWorker.addEventListener('message', e => {
      const m = e.data || {};
      if (m.type === 'open' || m.type === 'push-visible') { if (S.user) checkPending(); }
      if (m.type === 'open' && m.data?.kind === 'message') { S.tab = 'msgs'; S.thread = null; render(); }
    });
  } catch (e) { console.warn('SW', e); }
}
const u8 = b64 => { const p = '='.repeat((4 - b64.length % 4) % 4), s = (b64 + p).replace(/-/g, '+').replace(/_/g, '/'), r = atob(s); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
async function enablePush() {
  if (!pushSupported()) return toast('اعلان فقط روی آدرس https (یا localhost) و مرورگر پشتیبان کار می‌کند');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('اجازه‌ی اعلان داده نشد؛ از تنظیمات مرورگر فعالش کنید');
  await syncPush(true); render(); toast('🔔 اعلان تماس و پیام فعال شد');
}
async function syncPush(force) {
  if (!pushSupported() || Notification.permission !== 'granted' || !S.user) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(VAPID_PUB) });
    const j = sub.toJSON();
    const { error } = await sb.from('push_subscriptions').upsert({ user_id: S.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    if (error && force) toast('ثبت اعلان ناموفق بود: ' + error.message);
  } catch (e) { if (force) toast('فعال‌سازی اعلان ناموفق بود'); console.warn(e); }
}
async function dropPush() {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  } catch { }
}
async function pushApi(type, id) {
  try {
    const { data: { session } } = await sb.auth.getSession(); if (!session) return;
    fetch(`${SB_URL}/functions/v1/push`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ type, id }) }).catch(() => { });
  } catch { }
}

/* ================= احراز هویت ================= */
function renderAuth() {
  $('#app').innerHTML = `<div class="auth"><h1>📞 امون</h1>
    <div class="mut" style="text-align:center">تماس، پیام، شماره‌های ۰۸ و کیف پول — همه در یک برنامه</div>
    <div class="seg"><button data-act="authMode" data-m="login" class="${authMode === 'login' ? 'on' : ''}">ورود</button><button data-act="authMode" data-m="register" class="${authMode === 'register' ? 'on' : ''}">ثبت‌نام</button></div>
    <form data-form="auth" style="display:flex;flex-direction:column;gap:10px">
      <input name="u" placeholder="نام کاربری (انگلیسی)" autocapitalize="off" autocomplete="username" dir="ltr" required>
      <input name="p" type="password" placeholder="رمز عبور" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" dir="ltr" required>
      <button class="btn">${authMode === 'login' ? 'ورود' : 'ساخت حساب (۲٬۰۰۰ سکه هدیه)'}</button></form></div>`;
}
async function doAuth(u, p) {
  u = u.trim().toLowerCase();
  try {
    if (authMode === 'register') {
      const r = await fetch(`${SB_URL}/functions/v1/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify({ username: u, password: p }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'signup_failed');
    }
    const { data, error } = await sb.auth.signInWithPassword({ email: `${u}@amoon.app`, password: p });
    if (error) throw error; await boot(data.user);
  } catch (e) { toast(errText(e)); }
}

/* ================= داده‌ها ================= */
async function loadLines() {
  const { data } = await sb.from('numbers').select('id,number,tier').eq('active_user_id', S.user.id).order('activated_at');
  S.lines = data || [];
  if (!S.lines.find(l => l.number === S.line)) S.line = S.lines[0]?.number || null;
  if (S.line) localStorage.setItem('amoon_line', S.line); else localStorage.removeItem('amoon_line');
}
async function loadContacts() { const { data } = await sb.from('contacts').select('*').order('name'); S.contacts = data || []; }
async function loadMessages() { const { data } = await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(500); S.messages = data || []; }
async function loadCalls() { const { data } = await sb.from('calls').select('*').order('created_at', { ascending: false }).limit(60); S.calls = data || []; }
async function loadWallet() {
  const { data: w } = await sb.from('wallets').select('*').maybeSingle(); S.wallet = w;
  const { data: tx } = await sb.from('wallet_tx').select('*').order('id', { ascending: false }).limit(30); S.tx = tx || [];
}
async function loadShop() {
  let q = sb.from('numbers').select('id,number,tier,base_price').eq('status', 'available');
  if (S.shopTier !== 'all') q = q.eq('tier', S.shopTier);
  const { data } = await q.order('base_price', { ascending: S.shopSort === 'asc' }).limit(S.shopLimit + 1); S.shop = data || [];
}
async function loadMine() {
  const { data } = await sb.from('numbers').select('id,number,tier,points,status,active_user_id,base_price,number_secrets(activation_code)').eq('owner_id', S.user.id).order('created_at', { ascending: false });
  S.mine = data || [];
  const { data: ls } = await sb.from('listings').select('id,number_id,price').eq('seller_id', S.user.id).eq('status', 'active');
  S.mineListings = Object.fromEntries((ls || []).map(l => [l.number_id, l]));
}
async function loadListings() {
  const { data } = await sb.from('listings').select('id,price,seller_id,numbers(number,tier,points)').eq('status', 'active').order('price'); S.listings = data || [];
}
const nameOf = n => S.contacts.find(c => c.number === n)?.name || fmtNum(n);

/* ================= رندر ================= */
const NAV = [['call', '📞', 'تماس'], ['msgs', '💬', 'پیام'], ['market', '🛒', 'بازار'], ['wallet', '👛', 'کیف پول']];
function render() {
  if (!S.user) return renderAuth();
  const showLine = S.tab === 'call' || S.tab === 'msgs';
  const lineSel = showLine && S.lines.length ? `<select class="lineSel" data-act="pickLine">${S.lines.map(l => `<option value="${l.number}" ${l.number === S.line ? 'selected' : ''}>${fmtNum(l.number)}</option>`).join('')}</select>` : '';
  const bell = pushSupported() ? (Notification.permission === 'granted' ? '' : '<button class="ib" data-act="enablePush" title="فعال‌سازی اعلان">🔔</button>') : '';
  let view = '';
  if (S.tab === 'call') view = viewCall(); else if (S.tab === 'msgs') view = S.thread ? viewChat() : viewThreads();
  else if (S.tab === 'market') view = viewMarket(); else view = viewWallet();
  $('#app').innerHTML = `<header><span class="logo">امون</span><span class="grow"></span>${lineSel}
    <span class="bal" data-act="nav" data-t="wallet">🪙 ${money(S.wallet?.balance ?? 0)}</span>${bell}<button class="ib" data-act="settings">⚙️</button></header>
    <main id="main">${pushBanner()}${view}</main>
    <nav>${NAV.map(t => `<button class="${S.tab === t[0] ? 'on' : ''}" data-act="nav" data-t="${t[0]}"><span class="i">${t[1]}</span>${t[2]}${t[0] === 'msgs' && S.unread ? `<span class="dot">${S.unread}</span>` : ''}</button>`).join('')}</nav>`;
  if (S.tab === 'msgs' && S.thread) { const m = $('#main'); m.scrollTop = m.scrollHeight; }
  if (S.tab === 'wallet') startGiftTimer();
}
function pushBanner() {
  if (S.tab !== 'call' || S.sub.call !== 'dial' || !S.lines.length) return '';
  if (!isSecureContext) return '<div class="banner">ℹ️ برای اعلان تماس هنگام بسته بودن برنامه، آن را روی آدرس https باز کنید.</div>';
  if (pushSupported() && Notification.permission === 'default') return `<div class="banner"><span class="grow">🔔 با فعال‌کردن اعلان، حتی وقتی مرورگر بسته است تماس می‌آید.</span><button class="btn sm" data-act="enablePush">فعال‌سازی</button></div>`;
  return '';
}
const segHtml = (items, cur, act) => `<div class="seg">${items.map(i => `<button class="${cur === i[0] ? 'on' : ''}" data-act="${act}" data-s="${i[0]}">${i[1]}</button>`).join('')}</div>`;

/* ----- تماس ----- */
function viewCall() {
  const sub = S.sub.call;
  const sg = segHtml([['dial', 'شماره‌گیر'], ['contacts', 'مخاطبین'], ['recent', 'اخیر']], sub, 'subCall');
  return sg + (sub === 'dial' ? viewDial() : sub === 'contacts' ? viewContacts() : viewRecent());
}
function viewDial() {
  const d = S.dial, valid = isNum(d), keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  return `<div class="disp">${d ? esc(d) : '<span class="mut" style="font-size:16px">شماره را وارد کنید</span>'}
    <small>${valid ? esc(nameOf(d)) : (d === '#26*' ? 'فعال‌سازی شماره — دکمه تماس را بزنید' : '')}</small></div>
    <div class="pad">${keys.map(k => `<button data-act="key" data-k="${k}">${k}</button>`).join('')}
    <button class="del" data-act="back">⌫</button><button class="call" data-act="dialCall">📞</button>
    <button data-act="saveDial" ${valid && !S.contacts.find(c => c.number === d) ? '' : 'disabled style="opacity:.3"'}>➕</button></div>
    <div class="card mut">برای فعال‌سازی شماره‌ی خریداری‌شده <b class="ltr">#26*</b> را شماره‌گیری کنید.${S.lines.length ? '' : '<br><b style="color:var(--gold)">هنوز شماره‌ای فعال نیست.</b> از تب «بازار» یکی بخرید.'}</div>`;
}
function viewContacts() {
  return `<div class="row" style="margin-bottom:10px"><b class="grow">مخاطبین (${S.contacts.length})</b><button class="btn sm" data-act="addContact">+ افزودن</button></div>` +
    (S.contacts.length ? S.contacts.map(c => `<div class="card row"><div class="avatar">${esc(c.name.trim()[0] || '?')}</div>
      <div class="grow"><div>${esc(c.name)}</div><div class="mut ltr">${fmtNum(c.number)}</div></div>
      <button class="ib" data-act="callNum" data-n="${c.number}">📞</button><button class="ib" data-act="msgNum" data-n="${c.number}">💬</button><button class="ib" data-act="delContact" data-id="${c.id}">🗑</button></div>`).join('') : '<div class="empty">مخاطبی ذخیره نشده است</div>');
}
const ST = { ringing: 'بی‌پاسخ', answered: 'پاسخ داده شد', rejected: 'رد شد', cancelled: 'لغو شد', missed: 'بی‌پاسخ', ended: 'پایان یافت', unavailable: 'در دسترس نیست' };
function viewRecent() {
  return S.calls.length ? S.calls.map(c => {
    const out = c.from_user === S.user.id, peer = out ? c.to_number : c.from_number, bad = !out && ['missed', 'cancelled', 'ringing'].includes(c.status);
    return `<div class="card row" data-act="callNum" data-n="${peer}" style="cursor:pointer"><div class="avatar">${out ? '↗' : '↙'}</div>
      <div class="grow"><div class="${bad ? 'red' : ''}">${esc(nameOf(peer))}</div><div class="mut">${out ? 'خروجی' : 'ورودی'} · ${ST[c.status] || c.status}</div></div><div class="mut">${dt(c.created_at)}<br>${tm(c.created_at)}</div></div>`;
  }).join('') : '<div class="empty">هنوز تماسی نداشته‌اید</div>';
}

/* ----- پیام ----- */
function threads() {
  const m = new Map();
  for (const x of S.messages) {
    const mine = x.from_user === S.user.id, my = mine ? x.from_number : x.to_number, peer = mine ? x.to_number : x.from_number, k = my + '>' + peer;
    if (!m.has(k)) m.set(k, { my, peer, last: x });
  }
  return [...m.values()];
}
function viewThreads() {
  const th = threads();
  return `<div class="row" style="margin-bottom:10px"><b class="grow">پیام‌ها</b><button class="btn sm" data-act="newChat">+ پیام جدید</button></div>` +
    (th.length ? th.map(t => `<div class="card row" data-act="openThread" data-my="${t.my}" data-peer="${t.peer}" style="cursor:pointer">
      <div class="avatar">${esc((S.contacts.find(c => c.number === t.peer)?.name || '#')[0])}</div>
      <div class="grow"><div class="row"><b class="grow">${esc(nameOf(t.peer))}</b><span class="mut">${tm(t.last.created_at)}</span></div>
      <div class="mut" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.last.from_user === S.user.id ? 'شما: ' : ''}${esc(t.last.body)}</div><span class="tag">خط ${fmtNum(t.my)}</span></div></div>`).join('') : '<div class="empty">پیامی وجود ندارد</div>');
}
const threadMsgs = () => S.messages.filter(x => (x.from_number === S.thread.my && x.to_number === S.thread.peer) || (x.from_number === S.thread.peer && x.to_number === S.thread.my)).slice().reverse();
const bubbles = () => threadMsgs().map(x => `<div class="bub ${x.from_user === S.user.id && x.from_number === S.thread.my ? 'me' : 'th'}">${esc(x.body)}<time>${dt(x.created_at)} ${tm(x.created_at)}</time></div>`).join('') || '<div class="empty">اولین پیام را بفرستید</div>';
function viewChat() {
  return `<div class="row" style="margin-bottom:10px"><button class="ib" data-act="closeThread">→</button><div class="grow"><b>${esc(nameOf(S.thread.peer))}</b><div class="mut">از خط <span class="ltr">${fmtNum(S.thread.my)}</span></div></div><button class="ib" data-act="callNum" data-n="${S.thread.peer}">📞</button></div>
    <div class="bubbles" id="bubbles">${bubbles()}</div>
    <form data-form="send" class="row" style="position:sticky;bottom:0;background:var(--bg);padding:8px 0"><input name="b" placeholder="پیام…" autocomplete="off"><button class="btn sm" style="height:44px">ارسال</button></form>`;
}
function refreshChat() { const b = $('#bubbles'); if (!b) return render(); b.innerHTML = bubbles(); const m = $('#main'); m.scrollTop = m.scrollHeight; }

/* ----- بازار ----- */
function viewMarket() {
  const sub = S.sub.market;
  return segHtml([['shop', 'خرید شماره'], ['mine', 'شماره‌های من'], ['used', 'ویترین']], sub, 'subMarket') + (sub === 'shop' ? viewShop() : sub === 'mine' ? viewMine() : viewUsed());
}
function viewShop() {
  const more = S.shop.length > S.shopLimit, items = S.shop.slice(0, S.shopLimit);
  return `<div class="card"><b>🎯 شماره دلخواه</b><div class="mut">شماره‌ای که می‌خواهید را بنویسید؛ قیمت بر اساس رند بودن محاسبه می‌شود.</div>
    <input id="custom" inputmode="numeric" maxlength="11" placeholder="08xxxxxxxxx" dir="ltr" style="margin-top:8px"><div id="quote" style="margin-top:8px"></div></div>
    <div class="chips">${[['all', 'همه']].concat(Object.entries(TIER)).map(([k, v]) => `<button class="chip ${S.shopTier === k ? 'on' : ''}" data-act="shopTier" data-t="${k}">${v}</button>`).join('')}
    <button class="chip" data-act="shopSort">${S.shopSort === 'asc' ? '⬆ ارزان‌ترین' : '⬇ گران‌ترین'}</button></div>` +
    (items.length ? items.map(n => `<div class="card row"><div class="grow"><div class="num ltr">${fmtNum(n.number)}</div>${tierTag(n.tier)}</div><div class="price">🪙 ${money(n.base_price)}</div><button class="btn sm" data-act="buy" data-n="${n.number}" data-p="${n.base_price}">خرید</button></div>`).join('') : '<div class="empty">شماره‌ای با این فیلتر موجود نیست</div>') +
    (more ? '<button class="btn sec" data-act="moreShop">نمایش بیشتر</button>' : '');
}
function viewMine() {
  return S.mine.length ? S.mine.map(n => {
    const code = n.number_secrets?.activation_code, ls = S.mineListings[n.id], shown = S.showCode[n.id];
    const badge = n.status === 'listed' ? '<span class="sw lst-b">در ویترین</span>' : (n.active_user_id ? '<span class="sw on-b">فعال</span>' : '<span class="sw off-b">غیرفعال</span>');
    return `<div class="card"><div class="num ltr">${fmtNum(n.number)}</div>${tierTag(n.tier)} ${badge}
      <div class="row" style="margin-top:8px"><div class="grow mut">کد فعال‌سازی: <b class="ltr" style="color:var(--tx);letter-spacing:3px">${shown ? esc(code) : '••••••'}</b></div><button class="btn sm sec" data-act="toggleCode" data-id="${n.id}">${shown ? 'پنهان' : 'نمایش'}</button></div>
      <div class="row" style="margin-top:8px;flex-wrap:wrap">${n.status === 'listed'
        ? `<span class="mut grow">قیمت ویترین: 🪙 ${money(ls?.price ?? 0)}</span><button class="btn sm red" data-act="cancelList" data-id="${ls?.id}">لغو فروش</button>`
        : `${n.active_user_id ? '' : `<button class="btn sm" data-act="activateNow" data-n="${n.number}" data-id="${n.id}">فعال‌سازی روی این حساب</button>`}<button class="btn sm gold" data-act="sell" data-id="${n.id}" data-n="${n.number}">فروش</button><button class="btn sm sec" data-act="rotate" data-id="${n.id}">کد جدید</button>`}</div></div>`;
  }).join('') : '<div class="empty">هنوز شماره‌ای ندارید. از «خرید شماره» یکی بگیرید.</div>';
}
function viewUsed() {
  return `<div class="mut" style="margin-bottom:10px">شماره‌های دست‌دوم؛ قیمت خودکار است. با خرید، کد قبلی باطل و کد جدید برای شما صادر می‌شود.</div>` +
    (S.listings.length ? S.listings.map(l => { const own = l.seller_id === S.user.id;
      return `<div class="card row"><div class="grow"><div class="num ltr">${fmtNum(l.numbers.number)}</div>${tierTag(l.numbers.tier)}${own ? ' <span class="sw lst-b">آگهی شما</span>' : ''}</div><div class="price">🪙 ${money(l.price)}</div>${own ? '' : `<button class="btn sm" data-act="buyList" data-id="${l.id}" data-n="${l.numbers.number}" data-p="${l.price}">خرید</button>`}</div>`; }).join('') : '<div class="empty">فعلاً شماره دست‌دومی در ویترین نیست</div>');
}

/* ----- کیف پول ----- */
function viewWallet() {
  const w = S.wallet; if (!w) return '<div class="empty">کیف پول پیدا نشد</div>';
  const acc = w.account_no.replace(/(\d{4})(?=\d)/g, '$1 ');
  const KIND = { welcome: 'هدیه خوش‌آمدگویی', gift: 'هدیه روزانه', topup: 'شارژ کیف پول', transfer: 'انتقال', number_purchase: 'خرید شماره', number_sale: 'فروش شماره', market_fee: 'کارمزد بازار' };
  return `<div class="card"><div class="mut">موجودی</div><div class="big">🪙 ${money(w.balance)}</div><div class="mut" style="margin-top:8px">شماره حساب شما</div>
    <div class="row"><div class="acc ltr grow">${acc}</div><button class="btn sm sec" data-act="copyAcc">کپی</button></div></div>
    <div class="card"><div class="row"><div class="grow"><b>🎁 هدیه روزانه</b><div class="mut" id="giftInfo"></div></div><button class="btn sm" id="giftBtn" data-act="gift">دریافت ۱۵۰ سکه</button></div></div>
    <div class="card"><b>شارژ کیف پول</b> <span class="mut">(سکه آزمایشی)</span>
      <div class="qa">${[1000, 5000, 20000, 100000].map(a => `<button class="chip" data-act="topup" data-a="${a}">+${money(a)}</button>`).join('')}</div>
      <form data-form="topup" class="row"><input name="a" type="number" min="1" max="1000000" placeholder="مبلغ دلخواه" dir="ltr"><button class="btn sm" style="height:44px">شارژ</button></form></div>
    <div class="card"><b>انتقال به کیف پول دیگر</b><form data-form="transfer" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <input name="acc" inputmode="numeric" maxlength="14" placeholder="شماره حساب مقصد (۱۲ رقم)" dir="ltr" required><input name="a" type="number" min="1" placeholder="مبلغ" dir="ltr" required>
      <input name="m" maxlength="100" placeholder="توضیح (اختیاری)"><button class="btn">انتقال</button></form></div>
    <b>تراکنش‌ها</b><div style="height:8px"></div>` +
    (S.tx.length ? S.tx.map(t => { const inn = t.to_wallet === w.id && t.from_wallet !== w.id;
      return `<div class="card row"><div class="grow"><div>${KIND[t.kind] || t.kind}${t.memo && !['welcome', 'gift', 'topup'].includes(t.kind) ? ' <span class="mut ltr">' + esc(t.memo) + '</span>' : ''}</div><div class="mut">${dtm(t.created_at)}</div></div><b class="${inn ? 'pos' : 'neg'}">${inn ? '+' : '−'}${money(t.amount)}</b></div>`; }).join('') : '<div class="empty">تراکنشی نیست</div>');
}
function startGiftTimer() {
  clearInterval(giftT);
  const tick = () => {
    const info = $('#giftInfo'), btn = $('#giftBtn'); if (!info) return clearInterval(giftT);
    const last = S.wallet?.last_gift_at ? new Date(S.wallet.last_gift_at).getTime() : 0, left = last + 864e5 - Date.now();
    if (left > 0) { const h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4), s = Math.floor(left % 6e4 / 1e3); info.textContent = `هدیه بعدی تا ${h} ساعت و ${m} دقیقه و ${s} ثانیه دیگر`; btn.disabled = true; }
    else { info.textContent = 'هدیه امروز آماده است!'; btn.disabled = false; }
  }; tick(); giftT = setInterval(tick, 1000);
}

/* ================= شیت ================= */
function sheet(h) { $('#sheet').innerHTML = h; $('#sheetBg').classList.add('show'); setTimeout(() => $('#sheet input')?.focus(), 50); }
function closeSheet() { $('#sheetBg').classList.remove('show'); }
$('#sheetBg').addEventListener('click', e => { if (e.target.id === 'sheetBg') closeSheet(); });
const sheetAct1 = () => sheet(`<h3>فعال‌سازی شماره</h3><p class="mut">شماره‌ی خریداری‌شده را وارد کنید</p><form data-form="act1" style="display:flex;flex-direction:column;gap:10px"><input name="n" inputmode="numeric" maxlength="11" placeholder="08xxxxxxxxx" dir="ltr" required><button class="btn">ادامه</button></form>`);
const sheetAct2 = n => sheet(`<h3>کد فعال‌سازی</h3><p class="mut">کد فعال‌سازی شماره <span class="ltr">${fmtNum(n)}</span> را وارد کنید</p><form data-form="act2" data-n="${n}" style="display:flex;flex-direction:column;gap:10px"><input name="c" inputmode="numeric" maxlength="6" placeholder="------" dir="ltr" required><button class="btn">فعال‌سازی</button></form>`);
function sheetSettings() {
  const ps = !pushSupported() ? (isSecureContext ? 'مرورگر شما اعلان را پشتیبانی نمی‌کند' : 'برای اعلان باید برنامه روی https باز شود') : (Notification.permission === 'granted' ? '✅ فعال' : Notification.permission === 'denied' ? '⛔ در مرورگر مسدود شده' : 'غیرفعال');
  sheet(`<h3>خطوط من</h3>` + (S.lines.length ? S.lines.map(l => `<div class="card row"><div class="grow"><span class="ltr">${fmtNum(l.number)}</span> ${tierTag(l.tier)}</div><button class="btn sm sec" data-act="deact" data-id="${l.id}">غیرفعال</button></div>`).join('') : '<div class="mut">شماره‌ی فعالی ندارید.</div>') +
    `<button class="btn sec" style="margin:8px 0" data-act="openAct">+ فعال‌سازی شماره جدید</button>
    <div class="card row"><div class="grow">🔔 اعلان تماس و پیام<div class="mut">${ps}</div></div>${pushSupported() && Notification.permission === 'default' ? '<button class="btn sm" data-act="enablePush">فعال‌سازی</button>' : ''}</div>
    <div class="mut" style="margin-bottom:8px">کاربر: ${esc(S.user.email.split('@')[0])}</div><button class="btn red" data-act="logout">خروج از حساب</button>`);
}
function codeSheet(r) {
  sheet(`<h3>🎉 شماره مال شماست</h3><div class="num ltr" style="text-align:center">${fmtNum(r.number)}</div><div class="mut" style="text-align:center">کد فعال‌سازی</div><div class="code">${esc(r.activation_code)}</div>
    <div class="mut">می‌توانید همین حالا روی این حساب فعالش کنید، یا بعداً با <b class="ltr">#26*</b> در شماره‌گیر.</div><div style="height:12px"></div>
    <button class="btn" data-act="activateCode" data-n="${r.number}" data-c="${r.activation_code}">فعال‌سازی روی این حساب</button><button class="btn sec" style="margin-top:8px" data-act="closeSheet">بعداً</button>`);
}
function addContactSheet(n) { sheet(`<h3>مخاطب جدید</h3><form data-form="contact" style="display:flex;flex-direction:column;gap:10px"><input name="name" placeholder="نام" maxlength="60" required><input name="n" value="${esc(n)}" inputmode="numeric" maxlength="11" placeholder="08xxxxxxxxx" dir="ltr" required><button class="btn">ذخیره</button></form>`); }

/* ================= رویدادها ================= */
async function rpc(fn, args) { const { data, error } = await sb.rpc(fn, args); if (error) { toast(errText(error)); return null; } return data; }
async function activate(num, code) {
  const d = await rpc('activate_number', { p_number: num, p_code: code }); if (!d) return false;
  if (!d.ok) { toast(ERR[d.error] || 'خطا'); return false; }
  await loadLines(); S.line = d.number; localStorage.setItem('amoon_line', S.line); await Promise.all([loadMessages(), loadMine()]);
  closeSheet(); render(); toast('✅ شماره فعال شد؛ حالا تماس و پیام می‌آید'); return true;
}
async function doBuy(num) { const r = await rpc('buy_number', { p_number: num }); if (!r) { await loadShop(); return render(); } await Promise.all([loadWallet(), loadShop(), loadMine()]); render(); codeSheet(r); }
const confirmBuy = (n, p) => confirm(`خرید شماره ${fmtNum(n)} به قیمت ${money(p)} سکه؟`);

const H = {
  authMode: d => { authMode = d.m; renderAuth(); },
  nav: async d => {
    S.tab = d.t; if (d.t !== 'msgs') S.thread = null; render();
    if (d.t === 'msgs') { S.unread = 0; render(); }
    if (d.t === 'market') { await loadMarketSub(); render(); } else if (d.t === 'wallet') { await loadWallet(); render(); }
  },
  subCall: d => { S.sub.call = d.s; render(); },
  subMarket: async d => { S.sub.market = d.s; render(); await loadMarketSub(); render(); },
  pickLine: (d, el) => { S.line = el.value; localStorage.setItem('amoon_line', S.line); },
  key: d => { if (S.dial.length < 11 || /^[#*]/.test(S.dial)) { S.dial += d.k; render(); } },
  back: () => { S.dial = S.dial.slice(0, -1); render(); },
  dialCall: () => { if (S.dial === '#26*') { S.dial = ''; render(); return sheetAct1(); } if (!isNum(S.dial)) return toast('شماره باید با ۰۸ شروع شود و ۱۱ رقم باشد'); placeCall(S.dial); },
  saveDial: () => addContactSheet(S.dial),
  openAct: () => { closeSheet(); sheetAct1(); },
  settings: sheetSettings, closeSheet, enablePush,
  addContact: () => addContactSheet(''),
  delContact: async d => { if (!confirm('این مخاطب حذف شود؟')) return; await sb.from('contacts').delete().eq('id', d.id); await loadContacts(); render(); },
  callNum: d => placeCall(d.n),
  msgNum: d => { if (!S.line) return toast('ابتدا یک شماره فعال کنید'); S.tab = 'msgs'; S.thread = { my: S.line, peer: d.n }; render(); },
  newChat: () => {
    if (!S.lines.length) return toast('ابتدا یک شماره فعال کنید');
    sheet(`<h3>پیام جدید</h3><form data-form="newchat" style="display:flex;flex-direction:column;gap:10px"><select name="my">${S.lines.map(l => `<option value="${l.number}" ${l.number === S.line ? 'selected' : ''}>از خط ${fmtNum(l.number)}</option>`).join('')}</select>
      <input name="peer" list="cl" inputmode="numeric" maxlength="11" placeholder="شماره مقصد 08xxxxxxxxx" dir="ltr" required><datalist id="cl">${S.contacts.map(c => `<option value="${c.number}">${esc(c.name)}</option>`).join('')}</datalist><button class="btn">شروع گفتگو</button></form>`);
  },
  openThread: d => { S.thread = { my: d.my, peer: d.peer }; render(); },
  closeThread: () => { S.thread = null; render(); },
  deact: async d => { const r = await rpc('deactivate_number', { p_number_id: d.id }); if (!r) return; await loadLines(); sheetSettings(); render(); },
  logout: async () => { closeSheet(); await dropPush(); await sb.auth.signOut(); },
  accept: acceptCall, reject: () => hangup(), hang: () => hangup(), mute: toggleMute,
  /* بازار و کیف پول */
  copyAcc: () => { navigator.clipboard?.writeText(S.wallet.account_no).then(() => toast('شماره حساب کپی شد')); },
  gift: async () => { const r = await rpc('claim_daily_gift'); if (!r) return; if (r.ok) toast('🎁 ۱۵۰ سکه به کیف پول اضافه شد'); await loadWallet(); render(); },
  topup: async d => { const r = await rpc('topup_wallet', { p_amount: +d.a }); if (r) { toast('کیف پول شارژ شد'); await loadWallet(); render(); } },
  shopTier: async d => { S.shopTier = d.t; S.shopLimit = 30; await loadShop(); render(); },
  shopSort: async () => { S.shopSort = S.shopSort === 'asc' ? 'desc' : 'asc'; await loadShop(); render(); },
  moreShop: async () => { S.shopLimit += 30; await loadShop(); render(); },
  buy: async d => { if (confirmBuy(d.n, d.p)) await doBuy(d.n); },
  buyList: async d => { if (!confirmBuy(d.n, d.p)) return; const r = await rpc('buy_listing', { p_listing_id: d.id }); if (!r) return; await Promise.all([loadWallet(), loadListings(), loadMine()]); render(); codeSheet(r); },
  toggleCode: d => { S.showCode[d.id] = !S.showCode[d.id]; render(); },
  activateNow: async d => { const n = S.mine.find(x => x.id === d.id); const c = n?.number_secrets?.activation_code; if (c) await activate(d.n, c); },
  activateCode: async d => { await activate(d.n, d.c); },
  sell: async d => {
    const est = await rpc('quote_number', { p_number: d.n }); if (!est) return;
    if (!confirm(`شماره ${fmtNum(d.n)} با قیمت خودکار ${money(est.price)} سکه در ویترین گذاشته شود؟\nکارمزد ۵٪ است و کد فعال‌سازی فعلی با فروش باطل می‌شود.`)) return;
    const r = await rpc('list_number_for_sale', { p_number_id: d.id }); if (r) { toast('شماره در ویترین قرار گرفت'); await loadMine(); render(); }
  },
  cancelList: async d => { const r = await rpc('cancel_listing', { p_listing_id: d.id }); if (r) { toast('فروش لغو شد'); await loadMine(); render(); } },
  rotate: async d => {
    if (!confirm('کد جدید ساخته شود؟ شماره از همه دستگاه‌ها غیرفعال می‌شود و باید دوباره با کد جدید فعال شود.')) return;
    const r = await rpc('rotate_code', { p_number_id: d.id }); if (!r) return; S.showCode[d.id] = true; await Promise.all([loadMine(), loadLines()]); render(); toast('کد جدید ساخته شد');
  }
};
async function loadMarketSub() { const s = S.sub.market; if (s === 'shop') await loadShop(); else if (s === 'mine') await loadMine(); else await loadListings(); }
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (t && H[t.dataset.act] && t.tagName !== 'SELECT') H[t.dataset.act](t.dataset, t); });
document.addEventListener('change', e => { const t = e.target.closest('select[data-act]'); if (t) H[t.dataset.act](t.dataset, t); });

let qT;
document.addEventListener('input', e => {
  if (e.target.id !== 'custom') return;
  const v = e.target.value.replace(/\D/g, ''); e.target.value = v; const box = $('#quote'); clearTimeout(qT);
  if (v.length < 11) { box.innerHTML = v.length ? '<span class="mut">شماره باید ۱۱ رقم و با ۰۸ شروع شود</span>' : ''; return; }
  qT = setTimeout(async () => {
    const q = await rpc('quote_number', { p_number: v }); if (!q) return;
    if (!q.valid) { box.innerHTML = '<span class="neg">شماره نامعتبر است؛ باید با ۰۸ شروع شود</span>'; return; }
    const head = `<div class="row"><div class="grow"><div class="num ltr">${fmtNum(v)}</div>${tierTag(q.tier)}</div>`;
    if (q.state === 'taken') box.innerHTML = head + '<span class="neg">قبلاً فروخته شده</span></div>';
    else if (q.state === 'listed') box.innerHTML = head + `<div class="price">🪙 ${money(q.price)}</div><button class="btn sm" data-act="buyList" data-id="${q.listing_id}" data-n="${v}" data-p="${q.price}">خرید دست‌دوم</button></div>`;
    else box.innerHTML = head + `<div class="price">🪙 ${money(q.price)}</div><button class="btn sm" data-act="buy" data-n="${v}" data-p="${q.price}">خرید</button></div>`;
  }, 250);
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f)), k = f.dataset.form;
  if (k === 'auth') return doAuth(v.u, v.p);
  if (k === 'act1') { if (!isNum(v.n)) return toast('شماره نامعتبر است'); return sheetAct2(v.n); }
  if (k === 'act2') return void await activate(f.dataset.n, v.c.trim());
  if (k === 'contact') {
    if (!isNum(v.n)) return toast('شماره باید با ۰۸ شروع شود و ۱۱ رقم باشد');
    const { error } = await sb.from('contacts').insert({ name: v.name.trim(), number: v.n });
    if (error) return toast(error.code === '23505' ? 'این شماره قبلاً ذخیره شده' : errText(error));
    closeSheet(); await loadContacts(); render(); return;
  }
  if (k === 'newchat') { if (!isNum(v.peer)) return toast('شماره مقصد نامعتبر است'); closeSheet(); S.thread = { my: v.my, peer: v.peer }; render(); return; }
  if (k === 'send') {
    const body = v.b.trim(); if (!body) return; f.reset();
    const { data, error } = await sb.rpc('send_message', { p_from: S.thread.my, p_to: S.thread.peer, p_body: body });
    if (error) return toast(errText(error));
    if (!S.messages.find(x => x.id === data.id)) { await loadMessages(); refreshChat(); }
    if (data.delivered) pushApi('message', data.id); else toast('پیام ذخیره شد؛ گیرنده هنوز شماره را فعال نکرده');
    return;
  }
  if (k === 'topup') { const a = Math.floor(+v.a); if (!(a >= 1)) return toast('مبلغ را وارد کنید'); const r = await rpc('topup_wallet', { p_amount: a }); if (r) { toast('کیف پول شارژ شد'); await loadWallet(); render(); } return; }
  if (k === 'transfer') {
    const acc = v.acc.replace(/\D/g, ''), a = Math.floor(+v.a);
    if (acc.length !== 12) return toast('شماره حساب ۱۲ رقم است'); if (!(a >= 1)) return toast('مبلغ را وارد کنید');
    const who = await rpc('resolve_account', { p_account: acc }); if (!who) return; if (!who.found) return toast('شماره حساب پیدا نشد');
    if (!confirm(`انتقال ${money(a)} سکه به «${who.username}»؟`)) return;
    const r = await rpc('transfer_wallet', { p_to_account: acc, p_amount: a, p_memo: v.m || null }); if (r) { toast('✅ انتقال انجام شد'); await loadWallet(); render(); }
  }
});

/* ================= ریل‌تایم ================= */
function subscribe() {
  feeds.forEach(c => sb.removeChannel(c)); feeds = [];
  feeds.push(sb.channel('calls-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, p => onCallRow(p.new, p.eventType)).subscribe());
  feeds.push(sb.channel('msgs-feed').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
    const x = p.new; if (S.messages.find(m => m.id === x.id)) return; S.messages.unshift(x);
    const inThread = S.tab === 'msgs' && S.thread && ((x.from_number === S.thread.my && x.to_number === S.thread.peer) || (x.from_number === S.thread.peer && x.to_number === S.thread.my));
    if (inThread) return refreshChat();
    if (x.to_user === S.user.id && x.from_user !== S.user.id) { toast('💬 پیام جدید از ' + nameOf(x.from_number)); if (S.tab !== 'msgs') S.unread++; }
    if (!$('#sheetBg').classList.contains('show')) render();
  }).subscribe());
}

/* ================= تماس (WebRTC) — سراسری در همه بخش‌ها ================= */
let ringAC, ringT;
function startRing(kind) {
  stopRing();
  try {
    ringAC = ringAC || new (window.AudioContext || window.webkitAudioContext)(); ringAC.resume();
    const beep = () => { const o = ringAC.createOscillator(), g = ringAC.createGain(); o.frequency.value = kind === 'in' ? 880 : 425; g.gain.value = .07; o.connect(g); g.connect(ringAC.destination); o.start(); o.stop(ringAC.currentTime + (kind === 'in' ? .45 : 1)); if (kind === 'in' && navigator.vibrate) navigator.vibrate(350); };
    beep(); ringT = setInterval(beep, kind === 'in' ? 1300 : 3000);
  } catch { }
}
const stopRing = () => { clearInterval(ringT); ringT = null; };
const elapsed = () => { const s = Math.max(0, Math.floor((Date.now() - CALL.t0) / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

function renderCallUI() {
  const el = $('#callUI');
  if (!CALL) { el.classList.remove('show', 'ring'); el.innerHTML = ''; return; }
  el.classList.add('show'); el.classList.toggle('ring', CALL.status === 'ringing');
  const ringingIn = CALL.dir === 'in' && CALL.status === 'ringing';
  const stat = CALL.status === 'ringing' ? (CALL.dir === 'out' ? 'در حال زنگ زدن…' : 'تماس ورودی…') : (CALL.connected ? '<span id="ctimer">' + elapsed() + '</span>' : 'در حال برقراری ارتباط…');
  el.innerHTML = `<div class="cavatar">${esc(nameOf(CALL.peer)[0] || '#')}</div><h2 style="margin:0">${esc(nameOf(CALL.peer))}</h2><div class="mut ltr">${fmtNum(CALL.peer)}</div>
    <div class="mut">خط شما: <span class="ltr">${fmtNum(CALL.mine)}</span></div><div class="cstat">${stat}</div>
    <div class="cbtns">${ringingIn ? `<div><button class="cb r" data-act="reject">✖</button><div class="cbl">رد</div></div><div><button class="cb g" data-act="accept">📞</button><div class="cbl">پاسخ</div></div>`
      : `<div><button class="cb ${CALL.muted ? 'on' : ''}" data-act="mute">${CALL.muted ? '🔇' : '🎙'}</button><div class="cbl">بی‌صدا</div></div><div><button class="cb r" data-act="hang">📵</button><div class="cbl">پایان</div></div>`}</div>`;
}
async function prepareMedia() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const pc = new RTCPeerConnection(ICE); stream.getTracks().forEach(t => pc.addTrack(t, stream));
  pc.ontrack = e => { const a = $('#remoteAudio'); a.srcObject = e.streams[0]; a.play().catch(() => { }); };
  pc.onicecandidate = e => { if (e.candidate && CALL?.ch) CALL.ch.send({ type: 'broadcast', event: 'ice', payload: e.candidate.toJSON() }); };
  pc.onconnectionstatechange = () => {
    if (!CALL) return;
    if (pc.connectionState === 'connected' && !CALL.connected) { CALL.connected = true; CALL.t0 = Date.now(); renderCallUI(); CALL.tick = setInterval(() => { const t = $('#ctimer'); if (t) t.textContent = elapsed(); }, 1000); }
    if (pc.connectionState === 'failed') { toast('ارتباط صوتی برقرار نشد (شبکه/NAT)'); hangup(); }
  };
  CALL.stream = stream; CALL.pc = pc; CALL.iceQ = [];
}
async function flushIce() { for (const c of CALL.iceQ.splice(0)) { try { await CALL.pc.addIceCandidate(c); } catch { } } }
async function openChannel(id) {
  const ch = sb.channel('call:' + id, { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'offer' }, async ({ payload }) => { if (!CALL?.pc) return; await CALL.pc.setRemoteDescription(payload); await flushIce(); const ans = await CALL.pc.createAnswer(); await CALL.pc.setLocalDescription(ans); ch.send({ type: 'broadcast', event: 'answer', payload: { type: ans.type, sdp: ans.sdp } }); });
  ch.on('broadcast', { event: 'answer' }, async ({ payload }) => { if (!CALL?.pc) return; await CALL.pc.setRemoteDescription(payload); await flushIce(); });
  ch.on('broadcast', { event: 'ice' }, async ({ payload }) => { if (!CALL?.pc) return; if (CALL.pc.remoteDescription) { try { await CALL.pc.addIceCandidate(payload); } catch { } } else CALL.iceQ.push(payload); });
  CALL.ch = ch;
  await new Promise((res, rej) => ch.subscribe(s => { if (s === 'SUBSCRIBED') res(); else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') rej(new Error('کانال تماس وصل نشد')); }));
}
async function placeCall(to) {
  if (CALL) return toast('در حال تماس هستید');
  if (!S.line) return toast('ابتدا یک شماره فعال کنید: #26* را شماره‌گیری کنید');
  if (!isNum(to)) return toast('شماره نامعتبر است');
  CALL = { dir: 'out', peer: to, mine: S.line, status: 'ringing' };
  try { await prepareMedia(); } catch { CALL = null; return toast('برای تماس، دسترسی میکروفون را مجاز کنید'); }
  const { data, error } = await sb.rpc('start_call', { p_from: S.line, p_to: to });
  if (error) { cleanup(); return toast(errText(error)); }
  if (data.status === 'unavailable') { cleanup(); await loadCalls(); if (S.tab === 'call') render(); return toast('شماره مورد نظر در دسترس نیست'); }
  CALL.id = data.id;
  try { await openChannel(CALL.id); } catch (e) { await rpcUpd('cancelled'); cleanup(); return toast(errText(e)); }
  renderCallUI(); startRing('out'); pushApi('call', CALL.id);
  CALL.missT = setTimeout(async () => { if (CALL && CALL.status === 'ringing') { await rpcUpd('missed'); pushApi('cancel', CALL?.id); } }, 45000);
}
function showIncoming(row) {
  if (CALL) return;
  CALL = { id: row.id, dir: 'in', peer: row.from_number, mine: row.to_number, status: 'ringing' };
  renderCallUI(); startRing('in');
  CALL.missT = setTimeout(() => { if (CALL && CALL.status === 'ringing' && CALL.dir === 'in') cleanup(); }, 47000);
}
async function checkPending() {
  if (CALL || !S.user) return;
  const since = new Date(Date.now() - 40000).toISOString();
  const { data } = await sb.from('calls').select('*').eq('to_user', S.user.id).eq('status', 'ringing').gte('created_at', since).order('created_at', { ascending: false }).limit(1);
  if (data?.[0]) showIncoming(data[0]);
}
async function acceptCall() {
  if (!CALL || CALL.status !== 'ringing') return;
  CALL.accepting = true; stopRing();
  try { await prepareMedia(); } catch { toast('دسترسی میکروفون لازم است'); return hangup(); }
  try { await openChannel(CALL.id); } catch (e) { toast(errText(e)); return hangup(); }
  const { error } = await sb.rpc('update_call', { p_call_id: CALL.id, p_status: 'answered' });
  if (error) { toast(errText(error)); return cleanup(); }
  CALL.status = 'answered'; renderCallUI();
}
async function rpcUpd(st) { if (!CALL?.id) return; const { error } = await sb.rpc('update_call', { p_call_id: CALL.id, p_status: st }); if (error) console.warn(error.message); }
async function hangup() {
  if (!CALL) return;
  const id = CALL.id, wasRinging = CALL.status === 'ringing', out = CALL.dir === 'out';
  await rpcUpd(CALL.status === 'answered' ? 'ended' : (CALL.dir === 'in' ? 'rejected' : 'cancelled'));
  if (out && wasRinging) pushApi('cancel', id);
  cleanup();
}
function toggleMute() { if (!CALL?.stream) return; CALL.muted = !CALL.muted; CALL.stream.getAudioTracks().forEach(t => t.enabled = !CALL.muted); renderCallUI(); }
function cleanup() {
  stopRing();
  if (CALL) { clearTimeout(CALL.missT); clearInterval(CALL.tick); try { CALL.pc?.close(); } catch { } CALL.stream?.getTracks().forEach(t => t.stop()); if (CALL.ch) sb.removeChannel(CALL.ch); }
  $('#remoteAudio').srcObject = null; CALL = null; renderCallUI();
  loadCalls().then(() => { if (S.tab === 'call' && S.sub.call === 'recent' && !$('#sheetBg').classList.contains('show')) render(); });
}
async function onCallRow(row, type) {
  if (!row) return;
  if (type === 'INSERT' && row.to_user === S.user.id && row.status === 'ringing') {
    if (CALL) { await sb.rpc('update_call', { p_call_id: row.id, p_status: 'rejected' }); return; }
    return showIncoming(row);
  }
  if (CALL && CALL.id === row.id) {
    if (row.status === 'answered' && CALL.status === 'ringing') {
      if (CALL.dir === 'in') { if (!CALL.accepting) { cleanup(); toast('تماس روی دستگاه دیگری پاسخ داده شد'); } return; }
      CALL.status = 'answered'; stopRing(); clearTimeout(CALL.missT); renderCallUI();
      const off = await CALL.pc.createOffer(); await CALL.pc.setLocalDescription(off);
      CALL.ch.send({ type: 'broadcast', event: 'offer', payload: { type: off.type, sdp: off.sdp } });
    } else if (['rejected', 'cancelled', 'missed', 'ended'].includes(row.status)) {
      const msg = { rejected: 'تماس رد شد', cancelled: 'تماس لغو شد', missed: 'پاسخی داده نشد', ended: 'تماس پایان یافت' }[row.status];
      cleanup(); toast(msg);
    }
  } else if (type === 'UPDATE') loadCalls().then(() => { if (S.tab === 'call' && S.sub.call === 'recent') render(); });
}
