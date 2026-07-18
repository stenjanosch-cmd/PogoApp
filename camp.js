let stardust = parseInt(localStorage.getItem('pogo_stardust')) || 0;
const EXP_DURATION = 10 * 60 * 1000; // 10 Minuten pro Mission

// Neues Inventar-System
let inventory = JSON.parse(localStorage.getItem('pogo_inventory_v1')) || { lure_normal: 0, starpiece: 0, pinap: 0, revive: 0 };
if (inventory.golden_razz !== undefined) delete inventory.golden_razz; // Alte Beeren restlos aus dem Cache löschen

let exhausted = JSON.parse(localStorage.getItem('pogo_exhausted_v1')) || [];
let starpieceActiveUntil = parseInt(localStorage.getItem('pogo_starpiece_time')) || 0;

let isPinapSelected = false; // Temporärer Schalter bei der Pokémon-Auswahl

const shopItems = {
    lure_normal: { name: "Lockmodul", icon: "🌸", desc: "Lockt ein garantiertes Pokémon an.", price: 1500, color: "#9b59b6" },
    starpiece: { name: "Sternenstück", icon: "⭐", desc: "+50% Sternenstaub auf alles (60 Min).", price: 1000, color: "#f1c40f" },
    pinap: { name: "Sananabeere", icon: "🍍", desc: "Verdoppelt den Ertrag einer Expedition.", price: 200, color: "#e67e22" },
    revive: { name: "Beleber", icon: "💊", desc: "Heilt ein erschöpftes Pokémon.", price: 100, color: "#e74c3c" }
};

const biomeTemplates = [
    { name: "Vulkan", types: ["fire", "rock"], color1: "#EE8130", color2: "#B6A136", icon: "fire", baseDust: 150 },
    { name: "Tiefsee", types: ["water", "ice"], color1: "#6390F0", color2: "#96D9D6", icon: "water", baseDust: 150 },
    { name: "Spukwald", types: ["ghost", "poison"], color1: "#735797", color2: "#A33EA1", icon: "ghost", baseDust: 150 },
    { name: "Kraftwerk", types: ["electric", "steel"], color1: "#F7D02C", color2: "#B7B7CE", icon: "electric", baseDust: 150 },
    { name: "Dschungel", types: ["grass", "bug"], color1: "#7AC74C", color2: "#A6B91A", icon: "grass", baseDust: 150 },
    { name: "Wüste", types: ["ground", "rock"], color1: "#E2BF65", color2: "#B6A136", icon: "ground", baseDust: 150 },
    { name: "Gletscher", types: ["ice", "water"], color1: "#96D9D6", color2: "#6390F0", icon: "ice", baseDust: 150 },
    { name: "Ruinen", types: ["psychic", "ground"], color1: "#F95587", color2: "#E2BF65", icon: "psychic", baseDust: 150 },
    { name: "Wolkenmeer", types: ["flying", "fairy"], color1: "#A98FF3", color2: "#D685AD", icon: "flying", baseDust: 150 },
    { name: "Kampf-Dojo", types: ["fighting", "normal"], color1: "#C22E28", color2: "#A8A77A", icon: "fighting", baseDust: 150 },
    { name: "Finsterhöhle", types: ["dark", "rock"], color1: "#705898", color2: "#B6A136", icon: "dark", baseDust: 150 },
    { name: "Drachenhort", types: ["dragon", "fire"], color1: "#6F35FC", color2: "#EE8130", icon: "dragon", baseDust: 150 }
];

let activeBiomes = JSON.parse(localStorage.getItem('pogo_active_biomes_v3'));
let activeExpeditions = JSON.parse(localStorage.getItem('pogo_expeditions_v3')) || {};

if (!activeBiomes) {
    activeBiomes = { zone1: biomeTemplates[0], zone2: biomeTemplates[1], zone3: biomeTemplates[2], zone4: biomeTemplates[3] };
    localStorage.setItem('pogo_active_biomes_v3', JSON.stringify(activeBiomes));
}

let currentBiomeSelect = null;
let campTimer = null;

if (window.EventBus) {
    EventBus.on('screenChanged', (data) => {
        if (data.screen === 'screen-camp') initCamp();
    });
    EventBus.on('pokemonCaught', (data) => {
        if (currentBiomeSelect && document.getElementById('screen-camp-select').classList.contains('active')) {
            openPokemonSelect(currentBiomeSelect);
        }
    });
}

function showCampWillow(text) {
    document.getElementById('camp-willow-text').innerHTML = text;
    document.getElementById('camp-willow-overlay').style.display = 'flex';
}

function closeCampWillow() {
    document.getElementById('camp-willow-overlay').style.display = 'none';
}

// --- SCHWESTER JOY LOGIK ---
let pendingReviveCallback = null;

function showJoy(text, confirmCallback) {
    document.getElementById('joy-text').innerHTML = text;
    document.getElementById('joy-overlay').style.display = 'flex';
    document.getElementById('joy-btn-yes').onclick = () => {
        confirmCallback();
        closeJoy();
    };
}

function closeJoy() {
    document.getElementById('joy-overlay').style.display = 'none';
    pendingReviveCallback = null;
}

function saveInventory() {
    localStorage.setItem('pogo_inventory_v1', JSON.stringify(inventory));
}

function initCamp() {
    updateStardustDisplay();
    renderBiomes();
    renderShop();
    renderInventory();
    checkStarpiece();
    if(campTimer) clearInterval(campTimer);
    campTimer = setInterval(() => { renderBiomes(); checkStarpiece(); }, 1000); 
}

function checkStarpiece() {
    const indicator = document.getElementById('starpiece-indicator');
    if(Date.now() < starpieceActiveUntil) {
        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

function updateStardustDisplay() {
    document.getElementById('camp-stardust-display').innerText = `${stardust} ✨`;
    localStorage.setItem('pogo_stardust', stardust);
}

function switchCampTab(tabName) {
    document.querySelectorAll('.camp-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.camp-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    document.getElementById(`camp-tab-${tabName}`).classList.add('active');
}

// --- SHOP & INVENTAR RENDERING ---
function renderShop() {
    const container = document.getElementById('shop-container');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(shopItems).forEach(key => {
        const item = shopItems[key];
        container.innerHTML += `
            <div class="biome-card" style="border-color: ${item.color};">
                <div class="biome-header" style="background: rgba(0,0,0,0.5);">
                    <div style="font-size: 30px; margin-right: 15px;">${item.icon}</div>
                    <div style="text-align: left;">
                        <div class="biome-title" style="font-size: 16px;">${item.name}</div>
                        <div style="font-size: 10px; color: #ccc;">${item.desc}</div>
                    </div>
                </div>
                <div class="biome-body">
                    <button class="camp-action-btn" style="background: ${item.color};" onclick="buyItem('${key}')">Kaufen (${item.price} ✨)</button>
                </div>
            </div>
        `;
    });
}

function renderInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;
    container.innerHTML = '';
    
    let hasItems = false;
    Object.keys(inventory).forEach(key => {
        if(inventory[key] > 0) {
            hasItems = true;
            const item = shopItems[key];
            
            let actionBtn = '';
            if(key === 'lure_normal') actionBtn = `<button class="camp-action-btn" style="background: ${item.color}; margin-top: 10px;" onclick="useItem('${key}')">Aktivieren</button>`;
            else if(key === 'starpiece') actionBtn = `<button class="camp-action-btn" style="background: ${item.color}; margin-top: 10px;" onclick="useItem('${key}')">Aktivieren</button>`;
            else actionBtn = `<div style="font-size: 10px; color: #aaa; margin-top: 5px;">Wird automatisch kontextbasiert verwendet.</div>`;

            container.innerHTML += `
                <div style="background: rgba(0,0,0,0.6); border: 2px solid ${item.color}; border-radius: 12px; padding: 15px; margin-bottom: 10px; width: 95%; max-width: 450px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 24px;">${item.icon}</div>
                        <div style="font-weight: bold; flex: 1; text-align: left; margin-left: 10px;">${item.name}</div>
                        <div style="font-weight: 900; color: #fff; background: ${item.color}; padding: 5px 10px; border-radius: 10px;">x ${inventory[key]}</div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        }
    });

    if(!hasItems) {
        container.innerHTML = `<div style="color: #aaa; font-style: italic; margin-top: 20px;">Dein Rucksack ist leer. Besuche den Shop!</div>`;
    }
}

function buyItem(itemKey) {
    const item = shopItems[itemKey];
    if(stardust < item.price) {
        showCampWillow(`Dir fehlen leider noch Sternenstaub-Reserven für ein <b>${item.name}</b>. Gehe auf Expeditionen!`);
        return;
    }
    stardust -= item.price;
    inventory[itemKey]++;
    saveInventory();
    updateStardustDisplay();
    renderInventory();
    showCampWillow(`Du hast erfolgreich 1x <b>${item.name}</b> gekauft! Es liegt jetzt in deinem Rucksack.`);
}

function useItem(itemKey) {
    if(inventory[itemKey] <= 0) return;
    
    if(itemKey === 'starpiece') {
        inventory[itemKey]--;
        starpieceActiveUntil = Date.now() + 60 * 60 * 1000; // 60 Minuten statt 30
        localStorage.setItem('pogo_starpiece_time', starpieceActiveUntil);
        saveInventory();
        renderInventory();
        checkStarpiece();
        showCampWillow("Du hast ein <b>Sternenstück</b> aktiviert! Deine Einnahmen sind nun für 60 Minuten massiv erhöht.");
    } 
    else if(itemKey === 'lure_normal') {
        startLureEncounter();
    }
}

// --- LOCKMODUL ENCOUNTER ---
let currentShopEncounterId = null;
let currentShopEncounterName = "";
let currentShopEncounterImg = "";
let currentShopEncounterBaseId = "";
let currentShopEncounterTypes = []; 

async function startLureEncounter() {
    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    let missing = [];
    for(let i=1; i<=1025; i++) { if(!dex[i]) missing.push(i); }
    
    if(missing.length === 0) {
        showCampWillow("Unglaublich! Dein Pokédex ist bereits vollständig. Ein Lockmodul würde hier nichts Neues mehr anlocken. Du bist ein wahrer Pokémon-Meister!");
        return;
    }
    
    inventory['lure_normal']--;
    saveInventory();
    renderInventory();
    
    const randomId = missing[Math.floor(Math.random() * missing.length)];
    
    document.getElementById('camp-encounter-area').style.display = 'flex';
    document.getElementById('camp-encounter-loading').style.display = 'block';
    document.getElementById('camp-encounter-img').style.display = 'none';
    document.getElementById('camp-encounter-name').innerText = "Suche...";
    document.getElementById('camp-encounter-btn').style.display = 'none';
    
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        const data = await res.json();
        
        currentShopEncounterName = data.name.toUpperCase();
        try { 
            const sRes = await fetch(data.species.url); 
            const deName = (await sRes.json()).names.find(n => n.language.name === 'de'); 
            if(deName) currentShopEncounterName = deName.name; 
        } catch(e) {}
        
        currentShopEncounterImg = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
        currentShopEncounterBaseId = data.species.url.split('/').filter(Boolean).pop();
        currentShopEncounterTypes = data.types.map(t => t.type.name);
        currentShopEncounterId = randomId;
        
        document.getElementById('camp-encounter-loading').style.display = 'none';
        document.getElementById('camp-encounter-img').src = currentShopEncounterImg;
        document.getElementById('camp-encounter-img').style.display = 'block';
        document.getElementById('camp-encounter-name').innerText = "???"; 
        document.getElementById('camp-encounter-btn').innerText = "Pokéball werfen 🔴";
        document.getElementById('camp-encounter-btn').disabled = false;
        document.getElementById('camp-encounter-btn').style.display = 'block';
        
    } catch (e) {
        showCampWillow("Das Lockmodul klemmt! Es gab einen Netzwerkfehler. Ich habe dir das Modul sicherheitshalber in den Rucksack zurückgelegt.");
        document.getElementById('camp-encounter-area').style.display = 'none';
        inventory['lure_normal']++;
        saveInventory();
        renderInventory();
    }
}

document.getElementById('camp-encounter-btn').onclick = function() {
    if(!currentShopEncounterId) return;
    
    const isCaught = true; // 100% Fangchance garantiert

    document.getElementById('camp-encounter-name').innerText = currentShopEncounterName;
    this.disabled = true;

    if(isCaught) {
        if(typeof pokedex !== 'undefined') {
            pokedex[currentShopEncounterId] = { name: currentShopEncounterName, img: currentShopEncounterImg, baseId: currentShopEncounterBaseId, types: currentShopEncounterTypes };
            localStorage.setItem('pogo_dex_v6', JSON.stringify(pokedex));
            if (window.EventBus) EventBus.emit('pokemonCaught', { id: currentShopEncounterId, data: pokedex[currentShopEncounterId] });
        }
        this.innerText = "Gefangen! 🎉";
        this.style.backgroundColor = "#2ecc71";
    }
    
    setTimeout(() => { 
        document.getElementById('camp-encounter-area').style.display = 'none'; 
        document.getElementById('camp-encounter-img').style.filter = 'drop-shadow(0 0 10px white)';
        this.style.backgroundColor = "#e74c3c";
        currentShopEncounterId = null; 
    }, 2500);
};

// --- EXPEDITIONEN ---
function renderBiomes() {
    const container = document.getElementById('biomes-container');
    if (!container) return;
    
    container.innerHTML = '';
    const now = Date.now();
    
    Object.keys(activeBiomes).forEach(zoneId => {
        const b = activeBiomes[zoneId];
        const exp = activeExpeditions[zoneId];
        
        let badgesHTML = b.types.map(t => {
            return `<div class="biome-type-badge" style="background-color: ${typeColors[t]};">
                        <img src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg">
                        ${typeTranslations[t]}
                    </div>`;
        }).join('');
        
        let cardHTML = `
            <div class="biome-card">
                <div class="biome-header">
                    <div>
                        <div class="biome-title">${b.name}</div>
                        <div class="biome-type-badges">${badgesHTML}</div>
                    </div>
                </div>
                <div class="biome-body">
        `;
        
        if (!exp) {
            cardHTML += `
                <div class="biome-status ready">Bereit für Expedition</div>
                <button class="camp-action-btn" onclick="openPokemonSelect('${zoneId}')">Pokémon senden</button>
            `;
        } else {
            const timeLeft = exp.endTime - now;
            if (timeLeft <= 0) {
                cardHTML += `
                    <div class="biome-status return">Rückkehr!</div>
                    <button class="camp-resolve-btn" onclick="resolveExpedition('${zoneId}')">Bericht ansehen</button>
                `;
            } else {
                let m = Math.floor(timeLeft / 60000);
                let s = Math.floor((timeLeft % 60000) / 1000);
                let pinapIcon = exp.hasPinap ? '🍍 ' : '';
                cardHTML += `
                    <div class="biome-status active">${pinapIcon}Unterwegs... ${m}m ${s}s</div>
                    <button class="camp-action-btn disabled" disabled>Mission läuft</button>
                `;
            }
        }
        cardHTML += `</div></div>`;
        container.innerHTML += cardHTML;
    });
}

function openPokemonSelect(zoneId) {
    currentBiomeSelect = zoneId;
    isPinapSelected = false;

    // Sananabeeren Toggle UI
    const pinapContainer = document.getElementById('pinap-toggle-container');
    const pinapBtn = document.getElementById('pinap-toggle-btn');
    if(inventory.pinap > 0) {
        pinapContainer.style.display = 'block';
        pinapBtn.innerText = `🍍 Sananabeere nutzen (${inventory.pinap} auf Lager)`;
        pinapBtn.style.background = 'transparent';
        pinapBtn.style.color = '#e67e22';
        
        pinapBtn.onclick = function() {
            isPinapSelected = !isPinapSelected;
            if(isPinapSelected) {
                this.style.background = '#e67e22';
                this.style.color = 'white';
                this.innerText = `🍍 Sananabeere AKTIV`;
            } else {
                this.style.background = 'transparent';
                this.style.color = '#e67e22';
                this.innerText = `🍍 Sananabeere nutzen (${inventory.pinap} auf Lager)`;
            }
        };
    } else {
        pinapContainer.style.display = 'none';
    }

    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    const grid = document.getElementById('camp-select-grid');
    grid.innerHTML = '';
    grid.style.display = "grid"; 
    
    let count = 0;
    for (let id in dex) {
        let pkm = dex[id];
        if(!pkm) continue;
        
        let pName = pkm.name || 'Unbekannt';
        let pImg = pkm.img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
        const isBusy = Object.values(activeExpeditions).some(e => String(e.pkmId) === String(id));
        const isExhausted = exhausted.includes(String(id));
        
        if(!isBusy) {
            count++;
            const div = document.createElement('div');
            
            let typeHtml = '';
            if (pkm.types && Array.isArray(pkm.types)) {
                typeHtml = pkm.types.map(t => `<img class="camp-select-type-icon" style="background-color: ${typeColors[t]};" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg" title="${typeTranslations[t]}">`).join('');
            } else {
                typeHtml = `<span style="font-size: 9px; color: #aaa; text-transform: uppercase;">Lade...</span>`;
                fetchPokemonTypes(id); 
            }

            if(isExhausted) {
                div.className = 'dex-entry caught state-exhausted'; 
                div.onclick = () => handleExhaustedPokemon(id, pName);
                div.innerHTML = `
                    <img class="dex-img" src="${pImg}" alt="${pName}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
                    <div class="dex-id">#${id}</div>
                    <div class="dex-name">${pName}</div>
                    <div style="background: #e74c3c; color: white; font-size: 10px; font-weight: bold; border-radius: 10px; padding: 4px; margin-top: 8px;">ERSCHÖPFT</div>
                `;
            } else {
                div.className = 'dex-entry caught'; 
                div.style.cursor = 'pointer';
                div.style.boxShadow = "0 4px 6px rgba(0,0,0,0.5)";
                div.onclick = () => startExpedition(zoneId, id);
                div.innerHTML = `
                    <img class="dex-img" src="${pImg}" alt="${pName}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
                    <div class="dex-id">#${id}</div>
                    <div class="dex-name">${pName}</div>
                    <div class="camp-select-types" id="camp-types-${id}">${typeHtml}</div>
                    <div style="background: #2ecc71; color: white; font-size: 11px; font-weight: bold; border-radius: 10px; padding: 4px; margin-top: 8px; text-transform: uppercase; pointer-events: none;">Aussenden</div>
                `;
            }
            grid.appendChild(div);
        }
    }
    
    if(count === 0) {
        grid.style.display = "block";
        grid.innerHTML = `
            <div style="background: rgba(0,0,0,0.5); border: 2px solid #e74c3c; border-radius: 12px; padding: 20px; text-align: center; color: white; margin-top: 20px;">
                <div style="font-size: 40px; margin-bottom: 10px;">📭</div>
                <div style="font-weight: 900; font-size: 18px; margin-bottom: 10px; color: #e74c3c;">Keine freien Pokémon!</div>
                <div style="font-size: 14px; color: #ccc; margin-bottom: 20px;">Du hast entweder noch keine Pokémon gefangen, oder dein komplettes Team ist bereits auf einer Expedition.</div>
                <button class="camp-action-btn" onclick="showScreen('screen-menu')">Zum Training</button>
            </div>
        `;
    }
    showScreen('screen-camp-select');
}

function handleExhaustedPokemon(id, name) {
    if(inventory.revive > 0) {
        showJoy(`Hallo Trainer! <br><b>${name}</b> ist nach der Mission völlig erschöpft. <br><br>Möchtest du einen deiner <b>${inventory.revive} Beleber</b> einsetzen, um es zu heilen?`, () => {
            inventory.revive--;
            exhausted = exhausted.filter(e => e !== String(id));
            localStorage.setItem('pogo_exhausted_v1', JSON.stringify(exhausted));
            saveInventory();
            openPokemonSelect(currentBiomeSelect); // Refresh
            showCampWillow(`<b>${name}</b> ist wieder fit und bereit für die nächste Expedition!`);
        });
    } else {
        showCampWillow(`<b>${name}</b> ist nach einer schweren Expedition extrem erschöpft. Du benötigst einen Beleber aus dem Shop, um es wieder einsatzbereit zu machen.`);
    }
}

async function startExpedition(zoneId, pkmId) {
    const grid = document.getElementById('camp-select-grid');
    grid.style.display = "block";
    grid.innerHTML = '<div style="color: #ffcb05; text-align: center; font-weight: bold; font-size: 18px; padding: 40px;">Bereite Expedition vor... ⏳</div>';
    
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pkmId}`);
        if(!res.ok) throw new Error("API Limit");
        
        const data = await res.json();
        const pkmTypes = data.types.map(t => t.type.name);
        const now = Date.now();
        
        let hasPinap = false;
        if(isPinapSelected && inventory.pinap > 0) {
            inventory.pinap--;
            saveInventory();
            hasPinap = true;
        }

        activeExpeditions[zoneId] = { 
            pkmId: pkmId, 
            pkmName: data.name, 
            pkmTypes: pkmTypes, 
            endTime: now + EXP_DURATION,
            hasPinap: hasPinap 
        };
        
        localStorage.setItem('pogo_expeditions_v3', JSON.stringify(activeExpeditions));
        showScreen('screen-camp');
        renderBiomes();
    } catch(e) {
        showCampWillow("Mein Radar ist gestört! Bitte versuche es noch einmal.");
        openPokemonSelect(zoneId);
    }
}

function rollNewBiome(zoneId) {
    const activeNames = Object.values(activeBiomes).map(b => b.name);
    let available = biomeTemplates.filter(b => !activeNames.includes(b.name));
    if(available.length === 0) available = biomeTemplates; 
    const randomBiome = available[Math.floor(Math.random() * available.length)];
    activeBiomes[zoneId] = randomBiome;
    localStorage.setItem('pogo_active_biomes_v3', JSON.stringify(activeBiomes));
}

function resolveExpedition(zoneId) {
    const exp = activeExpeditions[zoneId];
    const b = activeBiomes[zoneId];
    
    let incomingDamage = 1; 
    for(let bType of b.types) {
        for(let pType of exp.pkmTypes) {
            if(typeChart[bType] && typeChart[bType][pType] !== undefined) {
                incomingDamage *= typeChart[bType][pType];
            }
        }
    }
    
    let outgoingDamage = 1; 
    for(let pType of exp.pkmTypes) {
        for(let bType of b.types) {
            if(typeChart[pType] && typeChart[pType][bType] !== undefined) {
                outgoingDamage *= typeChart[pType][bType];
            }
        }
    }
    
    // Berechne Ertrag mit Buffs
    let finalDust = b.baseDust;
    if (outgoingDamage > 1) finalDust *= 2; // Guter Konter = Doppelter Base Dust
    if (exp.hasPinap) finalDust *= 2; // Sananabeere verdoppelt
    if (Date.now() < starpieceActiveUntil) finalDust = Math.floor(finalDust * 1.5); // Sternenstück +50%

    if (incomingDamage > 1) {
        // FATAL FAILURE: Pokémon wird erschöpft
        exhausted.push(String(exp.pkmId));
        localStorage.setItem('pogo_exhausted_v1', JSON.stringify(exhausted));
        showCampWillow(`Oh nein! <b>${b.name}</b> war zu gefährlich. Dein Pokémon hat katastrophal verloren und kam ohne Sternenstaub zurück. Es ist nun <b>erschöpft</b> und benötigt einen Beleber.`);
    } else if (outgoingDamage > 1) {
        stardust += finalDust;
        let pinapText = exp.hasPinap ? " (inklusive Sananabeeren-Bonus)" : "";
        showCampWillow(`Hervorragende Wahl, Trainer! Dein Pokémon war der perfekte Konter und hat die Zone dominiert. Es bringt sensationelle <b>${finalDust} ✨</b> mit${pinapText}!`);
    } else {
        stardust += finalDust;
        let pinapText = exp.hasPinap ? " Dank der Sananabeere hast du extra verdient." : "";
        showCampWillow(`Gute Arbeit! Die Expedition in <b>${b.name}</b> war solide. Dein Teammitglied hat <b>${finalDust} ✨</b> für dich gesammelt.${pinapText}`);
    }
    
    delete activeExpeditions[zoneId];
    rollNewBiome(zoneId);
    
    localStorage.setItem('pogo_expeditions_v3', JSON.stringify(activeExpeditions));
    updateStardustDisplay();
    renderBiomes();
}

async function fetchPokemonTypes(id) {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await res.json();
        const types = data.types.map(t => t.type.name);
        
        let dex = JSON.parse(localStorage.getItem('pogo_dex_v6')) || {};
        if(dex[id]) {
            dex[id].types = types;
            localStorage.setItem('pogo_dex_v6', JSON.stringify(dex));
            const container = document.getElementById(`camp-types-${id}`);
            if(container) { container.innerHTML = types.map(t => `<img class="camp-select-type-icon" style="background-color: ${typeColors[t]};" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg" title="${typeTranslations[t]}">`).join(''); }
            if(typeof pokedex !== 'undefined') pokedex = dex; 
        }
    } catch(e) {}
}