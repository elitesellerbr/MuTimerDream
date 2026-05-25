let guildData = null;

async function guildApi(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro');
    return data;
}

function initGuild() {
    document.getElementById('tabGuild').addEventListener('click', () => {
        loadGuild();
    });
}

async function loadGuild() {
    const container = document.getElementById('guildContent');
    if (!currentUser) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><p>${t('guildLoginRequired')}</p></div>`;
        return;
    }

    try {
        const data = await guildApi('/api/guild/my');
        guildData = data;
        if (data.guild) {
            renderGuildPanel(data);
        } else {
            renderGuildCreate(container);
        }
    } catch (e) {
        // Check if PIN is required
        try {
            const errData = JSON.parse(e.message.includes('pinRequired') ? '{"pinRequired":true}' : '{}');
        } catch {}

        if (e.message === 'PIN necessário' || e.message === 'PIN expirado, digite novamente') {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔐</div><p>${t('guildPinRequired')}</p>
                <button class="btn-sm" id="btnUnlockGuild" style="margin-top:12px;padding:8px 24px">🔓 ${t('guildPinUnlock')}</button></div>`;
            document.getElementById('btnUnlockGuild').addEventListener('click', () => {
                showPinModal(() => loadGuild());
            });
        } else {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${t('loadGuildError')}</p></div>`;
        }
    }
}

function renderGuildCreate(container) {
    container.innerHTML = `
        <div class="guild-setup">
            <div class="guild-setup-option">
                <h3>⚔️ ${t('guildCreate')}</h3>
                <div class="setting-group">
                    <label>${t('guildName')}</label>
                    <input type="text" id="guildCreateName" class="admin-input" placeholder="${t('guildNamePlaceholder')}" maxlength="30">
                </div>
                <div class="setting-group">
                    <label>${t('guildCharName')}</label>
                    <input type="text" id="guildCreateChar" class="admin-input" placeholder="${t('guildCharPlaceholder')}" maxlength="20">
                </div>
                <button class="landing-enter" id="btnCreateGuild" style="width:100%;font-size:14px;padding:10px">${t('guildCreateBtn')}</button>
            </div>
            <div style="margin-top:12px;text-align:center;color:#8888aa;font-size:12px">
                <p>${t('guildOnlyMasterInfo')}</p>
            </div>
            <div id="guildError" class="auth-error" style="display:none"></div>
        </div>
    `;

    document.getElementById('btnCreateGuild').addEventListener('click', async () => {
        const name = document.getElementById('guildCreateName').value.trim();
        const charName = document.getElementById('guildCreateChar').value.trim();
        if (!name || !charName) return showGuildError(t('guildFillFields'));
        const btn = document.getElementById('btnCreateGuild');
        btn.classList.add('btn-loading');
        btn.disabled = true;
        try {
            await guildApi('/api/guild/create', 'POST', { name, charName });
            showToast(t('guildCreate') + ' ✓', 'success');
            loadGuild();
        } catch (e) {
            showGuildError(e.message);
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}

function showGuildError(msg) {
    const el = document.getElementById('guildError');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function getRoleBadge(role) {
    if (role === 'master') return '👑';
    if (role === 'assistant') return '🛡️';
    if (role === 'party_assistant') return '🎯';
    return '⚔️';
}

function getRoleLabel(role) {
    if (role === 'master') return t('guildMaster');
    if (role === 'assistant') return t('guildAssistant');
    if (role === 'party_assistant') return t('guildPartyAssistant');
    return t('guildMember');
}

function getQuestDayReminder() {
    const serverNow = getServerTime();
    const h = serverNow.getHours();
    const m = serverNow.getMinutes();
    const minutesLeft = (23 - h) * 60 + (59 - m);

    if (minutesLeft <= 30) {
        const mm = String(Math.floor(minutesLeft)).padStart(2, '0');
        const ss = String(59 - serverNow.getSeconds()).padStart(2, '0');
        return { active: true, text: `${mm}:${ss}`, urgent: minutesLeft <= 10 };
    }
    return { active: false };
}

function renderQuestDayBanner() {
    const reminder = getQuestDayReminder();
    const existing = document.getElementById('questDayBanner');

    if (!reminder.active) {
        if (existing) existing.remove();
        return;
    }

    const urgentClass = reminder.urgent ? 'quest-day-urgent' : '';

    if (existing) {
        existing.className = `quest-day-banner ${urgentClass}`;
        existing.querySelector('.quest-day-timer').textContent = reminder.text;
        return;
    }

    const banner = document.createElement('div');
    banner.id = 'questDayBanner';
    banner.className = `quest-day-banner ${urgentClass}`;
    banner.innerHTML = `
        <div class="quest-day-content">
            <span class="quest-day-icon">📜</span>
            <div class="quest-day-info">
                <strong>${t('questDayTitle')}</strong>
                <span>${t('questDayMsg')}</span>
            </div>
            <div class="quest-day-countdown">
                <span class="quest-day-timer">${reminder.text}</span>
            </div>
        </div>
    `;

    const container = document.getElementById('guildContent');
    container.insertBefore(banner, container.firstChild);
}

function renderGuildPanel(data) {
    const container = document.getElementById('guildContent');
    const isLeader = data.member.role === 'master' || data.member.role === 'assistant' || data.member.role === 'party_assistant';
    const isMaster = data.member.role === 'master';
    const isAssistant = data.member.role === 'assistant';
    const canManageRoles = isMaster || isAssistant;

    container.innerHTML = `
        <div class="guild-info-bar">
            <div class="guild-info-left">
                <div class="guild-emblem">⚔️</div>
                <div>
                    <h3 class="guild-name-display">${escapeHtml(data.guild.name)}</h3>
                    <span class="guild-role-badge ${data.member.role}">${getRoleBadge(data.member.role)} ${getRoleLabel(data.member.role)}</span>
                    <span class="guild-char-label">${t('guildNick')}: <strong>${escapeHtml(data.member.char_name)}</strong></span>
                </div>
            </div>
        </div>

        <div class="admin-tabs guild-tabs">
            <button class="admin-tab active" data-gtab="members">${t('guildMembers')} (${data.members.length})</button>
            <button class="admin-tab" data-gtab="collections">📦 ${t('guildCollections')}</button>
            <button class="admin-tab" data-gtab="events">${t('guildEvents')}</button>
            ${isLeader ? `<button class="admin-tab" data-gtab="report">${t('guildReport')}</button>` : ''}
        </div>

        <div id="guildMembers" class="admin-section active"></div>
        <div id="guildCollections" class="admin-section"></div>
        <div id="guildEvents" class="admin-section"></div>
        ${isLeader ? '<div id="guildReport" class="admin-section"></div>' : ''}

        <div style="margin-top:16px;text-align:center">
            <button class="btn-sm btn-danger" id="btnLeaveGuild">${t('guildLeave')}</button>
        </div>
    `;

    document.querySelectorAll('[data-gtab]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('[data-gtab]').forEach(t => t.classList.remove('active'));
            container.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            const sectionId = 'guild' + capitalize(tab.dataset.gtab);
            document.getElementById(sectionId).classList.add('active');
            if (tab.dataset.gtab === 'collections') loadGuildCollections();
            if (tab.dataset.gtab === 'events') loadGuildEvents();
            if (tab.dataset.gtab === 'report') loadGuildReport();
        });
    });

    renderGuildMembers(data);
    renderQuestDayBanner();

    if (!window._questDayInterval) {
        window._questDayInterval = setInterval(() => {
            if (document.getElementById('guildContent')?.querySelector('.guild-info-bar')) {
                renderQuestDayBanner();
            }
        }, 1000);
    }

    document.getElementById('btnLeaveGuild').addEventListener('click', async () => {
        const msg = isMaster ? t('guildLeaveConfirmMaster') : t('guildLeaveConfirm');
        const yes = await customConfirm(msg, isMaster ? '💀' : '🚪');
        if (!yes) return;
        try {
            await guildApi('/api/guild/leave', 'POST');
            guildData = null;
            loadGuild();
        } catch (e) { showToast(e.message, 'error'); }
    });
}

function renderGuildMembers(data) {
    const container = document.getElementById('guildMembers');
    const isLeader = data.member.role === 'master' || data.member.role === 'assistant' || data.member.role === 'party_assistant';
    const isMaster = data.member.role === 'master';
    const isAssistant = data.member.role === 'assistant';
    const canManageRoles = isMaster || isAssistant;

    let addMemberHtml = '';
    if (isLeader) {
        addMemberHtml = `
            <div class="guild-add-member">
                <h4>➕ ${t('guildAddMember')}</h4>
                <div class="guild-add-member-form">
                    <input type="text" id="addMemberUsername" class="admin-input" placeholder="${t('guildAddMemberUserPlaceholder')}" maxlength="50">
                    <input type="text" id="addMemberChar" class="admin-input" placeholder="${t('guildAddMemberCharPlaceholder')}" maxlength="20">
                    <button class="btn-sm" id="btnAddMember" style="padding:8px 16px">${t('guildAddMemberBtn')}</button>
                </div>
                <div id="addMemberMsg" class="auth-error" style="display:none"></div>
            </div>
        `;
    }

    container.innerHTML = `
        ${addMemberHtml}
        <div class="guild-members-list">
            ${data.members.map(m => {
                let actions = '';
                if (isMaster && m.role !== 'master') {
                    let roleButtons = '';
                    if (m.role === 'assistant') {
                        roleButtons = `<button class="btn-sm btn-role" data-mid="${m.id}" data-newrole="party_assistant" title="${t('guildDemoteToPartyAssistant')}">⬇️</button>`;
                    } else if (m.role === 'party_assistant') {
                        roleButtons = `<button class="btn-sm btn-role" data-mid="${m.id}" data-newrole="assistant" title="${t('guildPromoteAssistant')}">⬆️</button>
                            <button class="btn-sm btn-role" data-mid="${m.id}" data-newrole="member" title="${t('guildDemoteToMember')}">⬇️</button>`;
                    } else {
                        roleButtons = `<button class="btn-sm btn-role" data-mid="${m.id}" data-newrole="party_assistant" title="${t('guildPromotePartyAssistant')}">⬆️</button>`;
                    }
                    actions = `${roleButtons}<button class="btn-sm btn-danger btn-kick" data-mid="${m.id}">✕</button>`;
                } else if (isAssistant && (m.role === 'member' || m.role === 'party_assistant')) {
                    let roleButtons = '';
                    if (m.role === 'member') {
                        roleButtons = `<button class="btn-sm btn-role" data-mid="${m.id}" data-newrole="party_assistant" title="${t('guildPromotePartyAssistant')}">⬆️</button>`;
                    } else {
                        roleButtons = `<button class="btn-sm btn-role" data-mid="${m.id}" data-newrole="member" title="${t('guildDemoteToMember')}">⬇️</button>`;
                    }
                    actions = `${roleButtons}<button class="btn-sm btn-danger btn-kick" data-mid="${m.id}">✕</button>`;
                } else if (data.member.role === 'party_assistant' && m.role === 'member') {
                    actions = `<button class="btn-sm btn-danger btn-kick" data-mid="${m.id}">✕</button>`;
                }

                return `
                    <div class="guild-member-card guild-member-link" data-username="${escapeHtml(m.username)}" title="${t('guildViewCollection')}">
                        <div class="guild-member-info">
                            <span class="guild-member-role">${getRoleBadge(m.role)}</span>
                            <div>
                                <div class="guild-member-char">${escapeHtml(m.char_name)} <span class="guild-collection-icon">📦</span></div>
                                <div class="guild-member-user">@${escapeHtml(m.username)} <span class="guild-member-role-label">${getRoleLabel(m.role)}</span></div>
                            </div>
                        </div>
                        <div class="guild-member-actions">${actions}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    if (isLeader) {
        document.getElementById('btnAddMember').addEventListener('click', async () => {
            const username = document.getElementById('addMemberUsername').value.trim();
            const charName = document.getElementById('addMemberChar').value.trim();
            const msgEl = document.getElementById('addMemberMsg');
            if (!username || !charName) {
                msgEl.textContent = t('guildFillFields');
                msgEl.style.display = 'block';
                msgEl.className = 'auth-error';
                setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
                return;
            }
            try {
                await guildApi('/api/guild/add-member', 'POST', { username, charName });
                msgEl.textContent = t('guildAddMemberSuccess');
                msgEl.style.display = 'block';
                msgEl.className = 'auth-success';
                document.getElementById('addMemberUsername').value = '';
                document.getElementById('addMemberChar').value = '';
                setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
                loadGuild();
            } catch (e) {
                msgEl.textContent = e.message;
                msgEl.style.display = 'block';
                msgEl.className = 'auth-error';
                setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
            }
        });
    }

    container.querySelectorAll('.btn-kick').forEach(btn => {
        btn.addEventListener('click', async () => {
            const yes = await customConfirm(t('guildKickConfirm'), '⚔️');
            if (!yes) return;
            try {
                await guildApi(`/api/guild/members/${btn.dataset.mid}`, 'DELETE');
                showToast(t('guildKickConfirm').replace('?', '') + ' ✓', 'success');
                loadGuild();
            } catch (e) { showToast(e.message, 'error'); }
        });
    });

    container.querySelectorAll('.guild-member-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Don't navigate if clicking action buttons inside the card
            if (e.target.closest('.guild-member-actions') || e.target.closest('.btn-role') || e.target.closest('.btn-kick')) return;
            e.stopPropagation();
            const username = link.dataset.username;
            if (typeof loadGuildCollectionOf === 'function') {
                loadGuildCollectionOf(username);
            }
        });
    });

    container.querySelectorAll('.btn-role').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await guildApi('/api/guild/set-role', 'POST', { memberId: parseInt(btn.dataset.mid), role: btn.dataset.newrole });
                showToast(t('guildRoleChanged'), 'success');
                loadGuild();
            } catch (e) { showToast(e.message, 'error'); }
        });
    });
}

async function loadGuildCollections() {
    const container = document.getElementById('guildCollections');
    container.innerHTML = `<div class="empty-state"><p>⏳ ${t('loading')}</p></div>`;

    try {
        const data = await guildApi('/api/guild/collections');
        const summaries = data.summaries;
        const totalItems = typeof EXC_ITEMS_DATA !== 'undefined' ? EXC_ITEMS_DATA.items.length : 0;

        if (summaries.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><p>${t('guildNoCollections')}</p></div>`;
            return;
        }

        // Category mapping for display
        const catNames = {
            pt: { 'swords': 'Espadas', 'axes': 'Machados', 'maces': 'Maças', 'staffs': 'Cajados', 'bows': 'Arcos', 'scepters': 'Cetros',
                  'sets-dk': 'Sets DK', 'sets-dw': 'Sets DW', 'sets-elf': 'Sets ELF', 'sets-mg': 'Sets MG', 'sets-dl': 'Sets DL', 'sets-sum': 'Sets SUM',
                  'shields': 'Escudos', 'wings': 'Asas', 'rings': 'Anéis' },
            en: { 'swords': 'Swords', 'axes': 'Axes', 'maces': 'Maces', 'staffs': 'Staffs', 'bows': 'Bows', 'scepters': 'Scepters',
                  'sets-dk': 'DK Sets', 'sets-dw': 'DW Sets', 'sets-elf': 'ELF Sets', 'sets-mg': 'MG Sets', 'sets-dl': 'DL Sets', 'sets-sum': 'SUM Sets',
                  'shields': 'Shields', 'wings': 'Wings', 'rings': 'Rings' }
        };
        const lang = typeof currentLang !== 'undefined' ? currentLang : 'pt';
        const names = catNames[lang] || catNames.pt;

        container.innerHTML = `
            <div class="guild-collections-header">
                <h4>📦 ${t('guildCollections')}</h4>
                <span class="guild-collections-subtitle">${t('guildCollectionsDesc')}</span>
            </div>
            <div class="guild-collections-list">
                ${summaries.map((m, idx) => {
                    const pct = totalItems > 0 ? Math.round((m.obtained / totalItems) * 100) : 0;
                    const medal = idx === 0 && m.obtained > 0 ? '🥇' : idx === 1 && m.obtained > 0 ? '🥈' : idx === 2 && m.obtained > 0 ? '🥉' : '';

                    // Build category breakdown
                    let catBreakdown = '';
                    if (totalItems > 0 && typeof EXC_ITEMS_DATA !== 'undefined') {
                        const obtainedSet = new Set(m.items.map(i => i.item_id));
                        const cats = EXC_ITEMS_DATA.categories.map(cat => {
                            const catItems = EXC_ITEMS_DATA.items.filter(i => i.category === cat.id);
                            const catObtained = catItems.filter(i => obtainedSet.has(i.id)).length;
                            if (catObtained === 0) return '';
                            const catPct = Math.round((catObtained / catItems.length) * 100);
                            return `<div class="gc-cat-row">
                                <span class="gc-cat-name">${cat.icon} ${names[cat.id] || cat.id}</span>
                                <div class="gc-cat-bar"><div class="gc-cat-fill" style="width:${catPct}%"></div></div>
                                <span class="gc-cat-count">${catObtained}/${catItems.length}</span>
                            </div>`;
                        }).filter(Boolean).join('');
                        catBreakdown = cats ? `<div class="gc-breakdown" id="gcBreakdown${idx}" style="display:none">${cats}</div>` : '';
                    }

                    return `
                        <div class="guild-collection-card" data-idx="${idx}">
                            <div class="gc-main">
                                <div class="gc-rank">${medal || `#${idx + 1}`}</div>
                                <div class="gc-info">
                                    <div class="gc-member-name">${getRoleBadge(m.role)} ${escapeHtml(m.char_name)}</div>
                                    <div class="gc-member-user">@${escapeHtml(m.username)}</div>
                                </div>
                                <div class="gc-progress-area">
                                    <div class="gc-pct">${pct}%</div>
                                    <div class="gc-bar"><div class="gc-fill" style="width:${pct}%"></div></div>
                                    <div class="gc-count">${m.obtained}/${totalItems}</div>
                                </div>
                                <button class="btn-sm gc-view-btn" data-username="${escapeHtml(m.username)}" title="${t('guildViewCollection')}">👁️</button>
                                ${catBreakdown ? `<button class="btn-sm gc-expand-btn" data-idx="${idx}" title="${t('guildCollectionExpand')}">▼</button>` : ''}
                            </div>
                            ${catBreakdown}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // View full collection button
        container.querySelectorAll('.gc-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = btn.dataset.username;
                if (typeof loadGuildCollectionOf === 'function') {
                    loadGuildCollectionOf(username);
                }
            });
        });

        // Expand/collapse category breakdown
        container.querySelectorAll('.gc-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = btn.dataset.idx;
                const breakdown = document.getElementById('gcBreakdown' + idx);
                if (breakdown) {
                    const isVisible = breakdown.style.display !== 'none';
                    breakdown.style.display = isVisible ? 'none' : 'block';
                    btn.textContent = isVisible ? '▼' : '▲';
                }
            });
        });
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${escapeHtml(e.message || 'Erro ao carregar coleções')}</p></div>`;
    }
}

async function loadGuildEvents() {
    const container = document.getElementById('guildEvents');
    container.innerHTML = `<div class="empty-state"><p>⏳ ${t('loading')}</p></div>`;

    try {
        const signupsData = await guildApi('/api/guild/events/signups');
        const signups = signupsData.signups;
        const myMemberId = signupsData.myMemberId;

        const allEvents = [];
        const categories = ['events', 'bosses', 'cherry'];
        for (const cat of categories) {
            for (const event of EVENTS_DATA[cat]) {
                const occs = getNextOccurrences(event);
                if (occs.length > 0) allEvents.push(occs[0]);
            }
        }
        allEvents.sort((a, b) => a.msUntil - b.msUntil);

        if (allEvents.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">🌙</div><p>${t('noUpcoming')}</p></div>`;
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        container.innerHTML = allEvents.map(occ => {
            const eventDate = today;
            const eventSignups = signups.filter(s => s.event_id === occ.id && s.event_date === eventDate);
            const mySignup = eventSignups.find(s => s.member_id === myMemberId);
            const isGoing = !!mySignup;

            return `
                <div class="guild-event-card">
                    <div class="guild-event-info">
                        <span class="event-icon">${occ.icon}</span>
                        <div>
                            <div class="event-name">${occ.name}</div>
                            <div class="event-detail">🕐 ${occ.serverTime} (${t('server')}) | 📍 ${occ.localTime} (${t('local')})</div>
                        </div>
                    </div>
                    <div class="guild-event-actions">
                        <div class="guild-event-count">${eventSignups.length} ${t('guildGoing')}</div>
                        <button class="btn-sm ${isGoing ? 'btn-going' : ''}" data-eid="${occ.id}" data-edate="${eventDate}" data-going="${isGoing}">
                            ${isGoing ? '✅ ' + t('guildImGoing') : '➕ ' + t('guildSignUp')}
                        </button>
                    </div>
                    ${eventSignups.length > 0 ? `<div class="guild-event-participants"><span>${t('guildParticipants')}:</span> ${eventSignups.map(s => escapeHtml(s.char_name)).join(', ')}</div>` : ''}
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-eid]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const eventId = btn.dataset.eid;
                const eventDate = btn.dataset.edate;
                const isGoing = btn.dataset.going === 'true';
                try {
                    if (isGoing) {
                        await guildApi('/api/guild/events/signup', 'DELETE', { eventId, eventDate });
                    } else {
                        await guildApi('/api/guild/events/signup', 'POST', { eventId, eventDate });
                    }
                    loadGuildEvents();
                } catch (e) { showToast(e.message, 'error'); }
            });
        });
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>⚠️ ${escapeHtml(e.message)}</p></div>`;
    }
}

async function loadGuildReport() {
    const container = document.getElementById('guildReport');
    container.innerHTML = `<div class="empty-state"><p>⏳ ${t('loading')}</p></div>`;

    try {
        const data = await guildApi('/api/guild/events/report');
        if (data.report.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>${t('guildNoReport')}</p></div>`;
            return;
        }

        const grouped = {};
        for (const r of data.report) {
            const key = `${r.event_id}|${r.event_date}`;
            if (!grouped[key]) grouped[key] = { event_id: r.event_id, event_date: r.event_date, participants: [] };
            grouped[key].participants.push(r.char_name);
        }

        const allEventsMap = {};
        for (const cat of ['events', 'bosses', 'cherry']) {
            for (const ev of EVENTS_DATA[cat]) {
                allEventsMap[ev.id] = ev;
            }
        }

        container.innerHTML = `
            <div class="guild-report-list">
                ${Object.values(grouped).map(g => {
                    const ev = allEventsMap[g.event_id];
                    return `
                        <div class="guild-report-card">
                            <div class="guild-report-header">
                                <span>${ev ? ev.icon + ' ' + ev.name : g.event_id}</span>
                                <span class="guild-report-date">${g.event_date}</span>
                            </div>
                            <div class="guild-report-members">
                                <span class="guild-report-count">${g.participants.length} ${t('guildParticipants')}</span>
                                <div>${g.participants.map(p => `<span class="guild-participant-tag">${escapeHtml(p)}</span>`).join('')}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>⚠️ ${escapeHtml(e.message)}</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', initGuild);
