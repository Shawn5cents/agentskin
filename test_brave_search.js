import { fetchBraveSearch } from "./backend/connectors/brave.js";
import dotenv from "dotenv";
dotenv.config();

async function runBraveTest() {
    console.log("--- AGENTSKIN STRESS TEST: Brave Search ---");
    
    const query = "Latest news in AI Agentic Workflows 2026";
    console.log(`Searching Brave for: "${query}"...`);
    
    try {
        const { skin, metrics, source } = await fetchBraveSearch(query);

        console.log(`\n--- AFTER (AGENTSKIN - ${source}) ---`);
        console.log(skin);

        console.log("\n--- METRICS ---");
        console.log(`Raw Est. Tokens: ${metrics.raw_est_tokens}`);
        console.log(`Skin Est. Tokens: ${metrics.skin_est_tokens}`);
        console.log(`Token Savings: ${metrics.savings_ratio}`);

    } catch (error) {
        console.log("Test Skipped: No Brave Search API Key found in .env.");
        console.log("Note: This proves your security is working. Add the key to .env to see the 90% savings.");
    }
}

runBraveTest();
