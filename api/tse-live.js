// api/tse-live.js - Vercel Serverless Edge Function
// Puxa em tempo real do stream oficial do SeuImposto (Cloudflare Edge GRU)
// Responde em sub-100ms diretamente da edge em São Paulo 24/7 sem precisar de PC ligado

import fs from 'fs';
import path from 'path';

let cachedBackupData = null;

function getBackupData() {
    if (cachedBackupData) return cachedBackupData;
    try {
        const filePath = path.join(process.cwd(), 'dados_tse_atual.json');
        cachedBackupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return cachedBackupData;
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1, stale-while-revalidate=1');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const t0 = Date.now();

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);

        const url = `https://seuimposto.com/feed/agora.json?t=${Date.now()}`;
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://seuimposto.com/',
                'Origin': 'https://seuimposto.com',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, max-age=0',
                'Pragma': 'no-cache'
            }
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`SeuImposto status ${response.status}`);
        }

        const agora = await response.json();
        const pres = agora.presidente || {};
        const br = pres.br || {};
        const vDict = br.votos || {};
        const v13 = Number(vDict['13'] || 0);
        const v22 = Number(vDict['22'] || 0);
        const validos = v13 + v22;
        const secTot = Number(br.secoes || 499248);
        const secApu = Number(br.totalizadas || 0);
        const pctSec = secTot > 0 ? `${((secApu / secTot) * 100).toFixed(2)}%`.replace('.', ',') : '0,00%';
        const pct13 = validos > 0 ? (v13 / validos) : 0;
        const pct22 = validos > 0 ? (v22 / validos) : 0;

        // Constrói a matriz das 28 UFs a partir do feed ao vivo
        const ufMatrix = {};
        for (const [ufKey, ufData] of Object.entries(pres.uf || {})) {
            const u = ufKey.toUpperCase();
            const u13 = Number(ufData.votos?.['13'] || 0);
            const u22 = Number(ufData.votos?.['22'] || 0);
            const uVal = u13 + u22;
            const uSecTot = Number(ufData.secoes || 0);
            const uSecApu = Number(ufData.totalizadas || 0);
            const uPctSec = uSecTot > 0 ? `${((uSecApu / uSecTot) * 100).toFixed(2)}%`.replace('.', ',') : '0,00%';
            const uPct13 = uVal > 0 ? (u13 / uVal) : 0;
            const uPct22 = uVal > 0 ? (u22 / uVal) : 0;
            const uLider = u22 > u13 ? '22' : (u13 > u22 ? '13' : '');

            ufMatrix[u] = {
                uf: u,
                nome: u,
                secoes_total: uSecTot,
                secoes_apuradas: uSecApu,
                pct_secoes: uPctSec,
                votos_validos: uVal,
                lider: uLider,
                lider_nome: uLider === '22' ? 'Flávio Bolsonaro' : (uLider === '13' ? 'Lula' : 'Aguardando'),
                lula_votos: u13,
                lula_pct: `${(uPct13 * 100).toFixed(2)}%`.replace('.', ','),
                bolsonaro_votos: u22,
                bolsonaro_pct: `${(uPct22 * 100).toFixed(2)}%`.replace('.', ','),
                delta_votos: Math.abs(u22 - u13),
                top3: [
                    { numero: '22', nome: 'Flávio Bolsonaro', partido: 'PL', votos: u22, pct_str: `${(uPct22 * 100).toFixed(2)}%`.replace('.', ',') },
                    { numero: '13', nome: 'Lula', partido: 'PT', votos: u13, pct_str: `${(uPct13 * 100).toFixed(2)}%`.replace('.', ',') }
                ]
            };
        }

        const backup = getBackupData() || {};

        const normalized = {
            status: 'online',
            turno: 2,
            last_sync: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            micro_engine: {
                status: 'online',
                metodo: 'Feed em Tempo Real // SeuImposto.com (Cloudflare Edge Stream)',
                fonte: 'https://seuimposto.com/feed/agora.json',
                seq: agora.seq,
                gerado: agora.gerado,
                tempo_ms: Date.now() - t0,
                secoes_total: secTot,
                secoes_apuradas: secApu,
                pct_secoes: pctSec,
                votos_validos: validos,
                delta_votos: Math.abs(v22 - v13),
                delta_pct: validos > 0 ? `${(Math.abs(v22 - v13) / validos * 100).toFixed(2)}%` : '0.00%',
                lider_nacional: v22 > v13 ? '22' : (v13 > v22 ? '13' : ''),
                lider_nome: v22 > v13 ? 'Flávio Bolsonaro' : (v13 > v22 ? 'Lula' : 'Aguardando Apuração')
            },
            pres: {
                secoes_total: secTot,
                secoes_apuradas: secApu,
                pct_secoes: pctSec,
                votos_validos: validos,
                total_votos: validos + Number(br.brancos || 0) + Number(br.nulos || 0),
                brancos: Number(br.brancos || 0),
                nulos: Number(br.nulos || 0),
                candidatos: [
                    {
                        id: '22',
                        numero: '22',
                        nome: 'Flávio Bolsonaro',
                        partido: 'PL',
                        votos: v22,
                        pct: pct22,
                        pct_str: `${(pct22 * 100).toFixed(2)}%`.replace('.', ','),
                        foto: 'fotos/pres_22.jpeg'
                    },
                    {
                        id: '13',
                        numero: '13',
                        nome: 'Lula',
                        partido: 'PT',
                        votos: v13,
                        pct: pct13,
                        pct_str: `${(pct13 * 100).toFixed(2)}%`.replace('.', ','),
                        foto: 'fotos/pres_13.jpeg'
                    }
                ]
            },
            uf_matrix: ufMatrix,
            gov_al: backup.gov_al || {},
            sen_al: backup.sen_al || {}
        };

        return res.status(200).json(normalized);

        throw new Error('Sem dados de backup');
    } catch (err) {
        const backup = getBackupData();
        if (backup) {
            backup.last_sync = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            return res.status(200).json(backup);
        }
        return res.status(500).json({ error: 'Erro ao conectar à apuração', details: err.message });
    }
}
