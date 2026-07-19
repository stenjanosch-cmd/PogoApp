// ==========================================
// PO-GO TRAINER: ROGUE EXPEDITION (ENDLOS-MODUS)
// ==========================================

let rogueState = {
    wave: 1,
    team: [], // 3 Pokemon des Spielers
    activeIndex: 0,
    enemy: null,
    autoMode: false,
    autoTimer: null,
    rewardMultiplier: 1.0,
    lootModifiers: {
        atkBoost: 1.0,
        focusSashActive: false
    }
};

let rogueTempSelection = [];

// ==========================================
// 1. SETUP & TEAM AUSWAHL
// ==========================================

function startRogueSetup() {
    rogueTempSelection = [];
    document.getElementById('rogue-team-slots').innerHTML = `
        <div class="raid-slot" id="rogue-slot-0">1</div>
        <div class="raid-slot" id="rogue-slot-1">2</div>
        <div class="raid-slot" id="rogue-slot-2">3</div>
    `;
    document.getElementById('start-rogue-btn').classList.add('disabled');
    document.getElementById('start-rogue-btn').disabled = true;

    showScreen('screen-rogue-setup');
    
    const grid = document.getElementById('rogue-select-grid');
    grid.innerHTML = '';

    // Lade gefangene Pokemon aus dem LocalStorage (Pokedex)
    let caughtDex = JSON.parse(localStorage.getItem('pogo_caught_dex')) || [];
    
    // Falls Spieler noch keine 3 Pokemon hat, Standard-Starter anbieten
    if(caughtDex.length < 3) {
        caughtDex = [1, 4, 7]; // Bisasam, Glumanda, Schiggy
    }

    caughtDex.forEach(id => {
        let card = document.createElement('div');
        card.className = 'dex-card';
        card.onclick = () => toggleRogueSelection(id, card);
        
        let img = document.createElement('img');
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        img.className = 'dex-img';
        
        let number = document.createElement('div');
        number.className = 'dex-number';
        number.innerText = `#${id}`;
        
        card.appendChild(img);
        card.appendChild(number);
        grid.appendChild(card);
    });
}

function toggleRogueSelection(id, cardElement) {
    let idx = rogueTempSelection.indexOf(id);
    if (idx > -1) {
        rogueTempSelection.splice(idx, 1);
        cardElement.style.borderColor = '#34495e';
        cardElement.style.background = '#1e272e';
    } else {
        if (rogueTempSelection.length >= 3) return; 
        rogueTempSelection.push(id);
        cardElement.style.borderColor = '#2ecc71';
        cardElement.style.background = 'rgba(46, 204, 113, 0.2)';
    }

    // Slots updaten
    for (let i = 0; i < 3; i++) {
        let slot = document.getElementById(`rogue-slot-${i}`);
        if (rogueTempSelection[i]) {
            slot.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${rogueTempSelection[i]}.png" style="width:100%; height:100%; object-fit:contain;">`;
            slot.style.borderColor = '#2ecc71';
        } else {
            slot.innerHTML = i + 1;
            slot.style.borderColor = '#555';
        }
    }

    let startBtn = document.getElementById('start-rogue-btn');
    if (rogueTempSelection.length === 3) {
        startBtn.classList.remove('disabled');
        startBtn.disabled = false;
        startBtn.onclick = initRogueRun;
    } else {
        startBtn.classList.add('disabled');
        startBtn.disabled = true;
    }
}

// ==========================================
// 2. BASIS-WERTE BERECHNUNG & API
// ==========================================

const LEGENDARY_IDS = [144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,483,484,487];

async function fetchRoguePokemonStats(id, isPlayer, waveLevel) {
    try {
        let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        let data = await res.json();
        
        let baseHP = data.stats[0].base_stat;
        let baseAtk = data.stats[1].base_stat;
        let baseDef = data.stats[2].base_stat;
        
        let isLegendary = LEGENDARY_IDS.includes(data.id) || data.base_experience > 250;
        
        // Massive Buffs für Legendäre, damit ein Koalelu keine Chance hat
        let legendBuff = isLegendary ? 1.6 : 1.0; 
        
        // Level Berechnung (Gegner skalieren mit Welle)
        let level = isPlayer ? 40 : 25 + (waveLevel * 3);
        
        // Echte Formel für Stats
        let maxHp = Math.floor(0.01 * (2 * baseHP * legendBuff) * level) + level + 10;
        let atk = Math.floor(0.01 * (2 * baseAtk * legendBuff) * level) + 5;
        let def = Math.floor(0.01 * (2 * baseDef * legendBuff) * level) + 5;
        
        let types = data.types.map(t => t.type.name);

        return {
            id: data.id,
            name: data.name.toUpperCase(),
            sprite: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
            types: types,
            maxHp: maxHp * 4, // Multiplikator für längere, taktische Kämpfe
            hp: maxHp * 4,
            atk: atk,
            def: def,
            ep: 0, // Energie für Lade-Attacke
            isLegendary: isLegendary,
            fastType: types[0],
            chargeType: types[types.length - 1]
        };
    } catch (e) {
        console.error("Fehler beim Laden der Stats:", e);
        return null;
    }
}

// ==========================================
// 3. SPIEL-LOOP & LOGIK
// ==========================================

async function initRogueRun() {
    showScreen('screen-rogue-battle');
    rogueLog("Generiere Team-Stats... Bitte warten!");
    
    rogueState.wave = 1;
    rogueState.activeIndex = 0;
    rogueState.autoMode = false;
    rogueState.rewardMultiplier = 1.0;
    rogueState.lootModifiers = { atkBoost: 1.0, focusSashActive: false };
    
    rogueState.team = [];
    for (let id of rogueTempSelection) {
        let pkm = await fetchRoguePokemonStats(id, true, 1);
        if(pkm) rogueState.team.push(pkm);
    }
    
    initAutoButton();
    startRogueWave();
}

async function startRogueWave() {
    document.getElementById('rogue-wave-display').innerText = `Welle ${rogueState.wave}`;
    
    // Boss alle 5 Wellen (Legendär), sonst Random
    let isBossWave = rogueState.wave % 5 === 0;
    let randomId;
    
    if (isBossWave) {
        randomId = LEGENDARY_IDS[Math.floor(Math.random() * LEGENDARY_IDS.length)];
        rogueLog(`⚠️ ACHTUNG! BOSS-WELLE: Ein legendäres Pokémon taucht auf! ⚠️`);
    } else {
        randomId = Math.floor(Math.random() * 386) + 1; // Gen 1-3 Random
    }

    rogueState.enemy = await fetchRoguePokemonStats(randomId, false, rogueState.wave);
    
    updateRogueHUD();
    rogueLog(`Ein wildes ${rogueState.enemy.name} (Welle ${rogueState.wave}) erscheint!`);
    
    if(rogueState.autoMode) {
        rogueState.autoTimer = setTimeout(runAutoMode, 1500);
    }
}

// ==========================================
// 4. KAMPF-MECHANIKEN & SCHADENSBERECHNUNG
// ==========================================

const typeChartRogue = {
    normal: { weak: ['fighting'], resist: [], immune: ['ghost'] },
    fire: { weak: ['water', 'ground', 'rock'], resist: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immune: [] },
    water: { weak: ['electric', 'grass'], resist: ['fire', 'water', 'ice', 'steel'], immune: [] },
    electric: { weak: ['ground'], resist: ['electric', 'flying', 'steel'], immune: [] },
    grass: { weak: ['fire', 'ice', 'poison', 'flying', 'bug'], resist: ['water', 'electric', 'grass', 'ground'], immune: [] },
    ice: { weak: ['fire', 'fighting', 'rock', 'steel'], resist: ['ice'], immune: [] },
    fighting: { weak: ['flying', 'psychic', 'fairy'], resist: ['bug', 'rock', 'dark'], immune: [] },
    poison: { weak: ['ground', 'psychic'], resist: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immune: [] },
    ground: { weak: ['water', 'grass', 'ice'], resist: ['poison', 'rock'], immune: ['electric'] },
    flying: { weak: ['electric', 'ice', 'rock'], resist: ['grass', 'fighting', 'bug'], immune: ['ground'] },
    psychic: { weak: ['bug', 'ghost', 'dark'], resist: ['fighting', 'psychic'], immune: [] },
    bug: { weak: ['fire', 'flying', 'rock'], resist: ['grass', 'fighting', 'ground'], immune: [] },
    rock: { weak: ['water', 'grass',Normally I can help with things like this, but I don't seem to have access to that content. You can try again or ask me for something else.