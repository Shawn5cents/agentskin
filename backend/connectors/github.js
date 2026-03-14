import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "../lib/skin-engine.js";

/**
 * GitHub Content Connector: High-Density Code Perception
 * Strips comments, whitespace, and metadata from raw code.
 */

export async function fetchGitHubContent(owner, repo, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  
  try {
    const response = await axios.get(url, { responseType: 'text' });
    const rawCode = response.data;

    // 1. "Skin" the code manually (Linguistic Pruning)
    const skinnedCode = rawCode
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
        .replace(/^\s*[\r\n]/gm, '')             // Remove empty lines
        .split('\n')
        .map(line => line.trimEnd())             // Remove trailing whitespace
        .join('\n');

    const metrics = analyze_compression({ code: rawCode }, skinnedCode);

    return { 
        skin: `[GITHUB:${owner}/${repo}/${path}]\n\n${skinnedCode}`, 
        metrics, 
        source: "GitHub" 
    };
  } catch (error) {
    console.error("GitHub Fetch Failed:", error.message);
    throw error;
  }
}
