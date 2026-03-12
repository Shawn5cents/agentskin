/**
 * AgentSkin: Recursive Shorthand Engine
 * Intelligently prunes JSON to high-signal Markdown/TOON.
 */

export const recursive_prune = (data, requiredKeys) => {
    if (Array.isArray(data)) {
        return data.map(item => recursive_prune(item, requiredKeys)).filter(Boolean);
    }
    
    if (typeof data === 'object' && data !== null) {
        const pruned = {};
        let hasSignal = false;

        for (const [key, value] of Object.entries(data)) {
            if (requiredKeys.includes(key)) {
                pruned[key] = value;
                hasSignal = true;
            } else if (typeof value === 'object') {
                const subPruned = recursive_prune(value, requiredKeys);
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

/**
 * Converts Pruned JSON to High-Density Markdown
 */
export const to_markdown_skin = (prunedData, title) => {
    let md = `### 💎 Skin: ${title}\n`;
    
    const flatten = (obj, indent = "") => {
        if (Array.isArray(obj)) {
            obj.forEach(item => flatten(item, indent + "- "));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'object') {
                    md += `${indent}**${k}:**\n`;
                    flatten(v, indent + "  ");
                } else {
                    md += `${indent}**${k}:** ${v}\n`;
                }
            }
        }
    };

    flatten(prunedData);
    return md;
};
