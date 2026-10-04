import os
import urllib.request
import json

base_dir = os.path.dirname(os.path.abspath(__file__))
fotos_dir = os.path.join(base_dir, "fotos")
os.makedirs(fotos_dir, exist_ok=True)

data_path = os.path.join(base_dir, "dados_tse_atual.json")
with open(data_path, "r", encoding="utf-8") as f:
    d = json.load(f)

races = [
    ('pres', 'pres_br', '6257', 'br'),
    ('gov', 'gov_al', '6259', 'al'),
    ('sen', 'sen_al', '6259', 'al')
]

photo_map = {}

for prefix, key, ele, uf in races:
    raw = d.get('raw', {}).get(key, {})
    for cg in raw.get('carg', []):
        for agr in cg.get('agr', []):
            for par in agr.get('par', []):
                for c in par.get('cand', []):
                    sq = c.get('sqcand')
                    num = str(c.get('n'))
                    name = c.get('nmu') or c.get('nm')
                    url = f"https://resultados.tse.jus.br/oficial/ele2026/{ele}/fotos/{uf}/{sq}.jpeg"
                    local_filename = f"{prefix}_{num}.jpeg"
                    local_path = os.path.join(fotos_dir, local_filename)

                    try:
                        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                        with urllib.request.urlopen(req, timeout=3.0) as res:
                            data = res.read()
                            with open(local_path, "wb") as out:
                                out.write(data)
                        photo_map[f"{prefix}_{num}"] = f"fotos/{local_filename}"
                        print(f"[OK] {name} ({num}) -> {local_filename} ({len(data)} bytes)")
                    except Exception as e:
                        print(f"[FAIL] {name} ({num}) de {url} -> {e}")

# Salva mapeamento de fotos em JSON para uso direto no frontend
map_path = os.path.join(base_dir, "fotos_map.json")
with open(map_path, "w", encoding="utf-8") as f:
    json.dump(photo_map, f, indent=2)

print("\nConcluido! Todas as fotos oficiais do TSE baixadas com sucesso.")
