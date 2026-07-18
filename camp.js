let stardust = parseInt(localStorage.getItem('pogo_stardust')) || 0;
let activeExpeditions = JSON.parse(localStorage.getItem('pogo_expeditions')) || {};

const EXP_DURATION = 10 * 60 * 1000; // 10 Minuten

const biomes = {
    vulkan: { name: "Vulkan", types: ["fire", "rock"], baseDust: 150 },
    tiefsee: { name: "Tiefsee", types: ["water", "ice"], baseDust: 150 },
    spukwald: { name: "Spukwald", types: ["ghost", "poison"], baseDust: 150 },
    kraftwerk: { name: "Kraftwerk", types: ["electric", "steel"], baseDust: 150 }
};

let currentBiomeSelect = null;
let campTimer = null;

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
    
    Object.keys(biomes).forEach(biomeId => {
        const b = biomes[biomeId];
        const exp = activeExpeditions[biomeId];
        
        // Generiert die offiziellen Typ-Badges in Pokémon GO Optik
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
                <button class="camp-action-btn" onclick="openPokemonSelect('${biomeId}')">Pokémon senden</button>
            `;
        } else {
            const timeLeft = exp.endTime - now;
            if (timeLeft <= 0) {
                cardHTML += `
                    <div class="biome-status return">Rückkehr!</div>
                    <button class="camp-resolve-btn" onclick="resolveExpedition('${biomeId}')">Bericht ansehen</button>
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

function openPokemonSelect(biomeId) {
    currentBiomeSelect = biomeId;
    
    // Fallback: Holt Daten sicher
    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    const grid = document.getElementById('camp-select-grid');
    grid.innerHTML = '';
    grid.style.display = "grid"; 
    
    let count = 0;
    
    // Die Schleife ist jetzt extrem fehlertolerant gebaut
    for (let id in dex) {
        let pkm = dex[id];
        if(!pkm) continue;
        
        // Fallback falls der Import korrupt ist
        let pName = pkm.name || 'Unbekannt';
        let pImg = pkm.img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
        
        // Strikte String-Prüfung, um Fehler bei unterschiedlichen Daten-Typen zu vermeiden
        const isBusy = Object.values(activeExpeditions).some(e => String(e.pkmId) === String(id));
        
        if(!isBusy) {
            count++;
            const div = document.createElement('div');
            // Nutzt exakt dein Pokedex-Klassen-Design für 100% korrekte Darstellung!
            div.className = 'dex-entry caught'; 
            div.style.cursor = 'pointer';
            div.style.boxShadow = "0 4px 6px rgba(0,0,0,0.5)";
            div.onclick = () => startExpedition(biomeId, id);
            
            div.innerHTML = `
                <img class="dex-img" src="${pImg}" alt="Pokemon" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
                <div class="dex-id">#${id}</div>
                <div class="dex-name">${pName}</div>
                <div style="background: #2ecc71; color: white; font-size: 11px; font-weight: bold; border-radius: 10px; padding: 4px; margin-top: 8px; text-transform: uppercase;">Aussenden</div>
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
    
    // Nutzt das native App-Routing anstelle des Modals!
    showScreen('screen-camp-select');
}

async function startExpedition(biomeId, pkmId) {
    const grid = document.getElementById('camp-select-grid');
    grid.style.display = "block";
    grid.innerHTML = '<div style="color: #ffcb05; text-align: center; font-weight: bold; font-size: 18px; padding: 40px;">Bereite Expedition vor... ⏳</div>';
    
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pkmId}`);
        if(!res.ok) throw new Error("API Limit erreicht");
        
        const data = await res.json();
        const pkmTypes = data.types.map(t => t.type.name);
        
        const now = Date.now();
        activeExpeditions[biomeId] = {
            pkmId: pkmId,
            pkmName: data.name,
            pkmTypes: pkmTypes,
            endTime: now + EXP_DURATION
        };
        
        localStorage.setItem('pogo_expeditions', JSON.stringify(activeExpeditions));
        showScreen('screen-camp');
        renderBiomes();
    } catch(e) {
        alert("Fehler beim Laden aus der PokeAPI. Bitte nochmal versuchen.");
        openPokemonSelect(biomeId);
    }
}

function resolveExpedition(biomeId) {
    const exp = activeExpeditions[biomeId];
    const b = biomes[biomeId];
    
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
        alert(`Fatale Schwäche! Dein Pokémon wurde vom Biom überwältigt und ist ohne Sternenstaub geflüchtet.`);
    } else if (outgoingDamage > 1) {
        let earned = b.baseDust * 2;
        stardust += earned;
        alert(`Perfekter Konter! Dein Pokémon hat die Zone dominiert. Du erhältst ${earned} ✨!`);
    } else {
        stardust += b.baseDust;
        alert(`Expedition erfolgreich. Dein Pokémon hat ${b.baseDust} ✨ gefunden.`);
    }
    
    delete activeExpeditions[biomeId];
    localStorage.setItem('pogo_expeditions', JSON.stringify(activeExpeditions));
    updateStardustDisplay();
    renderBiomes();
}

let currentShopEncounterId = null;
let currentShopEncounterName = "";
let currentShopEncounterImg = "";
let currentShopEncounterBaseId = "";

async function buyLure() {
    if(stardust < 500) {
        alert("Du hast nicht genug Sternenstaub!");
        return;
    }
    
    const dex = (typeof pokedex !== 'undefined') ? pokedex : (JSON.parse(localStorage.getItem('pogo_dex_v6')) || {});
    let missing = [];
    for(let i=1; i<=1025; i++) {
        if(!dex[i]) missing.push(i);
    }
    
    if(missing.length === 0) {
        alert("Dein Pokédex ist komplett! Wahnsinn!");
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
        alert("Netzwerk-Fehler beim Anlocken!");
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