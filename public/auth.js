let currentUser = null;

async function apiCall(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
    return data;
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function updateAuthUI() {
    const loggedOut = document.getElementById('authLoggedOut');
    const loggedIn = document.getElementById('authLoggedIn');
    const tabAdmin = document.getElementById('tabAdmin');
    const btnAuth = document.getElementById('btnAuth');

    if (currentUser) {
        loggedOut.style.display = 'none';
        loggedIn.style.display = 'block';
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileEmail').textContent = currentUser.email || '';
        document.getElementById('authModalTitle').textContent = t('authProfile');

        if (currentUser.is_admin) {
            document.getElementById('profileBadge').style.display = 'block';
            tabAdmin.style.display = '';
        } else {
            document.getElementById('profileBadge').style.display = 'none';
            tabAdmin.style.display = 'none';
        }

        btnAuth.innerHTML = '<span aria-hidden="true">⚔️</span>';
        btnAuth.setAttribute('aria-label', currentUser.username);
    } else {
        loggedOut.style.display = 'block';
        loggedIn.style.display = 'none';
        document.getElementById('authModalTitle').textContent = t('authTitle');
        tabAdmin.style.display = 'none';
        btnAuth.innerHTML = '<span aria-hidden="true">👤</span>';
        btnAuth.setAttribute('aria-label', t('loginOrRegister'));
    }
}

async function checkSession() {
    try {
        const data = await apiCall('/api/auth/me');
        currentUser = data.user;
    } catch {
        currentUser = null;
    }
    updateAuthUI();
}

function initAuth() {
    const modal = document.getElementById('authModal');

    document.getElementById('btnAuth').addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    document.getElementById('closeAuth').addEventListener('click', () => {
        if (modal.dataset.required === 'true' && !currentUser) {
            // User must login — go back to landing
            modal.style.display = 'none';
            modal.dataset.required = '';
            goToLanding();
            return;
        }
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (modal.dataset.required === 'true' && !currentUser) {
                modal.style.display = 'none';
                modal.dataset.required = '';
                goToLanding();
                return;
            }
            modal.style.display = 'none';
        }
    });

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            const form = tab.dataset.form === 'login' ? 'authLogin' : 'authRegister';
            document.getElementById(form).classList.add('active');
            document.getElementById('authError').style.display = 'none';
        });
    });

    document.getElementById('btnLogin').addEventListener('click', async () => {
        const login = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value;
        if (!login || !password) return showAuthError(t('adminFillFields'));
        const btn = document.getElementById('btnLogin');
        btn.classList.add('btn-loading');
        btn.disabled = true;
        try {
            const data = await apiCall('/api/auth/login', 'POST', { login, password });
            currentUser = data.user;
            updateAuthUI();
            modal.dataset.required = '';
            modal.style.display = 'none';
            document.getElementById('loginUser').value = '';
            document.getElementById('loginPass').value = '';
            if (currentUser.is_admin) loadAdminData();
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.tab === 'collection') loadCollection();
        } catch (e) {
            showAuthError(e.message);
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });

    document.getElementById('btnRegister').addEventListener('click', async () => {
        const username = document.getElementById('regUser').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPass').value;
        if (!username || !email || !password) return showAuthError(t('adminFillFields'));
        // Frontend validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError(t('emailInvalid'));
        if (password.length < 6) return showAuthError(t('passMinLength'));
        const btn = document.getElementById('btnRegister');
        btn.classList.add('btn-loading');
        btn.disabled = true;
        try {
            const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ username, email, password }) };
            const res = await fetch('/api/auth/register', opts);
            const data = await res.json();
            if (!res.ok) {
                if (data.error === 'limitReached') {
                    showLimitReachedModal(data);
                    throw new Error('__handled__');
                }
                throw new Error(data.error || 'Erro');
            }
            currentUser = data.user;
            updateAuthUI();
            modal.dataset.required = '';
            modal.style.display = 'none';
            document.getElementById('regUser').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPass').value = '';
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.tab === 'collection') loadCollection();
        } catch (e) {
            if (e.message !== '__handled__') showAuthError(e.message);
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });

    document.getElementById('btnLogout').addEventListener('click', async () => {
        try {
            await apiCall('/api/auth/logout', 'POST');
        } catch {}
        currentUser = null;
        pinVerified = false;
        updateAuthUI();
        modal.style.display = 'none';
        goToLanding();
    });

    document.querySelectorAll('#loginUser, #loginPass').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btnLogin').click();
        });
    });

    document.querySelectorAll('#regUser, #regEmail, #regPass').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btnRegister').click();
        });
    });

    checkSession();
}

// ==================== ADMIN ====================

function initAdmin() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('admin' + capitalize(tab.dataset.atab)).classList.add('active');
        });
    });

    document.getElementById('btnRefreshUsers').addEventListener('click', loadUsers);

    document.getElementById('userSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.user-row').forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    });

    document.querySelectorAll('input[name="campTarget"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.getElementById('campCustomEmails').style.display =
                document.querySelector('input[name="campTarget"]:checked').value === 'custom' ? '' : 'none';
        });
    });

    document.getElementById('btnSendCampaign').addEventListener('click', sendCampaign);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function loadAdminData() {
    loadDashboard();
    loadUsers();
    loadAdminGuilds();
    loadCampaignHistory();
}

async function loadDashboard() {
    const container = document.getElementById('adminDashboard');
    if (!container) return;
    try {
        const data = await apiCall('/api/admin/dashboard');
        container.innerHTML = `
            <div class="dash-cards">
                <div class="dash-card">
                    <div class="dash-card-icon">👥</div>
                    <div class="dash-card-value">${data.totalUsers}</div>
                    <div class="dash-card-label">${t('dashTotalUsers')}</div>
                    <div class="dash-card-sub">${t('dashSlotsLeft')}: ${data.slotsLeft}/${data.maxUsers}</div>
                    <div class="dash-limit-control">
                        <label>${t('dashLimitLabel')}:</label>
                        <input type="number" id="inputMaxUsers" value="${data.maxUsers}" min="1" max="10000" class="dash-limit-input">
                        <button class="btn-sm btn-gold" onclick="updateMaxUsers()">${t('dashLimitSave')}</button>
                    </div>
                </div>
                <div class="dash-card dash-card-premium">
                    <div class="dash-card-icon">👑</div>
                    <div class="dash-card-value">${data.premiumUsers}</div>
                    <div class="dash-card-label">Premium</div>
                    <div class="dash-card-sub">${data.freeUsers} free</div>
                </div>
                <div class="dash-card dash-card-revenue">
                    <div class="dash-card-icon">💰</div>
                    <div class="dash-card-value">${data.totalPayments}</div>
                    <div class="dash-card-label">${t('dashPayments')}</div>
                    <div class="dash-card-sub">€${data.revenueEur.toFixed(2)} · R$${data.revenueBrl.toFixed(2)}</div>
                </div>
                <div class="dash-card">
                    <div class="dash-card-icon">📧</div>
                    <div class="dash-card-value">${data.totalCampaigns}</div>
                    <div class="dash-card-label">${t('dashCampaigns')}</div>
                </div>
                <div class="dash-card">
                    <div class="dash-card-icon">⚔️</div>
                    <div class="dash-card-value">${data.totalGuilds}</div>
                    <div class="dash-card-label">Guilds</div>
                </div>
                <div class="dash-card">
                    <div class="dash-card-icon">📈</div>
                    <div class="dash-card-value">${data.recentSignups}</div>
                    <div class="dash-card-label">${t('dashRecentSignups')}</div>
                </div>
            </div>
            ${data.recentPayments.length > 0 ? `
                <div class="dash-recent">
                    <h4>${t('dashRecentPayments')}</h4>
                    <div class="dash-pay-list">
                        ${data.recentPayments.map(p => `
                            <div class="dash-pay-item ${p.status === 'confirmed' ? 'confirmed' : ''}">
                                <span class="dash-pay-user">${escapeHtml(p.username)}</span>
                                <span class="dash-pay-plan">${p.plan === 'year' ? t('limitPlanYear') : t('limitPlanMonth')}</span>
                                <span class="dash-pay-amount">${p.currency} ${p.amount}</span>
                                <span class="dash-pay-status">${p.status === 'confirmed' ? '✅' : '⏳'}</span>
                                <span class="dash-pay-date">${formatDate(p.created_at)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>${t('loadError')}: ${escapeHtml(e.message)}</p></div>`;
    }
}

async function updateMaxUsers() {
    const input = document.getElementById('inputMaxUsers');
    if (!input) return;
    const value = parseInt(input.value);
    if (!value || value < 1 || value > 10000) {
        showToast(t('dashLimitInvalid'), 'error');
        return;
    }
    try {
        const res = await apiCall('/api/admin/settings/max-users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });
        if (res.ok) {
            showToast(t('dashLimitUpdated').replace('{n}', value), 'success');
            loadDashboard();
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function loadUsers() {
    try {
        const data = await apiCall('/api/admin/users');
        document.getElementById('totalUsers').textContent = data.total;
        renderUsersTable(data.users);
    } catch (e) {
        document.getElementById('usersTable').innerHTML = `<div class="empty-state"><p>${t('loadError')}: ${escapeHtml(e.message)}</p></div>`;
    }
}

function renderUsersTable(users) {
    const container = document.getElementById('usersTable');
    if (users.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${t('adminNoUsers')}</p></div>`;
        return;
    }

    container.innerHTML = `
        <div class="user-row user-row-header">
            <span>${t('adminColUser')}</span>
            <span>${t('adminColEmail')}</span>
            <span>${t('adminColStatus')}</span>
            <span>${t('adminColCreated')}</span>
            <span>${t('adminColActions')}</span>
        </div>
        ${users.map(u => {
            const premiumActive = u.is_premium;
            const premiumLabel = premiumActive
                ? `<span class="premium-badge" title="${t('adminPremiumUntil')}: ${u.premium_until}">👑 Premium</span>`
                : (u.is_admin ? '' : `<span class="free-badge">${t('adminFree')}</span>`);
            const payCount = (u.payments && u.payments.length) || 0;
            const lastPay = payCount > 0 ? u.payments[0] : null;
            const payInfo = lastPay
                ? `<span class="pay-info" title="${lastPay.currency} ${lastPay.amount} — ${formatDate(lastPay.created_at)}">${lastPay.currency} ${lastPay.amount}</span>`
                : '';

            return `
            <div class="user-row ${premiumActive ? 'user-premium' : ''}" data-id="${u.id}">
                <span class="user-row-name">
                    ${u.is_admin ? '👑 ' : ''}${escapeHtml(u.username)}
                </span>
                <span class="user-row-email">${escapeHtml(u.email)}</span>
                <span class="user-row-status">
                    ${u.is_admin ? `<span class="admin-label">${t('adminLabel')}</span>` : premiumLabel}
                    ${payInfo}
                </span>
                <span class="user-row-date">${formatDate(u.created_at)}</span>
                <span class="user-row-actions">
                    ${u.is_admin ? '' : `
                        ${premiumActive
                            ? `<button class="btn-sm btn-warning btn-revoke-premium" data-uid="${u.id}" title="${t('adminRevokePremium')}">${t('adminRevoke')}</button>`
                            : `<button class="btn-sm btn-success btn-grant-premium" data-uid="${u.id}" title="${t('adminGrantPremium')}">👑 Premium</button>`
                        }
                        <button class="btn-sm btn-danger btn-delete-user" data-uid="${u.id}">${t('adminRemove')}</button>
                    `}
                </span>
            </div>`;
        }).join('')}
    `;

    // Event delegation
    container.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(parseInt(btn.dataset.uid)));
    });
    container.querySelectorAll('.btn-grant-premium').forEach(btn => {
        btn.addEventListener('click', () => showGrantPremiumModal(parseInt(btn.dataset.uid)));
    });
    container.querySelectorAll('.btn-revoke-premium').forEach(btn => {
        btn.addEventListener('click', () => revokePremium(parseInt(btn.dataset.uid)));
    });
}

async function loadAdminGuilds() {
    const container = document.getElementById('adminGuilds');
    if (!container) return;
    try {
        const data = await apiCall('/api/admin/guilds');
        if (!data.guilds || data.guilds.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚔️</div><p>Nenhuma guild cadastrada</p></div>`;
            return;
        }
        const roleLabels = { master: '👑 Mestre', assistant: '⭐ Assistente', party_assistant: '🎯 Party Assist.', member: 'Membro' };
        container.innerHTML = `
            <div style="margin-bottom:12px;color:#8888aa;font-size:13px;">Total: ${data.total} guild${data.total !== 1 ? 's' : ''}</div>
            ${data.guilds.map(g => `
                <div class="guild-admin-card" style="background:#1a1a35;border:1px solid #2a2a4a;border-radius:10px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div>
                            <strong style="color:#f5a623;font-size:16px;">⚔️ ${escapeHtml(g.name)}</strong>
                            <span style="color:#8888aa;font-size:12px;margin-left:8px;">Código: <code style="background:#0d0d20;padding:2px 6px;border-radius:4px;color:#f5a623;">${escapeHtml(g.join_code)}</code></span>
                        </div>
                        <span style="color:#8888aa;font-size:12px;">${g.member_count} membro${g.member_count !== 1 ? 's' : ''} · Criada ${formatDate(g.created_at)}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px;">
                        ${g.members.map(m => `
                            <div style="background:#0d0d20;padding:8px 12px;border-radius:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
                                <span style="color:#e8e8f0;">${escapeHtml(m.char_name)} <span style="color:#666;font-size:11px;">(${escapeHtml(m.username || '?')})</span></span>
                                <span style="color:${m.role === 'master' ? '#f5a623' : m.role === 'assistant' ? '#4fc3f7' : '#8888aa'};font-size:11px;">${roleLabels[m.role] || m.role}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>Erro ao carregar guilds: ${escapeHtml(e.message)}</p></div>`;
    }
}

async function deleteUser(id) {
    const yes = await customConfirm(t('adminConfirmDelete'), '🗑️');
    if (!yes) return;
    try {
        await apiCall(`/api/admin/users/${id}`, 'DELETE');
        loadUsers();
        showToast(t('adminRemove') + ' ✓', 'success');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function sendCampaign() {
    const subject = document.getElementById('campSubject').value.trim();
    const body = document.getElementById('campBody').value.trim();
    if (!subject || !body) return showToast(t('adminFillFields'), 'warning');

    const target = document.querySelector('input[name="campTarget"]:checked').value;
    let targetEmails = null;
    if (target === 'custom') {
        const raw = document.getElementById('campCustomEmails').value.trim();
        if (!raw) return showToast(t('adminNoEmails'), 'warning');
        targetEmails = raw.split(/[,;\n]+/).map(e => e.trim()).filter(Boolean);
    }

    const btn = document.getElementById('btnSendCampaign');
    btn.disabled = true;
    btn.textContent = t('adminSending');

    try {
        const data = await apiCall('/api/admin/campaign', 'POST', { subject, body, targetEmails });
        const result = document.getElementById('campResult');
        result.style.display = 'block';
        result.className = 'camp-result success';
        result.innerHTML = `✅ ${t('adminCampaignSent')} ${data.sent || 0} de ${data.total} emails.${data.message ? '<br><small>' + data.message + '</small>' : ''}`;
        document.getElementById('campSubject').value = '';
        document.getElementById('campBody').value = '';
        loadCampaignHistory();
    } catch (e) {
        const result = document.getElementById('campResult');
        result.style.display = 'block';
        result.className = 'camp-result error';
        result.innerHTML = `❌ ${t('adminCampaignError')}: ` + e.message;
    } finally {
        btn.disabled = false;
        btn.textContent = t('adminSendCampaign');
    }
}

async function loadCampaignHistory() {
    try {
        const data = await apiCall('/api/admin/campaigns');
        const container = document.getElementById('campaignHistory');
        if (data.campaigns.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${t('adminNoCampaigns')}</p></div>`;
            return;
        }
        container.innerHTML = data.campaigns.map(c => `
            <div class="campaign-card">
                <div class="campaign-card-header">
                    <strong>${escapeHtml(c.subject)}</strong>
                    <span class="campaign-meta">${c.recipients_count} ${c.recipients_count !== 1 ? t('adminRecipientCountPlural') : t('adminRecipientCount')}</span>
                </div>
                <div class="campaign-card-body">${escapeHtml(c.body).substring(0, 150)}${c.body.length > 150 ? '...' : ''}</div>
                <div class="campaign-card-footer">
                    <span>${t('adminSentBy')}: ${escapeHtml(c.sent_by_name || 'Admin')}</span>
                    <span>${formatDate(c.sent_at)}</span>
                </div>
            </div>
        `).join('');
    } catch {
        document.getElementById('campaignHistory').innerHTML = `<div class="empty-state"><p>${t('loadHistoryError')}</p></div>`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
        ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== PIN SECURITY ====================

let pinVerified = false;
let pinCallbackFn = null;

function initPin() {
    const pinModal = document.getElementById('pinModal');
    const pinInput = document.getElementById('pinVerifyInput');
    const pinDots = document.querySelectorAll('#pinDots .pin-dot');

    document.getElementById('closePinModal').addEventListener('click', () => {
        pinModal.style.display = 'none';
        pinInput.value = '';
        updatePinDots('');
    });

    pinModal.addEventListener('click', (e) => {
        if (e.target === pinModal) {
            pinModal.style.display = 'none';
            pinInput.value = '';
            updatePinDots('');
        }
    });

    pinInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '').substring(0, 6);
        e.target.value = val;
        updatePinDots(val);

        if (val.length === 6) {
            verifyPin(val);
        }
    });

    // Settings PIN section
    document.getElementById('btnActivatePin')?.addEventListener('click', () => {
        document.getElementById('pinDisabled').style.display = 'none';
        document.getElementById('pinSetupForm').style.display = '';
        document.getElementById('pinCurrentPass').value = '';
        document.getElementById('pinInput').value = '';
        document.getElementById('pinConfirm').value = '';
    });

    document.getElementById('btnCancelPin')?.addEventListener('click', () => {
        document.getElementById('pinSetupForm').style.display = 'none';
        document.getElementById('pinDisabled').style.display = '';
    });

    document.getElementById('btnSavePin')?.addEventListener('click', savePin);

    document.getElementById('btnDisablePin')?.addEventListener('click', () => {
        document.getElementById('pinEnabled').style.display = 'none';
        document.getElementById('pinDisableForm').style.display = '';
        document.getElementById('pinDisablePass').value = '';
    });

    document.getElementById('btnCancelDisablePin')?.addEventListener('click', () => {
        document.getElementById('pinDisableForm').style.display = 'none';
        document.getElementById('pinEnabled').style.display = '';
    });

    document.getElementById('btnConfirmDisablePin')?.addEventListener('click', disablePin);

    // Only filter numeric on PIN code inputs
    document.querySelectorAll('.pin-code-input').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        });
    });
}

function updatePinDots(val) {
    const dots = document.querySelectorAll('#pinDots .pin-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < val.length);
        dot.classList.remove('error');
    });
}

async function verifyPin(pin) {
    try {
        await apiCall('/api/auth/pin-verify', 'POST', { pin });
        pinVerified = true;
        document.getElementById('pinModal').style.display = 'none';
        document.getElementById('pinVerifyInput').value = '';
        updatePinDots('');
        if (pinCallbackFn) {
            pinCallbackFn();
            pinCallbackFn = null;
        }
    } catch (e) {
        const dots = document.querySelectorAll('#pinDots .pin-dot');
        dots.forEach(d => d.classList.add('error'));
        const errEl = document.getElementById('pinVerifyError');
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        setTimeout(() => {
            document.getElementById('pinVerifyInput').value = '';
            updatePinDots('');
            errEl.style.display = 'none';
        }, 1500);
    }
}

function showPinModal(callback) {
    pinCallbackFn = callback;
    document.getElementById('pinModal').style.display = 'flex';
    document.getElementById('pinVerifyInput').value = '';
    updatePinDots('');
    document.getElementById('pinVerifyError').style.display = 'none';
    setTimeout(() => document.getElementById('pinVerifyInput').focus(), 100);
}

async function loadPinStatus() {
    const section = document.getElementById('pinSection');
    if (!currentUser) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';

    try {
        const data = await apiCall('/api/auth/pin-status');
        document.getElementById('pinEnabled').style.display = data.enabled ? '' : 'none';
        document.getElementById('pinDisabled').style.display = data.enabled ? 'none' : '';
        document.getElementById('pinSetupForm').style.display = 'none';
        document.getElementById('pinDisableForm').style.display = 'none';
    } catch {
        section.style.display = 'none';
    }
}

async function savePin() {
    const pass = document.getElementById('pinCurrentPass').value;
    const pin = document.getElementById('pinInput').value;
    const confirm = document.getElementById('pinConfirm').value;
    const errEl = document.getElementById('pinError');

    if (!pass || !pin || !confirm) {
        errEl.textContent = t('adminFillFields');
        errEl.style.display = 'block';
        return;
    }
    if (!/^\d{6}$/.test(pin)) {
        errEl.textContent = t('pinExact6');
        errEl.style.display = 'block';
        return;
    }
    if (pin !== confirm) {
        errEl.textContent = t('pinNoMatch');
        errEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('btnSavePin');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    try {
        await apiCall('/api/auth/pin-set', 'POST', { pin, currentPassword: pass });
        pinVerified = false;
        loadPinStatus();
        showToast('PIN ' + t('settingsPinOn').toLowerCase() + ' ✓', 'success');
    } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        setTimeout(() => { errEl.style.display = 'none'; }, 5000);
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

async function disablePin() {
    const pass = document.getElementById('pinDisablePass').value;
    const errEl = document.getElementById('pinDisableError');

    if (!pass) {
        errEl.textContent = t('adminFillFields');
        errEl.style.display = 'block';
        return;
    }

    try {
        await apiCall('/api/auth/pin-disable', 'POST', { currentPassword: pass });
        pinVerified = false;
        loadPinStatus();
    } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        setTimeout(() => { errEl.style.display = 'none'; }, 5000);
    }
}

// ==================== FORGOT / RESET PASSWORD ====================

function initForgotPassword() {
    const link = document.getElementById('forgotPassLink');
    if (!link) return;
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordForm();
    });

    // Check URL for reset token on load
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset');
    if (resetToken) {
        showResetPasswordForm(resetToken);
        // Clean URL
        window.history.replaceState({}, '', '/');
    }
}

function showForgotPasswordForm() {
    const modal = document.getElementById('authModal');
    const loggedOut = document.getElementById('authLoggedOut');
    loggedOut.innerHTML = `
        <div class="forgot-form">
            <h3 style="color:var(--accent); margin:0 0 8px;">🔑 ${t('forgotTitle')}</h3>
            <p style="font-size:13px; color:var(--text-secondary); margin:0 0 16px;">${t('forgotDesc')}</p>
            <label>${t('authRegEmailLabel')}</label>
            <input type="email" id="forgotEmail" placeholder="${t('authRegEmailPlaceholder')}" />
            <button class="btn-primary" id="btnForgotSend" style="margin-top:12px;">${t('forgotSend')}</button>
            <div id="forgotMsg" style="display:none; margin-top:12px; font-size:13px; text-align:center;"></div>
            <a href="#" id="forgotBack" class="forgot-link" style="margin-top:12px; display:block; text-align:center;">${t('forgotBack')}</a>
        </div>
    `;
    modal.style.display = 'flex';

    document.getElementById('btnForgotSend').addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail').value.trim();
        if (!email) return;
        const btn = document.getElementById('btnForgotSend');
        btn.classList.add('btn-loading');
        btn.disabled = true;
        try {
            await apiCall('/api/auth/forgot-password', 'POST', { email });
            const msg = document.getElementById('forgotMsg');
            msg.style.display = 'block';
            msg.style.color = '#4caf50';
            msg.textContent = t('forgotSent');
        } catch (e) {
            const msg = document.getElementById('forgotMsg');
            msg.style.display = 'block';
            msg.style.color = '#f44336';
            msg.textContent = e.message;
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });

    document.getElementById('forgotBack').addEventListener('click', (e) => {
        e.preventDefault();
        rebuildAuthLoggedOut();
    });
}

function showResetPasswordForm(token) {
    // Force show auth modal with reset form
    const modal = document.getElementById('authModal');
    const loggedOut = document.getElementById('authLoggedOut');
    loggedOut.innerHTML = `
        <div class="forgot-form">
            <h3 style="color:var(--accent); margin:0 0 8px;">🔑 ${t('resetTitle')}</h3>
            <p style="font-size:13px; color:var(--text-secondary); margin:0 0 16px;">${t('resetDesc')}</p>
            <label>${t('resetNewPass')}</label>
            <input type="password" id="resetNewPass" placeholder="${t('authRegPassPlaceholder')}" />
            <label style="margin-top:8px;">${t('resetConfirmPass')}</label>
            <input type="password" id="resetConfirmPass" placeholder="${t('resetConfirmPass')}" />
            <button class="btn-primary" id="btnResetSend" style="margin-top:12px;">${t('resetSend')}</button>
            <div id="resetMsg" style="display:none; margin-top:12px; font-size:13px; text-align:center;"></div>
        </div>
    `;
    modal.style.display = 'flex';

    document.getElementById('btnResetSend').addEventListener('click', async () => {
        const password = document.getElementById('resetNewPass').value;
        const confirm = document.getElementById('resetConfirmPass').value;
        const msg = document.getElementById('resetMsg');
        if (!password || !confirm) return;
        if (password.length < 6) {
            msg.style.display = 'block'; msg.style.color = '#f44336'; msg.textContent = t('passMinLength'); return;
        }
        if (password !== confirm) {
            msg.style.display = 'block'; msg.style.color = '#f44336'; msg.textContent = t('resetNoMatch'); return;
        }
        const btn = document.getElementById('btnResetSend');
        btn.classList.add('btn-loading');
        btn.disabled = true;
        try {
            await apiCall('/api/auth/reset-password', 'POST', { token, password });
            msg.style.display = 'block'; msg.style.color = '#4caf50'; msg.textContent = t('resetSuccess');
            setTimeout(() => {
                rebuildAuthLoggedOut();
            }, 2000);
        } catch (e) {
            msg.style.display = 'block'; msg.style.color = '#f44336'; msg.textContent = e.message;
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}

function rebuildAuthLoggedOut() {
    // Reload page to rebuild the auth forms cleanly
    location.reload();
}

// ==================== ADMIN PREMIUM MANAGEMENT ====================

function showGrantPremiumModal(userId) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-box" style="max-width:420px; text-align:left;">
            <div class="confirm-icon" style="text-align:center;">👑</div>
            <div class="confirm-msg" style="text-align:center; margin-bottom:16px;">${t('adminGrantPremium')}</div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">${t('adminPremiumPlan')}</label>
                <select id="grantPlan" style="width:100%; padding:8px 12px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border); color:var(--text-primary); font-size:14px;">
                    <option value="year">${t('limitPlanYear')} — €10 / R$59,90</option>
                    <option value="month">${t('limitPlanMonth')} — €3 / R$10</option>
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">${t('adminPremiumCurrency')}</label>
                <select id="grantCurrency" style="width:100%; padding:8px 12px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border); color:var(--text-primary); font-size:14px;">
                    <option value="EUR">EUR (€)</option>
                    <option value="BRL">BRL (R$)</option>
                </select>
            </div>
            <div style="margin-bottom:16px;">
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">${t('adminPremiumNotes')}</label>
                <input type="text" id="grantNotes" placeholder="${t('adminPremiumNotesPlaceholder')}" style="width:100%; padding:8px 12px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border); color:var(--text-primary); font-size:13px; box-sizing:border-box;">
            </div>
            <div class="confirm-actions">
                <button class="confirm-btn confirm-btn-cancel" id="grantCancel">${t('confirmCancel')}</button>
                <button class="confirm-btn" id="grantConfirm" style="background:rgba(76,175,80,0.2); border-color:rgba(76,175,80,0.4); color:#4caf50;">👑 ${t('adminActivate')}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const priceMap = { year: { EUR: 10, BRL: 59.90 }, month: { EUR: 3, BRL: 10 } };

    overlay.querySelector('#grantCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#grantConfirm').addEventListener('click', async () => {
        const plan = overlay.querySelector('#grantPlan').value;
        const currency = overlay.querySelector('#grantCurrency').value;
        const amount = priceMap[plan][currency];
        const notes = overlay.querySelector('#grantNotes').value.trim();

        try {
            await apiCall(`/api/admin/users/${userId}/premium`, 'POST', { plan, amount, currency, notes });
            overlay.remove();
            showToast('Premium ' + t('settingsPinOn').toLowerCase() + ' ✓', 'success');
            loadUsers();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function revokePremium(userId) {
    const yes = await customConfirm(t('adminRevokeConfirm'), '⚠️');
    if (!yes) return;
    try {
        await apiCall(`/api/admin/users/${userId}/premium`, 'DELETE');
        showToast('Premium ' + t('adminRevoked') + ' ✓', 'success');
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ==================== PREMIUM / LIMIT REACHED ====================

function showLimitReachedModal(data) {
    const pricing = data.pricing || { eur: 10, brl: 59.90, eurMonth: 3, brlMonth: 10 };
    const limit = data.limit || 40;

    const overlay = document.createElement('div');
    overlay.className = 'premium-overlay';
    overlay.innerHTML = `
        <div class="premium-box">
            <div class="premium-icon">👑</div>
            <div class="premium-title">${t('limitReachedTitle')}</div>
            <div class="premium-msg">${t('limitReachedMsg').replace('{limit}', limit)}</div>
            <div class="premium-label">${t('limitReachedPremium')}</div>

            <div class="premium-plan-label">⭐ ${t('limitPlanYear')}</div>
            <div class="premium-prices">
                <div class="premium-price-card premium-best">
                    <div class="premium-price-flag">🇪🇺</div>
                    <div class="premium-price-value">${t('limitPriceEurYear').replace('{price}', pricing.eur)}</div>
                    <div class="premium-price-period">EUR</div>
                </div>
                <div class="premium-price-card premium-best">
                    <div class="premium-price-flag">🇧🇷</div>
                    <div class="premium-price-value">${t('limitPriceBrlYear').replace('{price}', pricing.brl.toFixed(2).replace('.', ','))}</div>
                    <div class="premium-price-period">BRL</div>
                </div>
            </div>

            <div class="premium-plan-label">${t('limitPlanMonth')}</div>
            <div class="premium-prices">
                <div class="premium-price-card">
                    <div class="premium-price-flag">🇪🇺</div>
                    <div class="premium-price-value">${t('limitPriceEurMonth').replace('{price}', pricing.eurMonth)}</div>
                    <div class="premium-price-period">EUR</div>
                </div>
                <div class="premium-price-card">
                    <div class="premium-price-flag">🇧🇷</div>
                    <div class="premium-price-value">${t('limitPriceBrlMonth').replace('{price}', pricing.brlMonth)}</div>
                    <div class="premium-price-period">BRL</div>
                </div>
            </div>

            <div class="premium-actions">
                <button class="premium-btn premium-btn-revolut" id="premiumBtnRevolut">
                    <span>💳</span> <span>${t('limitPayRevolut')}</span>
                </button>
                <button class="premium-btn premium-btn-pix" id="premiumBtnPix">
                    <span>📱</span> <span>${t('limitPayPix')}</span>
                </button>
            </div>
            <div class="premium-contact">${t('limitContactInfo')}</div>
            <button class="premium-close-btn" id="premiumCloseBtn">${t('limitClose')}</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close
    overlay.querySelector('#premiumCloseBtn').addEventListener('click', () => {
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Pay with Revolut (EUR)
    overlay.querySelector('#premiumBtnRevolut').addEventListener('click', () => {
        if (typeof openRevolut === 'function') {
            openRevolut(pricing.eur, 'EUR');
        } else {
            window.open('https://revolut.me', '_blank');
        }
    });

    // Pay with PIX (BRL)
    overlay.querySelector('#premiumBtnPix').addEventListener('click', async () => {
        if (typeof generatePix === 'function') {
            // Open donate modal for PIX flow
            overlay.remove();
            const donateModal = document.getElementById('donateModal');
            if (donateModal) donateModal.style.display = 'flex';
            await generatePix(pricing.brl);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initAdmin();
    initPin();
    initForgotPassword();
});
