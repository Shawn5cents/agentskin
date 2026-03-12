/**
 * AgentSkin: Human Supervisor Dashboard (SERVERLESS MODE)
 * Polling Cloudflare KV via the /v1/logs endpoint.
 */

const logContainer = document.getElementById('activity-log');
const tokenStat = document.getElementById('stat-tokens');
const agentStat = document.getElementById('stat-agents');
const uptimeStat = document.getElementById('stat-uptime');

let totalTokensSaved = 0;
let activeAgents = new Set();
let startTime = Date.now();
let lastLogId = 0;

// 1. Polling Logic for Serverless (Replaces SSE)
async function fetchLogs() {
    try {
        const response = await fetch('/v1/logs');
        const logs = await response.json();
        
        logs.forEach(log => {
            if (log.id > lastLogId) {
                addLogEntry(log);
                lastLogId = log.id;
            }
        });
    } catch (error) {
        console.error("Failed to fetch logs:", error);
    }
}

function addLogEntry(data) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">[${data.time}]</span>
        <span class="log-agent">${data.agent}</span>
        <span class="log-action">${data.action}</span>
        <span class="log-time">savings: ${data.savings || 0}</span>
    `;

    logContainer.appendChild(entry);
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;

    // Update REAL Stats
    if (data.savings > 0) {
        totalTokensSaved += data.savings;
        tokenStat.innerText = totalTokensSaved.toLocaleString();
    }
    
    if (data.agent && data.agent !== 'anonymous') {
        activeAgents.add(data.agent);
        agentStat.innerText = activeAgents.size;
    }

    // Keep log clean
    while (logContainer.childNodes.length > 50) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function updateUptime() {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const secs = String(diff % 60).padStart(2, '0');
    uptimeStat.innerText = `${hrs}:${mins}:${secs}`;
}

// Start polling every 3 seconds
setInterval(fetchLogs, 3000);
setInterval(updateUptime, 1000);

console.log("AgentSkin Supervisor Dashboard: Polling KV store initialized.");
