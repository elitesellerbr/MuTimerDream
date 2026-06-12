// ==================== EXCHANGE MODULE ====================
// P2P trade board — list items, find offers, contact other players via Discord/in-game.
// No money changes hands through MU Timer Dream — users trade directly per server rules.

const EXCHANGE_OPTIONS = ['LUCK', 'MH', 'SD', 'DD', 'REF', 'DSR', 'ZEN', 'EXE', 'DMGL', 'DMG', 'ASPD', 'RHP', 'RMP'];
const EXCHANGE_PRICE_TYPES = [
    { id: 'all',   label: 'All' },
    { id: 'dc',    label: 'DC' },
    { id: 'zen',   label: 'ZEN' },
    { id: 'offer', label: 'Offer' }
];
const EXCHANGE_STATUSES = [
    { id: 'all',       label: 'All' },
    { id: 'available', label: 'Available' },
    { id: 'sold',      label: 'Sold' },
    { id: 'expired',   label: 'Expired' }
];

let exchangeListings = [];
let exchangeMyContact = null;
let exchangeFilters = {
    server: 'rampage-x20',
    options: new Set(),
    priceType: 'all',
    status: 'available',
    search: '',
    view: 'all'  // 'all' | 'matches' | 'mine'
};

async function loadExchange() {
    try {
        const [listingsRes, contactRes] = await Promise.all([
            fetch('/api/exchange/listings?status=' + exchangeFilters.status + '&priceType=' + exchangeFilters.priceType + (exchangeFilters.options.size ? '&options=' + [...exchangeFilters.options].join(',') : '')),
            fetch('/api/exchange/contact-info', { credentials: 'same-origin' })
        ]);
        const data = await listingsRes.json();
        exchangeListings = data.listings || [];
        if (contactRes.ok) {
            exchangeMyContact = await contactRes.json();
        }
    } catch (e) {
        console.warn('Exchange load failed:', e.message);
        exchangeListings = [];
    }
}

function renderExchange() {
    const container = document.getElementById('exchangeContent');
    if (!container) return;

    const isLoggedIn = !!(typeof currentUser !== 'undefined' && currentUser);
    const visibleListings = filterListingsForView();
    const myListings = exchangeListings.filter(l => l.ownerId === (currentUser?.id));
    const totalListings = exchangeListings.length;
    const availableMine = myListings.filter(l => l.status === 'available').length;

    container.innerHTML = `
        <div class="exchange-layout">
            <!-- LEFT SIDEBAR -->
            <aside class="exchange-sidebar">
                <div class="exchange-sidebar-title">↔️ MY EXCHANGE LISTINGS</div>
                <div class="exchange-stat-row">
                    <span><span class="dot dot-green"></span> Available</span>
                    <span class="exchange-stat-val">${availableMine}</span>
                </div>
                <div class="exchange-stat-row">
                    <span><span class="dot dot-orange"></span> My Listings</span>
                    <span class="exchange-stat-val">${myListings.length}</span>
                </div>
                <div class="exchange-stat-row exchange-stat-total">
                    <span>Total Listings</span>
                    <span class="exchange-stat-val">${totalListings}</span>
                </div>

                <div class="exchange-sidebar-divider"></div>

                <div class="exchange-sidebar-subtitle">🔍 SEARCH & FILTER</div>
                <input type="text" id="exchSearch" class="admin-input" placeholder="Search items..." value="${escapeHtml(exchangeFilters.search)}">

                <div class="exchange-sidebar-label">OPTION FILTER</div>
                <div class="exchange-opt-chips">
                    ${EXCHANGE_OPTIONS.map(o => `
                        <button class="exch-opt-chip ${exchangeFilters.options.has(o) ? 'on' : ''}" data-opt="${o}">${o}</button>
                    `).join('')}
                </div>

                <div class="exchange-sidebar-label">PRICE TYPE</div>
                <select id="exchPriceType" class="admin-input">
                    ${EXCHANGE_PRICE_TYPES.map(p => `<option value="${p.id}" ${exchangeFilters.priceType === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
                </select>

                <div class="exchange-sidebar-label">STATUS</div>
                <select id="exchStatus" class="admin-input">
                    ${EXCHANGE_STATUSES.map(s => `<option value="${s.id}" ${exchangeFilters.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
                </select>

                <button class="btn-sm exch-reset-btn" id="exchResetFilters">↺ Reset Filters</button>

                <div class="exchange-pro-tip">
                    <div class="exch-tip-title">⭐ PRO TIP</div>
                    <div class="exch-tip-body">Add your Discord and in-game name to make it easier for players to reach you.</div>
                    <button class="btn-sm exch-tip-btn" id="exchManageContact">👤 Manage Contact Info</button>
                </div>
            </aside>

            <!-- MAIN -->
            <div class="exchange-main">
                <div class="exchange-banner">
                    <div class="exch-banner-icon">↔️</div>
                    <div class="exch-banner-text">
                        <div class="exch-banner-title">Collection Exchange</div>
                        <div class="exch-banner-sub">List items you have available and discover offers from other MuDream players.</div>
                    </div>
                    <div class="exch-banner-actions">
                        <button class="btn-primary" id="exchNewListing">+ List Item</button>
                        <button class="btn-sm" id="exchManageContactTop">👤 Manage Contact Info</button>
                    </div>
                </div>

                <div class="exchange-tabs">
                    <button class="exch-tab ${exchangeFilters.view === 'all' ? 'active' : ''}" data-view="all">All <span class="exch-tab-count">${totalListings}</span></button>
                    <button class="exch-tab ${exchangeFilters.view === 'matches' ? 'active' : ''}" data-view="matches">Matches for Me</button>
                    <button class="exch-tab ${exchangeFilters.view === 'mine' ? 'active' : ''}" data-view="mine">My Listings <span class="exch-tab-count">${myListings.length}</span></button>
                    <div class="exch-tabs-right">
                        <button class="btn-sm" id="exchRefresh">⟳ Refresh</button>
                    </div>
                </div>

                <div class="exchange-table">
                    <div class="exch-row exch-row-header">
                        <span></span>
                        <span>ITEM</span>
                        <span>DISCORD</span>
                        <span>IN-GAME</span>
                        <span>STATUS</span>
                        <span>PRICE</span>
                        <span>EXPIRES</span>
                        <span></span>
                    </div>
                    ${visibleListings.length === 0 ? `
                        <div class="exchange-empty">
                            <div class="empty-icon">📭</div>
                            <p>${exchangeFilters.view === 'mine' ? 'Você ainda não tem listagens. Clique em "+ List Item" para criar uma.' : 'Nenhuma listagem com esses filtros.'}</p>
                        </div>
                    ` : visibleListings.map(l => renderListingRow(l)).join('')}
                </div>

                <div class="exchange-footer-note">
                    <div class="exch-note-icon">ℹ️</div>
                    <div>
                        <strong>How Exchange Works:</strong> MU Timer Dream is a connection platform only — we do not handle items, currency, or payments. Trade directly in-game according to <strong>MuDream</strong> server policies. <strong>Real Money Trade (RMT) is not allowed.</strong>
                    </div>
                </div>
            </div>
        </div>
    `;

    wireExchangeEvents(container);
}

function filterListingsForView() {
    let arr = exchangeListings;
    if (exchangeFilters.view === 'mine' && currentUser) {
        arr = arr.filter(l => l.ownerId === currentUser.id);
    }
    if (exchangeFilters.view === 'matches') {
        // Match: listing item appears in user's wishlist
        const wishlist = (typeof wishlistItems !== 'undefined' ? wishlistItems : []);
        const wantedNames = new Set(wishlist.map(w => (w.itemName || '').toLowerCase()));
        arr = arr.filter(l => {
            const name = (l.itemName || '').toLowerCase();
            return [...wantedNames].some(w => w && name.includes(w));
        });
    }
    if (exchangeFilters.search) {
        const s = exchangeFilters.search.toLowerCase();
        arr = arr.filter(l => (l.itemName || '').toLowerCase().includes(s));
    }
    return arr;
}

function renderListingRow(l) {
    const expiresMs = new Date(l.expiresAt).getTime() - Date.now();
    let expiresLabel;
    let expiresClass = '';
    if (expiresMs <= 0) {
        expiresLabel = 'Expired';
        expiresClass = 'expired';
    } else {
        const days = Math.floor(expiresMs / 86400000);
        const hours = Math.floor((expiresMs % 86400000) / 3600000);
        const mins  = Math.floor((expiresMs % 3600000) / 60000);
        expiresLabel = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        if (days < 1) expiresClass = 'expiring';
    }
    const listedAgo = timeAgoEx(l.createdAt);

    let priceHtml;
    if (l.priceType === 'offer') priceHtml = '<span class="exch-price-offer">Offer</span>';
    else if (l.priceType === 'dc') priceHtml = `<span class="exch-price-dc">DC ${l.priceValue || '?'}</span>`;
    else if (l.priceType === 'zen') priceHtml = `<span class="exch-price-zen">${l.priceValue || '?'}kk ZEN</span>`;
    else priceHtml = '<span class="exch-price-offer">—</span>';

    const isMine = currentUser && l.ownerId === currentUser.id;
    const contactUrl = l.discord ? `https://discord.com/users/${encodeURIComponent(l.discord)}` : null;

    return `
        <div class="exch-row ${l.status === 'sold' ? 'is-sold' : ''} ${l.status === 'expired' ? 'is-expired' : ''}">
            <div class="exch-cell-img">
                ${l.itemImage
                    ? `<img src="${l.itemImage}" alt="${escapeHtml(l.itemName)}" loading="lazy">`
                    : `<span class="exch-img-fallback">📦</span>`}
            </div>
            <div class="exch-cell-item">
                <div class="exch-item-name">${escapeHtml(l.itemName)}</div>
                ${(l.options || []).length ? `<div class="exch-item-opts">${l.options.map(o => `<span class="exch-item-chip">${o}</span>`).join('')}</div>` : ''}
            </div>
            <div class="exch-cell-discord">${l.discord ? `<span class="exch-contact">💬 ${escapeHtml(l.discord)}</span>` : '<span class="exch-na">—</span>'}</div>
            <div class="exch-cell-ingame">${l.ingame ? `<span class="exch-contact">👤 ${escapeHtml(l.ingame)}</span>` : '<span class="exch-na">—</span>'}</div>
            <div class="exch-cell-status">
                <span class="exch-status-pill exch-status-${l.status}">${l.status === 'available' ? '🟢 Available' : l.status === 'sold' ? '🔘 Sold' : '⚪ Expired'}</span>
            </div>
            <div class="exch-cell-price">${priceHtml}</div>
            <div class="exch-cell-expires ${expiresClass}">
                <div>🕐 ${expiresLabel}</div>
                <div class="exch-listed-ago">Listed ${listedAgo} ago</div>
            </div>
            <div class="exch-cell-action">
                ${isMine
                    ? `<button class="btn-sm btn-danger" data-act="delete" data-id="${l.id}">🗑️</button>
                       ${l.status === 'available' ? `<button class="btn-sm" data-act="sold" data-id="${l.id}">Mark Sold</button>` : ''}`
                    : `<button class="btn-sm btn-contact" data-discord="${escapeHtml(l.discord || '')}" data-ingame="${escapeHtml(l.ingame || '')}">💬 Contact</button>`
                }
            </div>
        </div>
    `;
}

function timeAgoEx(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'now';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

function wireExchangeEvents(container) {
    // Search
    document.getElementById('exchSearch')?.addEventListener('input', (e) => {
        exchangeFilters.search = e.target.value;
        renderExchange();
    });

    // Option chips
    container.querySelectorAll('.exch-opt-chip').forEach(btn => {
        btn.addEventListener('click', async () => {
            const opt = btn.dataset.opt;
            if (exchangeFilters.options.has(opt)) exchangeFilters.options.delete(opt);
            else exchangeFilters.options.add(opt);
            await loadExchange();
            renderExchange();
        });
    });

    // Price type & status
    document.getElementById('exchPriceType')?.addEventListener('change', async (e) => {
        exchangeFilters.priceType = e.target.value;
        await loadExchange();
        renderExchange();
    });
    document.getElementById('exchStatus')?.addEventListener('change', async (e) => {
        exchangeFilters.status = e.target.value;
        await loadExchange();
        renderExchange();
    });

    document.getElementById('exchResetFilters')?.addEventListener('click', async () => {
        exchangeFilters = {
            server: 'rampage-x20',
            options: new Set(),
            priceType: 'all',
            status: 'available',
            search: '',
            view: 'all'
        };
        await loadExchange();
        renderExchange();
    });

    // Tabs
    container.querySelectorAll('.exch-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            exchangeFilters.view = btn.dataset.view;
            renderExchange();
        });
    });

    document.getElementById('exchRefresh')?.addEventListener('click', async () => {
        await loadExchange();
        renderExchange();
    });

    // New listing
    document.getElementById('exchNewListing')?.addEventListener('click', () => showExchangeListingModal());

    // Contact info
    const openContact = () => showExchangeContactModal();
    document.getElementById('exchManageContact')?.addEventListener('click', openContact);
    document.getElementById('exchManageContactTop')?.addEventListener('click', openContact);

    // Row actions
    container.querySelectorAll('[data-act="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this listing?')) return;
            await fetch(`/api/exchange/listings/${btn.dataset.id}`, { method: 'DELETE', credentials: 'same-origin' });
            await loadExchange();
            renderExchange();
        });
    });
    container.querySelectorAll('[data-act="sold"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`/api/exchange/listings/${btn.dataset.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ status: 'sold' })
            });
            await loadExchange();
            renderExchange();
        });
    });
    container.querySelectorAll('.btn-contact').forEach(btn => {
        btn.addEventListener('click', () => {
            const discord = btn.dataset.discord;
            const ingame = btn.dataset.ingame;
            const text = `${discord ? '💬 Discord: ' + discord : ''}${discord && ingame ? '\n' : ''}${ingame ? '👤 In-game: ' + ingame : ''}`;
            if (text) {
                navigator.clipboard.writeText(discord || ingame).catch(() => {});
                alert(`${text}\n\n(Copiado para área de transferência)`);
            } else {
                alert('Este vendedor não configurou contato.');
            }
        });
    });
}

function showExchangeListingModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width:520px">
            <div class="modal-header">
                <h3>💱 List Item for Exchange</h3>
                <button class="modal-close" type="button">✕</button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
                <div>
                    <label>Nome do item</label>
                    <input id="elnName" class="admin-input" placeholder="Ex: Dragon Knight Armor +13">
                </div>
                <div>
                    <label>URL da imagem (opcional)</label>
                    <input id="elnImg" class="admin-input" placeholder="https://dreamassets.fra1.cdn..." >
                </div>
                <div>
                    <label>Opções do item</label>
                    <div class="exch-opt-chips" id="elnOptsWrap">
                        ${EXCHANGE_OPTIONS.map(o => `<button type="button" class="exch-opt-chip" data-opt="${o}">${o}</button>`).join('')}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:end">
                    <div>
                        <label>Preço</label>
                        <select id="elnPriceType" class="admin-input">
                            <option value="offer">Offer (negociar)</option>
                            <option value="dc">DC (Dream Coin)</option>
                            <option value="zen">ZEN (kk)</option>
                        </select>
                    </div>
                    <div>
                        <label>Valor</label>
                        <input id="elnPriceVal" type="number" min="0" class="admin-input" placeholder="ex: 150">
                    </div>
                </div>
                <p style="color:var(--text-muted);font-size:11.5px;margin:0">⚠️ Listagem expira em 10 dias. RMT (Real Money Trade) NÃO é permitido — apenas trocas in-game.</p>
                <button class="btn-primary" id="elnSubmit">+ Criar listagem</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const selectedOpts = new Set();
    overlay.querySelectorAll('#elnOptsWrap .exch-opt-chip').forEach(b => {
        b.addEventListener('click', () => {
            const o = b.dataset.opt;
            if (selectedOpts.has(o)) { selectedOpts.delete(o); b.classList.remove('on'); }
            else { selectedOpts.add(o); b.classList.add('on'); }
        });
    });

    overlay.querySelector('#elnSubmit').addEventListener('click', async () => {
        const itemName = overlay.querySelector('#elnName').value.trim();
        if (!itemName) { alert('Informe o nome do item.'); return; }
        const payload = {
            server: 'rampage-x20',
            itemName,
            itemImage: overlay.querySelector('#elnImg').value.trim() || null,
            options: [...selectedOpts],
            priceType: overlay.querySelector('#elnPriceType').value,
            priceValue: parseFloat(overlay.querySelector('#elnPriceVal').value) || 0
        };
        try {
            const res = await fetch('/api/exchange/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed');
            close();
            await loadExchange();
            renderExchange();
            if (typeof showToast === 'function') showToast('✅ Listagem criada!', 'success');
        } catch {
            alert('Erro ao criar listagem.');
        }
    });
}

function showExchangeContactModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width:440px">
            <div class="modal-header">
                <h3>👤 Manage Contact Info</h3>
                <button class="modal-close" type="button">✕</button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
                <p style="color:var(--text-muted);font-size:12px;margin:0">Adicione seu Discord e nome in-game pra outros jogadores te encontrarem.</p>
                <div>
                    <label>💬 Discord tag</label>
                    <input id="ecnDiscord" class="admin-input" placeholder="seunick ou seunick#1234" value="${escapeHtml(exchangeMyContact?.discord || '')}">
                </div>
                <div>
                    <label>👤 Nome in-game</label>
                    <input id="ecnIngame" class="admin-input" placeholder="Seu char principal" value="${escapeHtml(exchangeMyContact?.ingame || '')}">
                </div>
                <button class="btn-primary" id="ecnSave">💾 Salvar contato</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#ecnSave').addEventListener('click', async () => {
        const discord = overlay.querySelector('#ecnDiscord').value.trim();
        const ingame  = overlay.querySelector('#ecnIngame').value.trim();
        try {
            await fetch('/api/exchange/contact-info', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ discord, ingame })
            });
            exchangeMyContact = { discord, ingame };
            close();
            if (typeof showToast === 'function') showToast('💾 Contato salvo!', 'success');
            await loadExchange();
            renderExchange();
        } catch {
            alert('Erro ao salvar.');
        }
    });
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initExchange() {
    const tabBtn = document.getElementById('tabExchange');
    if (!tabBtn) return;
    tabBtn.addEventListener('click', async () => {
        await loadExchange();
        renderExchange();
    });
}
document.addEventListener('DOMContentLoaded', initExchange);
