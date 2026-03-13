import { fetchExaSearch } from "./backend/connectors/exa.js";
import dotenv from "dotenv";
dotenv.config();

async function runExaTest() {
    console.log("--- AGENTSKIN STRESS TEST: Exa Neural Search ---");
    
    const query = "Best frameworks for building autonomous agent fleets in 2026";
    console.log(`Searching Exa for: "${query}"...`);
    
    try {
        const { skin, metrics, source } = await fetchExaSearch(query);

        console.log(`\n--- AFTER (AGENTSKIN - ${source}) ---`);
        console.log(skin);

        console.log("\n--- METRICS ---");
        console.log(`Raw Est. Tokens: ${metrics.raw_est_tokens}`);
        console.log(`Skin Est. Tokens: ${metrics.skin_est_tokens}`);
        console.log(`Token Savings: ${metrics.savings_ratio}`);

    } catch (error) {
        console.error("Exa Test Failed:", error.message);
    }
}

runExaTest();
