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

  // 視力レベル定数（vision-test.js と同期）
  const VA_LEVELS_CONST = {
    low:    [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.7, 1.0],
    medium: [0.5, 0.6, 0.7, 0.8, 1.0, 1.2, 1.5],
    high:   [1.0, 1.2, 1.5, 1.8, 2.0],
  };

  function hasValidItems(range, distance, dpi) {
    const pxPerCm = dpi / 2.54;
    return VA_LEVELS_CONST[range].some(va => {
      const gapCm = distance / (va * 3438);
      const radius = (gapCm * pxPerCm) / 0.55;
      return radius >= 8 && radius <= 150;
    });
  }

  // 範囲: どの距離+DPI の組み合わせでも有効なものが1つでもあれば OK
  function canRangeWork(range) {
    return [50, 75, 100, 150].some(d => [72, 96, 144, 200, 250, 300, 350].some(dpi => hasValidItems(range, d, dpi)));
  }

  // 距離: 選択中の範囲でどのDPIでも有効なものが1つでもあれば OK
  function canDistanceWork(distance) {
    return [72, 96, 144, 200, 250, 300, 350].some(dpi => hasValidItems(state.vtRange, distance, dpi));
  }

  // DPI: 選択中の範囲+距離との組み合わせで有効かどうか
  function canDpiWork(dpi) {
    return hasValidItems(state.vtRange, state.vtDistance, dpi);
  }

  function updateSettingConstraints() {
    // ① 測定範囲
    document.querySelectorAll('#vt-range-group .setting-btn').forEach(btn => {
      btn.disabled = !canRangeWork(btn.dataset.value);
    });

    // ② 距離（範囲変更後に再評価）
    document.querySelectorAll('#vt-distance-group .setting-btn').forEach(btn => {
      btn.disabled = !canDistanceWork(Number(btn.dataset.value));
    });
    fixDisabledSelection('vt-distance-group', v => { state.vtDistance = Number(v); });

    // ③ DPI（距離修正後に再評価）
    document.querySelectorAll('#vt-dpi-group .setting-btn').forEach(btn => {
      btn.disabled = !canDpiWork(Number(btn.dataset.value));
    });
    fixDisabledSelection('vt-dpi-group', v => { state.vtDpi = Number(v); });
  }

  function fixDisabledSelection(groupId, updateState) {
    const group  = document.getElementById(groupId);
    if (!group) return;
    const active = group.querySelector('.setting-btn.active');
    if (active && active.disabled) {
      active.classList.remove('active');
      const firstValid = group.querySelector('.setting-btn:not(:disabled)');
      if (firstValid) {
        firstValid.classList.add('active');
        updateState(firstValid.dataset.value);
      }
    }
  }

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

    // 視力測定 設定ボタン（変更のたびに制約を再計算）
    bindSettingGroup('vt-range-group',    v => { state.vtRange    = v;         updateSettingConstraints(); });
    bindSettingGroup('vt-distance-group', v => { state.vtDistance = Number(v); updateSettingConstraints(); });
    bindSettingGroup('vt-dpi-group',      v => { state.vtDpi      = Number(v); updateSettingConstraints(); });

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

    // Enter キー → スタートボタン（メニュー画面のみ）
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (document.getElementById('screen-menu').classList.contains('active')) {
          e.preventDefault();
          document.getElementById('start-btn').click();
        }
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        const trainingActive = document.getElementById('screen-training').classList.contains('active');
        const focusedTag = document.activeElement?.tagName;
        if (trainingActive && currentTraining && focusedTag !== 'BUTTON' && focusedTag !== 'INPUT') {
          e.preventDefault();
          togglePause();
        }
      }
    });

    // 初期表示
    updateMenuVisibility();
    updateSettingConstraints();
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
        difficulty: 'normal',
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
