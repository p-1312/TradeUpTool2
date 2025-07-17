document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const scanButton = document.getElementById('scanButton');

    scanButton.addEventListener('click', () => {
        statusEl.textContent = 'Lese Inventar auf Steam-Seite...';
        scanButton.disabled = true;

        // Finde den aktiven Tab, um das Skript dort auszuführen
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length === 0) {
                statusEl.textContent = 'Fehler: Kein aktiver Tab gefunden.';
                scanButton.disabled = false;
                return;
            }

            // KORREKTUR: Es muss tabs[0].id verwendet werden, da tabs ein Array ist.
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
            });
        });
    });
    
    // Lausche auf die finale Nachricht vom content script
    chrome.runtime.onMessage.addListener(function listener(request, sender, sendResponse) {
        if (request.type === "INVENTORY_RESULT") {
            statusEl.textContent = request.message;
            scanButton.disabled = false; // Button wieder aktivieren
        }
        // Wichtig: Der Listener muss nicht entfernt werden, da er nur einmal pro Klick gebraucht wird.
    });
});