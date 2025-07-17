function findTradeUpCombinations(inventory, SKINS_DB, RARITY_ORDER) {
    const combinations = [];
    const itemsByRarity = {};

    inventory.forEach(item => {
        if (!item.rarity || !item.collection) return;
        if (!itemsByRarity[item.rarity]) itemsByRarity[item.rarity] = [];
        itemsByRarity[item.rarity].push(item);
    });

    for (const rarity in itemsByRarity) {
        if (itemsByRarity[rarity].length < 10) continue;
        
        // Vereinfachte Logik: Nimmt nur die 10 günstigsten Items
        const sortedItems = [...itemsByRarity[rarity]].sort((a, b) => a.price - b.price);
        const inputItems = sortedItems.slice(0, 10);
        
        const tradeUpResult = calculateTradeUp(inputItems, SKINS_DB, RARITY_ORDER);
        if (tradeUpResult) combinations.push(tradeUpResult);
    }
    return combinations;
}

function calculateTradeUp(inputItems, SKINS_DB, RARITY_ORDER) {
    const inputRarity = inputItems.rarity;
    const nextRarityIndex = RARITY_ORDER.indexOf(inputRarity) + 1;
    if (nextRarityIndex >= RARITY_ORDER.length) return null;

    const outputRarity = RARITY_ORDER[nextRarityIndex];
    const inputValue = inputItems.reduce((sum, item) => sum + (item.price || 0.05), 0);
    
    let possibleOutcomes = [];
    const collectionsInTrade = [...new Set(inputItems.map(item => item.collection))];

    collectionsInTrade.forEach(collectionName => {
        const collectionDB = SKINS_DB[collectionName];
        if (collectionDB && collectionDB[outputRarity]) {
            collectionDB[outputRarity].forEach(outcomeSkin => {
                possibleOutcomes.push(outcomeSkin);
            });
        }
    });

    if (possibleOutcomes.length === 0) return null;

    const probability = 1 / possibleOutcomes.length;
    const expectedValue = possibleOutcomes.reduce((sum, outcome) => sum + ((outcome.price || 0) * probability), 0);
    const profit = expectedValue - inputValue;

    return { inputItems, inputValue, outputRarity, outcomes: possibleOutcomes, probability, expectedValue, profit };
}

function findInputsForSkin(targetSkin, SKINS_DB, RARITY_ORDER) {
    const inputs = [];
    const targetRarityIndex = RARITY_ORDER.indexOf(targetSkin.rarity);
    if (targetRarityIndex < 1) return [];

    const inputRarity = RARITY_ORDER[targetRarityIndex - 1];
    const collectionSkins = SKINS_DB[targetSkin.collection];
    if (collectionSkins && collectionSkins[inputRarity]) {
        collectionSkins[inputRarity].forEach(skin => {
            inputs.push({ ...skin, collection: targetSkin.collection, rarity: inputRarity });
        });
    }
    return inputs;
}