// spawner.js - Hochauflösend, Trainer-Größen gefixt & Witzige Verfolgungsjagden

const walkers = ['pikachu', 'bulbasaur', 'charmander', 'squirtle', 'eevee', 'snorlax', 'meowth', 'psyduck', 'slowpoke', 'totodile', 'cyndaquil', 'lucario', 'jigglypuff'];
const flyers = ['gengar', 'mew', 'charizard', 'pidgeot', 'dragonite', 'butterfree', 'zubat', 'lugia', 'ho-oh', 'rayquaza'];
const trainers = ['red', 'ethan', 'lyra', 'brendan', 'may', 'lucas', 'dawn', 'hilbert', 'hilda', 'cynthia', 'steven', 'giovanni', 'rocketgrunt', 'rocketgruntf', 'ash'];

// Holt alle gefangenen Pokémon aus dem lokalen Speicher
function getCaughtPokemon() {
    let dex = JSON.parse(localStorage.getItem('pogo_dex_v6')) || {};
    return Object.values(dex); 
}

function spawnRandomEvent() {
    const container = document.getElementById('bg-animations');
    if (!container) return;

    // Wenn gerade ein epischer Kampf stattfindet, Szene nicht stören
    if (container.classList.contains('encounter-active')) return;
    
    // Maximal 2 normale Pokémon gleichzeitig
    if (document.querySelectorAll('.poke-move-wrapper').length >= 2) return;

    // 30% Chance auf einen Trainer-Kampf, sonst normales Spawnen
    const isScreenEmpty = document.querySelectorAll('.poke-move-wrapper').length === 0;
    if (isScreenEmpty && Math.random() < 0.3) {
        spawnTrainerEncounter(container);
    } else {
        spawnWanderingPokemon(container);
    }
}

// --- 1. DAS TRAINER-EVENT (VERFOLGUNGSJAGD) ---
function spawnTrainerEncounter(container) {
    container.classList.add('encounter-active'); 

    const trainerName = trainers[Math.floor(Math.random() * trainers.length)];
    // Für Kämpfe nehmen wir nur Boden-Pokémon
    const pokeName = walkers[Math.floor(Math.random() * walkers.length)]; 

    const meetLeft = (window.innerWidth / 2) - 100;
    const meetRight = (window.innerWidth / 2) + 100;

    // TRAINER AUFBAUEN (Jetzt deutlich größer!)
    const trainerWrap = document.createElement('div');
    trainerWrap.className = 'poke-move-wrapper';
    trainerWrap.style.bottom = '5%'; trainerWrap.style.zIndex = '5';
    
    const trainerFlip = document.createElement('div');
    const trainerImg = document.createElement('img');
    trainerImg.src = `https://play.pokemonshowdown.com/sprites/trainers/${trainerName}.png`;
    // GRÖSSEN-FIX: Trainer auf 140px vergrößert, pixelated damit es nicht verschwimmt
    trainerImg.style.height = '140px'; 
    trainerImg.style.imageRendering = 'pixelated';
    trainerImg.style.transformOrigin = 'bottom center';
    trainerImg.className = 'poke-walk'; 
    trainerFlip.appendChild(trainerImg);
    trainerWrap.appendChild(trainerFlip);
    container.appendChild(trainerWrap);

    // POKÉMON AUFBAUEN
    const pokeWrap = document.createElement('div');
    pokeWrap.className = 'poke-move-wrapper';
    pokeWrap.style.bottom = '5%'; pokeWrap.style.zIndex = '5';
    const pokeFlip = document.createElement('div');
    pokeFlip.style.transform = 'scaleX(-1)'; // Schaut nach links zum Trainer
    const pokeImg = document.createElement('img');
    pokeImg.src = `https://play.pokemonshowdown.com/sprites/ani/${pokeName}.gif`;
    pokeImg.style.height = 'auto'; pokeImg.style.width = 'auto';
    pokeImg.style.transform = 'scale(1.5)'; pokeImg.style.transformOrigin = 'bottom center';
    pokeImg.className = 'poke-walk';
    
    pokeImg.onerror = () => { trainerWrap.remove(); pokeWrap.remove(); container.classList.remove('encounter-active'); };
    
    pokeFlip.appendChild(pokeImg);
    pokeWrap.appendChild(pokeFlip);
    container.appendChild(pokeWrap);

    // 1. BEIDE LAUFEN ZUR MITTE
    trainerWrap.animate([{ transform: `translateX(-200px)` }, { transform: `translateX(${meetLeft}px)` }], { duration: 3000, fill: 'forwards' });
    let pWalk = pokeWrap.animate([{ transform: `translateX(${window.innerWidth + 200}px)` }, { transform: `translateX(${meetRight}px)` }], { duration: 3000, fill: 'forwards' });

    pWalk.onfinish = () => {
        trainerImg.style.animationPlayState = 'paused'; // Stehen bleiben
        pokeImg.style.animationPlayState = 'paused';
        
        // 2. POKÉBALL WERFEN
        setTimeout(() => {
            const ball = document.createElement('img');
            ball.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
            ball.style.position = 'absolute'; ball.style.width = '24px';
            ball.style.zIndex = '10';
            container.appendChild(ball);

            // Flugkurve
            ball.animate([{ left: `${meetLeft + 60}px` }, { left: `${meetRight - 10}px` }], { duration: 600, easing: 'linear', fill: 'forwards' });
            ball.animate([{ bottom: '80px' }, { bottom: '150px', offset: 0.5, easing: 'ease-out' }, { bottom: '20px', offset: 1, easing: 'ease-in' }], { duration: 600, fill: 'forwards' });
            let throwRot = ball.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 600, fill: 'forwards' });

            throwRot.onfinish = () => {
                // 3. POKÉMON WIRD EINGESOGEN
                pokeImg.animate([
                    { transform: 'scale(1.5)', opacity: 1, filter: 'brightness(1)' },
                    { transform: 'scale(0.1)', opacity: 0, filter: 'brightness(10)' }
                ], { duration: 300, fill: 'forwards' }).onfinish = () => {
                    pokeImg.style.display = 'none';
                    
                    ball.animate([{ bottom: '20px' }, { bottom: '10px' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
                        
                        // 4. BALL WACKELT
                        let shakes = 0;
                        let shakeInt = setInterval(() => {
                            shakes++;
                            ball.animate([
                                { transform: 'rotate(0deg)' }, { transform: 'rotate(-25deg)', offset: 0.25 },
                                { transform: 'rotate(25deg)', offset: 0.75 }, { transform: 'rotate(0deg)' }
                            ], { duration: 400 });

                            if (shakes >= 3) {
                                clearInterval(shakeInt);
                                setTimeout(() => {
                                    const isCaught = Math.random() > 0.4; // 60% Fangchance
                                    
                                    if (isCaught) {
                                        // ERFOLG! Trainer geht zufrieden weiter.
                                        ball.style.filter = 'brightness(0.5)'; 
                                        setTimeout(() => {
                                            ball.remove(); pokeWrap.remove();
                                            trainerImg.style.animationPlayState = 'running';
                                            trainerWrap.animate([{ transform: `translateX(${meetLeft}px)` }, { transform: `translateX(${window.innerWidth + 200}px)` }], { duration: 3000, fill: 'forwards' }).onfinish = () => {
                                                trainerWrap.remove(); container.classList.remove('encounter-active');
                                            };
                                        }, 1000);
                                    } else {
                                        // AUSBRUCH & WITZIGE VERFOLGUNGSJAGD!
                                        ball.remove();
                                        pokeImg.style.display = 'block';
                                        pokeImg.animate([
                                            { transform: 'scale(0.1)', opacity: 0, filter: 'brightness(10)' },
                                            { transform: 'scale(1.5)', opacity: 1, filter: 'brightness(1)' }
                                        ], { duration: 300, fill: 'forwards' });
                                        
                                        // Pokémon gerät in Panik und rennt weg
                                        pokeFlip.style.transform = 'scaleX(1)'; // Dreht sich um
                                        pokeImg.style.animationPlayState = 'running';
                                        pokeImg.style.animationDuration = '0.1s'; // Extrem schnelles Cartoon-Wippen
                                        let pRun = pokeWrap.animate([{ transform: `translateX(${meetRight}px)` }, { transform: `translateX(${window.innerWidth + 200}px)` }], { duration: 1500, fill: 'forwards' });
                                        pRun.onfinish = () => pokeWrap.remove();

                                        // Trainer ist geschockt (steht kurz still), dann rennt er wütend hinterher
                                        setTimeout(() => {
                                            trainerFlip.style.transform = 'scaleX(1)'; // Sichert die Blickrichtung
                                            trainerImg.style.animationPlayState = 'running';
                                            trainerImg.style.animationDuration = '0.15s'; // Trainer rennt auch extrem schnell
                                            let tRun = trainerWrap.animate([{ transform: `translateX(${meetLeft}px)` }, { transform: `translateX(${window.innerWidth + 200}px)` }], { duration: 1800, fill: 'forwards' });
                                            tRun.onfinish = () => {
                                                trainerWrap.remove(); container.classList.remove('encounter-active');
                                            };
                                        }, 400); // 400ms Schrecksekunde
                                    }
                                }, 500);
                            }
                        }, 1000); 
                    };
                };
            };
        }, 1000);
    };
}

// --- 2. NORMALE WANDERNDE POKÉMON ---
function spawnWanderingPokemon(container) {
    const caughtList = getCaughtPokemon();
    const isFlyer = Math.random() > 0.5;
    const usePokedex = caughtList.length > 0 && Math.random() > 0.5;

    const moveWrapper = document.createElement('div'); moveWrapper.className = 'poke-move-wrapper';
    const flipWrapper = document.createElement('div'); flipWrapper.className = 'poke-flip-wrapper';
    const img = document.createElement('img');
    
    img.onerror = () => { if (moveWrapper && moveWrapper.parentNode) moveWrapper.remove(); };

    if (usePokedex) {
        let randomCaught = caughtList[Math.floor(Math.random() * caughtList.length)];
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${randomCaught.baseId}.gif`;
    } else {
        const pokeList = isFlyer ? flyers : walkers;
        const poke = pokeList[Math.floor(Math.random() * pokeList.length)];
        img.src = `https://play.pokemonshowdown.com/sprites/ani/${poke}.gif`;
    }

    img.className = isFlyer ? 'poke-fly' : 'poke-walk';
    
    // Proportionen sichern
    img.style.height = 'auto'; img.style.width = 'auto';
    img.style.transform = 'scale(1.5)'; img.style.transformOrigin = 'bottom center'; 
    moveWrapper.style.zIndex = Math.floor(Math.random() * 4) + 1;

    if (isFlyer) moveWrapper.style.bottom = `${Math.floor(Math.random() * 45) + 40}%`;
    else moveWrapper.style.bottom = `${Math.floor(Math.random() * 8)}%`;

    const direction = Math.floor(Math.random() * 2);
    const duration = Math.floor(Math.random() * 8) + 12; 
    let startX = direction === 0 ? -150 : window.innerWidth + 150;
    let endX = direction === 0 ? window.innerWidth + 150 : -150;
    let midX = (window.innerWidth / 2) + (Math.random() * 100 - 50);

    flipWrapper.style.transform = `scaleX(${direction === 0 ? -1 : 1})`;
    flipWrapper.appendChild(img); moveWrapper.appendChild(flipWrapper); container.appendChild(moveWrapper);

    if (isFlyer) {
        moveWrapper.animate([{ transform: `translateX(${startX}px)` }, { transform: `translateX(${endX}px)` }], { duration: duration * 1000, fill: 'forwards' }).onfinish = () => moveWrapper.remove();
    } else {
        let walkToMid = moveWrapper.animate([{ transform: `translateX(${startX}px)` }, { transform: `translateX(${midX}px)` }], { duration: (duration / 2) * 1000, fill: 'forwards' });

        walkToMid.onfinish = () => {
            img.style.animationPlayState = 'paused'; 
            let flipState = direction === 0 ? -1 : 1;
            let flips = 0;
            
            let lookInterval = setInterval(() => {
                flipState *= -1; flipWrapper.style.transform = `scaleX(${flipState})`; flips++;
                
                if (flips >= 3) {
                    clearInterval(lookInterval);
                    img.style.animationPlayState = 'running';
                    let goBack = Math.random() < 0.3; 
                    
                    if (goBack) {
                        flipWrapper.style.transform = `scaleX(${direction === 0 ? 1 : -1})`;
                        moveWrapper.animate([{ transform: `translateX(${midX}px)` }, { transform: `translateX(${startX}px)` }], { duration: (duration / 2) * 1000, fill: 'forwards' }).onfinish = () => moveWrapper.remove();
                    } else {
                        flipWrapper.style.transform = `scaleX(${direction === 0 ? -1 : 1})`;
                        moveWrapper.animate([{ transform: `translateX(${midX}px)` }, { transform: `translateX(${endX}px)` }], { duration: (duration / 2) * 1000, fill: 'forwards' }).onfinish = () => moveWrapper.remove();
                    }
                }
            }, 600);
        };
    }
}

// --- 3. DER ZENTRALE SPAWNER-TICKER ---
function startPokemonSpawner() {
    setTimeout(() => {
        spawnRandomEvent();
        startPokemonSpawner(); 
    }, (Math.floor(Math.random() * 15) + 15) * 1000); 
}

document.addEventListener('DOMContentLoaded', () => {
    spawnWanderingPokemon(document.getElementById('bg-animations'));
    startPokemonSpawner();
});