// spawner.js - Logik für die animierten Hintergrund-Pokémon

// Unterteilt in Läufer (Hüpfen unten am Rand entlang) und Flieger (Schweben in der Luft)
const walkers = ['pikachu', 'bulbasaur', 'charmander', 'squirtle', 'eevee', 'snorlax', 'meowth', 'psyduck', 'slowpoke', 'totodile', 'cyndaquil', 'lucario', 'jigglypuff'];
const flyers = ['gengar', 'mew', 'charizard', 'pidgeot', 'dragonite', 'butterfree', 'zubat', 'lugia', 'ho-oh', 'rayquaza'];

function spawnWanderingPokemon() {
    const container = document.getElementById('bg-animations');
    if (!container) return;

    // 50/50 Chance ob Läufer oder Flieger
    const isFlyer = Math.random() > 0.5;
    const pokeList = isFlyer ? flyers : walkers;
    const poke = pokeList[Math.floor(Math.random() * pokeList.length)];
    
    // Der Wrapper steuert die Links/Rechts-Bewegung über den Bildschirm
    const moveWrapper = document.createElement('div');
    moveWrapper.className = 'poke-move-wrapper';
    
    // Der innere Wrapper spiegelt das Bild, wenn es nach rechts läuft
    const flipWrapper = document.createElement('div');
    
    const img = document.createElement('img');
    img.src = `https://play.pokemonshowdown.com/sprites/ani/${poke}.gif`;
    
    // Flieger bekommen die Wellen-Animation, Läufer das schnelle Wippen
    img.className = isFlyer ? 'poke-fly' : 'poke-walk';

    // Zufällige Größe, damit es dynamisch wirkt (zwischen 60px und 100px)
    const size = Math.floor(Math.random() * 40) + 60; 
    img.style.height = `${size}px`;

    // Positionierung
    if (isFlyer) {
        // Schweben irgendwo zwischen 20% und 60% der Bildschirmhöhe
        moveWrapper.style.bottom = `${Math.floor(Math.random() * 40) + 20}%`;
    } else {
        // Läufer kleben direkt am unteren Bildschirmrand
        moveWrapper.style.bottom = `0px`; 
    }

    // Lauf-Richtung und Dauer (0 = nach rechts, 1 = nach links)
    const direction = Math.floor(Math.random() * 2);
    const duration = Math.floor(Math.random() * 10) + 12; // 12 bis 22 Sekunden

    if (direction === 0) { // Bewegt sich nach rechts
        moveWrapper.style.animation = `moveRight ${duration}s linear forwards`;
        flipWrapper.style.transform = 'scaleX(-1)'; // Sprite umdrehen
    } else { // Bewegt sich nach links
        moveWrapper.style.animation = `moveLeft ${duration}s linear forwards`;
        flipWrapper.style.transform = 'scaleX(1)'; // Originalausrichtung
    }

    flipWrapper.appendChild(img);
    moveWrapper.appendChild(flipWrapper);
    container.appendChild(moveWrapper);

    // Entfernt das Element sauber, sobald die Animation beendet ist
    setTimeout(() => {
        if(moveWrapper.parentElement) moveWrapper.remove();
    }, (duration + 1) * 1000);
}

function startPokemonSpawner() {
    // Spawnt alle 8 bis 18 Sekunden ein neues Pokémon
    setTimeout(() => {
        spawnWanderingPokemon();
        startPokemonSpawner(); 
    }, (Math.floor(Math.random() * 10) + 8) * 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    startPokemonSpawner();
});