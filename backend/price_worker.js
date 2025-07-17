const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { SKINS_DB } = require('./database.js');

const PRICES_FILE = path.join(__dirname, 'prices.json');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPrice(itemName) {
    try {
        const url = `https://steamcommunity.com/market/priceoverview/?appid=730¤cy=3&market_hash_name=${encodeURIComponent(itemName)}`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429) {
                await sleep(60000);
                return fetchPrice(itemName);
            }
            return null;
        }
        const data = await response.json();
        if (data.success) {
            return parseFloat(data.lowest_price.replace('€', '').replace(',', '.').trim());
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function updatePrices() {
    console.log("[Price Worker] Starte Update...");
    const allPrices = {};
    const allSkins = [];

    for (const collection in SKINS_DB) {
        for (const rarity in SKINS_DB[collection]) {
            SKINS_DB[collection][rarity].forEach(skin => {
                if (!allSkins.some(s => s.name === skin.name)) allSkins.push(skin);
                if (skin.stat_trak) {
                    const statTrakName = `StatTrak™ ${skin.name}`;
                    if (!allSkins.some(s => s.name === statTrakName)) allSkins.push({ name: statTrakName });
                }
            });
        }
    }
    
    for (let i = 0; i < allSkins.length; i++) {
        const skin = allSkins[i];
        const price = await fetchPrice(skin.name);
        if (price !== null) {
            allPrices[skin.name] = price;
            console.log(`[${i + 1}/${allSkins.length}] Preis für ${skin.name}: ${price}€`);
        }
        await sleep(2000);
    }

    fs.writeFileSync(PRICES_FILE, JSON.stringify(allPrices, null, 2));
    console.log(`[Price Worker] Update abgeschlossen.`);
}

module.exports = { updatePrices };