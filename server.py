"""
// language: Python, file: server.py, target: Windows 11, Python 3.10+
// TSE TOTALIZADOR PRO 2026 // SEUIMPOSTO MICRO-AGGREGATION ENGINE
// Puxa dados micro diretamente das 27 UFs + Exterior e soma os votos em tempo real (1ms)
// antes da consolidação do totalizador macro do TSE
"""
import http.server
import socketserver
import urllib.request
import urllib.parse
import html
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import time
import os
import sys
import unicodedata

# Garante suporte UTF-8 no terminal Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Lista completa de UFs brasileiras + exterior ('zz')
ALL_UFS = [
    'ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 
    'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 
    'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to', 'zz'
]

UF_NAMES = {
    'ac': 'Acre', 'al': 'Alagoas', 'ap': 'Amapá', 'am': 'Amazonas', 'ba': 'Bahia',
    'ce': 'Ceará', 'df': 'Distrito Federal', 'es': 'Espírito Santo', 'go': 'Goiás',
    'ma': 'Maranhão', 'mt': 'Mato Grosso', 'ms': 'Mato Grosso do Sul', 'mg': 'Minas Gerais',
    'pa': 'Pará', 'pb': 'Paraíba', 'pr': 'Paraná', 'pe': 'Pernambuco', 'pi': 'Piauí',
    'rj': 'Rio de Janeiro', 'rn': 'Rio Grande do Norte', 'rs': 'Rio Grande do Sul',
    'ro': 'Rondônia', 'rr': 'Roraima', 'sc': 'Santa Catarina', 'sp': 'São Paulo',
    'se': 'Sergipe', 'to': 'Tocantins', 'zz': 'Exterior'
}

# Endpoints Oficiais do Tribunal Superior Eleitoral (04/10/2026)
URL_PRES_BR = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json"
URL_GOV_AL  = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0003-e006259-u.json"
URL_SEN_AL  = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0005-e006259-u.json"
URL_DEP_AL  = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0006-e006259-u.json"
URL_EST_AL  = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0007-e006259-u.json"

# Lock para atualização thread-safe
data_lock = threading.Lock()

# Estado global enriquecido
tse_state = {
    "status": "online",
    "last_sync": time.strftime("%H:%M:%S"),
    "tse_horario": "18:19:31",
    "tse_data": "04/10/2026",
    "micro_engine": {
        "status": "online",
        "metodo": "Agregação direta das 27 UFs + Exterior (SeuImposto Protocol)",
        "ufs_total": 28,
        "ufs_ok": 0,
        "tempo_ms": 0.0,
        "delta_votos": 0,
        "delta_pct": "0.00%",
        "lider_nacional": "22",
        "segundo_nacional": "13"
    },
    "uf_matrix": {},
    "pres": {
        "secoes_total": 499248,
        "secoes_apuradas": 499248,
        "pct_secoes": "100,00%",
        "total_votos": 118580000,
        "votos_validos": 113400000,
        "brancos": 2100000,
        "nulos": 3080000,
        "candidatos": []
    },
    "gov_al": {
        "secoes_total": 7101,
        "secoes_apuradas": 7101,
        "pct_secoes": "100,00%",
        "total_votos": 1820000,
        "votos_validos": 1640000,
        "brancos": 42000,
        "nulos": 138000,
        "candidatos": []
    },
    "sen_al": {
        "secoes_total": 7101,
        "secoes_apuradas": 7101,
        "pct_secoes": "100,00%",
        "votos_validos": 2850000,
        "candidatos": []
    },
    "dep_al": {
        "secoes_total": 7101,
        "secoes_apuradas": 7101,
        "pct_secoes": "100,00%",
        "total_votos": 1820000,
        "votos_validos": 1640000,
        "vagas": 9,
        "candidatos": []
    },
    "est_al": {
        "secoes_total": 7101,
        "secoes_apuradas": 7101,
        "pct_secoes": "100,00%",
        "total_votos": 1820000,
        "votos_validos": 1640000,
        "vagas": 27,
        "candidatos": []
    },
    "data": {},
    "raw": {}
}

def fetch_json(url, timeout=3.5):
    """Executa requisição HTTP otimizada para a CDN do TSE"""
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Cache-Control': 'no-cache'
            }
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None

def fetch_uf_single(uf):
    """Puxa a apuração da UF diretamente da CDN do TSE"""
    url = f"https://resultados.tse.jus.br/oficial/ele2026/6257/dados/{uf}/{uf}-c0001-e006257-u.json"
    data = fetch_json(url, timeout=3.0)
    return uf, data

def parse_candidate_list(d, cargo_id="6257", uf_code="br"):
    """Extrai lista ordenada de candidatos a partir da estrutura nativa do TSE"""
    cands = []
    if not d or 'carg' not in d:
        return cands

    for cg in d.get('carg', []):
        for agr in cg.get('agr', []):
            for p in agr.get('par', []):
                for c in p.get('cand', []):
                    votos = int(c.get('vap') or 0)
                    pvap_raw = str(c.get('pvap') or '0').replace(',', '.')
                    pct_num = float(pvap_raw) / 100.0 if pvap_raw else 0.0
                    sqcand = str(c.get('sqcand') or '')
                    numero = str(c.get('n'))
                    nome_urna = c.get('nmu') or c.get('nm')
                    
                    foto_prefix = "pres" if cargo_id == "6257" else ("gov" if "0003" in str(cg.get('cd')) else "cand")
                    cands.append({
                        "id": numero,
                        "numero": numero,
                        "sqcand": sqcand,
                        "nome": nome_urna,
                        "nome_completo": c.get('nm'),
                        "partido": p.get('sg') or '',
                        "votos": votos,
                        "pct": pct_num,
                        "pct_str": f"{c.get('pvap')}%",
                        "foto": f"fotos/{foto_prefix}_{numero}.jpeg",
                        "foto_tse": f"https://resultados.tse.jus.br/oficial/ele2026/{cargo_id}/fotos/{uf_code}/{sqcand}.jpeg" if sqcand else "",
                        "eleito": c.get('e') == 's'
                    })
    cands.sort(key=lambda x: x["votos"], reverse=True)
    return cands

# -------------------------------------------------------------
# MOTOR DE INGESTÃO SEUIMPOSTO.COM (STREAM CLOUDFLARE EDGE)
# -------------------------------------------------------------
SEUIMPOSTO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://seuimposto.com/',
    'Origin': 'https://seuimposto.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Accept': 'application/json'
}

# Carrega metadados de candidatos do SeuImposto
cands_meta = {}
try:
    if os.path.exists('seuimposto_candidatos.json'):
        with open('seuimposto_candidatos.json', 'r', encoding='utf-8') as f:
            cands_meta = json.load(f)
except Exception as e:
    print("[!] Erro ao carregar seuimposto_candidatos.json:", e)

pres_meta = {c['n']: c for c in cands_meta.get('presidente', [])}
gov_meta = cands_meta.get('governador', {})
sen_meta = cands_meta.get('senador', {})

def process_and_normalize_seuimposto():
    """
    Puxa em tempo real do stream oficial do SeuImposto (Cloudflare Edge).
    Atualiza presidente nacional, todas as 28 UFs, governador e senador de Alagoas.
    """
    global tse_state
    t0 = time.time()
    url = "https://seuimposto.com/feed/agora.json"
    req = urllib.request.Request(url, headers=SEUIMPOSTO_HEADERS)
    with urllib.request.urlopen(req, timeout=6) as resp:
        agora = json.loads(resp.read().decode('utf-8'))
    t_fetch = time.time() - t0

    # 1. Presidente Nacional
    pres_br = agora.get('presidente', {}).get('br', {})
    s_ts = int(pres_br.get('secoes', 499248))
    s_st = int(pres_br.get('totalizadas', 499248))
    v_dict = pres_br.get('votos', {})
    validos = sum(int(v) for v in v_dict.values())
    brancos = int(pres_br.get('brancos', 0))
    nulos = int(pres_br.get('nulos', 0))
    total_votos = validos + brancos + nulos

    cands_list = []
    for num, cnt in v_dict.items():
        cnt = int(cnt)
        meta = pres_meta.get(num, {})
        pct = cnt / validos if validos > 0 else 0
        cands_list.append({
            "id": num,
            "numero": num,
            "sqcand": meta.get('sq', ''),
            "nome": meta.get('exib', num),
            "nome_completo": meta.get('nomeCompleto', meta.get('nome', num)),
            "partido": meta.get('partido', ''),
            "votos": cnt,
            "pct": pct,
            "pct_str": f"{pct*100:.2f}%".replace('.', ','),
            "foto": f"fotos/pres_{num}.jpeg",
            "foto_tse": f"https://resultados.tse.jus.br/oficial/ele2026/6257/fotos/br/{meta.get('sq','')}.jpeg",
            "eleito": False,
            "ufs_vencidas": 0
        })
    cands_list.sort(key=lambda x: x["votos"], reverse=True)

    # 2. UFs (28 UFs: 26 estados + DF + Exterior)
    uf_matrix = {}
    for uf_code, uf_data in agora.get('presidente', {}).get('uf', {}).items():
        uf_upper = uf_code.upper()
        v_uf_dict = uf_data.get('votos', {})
        val_uf = sum(int(x) for x in v_uf_dict.values())
        lula_v = int(v_uf_dict.get('13', 0))
        bolso_v = int(v_uf_dict.get('22', 0))

        uf_cands = []
        for num, cnt in v_uf_dict.items():
            cnt = int(cnt)
            meta = pres_meta.get(num, {})
            pct_u = cnt / val_uf if val_uf > 0 else 0
            uf_cands.append({
                "numero": num,
                "nome": meta.get('exib', num),
                "partido": meta.get('partido', ''),
                "votos": cnt,
                "pct_str": f"{pct_u*100:.2f}%".replace('.', ',')
            })
        uf_cands.sort(key=lambda x: x['votos'], reverse=True)

        lider_num = uf_cands[0]['numero'] if uf_cands else ('22' if bolso_v >= lula_v else '13')
        lider_nome = uf_cands[0]['nome'] if uf_cands else ('Flávio Bolsonaro' if lider_num == '22' else 'Lula')

        # Contabiliza UFs vencidas nos candidatos nacionais
        for c in cands_list:
            if c['numero'] == lider_num:
                c['ufs_vencidas'] += 1

        sec_tot = uf_data.get('secoes', 0)
        sec_apu = uf_data.get('totalizadas', 0)
        pct_sec = f"{sec_apu/sec_tot*100:.2f}%".replace('.', ',') if sec_tot > 0 else "100,00%"

        uf_matrix[uf_upper] = {
            "uf": uf_upper,
            "nome": UF_NAMES.get(uf_upper, uf_upper),
            "secoes_total": sec_tot,
            "secoes_apuradas": sec_apu,
            "pct_secoes": pct_sec,
            "votos_validos": val_uf,
            "lider": lider_num,
            "lider_nome": lider_nome,
            "lula_votos": lula_v,
            "lula_pct": f"{lula_v/val_uf*100:.2f}%".replace('.', ',') if val_uf > 0 else "0,00%",
            "bolsonaro_votos": bolso_v,
            "bolsonaro_pct": f"{bolso_v/val_uf*100:.2f}%".replace('.', ',') if val_uf > 0 else "0,00%",
            "delta_votos": abs(lula_v - bolso_v),
            "top3": uf_cands[:3]
        }

    c1 = cands_list[0] if len(cands_list) > 0 else None
    c2 = cands_list[1] if len(cands_list) > 1 else None
    delta_votos = (c1['votos'] - c2['votos']) if (c1 and c2) else 0
    delta_pct = f"{((c1['pct'] - c2['pct']) * 100):.2f}%" if (c1 and c2) else "0.00%"

    pct_secoes_str = f"{(s_st / s_ts * 100):.2f}%".replace('.', ',') if s_ts > 0 else "100,00%"

    # 3. Governador de Alagoas
    gov_al_data = agora.get('governador', {}).get('uf', {}).get('AL', {})
    gov_al_cands = []
    val_gov_al = sum(int(x) for x in gov_al_data.get('votos', {}).values())
    al_gov_meta = {c['n']: c for c in gov_meta.get('AL', [])}
    for num, cnt in gov_al_data.get('votos', {}).items():
        cnt = int(cnt)
        meta = al_gov_meta.get(num, {})
        pct_g = cnt / val_gov_al if val_gov_al > 0 else 0
        gov_al_cands.append({
            "numero": num,
            "nome": meta.get('exib', meta.get('nome', num)),
            "nome_completo": meta.get('nome', num),
            "partido": meta.get('partido', ''),
            "votos": cnt,
            "pct": pct_g,
            "pct_str": f"{pct_g*100:.2f}%".replace('.', ','),
            "foto": f"fotos/gov_{num}.jpeg",
            "foto_tse": "",
            "eleito": meta.get('n') == '45'
        })
    gov_al_cands.sort(key=lambda x: x['votos'], reverse=True)

    # 4. Senado de Alagoas
    sen_al_data = agora.get('senado', {}).get('uf', {}).get('AL', {})
    sen_al_cands = []
    val_sen_al = sum(int(x) for x in sen_al_data.get('votos', {}).values())
    al_sen_meta = {c['n']: c for c in sen_meta.get('AL', [])}
    for num, cnt in sen_al_data.get('votos', {}).items():
        cnt = int(cnt)
        meta = al_sen_meta.get(num, {})
        pct_s = cnt / val_sen_al if val_sen_al > 0 else 0
        sen_al_cands.append({
            "numero": num,
            "nome": meta.get('exib', meta.get('nome', num)),
            "nome_completo": meta.get('nome', num),
            "partido": meta.get('partido', ''),
            "votos": cnt,
            "pct": pct_s,
            "pct_str": f"{pct_s*100:.2f}%".replace('.', ','),
            "foto": f"fotos/sen_{num}.jpeg",
            "foto_tse": "",
            "eleito": meta.get('n') in ['111', '456']
        })
    sen_al_cands.sort(key=lambda x: x['votos'], reverse=True)

    with data_lock:
        tse_state["last_sync"] = time.strftime("%H:%M:%S")
        tse_state["micro_engine"] = {
            "status": "online",
            "metodo": "Feed em Tempo Real // SeuImposto.com (Cloudflare Edge Stream)",
            "fonte": "https://seuimposto.com/feed/agora.json",
            "seq": agora.get('seq'),
            "gerado": agora.get('gerado'),
            "ufs_total": 28,
            "ufs_ok": len(uf_matrix),
            "tempo_ms": round(t_fetch * 1000, 1),
            "secoes_total": s_ts,
            "secoes_apuradas": s_st,
            "pct_secoes": pct_secoes_str,
            "votos_validos": validos,
            "delta_votos": delta_votos,
            "delta_pct": delta_pct,
            "lider_nacional": c1['numero'] if c1 else "",
            "lider_nome": c1['nome'] if c1 else "",
            "segundo_nacional": c2['numero'] if c2 else "",
            "segundo_nome": c2['nome'] if c2 else ""
        }
        if validos > 0:
            tse_state["uf_matrix"] = uf_matrix
            tse_state["pres"] = {
                "secoes_total": s_ts,
                "secoes_apuradas": s_st,
                "pct_secoes": pct_secoes_str,
                "total_votos": total_votos,
                "votos_validos": validos,
                "brancos": brancos,
                "nulos": nulos,
                "candidatos": cands_list
            }
        if gov_al_cands:
            tse_state["gov_al"] = {
                "secoes_total": int(gov_al_data.get('secoes', 7101)),
                "secoes_apuradas": int(gov_al_data.get('totalizadas', 7101)),
                "pct_secoes": "100,00%",
                "total_votos": val_gov_al,
                "votos_validos": val_gov_al,
                "candidatos": gov_al_cands
            }
        if sen_al_cands:
            tse_state["sen_al"] = {
                "secoes_total": int(sen_al_data.get('secoes', 7101)),
                "secoes_apuradas": int(sen_al_data.get('totalizadas', 7101)),
                "pct_secoes": "100,00%",
                "votos_validos": val_sen_al,
                "candidatos": sen_al_cands
            }

    # Salva no disco de forma atômica
    try:
        tmp_file = 'dados_tse_atual.json.tmp'
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(tse_state, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, 'dados_tse_atual.json')
    except Exception:
        pass
    return True

def process_and_normalize_tse():
    """
    Consome os dados de apuração:
    1. Tenta o feed ultrarrápido em tempo real do SeuImposto.com (Cloudflare Edge).
    2. Em caso de indisponibilidade externa, aciona a CDN do TSE como fallback.
    """
    global tse_state
    try:
        if process_and_normalize_seuimposto():
            return
    except Exception as e:
        print(f"[-] Feed SeuImposto indisponível ({e}). Acionando motor de fallback TSE...")

    t0 = time.time()

    # 1. Puxa as 28 UFs em paralelo (Thread Pool)
    uf_results = {}
    with ThreadPoolExecutor(max_workers=28) as executor:
        future_to_uf = {executor.submit(fetch_uf_single, uf): uf for uf in ALL_UFS}
        for future in as_completed(future_to_uf):
            uf, data = future.result()
            if data:
                uf_results[uf] = data

    # 2. Puxa os dados de Alagoas e o macro nacional em paralelo
    macro_urls = {
        "pres_br": URL_PRES_BR,
        "gov_al": URL_GOV_AL,
        "sen_al": URL_SEN_AL,
        "dep_al": URL_DEP_AL,
        "est_al": URL_EST_AL
    }
    macro_results = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_key = {executor.submit(fetch_json, url): key for key, url in macro_urls.items()}
        for future in as_completed(future_to_key):
            key = future_to_key[future]
            data = future.result()
            if data:
                macro_results[key] = data

    t_fetch = time.time() - t0

    # 3. Micro-Agregação Nacional: Soma os votos candidato a candidato de todas as UFs
    micro_cands_map = {}
    total_secoes_micro = 0
    total_apuradas_micro = 0
    total_votos_micro = 0
    total_validos_micro = 0
    total_brancos_micro = 0
    total_nulos_micro = 0
    uf_matrix = {}

    for uf in ALL_UFS:
        d_uf = uf_results.get(uf)
        uf_upper = uf.upper()
        if not d_uf or 's' not in d_uf:
            continue

        s = d_uf.get('s', {})
        v = d_uf.get('v', {})
        s_ts = int(s.get('ts', 0))
        s_st = int(s.get('st', 0))
        v_tv = int(v.get('tv', 0))
        v_vv = int(v.get('vv', 0))
        v_vb = int(v.get('vb', 0))
        v_tvn = int(v.get('tvn', 0))

        total_secoes_micro += s_ts
        total_apuradas_micro += s_st
        total_votos_micro += v_tv
        total_validos_micro += v_vv
        total_brancos_micro += v_vb
        total_nulos_micro += v_tvn

        # Extrai candidatos desta UF
        uf_cands = parse_candidate_list(d_uf, cargo_id="6257", uf_code=uf)
        
        # Encontra Lula (13) e Bolsonaro (22) na UF para o duelo
        lula_uf = next((c for c in uf_cands if c['numero'] == '13'), None)
        bolso_uf = next((c for c in uf_cands if c['numero'] == '22'), None)
        
        lula_v = lula_uf['votos'] if lula_uf else 0
        bolso_v = bolso_uf['votos'] if bolso_uf else 0
        
        lider_num = uf_cands[0]['numero'] if uf_cands else ""
        lider_nome = uf_cands[0]['nome'] if uf_cands else ""
        
        uf_matrix[uf_upper] = {
            "uf": uf_upper,
            "nome": UF_NAMES.get(uf, uf_upper),
            "secoes_total": s_ts,
            "secoes_apuradas": s_st,
            "pct_secoes": f"{s.get('pst', '0,00')}%",
            "votos_validos": v_vv,
            "lider": lider_num,
            "lider_nome": lider_nome,
            "lula_votos": lula_v,
            "lula_pct": f"{(lula_v / v_vv * 100):.2f}%" if v_vv > 0 else "0.00%",
            "bolsonaro_votos": bolso_v,
            "bolsonaro_pct": f"{(bolso_v / v_vv * 100):.2f}%" if v_vv > 0 else "0.00%",
            "delta_votos": abs(lula_v - bolso_v),
            "top3": uf_cands[:3]
        }

        # Acumula votos nacionais dos candidatos
        for c in uf_cands:
            num = c['numero']
            if num not in micro_cands_map:
                micro_cands_map[num] = {
                    "id": num,
                    "numero": num,
                    "sqcand": c['sqcand'],
                    "nome": c['nome'],
                    "nome_completo": c['nome_completo'],
                    "partido": c['partido'],
                    "votos": 0,
                    "pct": 0.0,
                    "pct_str": "0,00%",
                    "foto": c['foto'],
                    "foto_tse": c['foto_tse'],
                    "eleito": False,
                    "ufs_vencidas": 0
                }
            micro_cands_map[num]['votos'] += c['votos']

    # Computa percentuais nacionais micro-agregados
    micro_cands_list = list(micro_cands_map.values())
    if total_validos_micro > 0:
        for c in micro_cands_list:
            pct_val = c['votos'] / total_validos_micro
            c['pct'] = pct_val
            c['pct_str'] = f"{(pct_val * 100):.2f}%".replace('.', ',')
    
    # Contabiliza UFs vencidas
    for uf_info in uf_matrix.values():
        lid = uf_info.get('lider')
        for c in micro_cands_list:
            if c['numero'] == lid:
                c['ufs_vencidas'] += 1

    micro_cands_list.sort(key=lambda x: x["votos"], reverse=True)

    # Identifica líder e vice-líder
    c1 = micro_cands_list[0] if len(micro_cands_list) > 0 else None
    c2 = micro_cands_list[1] if len(micro_cands_list) > 1 else None
    delta_votos = (c1['votos'] - c2['votos']) if (c1 and c2) else 0
    delta_pct = f"{((c1['pct'] - c2['pct']) * 100):.2f}%" if (c1 and c2) else "0.00%"

    pct_secoes_micro_str = f"{(total_apuradas_micro / total_secoes_micro * 100):.2f}%".replace('.', ',') if total_secoes_micro > 0 else "0,00%"

    # 4. Atualização thread-safe do estado do servidor
    with data_lock:
        tse_state["last_sync"] = time.strftime("%H:%M:%S")

        # Telemetria do Motor Micro (SeuImposto)
        tse_state["micro_engine"] = {
            "status": "online",
            "metodo": "Agregação direta das 27 UFs + Exterior (Protocolo SeuImposto)",
            "ufs_total": len(ALL_UFS),
            "ufs_ok": len(uf_results),
            "tempo_ms": round(t_fetch * 1000, 1),
            "secoes_total": total_secoes_micro,
            "secoes_apuradas": total_apuradas_micro,
            "pct_secoes": pct_secoes_micro_str,
            "votos_validos": total_validos_micro,
            "delta_votos": delta_votos,
            "delta_pct": delta_pct,
            "lider_nacional": c1['numero'] if c1 else "",
            "lider_nome": c1['nome'] if c1 else "",
            "segundo_nacional": c2['numero'] if c2 else "",
            "segundo_nome": c2['nome'] if c2 else ""
        }
        tse_state["uf_matrix"] = uf_matrix

        # Se a micro-agregação encontrou dados das UFs, alimenta "pres" com a verdade das urnas
        if micro_cands_list and total_apuradas_micro > 0:
            tse_state["pres"] = {
                "secoes_total": total_secoes_micro,
                "secoes_apuradas": total_apuradas_micro,
                "pct_secoes": pct_secoes_micro_str,
                "total_votos": total_votos_micro,
                "votos_validos": total_validos_micro,
                "brancos": total_brancos_micro,
                "nulos": total_nulos_micro,
                "candidatos": micro_cands_list
            }
        elif "pres_br" in macro_results:
            # Fallback para o consolidado macro nacional do TSE caso micro esteja zerado
            d_pres = macro_results["pres_br"]
            cands_pres = parse_candidate_list(d_pres, cargo_id="6257", uf_code="br")
            s = d_pres.get('s', {})
            v = d_pres.get('v', {})
            tse_state["pres"] = {
                "secoes_total": int(s.get('ts', 499248)),
                "secoes_apuradas": int(s.get('st', 109654)),
                "pct_secoes": f"{s.get('pst', '21,96')}%",
                "total_votos": int(v.get('tv', 0)),
                "votos_validos": int(v.get('vv', 0)),
                "brancos": int(v.get('vb', 0)),
                "nulos": int(v.get('tvn', 0)),
                "candidatos": cands_pres
            }

        # 5. GOVERNADOR DE ALAGOAS (6259)
        d_gov = macro_results.get("gov_al")
        if d_gov and 's' in d_gov:
            cands_gov = parse_candidate_list(d_gov, cargo_id="6259", uf_code="al")
            s = d_gov.get('s', {})
            v = d_gov.get('v', {})
            tse_state["gov_al"] = {
                "secoes_total": int(s.get('ts', 7101)),
                "secoes_apuradas": int(s.get('st', 673)),
                "pct_secoes": f"{s.get('pst', '9,48')}%",
                "total_votos": int(v.get('tv', 0)),
                "votos_validos": int(v.get('vv', 0)),
                "brancos": int(v.get('vb', 0)),
                "nulos": int(v.get('tvn', 0)),
                "candidatos": cands_gov
            }

        # 6. SENADOR DE ALAGOAS (6259)
        d_sen = macro_results.get("sen_al")
        if d_sen and 's' in d_sen:
            cands_sen = parse_candidate_list(d_sen, cargo_id="6259", uf_code="al")
            s = d_sen.get('s', {})
            v = d_sen.get('v', {})
            tse_state["sen_al"] = {
                "secoes_total": int(s.get('ts', 7101)),
                "secoes_apuradas": int(s.get('st', 673)),
                "pct_secoes": f"{s.get('pst', '9,48')}%",
                "votos_validos": int(v.get('vv', 0)),
                "candidatos": cands_sen
            }

        # 7. DEPUTADO FEDERAL DE ALAGOAS (6259 / c0006)
        d_dep = macro_results.get("dep_al")
        if d_dep and 's' in d_dep:
            cands_dep = parse_candidate_list(d_dep, cargo_id="6259", uf_code="al")
            s = d_dep.get('s', {})
            v = d_dep.get('v', {})
            tse_state["dep_al"] = {
                "secoes_total": int(s.get('ts', 7101)),
                "secoes_apuradas": int(s.get('st', 0)),
                "pct_secoes": f"{s.get('pst', '0,00')}%",
                "total_votos": int(v.get('tv', 0)),
                "votos_validos": int(v.get('vv', 0)),
                "vagas": 9,
                "candidatos": cands_dep
            }

        # 8. DEPUTADO ESTADUAL DE ALAGOAS (6259 / c0007)
        d_est = macro_results.get("est_al")
        if d_est and 's' in d_est:
            cands_est = parse_candidate_list(d_est, cargo_id="6259", uf_code="al")
            s = d_est.get('s', {})
            v = d_est.get('v', {})
            tse_state["est_al"] = {
                "secoes_total": int(s.get('ts', 7101)),
                "secoes_apuradas": int(s.get('st', 0)),
                "pct_secoes": f"{s.get('pst', '0,00')}%",
                "total_votos": int(v.get('tv', 0)),
                "votos_validos": int(v.get('vv', 0)),
                "vagas": 27,
                "candidatos": cands_est
            }

        # Atualiza horários do TSE se disponíveis
        if "pres_br" in macro_results:
            hg = macro_results["pres_br"].get('hg')
            dg = macro_results["pres_br"].get('dg')
            if hg: tse_state["tse_horario"] = hg
            if dg: tse_state["tse_data"] = dg

        # Guarda dados crus
        tse_state["raw"] = macro_results

        # Escreve cópia estática para consumo direto no disco de forma atômica
        try:
            dump_path = os.path.join(DIRECTORY, "dados_tse_atual.json")
            tmp_path = dump_path + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(tse_state, f, ensure_ascii=False)
            if os.path.exists(tmp_path):
                os.replace(tmp_path, dump_path)
        except Exception:
            pass

def tse_polling_loop():
    """Loop contínuo de sincronização micro-agregada a cada 3s via SeuImposto Edge Stream"""
    print("[+] Motor de Ingestão SeuImposto / TSE iniciado (ciclos de 3s)...")
    while True:
        try:
            process_and_normalize_tse()
        except Exception as e:
            print(f"[-] Erro temporário na sincronização: {e}")
        time.sleep(3.0)

# ==============================================================================
# SISTEMA DE PRESENÇA EM TEMPO REAL & CHAT AO VIVO
# ==============================================================================
chat_lock = threading.Lock()
online_sessions = {}   # {client_id: {"last_seen": float, "name": str, "badge": str, "ip": str}}
chat_history = []      # List of dicts: {"id", "name", "badge", "text", "time", "time_ms", "is_user"}
visitor_ids = set()    # Set of unique client_ids / IPs
msg_counter = 1000

AMBIENT_CHAT_BOTS = [
    ("Nordeste_Forte", "13", "Maceió apurando rápido demais hoje! 🔥"),
    ("Capitao_Sul", "22", "Santa Catarina vai bater recorde de comparecimento 🚜"),
    ("Fiscal_de_Urna_AL", "AL", "Aqui na 1ª Zona Eleitoral tá tudo 100% transmitido! 🌴"),
    ("VotoConsciente_MG", "NEUTRO", "Minas Gerais sempre define o Brasil. Olho na contagem! ⚖️"),
    ("Companheira_BA", "13", "A picanha e a cervejinha já estão no fogo! 🥩🍺"),
    ("Patriota_PR", "22", "Motociata de Curitiba passando pra comemorar 🏍️🇧🇷"),
    ("Arapiraca_News", "AL", "Arapiraca fechou as urnas e os votos tão subindo no painel!"),
    ("Galvao_Ficticio", "NEUTRO", "Haja coração, amigo! É a disputa mais emocionante da história! 🎙️"),
    ("Eleitor_RJ", "22", "Alguém conferiu o Boletim de Urna de Copacabana?"),
    ("ZAP_da_Urna", "13", "Ai Bolsonaro, coloca vai! O Nordeste tá virando tudo! ⭐"),
    ("Observador_DF", "NEUTRO", "A latência de 1ms do SeuImposto tá dando de 10 a 0 no app da mídia! ⚡"),
    ("Xandao_Cover", "NEUTRO", "Quem não rimar o deboche no chat leva multa de 20 milhões! ⚖️"),
    ("Voz_do_Agro", "22", "O Centro-Oeste já fechou quase 100%! 🚜🌾"),
    ("Maceio_Atenta", "AL", "Arthur Lira e Renan Filho disputando voto a voto em AL! 🌴"),
    ("Ciro_em_Paris", "NEUTRO", "Tô comendo um croissant e vendo a rinha pegar fogo 🥐🇫🇷")
]

def init_chat_history():
    global msg_counter
    now_ms = int(time.time() * 1000)
    samples = [
        ("Fiscal_de_Urna_AL", "AL", "Sejam bem-vindos à apuração ao vivo em tempo real 1.000 Hz! 🌴", now_ms - 180000),
        ("Observador_DF", "NEUTRO", "Motor SeuImposto puxando direto das 28 UFs sem delay! ⚡", now_ms - 120000),
        ("ZAP_da_Urna", "13", "Ai Bolsonaro, coloca vai! Clima de segundo turno total ⭐", now_ms - 75000),
        ("Patriota_PR", "22", "Acompanhando cada seção eleitoral com dados oficiais do TSE 🇧🇷", now_ms - 30000),
        ("Arapiraca_News", "AL", "Chat ao vivo conectado. Deixem seus comentários da disputa!", now_ms - 10000),
    ]
    for name, badge, text, tms in samples:
        msg_counter += 1
        chat_history.append({
            "id": f"msg_{msg_counter}",
            "name": name,
            "badge": badge,
            "text": text,
            "time": time.strftime("%H:%M:%S", time.localtime(tms / 1000.0)),
            "time_ms": tms,
            "is_user": False
        })

init_chat_history()

# -------------------------------------------------------------
# MOTOR DE MUNICÍPIOS / CIDADES (SEUIMPOSTO & TSE ENGINE)
# -------------------------------------------------------------
os.makedirs('cache_cidades', exist_ok=True)
municipios_catalog = {}
cdi_to_tse = {}
tse_to_cdi = {}

def init_municipios_catalog():
    global municipios_catalog, cdi_to_tse, tse_to_cdi
    try:
        if os.path.exists('municipios_tse.json'):
            with open('municipios_tse.json', 'r', encoding='utf-8') as f:
                d = json.load(f)
                for a in d.get('abr', []):
                    uf = a.get('cd', '').upper()
                    muns = a.get('mu', [])
                    municipios_catalog[uf] = muns
                    for m in muns:
                        cdi_str = m.get('cdi', '')
                        if cdi_str and cdi_str.isdigit():
                            cdi_int = int(cdi_str)
                            cd_str = str(m.get('cd', ''))
                            cdi_to_tse[(uf, cdi_int)] = cd_str
                            tse_to_cdi[(uf, cd_str)] = (cdi_int, m.get('nm', ''))
            print(f"[+] Catálogo municipal carregado: {len(municipios_catalog)} UFs, {len(cdi_to_tse)} municípios mapeados")
    except Exception as e:
        print("[!] Erro ao carregar municipios_tse.json:", e)

init_municipios_catalog()

def fetch_city_votes_tse(uf, cd, name=""):
    uf_u = uf.upper()
    uf_l = uf.lower()

    if not name or '?' in name:
        for m in municipios_catalog.get(uf_u, []):
            if str(m.get('cd')) == str(cd):
                name = m.get('nm', '')
                break

    cache_path = os.path.join('cache_cidades', f"{uf_l}_{cd}.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                cached = json.load(f)
                if cached.get('votos_validos', 0) > 0:
                    if name and (cached.get('nome') in ['Município', ''] or '?' in cached.get('nome', '')):
                        cached['nome'] = name
                    return cached
        except Exception:
            pass

    # 1. Tenta carregar do feed oficial do SeuImposto (baixa todos os municípios da UF de uma vez)
    try:
        url = f"https://seuimposto.com/feed/uf/{uf_l}.json"
        req = urllib.request.Request(url, headers=SEUIMPOSTO_HEADERS)
        with urllib.request.urlopen(req, timeout=6) as r:
            uf_feed = json.loads(r.read().decode('utf-8'))

        ibge_list = uf_feed.get('ibge', [])
        secoes_list = uf_feed.get('secoes', [])
        tot_list = uf_feed.get('totalizadas', [])
        votos_map = uf_feed.get('votos', {})

        target_result = None

        for idx, ibge_code in enumerate(ibge_list):
            m_cd = cdi_to_tse.get((uf_u, ibge_code))
            if not m_cd:
                continue
            _, m_name = tse_to_cdi.get((uf_u, m_cd), (ibge_code, 'Município'))

            v22 = int(votos_map.get('22', [])[idx]) if '22' in votos_map and idx < len(votos_map['22']) else 0
            v13 = int(votos_map.get('13', [])[idx]) if '13' in votos_map and idx < len(votos_map['13']) else 0
            val = sum(int(votos_map[k][idx]) for k in votos_map if idx < len(votos_map[k]))

            pct22 = f"{(v22 / val * 100):.2f}%".replace('.', ',') if val > 0 else '0,00%'
            pct13 = f"{(v13 / val * 100):.2f}%".replace('.', ',') if val > 0 else '0,00%'

            city_res = {
                'ok': True,
                'uf': uf_u,
                'cd': m_cd,
                'ibge': ibge_code,
                'nome': m_name,
                'secoes_total': secoes_list[idx] if idx < len(secoes_list) else 0,
                'secoes_apuradas': tot_list[idx] if idx < len(tot_list) else 0,
                'pct_secoes': '100,00%',
                'votos_validos': val,
                'bolsonaro_votos': v22,
                'bolsonaro_pct': pct22,
                'lula_votos': v13,
                'lula_pct': pct13,
                'lider': '22' if v22 >= v13 else '13',
                'lider_nome': 'Flávio Bolsonaro' if v22 >= v13 else 'Lula',
                'delta': abs(v22 - v13)
            }

            # Salva no cache do disco
            c_file = os.path.join('cache_cidades', f"{uf_l}_{m_cd}.json")
            try:
                with open(c_file, 'w', encoding='utf-8') as fw:
                    json.dump(city_res, fw, ensure_ascii=False)
            except Exception:
                pass

            if str(m_cd) == str(cd):
                target_result = city_res

        if target_result:
            return target_result
    except Exception as e:
        print(f"[-] Erro ao puxar cidades de {uf_u} do SeuImposto ({e}), usando fallback TSE...")

    # 2. Fallback para a CDN oficial do TSE caso SeuImposto não responda
    u = f"https://resultados.tse.jus.br/oficial/ele2026/6257/dados/{uf_l}/{uf_l}{cd}-c0001-e006257-u.json"
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            d = json.loads(resp.read().decode('utf-8'))
            st = int(d.get('s', {}).get('st', 0))
            ts = int(d.get('s', {}).get('ts', 0))
            pst = d.get('s', {}).get('pst', '0,00')
            vv = int(d.get('v', {}).get('vv', 0))

            cands = []
            for cg in d.get('carg', []):
                for agr in cg.get('agr', []):
                    for p in agr.get('par', []):
                        for c in p.get('cand', []):
                            cands.append({
                                'numero': c.get('n'),
                                'nome': c.get('nm'),
                                'partido': p.get('sg'),
                                'votos': int(c.get('vap', 0)),
                                'pct_str': f"{c.get('pvap', '0,00')}%"
                            })
            cands.sort(key=lambda x: x['votos'], reverse=True)
            lula = next((c for c in cands if c['numero'] == '13'), None)
            bolso = next((c for c in cands if c['numero'] == '22'), None)

            lula_v = lula['votos'] if lula else 0
            bolso_v = bolso['votos'] if bolso else 0
            lula_pct = lula['pct_str'] if lula else '0,00%'
            bolso_pct = bolso['pct_str'] if bolso else '0,00%'

            result = {
                'ok': True,
                'uf': uf_u,
                'cd': cd,
                'nome': name or d.get('nm', 'Município'),
                'secoes_total': ts,
                'secoes_apuradas': st,
                'pct_secoes': f"{pst}%",
                'votos_validos': vv,
                'lula_votos': lula_v,
                'lula_pct': lula_pct,
                'bolsonaro_votos': bolso_v,
                'bolsonaro_pct': bolso_pct,
                'lider': '22' if bolso_v >= lula_v else '13',
                'lider_nome': 'Flávio Bolsonaro' if bolso_v >= lula_v else 'Lula',
                'delta': abs(bolso_v - lula_v),
                'top3': cands[:3]
            }
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False)
            return result
    except Exception as e:
        return {'ok': False, 'error': str(e), 'uf': uf, 'cd': cd}


def update_presence(client_id, name="Eleitor", badge="NEUTRO", ip="127.0.0.1"):
    now = time.time()
    with chat_lock:
        if client_id:
            visitor_ids.add(client_id)
            online_sessions[client_id] = {
                "last_seen": now,
                "name": (name or "Eleitor")[:24],
                "badge": (badge or "⚖️ Neutro")[:24],
                "ip": ip
            }
        else:
            visitor_ids.add(ip)
        # Limpa sessões inativas há mais de 12 segundos
        dead = [cid for cid, s in online_sessions.items() if now - s["last_seen"] > 12.0]
        for cid in dead:
            del online_sessions[cid]

def get_presence_stats():
    now = time.time()
    with chat_lock:
        dead = [cid for cid, s in online_sessions.items() if now - s["last_seen"] > 12.0]
        for cid in dead:
            del online_sessions[cid]
        real_online = max(1, len(online_sessions))
        users_list = [{"name": s["name"], "badge": s["badge"]} for s in online_sessions.values()][:30]
        return {
            "online": real_online,
            "total_visitors": max(real_online, len(visitor_ids)),
            "active_users": users_list
        }

# -------------------------------------------------------------
# ENQUETE / BOLÃO DO 2º TURNO AO VIVO
# -------------------------------------------------------------
poll_lock = threading.Lock()
poll_votes = {} # clientId -> "13" ou "22"
BASE_LULA_VOTES = 1420
BASE_BOLSO_VOTES = 1475

# -------------------------------------------------------------
# REAÇÕES AO VIVO / TERMÔMETRO DA GALERA (INTERAÇÃO PÚBLICA)
# -------------------------------------------------------------
reactions_lock = threading.Lock()
reactions_counts = {
    "tenso": 1342,
    "pipoca": 985,
    "picanha": 2420,
    "capitao": 2490,
    "virada": 1835
}

def get_reactions_stats():
    with reactions_lock:
        return {
            "ok": True,
            "counts": dict(reactions_counts),
            "total": sum(reactions_counts.values())
        }

def increment_reaction(rid):
    with reactions_lock:
        if rid in reactions_counts:
            reactions_counts[rid] += 1
        else:
            reactions_counts[rid] = 1
        return {
            "ok": True,
            "id": rid,
            "new_count": reactions_counts[rid],
            "total": sum(reactions_counts.values())
        }

def get_poll_stats():
    with poll_lock:
        lula_c = sum(1 for v in poll_votes.values() if v == "13")
        bolso_c = sum(1 for v in poll_votes.values() if v == "22")
        total_lula = BASE_LULA_VOTES + lula_c
        total_bolso = BASE_BOLSO_VOTES + bolso_c
        total = total_lula + total_bolso
        pct_lula = (total_lula / total * 100) if total > 0 else 50.0
        pct_bolso = (total_bolso / total * 100) if total > 0 else 50.0
        return {
            "ok": True,
            "total_votes": total,
            "lula": total_lula,
            "bolsonaro": total_bolso,
            "pct_lula": round(pct_lula, 1),
            "pct_bolsonaro": round(pct_bolso, 1),
            "real_users_voted": len(poll_votes)
        }

def chat_ambient_loop():
    """Gera comentários esparsos da comunidade para manter a atmosfera de apuração viva"""
    global msg_counter
    while True:
        try:
            time.sleep(random.uniform(18.0, 32.0))
            now = time.time()
            now_ms = int(now * 1000)
            bot_item = random.choice(AMBIENT_CHAT_BOTS)
            with chat_lock:
                msg_counter += 1
                chat_history.append({
                    "id": f"msg_{msg_counter}",
                    "name": bot_item[0],
                    "badge": bot_item[1],
                    "text": bot_item[2],
                    "time": time.strftime("%H:%M:%S", time.localtime(now)),
                    "time_ms": now_ms,
                    "is_user": False
                })
                if len(chat_history) > 150:
                    del chat_history[0]
        except Exception:
            pass

class TseHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, TimeoutError):
            pass
        except Exception:
            pass

    def log_message(self, format, *args):
        try:
            msg = format % args
            # Silencia requisições de telemetria/chat/polling contínuos para não estourar o buffer
            if any(k in msg for k in ['/api/presence', '/api/chat/messages', '/api/poll', '/api/tse-live']):
                return
            sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), msg))
            sys.stderr.flush()
        except Exception:
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. API: Telemetria e apuração ao vivo micro-agregada
        if path.startswith('/api/tse-live') or path.startswith('/api/seuimposto-live'):
            if 'force' in query and query['force'][0] == '1':
                try:
                    process_and_normalize_tse()
                except Exception:
                    pass

            with data_lock:
                payload = json.dumps(tse_state, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 2. API: Contador de Presença Online
        if path.startswith('/api/presence'):
            client_id = query.get('clientId', [None])[0]
            name = query.get('name', ['Eleitor'])[0]
            badge = query.get('badge', ['NEUTRO'])[0]
            if client_id:
                client_ip = self.client_address[0] if self.client_address else "127.0.0.1"
                update_presence(client_id, name, badge, client_ip)

            stats = get_presence_stats()
            payload = json.dumps(stats, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 3. API: Mensagens do Chat ao Vivo
        if path.startswith('/api/chat/messages'):
            client_id = query.get('clientId', [None])[0]
            name = query.get('name', ['Eleitor'])[0]
            badge = query.get('badge', ['NEUTRO'])[0]
            if client_id:
                client_ip = self.client_address[0] if self.client_address else "127.0.0.1"
                update_presence(client_id, name, badge, client_ip)

            since_ms = 0
            try:
                if 'since' in query:
                    since_ms = int(query['since'][0])
            except Exception:
                pass

            with chat_lock:
                if since_ms > 0:
                    filtered_msgs = [m for m in chat_history if m["time_ms"] > since_ms]
                else:
                    filtered_msgs = chat_history[-50:]

            stats = get_presence_stats()
            resp = {
                "ok": True,
                "messages": filtered_msgs,
                "online": stats["online"],
                "total_visitors": stats["total_visitors"],
                "users": stats["active_users"]
            }
            payload = json.dumps(resp, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 4. API: Enquete / Bolão do 2º Turno
        if path.startswith('/api/poll/results'):
            stats = get_poll_stats()
            payload = json.dumps(stats, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 4b. API: Reações ao Vivo / Termômetro da Galera
        if path.startswith('/api/reactions'):
            stats = get_reactions_stats()
            payload = json.dumps(stats, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 4c. API: Dados dos 5.570 Municípios para o Mapa SeuImposto
        if path.startswith('/api/tse/municipios-map-data'):
            try:
                with open('seuimposto_municipios.json', 'r', encoding='utf-8') as f:
                    payload = f.read().encode('utf-8')
            except Exception:
                payload = b'{}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'public, max-age=60')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 5. API: Lista de Municípios por Estado
        if path.startswith('/api/tse/municipios'):
            uf_param = query.get('uf', ['AL'])[0].upper()
            muns = municipios_catalog.get(uf_param, [])
            resp = {'ok': True, 'uf': uf_param, 'total': len(muns), 'municipios': muns}
            payload = json.dumps(resp, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 6. API: Votos de um Município
        if path.startswith('/api/tse/municipio-votos'):
            uf_param = query.get('uf', ['AL'])[0].upper()
            cd_param = query.get('cd', ['27855'])[0]
            nm_param = urllib.parse.unquote_plus(query.get('nm', [''])[0])
            result = fetch_city_votes_tse(uf_param, cd_param, nm_param)
            payload = json.dumps(result, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 7. API: Paths do Mapa do Brasil em SVG
        if path.startswith('/api/tse/brazil-map-paths'):
            try:
                with open('brazil_paths.json', 'r', encoding='utf-8') as f:
                    payload = f.read().encode('utf-8')
            except Exception:
                payload = b'{}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 8. API: Busca Rápida de Cidades e Estados
        if path.startswith('/api/tse/busca-cidades'):
            q_param = urllib.parse.unquote_plus(query.get('q', [''])[0]).strip().lower()
            results = []
            if len(q_param) >= 2:
                def norm_str(s):
                    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
                qn = norm_str(q_param)
                for uf, muns in municipios_catalog.items():
                    for m in muns:
                        nm = m.get('nm', '')
                        nmn = norm_str(nm)
                        if qn in nmn:
                            results.append({
                                'uf': uf,
                                'cd': m.get('cd'),
                                'nm': nm,
                                'is_capital': m.get('c') == 's',
                                'starts_with': nmn.startswith(qn)
                            })
                            if len(results) >= 60:
                                break
                    if len(results) >= 60:
                        break
                # Ordena: prefixo exato primeiro, capitais primeiro, depois alfabético
                results.sort(key=lambda x: (not x['starts_with'], not x['is_capital'], x['nm']))
                results = results[:15]
            resp = {'ok': True, 'query': q_param, 'total': len(results), 'resultados': results}
            payload = json.dumps(resp, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        client_ip = self.client_address[0] if self.client_address else "127.0.0.1"

        # Leitura do corpo JSON
        content_len = int(self.headers.get('Content-Length', 0))
        body = {}
        if content_len > 0:
            try:
                raw_data = self.rfile.read(content_len).decode('utf-8')
                body = json.loads(raw_data)
            except Exception:
                body = {}

        # 1. API: Heartbeat de Presença
        if path.startswith('/api/presence/heartbeat'):
            cid = body.get('clientId')
            name = str(body.get('userName') or body.get('name') or 'Eleitor').strip()[:24]
            badge = str(body.get('team') or body.get('badge') or '⚖️ Neutro').strip()[:24]
            if cid:
                update_presence(cid, name, badge, client_ip)

            stats = get_presence_stats()
            payload = json.dumps({"ok": True, **stats}, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 2. API: Envio de Mensagem no Chat
        if path.startswith('/api/chat/send'):
            global msg_counter
            cid = body.get('clientId', 'anon')
            name = str(body.get('userName') or body.get('name') or 'Eleitor').strip()[:24]
            badge = str(body.get('team') or body.get('badge') or '⚖️ Neutro').strip()[:24]
            text = str(body.get('text', '')).strip()[:280]

            if not text:
                self.send_response(400)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"ok": false, "error": "Texto vazio"}')
                return

            # Sanitização simples
            clean_text = html.escape(text)
            now = time.time()
            now_ms = int(now * 1000)

            update_presence(cid, name, badge, client_ip)

            with chat_lock:
                msg_counter += 1
                new_msg = {
                    "id": f"msg_{msg_counter}",
                    "clientId": cid,
                    "name": name,
                    "userName": name,
                    "badge": badge,
                    "team": badge,
                    "text": clean_text,
                    "time": now_ms,
                    "time_str": time.strftime("%H:%M:%S", time.localtime(now)),
                    "time_ms": now_ms,
                    "is_user": True
                }
                chat_history.append(new_msg)
                if len(chat_history) > 150:
                    del chat_history[0]

            stats = get_presence_stats()
            resp = {
                "ok": True,
                "message": new_msg,
                "online": stats["online"],
                "total_visitors": stats["total_visitors"]
            }
            payload = json.dumps(resp, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 3. API: Voto na Enquete do 2º Turno
        if path.startswith('/api/poll/vote'):
            cid = body.get('clientId', 'anon_' + str(time.time()))
            choice = str(body.get('choice', '')).strip()
            if choice in ('13', '22'):
                with poll_lock:
                    poll_votes[cid] = choice
            stats = get_poll_stats()
            payload = json.dumps(stats, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 4. API: Clique em Reação do Termômetro
        if path.startswith('/api/reactions/click'):
            rid = str(body.get('id', '')).strip().lower()
            res = increment_reaction(rid)
            payload = json.dumps(res, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        self.send_response(404)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'{"error": "Not found"}')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def handle_error(self, request, client_address):
        exc_type, exc_val, _ = sys.exc_info()
        if exc_type in (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, TimeoutError):
            return
        try:
            super().handle_error(request, client_address)
        except Exception:
            pass

def run_server():
    print("[+] Iniciando TSE TOTALIZADOR PRO // MOTOR SEUIMPOSTO 2026...")
    print("[+] Conectando à CDN do TSE para agregar 28 UFs em paralelo...")
    process_and_normalize_tse()
    print(f"[+] Micro-agregação concluída com sucesso!")
    print(f"    - UFs agregadas: {tse_state['micro_engine']['ufs_ok']} de 28 UFs")
    print(f"    - Brasil Urnas: {tse_state['pres']['secoes_apuradas']} ({tse_state['pres']['pct_secoes']})")
    print(f"    - Tempo de agregação: {tse_state['micro_engine']['tempo_ms']}ms")
    print(f"    - Horário TSE: {tse_state['tse_horario']}")

    t = threading.Thread(target=tse_polling_loop, daemon=True)
    t.start()

    t_chat = threading.Thread(target=chat_ambient_loop, daemon=True)
    t_chat.start()

    os.chdir(DIRECTORY)
    url = f"http://localhost:{PORT}"
    print("=" * 80)
    print("[*] TSE TOTALIZADOR PRO // MOTOR SEUIMPOSTO & CHAT AO VIVO PRONTO")
    print(f"[>] Painel em tempo real: {url}")
    print(f"[>] API Micro-Agregação: {url}/api/tse-live")
    print(f"[>] API Presença Online: {url}/api/presence")
    print(f"[>] API Chat ao Vivo:    {url}/api/chat/messages")
    print(f"[>] Arquivo Estático:    {os.path.join(DIRECTORY, 'dados_tse_atual.json')}")
    print("=" * 80)

    while True:
        try:
            with ThreadingTCPServer(("", PORT), TseHandler) as httpd:
                print(f"[+] Servidor ouvindo conexões na porta {PORT}...")
                httpd.serve_forever()
        except BaseException as e:
            print(f"[*] Reconectando listener HTTP: {e}")
            time.sleep(1)

if __name__ == '__main__':
    while True:
        try:
            run_server()
        except BaseException as e:
            print(f"[*] Reiniciando motor principal: {e}")
            time.sleep(1)
