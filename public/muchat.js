class MuChat {
    constructor() {
        this.messagesEl = null;
        this.inputEl = null;
        this.history = [];
    }

    init() {
        this.messagesEl = document.getElementById('chatMessages');
        this.inputEl = document.getElementById('chatInput');

        document.getElementById('chatSend').addEventListener('click', () => this.send());
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.send();
        });

        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.inputEl.value = btn.dataset.q;
                this.send();
            });
        });
    }

    send() {
        const text = this.inputEl.value.trim();
        if (!text) return;

        this.inputEl.value = '';
        this.addMessage(text, 'user');

        const welcome = this.messagesEl.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        this.showTyping();

        setTimeout(() => {
            this.removeTyping();
            const answer = this.findAnswer(text);
            this.addMessage(answer, 'bot');
        }, 600 + Math.random() * 800);
    }

    addMessage(content, type) {
        const msg = document.createElement('div');
        msg.className = `chat-msg ${type}`;
        const botSvg = '<svg viewBox="0 0 64 64" width="22" height="22"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7ecbf5"/><stop offset="100%" stop-color="#1a6fa0"/></linearGradient></defs><path d="M32 4L28 10H36Z" fill="#f7c948"/><rect x="14" y="12" width="36" height="30" rx="8" fill="url(#hg)" stroke="#5bb8e8" stroke-width="1.5"/><path d="M10 27L14 22V32Z" fill="#5bb8e8"/><path d="M54 27L50 22V32Z" fill="#5bb8e8"/><rect x="18" y="20" width="28" height="14" rx="4" fill="#0d2b45" stroke="#4fc3f7" stroke-width="1"/><circle cx="26" cy="27" r="3.5" fill="#4fc3f7"/><circle cx="38" cy="27" r="3.5" fill="#f44336"/><rect x="22" y="44" width="20" height="10" rx="4" fill="#1a6fa0" stroke="#5bb8e8" stroke-width="1"/></svg>';
        const avatar = type === 'bot' ? botSvg : '⚔️';
        msg.innerHTML = `
            <div class="chat-msg-avatar">${avatar}</div>
            <div class="chat-msg-bubble">${content}</div>
        `;
        this.messagesEl.appendChild(msg);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        this.history.push({ type, content });
    }

    showTyping() {
        const typing = document.createElement('div');
        typing.className = 'chat-msg bot';
        typing.id = 'chatTyping';
        typing.innerHTML = `
            <div class="chat-msg-avatar"><svg viewBox="0 0 64 64" width="22" height="22"><defs><linearGradient id="hgt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7ecbf5"/><stop offset="100%" stop-color="#1a6fa0"/></linearGradient></defs><path d="M32 4L28 10H36Z" fill="#f7c948"/><rect x="14" y="12" width="36" height="30" rx="8" fill="url(#hgt)" stroke="#5bb8e8" stroke-width="1.5"/><path d="M10 27L14 22V32Z" fill="#5bb8e8"/><path d="M54 27L50 22V32Z" fill="#5bb8e8"/><rect x="18" y="20" width="28" height="14" rx="4" fill="#0d2b45" stroke="#4fc3f7" stroke-width="1"/><circle cx="26" cy="27" r="3.5" fill="#4fc3f7"/><circle cx="38" cy="27" r="3.5" fill="#f44336"/><rect x="22" y="44" width="20" height="10" rx="4" fill="#1a6fa0" stroke="#5bb8e8" stroke-width="1"/></svg></div>
            <div class="chat-msg-bubble chat-typing">
                <span></span><span></span><span></span>
            </div>
        `;
        this.messagesEl.appendChild(typing);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    removeTyping() {
        const el = document.getElementById('chatTyping');
        if (el) el.remove();
    }

    normalize(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9.\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    guideLinks = {
        wings: { url: 'https://mudream.online/about/gear/wings/level-1', label: 'Wings Level 1' },
        wings2: { url: 'https://mudream.online/about/gear/wings/level-2', label: 'Wings Level 2' },
        wings25: { url: 'https://mudream.online/about/gear/wings/level-2-5', label: 'Wings Level 2.5' },
        darkWizard: { url: 'https://mudream.online/about/classes/dw', label: 'Dark Wizard' },
        darkKnight: { url: 'https://mudream.online/about/classes/dk', label: 'Dark Knight' },
        elf: { url: 'https://mudream.online/about/classes/elf', label: 'Elf' },
        magicGladiator: { url: 'https://mudream.online/about/classes/mg', label: 'Magic Gladiator' },
        darkLord: { url: 'https://mudream.online/about/classes/dl', label: 'Dark Lord' },
        summoner: { url: 'https://mudream.online/about/classes/sum', label: 'Summoner' },
        rageFighter: { url: 'https://mudream.online/about/classes/rf', label: 'Rage Fighter' },
        bloodCastle: { url: 'https://mudream.online/about/events/blood-castle', label: 'Blood Castle' },
        devilSquare: { url: 'https://mudream.online/about/events/devil-square', label: 'Devil Square' },
        chaosCastle: { url: 'https://mudream.online/about/events/chaos-castle', label: 'Chaos Castle' },
        battleRoyale: { url: 'https://mudream.online/about/events/battle-royale', label: 'Battle Royale' },
        castleSiege: { url: 'https://mudream.online/about/guilds/castle-siege', label: 'Castle Siege' },
        goldenInvasion: { url: 'https://mudream.online/about/monsters/golden-monsters', label: 'Golden Monsters' },
        bosses: { url: 'https://mudream.online/pt/news/74', label: 'World Bosses - Guia Completo' },
        eliteMonsters: { url: 'https://mudream.online/about/monsters/elite-monsters', label: 'Elite Monsters' },
        jewels: { url: 'https://mudream.online/about/items/jewels', label: 'Jewels' },
        boxes: { url: 'https://mudream.online/about/items/boxes', label: 'Boxes' },
        ancientSets: { url: 'https://mudream.online/about/gear/anc-set/anct4', label: 'Ancient Sets' },
        earrings: { url: 'https://mudream.online/about/gear/earrings', label: 'Earrings' },
        excellent: { url: 'https://mudream.online/about/options/excellent', label: 'Excellent Options' },
        soulPoints: { url: 'https://mudream.online/about/quests-collections/soul-points', label: 'Soul Points' },
        dailyQuests: { url: 'https://mudream.online/about/quests-collections/daily-quest', label: 'Daily Quests' },
        collections: { url: 'https://mudream.online/about/quests-collections/collections', label: 'Collections' },
        transmogrification: { url: 'https://mudream.online/about/quests-collections/skins-transmog', label: 'Transmog & Skins' },
        dyeing: { url: 'https://mudream.online/about/quests-collections/skins-dye', label: 'Item Dyeing' },
        classQuest: { url: 'https://mudream.online/about/classes/class-quest/marlon-quest', label: 'Profession Quests' },
        guildSystem: { url: 'https://mudream.online/about/guilds/guilds-info', label: 'Guilds System' },
        server: { url: 'https://mudream.online/about/main/baseinfo', label: 'Server Info' },
        reset: { url: 'https://mudream.online/about/main/resets-system', label: 'Reset System' },
        muHelper: { url: 'https://mudream.online/about/main/mu-helper', label: 'MU Helper' },
        cherryBlossom: { url: 'https://mudream.online/about/events/cherry-blossom', label: 'Cherry Blossom' },
        lostWords: { url: 'https://mudream.online/about/events/lost-words', label: 'Lost Words' },
        scrollsOrbs: { url: 'https://mudream.online/about/items/skills', label: 'Scrolls & Orbs' },
        patch72: { url: 'https://mudream.online/pt/news/90', label: 'MUDREAM 7.2 RAMPAGE' },
        patch73: { url: 'https://mudream.online/pt/news/91', label: 'MUDREAM 7.3 RAMPAGE' },
        colossusInvasion: { url: 'https://mudream.online/pt/news/91', label: 'Invasão do Colossus' },
        wingsLevel3: { url: 'https://mudream.online/pt/news/91', label: 'Wings Level 3' },
        pvpOptions: { url: 'https://mudream.online/pt/news/91', label: 'Opções de PvP' },
        harmonyOptions: { url: 'https://mudream.online/pt/news/90', label: 'Harmony System' },
        ancientT5: { url: 'https://mudream.online/pt/news/90', label: 'Ancient T5' },
        nightmareLair: { url: 'https://mudream.online/pt/news/90', label: 'Nightmare\'s Lair' },
        crywolfDungeon: { url: 'https://mudream.online/pt/news/90', label: 'Curse of Crywolf' },
        guildShrine: { url: 'https://mudream.online/pt/news/90', label: 'Guild Shrine' }
    };

    findAnswer(query) {
        const normalized = this.normalize(query);
        const words = normalized.split(' ');

        let bestMatch = null;
        let bestKey = null;
        let bestScore = 0;

        for (const [key, entry] of Object.entries(MUCHAT_KB)) {
            let score = 0;
            for (const keyword of entry.keywords) {
                const normKeyword = this.normalize(keyword);
                if (normalized.includes(normKeyword)) {
                    score += normKeyword.length * 2;
                }
                for (const word of words) {
                    if (normKeyword.includes(word) && word.length >= 3) {
                        score += word.length;
                    }
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
                bestKey = key;
            }
        }

        if (bestMatch && bestScore >= 3) {
            let answer = bestMatch.answer;
            const guide = this.guideLinks[bestKey];
            if (guide) {
                answer += `<br><br><a href="${guide.url}" target="_blank" rel="noopener" class="chat-guide-link">📖 Ver guia completo: ${guide.label} ↗</a>`;
            }
            return answer;
        }

        return this.getFallback(normalized);
    }

    getFallback(query) {
        if (query.includes('ola') || query.includes('oi') || query.includes('eai') || query.includes('hey') || query.includes('hello')) {
            return `Olá, guerreiro! 👋<br><br>Sou o <strong>MU IA</strong>, seu assistente do MU Timer World RAMPAGE X-20.<br><br>Posso te ajudar com:
            <ul>
            <li>📋 Informações sobre <strong>classes</strong></li>
            <li>⏰ Horários de <strong>eventos</strong></li>
            <li>🐉 Spawns de <strong>bosses</strong></li>
            <li>⚔️ Como <strong>craftar itens</strong></li>
            <li>🏰 Guias de <strong>eventos</strong></li>
            </ul><br>É só perguntar!`;
        }

        if (query.includes('obrigad') || query.includes('valeu') || query.includes('thanks')) {
            return `De nada! 😊 Estou sempre aqui pra ajudar. Se tiver mais dúvidas sobre o MU Timer World, é só perguntar!`;
        }

        if (query.includes('melhor classe') || query.includes('qual classe jogar') || query.includes('classe recomend')) {
            return `<strong>Qual a melhor classe?</strong><br><br>
            Depende do seu estilo de jogo!<br><br>
            <ul>
            <li>🗡️ <strong>PvP agressivo:</strong> Dark Knight ou Rage Fighter</li>
            <li>🔮 <strong>Farm/PvE:</strong> Dark Wizard ou Summoner</li>
            <li>👥 <strong>Support/Party:</strong> Elf (Energy Elf)</li>
            <li>⚔️ <strong>Versátil:</strong> Magic Gladiator</li>
            <li>👑 <strong>Líder de party:</strong> Dark Lord</li>
            </ul><br>
            Para iniciantes, recomendo <strong>Dark Knight</strong> (fácil e eficiente) ou <strong>Elf</strong> (sempre bem-vinda em parties).`;
        }

        if (query.includes('como comecar') || query.includes('iniciante') || query.includes('dica para comecar') || query.includes('novo jogador')) {
            return `<strong>Dicas para Iniciantes</strong><br><br>
            <ul>
            <li>1. Escolha sua classe e foque em upar</li>
            <li>2. Faça as <strong>Missões Diárias</strong> todos os dias</li>
            <li>3. Participe de <strong>Blood Castle</strong> e <strong>Devil Square</strong> para XP e itens</li>
            <li>4. Guarde <strong>Jewels</strong> — são a moeda principal</li>
            <li>5. Entre em uma <strong>guild</strong> o mais rápido possível</li>
            <li>6. Configure o <strong>MU Helper</strong> para farm automático</li>
            <li>7. Participe da <strong>Golden Invasion</strong> para drops valiosos</li>
            </ul>`;
        }

        if (query.includes('onde farm') || query.includes('melhor lugar') || query.includes('melhor mapa') || query.includes('onde upar')) {
            return `<strong>Melhores Locais para Farm</strong><br><br>
            Depende do seu nível:<br><br>
            <ul>
            <li>🟢 Nível 1-130: <strong>Noria, Devias</strong></li>
            <li>🟡 Nível 131-230: <strong>Atlans, Losttower</strong></li>
            <li>🔴 Nível 231-330: <strong>Tarkan, Aida</strong></li>
            <li>🟣 Nível 331-400: <strong>Kanturu, Crimson Icarus</strong></li>
            </ul><br>
            Dica: Participe de eventos como <strong>Blood Castle</strong> e <strong>Devil Square</strong> para XP extra!`;
        }

        return `Hmm, não encontrei informações específicas sobre isso. 🤔<br><br>
        Tente perguntar sobre:
        <ul>
        <li>📋 <strong>Classes</strong> (ex: "como jogar de Dark Knight?")</li>
        <li>⏰ <strong>Eventos</strong> (ex: "horários dos eventos")</li>
        <li>🐉 <strong>Bosses</strong> (ex: "onde spawna o Red Dragon?")</li>
        <li>💎 <strong>Itens</strong> (ex: "o que são Jewels?")</li>
        <li>⚔️ <strong>Crafts</strong> (ex: "como criar asas?")</li>
        <li>🏰 <strong>Castle Siege</strong> (ex: "como funciona o Castle Siege?")</li>
        </ul>`;
    }
}
