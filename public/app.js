const alarm = new AlarmSystem();
const muChat = new MuChat();
let settings = loadSettings();
let enabledAlarms = loadEnabledAlarms();
let firedAlarms = new Set();
let eliteKillTimers = loadEliteKillTimers();
let eliteKillCounts = loadEliteKillCounts();
let bcCrystalActive = JSON.parse(localStorage.getItem('mudream_bc_crystal') || 'null');
let ccDiedAt = JSON.parse(localStorage.getItem('mudream_cc_died') || 'null');

// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${escapeHtml(message)}</span><button class="toast-close" aria-label="Fechar">✕</button>`;
    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
    container.appendChild(toast);
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
}

// ==================== CUSTOM CONFIRM ====================
function customConfirm(message, icon = '⚠️') {
    return new Promise(resolve => {
        const overlay = document.getElementById('confirmModal');
        overlay.style.display = '';
        overlay.innerHTML = `
            <div class="confirm-overlay">
                <div class="confirm-box">
                    <div class="confirm-icon">${icon}</div>
                    <div class="confirm-msg">${escapeHtml(message)}</div>
                    <div class="confirm-actions">
                        <button class="confirm-btn confirm-btn-cancel" id="confirmNo">${t('confirmCancel')}</button>
                        <button class="confirm-btn confirm-btn-danger" id="confirmYes">${t('confirmYes')}</button>
                    </div>
                </div>
            </div>
        `;
        const close = (result) => {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
            resolve(result);
        };
        document.getElementById('confirmYes').addEventListener('click', () => close(true));
        document.getElementById('confirmNo').addEventListener('click', () => close(false));
        overlay.querySelector('.confirm-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('confirm-overlay')) close(false);
        });
        document.getElementById('confirmYes').focus();
    });
}

// ==================== FOCUS TRAP ====================
function trapFocus(modal) {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return null;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handler = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };
    modal.addEventListener('keydown', handler);
    return handler;
}

function setupModalFocusTrap(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const observer = new MutationObserver(() => {
        if (modal.style.display === 'flex' || modal.style.display === '') {
            trapFocus(modal);
            const firstInput = modal.querySelector('input:not([type="hidden"]), button.modal-close');
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    // Close on Escape
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
        }
    });
}

function getAlarmIntervals() {
    const intervals = [];
    if (settings.alarm15) intervals.push(15);
    if (settings.alarm5) intervals.push(5);
    if (settings.alarm0) intervals.push(0);
    return intervals;
}

function loadSettings() {
    const defaults = { sound: 'default', volume: 70, browserNotif: true, soundAlarm: true, alarm15: true, alarm5: true, alarm0: true };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('mudream_settings')) }; } catch { return defaults; }
}

function saveSettings() {
    localStorage.setItem('mudream_settings', JSON.stringify(settings));
}

function loadEnabledAlarms() {
    try { return new Set(JSON.parse(localStorage.getItem('mudream_alarms'))); } catch { return new Set(); }
}

function saveEnabledAlarms() {
    localStorage.setItem('mudream_alarms', JSON.stringify([...enabledAlarms]));
    // Sync to server (fire-and-forget)
    syncAlarmsToServer();
}

let _alarmSyncTimer = null;
function syncAlarmsToServer() {
    // Debounce: wait 1s after last toggle before syncing
    clearTimeout(_alarmSyncTimer);
    _alarmSyncTimer = setTimeout(async () => {
        try {
            await fetch('/api/user/alarms', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ alarms: [...enabledAlarms] })
            });
        } catch {}
    }, 1000);
}

async function loadAlarmsFromServer() {
    try {
        const res = await fetch('/api/user/alarms', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.alarms && data.alarms.length > 0) {
            enabledAlarms = new Set(data.alarms);
            localStorage.setItem('mudream_alarms', JSON.stringify(data.alarms));
        }
        if (data.eliteTimers && Object.keys(data.eliteTimers).length > 0) {
            eliteKillTimers = data.eliteTimers;
            localStorage.setItem('mudream_elite_timers', JSON.stringify(eliteKillTimers));
        }
    } catch {}
}

// ==================== ELITE KILL TIMERS ====================

function loadEliteKillTimers() {
    try { return JSON.parse(localStorage.getItem('mudream_elite_timers')) || {}; } catch { return {}; }
}

function loadEliteKillCounts() {
    try { return JSON.parse(localStorage.getItem('mudream_elite_counts')) || {}; } catch { return {}; }
}
function saveEliteKillCounts() {
    localStorage.setItem('mudream_elite_counts', JSON.stringify(eliteKillCounts));
}

function saveEliteKillTimers() {
    localStorage.setItem('mudream_elite_timers', JSON.stringify(eliteKillTimers));
    syncEliteTimersToServer();
}

let _eliteSyncTimer = null;
function syncEliteTimersToServer() {
    clearTimeout(_eliteSyncTimer);
    _eliteSyncTimer = setTimeout(async () => {
        try {
            await fetch('/api/user/elite-timers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ timers: eliteKillTimers })
            });
        } catch {}
    }, 500);
}

function markEliteKilled(eliteId, mapName) {
    const key = `${eliteId}__${mapName}`;
    eliteKillTimers[key] = Date.now();
    eliteKillCounts[key] = (eliteKillCounts[key] || 0) + 1;
    saveEliteKillTimers();
    saveEliteKillCounts();
    renderElites();
}

function clearEliteTimer(key) {
    delete eliteKillTimers[key];
    saveEliteKillTimers();
    renderElites();
}

function addEliteKill(key) {
    eliteKillCounts[key] = (eliteKillCounts[key] || 0) + 1;
    saveEliteKillCounts();
    renderElites();
}

function resetEliteCount(key) {
    eliteKillCounts[key] = 0;
    saveEliteKillCounts();
    renderElites();
}

function getEliteRespawnMs(key) {
    const killTime = eliteKillTimers[key];
    if (!killTime) return null;
    const respawnAt = killTime + 60 * 60 * 1000; // 1 hour
    const remaining = respawnAt - Date.now();
    return remaining > 0 ? remaining : null; // null = already respawned
}

function renderElites() {
    const container = document.getElementById('elitesList');
    if (!container) return;
    container.innerHTML = '';

    for (const elite of EVENTS_DATA.elites) {
        const map = elite.map || elite.id;
        const key = `${elite.id}__${map}`;
        const remaining = getEliteRespawnMs(key);
        const killTime = eliteKillTimers[key];
        const isActive = remaining !== null;
        const hasRespawned = killTime && remaining === null;

        const card = document.createElement('div');
        card.className = 'elite-card';
        card.dataset.key = key;

        let statusHtml;
        if (isActive) {
            statusHtml = `
                <span class="elite-timer" style="color:#f5a623;font-weight:bold;">${formatCountdown(remaining)}</span>
                <button class="btn-sm btn-elite-clear" onclick="clearEliteTimer('${key}')" title="Cancelar">✕</button>
            `;
        } else if (hasRespawned) {
            statusHtml = `
                <span class="elite-timer" style="color:#66bb6a;font-weight:bold;">${t('eliteRespawned')}</span>
                <button class="btn-sm btn-elite-kill" onclick="markEliteKilled('${elite.id}','${map}')">${t('eliteKilled')}</button>
                <button class="btn-sm btn-elite-clear" onclick="clearEliteTimer('${key}')" title="Limpar">✕</button>
            `;
        } else {
            statusHtml = `
                <button class="btn-sm btn-elite-kill" onclick="markEliteKilled('${elite.id}','${map}')">${t('eliteKilled')}</button>
            `;
        }

        const killCount = eliteKillCounts[key] || 0;
        const maxKills = 10;
        const countPct = Math.min(killCount / maxKills * 100, 100);
        const countColor = killCount >= maxKills ? '#66bb6a' : '#f5a623';

        card.innerHTML = `
            <div class="event-card" style="--card-accent:${elite.color};cursor:default;">
                ${elite.img ? `<div class="event-icon event-icon-img"><img src="${elite.img}" alt="${elite.name}"></div>` : `<div class="event-icon">${elite.icon}</div>`}
                <div class="event-info">
                    <div class="event-name">${elite.name}</div>
                    <div class="event-detail">📍 ${map}</div>
                </div>
                <div class="elite-count" title="Kills: ${killCount}/${maxKills}">
                    <div class="elite-count-bar"><div class="elite-count-fill" style="width:${countPct}%;background:${countColor}"></div></div>
                    <span class="elite-count-label" style="color:${countColor}">${killCount}/${maxKills}</span>
                    <button class="btn-elite-add" onclick="addEliteKill('${key}')" title="Adicionar kill">+</button>
                    ${killCount > 0 ? `<button class="btn-elite-reset" onclick="resetEliteCount('${key}')" title="Zerar contador">↺</button>` : ''}
                </div>
                <div class="elite-status">
                    ${statusHtml}
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

function renderGolden() {
    const container = document.getElementById('goldenList');
    if (!container) return;
    container.innerHTML = '';

    // Group golden monsters by city (location)
    const groups = {};
    for (const g of (EVENTS_DATA.golden || [])) {
        const key = g.map || 'Outros';
        if (!groups[key]) groups[key] = [];
        groups[key].push(g);
    }

    for (const map of Object.keys(groups)) {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'golden-group-header';
        groupHeader.innerHTML = `<span class="golden-group-icon">📍</span><span>${map}</span>`;
        container.appendChild(groupHeader);

        for (const g of groups[map]) {
            const key = `golden__${g.id}`;
            const killCount = eliteKillCounts[key] || 0;
            const maxKills = g.qty;
            const countPct = Math.min(killCount / maxKills * 100, 100);
            const countColor = killCount >= maxKills ? '#66bb6a' : '#f5a623';
            const card = document.createElement('div');
            card.className = 'elite-card golden-card';
            card.dataset.key = key;
            card.innerHTML = `
                <div class="event-card" style="--card-accent:${g.color};cursor:default;">
                    ${g.img
                        ? `<div class="event-icon event-icon-img"><img src="${g.img}" alt="${g.name}"></div>`
                        : `<div class="event-icon">${g.icon || '✨'}</div>`}
                    <div class="event-info">
                        <div class="event-name">${g.name}</div>
                        <div class="event-detail">📍 ${g.map} · qty ${g.qty}${g.note ? ' · ' + g.note : ''}</div>
                    </div>
                    <div class="elite-count" title="Kills: ${killCount}/${maxKills}">
                        <div class="elite-count-bar"><div class="elite-count-fill" style="width:${countPct}%;background:${countColor}"></div></div>
                        <span class="elite-count-label" style="color:${countColor}">${killCount}/${maxKills}</span>
                        <button class="btn-elite-add" onclick="addEliteKill('${key}')" title="Adicionar kill">+</button>
                        ${killCount > 0 ? `<button class="btn-elite-reset" onclick="resetEliteCount('${key}')" title="Zerar contador">↺</button>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(card);
        }
    }
}

function updateEliteCountdowns() {
    const cards = document.querySelectorAll('.elite-card');
    let needsFullRender = false;
    cards.forEach(card => {
        const key = card.dataset.key;
        if (!key || !eliteKillTimers[key]) return;
        const remaining = getEliteRespawnMs(key);
        const timerEl = card.querySelector('.elite-timer');
        if (!timerEl) return;
        if (remaining !== null) {
            timerEl.textContent = formatCountdown(remaining);
            timerEl.style.color = '#f5a623';
        } else if (timerEl.textContent !== t('eliteRespawned')) {
            needsFullRender = true;
        }
    });
    if (needsFullRender) renderElites();
}

function checkEliteAlarms() {
    const intervals = getAlarmIntervals();
    for (const elite of (EVENTS_DATA.elites || [])) {
        if (!enabledAlarms.has(elite.id)) continue;
        const map = elite.map || elite.id;
        const key = `${elite.id}__${map}`;
        const remaining = getEliteRespawnMs(key);
        if (remaining === null) continue;
        const minutesUntil = remaining / 60000;

        for (const interval of intervals) {
            const alarmKey = `elite-${key}-${interval}`;
            if (firedAlarms.has(alarmKey)) continue;

            if (interval === 0 && minutesUntil <= 0.5 && minutesUntil >= -0.5) {
                firedAlarms.add(alarmKey);
                const msg = t('eliteRespawnedToast', { name: elite.name, map });
                showToast(msg, 'success', 8000);
                alarm.playForElite();
                alarm.sendNotification('MU Timer Dream', msg);
            } else if (interval > 0 && minutesUntil > 0 && minutesUntil <= interval && minutesUntil > interval - 1) {
                firedAlarms.add(alarmKey);
                const msg = t('eliteRespawnsIn', { name: elite.name, min: Math.ceil(minutesUntil), map });
                showToast(msg, 'warning', 6000);
                alarm.playForElite();
                alarm.sendNotification('MU Timer Dream', msg);
            }
        }
    }
}

function getServerTime() {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + SERVER_UTC_OFFSET * 3600000);
}

function serverTimeToLocal(serverHour, serverMinute) {
    const now = new Date();
    const serverNow = getServerTime();
    const serverDate = new Date(serverNow);
    serverDate.setHours(serverHour, serverMinute, 0, 0);
    const diffMs = serverNow.getTime() - now.getTime();
    return new Date(serverDate.getTime() - diffMs);
}

function formatTime(h, m) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Returns translated string when value is { pt, en } object, or raw string for legacy entries
function localize(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[currentLang] || val.pt || val.en || '';
}

function formatCountdown(ms) {
    if (ms < 0) return t('now');
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
}

function getNextOccurrences(event) {
    const serverNow = getServerTime();
    const nowMs = serverNow.getTime();
    const results = [];

    if (!event.times || event.times.length === 0) return results;

    for (const timeStr of event.times) {
        const [h, m] = timeStr.split(':').map(Number);

        for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
            const eventDate = new Date(serverNow);
            eventDate.setDate(eventDate.getDate() + dayOffset);
            eventDate.setHours(h, m, 0, 0);

            if (event.weekday !== undefined) {
                const currentDay = serverNow.getDay();
                let daysUntil = event.weekday - currentDay;
                if (daysUntil < 0) daysUntil += 7;
                if (daysUntil === 0 && eventDate.getTime() < nowMs) daysUntil = 7;
                eventDate.setDate(serverNow.getDate() + daysUntil);
            }

            const msUntil = eventDate.getTime() - nowMs;
            const durationMs = (event.duration || 0) * 60000;

            if (msUntil > -durationMs && msUntil < 24 * 3600000) {
                const localTime = serverTimeToLocal(h, m);
                results.push({
                    ...event,
                    serverTime: timeStr,
                    localTime: formatTime(localTime.getHours(), localTime.getMinutes()),
                    msUntil,
                    isActive: msUntil <= 0 && msUntil > -durationMs,
                    eventDate
                });
            }
        }
    }

    const seen = new Set();
    return results.filter(r => {
        const key = `${r.id}-${r.serverTime}-${r.eventDate.toDateString()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a, b) => a.msUntil - b.msUntil);
}

function getAllUpcoming() {
    const all = [];
    const categories = ['events', 'bosses', 'cherry'];
    for (const cat of categories) {
        for (const event of EVENTS_DATA[cat]) {
            const occs = getNextOccurrences(event);
            if (occs.length > 0) {
                all.push(occs[0]);
            }
        }
    }
    return all.sort((a, b) => a.msUntil - b.msUntil);
}

function createEventCard(occ, showToggle = true) {
    const card = document.createElement('div');
    card.className = 'event-card';
    if (occ.isActive) card.classList.add('active-event');

    const minutesUntil = occ.msUntil / 60000;
    if (minutesUntil > 0 && minutesUntil <= 15) {
        card.classList.add('imminent');
    }

    card.style.setProperty('--card-accent', occ.color);

    const isOn = enabledAlarms.has(occ.id);

    let countdownClass = '';
    if (occ.isActive) countdownClass = 'active';
    else if (minutesUntil <= 5) countdownClass = 'soon';

    let countdownText = occ.isActive ? `🟢 ${t('inProgress')}` : formatCountdown(occ.msUntil);

    const iconHtml = occ.img
        ? `<div class="event-icon event-icon-img"><img src="${occ.img}" alt="${occ.name}"></div>`
        : `<div class="event-icon">${occ.icon}</div>`;

    // Blood Castle crystal button
    // BC timeline: 0-5min entry, 5-6min transition, 6-21min gameplay (15min)
    // Crystal button only shows during gameplay phase (after 6min from event start)
    const isBcActive = occ.id === 'blood-castle' && occ.isActive;
    const bcMsElapsed = isBcActive ? -occ.msUntil : 0; // ms since event started
    const bcInGameplay = isBcActive && bcMsElapsed >= 6 * 60000; // after 6min = gameplay phase
    const bcCrystalValid = bcCrystalActive && bcCrystalActive.endsAt > Date.now();
    const bcMsLeft = bcCrystalValid ? bcCrystalActive.endsAt - Date.now() : 0;
    let bcCrystalHtml = '';
    if (isBcActive) {
        if (bcCrystalValid) {
            bcCrystalHtml = `<div class="bc-crystal-status">${t('bcCrystalGot')} <span class="bc-crystal-countdown">${formatBcCrystalCountdown(bcMsLeft)}</span></div>`;
        } else if (bcInGameplay) {
            // Calculate when BC gameplay ends (event start + 21min)
            const bcEndsAt = Date.now() + (occ.duration * 60000) + occ.msUntil;
            bcCrystalHtml = `<button class="btn-bc-crystal" data-ends-at="${bcEndsAt}">${t('bcCrystalGotBtn')}</button>`;
        } else {
            // Still in entry/transition phase — show waiting message
            const gameplayStartsIn = Math.ceil((6 * 60000 - bcMsElapsed) / 1000);
            const mins = Math.floor(gameplayStartsIn / 60);
            const secs = gameplayStartsIn % 60;
            bcCrystalHtml = `<div class="bc-crystal-status" style="color:var(--text-muted)">${t('bcGameplayStartsIn')} ${mins}:${String(secs).padStart(2, '0')}</div>`;
        }
    }

    // Chaos Castle "MORRI!!!" button
    const isCcActive = occ.id === 'chaos-castle' && occ.isActive;
    const ccMsElapsed = isCcActive ? -occ.msUntil : 0;
    const ccInGameplay = isCcActive && ccMsElapsed >= 6 * 60000;
    const ccEventEndsAt = isCcActive ? Date.now() + (occ.duration * 60000) + occ.msUntil : 0;
    const ccDiedValid = ccDiedAt && ccDiedAt.eventEndsAt === ccEventEndsAt;
    let ccDiedHtml = '';
    if (isCcActive) {
        if (ccDiedValid) {
            ccDiedHtml = `<div class="bc-crystal-status" style="color:#e53935">${t('ccDied')}</div>`;
        } else if (ccInGameplay) {
            ccDiedHtml = `<button class="btn-cc-died" data-ends-at="${ccEventEndsAt}">${t('ccDiedBtn')}</button>`;
        }
    }

    card.innerHTML = `
        ${iconHtml}
        <div class="event-info">
            <div class="event-name">${occ.name}</div>
            <div class="event-detail">
                <span>🕐 ${occ.serverTime} (${t('server')})</span>
                <span>📍 ${occ.localTime} (${t('local')})</span>
            </div>
            ${occ.description ? `<div class="event-detail" style="margin-top:2px"><span style="color:var(--text-muted)">${localize(occ.description)}</span></div>` : ''}
            ${bcCrystalHtml}
            ${ccDiedHtml}
        </div>
        <div class="event-right">
            <div class="event-countdown ${countdownClass}">${countdownText}</div>
            ${showToggle ? `<div class="alarm-toggle ${isOn ? 'on' : ''}" data-id="${occ.id}" title="${isOn ? t('alarmOn') : t('alarmOff')}"></div>` : ''}
        </div>
    `;

    // Bind crystal button
    const crystalBtn = card.querySelector('.btn-bc-crystal');
    if (crystalBtn) {
        crystalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const endsAt = parseInt(crystalBtn.dataset.endsAt);
            bcCrystalActive = { endsAt };
            localStorage.setItem('mudream_bc_crystal', JSON.stringify(bcCrystalActive));
            scheduleBcCrystalTimeouts(endsAt);
            showToast(t('bcCrystalMarked'), 'success', 5000);
            renderAll(true);
        });
    }

    // Bind CC died button
    const ccDiedBtn = card.querySelector('.btn-cc-died');
    if (ccDiedBtn) {
        ccDiedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const eventEndsAt = parseInt(ccDiedBtn.dataset.endsAt);
            ccDiedAt = { eventEndsAt };
            localStorage.setItem('mudream_cc_died', JSON.stringify(ccDiedAt));
            showToast(t('ccDiedMarked'), 'info', 5000);
            renderAll(true);
        });
    }

    const toggle = card.querySelector('.alarm-toggle');
    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (enabledAlarms.has(occ.id)) {
                enabledAlarms.delete(occ.id);
                toggle.classList.remove('on');
                toggle.title = t('alarmOff');
            } else {
                enabledAlarms.add(occ.id);
                toggle.classList.add('on');
                toggle.title = t('alarmOn');
                alarm.getAudioContext();
            }
            saveEnabledAlarms();
        });
    }

    return card;
}

function renderUpcoming() {
    const list = document.getElementById('upcomingList');
    const count = document.getElementById('upcomingCount');
    const upcoming = getAllUpcoming();

    count.textContent = upcoming.length;

    if (upcoming.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌙</div><p>${t('noUpcoming')}</p></div>`;
        return;
    }

    list.innerHTML = '';
    for (const occ of upcoming) {
        list.appendChild(createEventCard(occ, true));
    }
}

function renderCategory(category, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const event of EVENTS_DATA[category]) {
        const occs = getNextOccurrences(event);
        if (occs.length > 0) {
            container.appendChild(createEventCard(occs[0]));
        } else if (event.respawnInfo) {
            const card = document.createElement('div');
            card.className = 'event-card';
            card.style.setProperty('--card-accent', event.color);
            const isOn = enabledAlarms.has(event.id);
            const respawnIcon = event.img
                ? `<div class="event-icon event-icon-img"><img src="${event.img}" alt="${event.name}"></div>`
                : `<div class="event-icon">${event.icon}</div>`;
            card.innerHTML = `
                ${respawnIcon}
                <div class="event-info">
                    <div class="event-name">${event.name}</div>
                    <div class="event-detail"><span>${localize(event.description)}</span></div>
                </div>
                <div class="event-right">
                    <div class="event-countdown" style="font-size:12px;color:var(--text-secondary)">⏳ ${localize(event.respawnInfo)}</div>
                    <div class="alarm-toggle ${isOn ? 'on' : ''}" data-id="${event.id}"></div>
                </div>
            `;
            const toggle = card.querySelector('.alarm-toggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (enabledAlarms.has(event.id)) {
                        enabledAlarms.delete(event.id);
                        toggle.classList.remove('on');
                    } else {
                        enabledAlarms.add(event.id);
                        toggle.classList.add('on');
                    }
                    saveEnabledAlarms();
                });
            }
            container.appendChild(card);
        }
    }
}

let lastRenderHash = '';

function renderAll(forceFullRender = false) {
    const upcoming = getAllUpcoming();
    const newHash = upcoming.map(o => `${o.id}-${o.serverTime}`).join('|');

    if (!forceFullRender && newHash === lastRenderHash) {
        // Only update countdowns, not full DOM rebuild
        updateCountdowns();
        return;
    }
    lastRenderHash = newHash;
    renderUpcoming();
    renderCategory('events', 'eventsList');
    renderCategory('bosses', 'bossesList');
    renderElites();
    renderCategory('cherry', 'cherryList');
    renderGolden();
}

function updateCountdowns() {
    const categories = ['events', 'bosses', 'cherry'];
    for (const cat of categories) {
        for (const event of EVENTS_DATA[cat]) {
            const occs = getNextOccurrences(event);
            if (occs.length > 0) {
                const occ = occs[0];
                const countdownEls = document.querySelectorAll(`.event-card .alarm-toggle[data-id="${occ.id}"]`);
                countdownEls.forEach(toggle => {
                    const card = toggle.closest('.event-card');
                    if (card) {
                        const cdEl = card.querySelector('.event-countdown');
                        if (cdEl) {
                            cdEl.textContent = occ.isActive ? `🟢 ${t('inProgress')}` : formatCountdown(occ.msUntil);
                        }
                    }
                });
            }
        }
    }
    // Update BC gameplay countdown and crystal countdown
    updateBcCountdowns();
    // Update upcoming count
    const upcoming = getAllUpcoming();
    const count = document.getElementById('upcomingCount');
    if (count) count.textContent = upcoming.length;
    // Update elite timers
    updateEliteCountdowns();
}

function updateBcCountdowns() {
    // Update "Gameplay começa em X:XX" for BC/DS/CC
    const bcEvent = EVENTS_DATA.events.find(e => e.id === 'blood-castle');
    const gatedEvents = EVENTS_DATA.events.filter(e => e.gateClose);
    for (const event of gatedEvents) {
        const occs = getNextOccurrences(event);
        for (const occ of occs) {
            if (!occ.isActive) continue;
            const msElapsed = -occ.msUntil;
            const gameplayStartMs = (event.gateClose + 1) * 60000; // gateClose + 1min transition
            if (msElapsed < gameplayStartMs) {
                // Find the status element for this event and update countdown
                const cards = document.querySelectorAll(`.alarm-toggle[data-id="${occ.id}"]`);
                cards.forEach(toggle => {
                    const card = toggle.closest('.event-card');
                    if (card) {
                        const statusEl = card.querySelector('.bc-crystal-status');
                        if (statusEl && statusEl.style.color && statusEl.textContent.includes('Gameplay')) {
                            const remaining = Math.ceil((gameplayStartMs - msElapsed) / 1000);
                            const mins = Math.floor(remaining / 60);
                            const secs = remaining % 60;
                            statusEl.textContent = `${t('bcGameplayStartsIn')} ${mins}:${String(secs).padStart(2, '0')}`;
                        }
                    }
                });
            }
        }
    }
    // Update BC crystal countdown
    if (bcCrystalActive && bcCrystalActive.endsAt > Date.now()) {
        const cdEl = document.querySelector('.bc-crystal-countdown');
        if (cdEl) cdEl.textContent = formatBcCrystalCountdown(bcCrystalActive.endsAt - Date.now());
    }
}

function updateServerClock() {
    const st = getServerTime();
    document.getElementById('serverTime').textContent =
        `${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}:${String(st.getSeconds()).padStart(2, '0')}`;
}

function checkAlarms() {
    const categories = ['events', 'bosses', 'cherry'];
    for (const cat of categories) {
        for (const event of EVENTS_DATA[cat]) {
            if (!enabledAlarms.has(event.id)) continue;

            const occs = getNextOccurrences(event);
            for (const occ of occs) {
                const minutesUntil = occ.msUntil / 60000;

                // Build alarm intervals: standard + event-specific earlyWarning
                const intervals = getAlarmIntervals();
                if (event.earlyWarning && !intervals.includes(event.earlyWarning)) {
                    intervals.push(event.earlyWarning);
                }

                for (const interval of intervals) {
                    const alarmKey = `${occ.id}-${occ.serverTime}-${occ.eventDate.toDateString()}-${interval}`;

                    if (interval === 0) {
                        if (minutesUntil <= 0.5 && minutesUntil >= -1 && !firedAlarms.has(alarmKey)) {
                            firedAlarms.add(alarmKey);
                            triggerAlarm(occ, 0);
                        }
                    } else {
                        // Fire when within 10s of the target (e.g. 5:00 to 4:50)
                        if (minutesUntil > 0 && minutesUntil <= interval && minutesUntil > interval - 0.5 && !firedAlarms.has(alarmKey)) {
                            firedAlarms.add(alarmKey);
                            triggerAlarm(occ, interval);
                        }
                    }
                }
            }
        }
    }

    // Check elite respawn alarms
    checkEliteAlarms();

    // Check gate closing warnings (BC, DS, CC, etc.)
    checkGateAlarms();

    // Check Blood Castle crystal alarm
    checkBcCrystalAlarm();

    if (firedAlarms.size > 100) {
        firedAlarms.clear();
    }
}

function triggerAlarm(occ, minutesUntil) {
    let msg;
    if (minutesUntil === 0) {
        msg = `🚨 ${occ.name} ${t('startedNow')} (${occ.localTime} ${t('localTime')})`;
    } else {
        const minWord = minutesUntil > 1 ? t('minutesPlural') : t('minutes');
        msg = `⏰ ${occ.name} ${t('startsIn')} ${minutesUntil} ${minWord}! (${occ.localTime} ${t('localTime')})`;
    }

    if (settings.soundAlarm) {
        alarm.playForEvent(occ.id);
    }

    if (settings.browserNotif) {
        alarm.sendNotification('MU Timer World', msg.replace(/[🚨⏰]/g, ''));
    }

    showAlertBanner(msg);
}

function checkGateAlarms() {
    // Check gate closing warnings for any event with gateClose property
    for (const cat of ['events', 'bosses', 'cherry']) {
        for (const event of EVENTS_DATA[cat]) {
            if (!event.gateClose || !enabledAlarms.has(event.id)) continue;

            const occs = getNextOccurrences(event);
            for (const occ of occs) {
                if (!occ.isActive) continue;
                const msElapsed = -occ.msUntil;
                const gate = event.gateClose; // minutes until gate closes

                // Check if player died in CC — suppress post-gate alarms
                const eventEndsAt = Math.round(Date.now() + (event.duration * 60000) + occ.msUntil);
                const playerDied = occ.id === 'chaos-castle' && ccDiedAt && Math.abs(ccDiedAt.eventEndsAt - eventEndsAt) < 60000;

                // Clear ccDiedAt when CC ends
                if (occ.id === 'chaos-castle' && msElapsed >= event.duration * 60000 && ccDiedAt) {
                    ccDiedAt = null;
                    localStorage.removeItem('mudream_cc_died');
                }

                const gateWarnings = [
                    { id: 'g3', atMs: (gate - 3) * 60000, msg: t('gateCloses3', { name: occ.name }) },
                    { id: 'g2', atMs: (gate - 2) * 60000, msg: t('gateCloses2', { name: occ.name }) },
                    { id: 'g1', atMs: (gate - 1) * 60000, msg: t('gateCloses1', { name: occ.name }) },
                    { id: 'g0', atMs: gate * 60000,        msg: t('gateClosed',  { name: occ.name }) },
                    { id: 'end', atMs: event.duration * 60000, msg: t('eventEnded', { name: occ.name }) }
                ];

                for (const w of gateWarnings) {
                    if (w.atMs < 0) continue; // skip if gate < 3 min
                    // Skip end alarm if player died in CC
                    if (playerDied && w.id === 'end') continue;
                    const alarmKey = `gate-${occ.id}-${occ.serverTime}-${occ.eventDate.toDateString()}-${w.id}`;
                    if (firedAlarms.has(alarmKey)) continue;

                    if (msElapsed >= w.atMs && msElapsed < w.atMs + 30000) {
                        firedAlarms.add(alarmKey);
                        if (settings.soundAlarm) alarm.play();
                        if (settings.browserNotif) alarm.sendNotification('MU Timer Dream', w.msg.replace(/[🏰⚠️🚫🏁]/g, ''));
                        showAlertBanner(w.msg);
                    }
                }
            }
        }
    }
}

function formatBcCrystalCountdown(msRemaining) {
    if (msRemaining <= 0) return '0:00';
    const mins = Math.floor(msRemaining / 60000);
    const secs = Math.floor((msRemaining % 60000) / 1000);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

let _bcCrystalTimeouts = [];
function scheduleBcCrystalTimeouts(endsAt) {
    // Clear any previous timeouts
    _bcCrystalTimeouts.forEach(id => clearTimeout(id));
    _bcCrystalTimeouts = [];
    // Schedule timeouts for 3min, 2min, 1min before BC ends
    const warnings = [
        { id: 'cr3', atMs: 180000, msg: t('bcCrystal3min') },
        { id: 'cr2', atMs: 120000, msg: t('bcCrystal2min') },
        { id: 'cr1', atMs: 60000,  msg: t('bcCrystal1min') }
    ];
    for (const w of warnings) {
        const fireAt = endsAt - w.atMs;
        const delay = fireAt - Date.now();
        if (delay > 0) {
            const tid = setTimeout(() => {
                const alarmKey = `bc-crystal-${endsAt}-${w.id}`;
                if (firedAlarms.has(alarmKey)) return;
                firedAlarms.add(alarmKey);
                if (settings.soundAlarm) alarm.play();
                if (settings.browserNotif) alarm.sendNotification('MU Timer Dream', w.msg.replace(/[🚨💎]/g, ''));
                showAlertBanner(w.msg);
            }, delay);
            _bcCrystalTimeouts.push(tid);
        }
    }
}

// Re-schedule on page load if crystal active
if (bcCrystalActive && bcCrystalActive.endsAt > Date.now()) {
    scheduleBcCrystalTimeouts(bcCrystalActive.endsAt);
}

function checkBcCrystalAlarm() {
    if (!bcCrystalActive || !bcCrystalActive.endsAt) return;
    const msRemaining = bcCrystalActive.endsAt - Date.now();

    // BC already ended — clear crystal
    if (msRemaining <= 0) {
        bcCrystalActive = null;
        localStorage.removeItem('mudream_bc_crystal');
        return;
    }

    // Multiple warnings: 3min, 2min, 1min before BC ends
    const warnings = [
        { id: 'cr3', atMs: 180000, msg: t('bcCrystal3min') },
        { id: 'cr2', atMs: 120000, msg: t('bcCrystal2min') },
        { id: 'cr1', atMs: 60000,  msg: t('bcCrystal1min') }
    ];

    for (const w of warnings) {
        const alarmKey = `bc-crystal-${bcCrystalActive.endsAt}-${w.id}`;
        // Fire if we're within the window (or past it but not yet fired — catches background throttling)
        if (msRemaining <= w.atMs && msRemaining > 0 && !firedAlarms.has(alarmKey)) {
            firedAlarms.add(alarmKey);
            if (settings.soundAlarm) alarm.play();
            if (settings.browserNotif) alarm.sendNotification('MU Timer Dream', w.msg.replace(/[🚨💎]/g, ''));
            showAlertBanner(w.msg);
        }
    }

    // Update crystal countdown on card
    const cdEl = document.querySelector('.bc-crystal-countdown');
    if (cdEl) cdEl.textContent = formatBcCrystalCountdown(msRemaining);
}

function showAlertBanner(text) {
    const banner = document.getElementById('alertBanner');
    const alertText = document.getElementById('alertText');
    alertText.textContent = text;
    banner.style.display = 'block';

    setTimeout(() => {
        banner.style.display = 'none';
    }, 20000);
}

const CLASS_IMAGES = {
    dk: 'https://dreamassets.fra1.digitaloceanspaces.com/images/421/body/5ntx2PHwbxUVlBX1oVWlc.gif',
    dw: 'https://dreamassets.fra1.digitaloceanspaces.com/images/425/body/AcFQ1HSSAhTppWyy_00dB.gif',
    elf: 'https://dreamassets.fra1.digitaloceanspaces.com/images/422/body/3MltfuSVabtn_rOdjDlsq.gif',
    mg: 'https://dreamassets.fra1.digitaloceanspaces.com/images/420/body/ooL3R3rgEH7OTBPIEYddA.gif',
    dl: 'https://dreamassets.fra1.digitaloceanspaces.com/images/423/body/TwX03oEM5FtBK87vUguai.gif',
    sum: 'https://dreamassets.fra1.digitaloceanspaces.com/images/419/body/XfLb4XwZtm4aHOKSLFW7P.gif',
    rf: 'https://dreamassets.fra1.digitaloceanspaces.com/images/424/body/8qHUEa7MeKoWkMmFUv1zK.gif'
};

const preloadedImages = new Set();

function preloadClassImage(cls) {
    if (preloadedImages.has(cls)) return;
    const img = new Image();
    img.src = CLASS_IMAGES[cls];
    preloadedImages.add(cls);
}

function initClassShowcase() {
    const btns = document.querySelectorAll('.class-btn');
    const img = document.getElementById('classAnimImg');
    if (!btns.length || !img) return;

    let autoInterval = null;
    const classKeys = Object.keys(CLASS_IMAGES);
    let currentIdx = 0;

    // Preload first image immediately, others lazily
    preloadClassImage('dk');

    function selectClass(cls) {
        preloadClassImage(cls);
        // Preload next class too
        const nextIdx = (classKeys.indexOf(cls) + 1) % classKeys.length;
        preloadClassImage(classKeys[nextIdx]);

        btns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.class-btn[data-class="${cls}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        img.classList.add('fade-out');
        setTimeout(() => {
            img.src = CLASS_IMAGES[cls];
            img.classList.remove('fade-out');
        }, 200);
        currentIdx = classKeys.indexOf(cls);
    }

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectClass(btn.dataset.class);
            clearInterval(autoInterval);
            autoInterval = setInterval(() => {
                currentIdx = (currentIdx + 1) % classKeys.length;
                selectClass(classKeys[currentIdx]);
            }, 3000);
        });
    });

    selectClass('dk');
    autoInterval = setInterval(() => {
        currentIdx = (currentIdx + 1) % classKeys.length;
        selectClass(classKeys[currentIdx]);
    }, 3000);
}

// Move every .modal-overlay to <body> so position:fixed always anchors to viewport
// (ancestors with backdrop-filter / transform / filter break position:fixed otherwise)
function liftModalsToBody() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
    });
}

function initSidebar() {
    const sidebar  = document.getElementById('appSidebar');
    const toggle   = document.getElementById('sidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    const sidebarPremiumBtn = document.getElementById('sidebarPremiumBtn');

    const open  = () => { sidebar?.classList.add('open'); backdrop?.classList.add('show'); toggle?.setAttribute('aria-expanded', 'true'); };
    const close = () => { sidebar?.classList.remove('open'); backdrop?.classList.remove('show'); toggle?.setAttribute('aria-expanded', 'false'); };

    toggle?.addEventListener('click', () => {
        if (sidebar?.classList.contains('open')) close(); else open();
    });
    backdrop?.addEventListener('click', close);
    // Close on tab click (mobile)
    sidebar?.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => {
            if (window.matchMedia('(max-width: 900px)').matches) close();
        });
    });
    sidebarPremiumBtn?.addEventListener('click', () => {
        close();
        if (typeof showPricingModal === 'function') showPricingModal();
    });
}

async function loadLandingStats() {
    try {
        const res = await fetch('/api/stats/public');
        if (!res.ok) return;
        const s = await res.json();
        animateStatValue(document.getElementById('statEvents'), s.eventsTracked);
        animateStatValue(document.getElementById('statUsers'), s.users);
        animateStatValue(document.getElementById('statWishlist'), s.wishlistItems);
        animateStatValue(document.getElementById('statAlerts'), s.alertsSent);

        const max = s.maxFreeUsers || 40;
        const pct = Math.min(100, Math.round((s.users / max) * 100));
        const fill = document.getElementById('freeSpotsFill');
        const txt  = document.getElementById('freeSpotsText');
        if (fill) fill.style.width = pct + '%';
        if (txt)  txt.textContent = `${s.users} / ${max} vagas usadas`;
    } catch {}
}

function animateStatValue(el, target) {
    if (!el || typeof target !== 'number') return;
    const start = 0;
    const dur = 900;
    const t0 = performance.now();
    function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function initLanding() {
    const landing = document.getElementById('landingPage');
    const app = document.getElementById('app');
    const particles = document.getElementById('particles');

    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (4 + Math.random() * 8) + 's';
        p.style.animationDelay = Math.random() * 5 + 's';
        p.style.width = (1 + Math.random() * 3) + 'px';
        p.style.height = p.style.width;
        particles.appendChild(p);
    }

    initClassShowcase();
    loadLandingStats();
    initSidebar();
    liftModalsToBody();
    document.getElementById('btnShowPricing')?.addEventListener('click', () => {
        if (typeof showPricingModal === 'function') showPricingModal();
    });

    // Auto-skip landing if user has a valid session
    fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(async data => {
            if (data && data.user) {
                // User is logged in — load alarms from server then skip landing
                await loadAlarmsFromServer();
                landing.classList.add('landing-hidden');
                app.style.display = '';
                startApp();
            }
        })
        .catch(() => { /* Not logged in — stay on landing */ });

    // Landing language switcher
    const landingLangBtns = document.querySelectorAll('.landing-lang-btn');
    const syncLandingLang = () => {
        landingLangBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.lang === currentLang);
        });
    };
    syncLandingLang();
    landingLangBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang);
            syncLandingLang();
            const langSelect = document.getElementById('langSelect');
            if (langSelect) langSelect.value = btn.dataset.lang;
        });
    });

    document.getElementById('btnEnter').addEventListener('click', () => {
        landing.style.transition = 'opacity 0.5s, transform 0.5s';
        landing.style.opacity = '0';
        landing.style.transform = 'scale(1.05)';
        setTimeout(() => {
            landing.classList.add('landing-hidden');
            app.style.display = '';
            app.style.opacity = '0';
            app.style.transition = 'opacity 0.5s';
            requestAnimationFrame(() => { app.style.opacity = '1'; });
            startApp();
            // Open login modal — required (cannot close without logging in)
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'flex';
                authModal.dataset.required = 'true';
            }
        }, 500);
    });
}

function startApp() {
    initTabs();
    initSettings();
    initSelectAll();
    initAlertDismiss();
    initGoLanding();
    initTabScrollIndicators();
    muChat.init();
    applyTranslations();

    // Setup focus traps for all modals
    ['authModal', 'settingsModal', 'pinModal', 'donateModal'].forEach(setupModalFocusTrap);

    if ('Notification' in window && Notification.permission === 'default' && settings.browserNotif) {
        Notification.requestPermission();
    }

    updateServerClock();
    renderAll(true);

    const params = new URLSearchParams(window.location.search);
    const collectionUser = params.get('collection');
    if (collectionUser) {
        history.replaceState(null, '', window.location.pathname);
        setTimeout(() => loadCollectionOf(collectionUser), 500);
    }

    setInterval(updateServerClock, 1000);
    setInterval(renderAll, 1000);
    setInterval(checkAlarms, 3000);

    // PWA: request wake lock to keep alarms active
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            requestWakeLock();
            // Force immediate refresh to catch up after background throttling
            checkAlarms();
            renderAll(true);
        }
    });

    // Catch up after device wake / network reconnect
    window.addEventListener('focus', () => {
        checkAlarms();
        renderAll(true);
    });
    window.addEventListener('online', () => {
        checkAlarms();
        renderAll(true);
    });
}

/* ── PWA Wake Lock ── */
let _wakeLock = null;
async function requestWakeLock() {
    if (!('wakeLock' in navigator) || enabledAlarms.size === 0) return;
    try {
        _wakeLock = await navigator.wakeLock.request('screen');
        _wakeLock.addEventListener('release', () => { _wakeLock = null; });
    } catch {}
}

function goToLanding() {
    const app = document.getElementById('app');
    const landing = document.getElementById('landingPage');
    app.style.transition = 'opacity 0.4s';
    app.style.opacity = '0';
    setTimeout(() => {
        app.style.display = 'none';
        app.style.opacity = '';
        app.style.transition = '';
        landing.classList.remove('landing-hidden');
        landing.style.opacity = '0';
        landing.style.transform = '';
        landing.style.transition = 'opacity 0.5s';
        requestAnimationFrame(() => { landing.style.opacity = '1'; });
    }, 400);
}

function initGoLanding() {
    const btn = document.getElementById('btnGoLanding');
    btn.addEventListener('click', goToLanding);
    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToLanding(); }
    });
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => activateTab(tab));
    });

    // Keyboard navigation for tabs (Arrow keys)
    const tabNav = document.querySelector('.tab-nav');
    if (tabNav) {
        tabNav.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const visibleTabs = [...tabs].filter(t => t.style.display !== 'none');
                const currentIdx = visibleTabs.indexOf(document.querySelector('.tab.active'));
                let newIdx;
                if (e.key === 'ArrowRight') {
                    newIdx = (currentIdx + 1) % visibleTabs.length;
                } else {
                    newIdx = (currentIdx - 1 + visibleTabs.length) % visibleTabs.length;
                }
                visibleTabs[newIdx].focus();
                activateTab(visibleTabs[newIdx]);
            }
        });
    }
}

function activateTab(tab) {
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
}

function initTabScrollIndicators() {
    const wrapper = document.getElementById('tabNavWrapper');
    const nav = wrapper?.querySelector('.tab-nav');
    if (!wrapper || !nav) return;

    function updateIndicators() {
        const sl = nav.scrollLeft;
        const maxScroll = nav.scrollWidth - nav.clientWidth;
        wrapper.classList.toggle('scroll-left', sl > 8);
        wrapper.classList.toggle('scroll-right', sl < maxScroll - 8);
    }

    nav.addEventListener('scroll', updateIndicators);
    window.addEventListener('resize', updateIndicators);
    setTimeout(updateIndicators, 500);
}

function initSettings() {
    document.getElementById('btnSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'flex';
        if (typeof loadPinStatus === 'function') loadPinStatus();
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'none';
    });

    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            document.getElementById('settingsModal').style.display = 'none';
        }
    });

    const alarmSelect = document.getElementById('alarmSound');
    // Don't set value for 'custom' yet — loadCustomSoundFromServer will handle it
    if (settings.sound !== 'custom' && !settings.sound.startsWith('custom:')) {
        alarmSelect.value = settings.sound;
        alarm.setSoundType(settings.sound);
    }
    alarmSelect.addEventListener('change', () => {
        const val = alarmSelect.value;
        alarm.setSoundType(val);
        // Store only 'custom' marker for custom sounds (avoid bloating localStorage)
        settings.sound = val.startsWith('custom:') ? 'custom' : val;
        saveSettings();
    });

    document.getElementById('btnTestSound').addEventListener('click', () => {
        alarm.play();
    });

    const volumeSlider = document.getElementById('volumeSlider');
    volumeSlider.value = settings.volume;
    alarm.setVolume(settings.volume);
    volumeSlider.addEventListener('input', () => {
        settings.volume = parseInt(volumeSlider.value);
        alarm.setVolume(settings.volume);
        saveSettings();
    });

    const chkBrowser = document.getElementById('chkBrowserNotif');
    chkBrowser.checked = settings.browserNotif;
    chkBrowser.addEventListener('change', () => {
        settings.browserNotif = chkBrowser.checked;
        if (chkBrowser.checked && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        saveSettings();
    });

    const chkSound = document.getElementById('chkSoundAlarm');
    chkSound.checked = settings.soundAlarm;
    chkSound.addEventListener('change', () => {
        settings.soundAlarm = chkSound.checked;
        saveSettings();
    });

    const intervalMap = { chkAlarm15: 'alarm15', chkAlarm5: 'alarm5', chkAlarm0: 'alarm0' };
    for (const [elId, key] of Object.entries(intervalMap)) {
        const chk = document.getElementById(elId);
        chk.checked = settings[key];
        chk.addEventListener('change', () => {
            settings[key] = chk.checked;
            saveSettings();
            updateAlarmInfoText();
        });
    }
    updateAlarmInfoText();

    const langSelect = document.getElementById('langSelect');
    langSelect.value = currentLang;
    langSelect.addEventListener('change', () => {
        setLanguage(langSelect.value);
        renderAll();
    });

    // ── Custom sound upload/record ──
    initCustomSound(alarmSelect);
}

/* ── Custom alarm sound: upload, record, delete ── */

let mediaRecorder = null;
let recordedChunks = [];
let recTimerInterval = null;

async function initCustomSound(alarmSelect) {
    const fileInput = document.getElementById('soundFileInput');
    const btnUpload = document.getElementById('btnUploadSound');
    const btnRecord = document.getElementById('btnRecordSound');
    const btnDelete = document.getElementById('btnDeleteSound');
    const recorderUI = document.getElementById('recorderUI');
    const btnStopRec = document.getElementById('btnStopRec');
    const btnCancelRec = document.getElementById('btnCancelRec');
    const recTimer = document.getElementById('recTimer');
    const customGroup = document.getElementById('customSoundsGroup');

    // Load existing custom sound from server
    await loadCustomSoundFromServer(alarmSelect, customGroup, btnDelete);

    // Upload button
    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showAlertBanner(t('settingsMaxSize'));
            fileInput.value = '';
            return;
        }
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('name', file.name.replace(/\.[^.]+$/, ''));
        try {
            const res = await fetch('/api/user/alarm-sound', { method: 'POST', body: formData, credentials: 'include' });
            const data = await res.json();
            if (data.ok) {
                addCustomSoundOption(alarmSelect, customGroup, data.sound, btnDelete);
                showAlertBanner(t('settingsUploadSuccess'));
            }
        } catch (e) { console.error('Upload error:', e); }
        fileInput.value = '';
    });

    // Record button
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        btnRecord.addEventListener('click', async () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                recordedChunks = [];
                mediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMime() });
                mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    recorderUI.style.display = 'none';
                    clearInterval(recTimerInterval);
                    if (recordedChunks.length === 0) return;
                    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
                    if (blob.size > 2 * 1024 * 1024) { showAlertBanner(t('settingsMaxSize')); return; }
                    const formData = new FormData();
                    formData.append('audio', blob, 'recording.' + (mediaRecorder.mimeType.includes('webm') ? 'webm' : 'ogg'));
                    formData.append('name', 'Gravação ' + new Date().toLocaleTimeString());
                    try {
                        const res = await fetch('/api/user/alarm-sound', { method: 'POST', body: formData, credentials: 'include' });
                        const data = await res.json();
                        if (data.ok) {
                            addCustomSoundOption(alarmSelect, customGroup, data.sound, btnDelete);
                            showAlertBanner(t('settingsRecordSuccess'));
                        }
                    } catch (e) { console.error('Record upload error:', e); }
                };
                mediaRecorder.start();
                recorderUI.style.display = 'flex';
                let secs = 0;
                recTimer.textContent = '00:00';
                recTimerInterval = setInterval(() => {
                    secs++;
                    recTimer.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
                    if (secs >= 30) { mediaRecorder.stop(); } // Max 30s
                }, 1000);
            } catch (e) {
                console.warn('Microphone access denied:', e);
            }
        });

        btnStopRec.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        });
        btnCancelRec.addEventListener('click', () => {
            recordedChunks = [];
            if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            recorderUI.style.display = 'none';
            clearInterval(recTimerInterval);
        });
    } else {
        btnRecord.style.display = 'none';
    }

    // Delete button
    btnDelete.addEventListener('click', async () => {
        try {
            await fetch('/api/user/alarm-sound', { method: 'DELETE', credentials: 'include' });
            customGroup.innerHTML = '';
            customGroup.style.display = 'none';
            btnDelete.style.display = 'none';
            alarmSelect.value = 'default';
            settings.sound = 'default';
            alarm.setSoundType('default');
            saveSettings();
            showAlertBanner(t('settingsDeleteSound'));
        } catch (e) { console.error('Delete error:', e); }
    });
}

function getSupportedMime() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
    return '';
}

async function loadCustomSoundFromServer(alarmSelect, customGroup, btnDelete) {
    try {
        const res = await fetch('/api/user/alarm-sound', { credentials: 'include' });
        const data = await res.json();
        if (data.sound) {
            // Don't auto-select on load — just populate the option
            addCustomSoundOption(alarmSelect, customGroup, data.sound, btnDelete, false);
            // If user previously selected custom, restore it
            if (settings.sound === 'custom' || settings.sound.startsWith('custom:')) {
                const fullValue = 'custom:' + data.sound.dataUrl;
                alarmSelect.value = fullValue;
                alarm.setSoundType(fullValue);
                // Migrate old 'custom:data:...' to just 'custom' in localStorage
                if (settings.sound !== 'custom') {
                    settings.sound = 'custom';
                    saveSettings();
                }
            }
        }
    } catch {}
}

function addCustomSoundOption(alarmSelect, customGroup, sound, btnDelete, autoSelect = true) {
    customGroup.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = 'custom:' + sound.dataUrl;
    opt.textContent = '🎵 ' + (sound.name || 'Custom');
    customGroup.appendChild(opt);
    customGroup.style.display = '';
    btnDelete.style.display = '';

    if (autoSelect) {
        alarmSelect.value = opt.value;
        // Store only 'custom' marker in localStorage (not the full data URL)
        settings.sound = 'custom';
        alarm.setSoundType(opt.value);
        saveSettings();
    }
}

function updateAlarmInfoText() {
    const parts = [];
    if (settings.alarm15) parts.push(t('alarm15Label'));
    if (settings.alarm5) parts.push(t('alarm5Label'));
    if (settings.alarm0) parts.push(t('alarm0Label'));
    const el = document.getElementById('alarmInfoText');
    if (parts.length === 0) {
        el.innerHTML = t('noAlarms');
    } else {
        el.innerHTML = t('alarmInfoDynamic').replace('{intervals}', parts.join(', '));
    }
}

function initSelectAll() {
    const makeSelectAll = (btnId, category) => {
        document.getElementById(btnId).addEventListener('click', () => {
            const allIds = EVENTS_DATA[category].map(e => e.id);
            const allEnabled = allIds.every(id => enabledAlarms.has(id));
            allIds.forEach(id => {
                if (allEnabled) enabledAlarms.delete(id);
                else enabledAlarms.add(id);
            });
            saveEnabledAlarms();
            renderAll();
        });
    };

    makeSelectAll('btnSelectAllEvents', 'events');
    makeSelectAll('btnSelectAllBosses', 'bosses');
    makeSelectAll('btnSelectAllElites', 'elites');
    makeSelectAll('btnSelectAllCherry', 'cherry');

    document.getElementById('btnToggleAll').addEventListener('click', () => {
        const allIds = [...EVENTS_DATA.events, ...EVENTS_DATA.bosses, ...EVENTS_DATA.elites, ...EVENTS_DATA.cherry].map(e => e.id);
        const allEnabled = allIds.every(id => enabledAlarms.has(id));
        allIds.forEach(id => {
            if (allEnabled) enabledAlarms.delete(id);
            else enabledAlarms.add(id);
        });
        saveEnabledAlarms();
        renderAll();
    });
}

function initAlertDismiss() {
    document.getElementById('alertDismiss').addEventListener('click', () => {
        document.getElementById('alertBanner').style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', initLanding);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        // Check every 60s + on focus + on visibility change for faster update detection
        const doUpdate = () => { try { reg.update(); } catch {} };
        setInterval(doUpdate, 60 * 1000);
        window.addEventListener('focus', doUpdate);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') doUpdate();
        });

        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                    showUpdateBanner();
                }
            });
        });
    }).catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) showUpdateBanner();
    });
}

function showUpdateBanner() {
    if (document.getElementById('updateBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    const updateMsg = t('updateAvailable') || '🔄 Nova atualização disponível!';
    const updateBtn = t('updateBtn') || 'Atualizar';
    banner.innerHTML = `
        <div class="update-banner">
            <span>${updateMsg}</span>
            <button onclick="location.reload()">${updateBtn}</button>
            <button class="update-dismiss" onclick="this.closest('.update-banner').remove()">✕</button>
        </div>
    `;
    document.body.appendChild(banner);
}

// ==================== PWA INSTALL ====================

(function initInstallApp() {
    let deferredPrompt = null;

    function detectPlatform() {
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/i.test(ua);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
        return { isIOS, isAndroid, isDesktop: !isIOS && !isAndroid, isStandalone };
    }

    function showInstallInstructions(type) {
        const box = document.getElementById('installInstructions');
        if (!box) return;
        const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'pt';

        const instructions = {
            ios: {
                pt: [
                    'Toque no botão <strong>Compartilhar</strong> (ícone ⬆️) na barra do Safari',
                    'Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>',
                    'Toque em <strong>"Adicionar"</strong> para confirmar'
                ],
                en: [
                    'Tap the <strong>Share</strong> button (⬆️ icon) in Safari',
                    'Scroll down and tap <strong>"Add to Home Screen"</strong>',
                    'Tap <strong>"Add"</strong> to confirm'
                ]
            },
            android: {
                pt: [
                    'Toque no menu <strong>⋮</strong> (3 pontos) do Chrome',
                    'Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>',
                    'Confirme tocando em <strong>"Instalar"</strong>'
                ],
                en: [
                    'Tap the Chrome <strong>⋮</strong> menu (3 dots)',
                    'Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>',
                    'Confirm by tapping <strong>"Install"</strong>'
                ]
            },
            desktop: {
                pt: [
                    'Clique no ícone <strong>⊕</strong> na barra de endereço do navegador',
                    'Ou vá em <strong>Menu ⋮ → Instalar MU Timer Dream</strong>',
                    'Clique em <strong>"Instalar"</strong> para confirmar'
                ],
                en: [
                    'Click the <strong>⊕</strong> icon in the browser address bar',
                    'Or go to <strong>Menu ⋮ → Install MU Timer Dream</strong>',
                    'Click <strong>"Install"</strong> to confirm'
                ]
            }
        };

        const steps = instructions[type]?.[lang] || instructions[type]?.pt || [];
        const closeText = lang === 'en' ? 'Close' : 'Fechar';

        box.innerHTML = steps.map((s, i) =>
            `<div class="step"><span class="step-num">${i + 1}</span><span class="step-text">${s}</span></div>`
        ).join('') + `<button class="install-close-btn" onclick="this.parentElement.style.display='none'">${closeText}</button>`;
        box.style.display = 'block';
    }

    // Capture beforeinstallprompt (Chrome/Edge on Android & Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    document.addEventListener('DOMContentLoaded', () => {
        const { isIOS, isAndroid, isDesktop, isStandalone } = detectPlatform();

        // If already installed as app, hide install section entirely
        if (isStandalone) {
            const section = document.getElementById('installSection');
            if (section) section.style.display = 'none';
            return;
        }

        const btnAndroid = document.getElementById('btnInstallAndroid');
        const btnIOS = document.getElementById('btnInstallIOS');
        const btnDesktop = document.getElementById('btnInstallDesktop');

        // Always show all 3 buttons
        if (btnAndroid) {
            btnAndroid.style.display = 'flex';
            btnAndroid.addEventListener('click', () => {
                if (isAndroid && deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(result => {
                        deferredPrompt = null;
                        if (result.outcome === 'accepted') {
                            const section = document.getElementById('installSection');
                            if (section) section.style.display = 'none';
                        }
                    });
                } else {
                    showInstallInstructions('android');
                }
            });
        }
        if (btnIOS) {
            btnIOS.style.display = 'flex';
            btnIOS.addEventListener('click', () => showInstallInstructions('ios'));
        }
        if (btnDesktop) {
            btnDesktop.style.display = 'flex';
            btnDesktop.addEventListener('click', () => {
                if (isDesktop && deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(result => {
                        deferredPrompt = null;
                        if (result.outcome === 'accepted') {
                            const section = document.getElementById('installSection');
                            if (section) section.style.display = 'none';
                        }
                    });
                } else {
                    showInstallInstructions('desktop');
                }
            });
        }
    });

    // Hide install section when app gets installed
    window.addEventListener('appinstalled', () => {
        const section = document.getElementById('installSection');
        if (section) section.style.display = 'none';
        deferredPrompt = null;
    });
})();
