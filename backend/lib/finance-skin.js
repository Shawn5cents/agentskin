/**
 * AgentSkin: Finance Skin (v1.0)
 * Specialized pruning for Stock and Crypto market data.
 */

const FINANCE_SIGNAL_KEYS = [
    'symbol', 'price', 'change', 'change_percent', 'volume', 
    'market_cap', 'high', 'low', 'last_updated'
];

const FINANCE_ALIASES = {
    'last_price': 'price',
    'last': 'price',
    'current_price': 'price',
    'ticker': 'symbol',
    'percent_change_24h': 'change_percent',
    'price_change_percentage_24h': 'change_percent'
};

export const skinFinance = (data) => {
    const pruneFinance = (item) => {
        if (Array.isArray(item)) return item.map(pruneFinance).filter(Boolean);
        if (typeof item === 'object' && item !== null) {
            const pruned = {};
            let hasSignal = false;
            for (let [key, value] of Object.entries(item)) {
                key = key.toLowerCase();
                const alias = FINANCE_ALIASES[key] || key;
                
                if (FINANCE_SIGNAL_KEYS.includes(alias)) {
                    pruned[alias] = value;
                    hasSignal = true;
                } else if (typeof value === 'object') {
                    const sub = pruneFinance(value);
                    if (sub && Object.keys(sub).length > 0) {
                        Object.assign(pruned, sub);
                        hasSignal = true;
                    }
                }
            }
            return hasSignal ? pruned : null;
        }
        return item;
    };

    const pruned = pruneFinance(data);
    let output = "--- FINANCE SIGNAL ---\n";
    const flatten = (obj, prefix = "") => {
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                flatten(v, `${prefix}${k}.`);
            } else {
                output += `${prefix}${k}: ${v}\n`;
            }
        }
    };

    if (pruned) flatten(pruned);
    return output.trim();
};
