document.addEventListener('DOMContentLoaded', async () => {
    // ---- UI Elemente ----
    const inventoryList = document.getElementById('inventoryList');
    const tradeUpList = document.getElementById('tradeUpList');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const skinSearchInput = document.getElementById('skinSearchInput');
    const skinSearchResults = document.getElementById('skinSearchResults');
    const stammbaumDisplay = document.getElementById('stammbaumDisplay');
    const skinDetailPanel = document.getElementById('skinDetailPanel');
    const workbenchSlotsContainer = document.getElementById('workbenchSlots');
    const analyzeWorkbenchButton = document.getElementById('analyzeWorkbenchButton');
    const workbenchInfo = document.getElementById('workbenchInfo');
    const stammbaumBackButton = document.getElementById('stammbaumBackButton');

    // ---- Globale Daten & Zustand ----
    let SKINS_DB = {};
    let RARITY_ORDER = [];
    let LIVE_PRICES = {};
    let userInventory = [];
    let workbenchItems = new Array(10).fill(null);
    let stammbaumHistory = []; // Für die Zurück-Funktion

    // ---- Event Listener ----
    darkModeToggle.addEventListener('change', () => document.body.classList.toggle('dark-mode', darkModeToggle.checked));

    // ---- Initialisierung ----
    async function initialize() {
        await Promise.all([loadDataFromServer(), loadPricesFromServer()]);
        await loadInventoryFromServer();
        setupWorkbench();
    }
    
    async function loadDataFromServer() {
        try {
            const response = await fetch('/api/skins');
            const data = await response.json();
            SKINS_DB = data.skins;
            RARITY_ORDER = data.rarityOrder;
        } catch (error) { console.error("Fehler beim Laden der Skin-Datenbank:", error); }
    }

    async function loadPricesFromServer() {
        try {
            const response = await fetch('/api/prices');
            LIVE_PRICES = await response.json();
        } catch (error) { console.warn("Konnte Live-Preise nicht laden.", error); }
    }

    async function loadInventoryFromServer() {
        try {
            const response = await fetch('/api/inventory');
            let inventory = await response.json();
            if (inventory && inventory.length > 0) {
                userInventory = inventory.map((item, index) => ({
                    ...item,
                    price: LIVE_PRICES[item.name] || 0.05,
                    id: `inv-item-${index}` // Eindeutige ID für Drag-Drop
                }));
                displayInventory(userInventory);
                displayTradeUps(findTradeUpCombinations(userInventory, SKINS_DB, RARITY_ORDER, LIVE_PRICES), "Mögliche Trade-Ups aus Inventar");
            }
        } catch (error) { console.error("Fehler beim Laden des Inventars:", error); }
    }

    initialize();
    
    // ---- Werkbank Logik ----
    function setupWorkbench() {
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'workbench-slot';
            slot.dataset.slotIndex = i;
            workbenchSlotsContainer.appendChild(slot);
        }
        
        workbenchSlotsContainer.addEventListener('dragover', e => e.preventDefault());
        
        workbenchSlotsContainer.addEventListener('drop', e => {
            e.preventDefault();
            const itemId = e.dataTransfer.getData('text/plain');
            const item = userInventory.find(i => i.id === itemId);
            const slotElement = e.target.closest('.workbench-slot');
            
            if (item && slotElement) {
                const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);
                workbenchItems[slotIndex] = item;
                renderWorkbench();
            }
        });
    }

    function renderWorkbench() {
        const slots = document.querySelectorAll('.workbench-slot');
        let itemCount = 0;
        slots.forEach((slot, i) => {
            const item = workbenchItems[i];
            if(item) {
                slot.innerHTML = `<img src="${item.icon_url}" class="item-icon-small" title="${item.name}">`;
                itemCount++;
            } else {
                slot.innerHTML = '';
            }
        });
        analyzeWorkbenchButton.disabled = itemCount !== 10;
        if(itemCount === 10) {
            workbenchInfo.textContent = "Bereit zur Analyse!";
        } else {
            workbenchInfo.textContent = `Ziehe ${10 - itemCount} weitere(s) Item(s) hierher.`;
        }
    }

    analyzeWorkbenchButton.addEventListener('click', () => {
        const result = calculateTradeUp(workbenchItems, SKINS_DB, RARITY_ORDER, LIVE_PRICES);
        if (result) {
            displayTradeUps([result], "Analyse & Ergebnisse der Werkbank");
        } else {
            displayTradeUps([], "Analyse & Ergebnisse der Werkbank");
        }
    });

    // ---- Stammbaum Logik ----
    skinSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        skinSearchResults.innerHTML = '';
        if (query.length < 2) return;
        const results = [];
        for (const collection in SKINS_DB) {
            for (const rarity in SKINS_DB[collection]) {
                SKINS_DB[collection][rarity].forEach(skin => {
                    if (skin.name.toLowerCase().includes(query)) {
                        results.push({ ...skin, collection, rarity });
                    }
                });
            }
        }
        results.slice(0, 5).forEach(skin => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `<span>${skin.name}</span>`;
            div.onclick = () => {
                skinSearchInput.value = '';
                skinSearchResults.innerHTML = '';
                stammbaumHistory = []; // Setze die History bei neuer Suche zurück
                updateStammbaumView(skin);
            };
            skinSearchResults.appendChild(div);
        });
    });

    stammbaumBackButton.addEventListener('click', () => {
        if (stammbaumHistory.length > 1) {
            stammbaumHistory.pop(); // Entferne aktuellen Skin
            const previousSkin = stammbaumHistory[stammbaumHistory.length - 1];
            updateStammbaumView(previousSkin, false); // Update ohne neuen History-Eintrag
        }
    });

    function updateStammbaumView(skin, addToHistory = true) {
        if (addToHistory) {
            stammbaumHistory.push(skin);
        }
        stammbaumBackButton.classList.toggle('hidden', stammbaumHistory.length <= 1);
        displayStammbaum(skin);
        displaySkinDetails(skin);
    }

    function displayStammbaum(targetSkin) {
        stammbaumDisplay.innerHTML = '';
        const treeElement = document.createElement('ul');
        treeElement.className = 'tree';
        buildTreeRecursive(targetSkin, treeElement);
        stammbaumDisplay.appendChild(treeElement);
    }

    function buildTreeRecursive(skin, parentElement) {
        const li = document.createElement('li');
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        const iconUrl = skin.icon_url || SKINS_DB[skin.collection]?.[skin.rarity]?.find(s => s.name === skin.name)?.icon_url || '';
        itemDiv.innerHTML = `<img src="https://community.cloudflare.steamstatic.com/economy/image/${iconUrl}" class="item-icon-small"><span>${skin.name} <small>(${skin.rarity})</small></span>`;
        itemDiv.onclick = () => updateStammbaumView(skin);
        li.appendChild(itemDiv);
        parentElement.appendChild(li);
        const requiredInputs = findInputsForSkin(skin, SKINS_DB, RARITY_ORDER);
        if (requiredInputs.length > 0) {
            const ul = document.createElement('ul');
            li.appendChild(ul);
            requiredInputs.forEach(inputSkin => buildTreeRecursive(inputSkin, ul));
        }
    }
    
    function displaySkinDetails(skin) {
        const price = LIVE_PRICES[skin.name] || skin.price || 0.00;
        const iconUrl = skin.icon_url || SKINS_DB[skin.collection]?.[skin.rarity]?.find(s => s.name === skin.name)?.icon_url || '';
        skinDetailPanel.innerHTML = `<h3>${skin.name}</h3>
            <img src="https://community.cloudflare.steamstatic.com/economy/image/${iconUrl}" class="item-icon" style="background-color: var(--bg-color); border-radius: 5px; margin-bottom: 15px;">
            <p><strong>Sammlung:</strong> ${skin.collection}</p>
            <p><strong>Seltenheit:</strong> ${skin.rarity}</p>
            <p><strong>Preis:</strong> ~$${price.toFixed(2)}</p>`;
    }

    // ---- Anzeige-Funktionen ----
    function displayInventory(inventory) {
        inventoryList.innerHTML = '';
        inventory.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            itemEl.draggable = true;
            itemEl.id = item.id;
            
            itemEl.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', item.id);
                e.currentTarget.classList.add('grabbing');
            });
             itemEl.addEventListener('dragend', e => {
                e.currentTarget.classList.remove('grabbing');
            });

            const stTag = item.is_stattrak ? '<span class="st-tag">ST</span>' : '';
            itemEl.innerHTML = `
                <img src="${item.icon_url}" class="item-icon" alt="${item.name}">
                <div class="item-details">
                    <span>${stTag} ${item.name.replace('StatTrak™ ', '')}</span>
                    <small>${item.rarity || 'N/A'}</small>
                    <span class="item-price">~$${(item.price || 0.05).toFixed(2)}</span>
                </div>`;
            inventoryList.appendChild(itemEl);
        });
    }

    function displayTradeUps(combinations, title) {
        document.querySelector('.trade-up-panel h2').textContent = title;
        tradeUpList.innerHTML = '';
        if (!combinations || combinations.length === 0) {
            tradeUpList.innerHTML = `<p class="panel-info">Keine gültigen Kombinationen gefunden.</p>`;
            return;
        }
        combinations.sort((a,b) => b.profit - a.profit);
        combinations.forEach(combo => {
            const comboEl = document.createElement('div');
            comboEl.className = 'trade-up-combo';
            const profitClass = combo.profit >= 0 ? 'profit' : 'loss';
            const profitSign = combo.profit >= 0 ? '+' : '';
            const stLabel = combo.type === 'stattrak' ? '<span class="st-tag">ST</span> ' : '';
            comboEl.innerHTML = `<div class="trade-up-summary">
                    <div>${stLabel}${combo.inputItems[0].rarity} → ${combo.outputRarity}</div>
                    <div>Input: ~$${combo.inputValue.toFixed(2)}</div>
                    <div>EV: ~$${combo.expectedValue.toFixed(2)}</div>
                    <div class="${profitClass}">${profitSign}~$${combo.profit.toFixed(2)}</div>
                </div>`;
            tradeUpList.appendChild(comboEl);
        });
    }
});
