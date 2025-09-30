// script.js
const BIN_ID = "68c879f9d0ea881f407f0797";
const MASTER_KEY = "$2a$10$3LMKVXiRGejkqgkKPn1PLue3gId0dWY/xN2fjHq1RCtx8UPYZicfq";
const ACCESS_KEY = "$2a$10$1gKTJqvxP6cwzqa972KtievzGRIkUilZAt66wtS7ofz3B1UP3fQfe";

const phasesData = [
  {
    id: 1,
    name: "Fase 1 — Básico",
    questions: [
      { q: "Qual a capital do Brasil?", a: ["São Paulo","Brasília","Rio de Janeiro","Salvador"], correct: 1 },
      { q: "Quanto é 5 + 7?", a: ["10","11","12","13"], correct: 2 },
      { q: "Quem escreveu 'Dom Casmurro'?", a: ["Machado de Assis","José de Alencar","Carlos Drummond","Clarice Lispector"], correct: 0 },
      { q: "Qual é o maior planeta do Sistema Solar?", a: ["Terra","Saturno","Júpiter","Netuno"], correct: 2 },
      { q: "Qual elemento químico tem símbolo O?", a: ["Ouro","Oxigênio","Ósmio","Prata"], correct: 1 }
    ]
  },
  {
    id: 2,
    name: "Fase 2 — Intermediário",
    questions: [
      { q: "Qual linguagem roda no navegador?", a: ["Python","Ruby","JavaScript","C++"], correct: 2 },
      { q: "Qual o resultado de 7 * 6?", a: ["42","36","48","40"], correct: 0 },
      { q: "Quem pintou a Mona Lisa?", a: ["Van Gogh","Leonardo da Vinci","Pablo Picasso","Rembrandt"], correct: 1 },
      { q: "Em que continente fica o Egito?", a: ["Ásia","Europa","América","África"], correct: 3 },
      { q: "Qual país inventou o futebol moderno?", a: ["Inglaterra","Brasil","Espanha","Portugal"], correct: 0 }
    ]
  }
];

const shopItems = [
  { id: "vida", name: "Vida extra", emoji: "❤️", cost: 20, desc: "Permite errar uma vez sem perder pontos (consumível ao usar)." },
  { id: "elim", name: "Eliminar 2 alternativas", emoji: "✂️", cost: 15, desc: "Remove duas respostas erradas para esta pergunta." },
  { id: "dica", name: "Dica", emoji: "💡", cost: 10, desc: "Mostra uma pista (primeira letra + tamanho)." },
  { id: "pular", name: "Pular pergunta", emoji: "⏭️", cost: 12, desc: "Pula a pergunta atual sem ganhar pontos." },
  { id: "dobro", name: "Dobrar pontos", emoji: "✖️2", cost: 18, desc: "Dobrar pontos da próxima resposta correta." },
  { id: "revelar", name: "Revelar resposta", emoji: "🔍", cost: 25, desc: "Mostra qual é a alternativa correta imediatamente." },
  { id: "autodica", name: "Auto-dica", emoji: "🤖", cost: 30, desc: "Usa automaticamente 1 dica ao entrar em cada fase." }
];

window.state = {
  accounts: {},
  currentUser: null,
  settings: {
    musicVolume: 100,
    sfxVolume: 100,
    music: true,
    sfx: true,
    autoSave: true,
    showHints: true,
    theme: "dark",
    playbackRate: 1.0
  },
  phasesMeta: []
};

const AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sfxGain = AudioCtx.createGain();
sfxGain.connect(AudioCtx.destination);

async function ensureAudioContext() {
  if (AudioCtx.state === 'suspended') {
    try { await AudioCtx.resume(); } catch (e) {}
  }
}
async function playSfx(type = 'correct') {
if (!window.state.settings.sfx) return;
try {
await ensureAudioContext();
const ctx = AudioCtx;
const osc = ctx.createOscillator();
const env = ctx.createGain();
// Aumentei os valores iniciais para conseguir um som mais alto
if (type === 'correct') { osc.frequency.value = 880; osc.type = 'sine'; env.gain.value = 1.6; }
else { osc.frequency.value = 220; osc.type = 'sawtooth'; env.gain.value = 2.0; }
osc.connect(env).connect(sfxGain);
osc.start();
const decay = (type === 'correct') ? 0.18 : 0.28;
env.gain.setValueAtTime(env.gain.value, ctx.currentTime);
try { env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay); }
catch (e) { env.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + decay); }
setTimeout(() => { try { osc.stop(); osc.disconnect(); env.disconnect(); } catch (e) {} }, Math.ceil((decay + 0.05) * 1000));
} catch (e) { console.warn('SFX error', e); }
}


function setSfxVolume() {
const v = Math.max(0, Math.min(100, window.state.settings.sfxVolume || 100));
// aumentei o multiplicador de 0.30 para 0.60 para dar mais potência aos toques
sfxGain.gain.value = (v / 100) * 0.60;
}

async function loadState() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { "X-Master-Key": MASTER_KEY, "X-Access-Key": ACCESS_KEY }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return data.record;
  } catch (err) {
    console.warn("loadState failed:", err);
    return null;
  }
}
async function saveState() {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": MASTER_KEY,
        "X-Access-Key": ACCESS_KEY
      },
      body: JSON.stringify(window.state)
    });
  } catch (err) {
    console.error("saveState failed:", err);
  }
}

function maybeSave() {
  if (window.state.settings.autoSave) saveState();
}

const $ = id => document.getElementById(id);
function exists(id) { return document.getElementById(id) !== null; }

function updateAuthButtons() {
  const openAuth = $('openAuth');
  const btnLogout = $('btnLogout');
  const btnLogoutSmall = $('btnLogoutSmall');
  if (window.state.currentUser) {
    if (openAuth) openAuth.classList.add('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
    if (btnLogoutSmall) btnLogoutSmall.classList.remove('hidden');
  } else {
    if (openAuth) openAuth.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
    if (btnLogoutSmall) btnLogoutSmall.classList.add('hidden');
  }
}

function updateTopPointsUI() {
  const pts = (window.state.currentUser && window.state.accounts[window.state.currentUser]) ? window.state.accounts[window.state.currentUser].points || 0 : 0;
  const els = document.querySelectorAll('#topPointsValue');
  els.forEach(el => { el.innerText = pts; });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindGlobalButtons();
  const remote = await loadState();
  if (remote && typeof remote === 'object') {
    window.state = Object.assign({}, window.state, remote);
    window.state.settings = Object.assign({}, window.state.settings || {}, (remote.settings || {}));
    ensurePhasesMeta();
  } else {
    initDefaultState();
    if (window.state.settings.autoSave) await saveState();
  }
  applyTheme();
  setSfxVolume();
  renderPhaseListIfPresent();
  renderShopIfPresent();
  renderProfileIfPresent();
  renderConfigsUIIfPresent();
  renderQuizIfPresent();
  renderAuthIfPresent();
  updateAuthButtons();
  updateTopPointsUI();
  setMusicControlsIfPresent();
});

function bindGlobalButtons() {
  const btnLogout = $('btnLogout');
  if (btnLogout) btnLogout.onclick = () => { logout(); };
  const btnLogoutSmall = $('btnLogoutSmall');
  if (btnLogoutSmall) btnLogoutSmall.onclick = () => { logout(); };
  const openAuth = $('openAuth');
  if (openAuth) openAuth.onclick = () => { window.location = 'auth.html'; };
  const btnFinish = $('btnFinish');
  if (btnFinish) btnFinish.onclick = () => { if (confirm('Deseja sair da fase? Progresso será salvo.')) endPhaseEarly(); };
}

function ensurePhasesMeta() {
  const ids = phasesData.map(p => p.id);
  ids.forEach(id => {
    if (!window.state.phasesMeta.find(x => x.id === id)) {
      window.state.phasesMeta.push({ id, unlocked: id === 1, progress: 0 });
    }
  });
  window.state.phasesMeta = phasesData.map(p => window.state.phasesMeta.find(m => m.id === p.id) || { id: p.id, unlocked: p.id === 1, progress: 0 });
}
function initDefaultState() {
  window.state.accounts = {};
  window.state.currentUser = null;
  window.state.settings = Object.assign({}, window.state.settings);
  window.state.phasesMeta = phasesData.map(p => ({ id: p.id, unlocked: p.id === 1, progress: 0 }));
  window.state.accounts['player'] = { pass: btoa('1234'), points: 0, level: 1, items: {}, unlockedPhases: [1], best: 0 };
}

function bgMusicEl() { return $('bgMusic'); }
async function playMusic() {
  const m = bgMusicEl();
  if (!m) return;
  await ensureAudioContext();
  setMusicVolume();
  setMusicPlaybackRate();
  const playPromise = m.play();
  if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(()=>{});
}
function stopMusic() {
  const m = bgMusicEl();
  if (m) m.pause();
}
function setMusicVolume() {
  const m = bgMusicEl();
  if (!m) return;
  const vol = Math.max(0, Math.min(100, window.state.settings.musicVolume || 100));
  m.volume = vol / 100;
}
function setMusicPlaybackRate() {
  const m = bgMusicEl();
  if (!m) return;
  try { m.playbackRate = window.state.settings.playbackRate || 1.0; } catch (e) { console.warn('playbackRate error', e); }
}
function setMusicControlsIfPresent() {
  const mv = $('musicVolumeRange');
  if (mv) {
    mv.value = window.state.settings.musicVolume;
    mv.oninput = (e) => { window.state.settings.musicVolume = +e.target.value; $('musicVolText').innerText = window.state.settings.musicVolume; setMusicVolume(); maybeSave(); updateTopPointsUI(); };
  }
  const sfx = $('sfxVolumeRange');
  if (sfx) {
    sfx.value = window.state.settings.sfxVolume;
    sfx.oninput = (e) => { window.state.settings.sfxVolume = +e.target.value; $('sfxVolText').innerText = window.state.settings.sfxVolume; setSfxVolume(); maybeSave(); };
  }
  const mt = $('musicToggle');
  if (mt) {
    mt.checked = !!window.state.settings.music;
    mt.onchange = (e) => { window.state.settings.music = e.target.checked; if (window.state.settings.music) playMusic(); else stopMusic(); maybeSave(); };
  }
  const st = $('sfxToggle');
  if (st) {
    st.checked = !!window.state.settings.sfx;
    st.onchange = (e) => { window.state.settings.sfx = e.target.checked; maybeSave(); };
  }
  const auto = $('autoSave');
  if (auto) { auto.checked = !!window.state.settings.autoSave; auto.onchange = (e) => { window.state.settings.autoSave = e.target.checked; if (window.state.settings.autoSave) saveState(); }; }
  const theme = $('themeToggle');
  if (theme) { theme.value = window.state.settings.theme || 'dark'; theme.onchange = (e) => { window.state.settings.theme = e.target.value; applyTheme(); maybeSave(); }; }
  const playbackRate = $('playbackRate');
  if (playbackRate) { playbackRate.value = window.state.settings.playbackRate || 1.0; playbackRate.oninput = (e) => { window.state.settings.playbackRate = parseFloat(e.target.value); if ($('playbackRateValue')) $('playbackRateValue').innerText = window.state.settings.playbackRate.toFixed(2); setMusicPlaybackRate(); maybeSave(); }; }
}

function renderConfigsUIIfPresent() {
  if (!exists('musicVolumeRange') && !exists('sfxVolumeRange')) return;
  if ($('musicVolText')) $('musicVolText').innerText = window.state.settings.musicVolume;
  if ($('sfxVolText')) $('sfxVolText').innerText = window.state.settings.sfxVolume;
  setMusicControlsIfPresent();
}
function applyTheme() {
  const t = window.state.settings.theme || 'dark';
  document.body.classList.toggle('light-theme', t === 'light');
  document.body.classList.toggle('dark-theme', t !== 'light');
}

function signup() {
  const u = $('authUser') ? $('authUser').value.trim() : '';
  const p = $('authPass') ? $('authPass').value : '';
  if (!u || !p) return alert('Informe usuário e senha');
  if (window.state.accounts[u]) return alert('Usuário já existe');
  window.state.accounts[u] = { pass: btoa(p), points: 0, level: 1, items: {}, unlockedPhases: [1], best: 0 };
  window.state.currentUser = u;
  maybeSave();
  updateAuthButtons();
  updateTopPointsUI();
  renderProfileIfPresent();
  alert('Conta criada e logada como ' + u);
}
function login() {
  const u = $('authUser') ? $('authUser').value.trim() : '';
  const p = $('authPass') ? $('authPass').value : '';
  const acc = window.state.accounts[u];
  if (!acc || acc.pass !== btoa(p)) return alert('Usuário/senha inválidos');
  window.state.currentUser = u;
  maybeSave();
  updateAuthButtons();
  updateTopPointsUI();
  renderProfileIfPresent();
  alert('Logado como ' + u);
  if (window.location.pathname.endsWith('auth.html')) {
    setTimeout(() => window.location = 'profile.html', 400);
  }
}
function logout() {
  window.state.currentUser = null;
  maybeSave();
  updateAuthButtons();
  updateTopPointsUI();
  renderProfileIfPresent();
  alert('Desconectado');
}

function renderProfileIfPresent() {
  if (!exists('profileName') && !exists('profilePoints')) return;
  renderProfile();
}
function renderProfile() {
  if (!exists('profileName')) return;
  $('profileName').innerText = window.state.currentUser || 'Visitante';
  const acc = window.state.currentUser ? window.state.accounts[window.state.currentUser] : null;
  if ($('profilePoints')) $('profilePoints').innerText = acc ? acc.points : 0;
  if ($('profileLevel')) $('profileLevel').innerText = acc ? acc.level : 1;
  if ($('profileItems')) $('profileItems').innerText = acc ? Object.entries(acc.items).map(([k,v]) => `${k}×${v}`).join(', ') || '—' : '—';
  if (window.renderOwnedItemsQuick) window.renderOwnedItemsQuick();
  renderLeaderboardIfPresent();
  updateTopPointsUI();
}

function renderLeaderboardIfPresent() {
  if (!exists('leaderboard')) return;
  renderLeaderboard(true);
}
function renderLeaderboard(showTable = true) {
  const arr = Object.entries(window.state.accounts).map(([u,o]) => ({ user: u, points: o.points || 0, level: o.level || 1 }));
  arr.sort((a,b) => b.points - a.points || a.user.localeCompare(b.user));
  const lb = $('leaderboard');
  if (!lb) return;
  lb.innerHTML = '';
  if (arr.length === 0) { lb.innerHTML = '<div class="small muted">Nenhum jogador cadastrado.</div>'; return; }
  if (showTable) {
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Posição</th><th>Jogador</th><th>Pontos</th><th>Nível</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    arr.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>#${idx+1}</td><td>${it.user}</td><td>${it.points}</td><td>${it.level}</td>`;
      tbody.appendChild(tr);
    });
    lb.appendChild(table);
  } else {
    arr.slice(0,5).forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'leader-item';
      div.innerHTML = `<div><strong>#${idx+1} ${it.user}</strong><div class="small muted">Nível: ${it.level}</div></div><div style="font-weight:700">${it.points} pts</div>`;
      lb.appendChild(div);
    });
  }
  if ($('globalPoints')) $('globalPoints').innerText = getGlobalPoints();
  if ($('globalLevel')) $('globalLevel').innerText = getGlobalLevel();
}
function getGlobalPoints() { return Object.values(window.state.accounts).reduce((s,a) => s + (a.points||0), 0); }
function getGlobalLevel() { return 1 + Math.floor(getGlobalPoints() / 100); }

function renderShopIfPresent() {
  if (!exists('shopContainer')) return;
  renderShop();
}
function renderShop() {
  const container = $('shopContainer');
  if (!container) return;
  container.innerHTML = '<h3>Loja de Itens</h3>';
  shopItems.forEach(it => {
    const div = document.createElement('div');
    div.className = 'phase';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.innerHTML = `<div><strong>${it.emoji} ${it.name}</strong> <div class='small muted'>${it.desc}</div></div><div style="text-align:right">${it.cost} pts</div>`;
    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn small-btn';
    buyBtn.style.marginLeft = '12px';
    buyBtn.innerText = 'Comprar';
    buyBtn.onclick = (e) => { e.stopPropagation(); buyItem(it.id); };
    div.appendChild(buyBtn);
    container.appendChild(div);
  });
}
function buyItem(itemId) {
  if (!window.state.currentUser) { alert('Entre na conta primeiro.'); return; }
  const acc = window.state.accounts[window.state.currentUser];
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return;
  if ((acc.points || 0) < item.cost) return alert('Pontos insuficientes!');
  acc.points -= item.cost;
  acc.items[itemId] = (acc.items[itemId] || 0) + 1;
  maybeSave();
  renderProfileIfPresent();
  updateTopPointsUI();
  alert(`Comprou ${item.emoji} ${item.name}! Agora você tem ${acc.items[itemId]}`);
}

function renderPhaseListIfPresent() {
  if (!exists('phaseList')) return;
  renderPhaseList();
}
function renderPhaseList() {
  const container = $('phaseList');
  if (!container) return;
  container.innerHTML = '';
  if (!window.state.phasesMeta || window.state.phasesMeta.length === 0) ensurePhasesMeta();
  window.state.phasesMeta.forEach(pmeta => {
    const div = document.createElement('div');
    div.className = 'phase' + (pmeta.unlocked ? '' : ' locked');
    const qCount = (phasesData.find(p => p.id === pmeta.id)?.questions?.length) || 0;
    div.innerHTML = `<div style="font-weight:600">${pmeta.id} — Fase</div><div class="small muted">Perguntas: ${qCount} · Progresso: ${pmeta.progress}/${Math.min(5,qCount)}</div>`;
    div.onclick = () => { if (!pmeta.unlocked) return alert('Fase trancada. Complete as fases anteriores.'); startQuiz(pmeta.id); };
    container.appendChild(div);
  });
}

function getPhaseQuestions(phaseId) { const phase = phasesData.find(f => f.id === phaseId); return phase ? phase.questions : []; }

let session = null;

function playCurrentPhase() {
  if (!window.state.currentUser) { alert('Entre em sua conta para salvar progresso.'); window.location = 'auth.html'; return; }
  const acc = window.state.accounts[window.state.currentUser];
  const unlocked = acc ? (acc.unlockedPhases || [1]) : [1];
  const current = Math.max(...unlocked);
  startQuiz(current);
}

function startQuiz(phaseId) {
  const questions = getPhaseQuestions(phaseId).slice(0,5).map(q => ({ ...q, a: q.a.slice() }));
  session = { phaseId, questions, index: 0, score: 0, usedItems: { elim:0,dica:0,pular:0,revelar:0,dobro:0 }, doubleNext: false };
  if (window.location.pathname.endsWith('quiz.html')) {
    renderQuestion();
  } else {
    session._temp = true;
    sessionStorage.setItem('pendingSession', JSON.stringify({ phaseId }));
    window.location = 'quiz.html';
  }
}

function renderQuizIfPresent() {
  if (!exists('questionCard') || !exists('answersList')) return;
  if (!session) {
    const p = sessionStorage.getItem('pendingSession');
    if (p) {
      try {
        const obj = JSON.parse(p);
        if (obj && obj.phaseId) {
          sessionStorage.removeItem('pendingSession');
          startQuiz(obj.phaseId);
          return;
        }
      } catch (e) {}
    }
  }
  if (session) renderQuestion();
}

function renderQuestion() {
  if (!session) return;
  cleanupQuestionCardControls();
  const q = session.questions[session.index];
  if (!q) return finishPhase();
  if ($('quizPhaseNum')) $('quizPhaseNum').innerText = session.phaseId;
  if ($('quizIndex')) $('quizIndex').innerText = session.index + 1;
  if ($('quizTotal')) $('quizTotal').innerText = session.questions.length;
  if ($('scoreDisplay')) $('scoreDisplay').innerText = session.score;
  if ($('sessionScore')) $('sessionScore').innerText = `${session.score} pts`;
  if ($('questionText')) $('questionText').innerText = q.q;

  const ansList = $('answersList');
  ansList.innerHTML = '';

  q.a.forEach((txt, idx) => {
    const b = document.createElement('div');
    b.className = 'ans';
    b.tabIndex = 0;
    b.dataset.index = idx;
    b.innerText = txt;
    b.onclick = () => handleAnswer(idx, b);
    b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAnswer(idx, b); } };
    ansList.appendChild(b);
  });

  const card = $('questionCard');
  const ctrl = document.createElement('div');
  ctrl.style.marginTop = '8px';
  ctrl.style.display = 'flex';
  ctrl.style.gap = '8px';
  ctrl.dataset.ctrl = '1';

  const acc = window.state.currentUser ? window.state.accounts[window.state.currentUser] : null;
  if (acc) {
    const addItemBtn = (label, enabled, handler) => {
      const btn = document.createElement('button');
      btn.className = 'btn small-btn';
      btn.innerText = label;
      btn.disabled = !enabled;
      btn.onclick = (e) => { e.stopPropagation(); handler(); };
      ctrl.appendChild(btn);
    };
    addItemBtn('Eliminar 2', (acc.items['elim'] || 0) > 0, useEliminateTwo);
    addItemBtn('Dica', (acc.items['dica'] || 0) > 0, useHint);
    addItemBtn('Revelar', (acc.items['revelar'] || 0) > 0, useReveal);
    addItemBtn('Pular', (acc.items['pular'] || 0) > 0, useSkip);
    addItemBtn('Dobrar', (acc.items['dobro'] || 0) > 0, useDoubleNext);

    const vidasLbl = document.createElement('div');
    vidasLbl.className = 'small muted';
    vidasLbl.style.marginLeft = '8px';
    vidasLbl.innerText = `Vidas: ${acc.items['vida'] || 0}`;
    ctrl.appendChild(vidasLbl);

    if (window.state.settings.showHints && (acc.items['autodica'] || 0) > 0 && (acc._autodicaPhaseUsed !== session.phaseId)) {
      acc.items['autodica'] = Math.max(0, acc.items['autodica'] - 1);
      acc._autodicaPhaseUsed = session.phaseId;
      maybeSave();
      const correctText = q.a[q.correct];
      setTimeout(() => alert(`Auto-dica: começa com "${correctText[0]}" e tem ${correctText.length} caracteres.`), 120);
    }
  }
  card.appendChild(ctrl);
}

function cleanupQuestionCardControls() {
  const card = $('questionCard');
  if (!card) return;
  const ctls = card.querySelectorAll('[data-ctrl="1"]');
  ctls.forEach(c => c.remove());
}

function handleAnswer(selectedIdx, elem) {
  if (!session) return;
  const q = session.questions[session.index];
  const ansElems = Array.from(document.querySelectorAll('.answers .ans'));
  ansElems.forEach(a => { a.onclick = null; a.onkeydown = null; a.style.pointerEvents = 'none'; });

  const correctIdx = q.correct;
  if (selectedIdx === correctIdx) {
    ansElems[selectedIdx].classList.add('correct');
    const gain = session.doubleNext ? 20 : 10;
    session.score += gain;
    session.doubleNext = false;
    playSfx('correct');
  } else {
    ansElems[selectedIdx].classList.add('wrong');
    ansElems[selectedIdx].classList.add('selected');
    if (ansElems[correctIdx]) ansElems[correctIdx].classList.add('correct');

    const acc = window.state.currentUser ? window.state.accounts[window.state.currentUser] : null;
    if (acc && (acc.items['vida'] || 0) > 0) {
      acc.items['vida'] = Math.max(0, acc.items['vida'] - 1);
      maybeSave();
      renderProfileIfPresent();
      alert('Você errou, mas usou 1 Vida Extra — vida consumida, continuando sem perda de pontos.');
      playSfx('correct');
    } else {
      playSfx('wrong');
    }
  }

  if ($('sessionScore')) $('sessionScore').innerText = `${session.score} pts`;
  if ($('scoreDisplay')) $('scoreDisplay').innerText = session.score;

  setTimeout(() => {
    cleanupQuestionCardControls();
    session.index++;
    if (session.index >= session.questions.length) finishPhase();
    else renderQuestion();
  }, 900);
}

function useEliminateTwo() {
  if (!session) return alert('Sem sessão ativa');
  const acc = window.state.accounts[window.state.currentUser];
  if (!acc || (acc.items['elim'] || 0) <= 0) { alert('Sem itens "Eliminar 2".'); return; }
  const q = session.questions[session.index];
  const ansElems = Array.from(document.querySelectorAll('.answers .ans'));
  let removed = 0;
  const idxs = ansElems.map((_, i) => i).sort(() => Math.random() - 0.5);
  for (const i of idxs) {
    if (i === q.correct) continue;
    if (!ansElems[i].classList.contains('removed')) {
      ansElems[i].classList.add('removed');
      ansElems[i].style.opacity = '0.35';
      ansElems[i].onclick = null;
      ansElems[i].onkeydown = null;
      removed++;
      if (removed >= 2) break;
    }
  }
  acc.items['elim'] -= 1;
  session.usedItems.elim = (session.usedItems.elim || 0) + 1;
  maybeSave();
  renderProfileIfPresent();
}

function useHint() {
  if (!session) return alert('Sem sessão ativa');
  const acc = window.state.accounts[window.state.currentUser];
  if (!acc || (acc.items['dica'] || 0) <= 0) { alert('Sem itens "Dica".'); return; }
  const q = session.questions[session.index];
  const correctText = q.a[q.correct];
  alert(`Dica: começa com "${correctText[0]}" e tem ${correctText.length} caracteres.`);
  acc.items['dica'] -= 1;
  session.usedItems.dica = (session.usedItems.dica || 0) + 1;
  maybeSave();
  renderProfileIfPresent();
}

function useReveal() {
  if (!session) return alert('Sem sessão ativa');
  const acc = window.state.accounts[window.state.currentUser];
  if (!acc || (acc.items['revelar'] || 0) <= 0) { alert('Sem itens "Revelar".'); return; }
  const q = session.questions[session.index];
  const ansElems = Array.from(document.querySelectorAll('.answers .ans'));
  ansElems.forEach((el, i) => {
    if (i === q.correct) {
      el.classList.add('correct');
    } else {
      el.classList.add('removed');
      el.style.opacity = '0.36';
      el.onclick = null; el.onkeydown = null;
    }
  });
  acc.items['revelar'] -= 1;
  session.usedItems.revelar = (session.usedItems.revelar || 0) + 1;
  maybeSave();
  renderProfileIfPresent();
}

function useSkip() {
  if (!session) return alert('Sem sessão ativa');
  const acc = window.state.accounts[window.state.currentUser];
  if (!acc || (acc.items['pular'] || 0) <= 0) { alert('Sem itens "Pular".'); return; }
  acc.items['pular'] -= 1;
  session.usedItems.pular = (session.usedItems.pular || 0) + 1;
  maybeSave();
  renderProfileIfPresent();
  session.index++;
  if (session.index >= session.questions.length) finishPhase();
  else renderQuestion();
}

function useDoubleNext() {
  if (!session) return alert('Sem sessão ativa');
  const acc = window.state.accounts[window.state.currentUser];
  if (!acc || (acc.items['dobro'] || 0) <= 0) { alert('Sem itens "Dobrar".'); return; }
  acc.items['dobro'] -= 1;
  session.usedItems.dobro = (session.usedItems.dobro || 0) + 1;
  session.doubleNext = true;
  maybeSave();
  renderProfileIfPresent();
  alert('Próxima resposta correta valerá o dobro de pontos.');
}

function finishPhase() {
  const acc = window.state.currentUser ? window.state.accounts[window.state.currentUser] : null;
  if (acc && session) {
    acc.points = (acc.points || 0) + (session.score || 0);
    acc.level = Math.max(1, Math.floor((acc.points || 0) / 50) + 1);
    acc.best = Math.max(acc.best || 0, session.score || 0);
    const meta = window.state.phasesMeta.find(p => p.id === session.phaseId);
    if (meta) meta.progress = session.questions.length;
    acc.unlockedPhases = acc.unlockedPhases || [];
    if (!acc.unlockedPhases.includes(session.phaseId)) acc.unlockedPhases.push(session.phaseId);
    const nextMeta = window.state.phasesMeta.find(p => p.id === session.phaseId + 1);
    if (nextMeta) { nextMeta.unlocked = true; if (!acc.unlockedPhases.includes(nextMeta.id)) acc.unlockedPhases.push(nextMeta.id); }
  }
  alert(`Fase ${session ? session.phaseId : ''} concluída! Você ganhou ${session ? session.score : 0} pontos.`);
  session = null;
  maybeSave();
  renderPhaseListIfPresent();
  renderProfileIfPresent();
  updateTopPointsUI();
  if (!window.location.pathname.endsWith('profile.html')) window.location = 'profile.html';
}

function endPhaseEarly() {
  if (!session) return;
  const acc = window.state.currentUser ? window.state.accounts[window.state.currentUser] : null;
  if (acc) { acc.points = (acc.points || 0) + session.score; acc.level = Math.max(1, Math.floor((acc.points || 0) / 50) + 1); }
  session = null;
  maybeSave();
  renderPhaseListIfPresent();
  renderProfileIfPresent();
  updateTopPointsUI();
  window.location = 'index.html';
}

function updateUIAllPages() {
  updateAuthButtons();
  updateTopPointsUI();
  renderPhaseListIfPresent();
  renderShopIfPresent();
  renderProfileIfPresent();
  renderLeaderboardIfPresent();
}

function renderOwnedItemsQuick() {
  const container = $('ownedItems');
  if (!container) return;
  container.innerHTML = '';
  const user = window.state.currentUser;
  if (!user) { container.innerHTML = '<div class="small muted">Faça login para ver seus itens.</div>'; return; }
  const acc = window.state.accounts[user] || {};
  const items = acc.items || {};
  if (!items || Object.keys(items).length === 0) {
    container.innerHTML = '<div class="small muted">Nenhum item.</div>';
    return;
  }
  const map = {};
  shopItems.forEach(it => map[it.id] = it);
  Object.entries(items).forEach(([id, qt]) => {
    const info = map[id] || { emoji: '❓', name: id, desc: '' };
    const div = document.createElement('div');
    div.className = 'item-card';
    div.dataset.id = id;
    div.dataset.desc = `${info.emoji} ${info.name} — ${info.desc} (Quantidade: ${qt})`;
    div.innerHTML = `<span class="item-emoji">${info.emoji}</span><strong>${info.name}</strong><div class="small muted" style="margin-top:6px">x${qt}</div>`;
    div.onclick = () => {
      const out = $('itemDesc');
      if (out) out.innerText = div.dataset.desc || 'Sem descrição';
    };
    container.appendChild(div);
  });
}
window.renderOwnedItemsQuick = renderOwnedItemsQuick;

function renderQuizIfPresentOnLoad() { if (exists('questionCard') && !session) renderQuizIfPresent(); }
function renderAuthIfPresent() {
  if (!exists('btnSignup') && !exists('btnLogin')) return;
  const bS = $('btnSignup'); if (bS) bS.onclick = signup;
  const bL = $('btnLogin'); if (bL) bL.onclick = login;
}

document.addEventListener('DOMContentLoaded', () => {
  if ($('btnLogout')) $('btnLogout').onclick = logout;
  if ($('btnLogoutSmall')) $('btnLogoutSmall').onclick = logout;
  if ($('openAuth')) $('openAuth').onclick = () => { window.location = 'auth.html'; };
  if (exists('ownedItems')) {
    setTimeout(() => { renderProfile(); renderOwnedItemsQuick(); }, 200);
  }
  if (window.location.pathname.endsWith('quiz.html')) {
    if (!session) {
      const p = sessionStorage.getItem('pendingSession');
      if (p) {
        try {
          const obj = JSON.parse(p);
          if (obj && obj.phaseId) {
            sessionStorage.removeItem('pendingSession');
            startQuiz(obj.phaseId);
          }
        } catch (e) {}
      }
    } else {
      renderQuestion();
    }
  }
  updateUIAllPages();
});

window.startQuiz = startQuiz;
window.playCurrentPhase = playCurrentPhase;
window.buyItem = buyItem;
window.saveStateManual = saveState;
window.loadStateManual = loadState;
window.getState = () => window.state;
function saveMusicTime() {
  const m = document.getElementById("bgMusic");
  if (m) {
    localStorage.setItem("musicTime", m.currentTime);
  }
}

function restoreMusicTime() {
  const m = document.getElementById("bgMusic");
  if (m) {
    const t = parseFloat(localStorage.getItem("musicTime")) || 0;
    m.currentTime = t;
    playMusic();
  }
}

// Salva antes de sair da página
window.addEventListener("beforeunload", saveMusicTime);

// Restaura quando entrar
window.addEventListener("DOMContentLoaded", restoreMusicTime);

window.addEventListener("DOMContentLoaded", () => {
  const music = document.getElementById("bgMusic");

  // Garante volume inicial
  if (window.state && window.state.settings && window.state.settings.music) {
    setMusicVolume();
    setMusicPlaybackRate();
  }

  // Só começa a tocar após clique do usuário
  document.body.addEventListener("click", () => {
    if (window.state.settings.music) {
      playMusic();
    }
  }, { once: true }); // só precisa uma vez
});
