# 🚀 COMO HOSPEDAR O PAINEL DE APURAÇÃO GRATUITAMENTE

O painel foi 100% preparado e testado para funcionar online sem custos. Como a **CDN oficial do TSE libera CORS irrestrito (`Access-Control-Allow-Origin: *`)**, o painel roda de forma autônoma no navegador em qualquer provedor de hospedagem estática, buscando os boletins diretamente do TSE a cada milissegundo.

---

## ⚡ OPÇÃO 1: Netlify Drop (Mais rápida — 30 segundos, sem digitar código)

1. Acesse: **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. Se não tiver login, crie uma conta gratuita (com GitHub ou e-mail).
3. Arraste a pasta inteira **`apuração votos`** para dentro do círculo da página.
4. O Netlify fará o upload imediato e gerará um link público instantâneo:
   `https://apuracao-tse-2026.netlify.app`
5. **Pronto!** O site fica online 24h por dia, com HTTPS grátis e acessível de qualquer celular ou computador.

---

## 🌐 OPÇÃO 2: Vercel (Recomendado para máxima performance)

1. Acesse: **[https://vercel.com/new](https://vercel.com/new)**
2. Crie uma conta gratuita com seu GitHub.
3. Se você subir essa pasta para um repositório no seu GitHub:
   - Clique em **Import Project**
   - Selecione o repositório
   - Clique em **Deploy** (o arquivo `vercel.json` já está configurado no projeto)
4. O link gerado será algo como: `https://apuracao-tse.vercel.app`

---

## 🐙 OPÇÃO 3: GitHub Pages (100% Permanente e Grátis)

O repositório Git local já foi inicializado e comitado na branch `main`.

1. Crie um novo repositório no seu GitHub (ex: `apuracao-2026`).
2. No terminal desta pasta, rode:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/apuracao-2026.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings** -> **Pages** -> em **Branch**, selecione `main` / `/ (root)` e clique em **Save**.
4. Em 1 minuto estará acessível em:
   `https://SEU-USUARIO.github.io/apuracao-2026/`

---

## 📱 OPÇÃO 4: Acesso Imediato no Celular (Mesmo Wi-Fi)

Se o servidor local `server.py` estiver rodando no computador, qualquer celular conectado na mesma rede Wi-Fi pode acessar direto:

👉 **`http://192.168.18.58:8080`**
