const CACHE_NAME = 'pogo-cache-v7';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/game-sortieren.js',
    '/manifest.json',
    '/150px-Professor_Willow.png',
    '/Arlos.png',
    '/Cliffs.png',
    '/Sierras.png',
    '/Giovanni.png',
    '/Female_Team_Rocket_Grunt_Pokémon…_202607161318.jpeg',
    '/Female_Team_Rocket_Grunt_standing_202607161318.jpeg',
    '/Male_Team_Rocket_Grunt_Pokémon_202607161318.jpeg',
    '/Male_Team_Rocket_Grunt_standing_202607161318.jpeg',
    '/Pokemon_world_landscape_rolling_…_202607141413.jpeg',
    '/Pokémon_battle_stadium_combat_field_202607161335.jpeg',
    '/Pokémon_storage_room_UI_202607161335.jpeg',
    '/Pokémon_training_gym_interior_202607161334.jpeg',
    '/Professional_Pokémon_battle_stadium_1080p_202607161353.mp4',
    '/Team_Rocket_hideout_with_Giovanni_202607141444.jpeg',
    '/Tools_and_Sammlung_room_202607161335.jpeg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        }).catch(() => {
            // Offline Fallback, falls etwas nicht im Cache ist
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});