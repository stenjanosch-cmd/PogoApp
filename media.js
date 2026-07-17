// media.js - Ausgelagerte Logik für Musik und Intro-Hintergründe

const bgList = [
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pokemon_world_landscape_rolling_%E2%80%A6_202607141413.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_storage_room_UI_202607161335.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_training_gym_interior_202607161334.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Pok%C3%A9mon_battle_stadium_combat_field_202607161335.jpeg?raw=true',
    'https://github.com/stenjanosch-cmd/Pogo-Trainer/blob/main/Tools_and_Sammlung_room_202607161335.jpeg?raw=true'
];

// Setzt den zufälligen Hintergrund für das Intro-Overlay
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
        const randomBg = bgList[Math.floor(Math.random() * bgList.length)];
        overlay.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('${randomBg}')`;
        overlay.style.backgroundSize = 'cover';
        overlay.style.backgroundPosition = 'center';
    }
});

// --- AUDIO PLAYER LOGIK ---

// Umgestellt auf das stabile CDN, damit die Browser das Audio nicht blockieren
const firstSong = "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Here%20We%20Go%20Again.mp3";

const playlist = [
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Aiming%20To%20Be%20A%20Pokemon%20Master%20(1).mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Aiming%20To%20Be%20A%20Pokemon%20Master.mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Gotta%20Catch%20'Em%20All.mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/My%20Song%20Title.mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Untitled%20(1).mp3",
    "https://cdn.jsdelivr.net/gh/stenjanosch-cmd/PogoApp/Untitled.mp3"
];

let audioPlayer = new Audio();
let isMuted = false;
let isFirstSongPlayed = false;
let lastPlayedIndex = -1;

// Diese Funktion wird exakt beim Klick auf den Start-Button aufgerufen, 
// um das Audio-Objekt für den Browser zu legitimieren (Auto-Play Unlock)
function initAudio() {
    if (!audioPlayer.src) {
        audioPlayer.src = firstSong;
        audioPlayer.load();
    }
}

function startMusicPlayer() {
    if (isFirstSongPlayed) return; 
    
    if (!audioPlayer.src || audioPlayer.src === '') {
        audioPlayer.src = firstSong;
    }
    audioPlayer.volume = 0.5; 
    
    audioPlayer.play().then(() => {
        isFirstSongPlayed = true;
    }).catch(e => console.log("Musik-Autoplay blockiert:", e));

    audioPlayer.onended = playNextSong;
}

function playNextSong() {
    if (playlist.length === 0) return;
    
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * playlist.length);
    } while (nextIndex === lastPlayedIndex && playlist.length > 1);
    
    lastPlayedIndex = nextIndex;
    audioPlayer.src = playlist[nextIndex];
    audioPlayer.play().catch(e => console.log("Musikwiedergabe blockiert:", e));
}

function toggleMute() {
    isMuted = !isMuted;
    audioPlayer.muted = isMuted;
    
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
        muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
        muteBtn.style.borderColor = isMuted ? '#e74c3c' : '#ffcb05'; 
    }
}