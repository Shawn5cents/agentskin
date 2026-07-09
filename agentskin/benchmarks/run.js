import fs from 'fs';
import path from 'path';
import { recursive_prune, to_markdown_skin } from '../backend/lib/skin-engine.js';
import tiktoken from '@dqbd/tiktoken';

const encoder = tiktoken.get_encoding('cl100k_base'); // GPT-4 tokenizer

const dataPath = path.join(process.cwd(), 'benchmarks', 'sample-weather.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const rawJson = JSON.stringify(data, null, 2);
const rawTokens = encoder.encode(rawJson).length;

const signals = ['temperature', 'windspeed'];
const aliases = { 'temperature_2m': 'temp', 'windspeed_10m': 'wind' };
const pruned = recursive_prune(data, signals, aliases);
const skin = to_markdown_skin(pruned, 'Weather API', rawJson.length);
const skinTokens = encoder.encode(skin).length;

console.log('Benchmark Results:');
console.log('Raw JSON tokens:', rawTokens);
console.log('Skinned Markdown tokens:', skinTokens);
console.log('Savings:', ((1 - skinTokens / rawTokens) * 100).toFixed(1) + '%');
console.log('\\nRaw preview:', rawJson.slice(0, 200) + '...');
console.log('\\nSkin:', skin);