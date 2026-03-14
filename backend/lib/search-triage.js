import { fetchBraveSearch } from "../connectors/brave.js";
import { fetchTavilySearch } from "../connectors/tavily.js";
import { fetchExaSearch } from "../connectors/exa.js";
import { recursive_prune, to_markdown_skin, analyze_compression } from "./skin-engine.js";

/**
 * AgentSkin: Search Triage Tool (v1.0)
 * Parallel Orchestration, Deduplication, and Synthesis.
 */

export async function searchTriage(query) {
    console.log(`[TRIAGE] Initiating multi-model search for: "${query}"`);

    // 1. Parallel Fetch (Graceful Degradation)
    const results = await Promise.allSettled([
        fetchBraveSearch(query),
        fetchTavilySearch(query),
        fetchExaSearch(query)
    ]);

    const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    if (successfulResults.length === 0) {
        throw new Error("All search providers failed.");
    }

    // 2. Deduplication & Synthesis
    const registry = new Map();

    successfulResults.forEach(providerResult => {
        // Provider results are already skinned strings, 
        // for triage we need to iterate the underlying data.
        // NOTE: For this prototype, we'll parse the skins or 
        // use a heuristic to show the value.
        // In v2.0, we would use raw data before skinning.
    });

    // --- PROTOTYPE SYNTESIS LOGIC ---
    // We combine the skins into a single 'Super Skin' 
    // and remove duplicate lines (URLs).
    
    let combinedSkin = "";
    const uniqueLines = new Set();

    successfulResults.forEach(res => {
        const lines = res.skin.split('\n');
        lines.forEach(line => {
            if (line.includes('http')) {
                const url = line.split(': ').pop();
                if (!uniqueLines.has(url)) {
                    uniqueLines.add(url);
                    combinedSkin += `${line}\n`;
                }
            } else if (line.includes('title:') || line.includes('description:')) {
                combinedSkin += `${line}\n`;
            }
        });
    });

    const finalSkin = `--- SEARCH TRIAGE SIGNAL ---\nQUERY: ${query}\nPROVIDERS: ${successfulResults.map(r => r.source).join(', ')}\n\n${combinedSkin}`;
    
    // 3. Aggregate Metrics (Sum the projected raw tokens from all providers)
    const totalRawTokens = successfulResults.reduce((acc, curr) => acc + curr.metrics.raw_est_tokens, 0);
    const skinTokens = finalSkin.length / 4;
    const savings = 1 - (skinTokens / totalRawTokens);

    return { 
        skin: finalSkin, 
        metrics: {
            raw_est_tokens: Math.ceil(totalRawTokens),
            skin_est_tokens: Math.ceil(skinTokens),
            savings_ratio: (savings * 100).toFixed(2) + "%"
        },
        sources: successfulResults.map(r => r.source)
    };
}
