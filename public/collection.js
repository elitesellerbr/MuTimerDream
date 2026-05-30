let collectionItems = new Set();
let collectionAdds = {}; // { itemId: ['luck', 'skill', ...] }
let collectionFilter = 'all';
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

    container.innerHTML = `
        ${viewingHeader}
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
            collectionFilter = btn.dataset.cf;
            renderCollection(container);
        });
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
                                    <span class="collection-item-check">${has ? '✅' : '⬜'}</span>
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
            renderCollection(container);
        } catch {}
    });
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
