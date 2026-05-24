const GUIDE_DATA = [
    {
        id: 'basics',
        icon: '📋',
        categories: {
            pt: 'Informações Básicas',
            en: 'Basic Information'
        },
        items: [
            { id: 'baseinfo', name: { pt: 'Informações do Servidor', en: 'Server Information' }, url: 'https://mudream.online/about/main/baseinfo' },
            { id: 'resets', name: { pt: 'Sistema de Reset', en: 'Reset System' }, url: 'https://mudream.online/about/main/resets-system' },
            { id: 'muhelper', name: { pt: 'MU Helper', en: 'MU Helper' }, url: 'https://mudream.online/about/main/mu-helper' },
            { id: 'interface', name: { pt: 'Interface do Jogo', en: 'Game Interface' }, url: 'https://mudream.online/about/main/game-interface' },
            { id: 'guest', name: { pt: 'Acesso de Convidado', en: 'Guest Access' }, url: 'https://mudream.online/about/main/guest-access' }
        ]
    },
    {
        id: 'classes',
        icon: '⚔️',
        categories: {
            pt: 'Classes',
            en: 'Classes'
        },
        items: [
            { id: 'dw', name: { pt: 'Dark Wizard / DW', en: 'Dark Wizard / DW' }, url: 'https://mudream.online/about/classes/dw' },
            { id: 'dk', name: { pt: 'Dark Knight / DK', en: 'Dark Knight / DK' }, url: 'https://mudream.online/about/classes/dk' },
            { id: 'elf', name: { pt: 'Elf / AE-EE', en: 'Elf / AE-EE' }, url: 'https://mudream.online/about/classes/elf' },
            { id: 'mg', name: { pt: 'Magic Gladiator / MG', en: 'Magic Gladiator / MG' }, url: 'https://mudream.online/about/classes/mg' },
            { id: 'dl', name: { pt: 'Dark Lord / DL', en: 'Dark Lord / DL' }, url: 'https://mudream.online/about/classes/dl' },
            { id: 'sum', name: { pt: 'Summoner / SUM', en: 'Summoner / SUM' }, url: 'https://mudream.online/about/classes/sum' },
            { id: 'rf', name: { pt: 'Rage Fighter / RF', en: 'Rage Fighter / RF' }, url: 'https://mudream.online/about/classes/rf' },
            { id: 'classquest', name: { pt: 'Quests de Profissão', en: 'Profession Quests' }, url: 'https://mudream.online/about/classes/class-quest/marlon-quest' }
        ]
    },
    {
        id: 'progression',
        icon: '📈',
        categories: {
            pt: 'Progressão & Coleções',
            en: 'Progression & Collections'
        },
        items: [
            { id: 'soulpoints', name: { pt: 'Soul Points', en: 'Soul Points' }, url: 'https://mudream.online/about/quests-collections/soul-points' },
            { id: 'dailyquest', name: { pt: 'Quests Diárias', en: 'Daily Quests' }, url: 'https://mudream.online/about/quests-collections/daily-quest' },
            { id: 'transmog', name: { pt: 'Transmog & Skins', en: 'Transmogrification & Skins' }, url: 'https://mudream.online/about/quests-collections/skins-transmog' },
            { id: 'dye', name: { pt: 'Tingimento de Itens', en: 'Item Dyeing' }, url: 'https://mudream.online/about/quests-collections/skins-dye' },
            { id: 'collections', name: { pt: 'Coleções do Jogo', en: 'In-Game Collections' }, url: 'https://mudream.online/about/quests-collections/collections' }
        ]
    },
    {
        id: 'guilds',
        icon: '🏰',
        categories: {
            pt: 'Guilds & Castle Siege',
            en: 'Guilds & Castle Siege'
        },
        items: [
            { id: 'guildinfo', name: { pt: 'Sistema de Guilds', en: 'Guilds Level System' }, url: 'https://mudream.online/about/guilds/guilds-info' },
            { id: 'castlesiege', name: { pt: 'Castle Siege', en: 'Castle Siege' }, url: 'https://mudream.online/about/guilds/castle-siege' }
        ]
    },
    {
        id: 'monsters',
        icon: '🐉',
        categories: {
            pt: 'Bosses & Monstros',
            en: 'Bosses & Monsters'
        },
        items: [
            { id: 'worldbosses', name: { pt: 'World Bosses (Guia Completo)', en: 'World Bosses (Full Guide)' }, url: 'https://mudream.online/pt/news/74' },
            { id: 'golden', name: { pt: 'Golden Monsters', en: 'Golden Monsters' }, url: 'https://mudream.online/about/monsters/golden-monsters' },
            { id: 'elite', name: { pt: 'Elite Monsters', en: 'Elite Monsters' }, url: 'https://mudream.online/about/monsters/elite-monsters' }
        ]
    },
    {
        id: 'gear',
        icon: '🛡️',
        categories: {
            pt: 'Equipamentos & Armas',
            en: 'Wings & Armor & Weapons'
        },
        items: [
            { id: 'ancset', name: { pt: 'Ancient Sets', en: 'Ancient Sets' }, url: 'https://mudream.online/about/gear/anc-set/anct4' },
            { id: 'earrings', name: { pt: 'Brincos', en: 'Earrings' }, url: 'https://mudream.online/about/gear/earrings' },
            { id: 'wings', name: { pt: 'Asas', en: 'Wings' }, url: 'https://mudream.online/about/gear/wings/level-1' }
        ]
    },
    {
        id: 'events',
        icon: '🎮',
        categories: {
            pt: 'Eventos',
            en: 'Events'
        },
        items: [
            { id: 'bloodcastle', name: { pt: 'Blood Castle', en: 'Blood Castle' }, url: 'https://mudream.online/about/events/blood-castle' },
            { id: 'devilsquare', name: { pt: 'Devil Square', en: 'Devil Square' }, url: 'https://mudream.online/about/events/devil-square' },
            { id: 'chaoscastle', name: { pt: 'Chaos Castle', en: 'Chaos Castle' }, url: 'https://mudream.online/about/events/chaos-castle' },
            { id: 'battleroyale', name: { pt: 'Batalha Real', en: 'Battle Royale' }, url: 'https://mudream.online/about/events/battle-royale' },
            { id: 'cherryblossom', name: { pt: 'Cherry Blossom', en: 'Cherry Blossom' }, url: 'https://mudream.online/about/events/cherry-blossom' },
            { id: 'lostwords', name: { pt: 'Lost Words', en: 'Lost Words' }, url: 'https://mudream.online/about/events/lost-words' }
        ]
    },
    {
        id: 'items',
        icon: '💎',
        categories: {
            pt: 'Itens & Joias',
            en: 'Items & Jewels'
        },
        items: [
            { id: 'boxes', name: { pt: 'Caixas (Boxes)', en: 'Boxes' }, url: 'https://mudream.online/about/items/boxes' },
            { id: 'jewels', name: { pt: 'Joias (Jewels)', en: 'Jewels' }, url: 'https://mudream.online/about/items/jewels' },
            { id: 'scrolls', name: { pt: 'Scrolls, Orbs & Parchments', en: 'Scrolls, Orbs & Parchments' }, url: 'https://mudream.online/about/items/skills' }
        ]
    },
    {
        id: 'options',
        icon: '⚡',
        categories: {
            pt: 'Opções de Itens',
            en: 'Item Options'
        },
        items: [
            { id: 'excellent', name: { pt: 'Opções Excellent', en: 'Excellent Options' }, url: 'https://mudream.online/about/options/excellent' }
        ]
    }
];

function renderGuide() {
    const container = document.getElementById('guideContent');
    const lang = currentLang || 'pt';

    container.innerHTML = `
        <div class="guide-search-bar">
            <input type="text" id="guideSearch" class="admin-input" placeholder="${lang === 'pt' ? '🔍 Buscar tutorial...' : '🔍 Search tutorial...'}" style="width:100%">
        </div>
        <div class="guide-categories" id="guideCats">
            ${renderGuideCategories(lang, '')}
        </div>
    `;

    document.getElementById('guideSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        document.getElementById('guideCats').innerHTML = renderGuideCategories(lang, q);
    });
}

function renderGuideCategories(lang, query) {
    return GUIDE_DATA.map(cat => {
        let items = cat.items;
        if (query) {
            items = items.filter(i => {
                const name = i.name[lang] || i.name.pt;
                const catName = cat.categories[lang] || cat.categories.pt;
                return name.toLowerCase().includes(query) || catName.toLowerCase().includes(query);
            });
        }
        if (items.length === 0) return '';

        const catName = cat.categories[lang] || cat.categories.pt;

        return `
            <div class="guide-category">
                <div class="guide-cat-header">
                    <span>${cat.icon} ${catName}</span>
                    <span class="guide-cat-count">${items.length}</span>
                </div>
                <div class="guide-items">
                    ${items.map(item => {
                        const name = item.name[lang] || item.name.pt;
                        return `
                            <a href="${item.url}" target="_blank" rel="noopener" class="guide-item">
                                <span class="guide-item-name">${name}</span>
                                <span class="guide-item-arrow">↗</span>
                            </a>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const guideTab = document.querySelector('[data-tab="guide"]');
    if (guideTab) {
        guideTab.addEventListener('click', () => renderGuide());
    }
});
