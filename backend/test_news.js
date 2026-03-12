import dotenv from "dotenv";
import { get_news_mediastack } from "./connectors/mediastack.js";

dotenv.config();

async function test() {
  console.log("--- AgentSkin: News Skin Test ---");
  try {
    const result = await get_news_mediastack("artificial intelligence");
    console.log("SUCCESS! Skin Generated:");
    console.log(result.skin);
    console.log("--- End of Test ---");
  } catch (error) {
    console.error("FAIL: News Skin generation failed.");
    console.error(error.message);
  }
}

test();
