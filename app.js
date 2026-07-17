// ==============================================
// DATEI: app.js
// ==============================================

// Service Worker neutralisieren (Verhindert hartnäckige Cache-Probleme bei Updates)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) { registration.unregister(); }
    });
}

function playIntro() {
    const overlay = document.getElementById('intro-overlay');
    const video = document.getElementById('intro-video');
    const startBtn = document.getElementById('start-btn');

    startBtn.style.display = 'none';
    video.style.display = 'block';
    video.style.opacity = '1';

    // Setzt das Video immer auf Anfang zurück und stellt sicher, dass der Ton an ist
    video.currentTime = 0; 
    video.muted = false; 

    // Robustes Starten des Videos mit Fehlerabfang (wichtig für Handys)
    let playPromise = video.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
            // Video läuft erfolgreich
        }).catch(error => {
            console.error("Video konnte nicht gestartet werden:", error);
            // Fallback: Beendet das Intro sofort, damit man nicht im schwarzen Bildschirm festhängt
            closeIntro(); 
        });
    }

    // Wenn das Video fertig ist, schließe das Intro
    video.onended = () => closeIntro();
}

function closeIntro() {
    const overlay = document.getElementById('intro-overlay');
    const video = document.getElementById('intro-video');
    
    video.pause();
    video.style.opacity = '0';
    
    setTimeout(() => {
        overlay.style.display = 'none';
        video.style.display = 'none';
    }, 300);
}

// Hintergrund-Logik
function setDynamicBackground(screenId, mode) {
    let bg = 'Pokemon_world_landscape_rolling_…_202607141413.jpeg'; 
    if (screenId === 'screen-sort') bg = 'Pokémon_storage_room_UI_202607161335.jpeg';
    else if (screenId === 'screen-game' && ['attack','defend','guess','weather'].includes(mode)) bg = 'Pokémon_training_gym_interior_202607161334.jpeg';
    else if (screenId === 'screen-game' && ['rocket','radar','hardcore'].includes(mode)) bg = 'Pokémon_battle_stadium_combat_field_202607161335.jpeg';
    else if (screenId === 'screen-cheatsheet' || screenId === 'screen-pokedex') bg = 'Tools_and_Sammlung_room_202607161335.jpeg';
    document.body.style.backgroundImage = `url('${bg}')`;
}

// Ball Icons & Trainer Logic
const iconPokeball = `<img src="https://archives.bulbagarden.net/media/upload/9/93/Bag_Pok%C3%A9_Ball_Sprite.png" width="16" style="vertical-align: middle;">`;
let trainerXp = parseInt(localStorage.getItem('pogo_xp_v7')) || 0;
let pokedex = JSON.parse(localStorage.getItem('pogo_dex_v7')) || {};
const titlesArr = [{ lvl: 1, name: "Pokémon-Fan" }, { lvl: 100, name: "Pokémon-Meister" }];

function updateTrainerCard() {
    let lvl = Math.floor(Math.sqrt(trainerXp / 50)) + 1;
    document.getElementById('trainer-lvl').innerText = lvl;
    document.getElementById('xp-fill').style.width = (Math.min((trainerXp % 50) * 2, 100)) + '%';
    document.getElementById('xp-text').innerText = `${trainerXp} XP`;
}

function addXp(amount) { 
    trainerXp += amount; 
    localStorage.setItem('pogo_xp_v7', trainerXp); 
    updateTrainerCard(); 
}

updateTrainerCard();

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    setDynamicBackground(screenId, null);
}

// Spiel-Mechaniken
let currentMode = 'attack'; 
let currentPokemonTypes = []; 
let currentEnemyAttackType = ''; 
let currentPokemonId = null; 
let currentBaseId = null; 
let currentPokemonName = ''; 
let currentPokemonImg = ''; 
let firstAttempt = true;

const typeTranslations = { normal: "Normal", fire: "Feuer", water: "Wasser", electric: "Elektro", grass: "Pflanze", ice: "Eis", fighting: "Kampf", poison: "Gift", ground: "Boden", flying: "Flug", psychic: "Psycho", bug: "Käfer", rock: "Gestein", ghost: "Geist", dragon: "Drache", dark: "Unlicht", steel: "Stahl", fairy: "Fee" };
const typeColors = { normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705898', steel: '#B7B7CE', fairy: '#D685AD' };
const typeChart = { normal: { rock: 0.625, ghost: 0.39, steel: 0.625 }, fire: { fire: 0.625, water: 0.625, grass: 1.6, ice: 1.6, bug: 1.6, rock: 0.625, dragon: 0.625, steel: 1.6 }, water: { fire: 1.6, water: 0.625, grass: 0.625, ground: 1.6, rock: 1.6, dragon: 0.625 }, electric: { water: 1.6, electric: 0.625, grass: 0.625, ground: 0.39, flying: 1.6, dragon: 0.625 }, grass: { fire: 0.625, water: 1.6, grass: 0.625, poison: 0.625, ground: 1.6, flying: 0.625, bug: 0.625, rock: 1.6, dragon: 0.625, steel: 0.625 }, ice: { fire: 0.625, water: 0.625, grass: 1.6, ice: 0.625, ground: 1.6, flying: 1.6, dragon: 1.6, steel: 0.625 }, fighting: { normal: 1.6, ice: 1.6, poison: 0.625, flying: 0.625, psychic: 0.625, bug: 0.625, rock: 1.6, ghost: 0.39, dark: 1.6, steel: 1.6, fairy: 0.625 }, poison: { grass: 1.6, poison: 0.625, ground: 0.625, rock: 0.625, ghost: 0.625, steel: 0.39, fairy: 1.6 }, ground: { fire: 1.6, electric: 1.6, grass: 0.625, poison: 1.6, flying: 0.39, bug: 0.625, rock: 1.6, steel: 1.6 }, flying: { grass: 1.6, electric: 0.625, fighting: 1.6, bug: 1.6, rock: 0.625, steel: 0.625 }, psychic: { fighting: 1.6, poison: 1.6, psychic: 0.625, dark: 0.39, steel: 0.625 }, bug: { fire: 0.625, grass: 1.6, fighting: 0.625, poison: 0.625, flying: 0.625, psychic: 1.6, ghost: 0.625, dark: 1.6, steel: 0.625, fairy: 0.625 }, rock: { fire: 1.6, ice: 1.6, fighting: 0.625, ground: 0.625, flying: 1.6, bug: 1.6, steel: 0.625 }, ghost: { normal: 0.39, psychic: 1.6, ghost: 1.6, dark: 0.625 }, dragon: { dragon: 1.6, steel: 0.625, fairy: 0.39 }, dark: { fighting: 0.625, psychic: 1.6, ghost: 1.6, dark: 0.625, fairy: 0.625 }, steel: { fire: 0.625, water: 0.625, electric: 0.625, ice: 1.6, rock: 1.6, fairy: 1.6 }, fairy: { fire: 0.625, fighting: 1.6, poison: 0.625, dragon: 1.6, dark: 1.6, steel: 0.625 } };

function startGame(mode) { 
    currentMode = mode; 
    showScreen('screen-game'); 
    setDynamicBackground('screen-game', mode); 
    fetchNextEncounter(); 
}

function setupButtons() { 
    const btnContainer = document.getElementById("buttons"); 
    if(!btnContainer) return; 
    
    Object.keys(typeTranslations).forEach(type => { 
        let btn = document.createElement("button"); 
        btn.className = "type-btn"; 
        btn.id = "btn-" + type; 
        btn.onclick = () => checkAnswer(type); 
        btn.innerHTML = typeTranslations[type]; 
        btnContainer.appendChild(btn); 
    }); 
}

setupButtons();

function fetchNextEncounter() { 
    fetchRandomPokemon(); 
}

async function fetchRandomPokemon() {
    currentPokemonId = Math.floor(Math.random() * 1025) + 1;
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${currentPokemonId}`); 
    const data = await response.json();
    
    currentPokemonTypes = data.types.map(t => t.type.name);
    currentPokemonName = data.name.toUpperCase();
    
    document.getElementById("pokemon-name").innerText = currentPokemonName;
    document.getElementById("loading").style.display = "none";
    document.getElementById("pokemon-image").src = data.sprites.other['official-artwork'].front_default;
    document.getElementById("pokemon-image").style.display = "block";
}

function checkAnswer(userSelectedType) {
    if (currentPokemonTypes.includes(userSelectedType)) { 
        addXp(10); 
        alert("Richtig!"); 
    } else { 
        alert("Falsch!"); 
    }
    fetchNextEncounter();
}