
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { SKINS_DB, RARITY_ORDER } = require('./database.js');
const { updatePrices } = require('./price_worker.js');

const app = express();
const PORT = 3000;
const PRICES_FILE = path.join(__dirname, 'prices.json');

let userInventory = [];

// Stelle sicher, dass die Preis-Datei existiert, bevor der Server Anfragen annimmt.
if (!fs.existsSync(PRICES_FILE)) {
    console.log("[Server] prices.json nicht gefunden. Erstelle eine leere Datei, um Fehler zu vermeiden.");
    fs.writeFileSync(PRICES_FILE, JSON.stringify({}));
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Endpunkte
app.get('/api/skins', (req, res) => {
  res.json({
    skins: SKINS_DB,
    rarityOrder: RARITY_ORDER
  });
});

app.get('/api/prices', (req, res) => {
    // Sende die Datei, die nun garantiert existiert.
    res.sendFile(PRICES_FILE);
});

app.post('/api/inventory', (req, res) => {
  console.log(`[Server] Empfange Inventar mit ${req.body.length} Items.`);
  userInventory = req.body;
  res.status(200).json({ message: 'Inventar erfolgreich empfangen.' });
});

app.get('/api/inventory', (req, res) => {
  res.status(200).json(userInventory);
});

// Liefert die Hauptseite für alle anderen Anfragen
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Backend-Server läuft auf http://localhost:${PORT}`);
  console.log(`====================================================`);
  
  // Starte den Preis-Worker im Hintergrund, um die UI nicht zu blockieren.
  console.log("Starte initialen Preis-Scan im Hintergrund... Dies kann einige Minuten dauern.");
  updatePrices(); // Führe es einmal beim Start aus
  setInterval(updatePrices, 6 * 60 * 60 * 1000); // Und dann alle 6 Stunden
});