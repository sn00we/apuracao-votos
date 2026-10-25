// api/reactions.js - Vercel Serverless Function
let reactionsCounts = {
    tenso: 1358,
    pipoca: 1012,
    picanha: 2445,
    capitao: 2510,
    virada: 1852
};

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const rid = String(body?.id || '').toLowerCase().trim();
            if (rid && reactionsCounts[rid] !== undefined) {
                reactionsCounts[rid]++;
            }
        } catch (e) {}
    }

    const total = Object.values(reactionsCounts).reduce((a, b) => a + b, 0);
    return res.status(200).json({
        ok: true,
        counts: reactionsCounts,
        total: total
    });
}
