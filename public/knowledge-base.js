const MUCHAT_KB = {
    server: {
        keywords: ['servidor', 'server', 'rates', 'info', 'informação', 'básic', 'rampage', 'x20', 'x-20'],
        answer: `<strong>MU Timer World RAMPAGE X-20</strong><br><br>
        <ul>
        <li><strong>Rates:</strong> Dinâmico X20</li>
        <li><strong>Fórmula de Zen:</strong> 150×Level do Monstro + Drop de Zen do Item</li>
        <li><strong>Nível máx. do item:</strong> +13</li>
        <li><strong>Máx. de clientes abertos:</strong> 3</li>
        <li><strong>Máx. de opção Excellent:</strong> 4</li>
        <li><strong>Máx. de membros da guild:</strong> 20</li>
        <li><strong>Nível máx.:</strong> 400</li>
        <li><strong>Máx. de Reset:</strong> 50</li>
        <li><strong>Stats Points Cap:</strong> 48.000</li>
        <li><strong>Fuso horário:</strong> UTC+2</li>
        </ul><br>
        O sistema de experiência é <strong>dinâmico</strong> — a cada reset, você ganha menos experiência e upa mais devagar. O poder do personagem depende de equipamentos e mecânicas, não apenas de resets.`
    },

    reset: {
        keywords: ['reset', 'resetar', 'resets', 'limite de reset', 'máximo reset'],
        answer: `<strong>Sistema de Reset</strong><br><br>
        O RAMPAGE X-20 usa um sistema de <strong>experiência dinâmico</strong>:<br><br>
        <ul>
        <li>A cada novo reset, seu personagem ganha <strong>menos experiência</strong></li>
        <li>Upa mais lento e fica mais difícil</li>
        <li><strong>Máximo de Reset:</strong> 50</li>
        <li><strong>Nível máximo:</strong> 400</li>
        <li>Os pontos de status são limitados, melhorando o balanceamento de PvP</li>
        </ul><br>
        O foco é em <strong>progressão inteligente</strong> — encontrar itens melhores e se adaptar aos sistemas do jogo.`
    },

    classes: {
        keywords: ['classe', 'classes', 'personagem', 'personagens', 'char', 'qual classe'],
        answer: `<strong>Classes Disponíveis no RAMPAGE X-20</strong><br><br>
        <ul>
        <li>⚡ <strong>Dark Wizard (DW)</strong> — Mago com magias poderosas de área e single target</li>
        <li>🗡️ <strong>Dark Knight (DK)</strong> — Guerreiro corpo a corpo com alto dano e defesa</li>
        <li>🏹 <strong>Elf (AE/EE)</strong> — Arqueira/Support com buffs e habilidades à distância</li>
        <li>⚔️ <strong>Magic Gladiator (MG)</strong> — Híbrido guerreiro/mago, sem necessidade de 1ª evolução</li>
        <li>👑 <strong>Dark Lord (DL)</strong> — Líder com dark horse e dark raven, bom para party</li>
        <li>🔮 <strong>Summoner (SUM)</strong> — Invocadora com magias de maldição e summon</li>
        <li>👊 <strong>Rage Fighter (RF)</strong> — Lutador corpo a corpo com combos rápidos</li>
        </ul><br>
        Cada classe tem sua <strong>Missão de Profissão</strong> para evoluir (1ª, 2ª e 3ª evolução).`
    },

    darkWizard: {
        keywords: ['dark wizard', 'dw', 'mago', 'wizard'],
        answer: `<strong>Dark Wizard (DW)</strong><br><br>
        Classe de magia com ataques devastadores à distância.<br><br>
        <ul>
        <li><strong>Tipo:</strong> Dano mágico / Ranged</li>
        <li><strong>Evolução:</strong> DW → Soul Master → Grand Master</li>
        <li><strong>Skills principais:</strong> Energy Ball, Hellfire, Meteor, Nova, Ice Storm</li>
        <li><strong>Pontos fortes:</strong> Alto dano em área, bom para farm</li>
        <li><strong>Pontos fracos:</strong> Defesa baixa, precisa de boa posição</li>
        </ul><br>
        Dica: Invista em <strong>Energy</strong> para aumentar o dano mágico.`
    },

    darkKnight: {
        keywords: ['dark knight', 'dk', 'guerreiro', 'knight', 'cavaleiro'],
        answer: `<strong>Dark Knight (DK)</strong><br><br>
        Guerreiro clássico com alto dano físico e boa defesa.<br><br>
        <ul>
        <li><strong>Tipo:</strong> Dano físico / Melee</li>
        <li><strong>Evolução:</strong> DK → Blade Knight → Blade Master</li>
        <li><strong>Skills principais:</strong> Twisting Slash, Death Stab, Rageful Blow, Combo</li>
        <li><strong>Pontos fortes:</strong> Tanque natural, bom em PvP e PvE</li>
        <li><strong>Pontos fracos:</strong> Sem ataques à distância eficientes</li>
        </ul><br>
        Dica: Balance entre <strong>Strength</strong> e <strong>Vitality</strong> para ser eficiente.`
    },

    elf: {
        keywords: ['elf', 'elfa', 'arqueira', 'support', 'buff', 'heal'],
        answer: `<strong>Elf (AE/EE)</strong><br><br>
        Classe versátil que pode ser Agility Elf (DPS) ou Energy Elf (Support).<br><br>
        <ul>
        <li><strong>Tipo:</strong> Ranged DPS ou Support</li>
        <li><strong>Evolução:</strong> Elf → Muse Elf → High Elf</li>
        <li><strong>Skills AE:</strong> Multi-Shot, Penetration, Ice Arrow</li>
        <li><strong>Skills EE:</strong> Heal, Greater Defense, Greater Damage, Attack Speed Buff</li>
        <li><strong>Pontos fortes:</strong> Buffs essenciais para party, bom DPS como AE</li>
        </ul><br>
        Dica: <strong>Energy Elf</strong> é muito procurada para parties e eventos.`
    },

    magicGladiator: {
        keywords: ['magic gladiator', 'mg', 'gladiador'],
        answer: `<strong>Magic Gladiator (MG)</strong><br><br>
        Híbrido guerreiro/mago que não precisa de 1ª evolução.<br><br>
        <ul>
        <li><strong>Tipo:</strong> Híbrido (Físico + Mágico)</li>
        <li><strong>Evolução:</strong> MG → Duel Master</li>
        <li><strong>Skills:</strong> Power Slash, Fire Slash, magias de DW e DK</li>
        <li><strong>Pontos fortes:</strong> Versatilidade, pode usar magias e espadas</li>
        <li><strong>Pontos fracos:</strong> Jack of all trades, master of none</li>
        </ul><br>
        Dica: Pode ser build <strong>STR (físico)</strong> ou <strong>ENE (mágico)</strong>.`
    },

    darkLord: {
        keywords: ['dark lord', 'dl', 'lord', 'dark horse', 'dark raven'],
        answer: `<strong>Dark Lord (DL)</strong><br><br>
        Classe de liderança com pets poderosos e buffs de party.<br><br>
        <ul>
        <li><strong>Tipo:</strong> Support / Tank com pets</li>
        <li><strong>Evolução:</strong> DL → Lord Emperor</li>
        <li><strong>Pets:</strong> Dark Horse (montaria + ataque) e Dark Raven (pet que ataca)</li>
        <li><strong>Skills:</strong> Fire Burst, Fire Scream, Chaotic Diseier</li>
        <li><strong>Pontos fortes:</strong> Buffs de Command para a party, tanque</li>
        </ul><br>
        Dica: Invista em <strong>Command</strong> para fortalecer os pets e buffs de party.`
    },

    summoner: {
        keywords: ['summoner', 'sum', 'invocadora', 'summon'],
        answer: `<strong>Summoner (SUM)</strong><br><br>
        Invocadora com magias de maldição e summon.<br><br>
        <ul>
        <li><strong>Tipo:</strong> Dano mágico / Debuff</li>
        <li><strong>Evolução:</strong> SUM → Bloody Summoner → Dimension Master</li>
        <li><strong>Skills:</strong> Chain Lightning, Drain Life, Berserker, Sleep</li>
        <li><strong>Pontos fortes:</strong> CC (crowd control), boa em PvP</li>
        <li><strong>Pontos fracos:</strong> Curva de aprendizado alta</li>
        </ul><br>
        Dica: <strong>Sleep + Berserker</strong> é uma combo mortal no PvP.`
    },

    rageFighter: {
        keywords: ['rage fighter', 'rf', 'lutador'],
        answer: `<strong>Rage Fighter (RF)</strong><br><br>
        Lutador corpo a corpo com combos rápidos e devastadores.<br><br>
        <ul>
        <li><strong>Tipo:</strong> Melee / Combo</li>
        <li><strong>Evolução:</strong> RF → Fist Master</li>
        <li><strong>Skills:</strong> Dark Side, Dragon Roar, Chain Drive, Dragon Kick</li>
        <li><strong>Pontos fortes:</strong> Alto DPS, combos rápidos</li>
        <li><strong>Pontos fracos:</strong> Precisa estar perto do inimigo</li>
        </ul><br>
        Dica: Invista em <strong>Vitality</strong> e <strong>Strength</strong> para sobreviver no melee.`
    },

    bloodCastle: {
        keywords: ['blood castle', 'bc', 'blood', 'castelo sangue'],
        answer: `<strong>Blood Castle</strong><br><br>
        Evento PvE onde você ganha muita experiência!<br><br>
        <strong>Como completar:</strong>
        <ul>
        <li>1. Mate a quantidade de monstros indicada</li>
        <li>2. Destrua o <strong>Portão do Castelo</strong></li>
        <li>3. Mate os <strong>Esqueletos Mágicos</strong></li>
        <li>4. Destrua a <strong>Estátua de Cristal</strong></li>
        <li>5. Pegue a <strong>Arma do Arcanjo</strong> e entregue ao NPC</li>
        </ul><br>
        <strong>Entrada:</strong> Blood Castle Ticket ou Invisibility Cloak (craft na Chaos Machine)<br>
        <strong>Níveis:</strong> BC1 (15-80) até BC7 (331-400)<br>
        <strong>Horários:</strong> A cada 2 horas (00:00, 02:00, 04:00...)`
    },

    devilSquare: {
        keywords: ['devil square', 'ds', 'devil', 'praça do diabo'],
        answer: `<strong>Devil Square</strong><br><br>
        Evento PvE com ondas de monstros para farmar experiência e Zen!<br><br>
        <ul>
        <li>Monstros ficam mais fortes conforme o evento avança</li>
        <li>Quanto mais monstros matar, maior chance de vencer</li>
        <li>Recompensa em <strong>Zen</strong> (10M - 15M dependendo do nível)</li>
        </ul><br>
        <strong>Entrada:</strong> Devil Square Ticket ou Devil's Invitation (Chaos Machine)<br>
        <strong>Níveis:</strong> DS1 (15-130) até DS6 (331-400)<br>
        <strong>Horários:</strong> A cada 2 horas (01:00, 03:00, 05:00...)`
    },

    chaosCastle: {
        keywords: ['chaos castle', 'cc', 'chaos', 'castelo caos'],
        answer: `<strong>Chaos Castle</strong><br><br>
        Evento <strong>PvP</strong> — lute contra monstros E outros jogadores!<br><br>
        <ul>
        <li>As paredes vão <strong>se fechando</strong> lentamente</li>
        <li>Se ficar fora da parede, você perde</li>
        <li>Último jogador vivo <strong>vence</strong></li>
        <li>Recompensa: Jewels ou <strong>Ancient Item</strong></li>
        </ul><br>
        <strong>Entrada:</strong> Armor of Guardsman (compre em qualquer NPC)<br>
        <strong>Níveis:</strong> CC1 (0-5 Reset) até CC6 (36-50 Reset)<br>
        <strong>Horários:</strong> A cada 2 horas (00:30, 02:30, 04:30...)`
    },

    battleRoyale: {
        keywords: ['batalha real', 'battle royale', 'br', 'royale', '50v50', '50vs50'],
        answer: `<strong>Batalha Real (Battle Royale)</strong><br><br>
        Evento PvP épico <strong>50 vs 50</strong>!<br><br>
        <ul>
        <li>Todos começam com <strong>mesmo equipamento e 15.000 pontos de status</strong></li>
        <li>60 segundos para distribuir os pontos no início</li>
        <li><strong>Safe Zone</strong> diminui ao longo do tempo (borda vermelha)</li>
        <li>Próxima safe zone destacada em <strong>verde</strong></li>
        <li>Mate Green Goblins e abra baús para loot</li>
        <li>Time com mais jogadores vivos no final <strong>vence</strong></li>
        </ul><br>
        <strong>Nível mínimo:</strong> 150 | <strong>Limite:</strong> 100 jogadores<br>
        <strong>Duração:</strong> 10 minutos<br>
        <strong>Horários:</strong> 02:00, 08:00, 14:00, 20:00, 23:00`
    },

    cherryBlossom: {
        keywords: ['cherry blossom', 'cherry', 'cerejeira', 'flor', 'lunar rabbit', 'fire flame', 'pouch', 'dreamland'],
        answer: `<strong>Cherry Blossom</strong><br><br>
        Evento recorrente em <strong>Dreamland</strong> — mate monstros e colete galhos!<br><br>
        <strong>🐰 Lunar Rabbit</strong>
        <ul>
        <li>Respawn: 05:25, 11:25, 17:25, 23:25</li>
        <li>Colete <strong>10 galhos</strong> → troque no NPC</li>
        <li>Recompensa: 80% Jewels / 20% itens raros</li>
        </ul><br>
        <strong>🔥 Fire Flame Ghost</strong>
        <ul>
        <li>Respawn: 01:25, 07:25, 13:25, 19:25</li>
        <li>Colete <strong>30 galhos</strong> → troque no NPC</li>
        </ul><br>
        <strong>🎒 Pouch of Blessing</strong>
        <ul>
        <li>Respawn: 03:25, 09:25, 15:25, 21:25</li>
        <li>Colete <strong>50 galhos</strong> → recompensas top</li>
        </ul><br>
        NPC: <strong>Cherry Blossom Spirit</strong> em Dreamland`
    },

    goldenInvasion: {
        keywords: ['golden', 'dourado', 'golden invasion', 'invasão dourada', 'golden goblin', 'golden dragon'],
        answer: `<strong>Golden Invasion</strong><br><br>
        Monstros dourados com drops valiosos aparecem em vários mapas!<br><br>
        <strong>Horários:</strong> 00:36, 04:36, 08:36, 12:36, 16:36, 20:36<br><br>
        <strong>Localizações:</strong>
        <ul>
        <li>🟡 Noria — Golden Goblin, Golden Golem</li>
        <li>🟡 Dreamland — Golden Budge Dragon, Golden Giant</li>
        <li>🟡 Elbeland — Golden Rabbit, Golden Grizzly</li>
        <li>🟡 Devias — Golden Elite Yeti, Golden Soldier</li>
        <li>🟡 Atlans — Golden Vepar, Golden Titan, Golden Lizard King</li>
        <li>🟡 Losttower — Golden Devil, Golden Balrog</li>
        <li>🟡 Tarkan — Golden Wheel, Golden Tantalos, Golden Beam Knight</li>
        <li>🟡 Aida — Golden Stone Golem, Golden Witch Queen</li>
        <li>🟡 Kanturu — Golden Satyros, Golden Blade Hunter, Golden Kentauros</li>
        </ul><br>
        ⚠️ Aparece apenas nos <strong>Main Servers</strong>!<br>
        🐉 <strong>Great Golden Dragon</strong> em Shadow Abyss — dropa 4x Jewels!`
    },

    castleSiege: {
        keywords: ['castle siege', 'siege', 'castelo', 'loren', 'guild war', 'guerra de guild'],
        answer: `<strong>Castle Siege</strong><br><br>
        O maior evento PvP de guilds — semanal!<br><br>
        <strong>Cronograma:</strong>
        <ul>
        <li>📅 Seg-Qui: Registro de Guilds</li>
        <li>📅 Sex-Sáb: Registro de Sign of Lord</li>
        <li>📅 Dom 12:00: Lista de participantes revelada</li>
        <li>⚔️ <strong>Dom 20:00: Castle Siege</strong> (60 min)</li>
        </ul><br>
        <strong>Como funciona:</strong>
        <ul>
        <li>4 guilds com mais Sign of Lord participam</li>
        <li>Guild defensora tem debuff de -15% Dano/Defesa</li>
        <li>Atacantes têm buff de +15% (aumenta a cada vitória consecutiva)</li>
        <li>Guild Master deve capturar a <strong>Crown</strong> por 60 segundos</li>
        <li>Precisa ativar os <strong>2 Switches</strong> simultaneamente</li>
        </ul><br>
        <strong>Recompensas:</strong> Acesso à <strong>Land of Trials</strong> + Dream Coins (1º=4000, 2º=2000, 3º=1500)`
    },

    bosses: {
        keywords: ['boss', 'bosses', 'elite', 'monstro elite', 'spawn boss'],
        answer: `<strong>Bosses & Monstros Elite</strong><br><br>
        <strong>Bosses com horário fixo:</strong>
        <ul>
        <li>🧙 <strong>White Wizard</strong> (Noria) — 09:45, 12:45, 15:45, 18:45</li>
        <li>💀 <strong>Death King</strong> (Shadow Abyss) — 21:45, 00:45, 03:45, 06:45</li>
        <li>🗡️ <strong>Zaikan</strong> (Tarkan 2) — 00:55, 06:55, 12:55, 18:55</li>
        <li>🐉 <strong>Red Dragon</strong> (Aida) — 08:00, 20:00</li>
        <li>🎅 <strong>Cursed Santa</strong> (Devias) — 02:35, 08:35, 14:35, 20:35</li>
        </ul><br>
        <strong>Respawn após morte:</strong>
        <ul>
        <li>🔵🔴🟡 Goblins (Shadow Abyss) — 10-11h após matar</li>
        <li>🦇 <strong>Muggron</strong> (Crywolf/Barracks) — 7-8h após morte</li>
        <li>Mini-bosses (Nethrakar, Crystal Warden, etc.) — 1h após morte</li>
        </ul><br>
        ⚠️ Todos aparecem apenas nos <strong>Main Servers</strong>!`
    },

    wings: {
        keywords: ['asa', 'asas', 'wings', 'criar asa', 'como fazer asa', 'wings 1', 'asa nivel 1', 'primeira asa'],
        answer: `<strong>Asas (Wings) — Guia Completo</strong><br><br>
        As asas são criadas na <strong>Chaos Machine</strong> (Chaos Goblin em Dreamland 126,170 ou Noria 180,103).<br><br>
        <strong>🪶 Wings Level 1 — Passo a Passo:</strong><br>
        <em>Passo 1 — Chaos Weapon:</em>
        <ul>
        <li>Qualquer Equipamento <strong>+4 +(1) Add</strong> (mínimo)</li>
        <li>Jewel of Chaos + Jewel of Soul + Jewel of Bless</li>
        <li>850.000 Zen</li>
        </ul>
        <em>Passo 2 — Wings Lv.1:</em>
        <ul>
        <li>Chaos Weapon <strong>+4 +(1) Add</strong> (mínimo)</li>
        <li>Jewel of Chaos</li>
        <li>850.000 Zen</li>
        </ul>
        <em>Tipos:</em> Wings of Fairy (Elf), Wings of Angel (DW/MG), Wings of Satan (DK/MG), Cape of Lord (DL), Wings of Spell (SUM), Cloak of Warrior (RF)<br><br>
        💡 Quanto maior o +level do item, maior a chance de sucesso! Failed Bonus acumula até 100%.`
    },

    wings2: {
        keywords: ['wings 2', 'asa 2', 'wings level 2', 'asa nivel 2', 'asa level 2', 'criar asa level 2', 'criar asa 2', 'fazer asa 2', 'segunda asa', 'loch feather', 'monarch crest'],
        answer: `<strong>Wings Level 2 — Craft Completo</strong><br><br>
        <strong>Passo 1 — Conseguir Material:</strong>
        <ul>
        <li>Farme em <strong>Crimson Icarus</strong> (nível mínimo 180 + Wings Lv.1 ou Dinorant)</li>
        <li>Drop: <strong>Loch's Feather</strong> (para Wings) ou <strong>Monarch's Crest</strong> (para Cape)</li>
        <li>Também dropa do boss <strong>Zaikan</strong> em Tarkan</li>
        </ul><br>
        <strong>Passo 2 — Craft na Chaos Machine:</strong>
        <ul>
        <li>Wings Lv.1 <strong>+9 +(4) Add</strong> (mínimo)</li>
        <li>Loch's Feather ou Monarch's Crest</li>
        <li><strong>5x</strong> Jewel of Chaos + <strong>10x</strong> Jewel of Bless + <strong>10x</strong> Jewel of Soul</li>
        <li>Qualquer Equipamento Excellent <strong>+9 +(4) Add</strong></li>
        <li>30.000.000 Zen</li>
        </ul>
        <strong>Taxa base de sucesso:</strong> 60%<br>
        💡 Failed Bonus acumula chance extra a cada falha!`
    },

    wings25: {
        keywords: ['wings 2.5', 'asa 2.5', 'wings level 2.5', 'asa dois e meio', 'condor flame', 'condor feather', 'fazer wings 2.5', 'criar wings 2.5', 'criar asa 2.5'],
        answer: `<strong>Wings Level 2.5</strong><br><br>
        As Wings 2.5 são uma evolução das Wings Level 2, mais poderosas!<br><br>
        <strong>Receita na Chaos Machine:</strong>
        <ul>
        <li>Wings Lv.2 (em boas condições)</li>
        <li>Condor Flame ou Condor Feather</li>
        <li>Jewels de Chaos, Bless e Soul</li>
        <li>Item Ancient</li>
        <li>Zen</li>
        </ul><br>
        <strong>Onde dropar Condor Flame/Feather:</strong>
        <ul>
        <li>Bosses de alto nível</li>
        <li>Eventos especiais</li>
        </ul><br>
        💡 Wings 2.5 dão <strong>mais absorção de dano</strong> e <strong>bônus de ataque</strong> que as Wings Lv.2!`
    },

    ancientSets: {
        keywords: ['ancient', 'set ancient', 'conjunto ancient', 'set', 'equipamento ancient'],
        answer: `<strong>Conjuntos Ancient</strong><br><br>
        Itens Ancient possuem bônus especiais quando usados em conjunto!<br><br>
        <ul>
        <li>Cada peça Ancient tem uma <strong>opção bônus</strong> especial</li>
        <li>Completar o set dá <strong>bônus adicionais</strong> poderosos</li>
        <li>Podem ser obtidos no <strong>Chaos Castle</strong> (50% de chance)</li>
        <li>Também podem dropar de bosses e monstros especiais</li>
        <li>Máx. de opção Excellent: <strong>4</strong></li>
        </ul><br>
        Dica: Sets Ancient completos são extremamente poderosos no PvP!`
    },

    jewels: {
        keywords: ['jewel', 'jewels', 'joia', 'joias', 'bless', 'soul', 'chaos', 'life', 'creation', 'guardian'],
        answer: `<strong>Jewels (Joias)</strong><br><br>
        <ul>
        <li>💎 <strong>Jewel of Bless</strong> — Aumenta opções de item em +1 (sem risco de perder)</li>
        <li>💜 <strong>Jewel of Soul</strong> — Aumenta opções de item em +1 (com risco de falhar e item ir para +0)</li>
        <li>🔴 <strong>Jewel of Chaos</strong> — Usado na Chaos Machine para crafts</li>
        <li>🟢 <strong>Jewel of Life</strong> — Aumenta uma opção do item em +1 nível</li>
        <li>🟡 <strong>Jewel of Creation</strong> — Usado em combinações na Chaos Machine</li>
        <li>🔵 <strong>Jewel of Guardian</strong> — Adiciona opção de vida ao item</li>
        <li>⭐ <strong>Jewel of Excellent</strong> — Adiciona opção Excellent ao item</li>
        </ul><br>
        Dica: <strong>Jewel of Bless</strong> é seguro até +6. Acima disso, use <strong>Soul</strong> com cuidado!`
    },

    chaosMachine: {
        keywords: ['chaos machine', 'craft', 'craftar', 'combinação', 'combinar', 'criar item'],
        answer: `<strong>Chaos Machine</strong><br><br>
        A Chaos Machine é usada para criar e melhorar itens!<br><br>
        <strong>Combinações principais:</strong>
        <ul>
        <li>🪶 <strong>Wings (Asas)</strong> — Itens + Jewel of Chaos + materiais</li>
        <li>🧥 <strong>Invisibility Cloak</strong> — Para entrar no Blood Castle</li>
        <li>📜 <strong>Devil's Invitation</strong> — Para entrar no Devil Square</li>
        <li>⚔️ <strong>Upgrade de itens</strong> — Elevar level de itens com Jewels</li>
        <li>🔮 <strong>Fruit</strong> — Para adicionar pontos de status</li>
        </ul><br>
        O NPC da Chaos Machine está em <strong>Noria</strong>.<br>
        Dica: A taxa de sucesso varia — itens de maior level têm menor chance!`
    },

    party: {
        keywords: ['party', 'grupo', 'exp party', 'experiência grupo', 'exp de party'],
        answer: `<strong>EXP de Party</strong><br><br>
        <ul>
        <li>👤 Solo — <strong>100%</strong></li>
        <li>👥 2 pessoas — <strong>95%</strong></li>
        <li>👥 3 pessoas — <strong>90%</strong></li>
        <li>👥 4 pessoas — <strong>85%</strong></li>
        <li>👥 5 pessoas — <strong>80%</strong></li>
        </ul><br>
        Dica: Mesmo com redução, party é vantajosa pela <strong>segurança</strong> e <strong>buffs da Elf</strong>!`
    },

    soulPoints: {
        keywords: ['soul', 'pontos de soul', 'soul points', 'soul system', 'soul tree'],
        answer: `<strong>Pontos de Soul</strong><br><br>
        Sistema de evolução adicional que dá habilidades passivas ao personagem.<br><br>
        <ul>
        <li>Ganhe pontos de Soul ao upar e completar desafios</li>
        <li>Distribua pontos em árvores de habilidades passivas</li>
        <li>Aumenta dano, defesa, HP, e outros atributos</li>
        <li>Cada classe tem sua própria árvore de Soul</li>
        </ul><br>
        Dica: Planeje sua build de Soul Points com antecedência!`
    },

    dailyQuests: {
        keywords: ['missão', 'missões', 'quest', 'diária', 'diárias', 'daily'],
        answer: `<strong>Missões Diárias</strong><br><br>
        Complete missões diárias para ganhar recompensas extras!<br><br>
        <ul>
        <li>Resete diariamente</li>
        <li>Objetivos variados: matar monstros, participar de eventos, coletar itens</li>
        <li>Recompensas incluem Jewels, Zen e itens especiais</li>
        </ul><br>
        Dica: Faça todas as diárias para maximizar sua progressão!`
    },

    eventSchedule: {
        keywords: ['horário', 'horários', 'hora', 'quando', 'schedule', 'agenda', 'calendário'],
        answer: `<strong>Horários dos Eventos (Horário do Servidor UTC+2)</strong><br><br>
        <strong>⏰ Eventos Regulares:</strong>
        <ul>
        <li>🏰 Blood Castle — A cada 2h (00:00, 02:00, 04:00...)</li>
        <li>👹 Devil Square — A cada 2h (01:00, 03:00, 05:00...)</li>
        <li>⚔️ Chaos Castle — A cada 2h (00:30, 02:30, 04:30...)</li>
        <li>🎯 Batalha Real — 02:00, 08:00, 14:00, 20:00, 23:00</li>
        <li>✨ Golden Invasion — 00:36, 04:36, 08:36, 12:36, 16:36, 20:36</li>
        <li>🏯 Castle Siege — <strong>Domingo 20:00</strong></li>
        </ul><br>
        <strong>🌸 Cherry Blossom:</strong>
        <ul>
        <li>🐰 Lunar Rabbit — 05:25, 11:25, 17:25, 23:25</li>
        <li>🔥 Fire Flame Ghost — 01:25, 07:25, 13:25, 19:25</li>
        <li>🎒 Pouch of Blessing — 03:25, 09:25, 15:25, 21:25</li>
        </ul>`
    },

    lostWords: {
        keywords: ['lost words', 'palavras perdidas', 'letras', 'enigma', 'letters'],
        answer: `<strong>Lost Words (Palavras Perdidas)</strong><br><br>
        Evento de enigma — encontre as letras e forme a palavra!<br><br>
        <ul>
        <li>Colete letras de <strong>bosses, monstros elite e eventos</strong></li>
        <li>Forme a palavra correta para ganhar recompensas</li>
        <li>Troque no NPC <strong>Letters Collector</strong> em Dreamland (Quest Zone 146, 138)</li>
        </ul><br>
        <strong>Recompensas:</strong>
        <ul>
        <li>50%: Jewels</li>
        <li>25%: Box of Kundun +5</li>
        <li>15%: Weapon Box +5</li>
        <li>10%: Jewel of Excellent</li>
        </ul><br>
        Dica: Use TAB para abrir o mapa e encontrar a Quest Zone!`
    },

    excellent: {
        keywords: ['excellent', 'opção excellent', 'exc', 'opções exc'],
        answer: `<strong>Opções Excellent</strong><br><br>
        Itens Excellent possuem opções especiais adicionais!<br><br>
        <ul>
        <li>Máximo de <strong>4 opções Excellent</strong> por item</li>
        <li>Incluem: aumento de dano, life steal, mana steal, velocidade de ataque</li>
        <li>Itens Excellent podem ser obtidos de: bosses, eventos, Silver Chests</li>
        <li>Use <strong>Jewel of Excellent</strong> para adicionar uma opção</li>
        </ul><br>
        Dica: Itens com boas opções Excellent são <strong>extremamente valiosos</strong> no mercado!`
    },

    muHelper: {
        keywords: ['mu helper', 'helper', 'auto', 'automático', 'bot', 'farm automático'],
        answer: `<strong>MU Helper</strong><br><br>
        O MU Helper é o sistema de farm automático integrado ao jogo.<br><br>
        <ul>
        <li>Configure para usar skills automaticamente</li>
        <li>Colete itens automaticamente</li>
        <li>Defina quais itens pegar e quais ignorar</li>
        <li>Configure para pegar Sign of Lord automaticamente</li>
        <li>Pode ser ativado com a tecla de atalho</li>
        </ul><br>
        Dica: Configure o MU Helper para <strong>pegar automaticamente</strong> Sign of Lord durante a semana do Castle Siege!`
    },

    transmogrification: {
        keywords: ['transmog', 'transmogrificação', 'skin', 'skins', 'aparência', 'visual'],
        answer: `<strong>Transmogrificação & Skins</strong><br><br>
        Mude a aparência dos seus itens sem alterar os stats!<br><br>
        <ul>
        <li>Sistema de skins para personalizar seu personagem</li>
        <li>Altere a aparência de armas e armaduras</li>
        <li>As opções e stats originais são mantidos</li>
        <li>Disponível para várias categorias de equipamento</li>
        </ul><br>
        Dica: Fique estiloso sem sacrificar poder!`
    },

    redDragon: {
        keywords: ['red dragon', 'dragão', 'dragão vermelho'],
        answer: `<strong>Red Dragon</strong><br><br>
        Boss poderoso que aparece em <strong>Aida</strong>!<br><br>
        <ul>
        <li><strong>Localização:</strong> Aida</li>
        <li><strong>Quantidade:</strong> 3 spawns</li>
        <li><strong>Horários:</strong> 08:00 e 20:00 (horário servidor)</li>
        <li><strong>Drops:</strong> Jewels variados e itens raros</li>
        </ul><br>
        ⚠️ Aparece apenas nos <strong>Main Servers</strong>!<br>
        Dica: Vá preparado — ele é forte! Leve party se possível.`
    },

    collections: {
        keywords: ['collection', 'coleção', 'coleções', 'colecionar'],
        answer: `<strong>Collections (Coleções)</strong><br><br>
        Sistema de coleção de itens que dá bônus permanentes!<br><br>
        <ul>
        <li>Colete itens específicos para completar coleções</li>
        <li>Cada coleção completa dá <strong>bônus permanentes</strong></li>
        <li>Bônus incluem: mais dano, mais defesa, mais HP</li>
        <li>Progresso salvo permanentemente</li>
        </ul><br>
        Dica: Verifique quais coleções estão mais perto de completar!`
    },

    guildSystem: {
        keywords: ['guild', 'guilda', 'clan', 'criar guild', 'guild level'],
        answer: `<strong>Sistema de Guilds</strong><br><br>
        <ul>
        <li><strong>Máx. de membros:</strong> 20 por guild</li>
        <li>Guilds possuem sistema de <strong>níveis</strong></li>
        <li>Level da guild desbloqueia funcionalidades</li>
        <li>Necessário para participar do <strong>Castle Siege</strong></li>
        <li>Guild Garden com NPC Guardsman (comprável)</li>
        </ul><br>
        Dica: Suba o nível da guild para participar do Castle Siege e acessar mais benefícios!`
    },

    earrings: {
        keywords: ['earring', 'earrings', 'brinco', 'brincos', 'acessório'],
        answer: `<strong>Earrings (Brincos)</strong><br><br>
        Acessórios especiais que dão bônus adicionais ao personagem!<br><br>
        <ul>
        <li>Equipáveis no slot de acessório</li>
        <li>Dão bônus de atributos e habilidades</li>
        <li>Podem ter opções Excellent</li>
        <li>Obtidos em eventos, bosses e drops especiais</li>
        </ul><br>
        Dica: Brincos com boas opções são raros e valiosos!`
    },

    boxes: {
        keywords: ['box', 'boxes', 'caixa', 'caixas', 'kundun', 'weapon box', 'silver chest'],
        answer: `<strong>Caixas (Boxes)</strong><br><br>
        <ul>
        <li>📦 <strong>Box of Kundun</strong> — Dropa itens aleatórios, qualidade varia por nível (+1 a +5)</li>
        <li>⚔️ <strong>Weapon Box</strong> — Contém armas aleatórias com opções</li>
        <li>🪙 <strong>Silver Chest</strong> — Contém itens Excellent</li>
        <li>🎁 <strong>Dream Box</strong> — Itens especiais do servidor</li>
        </ul><br>
        <strong>Onde conseguir:</strong>
        <ul>
        <li>Bosses e monstros elite</li>
        <li>Eventos (Blood Castle, Devil Square, Lost Words)</li>
        <li>Golden Invasion</li>
        </ul>`
    },

    scrollsOrbs: {
        keywords: ['scroll', 'scrolls', 'orb', 'orbs', 'parchment', 'pergaminho', 'skill', 'habilidade', 'spell'],
        answer: `<strong>Scrolls, Orbs & Parchments</strong><br><br>
        Itens que ensinam habilidades ao seu personagem!<br><br>
        <ul>
        <li>📜 <strong>Scrolls</strong> — Skills de Dark Wizard e Elf</li>
        <li>🔮 <strong>Orbs</strong> — Skills de Dark Knight</li>
        <li>📄 <strong>Parchments</strong> — Skills de Summoner</li>
        </ul><br>
        <strong>Como usar:</strong> Clique com botão direito no item para aprender a skill.<br>
        <strong>Requisitos:</strong> Cada skill exige nível mínimo e stats específicos.<br><br>
        Dica: Verifique os requisitos de Energy/Strength antes de comprar!`
    },

    dyeing: {
        keywords: ['dye', 'tingir', 'tingimento', 'cor', 'colorir', 'pintar'],
        answer: `<strong>Tingimento de Itens (Item Dyeing)</strong><br><br>
        Personalize a cor dos seus equipamentos!<br><br>
        <ul>
        <li>Mude a cor de armaduras e capas</li>
        <li>Não altera stats, apenas visual</li>
        <li>Várias cores disponíveis</li>
        <li>Pode ser revertido</li>
        </ul><br>
        Dica: Combine com Transmog para um visual único!`
    },

    classQuest: {
        keywords: ['quest profissão', 'profissão', 'evolução', 'evoluir', 'class quest', 'marlon', '1 evolução', '2 evolução', '3 evolução'],
        answer: `<strong>Quests de Profissão (Class Quests)</strong><br><br>
        Evolua sua classe para desbloquear novas habilidades!<br><br>
        <strong>Evoluções:</strong>
        <ul>
        <li>🔹 <strong>1ª Evolução:</strong> Marlon Quest — Nível 150</li>
        <li>🔸 <strong>2ª Evolução:</strong> Quest avançada — Nível 220</li>
        <li>🔶 <strong>3ª Evolução:</strong> Quest mestre — Nível 400</li>
        </ul><br>
        <strong>Classes e evoluções:</strong>
        <ul>
        <li>DW → Soul Master → Grand Master</li>
        <li>DK → Blade Knight → Blade Master</li>
        <li>Elf → Muse Elf → High Elf</li>
        <li>MG → Duel Master</li>
        <li>DL → Lord Emperor</li>
        <li>SUM → Bloody Summoner → Dimension Master</li>
        <li>RF → Fist Master</li>
        </ul><br>
        Dica: Complete a Marlon Quest em <strong>Lorencia</strong> para a 1ª evolução!`
    },

    gameInterface: {
        keywords: ['interface', 'tela', 'hud', 'menu', 'atalho', 'hotkey', 'tecla'],
        answer: `<strong>Interface do Jogo</strong><br><br>
        <ul>
        <li><strong>TAB</strong> — Abrir/fechar mapa</li>
        <li><strong>C</strong> — Tela de personagem</li>
        <li><strong>I</strong> — Inventário</li>
        <li><strong>V</strong> — Tela de skills</li>
        <li><strong>G</strong> — Guild</li>
        <li><strong>F</strong> — Party</li>
        <li><strong>P</strong> — MU Helper</li>
        <li><strong>Enter</strong> — Chat</li>
        </ul><br>
        Dica: Use <strong>TAB</strong> para navegar pelo mapa e encontrar NPCs!`
    },

    guestAccess: {
        keywords: ['convidado', 'guest', 'guest access', 'acesso convidado', 'trial'],
        answer: `<strong>Acesso de Convidado (Guest Access)</strong><br><br>
        Teste o servidor sem cadastro!<br><br>
        <ul>
        <li>Acesso limitado para experimentar o jogo</li>
        <li>Algumas funcionalidades restritas</li>
        <li>Ideal para testar antes de criar conta</li>
        <li>Progresso não é salvo permanentemente</li>
        </ul><br>
        Dica: Crie uma conta para salvar seu progresso e participar de eventos!`
    }
};
