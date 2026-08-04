/* Questly 考试闯关系统 — 渲染 / 交互层 */
(function (global) {
  var Q = global.Q = global.Q || {};
  var store = Q.store, fx = Q.fx, exam = Q.exam, ui = Q.ui;
  var EP = { tab: 'center', session: null, quick: null };

  /* ============ 工具 ============ */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v) { return (v == null || (typeof v === 'number' && !isFinite(v))) ? '0' : v; }
  function fmtMin(m) { return (m || 0) + ' 分钟'; }
  function typeName(t) { return t === 'single' ? '单选题' : t === 'judge' ? '判断题' : '多选题'; }
  function ansLabel(q) {
    if (q.type === 'judge') return q.answer[0] === 'T' ? '正确' : '错误';
    return q.answer.join('、');
  }
  function toast(m, k) { fx.toast(m, { kind: k || 'ok' }); }
  function goto(r) { Q.goto(r); }

  /** 把考试页重新绘制回 DOM（renderExam 只返回字符串，必须显式写回） */
  function repaint() {
    var p = document.getElementById('page-exam');
    if (p && !p.hidden) {
      p.innerHTML = renderExam();
      if (Q.app && Q.app.refreshChrome) Q.app.refreshChrome();
    }
    return p;
  }

  /* ============ 考试闯关首页（作战中心） ============ */
  function renderExam(tab) {
    if (tab) EP.tab = tab;
    if (!exam.ready()) {
      return '<div class="exam-loading"><span class="exam-loading__spin"></span>' +
             '<b>正在载入题库…</b><span class="muted">首次打开需要把 404 道题写入本地数据库，稍等一下</span></div>';
    }
    var c = exam.counts();
    var cd = exam.examCountdown();
    var pi = exam.prepIndex();
    var lv = store.levelInfo();
    var plan = exam.dailyPlan();
    var titles = Q.exam.EXAM_TITLES;
    var eLv = Math.min(titles.length, Math.max(1, lv.level));
    var html = '';

    // 顶部作战中心卡片
    html += '<section class="exam-hero">';
    html += '<div class="exam-hero__bg"></div>';
    html += '<div class="exam-hero__main">';
    html += '<div class="exam-hero__title">工商贸企业主要负责人考试</div>';
    html += '<div class="exam-hero__sub">本周考试备战副本</div>';
    html += '<div class="exam-hero__stats">';
    html += stat(cd.days + ' 天 ' + cd.hours + ' 时', '距离考试剩余');
    html += stat(c.answered + ' / ' + c.total, '当前进度');
    html += stat(c.accuracy + '%', '当前正确率');
    html += stat(c.wrong, '错题数量');
    html += stat(c.combo, '当前连击');
    html += stat(plan.target, '今日刷题目标');
    html += stat('Lv.' + lv.level + ' ' + titles[eLv - 1], '考试等级');
    html += stat(pi + ' / 100', '备考指数');
    html += '</div>';
    html += '<div class="exam-hero__prep">备考状态：<b>' + exam.prepStatus(pi) + '</b> · 备考指数仅代表当前学习完成情况，不代表正式考试成绩。</div>';
    html += '<div class="exam-hero__actions">';
    html += '<button class="btn btn--primary btn--lg" data-ea="continue">' + I.bolt + '继续闯关</button>';
    html += '<button class="btn btn--outline btn--lg" data-ea="boss">' + I.shield + '今日 Boss 战</button>';
    html += '<button class="btn btn--outline btn--lg" data-ea="quick" data-kind="pre10">' + I.bolt + '快速复习</button>';
    html += '</div>';
    html += '</div></section>';

    // tab 条
    html += '<nav class="exam-tabs">';
    [['center', '作战中心'], ['map', '关卡地图'], ['wrong', '错题本'], ['fav', '收藏'], ['boss', 'Boss 战'], ['mock', '模拟考'], ['settings', '设置导入']].forEach(function (t) {
      html += '<button class="exam-tab' + (EP.tab === t[0] ? ' is-active' : '') + '" data-etab="' + t[0] + '">' + t[1] + '</button>';
    });
    html += '</nav>';

    if (EP.tab === 'center') html += renderCenterBody(c, pi, plan);
    else if (EP.tab === 'map') html += renderMap();
    else if (EP.tab === 'wrong') html += renderWrong();
    else if (EP.tab === 'fav') html += renderFav();
    else if (EP.tab === 'boss') html += renderBoss();
    else if (EP.tab === 'mock') html += renderMock();
    else if (EP.tab === 'settings') html += renderSettings();

    return html;
  }
  function stat(v, l) { return '<div class="exam-stat"><b>' + esc(fmt(v)) + '</b><span>' + esc(l) + '</span></div>'; }

  function renderCenterBody(c, pi, plan) {
    var t = exam.todayStat();
    var html = '<div class="exam-grid">';
    html += '<div class="exam-grid__main">';

    // 今日计划
    html += '<div class="card exam-plan"><div class="card__head"><h3>今日备考计划</h3><span class="muted">目标 ' + fmt(plan.target) + ' 题 · 约 ' + fmtMin(plan.minutes) + '</span></div>';
    html += '<div class="exam-plan__bar"><i style="width:' + fmt(t.pct) + '%"></i></div>';
    html += '<div class="exam-plan__done">今日已完成 <b>' + fmt(t.done) + '</b> / ' + fmt(plan.target) + ' 题 · 正确率 ' + fmt(t.rate) + '% · 连续学习 ' + fmt(t.streak) + ' 天</div>';
    html += '<div class="exam-plan__grid">';
    plan.parts.forEach(function (p) { html += '<div class="exam-plan__cell"><b>' + fmt(p.n) + '</b><span>' + esc(p.label) + '</span></div>'; });
    html += '</div><button class="btn btn--soft btn--block" data-ea="continue" style="margin-top:12px">' + I.bolt + '开始今日闯关</button></div>';

    // 快速复习入口
    html += '<div class="card"><div class="card__head"><h3>快速复习</h3><span class="muted">只看题干与答案，不计入正确率</span></div><div class="exam-quicks">' +
      qbtn('recentWrong', '🕐', '最近错题') + qbtn('freqWrong', '🔁', '高频错题') +
      qbtn('fav', '★', '收藏题') + qbtn('multi', '🧩', '全部多选') +
      qbtn('unmastered', '📌', '未掌握') + qbtn('pre10', '⏱', '考前10分钟') +
      '</div></div>';

    // 关卡地图预览
    var lv = exam.levelMap().slice(0, 4);
    html += '<div class="card"><div class="card__head"><h3>副本地图</h3><button class="btn btn--sm btn--outline" data-etab="map">查看全部</button></div><div class="exam-levels exam-levels--mini">';
    lv.forEach(function (l) { html += levelCard(l); });
    html += '</div></div>';

    // 备考成就
    html += renderAchStrip();
    html += '</div>';

    // 右栏：AI 考试教练
    html += '<aside class="exam-grid__side">' + renderCoach() + '</aside>';
    html += '</div>';
    return html;
  }
  function qbtn(kind, icon, label) {
    return '<button class="exam-quickbtn" data-ea="quick" data-kind="' + kind + '"><span>' + icon + '</span>' + label + '</button>';
  }

  /* ============ AI 考试教练（本地规则分析） ============ */
  function renderCoach() {
    var modes = [['todayPlan', '今天该学什么'], ['weak', '我的薄弱点'], ['order', '复习顺序建议'], ['summary', '今日表现总结']];
    var r = exam.aiCoach(EP.coach || 'todayPlan');
    var html = '<div class="card coach"><div class="card__head"><span class="sec-icon sec-icon--brand">' + I.wand + '</span><h3>AI 考试教练</h3></div>';
    html += '<div class="coach__modes">';
    modes.forEach(function (m) {
      html += '<button class="coach__mode' + ((EP.coach || 'todayPlan') === m[0] ? ' is-on' : '') + '" data-ea="coach" data-kind="' + m[0] + '">' + m[1] + '</button>';
    });
    html += '</div>';
    html += '<div class="coach__out"><b>' + esc(r.title) + '</b>';
    r.lines.forEach(function (l) {
      String(l).split('\n').forEach(function (sub) { if (sub.trim()) html += '<p>' + esc(sub) + '</p>'; });
    });
    html += '</div>';
    html += '<div class="coach__foot">本内容由本地规则根据你的答题记录生成，不联网、不调用外部模型，仅供学习参考，请以培训教材与正式考试要求为准。</div>';
    html += '<button class="btn btn--soft btn--block" data-ea="continue" style="margin-top:10px">' + I.bolt + '按建议开始练习</button>';
    html += '</div>';
    return html;
  }

  function levelCard(l) {
    var pct = l.total ? Math.round(l.done / l.total * 100) : 0;
    var stars = '★★★'.slice(0, l.stars) + '☆☆☆'.slice(0, 3 - l.stars);
    return '<div class="exam-level" data-ea="open-level" data-cat="' + l.id + '">' +
      '<div class="exam-level__top"><b>第' + l.id + '关 · ' + esc(l.name) + '</b><span class="exam-level__stars">' + stars + '</span></div>' +
      '<div class="exam-level__bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="exam-level__foot"><span>完成 ' + l.done + ' / ' + l.total + '</span><span>正确率 ' + l.rate + '%</span></div>' +
      (l.weak.length ? '<div class="exam-level__weak">薄弱：' + l.weak.map(function (w) { return w.name + '×' + w.n; }).join('，') + '</div>' : '') +
      '</div>';
  }

  function renderAchStrip() {
    var m = exam.meta();
    var html = '<div class="card"><div class="card__head"><h3>备考成就</h3><span class="muted">' + Object.keys(m.unlocked || {}).length + ' / ' + exam.ACH.length + '</span></div><div class="exam-ach">';
    exam.ACH.forEach(function (a) {
      var on = m.unlocked && m.unlocked[a.id];
      html += '<div class="exam-ach__item' + (on ? ' is-on' : '') + '" title="' + esc(a.desc) + '"><span>' + a.icon + '</span><b>' + esc(a.name) + '</b></div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderMap() {
    var html = '<div class="exam-levels">';
    exam.levelMap().forEach(function (l) { html += levelCard(l); });
    html += '</div>';
    return html;
  }

  function renderWrong() {
    var f = EP.wrongFilter || 'all';
    var all = exam.all().filter(function (q) { return q.inWrong; });
    var mastered = exam.all().filter(function (q) { return q.mastered; });
    var list = filterWrong(f);
    var html = '<div class="card"><div class="card__head"><h3>错题本</h3><span class="muted">待复习 ' + all.length + ' 道 · 已掌握 ' + mastered.length + ' 道</span></div>';
    if (!all.length && !mastered.length) {
      html += emptyState('还没有错题记录 — 先去闯几关，做错的题会自动收集到这里');
      return html + '</div>';
    }
    var opts = [['all', '全部错题'], ['0', '尚未复习'], ['1', '已答对 1 次'], ['3', '已掌握']];
    html += '<div class="exam-filters">';
    opts.forEach(function (o) {
      html += '<button class="chip' + (f === o[0] ? ' is-active' : '') + '" data-ea="wrong-filter" data-f="' + o[0] + '">' + o[1] + '</button>';
    });
    html += '<button class="btn btn--sm btn--soft" data-ea="review-wrong" style="margin-left:auto">' + I.bolt + '批量复习</button>';
    html += '</div>';
    html += '<p class="exam-tip">错题连续答对 2 次会自动标记为「已掌握」并移出待复习列表。</p>';
    html += '<div class="exam-qlist">';
    html += list.length ? list.map(qItem).join('') : emptyState('这个分类下暂时没有题目');
    html += '</div></div>';
    return html;
  }

  function qItem(q) {
    var stage = ['尚未复习', '已复习一次', '连续答对一次', '已掌握'][q.wrongStage] || '学习中';
    return '<div class="exam-q" data-idx="' + q.idx + '">' +
      '<div class="exam-q__meta"><span class="tag tag--' + q.type + '">' + typeName(q.type) + '</span>' +
      '<span class="muted">' + esc(q.catName) + '</span>' +
      (q.needsReview ? '<span class="tag tag--warn">待人工校对</span>' : '') +
      (q.fav ? '<span class="tag tag--fav">★ 收藏</span>' : '') +
      (q.mastered ? '<span class="tag tag--ok">已掌握</span>' : '<span class="tag">' + stage + '</span>') + '</div>' +
      '<div class="exam-q__q">' + esc(q.q) + '</div>' +
      (q.type !== 'judge' ? '<div class="exam-q__opts">' + q.options.map(function (o) { var ok = q.answer.indexOf(o.key) >= 0; return '<span class="' + (ok ? 'is-ans' : '') + '">' + o.key + '. ' + esc(o.text) + '</span>'; }).join('') + '</div>' : '') +
      (q.type === 'judge' ? '<div class="exam-q__ans">答案：<b>' + ansLabel(q) + '</b></div>' : '') +
      (q.explain ? '<div class="exam-q__exp">解析：' + esc(q.explain) + '</div>' : '<div class="exam-q__exp muted">原题库未提供解析。</div>') +
      (q.note ? '<div class="exam-q__note">📝 ' + esc(q.note) + '</div>' : '') +
      '<div class="exam-q__acts">' +
      '<button class="iconbtn" data-ea="fav" data-idx="' + q.idx + '" title="收藏">' + (q.fav ? '★' : '☆') + '</button>' +
      '<button class="iconbtn" data-ea="note" data-idx="' + q.idx + '" title="笔记">✎</button>' +
      '<button class="iconbtn" data-ea="flag" data-idx="' + q.idx + '" title="暂不">⏱</button>' +
      '<button class="btn btn--sm btn--primary" data-ea="review-one" data-idx="' + q.idx + '">去复习</button>' +
      '</div></div>';
  }

  function renderFav() {
    var list = exam.all().filter(function (q) { return q.fav; });
    var noted = exam.all().filter(function (q) { return q.note; });
    var html = '<div class="card"><div class="card__head"><h3>收藏与笔记</h3><span class="muted">收藏 ' + list.length + ' 道 · 有笔记 ' + noted.length + ' 道</span></div>';
    if (!list.length && !noted.length) {
      html += emptyState('还没有收藏 — 答题时点 ☆ 收藏，点 ✎ 写下自己的记忆口诀');
      return html + '</div>';
    }
    if (list.length) html += '<button class="btn btn--sm btn--soft" data-ea="review-fav" style="margin-bottom:10px">' + I.bolt + '只练收藏题</button>';
    var merged = list.concat(noted.filter(function (q) { return !q.fav; }));
    html += '<div class="exam-qlist">' + merged.map(qItem).join('') + '</div></div>';
    return html;
  }

  function emptyState(t) { return '<div class="exam-empty">' + esc(t) + '</div>'; }

  function renderBoss() {
    var m = exam.meta();
    var html = '<div class="card exam-boss">' +
      '<div class="exam-boss__orb">🛡️</div>' +
      '<h3>今日 Boss：安全知识守门人</h3>' +
      '<p class="muted">挑战目标：正确率 80% · 20 题内完成 · 完成后获得 100 XP</p>' +
      '<div class="exam-boss__stat">最佳正确率：<b>' + (m.bossBestRate || 0) + '%</b> · ' + (m.bossDone ? '已挑战' : '未挑战') + '</div>' +
      '<label class="switch"><input type="checkbox" id="boss-timer" checked> <span>开启 15 分钟限时</span></label>' +
      '<button class="btn btn--primary btn--lg btn--block" data-ea="boss" style="margin-top:12px">' + I.shield + '开始 Boss 战</button>' +
      '<p class="muted" style="font-size:12px;margin-top:10px">答题过程中不立即显示答案，完成全部题目后统一结算。</p>' +
      '</div>';
    return html;
  }

  function renderMock() {
    var s = exam.settings();
    var html = '<div class="card"><div class="card__head"><h3>模拟考试</h3></div><div class="card__body">' +
      '<p class="muted" style="margin-bottom:14px">以下为自定义模拟练习，不代表正式考试规则。</p>' +
      '<div class="exam-set exam-set--mock">' +
      '<div class="field"><label>单选题数量</label><input class="input" id="mk-single" type="number" value="20" min="0"></div>' +
      '<div class="field"><label>判断题数量</label><input class="input" id="mk-judge" type="number" value="20" min="0"></div>' +
      '<div class="field"><label>多选题数量</label><input class="input" id="mk-multi" type="number" value="10" min="0"></div>' +
      '<div class="field"><label>考试时长（分钟）</label><input class="input" id="mk-time" type="number" value="30" min="1"></div>' +
      '<div class="field"><label>目标正确率（%）</label><input class="input" id="mk-goal" type="number" value="80" min="1"></div>' +
      '</div>' +
      '<div class="exam-mock__opts">' +
      chk('mk-shufq', '打乱题目顺序', true) + chk('mk-shufo', '打乱选项顺序', true) +
      chk('mk-pw', '优先抽取错题', true) + chk('mk-em', '排除已掌握', false) +
      '</div>' +
      '<button class="btn btn--primary btn--lg btn--block" data-ea="mock" style="margin-top:14px">' + I.target + '开始模拟考</button>' +
      '</div></div>';
    return html;
  }
  function chk(id, label, on) { return '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> <span>' + esc(label) + '</span></label>'; }
  function chkRow(id, label, on) {
    return '<label class="exam-set__sw"><span>' + esc(label) + '</span><span class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '></span></label>';
  }

  function renderSettings() {
    var r = exam.importReport();
    var s = exam.settings();
    var html = '';
    // 导入检查
    html += '<div class="card"><div class="card__head"><h3>题库导入检查</h3></div><div class="card__body">';
    html += '<div class="exam-imp">';
    html += '<div class="exam-imp__hero">' +
      '<div class="exam-imp__total"><b>' + fmt(r.total) + '</b><span>成功识别题目</span></div>' +
      '<div class="exam-imp__kinds">' +
        '<div class="exam-imp__kind"><b>' + fmt(r.single) + '</b><span>单选</span></div>' +
        '<div class="exam-imp__kind"><b>' + fmt(r.judge) + '</b><span>判断</span></div>' +
        '<div class="exam-imp__kind"><b>' + fmt(r.multi) + '</b><span>多选</span></div>' +
        '<div class="exam-imp__kind"><b>' + fmt(r.answered) + '</b><span>已作答</span></div>' +
      '</div>' +
    '</div>';
    html += '<div class="exam-imp__rows">' +
      impRow('待人工校对（格式异常）', r.needsReview, r.needsReview ? 'warn' : 'ok') +
      impRow('缺少答案', r.missingAnswer, r.missingAnswer ? 'warn' : 'ok') +
    '</div>';
    html += '</div><p class="muted exam-imp__note">原题库内容已原样保留，仅清理多余空格与换行；未修改任何法律名称、数字或答案。</p></div></div>';

    // 设置
    var examDate = s.examDate || '';
    var dailyMin = (typeof s.dailyMinutes === 'number') ? s.dailyMinutes : 45;
    var groupSize = (typeof s.groupSize === 'number') ? s.groupSize : 10;
    html += '<div class="card"><div class="card__head"><h3>考试与学习计划</h3></div><div class="card__body">';
    html += '<div class="exam-set">' +
      '<div class="field"><label>考试日期</label><input class="input" id="set-date" type="date" value="' + esc(examDate) + '"></div>' +
      '<div class="field"><label>每天可学习（分钟）</label><input class="input" id="set-min" type="number" value="' + dailyMin + '" min="1"></div>' +
      '<div class="field"><label>每组题目数量</label><input class="input" id="set-group" type="number" value="' + groupSize + '" min="1"></div>' +
    '</div>';
    html += '<div class="exam-set__switches">' +
      chkRow('set-inc', '包含已做对的题', s.includeCorrect) +
      chkRow('set-pw', '优先复习错题', s.prioritizeWrong) +
      chkRow('set-sound', '开启答题音效', s.sound) +
    '</div>';
    html += '<button class="btn btn--primary btn--block" data-ea="settings-save">保存设置</button>';
    html += '</div></div>';

    // 数据管理
    html += '<div class="card"><div class="card__head"><h3>数据管理</h3></div><div class="card__body">' +
      '<div class="exam-data">' +
        '<button class="btn btn--primary" data-ea="export-portable">' + I.bolt + '导出可携带文件</button>' +
        '<button class="btn btn--outline" data-ea="export-json">' + I.down + '导出学习数据</button>' +
        '<button class="btn btn--outline" data-ea="import-json">' + I.up + '导入数据</button>' +
        '<button class="btn btn--outline" data-ea="reimport">重新导入题库</button>' +
        '<button class="btn btn--danger" data-ea="reset-records">清空答题记录</button>' +
      '</div>' +
      '<input type="file" id="exam-import-file" accept="application/json" hidden>' +
      '<p class="muted exam-imp__note">「可携带文件」是自带你全部进度的单 HTML，发到手机用浏览器打开即可继续刷题；手机上的新进度会自动保存在本机。执行清空 / 重置前会二次确认，且无法恢复。</p>' +
    '</div></div>';
    return html;
  }
  function impRow(k, v, kind) {
    return '<div class="exam-imp__row' + (kind === 'warn' ? ' exam-imp__row--warn' : '') + '"><span>' + esc(k) + '</span><b>' + fmt(v) + '</b></div>';
  }

  /* ============ 答题（沉浸页） ============ */
  function mkSession(ids, orders, mode, extra) {
    var s = {
      ids: ids, order: orders, i: 0, mode: mode, sel: [],
      correct: 0, wrong: 0, firstCorrect: 0, start: Date.now(),
      comboMax: exam.meta().combo, newWrong: 0, weak: {}, answers: {},
      timed: false, timeLimit: 0, remain: 0, _beforeXp: exam.meta().examXp
    };
    return Object.assign(s, extra || {});
  }
  function defOrder(ids) {
    return ids.map(function (i) { var q = exam.get(i); return (q && q.options ? q.options : []).map(function (o) { return o.key; }); });
  }

  function startSession(opts) {
    opts = opts || {};
    var ids;
    if (opts.cat) {
      var cat = String(opts.cat);
      ids = exam.all().filter(function (q) {
        if (q.needsReview) return false;
        if (cat === '11') return q.type === 'judge';
        if (cat === '12') return q.type === 'multi';
        return q.cat === Number(cat);
      }).map(function (q) { return q.idx; });
      if (!opts.all) {
        var todo = ids.filter(function (i) { return !exam.get(i).answered || exam.get(i).inWrong; });
        if (todo.length) ids = todo;
      }
      ids = ids.slice(0, Math.max(exam.settings().groupSize || 10, 10));
    } else if (opts.scope === 'wrong') {
      ids = exam.all().filter(function (q) { return q.inWrong; }).map(function (q) { return q.idx; });
    } else if (opts.scope === 'fav') {
      ids = exam.all().filter(function (q) { return q.fav; }).map(function (q) { return q.idx; });
    } else if (opts.single != null) {
      ids = [opts.single];
    } else {
      var n = exam.settings().groupSize || 10;
      var inc = exam.settings().includeCorrect;
      var seen = {};
      ids = [];
      for (var i = 0; i < n * 4 && ids.length < n; i++) {
        var x = exam.pickNext({ includeCorrect: inc });
        if (x == null) break;
        if (seen[x]) continue;
        seen[x] = 1; ids.push(x);
      }
    }
    if (!ids || !ids.length) { toast('没有符合条件的题目，去关卡地图看看吧', 'warn'); return; }
    EP.session = mkSession(ids, defOrder(ids), opts.mode || 'group');
    goto('examPlay');
  }
  function startBoss() {
    var ids = exam.bossSession();
    if (!ids.length) { toast('题库为空，请先在设置里重新导入题库', 'warn'); return; }
    var timer = $('#boss-timer') ? $('#boss-timer').checked : true;
    EP.session = mkSession(ids, defOrder(ids), 'boss', { timed: timer, timeLimit: 900, remain: 900, instant: false });
    goto('examPlay');
  }
  function startMock(cfg) {
    var arr = exam.mockSession(cfg);
    if (!arr.length) { toast('没有可生成的题目，请调整数量后重试', 'warn'); return; }
    EP.session = mkSession(
      arr.map(function (x) { return x.idx; }),
      arr.map(function (x) { return x.order; }),
      'mock',
      { timed: true, timeLimit: (cfg.time || 30) * 60, remain: (cfg.time || 30) * 60, goal: cfg.goal || 80, instant: false }
    );
    goto('examPlay');
  }

  function fmtClock(sec) {
    sec = Math.max(0, sec | 0);
    var m = Math.floor(sec / 60), r = sec % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function modeName(m) { return m === 'boss' ? 'Boss 战' : m === 'mock' ? '模拟考' : '闯关练习'; }

  function renderPlay() {
    var s = EP.session; if (!s) { setTimeout(function () { goto('exam'); }, 0); return ''; }
    var q = exam.get(s.ids[s.i]);
    if (!q) { setTimeout(function () { goto('exam'); }, 0); return ''; }
    var total = s.ids.length;
    var order = s.order[s.i] && s.order[s.i].length ? s.order[s.i] : (q.options || []).map(function (o) { return o.key; });
    var typ = q.type;
    var pct = Math.round(s.i / total * 100);
    var html = '<div class="play">';

    // 顶栏
    html += '<header class="play__bar">';
    html += '<button class="play__back" data-ea="back-exam" title="退出并保存进度">← 退出</button>';
    html += '<div class="play__meta"><span class="tag tag--' + typ + '">' + typeName(typ) + '</span>' +
            '<span class="play__mode">' + modeName(s.mode) + '</span>' +
            '<span class="muted">第 ' + (s.i + 1) + ' / ' + total + ' 题</span></div>';
    html += '<div class="play__nums">' +
            '<span id="play-combo" class="play__combo' + (exam.meta().combo >= 3 ? ' is-hot' : '') + '">🔥 连击 ' + exam.meta().combo + '</span>' +
            '<span id="play-xp">' + I.bolt + ' ' + exam.meta().examXp + ' XP</span>' +
            (s.timed ? '<span class="play__timer" id="play-timer">⏱ ' + fmtClock(s.remain) + '</span>' : '') +
            '</div>';
    html += '</header>';
    html += '<div class="play__progress"><i style="width:' + pct + '%"></i></div>';

    // 题目卡片
    html += '<div class="play__card" id="play-card">';
    html += '<div class="play__no">题库原第 ' + q.no + ' 题 · ' + esc(q.catName) +
            (q.needsReview ? ' · <span class="warn">此题原文格式异常，待人工校对</span>' : '') + '</div>';
    html += '<div class="play__q">' + esc(q.q) + '</div>';
    if (typ === 'judge') {
      html += '<div class="play__judge">' +
        '<button class="play__judge-btn" data-opt="T"><b>√</b>正确</button>' +
        '<button class="play__judge-btn" data-opt="F"><b>×</b>错误</button></div>';
    } else {
      html += '<div class="play__opts">';
      order.forEach(function (k) {
        var o = (q.options || []).filter(function (x) { return x.key === k; })[0]; if (!o) return;
        html += '<button class="play__opt" data-opt="' + k + '"><span class="play__opt-k">' + k + '</span><span class="play__opt-t">' + esc(o.text) + '</span></button>';
      });
      html += '</div>';
      if (typ === 'multi') html += '<div class="play__hint">' + I.target + ' 本题为多选，选完后再点提交</div>';
    }
    html += '</div>';

    // 底部操作
    html += '<footer class="play__foot">';
    html += '<button class="btn btn--ghost" data-ea="fav-play" data-idx="' + q.idx + '">' + (q.fav ? '★ 已收藏' : '☆ 收藏') + '</button>';
    html += '<button class="btn btn--ghost" data-ea="note-play" data-idx="' + q.idx + '">✎ 笔记</button>';
    html += '<button class="btn btn--ghost" data-ea="skip">跳过</button>';
    html += '<button class="btn btn--primary btn--lg play__submit" data-submit disabled>提交答案</button>';
    html += '</footer>';
    html += '</div>';
    return html;
  }

  function nextOrSettle() {
    var s = EP.session; if (!s) return;
    if (s.i >= s.ids.length - 1) { showSettlement(); return; }
    s.i++; s.sel = [];
    var pc = document.getElementById('page-examPlay');
    if (pc) {
      pc.innerHTML = renderPlay();
      var card = pc.querySelector('.play__card');
      if (card) { card.classList.add('fx-slidein'); }
    }
  }

  function submitCurrent() {
    var s = EP.session; if (!s) return;
    var q = exam.get(s.ids[s.i]);
    var sel = (s.sel || []).slice();
    if (!sel.length) return;

    var res = exam.answer(q.idx, sel);
    s.answers[q.idx] = { sel: sel, correct: res.correct };
    s.comboMax = Math.max(s.comboMax, res.combo);
    if (res.correct) { s.correct++; if (res.firstAttempt) s.firstCorrect++; }
    else { s.wrong++; s.newWrong++; s.weak[q.catName] = (s.weak[q.catName] || 0) + 1; }

    var instant = s.mode === 'group';
    if (instant) paintFeedback(q, sel, res);
    else lockOptions();

    if (res.correct) {
      if (res.xp) fx.xpFloat($('#play-card'), '+' + res.xp + ' XP');
      fx.sfx.complete();
      if (res.combo >= 3 && res.combo % 1 === 0 && Q.exam.COMBO_TITLES[res.combo]) {
        toast('连击 ' + res.combo + ' · ' + Q.exam.COMBO_TITLES[res.combo]);
        fx.spawn(global.innerWidth / 2, global.innerHeight * 0.4, { count: 14, power: 7, size: 6, life: 55 });
      }
    } else {
      fx.sfx.undo();
      var card = $('#play-card');
      if (card) { card.classList.remove('fx-shake'); void card.offsetWidth; card.classList.add('fx-shake'); }
    }
    if (res.unlocked && res.unlocked.length) {
      res.unlocked.forEach(function (a, i) { setTimeout(function () { fx.sfx.unlock(); toast('解锁备考成就：' + a.icon + ' ' + a.name); }, 420 + i * 520); });
    }

    // 顶栏刷新
    var cb = $('#play-combo');
    if (cb) { cb.textContent = '🔥 连击 ' + res.combo; cb.classList.toggle('is-hot', res.combo >= 3); }
    var xpEl = $('#play-xp'); if (xpEl) xpEl.innerHTML = I.bolt + ' ' + exam.meta().examXp + ' XP';
    if (Q.app && Q.app.refreshChrome) Q.app.refreshChrome();

    var btn = $('.play__submit');
    if (btn) {
      btn.disabled = false;
      btn.textContent = (s.i >= s.ids.length - 1) ? '查看结算 →' : '下一题 →';
      btn.setAttribute('data-next', '1');
      btn.classList.add('is-next');
    }
    // Boss / 模拟考不停顿，自动进入下一题
    if (!instant) setTimeout(nextOrSettle, 260);
  }

  function lockOptions() {
    var card = $('#play-card'); if (!card) return;
    card.querySelectorAll('[data-opt]').forEach(function (b) { b.classList.add('is-locked'); });
  }

  function paintFeedback(q, sel, res) {
    var card = $('#play-card'); if (!card) return;
    card.querySelectorAll('[data-opt]').forEach(function (b) {
      var k = b.getAttribute('data-opt');
      b.classList.add('is-locked');
      if (q.answer.indexOf(k) >= 0) b.classList.add('is-correct');
      else if (sel.indexOf(k) >= 0) b.classList.add('is-wrong');
    });
    card.classList.remove('fx-correct', 'fx-wrong');
    void card.offsetWidth;
    card.classList.add(res.correct ? 'fx-correct' : 'fx-wrong');

    if (!$('#play-exp')) {
      var exp = document.createElement('div');
      exp.id = 'play-exp';
      exp.className = 'play__exp ' + (res.correct ? 'is-ok' : 'is-no');
      exp.innerHTML =
        '<div class="play__exp-head">' + (res.correct ? '✅ 回答正确 · +' + res.xp + ' XP' : '📌 这题先记下来，稍后复习') + '</div>' +
        '<div class="play__exp-ans">正确答案：<b>' + esc(ansLabel(q)) + '</b>' +
          (res.correct ? '' : ' · 你的答案：<i>' + esc(q.type === 'judge' ? (sel[0] === 'T' ? '正确' : '错误') : sel.join('、')) + '</i>') + '</div>' +
        (q.explain ? '<div class="play__exp-txt">原题库解析：' + esc(q.explain) + '</div>'
                   : '<div class="play__exp-txt muted">原题库未提供解析，可先记住正确答案，并在错题本里加一条自己的记忆口诀。</div>') +
        (q.note ? '<div class="play__exp-note">📝 我的笔记：' + esc(q.note) + '</div>' : '');
      card.appendChild(exp);
      exp.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  function buildSettlement(s) {
    var answered = s.correct + s.wrong;
    var total = s.ids.length;
    var rate = answered ? Math.round(s.correct / answered * 100) : 0;
    var firstRate = answered ? Math.round(s.firstCorrect / answered * 100) : 0;
    var secs = Math.round((Date.now() - s.start) / 1000);
    var avg = answered ? Math.round(secs / answered) : 0;
    var gained = exam.meta().examXp - (s._beforeXp || 0);
    var title, msg, emoji;

    if (s.mode === 'boss') {
      title = rate >= 80 ? 'Boss 挑战成功！' : 'Boss 战结束';
      emoji = rate >= 80 ? '🏆' : '🛡️';
      msg = rate >= 80 ? '正确率达标，今日 Boss 已被击败，明天还有新的守门人。'
                       : '距离 80% 还差一点，先把本次错题过一遍，随时可以再来一次。';
    } else if (s.mode === 'mock') {
      title = '模拟考报告';
      emoji = rate >= (s.goal || 80) ? '🎓' : '📋';
      msg = rate >= (s.goal || 80) ? '本次模拟达到你设定的目标正确率，保持这个节奏。'
                                   : '本次未达目标，报告已列出薄弱知识点，按顺序补一轮就好。';
      msg += '（本结果为自定义模拟练习，不代表正式考试成绩）';
    } else {
      title = '本组闯关结算';
      emoji = rate >= 80 ? '🏆' : '💪';
      if (rate >= 90) msg = '本组表现优秀，这批知识点已经很稳了。';
      else if (rate >= 80) msg = '状态不错，再顺手复习几道错题就更稳。';
      else if (rate >= 60) msg = '基础已经在了，建议现在就把本组错题过一遍。';
      else msg = '这组题偏难，系统已经把它们收进错题本，复习后再来一次就好。';
    }

    var weakArr = Object.keys(s.weak).sort(function (a, b) { return s.weak[b] - s.weak[a]; }).slice(0, 3);
    var weak = weakArr.length ? weakArr.map(function (k) { return esc(k) + ' × ' + s.weak[k]; }).join('　') : '本组没有出现错题';

    return '<div class="settle">' +
      '<div class="settle__emoji">' + emoji + '</div>' +
      '<h2>' + esc(title) + '</h2>' +
      '<div class="settle__rate"><b>' + rate + '%</b><span>本组正确率</span></div>' +
      '<div class="settle__grid">' +
        sd('本组题目', total) + sd('答对', s.correct) + sd('答错', s.wrong) +
        sd('首次答对率', firstRate + '%') + sd('最长连击', s.comboMax) + sd('新增错题', s.newWrong) +
        sd('获得 XP', '+' + gained) + sd('用时', fmtClock(secs)) + sd('平均每题', avg + ' 秒') +
      '</div>' +
      '<div class="settle__weak"><b>本组薄弱知识点</b>' + weak + '</div>' +
      '<div class="settle__msg">' + esc(msg) + '</div>' +
      '<div class="settle__acts">' +
        (s.newWrong > 0 ? '<button class="btn btn--outline" data-ea="settle-review">复习本组错题</button>' : '') +
        (s.mode === 'group' ? '<button class="btn btn--primary" data-ea="settle-next">继续下一组</button>' : '') +
        (s.mode === 'boss' ? '<button class="btn btn--primary" data-ea="settle-boss">再战一次</button>' : '') +
        '<button class="btn btn--ghost" data-ea="back-exam">返回考试中心</button>' +
      '</div></div>';
  }
  function sd(k, v) { return '<div class="settle__cell"><b>' + esc(v) + '</b><span>' + esc(k) + '</span></div>'; }

  function showSettlement() {
    var s = EP.session; if (!s || s.settled) return;
    s.settled = true;
    s.timed = false;
    var answered = s.correct + s.wrong;
    var rate = answered ? Math.round(s.correct / answered * 100) : 0;
    var unlocked = [];
    if (s.mode === 'boss') unlocked = exam.recordBoss(rate) || [];

    var wrap = document.createElement('div');
    wrap.className = 'overlay overlay--center';
    wrap.innerHTML = '<div class="modal modal--lg">' + buildSettlement(s) + '</div>';
    document.getElementById('modal-root').appendChild(wrap);
    if (rate >= 80) { fx.celebrate(); fx.sfx.clear(); } else { fx.sfx.tap(); }
    unlocked.forEach(function (a, i) { setTimeout(function () { toast('解锁备考成就：' + a.icon + ' ' + a.name); }, 600 + i * 520); });
    if (Q.app && Q.app.refreshChrome) Q.app.refreshChrome();

    wrap.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ea]'); if (!a) return;
      e.stopPropagation();
      var act = a.dataset.ea;
      wrap.remove();
      EP.session = null;
      if (act === 'settle-next') startSession({});
      else if (act === 'settle-review') startSession({ scope: 'wrong' });
      else if (act === 'settle-boss') startBoss();
      else goto('exam');
    }, true);
  }

  /* ============ 快速复习 ============ */
  function showQuick(kind) {
    var ids = exam.quickSet(kind);
    if (!ids.length) { toast('这个分类下还没有题目，先去闯几关吧', 'warn'); return; }
    EP.quick = { ids: ids, i: 0, kind: kind };
    renderQuick();
  }
  var QUICK_NAME = { recentWrong: '最近错题', freqWrong: '高频错题', fav: '收藏题', multi: '全部多选题', unmastered: '未掌握的题', pre10: '考前 10 分钟速览' };
  function renderQuick() {
    var q = exam.get(EP.quick.ids[EP.quick.i]);
    var pct = Math.round((EP.quick.i + 1) / EP.quick.ids.length * 100);
    var html = '<div class="overlay overlay--center"><div class="modal modal--lg exam-quick">' +
      '<div class="exam-quick__bar"><b>' + esc(QUICK_NAME[EP.quick.kind] || '快速复习') + '</b>' +
        '<span class="muted">' + (EP.quick.i + 1) + ' / ' + EP.quick.ids.length + '</span>' +
        '<button class="iconbtn" data-ea="quick-fav" title="收藏">' + (q.fav ? '★' : '☆') + '</button>' +
        '<button class="iconbtn" data-ea="quick-close" title="关闭">✕</button></div>' +
      '<div class="exam-quick__bar2"><i style="width:' + pct + '%"></i></div>' +
      '<div class="exam-quick__body">' +
      '<div class="exam-quick__meta"><span class="tag tag--' + q.type + '">' + typeName(q.type) + '</span><span class="muted">' + esc(q.catName) + '</span></div>' +
      '<div class="exam-quick__q">' + esc(q.q) + '</div>' +
      (q.type !== 'judge' ? '<div class="exam-quick__opts">' + (q.options || []).map(function (o) { var ok = q.answer.indexOf(o.key) >= 0; return '<div class="' + (ok ? 'is-ans' : '') + '">' + o.key + '. ' + esc(o.text) + (ok ? ' ✓' : '') + '</div>'; }).join('') + '</div>' : '') +
      '<div class="exam-quick__ans">正确答案：<b>' + esc(ansLabel(q)) + '</b></div>' +
      (q.explain ? '<div class="exam-quick__exp">原题库解析：' + esc(q.explain) + '</div>' : '<div class="exam-quick__exp muted">原题库未提供解析。</div>') +
      (q.note ? '<div class="exam-quick__note">📝 ' + esc(q.note) + '</div>' : '') +
      '</div>' +
      '<div class="exam-quick__acts">' +
        '<button class="btn btn--outline" data-ea="quick-prev"' + (EP.quick.i === 0 ? ' disabled' : '') + '>← 上一题</button>' +
        '<button class="btn btn--primary" data-ea="quick-next">' + (EP.quick.i >= EP.quick.ids.length - 1 ? '完成速览' : '下一题 →') + '</button>' +
      '</div></div></div>';
    var root = document.getElementById('modal-root');
    root.innerHTML = html;
  }

  /* ============ 事件委托 ============ */
  function bind() {
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-etab]');
      if (tab) {
        e.preventDefault();
        EP.tab = tab.dataset.etab;
        fx.sfx.tap();
        repaint();
        return;
      }

      var a = e.target.closest('[data-ea]');
      if (!a) { handlePlayClick(e); return; }
      e.preventDefault();
      var act = a.dataset.ea;
      var idx = a.dataset.idx != null ? Number(a.dataset.idx) : null;
      var q;
      switch (act) {
        case 'continue': fx.sfx.tap(); startSession({}); break;
        case 'open-level': fx.sfx.tap(); startSession({ cat: a.dataset.cat }); break;
        case 'review-wrong': startSession({ scope: 'wrong' }); break;
        case 'review-fav': startSession({ scope: 'fav' }); break;
        case 'review-one': startSession({ single: idx }); break;
        case 'boss': fx.sfx.tap(); startBoss(); break;
        case 'mock': doMock(); break;
        case 'quick': fx.sfx.tap(); showQuick(a.dataset.kind || 'pre10'); break;
        case 'coach': EP.coach = a.dataset.kind; fx.sfx.tap(); repaint(); break;

        case 'fav':
          q = exam.get(idx); if (!q) break;
          exam.toggleFav(idx); fx.sfx.tap();
          toast(q.fav ? '已加入收藏' : '已取消收藏');
          repaint();
          break;
        case 'flag':
          q = exam.get(idx); if (!q) break;
          exam.flag(idx);
          toast(q.flag ? '已标记「暂不复习」' : '已取消标记');
          repaint();
          break;
        case 'note': notePrompt(idx, repaint); break;

        case 'settings-save': saveSettingsFromForm(); break;
        case 'export-json': doExport(); break;
        case 'export-portable':
          exam.exportPortable();
          toast('已生成「questly-我的闯关数据.html」，去下载里发给手机即可');
          break;
        case 'import-json': { var f = $('#exam-import-file'); if (f) f.click(); break; }
        case 'reimport':
          ui.confirm({
            title: '重新导入题库', danger: true, okText: '确认重新导入',
            message: '将用原始 Word 题库覆盖当前题目，并清空全部答题记录（错题、收藏、笔记、连击、备考成就），且无法恢复。建议先导出备份。',
            onOk: function () { exam.reimportBank().then(function () { toast('题库已重新导入'); repaint(); }); }
          });
          break;
        case 'reset-records':
          ui.confirm({
            title: '清空答题记录', danger: true, okText: '确认清空',
            message: '所有作答、错题、收藏、笔记、连击与备考成就都会被清空，且无法恢复。题目本身会保留。',
            onOk: function () { exam.resetRecords().then(function () { toast('已清空答题记录'); repaint(); }); }
          });
          break;

        case 'back-exam':
          if (EP.session && !EP.session.settled && (EP.session.correct + EP.session.wrong) > 0) {
            ui.confirm({
              title: '退出本组闯关', okText: '退出并保存',
              message: '已作答的题目都已经保存，随时可以从考试中心继续。',
              onOk: function () { EP.session = null; goto('exam'); }
            });
          } else { EP.session = null; goto('exam'); }
          break;

        case 'fav-play':
          q = exam.get(idx); if (!q) break;
          exam.toggleFav(idx); fx.sfx.tap();
          a.textContent = q.fav ? '★ 已收藏' : '☆ 收藏';
          toast(q.fav ? '已加入收藏' : '已取消收藏');
          break;
        case 'note-play': notePrompt(idx, null); break;
        case 'skip':
          if (!EP.session) break;
          exam.flag(EP.session.ids[EP.session.i], true);
          toast('已跳过，稍后可在错题本找到');
          nextOrSettle();
          break;

        case 'wrong-filter': applyWrongFilter(a.dataset.f); break;
        case 'quick-close': closeModal(); break;
        case 'quick-prev': if (EP.quick && EP.quick.i > 0) { EP.quick.i--; renderQuick(); } break;
        case 'quick-next':
          if (EP.quick && EP.quick.i < EP.quick.ids.length - 1) { EP.quick.i++; renderQuick(); }
          else { closeModal(); toast('这一轮速览完成了'); }
          break;
        case 'quick-fav':
          if (!EP.quick) break;
          exam.toggleFav(EP.quick.ids[EP.quick.i]); renderQuick();
          break;
      }
    });

    // 文件导入
    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'exam-import-file') {
        var file = e.target.files[0]; if (!file) return;
        var rd = new FileReader();
        rd.onload = function () {
          var data;
          try { data = JSON.parse(rd.result); } catch (err) { toast('文件不是有效的 JSON', 'err'); return; }
          exam.importData(data).then(function () { toast('学习数据已导入'); repaint(); })
            .catch(function () { toast('这个文件里没有可识别的题库数据', 'err'); });
        };
        rd.readAsText(file);
        e.target.value = '';
      }
    });

    // 答题页键盘快捷键
    document.addEventListener('keydown', function (e) {
      if (!EP.session) return;
      var pp = document.getElementById('page-examPlay');
      if (!pp || pp.hidden) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey) return;
      if (document.querySelector('.overlay')) return;
      var k = e.key.toUpperCase();
      if ('ABCDEF'.indexOf(k) >= 0) { pick(k); e.preventDefault(); }
      else if (k === 'T' || k === 'Y' || k === '1') { pick('T'); e.preventDefault(); }
      else if (k === 'F' || k === 'N' || k === '2') { pick('F'); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        var btn = $('.play__submit');
        if (btn && !btn.disabled) { btn.click(); e.preventDefault(); }
      }
    });
    function pick(k) {
      var b = document.querySelector('.play [data-opt="' + k + '"]');
      if (b && !b.classList.contains('is-locked')) b.click();
    }
  }
  function closeModal() {
    var r = document.getElementById('modal-root');
    if (r) r.innerHTML = '';
    document.body.style.overflow = '';
  }

  function applyWrongFilter(f) {
    EP.wrongFilter = f;
    document.querySelectorAll('[data-ea="wrong-filter"]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.f === f); });
    var box = $('.exam-qlist'); if (!box) return;
    var list = filterWrong(f);
    box.innerHTML = list.length ? list.map(qItem).join('') : emptyState('这个分类下暂时没有题目');
  }
  function filterWrong(f) {
    var list = exam.all().filter(function (q) { return q.inWrong; });
    if (f === '3') return exam.all().filter(function (q) { return q.mastered; });
    if (f && f !== 'all') list = list.filter(function (q) { return String(q.wrongStage) === String(f); });
    return list.sort(function (a, b) { return (b.errors - a.errors) || (b.lastAnswered - a.lastAnswered); });
  }

  function doMock() {
    var cfg = {
      single: Number($('#mk-single').value) || 0,
      judge: Number($('#mk-judge').value) || 0,
      multi: Number($('#mk-multi').value) || 0,
      time: Number($('#mk-time').value) || 30,
      goal: Number($('#mk-goal').value) || 80,
      shuffleQ: $('#mk-shufq').checked, shuffleOpt: $('#mk-shufo').checked,
      prioritizeWrong: $('#mk-pw').checked, excludeMastered: $('#mk-em').checked
    };
    if (cfg.single + cfg.judge + cfg.multi < 1) { toast('请至少设置一种题型数量', 'warn'); return; }
    startMock(cfg);
  }

  function saveSettingsFromForm() {
    exam.saveSettings({
      examDate: $('#set-date').value,
      dailyMinutes: Number($('#set-min').value) || 60,
      groupSize: Number($('#set-group').value) || 10,
      includeCorrect: $('#set-inc').checked,
      prioritizeWrong: $('#set-pw').checked,
      sound: $('#set-sound').checked
    });
    fx.setMuted(!$('#set-sound').checked);
    toast('设置已保存');
  }
  function doExport() {
    var data = exam.exportData();
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'questly-exam-' + exam.meta().lastStudyDate + '.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('已导出学习数据');
  }
  function notePrompt(idx) {
    var q = exam.get(idx); if (!q) return;
    var api = ui.modal(
      '<div class="modal" data-note-idx="' + idx + '">' +
        '<div class="modal__head"><span class="sec-icon sec-icon--brand">' + I.note + '</span><h3>我的笔记</h3><button class="iconbtn" data-close>' + I.x + '</button></div>' +
        '<div class="modal__body">' +
          '<div class="ai__summary" style="font-size:12.5px">' + esc(q.q.slice(0, 60)) + (q.q.length > 60 ? '…' : '') + '</div>' +
          '<div class="field"><label>记忆口诀 / 易错提醒</label>' +
          '<textarea id="exam-note-ta" rows="4" placeholder="例如：三同时 = 同时设计、同时施工、同时投入使用">' + esc(q.note || '') + '</textarea></div>' +
        '</div>' +
        '<div class="modal__foot">' +
          '<button class="btn btn--ghost" data-close>取消</button>' +
          '<button class="btn btn--primary" id="exam-note-ok">保存笔记</button>' +
        '</div>' +
      '</div>'
    );
    var ta = api.find('#exam-note-ta');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    var ok = api.find('#exam-note-ok');
    if (ok) ok.addEventListener('click', function () {
      var v = ta ? ta.value.trim() : '';
      exam.setNote(idx, v, 'note');
      api.close();
      toast(v ? '笔记已保存' : '笔记已清空');
      repaint();
      // 答题页里同步一下按钮态
      var b = document.querySelector('[data-ea="note-play"][data-idx="' + idx + '"]');
      if (b) b.textContent = v ? '✎ 已记笔记' : '✎ 笔记';
    });
  }

  function handlePlayClick(e) {
    var opt = e.target.closest('[data-opt]');
    if (opt) {
      var s = EP.session; if (!s) return;
      if (opt.classList.contains('is-locked')) return; // 已提交，锁定
      var k = opt.getAttribute('data-opt');
      var q = exam.get(s.ids[s.i]);
      s.sel = s.sel || [];
      fx.sfx.tap();
      if (q.type === 'multi') {
        var i = s.sel.indexOf(k);
        if (i >= 0) s.sel.splice(i, 1); else s.sel.push(k);
        opt.classList.toggle('is-sel');
      } else {
        s.sel = [k];
        document.querySelectorAll('.play__opt,.play__judge-btn').forEach(function (b) { b.classList.remove('is-sel'); });
        opt.classList.add('is-sel');
      }
      var ok = $('.play__submit');
      if (ok) ok.disabled = s.sel.length === 0;
      return;
    }
    var sub = e.target.closest('[data-submit]');
    if (sub) {
      if (sub.hasAttribute('data-next')) nextOrSettle();
      else submitCurrent();
    }
  }

  /* ============ 注册到全局渲染 ============ */
  Q.epages = {
    renderExam: renderExam, renderPlay: renderPlay, bind: bind,
    startSession: startSession, startBoss: startBoss, showQuick: showQuick,
    repaint: repaint,
    setTab: function (t) { EP.tab = t; },
    hasSession: function () { return !!EP.session; }
  };
  if (Q.pages && Q.pages.render) {
    Q.pages.render.exam = function () { return renderExam(); };
    Q.pages.render.examPlay = function () { return renderPlay(); };
  }
  // 图标（由 ui.I 提供，缺失时退回 emoji）
  var I = Object.assign(
    { bolt: '⚡', shield: '🛡', target: '🎯', down: '↓', up: '↑', wand: '✨', note: '📝', x: '✕' },
    (Q.ui && Q.ui.I) || {}
  );

  // 限时计时器（Boss / 模拟考）
  setInterval(function () {
    var s = EP.session;
    if (!s || !s.timed || s.settled) return;
    var t = document.getElementById('play-timer');
    if (!t) return;
    s.remain--;
    t.textContent = '⏱ ' + fmtClock(s.remain);
    t.classList.toggle('is-urgent', s.remain <= 60);
    if (s.remain <= 0) { toast('时间到，进入结算', 'warn'); showSettlement(); }
  }, 1000);

})(window);
