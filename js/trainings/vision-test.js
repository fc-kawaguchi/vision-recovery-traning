const VisionTest = (() => {
  const PHASES = [
    { id: 'right', label: '右目', emoji: '&#128065;', instruction: '左目を手のひらで優しく覆い、右目だけで見てください' },
    { id: 'left',  label: '左目', emoji: '&#128065;', instruction: '右目を手のひらで優しく覆い、左目だけで見てください' },
    { id: 'both',  label: '両目', emoji: '&#128064;', instruction: '両目を開けて、普段通りに見てください' },
  ];

  const DIRS = ['up', 'right', 'down', 'left'];
  const DIR_LABELS = { up: '↑', right: '→', down: '↓', left: '←' };

  // sizes: 大→小の順。小さいほど高視力を測定
  const CONFIG = {
    easy:   { sizes: [80, 55, 35],     roundsPerSize: 2, timeLimit: 8000 },
    normal: { sizes: [60, 40, 28, 18], roundsPerSize: 2, timeLimit: 6000 },
    hard:   { sizes: [40, 28, 18, 12], roundsPerSize: 2, timeLimit: 4500 },
  };

  let state = null;

  function drawLandoltC(canvas, radius, direction) {
    const ctx = canvas.getContext('2d');
    const cx  = canvas.width / 2;
    const cy  = canvas.height / 2;
    const lw  = Math.max(radius * 0.22, 5);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'butt';

    const gapHalf = Math.asin(0.275); // gap chord = 0.55 × radius
    const rotMap  = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

    ctx.beginPath();
    ctx.arc(cx, cy, radius, rotMap[direction] + gapHalf, rotMap[direction] + Math.PI * 2 - gapHalf);
    ctx.stroke();
  }

  function start(container, difficulty, onComplete) {
    const cfg = CONFIG[difficulty];
    state = {
      cfg,
      phaseIdx: 0,
      results: {},
      round: 0,
      rounds: [],
      sizeCorrects: {},
      totalCorrect: 0,
      currentDir: null,
      currentSize: null,
      answered: false,
      timer: null,
      container,
      onComplete,
    };
    showPhaseIntro();
  }

  function showPhaseIntro() {
    if (!state) return;
    const phase    = PHASES[state.phaseIdx];
    const phaseNum = state.phaseIdx + 1;

    state.container.innerHTML = `
      <div class="vt-intro">
        <div class="vt-step-indicator">
          ${PHASES.map((p, i) => `<span class="vt-step ${i === state.phaseIdx ? 'active' : i < state.phaseIdx ? 'done' : ''}">${p.label}</span>`).join('<span class="vt-step-sep">→</span>')}
        </div>
        <div class="vt-intro-emoji">${phase.emoji}</div>
        <h3 class="vt-intro-title">${phase.label}のテスト（${phaseNum}/3）</h3>
        <p class="vt-intro-desc">${phase.instruction}</p>
        <div class="vt-distance-tip">
          &#128161; <strong>100cm以上</strong>離れて測定するとより正確です
        </div>
        <button id="vt-phase-start" class="btn btn-primary" style="margin-top:1.25rem; min-width:200px;">
          準備ができた — 開始する
        </button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .vt-intro { text-align:center; padding:0.25rem 0; width:100%; }
      .vt-step-indicator { display:flex; align-items:center; justify-content:center; gap:0.4rem; margin-bottom:1.25rem; }
      .vt-step { font-size:0.82rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:100px;
                 background:#f1f5f9; color:#94a3b8; transition:all 0.2s; }
      .vt-step.active { background:#eff6ff; color:#3b82f6; }
      .vt-step.done   { background:#f0fdf4; color:#22c55e; }
      .vt-step-sep    { font-size:0.75rem; color:#cbd5e1; }
      .vt-intro-emoji { font-size:2.75rem; line-height:1; margin-bottom:0.75rem; }
      .vt-intro-title { font-size:1.25rem; font-weight:700; margin-bottom:0.625rem; }
      .vt-intro-desc  { font-size:0.93rem; color:#64748b; line-height:1.7; max-width:300px; margin:0 auto 0.875rem; }
      .vt-distance-tip { display:inline-block; background:#fefce8; border:1px solid #fde68a;
                         border-radius:8px; padding:0.5rem 1rem; font-size:0.83rem; color:#92400e; }
      .vt-feedback { text-align:center; font-size:1.1rem; font-weight:600; height:1.6rem; margin:0.5rem 0; }
      .vt-phase-banner { display:flex; justify-content:center; margin-bottom:0.5rem; }
      .vt-phase-badge  { background:#eff6ff; color:#3b82f6; padding:0.25rem 1rem;
                         border-radius:100px; font-weight:700; font-size:0.88rem; }
    `;
    state.container.appendChild(style);

    document.getElementById('vt-phase-start').addEventListener('click', startPhase);
    updateHeaderProgress();
  }

  function startPhase() {
    if (!state) return;
    const { cfg } = state;

    // ラウンドリスト生成（大→小の順で各サイズ roundsPerSize 回）
    state.rounds        = cfg.sizes.flatMap(s => Array(cfg.roundsPerSize).fill(s));
    state.round         = 0;
    state.sizeCorrects  = {};
    state.totalCorrect  = 0;

    const phase = PHASES[state.phaseIdx];

    state.container.innerHTML = `
      <div class="vt-phase-banner">
        <span class="vt-phase-badge">${phase.label}</span>
      </div>
      <p class="training-instruction">ランドルト環（C）の切れ目の方向を答えてください</p>
      <div class="timer-bar-container">
        <div class="timer-bar" id="vt-bar"></div>
      </div>
      <canvas id="vt-canvas" width="300" height="220" style="margin:0 auto 0.25rem;"></canvas>
      <p id="vt-feedback" class="vt-feedback"></p>
      <div class="direction-grid">
        ${DIRS.map(d => `<button class="direction-btn" data-dir="${d}">${DIR_LABELS[d]}</button>`).join('')}
      </div>
    `;

    state.container.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => answer(btn.dataset.dir, btn));
    });

    updatePhaseProgress();
    nextRound();
  }

  function nextRound() {
    if (!state) return;
    if (state.round >= state.rounds.length) { finishPhase(); return; }

    state.answered    = false;
    state.currentSize = state.rounds[state.round];
    state.currentDir  = DIRS[Math.floor(Math.random() * 4)];

    const canvas = document.getElementById('vt-canvas');
    if (!canvas) return;
    drawLandoltC(canvas, state.currentSize, state.currentDir);

    state.container.querySelectorAll('.direction-btn').forEach(b => {
      b.classList.remove('correct', 'wrong');
      b.disabled = false;
    });
    const fb = document.getElementById('vt-feedback');
    if (fb) { fb.textContent = ''; fb.style.color = ''; }

    startTimer();
    updatePhaseProgress();
  }

  function startTimer() {
    let elapsed = 0;
    const bar   = document.getElementById('vt-bar');
    if (!bar) return;
    bar.style.width = '100%';
    bar.className   = 'timer-bar';

    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (!state) return;
      elapsed += 100;
      const pct = Math.max(0, 100 - (elapsed / state.cfg.timeLimit) * 100);
      bar.style.width = pct + '%';
      if (pct < 30) bar.className = 'timer-bar danger';
      else if (pct < 60) bar.className = 'timer-bar warning';
      if (elapsed >= state.cfg.timeLimit && !state.answered) answer(null, null);
    }, 100);
  }

  function answer(dir, btn) {
    if (!state || state.answered) return;
    state.answered = true;
    clearInterval(state.timer);

    state.container.querySelectorAll('.direction-btn').forEach(b => { b.disabled = true; });
    const fb = document.getElementById('vt-feedback');

    if (dir === state.currentDir) {
      state.totalCorrect++;
      state.sizeCorrects[state.currentSize] = (state.sizeCorrects[state.currentSize] || 0) + 1;
      if (btn) btn.classList.add('correct');
      if (fb) { fb.textContent = '✓ 正解！'; fb.style.color = '#22c55e'; }
    } else {
      const cb = state.container.querySelector(`.direction-btn[data-dir="${state.currentDir}"]`);
      if (cb) cb.classList.add('correct');
      if (btn) btn.classList.add('wrong');
      if (fb) { fb.textContent = dir ? '✗ 不正解' : '⏱ 時間切れ'; fb.style.color = '#ef4444'; }
    }

    state.round++;
    setTimeout(nextRound, 900);
  }

  function finishPhase() {
    if (!state) return;
    const phaseId = PHASES[state.phaseIdx].id;
    const sizes   = state.cfg.sizes;
    const sc      = state.sizeCorrects;

    // 1回以上正解した最小サイズ（= 最も細かいリングを識別できた）
    const passedSizes     = sizes.filter(s => (sc[s] || 0) >= 1);
    const smallestPassed  = passedSizes.length > 0 ? Math.min(...passedSizes) : sizes[0];

    state.results[phaseId] = {
      label:               PHASES[state.phaseIdx].label,
      correctCount:        state.totalCorrect,
      totalCount:          state.rounds.length,
      smallestPassedRadius: smallestPassed,
    };

    state.phaseIdx++;

    if (state.phaseIdx >= PHASES.length) {
      const cb  = state.onComplete;
      const res = { type: 'vision-test', phases: state.results };
      state = null;
      cb(res);
    } else {
      showPhaseIntro();
    }
  }

  function updateHeaderProgress() {
    const el = document.getElementById('training-progress');
    if (el) el.textContent = (state.phaseIdx + 1) + ' / ' + PHASES.length + ' パート';
  }

  function updatePhaseProgress() {
    const el = document.getElementById('training-progress');
    if (!el || !state) return;
    const phase = PHASES[state.phaseIdx];
    if (phase) el.textContent = phase.label + '  ' + state.round + ' / ' + state.rounds.length;
  }

  function stop() {
    if (state?.timer) clearInterval(state.timer);
    state = null;
  }

  return { start, stop };
})();
