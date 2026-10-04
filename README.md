# TSE TOTALIZADOR PRO // DADOS OFICIAIS DO TSE EM TEMPO REAL (04/10/2026)

Desenvolvido por **Jorge** ([@sn00we](https://github.com/sn00we)).

Painel premium de apuração e totalização eleitoral conectado diretamente aos **servidores oficiais do Tribunal Superior Eleitoral (TSE / G1)** para a eleição geral de **04 de Outubro de 2026**, com interface ultra-responsiva calibrada tanto para **PC (monitores ultrawide, 1080p, 4K)** quanto para **dispositivos móveis (smartphones Android e iPhone)**, com atualização em alta frequência (**1.000 Hz / 1ms**).

---

## 📱 Recursos Mobile & PC

- **Interface 100% Responsiva**:
  - **PC / Desktop**: Layout widescreen com terminal estilo Bloomberg/NASA, visão dividida lado a lado (Brasil + Alagoas), osciloscópio de vazão e matriz em tempo real.
  - **Mobile / Smartphones**: Barra de status adaptável de duas camadas com fita de telemetria deslizável (touch swipe), navegação por abas fixadas (sticky), cards verticais compactos, avatares em alta definição e drawer de controle em tela cheia.
- **Botão Meme Interativo LULA 13**:
  - Voz sintetizada nativa (`Web Speech API` em pt-BR): *"Ai Bolsonaro, coloca vai!"*.
  - Disparado pelo botão no topo ou clicando diretamente no card do Lula no ranking.
- **Fotos Oficiais do TSE**: 23 candidatos oficiais com avatares locais e fallback direto para a CDN do TSE.
- **Totalização 1.000 Hz**: Interpolação suave a cada milissegundo de votos apurados, porcentagens com 4 casas decimais e vazão instantânea.

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

## 🚀 Como Executar Localmente

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

---

## 🐙 Como Subir para o seu GitHub (@sn00we)

Para enviar este projeto para o seu perfil no GitHub:

1. Crie um novo repositório vazio no seu GitHub: [https://github.com/new](https://github.com/new) com o nome (por exemplo) `apuracao-votos`.
2. No terminal desta pasta, vincule e envie:
```bash
git remote add origin https://github.com/sn00we/apuracao-votos.git
git branch -M main
git push -u origin main
```

---

## ☁️ Hospedagem Gratuita na Nuvem (Acesso pelo Celular)

Veja o passo a passo completo no arquivo [DEPLOY.md](file:///c:/Users/JORGE/Downloads/apura%C3%A7%C3%A3o%20votos/DEPLOY.md) para publicar em 1 minuto na **Vercel** ou **Netlify** e acessar de qualquer lugar do mundo pelo celular ou computador.

