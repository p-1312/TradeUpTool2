const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://bymykel.github.io/CSGO-API/api/de/all.json'; // Eine verlässliche, öffentliche API
const DB_PATH = path.join(__dirname, 'database.js');

async function generateDatabase() {
    console.log("Starte Download der CS:GO Item-Daten von der API...");
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`API nicht erreichbar: ${response.statusText}`);
        
        const allItems = await response.json();
        console.log(`${allItems.length} Items von der API geladen. Verarbeite und formatiere die Daten...`);

        const SKINS_DB = {};

        allItems.forEach(item => {
            if (!item.crates || item.crates.length === 0) return; // Nur Items aus Kisten/Sammlungen

            const collectionName = item.crates.name;
            if (!SKINS_DB[collectionName]) {
                SKINS_DB[collectionName] = {
                    "Consumer Grade": [], "Industrial Grade": [], "Mil-Spec": [],
                    "Restricted": [], "Classified": [], "Covert": []
                };
            }

            const rarity = item.rarity?.name;
            if (rarity && SKINS_DB[collectionName][rarity]) {
                SKINS_DB[collectionName][rarity].push({
                    name: item.name,
                    price: 0, // Preise werden live geholt
                    float_min: item.min_float || 0.00,
                    float_max: item.max_float || 1.00,
                    stat_trak: item.stat_trak || false,
                    icon_url: item.image
                });
            }
        });

        const fileContent = `const SKINS_DB = ${JSON.stringify(SKINS_DB, null, 4)};\n\nconst RARITY_ORDER = [ "Consumer Grade", "Industrial Grade", "Mil-Spec", "Restricted", "Classified", "Covert" ];\n\nmodule.exports = { SKINS_DB, RARITY_ORDER };`;

        fs.writeFileSync(DB_PATH, fileContent);
        console.log(`Erfolgreich! Die database.js wurde mit ${Object.keys(SKINS_DB).length} Sammlungen und tausenden Skins generiert.`);
        console.log("Du kannst den Backend-Server jetzt mit 'npm start' starten.");

    } catch (error) {
        console.error("Ein Fehler ist beim Generieren der Datenbank aufgetreten:", error);
    }
}

generateDatabase();