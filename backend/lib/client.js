/**
 * AgentSkin Client SDK (v1.0)
 * One-line integration for any Agentic Application.
 */

export class AgentSkin {
    constructor(apiKey, baseUrl = "https://api.agentskin.dev") {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    /**
     * The "One-Line" Skin
     * Automatically fetches, prunes, and returns a token-optimized Skin.
     */
    async fetch(url, options = {}) {
        const proxyUrl = `${this.baseUrl}/v1/proxy/${url}`;
        const response = await fetch(proxyUrl, {
            method: options.method || 'GET',
            headers: {
                ...options.headers,
                'X-Agent-Key': this.apiKey,
                'Accept': 'text/markdown'
            },
            body: options.body ? JSON.stringify(options.body) : null
        });

        if (response.status === 402) {
            const data = await response.json();
            throw new Error(`PAYMENT_REQUIRED: ${data.checkout_url}`);
        }

        return await response.text();
    }

    /**
     * Direct JSON Transformation
     */
    async transform(jsonData, signals = []) {
        const response = await fetch(`${this.baseUrl}/v1/transform`, {
            method: 'POST',
            headers: {
                'X-Agent-Key': this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: jsonData, signals })
        });

        return await response.json();
    }
}
