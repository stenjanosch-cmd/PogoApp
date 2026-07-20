/* ============================================== */
/* DATEI START: rogue.js (Endlos-Kampfmodus)      */
/* ============================================== */

let rogueTeam = []; 
let rogueActiveIndex = 0;
let rogueEnemy = null; 
let rogueWave = 1;
let isRogueCombatActive = false;
let currentBiomeIndex = 0;

// Such- & Filter-Variablen für das Setup
let rogueSearchTerm = "";
let rogueFilterType = "";

// Rogue State Variablen
let rogueRunStardust = 0;
let isAutoModeActive = false;
let autoModeUsedThisWave = false;
let starShardWaves = 0;
let adrenalineActive = false;
let focusSashActive = false;

// --- NEU: Speed-Modus Variablen ---
let rogueSpeedMultiplier = 1.0; 
let isSpeedModeActive = false;
const SPEED_UNLOCK_LEVEL = 10; // Ab diesem Spielerlevel wird der Button sichtbar

// Loot Skalierungs-Variablen
let currentLootBuff = 15;
let currentLootHp = 20;
let currentLootTeam = 15; 

// Normale Arena-Hintergründe
const rogueBiomes = [
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Pokemon_arena_in_forest_clearing_202607191057.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Mountain-top_Pokemon_arena_sea.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Empty_Pokemon_arena_stadium_202607191057.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Pokemon_gym_arena_futuristic.jpeg?raw=true'
];

// Epische Boss-Hintergründe
const bossBiomes = [
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Sky-temple_boss_battle_arena_202607192129.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Underwater_boss_battle_stadium_202607192129.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Stone_arena_volcanic_crater_202607192128.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Floating_crystalline_boss_arena_202607192128.jpeg?raw=true'
];

// Massiv erweiterte Legendären-Liste (inkl. Ultrabestien, Tapus etc.)
const ROGUE_LEGENDARY_IDS = [
    144, 145, 146, 150, 151, // Gen 1 
    243, 244, 245, 249, 250, 251, // Gen 2 
    377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Gen 3 
    480, 481, 482, 483, 484, 485, 486, 487, 488, 491, // Gen 4 
    638, 639, 640, 641, 642, 643, 644, 645, 646, // Gen 5 
    716, 717, 718, // Gen 6 
    785, 786, 787, 788, // Kapu-Wächter
    791, 792, 793, 794, 795, 796, 797, 798, 799, 800, // Solgaleo, Lunala, Ultrabestien, Necrozma
    888, 889 // Zacian, Zamazenta
];

// Massiv erweiterte Mega-Liste (Alle validen PokeAPI Mega IDs)
const ROGUE_MEGA_BOSS_IDS = [
    10033, 10034, // Mega Glurak X/Y
    10036, 10037, // Mega Turtok, Bisaflor
    10044, 10045, // Mega Simsala, Ampharos
    10048, 10051, // Mega Gengar, Garados
    10054, 10055, // Mega Aerodactyl, Scherox
    10056, 10057, // Mega Skaraborn, Hundemon
    10060,        // Mega Despotar
    10065, 10066, 10067, // Mega Gewaldro, Lohgock, Sumpex
    10068, 10070, // Mega Guardevoir, Stolloss
    10071, 10072, // Mega Meditalis, Voltenso
    10073, 10074, // Mega Banette, Absol
    10075, 10076, // Mega Latias, Latios
    10077, 10078, // Proto Groudon, Proto Kyogre
    10079,        // Mega Rayquaza
    10084, 10085, // Mega Knakrack, Lucario
    10086,        // Mega Rexblisar
    10087, 10088, // Mega Mewtu X/Y
    10089,        // Mega Brutalanda
    10090, 10091, 10092, // Mega Bibor, Tauboss, Lahmus
    10095, 10098, // Mega Stahlos, Zobiris
    10099, 10100, // Mega Tohaido, Camerupt
    10101, 10102, // Mega Altaria, Firnontor
    10142         // Ultra Necrozma
];

// --- HILFSFUNKTION FÜR ECHTE STATS ---
async function fetchRogueStats(id, isPlayer, waveLevel) {
    try {
        let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        let data = await res.json();
        
        let baseHP = data.stats.find(s => s.stat.name === 'hp').base_stat;
        let baseAtk = data.stats.find(s => s.stat.name === 'attack').base_stat;
        let baseDef = data.stats.find(s => s.stat.name === 'defense').base_stat;
        
        let isLegendary = ROGUE_LEGENDARY_IDS.includes(data.id);
        let isMegaBoss = ROGUE_MEGA_BOSS_IDS.includes(data.id);
        
        let legendBuff = 1.0;
        if(isLegendary) legendBuff = 1.5;
        if(isMegaBoss) legendBuff = 2.0;
        
        let level = isPlayer ? 40 : (15 + (waveLevel * 3));
        
        let maxHp = Math.floor(0.01 * (2 * baseHP * legendBuff) * level) + level + 10;
        let atk = Math.floor(0.01 * (2 * baseAtk * legendBuff) * level) + 5;
        let def = Math.floor(0.01 * (2 * baseDef * legendBuff) * level) + 5;
        
        return { maxHp: maxHp * 3, atk: atk, def: def, isLegendary: isLegendary || isMegaBoss };
    } catch (e) {
        return { maxHp: 100, atk: 50, def: 50, isLegendary: false };
    }
}

// --- SETUP PHASE ---
function startRogueSetup() {
    rogueTeam = [];
    rogueSearchTerm = "";
    rogueFilterType = "";
    renderRogueSetupSlots();
    renderRogueSetupSearch(); 
    renderRogueSetupDex();
    showScreen('screen-rogue-setup');
}

function renderRogueSetupSearch() {
    let container = document.getElementById('rogue-search-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'rogue-search-container';
        container.style.cssText = "display: flex; gap: 10px; align-items: center; justify-content: center; margin-bottom: 15px; padding: 0 10px;";
        
        const grid = document.getElementById('rogue-select-grid');
        grid.parentNode.insertBefore(container, grid);
    }
    
    container.innerHTML = `
        <div style="background: #34495e; padding: 5px 10px; border-radius: 20px; display: flex; align-items: center; gap: 5px; border: 1px solid #7f8c8d; flex: 1;">
            <span style="font-size: 16px;">🔍</span>
            <input type="text" placeholder="Pokémon suchen..." style="background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 14px;" oninput="rogueSearchTerm = this.value.toLowerCase(); renderRogueSetupDex();">
        </div>
        <select style="background: #34495e; color: white; border: 1px solid #7f8c8d; padding: 7px; border-radius: 10px; font-size: 14px; outline: none;" onchange="rogueFilterType = this.value; renderRogueSetupDex();">
            <option value="">Alle Typen</option>
            <option value="normal">Normal</option>
            <option value="fire">Feuer</option>
            <option value="water">Wasser</option>
            <option value="grass">Pflanze</option>
            <option value="electric">Elektro</option>
            <option value="ice">Eis</option>
            <option value="fighting">Kampf</option>
            <option value="poison">Gift</option>
            <option value="ground">Boden</option>
            <option value="flying">Flug</option>
            <option value="psychic">Psycho</option>
            <option value="bug">Käfer</option>
            <option value="rock">Gestein</option>
            <option value="ghost">Geist</option>
            <option value="dragon">Drache</option>
            <option value="dark">Unlicht</option>
            <option value="steel">Stahl</option>
            <option value="fairy">Fee</option>
        </select>
    `;
}

function renderRogueSetupSlots() {
    for(let i=0; i<3; i++) {
        const slot = document.getElementById(`rogue-slot-${i}`);
        if(rogueTeam[i]) {
            let pkm = (typeof pokedex !== 'undefined') ? pokedex[rogueTeam[i]] : JSON.parse(localStorage.getItem('pogo_dex_v6'))[rogueTeam[i]];
            slot.innerHTML = `<img src="${pkm.img}">`;
            slot.className = "raid-slot filled";
            slot.onclick = () => { rogueTeam.splice(i, 1); renderRogueSetupSlots(); renderRogueSetupDex(); };
        } else {
            slot.innerHTML = i + 1;
            slot.className = "raid-slot";
            slot.onclick = null;
        }
    }
    const btn = document.getElementById('start-rogue-btn');
    if(rogueTeam.length === 3) { btn.classList.remove('disabled'); btn.disabled = false; btn.onclick = startRogueRun; } 
    else { btn.classList.add('disabled'); btn.disabled = true; btn.onclick = null; }
}

function renderRogueSetupDex() {
    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    const grid = document.getElementById('rogue-select-grid');
    grid.innerHTML = '';
    
    for (let id in dex) {
        let pkm = dex[id];
        if(!pkm) continue;
        
        // Filter-Logik
        if (rogueSearchTerm && !pkm.name.toLowerCase().includes(rogueSearchTerm)) continue;
        if (rogueFilterType && !pkm.types.includes(rogueFilterType)) continue;
        
        const isSelected = rogueTeam.includes(String(id));
        const isMega = parseInt(id) > 10000; // Check für Mega/Primal Hintergrund
        
        const div = document.createElement('div');
        div.className = isSelected ? 'dex-entry caught selected-for-raid' : 'dex-entry caught'; 
        
        // Spezielles Mega-Design
        if (isMega) {
            div.style.background = "linear-gradient(135deg, #8e44ad, #2c3e50)";
            div.style.border = "2px solid #f1c40f";
        }
        
        div.style.cursor = isSelected ? 'default' : 'pointer';
        
        if(!isSelected) {
            div.onclick = () => { if(rogueTeam.length < 3) { rogueTeam.push(String(id)); renderRogueSetupSlots(); renderRogueSetupDex(); } };
        }

        let typeHtml = pkm.types.map(t => `<img class="camp-select-type-icon" style="background-color: ${(typeof typeColors !== 'undefined') ? typeColors[t] : '#777'};" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg">`).join('');
        
        // Zeige Shiny-Icon an falls es ein Shiny ist
        let shinyBadge = pkm.isShiny ? `<div style="position: absolute; top: 2px; left: 2px; font-size: 10px;">✨</div>` : ``;
        
        div.innerHTML = `${shinyBadge}<img class="dex-img" src="${pkm.img}"><div class="dex-id">#${id}</div><div class="dex-name">${pkm.name}</div><div class="camp-select-types">${typeHtml}</div>`;
        grid.appendChild(div);
    }
}

// --- RUN STARTEN ---
async function startRogueRun() {
    const btn = document.getElementById('start-rogue-btn');
    if(btn) { btn.classList.add('disabled'); btn.disabled = true; }

    showScreen('screen-rogue-battle');
    document.getElementById('rogue-log').innerHTML = "<div class='heal'>> Generiere Team-Stats von PokeAPI... Bitte warten!</div>";

    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    
    let fullTeam = [];
    for (let id of rogueTeam) {
        let base = dex[id];
        let stats = await fetchRogueStats(base.baseId, true, 1);
        fullTeam.push({
            id: id,
            name: base.name,
            baseId: base.baseId,
            types: base.types,
            isShiny: base.isShiny || false,
            maxHp: stats.maxHp, 
            hp: stats.maxHp,
            atk: stats.atk,
            def: stats.def,
            ep: 0 
        });
    }
    
    rogueTeam = fullTeam;
    rogueActiveIndex = 0;
    rogueWave = 1;
    rogueRunStardust = 0;
    
    isAutoModeActive = false;
    autoModeUsedThisWave = false;
    starShardWaves = 0;
    adrenalineActive = false;
    focusSashActive = false;

    // --- NEU: Speed Reset ---
    isSpeedModeActive = false;
    rogueSpeedMultiplier = 1.0;

    currentLootBuff = 15;
    currentLootHp = 20;
    currentLootTeam = 15; 

    currentBiomeIndex = Math.floor(Math.random() * rogueBiomes.length);
    document.getElementById('rogue-arena').style.backgroundImage = `url('${rogueBiomes[currentBiomeIndex]}')`;
    
    const controls = document.getElementById('rogue-controls');
    controls.innerHTML = `
        <button id="rogue-btn-fast" class="rogue-atk-btn" onclick="roguePlayerAttack('fast')">
            <div style="font-size: 10px;">Sofort-Attacke</div>
            <div id="rogue-fast-type" style="font-size: 14px; font-weight: 900;">Typ</div>
        </button>
        <button id="rogue-btn-charge" class="rogue-atk-btn disabled" disabled onclick="roguePlayerAttack('charge')">
            <div style="font-size: 10px;">Lade-Attacke</div>
            <div id="rogue-charge-type" style="font-size: 14px; font-weight: 900;">Typ</div>
        </button>
        <button class="rogue-atk-btn" style="background: linear-gradient(135deg, #34495e, #2c3e50); border-color: #3498db; padding: 6px;" onclick="openRogueSwitchMenu(false)">
            🔄 Wechseln
        </button>
        <button class="rogue-atk-btn" style="background: linear-gradient(135deg, #d35400, #e67e22); border-color: #f39c12; padding: 6px;" onclick="openRogueBagMenu()">
            🎒 Rucksack
        </button>
    `;

    const navBar = document.querySelector('#screen-rogue-battle .top-nav');
    if(!document.getElementById('rogue-auto-btn')) {
        const autoBtn = document.createElement('button');
        autoBtn.id = 'rogue-auto-btn';
        autoBtn.className = 'camp-action-btn';
        autoBtn.style.cssText = "width: auto; padding: 5px 10px; font-size: 10px; background: #7f8c8d; margin-left: 10px;";
        autoBtn.innerText = "🤖 Auto: AUS";
        autoBtn.onclick = toggleAutoMode;
        navBar.insertBefore(autoBtn, document.getElementById('rogue-wave-display'));
    } else {
        const autoBtn = document.getElementById('rogue-auto-btn');
        autoBtn.style.background = '#7f8c8d';
        autoBtn.innerText = "🤖 Auto: AUS";
    }

    // --- NEU: Speed-Button Setup ---
    if(!document.getElementById('rogue-speed-btn')) {
        const speedBtn = document.createElement('button');
        speedBtn.id = 'rogue-speed-btn';
        speedBtn.className = 'camp-action-btn';
        speedBtn.style.cssText = "width: auto; padding: 5px 10px; font-size: 10px; margin-left: 5px;";
        speedBtn.onclick = toggleSpeedMode;
        navBar.insertBefore(speedBtn, document.getElementById('rogue-wave-display'));
    }
    
    // 100% bombensicherer Level-Check über die index.html oder Fallbacks
    let playerLevel = 1;
    const lvlSpan = document.getElementById('trainer-lvl');
    if (lvlSpan) {
        playerLevel = parseInt(lvlSpan.innerText) || 1;
    } else if (typeof currentLevel !== 'undefined') {
        playerLevel = currentLevel;
    } else {
        playerLevel = parseInt(localStorage.getItem('pogo_level')) || 1;
    }
    
    const speedBtn = document.getElementById('rogue-speed-btn');
    if (playerLevel >= SPEED_UNLOCK_LEVEL) {
        speedBtn.style.display = "inline-block";
        speedBtn.style.background = "#7f8c8d";
        speedBtn.innerText = "⏩ x2 AUS";
    } else {
        speedBtn.style.display = "none"; 
    }

    if(!document.getElementById('rogue-item-menu')) {
        const itemMenu = document.createElement('div');
        itemMenu.id = 'rogue-item-menu';
        itemMenu.style.cssText = "display: none; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;";
        document.getElementById('screen-rogue-battle').appendChild(itemMenu);
    }
    
    document.getElementById('rogue-switch-menu').style.display = 'none';
    document.getElementById('rogue-item-menu').style.display = 'none';
    document.getElementById('rogue-controls').style.display = 'grid';
    startNextWave();
}

function toggleAutoMode() {
    isAutoModeActive = !isAutoModeActive;
    const btn = document.getElementById('rogue-auto-btn');
    if(isAutoModeActive) {
        btn.style.background = '#2ecc71';
        btn.innerText = "🤖 Auto: AN";
        autoModeUsedThisWave = true;
        checkRogueAutoTurn();
    } else {
        btn.style.background = '#7f8c8d';
        btn.innerText = "🤖 Auto: AUS";
    }
}

// --- NEU: Speed-Modus Funktion ---
function toggleSpeedMode() {
    isSpeedModeActive = !isSpeedModeActive;
    rogueSpeedMultiplier = isSpeedModeActive ? 0.4 : 1.0; 
    
    const btn = document.getElementById('rogue-speed-btn');
    btn.style.background = isSpeedModeActive ? '#f39c12' : '#7f8c8d';
    btn.innerText = isSpeedModeActive ? "⏩ x2 AN" : "⏩ x2 AUS";
    
    logMsg(isSpeedModeActive ? "⏩ Turbo-Modus aktiviert!" : "▶️ Normale Geschwindigkeit.", "heal");
}

function getBestRoguePokemonIndex() {
    let bestIdx = rogueActiveIndex;
    if(rogueTeam[bestIdx].hp <= 0) {
        bestIdx = rogueTeam.findIndex(p => p.hp > 0);
    }
    let bestScore = -9999;

    rogueTeam.forEach((p, idx) => {
        if (p.hp <= 0) return;
        
        let defScore = 1; 
        let atkScore = 1;
        
        if(typeof typeChart !== 'undefined') {
            let defMult = 0;
            rogueEnemy.types.forEach(eType => { defMult += calcDamage(eType, p.types); });
            defScore = defMult / rogueEnemy.types.length;
            
            let atkMult = 0;
            p.types.forEach(pType => { atkMult += calcDamage(pType, rogueEnemy.types); });
            atkScore = atkMult / p.types.length;
        }

        let score = (atkScore * 10) - (defScore * 30);

        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    });
    return bestIdx;
}

function checkRogueAutoTurn() {
    if(!isAutoModeActive || !isRogueCombatActive) return;
    
    // TIMER MIT MULTIPLIKATOR
    setTimeout(() => {
        if(!isAutoModeActive || !isRogueCombatActive) return;
        
        autoModeUsedThisWave = true;
        const player = rogueTeam[rogueActiveIndex];

        let isWeak = false;
        let currentVulnerability = 0;
        
        if(typeof typeChart !== 'undefined') {
            rogueEnemy.types.forEach(eType => {
                let mult = calcDamage(eType, player.types);
                if(mult > 1) isWeak = true; 
                if(mult > currentVulnerability) currentVulnerability = mult;
            });
        }

        if(isWeak) {
            const bestIdx = getBestRoguePokemonIndex();
            let newVulnerability = 0;
            
            if(typeof typeChart !== 'undefined') {
                rogueEnemy.types.forEach(eType => {
                    let mult = calcDamage(eType, rogueTeam[bestIdx].types);
                    if(mult > newVulnerability) newVulnerability = mult;
                });
            }
            
            if(bestIdx !== rogueActiveIndex && newVulnerability < currentVulnerability) {
                logMsg(`Typ-Nachteil erkannt! KI flieht auf ${rogueTeam[bestIdx].name}!`, "eff");
                switchRoguePokemon(bestIdx, false); 
                return;
            }
        }

        const chargeBtn = document.getElementById('rogue-btn-charge');
        if (player.ep >= 100 && !chargeBtn.disabled) {
            roguePlayerAttack('charge');
        } else {
            roguePlayerAttack('fast');
        }
    }, 800 * rogueSpeedMultiplier);
}

function logMsg(msg, cssClass = "") {
    const log = document.getElementById('rogue-log');
    log.innerHTML += `<div class="${cssClass}">> ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}

function triggerBossWarning() {
    let warn = document.createElement('div');
    warn.innerHTML = "⚠️ MEGA BOSS WELLE ⚠️";
    warn.className = "boss-warning-overlay";
    document.getElementById('screen-rogue-battle').appendChild(warn);
    setTimeout(() => warn.remove(), 3500); // Kein Speed-Multi, damit es lesbar bleibt
}

// --- KAMPF / WELLE ---
async function startNextWave() {
    isRogueCombatActive = false;
    document.getElementById('rogue-log').innerHTML = "";
    document.getElementById('rogue-wave-display').innerText = "Welle " + rogueWave;
    document.getElementById('rogue-enemy-sprite').className = "rogue-sprite-enemy"; 
    
    logMsg(`Suche nach wildem Gegner...`);
    let randomId;
    
    if (rogueWave > 0 && rogueWave % 10 === 0) {
        randomId = ROGUE_MEGA_BOSS_IDS[Math.floor(Math.random() * ROGUE_MEGA_BOSS_IDS.length)];
        logMsg(`🚨 SUPER-BOSS WELLE! Ein mächtiges Mega-Pokémon taucht auf! 🚨`, "dmg");
        
        let bossBg = bossBiomes[Math.floor(Math.random() * bossBiomes.length)];
        document.getElementById('rogue-arena').style.backgroundImage = `url('${bossBg}')`;
        document.getElementById('rogue-enemy-sprite').classList.add('boss-aura');
        triggerBossWarning();
        
    } else if (rogueWave > 0 && rogueWave % 5 === 0) {
        randomId = ROGUE_LEGENDARY_IDS[Math.floor(Math.random() * ROGUE_LEGENDARY_IDS.length)];
        logMsg(`⚠️ BOSS-WELLE! Ein seltenes Legendäres taucht auf! ⚠️`, "eff");
        
        currentBiomeIndex = (currentBiomeIndex + 1) % rogueBiomes.length;
        document.getElementById('rogue-arena').style.backgroundImage = `url('${rogueBiomes[currentBiomeIndex]}')`;
    } else {
        randomId = Math.floor(Math.random() * 1025) + 1;
        if ((rogueWave - 1) % 10 === 0 && rogueWave > 1) {
            currentBiomeIndex = (currentBiomeIndex + 1) % rogueBiomes.length;
            document.getElementById('rogue-arena').style.backgroundImage = `url('${rogueBiomes[currentBiomeIndex]}')`;
        }
    }
    
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        const data = await res.json();
        
        let eName = data.name.toUpperCase();
        try { const sRes = await fetch(data.species.url); const deNameObj = (await sRes.json()).names.find(n => n.language.name === 'de'); if (deNameObj) eName = deNameObj.name; } catch(e) {}
        
        if (eName.includes('-MEGA')) eName = "MEGA " + eName.replace('-MEGA', '').replace('-X', ' X').replace('-Y', ' Y');
        if (eName.includes('-PRIMAL')) eName = "PROTO " + eName.replace('-PRIMAL', '');
        
        let stats = await fetchRogueStats(data.id, false, rogueWave);
        
        // Shiny Chance berechnen (5% Wahrscheinlichkeit)
        let isEnemyShiny = Math.random() < 0.05; 
        
        let hdImage = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
        
        // Shiny Sprite laden, falls es glänzt
        if (isEnemyShiny) {
            let shinyHd = data.sprites.other['official-artwork'].front_shiny;
            let shinyNormal = data.sprites.front_shiny;
            hdImage = shinyHd || shinyNormal || hdImage; 
        }
        
        rogueEnemy = {
            name: eName,
            baseId: data.id,
            types: data.types.map(t => t.type.name),
            img: hdImage, 
            maxHp: stats.maxHp,
            hp: stats.maxHp,
            atk: stats.atk,
            def: stats.def,
            isLegendary: stats.isLegendary,
            isShiny: isEnemyShiny // Shiny Status sichern
        }
        
        // Optische Shiny Aura einfügen
        const spriteEl = document.getElementById('rogue-enemy-sprite');
        if (isEnemyShiny) {
            spriteEl.style.filter = "drop-shadow(0 0 15px #f1c40f)";
        } else {
            spriteEl.style.filter = "none";
        }
        
        updateRogueUI();
        
        // Spezielle Log-Nachricht für Shinys
        if (isEnemyShiny) {
            logMsg(`✨ Ein schillerndes <span style="color:#f1c40f; font-weight:bold;">${eName}</span> taucht auf! ✨`, "heal");
        } else {
            logMsg(`Wilde Begegnung mit <span class="dmg">${eName}</span>!`);
        }
        
        isRogueCombatActive = true;
        checkRogueAutoTurn();
        
    } catch(e) {
        setTimeout(startNextWave, 1000); 
    }
}

function updateRogueUI() {
    const player = rogueTeam[rogueActiveIndex];
    
    document.getElementById('rogue-player-name').innerText = player.name;
    document.getElementById('rogue-player-hp').style.width = `${(player.hp / player.maxHp) * 100}%`;
    document.getElementById('rogue-player-hp').style.backgroundColor = (player.hp / player.maxHp) < 0.3 ? '#e74c3c' : '#2ecc71';
    document.getElementById('rogue-player-ep').style.width = `${Math.min(player.ep, 100)}%`;
    
    let pTypesHtml = player.types.map(t => `<img src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg" style="width:14px; height:14px; background-color:${(typeof typeColors !== 'undefined') ? typeColors[t] : '#777'}; border-radius:50%; padding:2px; box-shadow: 0 1px 3px black;">`).join('');
    document.getElementById('rogue-player-types').innerHTML = pTypesHtml;

    const pSprite = document.getElementById('rogue-player-sprite');
    let backUrl = player.isShiny ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/${player.baseId}.png` : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.baseId}.png`;
    pSprite.src = backUrl;
    pSprite.onerror = () => { pSprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.baseId}.png`; };

    const fastType = player.types[0];
    const chargeType = player.types.length > 1 ? player.types[1] : player.types[0];
    
    document.getElementById('rogue-fast-type').innerText = (typeof typeTranslations !== 'undefined') ? typeTranslations[fastType] : fastType;
    document.getElementById('rogue-fast-type').style.color = (typeof typeColors !== 'undefined') ? typeColors[fastType] : 'white';
    
    const chargeBtn = document.getElementById('rogue-btn-charge');
    document.getElementById('rogue-charge-type').innerText = (typeof typeTranslations !== 'undefined') ? typeTranslations[chargeType] : chargeType;
    document.getElementById('rogue-charge-type').style.color = (typeof typeColors !== 'undefined') ? typeColors[chargeType] : 'white';
    
    if(player.ep >= 100) { chargeBtn.classList.remove('disabled'); chargeBtn.disabled = false; } 
    else { chargeBtn.classList.add('disabled'); chargeBtn.disabled = true; }

    if(rogueEnemy) {
        const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
        const isCaught = dex[rogueEnemy.baseId] !== undefined;
        const dexIconHtml = isCaught
            ? `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" style="width:12px; filter: drop-shadow(0 0 5px #f1c40f); vertical-align: middle; margin-left: 5px;" title="Bereits gefangen">`
            : `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" style="width:12px; filter: grayscale(100%) opacity(0.4); vertical-align: middle; margin-left: 5px;" title="Fehlt im Pokédex">`;
        
        document.getElementById('rogue-enemy-name').innerHTML = `${rogueEnemy.name} ${dexIconHtml}`;
        document.getElementById('rogue-enemy-hp').style.width = `${(rogueEnemy.hp / rogueEnemy.maxHp) * 100}%`;
        document.getElementById('rogue-enemy-hp').style.backgroundColor = (rogueEnemy.hp / rogueEnemy.maxHp) < 0.3 ? '#e74c3c' : ((rogueEnemy.hp / rogueEnemy.maxHp) < 0.5 ? '#f1c40f' : '#2ecc71');
        document.getElementById('rogue-enemy-sprite').src = rogueEnemy.img;
        
        let eTypesHtml = rogueEnemy.types.map(t => `<img src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg" style="width:14px; height:14px; background-color:${(typeof typeColors !== 'undefined') ? typeColors[t] : '#777'}; border-radius:50%; padding:2px; box-shadow: 0 1px 3px black;">`).join('');
        document.getElementById('rogue-enemy-types').innerHTML = eTypesHtml;
    }
}

function animateSprite(spriteId, animClass, duration) {
    const el = document.getElementById(spriteId);
    el.classList.remove(animClass);
    void el.offsetWidth;
    el.classList.add(animClass);
    // Animation Timeout ebenfalls beschleunigen
    setTimeout(() => { el.classList.remove(animClass); }, duration * rogueSpeedMultiplier);
}

function showDmgAnim(isPlayerTarget, text, color) {
    const el = document.getElementById('rogue-dmg-text');
    el.innerText = text;
    el.style.color = color;
    el.style.top = isPlayerTarget ? "80%" : "30%";
    el.style.left = isPlayerTarget ? "30%" : "70%";
    
    el.style.animation = 'none';
    void el.offsetWidth; 
    el.style.animation = 'popDmg 1s forwards';
}

function calcDamage(atkType, defTypes) {
    let mult = 1;
    if(typeof typeChart !== 'undefined') {
        defTypes.forEach(dType => {
            if(typeChart[atkType] && typeChart[atkType][dType] !== undefined) mult *= typeChart[atkType][dType];
        });
    }
    return mult;
}

function roguePlayerAttack(atkKind) {
    if(!isRogueCombatActive) return;
    isRogueCombatActive = false; 
    if(isAutoModeActive) autoModeUsedThisWave = true;
    
    const player = rogueTeam[rogueActiveIndex];
    let isCharge = (atkKind === 'charge');
    let aType = isCharge ? (player.types.length > 1 ? player.types[1] : player.types[0]) : player.types[0];
    
    if(isCharge && player.ep < 100) { isRogueCombatActive = true; return; }
    
    if(isCharge) { player.ep -= 100; logMsg(`${player.name} setzt Spezial-Attacke ein!`, "eff"); }
    else { player.ep += 25; }
    
    animateSprite('rogue-player-sprite', 'anim-lunge-player', 300);
    
    // TIMER MIT MULTIPLIKATOR
    setTimeout(() => {
        let mult = calcDamage(aType, rogueEnemy.types);
        
        let movePower = isCharge ? 45 : 15;
        let rawDmg = (player.atk / rogueEnemy.def) * movePower;
        let finalDmg = Math.max(1, Math.floor(rawDmg * mult));
        
        if(adrenalineActive) {
            finalDmg = Math.floor(finalDmg * 1.5);
            logMsg("Adrenalin-Orb erhöht den Schaden massiv!", "eff");
            adrenalineActive = false;
        }
        
        rogueEnemy.hp -= finalDmg;
        
        let effText = mult > 1 ? "Sehr effektiv!" : (mult < 1 ? "Nicht effektiv..." : "");
        if(effText) logMsg(effText, "eff");
        
        showDmgAnim(false, `-${finalDmg}`, mult > 1 ? '#2ecc71' : (mult < 1 ? '#95a5a6' : '#fff'));
        animateSprite('rogue-enemy-sprite', 'anim-hit', 400);
        updateRogueUI();
        
        // TIMER MIT MULTIPLIKATOR
        setTimeout(() => {
            if(rogueEnemy.hp <= 0) {
                winWave();
            } else {
                rogueEnemyAttack();
            }
        }, 800 * rogueSpeedMultiplier);
    }, 300 * rogueSpeedMultiplier);
}

function rogueEnemyAttack() {
    const player = rogueTeam[rogueActiveIndex];
    let eType = rogueEnemy.types[Math.floor(Math.random() * rogueEnemy.types.length)];
    
    animateSprite('rogue-enemy-sprite', 'anim-lunge-enemy', 300);
    
    // TIMER MIT MULTIPLIKATOR
    setTimeout(() => {
        let mult = calcDamage(eType, player.types);
        
        let movePower = 15;
        let rawDmg = (rogueEnemy.atk / player.def) * movePower;
        let finalDmg = Math.max(1, Math.floor(rawDmg * mult));
        
        if(focusSashActive) {
            finalDmg = 0;
            focusSashActive = false;
            logMsg("Der Fokusgurt hat den Angriff vollständig absorbiert!", "heal");
        }
        
        player.hp -= finalDmg;
        
        if(finalDmg > 0) {
            let effText = mult > 1 ? "Kritischer Treffer vom Gegner!" : (mult < 1 ? "Dein Pokémon resistiert." : "");
            if(effText) logMsg(effText, "eff");
            showDmgAnim(true, `-${finalDmg}`, '#e74c3c');
            animateSprite('rogue-player-sprite', 'anim-hit', 400);
        }
        
        updateRogueUI();
        
        // TIMER MIT MULTIPLIKATOR
        setTimeout(() => {
            if(player.hp <= 0) {
                logMsg(`${player.name} wurde besiegt!`, "dmg");
                setTimeout(() => handlePlayerFaint(), 1000 * rogueSpeedMultiplier);
            } else {
                isRogueCombatActive = true; 
                checkRogueAutoTurn();
            }
        }, 800 * rogueSpeedMultiplier);
    }, 300 * rogueSpeedMultiplier);
}

function openRogueSwitchMenu(isForced = false) {
    if(!isForced && !isRogueCombatActive) return; 
    
    const menu = document.getElementById('rogue-switch-menu');
    menu.style.display = "grid";
    menu.innerHTML = "";
    document.getElementById('rogue-controls').style.display = "none";
    document.getElementById('rogue-item-menu').style.display = "none";

    rogueTeam.forEach((p, index) => {
        const btn = document.createElement('button');
        btn.className = "camp-action-btn";
        btn.style.padding = "5px";
        btn.style.fontSize = "10px";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.gap = "5px";
        
        let pkmDex = (typeof pokedex !== 'undefined') ? pokedex[p.id] : JSON.parse(localStorage.getItem('pogo_dex_v6'))[p.id];
        
        if (p.hp <= 0) {
            btn.classList.add('disabled'); btn.disabled = true; btn.style.backgroundColor = "#e74c3c";
            btn.innerHTML = `<img src="${pkmDex.img}" style="width:25px; filter: grayscale(100%);"> <span>${p.name} (Besiegt)</span>`;
        } else if (index === rogueActiveIndex && !isForced) {
            btn.classList.add('disabled'); btn.disabled = true; btn.style.backgroundColor = "#34495e";
            btn.innerHTML = `<img src="${pkmDex.img}" style="width:25px;"> <span>${p.name} (Aktiv)</span>`;
        } else {
            btn.style.backgroundColor = "#2ecc71";
            btn.innerHTML = `<img src="${pkmDex.img}" style="width:25px;"> <span>${p.name} (${Math.floor(p.hp)} HP)</span>`;
            btn.onclick = () => switchRoguePokemon(index, isForced);
        }
        menu.appendChild(btn);
    });

    const backBtn = document.createElement('button');
    backBtn.className = "camp-action-btn"; 
    backBtn.style.gridColumn = "span 2";
    
    if(!isForced) {
        backBtn.style.backgroundColor = "#7f8c8d";
        backBtn.innerText = "Zurück";
        backBtn.onclick = () => { menu.style.display = "none"; document.getElementById('rogue-controls').style.display = "grid"; };
    } else {
        backBtn.style.backgroundColor = "#e74c3c";
        backBtn.innerText = "🏃 Aufgeben & Fliehen";
        backBtn.onclick = () => { surrenderRogue(); };
    }
    menu.appendChild(backBtn);
}

function switchRoguePokemon(index, wasForced) {
    rogueActiveIndex = index;
    document.getElementById('rogue-switch-menu').style.display = "none";
    document.getElementById('rogue-controls').style.display = "grid";
    
    updateRogueUI();
    logMsg(`Du schickst ${rogueTeam[rogueActiveIndex].name} in den Kampf!`, "heal");
    
    if(!wasForced) {
        isRogueCombatActive = false;
        // TIMER MIT MULTIPLIKATOR
        setTimeout(() => rogueEnemyAttack(), 1000 * rogueSpeedMultiplier);
    } else {
        isRogueCombatActive = true;
        checkRogueAutoTurn();
    }
}

// --- FANG MECHANIK ---
function openRogueBagMenu() {
    if(!isRogueCombatActive) return;
    const menu = document.getElementById('rogue-item-menu');
    menu.style.display = "grid";
    menu.innerHTML = "";
    document.getElementById('rogue-controls').style.display = "none";

    const ballTypes = ['pokeball', 'greatball', 'ultraball', 'masterball'];
    let hasBalls = false;

    ballTypes.forEach(ball => {
        if(inventory[ball] > 0) {
            hasBalls = true;
            const btn = document.createElement('button');
            btn.className = "camp-action-btn";
            btn.style.padding = "5px";
            btn.style.fontSize = "10px";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.style.gap = "5px";
            
            let iconSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ball.replace('pokeball', 'poke-ball').replace('greatball','great-ball').replace('ultraball','ultra-ball').replace('masterball','master-ball')}.png`;
            btn.innerHTML = `<img src="${iconSrc}" style="width:20px;"> <span>x${inventory[ball]}</span>`;
            
            btn.onclick = () => throwRogueBall(ball);
            menu.appendChild(btn);
        }
    });

    if(!hasBalls) {
        menu.innerHTML = `<div style="grid-column: span 2; color: #ccc; font-size: 12px; margin-bottom: 10px;">Keine Pokébälle im Rucksack!</div>`;
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.className = "camp-action-btn"; cancelBtn.style.backgroundColor = "#7f8c8d"; cancelBtn.style.gridColumn = "span 2";
    cancelBtn.innerText = "Zurück";
    cancelBtn.onclick = () => { menu.style.display = "none"; document.getElementById('rogue-controls').style.display = "grid"; };
    menu.appendChild(cancelBtn);
}

function throwRogueBall(ballType) {
    if(isAutoModeActive) autoModeUsedThisWave = true;
    isRogueCombatActive = false;
    document.getElementById('rogue-item-menu').style.display = "none";
    document.getElementById('rogue-controls').style.display = "grid";
    
    inventory[ballType]--;
    saveInventory();
    
    logMsg(`Du wirfst einen Ball!`);
    animateSprite('rogue-enemy-sprite', 'anim-hit', 500);
    
    // TIMER MIT MULTIPLIKATOR
    setTimeout(() => {
        let hpRatio = rogueEnemy.hp / rogueEnemy.maxHp;
        
        if (rogueEnemy.isLegendary && ballType !== 'masterball') {
            hpRatio = hpRatio * 2.5; 
        }
        
        let success = false;
        if (ballType === 'masterball') success = true;
        else if (ballType === 'ultraball' && hpRatio <= 0.8) success = true;
        else if (ballType === 'greatball' && hpRatio <= 0.5) success = true;
        else if (ballType === 'pokeball' && hpRatio <= 0.3) success = true;

        if (success) {
            logMsg(`Erfolg! ${rogueEnemy.name} wurde gefangen!`, "heal");
            
            let dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
            
            // --- FIX: Shiny überschreiben verhindern! ---
            // Prüfen ob es bereits gefangen ist und bereits Shiny war
            let existingEntry = dex[rogueEnemy.baseId];
            let alreadyShiny = existingEntry && existingEntry.isShiny;
            let saveShinyStatus = rogueEnemy.isShiny || alreadyShiny || false;
            let saveImg = rogueEnemy.isShiny ? rogueEnemy.img : (existingEntry ? existingEntry.img : rogueEnemy.img);
            
            dex[rogueEnemy.baseId] = { 
                name: rogueEnemy.name, 
                img: saveImg, 
                baseId: rogueEnemy.baseId, 
                types: rogueEnemy.types,
                isShiny: saveShinyStatus 
            };
            
            localStorage.setItem('pogo_dex_v6', JSON.stringify(dex));
            if(typeof pokedex !== 'undefined') pokedex = dex;
            
            // TIMER MIT MULTIPLIKATOR
            setTimeout(() => { winWave(true); }, 1500 * rogueSpeedMultiplier);
        } else {
            logMsg(`Oh nein! ${rogueEnemy.name} ist ausgebrochen! Gegner HP noch zu hoch.`, "dmg");
            // TIMER MIT MULTIPLIKATOR
            setTimeout(() => { rogueEnemyAttack(); }, 1500 * rogueSpeedMultiplier);
        }
    }, 1000 * rogueSpeedMultiplier);
}


function handlePlayerFaint() {
    let aliveIndex = rogueTeam.findIndex(p => p.hp > 0);
    if(aliveIndex === -1) {
        if(typeof stardust !== 'undefined') {
            if(typeof updateStardustDisplay === 'function') updateStardustDisplay();
        }
        
        if(typeof showCampWillow === 'function') {
            document.getElementById('willow-close-hint').style.display = 'none'; 
            showCampWillow(`<b>GAME OVER!</b><br><br>Dein Team hat tapfer gekämpft, aber ihr wurdet besiegt.<br>Du hast es bis Welle <b>${rogueWave}</b> geschafft und insgesamt <b>${rogueRunStardust} ✨</b> Sternenstaub auf diesem Run erbeutet!<br><br><button class='camp-action-btn' style='background: #2ecc71; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow(); showScreen("screen-menu");'>Zurück ins Menü</button>`);
        } else {
            showScreen('screen-menu');
        }
    } else {
        logMsg(`Wähle dein nächstes Pokémon!`);
        isRogueCombatActive = false;
        
        if(isAutoModeActive) {
            let bestIdx = getBestRoguePokemonIndex();
            switchRoguePokemon(bestIdx, true);
        } else {
            openRogueSwitchMenu(true);
        }
    }
}

function surrenderRogue() {
    isAutoModeActive = false; 
    if(typeof showCampWillow === 'function') {
        document.getElementById('willow-close-hint').style.display = 'none';
        showCampWillow(`<b>Flucht?</b><br><br>Willst du die Expedition wirklich abbrechen? Dein bisher erbeuteter Sternenstaub (${rogueRunStardust} ✨) ist sicher, aber du startest danach von vorn!<br><br>
        <button class='camp-action-btn' style='background: #e74c3c; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow(); showScreen("screen-menu");'>Ja, abbrechen</button>
        <button class='camp-action-btn' style='background: #2ecc71; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow();'>Nein, weiterkämpfen</button>`);
    } else {
        showScreen('screen-menu');
    }
}

function winWave(wasCaught = false) {
    let bossesDefeated = Math.floor((rogueWave - 1) / 10);
    let baseWaveDust = 100 + (bossesDefeated * 50); 
    let waveDust = (rogueWave % 10 === 0) ? (500 * (bossesDefeated + 1)) : baseWaveDust;
    
    if (starShardWaves > 0) { waveDust = Math.floor(waveDust * 1.5); starShardWaves--; }
    if (autoModeUsedThisWave) waveDust = Math.floor(waveDust / 2);
    
    rogueRunStardust += waveDust;
    
    if(typeof stardust !== 'undefined') {
        stardust += waveDust;
        if(typeof updateStardustDisplay === 'function') updateStardustDisplay();
    } else {
        let s = parseInt(localStorage.getItem('pogo_stardust')) || 0;
        localStorage.setItem('pogo_stardust', s + waveDust);
    }
    
    if(typeof addXp === 'function') {
        let waveXp = (rogueWave % 10 === 0) ? 100 : 15;
        addXp(waveXp);
    }
    
    autoModeUsedThisWave = false; 
    
    currentLootBuff = 15 + (bossesDefeated * 5);  
    currentLootHp = 20 + (bossesDefeated * 5);    
    currentLootTeam = 15 + (bossesDefeated * 2);  
    
    rogueWave++;
    
    showScreen('screen-rogue-loot');
    
    const container = document.getElementById('rogue-loot-container');
    container.innerHTML = `<div style="color: #2ecc71; font-weight: bold; margin-bottom: 15px;">Welle geschafft: +${waveDust} ✨</div>`;
    
    const consumables = [
        { id: 'heal', name: 'Trank', icon: '🧪', desc: 'Heilt dein aktives Pokémon um 50%.' },
        { id: 'toprevive', name: 'Top-Beleber', icon: '💛', desc: 'Belebt ein besiegtes Team-Mitglied mit 100% HP.' },
        { id: 'adrenaline', name: 'Adrenalin-Orb', icon: '🔥', desc: 'Dein erster Angriff macht nächste Runde 50% mehr Schaden.' },
        { id: 'focus', name: 'Fokusgurt', icon: '🛡️', desc: 'Blockt den ersten gegnerischen Angriff der nächsten Welle ab.' },
        { id: 'tm', name: 'TM (Technikmaschine)', icon: '💿', desc: 'Ändert den Lade-Attacken-Typ deines aktiven Pokémon zufällig.' },
        { id: 'starshard', name: 'Sternenstück', icon: '⭐', desc: 'Erhöht die Belohnung der nächsten 3 Wellen um 50%.' }
    ];

    const buffs = [
        { id: 'protein', name: 'Protein (Dauerhaft)', icon: '💪', desc: `Dein aktives Pokémon erhält +${currentLootBuff}% auf Angriff.` },
        { id: 'eisen', name: 'Eisen (Dauerhaft)', icon: '🛡️', desc: `Dein aktives Pokémon erhält +${currentLootBuff}% auf Verteidigung.` },
        { id: 'kpplus', name: 'KP-Plus (Dauerhaft)', icon: '❤️', desc: `Dein aktives Pokémon erhält +${currentLootHp}% auf Max. HP.` },
        { id: 'sonderbonbon', name: 'Sonderbonbon', icon: '🍬', desc: `TEAM LEVEL UP! Alle im Team erhalten +${currentLootTeam}% auf alle Werte.` }
    ];
    
    let selectedConsumables = consumables.sort(() => 0.5 - Math.random()).slice(0, 1);
    let selectedBuffs = buffs.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    let finalLoot = [...selectedConsumables, ...selectedBuffs].sort(() => 0.5 - Math.random());
    
    finalLoot.forEach(item => {
        container.innerHTML += `
            <div class="loot-card" onclick="confirmRogueLoot('${item.id}', '${item.name}')">
                <div style="font-size: 30px; margin-bottom: 10px;">${item.icon}</div>
                <div style="font-weight: 900; color: #f1c40f; margin-bottom: 5px;">${item.name}</div>
                <div style="font-size: 11px; color: #ccc;">${item.desc}</div>
            </div>
        `;
    });
}

function confirmRogueLoot(lootId, lootName) {
    if(typeof showCampWillow === 'function') {
        document.getElementById('willow-close-hint').style.display = 'none';
        showCampWillow(`Möchtest du <b>${lootName}</b> wirklich als Belohnung auswählen?<br><br>
        <button class='camp-action-btn' style='background: #2ecc71; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow(); applyRogueLoot("${lootId}");'>Ja, wählen!</button>
        <button class='camp-action-btn' style='background: #e74c3c; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow();'>Nein, zurück</button>`);
    } else {
        applyRogueLoot(lootId);
    }
}

function applyRogueLoot(lootId) {
    const player = rogueTeam[rogueActiveIndex];
    
    if(lootId === 'heal') {
        player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.5));
    } 
    else if(lootId === 'toprevive') {
        let deadPkm = rogueTeam.find(p => p.hp <= 0);
        if(deadPkm) deadPkm.hp = deadPkm.maxHp;
    } 
    else if(lootId === 'adrenaline') {
        adrenalineActive = true;
    } 
    else if(lootId === 'focus') {
        focusSashActive = true;
    }
    else if(lootId === 'starshard') {
        starShardWaves += 3;
    }
    else if(lootId === 'tm') {
        const allTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
        const randomType = allTypes[Math.floor(Math.random() * allTypes.length)];
        if(player.types.length > 1) {
            player.types[1] = randomType;
        } else {
            player.types.push(randomType);
        }
    }
    else if(lootId === 'protein') {
        player.atk = Math.floor(player.atk * (1 + (currentLootBuff / 100)));
        logMsg(`${player.name} fühlt sich viel stärker!`, "heal");
    }
    else if(lootId === 'eisen') {
        player.def = Math.floor(player.def * (1 + (currentLootBuff / 100)));
        logMsg(`${player.name}s Abwehr ist gestiegen!`, "heal");
    }
    else if(lootId === 'kpplus') {
        let hpBoost = Math.floor(player.maxHp * (currentLootHp / 100));
        player.maxHp += hpBoost;
        player.hp += hpBoost; 
        logMsg(`${player.name} hat jetzt mehr KP!`, "heal");
    }
    else if(lootId === 'sonderbonbon') {
        rogueTeam.forEach(p => {
            p.atk = Math.floor(p.atk * (1 + (currentLootTeam / 100)));
            p.def = Math.floor(p.def * (1 + (currentLootTeam / 100)));
            let hpBoost = Math.floor(p.maxHp * (currentLootTeam / 100));
            p.maxHp += hpBoost;
            p.hp += hpBoost;
        });
        logMsg(`Das ganze Team hat ein Level-Up!`, "heal");
    }
    
    showScreen('screen-rogue-battle');
    startNextWave();
}