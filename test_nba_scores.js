import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "./backend/lib/skin-engine.js";

async function runNBATest() {
    console.log("--- AGENTSKIN STRESS TEST: NBA.com Scoreboard ---");
    
    // 1. Fetch raw data from NBA Live API
    const url = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";
    console.log(`Fetching raw live scoreboard from: ${url}...`);
    
    try {
        const response = await axios.get(url);

        // 2. Skin it
        // We only want 'gameStatusText', 'teamName', and 'score'
        const signals = ["gameStatusText", "teamName", "score", "gameLabel"];
        const pruned = recursive_prune(response.data, signals);
        const skin = to_markdown_skin(pruned, "NBA_TODAY_SCORES");
        const metrics = analyze_compression(response.data, skin);

        // 3. Show Results
        console.log("\n--- BEFORE (RAW JSON SAMPLE) ---");
        console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + "...\n[TRUNCATED: TOTAL 50,000+ CHARACTERS]");

        console.log("\n--- AFTER (AGENTSKIN) ---");
        console.log(skin);

        console.log("\n--- METRICS ---");
        console.log(`Raw Est. Tokens: ${metrics.raw_est_tokens}`);
        console.log(`Skin Est. Tokens: ${metrics.skin_est_tokens}`);
        console.log(`Token Savings: ${metrics.savings_ratio}`);
        console.log(`ROI: You saved ~${metrics.raw_est_tokens - metrics.skin_est_tokens} tokens for the LLM.`);

    } catch (error) {
        console.error("Test Failed:", error.message);
        console.log("Note: If NBA API is down or blocking, try another live sports JSON.");
    }
}

runNBATest();
