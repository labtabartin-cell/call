/* ================= صفحه اصلی گوشی + بانک امرالد + کارتخوان + همراه‌بانک ================= */
/* همه‌چیز اینجا سکه‌ی بازی است؛ هیچ پول واقعی‌ای در کار نیست. */
S.cards = []; S.terms = []; S.pos = null; S.stmt = []; S.stmtF = 'all';
Object.assign(S.sub, { bank: 'acct', mbank: 'card' });

const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const JSQR_LIB = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const _libs = {};
const lib = src => _libs[src] || (_libs[src] = new Promise((res, rej) => {
  const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete _libs[src]; rej(new Error('lib')); }; document.head.appendChild(s);
}));
async function qrSvg(text) { await lib(QR_LIB); const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }

/* ---------- استایل ---------- */
(function () {
  const st = document.createElement('style');
  st.textContent = `
.home{height:100%;display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) 18px max(16px,env(safe-area-inset-bottom));overflow-y:auto}
.htop{display:flex;align-items:center;gap:8px}
.hclock{text-align:center;margin-top:18px}
.hclock b{font-size:66px;font-weight:200;letter-spacing:2px;direction:ltr;display:block;line-height:1.1}
.hclock span{color:var(--mut);font-size:14px}
.hgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px 6px;margin-top:30px}
.happ{background:none;border:0;color:var(--tx);font:inherit;font-size:11.5px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;position:relative;text-align:center;line-height:1.3}
.happ i{width:62px;height:62px;border-radius:19px;display:grid;place-items:center;font-size:30px;font-style:normal;box-shadow:0 8px 20px #0006;transition:.15s}
.happ:active i{transform:scale(.9)}
.happ .dot{top:-4px;right:calc(50% - 34px)}
.dock{margin-top:auto;background:rgba(255,255,255,.07);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--line);border-radius:28px;padding:14px 8px;display:grid;grid-template-columns:repeat(4,1fr)}
.g-emr{background:linear-gradient(135deg,#059669,#34d399)}.g-mb{background:linear-gradient(135deg,#0ea5e9,#6366f1)}.g-pos{background:linear-gradient(135deg,#f59e0b,#ef4444)}
.g-call{background:var(--g-grn)}.g-msg{background:var(--g-acc)}.g-game{background:linear-gradient(135deg,#a78bfa,#ec4899)}.g-shop{background:var(--g-gold)}
.ehero{background:linear-gradient(135deg,#064e3b,#059669 60%,#34d399);border-radius:22px;padding:16px;margin-bottom:12px;box-shadow:0 10px 30px #05966933}
.ehero .big{background:none;color:#fff;-webkit-text-fill-color:#fff}
.ehero .mut{color:#d1fae5}
.ecard{position:relative;width:100%;aspect-ratio:1.586;border-radius:20px;padding:14px 16px;color:#fff;background:linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%);box-shadow:0 14px 34px #04785744;display:flex;flex-direction:column;overflow:hidden}
.ecard:before{content:"";position:absolute;width:240px;height:240px;border-radius:50%;background:#ffffff14;right:-70px;top:-90px}
.ecard.dead{filter:grayscale(1) brightness(.6)}
.ec-top{display:flex;justify-content:space-between;align-items:center;font-weight:800;position:relative}
.ec-top span{font-size:11px;letter-spacing:2px;opacity:.85}
.ec-mid{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;position:relative}
.ec-num{font-size:clamp(15px,5.2vw,21px);letter-spacing:1.5px;font-weight:700;text-shadow:0 2px 6px #0005;direction:ltr}
.ec-qr{width:25%;max-width:86px;min-width:62px;background:#fff;border-radius:9px;padding:5px;flex:none}
.ec-qr svg{display:block;width:100%;height:auto}
.ec-bot{display:flex;justify-content:space-between;margin-top:8px;font-size:13px;position:relative;direction:ltr}
.pin{letter-spacing:12px;text-align:center;font-size:22px;direction:ltr}
.pdots{display:flex;gap:14px;justify-content:center;direction:ltr;margin:6px 0 14px}
.pdots span{width:16px;height:16px;border-radius:50%;border:2px solid var(--mut)}
.pdots span.f{background:var(--acc);border-color:var(--acc)}
.posamt{font-size:40px;font-weight:800;text-align:center;direction:ltr;min-height:64px;padding:8px 0}
.posamt small{display:block;font-size:13px;color:var(--mut);font-weight:400}
.vid{position:relative;width:100%;aspect-ratio:1;max-height:56vh;border-radius:22px;overflow:hidden;background:#000;border:1px solid var(--line);margin-bottom:10px}
.vid video{width:100%;height:100%;object-fit:cover}
.vid:after{content:"";position:absolute;inset:18%;border:3px solid #34d399;border-radius:18px;box-shadow:0 0 0 999px #0007}
.res{text-align:center;padding:26px 10px}
.res .ico{width:92px;height:92px;border-radius:50%;margin:0 auto 12px;display:grid;place-items:center;font-size:48px}
.res.ok .ico{background:var(--g-grn)}.res.no .ico{background:var(--g-red)}
.bigqr{background:#fff;border-radius:18px;padding:14px;width:min(78vw,300px);margin:8px auto}
.bigqr svg{display:block;width:100%;height:auto}
`;
  document.head.appendChild(st);
})();

/* ---------- داده ---------- */
async function loadBank() {
  const [c, t] = await Promise.all([sb.rpc('bank_my_cards'), sb.rpc('bank_my_terminals')]);
  S.cards = c.data || []; S.terms = t.data || [];
  try { for (const x of S.cards) x.svg = await qrSvg(`EMR1|${x.card_no}|${x.qr_token}`); } catch { }
}
async function loadStmt() { const { data } = await sb.from('wallet_tx').select('*').order('id', { ascending: false }).limit(100); S.stmt = data || []; }
const grp = n => String(n).replace(/(\d{4})(?=\d)/g, '$1 ');
const uname = () => S.user?.user_metadata?.username || '';
const expOf = d => { const x = new Date(d); x.setFullYear(x.getFullYear() + 4); return String(x.getMonth() + 1).padStart(2, '0') + '/' + String(x.getFullYear()).slice(-2); };
const PINMSG = { wrong_pin: r => `رمز اشتباه است؛ ${money(r.left)} تلاش باقی مانده`, locked: () => 'کارت به‌دلیل رمز اشتباه ۱۵ دقیقه قفل شد', blocked: () => 'این کارت مسدود است', no_card: () => 'کارت پیدا نشد', insufficient_funds: () => 'موجودی کارت کافی نیست' };
const pinMsg = r => (PINMSG[r.error] || (() => 'خطا'))(r);

/* ---------- نمای کلی (برای render) ---------- */
function extView(tab) { return tab === 'bank' ? viewBank() : tab === 'pos' ? viewPos() : tab === 'mbank' ? viewMbank() : null; }
function extHold() { return S.tab === 'pos' && S.pos?.step === 'scan' && !!scanStream; }
async function onNavExt(t) {
  if (t === 'bank') { await Promise.all([loadWallet(), loadBank(), loadStmt()]); render(); }
  else if (t === 'mbank' || t === 'pos') { await Promise.all([loadWallet(), loadBank()]); render(); }
}
let clockT = null;
function extAfter() {
  if (S.tab === 'pos' && S.pos?.step === 'scan') startScan(); else stopScan();
  clearInterval(clockT);
  if (S.tab === 'home') clockT = setInterval(() => { const e = $('#hclock'); if (e) e.textContent = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }); }, 20000);
}

/* ================= صفحه اصلی ================= */
function viewHome() {
  const now = new Date();
  const time = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  const app = (act, attrs, emoji, label, cls, badge) => `<button class="happ" data-act="${act}" ${attrs}><i class="${cls}">${emoji}</i><span>${esc(label)}</span>${badge ? `<b class="dot">${badge}</b>` : ''}</button>`;
  const terms = S.terms.map(t => app('openPos', `data-id="${t.id}"`, '🧾', 'کارتخوان ' + t.name, 'g-pos')).join('');
  return `<div class="home">
    <div class="htop"><span class="bal" data-act="nav" data-t="bank"><b>ا</b><span id="balv">${money(S.wallet?.balance ?? 0)}</span></span><span class="grow"></span><button class="ib" data-act="settings">${ICON.gear}</button></div>
    <div class="hclock"><b id="hclock">${time}</b><span>${date}</span></div>
    <div class="hgrid">
      ${app('nav', 'data-t="bank"', '💎', 'بانک امرالد', 'g-emr')}
      ${app('nav', 'data-t="mbank"', '📲', 'همراه‌بانک', 'g-mb')}
      ${terms}
    </div>
    <div class="dock">
      ${app('nav', 'data-t="call"', '📞', 'تماس', 'g-call')}
      ${app('nav', 'data-t="msgs"', '💬', 'پیام', 'g-msg', S.unread || '')}
      ${app('nav', 'data-t="games"', '🎮', 'بازی', 'g-game')}
      ${app('nav', 'data-t="market"', '🛍️', 'بازار', 'g-shop')}
    </div>
  </div>`;
}

/* ================= بانک امرالد ================= */
function cardHtml(c) {
  return `<div class="ecard ${c.status !== 'active' ? 'dead' : ''}">
    <div class="ec-top"><b>💎 بانک امرالد</b><span>EMERALD</span></div>
    <div class="ec-mid"><div class="ec-num">${grp(c.card_no)}</div><div class="ec-qr">${c.svg || ''}</div></div>
    <div class="ec-bot"><span>${esc(uname()).toUpperCase()}</span><span>${expOf(c.created_at)}</span></div></div>`;
}
const BK_TABS = [['acct', 'حساب'], ['stmt', 'گردش مالی'], ['cards', 'کارت‌ها'], ['terms', 'کارتخوان']];
function viewBank() {
  const w = S.wallet; if (!w) return '<div class="empty">حساب پیدا نشد</div>';
  const sub = S.sub.bank;
  const seg = segHtml(BK_TABS, sub, 'subBank');
  if (sub === 'acct') return seg + `<div class="ehero"><div class="mut">💎 حساب شما در بانک امرالد</div><div class="big">🪙 ${money(w.balance)}</div>
      <div class="mut" style="margin-top:8px">شماره حساب</div><div class="row"><div class="acc ltr grow">${grp(w.account_no)}</div><button class="btn sm sec" data-act="copyAcc">کپی</button></div></div>
    <div class="card"><div class="row"><div class="grow"><b>🎁 هدیه روزانه</b><div class="mut" id="giftInfo"></div></div><button class="btn sm" id="giftBtn" data-act="gift">دریافت ۱۵۰ سکه</button></div></div>
    <div class="card"><b>شارژ حساب</b> <span class="mut">(سکه آزمایشی)</span>
      <div class="qa">${[1000, 5000, 20000, 100000].map(a => `<button class="chip" data-act="topup" data-a="${a}">+${money(a)}</button>`).join('')}</div>
      <form data-form="topup" class="row"><input name="a" type="number" min="1" max="1000000" placeholder="مبلغ دلخواه" dir="ltr"><button class="btn sm" style="height:44px">شارژ</button></form></div>
    <div class="card hl"><b>حساب‌تان فعال است ✅</b><div class="mut">برای خرید و دریافت پول، از تب «کارت‌ها» کارت بگیرید و از «کارتخوان» برای فروشندگی استفاده کنید.</div></div>`;
  if (sub === 'stmt') return seg + viewStmt();
  if (sub === 'cards') return seg + `<button class="btn" data-act="reqCard" ${S.cards.filter(c => c.status === 'active').length >= 3 ? 'disabled' : ''}>＋ درخواست کارت جدید</button><div style="height:12px"></div>` +
    (S.cards.length ? S.cards.map(c => `<div class="card">${cardHtml(c)}
      <div class="row" style="margin-top:10px;flex-wrap:wrap">${c.status === 'active'
        ? `<button class="btn sm sec" data-act="cardQr" data-id="${c.id}">نمایش QR</button><button class="btn sm sec" data-act="cardPrint" data-id="${c.id}">🖨 چاپ</button><button class="btn sm sec" data-act="cardPin" data-id="${c.id}">تغییر رمز</button><button class="btn sm red" data-act="cardBlock" data-id="${c.id}">مسدودسازی</button>`
        : '<span class="tag">مسدود شده</span>'}</div>${c.locked ? '<div class="mut red">⛔ موقتاً قفل است (رمز اشتباه)</div>' : ''}</div>`).join('') : '<div class="empty">هنوز کارتی ندارید</div>');
  return seg + `<button class="btn" data-act="regTerm" ${S.terms.length >= 3 ? 'disabled' : ''}>＋ ثبت کارتخوان جدید</button><div style="height:12px"></div>` +
    (S.terms.length ? S.terms.map(t => `<div class="card row"><div class="grow"><b>🧾 ${esc(t.name)}</b><div class="mut ltr">پایانه ${t.terminal_no}</div></div><button class="btn sm sec" data-act="openPos" data-id="${t.id}">باز کردن</button><button class="btn sm red" data-act="delTerm" data-id="${t.id}">حذف</button></div>`).join('') + '<div class="mut">کارتخوان روی صفحه‌ی اصلی گوشی هم اضافه شده است. پولِ کارت‌های کشیده‌شده به همین حساب واریز می‌شود.</div>' : '<div class="empty">کارتخوانی ثبت نشده</div>');
}
const KINDS = { welcome: 'هدیه خوش‌آمدگویی', gift: 'هدیه روزانه', topup: 'شارژ حساب', transfer: 'انتقال', number_purchase: 'خرید شماره', number_sale: 'فروش شماره', market_fee: 'کارمزد بازار', game_tap: 'ضربه‌های ماینر', game_reward: 'جایزه بازی', game_spend: 'هزینه بازی' };
function viewStmt() {
  const w = S.wallet, isIn = t => t.to_wallet === w.id && t.from_wallet !== w.id;
  const all = S.stmt, inn = all.filter(isIn).reduce((a, t) => a + t.amount, 0), out = all.filter(t => !isIn(t)).reduce((a, t) => a + t.amount, 0);
  const list = all.filter(t => S.stmtF === 'all' || (S.stmtF === 'in') === isIn(t));
  const chips = [['all', 'همه'], ['in', 'واریز'], ['out', 'برداشت']].map(c => `<button class="chip ${S.stmtF === c[0] ? 'on' : ''}" data-act="stmtF" data-f="${c[0]}">${c[1]}</button>`).join('');
  return `<div class="stats"><div class="stat"><span class="mut">کل واریز</span><b class="pos">+${money(inn)}</b></div><div class="stat"><span class="mut">کل برداشت</span><b class="neg">−${money(out)}</b></div></div>
    <div class="chips">${chips}</div>` +
    (list.length ? list.map(t => { const i = isIn(t); const title = t.kind === 'pos_payment' ? (i ? 'دریافت از کارتخوان' : 'پرداخت با کارت') : (KINDS[t.kind] || t.kind);
      return `<div class="card row"><div class="grow"><div>${title}${t.memo && !['welcome', 'gift', 'topup'].includes(t.kind) ? ' <span class="mut">' + esc(t.memo) + '</span>' : ''}</div><div class="mut">${dtm(t.created_at)}</div></div><b class="${i ? 'pos' : 'neg'}">${i ? '+' : '−'}${money(t.amount)}</b></div>`; }).join('') : '<div class="empty">تراکنشی نیست</div>');
}

/* چاپ کارت */
function printCard(c) {
  const num = grp(c.card_no), exp = expOf(c.created_at), nm = esc(uname()).toUpperCase();
  const html = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>کارت امرالد</title><style>
@page{size:A4;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font-family:Tahoma,Arial,sans-serif}
.c{width:85.6mm;height:54mm;border-radius:3.5mm;position:relative;overflow:hidden;color:#fff;margin:0 0 8mm;border:.2mm dashed #999}
.f{background:linear-gradient(135deg,#064e3b,#059669 55%,#34d399);padding:4mm 5mm}
.f h1{margin:0;font-size:12pt;display:flex;justify-content:space-between}.f h1 small{font-size:7pt;letter-spacing:1.5pt;opacity:.85}
.n{position:absolute;left:5mm;bottom:11mm;font-size:13.5pt;letter-spacing:1pt;direction:ltr;font-weight:bold;font-family:"Courier New",monospace}
.q{position:absolute;right:5mm;top:15mm;width:21mm;height:21mm;background:#fff;border-radius:2mm;padding:1.2mm}.q svg{width:100%;height:100%;display:block}
.b{position:absolute;left:5mm;right:5mm;bottom:4mm;display:flex;justify-content:space-between;font-size:8.5pt;direction:ltr}
.k{background:#e5e7eb;color:#111;padding:0}.k .s{height:10mm;background:#111;margin-top:6mm}.k p{margin:4mm 5mm 0;font-size:7.5pt;line-height:1.7}
</style><div class="c f"><h1><span>بانک امرالد</span><small>EMERALD</small></h1><div class="q">${c.svg || ''}</div><div class="n">${num}</div><div class="b"><span>${nm}</span><span>${exp}</span></div></div>
<div class="c k"><div class="s"></div><p>این کارت فقط برای بازی «امون» است و ارزش پولی واقعی ندارد.<br>برای پرداخت، QR را به کارتخوان نشان دهید و رمز ۴ رقمی را وارد کنید.<br>رمز کارت را به هیچ‌کس نگویید.</p></div></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 450); return; }
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(f);
  f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); }, 400);
}

/* ================= کارتخوان ================= */
const posTerm = () => S.terms.find(t => t.id === S.pos?.id);
function dots(n) { return `<div class="pdots">${[0, 1, 2, 3].map(i => `<span class="${i < n ? 'f' : ''}"></span>`).join('')}</div>`; }
function keypad(act, extra) {
  const k = d => `<button data-act="${act}" data-k="${d}">${d}</button>`;
  return `<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k).join('')}<button class="del" data-act="${act}" data-k="del">${ICON.del}</button>${k(0)}${extra || '<button disabled></button>'}</div>`;
}
function viewPos() {
  const p = S.pos, t = posTerm();
  if (!p || !t) return '<div class="empty">کارتخوانی انتخاب نشده</div><button class="btn" data-act="nav" data-t="home">بازگشت به صفحه اصلی</button>';
  const head = `<div class="card row"><span class="avatar" style="--h:35">🧾</span><div class="grow"><b>${esc(t.name)}</b><div class="mut ltr">پایانه ${t.terminal_no}</div></div></div>`;
  const amt = `<div class="posamt"><small>مبلغ</small>🪙 ${money(+p.amount || 0)}</div>`;
  if (p.step === 'amount') {
    const w = S.wallet, recent = S.tx.filter(x => x.kind === 'pos_payment' && x.to_wallet === w?.id && (x.memo || '').includes(t.name)).slice(0, 5);
    return head + amt + keypad('posKey', '<button data-act="posKey" data-k="000">۰۰۰</button>') +
      `<button class="btn" data-act="posGo" ${+p.amount > 0 ? '' : 'disabled'}>دریافت وجه</button><div style="height:14px"></div>` +
      (recent.length ? '<b>آخرین دریافتی‌ها</b><div style="height:8px"></div>' + recent.map(x => `<div class="card row"><div class="grow mut">${dtm(x.created_at)}</div><b class="pos">+${money(x.amount)}</b></div>`).join('') : '');
  }
  if (p.step === 'scan') return head + amt + `<div class="vid"><video id="posVideo" playsinline muted></video></div>
    <p class="mut" style="text-align:center">QR روی کارت مشتری را جلوی دوربین بگیرید</p>
    <form data-form="b-qr" class="row"><input name="code" placeholder="یا کد کارت را اینجا بچسبانید" dir="ltr" autocomplete="off"><button class="btn sm" style="height:44px">تأیید</button></form>
    <div style="height:10px"></div><button class="btn sec" data-act="posBack">انصراف</button>`;
  if (p.step === 'pin') return head + amt + `<p class="mut" style="text-align:center">کارت ••••${esc(p.qr.split('|')[1].slice(-4))} — رمز ۴ رقمی را وارد کنید</p>${dots(p.pin.length)}${keypad('posPin')}<button class="btn sec" data-act="posBack">انصراف</button>`;
  const r = p.res || {};
  if (r.ok) return head + `<div class="res ok"><div class="ico">✓</div><h2 style="margin:0">پرداخت موفق</h2><div class="posamt">🪙 ${money(r.amount)}</div><div class="mut">کارت ••••${esc(r.card_last4)}</div></div><button class="btn" data-act="posNew">تراکنش جدید</button>`;
  const msg = r.error === 'invalid_qr' ? 'کد کارت معتبر نیست' : r.error === 'cannot_transfer_to_self' ? 'نمی‌توانید با کارت خودتان پرداخت کنید' : pinMsg(r);
  return head + `<div class="res no"><div class="ico">✕</div><h2 style="margin:0">پرداخت ناموفق</h2><div class="mut" style="margin-top:6px">${esc(msg)}</div></div><button class="btn" data-act="posNew">تلاش دوباره</button>`;
}

let scanStream = null, scanT = 0, scanBusy = false, scanStarting = false;
async function startScan() {
  if (scanStream || scanStarting) return; scanStarting = true;
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const v = $('#posVideo');
    if (!v || S.pos?.step !== 'scan') { st.getTracks().forEach(t => t.stop()); return; }
    scanStream = st; v.srcObject = st; await v.play().catch(() => { });
    let det = null; if ('BarcodeDetector' in window) { try { det = new BarcodeDetector({ formats: ['qr_code'] }); } catch { } }
    if (!det) await lib(JSQR_LIB);
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    const loop = async () => {
      if (!scanStream) return;
      if (v.readyState >= 2 && !scanBusy) {
        scanBusy = true;
        try {
          let text = null;
          if (det) text = (await det.detect(v))[0]?.rawValue;
          else if (v.videoWidth) { const sc = Math.min(1, 520 / v.videoWidth); cv.width = v.videoWidth * sc | 0; cv.height = v.videoHeight * sc | 0; cx.drawImage(v, 0, 0, cv.width, cv.height); const id = cx.getImageData(0, 0, cv.width, cv.height); text = jsQR(id.data, id.width, id.height)?.data; }
          if (text && text.startsWith('EMR1|')) { scanBusy = false; return onQr(text); }
        } catch { }
        scanBusy = false;
      }
      scanT = setTimeout(loop, 180);
    };
    loop();
  } catch { toast('دسترسی به دوربین ممکن نشد؛ کد کارت را دستی وارد کنید'); }
  finally { scanStarting = false; }
}
function stopScan() { clearTimeout(scanT); if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; } }
function onQr(text) {
  if (!/^EMR1\|\d{16}\|[0-9a-f]+$/.test(text)) return toast('کد کارت معتبر نیست');
  stopScan(); S.pos.qr = text; S.pos.step = 'pin'; S.pos.pin = ''; if (navigator.vibrate) navigator.vibrate(60); render();
}
let posBusy = false;
async function posSubmit() {
  const p = S.pos; if (posBusy) return; posBusy = true;
  try {
    const { data, error } = await sb.rpc('pos_charge', { p_terminal_id: p.id, p_qr: p.qr, p_amount: +p.amount, p_pin: p.pin });
    if (error) { p.res = { ok: false, error: String(error.message || '').trim() }; p.step = 'done'; return render(); }
    if (data.ok) { p.res = data; p.step = 'done'; await loadWallet(); return render(); }
    if (data.error === 'wrong_pin') { toast(pinMsg(data)); p.pin = ''; return render(); }
    p.res = data; p.step = 'done'; render();
  } finally { posBusy = false; }
}

/* ================= همراه‌بانک ================= */
function viewMbank() {
  const w = S.wallet; if (!w) return '<div class="empty">حساب پیدا نشد</div>';
  const sub = S.sub.mbank, out = S.tx.filter(t => t.kind === 'transfer' && t.from_wallet === w.id).slice(0, 5);
  return `<div class="ehero"><div class="mut">📲 همراه‌بانک امرالد</div><div class="big">🪙 ${money(w.balance)}</div></div>` +
    segHtml([['card', 'کارت به کارت'], ['acct', 'به شماره حساب']], sub, 'subMbank') +
    (sub === 'card' ? `<div class="card"><form data-form="b-c2c" style="display:flex;flex-direction:column;gap:8px">
        <input id="cardIn" name="card" inputmode="numeric" maxlength="19" placeholder="شماره کارت مقصد (۱۶ رقم)" dir="ltr" autocomplete="off" required><div id="cardWho" class="mut" style="min-height:22px"></div>
        <input name="a" type="number" min="1" placeholder="مبلغ" dir="ltr" required><input name="m" maxlength="100" placeholder="توضیح (اختیاری)"><button class="btn">انتقال</button></form></div>`
      : `<div class="card"><form data-form="transfer" style="display:flex;flex-direction:column;gap:8px">
        <input name="acc" inputmode="numeric" maxlength="14" placeholder="شماره حساب مقصد (۱۲ رقم)" dir="ltr" required><input name="a" type="number" min="1" placeholder="مبلغ" dir="ltr" required>
        <input name="m" maxlength="100" placeholder="توضیح (اختیاری)"><button class="btn">انتقال</button></form></div>`) +
    (out.length ? '<b>آخرین انتقال‌ها</b><div style="height:8px"></div>' + out.map(t => `<div class="card row"><div class="grow"><div>انتقال ${t.memo ? '<span class="mut">' + esc(t.memo) + '</span>' : ''}</div><div class="mut">${dtm(t.created_at)}</div></div><b class="neg">−${money(t.amount)}</b></div>`).join('') : '');
}
let whoT;
document.addEventListener('input', e => {
  if (e.target.id !== 'cardIn') return;
  const v = e.target.value.replace(/\D/g, '').slice(0, 16); e.target.value = grp(v);
  const box = $('#cardWho'); clearTimeout(whoT);
  if (v.length < 16) { box.textContent = ''; return; }
  whoT = setTimeout(async () => { const r = await rpc('bank_resolve_card', { p_card_no: v }); if (!r) return; box.innerHTML = r.found ? `<span class="grn">✓ گیرنده: ${esc(r.username)}</span>` : '<span class="neg">کارت فعالی با این شماره پیدا نشد</span>'; }, 250);
});

/* ================= هندلرها ================= */
Object.assign(H, {
  subBank: async d => { S.sub.bank = d.s; render(); if (d.s === 'stmt') { await loadStmt(); render(); } else if (d.s === 'cards' || d.s === 'terms') { await loadBank(); render(); } },
  subMbank: d => { S.sub.mbank = d.s; render(); },
  stmtF: d => { S.stmtF = d.f; render(); },
  openPos: async d => { S.pos = { id: d.id, step: 'amount', amount: '', pin: '', qr: null, res: null }; S.tab = 'pos'; S.thread = null; render(); await loadWallet(); render(); },
  posKey: d => { const p = S.pos; if (d.k === 'del') p.amount = p.amount.slice(0, -1); else if ((p.amount + d.k).replace(/^0+/, '').length <= 8) p.amount = (p.amount + d.k).replace(/^0+/, ''); render(); },
  posGo: () => { if (!(+S.pos.amount > 0)) return; S.pos.step = 'scan'; render(); },
  posBack: () => { stopScan(); S.pos.step = 'amount'; S.pos.pin = ''; S.pos.qr = null; render(); },
  posPin: d => { const p = S.pos; if (d.k === 'del') p.pin = p.pin.slice(0, -1); else if (p.pin.length < 4) p.pin += d.k; render(); if (p.pin.length === 4) setTimeout(posSubmit, 150); },
  posNew: () => { S.pos = { id: S.pos.id, step: 'amount', amount: '', pin: '', qr: null, res: null }; render(); },
  reqCard: () => sheet(`<h3>درخواست کارت</h3><p class="mut">یک رمز ۴ رقمی برای کارت تعیین کنید. آن را به کسی نگویید.</p><form data-form="b-card" style="display:flex;flex-direction:column;gap:10px">
    <input class="pin" name="p1" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="رمز" required autocomplete="new-password"><input class="pin" name="p2" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="تکرار رمز" required autocomplete="new-password"><button class="btn">صدور کارت</button></form>`),
  cardQr: d => { const c = S.cards.find(x => x.id === d.id); if (c) sheet(`<h3>QR کارت</h3><p class="mut">این کد را به کارتخوان نشان دهید. QR را برای کسی نفرستید و از آن عکس نگذارید.</p><div class="bigqr">${c.svg || ''}</div><div class="acc ltr" style="text-align:center">${grp(c.card_no)}</div>`); },
  cardPrint: d => { const c = S.cards.find(x => x.id === d.id); if (c) printCard(c); },
  cardPin: d => sheet(`<h3>تغییر رمز کارت</h3><form data-form="b-pin" data-id="${d.id}" style="display:flex;flex-direction:column;gap:10px">
    <input class="pin" name="o" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="رمز فعلی" required><input class="pin" name="n" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="رمز جدید" required autocomplete="new-password"><button class="btn">تغییر رمز</button></form>`),
  cardBlock: async d => { if (!confirm('کارت برای همیشه مسدود شود؟ این کار برگشت‌پذیر نیست.')) return; const r = await rpc('bank_block_card', { p_card_id: d.id }); if (r) { toast('کارت مسدود شد'); await loadBank(); render(); } },
  regTerm: () => sheet(`<h3>ثبت کارتخوان</h3><p class="mut">پولِ کارت‌هایی که با این کارتخوان کشیده شود به حساب شما واریز می‌شود.</p><form data-form="b-term" style="display:flex;flex-direction:column;gap:10px"><input name="name" maxlength="40" placeholder="نام کارتخوان (مثلاً فروشگاه من)" required><button class="btn">ثبت کارتخوان</button></form>`),
  delTerm: async d => { if (!confirm('این کارتخوان حذف شود؟')) return; const r = await rpc('bank_delete_terminal', { p_id: d.id }); if (r) { await loadBank(); render(); } }
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form^="b-"]'); if (!f) return;
  const v = Object.fromEntries(new FormData(f)), k = f.dataset.form;
  if (k === 'b-card') {
    if (!/^\d{4}$/.test(v.p1)) return toast('رمز باید دقیقاً ۴ رقم باشد');
    if (v.p1 !== v.p2) return toast('تکرار رمز یکسان نیست');
    const r = await rpc('bank_request_card', { p_pin: v.p1 }); if (!r) return;
    closeSheet(); await loadBank(); toast('💳 کارت صادر شد'); render();
  } else if (k === 'b-pin') {
    if (!/^\d{4}$/.test(v.n)) return toast('رمز جدید باید ۴ رقم باشد');
    const r = await rpc('bank_change_pin', { p_card_id: f.dataset.id, p_old: v.o, p_new: v.n }); if (!r) return;
    if (!r.ok) return toast(pinMsg(r));
    closeSheet(); toast('رمز تغییر کرد');
  } else if (k === 'b-term') {
    const r = await rpc('bank_register_terminal', { p_name: v.name }); if (!r) return;
    closeSheet(); await loadBank(); toast('🧾 کارتخوان ثبت شد و به صفحه اصلی اضافه شد'); render();
  } else if (k === 'b-qr') {
    onQr((v.code || '').trim());
  } else if (k === 'b-c2c') {
    const no = v.card.replace(/\D/g, ''), a = Math.floor(+v.a);
    if (no.length !== 16) return toast('شماره کارت ۱۶ رقم است'); if (!(a >= 1)) return toast('مبلغ را وارد کنید');
    const who = await rpc('bank_resolve_card', { p_card_no: no }); if (!who) return; if (!who.found) return toast('کارت فعالی با این شماره پیدا نشد');
    if (!confirm(`انتقال ${money(a)} سکه به «${who.username}»؟`)) return;
    const r = await rpc('bank_card_transfer', { p_card_no: no, p_amount: a, p_memo: v.m || null }); if (r) { toast('✅ انتقال انجام شد'); await loadWallet(); render(); }
  }
});
