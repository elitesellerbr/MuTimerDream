const SERVER_UTC_OFFSET = 2;

const EVENTS_DATA = {
    events: [
        {
            id: 'blood-castle',
            name: 'Blood Castle',
            icon: '🏰',
            color: '#c62828',
            category: 'events',
            description: 'Evento PvE - Mate monstros, destrua o portão e entregue a Arma do Arcanjo',
            times: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
            duration: 15
        },
        {
            id: 'devil-square',
            name: 'Devil Square',
            icon: '👹',
            color: '#6a1b9a',
            category: 'events',
            description: 'Evento PvE - Ondas de monstros para ganhar experiência e Zen',
            times: ['01:00', '03:00', '05:00', '07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'],
            duration: 15
        },
        {
            id: 'chaos-castle',
            name: 'Chaos Castle',
            icon: '⚔️',
            color: '#e65100',
            category: 'events',
            description: 'Evento PvP - Lute contra jogadores e monstros, último sobrevivente vence',
            times: ['00:30', '02:30', '04:30', '06:30', '08:30', '10:30', '12:30', '14:30', '16:30', '18:30', '20:30', '22:30'],
            duration: 10
        },
        {
            id: 'battle-royale',
            name: 'Batalha Real',
            icon: '🎯',
            color: '#1565c0',
            category: 'events',
            description: 'PvP 50vs50 - Times lutam com equipamento inicial, colete loot para vencer',
            times: ['02:00', '08:00', '14:00', '20:00', '23:00'],
            duration: 10
        },
        {
            id: 'golden-invasion',
            name: 'Golden Invasion',
            icon: '✨',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/112/body/asngWVm4_UTe722n8dYCF.gif',
            color: '#f9a825',
            category: 'events',
            description: 'Monstros dourados aparecem em vários mapas com drops valiosos',
            times: ['00:36', '04:36', '08:36', '12:36', '16:36', '20:36'],
            duration: 20
        },
        {
            id: 'castle-siege',
            name: 'Castle Siege',
            icon: '🏯',
            color: '#37474f',
            category: 'events',
            description: 'Evento semanal de guilds - Domingo às 20:00 (horário servidor)',
            times: ['20:00'],
            duration: 60,
            weekday: 0
        }
    ],

    bosses: [
        {
            id: 'white-wizard',
            name: 'White Wizard',
            icon: '🧙',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/125/body/7NJ6PW2Az1QucmJeMCXyN.gif',
            color: '#e0e0e0',
            category: 'bosses',
            description: 'Localização: Noria',
            times: ['09:45', '12:45', '15:45', '18:45'],
            duration: 0
        },
        {
            id: 'death-king',
            name: 'Death King',
            icon: '💀',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/126/body/-GwVeKpTYRMlJCyC5IAP0.gif',
            color: '#b71c1c',
            category: 'bosses',
            description: 'Localização: Shadow Abyss',
            times: ['21:45', '00:45', '03:45', '06:45'],
            duration: 0
        },
        {
            id: 'zaikan',
            name: 'Zaikan',
            icon: '🗡️',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/127/body/CzlHzu6gl8HQxTMl2zzSi.gif',
            color: '#4a148c',
            category: 'bosses',
            description: 'Localização: Tarkan 2 (3 spawns)',
            times: ['00:55', '06:55', '12:55', '18:55'],
            duration: 0
        },
        {
            id: 'red-dragon',
            name: 'Red Dragon',
            icon: '🐉',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/128/body/9glyr72i5m_9nR73DihnY.gif',
            color: '#d32f2f',
            category: 'bosses',
            description: 'Localização: Aida (3 spawns)',
            times: ['08:00', '20:00'],
            duration: 0
        },
        {
            id: 'cursed-santa',
            name: 'Cursed Santa',
            icon: '🎅',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/129/body/KuggfdVhYaPT8nQe7yvJs.gif',
            color: '#c62828',
            category: 'bosses',
            description: 'Localização: Devias',
            times: ['02:35', '08:35', '14:35', '20:35'],
            duration: 0
        },
        {
            id: 'death-bone',
            name: 'Death Bone',
            icon: '☠️',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/233/body/pYcl1Dt9bjQ7eyrjKSNPv.gif',
            color: '#424242',
            category: 'bosses',
            description: 'Localização: Shadow Abyss (10 spawns)',
            times: ['21:45', '00:45', '03:45', '06:45'],
            duration: 0
        },
        {
            id: 'cursed-goblin',
            name: 'Cursed Goblin',
            icon: '👺',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/133/body/PrtRqamLz3NqKBygb-INq.gif',
            color: '#2e7d32',
            category: 'bosses',
            description: 'Localização: Devias (10 spawns)',
            times: ['02:35', '08:35', '14:35', '20:35'],
            duration: 0
        },
        {
            id: 'destructive-ogre',
            name: 'Destructive Ogre (Archer & Soldier)',
            icon: '👹',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/234/body/aLiWVJHTzWqkoFVErIQpo.gif',
            color: '#5d4037',
            category: 'bosses',
            description: 'Localização: Noria (5 spawns cada)',
            times: ['09:45', '12:45', '15:45', '18:45'],
            duration: 0
        },
        {
            id: 'muggron',
            name: 'Muggron',
            icon: '🦇',
            img: 'https://dreamassets.fra1.digitaloceanspaces.com/images/455/body/-4Ydi-xNXdkqPiSqscZFg.gif',
            color: '#880e4f',
            category: 'bosses',
            description: 'Localização: Crywolf & Barracks - Respawn: 7-8h após morte',
            times: [],
            duration: 0,
            respawnInfo: '7-8 horas após a morte'
        }
    ],

    cherry: [
        {
            id: 'lunar-rabbit',
            name: 'Lunar Rabbit',
            icon: '🐰',
            color: '#ec407a',
            category: 'cherry',
            description: 'Dreamland - Colete 10 galhos para trocar no NPC',
            times: ['05:25', '11:25', '17:25', '23:25'],
            duration: 0
        },
        {
            id: 'fire-flame-ghost',
            name: 'Fire Flame Ghost',
            icon: '🔥',
            color: '#ff5722',
            category: 'cherry',
            description: 'Dreamland - Colete 30 galhos para trocar no NPC',
            times: ['01:25', '07:25', '13:25', '19:25'],
            duration: 0
        },
        {
            id: 'pouch-of-blessing',
            name: 'Pouch of Blessing',
            icon: '🎒',
            color: '#ab47bc',
            category: 'cherry',
            description: 'Dreamland - Colete 50 galhos para trocar no NPC',
            times: ['03:25', '09:25', '15:25', '21:25'],
            duration: 0
        }
    ]
};
