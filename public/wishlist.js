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
    if (!res.ok) throw new Error('Save failed');
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

    const isLoggedIn = !!document.cookie.match(/session=/);
    if (!isLoggedIn) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><p>${t('wishlistLoginRequired') || 'Faça login para usar a Wishlist.'}</p></div>`;
        return;
    }

    const channels = wishlistChannels || { push: true, email: false, whatsapp: false };
    const isPwaInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const pushPermission = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';

    container.innerHTML = `
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

function wireWishlistEvents(container) {
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

    // Add new item
    document.getElementById('wlAddBtn')?.addEventListener('click', async () => {
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
        try {
            const saved = await saveWishlistItem(item);
            wishlistItems.push(saved.item || { ...item, id: 'local-' + Date.now() });
            localStorage.setItem('mudream_wishlist', JSON.stringify(wishlistItems));
            showToast(t('wlToastAdded'), 'success');
            renderWishlist();
            checkMarketForWishlist();
        } catch (e) {
            showToast(t('wlToastErrorAdd'), 'warning');
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
        // Try fetching market JSON if MU Dream exposes one, fallback to HTML parse
        const url = `https://mudream.online/pt/market?server=${server.mdId}`;
        const res = await fetch(url, { credentials: 'omit', mode: 'cors' });
        if (!res.ok) return;
        const html = await res.text();
        const matches = parseMarketHtml(html, items);
        if (matches.length === 0) return;

        // Send matches to backend so it can dispatch notifications
        await fetch('/api/wishlist/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ matches })
        });

        // Local notification & update UI
        matches.forEach(m => {
            const wi = wishlistItems.find(i => i.id === m.wishlistId);
            if (wi) wi.lastMatchAt = new Date().toISOString();
            if (alarm && typeof alarm.sendNotification === 'function') {
                alarm.sendNotification(t('wlNotifFound'), t('wlNotifFoundBody', { name: m.itemName }));
            }
        });
        renderWishlist();
    } catch (e) {
        // CORS or Cloudflare may block — log silently for now
        console.warn('Market check failed:', e.message);
    }
}

function parseMarketHtml(html, wishlistItems) {
    const matches = [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // MU Dream uses <img alt="item name +N (xQ)">; price shown as ZEN/DC
    const cards = doc.querySelectorAll('img[alt]');
    for (const img of cards) {
        const name = (img.alt || '').toLowerCase();
        if (!name || /menu|logo|servers/i.test(img.src)) continue;
        for (const wi of wishlistItems) {
            const target = (wi.itemName || '').toLowerCase().trim();
            if (target && !name.includes(target)) continue;
            // Match!
            matches.push({
                wishlistId: wi.id,
                itemName: img.alt,
                imgSrc: img.src,
                foundAt: new Date().toISOString()
            });
            break;
        }
    }
    return matches;
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
