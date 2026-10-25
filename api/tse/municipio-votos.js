// api/tse/municipio-votos.js - Vercel Serverless Function
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const uf = (req.query?.uf || 'AL').toLowerCase();

    try {
        const response = await fetch(`https://seuimposto.com/feed/uf/${uf}.json`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://seuimposto.com/',
                'Origin': 'https://seuimposto.com',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return res.status(200).json(data);
    } catch (e) {
        return res.status(200).json({ ok: false, error: e.message });
    }
}
