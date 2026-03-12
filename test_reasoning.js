import { skinReasoning } from "./backend/lib/reasoning-skin.js";

const rawText = `
I think that actually, the best way to approach this problem is probably to use a recursive algorithm. 
Basically, what I mean is that due to the fact that the data structure is nested, we might need a 
solution that can potentially handle multiple levels. Honestly, it seems like a very good idea.
`;

console.log("--- AGENTSKIN: REASONING SKIN TEST ---");
console.log("\n[BEFORE]");
console.log(rawText.trim());

const { skin, metrics } = skinReasoning(rawText);

console.log("\n[AFTER]");
console.log(skin);

console.log("\n[METRICS]");
console.log(`Original Chars: ${rawText.length}`);
console.log(`Skinned Chars: ${skin.length}`);
console.log(`Reduction: ${metrics.percentReduced}%`);
console.log(`Token Benefit: ${metrics.netBenefit}`);
