# TSE TOTALIZADOR PRO // DADOS OFICIAIS DO TSE EM TEMPO REAL (04/10/2026)

Painel premium de apuração e totalização eleitoral conectado diretamente aos **servidores oficiais do Tribunal Superior Eleitoral (TSE / G1)** para a eleição geral de **04 de Outubro de 2026**, com atualização de tela em alta frequência (**1.000 Hz / interpolação a cada milissegundo**).

---

## 📡 Integração com a CDN Oficial do TSE

Os dados são consumidos dos arquivos oficiais de totalização do TSE do pleito `ele2026`:
- **Presidente da República**:
  - Endpoint Oficial: `https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json`
  - Candidatos Oficiais: **Flávio Bolsonaro (PL)**, **Lula (PT)**, **Escritor Augusto Cury (Avante)**, **Ronaldo Caiado (PSD)**, **Renan Santos (Missão)**, **Romeu Zema (Novo)**, **Samara (UP)**, etc.
- **Governador de Alagoas**:
  - Endpoint Oficial: `https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0003-e006259-u.json`
  - Candidatos Oficiais: **Renan Filho (MDB)**, **JHC (PSDB)**, **Lenilda Luna (UP)**, **Márcio Jambo (Democrata)**.
- **Senador por Alagoas (Duas Vagas)**:
  - Endpoint Oficial: `https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0005-e006259-u.json`
  - Candidatos Oficiais: **Arthur Lira (PP)**, **Renan (MDB)**, **Marina JHC (PSDB)**, **Dr. Wanderley (MDB)**, **Davi Davino Filho (REP)**, etc.

---

## ⚡ Alta Resolução: 1.000 Hz (A cada Milissegundo)
O backend sincroniza com o TSE periodicamente a cada 3 segundos (respeitando o limite de segurança do TSE para não gerar bloqueios por rate limit) e disponibiliza o endpoint local `/api/tse-live`.
No navegador, o motor JavaScript interpola continuamente a cada milissegundo (`requestAnimationFrame` + `performance.now()`), calculando os deltas em tempo real para que:
- O relógio de Brasília conte até os milissegundos (`HH:MM:SS.mmm`).
- Os números de votos e porcentagens (com 4 casas decimais) evoluam de forma fluida sem saltos repentinos.
- A taxa de vazão de votos por milissegundo (`votos/ms`) oscile na telemetria gráfica.

---

## 🚀 Como Executar

### Inicialização com 1 Clique (Windows)
Dê dois cliques no arquivo:
```cmd
start.bat
```
Ou pelo terminal:
```bash
python server.py
```
O painel abrirá automaticamente no navegador em `http://localhost:8080`.
