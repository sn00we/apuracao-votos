/* ==========================================================================
   APURAÇÃO ELEIÇÕES 2026 // JAVASCRIPT PRINCIPAL (CLEAN & INTUITIVO)
   ========================================================================== */

(function () {
    'use strict';

    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        activeTab: 'view-estados',
        alagoasCargo: 'gov',
        audioEnabled: true,
        chatSoundEnabled: true,
        isChatOpen: false,
        unreadChatCount: 0,
        lastChatTime: 0,
        seenChatIds: new Set(),
        clientId: null,
        userName: '',
        userBadge: '⚖️ Neutro',

        // Dados consolidados do TSE
        data: null,
        pres: null,
        gov_al: null,
        sen_al: null,
        dep_al: null,
        est_al: null,
        uf_matrix: {},

        // Mapa interativo e explorador de cidades
        selectedState: 'SP',
        brazilPaths: null,
        stateCitiesList: [],
        cityVotesMap: {},
        focusedCityCd: null,

        // Modo do mapa: 'muni' (5.570 Cidades SeuImposto) ou 'macro' (27 Estados SVG)
        mapMode: 'muni',
        muniFeedData: null,
        selectedMuniIdx: null,
        hoveredMuniIdx: null
    };

    // --- SÍNTESE DE ÁUDIO (WEB AUDIO API NATIVA) ---
    class AudioManager {
        constructor() {
            this.ctx = null;
        }

        ensure() {
            if (!state.audioEnabled) return false;
            try {
                if (!this.ctx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return false;
                    this.ctx = new AudioCtx();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        beep(freq = 880, duration = 0.08, type = 'sine', gainVal = 0.2) {
            if (!this.ensure()) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(gainVal, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + duration);
            } catch (e) {}
        }

        // Som de confirmação de voto da urna
        urnaSound() {
            if (!this.ensure()) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1400, now);
                osc.frequency.setValueAtTime(1900, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.75);
            } catch (e) {}
        }

        // Som de gongo de boxe
        gongSound() {
            if (!this.ensure()) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 1.2);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 1.2);
            } catch (e) {}
        }

        // Som de notificação do chat
        chatPing() {
            if (!state.chatSoundEnabled || !this.ensure()) return;
            this.beep(1200, 0.08, 'sine', 0.2);
            setTimeout(() => this.beep(1600, 0.08, 'sine', 0.16), 70);
        }

        // Sons de reação do público ao vivo
        reactionSound(rid) {
            if (!this.ensure()) return;
            try {
                const now = this.ctx.currentTime;
                if (rid === 'tenso') {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(130, now);
                    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.35);
                } else if (rid === 'pipoca') {
                    this.beep(880, 0.04, 'triangle', 0.25);
                    setTimeout(() => this.beep(1320, 0.04, 'triangle', 0.2), 65);
                    setTimeout(() => this.beep(1760, 0.05, 'triangle', 0.15), 130);
                } else if (rid === 'picanha') {
                    this.beep(523.25, 0.08, 'sine', 0.22);
                    setTimeout(() => this.beep(659.25, 0.08, 'sine', 0.22), 80);
                    setTimeout(() => this.beep(783.99, 0.12, 'sine', 0.28), 160);
                } else if (rid === 'capitao') {
                    this.beep(440, 0.09, 'sawtooth', 0.2);
                    setTimeout(() => this.beep(554.37, 0.09, 'sawtooth', 0.2), 85);
                    setTimeout(() => this.beep(659.25, 0.14, 'sawtooth', 0.25), 170);
                } else if (rid === 'virada') {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(260, now);
                    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.3);
                    gain.gain.setValueAtTime(0.28, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.3);
                }
            } catch (e) {}
        }
    }

    const audio = new AudioManager();

    // Síntese de voz rápida para narração
    function speak(text) {
        if (!state.audioEnabled || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
        } catch (e) {}
    }

    // --- FORMATAÇÃO AUXILIAR ---
    function formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('pt-BR');
    }

    function formatPct(val) {
        if (typeof val === 'number') {
            return (val * 100).toFixed(2).replace('.', ',') + '%';
        }
        if (typeof val === 'string' && val.includes('%')) {
            return val;
        }
        return '0,00%';
    }

    function showToast(msg) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // --- NAVEGAÇÃO ENTRE ABAS ---
    window.switchTab = function (tabId) {
        state.activeTab = tabId;

        // Atualiza botões
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            if (btn.dataset.target === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Alterna painéis
        document.querySelectorAll('.view-panel').forEach(panel => {
            if (panel.id === tabId) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        if (tabId === 'view-estados') {
            renderEstadosView();
        }

        // Efeito sonoro sutil
        audio.beep(750, 0.04, 'sine', 0.1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- SUB-ABAS DE ALAGOAS ---
    window.switchAlagoasCargo = function (cargoKey) {
        state.alagoasCargo = cargoKey;
        document.querySelectorAll('.sub-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        if (event && event.target) {
            event.target.classList.add('active');
        }
        renderAlagoasView();
        audio.beep(650, 0.04, 'sine', 0.1);
    };

    // --- ÁUDIO GERAL ---
    window.toggleAudio = function () {
        state.audioEnabled = !state.audioEnabled;
        const icon = document.getElementById('sound-icon');
        if (icon) {
            icon.textContent = state.audioEnabled ? '🔊' : '🔇';
        }
        showToast(state.audioEnabled ? '🔊 Som ativado' : '🔇 Som desativado');
        if (state.audioEnabled) audio.beep(880, 0.08);
    };

    window.toggleChatSound = function () {
        state.chatSoundEnabled = !state.chatSoundEnabled;
        const icon = document.getElementById('chat-sound-btn-icon');
        if (icon) {
            icon.textContent = state.chatSoundEnabled ? '🔔' : '🔕';
        }
        showToast(state.chatSoundEnabled ? '🔔 Notificações sonoras ativadas' : '🔕 Notificações sonoras silenciadas');
    };

    // Sons divertidos da Rinha
    window.playCustomSound = function (type) {
        audio.ensure();
        if (type === 'urna') {
            audio.urnaSound();
            showToast('🗳️ Som oficial de confirmação da urna!');
        } else if (type === 'cheer') {
            audio.beep(523, 0.15, 'triangle', 0.3);
            setTimeout(() => audio.beep(659, 0.15, 'triangle', 0.3), 120);
            setTimeout(() => audio.beep(783, 0.3, 'triangle', 0.35), 240);
            showToast('🎉 Comemoração da torcida!');
        } else if (type === 'gong') {
            audio.gongSound();
            showToast('🔔 Gongo de boxe! Rinha pegando fogo!');
        } else if (type === 'lula') {
            audio.beep(800, 0.1);
            speak('Companheiro, a democracia venceu e a picanha tá garantida!');
            showToast('⭐ Lula 13: "A democracia venceu!"');
        } else if (type === 'bolso') {
            audio.beep(900, 0.1);
            speak('Brasil acima de tudo, Deus acima de todos! Acelera capitão!');
            showToast('🇧🇷 Capitão 22: "Brasil acima de tudo!"');
        } else if (type === 'picanha') {
            audio.beep(1000, 0.1);
            speak('Churrasco com cervejinha pro trabalhador!');
            showToast('🥩 "Chama na picanha!"');
        }
    };

    // --- MOTOR DE STREAM ULTRA-RÁPIDO (ALTA FREQUÊNCIA 800MS - 1000MS) ---
    let activePollController = null;
    let lastDataHash = null;
    let isPolling = false;

    function updateTelemetryUI(latency, engine) {
        const pill = document.getElementById('header-latency-pill');
        if (pill) {
            pill.innerHTML = `⚡ <strong>${latency}ms</strong> • EDGE`;
            if (latency < 100) {
                pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                pill.style.color = '#6ee7b7';
            } else if (latency < 250) {
                pill.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                pill.style.color = '#fde68a';
            } else {
                pill.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                pill.style.color = '#fca5a5';
            }
        }

        const mapTele = document.getElementById('map-speed-telemetry');
        if (mapTele) {
            mapTele.innerHTML = `⚡ Latência: <strong>${latency}ms</strong> • 1.0s • SP (GRU)`;
        }
    }

    function highlightLiveChange() {
        const liveDot = document.querySelector('.live-dot');
        if (liveDot) {
            liveDot.classList.add('flash-gold');
            setTimeout(() => liveDot.classList.remove('flash-gold'), 600);
        }
        audio.beep(1200, 0.03, 'sine', 0.12);
    }

    // --- CARREGAMENTO E SINCRONIZAÇÃO DE DADOS ---
    async function loadData() {
        const t0 = performance.now();
        try {
            if (activePollController) {
                activePollController.abort();
            }
            activePollController = new AbortController();

            // Cache buster com timestamp para contornar qualquer cache intermediário
            let res = await fetch(`/api/tse-live?_=${Date.now()}`, {
                signal: activePollController.signal,
                headers: { 'Cache-Control': 'no-cache, no-store' }
            });
            if (!res.ok) {
                res = await fetch('dados_tse_atual.json');
            }
            if (res.ok) {
                const data = await res.json();
                const latency = Math.round(performance.now() - t0);
                updateTelemetryUI(latency, data.micro_engine);

                // Detecta mudança nos dados para animação instantânea
                const newHash = `${data.micro_engine?.seq}_${data.pres?.votos_validos}_${data.pres?.secoes_apuradas}`;
                const hasChanged = lastDataHash && lastDataHash !== newHash;
                lastDataHash = newHash;

                state.data = data;
                state.pres = data.pres || null;
                state.gov_al = data.gov_al || null;
                state.sen_al = data.sen_al || null;
                state.dep_al = data.dep_al || null;
                state.est_al = data.est_al || null;
                state.uf_matrix = data.uf_matrix || {};

                renderAllViews();

                if (hasChanged) {
                    highlightLiveChange();
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('Erro ao carregar dados:', e);
            }
        }
    }

    // Loop adaptativo de alta frequência: 800ms ativo / 3.5s em segundo plano
    function startFastPolling() {
        if (isPolling) return;
        isPolling = true;

        async function step() {
            const t0 = performance.now();
            await loadData();
            const elapsed = performance.now() - t0;
            const nextDelay = document.hidden ? 3500 : Math.max(700, 1000 - elapsed);
            setTimeout(step, nextDelay);
        }

        step();

        // Acorda no mesmo milissegundo quando o usuário volta para a aba
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                loadData();
            }
        });
    }

    window.manualRefresh = async function () {
        const icon = document.getElementById('refresh-icon');
        if (icon) icon.style.transform = 'rotate(360deg)';
        await loadData();
        showToast('🔄 Dados atualizados com o TSE!');
        setTimeout(() => {
            if (icon) icon.style.transform = 'none';
        }, 500);
    };

    // --- RENDERIZAÇÃO DE TODAS AS TELAS ---
    function renderAllViews() {
        if (!state.data) return;

        renderPresidenteView();
        renderSegundoTurnoView();
        renderComparadorView();

        // Atualização contínua e suave do mapa
        if (!mapInitialized) {
            renderEstadosView();
        } else {
            updateMapColors();
            updateStatesScoreboard();
            renderQuickCollegePills();
            if (state.selectedState) {
                updateSelectedStateCard(state.selectedState);
            }
        }
    }

    // 1. Visão de Presidente
    function renderPresidenteView() {
        const pres = state.pres;
        if (!pres) return;

        // Cabeçalho de progresso
        const pctSecoes = pres.pct_secoes || '100,00%';
        const elPctSecoes = document.getElementById('pres-pct-secoes');
        if (elPctSecoes) elPctSecoes.textContent = pctSecoes;

        const elSecRatio = document.getElementById('pres-secoes-ratio');
        if (elSecRatio) elSecRatio.textContent = `${formatNumber(pres.secoes_apuradas)} de ${formatNumber(pres.secoes_total)}`;

        const elTotalVotos = document.getElementById('pres-total-votos');
        if (elTotalVotos) elTotalVotos.textContent = formatNumber(pres.total_votos);

        const elValidos = document.getElementById('pres-votos-validos');
        if (elValidos) elValidos.textContent = formatNumber(pres.votos_validos || 0);

        const elHeaderStatus = document.getElementById('header-status-text');
        if (elHeaderStatus) {
            elHeaderStatus.textContent = (pctSecoes && pctSecoes !== '0,00%') 
                ? `${pctSecoes} DAS SEÇÕES APURADAS` 
                : '0,00% DAS SEÇÕES APURADAS';
        }

        const elValidosInfo = document.getElementById('pres-validos-info');
        if (elValidosInfo) {
            elValidosInfo.textContent = (pctSecoes && pctSecoes !== '0,00%') 
                ? `${pctSecoes} APURADO` 
                : '0,00% APURADO';
        }

        const elBarFill = document.getElementById('pres-bar-fill');
        if (elBarFill) {
            const rawPct = parseFloat((pctSecoes || '0').replace(',', '.')) || 0;
            elBarFill.style.width = `${rawPct}%`;
        }

        // Hero: Duelo 22 vs 13
        const cands = pres.candidatos || [];
        const bolso = cands.find(c => c.numero === '22') || {};
        const lula = cands.find(c => c.numero === '13') || {};

        const vBolso = Number(bolso.votos || 0);
        const vLula = Number(lula.votos || 0);
        const totalDupla = vBolso + vLula;
        const validos = Number(pres.votos_validos || totalDupla);

        const pctBolso = validos > 0 ? (bolso.pct_str || formatPct(vBolso / validos)) : '0,00%';
        const pctLula = validos > 0 ? (lula.pct_str || formatPct(vLula / validos)) : '0,00%';

        const setAllText = (id, val) => document.querySelectorAll('#' + id).forEach(el => el.textContent = val);
        const setAllSrc = (id, src) => document.querySelectorAll('#' + id).forEach(el => el.src = src);
        const setAllWidth = (id, w) => document.querySelectorAll('#' + id).forEach(el => el.style.width = w);

        setAllText('hero-pct-22', pctBolso);
        setAllText('hero-votes-22', `${formatNumber(vBolso)} votos`);
        if (bolso.foto) setAllSrc('hero-foto-22', bolso.foto);

        setAllText('hero-pct-13', pctLula);
        setAllText('hero-votes-13', `${formatNumber(vLula)} votos`);
        if (lula.foto) setAllSrc('hero-foto-13', lula.foto);

        // Diferença entre os dois
        const delta = Math.abs(vBolso - vLula);
        setAllText('hero-delta-votos', formatNumber(delta));

        if (totalDupla === 0) {
            setAllText('hero-delta-pct', 'Aguardando apuração');
            setAllWidth('hero-tug-pl', '50%');
            setAllWidth('hero-tug-pt', '50%');
        } else {
            const pctDelta = (delta / validos * 100).toFixed(2).replace('.', ',');
            const lider = vBolso > vLula ? 'Bolsonaro' : (vLula > vBolso ? 'Lula' : 'Empate');
            setAllText('hero-delta-pct', `${pctDelta}% (${lider} à frente)`);

            const pctPl = (vBolso / totalDupla * 100).toFixed(1);
            const pctPt = (vLula / totalDupla * 100).toFixed(1);
            setAllWidth('hero-tug-pl', `${pctPl}%`);
            setAllWidth('hero-tug-pt', `${pctPt}%`);
        }

        // Lista completa de candidatos ordenada
        const listContainer = document.getElementById('pres-candidates-full-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const sorted = [...cands].sort((a, b) => b.votos - a.votos);

        sorted.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'cand-row-card';

            const pos = idx + 1;
            const posClass = pos === 1 ? 'top-1' : (pos === 2 ? 'top-2' : (pos === 3 ? 'top-3' : ''));
            const pctStr = c.pct_str || formatPct(c.pct);
            const rawPct = typeof c.pct === 'number' ? (c.pct * 100).toFixed(1) : parseFloat((pctStr || '').replace(',', '.')) || 0;

            row.innerHTML = `
                <div class="cand-pos ${posClass}">${pos}º</div>
                <img src="${c.foto || 'fotos/pres_22.jpeg'}" alt="${c.nome}" class="cand-thumb" onerror="this.src='fotos/pres_22.jpeg'">
                <div class="cand-info-col">
                    <div class="cand-row-title-row">
                        <strong class="cand-row-name">${c.nome}</strong>
                        ${c.eleito ? '<span class="cand-elected-badge">ELEITO</span>' : ''}
                    </div>
                    <span class="cand-row-sub">${c.partido} &bull; ${c.numero} ${c.nome_completo ? `&bull; ${c.nome_completo}` : ''}</span>
                </div>
                <div class="cand-bar-col">
                    <div class="cand-row-progress-bg">
                        <div class="cand-row-progress-fill" style="width: ${Math.min(100, rawPct)}%;"></div>
                    </div>
                </div>
                <div class="cand-row-score-col">
                    <span class="cand-row-pct">${pctStr}</span>
                    <span class="cand-row-votes">${formatNumber(c.votos)}</span>
                </div>
            `;
            listContainer.appendChild(row);
        });
    }

    // 2. Visão de Segundo Turno
    function renderSegundoTurnoView() {
        const pres = state.pres;
        if (!pres) return;

        const cands = pres.candidatos || [];
        const bolso = cands.find(c => c.numero === '22');
        const lula = cands.find(c => c.numero === '13');
        if (!bolso || !lula) return;

        const elPctBolso = document.getElementById('r2-pct-bolso');
        const elVotesBolso = document.getElementById('r2-votes-bolso');
        if (elPctBolso) elPctBolso.textContent = bolso.pct_str || formatPct(bolso.pct);
        if (elVotesBolso) elVotesBolso.textContent = `${formatNumber(bolso.votos)} votos`;

        const elPctLula = document.getElementById('r2-pct-lula');
        const elVotesLula = document.getElementById('r2-votes-lula');
        if (elPctLula) elPctLula.textContent = lula.pct_str || formatPct(lula.pct);
        if (elVotesLula) elVotesLula.textContent = `${formatNumber(lula.votos)} votos`;

        // Meta 50% + 1
        const metaVotos = Math.floor(pres.votos_validos * 0.5) + 1;
        const needBolso = Math.max(0, metaVotos - bolso.votos);
        const needLula = Math.max(0, metaVotos - lula.votos);

        const elNeedBolso = document.getElementById('r2-need-bolso');
        if (elNeedBolso) elNeedBolso.textContent = formatNumber(needBolso);

        const elNeedLula = document.getElementById('r2-need-lula');
        if (elNeedLula) elNeedLula.textContent = formatNumber(needLula);

        const diff = Math.abs(bolso.votos - lula.votos);
        const elDiff = document.getElementById('r2-diff-val');
        if (elDiff) elDiff.textContent = formatNumber(diff);

        // Atualiza a pista de corrida // Linha de chegada 50% + 1
        updateRaceTrack(bolso, lula, pres.votos_validos);

        // Executa a simulação inicial
        window.runSimulation();

        // Renderiza a Batalha das 5 Regiões
        renderRegionalBattle();
    }

    // Pista de corrida da linha de chegada 50% + 1
    function updateRaceTrack(bolso, lula, validos) {
        const runnerBolso = document.getElementById('runner-bolso');
        const runnerLula = document.getElementById('runner-lula');

        if (!validos) {
            if (runnerBolso) runnerBolso.style.left = '5%';
            if (runnerLula) runnerLula.style.left = '5%';
            return;
        }

        if (runnerBolso) {
            // Mapeia proporção para posição no trilho (0 a 90%)
            const pos = Math.min(88, Math.max(5, (pctBolso / 55) * 80));
            runnerBolso.style.left = `${pos}%`;
        }

        if (runnerLula) {
            const pos = Math.min(88, Math.max(5, (pctLula / 55) * 80));
            runnerLula.style.left = `${pos}%`;
        }
    }

    // Contagem Regressiva para 25 de Outubro de 2026 às 17:00
    function updateCountdown() {
        // Alvo: 25/10/2026 às 17:00 (Brasília)
        const targetDate = new Date('2026-10-25T17:00:00-03:00').getTime();
        const now = Date.now();
        let diff = targetDate - now;

        if (diff <= 0) {
            // Se já for no dia ou pós, simula tempo restante de apuração
            diff = Math.abs(diff);
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const elDays = document.getElementById('cd-days');
        const elHours = document.getElementById('cd-hours');
        const elMin = document.getElementById('cd-minutes');
        const elSec = document.getElementById('cd-seconds');

        if (elDays) elDays.textContent = String(days).padStart(2, '0');
        if (elHours) elHours.textContent = String(hours).padStart(2, '0');
        if (elMin) elMin.textContent = String(minutes).padStart(2, '0');
        if (elSec) elSec.textContent = String(seconds).padStart(2, '0');
    }

    // Enquete / Bolão ao Vivo do 2º Turno
    async function fetchPollResults() {
        try {
            const res = await fetch('/api/poll/results');
            if (res.ok) {
                const data = await res.json();
                updatePollUI(data);
            }
        } catch (e) {}
    }

    function updatePollUI(data) {
        if (!data) return;
        const statLula = document.getElementById('poll-stat-lula');
        const statBolso = document.getElementById('poll-stat-bolso');
        const barLula = document.getElementById('poll-bar-lula');
        const barBolso = document.getElementById('poll-bar-bolso');
        const totalUsers = document.getElementById('poll-total-users');

        if (statLula) statLula.textContent = `${data.pct_lula}% (${formatNumber(data.lula)} votos)`;
        if (statBolso) statBolso.textContent = `${data.pct_bolsonaro}% (${formatNumber(data.bolsonaro)} votos)`;
        if (barLula) barLula.style.width = `${data.pct_lula}%`;
        if (barBolso) barBolso.style.width = `${data.pct_bolsonaro}%`;
        if (totalUsers) totalUsers.textContent = `${formatNumber(data.total_votes)} palpites registrados na comunidade`;
    }

    window.voteInPoll = async function (choice) {
        audio.beep(880, 0.06);
        const alertBox = document.getElementById('poll-voted-alert');
        try {
            const res = await fetch('/api/poll/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: state.clientId, choice: choice })
            });
            if (res.ok) {
                const data = await res.json();
                updatePollUI(data);
                if (alertBox) {
                    alertBox.classList.remove('hidden');
                    alertBox.textContent = `✅ Voto registrado em ${choice === '13' ? 'Lula' : 'Bolsonaro'}!`;
                }
                showToast(`🗳️ Seu voto foi computado no bolão!`);
            }
        } catch (e) {
            showToast('✅ Voto registrado!');
        }
    };

    // Simulador da Virada // Calculadora de Herança de Votos
    window.runSimulation = function () {
        const pres = state.pres;
        if (!pres || !pres.candidatos) return;

        const bolso = pres.candidatos.find(c => c.numero === '22') || { votos: 56104503 };
        const lula = pres.candidatos.find(c => c.numero === '13') || { votos: 53879538 };

        // Votos de terceiros
        const votesCury = 827940;
        const votesCaiado = 668422;
        const votesRenan = 640393;
        const votesOutros = 1135000;

        // Sliders (0 = 100% Lula, 100 = 100% Bolsonaro)
        const valCury = parseInt(document.getElementById('sim-cury')?.value || '50');
        const valCaiado = parseInt(document.getElementById('sim-caiado')?.value || '50');
        const valRenan = parseInt(document.getElementById('sim-renan')?.value || '50');
        const valOutros = parseInt(document.getElementById('sim-outros')?.value || '50');

        // Atualiza labels dos sliders
        updateSliderLabel('lbl-cury', valCury);
        updateSliderLabel('lbl-caiado', valCaiado);
        updateSliderLabel('lbl-renan', valRenan);
        updateSliderLabel('lbl-outros', valOutros);

        // Distribuição simulada
        const bolsoGain = Math.round(
            votesCury * (valCury / 100) +
            votesCaiado * (valCaiado / 100) +
            votesRenan * (valRenan / 100) +
            votesOutros * (valOutros / 100)
        );

        const lulaGain = Math.round(
            votesCury * ((100 - valCury) / 100) +
            votesCaiado * ((100 - valCaiado) / 100) +
            votesRenan * ((100 - valRenan) / 100) +
            votesOutros * ((100 - valOutros) / 100)
        );

        const totalSimBolso = bolso.votos + bolsoGain;
        const totalSimLula = lula.votos + lulaGain;
        const totalSim = totalSimBolso + totalSimLula;

        const pctBolso = (totalSimBolso / totalSim * 100).toFixed(2).replace('.', ',');
        const pctLula = (totalSimLula / totalSim * 100).toFixed(2).replace('.', ',');

        // Atualiza DOM
        const elScoreBolso = document.getElementById('sim-score-bolso');
        const elPctBolso = document.getElementById('sim-pct-bolso');
        const elScoreLula = document.getElementById('sim-score-lula');
        const elPctLula = document.getElementById('sim-pct-lula');
        const trackPl = document.getElementById('sim-track-pl');
        const trackPt = document.getElementById('sim-track-pt');
        const winnerBadge = document.getElementById('sim-winner-badge');

        if (elScoreBolso) elScoreBolso.textContent = formatNumber(totalSimBolso);
        if (elPctBolso) elPctBolso.textContent = `${pctBolso}%`;
        if (elScoreLula) elScoreLula.textContent = formatNumber(totalSimLula);
        if (elPctLula) elPctLula.textContent = `${pctLula}%`;

        const rawPctPl = (totalSimBolso / totalSim * 100).toFixed(1);
        const rawPctPt = (totalSimLula / totalSim * 100).toFixed(1);
        if (trackPl) trackPl.style.width = `${rawPctPl}%`;
        if (trackPt) trackPt.style.width = `${rawPctPt}%`;

        if (winnerBadge) {
            if (totalSimBolso > totalSimLula) {
                const diff = totalSimBolso - totalSimLula;
                winnerBadge.textContent = `BOLSONARO +${formatNumber(diff)} VOTOS`;
                winnerBadge.style.color = '#3b82f6';
                winnerBadge.style.borderColor = 'rgba(59, 130, 246, 0.4)';
            } else {
                const diff = totalSimLula - totalSimBolso;
                winnerBadge.textContent = `VIRADA DO LULA +${formatNumber(diff)} VOTOS`;
                winnerBadge.style.color = '#ef4444';
                winnerBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }
        }
    };

    function updateSliderLabel(prefix, val) {
        const lulaPct = 100 - val;
        const bolsoPct = val;
        const elLula = document.getElementById(`${prefix}-lula`);
        const elBolso = document.getElementById(`${prefix}-bolso`);
        if (elLula) elLula.textContent = `Lula: ${lulaPct}%`;
        if (elBolso) elBolso.textContent = `Bolsonaro: ${bolsoPct}%`;
    }

    window.applySimPreset = function (preset) {
        const sCury = document.getElementById('sim-cury');
        const sCaiado = document.getElementById('sim-caiado');
        const sRenan = document.getElementById('sim-renan');
        const sOutros = document.getElementById('sim-outros');

        if (preset === 'direita') {
            if (sCury) sCury.value = 85;
            if (sCaiado) sCaiado.value = 90;
            if (sRenan) sRenan.value = 75;
            if (sOutros) sOutros.value = 65;
            showToast('🔵 Cenário Direita Unificada aplicado!');
        } else if (preset === 'virada') {
            if (sCury) sCury.value = 25;
            if (sCaiado) sCaiado.value = 30;
            if (sRenan) sRenan.value = 35;
            if (sOutros) sOutros.value = 20;
            showToast('🔴 Cenário Virada da Frente Ampla aplicado!');
        } else if (preset === 'divisao') {
            if (sCury) sCury.value = 50;
            if (sCaiado) sCaiado.value = 50;
            if (sRenan) sRenan.value = 50;
            if (sOutros) sOutros.value = 50;
            showToast('⚖️ Cenário Divisão 50/50 aplicado!');
        }
        audio.beep(750, 0.05);
        window.runSimulation();
    };

    window.resetSimulation = function () {
        window.applySimPreset('divisao');
        showToast('🔄 Simulação restaurada');
    };

    // Batalha das 5 Regiões do Brasil
    function renderRegionalBattle() {
        const grid = document.getElementById('regions-grid');
        if (!grid || !state.uf_matrix) return;

        const regionsDef = {
            'Nordeste': { ufs: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'], icon: '🌴' },
            'Sudeste': { ufs: ['SP', 'MG', 'RJ', 'ES'], icon: '🏙️' },
            'Sul': { ufs: ['PR', 'SC', 'RS'], icon: '🌾' },
            'Centro-Oeste': { ufs: ['GO', 'MT', 'MS', 'DF'], icon: '🚜' },
            'Norte': { ufs: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'], icon: '🌳' }
        };

        grid.innerHTML = '';

        Object.entries(regionsDef).forEach(([regName, info]) => {
            let bolsoVotes = 0;
            let lulaVotes = 0;

            info.ufs.forEach(ufCode => {
                const uf = state.uf_matrix[ufCode];
                if (uf) {
                    bolsoVotes += (uf.bolsonaro_votos || 0);
                    lulaVotes += (uf.lula_votos || 0);
                }
            });

            const total = bolsoVotes + lulaVotes;
            const pctBolso = total > 0 ? (bolsoVotes / total * 100).toFixed(1) : '50.0';
            const pctLula = total > 0 ? (lulaVotes / total * 100).toFixed(1) : '50.0';

            const leadPL = bolsoVotes >= lulaVotes;
            const diff = Math.abs(bolsoVotes - lulaVotes);
            const leadLabel = leadPL ? `Bolsonaro +${formatNumber(diff)}` : `Lula +${formatNumber(diff)}`;
            const leadClass = leadPL ? 'region-lead-pl' : 'region-lead-pt';

            const box = document.createElement('div');
            box.className = 'region-box';
            box.innerHTML = `
                <div class="region-box-header">
                    <span class="region-name">${info.icon} ${regName}</span>
                    <span class="region-lead-tag ${leadClass}">${leadLabel}</span>
                </div>
                <div class="region-bar">
                    <div class="region-bar-pl" style="width: ${pctBolso}%;"></div>
                    <div class="region-bar-pt" style="width: ${pctLula}%;"></div>
                </div>
                <div class="region-stats">
                    <span class="pl-color">PL: ${pctBolso}% (${formatNumber(bolsoVotes)})</span>
                    <span class="pt-color">PT: ${pctLula}% (${formatNumber(lulaVotes)})</span>
                </div>
            `;
            grid.appendChild(box);
        });
    }

    // 3. Visão de Alagoas
    function renderAlagoasView() {
        const container = document.getElementById('alagoas-cargo-content');
        if (!container) return;

        let cargoData = null;
        let cargoTitle = 'Governador';

        if (state.alagoasCargo === 'gov') {
            cargoData = state.gov_al;
            cargoTitle = 'Governador de Alagoas';
        } else if (state.alagoasCargo === 'sen') {
            cargoData = state.sen_al;
            cargoTitle = 'Senador de Alagoas';
        } else if (state.alagoasCargo === 'dep_fed') {
            cargoData = state.dep_al;
            cargoTitle = 'Deputados Federais de Alagoas';
        } else if (state.alagoasCargo === 'dep_est') {
            cargoData = state.est_al;
            cargoTitle = 'Deputados Estaduais de Alagoas';
        }

        if (!cargoData || !cargoData.candidatos || cargoData.candidatos.length === 0) {
            container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Carregando dados de ${cargoTitle}...</div>`;
            return;
        }

        container.innerHTML = '';
        const sorted = [...cargoData.candidatos].sort((a, b) => b.votos - a.votos);

        sorted.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'cand-row-card';

            const pos = idx + 1;
            const posClass = pos === 1 ? 'top-1' : (pos === 2 ? 'top-2' : (pos === 3 ? 'top-3' : ''));
            const pctStr = c.pct_str || formatPct(c.pct);
            const rawPct = typeof c.pct === 'number' ? (c.pct * 100).toFixed(1) : parseFloat((pctStr || '').replace(',', '.')) || 0;

            row.innerHTML = `
                <div class="cand-pos ${posClass}">${pos}º</div>
                <img src="${c.foto || 'fotos/cand_45.jpeg'}" alt="${c.nome}" class="cand-thumb" onerror="this.src='fotos/cand_45.jpeg'">
                <div class="cand-info-col">
                    <div class="cand-row-title-row">
                        <strong class="cand-row-name">${c.nome}</strong>
                        ${c.eleito ? '<span class="cand-elected-badge">ELEITO</span>' : ''}
                    </div>
                    <span class="cand-row-sub">${c.partido} &bull; ${c.numero}</span>
                </div>
                <div class="cand-bar-col">
                    <div class="cand-row-progress-bg">
                        <div class="cand-row-progress-fill" style="width: ${Math.min(100, rawPct)}%;"></div>
                    </div>
                </div>
                <div class="cand-row-score-col">
                    <span class="cand-row-pct">${pctStr}</span>
                    <span class="cand-row-votes">${formatNumber(c.votos)}</span>
                </div>
            `;
            container.appendChild(row);
        });
    }

    // 4. Visão de Comparador X1
    function renderComparadorView() {
        const pres = state.pres;
        if (!pres || !pres.candidatos) return;

        const selectA = document.getElementById('compare-select-a');
        const selectB = document.getElementById('compare-select-b');
        if (!selectA || !selectB) return;

        // Popula selects se estiverem vazios
        if (selectA.options.length === 0) {
            pres.candidatos.forEach(c => {
                const optA = new Option(`${c.nome} (${c.partido} ${c.numero})`, c.numero);
                const optB = new Option(`${c.nome} (${c.partido} ${c.numero})`, c.numero);
                selectA.add(optA);
                selectB.add(optB);
            });
            selectA.value = '22'; // Bolsonaro default
            selectB.value = '13'; // Lula default
        }

        window.updateComparison();
    }

    window.updateComparison = function () {
        const pres = state.pres;
        if (!pres || !pres.candidatos) return;

        const selectA = document.getElementById('compare-select-a');
        const selectB = document.getElementById('compare-select-b');
        const resultCard = document.getElementById('compare-result-card');
        if (!selectA || !selectB || !resultCard) return;

        const candA = pres.candidatos.find(c => c.numero === selectA.value) || pres.candidatos[0];
        const candB = pres.candidatos.find(c => c.numero === selectB.value) || pres.candidatos[1];

        const delta = Math.abs(candA.votos - candB.votos);
        const lider = candA.votos >= candB.votos ? candA.nome : candB.nome;

        const totalPair = candA.votos + candB.votos;
        const pctA = totalPair > 0 ? (candA.votos / totalPair * 100).toFixed(1) : '50.0';
        const pctB = totalPair > 0 ? (candB.votos / totalPair * 100).toFixed(1) : '50.0';

        resultCard.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; align-items: center; text-align: center;">
                <div>
                    <img src="${candA.foto || 'fotos/pres_22.jpeg'}" alt="${candA.nome}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-cyan);">
                    <h4 style="margin-top: 8px; font-size: 16px; color: #ffffff;">${candA.nome}</h4>
                    <span style="font-size: 12px; color: var(--text-secondary);">${candA.partido} &bull; ${candA.numero}</span>
                    <div style="font-size: 26px; font-weight: 800; font-family: var(--font-mono); margin-top: 6px; color: var(--accent-cyan);">${candA.pct_str || formatPct(candA.pct)}</div>
                    <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">${formatNumber(candA.votos)} votos</div>
                </div>

                <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 12px 18px; border-radius: var(--radius-md);">
                    <span style="font-size: 10px; font-weight: 700; color: var(--text-muted);">DIFERENÇA DIRETA</span>
                    <div style="font-size: 20px; font-weight: 800; font-family: var(--font-mono); color: #ffffff;">${formatNumber(delta)}</div>
                    <span style="font-size: 11px; color: var(--accent-green);">${lider} na frente</span>
                </div>

                <div>
                    <img src="${candB.foto || 'fotos/pres_13.jpeg'}" alt="${candB.nome}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid var(--pt-red);">
                    <h4 style="margin-top: 8px; font-size: 16px; color: #ffffff;">${candB.nome}</h4>
                    <span style="font-size: 12px; color: var(--text-secondary);">${candB.partido} &bull; ${candB.numero}</span>
                    <div style="font-size: 26px; font-weight: 800; font-family: var(--font-mono); margin-top: 6px; color: var(--pt-red);">${candB.pct_str || formatPct(candB.pct)}</div>
                    <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">${formatNumber(candB.votos)} votos</div>
                </div>
            </div>

            <div style="margin-top: 24px;">
                <div style="height: 10px; background: var(--bg-surface); border-radius: var(--radius-full); overflow: hidden; display: flex;">
                    <div style="width: ${pctA}%; background: var(--accent-cyan);"></div>
                    <div style="width: ${pctB}%; background: var(--pt-red);"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: var(--font-mono); margin-top: 4px; color: var(--text-secondary);">
                    <span>${candA.nome}: ${pctA}%</span>
                    <span>${candB.nome}: ${pctB}%</span>
                </div>
            </div>
        `;
    };

    // -------------------------------------------------------------
    // 5. VISÃO DE ESTADOS, MAPA INTERATIVO VETORIAL & AUTO-TOUR
    // -------------------------------------------------------------
    const STATE_CENTROIDS = {
        "AC": { x: 82.8, y: 282.0 },
        "AL": { x: 672.0, y: 298.0 },
        "AM": { x: 174.3, y: 184.8 },
        "AP": { x: 388.9, y: 86.8 },
        "BA": { x: 566.4, y: 360.4 },
        "CE": { x: 611.4, y: 212.6 },
        "DF": { x: 476.0, y: 414.0 },
        "ES": { x: 592.0, y: 474.0 },
        "GO": { x: 436.6, y: 406.0 },
        "MA": { x: 510.3, y: 218.7 },
        "MG": { x: 507.1, y: 453.8 },
        "MS": { x: 351.9, y: 491.0 },
        "MT": { x: 328.2, y: 346.9 },
        "PA": { x: 387.1, y: 181.9 },
        "PB": { x: 674.0, y: 242.0 },
        "PE": { x: 642.0, y: 260.0 },
        "PI": { x: 545.8, y: 240.1 },
        "PR": { x: 406.9, y: 563.7 },
        "RJ": { x: 562.0, y: 520.0 },
        "RN": { x: 664.0, y: 214.0 },
        "RO": { x: 202.6, y: 313.0 },
        "RR": { x: 227.1, y: 82.3 },
        "RS": { x: 366.8, y: 669.4 },
        "SC": { x: 410.8, y: 619.0 },
        "SE": { x: 654.0, y: 318.0 },
        "SP": { x: 452.8, y: 526.1 },
        "TO": { x: 459.9, y: 285.2 }
    };

    const TOUR_UF_SEQUENCE = [
        'SP', 'MG', 'RJ', 'BA', 'RS', 'PR', 'PE', 'CE', 'PA', 'SC',
        'GO', 'MA', 'PB', 'ES', 'AM', 'RN', 'AL', 'PI', 'MT', 'MS',
        'DF', 'RO', 'TO', 'SE', 'AC', 'AP', 'RR'
    ];

    state.autoTourEnabled = false; // Inicia pausado para controle total do usuário
    state.showMapLabels = true;
    state.mapFilter = 'all'; // 'all', 'bolso', 'lula', 'tight'
    state.loadedStateUf = null;
    let autoTourTimer = null;
    let autoTourProgressTimer = null;
    let autoTourStartTime = Date.now();
    const AUTO_TOUR_INTERVAL = 6500; // 6.5 segundos por estado na transmissão

    async function renderEstadosView() {
        populateMapDropdown();
        await initBrazilMap();
        updateMapColors();
        updateStatesScoreboard();
        renderQuickCollegePills();
        if (!state.selectedState) {
            window.selectState('SP', false);
        } else {
            updateSelectedStateCard(state.selectedState);
        }
        renderBottomUfCards();
        initAutoTour();
    }

    function populateMapDropdown() {
        const select = document.getElementById('select-map-uf');
        if (!select || select.options.length > 0) return;

        const ufs = Object.values(state.uf_matrix || {}).sort((a, b) => (a.nome || a.uf).localeCompare(b.nome || b.uf));
        ufs.forEach(u => {
            const opt = new Option(`${u.nome || u.uf} (${u.uf})`, u.uf);
            select.add(opt);
        });
        select.value = state.selectedState || 'SP';
    }

    window.selectStateFromDropdown = function (uf) {
        pauseAutoTourUserAction();
        window.selectState(uf, true);
        audio.beep(800, 0.04);
    };

    // Controle de Rotação Automática
    window.toggleAutoTour = function () {
        state.autoTourEnabled = !state.autoTourEnabled;
        updateAutoTourButtonUI();
        if (state.autoTourEnabled) {
            autoTourStartTime = Date.now();
            showToast('▶️ Transmissão automática ativada!');
        } else {
            showToast('⏸️ Transmissão pausada. Você está no controle manual.');
        }
    };

    function pauseAutoTourUserAction() {
        if (state.autoTourEnabled) {
            state.autoTourEnabled = false;
            updateAutoTourButtonUI();
            showToast('⏸️ Transmissão pausada para explorar o estado');
        }
    }

    function updateAutoTourButtonUI() {
        const btn = document.getElementById('btn-auto-tour');
        const icon = document.getElementById('auto-tour-icon');
        const lbl = document.getElementById('auto-tour-lbl');
        if (!btn || !icon || !lbl) return;

        if (state.autoTourEnabled) {
            btn.classList.remove('paused');
            btn.classList.add('active');
            icon.textContent = '⏸️';
            lbl.innerHTML = 'Transmissão Automática: <strong>LIGADA</strong>';
        } else {
            btn.classList.remove('active');
            btn.classList.add('paused');
            icon.textContent = '▶️';
            lbl.innerHTML = 'Transmissão Automática: <strong>DESLIGADA</strong>';
            const bar = document.getElementById('auto-tour-progress-bar');
            if (bar) bar.style.width = '0%';
        }
    }

    // Toggle de Porcentagens no Mapa
    window.toggleMapLabels = function () {
        state.showMapLabels = !state.showMapLabels;
        const btn = document.getElementById('btn-toggle-labels');
        const lbl = document.getElementById('lbl-labels-state');
        if (btn) btn.classList.toggle('active', state.showMapLabels);
        if (lbl) lbl.textContent = state.showMapLabels ? 'ATIVAS' : 'OCULTAS';

        const labelsG = document.getElementById('map-labels-container');
        if (labelsG) {
            labelsG.style.display = state.showMapLabels ? 'block' : 'none';
        }
        showToast(state.showMapLabels ? '🏷️ Porcentagens visíveis no mapa' : '🏷️ Porcentagens ocultadas');
    };

    // Filtros Rápidos (Todos, Bolsonaro, Lula, Acirrados)
    window.setMapFilter = function (filterKey) {
        state.mapFilter = filterKey;
        document.querySelectorAll('.map-filter-pill').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filterKey);
        });
        updateMapColors();
        requestCanvasRender();
        audio.beep(750, 0.04);
        showToast(`Filtro aplicado: ${filterKey.toUpperCase()}`);
    };

    function initAutoTour() {
        if (autoTourTimer) return; // já inicializado

        autoTourStartTime = Date.now();

        autoTourProgressTimer = setInterval(() => {
            if (!state.autoTourEnabled) return;
            const now = Date.now();
            const elapsed = Math.max(0, (now - autoTourStartTime) % AUTO_TOUR_INTERVAL);
            const pct = Math.min(100, (elapsed / AUTO_TOUR_INTERVAL * 100)).toFixed(1);
            const bar = document.getElementById('auto-tour-progress-bar');
            if (bar) bar.style.width = `${pct}%`;
        }, 100);

        autoTourTimer = setInterval(() => {
            if (!state.autoTourEnabled) return;
            if (state.activeTab && state.activeTab !== 'view-estados') return;

            let seq = TOUR_UF_SEQUENCE;
            if (state.mapFilter === 'bolso') {
                seq = TOUR_UF_SEQUENCE.filter(uf => state.uf_matrix[uf] && state.uf_matrix[uf].lider === '22');
            } else if (state.mapFilter === 'lula') {
                seq = TOUR_UF_SEQUENCE.filter(uf => state.uf_matrix[uf] && state.uf_matrix[uf].lider === '13');
            } else if (state.mapFilter === 'tight') {
                seq = TOUR_UF_SEQUENCE.filter(uf => {
                    const u = state.uf_matrix[uf];
                    if (!u) return false;
                    const p1 = parseFloat((u.bolsonaro_pct || '0').replace('%', '').replace(',', '.'));
                    const p2 = parseFloat((u.lula_pct || '0').replace('%', '').replace(',', '.'));
                    return Math.abs(p1 - p2) < 5.0;
                });
            }
            if (!seq || seq.length === 0) seq = TOUR_UF_SEQUENCE;

            const currentIndex = seq.indexOf(state.selectedState);
            const nextIndex = (currentIndex + 1) % seq.length;
            const nextUf = seq[nextIndex];

            autoTourStartTime = Date.now();
            window.selectState(nextUf, false);
        }, AUTO_TOUR_INTERVAL);
    }

    let mapInitialized = false;
    async function initBrazilMap() {
        if (mapInitialized) return;
        const svg = document.getElementById('brazil-svg');
        if (!svg) return;

        try {
            if (!state.brazilPaths) {
                let res = await fetch('/api/tse/brazil-map-paths');
                if (!res.ok) res = await fetch('brazil_paths.json');
                if (res.ok) {
                    state.brazilPaths = await res.json();
                }
            }
        } catch (e) {
            console.warn('Erro ao carregar mapa:', e);
        }

        if (!state.brazilPaths) return;

        // Limpa e preserva defs
        const defs = svg.querySelector('defs');
        svg.innerHTML = '';
        if (defs) svg.appendChild(defs);

        // Container de visualização com Zoom e Pan
        let viewportGroup = svg.querySelector('#map-viewport-group');
        if (!viewportGroup) {
            viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            viewportGroup.setAttribute('id', 'map-viewport-group');
            svg.appendChild(viewportGroup);
        }
        viewportGroup.innerHTML = '';

        // 1. Container de Paths dos Estados
        const pathsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pathsGroup.setAttribute('id', 'map-paths-container');

        Object.entries(state.brazilPaths).forEach(([ufCode, dPath]) => {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', dPath);
            pathEl.setAttribute('id', `state-path-${ufCode}`);
            pathEl.setAttribute('class', 'state-path');
            pathEl.setAttribute('data-uf', ufCode);

            pathEl.addEventListener('mouseenter', (e) => showMapTooltip(e, ufCode));
            pathEl.addEventListener('mousemove', (e) => moveMapTooltip(e));
            pathEl.addEventListener('mouseleave', () => hideMapTooltip());

            // Clique seleciona e fixa o estado
            pathEl.addEventListener('click', (e) => {
                e.stopPropagation();
                pauseAutoTourUserAction();
                window.selectState(ufCode, true);
                audio.beep(850, 0.05);
            });

            // Duplo clique foca e amplia no estado
            pathEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const pos = STATE_CENTROIDS[ufCode];
                if (pos) {
                    mapZoom = 2.4;
                    mapPanX = (375 - pos.x) * 1.4;
                    mapPanY = (375 - pos.y) * 1.4;
                    applyMapTransform();
                    showToast(`🔍 Zoom ampliado em ${ufCode} (240%)`);
                }
            });

            pathsGroup.appendChild(pathEl);
        });
        viewportGroup.appendChild(pathsGroup);

        // 2. Container de Rótulos e Porcentagens Flutuantes sobre cada Estado
        const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelsGroup.setAttribute('id', 'map-labels-container');

        Object.entries(STATE_CENTROIDS).forEach(([ufCode, pos]) => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'map-state-label');
            g.setAttribute('id', `state-label-${ufCode}`);
            g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
            g.setAttribute('data-uf', ufCode);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'map-label-rect');
            rect.setAttribute('id', `map-label-rect-${ufCode}`);
            rect.setAttribute('x', '-21');
            rect.setAttribute('y', '-11');
            rect.setAttribute('width', '42');
            rect.setAttribute('height', '22');
            rect.setAttribute('rx', '4');

            const textUf = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textUf.setAttribute('class', 'map-label-text-uf');
            textUf.setAttribute('y', '-2');
            textUf.textContent = ufCode;

            const textPct = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textPct.setAttribute('class', 'map-label-text-pct');
            textPct.setAttribute('id', `map-label-pct-${ufCode}`);
            textPct.setAttribute('y', '6');
            textPct.textContent = '...';

            g.appendChild(rect);
            g.appendChild(textUf);
            g.appendChild(textPct);

            labelsGroup.appendChild(g);
        });
        viewportGroup.appendChild(labelsGroup);

        // Inicializa o motor de Zoom e Pan interativo
        setupMapZoomAndPan();

        mapInitialized = true;
    }

    // --- MOTOR UNIFICADO DE ZOOM, PAN E NAVEGAÇÃO DO MAPA ---
    let mapZoom = 1.0;
    let mapPanX = 0;
    let mapPanY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    // Estado do Mapa Canvas SeuImposto (5.570 Cidades)
    let seuImpostoGeo = null;
    let seuImpostoCanvas = null;
    let seuImpostoCtx = null;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let canvasScale = 1.0;
    let canvasPanX = 0;
    let canvasPanY = 0;
    let baseScale = 1.0;
    let baseOffsetX = 0;
    let baseOffsetY = 0;
    let isCanvasDragging = false;
    let canvasDragStartX = 0;
    let canvasDragStartY = 0;
    let canvasDragDist = 0;
    let renderRequested = false;

    function requestCanvasRender() {
        if (renderRequested) return;
        renderRequested = true;
        requestAnimationFrame(() => {
            renderRequested = false;
            renderSeuImpostoMap();
        });
    }

    // Inicialização do Motor Geo TopoJSON do SeuImposto
    function initSeuImpostoGeo() {
        if (seuImpostoGeo) return seuImpostoGeo;
        if (!window.BRASIL) return null;
        try {
            const At = window.BRASIL,
                  [zt, L] = At.transform.scale,
                  [et, R] = At.transform.translate,
                  Gt = At.objects.municipios.geometries,
                  xe = At.arcs.map(x => {
                      let mt = 0, Et = 0;
                      return x.map(([Zt, ke]) => (mt += Zt, Et += ke, [(mt * zt + et) / 1e3, -(Et * L + R) / 1e3]));
                  });

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const x of xe) {
                for (const [mt, Et] of x) {
                    if (mt < minX) minX = mt;
                    if (Et < minY) minY = Et;
                    if (mt > maxX) maxX = mt;
                    if (Et > maxY) maxY = Et;
                }
            }
            for (const x of xe) {
                for (const mt of x) {
                    mt[0] -= minX;
                    mt[1] -= minY;
                }
            }
            const le = maxX - minX,
                  Nn = maxY - minY,
                  vn = x => {
                      const mt = [];
                      for (const Et of x) {
                          const Zt = Et < 0 ? xe[~Et].slice().reverse() : xe[Et];
                          for (let ke = mt.length ? 1 : 0; ke < Zt.length; ke++) mt.push(Zt[ke]);
                      }
                      return mt;
                  },
                  On = x => x.type === 'Polygon' ? [x.arcs] : x.type === 'MultiPolygon' ? x.arcs : [],
                  pt = x => {
                      let mt = 0;
                      for (let Et = 0, Zt = x.length - 1; Et < x.length; Zt = Et++)
                          mt += (x[Zt][0] + x[Et][0]) * (x[Zt][1] - x[Et][1]);
                      return mt / 2;
                  },
                  he = x => {
                      let mt = 0, Et = 0, Zt = 0;
                      for (let ke = 0, Ot = x.length - 1; ke < x.length; Ot = ke++) {
                          const It = x[Ot][0] * x[ke][1] - x[ke][0] * x[Ot][1];
                          mt += It;
                          Et += (x[Ot][0] + x[ke][0]) * It;
                          Zt += (x[Ot][1] + x[ke][1]) * It;
                      }
                      return mt ? [Et / (3 * mt), Zt / (3 * mt)] : x[0];
                  },
                  fn = xe.map(() => []),
                  ve = Gt.map((x, mt) => {
                      const Et = new Path2D();
                      let Zt = null, ke = 0, Ot = 0, It = Infinity, ct = Infinity, Vt = -Infinity, ee = -Infinity;
                      for (const de of On(x)) {
                          de.forEach((Ht, fe) => {
                              const pe = vn(Ht);
                              Et.moveTo(pe[0][0], pe[0][1]);
                              for (let Se = 1; Se < pe.length; Se++) Et.lineTo(pe[Se][0], pe[Se][1]);
                              Et.closePath();
                              for (const [Se, se] of pe) {
                                  if (Se < It) It = Se;
                                  if (se < ct) ct = se;
                                  if (Se > Vt) Vt = Se;
                                  if (se > ee) ee = se;
                              }
                              if (fe === 0) {
                                  const Se = Math.abs(pt(pe));
                                  Ot += Se;
                                  if (Se > ke) { ke = Se; Zt = pe; }
                              }
                              for (const Se of Ht) fn[Se < 0 ? ~Se : Se].push(mt);
                          });
                      }
                      const Le = x.properties;
                      return {
                          i: mt,
                          id: Le.id,
                          name: Le.n,
                          uf: Le.uf,
                          pop: Le.p,
                          path: Et,
                          c: Zt ? he(Zt) : [0, 0],
                          km2: Ot,
                          box: [It, ct, Vt, ee]
                      };
                  }),
                  nn = { edge: new Path2D(), uf: new Path2D(), muni: new Path2D() },
                  te = {};

            xe.forEach((x, mt) => {
                const Et = [...new Set(fn[mt])],
                      Zt = Et.length < 2 ? 'edge' : ve[Et[0]].uf !== ve[Et[1]].uf ? 'uf' : 'muni',
                      ke = Ot => {
                          Ot.moveTo(x[0][0], x[0][1]);
                          for (let It = 1; It < x.length; It++) Ot.lineTo(x[It][0], x[It][1]);
                      };
                if (ke(nn[Zt]), Zt !== 'muni') {
                    for (const Ot of Et) {
                        const It = ve[Ot].uf;
                        ke(te[It] || (te[It] = new Path2D()));
                    }
                }
            });

            const Ne = {},
                  Ns = new Set(['2605459']), // Fernando de Noronha
                  pn = [Infinity, Infinity, -Infinity, -Infinity];

            for (const x of ve) {
                const mt = Ne[x.uf] || (Ne[x.uf] = { uf: x.uf, munis: [], pop: 0, box: [Infinity, Infinity, -Infinity, -Infinity], cx: 0, cy: 0, km2: 0 });
                mt.munis.push(x.i);
                mt.pop += x.pop;
                mt.km2 += x.km2;
                if (!Ns.has(String(x.id))) {
                    for (const Et of [mt.box, pn]) {
                        Et[0] = Math.min(Et[0], x.box[0]);
                        Et[1] = Math.min(Et[1], x.box[1]);
                        Et[2] = Math.max(Et[2], x.box[2]);
                        Et[3] = Math.max(Et[3], x.box[3]);
                    }
                }
                mt.cx += x.c[0] * x.km2;
                mt.cy += x.c[1] * x.km2;
            }

            for (const x of Object.values(Ne)) {
                x.c = [x.cx / x.km2, x.cy / x.km2];
                x.outline = te[x.uf];
            }

            seuImpostoGeo = {
                W: le,
                H: Nn,
                box: pn,
                munis: ve,
                lines: nn,
                ufs: Ne,
                arcs: xe
            };
            return seuImpostoGeo;
        } catch (e) {
            console.error('Falha ao inicializar Geo SeuImposto:', e);
            return null;
        }
    }

    // Inicializa o Canvas e Listeners do SeuImposto
    function initSeuImpostoCanvasMap() {
        seuImpostoCanvas = document.getElementById('seuimposto-canvas-map');
        if (!seuImpostoCanvas) return;
        seuImpostoCtx = seuImpostoCanvas.getContext('2d');
        if (!seuImpostoCtx) return;

        initSeuImpostoGeo();
        resizeCanvas();

        window.addEventListener('resize', () => {
            if (state.mapMode === 'muni') {
                resizeCanvas();
            }
        });

        // Eventos do Canvas
        seuImpostoCanvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isCanvasDragging = true;
            canvasDragDist = 0;
            canvasDragStartX = e.clientX - canvasPanX;
            canvasDragStartY = e.clientY - canvasPanY;
            seuImpostoCanvas.classList.add('is-panning');
        });

        window.addEventListener('mousemove', (e) => {
            if (isCanvasDragging) {
                const newPanX = e.clientX - canvasDragStartX;
                const newPanY = e.clientY - canvasDragStartY;
                canvasDragDist += Math.abs(newPanX - canvasPanX) + Math.abs(newPanY - canvasPanY);
                canvasPanX = newPanX;
                canvasPanY = newPanY;
                requestCanvasRender();
            } else if (state.mapMode === 'muni') {
                handleCanvasMouseMove(e);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isCanvasDragging) {
                isCanvasDragging = false;
                if (seuImpostoCanvas) seuImpostoCanvas.classList.remove('is-panning');
            }
        });

        seuImpostoCanvas.addEventListener('click', (e) => {
            if (canvasDragDist > 8) return; // Foi arrasto, não clique
            handleCanvasClick(e);
        });

        seuImpostoCanvas.addEventListener('mouseleave', () => {
            if (state.hoveredMuniIdx !== null) {
                state.hoveredMuniIdx = null;
                requestCanvasRender();
                hideMapTooltip();
            }
        });

        // Zoom via roda no Canvas
        seuImpostoCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = seuImpostoCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const delta = e.deltaY < 0 ? 0.35 : -0.35;
            window.zoomMap(delta, mouseX, mouseY);
        }, { passive: false });

        // Touch no Canvas (Pan e Pinch Zoom)
        let touchStartDist = 0;
        let touchStartScale = 1.0;
        let touchStartX = 0;
        let touchStartY = 0;

        seuImpostoCanvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isCanvasDragging = true;
                canvasDragDist = 0;
                touchStartX = e.touches[0].clientX - canvasPanX;
                touchStartY = e.touches[0].clientY - canvasPanY;
            } else if (e.touches.length === 2) {
                isCanvasDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDist = Math.hypot(dx, dy);
                touchStartScale = canvasScale;
            }
        }, { passive: true });

        seuImpostoCanvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isCanvasDragging) {
                const newPanX = e.touches[0].clientX - touchStartX;
                const newPanY = e.touches[0].clientY - touchStartY;
                canvasDragDist += Math.abs(newPanX - canvasPanX) + Math.abs(newPanY - canvasPanY);
                canvasPanX = newPanX;
                canvasPanY = newPanY;
                requestCanvasRender();
            } else if (e.touches.length === 2 && touchStartDist > 0) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const factor = dist / touchStartDist;
                canvasScale = Math.max(0.85, Math.min(10.0, touchStartScale * factor));
                const badge = document.getElementById('zoom-level-badge');
                if (badge) badge.textContent = `${Math.round(canvasScale * 100)}%`;
                requestCanvasRender();
            }
        }, { passive: true });

        seuImpostoCanvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                if (isCanvasDragging && canvasDragDist < 8 && e.changedTouches.length === 1) {
                    const t = e.changedTouches[0];
                    handleCanvasClick({ clientX: t.clientX, clientY: t.clientY });
                }
                isCanvasDragging = false;
            }
        });
    }

    function resizeCanvas() {
        if (!seuImpostoCanvas) return;
        const rect = seuImpostoCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = rect.width || 800;
        const h = rect.height || 650;
        seuImpostoCanvas.width = Math.round(w * dpr);
        seuImpostoCanvas.height = Math.round(h * dpr);
        canvasWidth = w;
        canvasHeight = h;

        if (seuImpostoGeo) {
            baseScale = Math.min((canvasWidth - 32) / seuImpostoGeo.W, (canvasHeight - 32) / seuImpostoGeo.H);
            baseOffsetX = (canvasWidth - seuImpostoGeo.W * baseScale) / 2;
            baseOffsetY = (canvasHeight - seuImpostoGeo.H * baseScale) / 2;
        }
        requestCanvasRender();
    }

    function renderSeuImpostoMap() {
        if (!seuImpostoCtx || !seuImpostoGeo) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const ctx = seuImpostoCtx;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, seuImpostoCanvas.width, seuImpostoCanvas.height);

        // Fundo radial sutil
        const bgGrad = ctx.createRadialGradient(
            seuImpostoCanvas.width / 2, seuImpostoCanvas.height / 2, 40 * dpr,
            seuImpostoCanvas.width / 2, seuImpostoCanvas.height / 2, seuImpostoCanvas.width / 1.3
        );
        bgGrad.addColorStop(0, '#0c1527');
        bgGrad.addColorStop(1, '#050811');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, seuImpostoCanvas.width, seuImpostoCanvas.height);

        // Transformação de Visualização
        ctx.setTransform(
            dpr * canvasScale * baseScale, 0,
            0, dpr * canvasScale * baseScale,
            dpr * (canvasPanX + baseOffsetX * canvasScale),
            dpr * (canvasPanY + baseOffsetY * canvasScale)
        );

        const muniData = state.muniFeedData && state.muniFeedData.br;
        const filter = state.mapFilter;
        const selUf = state.selectedState;
        const munis = seuImpostoGeo.munis;
        const total = munis.length;

        // 1. Renderiza cada um dos 5.570 municípios
        for (let i = 0; i < total; i++) {
            const m = munis[i];
            let leader = (muniData && muniData.l) ? muniData.l[i] : null;
            let margin = (muniData && muniData.m) ? muniData.m[i] : 0;
            let isDimmed = false;

            if (filter === 'bolso' && leader !== 22) isDimmed = true;
            if (filter === 'lula' && leader !== 13) isDimmed = true;
            if (filter === 'tight' && margin >= 50) isDimmed = true;

            if (isDimmed) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            } else if (leader === 22) {
                // Bolsonaro (PL 22 - tons de azul com graduação por margem)
                if (margin >= 300) ctx.fillStyle = '#1d4ed8'; // >30%
                else if (margin >= 150) ctx.fillStyle = '#2563eb'; // 15-30%
                else if (margin >= 60) ctx.fillStyle = '#3b82f6'; // 6-15%
                else ctx.fillStyle = '#60a5fa'; // <6% voto a voto
            } else if (leader === 13) {
                // Lula (PT 13 - tons de vermelho com graduação por margem)
                if (margin >= 300) ctx.fillStyle = '#b91c1c'; // >30%
                else if (margin >= 150) ctx.fillStyle = '#dc2626'; // 15-30%
                else if (margin >= 60) ctx.fillStyle = '#ef4444'; // 6-15%
                else ctx.fillStyle = '#f87171'; // <6% voto a voto
            } else {
                ctx.fillStyle = '#162238'; // Neutro // Aguardando apuração oficial
            }

            ctx.fill(m.path);
        }

        // 2. Linhas de fronteira municipal
        if (canvasScale > 1.35) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 0.5 / (canvasScale * baseScale);
            ctx.stroke(seuImpostoGeo.lines.muni);
        }

        // 3. Linhas de estados (UFs)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.0 / (canvasScale * baseScale);
        ctx.stroke(seuImpostoGeo.lines.uf);

        // 4. Contorno nacional
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.4 / (canvasScale * baseScale);
        ctx.stroke(seuImpostoGeo.lines.edge);

        // 5. Contorno do estado focado
        if (selUf && seuImpostoGeo.ufs[selUf]) {
            ctx.save();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.2 / (canvasScale * baseScale);
            ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
            ctx.shadowBlur = 8 * dpr;
            ctx.stroke(seuImpostoGeo.ufs[selUf].outline);
            ctx.restore();
        }

        // 6. Município sob hover
        if (state.hoveredMuniIdx !== null && munis[state.hoveredMuniIdx]) {
            const hm = munis[state.hoveredMuniIdx];
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5 / (canvasScale * baseScale);
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10 * dpr;
            ctx.stroke(hm.path);
            ctx.restore();
        }

        // 7. Município selecionado
        if (state.selectedMuniIdx !== null && munis[state.selectedMuniIdx]) {
            const sm = munis[state.selectedMuniIdx];
            ctx.save();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3.2 / (canvasScale * baseScale);
            ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
            ctx.shadowBlur = 14 * dpr;
            ctx.stroke(sm.path);
            ctx.restore();
        }
    }

    function getMuniAtScreenCoords(sx, sy) {
        if (!seuImpostoGeo || !seuImpostoCtx) return null;
        const wx = (sx - canvasPanX - baseOffsetX * canvasScale) / (canvasScale * baseScale);
        const wy = (sy - canvasPanY - baseOffsetY * canvasScale) / (canvasScale * baseScale);

        const munis = seuImpostoGeo.munis;
        for (let i = 0; i < munis.length; i++) {
            const m = munis[i];
            const b = m.box;
            if (wx >= b[0] && wy >= b[1] && wx <= b[2] && wy <= b[3]) {
                seuImpostoCtx.setTransform(1, 0, 0, 1, 0, 0);
                if (seuImpostoCtx.isPointInPath(m.path, wx, wy)) {
                    return m;
                }
            }
        }
        return null;
    }

    function handleCanvasMouseMove(e) {
        if (isCanvasDragging) return;
        const rect = seuImpostoCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const muni = getMuniAtScreenCoords(sx, sy);
        if (muni) {
            if (state.hoveredMuniIdx !== muni.i) {
                state.hoveredMuniIdx = muni.i;
                requestCanvasRender();
                showMuniTooltip(e, muni);
            } else {
                moveMapTooltip(e);
            }
        } else {
            if (state.hoveredMuniIdx !== null) {
                state.hoveredMuniIdx = null;
                requestCanvasRender();
                hideMapTooltip();
            }
        }
    }

    function showMuniTooltip(e, muni) {
        const tooltip = document.getElementById('map-tooltip');
        if (!tooltip) return;

        const mData = state.muniFeedData && state.muniFeedData.br;
        const leader = mData ? mData.l[muni.i] : 22;
        const marginPerMil = mData ? mData.m[muni.i] : 200;
        const marginPct = (marginPerMil / 10).toFixed(1);
        const validVotes = mData ? mData.v[muni.i] : 10000;

        const isBolso = leader === 22;
        const leaderName = isBolso ? 'Flávio Bolsonaro' : 'Lula';
        const partyName = isBolso ? 'PL • 22' : 'PT • 13';
        const partyColor = isBolso ? '#3b82f6' : '#ef4444';
        const photo = isBolso ? 'fotos/pres_22.jpeg' : 'fotos/pres_13.jpeg';

        tooltip.innerHTML = `
            <div class="map-tooltip-card">
                <div class="map-tooltip-header">
                    <strong class="map-tooltip-uf">${muni.name} (${muni.uf})</strong>
                    <span class="map-tooltip-status">🏙️ Pop: ${formatNumber(muni.pop || 0)}</span>
                </div>
                <div class="map-tooltip-duel" style="display:flex; align-items:center; gap:10px; margin: 8px 0;">
                    <img src="${photo}" alt="${leaderName}" style="width:38px; height:38px; border-radius:50%; border:2px solid ${partyColor}; object-fit:cover;">
                    <div>
                        <strong style="color: ${partyColor}; font-size:13px; display:block;">${leaderName}</strong>
                        <span style="font-size:11px; color:var(--text-secondary);">${partyName} &bull; Vantagem: <strong>+${marginPct}%</strong></span>
                    </div>
                </div>
                <div class="map-tooltip-stats" style="font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between; border-top:1px solid var(--border-color); padding-top:6px;">
                    <span>Votos válidos: <strong>${formatNumber(validVotes)}</strong></span>
                    <span style="color:#fbbf24; font-weight:700;">Toque para abrir</span>
                </div>
            </div>
        `;
        tooltip.classList.remove('hidden');
        moveMapTooltip(e);
    }

    async function handleCanvasClick(e) {
        if (isCanvasDragging) return;
        const rect = seuImpostoCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const muni = getMuniAtScreenCoords(sx, sy);
        if (muni) {
            state.selectedMuniIdx = muni.i;
            requestCanvasRender();
            audio.beep(880, 0.05);

            showToast(`📍 ${muni.name} (${muni.uf}) selecionada`);

            if (window.selectCityResult) {
                window.selectCityResult(muni.uf, muni.id, muni.name);
            } else {
                window.selectState(muni.uf, true);
            }
        }
    }

    // Controle de Modo de Mapa (5.570 Cidades vs Macro 27 Estados)
    window.setMapMode = function (mode) {
        state.mapMode = mode;
        const btnMuni = document.getElementById('btn-mode-muni');
        const btnMacro = document.getElementById('btn-mode-macro');
        const canvasEl = document.getElementById('seuimposto-canvas-map');
        const svgEl = document.getElementById('brazil-svg');
        const headerTitle = document.getElementById('map-header-title');
        const headerTip = document.getElementById('map-header-tip-text');

        if (mode === 'muni') {
            if (btnMuni) btnMuni.classList.add('active');
            if (btnMacro) btnMacro.classList.remove('active');
            if (canvasEl) canvasEl.classList.remove('hidden');
            if (svgEl) svgEl.classList.add('hidden');
            if (headerTitle) headerTitle.textContent = 'MAPA SEUIMPOSTO • 5.570 CIDADES EM TEMPO REAL';
            if (headerTip) headerTip.textContent = 'Arraste para navegar • Clique na cidade para ver detalhes';
            resizeCanvas();
            showToast('🏙️ Modo Mapa SeuImposto ativado (5.570 cidades)');
        } else {
            if (btnMuni) btnMuni.classList.remove('active');
            if (btnMacro) btnMacro.classList.add('active');
            if (canvasEl) canvasEl.classList.add('hidden');
            if (svgEl) svgEl.classList.remove('hidden');
            if (headerTitle) headerTitle.textContent = 'MAPA MACRO // 27 ESTADOS E DF';
            if (headerTip) headerTip.textContent = 'Toque em qualquer estado para fixar';
            applyMapTransform();
            showToast('🗺️ Modo Visão Macro ativado (27 estados)');
        }
        audio.beep(750, 0.04);
    };

    // Zoom Unificado
    window.zoomMap = function (delta, focusX = null, focusY = null) {
        if (state.mapMode === 'muni') {
            const prevScale = canvasScale;
            canvasScale = Math.max(0.85, Math.min(8.0, Number((canvasScale + delta * 0.7).toFixed(2))));
            if (canvasScale <= 1.05) {
                canvasScale = 1.0;
                canvasPanX = 0;
                canvasPanY = 0;
            } else if (focusX !== null && focusY !== null) {
                const ratio = canvasScale / prevScale;
                canvasPanX = focusX - ratio * (focusX - canvasPanX);
                canvasPanY = focusY - ratio * (focusY - canvasPanY);
            }
            const badge = document.getElementById('zoom-level-badge');
            if (badge) badge.textContent = `${Math.round(canvasScale * 100)}%`;
            requestCanvasRender();
            audio.beep(650 + canvasScale * 70, 0.03);
        } else {
            const prevZoom = mapZoom;
            mapZoom = Math.max(1.0, Math.min(3.8, Number((mapZoom + delta).toFixed(2))));
            if (mapZoom <= 1.05) {
                mapZoom = 1.0;
                mapPanX = 0;
                mapPanY = 0;
            } else if (focusX !== null && focusY !== null) {
                const ratio = mapZoom / prevZoom;
                mapPanX = focusX - ratio * (focusX - mapPanX);
                mapPanY = focusY - ratio * (focusY - mapPanY);
            }
            applyMapTransform();
            audio.beep(650 + mapZoom * 120, 0.03);
        }
    };

    window.resetMapZoom = function () {
        if (state.mapMode === 'muni') {
            canvasScale = 1.0;
            canvasPanX = 0;
            canvasPanY = 0;
            const badge = document.getElementById('zoom-level-badge');
            if (badge) badge.textContent = '100%';
            requestCanvasRender();
        } else {
            mapZoom = 1.0;
            mapPanX = 0;
            mapPanY = 0;
            applyMapTransform();
        }
        audio.beep(600, 0.04);
        showToast('⟲ Zoom do mapa redefinido para 100%');
    };

    function applyMapTransform() {
        const group = document.getElementById('map-viewport-group');
        const badge = document.getElementById('zoom-level-badge');
        const container = document.getElementById('map-svg-container');

        if (badge) badge.textContent = `${Math.round(mapZoom * 100)}%`;

        if (container) {
            container.classList.toggle('can-pan', mapZoom > 1.05);
        }

        if (group) {
            const maxPan = 320 * (mapZoom - 1);
            mapPanX = Math.max(-maxPan, Math.min(maxPan, mapPanX));
            mapPanY = Math.max(-maxPan, Math.min(maxPan, mapPanY));
            group.style.transform = `translate(${mapPanX}px, ${mapPanY}px) scale(${mapZoom})`;
        }
    }

    function setupMapZoomAndPan() {
        const container = document.getElementById('map-svg-container');
        if (!container || container.dataset.zoomReady) return;
        container.dataset.zoomReady = 'true';

        // Zoom por Roda do Mouse na visão macro
        container.addEventListener('wheel', (e) => {
            if (state.mapMode === 'muni') return; // Canvas lida com seu próprio wheel
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;
            const delta = e.deltaY < 0 ? 0.3 : -0.3;
            window.zoomMap(delta, mouseX, mouseY);
        }, { passive: false });

        // Pan por Arrastar com Mouse na visão macro
        container.addEventListener('mousedown', (e) => {
            if (state.mapMode === 'muni' || mapZoom <= 1.05 || e.button !== 0) return;
            isPanning = true;
            panStartX = e.clientX - mapPanX;
            panStartY = e.clientY - mapPanY;
            container.classList.add('is-panning');
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning || state.mapMode === 'muni') return;
            mapPanX = e.clientX - panStartX;
            mapPanY = e.clientY - panStartY;
            applyMapTransform();
        });

        window.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                container.classList.remove('is-panning');
            }
        });
    }

    // --- REAÇÕES AO VIVO // TERMÔMETRO DA GALERA ---
    window.triggerReaction = async function (rid) {
        audio.reactionSound(rid);

        const emojiMap = {
            tenso: '🔥',
            pipoca: '🍿',
            picanha: '🥩',
            capitao: '🏍️',
            virada: '⚡'
        };
        const emoji = emojiMap[rid] || '🔥';

        const btn = document.querySelector(`.reaction-pill-btn.btn-${rid}`);
        spawnFloatingReactionEmoji(btn, emoji);

        // Incrementa localmente
        const countEl = document.getElementById(`count-${rid}`);
        if (countEl) {
            const current = parseInt(countEl.textContent.replace(/\./g, ''), 10) || 0;
            countEl.textContent = formatNumber(current + 1);
        }

        updateThermometerUI();

        // Envia ao servidor
        try {
            await fetch('/api/reactions/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: rid })
            });
        } catch (e) {}
    };

    function spawnFloatingReactionEmoji(btnEl, emoji) {
        const container = document.getElementById('reaction-particles-container') || document.body;
        let startX = window.innerWidth / 2;
        let startY = window.innerHeight * 0.7;

        if (btnEl) {
            const rect = btnEl.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top;
        }

        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'floating-reaction-emoji';
            p.textContent = emoji;

            const driftX = (Math.random() - 0.5) * 180;
            const rot = (Math.random() - 0.5) * 70;
            const delay = i * 45;

            p.style.setProperty('--drift-x', `${driftX}px`);
            p.style.setProperty('--rot', `${rot}deg`);
            p.style.left = `${startX + (Math.random() - 0.5) * 50}px`;
            p.style.top = `${startY + (Math.random() - 0.5) * 20}px`;
            p.style.animationDelay = `${delay}ms`;

            container.appendChild(p);
            setTimeout(() => {
                if (p.parentNode) p.parentNode.removeChild(p);
            }, 2400 + delay);
        }
    }

    async function syncReactions() {
        try {
            const res = await fetch('/api/reactions');
            if (res.ok) {
                const data = await res.json();
                if (data.counts) {
                    Object.entries(data.counts).forEach(([k, v]) => {
                        const el = document.getElementById(`count-${k}`);
                        if (el) el.textContent = formatNumber(v);
                    });
                    const totalEl = document.getElementById('reaction-total-count');
                    if (totalEl) totalEl.textContent = `${formatNumber(data.total)} reações hoje`;
                    updateThermometerUI(data.counts);
                }
            }
        } catch (e) {}
    }

    function updateThermometerUI(counts) {
        const cPicanha = counts ? counts.picanha : parseInt((document.getElementById('count-picanha') || {}).textContent?.replace(/\./g, '') || '2420', 10);
        const cCapitao = counts ? counts.capitao : parseInt((document.getElementById('count-capitao') || {}).textContent?.replace(/\./g, '') || '2490', 10);
        const duelTotal = cPicanha + cCapitao;
        if (duelTotal > 0) {
            const pctBolso = (cCapitao / duelTotal * 100).toFixed(1);
            const pctLula = (cPicanha / duelTotal * 100).toFixed(1);
            const thermoBolso = document.getElementById('thermometer-pl');
            const thermoLula = document.getElementById('thermometer-pt');
            const lblBolso = document.getElementById('thermo-pct-bolso');
            const lblLula = document.getElementById('thermo-pct-lula');

            if (thermoBolso) thermoBolso.style.width = `${pctBolso}%`;
            if (thermoLula) thermoLula.style.width = `${pctLula}%`;
            if (lblBolso) lblBolso.textContent = `${pctBolso}%`;
            if (lblLula) lblLula.textContent = `${pctLula}%`;
        }
    }

    async function loadMuniMapData() {
        try {
            let res = await fetch('/api/tse/municipios-map-data');
            if (!res.ok) res = await fetch('seuimposto_municipios.json');
            if (res.ok) {
                state.muniFeedData = await res.json();
                requestCanvasRender();
            }
        } catch (e) {
            console.warn('Erro ao buscar dados dos municípios:', e);
        }
    }

    // Atualiza Cores Graduadas e Porcentagens nos Selos do Mapa
    function updateMapColors() {
        if (!state.uf_matrix) return;

        Object.entries(state.uf_matrix).forEach(([ufCode, data]) => {
            const pathEl = document.getElementById(`state-path-${ufCode}`);
            const labelRect = document.getElementById(`map-label-rect-${ufCode}`);
            const labelPct = document.getElementById(`map-label-pct-${ufCode}`);
            const labelG = document.getElementById(`state-label-${ufCode}`);

            const bolsoPctNum = parseFloat((data.bolsonaro_pct || '0').replace('%', '').replace(',', '.'));
            const lulaPctNum = parseFloat((data.lula_pct || '0').replace('%', '').replace(',', '.'));
            const deltaPct = Math.abs(bolsoPctNum - lulaPctNum);

            // Verifica filtro ativo
            let isDimmed = false;
            if (state.mapFilter === 'bolso' && data.lider !== '22') isDimmed = true;
            if (state.mapFilter === 'lula' && data.lider !== '13') isDimmed = true;
            if (state.mapFilter === 'tight' && deltaPct >= 5.0) isDimmed = true;

            if (pathEl) {
                pathEl.className.baseVal = 'state-path';
                if (isDimmed) pathEl.classList.add('dimmed');

                if (data.lider === '22') {
                    pathEl.classList.add('pl-win');
                    if (bolsoPctNum >= 60) pathEl.classList.add('pl-bg-deep');
                    else if (bolsoPctNum >= 53) pathEl.classList.add('pl-bg-mid');
                    else pathEl.classList.add('pl-bg-light');
                } else if (data.lider === '13') {
                    pathEl.classList.add('pt-win');
                    if (lulaPctNum >= 60) pathEl.classList.add('pt-bg-deep');
                    else if (lulaPctNum >= 53) pathEl.classList.add('pt-bg-mid');
                    else pathEl.classList.add('pt-bg-light');
                }

                if (state.selectedState === ufCode) {
                    pathEl.classList.add('active');
                }
            }

            // Atualiza Label e Porcentagem
            if (labelRect && labelPct) {
                labelRect.className.baseVal = 'map-label-rect';
                labelPct.className.baseVal = 'map-label-text-pct';

                if (data.lider === '22') {
                    labelRect.classList.add('pl');
                    labelPct.classList.add('pl');
                    labelPct.textContent = data.bolsonaro_pct || '0%';
                } else {
                    labelRect.classList.add('pt');
                    labelPct.classList.add('pt');
                    labelPct.textContent = data.lula_pct || '0%';
                }
            }

            if (labelG) {
                labelG.classList.toggle('active', state.selectedState === ufCode);
                labelG.style.opacity = isDimmed ? '0.2' : '1';
            }
        });
    }

    // Atualiza Placar Geral dos Estados (HUD)
    function updateStatesScoreboard() {
        if (!state.uf_matrix) return;
        let bolsoWins = 0;
        let lulaWins = 0;
        let bolsoVotes = 0;
        let lulaVotes = 0;

        Object.values(state.uf_matrix).forEach(uf => {
            bolsoVotes += (uf.bolsonaro_votos || 0);
            lulaVotes += (uf.lula_votos || 0);
            if (uf.lider === '22') bolsoWins++;
            else if (uf.lider === '13') lulaWins++;
        });

        const setAllText = (id, val) => document.querySelectorAll('#' + id).forEach(el => el.textContent = val);
        const setAllWidth = (id, w) => document.querySelectorAll('#' + id).forEach(el => el.style.width = w);

        setAllText('states-count-bolso', bolsoWins);
        setAllText('states-count-lula', lulaWins);

        const totalVotes = bolsoVotes + lulaVotes;
        const pctBolsoState = totalVotes > 0 ? `${(bolsoVotes / totalVotes * 100).toFixed(1)}%` : '0,0%';
        const pctLulaState = totalVotes > 0 ? `${(lulaVotes / totalVotes * 100).toFixed(1)}%` : '0,0%';
        setAllText('states-votes-bolso', `${formatNumber(bolsoVotes)} votos (${pctBolsoState})`);
        setAllText('states-votes-lula', `${formatNumber(lulaVotes)} votos (${pctLulaState})`);

        const totalWins = bolsoWins + lulaWins;
        if (totalWins > 0) {
            const pctPl = (bolsoWins / totalWins * 100).toFixed(1);
            const pctPt = (lulaWins / totalWins * 100).toFixed(1);
            setAllWidth('states-bar-pl', `${pctPl}%`);
            setAllWidth('states-bar-pt', `${pctPt}%`);
            let diffText = `Empate em estados: ${bolsoWins} a ${lulaWins}`;
            if (bolsoWins > lulaWins) {
                diffText = `PL lidera por vantagem de ${bolsoWins - lulaWins} estados`;
            } else if (lulaWins > bolsoWins) {
                diffText = `PT lidera por vantagem de ${lulaWins - bolsoWins} estados`;
            }
            setAllText('states-diff-sub', diffText);
        } else {
            setAllWidth('states-bar-pl', '50%');
            setAllWidth('states-bar-pt', '50%');
            setAllText('states-diff-sub', 'Aguardando abertura das primeiras seções');
        }
    }

    // --- COLÉGIOS ELEITORAIS PRINCIPAIS (ACESSO RÁPIDO) ---
    const KEY_ELECTORAL_COLLEGES = ['TODOS', 'SP', 'MG', 'RJ', 'BA', 'RS', 'PR', 'PE', 'CE', 'SC', 'GO', 'DF', 'AL', 'PA', 'MA'];

    function renderQuickCollegePills() {
        const container = document.getElementById('quick-colleges-scroll');
        if (!container) return;

        const currentUf = state.selectedState;

        container.innerHTML = KEY_ELECTORAL_COLLEGES.map(uf => {
            if (uf === 'TODOS') {
                const isActive = !currentUf;
                return `
                    <button class="college-pill ${isActive ? 'active' : ''}" data-uf="TODOS" onclick="window.selectQuickCollege('TODOS')">
                        <span>🇧🇷</span> <span>Todos (27)</span>
                    </button>
                `;
            }

            const ufData = state.uf_matrix[uf];
            const isActive = currentUf === uf;
            if (!ufData) {
                return `
                    <button class="college-pill ${isActive ? 'active' : ''}" data-uf="${uf}" onclick="window.selectQuickCollege('${uf}')">
                        <span>${uf}</span>
                    </button>
                `;
            }

            const isPl = ufData.lider === '22' || (ufData.bolsonaro_votos >= ufData.lula_votos);
            const leadPct = isPl ? ufData.bolsonaro_pct : ufData.lula_pct;
            const badgeClass = isPl ? 'pl' : 'pt';
            const icon = isPl ? '🔵' : '🔴';

            return `
                <button class="college-pill ${isActive ? 'active' : ''}" data-uf="${uf}" onclick="window.selectQuickCollege('${uf}')" title="${ufData.nome} (${uf}) - Liderança: ${leadPct}">
                    <strong>${uf}</strong>
                    <span class="pill-lead-badge ${badgeClass}">${icon} ${leadPct || ''}</span>
                </button>
            `;
        }).join('');
    }

    window.selectQuickCollege = function(uf) {
        if (uf === 'TODOS') {
            window.setMapFilter('all');
            window.resetMapZoom();
            return;
        }

        window.selectState(uf, true);

        // Se estiver em telas menores, rola suavemente até o cartão do estado e cidades
        if (window.innerWidth <= 900) {
            setTimeout(() => {
                const target = document.getElementById('selected-state-card');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

    function showMapTooltip(e, ufCode) {
        const tooltip = document.getElementById('map-tooltip');
        const ufData = state.uf_matrix[ufCode];
        if (!tooltip || !ufData) return;

        const liderNome = ufData.lider_nome || (ufData.lider === '22' ? 'Flávio Bolsonaro' : 'Lula');
        const liderCor = ufData.lider === '22' ? 'var(--pl-blue)' : 'var(--pt-red)';

        tooltip.innerHTML = `
            <div class="map-tooltip-title">${ufData.nome || ufCode} (${ufCode})</div>
            <div class="map-tooltip-row">
                <span class="pl-color">PL 22 (Bolsonaro):</span>
                <strong>${ufData.bolsonaro_pct || '0%'}</strong>
            </div>
            <div class="map-tooltip-row">
                <span class="pt-color">PT 13 (Lula):</span>
                <strong>${ufData.lula_pct || '0%'}</strong>
            </div>
            <div class="map-tooltip-row" style="margin-top: 5px; color: ${liderCor}; font-weight: 800; font-size: 11px;">
                🏆 Vencedor: ${liderNome}
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                Diferença: ${formatNumber(ufData.delta_votos || 0)} votos
            </div>
        `;
        tooltip.classList.remove('hidden');
        moveMapTooltip(e);
    }

    function moveMapTooltip(e) {
        const tooltip = document.getElementById('map-tooltip');
        const container = document.getElementById('map-svg-container');
        if (!tooltip || !container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clampedX = Math.max(90, Math.min(rect.width - 90, x));
        const clampedY = Math.max(40, y);

        tooltip.style.left = `${clampedX}px`;
        tooltip.style.top = `${clampedY}px`;
    }

    function hideMapTooltip() {
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) tooltip.classList.add('hidden');
    }

    // Seleção de estado e atualização da interface
    window.selectState = async function (ufCode, isUserClick = true) {
        state.selectedState = ufCode;

        if (isUserClick) {
            pauseAutoTourUserAction();
        }

        // Dropdown
        const select = document.getElementById('select-map-uf');
        if (select) select.value = ufCode;

        // Atualiza destaque no SVG e traz para a frente para evitar bordas cortadas
        document.querySelectorAll('.state-path').forEach(p => {
            const isTarget = p.getAttribute('data-uf') === ufCode;
            p.classList.toggle('active', isTarget);
            if (isTarget && p.parentElement) {
                p.parentElement.appendChild(p);
            }
        });

        document.querySelectorAll('.map-state-label').forEach(lbl => {
            const isTarget = lbl.getAttribute('data-uf') === ufCode;
            lbl.classList.toggle('active', isTarget);
            if (isTarget && lbl.parentElement) {
                lbl.parentElement.appendChild(lbl);
            }
        });

        // Atualiza Card de Destaque
        updateSelectedStateCard(ufCode);

        // Atualiza pílula ativa nos colégios eleitorais
        document.querySelectorAll('.college-pill').forEach(btn => {
            const isMatch = btn.getAttribute('data-uf') === ufCode;
            btn.classList.toggle('active', isMatch);
        });

        // Atualiza label do dock flutuante mobile
        const dockCitiesLbl = document.getElementById('mobile-dock-cities-lbl');
        if (dockCitiesLbl) {
            dockCitiesLbl.textContent = `Ver Cidades (${ufCode})`;
        }

        // Renderiza contorno do estado no Canvas SeuImposto
        requestCanvasRender();

        // Se mudou de estado, carrega municípios
        if (state.loadedStateUf !== ufCode) {
            state.loadedStateUf = ufCode;
            await loadStateCities(ufCode);
        }
    };

    function updateSelectedStateCard(ufCode) {
        const stateCard = document.getElementById('selected-state-card');
        if (!stateCard) return;

        const ufData = state.uf_matrix[ufCode] || { nome: ufCode, uf: ufCode, pct_secoes: '100%' };
        const lider = ufData.lider || (ufData.bolsonaro_votos >= ufData.lula_votos ? '22' : '13');
        const isPl = lider === '22';
        const liderNome = ufData.lider_nome || (isPl ? 'Flávio Bolsonaro' : 'Lula');

        stateCard.className = `selected-state-card ${isPl ? 'pl-win-card' : 'pt-win-card'}`;

        const totalPair = (ufData.bolsonaro_votos || 0) + (ufData.lula_votos || 0);
        const pctPl = totalPair > 0 ? (ufData.bolsonaro_votos / totalPair * 100).toFixed(1) : '50.0';
        const pctPt = totalPair > 0 ? (ufData.lula_votos / totalPair * 100).toFixed(1) : '50.0';
        const delta = Math.abs((ufData.bolsonaro_votos || 0) - (ufData.lula_votos || 0));

        stateCard.innerHTML = `
            <div class="state-card-top-row">
                <div class="state-card-title-group">
                    <span class="state-card-uf-pill">${ufCode}</span>
                    <div>
                        <h3>${ufData.nome || ufCode}</h3>
                        <span style="font-size: 11px; color: var(--accent-green); font-family: var(--font-mono); font-weight: 700;">
                            ${ufData.pct_secoes || '100,00%'} APURADO OFICIAL
                        </span>
                    </div>
                </div>
                <span class="state-card-winner-tag ${isPl ? 'pl' : 'pt'}">
                    🏆 ${liderNome.toUpperCase()} VENCEU
                </span>
            </div>

            <!-- DUELO VOTO A VOTO -->
            <div class="state-score-duel">
                <div class="state-score-box pl ${isPl ? 'leading' : ''}">
                    <img src="fotos/pres_22.jpeg" alt="Bolsonaro" class="state-score-avatar pl-border">
                    <div class="state-score-info">
                        <span class="state-score-cand pl-color">FLÁVIO BOLSONARO (22)</span>
                        <strong class="state-score-pct pl-color">${ufData.bolsonaro_pct || '0%'}</strong>
                        <span class="state-score-votes">${formatNumber(ufData.bolsonaro_votos || 0)} votos</span>
                    </div>
                </div>
                <div class="state-score-box pt ${!isPl ? 'leading' : ''}">
                    <img src="fotos/pres_13.jpeg" alt="Lula" class="state-score-avatar pt-border">
                    <div class="state-score-info">
                        <span class="state-score-cand pt-color">LULA (13)</span>
                        <strong class="state-score-pct pt-color">${ufData.lula_pct || '0%'}</strong>
                        <span class="state-score-votes">${formatNumber(ufData.lula_votos || 0)} votos</span>
                    </div>
                </div>
            </div>

            <!-- BARRA PROPORCIONAL DO ESTADO -->
            <div class="state-progress-bar-wrap">
                <div class="state-progress-track">
                    <div class="state-progress-pl" style="width: ${pctPl}%;"></div>
                    <div class="state-progress-pt" style="width: ${pctPt}%;"></div>
                </div>
                <div class="state-delta-banner">
                    <span>Vantagem: <strong style="color: ${isPl ? 'var(--pl-blue)' : 'var(--pt-red)'};">+${formatNumber(delta)} votos</strong></span>
                    <span>Total apurado no estado: <strong>${formatNumber(ufData.votos_validos || totalPair)} válidos</strong></span>
                </div>
            </div>
        `;
    }

    let currentCityLimit = 8;
    let currentFilterTerm = '';
    let activeCityRequestId = 0;

    // Carrega municípios do estado e busca os votos das principais cidades
    async function loadStateCities(ufCode) {
        const thisRequestId = ++activeCityRequestId;
        const loadingTag = document.getElementById('cities-loading-tag');
        const countLabel = document.getElementById('cities-count-label');
        currentCityLimit = 8;
        currentFilterTerm = '';
        const searchInput = document.getElementById('cities-filter-input');
        if (searchInput) searchInput.value = '';

        if (loadingTag) loadingTag.classList.remove('hidden');

        try {
            const res = await fetch(`/api/tse/municipios?uf=${ufCode}`);
            if (thisRequestId !== activeCityRequestId) return;
            if (res.ok) {
                const data = await res.json();
                if (thisRequestId !== activeCityRequestId) return;
                state.stateCitiesList = data.municipios || [];
                // Garante capital no topo, depois alfabético
                state.stateCitiesList.sort((a, b) => {
                    if (a.c === 's' && b.c !== 's') return -1;
                    if (b.c === 's' && a.c !== 's') return 1;
                    return a.nm.localeCompare(b.nm);
                });

                if (countLabel) countLabel.textContent = `Municípios (${state.stateCitiesList.length}):`;

                const priorityCities = state.stateCitiesList.slice(0, currentCityLimit);
                await fetchAndRenderCities(ufCode, priorityCities, state.stateCitiesList.length > currentCityLimit, thisRequestId);
            }
        } catch (e) {
            console.warn('Erro ao carregar municípios:', e);
        } finally {
            if (thisRequestId === activeCityRequestId && loadingTag) {
                loadingTag.classList.add('hidden');
            }
        }
    }

    async function fetchAndRenderCities(ufCode, cities, hasMore = false, requestId = null) {
        if (requestId && requestId !== activeCityRequestId) return;
        const citiesList = document.getElementById('cities-list');
        if (!citiesList) return;

        // Dispara requisições em paralelo para máxima velocidade
        await Promise.all(cities.map(async (city) => {
            const cacheKey = `${ufCode}_${city.cd}`;
            if (!state.cityVotesMap[cacheKey]) {
                try {
                    const res = await fetch(`/api/tse/municipio-votos?uf=${ufCode}&cd=${city.cd}&nm=${encodeURIComponent(city.nm)}`);
                    if (res.ok) {
                        state.cityVotesMap[cacheKey] = await res.json();
                    }
                } catch (e) {}
            }
        }));

        if (requestId && requestId !== activeCityRequestId) return;

        citiesList.innerHTML = '';

        for (const city of cities) {
            const cacheKey = `${ufCode}_${city.cd}`;
            const voteData = state.cityVotesMap[cacheKey];

            if (voteData && voteData.ok) {
                renderCityCard(voteData, city.c === 's');
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'city-card';
                placeholder.innerHTML = `
                    <div class="city-card-top">
                        <strong class="city-card-name">${city.nm}</strong>
                        <button class="action-btn" style="height: 26px; font-size: 11px;" onclick="window.fetchSingleCity('${ufCode}', '${city.cd}', '${city.nm}', this)">Carregar Votos</button>
                    </div>
                `;
                citiesList.appendChild(placeholder);
            }
        }

        if (hasMore) {
            const moreWrap = document.createElement('div');
            moreWrap.style.cssText = 'text-align: center; margin-top: 10px; margin-bottom: 8px;';
            moreWrap.innerHTML = `
                <button class="action-btn" style="width: 100%; padding: 8px; font-size: 12px; font-weight: 700;" onclick="window.loadMoreCities()">
                    ➕ Carregar mais cidades de ${ufCode}...
                </button>
            `;
            citiesList.appendChild(moreWrap);
        }
    }

    window.loadMoreCities = async function () {
        currentCityLimit += 10;
        let list = state.stateCitiesList || [];
        if (currentFilterTerm) {
            list = list.filter(c => c.nm.toLowerCase().includes(currentFilterTerm));
        }
        const subset = list.slice(0, currentCityLimit);
        await fetchAndRenderCities(state.selectedState, subset, list.length > currentCityLimit);
    };

    window.filterCities = async function (query) {
        currentFilterTerm = (query || '').trim().toLowerCase();
        if (!state.stateCitiesList || state.stateCitiesList.length === 0) return;

        let filtered = state.stateCitiesList;
        if (currentFilterTerm.length > 0) {
            filtered = state.stateCitiesList.filter(c => c.nm.toLowerCase().includes(currentFilterTerm));
        }

        currentCityLimit = 8;
        const subset = filtered.slice(0, currentCityLimit);
        await fetchAndRenderCities(state.selectedState, subset, filtered.length > currentCityLimit);
    };

    function renderCityCard(data, isCapital) {
        const citiesList = document.getElementById('cities-list');
        if (!citiesList) return;

        const isFocused = state.focusedCityCd && String(data.cd || data.codigo_tse) === String(state.focusedCityCd);
        const card = document.createElement('div');
        card.className = `city-card ${isFocused ? 'searched-highlight' : ''}`;

        const lider = data.lider;
        const winnerBadge = lider === '22'
            ? '<span class="city-winner-badge pl">BOLSONARO VENCEU</span>'
            : '<span class="city-winner-badge pt">LULA VENCEU</span>';

        const totalPair = (data.bolsonaro_votos || 0) + (data.lula_votos || 0);
        const pctPl = totalPair > 0 ? (data.bolsonaro_votos / totalPair * 100).toFixed(0) : '50';
        const pctPt = totalPair > 0 ? (data.lula_votos / totalPair * 100).toFixed(0) : '50';

        card.innerHTML = `
            <div class="city-card-top">
                <div class="city-card-name-wrap">
                    <strong class="city-card-name">${data.nome}</strong>
                    ${isCapital ? '<span class="city-capital-badge">CAPITAL</span>' : ''}
                    ${isFocused ? '<span class="city-searched-badge">🎯 CIDADE BUSCADA</span>' : ''}
                </div>
                ${winnerBadge}
            </div>
            <div class="city-bar-track">
                <div class="city-bar-pl" style="width: ${pctPl}%;"></div>
                <div class="city-bar-pt" style="width: ${pctPt}%;"></div>
            </div>
            <div class="city-card-bottom">
                <span class="pl-color">PL 22: ${data.bolsonaro_pct} (${formatNumber(data.bolsonaro_votos)})</span>
                <span class="pt-color">PT 13: ${data.lula_pct} (${formatNumber(data.lula_votos)})</span>
            </div>
        `;

        citiesList.appendChild(card);
    }

    window.fetchSingleCity = async function (uf, cd, nm, btn) {
        if (btn) btn.textContent = 'Carregando...';
        try {
            const res = await fetch(`/api/tse/municipio-votos?uf=${uf}&cd=${cd}&nm=${encodeURIComponent(nm)}`);
            if (res.ok) {
                const data = await res.json();
                state.cityVotesMap[`${uf}_${cd}`] = data;
                if (btn && btn.parentElement && btn.parentElement.parentElement) {
                    btn.parentElement.parentElement.remove();
                }
                renderCityCard(data, false);
                audio.beep(850, 0.04);
            }
        } catch (e) {}
    };

    window.filterCities = async function (query) {
        const q = (query || '').trim().toLowerCase();
        if (!state.stateCitiesList || state.stateCitiesList.length === 0) return;

        let filtered = state.stateCitiesList;
        if (q.length > 0) {
            filtered = state.stateCitiesList.filter(c => c.nm.toLowerCase().includes(q));
        }

        const subset = filtered.slice(0, 10);
        await fetchAndRenderCities(state.selectedState, subset);
    };

    function renderBottomUfCards() {
        const grid = document.getElementById('uf-cards-grid');
        if (!grid || !state.uf_matrix) return;

        grid.innerHTML = '';
        const ufs = Object.values(state.uf_matrix);

        ufs.forEach(uf => {
            const card = document.createElement('div');
            card.className = 'uf-card';
            card.onclick = () => {
                window.selectState(uf.uf);
                window.scrollTo({ top: 380, behavior: 'smooth' });
            };

            const totalBolsoLula = (uf.bolsonaro_votos || 0) + (uf.lula_votos || 0);
            const pctPl = totalBolsoLula > 0 ? (uf.bolsonaro_votos / totalBolsoLula * 100).toFixed(0) : '50';
            const pctPt = totalBolsoLula > 0 ? (uf.lula_votos / totalBolsoLula * 100).toFixed(0) : '50';

            card.innerHTML = `
                <div class="uf-card-top">
                    <span class="uf-card-sigla">${uf.uf} &bull; ${uf.nome || uf.uf}</span>
                    <span class="uf-card-pct-secoes">${uf.pct_secoes || '100%'}</span>
                </div>
                <div class="uf-card-leader">
                    Líder: <strong>${uf.lider_nome || (uf.lider === '22' ? 'Bolsonaro' : 'Lula')}</strong>
                </div>
                <div class="uf-bar-pl" style="width: ${pctPl}%;"></div>
                <div class="uf-bar-pt" style="width: ${pctPt}%;"></div>
                <div class="uf-card-bottom">
                    <span class="pl-color">PL: ${uf.bolsonaro_pct || '0%'}</span>
                    <span class="pt-color">PT: ${uf.lula_pct || '0%'}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Modal de detalhes da UF
    window.openUfModal = function (ufCode) {
        const uf = state.uf_matrix[ufCode];
        if (!uf) return;

        const modal = document.getElementById('uf-modal');
        const title = document.getElementById('uf-modal-title');
        const sub = document.getElementById('uf-modal-sub');
        const body = document.getElementById('uf-modal-body');

        if (title) title.textContent = `${uf.nome || uf.uf} (${uf.uf})`;
        if (sub) sub.textContent = `Apuração das urnas &bull; ${uf.pct_secoes || '100%'} das seções`;

        let top3Html = '';
        if (Array.isArray(uf.top3)) {
            top3Html = uf.top3.map((c, i) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 800; font-family: var(--font-mono); color: var(--text-muted);">${i + 1}º</span>
                        <strong style="color: #ffffff; font-size: 13px;">${c.nome}</strong>
                        <span style="font-size: 11px; color: var(--text-secondary);">${c.partido}</span>
                    </div>
                    <div style="text-align: right; font-family: var(--font-mono);">
                        <strong style="color: var(--accent-cyan); font-size: 13px;">${c.pct_str}</strong>
                        <div style="font-size: 11px; color: var(--text-muted);">${formatNumber(c.votos)}</div>
                    </div>
                </div>
            `).join('');
        }

        if (body) {
            body.innerHTML = `
                <div style="margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                        <span style="font-size: 10px; color: var(--text-muted);">SEÇÕES APURADAS</span>
                        <div style="font-size: 15px; font-weight: 800; color: #ffffff; font-family: var(--font-mono);">${formatNumber(uf.secoes_apuradas)} de ${formatNumber(uf.secoes_total)}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                        <span style="font-size: 10px; color: var(--text-muted);">VOTOS VÁLIDOS</span>
                        <div style="font-size: 15px; font-weight: 800; color: #ffffff; font-family: var(--font-mono);">${formatNumber(uf.votos_validos)}</div>
                    </div>
                </div>

                <h4 style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">Mais Votados no Estado:</h4>
                ${top3Html}
            `;
        }

        if (modal) modal.classList.remove('hidden');
        audio.beep(800, 0.05);
    };

    window.closeUfModal = function (e) {
        if (!e || e.target.id === 'uf-modal' || e.target.classList.contains('modal-close')) {
            const modal = document.getElementById('uf-modal');
            if (modal) modal.classList.add('hidden');
        }
    };

    // --- BARRA DE PESQUISA INTELIGENTE (OMNI SEARCH) ---
    let searchDebounceTimer = null;

    function setupSearch() {
        const inp = document.getElementById('omni-search');
        const clearBtn = document.getElementById('search-clear');
        const dropdown = document.getElementById('search-results-dropdown');
        if (!inp || !dropdown) return;

        inp.addEventListener('input', () => {
            const rawQ = inp.value;
            const q = rawQ.trim().toLowerCase();
            if (clearBtn) clearBtn.classList.toggle('hidden', q.length === 0);

            if (q.length < 2) {
                dropdown.classList.add('hidden');
                dropdown.innerHTML = '';
                return;
            }

            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(async () => {
                await executeOmniSearch(q, dropdown);
            }, 180);
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!inp.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    async function executeOmniSearch(q, dropdown) {
        const candidateResults = [];
        const stateResults = [];
        let cityResults = [];

        // 1. Busca nos presidenciáveis
        if (state.pres && state.pres.candidatos) {
            state.pres.candidatos.forEach(c => {
                const nameMatch = c.nome.toLowerCase().includes(q) || (c.nome_completo && c.nome_completo.toLowerCase().includes(q));
                const numMatch = c.numero.includes(q);
                const partyMatch = (c.partido || '').toLowerCase().includes(q);
                if (nameMatch || numMatch || partyMatch) {
                    candidateResults.push({ ...c, cargo: 'Presidente', view: 'view-presidente' });
                }
            });
        }

        // 2. Busca nos 27 Estados (UF)
        if (state.uf_matrix) {
            Object.values(state.uf_matrix).forEach(u => {
                const ufMatch = u.uf.toLowerCase() === q || u.uf.toLowerCase().startsWith(q);
                const nameMatch = (u.nome || '').toLowerCase().includes(q);
                if (ufMatch || nameMatch) {
                    stateResults.push(u);
                }
            });
        }

        // 3. Busca nas Cidades via API instantânea do TSE
        try {
            const res = await fetch(`/api/tse/busca-cidades?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                cityResults = data.resultados || [];
            }
        } catch (e) {
            console.warn('Erro ao buscar cidades:', e);
        }

        if (candidateResults.length === 0 && stateResults.length === 0 && cityResults.length === 0) {
            dropdown.innerHTML = `
                <div style="padding: 16px; font-size: 13px; color: var(--text-muted); text-align: center;">
                    Nenhum candidato, estado ou cidade encontrado para "<strong>${q}</strong>"
                </div>
            `;
            dropdown.classList.remove('hidden');
            return;
        }

        let html = '';

        // Seção: Candidatos
        if (candidateResults.length > 0) {
            html += `<div class="search-group-header">🗳️ CANDIDATOS A PRESIDENTE</div>`;
            html += candidateResults.slice(0, 4).map(c => `
                <div class="search-result-item" onclick="window.selectSearchResult('${c.view}')">
                    <div class="search-cand-left">
                        <img src="${c.foto || 'fotos/pres_22.jpeg'}" alt="${c.nome}" class="search-avatar" onerror="this.src='fotos/pres_22.jpeg'">
                        <div>
                            <div class="search-cand-name">
                                ${c.nome}
                                <span class="search-type-badge candidato">CANDIDATO</span>
                            </div>
                            <div class="search-cand-meta">${c.partido} &bull; Nº ${c.numero} &bull; Presidência da República</div>
                        </div>
                    </div>
                    <div class="search-cand-score">
                        <div class="search-cand-pct">${c.pct_str || formatPct(c.pct)}</div>
                        <div class="search-cand-votes">${formatNumber(c.votos)} votos</div>
                    </div>
                </div>
            `).join('');
        }

        // Seção: Estados
        if (stateResults.length > 0) {
            html += `<div class="search-group-header">🗺️ ESTADOS BRASILEIROS</div>`;
            html += stateResults.slice(0, 4).map(u => {
                const isPl = u.lider === '22' || (u.bolsonaro_votos >= u.lula_votos);
                const leadName = isPl ? 'Flávio Bolsonaro' : 'Lula';
                const leadPct = isPl ? u.bolsonaro_pct : u.lula_pct;
                const partyColor = isPl ? 'var(--pl-blue)' : 'var(--pt-red)';
                return `
                    <div class="search-result-item" onclick="window.selectStateResult('${u.uf}')">
                        <div class="search-cand-left">
                            <div style="width: 36px; height: 36px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-weight: 900; font-family: var(--font-title); font-size: 14px; border: 1px solid var(--border-color); color: #fbbf24;">
                                ${u.uf}
                            </div>
                            <div>
                                <div class="search-cand-name">
                                    ${u.nome || u.uf} (${u.uf})
                                    <span class="search-type-badge estado">ESTADO</span>
                                </div>
                                <div class="search-cand-meta">Liderança: <strong style="color: ${partyColor}">${leadName} (${leadPct})</strong></div>
                            </div>
                        </div>
                        <div class="search-cand-score">
                            <span class="action-btn" style="height: 24px; font-size: 11px; padding: 2px 8px;">Ver Mapa ➔</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Seção: Cidades
        if (cityResults.length > 0) {
            html += `<div class="search-group-header">🏙️ CIDADES & MUNICÍPIOS (EXPLORADOR DIRETO)</div>`;
            html += cityResults.slice(0, 8).map(c => `
                <div class="search-result-item" onclick="window.selectCityResult('${c.uf}', '${c.cd}', '${c.nm.replace(/'/g, "\\'")}')">
                    <div class="search-cand-left">
                        <div style="font-size: 20px;">📍</div>
                        <div>
                            <div class="search-cand-name">
                                ${c.nm}
                                <span class="search-type-badge cidade">${c.uf}</span>
                                ${c.is_capital ? '<span class="city-capital-badge" style="font-size: 8px; padding: 1px 4px;">CAPITAL</span>' : ''}
                            </div>
                            <div class="search-cand-meta">Toque para ver a apuração voto a voto de ${c.nm} (${c.uf})</div>
                        </div>
                    </div>
                    <div class="search-cand-score">
                        <span class="action-btn" style="height: 24px; font-size: 11px; padding: 2px 8px;">Ver Votos ➔</span>
                    </div>
                </div>
            `).join('');
        }

        dropdown.innerHTML = html;
        dropdown.classList.remove('hidden');
    }

    window.clearSearch = function () {
        const inp = document.getElementById('omni-search');
        const clearBtn = document.getElementById('search-clear');
        const dropdown = document.getElementById('search-results-dropdown');
        if (inp) inp.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        if (dropdown) dropdown.classList.add('hidden');
    };

    window.selectSearchResult = function (viewId) {
        window.clearSearch();
        window.switchTab(viewId);
    };

    window.selectStateResult = function (uf) {
        window.clearSearch();
        window.switchTab('view-estados');
        window.selectState(uf, true);
        if (window.innerWidth <= 900) {
            setTimeout(() => {
                const target = document.getElementById('selected-state-card');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

    window.selectCityResult = async function (uf, cd, nm) {
        window.clearSearch();
        window.switchTab('view-estados');
        state.focusedCityCd = cd;
        await window.selectState(uf, true);

        // Previne sobrescrita caso a cidade não esteja carregada
        const cacheKey = `${uf}_${cd}`;
        if (!state.cityVotesMap[cacheKey]) {
            try {
                const res = await fetch(`/api/tse/municipio-votos?uf=${uf}&cd=${cd}&nm=${encodeURIComponent(nm)}`);
                if (res.ok) {
                    state.cityVotesMap[cacheKey] = await res.json();
                }
            } catch (e) {}
        }

        // Move a cidade para o topo da lista se ela existir
        if (state.stateCitiesList && state.stateCitiesList.length > 0) {
            const foundIdx = state.stateCitiesList.findIndex(c => String(c.cd) === String(cd));
            if (foundIdx > 0) {
                const [target] = state.stateCitiesList.splice(foundIdx, 1);
                state.stateCitiesList.unshift(target);
            } else if (foundIdx === -1) {
                state.stateCitiesList.unshift({ cd, nm, c: 'n' });
            }
        }

        const priorityCities = (state.stateCitiesList || []).slice(0, Math.max(8, currentCityLimit));
        await fetchAndRenderCities(uf, priorityCities, (state.stateCitiesList || []).length > currentCityLimit);

        setTimeout(() => {
            const highlighted = document.querySelector('.city-card.searched-highlight') || document.getElementById('selected-state-card');
            if (highlighted) {
                highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    };

    // --- SISTEMA DE PRESENÇA E CHAT AO VIVO ---
    function setupChat() {
        // Gera ou recupera Client ID
        state.clientId = localStorage.getItem('tse_chat_client_id');
        if (!state.clientId) {
            state.clientId = 'user_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('tse_chat_client_id', state.clientId);
        }

        // Recupera apelido e crachá
        const savedName = localStorage.getItem('tse_chat_user_name');
        state.userName = savedName || `Eleitor_${Math.floor(1000 + Math.random() * 9000)}`;

        const savedBadge = localStorage.getItem('tse_chat_badge');
        if (savedBadge) state.userBadge = savedBadge;

        const nameInput = document.getElementById('chat-username-input');
        const badgeSelect = document.getElementById('chat-badge-select');

        if (nameInput) {
            nameInput.value = state.userName;
            nameInput.addEventListener('change', () => {
                const val = nameInput.value.trim().slice(0, 18);
                if (val) {
                    state.userName = val;
                    localStorage.setItem('tse_chat_user_name', val);
                    sendHeartbeat();
                }
            });
        }

        if (badgeSelect) {
            badgeSelect.value = state.userBadge;
            badgeSelect.addEventListener('change', () => {
                state.userBadge = badgeSelect.value;
                localStorage.setItem('tse_chat_badge', state.userBadge);
                sendHeartbeat();
            });
        }

        // Heartbeat inicial e periódico (a cada 4s)
        sendHeartbeat();
        setInterval(sendHeartbeat, 4000);

        // Polling de mensagens a cada 1.5s
        fetchChatMessages();
        setInterval(fetchChatMessages, 1500);
    }

    async function sendHeartbeat() {
        try {
            const res = await fetch('/api/presence/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: state.clientId,
                    userName: state.userName,
                    team: state.userBadge
                })
            });
            if (res.ok) {
                const data = await res.json();
                updatePresenceUI(data.online);
            }
        } catch (e) {}
    }

    function updatePresenceUI(count) {
        const safeCount = Math.max(1, parseInt(count) || 1);
        const elHeader = document.getElementById('presence-online-val');
        if (elHeader) elHeader.textContent = `${safeCount} online`;

        const elChatSub = document.getElementById('chat-online-count');
        if (elChatSub) elChatSub.textContent = `${safeCount} ${safeCount === 1 ? 'eleitor online' : 'eleitores online'}`;
    }

    async function fetchChatMessages() {
        try {
            const res = await fetch(`/api/chat/messages?since=${state.lastChatTime}&clientId=${encodeURIComponent(state.clientId)}`);
            if (!res.ok) return;

            const data = await res.json();
            if (data.online) updatePresenceUI(data.online);

            if (Array.isArray(data.messages) && data.messages.length > 0) {
                let hasNewForeign = false;
                data.messages.forEach(msg => {
                    if (!state.seenChatIds.has(msg.id)) {
                        state.seenChatIds.add(msg.id);
                        state.lastChatTime = Math.max(state.lastChatTime, msg.time_ms || msg.time || 0);

                        const isMe = msg.clientId === state.clientId || msg.is_user === true;
                        renderChatMessage(msg, isMe);

                        if (!isMe) hasNewForeign = true;
                    }
                });

                if (hasNewForeign) {
                    if (!state.isChatOpen) {
                        state.unreadChatCount++;
                        updateUnreadBadge();
                    }
                    audio.chatPing();
                }
            }
        } catch (e) {}
    }

    function renderChatMessage(msg, isMe) {
        const feed = document.getElementById('chat-feed');
        if (!feed) return;

        const row = document.createElement('div');
        row.className = `chat-msg ${isMe ? 'is-me' : ''}`;

        const d = new Date(msg.time_ms || msg.time || Date.now());
        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const safeName = (msg.userName || msg.name || 'Eleitor').replace(/</g, '&lt;');
        const safeBadge = (msg.team || msg.badge || '⚖️ Neutro').replace(/</g, '&lt;');
        const safeText = (msg.text || '').replace(/</g, '&lt;');

        row.innerHTML = `
            <div class="chat-msg-header">
                <div class="chat-msg-author">
                    <span class="chat-badge">${safeBadge}</span>
                    ${isMe ? '<span class="badge-me">VOCÊ</span>' : ''}
                    <span>${safeName}</span>
                </div>
                <span class="chat-msg-time">${timeStr}</span>
            </div>
            <div class="chat-msg-body">${safeText}</div>
        `;

        feed.appendChild(row);
        while (feed.children.length > 80) {
            feed.removeChild(feed.firstChild);
        }
        feed.scrollTop = feed.scrollHeight;
    }

    function updateUnreadBadge() {
        const bHeader = document.getElementById('chat-header-badge');
        const bFloat = document.getElementById('floating-chat-badge');
        [bHeader, bFloat].forEach(badge => {
            if (!badge) return;
            if (state.unreadChatCount > 0) {
                badge.textContent = state.unreadChatCount > 99 ? '99+' : state.unreadChatCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }

    window.toggleChat = function () {
        state.isChatOpen = !state.isChatOpen;
        const drawer = document.getElementById('chat-drawer');
        if (drawer) {
            drawer.classList.toggle('hidden', !state.isChatOpen);
        }
        if (state.isChatOpen) {
            state.unreadChatCount = 0;
            updateUnreadBadge();
            const feed = document.getElementById('chat-feed');
            if (feed) feed.scrollTop = feed.scrollHeight;
            setTimeout(() => {
                const inp = document.getElementById('chat-message-input');
                if (inp) inp.focus();
            }, 100);
        }
        audio.beep(state.isChatOpen ? 900 : 600, 0.04);
    };

    window.handleChatOverlay = function (e) {
        if (e.target.id === 'chat-drawer') {
            window.toggleChat();
        }
    };

    window.submitChatMessage = async function (e) {
        if (e) e.preventDefault();
        const input = document.getElementById('chat-message-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.focus();

        const payload = {
            clientId: state.clientId,
            userName: state.userName,
            team: state.userBadge,
            text: text
        };

        audio.beep(850, 0.04);

        try {
            const res = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.message && !state.seenChatIds.has(data.message.id)) {
                    state.seenChatIds.add(data.message.id);
                    state.lastChatTime = Math.max(state.lastChatTime, data.message.time_ms || 0);
                    renderChatMessage(data.message, true);
                }
            }
        } catch (err) {
            // Modo desconectado / fallback local
            const mock = {
                id: 'local_' + Date.now(),
                clientId: state.clientId,
                userName: state.userName,
                team: state.userBadge,
                text: text,
                time: Date.now()
            };
            renderChatMessage(mock, true);
        }
    };

    window.sendEmoji = function (emoji) {
        const inp = document.getElementById('chat-message-input');
        if (inp) {
            inp.value = emoji;
            window.submitChatMessage(null);
        }
    };

    // --- NAVEGAÇÃO RÁPIDA, ACESSIBILIDADE E MOBILE DOCK ---
    function setupAccessibilityAndNav() {
        // Atalho de teclado: '/' foca a busca, 'Esc' fecha busca/modais
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                const searchInput = document.getElementById('omni-search');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            } else if (e.key === 'Escape') {
                window.clearSearch();
                const ufModal = document.getElementById('uf-modal');
                if (ufModal && !ufModal.classList.contains('hidden')) {
                    window.closeUfModal();
                }
                if (state.isChatOpen) {
                    window.toggleChat();
                }
            }
        });

        // Monitor de rolagem para botão "Topo" e dock flutuante mobile
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY || window.pageYOffset;
            const backToTop = document.getElementById('btn-back-to-top');
            if (backToTop) {
                backToTop.classList.toggle('hidden', scrollY < 260);
            }

            const mobileDock = document.getElementById('mobile-map-dock');
            if (mobileDock) {
                const isEstados = state.activeTab === 'view-estados';
                const isMobile = window.innerWidth <= 900;
                mobileDock.classList.toggle('hidden', !(isEstados && isMobile && scrollY > 120));
            }
        }, { passive: true });
    }

    window.scrollToTop = function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.scrollToMap = function () {
        const el = document.getElementById('brazil-svg') || document.getElementById('map-svg-container');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    window.scrollToCities = function () {
        const el = document.getElementById('selected-state-card') || document.getElementById('cities-list');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // --- INICIALIZAÇÃO DO APP ---
    async function init() {
        setupSearch();
        setupAccessibilityAndNav();
        setupChat();
        updateCountdown();
        setInterval(updateCountdown, 1000);

        // Inicializa motor de 5.570 cidades SeuImposto & Reações ao vivo
        initSeuImpostoCanvasMap();
        loadMuniMapData();
        syncReactions();
        setInterval(syncReactions, 4000);

        await fetchPollResults();
        setInterval(fetchPollResults, 3000);
        await loadData();

        // Foco total: abre imediatamente no Mapa Interativo e Cidades
        window.switchTab('view-estados');

        // Ativa motor de alta frequência adaptativo (800ms - 1000ms com auto-recuperação)
        startFastPolling();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
