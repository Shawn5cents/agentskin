import { fetchTavilySearch } from "./backend/connectors/tavily.js";
import dotenv from "dotenv";
dotenv.config();

async function runTavilyTest() {
    console.log("--- AGENTSKIN STRESS TEST: Tavily Search ---");
    
    const query = "Best practices for AI Agent token optimization 2026";
    console.log(`Searching Tavily for: "${query}"...`);
    
    try {
        const { skin, metrics, source } = await fetchTavilySearch(query);

        console.log(`\n--- AFTER (AGENTSKIN - ${source}) ---`);
        console.log(skin);

        console.log("\n--- METRICS ---");
        console.log(`Raw Est. Tokens: ${metrics.raw_est_tokens}`);
        console.log(`Skin Est. Tokens: ${metrics.skin_est_tokens}`);
        console.log(`Token Savings: ${metrics.savings_ratio}`);

    } catch (error) {
        console.error("Tavily Test Failed:", error.message);
    }
}

runTavilyTest();
