/* ============================================== */
/* DATEI START: sort.js (Behalten oder Weg Modus) */
/* ============================================== */

// Datenbank für die speziellen Kategorien (Dyna-Pokémon entfernt)
const SORT_CATEGORIES = {
    // Kostenlose Entwicklungen nach Tausch
    freeEvo: [
        63, 64, 65,          // Abra, Kadabra, Simsala
        66, 67, 68,          // Machollo, Maschock, Machomei
        74, 75, 76,          // Kleinstein, Georok, Geowaz
        92, 93, 94,          // Nebulak, Alpollo, Gengar
        524, 525, 526,       // Kiesling, Sedimantur, Brockoloss
        532, 533, 534,       // Praktibalk, Strepoli, Meistagrif
        588, 589,            // Laukaps, Cavalanzas
        616, 617,            // Schnuthelm, Hydragil
        708, 709,            // Paragoni, Trombork
        710, 711             // Irrbis, Pumpdjinn
    ],
    
    // Pseudo-Legendäre für garantierte XL-Bonbons bei Fern-Tausch
    pseudo: [
        147, 148, 149,       // Dratini, Dragonir, Dragoran
        246, 247, 248,       // Larvitar, Pupitar, Despotar
        371, 372, 373,       // Kindwurm, Draschel, Brutalanda
        374, 375, 376,       // Tanhel, Metang, Metagross
        443, 444, 445,       // Kaumalat, Knarksel, Knakrack
        633, 634, 635,       // Kapuno, Duodino, Trikephalo
        704, 705, 706,       // Viscora, Viscargot, Viscogon
        782, 783, 784,       // Miniras, Mediras, Grandiras
        885, 886, 887,       // Grolldra, Phantroll, Katapuldra
        996, 997, 998        // Frospino, Cryospino, Espinodon
    ], 
    
    // PvP Meta - Enorm begehrte Tauschobjekte für andere Spieler
    pvp: [
        307, 308,            // Meditie, Meditalis
        108, 463,            // Schlurp, Schlurplek
        703,                 // Rocara
        302,                 // Zobiris
        183, 184,            // Marill, Azumarill
        227,                 // Panzaeron
        339, 340,            // Schmerbe, Welsar
        133, 197,            // Evoli, Nachtara
        258, 259, 260,       // Hydropi, Moorabbel, Sumpex
        207, 472,            // Skorgla, Skorgro
        410, 411             // Schilterus, Bollterus
    ],
    
    // Top Raid-Angreifer - Unbedingt behalten!
    raid: [
        150, 384, 382, 383,  // Mewtu, Rayquaza, Kyogre, Groudon
        448, 464, 487, 483,  // Lucario, Rihornior, Giratina, Dialga
        484, 643, 644, 798,  // Palkia, Reshiram, Zekrom, Katagami
        130, 257, 243, 244,  // Garados, Lohgock, Raikou, Entei
        462, 485, 408, 409   // Magnezone, Heatran, Koknodon, Rameidon
    ]
};

// Alte Event-Pools beibehalten
const costumePool = [1,4,7,25,52,94,133,143,172,175,471,710]; 
const legendaryPool = [144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494];

let currentSortMon = { id: null, name: "", isCrypto: false, isShiny: false, isEvent: false, isSpecialBg: false, isLegendary: false };
let isAnimating = false;

// Start-Funktion
function startSortGame() { 
    if (typeof showScreen === 'function') showScreen('screen-sort'); 
    loadNextSortPokemon(); 
}

async function loadNextSortPokemon() {
    if(isAnimating) return;
    
    const card = document.getElementById('sort-card'); 
    const img = document.getElementById('sort-img'); 
    const nameEl = document.getElementById('sort-name');
    
    // Karte zurücksetzen
    card.className = "sort-card"; 
    card.style.transform = "translate(0px, 0px) rotate(0deg)"; 
    card.style.opacity = "1";
    card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    
    img.style.display = "none"; 
    nameEl.innerText = "Sondiere Box...";

    let id;
    // 75% Chance auf Relevanz aus unseren Listen, 25% komplett zufällig
    if (Math.random() < 0.75) {
        const allImportantIds = [
            ...SORT_CATEGORIES.freeEvo, 
            ...SORT_CATEGORIES.pseudo, 
            ...SORT_CATEGORIES.pvp, 
            ...SORT_CATEGORIES.raid
        ];
        id = allImportantIds[Math.floor(Math.random() * allImportantIds.length)];
    } else {
        id = Math.floor(Math.random() * 800) + 1; 
    }

    currentSortMon = { 
        id: id, 
        isLegendary: legendaryPool.includes(id), 
        isCrypto: Math.random() < 0.15, 
        isShiny: Math.random() < 0.15, 
        isSpecialBg: Math.random() < 0.10, 
        isEvent: costumePool.includes(id) ? Math.random() < 0.40 : false 
    };

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`); 
        const data = await res.json();
        
        let pName = data.name.toUpperCase();
        try { 
            const sRes = await fetch(data.species.url); 
            const de = (await sRes.json()).names.find(n => n.language.name === 'de'); 
            if (de) pName = de.name; 
        } catch(e) {}
        
        currentSortMon.name = pName; 
        nameEl.innerText = pName;
        
        // Zurück zur ursprünglichen Grafik-Logik (Artworks & Default Sprites)
        let imgSrc = (currentSortMon.isShiny && data.sprites.other['official-artwork'].front_shiny) ? data.sprites.other['official-artwork'].front_shiny : data.sprites.other['official-artwork'].front_default;
        if (!imgSrc) imgSrc = data.sprites.front_default;
        
        img.src = imgSrc; 
        img.onload = () => { img.style.display = "block"; };
        
        // Optische Effekte aus der alten Logik beibehalten
        if(currentSortMon.isCrypto) card.classList.add('state-crypto'); 
        if(currentSortMon.isShiny) card.classList.add('state-shiny');
        if(currentSortMon.isEvent) card.classList.add('state-event'); 
        if(currentSortMon.isSpecialBg) card.classList.add('state-bg');
        
    } catch(e) { 
        setTimeout(() => loadNextSortPokemon(), 500); 
    }
}

function handleSortAction(action) {
    if(isAnimating) return; 
    isAnimating = true;
    
    let correctActions = []; 
    let reason = "";
    const pid = currentSortMon.id;
    
    // 1. Zuerst die speziellen Modifier prüfen (wie in der alten Logik)
    if (currentSortMon.isShiny || currentSortMon.isSpecialBg || currentSortMon.isEvent) {
        correctActions = ['keep', 'trade'];
        reason = currentSortMon.isShiny ? "Ein Shiny! ✨ Extrem selten. Behalte es für deine Sammlung oder nutze es für einen Glückstausch." : (currentSortMon.isSpecialBg ? "Dieses Pokémon hat einen Spezial-Hintergrund! Extrem selten, niemals wegwerfen." : "Event-Kostüme sind limitiert! Perfekt für die eigene Sammlung oder zum Tauschen.");
    } 
    else if (currentSortMon.isCrypto) {
        if (SORT_CATEGORIES.raid.includes(pid)) { 
            correctActions = ['keep']; 
            reason = `Ein Crypto-${currentSortMon.name} ist ein brutaler Raid-Angreifer! Cryptos kann man nicht tauschen, also unbedingt behalten!`; 
        } 
        else { 
            correctActions = ['transfer']; 
            reason = "Ein schlechtes Crypto ohne Raid-Nutzen. Da Cryptos nicht getauscht werden können: Erlösen für die Medaille oder direkt verschicken!"; 
        }
    } 
    // 2. Dann die spezifischen Screenshot-Regeln anwenden
    else if (SORT_CATEGORIES.raid.includes(pid) || currentSortMon.isLegendary) {
        correctActions = ['keep', 'trade'];
        reason = "Ein grandioser Raid-Angreifer oder Legendäres Pokémon! Gute Werte behalten und pushen, schlechte für XL-Sonderbonbons eintauschen.";
    } 
    else if (SORT_CATEGORIES.freeEvo.includes(pid)) {
        correctActions = ['trade'];
        reason = "Kostenlose Entwicklung! Dieses Pokémon (und seine Vorstufen) kostet nach einem Tausch 0 Bonbons für die Entwicklung!";
    } 
    else if (SORT_CATEGORIES.pseudo.includes(pid)) {
        correctActions = ['trade'];
        reason = "Ein Pseudo-Legendäres! Tausche diese über weite Distanzen (über 100km), um garantiert wertvolle XL-Bonbons zu sammeln.";
    } 
    else if (SORT_CATEGORIES.pvp.includes(pid)) {
        correctActions = ['trade'];
        reason = "Dieses Pokémon ist ein absolutes PvP-Biest. Tausche es an andere Spieler ab, um im Gegenzug starke Raid-Konter für dich zu bekommen!";
    } 
    else {
        correctActions = ['transfer', 'trade']; 
        reason = "Kein Meta-Pokémon und nichts Besonderes. Falls du Platz brauchst -> Verschicken. Alternativ: Tauschen zum XL-Bonbons Farmen.";
    }

    const card = document.getElementById('sort-card');
    
    // Visuelle Wisch-Animation anwenden
    if(action === 'transfer') card.style.transform = "translate(-200px, 0px) rotate(-15deg)";
    if(action === 'trade') card.style.transform = "translate(200px, 0px) rotate(15deg)";
    if(action === 'keep') card.style.transform = "translate(0px, -200px) scale(1.1)";
    
    setTimeout(() => {
        if (correctActions.includes(action)) { 
            card.classList.add('anim-catch'); 
            
            if (typeof addXp === 'function') addXp(15); 
            
            // SIGNAL SENDEN (Alte Mechanik beibehalten)
            if (window.EventBus) {
                EventBus.emit('pokemonSorted', { action: action, pokemon: currentSortMon });
            }

            setTimeout(() => { isAnimating = false; loadNextSortPokemon(); }, 600); 
        } 
        else { 
            card.classList.add('anim-flee'); 
            
            let actionText = { 'keep': 'Behalten', 'trade': 'Tauschen', 'transfer': 'Verschicken' };
            let correctText = correctActions.map(a => actionText[a]).join(" oder ");
            
            setTimeout(() => {
                showSortFeedback(`<b>Falsche Entscheidung!</b><br><br>${reason}<br><br><span style="color:#e74c3c;">Die beste Wahl wäre: <b>${correctText}</b></span>`);
            }, 400); 
        }
    }, 200);
}

// Angepasste Feedback-Funktion für die HTML-Struktur der aktuellen App
function showSortFeedback(text) { 
    const overlay = document.getElementById('camp-willow-overlay');
    const textContainer = document.getElementById('camp-willow-text');
    const hint = document.getElementById('willow-close-hint');

    textContainer.innerHTML = text;
    textContainer.innerHTML += `<br><br><button class='camp-action-btn' style='background: #3498db; padding: 10px; font-size: 12px; width: auto;' onclick='closeSortFeedback()'>Verstanden!</button>`;
    
    hint.style.display = 'none'; 
    overlay.style.display = 'flex';
    overlay.onclick = null; // Verhindert Schließen durch Klick ins Leere
}

function closeSortFeedback() { 
    document.getElementById('camp-willow-overlay').style.display = 'none'; 
    isAnimating = false; 
    loadNextSortPokemon(); 
}

// --- Wisch (Swipe) und Drag Mechanik der alten Datei ---
const sortTouchCard = document.getElementById('sort-card');
let sTouchStartX = 0; let sTouchStartY = 0; let sTouchCurrentX = 0; let sTouchCurrentY = 0; let sIsDragging = false;

if (sortTouchCard) {
    sortTouchCard.addEventListener('touchstart', e => { 
        if(isAnimating) return; 
        sIsDragging = true; 
        sTouchStartX = e.touches[0].clientX; 
        sTouchStartY = e.touches[0].clientY; 
        sortTouchCard.style.transition = 'none'; 
    }, {passive: true});
    
    sortTouchCard.addEventListener('touchmove', e => { 
        if(!sIsDragging || isAnimating) return; 
        sTouchCurrentX = e.touches[0].clientX - sTouchStartX; 
        sTouchCurrentY = e.touches[0].clientY - sTouchStartY; 
        sortTouchCard.style.transform = `translate(${sTouchCurrentX}px, ${sTouchCurrentY}px) rotate(${sTouchCurrentX * 0.05}deg)`; 
    }, {passive: true});
    
    sortTouchCard.addEventListener('touchend', e => {
        if(!sIsDragging || isAnimating) return; 
        sIsDragging = false; 
        sortTouchCard.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; 
        
        // Auswertung der Wisch-Richtung
        if (sTouchCurrentY < -80 && Math.abs(sTouchCurrentY) > Math.abs(sTouchCurrentX)) handleSortAction('keep');
        else if (sTouchCurrentX > 80) handleSortAction('trade');
        else if (sTouchCurrentX < -80) handleSortAction('transfer');
        else sortTouchCard.style.transform = 'translate(0px, 0px) rotate(0deg)';
        
        sTouchCurrentX = 0; sTouchCurrentY = 0;
    });
}