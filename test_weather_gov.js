import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "./backend/lib/skin-engine.js";

async function runTest() {
    console.log("--- AGENTSKIN STRESS TEST: weather.gov ---");
    
    // 1. Fetch raw data from NWS API (Washington D.C. Forecast)
    const url = "https://api.weather.gov/gridpoints/LWX/97,71/forecast";
    console.log(`Fetching raw JSON from: ${url}...`);
    
    try {
        const response = await axios.get(url, {
            headers: { "User-Agent": "AgentSkin-Test (shawn_nichols@nicholstransco.com)" }
        });

        // 2. Skin it
        // We only want 'name', 'temperature', 'detailedForecast'
        const signals = ["name", "temperature", "detailedForecast", "shortForecast"];
        const pruned = recursive_prune(response.data, signals);
        const skin = to_markdown_skin(pruned, "WEATHER_GOV_FORECAST");
        const metrics = analyze_compression(response.data, skin);

        // 3. Show Results
        console.log("\n--- BEFORE (RAW JSON SAMPLE) ---");
        console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + "...\n[TRUNCATED: TOTAL 20,000+ CHARACTERS]");

        console.log("\n--- AFTER (AGENTSKIN) ---");
        console.log(skin);

        console.log("\n--- METRICS ---");
        console.log(`Raw Est. Tokens: ${metrics.raw_est_tokens}`);
        console.log(`Skin Est. Tokens: ${metrics.skin_est_tokens}`);
        console.log(`Token Savings: ${metrics.savings_ratio}`);
        console.log(`Platform Fee (Est): ${metrics.platform_fee} credits`);

    } catch (error) {
        console.error("Test Failed:", error.message);
    }
}

runTest();
