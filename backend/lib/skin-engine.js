import { skinReasoning } from './reasoning-skin.js';
import { skinLogistics } from './logistics-skin.js';
import { skinFinance } from './finance-skin.js';

/**
 * AgentSkin: Master Semantic Engine (v4.4 Lab)
 * Modular Industry-Specific Skins.
 */

// Export individual tools for specific options
export { skinReasoning, skinLogistics, skinFinance };

const DEFAULT_SIGNAL_KEYS = [
    'id', 'name', 'title', 'value', 'status', 'price', 'temp', 'wind', 
    'description', 'url', 'link', 'published_at', 'text', 'code', 'c', 'v', 'p'
];

export const recursive_prune = (data, requiredKeys = [], applyReasoningSkin = false) => {
    const signalKeys = [...new Set([...DEFAULT_SIGNAL_KEYS, ...requiredKeys])];
    
    if (Array.isArray(data)) {
        return data.map(item => recursive_prune(item, requiredKeys, applyReasoningSkin)).filter(Boolean);
    }
    
    if (typeof data === 'object' && data !== null) {
        const pruned = {};
        let hasSignal = false;
        for (const [key, value] of Object.entries(data)) {
            if (signalKeys.includes(key.toLowerCase())) {
                let processedValue = value;
                if (applyReasoningSkin && typeof value === 'string') {
                    const { skin } = skinReasoning(value);
                    processedValue = skin;
                }
                pruned[key] = processedValue;
                hasSignal = true;
            } else if (typeof value === 'object') {
                const subPruned = recursive_prune(value, requiredKeys, applyReasoningSkin);
                if (subPruned && Object.keys(subPruned).length > 0) {
                    pruned[key] = subPruned;
                    hasSignal = true;
                }
            }
        }
        return hasSignal ? pruned : null;
    }
    
    return data;
};

export const to_markdown_skin = (prunedData, title = "", rawDataSize = 0) => {
    let output = "";
    // Only add title if it doesn't break the token budget for tiny data
    if (title && rawDataSize > 500) output += `[${title}]\n`;
    
    const flatten = (obj, indent = "") => {
        if (Array.isArray(obj)) {
            obj.forEach(item => flatten(item, indent));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'object') {
                    flatten(v, indent + `${k}.`);
                } else {
                    output += `${indent}${k}: ${v}\n`;
                }
            }
        } else {
            output += `${indent}${obj}\n`;
        }
    };

    flatten(prunedData);
    return output.trim();
};

export const analyze_compression = (rawJson, skinText) => {
    const rawStr = JSON.stringify(rawJson);
    const rawTokens = rawStr.length / 4;
    const skinTokens = skinText.length / 4;
    
    // Safety Valve: If Skin is bigger or nearly equal, return 0 savings
    if (skinText.length >= rawStr.length) {
        return {
            raw_est_tokens: Math.ceil(rawTokens),
            skin_est_tokens: Math.ceil(rawTokens), // Use raw size
            savings_ratio: "0.00%",
            platform_fee: 0,
            applied: false
        };
    }
    
    const savings = 1 - (skinTokens / rawTokens);
    return {
        raw_est_tokens: Math.ceil(rawTokens),
        skin_est_tokens: Math.ceil(skinTokens),
        savings_ratio: (savings * 100).toFixed(2) + "%",
        platform_fee: Math.ceil(rawTokens * 0.9 * 0.20),
        applied: true
    };
};
