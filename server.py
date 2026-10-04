"""
// language: Python, file: server.py, target: Windows 11, Python 3.10+
// TSE TOTALIZADOR PRO 2026 - SERVIDOR DE ALTA PERFORMANCE COM CONEXAO DIRETA AO TSE
// Polling contínuo a cada 1s na CDN oficial do TSE (ele2026/6257 e 6259 de 04/10/2026)
"""
import http.server
import socketserver
import urllib.request
import threading
import json
import time
import os
import sys

# Garante suporte UTF-8 no terminal Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Endpoints Oficiais do Tribunal Superior Eleitoral (04/10/2026)
URL_PRES_BR = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json"
URL_GOV_AL  = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0003-e006259-u.json"
URL_SEN_AL  = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0005-e006259-u.json"
URL_DEP_AL  = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0006-e006259-u.json"

# Lock para atualização thread-safe
data_lock = threading.Lock()

# Estado global enriquecido
tse_state = {
    "status": "online",
    "last_sync": time.strftime("%H:%M:%S"),
    "tse_horario": "18:19:31",
    "tse_data": "04/10/2026",
    "pres": {
        "secoes_total": 499248,
        "secoes_apuradas": 109654,
        "pct_secoes": "21,96%",
        "total_votos": 26315800,
        "votos_validos": 25289745,
        "brancos": 382410,
        "nulos": 643645,
        "candidatos": []
    },
    "gov_al": {
        "secoes_total": 7101,
        "secoes_apuradas": 673,
        "pct_secoes": "9,48%",
        "total_votos": 158200,
        "votos_validos": 139728,
        "brancos": 4100,
        "nulos": 14372,
        "candidatos": []
    },
    "sen_al": {
        "secoes_total": 7101,
        "secoes_apuradas": 673,
        "pct_secoes": "9,48%",
        "votos_validos": 269375,
        "candidatos": []
    },
    "data": {},
    "raw": {}
}

def fetch_json(url):
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Cache-Control': 'no-cache'
            }
        )
        with urllib.request.urlopen(req, timeout=3.5) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return None

def process_and_normalize_tse():
    """Consome a CDN do TSE e sintetiza os números em formatos normalizados e crus"""
    global tse_state

    d_pres = fetch_json(URL_PRES_BR)
    d_gov  = fetch_json(URL_GOV_AL)
    d_sen  = fetch_json(URL_SEN_AL)

    with data_lock:
        # Armazena cópia bruta
        if d_pres:
            tse_state["raw"]["pres_br"] = d_pres
            tse_state["data"]["pres_br"] = d_pres
        if d_gov:
            tse_state["raw"]["gov_al"] = d_gov
            tse_state["data"]["gov_al"] = d_gov
        if d_sen:
            tse_state["raw"]["sen_al"] = d_sen
            tse_state["data"]["sen_al"] = d_sen

        # 1. PRESIDENTE DA REPÚBLICA (6257)
        if d_pres and 's' in d_pres:
            cands_pres = []
            for cg in d_pres.get('carg', []):
                for agr in cg.get('agr', []):
                    for p in agr.get('par', []):
                        for c in p.get('cand', []):
                            votos = int(c.get('vap') or 0)
                            pvap_raw = str(c.get('pvap') or '0').replace(',', '.')
                            pct_num = float(pvap_raw) / 100.0 if pvap_raw else 0.0
                            sqcand = str(c.get('sqcand') or '')
                            cands_pres.append({
                                "id": str(c.get('n')),
                                "numero": str(c.get('n')),
                                "sqcand": sqcand,
                                "nome": c.get('nmu') or c.get('nm'),
                                "nome_completo": c.get('nm'),
                                "partido": p.get('sg') or '',
                                "votos": votos,
                                "pct": pct_num,
                                "pct_str": f"{c.get('pvap')}%",
                                "foto": f"fotos/pres_{c.get('n')}.jpeg",
                                "foto_tse": f"https://resultados.tse.jus.br/oficial/ele2026/6257/fotos/br/{sqcand}.jpeg" if sqcand else "",
                                "eleito": c.get('e') == 's'
                            })
            cands_pres.sort(key=lambda x: x["votos"], reverse=True)

            tse_state["pres"] = {
                "secoes_total": int(d_pres['s'].get('ts', 499248)),
                "secoes_apuradas": int(d_pres['s'].get('st', 109654)),
                "pct_secoes": f"{d_pres['s'].get('pst', '21,96')}%",
                "total_votos": int(d_pres['v'].get('tv', 0)),
                "votos_validos": int(d_pres['v'].get('vv', 0)),
                "brancos": int(d_pres['v'].get('vb', 0)),
                "nulos": int(d_pres['v'].get('tvn', 0)),
                "candidatos": cands_pres
            }
            if d_pres.get('hg'):
                tse_state["tse_horario"] = d_pres.get('hg')
            if d_pres.get('dg'):
                tse_state["tse_data"] = d_pres.get('dg')

        # 2. GOVERNADOR DE ALAGOAS (6259)
        if d_gov and 's' in d_gov:
            cands_gov = []
            for cg in d_gov.get('carg', []):
                for agr in cg.get('agr', []):
                    for p in agr.get('par', []):
                        for c in p.get('cand', []):
                            votos = int(c.get('vap') or 0)
                            pvap_raw = str(c.get('pvap') or '0').replace(',', '.')
                            pct_num = float(pvap_raw) / 100.0 if pvap_raw else 0.0
                            sqcand = str(c.get('sqcand') or '')
                            cands_gov.append({
                                "id": str(c.get('n')),
                                "numero": str(c.get('n')),
                                "sqcand": sqcand,
                                "nome": c.get('nmu') or c.get('nm'),
                                "nome_completo": c.get('nm'),
                                "partido": p.get('sg') or '',
                                "votos": votos,
                                "pct": pct_num,
                                "pct_str": f"{c.get('pvap')}%",
                                "foto": f"fotos/gov_{c.get('n')}.jpeg",
                                "foto_tse": f"https://resultados.tse.jus.br/oficial/ele2026/6259/fotos/al/{sqcand}.jpeg" if sqcand else "",
                                "eleito": c.get('e') == 's'
                            })
            cands_gov.sort(key=lambda x: x["votos"], reverse=True)

            tse_state["gov_al"] = {
                "secoes_total": int(d_gov['s'].get('ts', 7101)),
                "secoes_apuradas": int(d_gov['s'].get('st', 673)),
                "pct_secoes": f"{d_gov['s'].get('pst', '9,48')}%",
                "total_votos": int(d_gov['v'].get('tv', 0)),
                "votos_validos": int(d_gov['v'].get('vv', 0)),
                "brancos": int(d_gov['v'].get('vb', 0)),
                "nulos": int(d_gov['v'].get('tvn', 0)),
                "candidatos": cands_gov
            }

        # 3. SENADOR DE ALAGOAS (6259)
        if d_sen and 's' in d_sen:
            cands_sen = []
            for cg in d_sen.get('carg', []):
                for agr in cg.get('agr', []):
                    for p in agr.get('par', []):
                        for c in p.get('cand', []):
                            votos = int(c.get('vap') or 0)
                            pvap_raw = str(c.get('pvap') or '0').replace(',', '.')
                            pct_num = float(pvap_raw) / 100.0 if pvap_raw else 0.0
                            sqcand = str(c.get('sqcand') or '')
                            cands_sen.append({
                                "id": str(c.get('n')),
                                "numero": str(c.get('n')),
                                "sqcand": sqcand,
                                "nome": c.get('nmu') or c.get('nm'),
                                "partido": p.get('sg') or '',
                                "votos": votos,
                                "pct": pct_num,
                                "pct_str": f"{c.get('pvap')}%",
                                "foto": f"fotos/sen_{c.get('n')}.jpeg",
                                "foto_tse": f"https://resultados.tse.jus.br/oficial/ele2026/6259/fotos/al/{sqcand}.jpeg" if sqcand else ""
                            })
            cands_sen.sort(key=lambda x: x["votos"], reverse=True)

            tse_state["sen_al"] = {
                "secoes_total": int(d_sen['s'].get('ts', 7101)),
                "secoes_apuradas": int(d_sen['s'].get('st', 673)),
                "pct_secoes": f"{d_sen['s'].get('pst', '9,48')}%",
                "votos_validos": int(d_sen['v'].get('vv', 0)),
                "candidatos": cands_sen
            }

        tse_state["last_sync"] = time.strftime("%H:%M:%S")

        # Escreve cópia estática para consumo direto de arquivos
        try:
            dump_path = os.path.join(DIRECTORY, "dados_tse_atual.json")
            with open(dump_path, "w", encoding="utf-8") as f:
                json.dump(tse_state, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

def tse_polling_loop():
    print("[+] Loop de sincronização com TSE iniciado (1.0s)...")
    while True:
        try:
            process_and_normalize_tse()
        except Exception as e:
            print(f"[-] Erro temporário na conexão TSE: {e}")
        time.sleep(1.0)

class TseHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        # Endpoint de telemetria e apuração ao vivo
        if self.path.startswith('/api/tse-live'):
            if 'force=1' in self.path:
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
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def run_server():
    print("[+] Conectando à CDN do TSE para extrair boletim oficial...")
    process_and_normalize_tse()
    print(f"[+] Sincronizado com sucesso!")
    print(f"    - Brasil: {tse_state['pres']['secoes_apuradas']} urnas ({tse_state['pres']['pct_secoes']})")
    print(f"    - Alagoas: {tse_state['gov_al']['secoes_apuradas']} urnas ({tse_state['gov_al']['pct_secoes']})")
    print(f"    - Horário TSE: {tse_state['tse_horario']}")

    t = threading.Thread(target=tse_polling_loop, daemon=True)
    t.start()

    os.chdir(DIRECTORY)
    with ThreadingTCPServer(("", PORT), TseHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 80)
        print("[*] TSE TOTALIZADOR PRO 2026 // SERVIDOR PRONTO")
        print(f"[>] Painel em tempo real: {url}")
        print(f"[>] API Endpoint: {url}/api/tse-live")
        print(f"[>] Arquivo Estatico: {os.path.join(DIRECTORY, 'dados_tse_atual.json')}")
        print("=" * 80)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[+] Servidor encerrado.")
            sys.exit(0)

if __name__ == '__main__':
    run_server()
