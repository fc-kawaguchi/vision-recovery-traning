const Result = (() => {
  const grades = [
    { min: 90, label: '&#127942; エクセレント！', color: '#f59e0b' },
    { min: 75, label: '&#11088; 素晴らしい！',   color: '#3b82f6' },
    { min: 60, label: '&#128077; よくできました', color: '#22c55e' },
    { min: 40, label: '&#128522; まずまずです',   color: '#64748b' },
    { min: 0,  label: '&#128170; もっと練習しよう', color: '#ef4444' },
  ];

  const feedbackData = {
    'focus': {
      S: { comment: '毛様体筋の調整能力が抜群です！', advice: 'この調子でトレーニングを続けましょう。さらに難易度を上げて挑戦することで、より柔軟なピント調整力が身につきます。' },
      A: { comment: 'ピント調整がスムーズにできています。', advice: '1日2〜3セット継続することで、さらに改善が期待できます。遠くの景色を意識的に見る時間を作りましょう。' },
      B: { comment: 'ピント調整力がついてきています。', advice: '毛様体筋をほぐすために、温かいタオルを目に当てて血行を促進することも効果的です。継続が大切です。' },
      C: { comment: 'ピント調整に時間がかかっています。', advice: '焦らず毎日続けましょう。「かんたん」モードから始め、徐々に難易度を上げていくことが大切です。' },
      D: { comment: 'ピント調整の練習が必要です。', advice: '目の緊張をほぐすため、蒸しタオルを使ったホットアイケアを試してみましょう。パソコン作業中は意識的に遠くを見る習慣を持ちましょう。' },
    },
    'muscle': {
      S: { comment: '眼筋が非常に発達しています！', advice: 'さらなる挑戦として、難易度「むずかしい」に挑戦してみましょう。眼筋の柔軟性が維持されることで、疲れ目の予防になります。' },
      A: { comment: '眼球の動きがスムーズです！', advice: '眼筋トレーニングを朝晩の習慣にすることで、さらに効果が高まります。首・肩のストレッチも合わせて行うと、眼精疲労の予防に効果的です。' },
      B: { comment: '眼筋トレーニングの効果が出ています。', advice: '引き続き毎日練習しましょう。首のストレッチも合わせて行うと、眼精疲労の予防に効果的です。' },
      C: { comment: '眼球の動きに改善の余地があります。', advice: '1日3回、各方向に眼球を動かす練習を行いましょう。焦らず継続することが大切です。' },
      D: { comment: '眼筋が硬くなっているかもしれません。', advice: '無理せず「かんたん」モードから始めましょう。目を閉じて、ゆっくり大きく眼球を回す準備運動から始めることをお勧めします。' },
    },
    'tracking': {
      S: { comment: '追従視力が非常に優れています！', advice: '高いトラッキング能力は日常生活や運動でも役立ちます。この調子で練習を続けましょう。' },
      A: { comment: '物体の追跡が上手です！', advice: '「むずかしい」モードにチャレンジして、さらなる向上を目指しましょう。スポーツの動態視力にも効果があります。' },
      B: { comment: '追従視力がついてきています。', advice: '継続的な練習で動体視力が向上します。日常でも動く物を意識的に目で追う習慣をつけましょう。' },
      C: { comment: '追従視力の改善が見込めます。', advice: 'ゆっくり動く物から練習を始め、徐々に速い動きに対応できるように訓練しましょう。' },
      D: { comment: '動体視力のトレーニングを続けましょう。', advice: 'まず「かんたん」モードで基礎を固めましょう。ボールを使ったキャッチボールなど、日常的な動体視力練習も効果的です。' },
    },
  };

  // 視力計算定数 (96dpi モニター想定)
  const PIXELS_PER_CM = 37.8;
  const DISTANCES_CM  = [50, 70, 100, 150, 200, 300];

  function computeVA(radiusPx, distanceCm) {
    const gapCm = (radiusPx * 0.55) / PIXELS_PER_CM;
    const va    = distanceCm / (gapCm * 3438);
    return Math.round(va * 100) / 100;
  }

  // ===== 視力測定 結果表示 =====
  function displayVisionTest(data) {
    const phaseOrder = ['right', 'left', 'both'];
    const phases     = data.phases;
    const settings   = data.settings; // { distance, dpi, range }

    const scoreCard    = document.querySelector('.score-card');
    const feedbackCard = document.querySelector('.feedback-card');

    // 推定視力サマリー（最高VA達成値）
    const summaryHtml = phaseOrder.map(id => {
      const p = phases[id];
      if (!p) return '';
      const vaText = p.achievedVA != null ? p.achievedVA.toFixed(2) : '—';
      return `
        <div class="va-acc-item">
          <span class="va-acc-label">${p.label}</span>
          <span class="va-acc-pct">${vaText}<small> 以上</small></span>
          <span class="va-acc-sub">${p.correctCount}/${p.totalCount}問正解</span>
        </div>
      `;
    }).join('');

    scoreCard.innerHTML = `
      <h3 class="va-done-title">視力測定 完了</h3>
      <p class="va-done-cond">${settings.distance}cm ／ ${settings.dpi}dpi での測定結果</p>
      <div class="va-acc-grid">${summaryHtml}</div>
    `;

    // 距離別早見表：achievedVA × (他距離 / 測定距離) で比例計算
    const tableHeaders = phaseOrder
      .map(id => `<th>${phases[id]?.label || ''}</th>`)
      .join('');

    const tableRows = DISTANCES_CM.map(d => {
      const cells = phaseOrder.map(id => {
        const p = phases[id];
        if (!p || p.achievedVA == null) return '<td>—</td>';
        const va = p.achievedVA * (d / settings.distance);
        return `<td>${va.toFixed(2)}</td>`;
      }).join('');

      const isSelected  = (d === settings.distance);
      const rowClass    = isSelected ? ' class="va-row-rec"' : '';
      const distLabel   = isSelected
        ? `${d}cm <span class="va-rec-mark">測定距離</span>`
        : `${d}cm`;

      return `<tr${rowClass}><td class="va-dist">${distLabel}</td>${cells}</tr>`;
    }).join('');

    feedbackCard.innerHTML = `
      <h4 class="va-table-heading">距離別 推定視力の早見表</h4>
      <p class="va-table-desc">もし別の距離で測定していた場合の推定視力です。実際に離れていた距離の行を参考にしてください。</p>
      <div class="va-table-scroll">
        <table class="va-table">
          <thead><tr><th>距離</th>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div class="va-reference">
        <p class="va-ref-heading">視力の目安</p>
        <ul class="va-ref-list">
          <li><span class="va-ref-val good">0.7以上</span><span>日常生活・運転に支障なし</span></li>
          <li><span class="va-ref-val ok">0.3〜0.6</span><span>運転には矯正が必要な場合あり</span></li>
          <li><span class="va-ref-val low">0.1〜0.3</span><span>日常生活に不便を感じやすい</span></li>
          <li><span class="va-ref-val bad">0.1未満</span><span>早めに眼科を受診してください</span></li>
        </ul>
      </div>
      <p class="va-note">※ 測定設定（${settings.distance}cm / ${settings.dpi}dpi）を基に比例計算した参考値です。正確な視力測定は眼科を受診してください。</p>
    `;
  }

  // ===== トレーニング 結果表示 =====
  function displayTraining(mode, score, difficulty) {
    function getGradeKey(s) {
      if (s >= 90) return 'S';
      if (s >= 75) return 'A';
      if (s >= 60) return 'B';
      if (s >= 40) return 'C';
      return 'D';
    }

    const gradeKey  = getGradeKey(score);
    const gradeInfo = grades.find(g => score >= g.min);
    const feedback  = (feedbackData[mode] || {})[gradeKey] || {
      comment: 'お疲れ様でした！',
      advice:  'トレーニングを継続して視力回復を目指しましょう。',
    };

    // score-card を通常表示に戻す
    const scoreCard = document.querySelector('.score-card');
    scoreCard.innerHTML = `
      <div class="score-display">
        <span id="result-score" class="score-number">0</span>
        <span class="score-unit">点</span>
      </div>
      <div id="result-grade" class="result-grade"></div>
    `;

    const feedbackCard = document.querySelector('.feedback-card');
    feedbackCard.innerHTML = `
      <p id="result-feedback" class="result-feedback"></p>
      <p id="result-advice"   class="result-advice"></p>
    `;

    document.getElementById('result-grade').textContent = gradeInfo.label;
    document.getElementById('result-grade').style.color  = gradeInfo.color;
    document.getElementById('result-feedback').textContent = feedback.comment;
    document.getElementById('result-advice').textContent   = feedback.advice;

    let current = 0;
    const scoreEl = document.getElementById('result-score');
    const step    = score / 40;
    const timer   = setInterval(() => {
      current = Math.min(current + step, score);
      scoreEl.textContent = Math.floor(current);
      if (current >= score) clearInterval(timer);
    }, 20);
  }

  // ===== 外部 API =====
  function display(mode, data, difficulty) {
    if (mode === 'vision-test') {
      displayVisionTest(data);
    } else {
      displayTraining(mode, data, difficulty);
    }
  }

  return { display };
})();
