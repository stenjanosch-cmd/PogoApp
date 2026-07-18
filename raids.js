/* ============================================== */
/* DATEI START: raids.js                          */
/* ============================================== */

// Liste mächtiger Boss-Gegner für die Raids
const raidBosses = [
    { id: 150, name: "Mewtu", types: ["psychic"] },
    { id: 144, name: "Arktos", types: ["ice", "flying"] },
    { id: 145, name: "Zapdos", types: ["electric", "flying"] },
    { id: 146, name: "Lavados", types: ["fire", "flying"] },
    { id: 249, name: "Lugia", types: ["psychic", "flying"] },
    { id: 250, name: "Ho-Oh", types: ["fire", "flying"] },
    { id: 384, name: "Rayquaza", types: ["dragon", "flying"] },
    { id: 382, name: "Kyogre", types: ["water"] },
    { id: 383, name: "Groudon", types: ["ground"] }
];

const RAID_DURATION = 15 * 60 * 1000; // 15 Minuten Raid-Kampf
const EGG_HATCH_TIME = 5 * 60 * 1000; // 5 Minuten bis das Ei schlüpft

// ANTI-CRASH SYSTEM FÜR MOBILGERÄTE
let currentRaid = null;
try {
    currentRaid = JSON.parse(localStorage.getItem('pogo_raid_v1'));
    // Wenn die Daten korrupt sind (z.B. kein Boss definiert), löschen wir sie
    if (currentRaid && (!currentRaid.boss || !currentRaid.state)) {
        currentRaid = null;
    }
} catch (e) {
    currentRaid = null;
    localStorage.removeItem('pogo_raid_v1');
}

let raidTimer = null;
let selectedRaidTeam = []; // Max 3 Pokémon

// Einklinken in den System-Scanner
if (window.EventBus) {
    EventBus.on('screenChanged', (data) => {
        if (data.screen === 'screen-camp') {
            initRaidSystem();
        }
    });
}

// ROBUSTER FALLBACK-TIMER FÜR HANDYS (Erzwingt Updates)
setInterval(() => {
    const tab = document.getElementById('camp-tab-raids');
    if (tab && tab.classList.contains('active')) {
        renderRaidTab();
    }
}, 1000);

function initRaidSystem() {
    renderRaidTab();
}

function spawnNewRaid() {
    const randomBoss = raidBosses[Math.floor(Math.random() * raidBosses.length)];
    const now = Date.now();
    currentRaid = {
        state: 'EGG', // EGG, HATCHED, ACTIVE
        boss: randomBoss,
        hatchTime: now + EGG_HATCH_TIME,
        endTime: 0,
        team: [] // Array of Pokemon IDs
    };
    saveRaid();
    renderRaidTab();
}

function saveRaid() {
    localStorage.setItem('pogo_raid_v1', JSON.stringify(currentRaid));
}

function renderRaidTab() {
    const container = document.getElementById('raids-container');
    if (!container) return;
    
    // Wenn es keinen aktiven Raid gibt, würfeln wir einen neuen (10% Chance pro Tick)
    if (!currentRaid) {
        if(Math.random() < 0.1) spawnNewRaid();
        else {
            container.innerHTML = `
                <div style="color: #aaa; margin-top: 30px; font-style: italic;">
                    Der Radar ist still. Aktuell ist kein Raid-Boss in der Nähe.<br>Suche nach Dynaraid-Signalen... 📡
                </div>`;
            return;
        }
    }

    const now = Date.now();

    // Check State Transitions
    if (currentRaid.state === 'EGG' && now >= currentRaid.hatchTime) {
        currentRaid.state = 'HATCHED';
        saveRaid();
    }
    if (currentRaid.state === 'ACTIVE' && now >= currentRaid.endTime) {
        resolveRaid();
        return; // Resolve macht den Container leer und löscht currentRaid
    }

    let html = '';

    if (currentRaid.state === 'EGG') {
        let timeLeft = currentRaid.hatchTime - now;
        let m = Math.floor(timeLeft / 60000);
        let s = Math.floor((timeLeft % 60000) / 1000);
        html = `
            <div class="biome-card" style="border-color: #e67e22;">
                <div class="biome-header" style="justify-content: center; background: rgba(230, 126, 34, 0.2);">
                    <div class="biome-title" style="color: #e67e22;">Legendäres Ei gesichtet!</div>
                </div>
                <div class="biome-body">
                    <div class="raid-egg">🥚</div>
                    <div style="font-size: 12px; color: #ccc; margin-bottom: 10px;">Ein mächtiger Boss schlüpft in:</div>
                    <div style="font-size: 24px; font-weight: 900; font-family: 'Righteous'; color: white;">${m}m ${s}s</div>
                </div>
            </div>
        `;
    } 
    else if (currentRaid.state === 'HATCHED') {
        let bossImg = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${currentRaid.boss.id}.png`;
        let typeBadges = currentRaid.boss.types.map(t => {
            return `<div class="biome-type-badge" style="background-color: ${(typeof typeColors !== 'undefined') ? typeColors[t] : '#777'}; margin: 0 auto 5px auto; display: inline-flex;">
                        <img src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg"> ${(typeof typeTranslations !== 'undefined') ? typeTranslations[t] : t}
                    </div>`;
        }).join('');

        html = `
            <div class="biome-card" style="border-color: #9b59b6; box-shadow: 0 0 20px rgba(155, 89, 182, 0.5);">
                <div class="biome-header" style="justify-content: center; background: rgba(155, 89, 182, 0.2);">
                    <div class="biome-title" style="color: #ff9ff3;">Dyna-Raid Boss: ${currentRaid.boss.name}</div>
                </div>
                <div class="biome-body">
                    <img src="${bossImg}" class="raid-boss-avatar">
                    <div style="margin-bottom: 15px;">${typeBadges}</div>
                    <div style="font-size: 12px; color: #ccc; margin-bottom: 15px;">Stelle ein Team aus 3 Pokémon zusammen, um diesen Boss herauszufordern!</div>
                    <button class="camp-action-btn" style="background-color: #8e44ad;" onclick="openRaidSelect()">Team zusammenstellen</button>
                </div>
            </div>
        `;
    }
    else if (currentRaid.state === 'ACTIVE') {
        let timeLeft = currentRaid.endTime - now;
        let m = Math.floor(timeLeft / 60000);
        let s = Math.floor((timeLeft % 60000) / 1000);
        let bossImg = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${currentRaid.boss.id}.png`;

        html = `
            <div class="biome-card" style="border-color: #e74c3c;">
                <div class="biome-header" style="justify-content: center; background: rgba(231, 76, 60, 0.2);">
                    <div class="biome-title" style="color: #e74c3c;">Raid läuft!</div>
                </div>
                <div class="biome-body">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
                        <div style="font-size: 30px;">⚔️</div>
                        <img src="${bossImg}" style="width: 60px; filter: drop-shadow(0 0 10px red);">
                    </div>
                    <div style="font-size: 14px; font-weight: 900; margin-bottom: 10px;">Dein Team kämpft erbittert...</div>
                    <div style="font-size: 24px; font-weight: 900; font-family: 'Righteous'; color: #e74c3c;">${m}m ${s}s</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// --- TEAM AUSWAHL FÜR 3 POKEMON ---
function openRaidSelect() {
    selectedRaidTeam = [];
    renderRaidTeamSlots();
    renderRaidDexGrid();
    showScreen('screen-raid-select');
}

function renderRaidTeamSlots() {
    for(let i=0; i<3; i++) {
        const slot = document.getElementById(`raid-slot-${i}`);
        if(selectedRaidTeam[i]) {
            let pkm = (typeof pokedex !== 'undefined') ? pokedex[selectedRaidTeam[i]] : JSON.parse(localStorage.getItem('pogo_dex_v6'))[selectedRaidTeam[i]];
            slot.innerHTML = `<img src="${pkm.img}">`;
            slot.className = "raid-slot filled";
            slot.onclick = () => removeRaidTeamMember(i);
        } else {
            slot.innerHTML = i + 1;
            slot.className = "raid-slot";
            slot.onclick = null;
        }
    }

    const startBtn = document.getElementById('start-raid-btn');
    if(selectedRaidTeam.length === 3) {
        startBtn.classList.remove('disabled');
        startBtn.disabled = false;
        startBtn.onclick = startRaidBattle;
    } else {
        startBtn.classList.add('disabled');
        startBtn.disabled = true;
        startBtn.onclick = null;
    }
}

function renderRaidDexGrid() {
    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    const grid = document.getElementById('raid-select-grid');
    grid.innerHTML = '';
    
    let globalActiveExpeditions = JSON.parse(localStorage.getItem('pogo_expeditions_v3')) || {};

    for (let id in dex) {
        let pkm = dex[id];
        if(!pkm) continue;
        
        const isBusy = Object.values(globalActiveExpeditions).some(e => String(e.pkmId) === String(id));
        const isExhausted = (typeof exhausted !== 'undefined' ? exhausted : (JSON.parse(localStorage.getItem('pogo_exhausted_v1'))||[])).includes(String(id));
        const isSelectedForRaid = selectedRaidTeam.includes(String(id));
        
        if(!isBusy && !isExhausted) {
            const div = document.createElement('div');
            let pName = pkm.name || 'Unbekannt';
            let pImg = pkm.img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
            
            div.className = isSelectedForRaid ? 'dex-entry caught selected-for-raid' : 'dex-entry caught'; 
            div.style.cursor = isSelectedForRaid ? 'default' : 'pointer';
            
            if(!isSelectedForRaid) {
                div.onclick = () => {
                    if(selectedRaidTeam.length < 3) {
                        selectedRaidTeam.push(String(id));
                        renderRaidTeamSlots();
                        renderRaidDexGrid();
                    }
                };
            }

            // NEU: Element-Anzeige für das Raid-Menü!
            let typeHtml = '';
            if (pkm.types && Array.isArray(pkm.types)) {
                let cColors = (typeof typeColors !== 'undefined') ? typeColors : {};
                let cTrans = (typeof typeTranslations !== 'undefined') ? typeTranslations : {};
                typeHtml = pkm.types.map(t => `<img class="camp-select-type-icon" style="background-color: ${cColors[t] || '#777'};" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg" title="${cTrans[t] || t}">`).join('');
            } else {
                typeHtml = `<span style="font-size: 9px; color: #aaa; text-transform: uppercase;">Lade...</span>`;
                if(typeof fetchPokemonTypes === 'function') fetchPokemonTypes(id); 
            }

            div.innerHTML = `
                <img class="dex-img" src="${pImg}">
                <div class="dex-id">#${id}</div>
                <div class="dex-name">${pName}</div>
                <div class="camp-select-types" id="camp-types-${id}">${typeHtml}</div>
            `;
            grid.appendChild(div);
        }
    }
}

function startRaidBattle() {
    if(selectedRaidTeam.length !== 3) return;

    currentRaid.state = 'ACTIVE';
    currentRaid.team = [...selectedRaidTeam];
    currentRaid.endTime = Date.now() + RAID_DURATION;
    saveRaid();
    
    showScreen('screen-camp');
    renderRaidTab();
    if(typeof showCampWillow === 'function') {
        showCampWillow(`Dein 3er-Team ist auf dem Weg zum Dyna-Raid gegen <b>${currentRaid.boss.name}</b>! Lass uns hoffen, dass die Typen-Vorteile auf deiner Seite sind.`);
    }
}

function resolveRaid() {
    if(!currentRaid || currentRaid.state !== 'ACTIVE') return;

    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    const bossTypes = currentRaid.boss.types;
    
    let totalScore = 0; // Wir berechnen einen Team-Score basierend auf Typen-Effektivität
    
    currentRaid.team.forEach(pkmId => {
        let pkmTypes = dex[pkmId].types || [];
        let pkmScore = 1; // Base multiplier
        
        // Output damage check
        for(let pType of pkmTypes) {
            for(let bType of bossTypes) {
                if(typeof typeChart !== 'undefined' && typeChart[pType] && typeChart[pType][bType] !== undefined) {
                    pkmScore *= typeChart[pType][bType];
                }
            }
        }
        
        // Input damage check (Survival)
        for(let bType of bossTypes) {
            for(let pType of pkmTypes) {
                if(typeof typeChart !== 'undefined' && typeChart[bType] && typeChart[bType][pType] !== undefined) {
                    // Wenn boss effektiv ist, senkt das unseren score
                    if(typeChart[bType][pType] > 1) pkmScore -= 0.5;
                    if(typeChart[bType][pType] < 1) pkmScore += 0.5; // Resistenz ist gut!
                }
            }
        }
        totalScore += pkmScore;
    });

    // Ein Team-Score von über 3.0 bedeutet in der Regel einen Sieg
    const isWin = totalScore >= 3.0;

    if (isWin) {
        // Sieg!
        let starpieceMult = (Date.now() < (parseInt(localStorage.getItem('pogo_starpiece_time'))||0)) ? 1.5 : 1.0;
        let finalDust = Math.floor(5000 * starpieceMult); // 5000 Basis Staub!
        
        if(typeof stardust !== 'undefined') {
            stardust += finalDust;
            if(typeof updateStardustDisplay === 'function') updateStardustDisplay();
        } else {
            let s = parseInt(localStorage.getItem('pogo_stardust')) || 0;
            localStorage.setItem('pogo_stardust', s + finalDust);
        }

        if(typeof showCampWillow === 'function') {
            showCampWillow(`🔥 <b>RAID GEWONNEN!</b> 🔥<br><br>Dein Team hat ${currentRaid.boss.name} absolut dominiert! Du hast massive <b>${finalDust} ✨</b> erbeutet. Der Boss ist nun geschwächt, nutze deine Chance ihn zu fangen!`);
        }

        // Trigger Boss Catch Sequence
        triggerBossCatch(currentRaid.boss);

    } else {
        // Niederlage: Alle 3 Pokemon werden erschöpft
        if(typeof exhausted !== 'undefined') {
            currentRaid.team.forEach(id => exhausted.push(id));
            localStorage.setItem('pogo_exhausted_v1', JSON.stringify(exhausted));
        }

        if(typeof showCampWillow === 'function') {
            showCampWillow(`💀 <b>RAID VERLOREN!</b> 💀<br><br>Die Macht von <b>${currentRaid.boss.name}</b> war zu groß. Eure Attacken waren nicht effektiv genug. Dein gesamtes 3er-Team ist nun <b>erschöpft</b> und benötigt Beleber aus dem Shop.`);
        }
    }

    // Raid löschen
    currentRaid = null;
    saveRaid();
    renderRaidTab();
}

async function triggerBossCatch(bossObj) {
    const area = document.getElementById('camp-encounter-area');
    if(!area) return;
    
    area.style.display = 'flex';
    area.style.borderColor = '#f1c40f'; // Gold border for raid boss
    area.style.boxShadow = '0 0 20px rgba(241, 196, 15, 0.8)';
    
    document.getElementById('camp-encounter-loading').style.display = 'block';
    document.getElementById('camp-encounter-img').style.display = 'none';
    document.getElementById('camp-encounter-btn').style.display = 'none';

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${bossObj.id}`);
        const data = await res.json();
        
        let bossName = data.name.toUpperCase();
        try { 
            const sRes = await fetch(data.species.url); 
            const deName = (await sRes.json()).names.find(n => n.language.name === 'de'); 
            if(deName) bossName = deName.name; 
        } catch(e) {}
        
        const img = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
        const baseId = data.species.url.split('/').filter(Boolean).pop();
        
        document.getElementById('camp-encounter-loading').style.display = 'none';
        document.getElementById('camp-encounter-img').src = img;
        document.getElementById('camp-encounter-img').style.display = 'block';
        document.getElementById('camp-encounter-name').innerText = bossName; 
        
        const catchBtn = document.getElementById('camp-encounter-btn');
        catchBtn.innerText = "Premium-Ball werfen ⚪";
        catchBtn.style.backgroundColor = "#ecf0f1";
        catchBtn.style.color = "black";
        catchBtn.disabled = false;
        catchBtn.style.display = 'block';

        // Event Listener überschreiben für garantierten Raid Fang
        catchBtn.onclick = function() {
            this.disabled = true;
            
            // Garantierter Fang nach gewonnener Raid!
            if(typeof pokedex !== 'undefined') {
                pokedex[bossObj.id] = { name: bossName, img: img, baseId: baseId, types: bossObj.types };
                localStorage.setItem('pogo_dex_v6', JSON.stringify(pokedex));
                if (window.EventBus) EventBus.emit('pokemonCaught', { id: bossObj.id, data: pokedex[bossObj.id] });
            }
            
            this.innerText = "Boss gefangen! 🎉";
            this.style.backgroundColor = "#f1c40f";
            
            setTimeout(() => { 
                area.style.display = 'none'; 
                area.style.borderColor = '#a29bfe'; // Reset border
                area.style.boxShadow = '0 0 15px rgba(162, 155, 254, 0.5)';
            }, 3000);
        };
        
    } catch (e) {
        if(typeof showCampWillow === 'function') showCampWillow("Der Boss ist geflohen! Es gab einen Netzwerkfehler.");
        area.style.display = 'none';
    }
}