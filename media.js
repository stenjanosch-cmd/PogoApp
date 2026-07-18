// ==============================================
// DATEI: media.js (Event-Ready)
// ==============================================

const bgList = [
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pokemon_world_landscape_rolling_%E2%80%A6_202607141413.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_storage_room_UI_202607161335.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_training_gym_interior_202607161334.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_battle_stadium_combat_field_202607161335.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Tools_and_Sammlung_room_202607161335.jpeg?raw=true'
];

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
        const randomBg = bgList[Math.floor(Math.random() * bgList.length)];
        overlay.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('${randomBg}')`;
        overlay.style.backgroundSize = 'cover';
        overlay.style.backgroundPosition = 'center';
    }
});

// --- AUDIO PLAYER LOGIK (Mit 3 Sekunden Crossfade) ---

const firstSong = "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Here%20We%20Go%20Again.mp3";
const playlist = [
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Aiming%20To%20Be%20A%20Pokemon%20Master%20(1).mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Aiming%20To%20Be%20A%20Pokemon%20Master.mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Gotta%20Catch%20'Em%20All.mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/My%20Song%20Title.mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Untitled%20(1).mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Untitled.mp3"
];

let playerA = new Audio();
let playerB = new Audio();
let currentPlayer = playerA;

let isMuted = false;
let isFirstSongPlayed = false;
let lastPlayedIndex = -1;
let isFading = false;
const maxVolume = 0.5;

function initAudio() {
    playerA.src = firstSong;
    playerA.volume = 0; 
    let promiseA = playerA.play();
    if (promiseA !== undefined) {
        promiseA.then(() => {
            playerA.pause();
            playerA.currentTime = 0;
            playerA.volume = isMuted ? 0 : maxVolume;
        }).catch(e => console.log("Unlock A blockiert:", e));
    }

    playerB.src = playlist[0];
    playerB.volume = 0;
    let promiseB = playerB.play();
    if (promiseB !== undefined) {
        promiseB.then(() => {
            playerB.pause();
            playerB.currentTime = 0;
            playerB.volume = isMuted ? 0 : maxVolume;
        }).catch(e => console.log("Unlock B blockiert:", e));
    }
}

// Wird für die Zukunft dem globalen Scope zugewiesen, falls Buttons darauf zugreifen
window.initAudio = initAudio;

function startMusicPlayer() {
    if (isFirstSongPlayed) return; 
    
    if (!currentPlayer.src || currentPlayer.src === '') {
        currentPlayer.src = firstSong;
    }
    
    currentPlayer.volume = isMuted ? 0 : maxVolume; 
    
    currentPlayer.play().then(() => {
        isFirstSongPlayed = true;
    }).catch(e => console.log("Musik blockiert:", e));

    currentPlayer.addEventListener('timeupdate', handleTimeUpdate);
}
window.startMusicPlayer = startMusicPlayer;

function handleTimeUpdate(e) {
    const player = e.target;
    if (player.duration > 0 && (player.duration - player.currentTime <= 3) && !isFading) {
        isFading = true;
        crossfadeToNext(player);
    }
}

function crossfadeToNext(oldPlayer) {
    if (playlist.length === 0) return;
    
    const nextPlayer = (oldPlayer === playerA) ? playerB : playerA;
    
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * playlist.length);
    } while (nextIndex === lastPlayedIndex && playlist.length > 1);
    
    lastPlayedIndex = nextIndex;
    nextPlayer.src = playlist[nextIndex];
    nextPlayer.volume = 0; 
    
    nextPlayer.play().catch(e => console.log("Play error:", e));
    nextPlayer.addEventListener('timeupdate', handleTimeUpdate);
    
    const fadeInterval = 50; 
    const fadeSteps = 3000 / fadeInterval;
    let currentStep = 0;
    
    const fader = setInterval(() => {
        currentStep++;
        let fraction = currentStep / fadeSteps;
        if (fraction > 1) fraction = 1;
        
        if (!isMuted) {
            let oldVol = maxVolume * (1 - fraction);
            if (oldVol < 0) oldVol = 0;
            oldPlayer.volume = oldVol;
            
            let newVol = maxVolume * fraction;
            if (newVol > maxVolume) newVol = maxVolume;
            nextPlayer.volume = newVol;
        }
        
        if (currentStep >= fadeSteps) {
            clearInterval(fader);
            oldPlayer.pause();
            oldPlayer.currentTime = 0;
            oldPlayer.removeEventListener('timeupdate', handleTimeUpdate);
            isFading = false;
        }
    }, fadeInterval);
    
    currentPlayer = nextPlayer;
}

function toggleMute() {
    isMuted = !isMuted;
    playerA.muted = isMuted;
    playerB.muted = isMuted;
    
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
        muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
        muteBtn.style.borderColor = isMuted ? '#e74c3c' : '#ffcb05'; 
    }
}
window.toggleMute = toggleMute;