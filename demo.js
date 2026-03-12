import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "./backend/lib/skin-engine.js";

async function runLegacyDemo() {
    console.log("\n==================================================");
    console.log("   AGENTSKIN v3.4: ZERO-INFLATION PROTOCOL");
    console.log("   Developer: shawn5cents");
    console.log("==================================================\n");

    const tests = [
        { 
            name: "GLOBAL WEATHER", 
            url: "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true",
            signals: ["temperature", "windspeed"]
        },
        { 
            name: "NBA LIVE SCORES", 
            url: "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json",
            signals: ["homeTeam", "awayTeam", "score"]
        },
        {
            name: "CRYPTO LIQUIDITY",
            url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
            signals: ["c", "v", "p"]
        }
    ];

    let totalRaw = 0;
    let totalSkin = 0;

    for (const test of tests) {
        console.log(`[PROCESS] Skinning ${test.name}...`);
        try {
            const response = await axios.get(test.url);
            const rawData = response.data;
            const rawSize = JSON.stringify(rawData).length;
            
            const pruned = recursive_prune(rawData, test.signals);
            const skin = to_markdown_skin(pruned, test.name, rawSize);
            const metrics = analyze_compression(rawData, skin);

            totalRaw += metrics.raw_est_tokens;
            totalSkin += metrics.skin_est_tokens;

            console.log(`   - Raw Data: ${metrics.raw_est_tokens} tokens`);
            console.log(`   - AgentSkin: ${metrics.skin_est_tokens} tokens`);
            console.log(`   - Efficiency: ${metrics.savings_ratio} SAVED`);
            
            // Show the "Skin" (First 3 lines)
            const preview = skin.split('\n').slice(0, 4).join('\n      ');
            console.log(`   - Visual Peek:\n      ${preview}...\n`);

        } catch (e) {
            console.log(`   - ${test.name} failed (skipping)\n`);
        }
    }

    const finalSavings = (1 - (totalSkin / totalRaw)) * 100;

    console.log("==================================================");
    console.log("   DEMO COMPLETE: THE AGENTSKIN VERDICT");
    console.log("==================================================");
    console.log(`   Total Raw Data: ${totalRaw} tokens`);
    console.log(`   Total AgentSkin: ${totalSkin} tokens`);
    console.log(`   GLOBAL SAVINGS: ${finalSavings.toFixed(2)}%`);
    console.log("--------------------------------------------------");
    console.log("   VALUE PROPOSITION:");
    console.log("   We only skin when it saves you money.");
    console.log("   No inflation. Pure signal.");
    console.log("==================================================\n");
}

runLegacyDemo();
