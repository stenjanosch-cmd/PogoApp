// ==============================================
// DATEI: game-sortieren.js
// ==============================================

const metaPvEPool = [3,6,9,68,149,150,248,260,373,376,382,383,384,448,464,483,484,487,530,635,643,644,798,800];
const costumePool = [1,4,7,25,52,94,133,143,172,175,471,710]; 
const legendaryPool = [144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494];

let currentSortMon = { id: null, name: "", isCrypto: false, isShiny: false, isEvent: false, isSpecialBg: false, isMeta: false, isLegendary: false };
let isAnimating = false;

function startSortGame() { 
    showScreen('screen-sort'); 
    loadNextSortPokemon(); 
}

async function loadNextSortPokemon() {
    if(isAnimating) return;
    const card = document.getElementById('sort-card'); const img = document.getElementById('sort-img'); const nameEl = document.getElementById('sort-name');
    card.className = "sort-card"; card.style.transform = "translate(0px, 0px)"; card.style.opacity = "1";
    img.style.display = "none"; nameEl.innerText = "Sondiere Box...";

    const id = Math.floor(Math.random() * 1025) + 1; // Voller Pool!
    currentSortMon = { id: id, isMeta: metaPvEPool.includes(id), isLegendary: legendaryPool.includes(id), isCrypto: Math.random() < 0.15, isShiny: Math.random() < 0.15, isSpecialBg: Math.random() < 0.10, isEvent: costumePool.includes(id) ? Math.random() < 0.40 : false };

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`); const data = await res.json();
        let pName = data.name.toUpperCase();
        try { const sRes = await fetch(data.species.url); const de = (await sRes.json()).names.find(n => n.language.name === 'de'); if (de) pName = de.name; } catch(e) {}
        currentSortMon.name = pName; nameEl.innerText = pName;
        let imgSrc = (currentSortMon.isShiny && data.sprites.other['official-artwork'].front_shiny) ? data.sprites.other['official-artwork'].front_shiny : data.sprites.other['official-artwork'].front_default;
        if (!imgSrc) imgSrc = data.sprites.front_default;
        img.src = imgSrc; img.onload = () => { img.style.display = "block"; };
        
        if(currentSortMon.isCrypto) card.classList.add('state-crypto'); if(currentSortMon.isShiny) card.classList.add('state-shiny');
        if(currentSortMon.isEvent) card.classList.add('state-event'); if(currentSortMon.isSpecialBg) card.classList.add('state-bg');
    } catch(e) { setTimeout(() => loadNextSortPokemon(), 500); }
}

function handleSortAction(action) {
    if(isAnimating) return; isAnimating = true;
    let correctActions = []; let reason = "";
    
    if (currentSortMon.isShiny || currentSortMon.isSpecialBg || currentSortMon.isEvent) {
        correctActions = ['keep', 'trade'];
        reason = currentSortMon.isShiny ? "Ein Shiny! ✨ Extrem selten. Behalte es oder nutze es für einen Glückstausch mit deiner Schwester." : (currentSortMon.isSpecialBg ? "Dieses Pokémon hat einen Spezial-Hintergrund! Extrem selten, niemals wegwerfen." : "Event-Kostüme sind limitiert! Perfekt für die eigene Sammlung oder zum Tauschen.");
    } else if (currentSortMon.isCrypto) {
        if (currentSortMon.isMeta) { correctActions = ['keep']; reason = `Ein Crypto-${currentSortMon.name} ist ein brutaler Raid-Angreifer! Cryptos kann man nicht tauschen, also unbedingt behalten!`; } 
        else { correctActions = ['transfer']; reason = "Ein schlechtes Crypto ohne Raid-Nutzen. Da Cryptos nicht getauscht werden können: Erlösen für die Medaille oder direkt verschicken!"; }
    } else if (currentSortMon.isLegendary) {
        correctActions = ['keep', 'trade']; reason = "Ein Legendäres/Mystisches Pokémon! Gute Werte behältst du für Raids, schlechte tauschst du für XL-Sonderbonbons.";
    } else if (currentSortMon.isMeta) {
        correctActions = ['keep', 'trade']; reason = "Ein starker PvE-Angreifer! Behalte es für dein Raid-Team, oder tausche es, falls die Werte schlecht sind.";
    } else {
        correctActions = ['transfer', 'trade']; reason = "Kein Meta-Pokémon und nichts Besonderes. Falls du Platz brauchst -> Verschicken. Alternativ: Tauschen zum XL-Bonbons Farmen.";
    }

    const card = document.getElementById('sort-card');
    if(action === 'transfer') card.style.transform = "translate(-200px, 0px) rotate(-15deg)";
    if(action === 'trade') card.style.transform = "translate(200px, 0px) rotate(15deg)";
    if(action === 'keep') card.style.transform = "translate(0px, -200px) scale(1.1)";
    
    setTimeout(() => {
        if (correctActions.includes(action)) { card.classList.add('anim-catch'); addXp(15); setTimeout(() => { isAnimating = false; loadNextSortPokemon(); }, 600); } 
        else { card.classList.add('anim-flee'); setTimeout(() => showWillow(reason), 400); }
    }, 200);
}

function showWillow(text) { document.getElementById('willow-text').innerText = text; document.getElementById('willow-overlay').classList.add('active'); }
function closeWillow() { document.getElementById('willow-overlay').classList.remove('active'); isAnimating = false; loadNextSortPokemon(); }

const sortTouchCard = document.getElementById('sort-card');
let sTouchStartX = 0; let sTouchStartY = 0; let sTouchCurrentX = 0; let sTouchCurrentY = 0; let sIsDragging = false;
sortTouchCard.addEventListener('touchstart', e => { if(isAnimating) return; sIsDragging = true; sTouchStartX = e.touches[0].clientX; sTouchStartY = e.touches[0].clientY; sortTouchCard.style.transition = 'none'; }, {passive: true});
sortTouchCard.addEventListener('touchmove', e => { if(!sIsDragging || isAnimating) return; sTouchCurrentX = e.touches[0].clientX - sTouchStartX; sTouchCurrentY = e.touches[0].clientY - sTouchStartY; sortTouchCard.style.transform = `translate(${sTouchCurrentX}px, ${sTouchCurrentY}px) rotate(${sTouchCurrentX * 0.05}deg)`; }, {passive: true});
sortTouchCard.addEventListener('touchend', e => {
    if(!sIsDragging || isAnimating) return; sIsDragging = false; sortTouchCard.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; 
    if (sTouchCurrentY < -80 && Math.abs(sTouchCurrentY) > Math.abs(sTouchCurrentX)) handleSortAction('keep');
    else if (sTouchCurrentX > 80) handleSortAction('trade');
    else if (sTouchCurrentX < -80) handleSortAction('transfer');
    else sortTouchCard.style.transform = 'translate(0px, 0px) rotate(0deg)';
    sTouchCurrentX = 0; sTouchCurrentY = 0;
});