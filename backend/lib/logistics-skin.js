/**
 * AgentSkin: Logistics Skin (v1.0)
 * Specialized pruning for EDI, TMS, and ELD data.
 */

const LOGISTICS_SIGNAL_KEYS = [
    'load_id', 'origin', 'dest', 'status', 'rate', 'eta'
];

const KEY_ALIASES = {
    'destination': 'dest',
    'delivery_date': 'eta',
    'pickup_date': 'origin_date',
    'equipment_type': 'eq'
};

export const skinLogistics = (data) => {
    const pruneLogistics = (item) => {
        if (Array.isArray(item)) return item.map(pruneLogistics).filter(Boolean);
        if (typeof item === 'object' && item !== null) {
            const pruned = {};
            let hasSignal = false;
            for (let [key, value] of Object.entries(item)) {
                key = key.toLowerCase();
                const alias = KEY_ALIASES[key] || key;
                
                if (LOGISTICS_SIGNAL_KEYS.includes(alias)) {
                    pruned[alias] = value;
                    hasSignal = true;
                } else if (typeof value === 'object') {
                    const sub = pruneLogistics(value);
                    if (sub && Object.keys(sub).length > 0) {
                        // Merge sub-keys into parent to flatten structure
                        Object.assign(pruned, sub);
                        hasSignal = true;
                    }
                }
            }
            return hasSignal ? pruned : null;
        }
        return item;
    };

    const pruned = pruneLogistics(data);
    
    // 2. High-Density Formatting
    let output = "--- LOGISTICS SIGNAL ---\n";
    const flatten = (obj, prefix = "") => {
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                flatten(v, `${prefix}${k}.`);
            } else if (Array.isArray(v)) {
                v.forEach((item, i) => flatten(item, `${prefix}${k}[${i}].`));
            } else {
                output += `${prefix}${k}: ${v}\n`;
            }
        }
    };

    if (pruned) flatten(pruned);
    return output.trim();
};
