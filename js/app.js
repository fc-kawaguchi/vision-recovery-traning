const App = (() => {
  const state = {
    mode: 'vision-test',
    trainingType: 'focus',
    difficulty: 'normal',
    vtDistance: 100,
    vtDpi: 96,
    vtRange: 'low',
    lastConfig: null,
  };

  const trainings = {
    'vision-test': VisionTest,
    'focus':       FocusTraining,
    'muscle':      MuscleTraining,
    'tracking':    TrackingTraining,
  };

  const titles = {
    'vision-test': '視力測定',
    'focus':       'ピント調整トレーニング',
    'muscle':      '眼筋トレーニング',
    'tracking':    'トラッキングトレーニング',
  };

  let currentTraining = null;
  let isPaused = false;

  function init() {
    // モードボタン
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        updateMenuVisibility();
      });
    });

    // トレーニング種類
    document.querySelectorAll('.training-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.training-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.trainingType = btn.dataset.type;
      });
    });

    // 難易度
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.difficulty = btn.dataset.diff;
      });
    });

    // 視力測定 設定ボタン
    bindSettingGroup('vt-distance-group', v => { state.vtDistance = Number(v); });
    bindSettingGroup('vt-dpi-group',      v => { state.vtDpi      = Number(v); });
    bindSettingGroup('vt-range-group',    v => { state.vtRange    = v; });

    // スタート
    document.getElementById('start-btn').addEventListener('click', startSession);

    // トレーニング中「メニュー」ボタン
    document.getElementById('training-back-btn').addEventListener('click', () => {
      if (currentTraining?.stop) currentTraining.stop();
      currentTraining = null;
      hidePauseOverlay();
      isPaused = false;
      Router.show('menu');
    });

    // 一時停止ボタン
    document.getElementById('pause-btn').addEventListener('click', togglePause);

    // 結果画面 リトライ
    document.getElementById('retry-btn').addEventListener('click', () => {
      Router.show('training');
      startTraining();
    });

    // 結果画面 メニューへ戻る
    document.getElementById('menu-btn').addEventListener('click', () => {
      Router.show('menu');
    });

    // 初期表示
    updateMenuVisibility();
  }

  function bindSettingGroup(groupId, onSelect) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.setting-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(btn.dataset.value);
      });
    });
  }

  function updateMenuVisibility() {
    const isVT = state.mode === 'vision-test';
    document.getElementById('vt-settings').classList.toggle('hidden', !isVT);
    document.getElementById('training-options').classList.toggle('hidden', isVT);
    document.getElementById('difficulty-section').classList.toggle('hidden', isVT);
  }

  function startSession() {
    if (state.mode === 'vision-test') {
      state.lastConfig = {
        mode: 'vision-test',
        vtSettings: { distance: state.vtDistance, dpi: state.vtDpi, range: state.vtRange },
      };
    } else {
      state.lastConfig = {
        mode: state.trainingType,
        difficulty: state.difficulty,
      };
    }
    Router.show('training');
    startTraining();
  }

  function startTraining() {
    const { mode } = state.lastConfig;
    const container = document.getElementById('training-area');

    document.getElementById('training-title').textContent    = titles[mode];
    document.getElementById('training-progress').textContent = '';
    container.innerHTML = '';
    isPaused = false;

    currentTraining = trainings[mode];

    if (mode === 'vision-test') {
      currentTraining.start(container, state.lastConfig.vtSettings, onTrainingComplete);
    } else {
      currentTraining.start(container, state.lastConfig.difficulty, onTrainingComplete);
    }
  }

  function onTrainingComplete(data) {
    isPaused = false;
    hidePauseOverlay();
    Router.show('result');
    Result.display(state.lastConfig.mode, data, state.lastConfig.difficulty);
  }

  // ===== 一時停止 =====
  function togglePause() {
    if (!isPaused) {
      if (currentTraining?.pause) currentTraining.pause();
      isPaused = true;
      showPauseOverlay();
    } else {
      resumeTraining();
    }
  }

  function resumeTraining() {
    hidePauseOverlay();
    isPaused = false;
    if (currentTraining?.resume) currentTraining.resume();
  }

  function showPauseOverlay() {
    const area = document.getElementById('training-area');
    if (!area || document.getElementById('pause-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id        = 'pause-overlay';
    overlay.className = 'pause-overlay';
    overlay.innerHTML = `
      <div class="pause-modal">
        <p class="pause-modal-title">&#9646;&#9646; 一時停止中</p>
        <button id="resume-btn"    class="btn btn-primary">再開する</button>
        <button id="pause-menu-btn" class="btn btn-secondary">メニューに戻る</button>
      </div>
    `;
    area.appendChild(overlay);

    document.getElementById('resume-btn').addEventListener('click', resumeTraining);
    document.getElementById('pause-menu-btn').addEventListener('click', () => {
      if (currentTraining?.stop) currentTraining.stop();
      currentTraining = null;
      hidePauseOverlay();
      isPaused = false;
      Router.show('menu');
    });
  }

  function hidePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.remove();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
