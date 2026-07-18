let stardust = parseInt(localStorage.getItem('pogo_stardust')) || 0;

const EXP_DURATION = 10 * 60 * 1000; // 10 Minuten pro Mission

// 12 verschiedene Zonen, aus denen das System dynamisch auswählt
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

// Neues Versions-Management, damit alte Datenstrukturen die App nicht crashen
let activeBiomes = JSON.parse(localStorage.getItem('pogo_active_biomes_v3'));
let activeExpeditions = JSON.parse(localStorage.getItem('pogo_expeditions_v3')) || {};

// Erstmalige Zuweisung der 4 Start-Zonen
if (!activeBiomes) {
    activeBiomes = {
        zone1: biomeTemplates[0],
        zone2: biomeTemplates[1],
        zone3: biomeTemplates[2],
        zone4: biomeTemplates[3]
    };
    localStorage.setItem('pogo_active_biomes_v3', JSON.stringify(activeBiomes));
    // Alte, inkompatible Expeditions-Daten löschen, um Abstürze zu vermeiden
    localStorage.removeItem('pogo_expeditions');
}

let currentBiomeSelect = null;
let campTimer = null;

// --- GLOBAL WILLOW POPUP FÜRS CAMP ---
function showCampWillow(text) {
    document.getElementById('camp-willow-text').innerHTML = text;
    document.getElementById('camp-willow-overlay').style.display = 'flex';
}

function closeCampWillow() {
    document.getElementById('camp-willow-overlay').style.display = 'none';
}
// --------------------------------------

function initCamp() {
    updateStardustDisplay();
    renderBiomes();
    if(campTimer) clearInterval(campTimer);
    campTimer = setInterval(renderBiomes, 1000); 
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
                cardHTML += `
                    <div class="biome-status active">Unterwegs... ${m}m ${s}s</div>
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
        
        if(!isBusy) {
            count++;
            const div = document.createElement('div');
            div.className = 'dex-entry caught'; 
            div.style.cursor = 'pointer';
            div.style.boxShadow = "0 4px 6px rgba(0,0,0,0.5)";
            
            div.onclick = () => startExpedition(zoneId, id);
            
            div.innerHTML = `
                <img class="dex-img" src="${pImg}" alt="${pName}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
                <div class="dex-id">#${id}</div>
                <div class="dex-name">${pName}</div>
                <div style="background: #2ecc71; color: white; font-size: 11px; font-weight: bold; border-radius: 10px; padding: 4px; margin-top: 8px; text-transform: uppercase; pointer-events: none;">Aussenden</div>
            `;
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
        activeExpeditions[zoneId] = {
            pkmId: pkmId,
            pkmName: data.name,
            pkmTypes: pkmTypes,
            endTime: now + EXP_DURATION
        };
        
        localStorage.setItem('pogo_expeditions_v3', JSON.stringify(activeExpeditions));
        showScreen('screen-camp');
        renderBiomes();
    } catch(e) {
        showCampWillow("Mein Radar ist gestört! Es gab einen Netzwerkfehler bei der Verbindung zum Pokédex. Bitte versuche es gleich noch einmal.");
        openPokemonSelect(zoneId);
    }
}

// Würfelt eine komplett neue Zone aus dem Pool, die aktuell noch nicht aktiv ist
function rollNewBiome(zoneId) {
    const activeNames = Object.values(activeBiomes).map(b => b.name);
    let available = biomeTemplates.filter(b => !activeNames.includes(b.name));
    
    // Fallback falls aus irgendeinem Grund alle blockiert sind
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
    
    if (incomingDamage > 1) {
        showCampWillow(`Oh nein! <b>${b.name}</b> war zu gefährlich für dein Pokémon. Es hatte einen kritischen Typ-Nachteil gegen diese Umgebung und musste leider ohne Sternenstaub flüchten. Achte nächstes Mal besser auf die Elemente!`);
    } else if (outgoingDamage > 1) {
        let earned = b.baseDust * 2;
        stardust += earned;
        showCampWillow(`Hervorragende Wahl, Trainer! Dein Pokémon war der absolute perfekte Konter für <b>${b.name}</b> und hat die Zone dominiert. Es bringt sensationelle <b>${earned} ✨</b> mit!`);
    } else {
        stardust += b.baseDust;
        showCampWillow(`Gute Arbeit! Die Expedition in <b>${b.name}</b> war solide und erfolgreich. Dein Teammitglied ist sicher zurück und hat <b>${b.baseDust} ✨</b> für dich gesammelt.`);
    }
    
    // Löscht die aktuelle Expedition und tauscht die Zone durch eine Neue aus
    delete activeExpeditions[zoneId];
    rollNewBiome(zoneId);
    
    localStorage.setItem('pogo_expeditions_v3', JSON.stringify(activeExpeditions));
    updateStardustDisplay();
    renderBiomes();
}

let currentShopEncounterId = null;
let currentShopEncounterName = "";
let currentShopEncounterImg = "";
let currentShopEncounterBaseId = "";

async function buyLure() {
    if(stardust < 500) {
        showCampWillow("Da fehlt uns leider noch das Material! Du benötigst <b>500 ✨ Sternenstaub</b>, um ein Lockmodul zu aktivieren. Schick dein Team auf weitere Expeditionen!");
        return;
    }
    
    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    let missing = [];
    for(let i=1; i<=1025; i++) {
        if(!dex[i]) missing.push(i);
    }
    
    if(missing.length === 0) {
        showCampWillow("Unglaublich! Dein Pokédex ist bereits vollständig. Ein Lockmodul würde hier nichts Neues mehr anlocken. Du bist ein wahrer Pokémon-Meister!");
        return;
    }
    
    stardust -= 500;
    updateStardustDisplay();
    
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
        currentShopEncounterId = randomId;
        
        document.getElementById('camp-encounter-loading').style.display = 'none';
        document.getElementById('camp-encounter-img').src = currentShopEncounterImg;
        document.getElementById('camp-encounter-img').style.display = 'block';
        document.getElementById('camp-encounter-name').innerText = "???"; 
        document.getElementById('camp-encounter-btn').innerText = "Pokéball werfen 🔴";
        document.getElementById('camp-encounter-btn').disabled = false;
        document.getElementById('camp-encounter-btn').style.display = 'block';
        
    } catch (e) {
        showCampWillow("Das Lockmodul klemmt! Es gab einen Netzwerkfehler. Ich habe dir deinen Sternenstaub sicherheitshalber zurückerstattet.");
        document.getElementById('camp-encounter-area').style.display = 'none';
        stardust += 500; 
        updateStardustDisplay();
    }
}

document.getElementById('camp-encounter-btn').onclick = function() {
    if(!currentShopEncounterId) return;
    
    if(typeof pokedex !== 'undefined') {
        pokedex[currentShopEncounterId] = { 
            name: currentShopEncounterName, 
            img: currentShopEncounterImg, 
            baseId: currentShopEncounterBaseId 
        };
        localStorage.setItem('pogo_dex_v6', JSON.stringify(pokedex));
    }
    
    document.getElementById('camp-encounter-name').innerText = currentShopEncounterName;
    this.innerText = "Gefangen! 🎉";
    this.disabled = true;
    
    setTimeout(() => {
        document.getElementById('camp-encounter-area').style.display = 'none';
        currentShopEncounterId = null;
    }, 2500);
};