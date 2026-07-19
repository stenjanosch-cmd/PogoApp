/* ============================================== */
/* DATEI START: rogue.js (Endlos-Kampfmodus)      */
/* ============================================== */

let rogueTeam = []; // 3 Pokemon mit { id, name, types, maxHp, hp, ep, baseId, isShiny, atk, def }
let rogueActiveIndex = 0;
let rogueEnemy = null; // { name, baseId, types, maxHp, hp, img, atk, def, isLegendary }
let rogueWave = 1;
let isRogueCombatActive = false;
let currentBiomeIndex = 0;

// Neue Rogue State Variablen
let rogueRunStardust = 0;
let isAutoModeActive = false;
let autoModeUsedThisWave = false;
let starShardWaves = 0;
let adrenalineActive = false;
let focusSashActive = false;

// Normale Arena-Hintergründe
const rogueBiomes = [
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Pokemon_arena_in_forest_clearing_202607191057.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Mountain-top_Pokemon_arena_sea.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Empty_Pokemon_arena_stadium_202607191057.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Pokemon_gym_arena_futuristic.jpeg?raw=true'
];

// NEU: Epische Boss-Hintergründe
const bossBiomes = [
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Sky-temple_boss_battle_arena_202607192129.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Underwater_boss_battle_stadium_202607192129.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Stone_arena_volcanic_crater_202607192128.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Floating_crystalline_boss_arena_202607192128.jpeg?raw=true'
];

const ROGUE_LEGENDARY_IDS = [144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,483,484,487];

// NEU: Mega / Primal / Super Boss IDs aus der PokeAPI
const ROGUE_MEGA_BOSS_IDS = [
    10033, // Mega Charizard X
    10034, // Mega Charizard Y
    10077, // Primal Groudon
    10078, // Primal Kyogre
    10079, // Mega Rayquaza
    10087, // Mega Mewtwo X
    10088, // Mega Mewtwo Y
    10061, // Mega Salamence
    10063, // Mega Metagross
    10048, // Mega Gengar
    10142  // Ultra Necrozma
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
        
        // Normale Legendäre 1.5x, Megas/Primals 2.0x Stats!
        let legendBuff = 1.0;
        if(isLegendary) legendBuff = 1.5;
        if(isMegaBoss) legendBuff = 2.0;
        
        let level = isPlayer ? 40 : Math.min(100, 15 + (waveLevel * 3));
        
        let maxHp = Math.floor(0.01 * (2 * baseHP * legendBuff) * level) + level + 10;
        let atk = Math.floor(0.01 * (2 * baseAtk * legendBuff) * level) + 5;
        let def = Math.floor(0.01 * (2 * baseDef * legendBuff) * level) + 5;
        
        return { maxHp: maxHp * 3, atk: atk, def: def, isLegendary: isLegendary || isMegaBoss };
    } catch (e) {
        return { maxHp: 100, atk: 50, def: 50, isLegendary: false }; // Fallback bei API-Fehler
    }
}

// --- SETUP PHASE ---
function startRogueSetup() {
    rogueTeam = [];
    renderRogueSetupSlots();
    renderRogueSetupDex();
    showScreen('screen-rogue-setup');
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
        
        const isSelected = rogueTeam.includes(String(id));
        const div = document.createElement('div');
        div.className = isSelected ? 'dex-entry caught selected-for-raid' : 'dex-entry caught'; 
        div.style.cursor = isSelected ? 'default' : 'pointer';
        
        if(!isSelected) {
            div.onclick = () => { if(rogueTeam.length < 3) { rogueTeam.push(String(id)); renderRogueSetupSlots(); renderRogueSetupDex(); } };
        }

        let typeHtml = pkm.types.map(t => `<img class="camp-select-type-icon" style="background-color: ${(typeof typeColors !== 'undefined') ? typeColors[t] : '#777'};" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg">`).join('');
        div.innerHTML = `<img class="dex-img" src="${pkm.img}"><div class="dex-id">#${id}</div><div class="dex-name">${pkm.name}</div><div class="camp-select-types">${typeHtml}</div>`;
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
    }, 800);
}

function logMsg(msg, cssClass = "") {
    const log = document.getElementById('rogue-log');
    log.innerHTML += `<div class="${cssClass}">> ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}

// NEU: Boss Warnungs Funktion
function triggerBossWarning() {
    let warn = document.createElement('div');
    warn.innerHTML = "⚠️ MEGA BOSS WELLE ⚠️";
    warn.className = "boss-warning-overlay";
    document.getElementById('screen-rogue-battle').appendChild(warn);
    setTimeout(() => warn.remove(), 3500);
}

// --- KAMPF / WELLE ---
async function startNextWave() {
    isRogueCombatActive = false;
    document.getElementById('rogue-log').innerHTML = "";
    document.getElementById('rogue-wave-display').innerText = "Welle " + rogueWave;
    document.getElementById('rogue-enemy-sprite').className = "rogue-sprite-enemy"; // Reset Aura
    
    logMsg(`Suche nach wildem Gegner...`);
    let randomId;
    
    // NEU: Boss Logic (Mega alle 10, Normal Legendär alle 5)
    if (rogueWave > 0 && rogueWave % 10 === 0) {
        randomId = ROGUE_MEGA_BOSS_IDS[Math.floor(Math.random() * ROGUE_MEGA_BOSS_IDS.length)];
        logMsg(`🚨 SUPER-BOSS WELLE! Ein mächtiges Mega-Pokémon taucht auf! 🚨`, "dmg");
        
        // Zufälliges episches Boss Biome setzen
        let bossBg = bossBiomes[Math.floor(Math.random() * bossBiomes.length)];
        document.getElementById('rogue-arena').style.backgroundImage = `url('${bossBg}')`;
        document.getElementById('rogue-enemy-sprite').classList.add('boss-aura');
        
        triggerBossWarning();
        
    } else if (rogueWave > 0 && rogueWave % 5 === 0) {
        randomId = ROGUE_LEGENDARY_IDS[Math.floor(Math.random() * ROGUE_LEGENDARY_IDS.length)];
        logMsg(`⚠️ BOSS-WELLE! Ein seltenes Legendäres taucht auf! ⚠️`, "eff");
        
        // Normaler Biome Wechsel (Dein alter Code)
        currentBiomeIndex = (currentBiomeIndex + 1) % rogueBiomes.length;
        document.getElementById('rogue-arena').style.backgroundImage = `url('${rogueBiomes[currentBiomeIndex]}')`;
    } else {
        randomId = Math.floor(Math.random() * 1025) + 1;
        // Falls wir nach einer Boss-Welle wieder in ein normales Biome müssen:
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
        
        // Namen aufräumen für Megas (Macht aus "venusaur-mega" -> "MEGA VENUSAUR")
        if (eName.includes('-MEGA')) eName = "MEGA " + eName.replace('-MEGA', '').replace('-X', ' X').replace('-Y', ' Y');
        if (eName.includes('-PRIMAL')) eName = "PROTO " + eName.replace('-PRIMAL', '');
        
        let stats = await fetchRogueStats(data.id, false, rogueWave);
        
        rogueEnemy = {
            name: eName,
            baseId: data.id,
            types: data.types.map(t => t.type.name),
            img: data.sprites.front_default || data.sprites.other['official-artwork'].front_default,
            maxHp: stats.maxHp,
            hp: stats.maxHp,
            atk: stats.atk,
            def: stats.def,
            isLegendary: stats.isLegendary
        }
        
        updateRogueUI();
        logMsg(`Wilde Begegnung mit <span class="dmg">${eName}</span>!`);
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
    setTimeout(() => { el.classList.remove(animClass); }, duration);
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
        
        setTimeout(() => {
            if(rogueEnemy.hp <= 0) {
                winWave();
            } else {
                rogueEnemyAttack();
            }
        }, 800);
    }, 300);
}

function rogueEnemyAttack() {
    const player = rogueTeam[rogueActiveIndex];
    let eType = rogueEnemy.types[Math.floor(Math.random() * rogueEnemy.types.length)];
    
    animateSprite('rogue-enemy-sprite', 'anim-lunge-enemy', 300);
    
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
        
        setTimeout(() => {
            if(player.hp <= 0) {
                logMsg(`${player.name} wurde besiegt!`, "dmg");
                setTimeout(() => handlePlayerFaint(), 1000);
            } else {
                isRogueCombatActive = true; 
                checkRogueAutoTurn();
            }
        }, 800);
    }, 300);
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
        setTimeout(() => rogueEnemyAttack(), 1000);
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
    
    setTimeout(() => {
        let hpRatio = rogueEnemy.hp / rogueEnemy.maxHp;
        
        // Mache Legendäre Bosse doppelt so schwer zu fangen (außer Meisterball)
        if (rogueEnemy.isLegendary && ballType !== 'masterball') {
            hpRatio = hpRatio * 2.5; // Megas sind nochmal schwerer als normale Legendäre
        }
        
        let success = false;
        if (ballType === 'masterball') success = true;
        else if (ballType === 'ultraball' && hpRatio <= 0.8) success = true;
        else if (ballType === 'greatball' && hpRatio <= 0.5) success = true;
        else if (ballType === 'pokeball' && hpRatio <= 0.3) success = true;

        if (success) {
            logMsg(`Erfolg! ${rogueEnemy.name} wurde gefangen!`, "heal");
            
            // NEU: Pokédex wird erweitert, auch um Mega-Einträge!
            let dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
            dex[rogueEnemy.baseId] = { name: rogueEnemy.name, img: rogueEnemy.img, baseId: rogueEnemy.baseId, types: rogueEnemy.types };
            localStorage.setItem('pogo_dex_v6', JSON.stringify(dex));
            if(typeof pokedex !== 'undefined') pokedex = dex;
            
            setTimeout(() => { winWave(true); }, 1500);
        } else {
            logMsg(`Oh nein! ${rogueEnemy.name} ist ausgebrochen! Gegner HP noch zu hoch.`, "dmg");
            setTimeout(() => { rogueEnemyAttack(); }, 1500);
        }
    }, 1000);
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
    isAutoModeActive = false; // Sicherheitshalber
    if(typeof showCampWillow === 'function') {
        document.getElementById('willow-close-hint').style.display = 'none';
        showCampWillow(`<b>Flucht?</b><br><br>Willst du die Expedition wirklich abbrechen? Dein bisher erbeuteter Sternenstaub (${rogueRunStardust} ✨) ist sicher, aber du startest danach von vorn!<br><br>
        <button class='camp-action-btn' style='background: #e74c3c; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow(); showScreen("screen-menu");'>Ja, abbrechen</button>
        <button class='camp-action-btn' style='background: #2ecc71; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow();'>Nein, weiterkämpfen</button>`);
    } else {
        showScreen('screen-menu');
    }
}

// --- LOOT PHASE ---
function winWave(wasCaught = false) {
    // Doppelter Sternenstaub nach einer epischen Boss-Welle
    let waveDust = (rogueWave % 10 === 0) ? 500 : 100;
    
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
    
    autoModeUsedThisWave = false; 
    rogueWave++;
    
    showScreen('screen-rogue-loot');
    
    const container = document.getElementById('rogue-loot-container');
    container.innerHTML = `<div style="color: #2ecc71; font-weight: bold; margin-bottom: 15px;">Welle geschafft: +${waveDust} ✨</div>`;
    
    const lootPool = [
        { id: 'heal', name: 'Trank', icon: '🧪', desc: 'Heilt dein aktives Pokémon um 50%.' },
        { id: 'toprevive', name: 'Top-Beleber', icon: '💛', desc: 'Belebt ein besiegtes Team-Mitglied mit 100% HP.' },
        { id: 'adrenaline', name: 'Adrenalin-Orb', icon: '🔥', desc: 'Dein erster Angriff in der nächsten Welle macht 50% mehr Schaden.' },
        { id: 'focus', name: 'Fokusgurt', icon: '🛡️', desc: 'Dein Team blockt den ersten gegnerischen Angriff der nächsten Welle ab.' },
        { id: 'tm', name: 'TM (Technikmaschine)', icon: '💿', desc: 'Ändert den Lade-Attacken-Typ deines aktiven Pokémon zufällig.' },
        { id: 'starshard', name: 'Sternenstück-Splitter', icon: '⭐', desc: 'Erhöht die Belohnung der nächsten 3 Wellen um 50%.' },
        { id: 'egg', name: 'Mysteriöses Ei', icon: '🥚', desc: 'Glücksspiel: 50% Chance auf Vollheilung aller, 50% Chance auf 10 HP Schaden.' }
    ];
    
    let shuffled = lootPool.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    shuffled.forEach(item => {
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
    else if(lootId === 'egg') {
        if(Math.random() > 0.5) {
            rogueTeam.forEach(p => { p.hp = p.maxHp; });
            setTimeout(() => { showCampWillow("Glückwunsch! Das Ei enthielt pure Heilenergie. Dein gesamtes Team ist wieder bei 100% HP."); }, 500);
        } else {
            rogueTeam.forEach(p => { p.hp -= 10; });
            setTimeout(() => { showCampWillow("Oh nein... Das Ei ist geplatzt und hat giftige Dämpfe freigesetzt. Dein Team verliert 10 HP."); }, 500);
        }
    }
    
    showScreen('screen-rogue-battle');
    startNextWave();
}