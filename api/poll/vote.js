// api/poll/vote.js - Vercel Serverless Function
let pollCounts = {
    lula: 1435,
    bolsonaro: 1492
};

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const choice = String(body?.choice || '').trim();
            if (choice === '13') pollCounts.lula++;
            if (choice === '22') pollCounts.bolsonaro++;
        } catch (e) {}
    }

    const total = pollCounts.lula + pollCounts.bolsonaro;
    return res.status(200).json({
        ok: true,
        total_votes: total,
        lula: pollCounts.lula,
        bolsonaro: pollCounts.bolsonaro,
        pct_lula: total > 0 ? Number((pollCounts.lula / total * 100).toFixed(1)) : 50.0,
        pct_bolsonaro: total > 0 ? Number((pollCounts.bolsonaro / total * 100).toFixed(1)) : 50.0
    });
}
