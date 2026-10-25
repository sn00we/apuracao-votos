// api/tse/municipios-map-data.js - Vercel Serverless Function
import fs from 'fs';
import path from 'path';

let cached = null;

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!cached) {
        try {
            const filePath = path.join(process.cwd(), 'seuimposto_municipios.json');
            cached = fs.readFileSync(filePath, 'utf8');
        } catch (e) {
            cached = '{}';
        }
    }

    return res.status(200).send(cached);
}
