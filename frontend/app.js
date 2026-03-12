/**
 * AgentSkin: Human Supervisor Dashboard (REAL-TIME)
 * Listening to Server-Sent Events (SSE) from the Agentic Backend.
 */

const logContainer = document.getElementById('activity-log');
const tokenStat = document.getElementById('stat-tokens');
const agentStat = document.getElementById('stat-agents');
const uptimeStat = document.getElementById('stat-uptime');

let totalTokensSaved = 0;
let activeAgents = 0;
let startTime = Date.now();

// 1. Listen for REAL SSE Events
const eventSource = new EventSource('/v1/events');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    addLogEntry(data);
};

function addLogEntry(data) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">[${data.time}]</span>
        <span class="log-agent">${data.agent}</span>
        <span class="log-action">${data.action}</span>
        <span class="log-time">via ${data.source}</span>
    `;

    logContainer.appendChild(entry);
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;

    // Update REAL Stats
    if (data.savings > 0) {
        totalTokensSaved += data.savings;
        tokenStat.innerText = totalTokensSaved.toLocaleString();
    }
    
    if (data.action.includes('onboarded')) {
        activeAgents++;
        agentStat.innerText = activeAgents;
    }

    // Keep log clean
    if (logContainer.childNodes.length > 50) {
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

setInterval(updateUptime, 1000);
console.log("AgentSkin Supervisor Dashboard: Connected to SSE stream.");
