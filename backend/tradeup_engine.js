function findTradeUpCombinations(inventory, SKINS_DB, RARITY_ORDER, LIVE_PRICES) {
    const combinations = [];
    const itemsByType = { normal: {}, stattrak: {} };

    inventory.forEach(item => {
        const type = item.is_stattrak ? 'stattrak' : 'normal';
        if (!item.rarity || !item.collection) return;
        if (!itemsByType[type][item.rarity]) itemsByType[type][item.rarity] = [];
        itemsByType[type][item.rarity].push(item);
    });

    for (const type in itemsByType) {
        for (const rarity in itemsByType[type]) {
            const items = itemsByType[type][rarity];
            if (items.length < 10) continue;
            
            const allCombos = getCombinations(items, 10);
            
            allCombos.forEach(combo => {
                const result = calculateTradeUp(combo, SKINS_DB, RARITY_ORDER, LIVE_PRICES);
                if (result) {
                    result.type = type;
                    combinations.push(result);
                }
            });
        }
    }
    return combinations;
}

function getCombinations(array, size) {
    if (array.length > 15) {
        const sorted = [...array].sort((a,b) => (a.price || 0) - (b.price || 0));
        return [sorted.slice(0, 10)];
    }
    const result = [];
    function C(index, temp) {
        if (temp.length === size) { result.push([...temp]); return; }
        if (index === array.length) return;
        temp.push(array[index]); C(index + 1, temp); temp.pop(); C(index + 1, temp);
    }
    C(0, []);
    return result;
}

function calculateTradeUp(inputItems, SKINS_DB, RARITY_ORDER, LIVE_PRICES) {
    if (inputItems.length !== 10) return null;

    const inputRarity = inputItems.rarity;
    const isStatTrak = inputItems.is_stattrak;
    const nextRarityIndex = RARITY_ORDER.indexOf(inputRarity) + 1;
    if (nextRarityIndex >= RARITY_ORDER.length) return null;

    const outputRarity = RARITY_ORDER[nextRarityIndex];
    const inputValue = inputItems.reduce((sum, item) => sum + item.price, 0);
    const avgInputFloat = inputItems.reduce((sum, item) => sum + item.float, 0) / 10;
    
    let possibleOutcomes = [];
    const collectionsInTrade = [...new Set(inputItems.map(item => item.collection))];

    collectionsInTrade.forEach(collectionName => {
        const collectionDB = SKINS_DB[collectionName];
        if (collectionDB && collectionDB[outputRarity]) {
            collectionDB[outputRarity].forEach(outcomeSkin => {
                if (isStatTrak === outcomeSkin.stat_trak) {
                    const outputFloat = (outcomeSkin.float_max - outcomeSkin.float_min) * avgInputFloat + outcomeSkin.float_min;
                    const priceName = isStatTrak ? `StatTrak™ ${outcomeSkin.name}` : outcomeSkin.name;
                    const price = LIVE_PRICES[priceName] || outcomeSkin.price || 0;
                    possibleOutcomes.push({ ...outcomeSkin, price: price, calculated_float: outputFloat });
                }
            });
        }
    });

    if (possibleOutcomes.length === 0) return null;

    const probability = 1 / possibleOutcomes.length;
    const expectedValue = possibleOutcomes.reduce((sum, outcome) => sum + (outcome.price * probability), 0);
    const profit = expectedValue - inputValue;

    return { inputItems, inputValue, avgInputFloat, outputRarity, outcomes: possibleOutcomes, probability, expectedValue, profit };
}

function findInputsForSkin(targetSkin, SKINS_DB, RARITY_ORDER) { /* unverändert */ }