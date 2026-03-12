import { EventEmitter } from "events";

/**
 * AgentSkin: Real-Time Event Hub
 * Broadcasts Live Agent Activity to the Supervisor Dashboard (SSE).
 */

const eventEmitter = new EventEmitter();
const CLIENTS = [];

export const broadcast_activity = (agentId, action, source, savings) => {
    const event = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        agent: agentId,
        action,
        source,
        savings
    };

    eventEmitter.emit("activity", event);
};

export const register_sse_client = (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const onActivity = (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    eventEmitter.on("activity", onActivity);

    req.on("close", () => {
        eventEmitter.removeListener("activity", onActivity);
    });
};
