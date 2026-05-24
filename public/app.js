const alarm = new AlarmSystem();
const muChat = new MuChat();
let settings = loadSettings();
let enabledAlarms = loadEnabledAlarms();
let firedAlarms = new Set();

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

    card.innerHTML = `
        ${iconHtml}
        <div class="event-info">
            <div class="event-name">${occ.name}</div>
            <div class="event-detail">
                <span>🕐 ${occ.serverTime} (${t('server')})</span>
                <span>📍 ${occ.localTime} (${t('local')})</span>
            </div>
            ${occ.description ? `<div class="event-detail" style="margin-top:2px"><span style="color:var(--text-muted)">${occ.description}</span></div>` : ''}
        </div>
        <div class="event-right">
            <div class="event-countdown ${countdownClass}">${countdownText}</div>
            ${showToggle ? `<div class="alarm-toggle ${isOn ? 'on' : ''}" data-id="${occ.id}" title="${isOn ? t('alarmOn') : t('alarmOff')}"></div>` : ''}
        </div>
    `;

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
                    <div class="event-detail"><span>${event.description}</span></div>
                </div>
                <div class="event-right">
                    <div class="event-countdown" style="font-size:12px;color:var(--text-secondary)">⏳ ${event.respawnInfo}</div>
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
    renderCategory('cherry', 'cherryList');
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
    // Update upcoming count
    const upcoming = getAllUpcoming();
    const count = document.getElementById('upcomingCount');
    if (count) count.textContent = upcoming.length;
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

                for (const interval of getAlarmIntervals()) {
                    const alarmKey = `${occ.id}-${occ.serverTime}-${occ.eventDate.toDateString()}-${interval}`;

                    if (interval === 0) {
                        if (minutesUntil <= 0.5 && minutesUntil >= -0.5 && !firedAlarms.has(alarmKey)) {
                            firedAlarms.add(alarmKey);
                            triggerAlarm(occ, 0);
                        }
                    } else {
                        if (minutesUntil > 0 && minutesUntil <= interval && minutesUntil > interval - 1 && !firedAlarms.has(alarmKey)) {
                            firedAlarms.add(alarmKey);
                            triggerAlarm(occ, Math.ceil(minutesUntil));
                        }
                    }
                }
            }
        }
    }

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
        alarm.play();
    }

    if (settings.browserNotif) {
        alarm.sendNotification('MU Timer World', msg.replace(/[🚨⏰]/g, ''));
    }

    showAlertBanner(msg);
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

    // Auto-skip landing if user has a valid session
    fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
            if (data && data.user) {
                // User is logged in — skip landing directly
                landing.classList.add('landing-hidden');
                app.style.display = '';
                startApp();
            }
        })
        .catch(() => { /* Not logged in — stay on landing */ });

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
    setInterval(renderAll, 5000);
    setInterval(checkAlarms, 10000);
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
    alarmSelect.value = settings.sound;
    alarmSelect.addEventListener('change', () => {
        settings.sound = alarmSelect.value;
        alarm.setSoundType(settings.sound);
        saveSettings();
    });
    alarm.setSoundType(settings.sound);

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
    makeSelectAll('btnSelectAllCherry', 'cherry');

    document.getElementById('btnToggleAll').addEventListener('click', () => {
        const allIds = [...EVENTS_DATA.events, ...EVENTS_DATA.bosses, ...EVENTS_DATA.cherry].map(e => e.id);
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
    navigator.serviceWorker.register('sw.js').catch(() => {});
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
