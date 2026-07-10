// ==================== WISHLIST MODULE ====================
// Watches MU Dream Market for items the user wants
//
// Server-side scraping fails due to Cloudflare protection — so we
// fetch the market from inside the browser (which already has Cloudflare
// cleared). When matches are found, we POST to the backend which
// dispatches push/email/whatsapp notifications.

const WISHLIST_SERVERS = [
    { id: 'rampage-x20', label: 'RAMPAGE X-20', mdId: 12 },
    { id: 'classic-x5',  label: 'CLASSIC X-5',  mdId: 10 },
    { id: 'guildwar',    label: 'GUILDWAR X-100', mdId: 8 }
];

const WISHLIST_CATEGORIES = [
    { id: 'armor',    label: '🛡️ Armadura', mdParam: 'armor' },
    { id: 'weapon',   label: '⚔️ Arma',     mdParam: 'weapon' },
    { id: 'wings',    label: '🪽 Asas',      mdParam: 'wing' },
    { id: 'jewel',    label: '💎 Jewels',    mdParam: 'jewel' },
    { id: 'misc',     label: '📦 Diversos',  mdParam: 'misc' }
];

const WISHLIST_OPTIONS = [
    { id: 'MH',  label: 'MH',  desc: 'Mana steal' },
    { id: 'SD',  label: 'SD',  desc: 'Shield damage' },
    { id: 'DD',  label: 'DD',  desc: 'Damage decrease' },
    { id: 'REF', label: 'REF', desc: 'Reflect damage' },
    { id: 'DSR', label: 'DSR', desc: 'Defense success rate' },
    { id: 'ZEN', label: 'ZEN', desc: 'Extra zen' },
    { id: 'LUCK',  label: 'LUCK',  desc: 'Critical chance' },
    { id: 'SKILL', label: 'SKILL', desc: 'Skill bonus' },
    { id: 'EXE',   label: 'EXE',   desc: 'Excellent' },
    { id: 'ANC',   label: 'ANC',   desc: 'Ancient' },
    { id: 'SOC',   label: 'SOC',   desc: 'Socket' }
];

const WISHLIST_RARITIES = ['Normal', 'Uncommon', 'Rare', 'Legendary', 'Epic'];

let wishlistItems = [];
let wishlistServer = localStorage.getItem('mudream_wishlist_server') || 'rampage-x20';
let wishlistChannels = null;
let _wishlistCheckTimer = null;

// Live scanner status shown to the user in the wishlist panel.
function setScannerStatus(state, msg) {
    const el = document.getElementById('wishlistScannerStatus');
    if (!el) return;
    const color = state === 'online' ? '#5be584' : state === 'offline' ? '#ff6b6b' : '#c0c0c0';
    const dot = state === 'online' ? '🟢' : state === 'offline' ? '🔴' : '⚪';
    el.style.color = color;
    el.textContent = `${dot} ${msg}`;
    el.title = new Date().toLocaleString();
}

// Bookmarklet installer modal — user drags a link to their bookmarks bar.
// When clicked while on mudream.online/market, it POSTs the HTML back to us.
function buildBookmarkletHref() {
    const origin = window.location.origin;
    // NB: this string becomes the javascript: URL. Keep it single-line, no comments,
    // no // comments (they break in a URL), and escape properly.
    const code = `(function(){var s=(new URL(location.href)).searchParams.get('server')||'12';var api='${origin}/api/market/verify?server='+s;fetch(api,{method:'POST',headers:{'Content-Type':'text/html'},body:document.documentElement.outerHTML}).then(function(r){return r.json()}).then(function(j){if(j.ok){alert('\\u2705 Scan enviado! '+j.total+' itens. Volte ao Timer Dream.')}else{alert('\\u274C Falha: '+(j.error||'?'))}}).catch(function(e){alert('\\u274C Erro: '+e.message)})})();`;
    return 'javascript:' + encodeURIComponent(code);
}

function showBookmarkletModal() {
    const existing = document.getElementById('bookmarkletModal');
    if (existing) existing.remove();
    const href = buildBookmarkletHref();
    const modal = document.createElement('div');
    modal.id = 'bookmarkletModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal" style="max-width:560px">
            <div class="modal-header">
                <h3>📌 Instalar Scanner de Mercado</h3>
                <button class="modal-close" data-close>&times;</button>
            </div>
            <div class="modal-body" style="line-height:1.55">
                <p style="margin-bottom:12px">O MU Dream bloqueia nossos servidores (Cloudflare). A solução é o <strong>seu próprio navegador</strong> escanear pra você — leva 3 segundos e é grátis.</p>

                <div style="background:rgba(123,44,240,0.12);border:1px solid rgba(123,44,240,0.35);padding:12px;border-radius:10px;margin-bottom:14px">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#cdb6ff;margin-bottom:8px">Passo 1 — arraste o botão abaixo pra sua barra de favoritos</div>
                    <a href="${href}" class="wl-bookmarklet-link" onclick="event.preventDefault();alert('Arraste o botão pra sua barra de favoritos — não clique.')" draggable="true">🔍 Scan MU Dream</a>
                </div>

                <div style="background:rgba(102,187,106,0.08);border:1px solid rgba(102,187,106,0.3);padding:12px;border-radius:10px;margin-bottom:14px">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#8ee5a4;margin-bottom:6px">Passo 2 — use quando quiser escanear</div>
                    <ol style="margin:0;padding-left:22px;font-size:14px">
                        <li>Abra <a href="https://mudream.online/pt/market?server=12" target="_blank" rel="noopener" style="color:#f5c542">mudream.online/pt/market</a></li>
                        <li>Clique no bookmark <strong>🔍 Scan MU Dream</strong> na barra</li>
                        <li>Aparece "✅ Scan enviado" — volte pro Timer Dream</li>
                    </ol>
                </div>

                <div style="font-size:12px;color:#999;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08)">
                    💡 A cada scan seu, todos os usuários do Timer Dream veem o mercado atualizado (cache global de 5min). Você é herói. 🦸
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.dataset.close !== undefined) modal.remove();
    });
}

async function loadWishlist() {
    try {
        const res = await fetch('/api/wishlist', { credentials: 'same-origin' });
        if (!res.ok) {
            wishlistItems = JSON.parse(localStorage.getItem('mudream_wishlist') || '[]');
            return;
        }
        const data = await res.json();
        wishlistItems = data.items || [];
        wishlistChannels = data.channels || null;
        localStorage.setItem('mudream_wishlist', JSON.stringify(wishlistItems));
    } catch {
        wishlistItems = JSON.parse(localStorage.getItem('mudream_wishlist') || '[]');
    }
}

async function saveWishlistItem(item) {
    const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(item)
    });
    if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j.error || j.message || ''; } catch {}
        const err = new Error(detail || 'Save failed');
        err.status = res.status;
        throw err;
    }
    return res.json();
}

async function deleteWishlistItem(id) {
    await fetch(`/api/wishlist/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });
}

async function saveWishlistChannels(channels) {
    const res = await fetch('/api/wishlist/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(channels)
    });
    if (!res.ok) throw new Error('Save channels failed');
    return res.json();
}

function renderWishlist() {
    const container = document.getElementById('wishlistContent');
    if (!container) return;

    // currentUser is set by auth.js after /api/auth/me succeeds
    const isLoggedIn = !!(typeof currentUser !== 'undefined' && currentUser);
    if (!isLoggedIn) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><p>${t('wishlistLoginRequired') || 'Faça login para usar a Wishlist.'}</p></div>`;
        return;
    }

    const channels = wishlistChannels || { push: true, email: false, whatsapp: false };
    const isPwaInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const pushPermission = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';

    // Market scan status
    const marketLots = parseInt(localStorage.getItem('mudream_market_lots') || '0');
    const marketLastScan = localStorage.getItem('mudream_market_last_scan');
    const scannerBtn = `<button class="btn-sm wl-scanner-install" id="wlInstallScanner" title="Habilitar scanner do mercado (grátis)">📌 Instalar scanner</button>`;
    const marketStatus = marketLots > 0
        ? `<div class="wl-market-status"><span class="wl-live-dot"></span> Live · <strong>${marketLots.toLocaleString()}</strong> itens no mercado${marketLastScan ? ` · scan ${timeAgo(marketLastScan)}` : ''}<div id="wishlistScannerStatus" class="wl-scanner-line">⚪ aguardando…</div>${scannerBtn}</div>`
        : `<div class="wl-market-status wl-market-status-warn">⚠️ Scanner ainda não rodou<div id="wishlistScannerStatus" class="wl-scanner-line">⚪ aguardando…</div>${scannerBtn}</div>`;

    const findings = getStoredFindings();
    const findingsHtml = findings.length === 0 ? marketStatus : marketStatus + `
        <div class="wl-findings-panel">
            <div class="wl-findings-header">
                <div class="wl-findings-title">✨ Encontrados no mercado <span class="wl-findings-count">${findings.length}</span></div>
                <div class="wl-findings-actions">
                    <button class="btn-sm" id="wlScanNow">🔄 Escanear agora</button>
                    <button class="btn-sm btn-danger" id="wlClearFindings">🗑️ Limpar</button>
                </div>
            </div>
            <div class="wl-findings-grid">
                ${findings.slice(0, 12).map(f => `
                    <div class="wl-finding-card">
                        <div class="wl-finding-img"><img src="${f.imgSrc}" alt="${escapeHtml(f.itemName)}" loading="lazy"></div>
                        <div class="wl-finding-body">
                            <div class="wl-finding-name">${escapeHtml(f.itemName)}</div>
                            ${(f.options || []).length ? `<div class="wl-finding-opts">${f.options.map(o => `<span class="wl-finding-chip">${o}</span>`).join('')}</div>` : ''}
                            ${f.price ? `<div class="wl-finding-price">💰 ${escapeHtml(f.price)}</div>` : ''}
                            <div class="wl-finding-time">${timeAgo(f.foundAt)}</div>
                        </div>
                        <div class="wl-finding-actions">
                            <a class="wl-finding-btn wl-finding-btn-primary" href="${f.detailUrl}" target="_blank" rel="noopener">🛒 Abrir no mercado ↗</a>
                            <button class="wl-finding-btn wl-finding-btn-secondary" data-quickview="${f.detailUrl}">👁️ Ver aqui</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = `
        ${findingsHtml}

        <!-- Jewel calculators -->
        <div class="calc-grid">
            <div class="calc-card">
                <h4>💎 Jewel → DC</h4>
                <div class="calc-row">
                    <input type="number" id="calcJewelDcQty" placeholder="Qtd de Jewels" min="1" value="1">
                    <select id="calcJewelDcType" class="admin-input" style="max-width:140px">
                        <option value="bless">Jewel of Bless</option>
                        <option value="soul">Jewel of Soul</option>
                        <option value="chaos">Jewel of Chaos</option>
                        <option value="creation">Jewel of Creation</option>
                        <option value="life">Jewel of Life</option>
                        <option value="harmony">Jewel of Harmony</option>
                        <option value="guardian">Jewel of Guardian</option>
                    </select>
                </div>
                <div class="calc-result" id="calcJewelDcResult">≈ 0 DC</div>
                <p class="calc-note">${t('calcNoteDc')}</p>
            </div>
            <div class="calc-card">
                <h4>💰 Jewel → ZEN</h4>
                <div class="calc-row">
                    <input type="number" id="calcJewelZenQty" min="1" value="1">
                    <select id="calcJewelZenType" class="admin-input" style="max-width:140px">
                        <option value="bless">Jewel of Bless</option>
                        <option value="soul">Jewel of Soul</option>
                        <option value="chaos">Jewel of Chaos</option>
                        <option value="creation">Jewel of Creation</option>
                        <option value="life">Jewel of Life</option>
                        <option value="harmony">Jewel of Harmony</option>
                        <option value="guardian">Jewel of Guardian</option>
                    </select>
                </div>
                <div class="calc-result" id="calcJewelZenResult">≈ 0 ZEN</div>
                <p class="calc-note">${t('calcNoteZen')}</p>
            </div>
        </div>

        <!-- Server selector -->
        <div class="wishlist-server-selector">
            ${WISHLIST_SERVERS.map(s => `
                <button class="wishlist-server-btn ${s.id === wishlistServer ? 'active' : ''}" data-server="${s.id}">${s.label}</button>
            `).join('')}
        </div>

        <!-- Notification setup card -->
        <div class="wishlist-notif-card">
            <div class="wishlist-notif-title">🔔 ${t('wishlistNotifTitle') || 'Como você quer ser avisado?'}</div>
            <div class="wishlist-notif-row">
                <label class="wishlist-notif-toggle">
                    <input type="checkbox" id="wlChPush" ${channels.push ? 'checked' : ''}>
                    <span>📲 Push (PWA)</span>
                </label>
                <small class="wishlist-notif-status">
                    ${isPwaInstalled ? t('wlPwaInstalled') : t('wlPwaNotInstalled')}
                    ${pushPermission !== 'granted' ? ` · <button class="btn-sm" id="wlReqPush">${t('wlReqPushBtn')}</button>` : ''}
                </small>
            </div>
            <div class="wishlist-notif-row">
                <label class="wishlist-notif-toggle">
                    <input type="checkbox" id="wlChEmail" ${channels.email ? 'checked' : ''}>
                    <span>📧 Email</span>
                </label>
                <input type="email" id="wlEmail" class="admin-input" placeholder="seu@email.com" value="${channels.emailAddress || ''}" style="max-width:240px">
            </div>
            <div class="wishlist-notif-row">
                <label class="wishlist-notif-toggle">
                    <input type="checkbox" id="wlChWhatsapp" ${channels.whatsapp ? 'checked' : ''}>
                    <span>💬 WhatsApp</span>
                </label>
                <input type="tel" id="wlPhone" class="admin-input" placeholder="+5511999999999" value="${channels.phone || ''}" style="max-width:200px">
            </div>
            <button class="btn-primary" id="wlSaveChannels">${t('wlSaveChannelsBtn')}</button>
            <p class="wishlist-notif-help">${t('wlNotifHelp')}</p>
        </div>

        <!-- Add new wishlist item form -->
        <div class="wishlist-add-card">
            <div class="wishlist-add-title">${t('wlAddItemTitle')}</div>
            <input type="text" id="wlSearch" class="admin-input" placeholder="${t('wlSearchPlaceholder')}">
            <div class="wishlist-filter-grid">
                <div>
                    <label>${t('wlCatLabel')}</label>
                    <select id="wlCategory" class="admin-input">
                        <option value="">${t('wlAnyOption')}</option>
                        ${WISHLIST_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label>${t('wlRarityLabel')}</label>
                    <select id="wlRarity" class="admin-input">
                        <option value="">${t('wlAnyOption')}</option>
                        ${WISHLIST_RARITIES.map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label>${t('wlMinLvlLabel')}</label>
                    <input type="number" id="wlMinLvl" class="admin-input" min="0" max="15" value="0">
                </div>
                <div>
                    <label>${t('wlMaxPriceLabel')}</label>
                    <input type="number" id="wlMaxZen" class="admin-input" placeholder="ex: 500" min="0">
                </div>
            </div>
            <label style="display:block;margin:10px 0 4px">${t('wlOptionsDesiredLabel')}</label>
            <div class="wishlist-opts">
                ${WISHLIST_OPTIONS.map(o => `
                    <label class="wishlist-opt-chip">
                        <input type="checkbox" name="wlOpt" value="${o.id}">
                        <span title="${o.desc}">${o.label}</span>
                    </label>
                `).join('')}
            </div>
            <button class="btn-primary wishlist-add-btn" id="wlAddBtn">${t('wlAddBtn')}</button>
        </div>

        <!-- Active wishlist -->
        <div class="wishlist-list-title">${t('wlMyItemsTitle')} (${wishlistItems.filter(i => i.server === wishlistServer).length})</div>
        <div class="wishlist-list" id="wishlistList">
            ${renderWishlistItems()}
        </div>
    `;

    wireWishlistEvents(container);
}

function renderWishlistItems() {
    const items = wishlistItems.filter(i => i.server === wishlistServer);
    if (items.length === 0) {
        return `<div class="empty-state"><div class="empty-icon">🛒</div><p>${t('wlEmptyForServer')}</p></div>`;
    }
    return items.map(item => `
        <div class="wishlist-item ${item.lastMatchAt ? 'matched' : ''}">
            <div class="wishlist-item-main">
                <div class="wishlist-item-name">${escapeHtml(item.itemName || t('wlAnyOption'))}</div>
                <div class="wishlist-item-meta">
                    ${item.category ? `<span class="wl-chip">📂 ${labelForCategory(item.category)}</span>` : ''}
                    ${item.rarity ? `<span class="wl-chip">⭐ ${item.rarity}</span>` : ''}
                    ${item.minLevel > 0 ? `<span class="wl-chip">+${item.minLevel}</span>` : ''}
                    ${item.maxPriceZen ? `<span class="wl-chip">💰 ≤${item.maxPriceZen}kk</span>` : ''}
                    ${(item.options || []).map(o => `<span class="wl-chip wl-opt">${o}</span>`).join('')}
                </div>
                ${item.lastMatchAt
                    ? `<div class="wishlist-item-found">${t('wlFoundAt', { when: timeAgo(item.lastMatchAt) })}</div>`
                    : `<div class="wishlist-item-status">${t('wlAwaiting')}</div>`}
            </div>
            <button class="btn-sm btn-danger wl-remove" data-id="${item.id}">🗑️</button>
        </div>
    `).join('');
}

function labelForCategory(id) {
    const c = WISHLIST_CATEGORIES.find(x => x.id === id);
    return c ? c.label : id;
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function timeAgo(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return t('wlSecAgo');
    if (min < 60) return t('wlMinAgo', { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t('wlHourAgo', { n: h });
    return t('wlDayAgo', { n: Math.floor(h / 24) });
}

// Jewel exchange rates (approximated to mudream current market)
const JEWEL_RATES = {
    bless:    { dc: 1.5, zen: 25 },
    soul:     { dc: 1.2, zen: 20 },
    chaos:    { dc: 3.0, zen: 50 },
    creation: { dc: 2.0, zen: 30 },
    life:     { dc: 2.5, zen: 40 },
    harmony:  { dc: 5.0, zen: 80 },
    guardian: { dc: 8.0, zen: 120 }
};

function updateCalculators() {
    const dcQty  = parseInt(document.getElementById('calcJewelDcQty')?.value) || 0;
    const dcType = document.getElementById('calcJewelDcType')?.value;
    const zenQty  = parseInt(document.getElementById('calcJewelZenQty')?.value) || 0;
    const zenType = document.getElementById('calcJewelZenType')?.value;
    if (dcType && JEWEL_RATES[dcType]) {
        const dcVal = (dcQty * JEWEL_RATES[dcType].dc).toFixed(1);
        document.getElementById('calcJewelDcResult').textContent = `≈ ${dcVal} DC`;
    }
    if (zenType && JEWEL_RATES[zenType]) {
        const zenVal = (zenQty * JEWEL_RATES[zenType].zen).toFixed(0);
        document.getElementById('calcJewelZenResult').textContent = `≈ ${zenVal}kk ZEN`;
    }
}

function openQuickView(url) {
    const safeUrl = url || 'https://mudream.online/pt/market';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal quickview-modal">
            <div class="modal-header">
                <h3>🛒 Mercado MU Dream</h3>
                <div class="quickview-actions">
                    <a class="btn-sm" href="${safeUrl}" target="_blank" rel="noopener">↗ Abrir no Chrome</a>
                    <button class="modal-close" type="button" aria-label="Fechar">✕</button>
                </div>
            </div>
            <div class="quickview-frame-wrap">
                <iframe src="${safeUrl}" class="quickview-frame" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>
                <div class="quickview-fallback">
                    ⚠️ Esse site bloqueia visualização embutida (Cloudflare/X-Frame).
                    <br><br>
                    <a class="btn-primary" href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 16px;border-radius:8px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#f5a623,#ff6600)">🛒 Abrir no Chrome →</a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    // Detect iframe load failure (X-Frame-Options block) and show fallback
    const iframe = overlay.querySelector('.quickview-frame');
    const fallback = overlay.querySelector('.quickview-fallback');
    let loaded = false;
    iframe.addEventListener('load', () => {
        loaded = true;
        try {
            // If we can read .location we know it loaded, otherwise it might be blocked
            iframe.contentWindow.location.href;
        } catch {
            // Cross-origin frame loaded fine — keep iframe visible
        }
    });
    // If iframe never fires load within 4s, show fallback
    setTimeout(() => {
        if (!loaded) {
            iframe.style.display = 'none';
            fallback.style.display = 'flex';
        }
    }, 4000);
}

function wireWishlistEvents(container) {
    // Findings panel actions
    document.getElementById('wlScanNow')?.addEventListener('click', () => {
        showToast('🔍 Escaneando mercado...', 'info', 2000);
        checkMarketForWishlist();
    });
    document.getElementById('wlClearFindings')?.addEventListener('click', () => {
        if (!confirm('Limpar todos os itens encontrados?')) return;
        clearStoredFindings();
        renderWishlist();
    });
    document.getElementById('wlInstallScanner')?.addEventListener('click', showBookmarkletModal);
    container.querySelectorAll('[data-quickview]').forEach(btn => {
        btn.addEventListener('click', () => openQuickView(btn.dataset.quickview));
    });

    // Calculators
    ['calcJewelDcQty', 'calcJewelDcType', 'calcJewelZenQty', 'calcJewelZenType'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateCalculators);
        if (el) el.addEventListener('change', updateCalculators);
    });
    updateCalculators();

    // Server selector
    container.querySelectorAll('.wishlist-server-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            wishlistServer = btn.dataset.server;
            localStorage.setItem('mudream_wishlist_server', wishlistServer);
            renderWishlist();
        });
    });

    // Notification channels
    const reqPush = document.getElementById('wlReqPush');
    if (reqPush) {
        reqPush.addEventListener('click', async () => {
            if ('Notification' in window) {
                const perm = await Notification.requestPermission();
                showToast(perm === 'granted' ? t('wlPushGranted') : t('wlPushDenied'), perm === 'granted' ? 'success' : 'warning');
                renderWishlist();
            }
        });
    }

    document.getElementById('wlSaveChannels')?.addEventListener('click', async () => {
        const channels = {
            push:     document.getElementById('wlChPush').checked,
            email:    document.getElementById('wlChEmail').checked,
            whatsapp: document.getElementById('wlChWhatsapp').checked,
            emailAddress: document.getElementById('wlEmail').value.trim(),
            phone:    document.getElementById('wlPhone').value.trim()
        };
        if (channels.email && !/^[^@\s]+@[^@\s]+\.\w+$/.test(channels.emailAddress)) {
            showToast(t('wlToastInvalidEmail'), 'warning'); return;
        }
        if (channels.whatsapp && !/^\+?\d{10,15}$/.test(channels.phone.replace(/\s/g, ''))) {
            showToast(t('wlToastInvalidPhone'), 'warning'); return;
        }
        try {
            await saveWishlistChannels(channels);
            wishlistChannels = channels;
            showToast(t('wlToastSaved'), 'success');
        } catch (e) {
            showToast(t('wlToastErrorSave'), 'warning');
        }
    });

    // Add new item — disable during submit to prevent double clicks
    document.getElementById('wlAddBtn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (btn.disabled) return;
        const item = {
            server: wishlistServer,
            itemName: document.getElementById('wlSearch').value.trim(),
            category: document.getElementById('wlCategory').value || null,
            rarity:   document.getElementById('wlRarity').value || null,
            minLevel: parseInt(document.getElementById('wlMinLvl').value) || 0,
            maxPriceZen: parseInt(document.getElementById('wlMaxZen').value) || null,
            options: Array.from(container.querySelectorAll('input[name="wlOpt"]:checked')).map(c => c.value)
        };
        if (!item.itemName && !item.category) {
            showToast(t('wlToastNoFilter'), 'warning'); return;
        }
        btn.disabled = true;
        const origText = btn.innerHTML;
        btn.innerHTML = '⏳ Salvando...';
        try {
            const saved = await saveWishlistItem(item);
            wishlistItems.push(saved.item || { ...item, id: 'local-' + Date.now() });
            localStorage.setItem('mudream_wishlist', JSON.stringify(wishlistItems));
            showToast(t('wlToastAdded'), 'success');
            renderWishlist();
            checkMarketForWishlist();
            return;
        } catch (e) {
            const detail = e?.message && e.message !== 'Save failed' ? ` — ${e.message}` : '';
            showToast(t('wlToastErrorAdd') + detail, 'warning', 6000);
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    });

    // Remove items
    container.querySelectorAll('.wl-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (!confirm(t('wlConfirmRemove'))) return;
            try {
                await deleteWishlistItem(id);
                wishlistItems = wishlistItems.filter(i => i.id !== id);
                localStorage.setItem('mudream_wishlist', JSON.stringify(wishlistItems));
                renderWishlist();
            } catch {
                showToast(t('wlToastErrorRemove'), 'warning');
            }
        });
    });
}

// ==================== MARKET SCRAPING (client-side) ====================
// Because Cloudflare blocks server-side fetches, we scrape from the browser.
// Runs every 5 minutes when the wishlist tab is open OR PWA is active.

async function checkMarketForWishlist() {
    const items = wishlistItems.filter(i => i.server === wishlistServer);
    if (items.length === 0) return;

    const server = WISHLIST_SERVERS.find(s => s.id === wishlistServer);
    if (!server) return;

    try {
        // Use backend proxy — direct fetch to mudream.online is blocked by CORS.
        const res = await fetch(`/api/market/scan?server=${server.mdId}`, { credentials: 'same-origin' });
        if (!res.ok) {
            setScannerStatus('offline', 'Scanner offline (HTTP ' + res.status + ')');
            return;
        }
        const data = await res.json();
        if (!data.ok && (!data.items || data.items.length === 0)) {
            const reason = data.status === 403 || data.status === 503
                ? 'Cloudflare bloqueou (403). Scanner temporariamente indisponível.'
                : ('Falha na leitura (' + (data.error || data.status || '??') + ')');
            setScannerStatus('offline', reason);
            return;
        }
        setScannerStatus('online', (data.total || 0) + ' anúncios lidos');
        const matches = matchWishlistAgainstMarket(data.items || [], items);
        // Store the total market size for display
        try { localStorage.setItem('mudream_market_lots', String(data.total || 0)); } catch {}
        try { localStorage.setItem('mudream_market_last_scan', new Date().toISOString()); } catch {}
        if (matches.length === 0) return;

        // Send matches to backend so it can dispatch notifications
        await fetch('/api/wishlist/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ matches })
        });

        // Persist findings locally so the panel survives refreshes
        storeFindings(matches);

        // Local notification & update UI
        matches.forEach(m => {
            const wi = wishlistItems.find(i => i.id === m.wishlistId);
            if (wi) wi.lastMatchAt = new Date().toISOString();
            if (alarm && typeof alarm.sendNotification === 'function') {
                alarm.sendNotification(t('wlNotifFound'), t('wlNotifFoundBody', { name: m.itemName }));
            }
        });

        // 🎯 Pop overlay on top of everything telling user to go shop
        showFoundItemOverlay(matches);

        renderWishlist();
    } catch (e) {
        // CORS or Cloudflare may block — log silently for now
        console.warn('Market check failed:', e.message);
    }
}

// Compares a list of market items (from backend) against the user's wishlist
function matchWishlistAgainstMarket(marketItems, wishlistItems) {
    const matches = [];
    for (const mi of marketItems) {
        const nameLower = (mi.name || '').toLowerCase();
        if (!nameLower) continue;
        for (const wi of wishlistItems) {
            const target = (wi.itemName || '').toLowerCase().trim();
            if (target && !nameLower.includes(target)) continue;
            matches.push({
                wishlistId: wi.id,
                itemName: mi.name,
                imgSrc: mi.image,
                options: [],
                price: null,
                detailUrl: 'https://mudream.online/pt/market',
                foundAt: new Date().toISOString()
            });
            break;
        }
    }
    return matches;
}

function parseMarketHtml(html, wishlistItems) {
    const matches = [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Item cards in MU Dream usually wrap an <img> inside an <a> or button.
    // Walk every meaningful <img> and try to extract context.
    const imgs = doc.querySelectorAll('img[alt]');
    for (const img of imgs) {
        const name = (img.alt || '').trim();
        const nameLower = name.toLowerCase();
        if (!name || /menu|logo|servers|favicon/i.test(img.src)) continue;
        if (!/items_seasons|item/i.test(img.src)) continue;

        // climb up to the card container to read price / options
        let card = img.closest('[class*="card"], [class*="item"], li, article, div');
        // stop climbing if we'd reach <body>
        if (!card || card.tagName === 'BODY') card = img.parentElement;
        const cardText = (card?.textContent || '').replace(/\s+/g, ' ').trim();

        // Extract price tokens (look for ZEN xxkk, DC xx, etc.)
        const priceMatch = cardText.match(/(?:ZEN|DC|R\$|kk)\s*[\d.,]+|[\d.,]+\s*(?:kk|DC|ZEN)/i);
        const price = priceMatch ? priceMatch[0] : null;

        // Extract option chips (LUCK/MH/SD/DD/REF/DSR/ZEN/EXE/etc.)
        const optChips = Array.from(cardText.matchAll(/\b(LUCK|MH|SD|DD|REF|DSR|ZEN|EXE|ANC|SOC|DMG|DMGL|ASPD|RHP|RMP)\b/g))
            .map(m => m[1])
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 6);

        // Try to find an anchor (deep link to item)
        const a = card?.closest('a') || card?.querySelector('a[href]');
        const href = a?.getAttribute('href');
        const detailUrl = href ? new URL(href, 'https://mudream.online').toString() : 'https://mudream.online/pt/market';

        for (const wi of wishlistItems) {
            const target = (wi.itemName || '').toLowerCase().trim();
            if (target && !nameLower.includes(target)) continue;
            // require at least one of requested options if user marked any
            if ((wi.options || []).length > 0) {
                const hasAny = wi.options.some(opt => optChips.includes(opt));
                if (!hasAny) continue;
            }
            matches.push({
                wishlistId: wi.id,
                itemName: name,
                imgSrc: img.src,
                price,
                options: optChips,
                detailUrl,
                foundAt: new Date().toISOString()
            });
            break;
        }
    }
    return matches;
}

// Show a popup overlay when new items are found
let _shownFindingKeys = new Set();
function showFoundItemOverlay(findings) {
    // Filter to new findings only (not yet shown this session)
    const fresh = findings.filter(f => {
        const key = `${f.itemName}|${f.price || ''}`;
        if (_shownFindingKeys.has(key)) return false;
        _shownFindingKeys.add(key);
        return true;
    });
    if (fresh.length === 0) return;

    // Remove any existing found-item overlay so we don't stack
    document.querySelector('.found-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay found-overlay';
    overlay.innerHTML = `
        <div class="modal found-modal">
            <button class="modal-close found-close" aria-label="Fechar">✕</button>
            <div class="found-banner">
                <div class="found-bolt">⚡</div>
                <div class="found-title">🎯 Item da sua wishlist apareceu!</div>
                <div class="found-sub">${fresh.length > 1 ? `${fresh.length} itens encontrados` : 'Corre pro mercado antes que outro pegue!'}</div>
            </div>
            <div class="found-list">
                ${fresh.slice(0, 4).map(f => `
                    <div class="found-item">
                        <div class="found-item-img">
                            <img src="${f.imgSrc}" alt="${escapeHtml(f.itemName)}" loading="lazy">
                        </div>
                        <div class="found-item-info">
                            <div class="found-item-name">${escapeHtml(f.itemName)}</div>
                            ${(f.options || []).length ? `<div class="found-item-opts">${f.options.map(o => `<span class="found-item-chip">${o}</span>`).join('')}</div>` : ''}
                            ${f.price ? `<div class="found-item-price">💰 ${escapeHtml(f.price)}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="found-actions">
                <a class="found-btn found-btn-primary" href="${fresh[0].detailUrl}" target="_blank" rel="noopener" id="foundGoShop">
                    🛒 Ir pra loja agora ↗
                </a>
                <button class="found-btn found-btn-secondary" id="foundQuickView" data-url="${fresh[0].detailUrl}">
                    👁️ Ver aqui dentro
                </button>
                <button class="found-btn found-btn-ghost" id="foundLater">Talvez depois</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('modal-locked');

    const close = () => {
        overlay.remove();
        document.body.classList.remove('modal-locked');
    };
    overlay.querySelector('.found-close').addEventListener('click', close);
    overlay.querySelector('#foundLater').addEventListener('click', close);
    overlay.querySelector('#foundGoShop').addEventListener('click', () => setTimeout(close, 200));
    overlay.querySelector('#foundQuickView').addEventListener('click', (e) => {
        const url = e.currentTarget.dataset.url;
        close();
        openQuickView(url);
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Vibrate + play alarm tone if available
    if (navigator.vibrate) navigator.vibrate([100, 60, 100, 60, 200]);
    if (typeof alarm !== 'undefined' && typeof alarm.play === 'function') alarm.play();
}

// Recent findings persist locally so the user always sees what was found
function getStoredFindings() {
    try { return JSON.parse(localStorage.getItem('mudream_wl_findings') || '[]'); } catch { return []; }
}
function storeFindings(matches) {
    const existing = getStoredFindings();
    // Prepend new ones, keep most recent 50, dedupe by (wishlistId + itemName + price)
    const merged = [...matches.map(m => ({ ...m })), ...existing];
    const seen = new Set();
    const dedup = [];
    for (const m of merged) {
        const key = `${m.wishlistId}|${m.itemName}|${m.price || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(m);
        if (dedup.length >= 50) break;
    }
    localStorage.setItem('mudream_wl_findings', JSON.stringify(dedup));
}
function clearStoredFindings() {
    localStorage.removeItem('mudream_wl_findings');
}

function startWishlistMarketChecker() {
    if (_wishlistCheckTimer) clearInterval(_wishlistCheckTimer);
    // Every 5 minutes
    _wishlistCheckTimer = setInterval(checkMarketForWishlist, 5 * 60 * 1000);
}

// Hook into existing tab switcher
function initWishlist() {
    const tabBtn = document.getElementById('tabWishlist');
    if (!tabBtn) return;
    tabBtn.addEventListener('click', async () => {
        await loadWishlist();
        renderWishlist();
        startWishlistMarketChecker();
    });
}

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initWishlist);
