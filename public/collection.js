let collectionItems = new Set();
let collectionAdds = {}; // { itemId: ['luck', 'skill', ...] }
// Default: hide obtained items (they're "archived" under the Obtained tab)
let collectionFilter = localStorage.getItem('mudream_col_filter') || 'missing';
let viewingOther = null;
let viewingGuildMember = null;

const AVAILABLE_ADDS = [
    { id: 'luck', label: '+Luck', icon: '🍀', color: '#4caf50' },
    { id: 'skill', label: '+Skill', icon: '⚡', color: '#ff9800' },
    { id: 'additional', label: '+DD', icon: '💥', color: '#f44336' },
    { id: 'pvm', label: '+PvM', icon: '🗡️', color: '#ff5722' },
    { id: 'sd', label: '+SD', icon: '🛡️', color: '#9c27b0' },
    { id: 'life', label: '+Life', icon: '❤️', color: '#e91e63' },
    { id: 'mana', label: '+Mana', icon: '💙', color: '#2196f3' },
    { id: 'zen', label: '+Zen', icon: '💰', color: '#ffc107' }
];

const ITEM_IMG_BASE = 'https://dreamassets.fra1.cdn.digitaloceanspaces.com/items_seasons/6plus/';
const ITEM_IMG_MAP = {
    // DK Sets
    'dk-leather-helm': '7/5', 'dk-leather-armor': '8/5', 'dk-leather-pants': '9/5', 'dk-leather-gloves': '10/5', 'dk-leather-boots': '11/5',
    'dk-bronze-helm': '7/0', 'dk-bronze-armor': '8/0', 'dk-bronze-pants': '9/0', 'dk-bronze-gloves': '10/0', 'dk-bronze-boots': '11/0',
    'dk-scale-helm': '7/6', 'dk-scale-armor': '8/6', 'dk-scale-pants': '9/6', 'dk-scale-gloves': '10/6', 'dk-scale-boots': '11/6',
    'dk-brass-helm': '7/8', 'dk-brass-armor': '8/8', 'dk-brass-pants': '9/8', 'dk-brass-gloves': '10/8', 'dk-brass-boots': '11/8',
    'dk-plate-helm': '7/9', 'dk-plate-armor': '8/9', 'dk-plate-pants': '9/9', 'dk-plate-gloves': '10/9', 'dk-plate-boots': '11/9',
    'dk-dragon-helm': '7/1', 'dk-dragon-armor': '8/1', 'dk-dragon-pants': '9/1', 'dk-dragon-gloves': '10/1', 'dk-dragon-boots': '11/1',
    'dk-bdragon-helm': '7/16', 'dk-bdragon-armor': '8/16', 'dk-bdragon-pants': '9/16', 'dk-bdragon-gloves': '10/16', 'dk-bdragon-boots': '11/16',
    'dk-dphoenix-helm': '7/17', 'dk-dphoenix-armor': '8/17', 'dk-dphoenix-pants': '9/17', 'dk-dphoenix-gloves': '10/17', 'dk-dphoenix-boots': '11/17',
    'dk-gdragon-helm': '7/21', 'dk-gdragon-armor': '8/21', 'dk-gdragon-pants': '9/21', 'dk-gdragon-gloves': '10/21', 'dk-gdragon-boots': '11/21',
    // DW Sets
    'dw-pad-helm': '7/2', 'dw-pad-armor': '8/2', 'dw-pad-pants': '9/2', 'dw-pad-gloves': '10/2', 'dw-pad-boots': '11/2',
    'dw-bone-helm': '7/4', 'dw-bone-armor': '8/4', 'dw-bone-pants': '9/4', 'dw-bone-gloves': '10/4', 'dw-bone-boots': '11/4',
    'dw-sphinx-helm': '7/7', 'dw-sphinx-armor': '8/7', 'dw-sphinx-pants': '9/7', 'dw-sphinx-gloves': '10/7', 'dw-sphinx-boots': '11/7',
    'dw-legendary-helm': '7/3', 'dw-legendary-armor': '8/3', 'dw-legendary-pants': '9/3', 'dw-legendary-gloves': '10/3', 'dw-legendary-boots': '11/3',
    'dw-gsoul-helm': '7/18', 'dw-gsoul-armor': '8/18', 'dw-gsoul-pants': '9/18', 'dw-gsoul-gloves': '10/18', 'dw-gsoul-boots': '11/18',
    'dw-dsoul-helm': '7/19', 'dw-dsoul-armor': '8/19', 'dw-dsoul-pants': '9/19', 'dw-dsoul-gloves': '10/19', 'dw-dsoul-boots': '11/19',
    // Elf Sets
    'elf-vine-helm': '7/10', 'elf-vine-armor': '8/10', 'elf-vine-pants': '9/10', 'elf-vine-gloves': '10/10', 'elf-vine-boots': '11/10',
    'elf-silk-helm': '7/11', 'elf-silk-armor': '8/11', 'elf-silk-pants': '9/11', 'elf-silk-gloves': '10/11', 'elf-silk-boots': '11/11',
    'elf-wind-helm': '7/12', 'elf-wind-armor': '8/12', 'elf-wind-pants': '9/12', 'elf-wind-gloves': '10/12', 'elf-wind-boots': '11/12',
    'elf-spirit-helm': '7/13', 'elf-spirit-armor': '8/13', 'elf-spirit-pants': '9/13', 'elf-spirit-gloves': '10/13', 'elf-spirit-boots': '11/13',
    'elf-guardian-helm': '7/14', 'elf-guardian-armor': '8/14', 'elf-guardian-pants': '9/14', 'elf-guardian-gloves': '10/14', 'elf-guardian-boots': '11/14',
    'elf-hspirit-helm': '7/25', 'elf-hspirit-armor': '8/25', 'elf-hspirit-pants': '9/25', 'elf-hspirit-gloves': '10/25', 'elf-hspirit-boots': '11/25',
    'elf-iris-helm': '7/22', 'elf-iris-armor': '8/22', 'elf-iris-pants': '9/22', 'elf-iris-gloves': '10/22', 'elf-iris-boots': '11/22',
    // MG Sets (no helm)
    'mg-storm-armor': '8/15', 'mg-storm-pants': '9/15', 'mg-storm-gloves': '10/15', 'mg-storm-boots': '11/15',
    'mg-thunder-armor': '8/20', 'mg-thunder-pants': '9/20', 'mg-thunder-gloves': '10/20', 'mg-thunder-boots': '11/20',
    'mg-hurricane-armor': '8/43', 'mg-hurricane-pants': '9/43', 'mg-hurricane-gloves': '10/43', 'mg-hurricane-boots': '11/43',
    // DL Sets
    'dl-leather-helm': '7/29', 'dl-leather-armor': '8/29', 'dl-leather-pants': '9/29', 'dl-leather-gloves': '10/29', 'dl-leather-boots': '11/29',
    'dl-bronze-helm': '7/30', 'dl-bronze-armor': '8/30', 'dl-bronze-pants': '9/30', 'dl-bronze-gloves': '10/30', 'dl-bronze-boots': '11/30',
    'dl-scale-helm': '7/31', 'dl-scale-armor': '8/31', 'dl-scale-pants': '9/31', 'dl-scale-gloves': '10/31', 'dl-scale-boots': '11/31',
    'dl-lplate-helm': '7/26', 'dl-lplate-armor': '8/26', 'dl-lplate-pants': '9/26', 'dl-lplate-gloves': '10/26', 'dl-lplate-boots': '11/26',
    'dl-adamantine-helm': '7/27', 'dl-adamantine-armor': '8/27', 'dl-adamantine-pants': '9/27', 'dl-adamantine-gloves': '10/27', 'dl-adamantine-boots': '11/27',
    'dl-dsteel-helm': '7/34', 'dl-dsteel-armor': '8/34', 'dl-dsteel-pants': '9/34', 'dl-dsteel-gloves': '10/34', 'dl-dsteel-boots': '11/34',
    'dl-sunlight-helm': '7/33', 'dl-sunlight-armor': '8/33', 'dl-sunlight-pants': '9/33', 'dl-sunlight-gloves': '10/33', 'dl-sunlight-boots': '11/33',
    'dl-dmaster-helm': '7/28', 'dl-dmaster-armor': '8/28', 'dl-dmaster-pants': '9/28', 'dl-dmaster-gloves': '10/28', 'dl-dmaster-boots': '11/28',
    // Summoner Sets
    'sum-vwind-helm': '7/38', 'sum-vwind-armor': '8/38', 'sum-vwind-pants': '9/38', 'sum-vwind-gloves': '10/38', 'sum-vwind-boots': '11/38',
    'sum-rwing-helm': '7/39', 'sum-rwing-armor': '8/39', 'sum-rwing-pants': '9/39', 'sum-rwing-gloves': '10/39', 'sum-rwing-boots': '11/39',
    'sum-ancient-helm': '7/40', 'sum-ancient-armor': '8/40', 'sum-ancient-pants': '9/40', 'sum-ancient-gloves': '10/40', 'sum-ancient-boots': '11/40',
    'sum-demonic-helm': '7/41', 'sum-demonic-armor': '8/41', 'sum-demonic-pants': '9/41', 'sum-demonic-gloves': '10/41', 'sum-demonic-boots': '11/41',
    'sum-sblitz-helm': '7/42', 'sum-sblitz-armor': '8/42', 'sum-sblitz-pants': '9/42', 'sum-sblitz-gloves': '10/42', 'sum-sblitz-boots': '11/42',
    // RF Sets (no gloves)
    'rf-plate-helm': '7/44', 'rf-plate-armor': '8/44', 'rf-plate-pants': '9/44', 'rf-plate-boots': '11/44',
    'rf-sfire-helm': '7/45', 'rf-sfire-armor': '8/45', 'rf-sfire-pants': '9/45', 'rf-sfire-boots': '11/45',
    'rf-szahard-helm': '7/46', 'rf-szahard-armor': '8/46', 'rf-szahard-pants': '9/46', 'rf-szahard-boots': '11/46',
    'rf-pgrove-helm': '7/50', 'rf-pgrove-armor': '8/50', 'rf-pgrove-pants': '9/50', 'rf-pgrove-boots': '11/50',
};

function initCollection() {
    document.getElementById('tabCollection').addEventListener('click', () => {
        viewingOther = null;
        viewingGuildMember = null;
        loadCollection();
    });
}

async function loadCollection() {
    const container = document.getElementById('collectionContent');
    if (!currentUser && !viewingOther && !viewingGuildMember) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><p>${t('collectionLoginRequired')}</p></div>`;
        return;
    }

    try {
        let data;
        if (viewingGuildMember) {
            const res = await fetch(`/api/guild/collection/${viewingGuildMember}`, { credentials: 'same-origin' });
            data = await res.json();
            if (!res.ok) throw new Error(data.error);
            viewingOther = viewingGuildMember;
        } else if (viewingOther) {
            const res = await fetch(`/api/collection/${viewingOther}`, { credentials: 'same-origin' });
            data = await res.json();
            if (!res.ok) throw new Error(data.error);
        } else {
            data = await fetch('/api/collection', { credentials: 'same-origin' }).then(r => r.json());
        }
        collectionItems = new Set(data.items.filter(i => i.obtained !== false).map(i => i.item_id));
        collectionAdds = {};
        data.items.forEach(i => {
            if (i.adds && i.adds.length > 0) collectionAdds[i.item_id] = i.adds;
        });
        renderCollection(container);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${escapeHtml(e.message || 'Erro ao carregar coleção')}</p></div>`;
    }
}

async function loadCollectionOf(username) {
    const target = (currentUser && currentUser.username === username) ? null : username;
    if (!target) {
        viewingOther = null;
        viewingGuildMember = null;
        document.querySelector('[data-tab="collection"]')?.click();
        return;
    }
    document.querySelector('[data-tab="collection"]')?.click();
    viewingOther = target;
    viewingGuildMember = null;
    await loadCollection();
}

async function loadGuildCollectionOf(username) {
    const target = (currentUser && currentUser.username === username) ? null : username;
    if (!target) {
        // Viewing own collection
        viewingGuildMember = null;
        viewingOther = null;
        document.querySelector('[data-tab="collection"]')?.click();
        return;
    }
    // Switch to collection tab first (this resets viewingOther/viewingGuildMember)
    document.querySelector('[data-tab="collection"]')?.click();
    // Then set them back after the tab click handler ran
    viewingGuildMember = target;
    viewingOther = null;
    await loadCollection();
}

function renderCollection(container) {
    const totalItems = EXC_ITEMS_DATA.items.length;
    const obtained = collectionItems.size;
    const pct = totalItems > 0 ? Math.round((obtained / totalItems) * 100) : 0;
    const readOnly = !!viewingOther;

    const catNames = {
        pt: {
            'swords': 'Espadas', 'axes': 'Machados', 'maces': 'Maças', 'staffs': 'Cajados',
            'bows': 'Arcos', 'scepters': 'Cetros', 'sets-dk': 'Sets DK', 'sets-dw': 'Sets DW',
            'sets-elf': 'Sets ELF', 'sets-mg': 'Sets MG', 'sets-dl': 'Sets DL', 'sets-sum': 'Sets SUM'
        },
        en: {
            'swords': 'Swords', 'axes': 'Axes', 'maces': 'Maces', 'staffs': 'Staffs',
            'bows': 'Bows', 'scepters': 'Scepters', 'sets-dk': 'DK Sets', 'sets-dw': 'DW Sets',
            'sets-elf': 'ELF Sets', 'sets-mg': 'MG Sets', 'sets-dl': 'DL Sets', 'sets-sum': 'SUM Sets'
        }
    };

    const lang = currentLang || 'pt';
    const names = catNames[lang] || catNames.pt;

    const isGuildView = !!viewingGuildMember;
    const viewingHeader = viewingOther
        ? `<div class="collection-viewing"><span>📋 ${t('collectionViewTitle')} <strong>${escapeHtml(viewingOther)}</strong></span>${isGuildView ? `<button class="btn-sm" id="btnBackGuild">← ${t('guildMembers')}</button>` : ''}<button class="btn-sm" id="btnBackMyCollection">← ${t('collectionMyCollection')}</button></div>`
        : '';

    const shareBtn = !readOnly && currentUser
        ? `<button class="btn-sm collection-share-btn" id="btnShareCollection">📤 ${t('collectionShare')}</button>`
        : '';

    // Inline findings preview (items the wishlist scraper found)
    let findingsPreview = '';
    if (!readOnly && typeof getStoredFindings === 'function') {
        const found = getStoredFindings().slice(0, 4);
        if (found.length > 0) {
            findingsPreview = `
                <div class="wl-findings-panel" style="margin-bottom:14px">
                    <div class="wl-findings-header">
                        <div class="wl-findings-title">✨ Itens da coleção achados no mercado <span class="wl-findings-count">${getStoredFindings().length}</span></div>
                        <a href="#" class="btn-sm" id="btnGoToWishlist">Ver todos →</a>
                    </div>
                    <div class="wl-findings-grid">
                        ${found.map(f => `
                            <div class="wl-finding-card">
                                <div class="wl-finding-img"><img src="${f.imgSrc}" alt="${f.itemName}" loading="lazy"></div>
                                <div class="wl-finding-body">
                                    <div class="wl-finding-name">${f.itemName}</div>
                                    ${f.price ? `<div class="wl-finding-price">💰 ${f.price}</div>` : ''}
                                </div>
                                <div class="wl-finding-actions">
                                    <a class="wl-finding-btn wl-finding-btn-primary" href="${f.detailUrl}" target="_blank" rel="noopener">🛒 Abrir ↗</a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    container.innerHTML = `
        ${viewingHeader}
        ${findingsPreview}
        <div class="collection-header">
            <div class="collection-progress">
                <div class="collection-progress-bar">
                    <div class="collection-progress-fill" style="width:${pct}%"></div>
                </div>
                <div class="collection-progress-text">${obtained}/${totalItems} (${pct}%) ${shareBtn}</div>
            </div>
        </div>

        ${!readOnly ? `<div class="collection-search-bar">
            <input type="text" id="collectionSearch" class="admin-input" placeholder="🔍 Buscar item..." style="width:100%">
        </div>` : ''}

        <div class="collection-filters">
            <button class="collection-filter ${collectionFilter === 'all' ? 'active' : ''}" data-cf="all">${t('collectionAll')}</button>
            <button class="collection-filter ${collectionFilter === 'obtained' ? 'active' : ''}" data-cf="obtained">✅ ${t('collectionObtained')} (${obtained})</button>
            <button class="collection-filter ${collectionFilter === 'missing' ? 'active' : ''}" data-cf="missing">❌ ${t('collectionMissing')} (${totalItems - obtained})</button>
            ${!readOnly && (totalItems - obtained) > 0 ? `<button class="collection-filter" id="btnWatchMissing" style="background:linear-gradient(135deg,#f5a623,#ff8800);color:#fff;border-color:transparent">🔔 Vigiar ${totalItems - obtained} faltando no mercado</button>` : ''}
        </div>

        <div class="collection-categories" id="collectionCats">
            ${renderCollectionCategories(names, '')}
        </div>
    `;

    if (viewingOther) {
        document.getElementById('btnBackMyCollection')?.addEventListener('click', () => {
            viewingOther = null;
            viewingGuildMember = null;
            loadCollection();
        });
        document.getElementById('btnBackGuild')?.addEventListener('click', () => {
            viewingOther = null;
            viewingGuildMember = null;
            document.querySelector('[data-tab="guild"]')?.click();
        });
    }

    document.getElementById('btnShareCollection')?.addEventListener('click', () => {
        const url = `${location.origin}/?collection=${currentUser.username}`;
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('btnShareCollection');
            btn.textContent = `✅ ${t('collectionShareCopied')}`;
            setTimeout(() => { btn.textContent = `📤 ${t('collectionShare')}`; }, 2000);
        });
    });

    container.querySelectorAll('.collection-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'btnWatchMissing') return; // handled below
            collectionFilter = btn.dataset.cf;
            localStorage.setItem('mudream_col_filter', collectionFilter);
            renderCollection(container);
        });
    });

    // "Ver todos →" → switch to wishlist tab
    document.getElementById('btnGoToWishlist')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('tabWishlist')?.click();
    });

    // Watch missing items: bulk-add to wishlist
    document.getElementById('btnWatchMissing')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnWatchMissing');
        const missing = EXC_ITEMS_DATA.items.filter(i => !collectionItems.has(i.id));
        if (missing.length === 0) return;
        if (!confirm(`Adicionar ${missing.length} itens faltando à sua Wishlist do mercado RAMPAGE X-20?`)) return;

        const server = localStorage.getItem('mudream_wishlist_server') || 'rampage-x20';
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('watch-loading');
        btn.innerHTML = `<span class="watch-dots">⏳ Adicionando 0/${missing.length}</span><span class="watch-progress-fill"></span>`;

        const progressFill = btn.querySelector('.watch-progress-fill');
        const dots = btn.querySelector('.watch-dots');
        let added = 0;
        for (let i = 0; i < missing.length; i++) {
            const it = missing[i];
            try {
                await fetch('/api/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ server, itemName: it.name, category: null, options: [] })
                });
                added++;
            } catch {}
            const pct = Math.round(((i + 1) / missing.length) * 100);
            if (progressFill) progressFill.style.width = pct + '%';
            if (dots) dots.textContent = `⏳ Adicionando ${i + 1}/${missing.length}`;
        }

        // Phase 2 — scan the market
        if (dots) dots.textContent = '🔍 Procurando no mercado...';
        if (progressFill) progressFill.style.width = '100%';

        let foundCount = 0;
        try {
            if (typeof loadWishlist === 'function') await loadWishlist();
            if (typeof checkMarketForWishlist === 'function') {
                await checkMarketForWishlist();
                if (typeof getStoredFindings === 'function') foundCount = getStoredFindings().length;
            }
        } catch (e) {
            console.warn('Market scan failed:', e.message);
        }

        btn.classList.remove('watch-loading');
        btn.disabled = false;
        btn.innerHTML = originalText;

        if (foundCount > 0) {
            showToast(`✨ ${added} adicionados · ${foundCount} já achados no mercado!`, 'success', 6000);
        } else {
            showToast(`🛒 ${added} adicionados à Wishlist. Nenhum achado no mercado por enquanto.`, 'success', 5000);
        }
        // Refresh collection so finding preview shows up
        renderCollection(container);
    });

    const searchInput = document.getElementById('collectionSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            document.getElementById('collectionCats').innerHTML = renderCollectionCategories(names, q);
            bindCollectionItemClicks(container);
            bindCategoryToggles();
        });
    }

    bindCollectionItemClicks(container);
    bindCategoryToggles();
}

function renderCollectionCategories(names, searchQuery) {
    const readOnly = !!viewingOther;
    return EXC_ITEMS_DATA.categories.map(cat => {
        let catItems = EXC_ITEMS_DATA.items.filter(i => i.category === cat.id);
        if (searchQuery) catItems = catItems.filter(i => i.name.toLowerCase().includes(searchQuery));
        let filtered = catItems;
        if (collectionFilter === 'obtained') filtered = catItems.filter(i => collectionItems.has(i.id));
        if (collectionFilter === 'missing') filtered = catItems.filter(i => !collectionItems.has(i.id));
        if (filtered.length === 0) return '';

        const catObtained = catItems.filter(i => collectionItems.has(i.id)).length;
        const catPct = catItems.length > 0 ? Math.round((catObtained / catItems.length) * 100) : 0;

        return `
            <div class="collection-category">
                <div class="collection-cat-header" data-cat="${cat.id}">
                    <span>${cat.icon} ${names[cat.id] || cat.id}</span>
                    <div class="collection-cat-right">
                        <div class="collection-cat-mini-bar"><div class="collection-cat-mini-fill" style="width:${catPct}%"></div></div>
                        <span class="collection-cat-count">${catObtained}/${catItems.length}</span>
                    </div>
                </div>
                <div class="collection-items" id="cat-${cat.id}">
                    ${filtered.map(item => {
                        const has = collectionItems.has(item.id);
                        const tierClass = 'tier-' + item.tier;
                        const imgPath = ITEM_IMG_MAP[item.id];
                        const itemAdds = collectionAdds[item.id] || [];
                        const addsHtml = !has && itemAdds.length > 0
                            ? `<div class="collection-item-adds">${itemAdds.map(a => {
                                const add = AVAILABLE_ADDS.find(x => x.id === a);
                                return add ? `<span class="add-tag" style="--add-color:${add.color}">${add.icon} ${add.label}</span>` : '';
                              }).join('')}</div>`
                            : '';
                        const iconHtml = imgPath
                            ? `<img src="${ITEM_IMG_BASE}${imgPath}.webp" alt="${item.name}" class="collection-item-img" onerror="this.style.display='none';this.nextElementSibling.style.display=''">`
                              + `<span class="collection-item-emoji" style="display:none">${getItemIcon(item.category)}</span>`
                            : `<span class="collection-item-emoji">${getItemIcon(item.category)}</span>`;
                        return `
                            <div class="collection-item ${has ? 'obtained' : ''} ${tierClass} ${readOnly ? 'readonly' : ''}" data-item="${item.id}" title="${item.name} (T${item.tier})">
                                <div class="collection-item-icon">${iconHtml}</div>
                                <div class="collection-item-details">
                                    <span class="collection-item-name">${item.name}</span>
                                    <span class="collection-item-tier">Tier ${item.tier}</span>
                                    ${addsHtml}
                                </div>
                                <div class="collection-item-right">
                                    ${!has && !readOnly ? `<button class="btn-adds" data-item="${item.id}" title="Editar adds">⚙️</button>` : ''}
                                    ${has && !readOnly ? `<button class="btn-remove-item" data-item="${item.id}" title="Remover item">❌</button>` : ''}
                                    ${readOnly
                                        ? `<span class="collection-item-check">${has ? '✅' : '⬜'}</span>`
                                        : (has
                                            ? `<span class="collection-item-badge owned">✅ ${t('collectionOwned') || 'Comprei'}</span>`
                                            : `<button class="btn-buy" data-item="${item.id}" title="Marcar como obtido"><span class="btn-buy-icon">🛒</span><span class="btn-buy-label">${t('collectionBuy') || 'COMPREI'}</span></button>`
                                        )
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function getItemIcon(category) {
    const icons = {
        'sets-dk': '🛡️', 'sets-dw': '🧙', 'sets-elf': '🧝', 'sets-mg': '⚡',
        'sets-dl': '👹', 'sets-sum': '📖', 'sets-rf': '👊'
    };
    return icons[category] || '📦';
}

function bindCategoryToggles() {
    document.querySelectorAll('.collection-cat-header').forEach(header => {
        header.addEventListener('click', () => {
            const items = document.getElementById('cat-' + header.dataset.cat);
            if (items) {
                items.classList.toggle('collapsed');
                header.classList.toggle('collapsed');
            }
        });
    });
}

function bindCollectionItemClicks(container) {
    if (viewingOther) return;
    if (container._collectionClicksBound) return;
    container._collectionClicksBound = true;

    // Use event delegation on the container for better click handling
    container.addEventListener('click', async (e) => {
        if (viewingOther) return;

        // Check if clicked on adds button first (highest priority)
        const addsBtn = e.target.closest('.btn-adds');
        if (addsBtn) {
            e.stopPropagation();
            e.preventDefault();
            showAddsModal(addsBtn.dataset.item, container);
            return;
        }

        // Check if clicked on remove button
        const removeBtn = e.target.closest('.btn-remove-item');
        if (removeBtn) {
            e.stopPropagation();
            e.preventDefault();
            const removeId = removeBtn.dataset.item;
            try {
                const res = await fetch('/api/collection/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ itemId: removeId })
                });
                const data = await res.json();
                if (!data.obtained) {
                    collectionItems.delete(removeId);
                }
                renderCollection(container);
            } catch {}
            return;
        }

        // Check if clicked on a collection item (toggle obtained)
        const item = e.target.closest('.collection-item:not(.readonly)');
        if (!item) return;
        // Double check not from adds/remove area
        if (e.target.closest('.btn-adds') || e.target.closest('.btn-remove-item')) return;

        const itemId = item.dataset.item;
        const wasObtained = collectionItems.has(itemId);
        try {
            const res = await fetch('/api/collection/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ itemId })
            });
            const data = await res.json();
            if (data.obtained) {
                collectionItems.add(itemId);
            } else {
                collectionItems.delete(itemId);
            }

            const itemName = EXC_ITEMS_DATA.items.find(i => i.id === itemId)?.name || 'Item';
            const becameObtainedAndHidden = !wasObtained && data.obtained && collectionFilter === 'missing';
            const becameMissingAndHidden  = wasObtained && !data.obtained && collectionFilter === 'obtained';

            // 🌩️ Lightning strike when marking obtained — celebratory effect
            if (!wasObtained && data.obtained) {
                spawnLightningStrike(item);
            }

            if (becameObtainedAndHidden || becameMissingAndHidden) {
                // Wait for the lightning flash to peak before starting archive animation
                setTimeout(() => {
                    item.classList.add('item-archiving');
                    if (typeof showToast === 'function') {
                        const msg = data.obtained
                            ? `✅ ${itemName} arquivado em Obtidos`
                            : `↩️ ${itemName} voltou para Faltando`;
                        showToast(msg, 'success', 2500);
                    }
                    setTimeout(() => renderCollection(container), 380);
                }, becameObtainedAndHidden ? 420 : 0);
            } else {
                // Still re-render after a short delay so the lightning can finish
                setTimeout(() => renderCollection(container), data.obtained && !wasObtained ? 700 : 0);
            }
        } catch {}
    });
}

// Spawn a brief lightning bolt + flash over the item element
function spawnLightningStrike(targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;

    // Whole-screen flash (split-second)
    const flash = document.createElement('div');
    flash.className = 'lightning-flash-fx';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 380);

    // Lightning bolt SVG positioned above the item
    const bolt = document.createElement('div');
    bolt.className = 'lightning-bolt-fx';
    bolt.style.left = cx + 'px';
    bolt.style.top  = (cy - 6) + 'px';
    bolt.innerHTML = `
        <svg viewBox="0 0 60 200" width="60" height="200" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="boltGlow">
                    <feGaussianBlur stdDeviation="2"/>
                </filter>
            </defs>
            <path d="M30 0 L18 80 L36 80 L20 200 L40 110 L22 110 L40 0 Z"
                  fill="#ffeb3b" stroke="#fff" stroke-width="1.5" filter="url(#boltGlow)"/>
            <path d="M30 0 L18 80 L36 80 L20 200 L40 110 L22 110 L40 0 Z"
                  fill="#fffde7"/>
        </svg>
    `;
    document.body.appendChild(bolt);
    setTimeout(() => bolt.remove(), 700);

    // Ember sparks around the item
    for (let i = 0; i < 12; i++) {
        const spark = document.createElement('div');
        spark.className = 'lightning-spark-fx';
        const angle = (Math.PI * 2 * i) / 12 + (i % 2 ? 0.3 : 0);
        const dist  = 40 + (i % 3) * 14;
        spark.style.left = cx + 'px';
        spark.style.top  = cy + 'px';
        spark.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        spark.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        spark.style.animationDelay = (i * 18) + 'ms';
        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 1000);
    }

    // Vibrate on mobile if supported
    if (navigator.vibrate) navigator.vibrate([12, 30, 12]);
}

function showAddsModal(itemId, container) {
    const itemData = EXC_ITEMS_DATA.items.find(i => i.id === itemId);
    if (!itemData) return;
    const currentAdds = collectionAdds[itemId] || [];

    // Remove any existing modal
    document.getElementById('addsModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'addsModal';
    modal.className = 'adds-modal-overlay';
    modal.innerHTML = `
        <div class="adds-modal">
            <div class="adds-modal-header">
                <h4>⚙️ ${itemData.name}</h4>
                <button class="adds-modal-close">✕</button>
            </div>
            <p class="adds-modal-subtitle">${t('addsSelectOptions')}</p>
            <div class="adds-options">
                ${AVAILABLE_ADDS.map(a => `
                    <label class="adds-option ${currentAdds.includes(a.id) ? 'active' : ''}" data-add="${a.id}" style="--add-color:${a.color}">
                        <span class="adds-option-icon">${a.icon}</span>
                        <span class="adds-option-label">${a.label}</span>
                        <span class="adds-option-check">${currentAdds.includes(a.id) ? '✅' : '⬜'}</span>
                    </label>
                `).join('')}
            </div>
            <button class="landing-enter adds-save-btn" id="btnSaveAdds" style="width:100%;font-size:13px;padding:10px">${t('addsApply')}</button>
        </div>
    `;
    document.body.appendChild(modal);

    const selectedAdds = new Set(currentAdds);

    modal.querySelectorAll('.adds-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const addId = opt.dataset.add;
            if (selectedAdds.has(addId)) {
                selectedAdds.delete(addId);
                opt.classList.remove('active');
                opt.querySelector('.adds-option-check').textContent = '⬜';
            } else {
                selectedAdds.add(addId);
                opt.classList.add('active');
                opt.querySelector('.adds-option-check').textContent = '✅';
            }
        });
    });

    modal.querySelector('.adds-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('btnSaveAdds').addEventListener('click', async () => {
        const adds = Array.from(selectedAdds);
        try {
            await fetch('/api/collection/adds', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ itemId, adds })
            });
            if (adds.length > 0) {
                collectionAdds[itemId] = adds;
            } else {
                delete collectionAdds[itemId];
            }
            modal.remove();
            renderCollection(container);
            showToast(t('addsSaved'), 'success');
        } catch {
            showToast('Erro ao salvar adds', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', initCollection);
