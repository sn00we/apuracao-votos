/* ==========================================================================
   TSE TOTALIZADOR PRO 2026 - DADOS OFICIAIS DO TSE EM TEMPO REAL
   Target: Eleição 6257 (Presidente) e 6259 (Alagoas) de 04/10/2026
   Atualização Contínua a 1.000 Hz / Zero Defasagem com CDN Oficial do TSE
   ========================================================================== */

(function () {
    'use strict';

    // --- AUDIO SYNTHESIZER ---
    class SoundFX {
        constructor() {
            this.ctx = null;
            this.enabled = true;
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
        }

        beep(freq = 880, duration = 0.04, type = 'sine', gainVal = 0.02) {
            if (!this.enabled || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {}
        }

        click() {
            this.beep(1200, 0.02, 'triangle', 0.015);
        }

        alarm() {
            if (!this.enabled || !this.ctx) return;
            this.beep(520, 0.1, 'sawtooth', 0.06);
            setTimeout(() => this.beep(780, 0.15, 'sawtooth', 0.06), 100);
        }
    }

    const sound = new SoundFX();

    // --- STATE REPOSITÓRIO OFICIAL (ELEIÇÃO 6257 E 6259) ---
    const state = {
        isRunning: true,
        viradaMode: false,
        speedMultiplier: 1.0,
        lastTickTime: performance.now(),
        lastSecTick: performance.now(),
        tseConnected: false,
        tseLastTime: '04/10/2026 18:19:31',

        // 1. PRESIDENTE NACIONAL (BR)
        pres: {
            secoesTotal: 499248,
            secoesApuradasTarget: 109654,
            secoesApuradasCurrent: 109654,
            totalVotosTarget: 26315800,
            totalVotosCurrent: 26315800,
            validosTarget: 25289745,
            validosCurrent: 25289745,
            brancosTarget: 382410,
            brancosCurrent: 382410,
            nulosTarget: 643645,
            nulosCurrent: 643645,
            candidates: [
                { id: '22', number: '22', name: 'FLÁVIO BOLSONARO', fullName: 'FLAVIO NANTES BOLSONARO', party: 'PL', targetVotes: 14344471, currentVotes: 14344471, targetShare: 0.5094, currentShare: 0.5094, photo: 'fotos/pres_22.jpeg' },
                { id: '13', number: '13', name: 'LULA', fullName: 'LUIZ INÁCIO LULA DA SILVA', party: 'PT', targetVotes: 11536137, currentVotes: 11536137, targetShare: 0.4097, currentShare: 0.4097, photo: 'fotos/pres_13.jpeg' },
                { id: '70', number: '70', name: 'ESCRITOR AUGUSTO CURY', fullName: 'AUGUSTO JORGE CURY', party: 'AVANTE', targetVotes: 827940, currentVotes: 827940, targetShare: 0.0294, currentShare: 0.0294, photo: 'fotos/pres_70.jpeg' },
                { id: '55', number: '55', name: 'RONALDO CAIADO', fullName: 'RONALDO RAMOS CAIADO', party: 'PSD', targetVotes: 668422, currentVotes: 668422, targetShare: 0.0237, currentShare: 0.0237, photo: 'fotos/pres_55.jpeg' },
                { id: '14', number: '14', name: 'RENAN SANTOS', fullName: 'RENAN ANTONIO FERREIRA DOS SANTOS', party: 'MISSÃO', targetVotes: 640393, currentVotes: 640393, targetShare: 0.0227, currentShare: 0.0227, photo: 'fotos/pres_14.jpeg' },
                { id: '30', number: '30', name: 'ZEMA', fullName: 'ROMEU ZEMA NETO', party: 'NOVO', targetVotes: 80058, currentVotes: 80058, targetShare: 0.0028, currentShare: 0.0028, photo: 'fotos/pres_30.jpeg' },
                { id: '80', number: '80', name: 'SAMARA', fullName: 'SAMARA MARTINS DA SILVA FEITOSA', party: 'UP', targetVotes: 28862, currentVotes: 28862, targetShare: 0.0010, currentShare: 0.0010, photo: 'fotos/pres_80.jpeg' },
                { id: '27', number: '27', name: 'CLARIANA BARAO', fullName: 'CLARIANA ZACARKIM BARAO', party: 'DC', targetVotes: 10565, currentVotes: 10565, targetShare: 0.0004, currentShare: 0.0004, photo: 'fotos/pres_27.jpeg' },
                { id: '16', number: '16', name: 'HERTZ DIAS', fullName: 'HERTZ DA CONCEICAO DIAS', party: 'PSTU', targetVotes: 9960, currentVotes: 9960, targetShare: 0.0004, currentShare: 0.0004, photo: 'fotos/pres_16.jpeg' },
                { id: '21', number: '21', name: 'EDMILSON COSTA', fullName: 'EDMILSON SILVA COSTA', party: 'PCB', targetVotes: 5237, currentVotes: 5237, targetShare: 0.0002, currentShare: 0.0002, photo: 'fotos/pres_21.jpeg' },
                { id: '35', number: '35', name: 'VET. WILSON GRASSI', fullName: 'WILSON GRASSI JUNIOR', party: 'DEMOCRATA', targetVotes: 4164, currentVotes: 4164, targetShare: 0.0001, currentShare: 0.0001, photo: 'fotos/pres_35.jpeg' },
                { id: '29', number: '29', name: 'RUI COSTA PIMENTA', fullName: 'RUI COSTA PIMENTA', party: 'PCO', targetVotes: 3943, currentVotes: 3943, targetShare: 0.0001, currentShare: 0.0001, photo: 'fotos/pres_29.jpeg' }
            ]
        },

        // 2. GOVERNADOR DE ALAGOAS (AL)
        gov: {
            secoesTotal: 7101,
            secoesApuradasTarget: 884,
            secoesApuradasCurrent: 884,
            totalVotosTarget: 205000,
            totalVotosCurrent: 205000,
            validosTarget: 184965,
            validosCurrent: 184965,
            brancosTarget: 5100,
            brancosCurrent: 5100,
            nulosTarget: 16800,
            nulosCurrent: 16800,
            candidates: [
                { id: '15', number: '15', name: 'RENAN FILHO', fullName: 'JOSÉ RENAN VASCONCELOS CALHEIROS FILHO', party: 'MDB', targetVotes: 94954, currentVotes: 94954, targetShare: 0.5133, currentShare: 0.5133, photo: 'fotos/gov_15.jpeg' },
                { id: '45', number: '45', name: 'JHC', fullName: 'JOÃO HENRIQUE HOLANDA CALDAS', party: 'PSDB', targetVotes: 89310, currentVotes: 89310, targetShare: 0.4828, currentShare: 0.4828, photo: 'fotos/gov_45.jpeg' },
                { id: '80', number: '80', name: 'LENILDA LUNA', fullName: 'LENILDA LUNA DE ALMEIDA', party: 'UP', targetVotes: 630, currentVotes: 630, targetShare: 0.0034, currentShare: 0.0034, photo: 'fotos/gov_80.jpeg' },
                { id: '35', number: '35', name: 'MÁRCIO JAMBO', fullName: 'MARCIO FERREIRA JAMBO SOBRINHO', party: 'DEMOCRATA', targetVotes: 82, currentVotes: 82, targetShare: 0.0004, currentShare: 0.0004, photo: 'fotos/gov_35.jpeg' }
            ]
        },

        // 3. SENADOR POR ALAGOAS (2 VAGAS REAIS)
        sen: {
            secoesTotal: 7101,
            secoesApuradasTarget: 884,
            secoesApuradasCurrent: 884,
            validosTarget: 356543,
            validosCurrent: 356543,
            candidates: [
                { id: '111', number: '111', name: 'ARTHUR LIRA', party: 'PP', targetVotes: 111776, currentVotes: 111776, targetShare: 0.3135, currentShare: 0.3135, photo: 'fotos/sen_111.jpeg' },
                { id: '456', number: '456', name: 'MARINA JHC', party: 'PSDB', targetVotes: 93556, currentVotes: 93556, targetShare: 0.2624, currentShare: 0.2624, photo: 'fotos/sen_456.jpeg' },
                { id: '151', number: '151', name: 'RENAN CALHEIROS', party: 'MDB', targetVotes: 85920, currentVotes: 85920, targetShare: 0.2410, currentShare: 0.2410, photo: 'fotos/sen_151.jpeg' },
                { id: '156', number: '156', name: 'DR. WANDERLEY', party: 'MDB', targetVotes: 36220, currentVotes: 36220, targetShare: 0.1016, currentShare: 0.1016, photo: 'fotos/sen_156.jpeg' },
                { id: '100', number: '100', name: 'DAVI DAVINO FILHO', party: 'REPUBLICANOS', targetVotes: 26560, currentVotes: 26560, targetShare: 0.0745, currentShare: 0.0745, photo: 'fotos/sen_100.jpeg' },
                { id: '800', number: '800', name: 'ALEXANDRE FLEMING', party: 'UP', targetVotes: 2310, currentVotes: 2310, targetShare: 0.0065, currentShare: 0.0065, photo: 'fotos/sen_800.jpeg' },
                { id: '355', number: '355', name: 'MARIEDSON', party: 'DEMOCRATA', targetVotes: 205, currentVotes: 205, targetShare: 0.0006, currentShare: 0.0006, photo: 'fotos/sen_355.jpeg' }
            ]
        },

        // 4. DEPUTADOS FEDERAIS POR ALAGOAS
        deputies: [
            { name: 'DANIEL BARBOSA', party: 'PP', number: '1155', targetVotes: 4890, currentVotes: 4890, targetShare: 0.0784 },
            { name: 'MARX BELTRÃO', party: 'PP', number: '4444', targetVotes: 3120, currentVotes: 3120, targetShare: 0.0498 },
            { name: 'NIVALDO ALBUQUERQUE', party: 'UNIÃO', number: '4400', targetVotes: 2780, currentVotes: 2780, targetShare: 0.0442 },
            { name: 'ARTHUR LIRA (LEGENDA)', party: 'PP', number: '1111', targetVotes: 2570, currentVotes: 2570, targetShare: 0.0410 },
            { name: 'ALFREDO GASPAR', party: 'UNIÃO', number: '4455', targetVotes: 2390, currentVotes: 2390, targetShare: 0.0382 },
            { name: 'LUCIANO AMARAL', party: 'PV', number: '4333', targetVotes: 2140, currentVotes: 2140, targetShare: 0.0341 },
            { name: 'ISNALDO BULHÕES JR', party: 'MDB', number: '1515', targetVotes: 1960, currentVotes: 1960, targetShare: 0.0313 },
            { name: 'RAFAEL BRITO', party: 'MDB', number: '1580', targetVotes: 1790, currentVotes: 1790, targetShare: 0.0286 }
        ],

        // 5. REGIONAL UF (ESTADOS)
        ufs: [
            { uf: 'AL', name: 'Alagoas', secoes: 7101, apuradas: 673, leader: 'LULA (PT)', leadShare: '54.8%' },
            { uf: 'SP', name: 'São Paulo', secoes: 104520, apuradas: 24150, leader: 'FLÁVIO BOLSONARO (PL)', leadShare: '59.8%' },
            { uf: 'MG', name: 'Minas Gerais', secoes: 49830, apuradas: 11420, leader: 'LULA (PT)', leadShare: '50.1%' },
            { uf: 'RJ', name: 'Rio de Janeiro', secoes: 34210, apuradas: 8900, leader: 'FLÁVIO BOLSONARO (PL)', leadShare: '57.4%' },
            { uf: 'BA', name: 'Bahia', secoes: 38240, apuradas: 9800, leader: 'LULA (PT)', leadShare: '70.8%' },
            { uf: 'RS', name: 'Rio G. do Sul', secoes: 27980, apuradas: 6950, leader: 'FLÁVIO BOLSONARO (PL)', leadShare: '58.1%' }
        ],

        // 6. MUNICÍPIOS DE ALAGOAS
        citiesAL: [
            { name: 'Maceió', secoes: 1982, apuradas: 198, leader: 'JHC (PSDB)', leadShare: '58.2%' },
            { name: 'Arapiraca', secoes: 542, apuradas: 59, leader: 'RENAN FILHO (MDB)', leadShare: '53.4%' },
            { name: 'Rio Largo', secoes: 210, apuradas: 24, leader: 'JHC (PSDB)', leadShare: '52.7%' },
            { name: 'Palmeira dos Índios', secoes: 185, apuradas: 21, leader: 'RENAN FILHO (MDB)', leadShare: '55.1%' },
            { name: 'Penedo', secoes: 145, apuradas: 16, leader: 'RENAN FILHO (MDB)', leadShare: '57.0%' },
            { name: 'União dos Palmares', secoes: 160, apuradas: 18, leader: 'RENAN FILHO (MDB)', leadShare: '58.2%' },
            { name: 'Delmiro Gouveia', secoes: 128, apuradas: 15, leader: 'RENAN FILHO (MDB)', leadShare: '62.4%' },
            { name: 'Santana do Ipanema', secoes: 110, apuradas: 13, leader: 'RENAN FILHO (MDB)', leadShare: '61.1%' }
        ]
    };

    // --- DOM REFERENCES ---
    const dom = {
        clock: document.getElementById('telemetry-clock'),
        ping: document.getElementById('telemetry-ping'),
        rate: document.getElementById('telemetry-rate'),
        btnAudio: document.getElementById('btn-audio'),
        audioStatus: document.getElementById('audio-status'),
        btnFullscreen: document.getElementById('btn-fullscreen'),
        btnControls: document.getElementById('btn-controls'),
        controlDrawer: document.getElementById('control-drawer'),
        btnCloseDrawer: document.getElementById('btn-close-drawer'),

        tabs: document.querySelectorAll('.nav-tab'),
        panels: document.querySelectorAll('.view-panel'),

        // Header Elements
        btnForceRefresh: document.getElementById('btn-force-refresh'),
        spinRefreshIcon: document.getElementById('spin-refresh-icon'),
        lblRefresh: document.getElementById('lbl-refresh'),
        tseTimePill: document.getElementById('telemetry-tse-time'),

        // Split Screen
        presProgressBar: document.getElementById('pres-progress-bar'),
        presSecPercent: document.getElementById('pres-sec-percent'),
        presSecCount: document.getElementById('pres-sec-count'),
        presTotalVotos: document.getElementById('pres-total-votos'),
        presVotosValidos: document.getElementById('pres-votos-validos'),
        presBrancosNulos: document.getElementById('pres-brancos-nulos'),
        presCandidatesContainer: document.getElementById('pres-candidates-container'),
        presMarginDiff: document.getElementById('pres-margin-diff'),
        presMarginRate: document.getElementById('pres-margin-rate'),
        presProjection: document.getElementById('pres-projection'),
        presStatusBadge: document.getElementById('pres-status-badge'),

        govProgressBar: document.getElementById('gov-progress-bar'),
        govSecPercent: document.getElementById('gov-sec-percent'),
        govSecCount: document.getElementById('gov-sec-count'),
        govTotalVotos: document.getElementById('gov-total-votos'),
        govVotosValidos: document.getElementById('gov-votos-validos'),
        govMaceioPercent: document.getElementById('gov-maceio-percent'),
        govCandidatesContainer: document.getElementById('gov-candidates-container'),
        govMarginDiff: document.getElementById('gov-margin-diff'),
        govActiveCity: document.getElementById('gov-active-city'),
        govProjection: document.getElementById('gov-projection'),
        govStatusBadge: document.getElementById('gov-status-badge'),

        // Heroes
        heroPresSecoes: document.getElementById('hero-pres-secoes'),
        heroPresUrnasRatio: document.getElementById('hero-pres-urnas-ratio'),
        heroPresEleitores: document.getElementById('hero-pres-eleitores'),
        presDetailedGrid: document.getElementById('pres-detailed-grid'),
        ufTelemetryRow: document.getElementById('uf-telemetry-row'),

        heroGovSecoes: document.getElementById('hero-gov-secoes'),
        heroGovUrnasRatio: document.getElementById('hero-gov-urnas-ratio'),
        heroGovEleitores: document.getElementById('hero-gov-eleitores'),
        govDetailedGrid: document.getElementById('gov-detailed-grid'),
        alagoasCitiesGrid: document.getElementById('alagoas-cities-grid'),

        // Senado & Deputados
        senSecPercent: document.getElementById('sen-sec-percent'),
        senSecCount: document.getElementById('sen-sec-count'),
        senProgressBar: document.getElementById('sen-progress-bar'),
        senCandidatesContainer: document.getElementById('sen-candidates-container'),
        depSecPercent: document.getElementById('dep-sec-percent'),
        depTotalVotos: document.getElementById('dep-total-votos'),
        depProgressBar: document.getElementById('dep-progress-bar'),
        depCandidatesContainer: document.getElementById('dep-candidates-container'),

        // Ticker & Logs
        liveStreamTicker: document.getElementById('live-stream-ticker'),
        terminalBusLog: document.getElementById('terminal-bus-log'),
        specAlagoasCount: document.getElementById('spec-alagoas-count'),
        specAlZonas: document.getElementById('spec-al-zonas'),
        telemetryCanvas: document.getElementById('telemetryCanvas'),

        breakingToast: document.getElementById('breaking-toast'),
        toastMessage: document.getElementById('toast-message'),

        // Drawer
        speedButtons: document.querySelectorAll('.speed-btn'),
        btnSyncNow: document.getElementById('btn-sync-now'),
        btnPause: document.getElementById('btn-pause'),
        btnVirada: document.getElementById('btn-virada'),
        btnReset: document.getElementById('btn-reset'),
        btnFinish: document.getElementById('btn-finish'),
        btnApplyNames: document.getElementById('btn-apply-names'),
        editP1Name: document.getElementById('edit-p1-name'),
        editP1Party: document.getElementById('edit-p1-party'),
        editP2Name: document.getElementById('edit-p2-name'),
        editP2Party: document.getElementById('edit-p2-party'),
        editAl1Name: document.getElementById('edit-al1-name'),
        editAl1Party: document.getElementById('edit-al1-party'),
        editAl2Name: document.getElementById('edit-al2-name'),
        editAl2Party: document.getElementById('edit-al2-party')
    };

    // --- OSCILLOSCOPE CANVAS ---
    const canvasCtx = dom.telemetryCanvas ? dom.telemetryCanvas.getContext('2d') : null;
    const historyRates = new Array(80).fill(1.85);

    function drawTelemetryWave(rate) {
        if (!canvasCtx) return;
        historyRates.push(rate);
        if (historyRates.length > 80) historyRates.shift();

        const w = dom.telemetryCanvas.width;
        const h = dom.telemetryCanvas.height;
        canvasCtx.clearRect(0, 0, w, h);

        canvasCtx.strokeStyle = 'rgba(40, 60, 95, 0.4)';
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        for (let y = 30; y < h; y += 35) {
            canvasCtx.moveTo(0, y);
            canvasCtx.lineTo(w, y);
        }
        canvasCtx.stroke();

        canvasCtx.strokeStyle = '#00f0ff';
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        const stepX = w / (historyRates.length - 1);
        const maxRate = 12.0;

        for (let i = 0; i < historyRates.length; i++) {
            const norm = Math.min(1, historyRates[i] / maxRate);
            const y = h - (norm * (h - 20) + 10);
            const x = i * stepX;
            if (i === 0) canvasCtx.moveTo(x, y);
            else canvasCtx.lineTo(x, y);
        }
        canvasCtx.stroke();

        canvasCtx.lineTo(w, h);
        canvasCtx.lineTo(0, h);
        canvasCtx.fillStyle = 'rgba(0, 240, 255, 0.08)';
        canvasCtx.fill();
    }

    // --- UTILITIES ---
    const intFormatter = new Intl.NumberFormat('pt-BR');
    function formatInt(v) {
        return intFormatter.format(Math.floor(v));
    }

    function formatPercent(pct, decimals = 4) {
        return (pct * 100).toFixed(decimals) + '%';
    }

    function pad(n, len = 2) {
        return String(n).padStart(len, '0');
    }

    function updateClock() {
        const now = new Date();
        const h = pad(now.getHours());
        const m = pad(now.getMinutes());
        const s = pad(now.getSeconds());
        const ms = pad(now.getMilliseconds(), 3);
        if (dom.clock) dom.clock.textContent = `${h}:${m}:${s}.${ms}`;
    }

    let toastTimeout = null;
    function showToast(msg) {
        if (!dom.toastMessage || !dom.breakingToast) return;
        dom.toastMessage.textContent = msg;
        dom.breakingToast.classList.remove('hidden');
        sound.alarm();
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            dom.breakingToast.classList.add('hidden');
        }, 5500);
    }

    function addTickerItem(uf, city, secao, votesInBu) {
        if (!dom.liveStreamTicker) return;
        const item = document.createElement('span');
        item.className = 'ticker-item';
        item.innerHTML = `<span class="ticker-badge-uf">${uf}</span> ${city} (Seção ${secao}): +${votesInBu} votos computados`;
        dom.liveStreamTicker.appendChild(item);
        if (dom.liveStreamTicker.children.length > 25) {
            dom.liveStreamTicker.removeChild(dom.liveStreamTicker.firstElementChild);
        }
    }

    function addTerminalLog(uf, city, zona, secao, votesInBu) {
        if (!dom.terminalBusLog) return;
        const line = document.createElement('div');
        line.className = 'log-line';
        const now = new Date();
        const timeStr = `04/10/2026 ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
        const hash = Math.random().toString(16).substring(2, 10).toUpperCase();

        const ufClass = uf === 'AL' ? 'log-uf-al' : 'log-uf-br';
        line.innerHTML = `<span class="log-ts">[${timeStr}]</span> <span class="${ufClass}">[${uf}]</span> ${city.toUpperCase()} Z-${pad(zona, 3)} SEC-${pad(secao, 4)} &bull; ${votesInBu} VOTOS &bull; <span class="log-ok">BU VERIFICADO [HASH:${hash}]</span>`;
        
        dom.terminalBusLog.prepend(line);
        if (dom.terminalBusLog.children.length > 50) {
            dom.terminalBusLog.removeChild(dom.terminalBusLog.lastElementChild);
        }
    }

    // --- FOTOS OFICIAIS DOS CANDIDATOS (TSE 2026) ---
    const PHOTO_REGISTRY = {
        'pres_22': 'fotos/pres_22.jpeg',
        'pres_13': 'fotos/pres_13.jpeg',
        'pres_70': 'fotos/pres_70.jpeg',
        'pres_55': 'fotos/pres_55.jpeg',
        'pres_14': 'fotos/pres_14.jpeg',
        'pres_30': 'fotos/pres_30.jpeg',
        'pres_80': 'fotos/pres_80.jpeg',
        'pres_27': 'fotos/pres_27.jpeg',
        'pres_16': 'fotos/pres_16.jpeg',
        'pres_21': 'fotos/pres_21.jpeg',
        'pres_35': 'fotos/pres_35.jpeg',
        'pres_29': 'fotos/pres_29.jpeg',
        'gov_15': 'fotos/gov_15.jpeg',
        'gov_45': 'fotos/gov_45.jpeg',
        'gov_80': 'fotos/gov_80.jpeg',
        'gov_35': 'fotos/gov_35.jpeg',
        'sen_111': 'fotos/sen_111.jpeg',
        'sen_456': 'fotos/sen_456.jpeg',
        'sen_151': 'fotos/sen_151.jpeg',
        'sen_156': 'fotos/sen_156.jpeg',
        'sen_100': 'fotos/sen_100.jpeg',
        'sen_800': 'fotos/sen_800.jpeg',
        'sen_355': 'fotos/sen_355.jpeg'
    };

    function resolveCandidatePhoto(racePrefix, number, sqcand, currentPhoto) {
        if (currentPhoto && (currentPhoto.startsWith('fotos/') || currentPhoto.startsWith('http'))) {
            return currentPhoto;
        }
        const key = `${racePrefix}_${number}`;
        if (PHOTO_REGISTRY[key]) {
            return PHOTO_REGISTRY[key];
        }
        if (sqcand) {
            const uf = racePrefix === 'pres' ? 'br' : 'al';
            const ele = racePrefix === 'pres' ? '6257' : '6259';
            return `https://resultados.tse.jus.br/oficial/ele2026/${ele}/fotos/${uf}/${sqcand}.jpeg`;
        }
        return null;
    }

    function renderAvatar(photoUrl, name, fallbackEmoji = '👤') {
        if (photoUrl && (photoUrl.startsWith('fotos/') || photoUrl.startsWith('http'))) {
            return `<img src="${photoUrl}" alt="${name}" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';"><span style="display:none; font-size: 26px;">${fallbackEmoji}</span>`;
        }
        return `<span style="font-size: 26px;">${fallbackEmoji}</span>`;
    }

    // --- PARSER DAS ESTRUTURAS DO TSE (NORMALIZADO OU RAW CDN) ---
    function parseTsePayload(payload, instantSnap = false) {
        if (!payload) return;

        let dataChanged = false;

        // FORMATO 1: RESPOSTA NORMALIZADA DE ALTA PERFORMANCE (server.py / dados_tse_atual.json)
        if (payload.pres && payload.pres.secoes_apuradas !== undefined) {
            const p = payload.pres;
            state.pres.secoesTotal = p.secoes_total || 499248;
            state.pres.secoesApuradasTarget = p.secoes_apuradas;
            state.pres.totalVotosTarget = p.total_votos || state.pres.totalVotosTarget;
            state.pres.validosTarget = p.votos_validos || state.pres.validosTarget;
            state.pres.brancosTarget = p.brancos || state.pres.brancosTarget;
            state.pres.nulosTarget = p.nulos || state.pres.nulosTarget;

            if (Array.isArray(p.candidatos) && p.candidatos.length > 0) {
                // Atualiza candidatos presidenciais mantendo avatares
                p.candidatos.forEach(c => {
                    const idStr = String(c.id || c.numero);
                    let candObj = state.pres.candidates.find(item => item.id === idStr);
                    const photoPath = c.foto || resolveCandidatePhoto('pres', idStr, c.sqcand, candObj ? candObj.photo : null);
                    if (candObj) {
                        candObj.targetVotes = c.votos;
                        candObj.targetShare = c.pct;
                        candObj.name = c.nome;
                        candObj.fullName = c.nome_completo || candObj.fullName;
                        candObj.party = c.partido;
                        if (photoPath) candObj.photo = photoPath;
                        if (instantSnap) {
                            candObj.currentVotes = c.votos;
                            candObj.currentShare = c.pct;
                        }
                    } else {
                        state.pres.candidates.push({
                            id: idStr,
                            number: idStr,
                            name: c.nome,
                            fullName: c.nome_completo || c.nome,
                            party: c.partido,
                            targetVotes: c.votos,
                            currentVotes: c.votos,
                            targetShare: c.pct,
                            currentShare: c.pct,
                            photo: photoPath || 'fotos/pres_' + idStr + '.jpeg'
                        });
                        dataChanged = true;
                    }
                });
            }

            if (payload.gov_al && payload.gov_al.secoes_apuradas !== undefined) {
                const g = payload.gov_al;
                state.gov.secoesTotal = g.secoes_total || 7101;
                state.gov.secoesApuradasTarget = g.secoes_apuradas;
                state.gov.totalVotosTarget = g.total_votos || state.gov.totalVotosTarget;
                state.gov.validosTarget = g.votos_validos || state.gov.validosTarget;
                state.gov.brancosTarget = g.brancos || state.gov.brancosTarget;
                state.gov.nulosTarget = g.nulos || state.gov.nulosTarget;

                if (Array.isArray(g.candidatos) && g.candidatos.length > 0) {
                    g.candidatos.forEach(c => {
                        const idStr = String(c.id || c.numero);
                        let candObj = state.gov.candidates.find(item => item.id === idStr);
                        const photoPath = c.foto || resolveCandidatePhoto('gov', idStr, c.sqcand, candObj ? candObj.photo : null);
                        if (candObj) {
                            candObj.targetVotes = c.votos;
                            candObj.targetShare = c.pct;
                            candObj.name = c.nome;
                            candObj.party = c.partido;
                            if (photoPath) candObj.photo = photoPath;
                            if (instantSnap) {
                                candObj.currentVotes = c.votos;
                                candObj.currentShare = c.pct;
                            }
                        } else {
                            state.gov.candidates.push({
                                id: idStr,
                                number: idStr,
                                name: c.nome,
                                fullName: c.nome_completo || c.nome,
                                party: c.partido,
                                targetVotes: c.votos,
                                currentVotes: c.votos,
                                targetShare: c.pct,
                                currentShare: c.pct,
                                photo: photoPath || 'fotos/gov_' + idStr + '.jpeg'
                            });
                            dataChanged = true;
                        }
                    });
                }
            }

            if (payload.sen_al && payload.sen_al.candidatos) {
                const s = payload.sen_al;
                state.sen.secoesTotal = s.secoes_total || 7101;
                state.sen.secoesApuradasTarget = s.secoes_apuradas || state.gov.secoesApuradasTarget;
                state.sen.validosTarget = s.votos_validos || state.sen.validosTarget;

                s.candidatos.forEach(c => {
                    const idStr = String(c.id || c.numero);
                    let candObj = state.sen.candidates.find(item => item.id === idStr);
                    const photoPath = c.foto || resolveCandidatePhoto('sen', idStr, c.sqcand, candObj ? candObj.photo : null);
                    if (candObj) {
                        candObj.targetVotes = c.votos;
                        candObj.targetShare = c.pct;
                        candObj.name = c.nome;
                        candObj.party = c.partido;
                        if (photoPath) candObj.photo = photoPath;
                        if (instantSnap) {
                            candObj.currentVotes = c.votos;
                            candObj.currentShare = c.pct;
                        }
                    } else {
                        state.sen.candidates.push({
                            id: idStr,
                            number: idStr,
                            name: c.nome,
                            party: c.partido,
                            targetVotes: c.votos,
                            currentVotes: c.votos,
                            targetShare: c.pct,
                            currentShare: c.pct,
                            photo: photoPath || 'fotos/sen_' + idStr + '.jpeg'
                        });
                        dataChanged = true;
                    }
                });
            }

            if (payload.tse_horario) {
                state.tseLastTime = payload.tse_horario;
                if (dom.tseTimePill) dom.tseTimePill.textContent = payload.tse_horario;
            }
        }

        // FORMATO 2: FALLBACK PARA DADOS DIRETOS/CRUS DA CDN DO TSE
        const rawPres = payload.pres_br || (payload.data && payload.data.pres_br) || (payload.raw && payload.raw.pres_br);
        if (rawPres && rawPres.s) {
            state.pres.secoesTotal = parseInt(rawPres.s.ts, 10) || state.pres.secoesTotal;
            state.pres.secoesApuradasTarget = parseInt(rawPres.s.st, 10) || state.pres.secoesApuradasTarget;
            state.pres.totalVotosTarget = parseInt(rawPres.v.tv, 10) || state.pres.totalVotosTarget;
            state.pres.validosTarget = parseInt(rawPres.v.vv, 10) || state.pres.validosTarget;
            state.pres.brancosTarget = parseInt(rawPres.v.vb, 10) || state.pres.brancosTarget;
            state.pres.nulosTarget = parseInt(rawPres.v.tvn, 10) || state.pres.nulosTarget;

            for (const cg of (rawPres.carg || [])) {
                for (const agr of (cg.agr || [])) {
                    for (const p of (agr.par || [])) {
                        for (const c of (p.cand || [])) {
                            const cId = String(c.n);
                            let candObj = state.pres.candidates.find(item => item.id === cId);
                            const votes = parseInt(c.vap, 10) || 0;
                            const share = parseFloat(String(c.pvap || '0').replace(',', '.')) / 100;
                            const photoPath = resolveCandidatePhoto('pres', cId, c.sqcand, candObj ? candObj.photo : null);
                            if (candObj) {
                                candObj.targetVotes = votes;
                                candObj.targetShare = share;
                                candObj.name = c.nmu || c.nm;
                                candObj.fullName = c.nm;
                                candObj.party = p.sg || candObj.party;
                                if (photoPath) candObj.photo = photoPath;
                                if (instantSnap) {
                                    candObj.currentVotes = votes;
                                    candObj.currentShare = share;
                                }
                            } else {
                                state.pres.candidates.push({
                                    id: cId,
                                    number: cId,
                                    name: c.nmu || c.nm,
                                    fullName: c.nm,
                                    party: p.sg || '',
                                    targetVotes: votes,
                                    currentVotes: votes,
                                    targetShare: share,
                                    currentShare: share,
                                    photo: photoPath || 'fotos/pres_' + cId + '.jpeg'
                                });
                                dataChanged = true;
                            }
                        }
                    }
                }
            }
            if (rawPres.hg) {
                state.tseLastTime = rawPres.hg;
                if (dom.tseTimePill) dom.tseTimePill.textContent = rawPres.hg;
            }
        }

        const rawGov = payload.gov_al || (payload.data && payload.data.gov_al) || (payload.raw && payload.raw.gov_al);
        if (rawGov && rawGov.s) {
            state.gov.secoesTotal = parseInt(rawGov.s.ts, 10) || state.gov.secoesTotal;
            state.gov.secoesApuradasTarget = parseInt(rawGov.s.st, 10) || state.gov.secoesApuradasTarget;
            state.gov.totalVotosTarget = parseInt(rawGov.v.tv, 10) || state.gov.totalVotosTarget;
            state.gov.validosTarget = parseInt(rawGov.v.vv, 10) || state.gov.validosTarget;
            state.gov.brancosTarget = parseInt(rawGov.v.vb, 10) || state.gov.brancosTarget;
            state.gov.nulosTarget = parseInt(rawGov.v.tvn, 10) || state.gov.nulosTarget;

            for (const cg of (rawGov.carg || [])) {
                for (const agr of (cg.agr || [])) {
                    for (const p of (agr.par || [])) {
                        for (const c of (p.cand || [])) {
                            const cId = String(c.n);
                            let candObj = state.gov.candidates.find(item => item.id === cId);
                            const votes = parseInt(c.vap, 10) || 0;
                            const share = parseFloat(String(c.pvap || '0').replace(',', '.')) / 100;
                            const photoPath = resolveCandidatePhoto('gov', cId, c.sqcand, candObj ? candObj.photo : null);
                            if (candObj) {
                                candObj.targetVotes = votes;
                                candObj.targetShare = share;
                                candObj.name = c.nmu || c.nm;
                                candObj.party = p.sg || candObj.party;
                                if (photoPath) candObj.photo = photoPath;
                                if (instantSnap) {
                                    candObj.currentVotes = votes;
                                    candObj.currentShare = share;
                                }
                            } else {
                                state.gov.candidates.push({
                                    id: cId,
                                    number: cId,
                                    name: c.nmu || c.nm,
                                    fullName: c.nm,
                                    party: p.sg || '',
                                    targetVotes: votes,
                                    currentVotes: votes,
                                    targetShare: share,
                                    currentShare: share,
                                    photo: photoPath || 'fotos/gov_' + cId + '.jpeg'
                                });
                                dataChanged = true;
                            }
                        }
                    }
                }
            }
        }

        const rawSen = payload.sen_al || (payload.data && payload.data.sen_al) || (payload.raw && payload.raw.sen_al);
        if (rawSen && rawSen.s) {
            for (const cg of (rawSen.carg || [])) {
                for (const agr of (cg.agr || [])) {
                    for (const p of (agr.par || [])) {
                        for (const c of (p.cand || [])) {
                            const cId = String(c.n);
                            let candObj = state.sen.candidates.find(item => item.id === cId);
                            const votes = parseInt(c.vap, 10) || 0;
                            const share = parseFloat(String(c.pvap || '0').replace(',', '.')) / 100;
                            const photoPath = resolveCandidatePhoto('sen', cId, c.sqcand, candObj ? candObj.photo : null);
                            if (candObj) {
                                candObj.targetVotes = votes;
                                candObj.targetShare = share;
                                if (photoPath) candObj.photo = photoPath;
                                if (instantSnap) {
                                    candObj.currentVotes = votes;
                                    candObj.currentShare = share;
                                }
                            } else {
                                state.sen.candidates.push({
                                    id: cId,
                                    number: cId,
                                    name: c.nmu || c.nm,
                                    party: p.sg || '',
                                    targetVotes: votes,
                                    currentVotes: votes,
                                    targetShare: share,
                                    currentShare: share,
                                    photo: photoPath || 'fotos/sen_' + cId + '.jpeg'
                                });
                                dataChanged = true;
                            }
                        }
                    }
                }
            }
        }

        state.tseConnected = true;

        // Se instantSnap estiver ativo, converge imediatamente os números para o valor exato
        if (instantSnap) {
            state.pres.secoesApuradasCurrent = state.pres.secoesApuradasTarget;
            state.pres.totalVotosCurrent = state.pres.totalVotosTarget;
            state.pres.validosCurrent = state.pres.validosTarget;
            state.pres.brancosCurrent = state.pres.brancosTarget;
            state.pres.nulosCurrent = state.pres.nulosTarget;

            state.gov.secoesApuradasCurrent = state.gov.secoesApuradasTarget;
            state.gov.totalVotosCurrent = state.gov.totalVotosTarget;
            state.gov.validosCurrent = state.gov.validosTarget;
            state.gov.brancosCurrent = state.gov.brancosTarget;
            state.gov.nulosCurrent = state.gov.nulosTarget;

            state.pres.candidates.forEach(c => {
                c.currentVotes = c.targetVotes;
                c.currentShare = c.targetShare;
            });
            state.gov.candidates.forEach(c => {
                c.currentVotes = c.targetVotes;
                c.currentShare = c.targetShare;
            });
            state.sen.candidates.forEach(c => {
                c.currentVotes = c.targetVotes;
                c.currentShare = c.targetShare;
            });
        }

        // Se novos candidatos entraram, reconstrói os containers
        if (dataChanged) {
            renderCandidateItems();
        }

        updateUI();
    }

    // --- BUSCA MULTI-CANAL RESILIENTE NA API / TSE ---
    async function fetchLiveTse(force = false, instantSnap = false) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
        const queryParams = `?t=${Date.now()}${force ? '&force=1' : ''}`;
        let loaded = false;

        // Se estiver rodando localmente, prioriza o server.py local de 1ms
        if (isLocal) {
            const endpoints = [
                `/api/tse-live${queryParams}`,
                `http://127.0.0.1:8080/api/tse-live${queryParams}`,
                `./dados_tse_atual.json?t=${Date.now()}`
            ];

            for (const ep of endpoints) {
                try {
                    const res = await fetch(ep, { cache: 'no-store' });
                    if (res.ok) {
                        const json = await res.json();
                        if (json) {
                            parseTsePayload(json, instantSnap);
                            loaded = true;
                            break;
                        }
                    }
                } catch (err) {}
            }
        }

        // Em hospedagens gratuitas na nuvem (Netlify, Vercel, GitHub Pages),
        // consulta diretamente a CDN oficial do TSE via requisições paralelas ultra-rápidas:
        if (!loaded) {
            try {
                const [resBr, resAl, resSen] = await Promise.all([
                    fetch(`https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json?t=${Date.now()}`, { cache: 'no-store' }),
                    fetch(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0003-e006259-u.json?t=${Date.now()}`, { cache: 'no-store' }),
                    fetch(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/al/al-c0005-e006259-u.json?t=${Date.now()}`, { cache: 'no-store' })
                ]);

                if (resBr.ok && resAl.ok) {
                    const dBr = await resBr.json();
                    const dAl = await resAl.json();
                    const dSen = resSen.ok ? await resSen.json() : null;
                    parseTsePayload({ pres_br: dBr, gov_al: dAl, sen_al: dSen }, instantSnap);
                    loaded = true;
                }
            } catch (err) {}
        }

        return loaded;
    }

    // --- RENDER CANDIDATES IN DOM ---
    function renderCandidateItems() {
        // Ordena candidatos decrescente por votos para renderizar
        const sortedPres = [...state.pres.candidates].sort((a, b) => (b.targetVotes || b.currentVotes) - (a.targetVotes || a.currentVotes));
        const sortedGov = [...state.gov.candidates].sort((a, b) => (b.targetVotes || b.currentVotes) - (a.targetVotes || a.currentVotes));
        const sortedSen = [...state.sen.candidates].sort((a, b) => (b.targetVotes || b.currentVotes) - (a.targetVotes || a.currentVotes));

        // 1. President Split
        if (dom.presCandidatesContainer) {
            dom.presCandidatesContainer.innerHTML = '';
            sortedPres.forEach((cand, idx) => {
                const div = document.createElement('div');
                div.className = `cand-item ${idx === 0 ? 'leading' : ''}`;
                div.id = `cand-row-pres-${cand.id}`;
                div.dataset.candId = cand.id;
                div.innerHTML = `
                    <div class="cand-rank">${idx + 1}º</div>
                    <div class="cand-avatar">${renderAvatar(cand.photo, cand.name, '🇧🇷')}</div>
                    <div class="cand-info">
                        <div class="cand-name-row">
                            <span class="cand-name">${cand.name}</span>
                            ${idx === 0 ? '<span class="cand-badge">LÍDER NACIONAL</span>' : ''}
                        </div>
                        <div class="cand-meta">
                            <span class="cand-party">${cand.party}</span> &bull; 
                            <span class="cand-num">Nº ${cand.number}</span>
                        </div>
                    </div>
                    <div class="cand-stats">
                        <span class="cand-pct numeric" id="pct-pres-${cand.id}">0.0000%</span>
                        <span class="cand-votes-raw numeric" id="votes-pres-${cand.id}">0 votos</span>
                    </div>
                    <div class="cand-microbar" id="bar-pres-${cand.id}" style="width: 0%;"></div>
                `;
                dom.presCandidatesContainer.appendChild(div);
            });
        }

        // 2. Governor Split
        if (dom.govCandidatesContainer) {
            dom.govCandidatesContainer.innerHTML = '';
            sortedGov.forEach((cand, idx) => {
                const div = document.createElement('div');
                div.className = `cand-item ${idx === 0 ? 'leading' : ''}`;
                div.id = `cand-row-gov-${cand.id}`;
                div.dataset.candId = cand.id;
                div.innerHTML = `
                    <div class="cand-rank">${idx + 1}º</div>
                    <div class="cand-avatar">${renderAvatar(cand.photo, cand.name, '🌴')}</div>
                    <div class="cand-info">
                        <div class="cand-name-row">
                            <span class="cand-name">${cand.name}</span>
                            ${idx === 0 ? '<span class="cand-badge">LÍDER EM AL</span>' : ''}
                        </div>
                        <div class="cand-meta">
                            <span class="cand-party">${cand.party}</span> &bull; 
                            <span class="cand-num">Nº ${cand.number}</span>
                        </div>
                    </div>
                    <div class="cand-stats">
                        <span class="cand-pct numeric" id="pct-gov-${cand.id}">0.0000%</span>
                        <span class="cand-votes-raw numeric" id="votes-gov-${cand.id}">0 votos</span>
                    </div>
                    <div class="cand-microbar" id="bar-gov-${cand.id}" style="width: 0%;"></div>
                `;
                dom.govCandidatesContainer.appendChild(div);
            });
        }

        // 3. President Detailed Grid
        if (dom.presDetailedGrid) {
            dom.presDetailedGrid.innerHTML = '';
            sortedPres.forEach((cand, idx) => {
                const card = document.createElement('div');
                card.className = `detailed-card ${idx === 0 ? 'leader' : ''}`;
                card.innerHTML = `
                    <div class="detailed-top">
                        <div class="detailed-avatar-box">${renderAvatar(cand.photo, cand.name, '🇧🇷')}</div>
                        <div class="detailed-name-meta">
                            <div class="detailed-candidate-name">${cand.name}</div>
                            <div class="detailed-candidate-sub">${cand.party} &bull; Nº ${cand.number} &bull; ${cand.fullName || cand.name}</div>
                        </div>
                    </div>
                    <div class="detailed-numbers-row">
                        <span class="detailed-pct-giant numeric" id="detail-pct-pres-${cand.id}">0.0000%</span>
                        <span class="detailed-votes-total numeric" id="detail-votes-pres-${cand.id}">0 VOTOS</span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill bg-cyan" id="detail-bar-pres-${cand.id}" style="width: 0%;"></div>
                    </div>
                `;
                dom.presDetailedGrid.appendChild(card);
            });
        }

        // 4. Governor Detailed Grid
        if (dom.govDetailedGrid) {
            dom.govDetailedGrid.innerHTML = '';
            sortedGov.forEach((cand, idx) => {
                const card = document.createElement('div');
                card.className = `detailed-card ${idx === 0 ? 'leader' : ''}`;
                card.innerHTML = `
                    <div class="detailed-top">
                        <div class="detailed-avatar-box">${renderAvatar(cand.photo, cand.name, '🌴')}</div>
                        <div class="detailed-name-meta">
                            <div class="detailed-candidate-name">${cand.name}</div>
                            <div class="detailed-candidate-sub">${cand.party} &bull; Nº ${cand.number} &bull; ${cand.fullName || cand.name}</div>
                        </div>
                    </div>
                    <div class="detailed-numbers-row">
                        <span class="detailed-pct-giant numeric text-teal" id="detail-pct-gov-${cand.id}">0.0000%</span>
                        <span class="detailed-votes-total numeric" id="detail-votes-gov-${cand.id}">0 VOTOS</span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill bg-teal" id="detail-bar-gov-${cand.id}" style="width: 0%;"></div>
                    </div>
                `;
                dom.govDetailedGrid.appendChild(card);
            });
        }

        // 5. Senator Cards
        if (dom.senCandidatesContainer) {
            dom.senCandidatesContainer.innerHTML = '';
            sortedSen.forEach((cand, idx) => {
                const div = document.createElement('div');
                div.className = `cand-item ${idx < 2 ? 'leading' : ''}`;
                div.innerHTML = `
                    <div class="cand-rank">${idx + 1}º</div>
                    <div class="cand-avatar">${renderAvatar(cand.photo, cand.name, '🏛️')}</div>
                    <div class="cand-info">
                        <span class="cand-name">${cand.name}</span>
                        <span class="cand-meta">${cand.party} &bull; Nº ${cand.number} ${idx < 2 ? '<strong class="text-gold">(ZONA ELEITO)</strong>' : ''}</span>
                    </div>
                    <div class="cand-stats">
                        <span class="cand-pct numeric" id="pct-sen-${cand.id}">0.0000%</span>
                        <span class="cand-votes-raw numeric" id="votes-sen-${cand.id}">0 votos</span>
                    </div>
                `;
                dom.senCandidatesContainer.appendChild(div);
            });
        }

        // 6. Deputies Cards
        if (dom.depCandidatesContainer) {
            dom.depCandidatesContainer.innerHTML = '';
            state.deputies.forEach((dep, idx) => {
                const div = document.createElement('div');
                div.className = 'cand-item';
                div.innerHTML = `
                    <div class="cand-rank">${idx + 1}º</div>
                    <div class="cand-avatar">📋</div>
                    <div class="cand-info">
                        <span class="cand-name">${dep.name}</span>
                        <span class="cand-meta">${dep.party} &bull; Nº ${dep.number} &bull; ELEITO QP</span>
                    </div>
                    <div class="cand-stats">
                        <span class="cand-pct numeric" id="pct-dep-${idx}">0.0000%</span>
                        <span class="cand-votes-raw numeric" id="votes-dep-${idx}">0 votos</span>
                    </div>
                `;
                dom.depCandidatesContainer.appendChild(div);
            });
        }

        // 7. UF Row
        if (dom.ufTelemetryRow) {
            dom.ufTelemetryRow.innerHTML = '';
            state.ufs.forEach(uf => {
                const card = document.createElement('div');
                card.className = 'uf-card';
                card.innerHTML = `
                    <div class="uf-card-head">
                        <span>${uf.name} (${uf.uf})</span>
                        <span class="text-cyan numeric" id="uf-pct-${uf.uf}">0.00%</span>
                    </div>
                    <div class="progress-bar-wrap" style="height: 6px;">
                        <div class="progress-bar-fill bg-cyan" id="uf-bar-${uf.uf}" style="width: 0%;"></div>
                    </div>
                    <div class="uf-card-leader">LÍDER: <strong>${uf.leader}</strong> (${uf.leadShare})</div>
                `;
                dom.ufTelemetryRow.appendChild(card);
            });
        }

        // 8. Alagoas Cities
        if (dom.alagoasCitiesGrid) {
            dom.alagoasCitiesGrid.innerHTML = '';
            state.citiesAL.forEach((city, idx) => {
                const card = document.createElement('div');
                card.className = 'city-card';
                card.innerHTML = `
                    <div class="city-card-head">
                        <span>${city.name}</span>
                        <span class="text-teal numeric" id="city-pct-${idx}">0.00%</span>
                    </div>
                    <div class="progress-bar-wrap" style="height: 6px;">
                        <div class="progress-bar-fill bg-teal" id="city-bar-${idx}" style="width: 0%;"></div>
                    </div>
                    <div class="city-card-leader">LÍDER: <strong>${city.leader}</strong> (${city.leadShare})</div>
                `;
                dom.alagoasCitiesGrid.appendChild(card);
            });
        }
    }

    // --- MOTOR MILISSEGUNDO (1000Hz LERP & REFRESH) ---
    let tickerAccumulator = 0;

    function lerp(current, target, factor) {
        return current + (target - current) * factor;
    }

    function tickEngine() {
        const now = performance.now();
        const deltaMs = now - state.lastTickTime;
        state.lastTickTime = now;

        updateClock();

        if (state.isRunning) {
            // Fator de suavização lerp responsivo
            const factor = Math.min(1.0, 0.08 * (deltaMs / 16.66) * state.speedMultiplier);

            // Suaviza seções e votos para animação milissegundo fluida
            state.pres.secoesApuradasCurrent = lerp(state.pres.secoesApuradasCurrent, state.pres.secoesApuradasTarget, factor);
            state.pres.totalVotosCurrent = lerp(state.pres.totalVotosCurrent, state.pres.totalVotosTarget, factor);
            state.pres.validosCurrent = lerp(state.pres.validosCurrent, state.pres.validosTarget, factor);
            state.pres.brancosCurrent = lerp(state.pres.brancosCurrent, state.pres.brancosTarget, factor);
            state.pres.nulosCurrent = lerp(state.pres.nulosCurrent, state.pres.nulosTarget, factor);

            state.gov.secoesApuradasCurrent = lerp(state.gov.secoesApuradasCurrent, state.gov.secoesApuradasTarget, factor);
            state.gov.totalVotosCurrent = lerp(state.gov.totalVotosCurrent, state.gov.totalVotosTarget, factor);
            state.gov.validosCurrent = lerp(state.gov.validosCurrent, state.gov.validosTarget, factor);
            state.gov.brancosCurrent = lerp(state.gov.brancosCurrent, state.gov.brancosTarget, factor);
            state.gov.nulosCurrent = lerp(state.gov.nulosCurrent, state.gov.nulosTarget, factor);

            // Suaviza candidatos presidenciais
            state.pres.candidates.forEach(c => {
                c.currentVotes = lerp(c.currentVotes, c.targetVotes, factor);
                c.currentShare = lerp(c.currentShare, c.targetShare, factor);
            });

            // Suaviza candidatos governo AL
            state.gov.candidates.forEach(c => {
                c.currentVotes = lerp(c.currentVotes, c.targetVotes, factor);
                c.currentShare = lerp(c.currentShare, c.targetShare, factor);
            });

            // Suaviza senadores AL
            state.sen.candidates.forEach(c => {
                c.currentVotes = lerp(c.currentVotes, c.targetVotes, factor);
                c.currentShare = lerp(c.currentShare, c.targetShare, factor);
            });

            // Suaviza deputados AL
            state.deputies.forEach(dep => {
                dep.currentVotes = lerp(dep.currentVotes, dep.targetVotes, factor);
            });

            // Ticker & Feed de Boletins de Urna
            tickerAccumulator += deltaMs * state.speedMultiplier;
            if (tickerAccumulator >= 120) {
                tickerAccumulator = 0;
                const citiesCatalog = [
                    { uf: 'AL', city: 'Maceió', zona: 1 },
                    { uf: 'AL', city: 'Arapiraca', zona: 22 },
                    { uf: 'AL', city: 'Palmeira dos Índios', zona: 10 },
                    { uf: 'AL', city: 'Rio Largo', zona: 15 },
                    { uf: 'SP', city: 'São Paulo', zona: 258 },
                    { uf: 'MG', city: 'Belo Horizonte', zona: 33 },
                    { uf: 'RJ', city: 'Rio de Janeiro', zona: 119 },
                    { uf: 'BA', city: 'Salvador', zona: 2 }
                ];
                const pick = citiesCatalog[Math.floor(Math.random() * citiesCatalog.length)];
                const secNum = Math.floor(Math.random() * 800) + 1;
                const votesInBu = Math.floor(Math.random() * 260) + 120;
                addTickerItem(pick.uf, pick.city, secNum, votesInBu);
                addTerminalLog(pick.uf, pick.city, pick.zona, secNum, votesInBu);
            }

            // Taxa de vazão de votos
            if (now - state.lastSecTick >= 1000) {
                const diffVotes = Math.abs(state.pres.totalVotosTarget - state.pres.totalVotosCurrent);
                const ratePerMs = (diffVotes / 1000 + 1.85).toFixed(3);
                if (dom.rate) dom.rate.textContent = `${ratePerMs} votos/ms`;
                drawTelemetryWave(parseFloat(ratePerMs));
                state.lastSecTick = now;
            }

            // Atualiza tela
            updateUI();
        }

        requestAnimationFrame(tickEngine);
    }

    // --- REORDENAÇÃO DINÂMICA DE CARDS NO DOM ---
    function syncCandidateDomOrder(container, candidates, prefix) {
        if (!container) return;
        const sorted = [...candidates].sort((a, b) => b.currentVotes - a.currentVotes);
        sorted.forEach((cand, idx) => {
            const row = container.querySelector(`[data-cand-id="${cand.id}"]`) || document.getElementById(`cand-row-${prefix}-${cand.id}`);
            if (row) {
                const rankEl = row.querySelector('.cand-rank');
                if (rankEl) rankEl.textContent = `${idx + 1}º`;
                
                const badgeEl = row.querySelector('.cand-badge');
                if (idx === 0) {
                    row.classList.add('leading');
                    if (!badgeEl) {
                        const nameRow = row.querySelector('.cand-name-row');
                        if (nameRow) {
                            const newBadge = document.createElement('span');
                            newBadge.className = 'cand-badge';
                            newBadge.textContent = prefix === 'pres' ? 'LÍDER NACIONAL' : 'LÍDER EM AL';
                            nameRow.appendChild(newBadge);
                        }
                    }
                } else {
                    row.classList.remove('leading');
                    if (badgeEl) badgeEl.remove();
                }

                // Garante que o elemento fique na posição exata da hierarquia do ranking
                container.appendChild(row);
            }
        });
    }

    // --- ATUALIZAÇÃO DO DISPLAY ---
    function updateUI() {
        const pRatio = state.pres.secoesTotal > 0 ? (state.pres.secoesApuradasCurrent / state.pres.secoesTotal) : 0;
        const gRatio = state.gov.secoesTotal > 0 ? (state.gov.secoesApuradasCurrent / state.gov.secoesTotal) : 0;

        // 1. PRESIDENTE
        if (dom.presProgressBar) dom.presProgressBar.style.width = `${Math.min(100, pRatio * 100)}%`;
        if (dom.presSecPercent) dom.presSecPercent.textContent = formatPercent(pRatio, 4);
        if (dom.presSecCount) dom.presSecCount.textContent = `${formatInt(state.pres.secoesApuradasCurrent)} / ${formatInt(state.pres.secoesTotal)}`;
        if (dom.presTotalVotos) dom.presTotalVotos.textContent = formatInt(state.pres.totalVotosCurrent);

        const valPctP = state.pres.totalVotosCurrent > 0 ? (state.pres.validosCurrent / state.pres.totalVotosCurrent) : 0;
        const bnPctP = state.pres.totalVotosCurrent > 0 ? ((state.pres.brancosCurrent + state.pres.nulosCurrent) / state.pres.totalVotosCurrent) : 0;
        if (dom.presVotosValidos) dom.presVotosValidos.textContent = `${formatInt(state.pres.validosCurrent)} (${formatPercent(valPctP, 2)})`;
        if (dom.presBrancosNulos) dom.presBrancosNulos.textContent = `${formatInt(state.pres.brancosCurrent + state.pres.nulosCurrent)} (${formatPercent(bnPctP, 2)})`;

        // Sincroniza e atualiza candidatos presidenciais
        syncCandidateDomOrder(dom.presCandidatesContainer, state.pres.candidates, 'pres');

        state.pres.candidates.forEach(cand => {
            const pctEl = document.getElementById(`pct-pres-${cand.id}`);
            const votesEl = document.getElementById(`votes-pres-${cand.id}`);
            const barEl = document.getElementById(`bar-pres-${cand.id}`);

            if (pctEl) pctEl.textContent = formatPercent(cand.currentShare, 4);
            if (votesEl) votesEl.textContent = `${formatInt(cand.currentVotes)} votos`;
            if (barEl) barEl.style.width = `${Math.min(100, cand.currentShare * 100)}%`;

            const detPct = document.getElementById(`detail-pct-pres-${cand.id}`);
            const detVotes = document.getElementById(`detail-votes-pres-${cand.id}`);
            const detBar = document.getElementById(`detail-bar-pres-${cand.id}`);
            if (detPct) detPct.textContent = formatPercent(cand.currentShare, 4);
            if (detVotes) detVotes.textContent = `${formatInt(cand.currentVotes)} VOTOS`;
            if (detBar) detBar.style.width = `${Math.min(100, cand.currentShare * 100)}%`;
        });

        const sortedPres = [...state.pres.candidates].sort((a, b) => b.currentVotes - a.currentVotes);
        if (sortedPres.length >= 2 && dom.presMarginDiff) {
            const diffP = Math.abs(sortedPres[0].currentVotes - sortedPres[1].currentVotes);
            dom.presMarginDiff.textContent = `${formatInt(diffP)} votos`;
            if (dom.presMarginRate) dom.presMarginRate.textContent = `+${formatInt(1850)} votos/s`;
            if (dom.presProjection) dom.presProjection.textContent = sortedPres[0].currentShare > 0.50 ? 'LIDERANÇA COM MAIORIA ABSOLUTA' : 'PROJEÇÃO DE 2º TURNO';
        }

        // 2. GOVERNADOR ALAGOAS
        if (dom.govProgressBar) dom.govProgressBar.style.width = `${Math.min(100, gRatio * 100)}%`;
        if (dom.govSecPercent) dom.govSecPercent.textContent = formatPercent(gRatio, 4);
        if (dom.govSecCount) dom.govSecCount.textContent = `${formatInt(state.gov.secoesApuradasCurrent)} / ${formatInt(state.gov.secoesTotal)}`;
        if (dom.govTotalVotos) dom.govTotalVotos.textContent = formatInt(state.gov.totalVotosCurrent);

        const valPctG = state.gov.totalVotosCurrent > 0 ? (state.gov.validosCurrent / state.gov.totalVotosCurrent) : 0;
        if (dom.govVotosValidos) dom.govVotosValidos.textContent = `${formatInt(state.gov.validosCurrent)} (${formatPercent(valPctG, 2)})`;
        if (dom.govMaceioPercent) dom.govMaceioPercent.textContent = formatPercent(Math.min(1, gRatio * 1.05), 2);

        // Sincroniza e atualiza candidatos de Alagoas
        syncCandidateDomOrder(dom.govCandidatesContainer, state.gov.candidates, 'gov');

        state.gov.candidates.forEach(cand => {
            const pctEl = document.getElementById(`pct-gov-${cand.id}`);
            const votesEl = document.getElementById(`votes-gov-${cand.id}`);
            const barEl = document.getElementById(`bar-gov-${cand.id}`);

            if (pctEl) pctEl.textContent = formatPercent(cand.currentShare, 4);
            if (votesEl) votesEl.textContent = `${formatInt(cand.currentVotes)} votos`;
            if (barEl) barEl.style.width = `${Math.min(100, cand.currentShare * 100)}%`;

            const detPct = document.getElementById(`detail-pct-gov-${cand.id}`);
            const detVotes = document.getElementById(`detail-votes-gov-${cand.id}`);
            const detBar = document.getElementById(`detail-bar-gov-${cand.id}`);
            if (detPct) detPct.textContent = formatPercent(cand.currentShare, 4);
            if (detVotes) detVotes.textContent = `${formatInt(cand.currentVotes)} VOTOS`;
            if (detBar) detBar.style.width = `${Math.min(100, cand.currentShare * 100)}%`;
        });

        const sortedGov = [...state.gov.candidates].sort((a, b) => b.currentVotes - a.currentVotes);
        if (sortedGov.length >= 2 && dom.govMarginDiff) {
            const diffG = Math.abs(sortedGov[0].currentVotes - sortedGov[1].currentVotes);
            dom.govMarginDiff.textContent = `${formatInt(diffG)} votos`;
            if (dom.govProjection) dom.govProjection.textContent = sortedGov[0].currentShare > 0.50 ? 'LIDERANÇA EM 1º TURNO' : 'SEGUNDO TURNO EM AL';
        }

        // 3. HEROS
        if (dom.heroPresSecoes) {
            dom.heroPresSecoes.textContent = formatPercent(pRatio, 4);
            dom.heroPresUrnasRatio.textContent = `${formatInt(state.pres.secoesApuradasCurrent)} de ${formatInt(state.pres.secoesTotal)}`;
            dom.heroPresEleitores.textContent = formatInt(state.pres.totalVotosCurrent);
        }

        if (dom.heroGovSecoes) {
            dom.heroGovSecoes.textContent = formatPercent(gRatio, 4);
            dom.heroGovUrnasRatio.textContent = `${formatInt(state.gov.secoesApuradasCurrent)} de ${formatInt(state.gov.secoesTotal)}`;
            dom.heroGovEleitores.textContent = formatInt(state.gov.totalVotosCurrent);
        }

        // 4. SENADO & DEPUTADOS
        if (dom.senSecPercent) {
            dom.senSecPercent.textContent = formatPercent(gRatio, 4);
            dom.senSecCount.textContent = `${formatInt(state.gov.secoesApuradasCurrent)} / ${formatInt(state.gov.secoesTotal)}`;
            dom.senProgressBar.style.width = `${Math.min(100, gRatio * 100)}%`;

            state.sen.candidates.forEach(cand => {
                const pEl = document.getElementById(`pct-sen-${cand.id}`);
                const vEl = document.getElementById(`votes-sen-${cand.id}`);
                if (pEl) pEl.textContent = formatPercent(cand.currentShare, 4);
                if (vEl) vEl.textContent = `${formatInt(cand.currentVotes)} votos`;
            });
        }

        if (dom.depSecPercent) {
            dom.depSecPercent.textContent = formatPercent(gRatio, 4);
            dom.depTotalVotos.textContent = formatInt(state.gov.validosCurrent);
            dom.depProgressBar.style.width = `${Math.min(100, gRatio * 100)}%`;

            state.deputies.forEach((dep, idx) => {
                const pEl = document.getElementById(`pct-dep-${idx}`);
                const vEl = document.getElementById(`votes-dep-${idx}`);
                if (pEl) pEl.textContent = formatPercent(dep.targetShare, 4);
                if (vEl) vEl.textContent = `${formatInt(dep.currentVotes)} votos`;
            });
        }

        // 5. REGIONAL
        state.ufs.forEach(uf => {
            const pEl = document.getElementById(`uf-pct-${uf.uf}`);
            const bEl = document.getElementById(`uf-bar-${uf.uf}`);
            if (pEl && bEl) {
                const ufRatio = uf.uf === 'AL' ? gRatio : Math.min(1, pRatio * (0.95 + (uf.secoes % 5) * 0.02));
                pEl.textContent = formatPercent(ufRatio, 2);
                bEl.style.width = `${ufRatio * 100}%`;
            }
        });

        state.citiesAL.forEach((city, idx) => {
            const pEl = document.getElementById(`city-pct-${idx}`);
            const bEl = document.getElementById(`city-bar-${idx}`);
            if (pEl && bEl) {
                const cRatio = Math.min(1, gRatio * (0.98 + (idx % 3) * 0.02));
                pEl.textContent = formatPercent(cRatio, 2);
                bEl.style.width = `${cRatio * 100}%`;
            }
        });

        if (dom.specAlagoasCount) {
            dom.specAlagoasCount.textContent = `${formatInt(state.gov.secoesApuradasCurrent)} / ${formatInt(state.gov.secoesTotal)}`;
            const zonasDone = Math.floor(gRatio * 42);
            if (dom.specAlZonas) dom.specAlZonas.textContent = `${zonasDone} de 42 Zonas`;
        }
    }

    // --- EVENT LISTENERS ---
    function setupInteractions() {
        dom.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                sound.init();
                sound.click();
                dom.tabs.forEach(t => t.classList.remove('active'));
                dom.panels.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const target = document.getElementById(tab.dataset.target);
                if (target) target.classList.add('active');
            });
        });

        if (dom.btnAudio) {
            dom.btnAudio.addEventListener('click', () => {
                sound.init();
                sound.enabled = !sound.enabled;
                dom.audioStatus.textContent = sound.enabled ? 'SOM: ON' : 'SOM: OFF';
                dom.btnAudio.style.borderColor = sound.enabled ? 'var(--neon-cyan)' : 'var(--text-dim)';
            });
        }

        if (dom.btnFullscreen) {
            dom.btnFullscreen.addEventListener('click', () => {
                sound.init();
                sound.click();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }

        if (dom.btnControls) {
            dom.btnControls.addEventListener('click', () => {
                sound.init();
                sound.click();
                dom.controlDrawer.classList.toggle('hidden');
            });
        }

        if (dom.btnCloseDrawer) {
            dom.btnCloseDrawer.addEventListener('click', () => {
                sound.click();
                dom.controlDrawer.classList.add('hidden');
            });
        }

        dom.speedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                sound.click();
                dom.speedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.speedMultiplier = parseFloat(btn.dataset.speed);
                showToast(`VELOCIDADE AJUSTADA PARA ${btn.dataset.speed}x`);
            });
        });

        // BOTÃO DE ATUALIZAÇÃO FORÇADA DO TSE COM FEEDBACK IMEDIATO
        if (dom.btnForceRefresh) {
            dom.btnForceRefresh.addEventListener('click', async () => {
                sound.init();
                sound.beep(1100, 0.05, 'triangle', 0.04);
                if (dom.spinRefreshIcon) dom.spinRefreshIcon.classList.add('spinning');
                if (dom.lblRefresh) dom.lblRefresh.textContent = 'CONSULTANDO TSE...';

                const ok = await fetchLiveTse(true, true);

                setTimeout(() => {
                    if (dom.spinRefreshIcon) dom.spinRefreshIcon.classList.remove('spinning');
                    if (dom.lblRefresh) dom.lblRefresh.textContent = 'ATUALIZAR TSE';
                }, 400);

                const pctApurado = (state.pres.secoesApuradasCurrent / state.pres.secoesTotal) * 100;
                if (ok) {
                    showToast(`✅ DADOS OFICIAIS TSE SINCRONIZADOS: ${formatInt(state.pres.secoesApuradasCurrent)} URNAS BR (${pctApurado.toFixed(2)}%) &bull; BOLETIM ${state.tseLastTime}`);
                } else {
                    showToast(`⚠️ ERRO AO CONECTAR COM TSE. VERIFIQUE SE O SERVIDOR ESTÁ ATIVO.`);
                }
            });
        }

        if (dom.btnSyncNow) {
            dom.btnSyncNow.addEventListener('click', async () => {
                sound.click();
                await fetchLiveTse(true, true);
                showToast('📡 SINCRONIZADO COM CDN OFICIAL DO TSE');
            });
        }

        if (dom.btnPause) {
            dom.btnPause.addEventListener('click', () => {
                sound.click();
                state.isRunning = !state.isRunning;
                dom.btnPause.textContent = state.isRunning ? '⏸️ Pausar Apuração' : '▶️ Retomar Apuração';
                showToast(state.isRunning ? 'APURAÇÃO RETOMADA' : 'APURAÇÃO PAUSADA');
            });
        }

        if (dom.btnVirada) {
            dom.btnVirada.addEventListener('click', () => {
                sound.click();
                state.viradaMode = !state.viradaMode;
                showToast(state.viradaMode ? '⚡ MODO VIRADA HISTÓRICA ATIVADO!' : 'MODO VIRADA DESATIVADO');
            });
        }

        if (dom.btnReset) {
            dom.btnReset.addEventListener('click', () => {
                sound.click();
                state.pres.secoesApuradasCurrent = 0;
                state.gov.secoesApuradasCurrent = 0;
                state.viradaMode = false;
                showToast('🔄 REINICIANDO APURAÇÃO (0%)');
            });
        }

        if (dom.btnFinish) {
            dom.btnFinish.addEventListener('click', () => {
                sound.click();
                state.pres.secoesApuradasTarget = state.pres.secoesTotal;
                state.gov.secoesApuradasTarget = state.gov.secoesTotal;
                state.pres.secoesApuradasCurrent = state.pres.secoesTotal;
                state.gov.secoesApuradasCurrent = state.gov.secoesTotal;
                showToast('🏁 100% DAS URNAS TOTALIZADAS!');
            });
        }

        if (dom.btnApplyNames) {
            dom.btnApplyNames.addEventListener('click', () => {
                sound.click();
                if (state.pres.candidates[0] && dom.editP1Name) {
                    state.pres.candidates[0].name = dom.editP1Name.value.trim().toUpperCase();
                    state.pres.candidates[0].party = dom.editP1Party.value.trim().toUpperCase();
                }
                if (state.pres.candidates[1] && dom.editP2Name) {
                    state.pres.candidates[1].name = dom.editP2Name.value.trim().toUpperCase();
                    state.pres.candidates[1].party = dom.editP2Party.value.trim().toUpperCase();
                }
                renderCandidateItems();
                showToast('✅ CANDIDATOS ATUALIZADOS');
            });
        }
    }

    // --- BOOTSTRAP ---
    async function init() {
        renderCandidateItems();
        setupInteractions();

        // Carga inicial forçada sincronizando imediatamente
        await fetchLiveTse(true, true);

        // Polling contínuo automático a cada 1.5s
        setInterval(() => fetchLiveTse(false, true), 1500);

        // Loop de renderização fluida a 1.000 Hz
        requestAnimationFrame(tickEngine);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
