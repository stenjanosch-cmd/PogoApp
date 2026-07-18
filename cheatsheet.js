let selectedCheatTypes = [];

// --- DER EVENT-SCANNER ---
if (window.EventBus) {
    EventBus.on('screenChanged', (data) => {
        if (data.screen === 'screen-cheatsheet') setupCheatsheet();
    });
}
// --------------------------

function setupCheatsheet() {
    const grid = document.getElementById('cheat-icons');
    if (grid.innerHTML !== '') return; 

    Object.keys(typeTranslations).forEach(type => {
        let img = document.createElement("img"); 
        img.className = "cheat-type-icon"; 
        img.id = `cheat-icon-${type}`;
        img.src = `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type}.svg`;
        img.style.backgroundColor = typeColors[type]; 
        img.style.cursor = "pointer";
        img.style.transition = "transform 0.2s, border 0.2s";
        
        img.onclick = () => toggleCheatType(type); 
        grid.appendChild(img);
    });
}

function toggleCheatType(type) {
    if (selectedCheatTypes.includes(type)) {
        selectedCheatTypes = selectedCheatTypes.filter(t => t !== type);
        document.getElementById(`cheat-icon-${type}`).style.transform = "scale(1)";
        document.getElementById(`cheat-icon-${type}`).style.border = "none";
    } else {
        if (selectedCheatTypes.length >= 2) {
            let removed = selectedCheatTypes.shift(); 
            document.getElementById(`cheat-icon-${removed}`).style.transform = "scale(1)";
            document.getElementById(`cheat-icon-${removed}`).style.border = "none";
        }
        selectedCheatTypes.push(type);
    }
    
    selectedCheatTypes.forEach(t => {
        let el = document.getElementById(`cheat-icon-${t}`);
        el.style.transform = "scale(1.2)";
        el.style.border = "2px solid white";
        el.style.borderRadius = "50%";
    });
    
    renderDualCheatResult();
}

function renderDualCheatResult() {
    const res = document.getElementById('cheat-result');
    const display = document.getElementById('cheat-selected-display');
    
    if (selectedCheatTypes.length === 0) {
        res.innerHTML = "";
        display.innerHTML = '<span style="color: #aaa; font-style: italic; font-size: 12px;">Kein Typ ausgewählt</span>';
        res.style.display = 'none';
        return;
    }

    res.style.display = 'block';
    
    // Header
    let titleHtml = selectedCheatTypes.map(t => `<span class="type-badge" style="background-color:${typeColors[t]}; margin: 0 5px; font-size: 14px; padding: 4px 10px;">${typeTranslations[t]}</span>`).join(" <span style='color:white; font-weight:bold;'>+</span> ");
    display.innerHTML = titleHtml;

    const renderBadgeList = (arr) => arr.map(t => `<span class="type-badge" style="background-color:${typeColors[t]}; font-size: 11px; padding: 3px 8px; margin: 3px;">${typeTranslations[t]}</span>`).join("");

    // --- 1. VERTEIDIGUNG ---
    let weaknesses = { "2.56": [], "1.6": [] };
    let resistances = { "0.625": [], "0.39": [], "0.244": [] };

    Object.keys(typeTranslations).forEach(atkType => {
        let mult = 1;
        selectedCheatTypes.forEach(defType => {
            if (typeChart[atkType] && typeChart[atkType][defType] !== undefined) mult *= typeChart[atkType][defType];
        });
        
        if (mult > 2.5) weaknesses["2.56"].push(atkType);
        else if (mult > 1.5) weaknesses["1.6"].push(atkType);
        else if (mult < 0.3 && mult > 0.2) resistances["0.244"].push(atkType); 
        else if (mult < 0.4 && mult > 0.3) resistances["0.39"].push(atkType); 
        else if (mult > 0.6 && mult < 0.7) resistances["0.625"].push(atkType);
    });

    let html = `<div style="text-align: center; font-family: 'Righteous'; color: #fff; margin-bottom: 10px; font-size: 16px;">🛡️ VERTEIDIGUNG</div>`;
    html += `<div style="font-size: 11px; color: #bbb; text-align: center; margin-bottom: 10px;">Gegen diese Typen bist du schwach/resistent:</div>`;

    if (weaknesses["2.56"].length > 0) {
        html += `<div style="background: rgba(231,76,60,0.15); padding: 8px; border-left: 5px solid #e74c3c; margin-bottom: 8px; border-radius: 4px;">
            <div style="color:#e74c3c; font-weight:900; margin-bottom:5px; font-size: 12px; text-transform:uppercase;">🔥 Doppelschwäche (2.56x)</div>
            <div>${renderBadgeList(weaknesses["2.56"])}</div>
        </div>`;
    }
    if (weaknesses["1.6"].length > 0) {
        html += `<div style="background: rgba(243,156,18,0.15); padding: 8px; border-left: 5px solid #f39c12; margin-bottom: 8px; border-radius: 4px;">
            <div style="color:#f39c12; font-weight:bold; margin-bottom:5px; font-size: 12px;">⚔️ Schwach gegen (1.6x)</div>
            <div>${renderBadgeList(weaknesses["1.6"])}</div>
        </div>`;
    }
    if (weaknesses["2.56"].length === 0 && weaknesses["1.6"].length === 0) {
        html += `<div style="text-align: center; color: #aaa; font-style: italic; margin-bottom: 8px;">Keine bekannten Schwächen!</div>`;
    }

    if (resistances["0.244"].length > 0) {
        html += `<div style="background: rgba(22,160,133,0.15); padding: 8px; border-left: 5px solid #16a085; margin-bottom: 8px; border-radius: 4px;">
            <div style="color:#16a085; font-weight:900; margin-bottom:5px; font-size: 12px; text-transform:uppercase;">🧱 Doppel-Resistenz (0.244x)</div>
            <div>${renderBadgeList(resistances["0.244"])}</div>
        </div>`;
    }
    if (resistances["0.39"].length > 0) {
        html += `<div style="background: rgba(39,174,96,0.15); padding: 8px; border-left: 5px solid #27ae60; margin-bottom: 8px; border-radius: 4px;">
            <div style="color:#27ae60; font-weight:bold; margin-bottom:5px; font-size: 12px;">🛡️🛡️ Stark Resistiert (0.39x)</div>
            <div>${renderBadgeList(resistances["0.39"])}</div>
        </div>`;
    }
    if (resistances["0.625"].length > 0) {
        html += `<div style="background: rgba(46,204,113,0.15); padding: 8px; border-left: 5px solid #2ecc71; margin-bottom: 8px; border-radius: 4px;">
            <div style="color:#2ecc71; font-weight:bold; margin-bottom:5px; font-size: 12px;">🛡️ Resistiert (0.625x)</div>
            <div>${renderBadgeList(resistances["0.625"])}</div>
        </div>`;
    }

    html += `<hr style="border: 0; height: 1px; background: rgba(255,255,255,0.2); margin: 20px 0;">`;

    // --- 2. ANGRIFF (STAB) ---
    html += `<div style="text-align: center; font-family: 'Righteous'; color: #fff; margin-bottom: 10px; font-size: 16px;">⚔️ ANGRIFF (STAB)</div>`;
    html += `<div style="font-size: 11px; color: #bbb; text-align: center; margin-bottom: 10px;">Attacken dieser Typen profitieren vom STAB-Bonus und sind SEHR EFFEKTIV gegen:</div>`;
    
    selectedCheatTypes.forEach(atkType => {
        let strongAgainst = [];
        Object.keys(typeTranslations).forEach(defType => {
            if (typeChart[atkType] && typeChart[atkType][defType] > 1) strongAgainst.push(defType);
        });
        
        if(strongAgainst.length > 0) {
            html += `<div style="background: rgba(255,255,255,0.05); padding: 8px; border-left: 5px solid ${typeColors[atkType]}; margin-bottom: 8px; border-radius: 4px;">
                <div style="color:${typeColors[atkType]}; font-weight:bold; margin-bottom:5px; font-size: 12px;">${typeTranslations[atkType]}-Attacken (1.6x)</div>
                <div>${renderBadgeList(strongAgainst)}</div>
            </div>`;
        }
    });

    html += `<hr style="border: 0; height: 1px; background: rgba(255,255,255,0.2); margin: 20px 0;">`;

    // --- 3. WETTER ---
    html += `<div style="text-align: center; font-family: 'Righteous'; color: #fff; margin-bottom: 10px; font-size: 16px;">☀️ WETTER-BOOST</div>`;
    html += `<div style="font-size: 11px; color: #bbb; text-align: center; margin-bottom: 10px;">Dieses Wetter verstärkt deine Attacken um +20%:</div>`;
    
    let weatherFound = [];
    selectedCheatTypes.forEach(t => {
        let w = weatherData.find(weather => weather.types.includes(t));
        if (w && !weatherFound.includes(w.name)) {
            weatherFound.push(w.name);
            html += `<div style="background: rgba(52,152,219,0.15); padding: 8px; border-radius: 4px; display: flex; align-items: center; margin-bottom: 8px; border: 1px solid rgba(52,152,219,0.3);">
                <span style="font-size: 24px; margin-right: 15px;">${w.icon}</span>
                <div>
                    <div style="font-weight: bold; color: #3498db;">${w.name}</div>
                    <div style="font-size: 10px; color: #aaa;">Boostet: ${w.types.map(wt => typeTranslations[wt]).join(', ')}</div>
                </div>
            </div>`;
        }
    });

    res.innerHTML = html;
}