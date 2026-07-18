if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('Service Worker Fehler', err));
}

function toggleFullscreen() {
    let elem = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log(err));
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }
}

function updateFullscreenButton() {
    const btn = document.getElementById('fullscreen-btn');
    if(btn) {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            btn.innerHTML = '✖️'; btn.style.borderColor = '#e74c3c';
        } else {
            btn.innerHTML = '🔲'; btn.style.borderColor = '#3498db';
        }
    }
}

document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
document.addEventListener('msfullscreenchange', updateFullscreenButton);

function playIntro() {
    if (typeof initAudio === 'function') initAudio();
    const overlay = document.getElementById('intro-overlay');
    const video = document.getElementById('intro-video');
    document.getElementById('start-btn').style.display = 'none';
    video.style.opacity = '1'; video.currentTime = 0; 
    
    video.onerror = () => { overlay.style.display = 'none'; if (typeof startMusicPlayer === 'function') startMusicPlayer(); };
    try {
        let playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {}).catch(error => {
                console.log("Auto-Play blockiert");
                overlay.style.display = 'none';
                if (typeof startMusicPlayer === 'function') startMusicPlayer();
            });
        }
    } catch(e) { overlay.style.display = 'none'; if (typeof startMusicPlayer === 'function') startMusicPlayer(); }
    video.onended = () => { video.style.opacity = '0'; setTimeout(() => { overlay.style.display = 'none'; if (typeof startMusicPlayer === 'function') startMusicPlayer(); }, 500); };
}

function setDynamicBackground(screenId, mode) {
    let bg = 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pokemon_world_landscape_rolling_%E2%80%A6_202607141413.jpeg?raw=true';
    if (screenId === 'screen-sort') bg = 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_storage_room_UI_202607161335.jpeg?raw=true';
    else if (screenId === 'screen-game' && ['attack','defend','guess','weather'].includes(mode)) bg = 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_training_gym_interior_202607161334.jpeg?raw=true';
    else if (screenId === 'screen-game' && ['rocket','radar','hardcore'].includes(mode)) bg = 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_battle_stadium_combat_field_202607161335.jpeg?raw=true';
    else if (['screen-cheatsheet', 'screen-pokedex', 'screen-camp', 'screen-camp-select'].includes(screenId)) bg = 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Tools_and_Sammlung_room_202607161335.jpeg?raw=true';
    document.body.style.backgroundImage = `url('${bg}')`;
}

const iconPokeball = `<img src="https://archives.bulbagarden.net/media/upload/9/93/Bag_Pok%C3%A9_Ball_Sprite.png" width="16" style="vertical-align: middle;">`;
const iconPremierball = `<img src="https://archives.bulbagarden.net/media/upload/b/b8/Bag_Premier_Ball_Sprite.png" width="16" style="vertical-align: middle;">`;
const iconHyperball = `<img src="https://archives.bulbagarden.net/media/upload/1/1c/Bag_Ultra_Ball_Sprite.png" width="16" style="vertical-align: middle;">`;
let trainerXp = parseInt(localStorage.getItem('pogo_xp_v6')) || 0;
let pokedex = JSON.parse(localStorage.getItem('pogo_dex_v6')) || {};
const titlesArr = [{ lvl: 1, name: "Pokémon-Fan" }, { lvl: 5, name: "Käfersammler" }, { lvl: 10, name: "Pfadfinder" }, { lvl: 15, name: "Teenager" }, { lvl: 20, name: "Schwarzgurt" }, { lvl: 30, name: "Veteran" }, { lvl: 40, name: "Ass-Trainer" }, { lvl: 50, name: "Arenaleiter" }, { lvl: 75, name: "Top-Vier" }, { lvl: 100, name: "Pokémon-Meister" }];

function updateTrainerCard() {
    let lvl = Math.floor(Math.sqrt(trainerXp / 50)) + 1;
    let currentLevelBaseXp = (lvl - 1) * (lvl - 1) * 50;
    let nextLevelXp = lvl * lvl * 50;
    let progress = ((trainerXp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100;
    let title = titlesArr[0].name;
    for(let t of titlesArr) { if(lvl >= t.lvl) title = t.name; }
    document.getElementById('trainer-lvl').innerText = lvl; document.getElementById('trainer-title').innerText = title;
    document.getElementById('xp-fill').style.width = progress + '%'; document.getElementById('xp-text').innerText = `${trainerXp} / ${nextLevelXp} XP`;
}
function addXp(amount) { trainerXp += amount; localStorage.setItem('pogo_xp_v6', trainerXp); updateTrainerCard(); }
updateTrainerCard();

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    setDynamicBackground(screenId, null);
    
    if(screenId === 'screen-cheatsheet' && typeof setupCheatsheet === 'function') setupCheatsheet();
    if(screenId === 'screen-camp' && typeof initCamp === 'function') initCamp();
}

let currentMode = 'attack'; let currentPokemonTypes = []; let currentEnemyAttackType = ''; let currentPokemonId = null; let currentBaseId = null; let currentPokemonName = ''; let currentPokemonImg = ''; let firstAttempt = true; let guessedTypesArray = []; let currentRocket = null; let timer = null; let timeLeft = 0; let rocketShuffleBag = [];

const typeTranslations = { normal: "Normal", fire: "Feuer", water: "Wasser", electric: "Elektro", grass: "Pflanze", ice: "Eis", fighting: "Kampf", poison: "Gift", ground: "Boden", flying: "Flug", psychic: "Psycho", bug: "Käfer", rock: "Gestein", ghost: "Geist", dragon: "Drache", dark: "Unlicht", steel: "Stahl", fairy: "Fee" };
const typeColors = { normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705898', steel: '#B7B7CE', fairy: '#D685AD' };
const typeChart = { normal: { rock: 0.625, ghost: 0.39, steel: 0.625 }, fire: { fire: 0.625, water: 0.625, grass: 1.6, ice: 1.6, bug: 1.6, rock: 0.625, dragon: 0.625, steel: 1.6 }, water: { fire: 1.6, water: 0.625, grass: 0.625, ground: 1.6, rock: 1.6, dragon: 0.625 }, electric: { water: 1.6, electric: 0.625, grass: 0.625, ground: 0.39, flying: 1.6, dragon: 0.625 }, grass: { fire: 0.625, water: 1.6, grass: 0.625, poison: 0.625, ground: 1.6, flying: 0.625, bug: 0.625, rock: 1.6, dragon: 0.625, steel: 0.625 }, ice: { fire: 0.625, water: 0.625, grass: 1.6, ice: 0.625, ground: 1.6, flying: 1.6, dragon: 1.6, steel: 0.625 }, fighting: { normal: 1.6, ice: 1.6, poison: 0.625, flying: 0.625, psychic: 0.625, bug: 0.625, rock: 1.6, ghost: 0.39, dark: 1.6, steel: 1.6, fairy: 0.625 }, poison: { grass: 1.6, poison: 0.625, ground: 0.625, rock: 0.625, ghost: 0.625, steel: 0.39, fairy: 1.6 }, ground: { fire: 1.6, electric: 1.6, grass: 0.625, poison: 1.6, flying: 0.39, bug: 0.625, rock: 1.6, steel: 1.6 }, flying: { grass: 1.6, electric: 0.625, fighting: 1.6, bug: 1.6, rock: 0.625, steel: 0.625 }, psychic: { fighting: 1.6, poison: 1.6, psychic: 0.625, dark: 0.39, steel: 0.625 }, bug: { fire: 0.625, grass: 1.6, fighting: 0.625, poison: 0.625, flying: 0.625, psychic: 1.6, ghost: 0.625, dark: 1.6, steel: 0.625, fairy: 0.625 }, rock: { fire: 1.6, ice: 1.6, fighting: 0.625, ground: 0.625, flying: 1.6, bug: 1.6, steel: 0.625 }, ghost: { normal: 0.39, psychic: 1.6, ghost: 1.6, dark: 0.625 }, dragon: { dragon: 1.6, steel: 0.625, fairy: 0.39 }, dark: { fighting: 0.625, psychic: 1.6, ghost: 1.6, dark: 0.625, fairy: 0.625 }, steel: { fire: 0.625, water: 0.625, electric: 0.625, ice: 1.6, rock: 1.6, fairy: 1.6 }, fairy: { fire: 0.625, fighting: 1.6, poison: 0.625, dragon: 1.6, dark: 1.6, steel: 0.625 } };
const weatherData = [ { id: 'sunny', name: 'Sonnig/Klar', icon: '☀️', types: ['fire', 'grass', 'ground'] }, { id: 'rain', name: 'Regen', icon: '🌧️', types: ['water', 'electric', 'bug'] }, { id: 'partly', name: 'Teilweise bewölkt', icon: '⛅', types: ['normal', 'rock'] }, { id: 'cloudy', name: 'Bedeckt', icon: '☁️', types: ['fairy', 'fighting', 'poison'] }, { id: 'windy', name: 'Windig', icon: '🪁', types: ['flying', 'dragon', 'psychic'] }, { id: 'snow', name: 'Schnee', icon: '❄️', types: ['ice', 'steel'] }, { id: 'fog', name: 'Nebel', icon: '🌫️', types: ['dark', 'ghost'] } ];
const rocketEncounters = [
    { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Meine Käfer-Pokémon sind ein Albtraum!', targetTypes: ['bug'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Keine Gnade!', targetTypes: ['dark'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Brüll!... Wie hört sich das an?', targetTypes: ['dragon'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Hier kommt ein Schocker!', targetTypes: ['electric'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Wirf einen Blick auf meine niedlichen Pokémon!', targetTypes: ['fairy'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Wir sind bereit, zuzuschlagen!', targetTypes: ['fighting'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Bist du bereit für ein heißes Match?', targetTypes: ['fire'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Mein Vogel-Pokémon will mit dir kämpfen!', targetTypes: ['flying'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Unsichtbar und doch da!', targetTypes: ['ghost'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Verstricke dich nicht in meine Angelegenheiten!', targetTypes: ['grass'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Lass dich von uns nicht in den Boden stampfen!', targetTypes: ['ground'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Mach dich bereit für ein eisiges Vergnügen!', targetTypes: ['ice'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Normal lässt sich nicht unterkriegen!', targetTypes: ['normal'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Gift ist meine Spezialität!', targetTypes: ['poison'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Bist du bereit, in ein schwarzes Loch zu blicken?', targetTypes: ['psychic'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Du wirst auf Granit beißen!', targetTypes: ['rock'] }, { type: 'grunt', gender: 'M', name: 'Rüpel', quote: 'Eisenhart!', targetTypes: ['steel'] }, { type: 'grunt', gender: 'F', name: 'Rüpel', quote: 'Diese Gewässer sind tückisch!', targetTypes: ['water'] },
    { type: 'boss', initial: 'G', img: 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Giovanni.png?raw=true', name: 'Giovanni', quote: 'Ich mache dich platt!', leads: [{name: 'Snobilikat', types: ['normal']}] }, 
    { type: 'boss', initial: 'C', img: 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Cliffs.png?raw=true', name: 'Cliff', quote: 'Meine Stärke ist unübertroffen.', leads: [{name: 'Aerodactyl', types: ['rock','flying']}, {name: 'Machollo', types: ['fighting']}, {name: 'Larvitar', types: ['rock','ground']}] }, 
    { type: 'boss', initial: 'S', img: 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Sierras.png?raw=true', name: 'Sierra', quote: 'Wir werden dich vernichten!', leads: [{name: 'Kramurx', types: ['dark','flying']}, {name: 'Sniebel', types: ['dark','ice']}, {name: 'Hunduster', types: ['dark','fire']}] }, 
    { type: 'boss', initial: 'A', img: 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Arlos.png?raw=true', name: 'Arlo', quote: 'Du hast keine Chance.', leads: [{name: 'Kindwurm', types: ['dragon']}, {name: 'Tannza', types: ['bug']}, {name: 'Skorgla', types: ['ground','flying']}] }
];

function startGame(mode) {
    currentMode = mode; showScreen('screen-game'); setDynamicBackground('screen-game', mode);
    const titles = { attack: "Angreifer", defend: "Verteidiger", hardcore: "Hardcore", guess: "Typen raten", rocket: "Team Rocket", weather: "Wetter-Boost", radar: "Radar-Training" };
    document.getElementById('game-title').innerText = titles[mode];
    fetchNextEncounter();
}

function showPokedex() {
    showScreen('screen-pokedex'); const grid = document.getElementById('pokedex-grid'); grid.innerHTML = '';
    document.getElementById('dex-stats').innerText = `${Object.keys(pokedex).length} / 1025`;
    for(let i=1; i<=1025; i++) {
        let d = document.createElement('div');
        if(pokedex[i]) { d.className = 'dex-entry caught'; d.onclick = () => window.open(`https://db.pokemongohub.net/pokemon/${pokedex[i].baseId}`, '_blank'); d.innerHTML = `<img class="dex-img" src="${pokedex[i].img}"><div class="dex-id">#${i}</div><div class="dex-name">${pokedex[i].name}</div>`; } 
        else { d.className = 'dex-entry'; d.innerHTML = `<div style="font-size: 16px; color: #555;">?</div><div class="dex-id">#${i}</div><div class="dex-name" style="color: #555;">???</div>`; }
        grid.appendChild(d);
    }
}

function setupButtons() {
    const btnContainer = document.getElementById("buttons"); if(!btnContainer) return;
    Object.keys(typeTranslations).forEach(type => {
        let btn = document.createElement("button"); btn.className = "type-btn"; btn.id = "btn-" + type; btn.dataset.type = type; btn.style.backgroundColor = typeColors[type];
        btn.innerHTML = `<img class="type-icon" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type}.svg">${typeTranslations[type]}<span class="multiplier-badge" id="mult-${type}"></span>`;
        btn.onclick = () => checkAnswer(type); btnContainer.appendChild(btn);
    });
}
setupButtons();

function fetchNextEncounter() { if (currentMode === 'rocket') fetchRocketEncounter(); else if (currentMode === 'weather') fetchWeatherEncounter(); else fetchRandomPokemon(); }

function resetUI() {
    firstAttempt = true; guessedTypesArray = []; 
    document.getElementById("loading").style.display = "block"; 
    
    document.getElementById("pokemon-container").classList.remove('radar-spotlight');
    
    const pokeImg = document.getElementById("pokemon-image");
    pokeImg.style.display = "none"; 
    pokeImg.classList.remove('silhouette'); 
    
    document.getElementById("rocket-image").style.display = "none"; document.getElementById("rocket-avatar").style.display = "none"; document.getElementById("weather-icon").style.display = "none"; document.getElementById("rocket-speech").style.display = "none"; document.getElementById("pokemon-name").innerText = ""; document.getElementById("pokemon-types").innerHTML = ""; document.getElementById("feedback").style.display = "none"; document.getElementById("feedback-reason").innerHTML = ""; document.getElementById("next-btn").style.display = "none"; document.getElementById("buttons").style.display = "grid"; document.getElementById("name-buttons").style.display = "none";
    if(timer) { clearInterval(timer); document.getElementById('timer-display').innerText = ""; }
    document.querySelectorAll('.type-btn').forEach(btn => { btn.classList.remove('eff-super', 'eff-normal', 'eff-weak'); btn.disabled = false; btn.style.border = "2px solid transparent"; const badge = btn.querySelector('.multiplier-badge'); if(badge) badge.style.display = "none"; });
}

function fetchWeatherEncounter() {
    resetUI(); document.getElementById("loading").style.display = "none";
    let w = weatherData[Math.floor(Math.random() * weatherData.length)]; currentPokemonTypes = w.types; 
    document.getElementById("weather-icon").style.display = "block"; document.getElementById("weather-icon").innerText = w.icon; document.getElementById("pokemon-name").innerText = w.name; document.getElementById("game-subtitle").innerHTML = "Welcher Typ wird von diesem Wetter <b>geboostet</b>?";
}

function fetchRocketEncounter() {
    resetUI(); document.getElementById("loading").style.display = "none";
    if (rocketShuffleBag.length === 0) rocketShuffleBag = [...rocketEncounters].sort(() => Math.random() - 0.5);
    currentRocket = rocketShuffleBag.pop();
    let leadName = "Versteckter Typ"; const imgEl = document.getElementById("rocket-image"); const avatar = document.getElementById("rocket-avatar");
    if (currentRocket.type === 'grunt') {
        const mImgs = ['https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Male_Team_Rocket_Grunt_Pok%C3%A9mon_202607161318.jpeg?raw=true', 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Male_Team_Rocket_Grunt_standing_202607161318.jpeg?raw=true'];
        const fImgs = ['https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Female_Team_Rocket_Grunt_Pok%C3%A9mon%E2%80%A6_202607161318.jpeg?raw=true', 'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Female_Team_Rocket_Grunt_standing_202607161318.jpeg?raw=true'];
        imgEl.src = currentRocket.gender === 'M' ? mImgs[Math.floor(Math.random()*2)] : fImgs[Math.floor(Math.random()*2)];
        currentPokemonTypes = currentRocket.targetTypes; imgEl.style.display = "block"; avatar.style.display = "none";
    } else {
        let randomLead = currentRocket.leads[Math.floor(Math.random() * currentRocket.leads.length)];
        currentPokemonTypes = randomLead.types; leadName = "Lead: " + randomLead.name;
        if(currentRocket.img) { imgEl.src = currentRocket.img; imgEl.style.display = "block"; avatar.style.display = "none"; } 
        else { imgEl.style.display = "none"; avatar.innerText = currentRocket.initial || "R"; avatar.classList.add('boss'); avatar.style.display = "flex"; }
    }
    imgEl.onerror = function() { this.style.display = 'none'; avatar.innerText = currentRocket.initial || "R"; if(currentRocket.type === 'boss') avatar.classList.add('boss'); else avatar.classList.remove('boss'); avatar.style.display = 'flex'; };
    document.getElementById("rocket-speech").innerText = `"${currentRocket.quote}"`; document.getElementById("rocket-speech").style.display = "block";
    document.getElementById("pokemon-name").innerText = currentRocket.name; document.getElementById("game-subtitle").innerHTML = "Wähle deinen <b>Angriffs-Typ</b> (Konter)!";
    const tc = document.getElementById("pokemon-types"); let badge = document.createElement("div"); badge.className = "type-badge"; badge.style.backgroundColor = currentRocket.type === 'boss' ? "#c0392b" : "#34495e"; badge.innerText = leadName; tc.appendChild(badge);
}

async function fetchRandomPokemon() {
    resetUI(); currentPokemonId = Math.floor(Math.random() * 1025) + 1;
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${currentPokemonId}`); const data = await response.json();
        currentBaseId = data.species.url.split('/').filter(Boolean).pop(); currentPokemonTypes = data.types.map(t => t.type.name);
        if(currentMode === 'hardcore') {
            let maxMult = 1; Object.keys(typeTranslations).forEach(atkType => { let mult = 1; currentPokemonTypes.forEach(defType => { if (typeChart[atkType] && typeChart[atkType][defType] !== undefined) mult *= typeChart[atkType][defType]; }); if (mult > maxMult) maxMult = mult; });
            if (maxMult < 2.5) { fetchRandomPokemon(); return; }
        }
        currentPokemonName = data.name.replace('-', ' ').toUpperCase(); 
        try { const speciesRes = await fetch(data.species.url); const deNameObj = (await speciesRes.json()).names.find(n => n.language.name === 'de'); if (deNameObj) currentPokemonName = deNameObj.name; } catch(e) {}
        currentPokemonImg = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
        
        const pokeImg = document.getElementById("pokemon-image");
        pokeImg.src = currentPokemonImg; 
        pokeImg.onload = () => { document.getElementById("loading").style.display = "none"; pokeImg.style.display = "block"; };
        document.getElementById("pokemon-name").innerText = currentPokemonName; const tc = document.getElementById("pokemon-types");
        
        if(currentMode === 'radar') {
            document.getElementById("pokemon-container").classList.add('radar-spotlight');
            pokeImg.classList.add('silhouette'); 
            
            document.getElementById("pokemon-name").innerText = "???"; document.getElementById("buttons").style.display = "none"; document.getElementById("name-buttons").style.display = "grid"; document.getElementById("game-subtitle").innerHTML = "Wer ist das Pokémon?"; generateNameOptions(currentPokemonName);
        } else {
            if (currentMode === 'attack' || currentMode === 'hardcore') { currentPokemonTypes.forEach(type => { let badge = document.createElement("div"); badge.className = "type-badge"; badge.style.backgroundColor = typeColors[type]; badge.innerText = typeTranslations[type]; tc.appendChild(badge); }); } 
            else if (currentMode === 'defend') { currentEnemyAttackType = currentPokemonTypes[Math.floor(Math.random() * currentPokemonTypes.length)]; let badge = document.createElement("div"); badge.className = "type-badge"; badge.style.backgroundColor = typeColors[currentEnemyAttackType]; badge.innerText = "Greift an mit: " + typeTranslations[currentEnemyAttackType]; tc.appendChild(badge); }
            if (currentMode === 'attack') document.getElementById('game-subtitle').innerHTML = "Wähle einen Angriffs-Typ, der <b>SEHR EFFEKTIV</b> ist!"; else if (currentMode === 'defend') document.getElementById('game-subtitle').innerHTML = "Wähle einen Typ, der den Angriff <b>RESISTIERT</b>!"; else if (currentMode === 'hardcore') document.getElementById('game-subtitle').innerHTML = "Finde die <b>DOPPELSCHWÄCHE (2.56x)</b>! Du hast nur 1 Versuch."; else if (currentMode === 'guess') document.getElementById('game-subtitle').innerHTML = `Dieses Pokémon hat <b>${currentPokemonTypes.length}</b> Element-Typ${currentPokemonTypes.length > 1 ? 'en' : ''}. Welche?`;
        }
    } catch (error) { setTimeout(() => fetchRandomPokemon(), 500); }
}

async function generateNameOptions(correctName) {
    const grid = document.getElementById("name-buttons"); grid.innerHTML = ""; let options = [correctName];
    while(options.length < 4) { let r = await fetch(`https://pokeapi.co/api/v2/pokemon/${Math.floor(Math.random() * 1025) + 1}`); let d = await r.json(); let n = d.name.toUpperCase(); if(!options.includes(n)) options.push(n); }
    options.sort(() => Math.random() - 0.5);
    options.forEach(name => { let btn = document.createElement("button"); btn.className = "name-btn"; btn.innerText = name; btn.onclick = () => checkRadarAnswer(name, correctName); grid.appendChild(btn); });
}

function checkRadarAnswer(selected, correct) {
    const pokeImg = document.getElementById("pokemon-image");
    
    document.getElementById("pokemon-container").classList.remove('radar-spotlight');
    pokeImg.classList.remove('silhouette'); 
    
    document.getElementById("pokemon-name").innerText = currentPokemonName;
    const tc = document.getElementById("pokemon-types"); tc.innerHTML = "";
    currentPokemonTypes.forEach(type => { let badge = document.createElement("div"); badge.className = "type-badge"; badge.style.backgroundColor = typeColors[type]; badge.innerText = typeTranslations[type]; tc.appendChild(badge); });
    const fb = document.getElementById("feedback"); const fbMain = document.getElementById("feedback-main");
    fb.style.display = "block"; document.getElementById("next-btn").style.display = "inline-block";
    if(selected.toLowerCase() === correct.toLowerCase()) { if (!pokedex[currentPokemonId]) { pokedex[currentPokemonId] = { name: currentPokemonName, img: currentPokemonImg, baseId: currentBaseId, types: currentPokemonTypes }; localStorage.setItem('pogo_dex_v6', JSON.stringify(pokedex)); } addXp(15); fbMain.innerHTML = `Gefangen! ${iconPokeball}<br>Es ist ${correct}!`; fb.style.backgroundColor = "rgba(46, 204, 113, 0.7)"; fb.style.border = "2px solid #2ecc71"; } 
    else { fbMain.innerHTML = "❌ Geflüchtet...<br>Es war " + correct + "."; fb.style.backgroundColor = "rgba(231, 76, 60, 0.7)"; fb.style.border = "2px solid #e74c3c"; }
    document.querySelectorAll('.name-btn').forEach(b => b.disabled = true);
}

function checkAnswer(userSelectedType) {
    if (currentPokemonTypes.length === 0) return;
    const fb = document.getElementById("feedback"); const fbMain = document.getElementById("feedback-main"); const fbReason = document.getElementById("feedback-reason");
    let isSuccess = false; let catchPrefix = ""; fbReason.innerHTML = "";
    if (currentMode === 'guess') {
        if (guessedTypesArray.includes(userSelectedType)) return; const btn = document.getElementById("btn-" + userSelectedType);
        if (currentPokemonTypes.includes(userSelectedType)) {
            btn.classList.add('eff-super'); btn.disabled = true; guessedTypesArray.push(userSelectedType);
            let badge = document.createElement("div"); badge.className = "type-badge"; badge.style.backgroundColor = typeColors[userSelectedType]; badge.innerText = typeTranslations[userSelectedType]; document.getElementById("pokemon-types").appendChild(badge);
            if (guessedTypesArray.length === currentPokemonTypes.length) { if(firstAttempt) { catchPrefix = `Perfekt! ${iconPokeball}<br>`; if (!pokedex[currentPokemonId]) { pokedex[currentPokemonId] = { name: currentPokemonName, img: currentPokemonImg, baseId: currentBaseId, types: currentPokemonTypes }; localStorage.setItem('pogo_dex_v6', JSON.stringify(pokedex)); } addXp(15); firstAttempt=false; } fbMain.innerHTML = catchPrefix + "Richtig! Alle Typen gefunden."; fb.style.backgroundColor = "rgba(46, 204, 113, 0.7)"; fb.style.border = "2px solid #2ecc71"; fb.style.display = "block"; document.getElementById("next-btn").style.display = "inline-block"; }
        } else { btn.classList.add('eff-weak'); btn.disabled = true; if(firstAttempt) { catchPrefix = "❌ Geflüchtet...<br>"; firstAttempt=false; } fbMain.innerHTML = catchPrefix + "Falsch! " + typeTranslations[userSelectedType] + " gehört nicht dazu."; fb.style.backgroundColor = "rgba(231, 76, 60, 0.7)"; fb.style.border = "2px solid #e74c3c"; fb.style.display = "block"; document.getElementById("next-btn").style.display = "inline-block"; }
        return;
    }
    let multiplier = 1;
    if (currentMode === 'weather') { isSuccess = currentPokemonTypes.includes(userSelectedType); if(isSuccess) { fbMain.innerHTML = "Richtig!"; fbReason.innerHTML = "Dieser Typ wird durch das Wetter geboostet."; addXp(10); } else { fbMain.innerHTML = "Falsch!"; fbReason.innerHTML = "Gesuchte Typen: " + currentPokemonTypes.map(t => typeTranslations[t]).join(" oder "); } } 
    else if (currentMode === 'attack' || currentMode === 'hardcore' || currentMode === 'rocket') { currentPokemonTypes.forEach(defType => { if (typeChart[userSelectedType] && typeChart[userSelectedType][defType] !== undefined) multiplier *= typeChart[userSelectedType][defType]; }); if (currentMode === 'hardcore') isSuccess = multiplier >= 2.5; else isSuccess = multiplier > 1; if(currentMode === 'rocket') { let targetNames = currentPokemonTypes.map(t => typeTranslations[t]).join(' & '); fbReason.innerHTML = `Gegnerischer Typ war: <b>${targetNames}</b>`; } } 
    else if (currentMode === 'defend') { if (typeChart[currentEnemyAttackType] && typeChart[currentEnemyAttackType][userSelectedType] !== undefined) multiplier = typeChart[currentEnemyAttackType][userSelectedType]; isSuccess = multiplier < 1; if(multiplier < 1) fbReason.innerHTML = `${typeTranslations[userSelectedType]} resistiert Angriffe vom Typ ${typeTranslations[currentEnemyAttackType]} gut!`; }
    const displayMult = multiplier.toFixed(2).replace('.00', '');
    let usedBall = iconPokeball; if (currentMode === 'rocket') usedBall = iconPremierball; if (currentMode === 'hardcore') usedBall = iconHyperball;
    if (firstAttempt && currentMode !== 'rocket' && currentMode !== 'weather') { if (isSuccess) { catchPrefix = `Gefangen! ${usedBall}<br>`; if (!pokedex[currentPokemonId]) { pokedex[currentPokemonId] = { name: currentPokemonName, img: currentPokemonImg, baseId: currentBaseId, types: currentPokemonTypes }; localStorage.setItem('pogo_dex_v6', JSON.stringify(pokedex)); } } else if (!isSuccess) { catchPrefix = "❌ Geflüchtet...<br>"; } } 
    else if (firstAttempt && currentMode === 'rocket') { if (isSuccess) catchPrefix = `Besiegt! ${usedBall}<br>`; else catchPrefix = "❌ Du wurdest besiegt...<br>"; }
    if (isSuccess) {
        if (currentMode === 'attack') addXp(10); if (currentMode === 'defend') addXp(12); if (currentMode === 'rocket') addXp(20); if (currentMode === 'hardcore') addXp(30);
        if (currentMode === 'rocket') fbMain.innerHTML = catchPrefix + "Richtig gekontert!"; else fbMain.innerHTML = catchPrefix + "Richtig! (" + displayMult + "x Schaden)";
        fb.style.backgroundColor = "rgba(46, 204, 113, 0.7)"; fb.style.border = "2px solid #2ecc71";
    } else {
        if (currentMode === 'hardcore' && multiplier > 1) { fbMain.innerHTML = catchPrefix + "Achtung (" + displayMult + "x), ABER es gibt eine 2.56x Doppelschwäche!"; fb.style.backgroundColor = "rgba(243, 156, 18, 0.7)"; fb.style.border = "2px solid #f39c12"; } 
        else { if (currentMode === 'rocket') fbMain.innerHTML = catchPrefix + "Das war leider die falsche Wahl."; else fbMain.innerHTML = catchPrefix + "Falsch! (" + displayMult + "x Schaden)"; fb.style.backgroundColor = "rgba(231, 76, 60, 0.7)"; fb.style.border = "2px solid #e74c3c"; }
    }
    firstAttempt = false; fb.style.display = "block"; document.getElementById("next-btn").style.display = "inline-block";
    document.querySelectorAll('.type-btn').forEach(btn => {
        let typeOfBtn = btn.dataset.type; let mult = 1; let isRight = false;
        if(currentMode === 'weather') { isRight = currentPokemonTypes.includes(typeOfBtn); } 
        else if (currentMode === 'attack' || currentMode === 'hardcore' || currentMode === 'rocket') { currentPokemonTypes.forEach(defType => { if (typeChart[typeOfBtn] && typeChart[typeOfBtn][defType] !== undefined) mult *= typeChart[typeOfBtn][defType]; }); isRight = (currentMode === 'hardcore' ? mult >= 2.5 : mult > 1); } 
        else { if (typeChart[currentEnemyAttackType] && typeChart[currentEnemyAttackType][typeOfBtn] !== undefined) mult = typeChart[currentEnemyAttackType][typeOfBtn]; isRight = mult < 1; }
        const badge = btn.querySelector('.multiplier-badge');
        if (isRight) { btn.classList.add('eff-super'); if(badge && ['attack','hardcore','defend'].includes(currentMode)) { badge.innerText = mult.toFixed(2).replace('.00', '') + "x"; badge.style.backgroundColor = "#2ecc71"; badge.style.display = "inline-block"; } } 
        else if (mult === 1 && currentMode !== 'weather') { btn.classList.add('eff-normal'); } else { btn.classList.add('eff-weak'); }
        btn.disabled = true; btn.style.cursor = "default";
    });
}