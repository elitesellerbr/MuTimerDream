let collectionItems = new Set();
let collectionAdds = {}; // { itemId: ['luck', 'skill', ...] }
let collectionFilter = 'all';
let viewingOther = null;
let viewingGuildMember = null;

const AVAILABLE_ADDS = [
    { id: 'luck', label: '+Luck', icon: '🍀', color: '#4caf50' },
    { id: 'skill', label: '+Skill', icon: '⚡', color: '#ff9800' },
    { id: 'additional', label: '+DD', icon: '💥', color: '#f44336' },
    { id: 'sd', label: '+SD', icon: '🛡️', color: '#9c27b0' },
    { id: 'life', label: '+Life', icon: '❤️', color: '#e91e63' },
    { id: 'mana', label: '+Mana', icon: '💙', color: '#2196f3' },
    { id: 'zen', label: '+Zen', icon: '💰', color: '#ffc107' }
];

const ITEM_IMG_BASE = 'https://dreamassets.fra1.cdn.digitaloceanspaces.com/items_seasons/6plus/';
const ITEM_IMG_MAP = {
    'dk-dragon-helm': '7/1', 'dk-dragon-armor': '8/1', 'dk-dragon-pants': '9/1', 'dk-dragon-gloves': '10/1', 'dk-dragon-boots': '11/1',
    'dk-bdragon-helm': '7/16', 'dk-bdragon-armor': '8/16', 'dk-bdragon-pants': '9/16', 'dk-bdragon-gloves': '10/16', 'dk-bdragon-boots': '11/16',
    'dk-dphoenix-helm': '7/17', 'dk-dphoenix-armor': '8/17', 'dk-dphoenix-pants': '9/17', 'dk-dphoenix-gloves': '10/17', 'dk-dphoenix-boots': '11/17',
    'dk-gdragon-helm': '7/21', 'dk-gdragon-armor': '8/21', 'dk-gdragon-pants': '9/21', 'dk-gdragon-gloves': '10/21', 'dk-gdragon-boots': '11/21',
    'dw-pad-helm': '7/2', 'dw-pad-armor': '8/2', 'dw-pad-pants': '9/2', 'dw-pad-gloves': '10/2', 'dw-pad-boots': '11/2',
    'dw-legendary-helm': '7/3', 'dw-legendary-armor': '8/3', 'dw-legendary-pants': '9/3', 'dw-legendary-gloves': '10/3', 'dw-legendary-boots': '11/3',
    'dw-gsoul-helm': '7/18', 'dw-gsoul-armor': '8/18', 'dw-gsoul-pants': '9/18', 'dw-gsoul-gloves': '10/18', 'dw-gsoul-boots': '11/18',
    'elf-vine-helm': '7/10', 'elf-vine-armor': '8/10', 'elf-vine-pants': '9/10', 'elf-vine-gloves': '10/10', 'elf-vine-boots': '11/10',
    'elf-spirit-helm': '7/13', 'elf-spirit-armor': '8/13', 'elf-spirit-pants': '9/13', 'elf-spirit-gloves': '10/13', 'elf-spirit-boots': '11/13',
    'elf-rspirit-helm': '7/24', 'elf-rspirit-armor': '8/24', 'elf-rspirit-pants': '9/24', 'elf-rspirit-gloves': '10/24', 'elf-rspirit-boots': '11/24',
    'mg-storm-helm': '7/15', 'mg-storm-armor': '8/15', 'mg-storm-pants': '9/15', 'mg-storm-gloves': '10/15', 'mg-storm-boots': '11/15',
    'mg-thunder-helm': '7/20', 'mg-thunder-armor': '8/20', 'mg-thunder-pants': '9/20', 'mg-thunder-gloves': '10/20', 'mg-thunder-boots': '11/20',
    'dl-sunlight-helm': '7/33', 'dl-sunlight-armor': '8/33', 'dl-sunlight-pants': '9/33', 'dl-sunlight-gloves': '10/33', 'dl-sunlight-boots': '11/33',
    'dl-dmaster-helm': '7/28', 'dl-dmaster-armor': '8/28', 'dl-dmaster-pants': '9/28', 'dl-dmaster-gloves': '10/28', 'dl-dmaster-boots': '11/28',
    'sum-eclipse-helm': '7/35', 'sum-eclipse-armor': '8/35', 'sum-eclipse-pants': '9/35', 'sum-eclipse-gloves': '10/35', 'sum-eclipse-boots': '11/35',
    'sum-iris-helm': '7/36', 'sum-iris-armor': '8/36', 'sum-iris-pants': '9/36', 'sum-iris-gloves': '10/36', 'sum-iris-boots': '11/36',
    'dragon-slayer-shield': '6/5', 'grand-soul-shield': '6/15', 'elemental-shield': '6/18',
    'crimson-glory': '6/16', 'salamander-shield': '6/8'
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
            'sets-elf': 'Sets ELF', 'sets-mg': 'Sets MG', 'sets-dl': 'Sets DL', 'sets-sum': 'Sets SUM',
            'shields': 'Escudos', 'wings': 'Asas', 'rings': 'Anéis & Pendentes'
        },
        en: {
            'swords': 'Swords', 'axes': 'Axes', 'maces': 'Maces', 'staffs': 'Staffs',
            'bows': 'Bows', 'scepters': 'Scepters', 'sets-dk': 'DK Sets', 'sets-dw': 'DW Sets',
            'sets-elf': 'ELF Sets', 'sets-mg': 'MG Sets', 'sets-dl': 'DL Sets', 'sets-sum': 'SUM Sets',
            'shields': 'Shields', 'wings': 'Wings', 'rings': 'Rings & Pendants'
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
        'shields': '🛡️',
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
