import urllib.request
import json

def fetch_cands(url, title):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    d = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print(f"\n=== {title} ===")
    print(f"Data TSE: {d.get('dg')} {d.get('hg')} | Seções: {d['s']['st']} / {d['s']['ts']} ({d['s']['pst']}%) | Votos Válidos: {d['v']['vv']}")
    for cg in d.get('carg', []):
        for agr in cg.get('agr', []):
            for p in agr.get('par', []):
                for c in p.get('cand', []):
                    pct = c.get('pvap')
                    print(f"[{p.get('sg')}] Nº {c.get('n')} - {c.get('nmu')} ({c.get('nm')}): {c.get('vap')} votos ({pct} pct)")

fetch_cands('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json', 'PRESIDENTE DA REPÚBLICA')
fetch_cands('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0003-e006259-u.json', 'GOVERNADOR DE ALAGOAS')
fetch_cands('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0005-e006259-u.json', 'SENADOR POR ALAGOAS')
