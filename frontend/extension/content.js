async function scanAndSendInventory() {
    try {
        const inventoryResponse = await fetch('https://steamcommunity.com/my/inventory/json/730/2?l=english&count=5000');
        if (!inventoryResponse.ok) throw new Error("Inventar-API nicht erreichbar");
        
        const inventoryData = await inventoryResponse.json();
        if (!inventoryData.success) throw new Error("Inventar-Antwort nicht erfolgreich");

        const descriptionsMap = Object.values(inventoryData.rgDescriptions).reduce((map, desc) => {
            map[desc.classid + '_' + desc.instanceid] = desc;
            return map;
        }, {});

        const items = Object.values(inventoryData.rgInventory).map(asset => {
            const description = descriptionsMap[asset.classid + '_' + asset.instanceid];
            if (!description) return null;
            const getTag = (category) => description.tags?.find(t => t.category === category)?.localized_tag_name || null;
            
            return {
                name: description.market_hash_name,
                is_stattrak: description.market_hash_name.includes('StatTrak™'),
                rarity: getTag('Rarity'),
                collection: getTag('ItemSet'),
                exterior: getTag('Exterior'),
                icon_url: `https://community.cloudflare.steamstatic.com/economy/image/${description.icon_url}`,
                float: Math.random()
            };
        }).filter(item => item !== null);
        
        const serverResponse = await fetch('http://localhost:3000/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items)
        });

        if (!serverResponse.ok) throw new Error('Server hat die Daten nicht akzeptiert.');
        chrome.runtime.sendMessage({ type: "INVENTORY_RESULT", message: `${items.length} Items erfolgreich gesendet!` });

    } catch (error) {
        chrome.runtime.sendMessage({ type: "INVENTORY_RESULT", message: `Fehler: ${error.message}` });
    }
}
scanAndSendInventory();