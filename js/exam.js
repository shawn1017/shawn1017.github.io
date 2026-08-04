/* Questly 考试闯关系统 — 数据 / 逻辑层
 * 题库与答题记录存 IndexedDB；界面设置在 localStorage。
 * 考试 XP 复用同一套等级系统 (Q.store.addXp)。 */
(function (global) {
  var Q = global.Q = global.Q || {};
  var store = Q.store, fx = Q.fx;
  var DB = 'questly-exam-v1', dbp = null;

  /* ---------- IndexedDB helpers ---------- */
  function openDB() {
    return new Promise(function (res, rej) {
      if (dbp) return res(dbp);
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains('questions')) db.createObjectStore('questions', { keyPath: 'idx' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
      };
      r.onsuccess = function () { dbp = r.result; res(dbp); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function obj(store, mode) { return dbp.transaction(store, mode).objectStore(store); }
  function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }

  /* ---------- runtime state ---------- */
  function blankMeta() {
    return {
      k: 'main', combo: 0, comboBest: 0, examXp: 0, studyStreak: 0,
      lastStudyDate: null, history: {}, unlocked: {},
      bossDone: false, bossBestRate: 0, star3: false
    };
  }
  // meta 先给默认值，保证 IndexedDB 就绪前渲染也不会崩
  var S = {
    list: [], map: {}, meta: blankMeta(), ready: null, loaded: false,
    settings: loadSettings()
  };

  var DEFAULT_SETTINGS = {
    examDate: '2026-08-05',
    dailyMinutes: 60,
    groupSize: 10,
    includeCorrect: false,
    prioritizeWrong: true,
    sound: false
  };
  var LS_KEY = 'questly-exam-settings';
  function loadSettings() {
    try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); }
    catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
  }
  function saveSettings(s) { S.settings = Object.assign({}, S.settings, s); localStorage.setItem(LS_KEY, JSON.stringify(S.settings)); }

  /* ---------- exam achievements ---------- */
  var ACH = [
    { id: 'ex_first', icon: '🎯', name: '初次答题', desc: '完成第一道题', goal: 1, get: function (d) { return d.answered; } },
    { id: 'ex_d10', icon: '🌱', name: '小试身手', desc: '完成 10 道题', goal: 10, get: function (d) { return d.answered; } },
    { id: 'ex_d50', icon: '🔥', name: '渐入佳境', desc: '完成 50 道题', goal: 50, get: function (d) { return d.answered; } },
    { id: 'ex_d100', icon: '💯', name: '百题挑战', desc: '完成 100 道题', goal: 100, get: function (d) { return d.answered; } },
    { id: 'ex_judge', icon: '✅', name: '判断题达人', desc: '完成全部判断题', goal: 1, get: function (d) { return d.judgeTotal && d.judgeAnswered >= d.judgeTotal; } },
    { id: 'ex_multi', icon: '🧩', name: '多选题突破', desc: '完成全部多选题', goal: 1, get: function (d) { return d.multiTotal && d.multiAnswered >= d.multiTotal; } },
    { id: 'ex_wrong20', icon: '🧹', name: '错题清理员', desc: '掌握 20 道错题', goal: 20, get: function (d) { return d.masteredWrong; } },
    { id: 'ex_combo10', icon: '⚡', name: '十连胜', desc: '连续答对 10 题', goal: 10, get: function (d) { return d.comboBest; } },
    { id: 'ex_all404', icon: '🏅', name: '全题库巡查', desc: '完成全部 404 题', goal: 404, get: function (d) { return d.answered; } },
    { id: 'ex_star3', icon: '🌟', name: '三星通关', desc: '任意关卡获得三星', goal: 1, get: function (d) { return d.star3; } },
    { id: 'ex_boss1', icon: '🛡️', name: 'Boss挑战者', desc: '完成第一次 Boss 战', goal: 1, get: function (d) { return d.bossDone; } },
    { id: 'ex_boss90', icon: '👑', name: 'Boss终结者', desc: 'Boss 战正确率 90%', goal: 90, get: function (d) { return d.bossBestRate; } }
  ];

  /* ---------- helpers ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function key(q) { return q.type === 'judge' ? q.answer[0] : q.answer.slice().sort().join(''); }
  function uaKey(ua, type) { return type === 'judge' ? (ua[0] || '') : ua.slice().sort().join(''); }
  function isCorrect(q, ua) { return uaKey(ua, q.type) === key(q); }
  function dayMs() { return 86400000; }
  function dateKeyFrom(d) { var x = new Date(d); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate(); }
  function todayKey() { return dateKeyFrom(Date.now()); }

  /* ---------- seeding ---------- */
  function seed(force) {
    return openDB().then(function () {
      return reqP(obj('questions', 'count'));
    }).then(function (cnt) {
      if (cnt > 0 && !force) return null;
      var bank = global.QUESTLY_BANK_DATA;
      if (!bank) return null;
      var items = bank.questions.map(function (q) {
        return extendRec(Object.assign({}, q));
      });
      var tx = dbp.transaction('questions', 'readwrite');
      items.forEach(function (it) { tx.objectStore('questions').put(it); });
      return new Promise(function (res) { tx.oncomplete = function () { res(items.length); }; tx.onerror = function () { res(0); }; });
    });
  }
  function extendRec(q) {
    q.answered = false; q.userAnswer = []; q.firstCorrect = false;
    q.attempts = 0; q.errors = 0; q.fav = false; q.inWrong = false;
    q.consecutiveCorrect = 0; q.mastered = false; q.wrongStage = 0;
    q.lastAnswered = 0; q.note = ''; q.noteTag = ''; q.flag = false;
    q.status = 'new';
    var optKeys = (q.options || []).map(function (o) { return o.key; });
    q.needsReview = !q.answer || !q.answer.length ||
      (q.type !== 'judge' && (!q.options || q.options.length === 0)) ||
      (q.type !== 'judge' && q.answer.some(function (a) { return optKeys.indexOf(a) < 0; }));
    return q;
  }

  /* ---------- load ---------- */
  function loadAll() {
    return openDB().then(function () {
      return Promise.all([reqP(obj('questions', 'getAll')), reqP(obj('meta', 'get').apply(null, ['main']))]);
    }).then(function (r) {
      var qs = r[0], meta = r[1];
      S.list = qs; S.map = {};
      qs.forEach(function (q) { S.map[q.idx] = q; });
      S.meta = meta || blankMeta();
      if (!S.meta.history) S.meta.history = {};
      if (!S.meta.unlocked) S.meta.unlocked = {};
      S.loaded = true;
      return saveMeta();
    });
  }
  function saveMeta() {
    if (!S.persist) { flushFallback(); return Promise.resolve(); }
    return openDB().then(function () { return reqP(obj('meta', 'readwrite').put(S.meta)); })
      .catch(function () { S.persist = false; flushFallback(); });
  }
  function saveRec(q) {
    if (!S.persist) { flushFallback(); return Promise.resolve(); }
    return openDB().then(function () { return reqP(obj('questions', 'readwrite').put(q)); })
      .catch(function () { S.persist = false; flushFallback(); });
  }

  /* ---------- 降级持久化（IndexedDB 不可用时） ----------
     只存"作答状态"这一小块，题干本身从 bank.js 重新加载，体积很小。 */
  var FB_KEY = 'questly-exam-fallback';
  var fbTimer = null;
  function flushFallback() {
    clearTimeout(fbTimer);
    fbTimer = setTimeout(function () {
      try {
        var recs = {};
        S.list.forEach(function (q) {
          if (!q.answered && !q.fav && !q.note && !q.flag) return;
          recs[q.idx] = [q.answered ? 1 : 0, q.firstCorrect ? 1 : 0, q.attempts, q.errors,
            q.fav ? 1 : 0, q.inWrong ? 1 : 0, q.consecutiveCorrect, q.mastered ? 1 : 0,
            q.wrongStage, q.lastAnswered, q.note || '', q.flag ? 1 : 0];
        });
        localStorage.setItem(FB_KEY, JSON.stringify({ meta: S.meta, recs: recs }));
      } catch (e) { /* 存储配额不足时静默降级为纯内存 */ }
    }, 300);
  }
  function readFallback() {
    try {
      var raw = localStorage.getItem(FB_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function applyRec(q, a) {
    q.answered = !!a[0]; q.firstCorrect = !!a[1]; q.attempts = a[2] || 0; q.errors = a[3] || 0;
    q.fav = !!a[4]; q.inWrong = !!a[5]; q.consecutiveCorrect = a[6] || 0; q.mastered = !!a[7];
    q.wrongStage = a[8] || 0; q.lastAnswered = a[9] || 0; q.note = a[10] || ''; q.flag = !!a[11];
  }
  function fallbackMemory() {
    S.persist = false;
    var bank = global.QUESTLY_BANK_DATA;
    S.list = bank && bank.questions ? bank.questions.map(function (q) { return extendRec(Object.assign({}, q)); }) : [];
    S.map = {};
    S.list.forEach(function (q) { S.map[q.idx] = q; });
    // 优先级：localStorage 已存数据 > 文件内嵌的可携带快照 > 空白
    var src = readFallback() || global.QUESTLY_SAVED_STATE || null;
    if (src) {
      if (src.meta) S.meta = Object.assign(blankMeta(), src.meta);
      if (src.settings) saveSettings(src.settings);
      var recs = src.recs || {};
      Object.keys(recs).forEach(function (k) {
        var q = S.map[k] || S.map[Number(k)]; if (!q) return;
        applyRec(q, recs[k]);
      });
    } else {
      S.meta = blankMeta();
    }
    S.loaded = true;
    flushFallback(); // 立即写回 localStorage，后续打开以 localStorage 为准（内嵌快照仅首次生效）
    return S;
  }

  function init() {
    if (S.ready) return S.ready;
    // 带「可携带数据」的文件（发到手机用的版本）：跳过 IndexedDB，直接以 localStorage 持久化，
    // 保证在手机 file:// 上也能原样还原进度，且后续改动不丢失。
    if (global.QUESTLY_SAVED_STATE) { S.ready = Promise.resolve(fallbackMemory()); return S.ready; }
    S.persist = true;
    S.ready = seed(false).then(loadAll).then(function () {
      if (!S.list.length) throw new Error('empty');
      checkAch();
      return S;
    }).catch(function () {
      // IndexedDB 被禁用 / 隐私模式 / file:// 限制 → 退回内存 + localStorage 模式
      fallbackMemory();
      checkAch();
      return S;
    });
    return S.ready;
  }

  /* ---------- counts & stats ---------- */
  function counts() {
    var c = { total: S.list.length, single: 0, judge: 0, multi: 0, answered: 0, correct: 0, wrong: 0, fav: 0, masteredWrong: 0, judgeTotal: 0, judgeAnswered: 0, multiTotal: 0, multiAnswered: 0, combo: S.meta.combo, comboBest: S.meta.comboBest, examXp: S.meta.examXp, star3: S.meta.star3, bossDone: S.meta.bossDone, bossBestRate: S.meta.bossBestRate, needsReview: 0 };
    S.list.forEach(function (q) {
      if (q.type === 'single') c.single++;
      if (q.type === 'judge') { c.judgeTotal++; if (q.answered) c.judgeAnswered++; }
      if (q.type === 'multi') { c.multiTotal++; if (q.answered) c.multiAnswered++; }
      if (q.answered) { c.answered++; if (q.firstCorrect) c.correct++; }
      if (q.inWrong) c.wrong++;
      if (q.fav) c.fav++;
      if (q.mastered) c.masteredWrong++;
      if (q.needsReview) c.needsReview++;
    });
    c.accuracy = c.answered ? Math.round(c.correct / c.answered * 100) : 0;
    c.firstCorrectRate = c.answered ? Math.round(c.correct / c.answered * 100) : 0;
    return c;
  }

  function importReport() {
    var c = counts();
    var dup = 0; var seen = {};
    S.list.forEach(function (q) { seen[q.q] = (seen[q.q] || 0) + 1; });
    Object.keys(seen).forEach(function (k) { if (seen[k] > 1) dup++; });
    var missingAnswer = S.list.filter(function (q) { return !q.answer || !q.answer.length; }).length;
    return {
      total: c.total, single: c.single, judge: c.judge, multi: c.multi,
      needsReview: c.needsReview, missingAnswer: missingAnswer, duplicates: dup,
      answered: c.answered, correct: c.correct, accuracy: c.accuracy
    };
  }

  /* ---------- 备考指数 ---------- */
  function prepIndex() {
    var c = counts();
    var completion = c.total ? c.answered / c.total : 0;
    var fcr = c.answered ? c.correct / c.answered : 0;
    var wrongTotal = S.list.filter(function (q) { return q.inWrong || (q.needsReview); }).length;
    var reviewed = S.list.filter(function (q) { return q.mastered; }).length;
    var wrongComp = wrongTotal ? reviewed / wrongTotal : 1;
    var h = S.meta.history[todayKey()];
    var recent = h && h.done > 0 ? 1 : 0;
    if (S.meta.lastStudyDate) {
      var diff = Math.round((Date.now() - new Date(S.meta.lastStudyDate).getTime()) / dayMs());
      if (diff <= 2) recent = 1; else if (diff <= 7) recent = 0.5;
    }
    var score = completion * 40 + fcr * 30 + wrongComp * 20 + recent * 10;
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  function prepStatus(v) {
    if (v >= 95) return '全题库通关';
    if (v >= 85) return '准备充分';
    if (v >= 70) return '冲刺阶段';
    if (v >= 50) return '进入状态';
    if (v >= 30) return '正在积累';
    return '刚刚开始';
  }

  /* ---------- 倒计时 ---------- */
  function parseExamDate() {
    var d = new Date(S.settings.examDate + 'T09:00:00');
    if (isNaN(d.getTime())) d = new Date(DEFAULT_SETTINGS.examDate + 'T09:00:00');
    if (isNaN(d.getTime())) d = new Date(Date.now() + 30 * dayMs());
    return d;
  }
  function examCountdown() {
    var target = parseExamDate();
    var now = Date.now();
    var diff = Math.max(0, target - now);
    var days = Math.floor(diff / dayMs());
    var hours = Math.floor((diff % dayMs()) / 3600000);
    return { days: days, hours: hours, ms: diff };
  }
  function daysLeft() {
    var target = parseExamDate();
    var now = Date.now();
    return Math.max(0, Math.ceil((target - now) / dayMs()));
  }

  /* ---------- 关卡地图 ---------- */
  function levelMap() {
    var defs = [
      [1, '安全生产法律法规'], [2, '安全生产责任与管理'], [3, '隐患排查与一线三排'],
      [4, '消防安全'], [5, '电气与触电安全'], [6, '机械与作业现场安全'],
      [7, '高处作业与有限空间'], [8, '职业病与劳动防护'], [9, '工伤保险与从业人员权益'],
      [10, '应急救援与事故处理']
    ];
    var levels = defs.map(function (d) {
      var qs = S.list.filter(function (q) { return q.cat === d[0]; });
      return buildLevel(d[0] + '', d[1], qs);
    });
    levels.push(buildLevel('11', '综合判断题挑战', S.list.filter(function (q) { return q.type === 'judge'; })));
    levels.push(buildLevel('12', '多选题终极挑战', S.list.filter(function (q) { return q.type === 'multi'; })));
    return levels;
  }
  function buildLevel(id, name, qs) {
    var total = qs.length, done = 0, correct = 0;
    var weak = {};
    qs.forEach(function (q) { if (q.answered) { done++; if (q.firstCorrect) correct++; } if (q.inWrong) weak[q.catName] = (weak[q.catName] || 0) + 1; });
    var rate = done ? Math.round(correct / done * 100) : 0;
    var allWrong = qs.filter(function (q) { return q.inWrong; });
    var stars = 0;
    if (done === total && total) stars = 1;
    if (stars && rate >= 80) stars = 2;
    if (stars === 2 && rate >= 90 && allWrong.length === 0) stars = 3;
    if (stars === 3) S.meta.star3 = true;
    var weakArr = Object.keys(weak).map(function (k) { return { name: k, n: weak[k] }; }).sort(function (a, b) { return b.n - a.n; });
    return { id: id, name: name, total: total, done: done, rate: rate, stars: stars, weak: weakArr.slice(0, 3), unlocked: true };
  }

  /* ---------- 每日计划 ---------- */
  function dailyPlan() {
    var c = counts();
    var remaining = c.total - c.answered;
    var dl = daysLeft();
    if (!isFinite(dl) || dl < 1) dl = 1;
    var base = remaining > 0 ? Math.max(1, Math.ceil(remaining / Math.max(1, dl))) : 0;
    if (!isFinite(base)) base = 0;
    var g = S.settings.groupSize || 10;
    var parts = [
      { label: '上午', n: Math.round(base * 0.35) },
      { label: '午间', n: Math.round(base * 0.3) },
      { label: '晚间', n: Math.round(base * 0.25) },
      { label: '睡前错题', n: Math.max(0, base - Math.round(base * 0.9)) }
    ];
    parts.forEach(function (p) { if (!isFinite(p.n) || p.n < 0) p.n = 0; });
    var sum = parts.reduce(function (a, p) { return a + p.n; }, 0);
    if (sum < base) parts[2].n += base - sum;
    return { target: base, group: g, parts: parts, minutes: S.settings.dailyMinutes || 60 };
  }

  /* ---------- 选下一题 ---------- */
  function pickNext(opts) {
    opts = opts || {};
    var pool = S.list.slice();
    if (opts.type) pool = pool.filter(function (q) { return q.type === opts.type; });
    if (opts.cat) pool = pool.filter(function (q) { return q.cat === opts.cat; });
    if (opts.scope) {
      if (opts.scope === 'wrong') pool = pool.filter(function (q) { return q.inWrong; });
      else if (opts.scope === 'fav') pool = pool.filter(function (q) { return q.fav; });
      else if (opts.scope === 'unmastered') pool = pool.filter(function (q) { return !q.mastered; });
    }
    if (S.settings.prioritizeWrong && !opts.includeCorrect) {
      var w = pool.filter(function (q) { return q.inWrong; });
      if (w.length) pool = w;
      else if (!opts.includeCorrect) pool = pool.filter(function (q) { return !q.answered; });
    } else if (!opts.includeCorrect) {
      pool = pool.filter(function (q) { return !q.answered; });
    }
    pool = pool.filter(function (q) { return !(q.needsReview && !opts.force); });
    if (!pool.length && opts.includeCorrect) pool = S.list.filter(function (q) { return !q.needsReview; });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)].idx;
  }

  /* ---------- 答题 ---------- */
  function answer(idx, ua) {
    var q = S.map[idx]; if (!q) return null;
    var correct = isCorrect(q, ua);
    var firstAttempt = !q.answered;
    var xp = 0;
    q.attempts++;
    q.lastAnswered = Date.now();
    q.userAnswer = ua.slice();
    q.answered = true;
    if (correct) {
      q.consecutiveCorrect = (q.consecutiveCorrect || 0) + 1;
      if (firstAttempt) { q.firstCorrect = true; q.status = 'learning'; xp = 5; }
      else if (q.inWrong) { xp = 2; }
      else { xp = 1; }
      if (q.inWrong && q.consecutiveCorrect >= 2) { q.mastered = true; q.inWrong = false; q.wrongStage = 3; q.status = 'mastered'; }
      else if (q.inWrong) { q.wrongStage = q.consecutiveCorrect; }
    } else {
      q.consecutiveCorrect = 0;
      q.errors++;
      if (!q.firstCorrect) q.firstCorrect = false;
      q.inWrong = true; q.wrongStage = 0; q.status = 'learning';
    }
    // combo
    if (correct) { S.meta.combo++; if (S.meta.combo > S.meta.comboBest) S.meta.comboBest = S.meta.combo; }
    else { S.meta.combo = 0; }
    // xp to shared system
    if (xp) store.addXp(xp, 'exam');
    S.meta.examXp += xp;
    // daily history
    var k = todayKey();
    var h = S.meta.history[k] || (S.meta.history[k] = { done: 0, correct: 0, firstCorrect: 0, errors: 0, mastered: 0, xp: 0, weak: {} });
    h.done++; if (correct) { h.correct++; if (firstAttempt) h.firstCorrect++; } else h.errors++;
    h.xp += xp; if (q.inWrong && q.mastered && !h._mc) { h.mastered++; h._mc = true; }
    if (!h.weak[q.catName]) h.weak[q.catName] = 0; if (!correct) h.weak[q.catName]++;
    // study streak
    if (!S.meta.lastStudyDate || dateKeyFrom(S.meta.lastStudyDate) !== k) {
      if (S.meta.lastStudyDate && Math.round((Date.now() - new Date(S.meta.lastStudyDate).getTime()) / dayMs()) === 1) S.meta.studyStreak++;
      else if (!S.meta.lastStudyDate) S.meta.studyStreak = 1;
      else if (dateKeyFrom(S.meta.lastStudyDate) !== k) S.meta.studyStreak = 1;
      S.meta.lastStudyDate = Date.now();
    }
    var unlocked = checkAch();
    saveRec(q); saveMeta();
    return {
      correct: correct, xp: xp, combo: S.meta.combo, comboBest: S.meta.comboBest,
      comboBroken: !correct, firstAttempt: firstAttempt, unlocked: unlocked,
      leveledUp: false, q: q
    };
  }

  /* ---------- 成就 ---------- */
  function checkAch() {
    var c = counts(); c.star3 = S.meta.star3; c.bossDone = S.meta.bossDone; c.bossBestRate = S.meta.bossBestRate;
    var newly = [];
    ACH.forEach(function (a) {
      var v = a.get(c);
      if (v >= a.goal && !S.meta.unlocked[a.id]) { S.meta.unlocked[a.id] = Date.now(); newly.push(a); }
    });
    if (newly.length) saveMeta();
    return newly;
  }

  /* ---------- Boss / 模拟考 / 速览 ---------- */
  function bossSession() {
    var pool = S.list.filter(function (q) { return !q.needsReview; });
    var wrong = shuffle(pool.filter(function (q) { return q.inWrong; }));
    var unans = shuffle(pool.filter(function (q) { return !q.answered; }));
    var rest = shuffle(pool.filter(function (q) { return !q.inWrong && q.answered; }));
    var pick = [];
    function take(arr, n) { while (n-- > 0 && arr.length) pick.push(arr.shift().idx); }
    take(wrong, 10); take(unans, 7); take(rest, 3);
    if (pick.length < 20) { var s = shuffle(pool.map(function (q) { return q.idx; })); take(s, 20 - pick.length); }
    return shuffle(pick).slice(0, 20);
  }
  function mockSession(cfg) {
    cfg = cfg || {};
    var out = [];
    function take(type, n) {
      var pool = S.list.filter(function (q) { return q.type === type && !q.needsReview; });
      if (cfg.prioritizeWrong) pool.sort(function (a, b) { return (b.inWrong ? 1 : 0) - (a.inWrong ? 1 : 0); });
      if (cfg.excludeMastered) pool = pool.filter(function (q) { return !q.mastered; });
      pool = shuffle(pool);
      for (var i = 0; i < n && i < pool.length; i++) {
        var q = pool[i];
        var order = q.options.map(function (o) { return o.key; });
        if (cfg.shuffleOpt && q.type !== 'judge') order = shuffle(order);
        out.push({ idx: q.idx, order: order });
      }
    }
    take('single', cfg.single || 0); take('judge', cfg.judge || 0); take('multi', cfg.multi || 0);
    if (cfg.shuffleQ) out = shuffle(out);
    return out;
  }
  function quickSet(kind) {
    var list;
    if (kind === 'recentWrong') list = S.list.filter(function (q) { return q.inWrong; }).sort(function (a, b) { return (b.lastAnswered || 0) - (a.lastAnswered || 0); });
    else if (kind === 'freqWrong') list = S.list.filter(function (q) { return q.inWrong; }).sort(function (a, b) { return b.errors - a.errors; });
    else if (kind === 'fav') list = S.list.filter(function (q) { return q.fav; });
    else if (kind === 'multi') list = S.list.filter(function (q) { return q.type === 'multi' && !q.needsReview; });
    else if (kind === 'unmastered') list = S.list.filter(function (q) { return q.inWrong; });
    else { // pre10 考前10分钟速览
      var kw = ['罚款', '拘留', '年', '万元', '期限', '责任', '不得', '应当', '必须', '标准', '%'];
      list = S.list.filter(function (q) {
        if (q.fav) return true;
        if (q.inWrong) return true;
        if (q.type === 'judge' && /不|错误|误/.test(q.q)) return true;
        return kw.some(function (k) { return q.q.indexOf(k) >= 0; });
      }).slice(0, 20);
    }
    return list.map(function (q) { return q.idx; });
  }

  /* ---------- AI 考试教练（本地规则） ---------- */
  function aiCoach(kind, ctx) {
    var c = counts();
    if (kind === 'todayPlan') {
      var p = dailyPlan();
      return { title: '今日学习任务', source: 'local',
        lines: ['距离考试还有 ' + examCountdown().days + ' 天，今日目标：完成 ' + p.target + ' 题。',
          p.parts.map(function (x) { return '· ' + x.label + '：' + x.n + ' 题'; }).join('\n'),
          '建议优先复习错题（当前错题 ' + c.wrong + ' 道），再推进未做题。'] };
    }
    if (kind === 'weak') {
      var h = S.meta.history[todayKey()];
      var w = h ? Object.keys(h.weak).sort(function (a, b) { return h.weak[b] - h.weak[a]; }) : [];
      return { title: '薄弱知识点', source: 'local',
        lines: w.length ? w.slice(0, 5).map(function (k) { return '· ' + k + '：今日错 ' + h.weak[k] + ' 题'; }) : ['暂无明显薄弱点，继续保持！'] };
    }
    if (kind === 'order') {
      var lv = levelMap().filter(function (l) { return l.done < l.total; }).sort(function (a, b) { return (a.done / a.total) - (b.done / b.total); });
      return { title: '建议复习顺序', source: 'local',
        lines: lv.slice(0, 5).map(function (l, i) { return (i + 1) + '. ' + l.name + '（' + l.done + '/' + l.total + '）'; }) };
    }
    if (kind === 'summary') {
      var hh = S.meta.history[todayKey()];
      return { title: '今日表现', source: 'local',
        lines: hh ? ['完成 ' + hh.done + ' 题，正确率 ' + (hh.done ? Math.round(hh.correct / hh.done * 100) : 0) + '%，获得 ' + hh.xp + ' XP。',
          hh.errors ? '错题 ' + hh.errors + ' 道，记得睡前复习。' : '今日零失误，状态很好！'] :
          ['今天还没开始答题，先完成最小一组 ' + (S.settings.groupSize || 10) + ' 题吧。'] };
    }
    if (kind === 'similar' && ctx && ctx.idx != null) {
      var q = S.map[ctx.idx];
      var sim = S.list.filter(function (x) { return x.idx !== q.idx && (x.cat === q.cat || (x.q.indexOf(q.q.slice(0, 6)) >= 0)); }).slice(0, 5);
      return { title: '相似题目', source: 'local',
        lines: sim.length ? sim.map(function (x) { return '· ' + x.q.slice(0, 24) + '…'; }) : ['暂未找到相似题目。'] };
    }
    if (kind === 'explain' && ctx && ctx.idx != null) {
      var qq = S.map[ctx.idx];
      var lines = [];
      if (qq.explain) lines.push('【原题库解析】' + qq.explain);
      if (qq.note) lines.push('【你的笔记】' + qq.note);
      lines.push('【AI辅助说明】此题属于「' + qq.catName + '」，正确答案：' + (qq.type === 'judge' ? (qq.answer[0] === 'T' ? '正确' : '错误') : qq.answer.join('、')) + '。请以培训教材和正式考试要求为准。');
      return { title: '题目解析', source: 'local', lines: lines };
    }
    return { title: 'AI 考试教练', source: 'local', lines: ['当前为本地分析模式，已根据你的答题记录整理学习建议。'] };
  }

  /* ---------- 收藏 / 笔记 / 标记 ---------- */
  function toggleFav(idx) { var q = S.map[idx]; if (!q) return; q.fav = !q.fav; saveRec(q); }
  function setNote(idx, note, tag) { var q = S.map[idx]; if (!q) return; q.note = note || ''; q.noteTag = tag || ''; saveRec(q); }
  function flag(idx, v) { var q = S.map[idx]; if (!q) return; q.flag = (v == null) ? !q.flag : v; saveRec(q); }

  /* ---------- 导入导出 / 重置 ---------- */
  function exportData() {
    return { version: 1, exportedAt: Date.now(), settings: S.settings, meta: S.meta, questions: S.list };
  }
  // 仅导出「作答状态」这一小块（题干始终从 bank 重新加载），体积很小，可写回文件实现可携带。
  function buildRecs() {
    var recs = {};
    S.list.forEach(function (q) {
      if (!q.answered && !q.fav && !q.note && !q.flag) return;
      recs[q.idx] = [q.answered ? 1 : 0, q.firstCorrect ? 1 : 0, q.attempts, q.errors,
        q.fav ? 1 : 0, q.inWrong ? 1 : 0, q.consecutiveCorrect, q.mastered ? 1 : 0,
        q.wrongStage, q.lastAnswered, q.note || '', q.flag ? 1 : 0];
    });
    return recs;
  }
  /* 生成「含当前数据的单文件」：把状态烘焙进当前 HTML 并下载，可直接发到手机。 */
  function exportPortable() {
    var payload = { meta: S.meta, recs: buildRecs(), settings: S.settings, exportedAt: Date.now() };
    var state = JSON.stringify(payload).replace(/</g, '\\u003c'); // 防止笔记里的 < 破坏 <script>
    var html = document.documentElement.outerHTML;
    // 去掉已有的内嵌快照，避免重复与陈旧
    html = html.replace(/<script>\s*window\.QUESTLY_SAVED_STATE[\s\S]*?<\/script>/i, '');
    var tag = '<script>window.QUESTLY_SAVED_STATE=' + state + ';<\/script>';
    // 必须注入到 <head> 内（在任何业务脚本之前），否则 init() 启动时还读不到快照
    html = html.replace(/<head[^>]*>/i, function (m) { return m + '\n' + tag; });
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'questly-我的闯关数据.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 1500);
    return html;
  }
  function importData(data) {
    if (!data || !data.questions) return Promise.reject(new Error('bad-file'));
    if (!S.persist) {
      S.list = data.questions; S.map = {};
      S.list.forEach(function (q) { S.map[q.idx] = q; });
      if (data.meta) S.meta = Object.assign(blankMeta(), data.meta);
      if (data.settings) saveSettings(data.settings);
      flushFallback();
      return Promise.resolve(true);
    }
    return openDB().then(function () {
      var tx = dbp.transaction('questions', 'readwrite');
      data.questions.forEach(function (q) { tx.objectStore('questions').put(q); });
      return new Promise(function (res) { tx.oncomplete = function () { res(true); }; });
    }).then(function () { if (data.meta) S.meta = data.meta; if (data.settings) saveSettings(data.settings); return loadAll(); });
  }
  function resetRecords() {
    S.list.forEach(function (q) { extendRec(q); });
    S.meta = blankMeta();
    if (!S.persist) { flushFallback(); return Promise.resolve(true); }
    return openDB().then(function () {
      var tx = dbp.transaction('questions', 'readwrite');
      S.list.forEach(function (q) { tx.objectStore('questions').put(q); });
      return new Promise(function (res) { tx.oncomplete = function () { res(true); }; });
    }).then(saveMeta);
  }
  function reimportBank() {
    if (!S.persist) { try { localStorage.removeItem(FB_KEY); } catch (e) {} fallbackMemory(); return Promise.resolve(true); }
    return seed(true).then(loadAll);
  }

  /* ---------- 供其他页面读取 ---------- */
  function history() { return S.meta.history || {}; }
  function todayStat() {
    var h = S.meta.history[todayKey()];
    var plan = dailyPlan();
    var done = h ? h.done : 0;
    return {
      done: done, correct: h ? h.correct : 0, errors: h ? h.errors : 0, xp: h ? h.xp : 0,
      rate: h && h.done ? Math.round(h.correct / h.done * 100) : 0,
      target: plan.target, pct: plan.target ? Math.min(100, Math.round(done / plan.target * 100)) : (done ? 100 : 0),
      finished: plan.target ? done >= plan.target : done > 0,
      streak: S.meta.studyStreak || 0
    };
  }
  function recentDays(n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(Date.now() - i * dayMs());
      var k = dateKeyFrom(d);
      var h = S.meta.history[k];
      out.push({ key: k, label: (d.getMonth() + 1) + '/' + d.getDate(), done: h ? h.done : 0, correct: h ? h.correct : 0, errors: h ? h.errors : 0, xp: h ? h.xp : 0 });
    }
    return out;
  }
  function recordBoss(rate) {
    S.meta.bossDone = true;
    if (rate > S.meta.bossBestRate) S.meta.bossBestRate = rate;
    var un = checkAch(); saveMeta();
    return un;
  }

  /* ---------- public ---------- */
  Q.exam = {
    init: init, counts: counts, importReport: importReport, prepIndex: prepIndex, prepStatus: prepStatus,
    examCountdown: examCountdown, daysLeft: daysLeft, levelMap: levelMap, dailyPlan: dailyPlan,
    pickNext: pickNext, answer: answer, bossSession: bossSession, mockSession: mockSession, quickSet: quickSet,
    aiCoach: aiCoach, toggleFav: toggleFav, setNote: setNote, flag: flag,
    settings: function () { return S.settings; }, saveSettings: saveSettings,
    get: function (i) { return S.map[i]; }, all: function () { return S.list; },
    exportData: exportData, exportPortable: exportPortable, importData: importData, resetRecords: resetRecords, reimportBank: reimportBank,
    recordBoss: recordBoss, achievements: ACH, meta: function () { return S.meta; },
    isCorrect: isCorrect, key: key, ACH: ACH,
    history: history, todayStat: todayStat, recentDays: recentDays,
    ready: function () { return S.loaded; },
    persisted: function () { return S.persist !== false; },
    todayKey: todayKey
  };
  Q.exam.EXAM_TITLES = ['安全学徒', '隐患观察员', '安全巡查员', '风险管理者', '应急先锋', '安全负责人', '安全守护者'];
  Q.exam.COMBO_TITLES = { 3: '小试身手', 5: '状态渐入', 10: '安全达人', 20: '知识连击', 30: '势不可挡' };
})(window);
