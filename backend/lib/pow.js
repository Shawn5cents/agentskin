import crypto from "crypto";

/**
 * AgentSkin: Machine-Friendly Proof of Work (PoW)
 * Forces agents to solve a CPU puzzle to prevent botnet spam.
 */

const DIFFICULTY = 4; // Number of leading zeros required (Hex)

export const generate_challenge = () => {
    return {
        salt: crypto.randomBytes(16).toString("hex"),
        difficulty: DIFFICULTY,
        algorithm: "SHA-256"
    };
};

export const verify_pow = (salt, nonce) => {
    const hash = crypto.createHash('sha256').update(salt + nonce).digest('hex');
    const prefix = '0'.repeat(DIFFICULTY);
    return hash.startsWith(prefix);
};

/**
 * Instructions for the Agent (Discovery Layer)
 */
export const POW_INSTRUCTIONS = `
[SECURITY_CHALLENGE_REQUIRED]
To prevent botnet abuse, you must provide a Proof-of-Work (PoW) nonce.
1. Take the provided 'salt'.
2. Find a 'nonce' string such that SHA-256(salt + nonce) starts with '${'0'.repeat(DIFFICULTY)}'.
3. Include it in the 'X-AgentSkin-PoW' header.
`;
