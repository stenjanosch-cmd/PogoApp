/* ============================================== */
/* DATEI START: rogue.js (Endlos-Kampfmodus)      */
/* ============================================== */

let rogueTeam = []; // 3 Pokemon mit { id, name, types, maxHp, hp, ep, baseId, isShiny }
let rogueActiveIndex = 0;
let rogueEnemy = null; // { name, baseId, types, maxHp, hp, img }
let rogueWave = 1;
let isRogueCombatActive = false;
let currentBiomeIndex = 0;

// Arena-Hintergründe - HIER DIE GEFIXTEN LINKS
const rogueBiomes = [
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Pokemon_arena_in_forest_clearing_202607191057.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Mountain-top_Pokemon_arena_sea.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Empty_Pokemon_arena_stadium_202607191057.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/PogoApp/blob/main/Pokemon_gym_arena_futuristic.jpeg?raw=true'
];

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
function startRogueRun() {
    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    
    // Baue Team-Objekte
    let fullTeam = rogueTeam.map(id => {
        let base = dex[id];
        return {
            id: id,
            name: base.name,
            baseId: base.baseId,
            types: base.types,
            isShiny: base.isShiny || false,
            maxHp: 100, 
            hp: 100,
            ep: 0 
        };
    });
    
    rogueTeam = fullTeam;
    rogueActiveIndex = 0;
    rogueWave = 1;

    // Zufällige Start-Arena
    currentBiomeIndex = Math.floor(Math.random() * rogueBiomes.length);
    document.getElementById('rogue-arena').style.backgroundImage = `url('${rogueBiomes[currentBiomeIndex]}')`;
    
    showScreen('screen-rogue-battle');
    document.getElementById('rogue-switch-menu').style.display = 'none';
    document.getElementById('rogue-controls').style.display = 'grid';
    startNextWave();
}

function logMsg(msg, cssClass = "") {
    const log = document.getElementById('rogue-log');
    log.innerHTML += `<div class="${cssClass}">> ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}

// --- KAMPF / WELLE ---
async function startNextWave() {
    isRogueCombatActive = false;
    document.getElementById('rogue-log').innerHTML = "";
    document.getElementById('rogue-wave-display').innerText = "Welle " + rogueWave;
    
    // Arena-Wechsel alle 10 Wellen
    if (rogueWave > 1 && (rogueWave - 1) % 10 === 0) {
        currentBiomeIndex = (currentBiomeIndex + 1) % rogueBiomes.length;
        document.getElementById('rogue-arena').style.backgroundImage = `url('${rogueBiomes[currentBiomeIndex]}')`;
        logMsg("Du betrittst ein neues Areal!", "heal");
    }

    logMsg(`Suche nach wildem Gegner...`);
    let randomId = Math.floor(Math.random() * 1025) + 1;
    
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        const data = await res.json();
        
        let eName = data.name.toUpperCase();
        try { const sRes = await fetch(data.species.url); const deNameObj = (await sRes.json()).names.find(n => n.language.name === 'de'); if (deNameObj) eName = deNameObj.name; } catch(e) {}
        
        let enemyMaxHp = 80 + (rogueWave * 20);
        
        rogueEnemy = {
            name: eName,
            types: data.types.map(t => t.type.name),
            img: data.sprites.front_default || data.sprites.other['official-artwork'].front_default,
            maxHp: enemyMaxHp,
            hp: enemyMaxHp
        }
        
        updateRogueUI();
        logMsg(`Wilde Begegnung mit <span class="dmg">${eName}</span>!`);
        isRogueCombatActive = true;
        
    } catch(e) {
        setTimeout(startNextWave, 1000); 
    }
}

function updateRogueUI() {
    const player = rogueTeam[rogueActiveIndex];
    
    // Player HUD
    document.getElementById('rogue-player-name').innerText = player.name;
    document.getElementById('rogue-player-hp').style.width = `${(player.hp / player.maxHp) * 100}%`;
    document.getElementById('rogue-player-hp').style.backgroundColor = (player.hp / player.maxHp) < 0.3 ? '#e74c3c' : '#2ecc71';
    document.getElementById('rogue-player-ep').style.width = `${Math.min(player.ep, 100)}%`;
    
    // Player Type Icons im HUD
    let pTypesHtml = player.types.map(t => `<img src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg" style="width:14px; height:14px; background-color:${(typeof typeColors !== 'undefined') ? typeColors[t] : '#777'}; border-radius:50%; padding:2px; box-shadow: 0 1px 3px black;">`).join('');
    document.getElementById('rogue-player-types').innerHTML = pTypesHtml;

    // Lade Backsprite
    const pSprite = document.getElementById('rogue-player-sprite');
    let backUrl = player.isShiny ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/${player.baseId}.png` : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.baseId}.png`;
    pSprite.src = backUrl;
    pSprite.onerror = () => { pSprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.baseId}.png`; };

    // Button Setup
    const fastType = player.types[0];
    const chargeType = player.types.length > 1 ? player.types[1] : player.types[0];
    
    document.getElementById('rogue-fast-type').innerText = (typeof typeTranslations !== 'undefined') ? typeTranslations[fastType] : fastType;
    document.getElementById('rogue-fast-type').style.color = (typeof typeColors !== 'undefined') ? typeColors[fastType] : 'white';
    
    const chargeBtn = document.getElementById('rogue-btn-charge');
    document.getElementById('rogue-charge-type').innerText = (typeof typeTranslations !== 'undefined') ? typeTranslations[chargeType] : chargeType;
    document.getElementById('rogue-charge-type').style.color = (typeof typeColors !== 'undefined') ? typeColors[chargeType] : 'white';
    
    if(player.ep >= 100) { chargeBtn.classList.remove('disabled'); chargeBtn.disabled = false; } 
    else { chargeBtn.classList.add('disabled'); chargeBtn.disabled = true; }

    // Enemy HUD
    if(rogueEnemy) {
        document.getElementById('rogue-enemy-name').innerText = rogueEnemy.name;
        document.getElementById('rogue-enemy-hp').style.width = `${(rogueEnemy.hp / rogueEnemy.maxHp) * 100}%`;
        document.getElementById('rogue-enemy-sprite').src = rogueEnemy.img;
        
        // Enemy Type Icons im HUD
        let eTypesHtml = rogueEnemy.types.map(t => `<img src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg" style="width:14px; height:14px; background-color:${(typeof typeColors !== 'undefined') ? typeColors[t] : '#777'}; border-radius:50%; padding:2px; box-shadow: 0 1px 3px black;">`).join('');
        document.getElementById('rogue-enemy-types').innerHTML = eTypesHtml;
    }
}

// Hilfsfunktion für CSS Animationen
function animateSprite(spriteId, animClass, duration) {
    const el = document.getElementById(spriteId);
    el.classList.remove(animClass);
    void el.offsetWidth; // Reflow erzwingen
    el.classList.add(animClass);
    setTimeout(() => {
        el.classList.remove(animClass);
    }, duration);
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
    isRogueCombatActive = false; // Sperren!
    
    const player = rogueTeam[rogueActiveIndex];
    let isCharge = (atkKind === 'charge');
    let aType = isCharge ? (player.types.length > 1 ? player.types[1] : player.types[0]) : player.types[0];
    
    if(isCharge && player.ep < 100) { isRogueCombatActive = true; return; }
    
    if(isCharge) { player.ep -= 100; logMsg(`${player.name} setzt Spezial-Attacke ein!`, "eff"); }
    else { player.ep += 25; }
    
    // 1. Eigene Angriffs-Animation
    animateSprite('rogue-player-sprite', 'anim-lunge-player', 300);
    
    setTimeout(() => {
        // 2. Schaden anwenden und Treffer-Animation zeigen
        let mult = calcDamage(aType, rogueEnemy.types);
        let rawDmg = isCharge ? 45 : 15;
        let finalDmg = Math.floor(rawDmg * mult);
        
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
        }, 800); // Warten bis Gegner sich erholt hat
    }, 300); // Dauer des Sprungs
}

function rogueEnemyAttack() {
    const player = rogueTeam[rogueActiveIndex];
    let eType = rogueEnemy.types[Math.floor(Math.random() * rogueEnemy.types.length)];
    
    // 1. Gegner Angriffs-Animation
    animateSprite('rogue-enemy-sprite', 'anim-lunge-enemy', 300);
    
    setTimeout(() => {
        // 2. Schaden anwenden und Player Treffer-Animation zeigen
        let mult = calcDamage(eType, player.types);
        let rawDmg = 8 + (rogueWave * 1.5);
        let finalDmg = Math.floor(rawDmg * mult);
        
        player.hp -= finalDmg;
        
        let effText = mult > 1 ? "Kritischer Treffer vom Gegner!" : (mult < 1 ? "Dein Pokémon resistiert." : "");
        if(effText) logMsg(effText, "eff");
        
        showDmgAnim(true, `-${finalDmg}`, '#e74c3c');
        animateSprite('rogue-player-sprite', 'anim-hit', 400);
        updateRogueUI();
        
        setTimeout(() => {
            if(player.hp <= 0) {
                logMsg(`${player.name} wurde besiegt!`, "dmg");
                setTimeout(() => handlePlayerFaint(), 1000);
            } else {
                isRogueCombatActive = true; // Wieder freigeben
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

    if(!isForced) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = "camp-action-btn"; cancelBtn.style.backgroundColor = "#7f8c8d"; cancelBtn.style.gridColumn = "span 2";
        cancelBtn.innerText = "Abbrechen";
        cancelBtn.onclick = () => { menu.style.display = "none"; document.getElementById('rogue-controls').style.display = "grid"; };
        menu.appendChild(cancelBtn);
    }
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
    }
}

function handlePlayerFaint() {
    let aliveIndex = rogueTeam.findIndex(p => p.hp > 0);
    if(aliveIndex === -1) {
        // PERMADEATH - 100 Staub pro geschaffter Welle
        let stardustWon = (rogueWave - 1) * 100;
        
        if(typeof stardust !== 'undefined') {
            stardust += stardustWon;
            if(typeof updateStardustDisplay === 'function') updateStardustDisplay();
        } else {
            let s = parseInt(localStorage.getItem('pogo_stardust')) || 0;
            localStorage.setItem('pogo_stardust', s + stardustWon);
        }
        
        if(typeof showCampWillow === 'function') {
            document.getElementById('willow-close-hint').style.display = 'none'; // Verstecke den Schließen-Text, da Button genutzt wird
            showCampWillow(`<b>GAME OVER!</b><br><br>Dein Team hat tapfer gekämpft, aber ihr wurdet besiegt.<br>Du hast es bis Welle <b>${rogueWave}</b> geschafft und <b>${stardustWon} ✨</b> Sternenstaub erbeutet!<br><br><button class='camp-action-btn' style='background: #2ecc71; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow(); showScreen("screen-menu");'>Zurück ins Menü</button>`);
        } else {
            showScreen('screen-menu');
        }
    } else {
        logMsg(`Wähle dein nächstes Pokémon!`);
        isRogueCombatActive = false;
        openRogueSwitchMenu(true);
    }
}

function surrenderRogue() {
    if(typeof showCampWillow === 'function') {
        document.getElementById('willow-close-hint').style.display = 'none';
        showCampWillow(`<b>Flucht?</b><br><br>Willst du die Expedition wirklich abbrechen? Dein aktueller Fortschritt geht dabei verloren!<br><br>
        <button class='camp-action-btn' style='background: #e74c3c; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow(); showScreen("screen-menu");'>Ja, abbrechen</button>
        <button class='camp-action-btn' style='background: #2ecc71; padding: 10px; font-size: 12px; width: auto;' onclick='document.getElementById("willow-close-hint").style.display="block"; closeCampWillow();'>Nein, weiterkämpfen</button>`);
    } else {
        showScreen('screen-menu');
    }
}

// --- LOOT PHASE ---
function winWave() {
    rogueWave++;
    showScreen('screen-rogue-loot');
    
    const container = document.getElementById('rogue-loot-container');
    container.innerHTML = "";
    
    const lootPool = [
        { id: 'heal', name: 'Trank', icon: '🧪', desc: 'Heilt dein aktives Pokémon um 50%.' },
        { id: 'revive', name: 'Beleber', icon: '💊', desc: 'Belebt ein besiegtes Team-Mitglied mit 50% HP.' },
        { id: 'maxhp', name: 'Protein', icon: '🥩', desc: 'Erhöht die Max. HP deines gesamten Teams um 20.' },
        { id: 'energy', name: 'Energie-Drink', icon: '⚡', desc: 'Gibt deinem aktiven Pokémon sofort 100 Energie.' }
    ];
    
    let shuffled = lootPool.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    shuffled.forEach(item => {
        // NEU: SICHERHEITS-ABFRAGE VOR DEM LOOT
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
    else if(lootId === 'revive') {
        let deadPkm = rogueTeam.find(p => p.hp <= 0);
        if(deadPkm) deadPkm.hp = deadPkm.maxHp * 0.5;
    } 
    else if(lootId === 'maxhp') {
        rogueTeam.forEach(p => { p.maxHp += 20; p.hp += 20; });
    } 
    else if(lootId === 'energy') {
        player.ep = 100;
    }
    
    showScreen('screen-rogue-battle');
    startNextWave();
}