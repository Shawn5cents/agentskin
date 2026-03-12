import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "./backend/lib/skin-engine.js";

async function runSevereBenchmark() {
    console.log("\n==================================================");
    console.log("   AGENTSKIN v4.1: SEVERE WEATHER BENCHMARK");
    console.log("==================================================\n");

    const locations = [
        { name: "Enterprise, AL", url: "https://api.weather.gov/gridpoints/TAE/22,121/forecast" },
        { name: "Jacksonville, TX", url: "https://api.weather.gov/gridpoints/SHV/17,44/forecast" }
    ];

    for (const loc of locations) {
        console.log(`[FETCH] Retrieving raw forecast for ${loc.name}...`);
        try {
            const response = await axios.get(loc.url, {
                headers: { "User-Agent": "AgentSkin-Benchmark (shawn_nichols@nicholstransco.com)" }
            });

            // Skin for critical signals: name, temperature, and detailed outlook
            const signals = ["name", "temperature", "detailedForecast", "shortForecast"];
            const pruned = recursive_prune(response.data, signals);
            
            // Generate the skin
            const skin = to_markdown_skin(pruned, `SEVERE_OUTLOOK_${loc.name.replace(', ', '_').replace(' ', '_')}`, JSON.stringify(response.data).length);
            const metrics = analyze_compression(response.data, skin);

            console.log(`   - Raw Size: ${metrics.raw_est_tokens} tokens`);
            console.log(`   - AgentSkin: ${metrics.skin_est_tokens} tokens`);
            console.log(`   - Savings: ${metrics.savings_ratio}`);
            
            // Find the most detailed period (usually has severe warnings)
            const periods = pruned.properties?.periods || [];
            const severePeriod = periods.find(p => p.detailedForecast.toLowerCase().includes('severe') || p.detailedForecast.toLowerCase().includes('storm')) || periods[0];

            console.log(`   - SAMPLE SIGNAL:`);
            console.log(`      [${severePeriod.name}]: ${severePeriod.shortForecast}`);
            console.log(`      FORECAST: ${severePeriod.detailedForecast.substring(0, 100)}...\n`);

        } catch (e) {
            console.error(`   - Error benchmarking ${loc.name}: ${e.message}\n`);
        }
    }
}

runSevereBenchmark();
