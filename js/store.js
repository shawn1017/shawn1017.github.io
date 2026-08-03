/* ============================================================
   store.js — 数据层：本地存储 / 任务模型 / 成长系统 / 成就
   全局命名空间：window.Q
   ============================================================ */
(function (global) {
  'use strict';

  var Q = global.Q || (global.Q = {});

  /* ---------------- 常量 ---------------- */
  var KEY = 'questly.v1';

  var XP = {
    urgent: 15,   // 紧急要办：击败精英怪
    today: 10,    // 今日挑战：标准 +10 XP
    inbox: 5,     // 灵感仓库：顺手完成
    clearBonus: 30,          // 今日通关奖励
    streakBonusPer: 5,       // 每连续一天额外奖励
    streakBonusMax: 50
  };

  var BUCKETS = {
    urgent: { id: 'urgent', name: '紧急要办', emoji: '🔥', desc: '必须马上处理的重要事项', tone: 'red' },
    today:  { id: 'today',  name: '今日挑战', emoji: '⚔️', desc: '今天要闯过的关卡',       tone: 'brand' },
    inbox:  { id: 'inbox',  name: '灵感仓库', emoji: '💡', desc: '想法、未来计划、暂不处理', tone: 'amber' }
  };

  var PRIORITIES = {
    p0: { id: 'p0', name: '紧急', color: '#EF4444', weight: 4 },
    p1: { id: 'p1', name: '高',   color: '#F97316', weight: 3 },
    p2: { id: 'p2', name: '中',   color: '#3B82F6', weight: 2 },
    p3: { id: 'p3', name: '低',   color: '#94A3B8', weight: 1 }
  };

  var TITLES = [
    '初来乍到', '见习行动派', '任务学徒', '效率新星', '节奏掌控者',
    '时间管理者', '高效执行官', '专注领主', '效率大师', '时间旅人', '传奇玩家'
  ];

  /* ---------------- 工具 ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function shiftDay(key, delta) {
    var p = key.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + delta);
    return dateKey(d);
  }

  function uid() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------------- 等级 ---------------- */
  // 升到下一级所需 XP：80 + (level-1) * 60
  function needFor(level) { return 80 + (level - 1) * 60; }

  function levelInfo(totalXp) {
    var lv = 1, rest = Math.max(0, totalXp | 0), need = needFor(1);
    while (rest >= need && lv < 999) {
      rest -= need;
      lv++;
      need = needFor(lv);
    }
    return {
      level: lv,
      title: TITLES[Math.min(lv - 1, TITLES.length - 1)],
      inLevel: rest,
      need: need,
      pct: Math.min(100, Math.round((rest / need) * 100)),
      totalXp: totalXp | 0
    };
  }

  /* ---------------- 成就定义 ---------------- */
  var ACHIEVEMENTS = [
    { id:'first_blood', icon:'🎯', name:'首次出击',   desc:'完成第一个任务',            goal:1,   get:function(s){return s.stats.totalCompleted;} },
    { id:'early_bird',  icon:'🌅', name:'早起达人',   desc:'在早上 9 点前完成 3 个任务', goal:3,   get:function(s){return s.stats.earlyCount;} },
    { id:'night_owl',   icon:'🌙', name:'夜猫子',     desc:'在晚上 22 点后完成任务',     goal:1,   get:function(s){return s.stats.nightCount;} },
    { id:'ai_learner',  icon:'🤖', name:'AI学习者',   desc:'使用 AI 效率助手 3 次',      goal:3,   get:function(s){return s.stats.aiUses;} },
    { id:'executor',    icon:'⚡', name:'高效执行者', desc:'单日完成 5 个任务',          goal:5,   get:function(s){return s.stats.maxDaily;} },
    { id:'firefighter', icon:'🚒', name:'救火队长',   desc:'完成 10 个紧急任务',         goal:10,  get:function(s){return s.stats.urgentDone;} },
    { id:'perfect_day', icon:'🏆', name:'完美通关',   desc:'单日 100% 通关一次',         goal:1,   get:function(s){return s.stats.perfectDays;} },
    { id:'streak3',     icon:'🔥', name:'三日连击',   desc:'连续 3 天完成任务',          goal:3,   get:function(s){return s.stats.maxStreak;} },
    { id:'streak7',     icon:'🔥', name:'一周不断',   desc:'连续 7 天完成任务',          goal:7,   get:function(s){return s.stats.maxStreak;} },
    { id:'streak30',    icon:'💎', name:'月度铁人',   desc:'连续 30 天完成任务',         goal:30,  get:function(s){return s.stats.maxStreak;} },
    { id:'collector',   icon:'💡', name:'灵感收集者', desc:'累计记录 15 条灵感',         goal:15,  get:function(s){return s.stats.inboxCreated;} },
    { id:'decisive',    icon:'🧹', name:'决断力',     desc:'把 10 条灵感迁移到今日挑战',  goal:10,  get:function(s){return s.stats.promoted;} },
    { id:'reviewer',    icon:'📝', name:'复盘达人',   desc:'完成 5 次每日复盘',          goal:5,   get:function(s){return s.stats.reviewCount;} },
    { id:'deep_work',   icon:'🧘', name:'深度工作',   desc:'完成一个预计 ≥ 90 分钟的任务', goal:1,  get:function(s){return s.stats.deepWork;} },
    { id:'xp1000',      icon:'⭐', name:'千级经验',   desc:'累计获得 1000 XP',           goal:1000,get:function(s){return s.stats.totalXpEarned;} },
    { id:'century',     icon:'🚀', name:'百战不殆',   desc:'累计完成 100 个任务',        goal:100, get:function(s){return s.stats.totalCompleted;} }
  ];

  /* ---------------- 默认状态 ---------------- */
  function defaults() {
    return {
      version: 1,
      meta: { lastDay: dateKey(), createdAt: Date.now(), seeded: false, tipsSeen: false },
      profile: { xp: 0, streak: 0 },
      stats: {
        totalCompleted: 0, totalXpEarned: 0, urgentDone: 0,
        earlyCount: 0, nightCount: 0, aiUses: 0, promoted: 0,
        inboxCreated: 0, reviewCount: 0, maxDaily: 0, perfectDays: 0,
        maxStreak: 0, deepWork: 0
      },
      tasks: [],
      history: {},        // 'YYYY-MM-DD' -> { done, xp, total }
      achievements: {},   // id -> timestamp
      reviews: [],        // { date, done, total, rate, summary, goals[] }
      daily: { date: dateKey(), cleared: false }
    };
  }

  /* ---------------- 种子数据 ---------------- */
  function seed(s) {
    var now = Date.now();
    var t = new Date();
    function dueAt(h, m) {
      var d = new Date(t.getFullYear(), t.getMonth(), t.getDate(), h, m || 0);
      return d.getTime();
    }
    var rows = [
      ['urgent', '回复客户的合同修改意见', 'p0', 25, dueAt(18, 0), '对方今天下班前要确认'],
      ['urgent', '提交本月报销单',         'p0', 15, dueAt(23, 0), ''],
      ['today',  '完成视频脚本',           'p1', 60, null, '先写开场 15 秒钩子'],
      ['today',  '整理客户资料',           'p2', 45, null, ''],
      ['today',  '学习 AI 工具 30 分钟',    'p2', 30, null, ''],
      ['today',  '运动 30 分钟',           'p3', 30, null, ''],
      ['inbox',  '做一期「AI 工具横评」选题', 'p2', 90, null, ''],
      ['inbox',  '研究自动化工作流，减少重复劳动', 'p3', 60, null, ''],
      ['inbox',  '读完《深度工作》第三章',  'p3', 45, null, '']
    ];
    rows.forEach(function (r, i) {
      s.tasks.push({
        id: uid(), title: r[1], bucket: r[0], priority: r[2],
        estimate: r[3], due: r[4], note: r[5] || '',
        done: false, doneAt: null, createdAt: now + i, order: i
      });
    });
    s.stats.inboxCreated = 3;
    s.meta.seeded = true;
  }

  /* ---------------- 事件总线 ---------------- */
  var listeners = {};
  function on(evt, fn) {
    (listeners[evt] || (listeners[evt] = [])).push(fn);
    return function () { off(evt, fn); };
  }
  function off(evt, fn) {
    var a = listeners[evt]; if (!a) return;
    var i = a.indexOf(fn); if (i > -1) a.splice(i, 1);
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('[Q]', evt, e); }
    });
    if (evt !== '*') emit('*', { type: evt, payload: payload });
  }

  /* ---------------- 持久化 ---------------- */
  var state = null;
  var storageOK = true;

  function load() {
    var raw = null;
    try { raw = global.localStorage.getItem(KEY); }
    catch (e) { storageOK = false; }

    if (!raw) {
      state = defaults();
      seed(state);
      save();
      return state;
    }
    try {
      var parsed = JSON.parse(raw);
      state = merge(defaults(), parsed);
    } catch (e) {
      console.warn('[Q] 数据损坏，已重置', e);
      state = defaults();
      seed(state);
    }
    return state;
  }

  function merge(base, patch) {
    Object.keys(patch || {}).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        merge(base[k], v);
      } else if (v !== undefined) {
        base[k] = v;
      }
    });
    return base;
  }

  var saveTimer = null;
  function save(immediate) {
    if (!storageOK) return;
    if (immediate) { flush(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 140);
  }
  function flush() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { storageOK = false; console.warn('[Q] 保存失败', e); }
  }

  /* ---------------- 跨天滚动 ---------------- */
  function rollover() {
    var today = dateKey();
    if (state.meta.lastDay === today) {
      state.profile.streak = computeStreak();
      return false;
    }
    // 归档：清掉已完成的任务（统计已在完成时写入 history）
    state.tasks = state.tasks.filter(function (t) { return !t.done; });
    state.meta.lastDay = today;
    state.daily = { date: today, cleared: false };
    state.profile.streak = computeStreak();
    save(true);
    return true;
  }

  function computeStreak() {
    var k = dateKey(), n = 0;
    if (!(state.history[k] && state.history[k].done > 0)) k = shiftDay(k, -1);
    while (state.history[k] && state.history[k].done > 0) { n++; k = shiftDay(k, -1); }
    if (n > state.stats.maxStreak) state.stats.maxStreak = n;
    return n;
  }

  function touchHistory(key, deltaDone, deltaXp) {
    var h = state.history[key] || (state.history[key] = { done: 0, xp: 0 });
    h.done = Math.max(0, h.done + (deltaDone || 0));
    h.xp = Math.max(0, h.xp + (deltaXp || 0));
    if (h.done > state.stats.maxDaily) state.stats.maxDaily = h.done;
    return h;
  }

  /* ---------------- 任务查询 ---------------- */
  function byBucket(b) {
    return state.tasks
      .filter(function (t) { return t.bucket === b; })
      .sort(function (a, c) {
        if (a.done !== c.done) return a.done ? 1 : -1;
        return (a.order - c.order) || (a.createdAt - c.createdAt);
      });
  }

  function getTask(id) {
    for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === id) return state.tasks[i];
    return null;
  }

  /** 今日通关范围 = 紧急要办 + 今日挑战 */
  function questScope() {
    return state.tasks.filter(function (t) { return t.bucket === 'urgent' || t.bucket === 'today'; });
  }

  function progress() {
    var all = questScope();
    var done = all.filter(function (t) { return t.done; }).length;
    return {
      done: done,
      total: all.length,
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
      cleared: all.length > 0 && done === all.length
    };
  }

  function xpFor(task) {
    var base = XP[task.bucket] || XP.today;
    return base;
  }

  /* ---------------- 任务变更 ---------------- */
  function addTask(data) {
    var b = BUCKETS[data.bucket] ? data.bucket : 'today';
    var maxOrder = -1;
    state.tasks.forEach(function (t) { if (t.bucket === b && t.order > maxOrder) maxOrder = t.order; });
    var t = {
      id: uid(),
      title: (data.title || '').trim() || '未命名任务',
      bucket: b,
      priority: PRIORITIES[data.priority] ? data.priority : 'p2',
      estimate: data.estimate == null ? 30 : (+data.estimate || 0),
      due: data.due || null,
      note: (data.note || '').trim(),
      done: false, doneAt: null,
      createdAt: Date.now(),
      order: maxOrder + 1
    };
    state.tasks.push(t);
    if (b === 'inbox') state.stats.inboxCreated++;
    save();
    emit('tasks:changed', { reason: 'add', task: t });
    checkAchievements();
    return t;
  }

  function updateTask(id, patch) {
    var t = getTask(id); if (!t) return null;
    var prevBucket = t.bucket;
    Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
    if (prevBucket !== t.bucket) {
      var maxOrder = -1;
      state.tasks.forEach(function (x) { if (x.bucket === t.bucket && x !== t && x.order > maxOrder) maxOrder = x.order; });
      t.order = maxOrder + 1;
      if (t.bucket === 'inbox' && prevBucket !== 'inbox') state.stats.inboxCreated++;
      if (prevBucket === 'inbox' && t.bucket !== 'inbox') state.stats.promoted++;
    }
    save();
    emit('tasks:changed', { reason: 'update', task: t, prevBucket: prevBucket });
    checkAchievements();
    return t;
  }

  function removeTask(id) {
    var t = getTask(id); if (!t) return null;
    // 若已完成，回滚今日统计
    if (t.done && t.doneAt && dateKey(new Date(t.doneAt)) === dateKey()) {
      var gain = xpFor(t);
      state.profile.xp = Math.max(0, state.profile.xp - gain);
      state.stats.totalCompleted = Math.max(0, state.stats.totalCompleted - 1);
      touchHistory(dateKey(), -1, -gain);
    }
    state.tasks = state.tasks.filter(function (x) { return x.id !== id; });
    save();
    emit('tasks:changed', { reason: 'remove', task: t });
    return t;
  }

  function restoreTask(task) {
    state.tasks.push(task);
    save();
    emit('tasks:changed', { reason: 'restore', task: task });
  }

  /** 完成 / 取消完成 —— 返回收益详情供动效使用 */
  function toggleDone(id) {
    var t = getTask(id); if (!t) return null;
    var beforeLv = levelInfo(state.profile.xp).level;
    var key = dateKey();
    var gain = xpFor(t);
    var res = { task: t, xp: 0, levelUp: false, level: beforeLv, cleared: false, unlocked: [] };

    if (!t.done) {
      t.done = true;
      t.doneAt = Date.now();
      state.profile.xp += gain;
      state.stats.totalXpEarned += gain;
      state.stats.totalCompleted++;
      if (t.bucket === 'urgent') state.stats.urgentDone++;
      if ((t.estimate | 0) >= 90) state.stats.deepWork++;
      var hh = new Date(t.doneAt).getHours();
      if (hh < 9) state.stats.earlyCount++;
      if (hh >= 22) state.stats.nightCount++;
      touchHistory(key, 1, gain);
      res.xp = gain;
    } else {
      t.done = false;
      var wasToday = t.doneAt && dateKey(new Date(t.doneAt)) === key;
      t.doneAt = null;
      state.profile.xp = Math.max(0, state.profile.xp - gain);
      state.stats.totalCompleted = Math.max(0, state.stats.totalCompleted - 1);
      if (t.bucket === 'urgent') state.stats.urgentDone = Math.max(0, state.stats.urgentDone - 1);
      if (wasToday) touchHistory(key, -1, -gain);
      res.xp = -gain;
    }

    state.profile.streak = computeStreak();
    var after = levelInfo(state.profile.xp);
    res.levelUp = after.level > beforeLv;
    res.level = after.level;
    res.title = after.title;

    // 今日通关判定
    var p = progress();
    if (p.cleared && !state.daily.cleared && state.daily.date === key) {
      state.daily.cleared = true;
      var bonus = XP.clearBonus + Math.min(XP.streakBonusMax, state.profile.streak * XP.streakBonusPer);
      state.profile.xp += bonus;
      state.stats.totalXpEarned += bonus;
      state.stats.perfectDays++;
      touchHistory(key, 0, bonus);
      var after2 = levelInfo(state.profile.xp);
      if (after2.level > after.level) { res.levelUp = true; res.level = after2.level; res.title = after2.title; }
      res.cleared = true;
      res.bonus = bonus;
    } else if (!p.cleared) {
      state.daily.cleared = false;
    }

    save();
    res.unlocked = checkAchievements(true);
    emit('tasks:changed', { reason: 'toggle', task: t });
    emit('profile:changed', res);
    return res;
  }

  /** 拖拽排序 / 跨列迁移 */
  function reorder(id, targetBucket, targetIndex) {
    var t = getTask(id); if (!t) return;
    var prevBucket = t.bucket;
    var list = byBucket(targetBucket).filter(function (x) { return x.id !== id; });
    var idx = Math.max(0, Math.min(targetIndex, list.length));
    list.splice(idx, 0, t);
    t.bucket = targetBucket;
    list.forEach(function (x, i) { x.order = i; });
    if (prevBucket !== targetBucket) {
      if (targetBucket === 'inbox' && prevBucket !== 'inbox') state.stats.inboxCreated++;
      if (prevBucket === 'inbox' && targetBucket !== 'inbox') state.stats.promoted++;
    }
    save();
    emit('tasks:changed', { reason: 'reorder', task: t, prevBucket: prevBucket });
    checkAchievements();
  }

  function clearDone(bucket) {
    var removed = state.tasks.filter(function (t) { return t.done && (!bucket || t.bucket === bucket); });
    if (!removed.length) return 0;
    state.tasks = state.tasks.filter(function (t) { return !(t.done && (!bucket || t.bucket === bucket)); });
    save();
    emit('tasks:changed', { reason: 'clear' });
    return removed.length;
  }

  /* ---------------- 成就 ---------------- */
  function achievementList() {
    return ACHIEVEMENTS.map(function (a) {
      var cur = Math.max(0, a.get(state) || 0);
      return {
        id: a.id, icon: a.icon, name: a.name, desc: a.desc,
        goal: a.goal, cur: Math.min(cur, a.goal),
        pct: Math.min(100, Math.round((cur / a.goal) * 100)),
        unlocked: !!state.achievements[a.id],
        at: state.achievements[a.id] || null
      };
    });
  }

  function checkAchievements(silent) {
    var newly = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (state.achievements[a.id]) return;
      if ((a.get(state) || 0) >= a.goal) {
        state.achievements[a.id] = Date.now();
        newly.push(a);
      }
    });
    if (newly.length) {
      save();
      if (!silent) emit('achievements:unlocked', newly);
    }
    return newly;
  }

  /* ---------------- 复盘 ---------------- */
  function todayReview() {
    var k = dateKey();
    for (var i = 0; i < state.reviews.length; i++) if (state.reviews[i].date === k) return state.reviews[i];
    return null;
  }

  function saveReview(data) {
    var k = dateKey();
    var p = progress();
    var existing = todayReview();
    var rec = existing || { date: k, createdAt: Date.now() };
    rec.done = p.done;
    rec.total = p.total;
    rec.rate = p.pct;
    rec.summary = (data.summary || '').trim();
    rec.goals = (data.goals || []).map(function (g) { return (g || '').trim(); }).filter(Boolean);
    rec.mood = data.mood || 'ok';
    rec.updatedAt = Date.now();
    if (!existing) {
      state.reviews.unshift(rec);
      state.stats.reviewCount++;
    }
    save(true);
    emit('review:saved', rec);
    var newly = checkAchievements();
    return { record: rec, unlocked: newly };
  }

  /** 把复盘中的「明天重点」导入今日挑战 */
  function importGoals(goals) {
    var n = 0;
    (goals || []).forEach(function (g) {
      if (!g) return;
      addTask({ title: g, bucket: 'today', priority: 'p1', estimate: 45 });
      n++;
    });
    return n;
  }

  /* ---------------- 近 N 天活跃 ---------------- */
  function recentDays(n) {
    n = n || 7;
    var out = [], k = dateKey();
    for (var i = n - 1; i >= 0; i--) {
      var key = shiftDay(k, -i);
      var h = state.history[key] || { done: 0, xp: 0 };
      var p = key.split('-');
      out.push({
        key: key,
        done: h.done || 0,
        xp: h.xp || 0,
        label: ['日','一','二','三','四','五','六'][new Date(+p[0], +p[1]-1, +p[2]).getDay()],
        isToday: i === 0
      });
    }
    return out;
  }

  function trackAI() {
    state.stats.aiUses++;
    save();
    var n = checkAchievements();
    return n;
  }

  /* ---------------- 数据管理 ---------------- */
  function exportJSON() { return JSON.stringify(state, null, 2); }

  function importJSON(txt) {
    var obj = JSON.parse(txt);
    if (!obj || typeof obj !== 'object' || !obj.tasks) throw new Error('文件格式不正确');
    state = merge(defaults(), obj);
    save(true);
    emit('store:reloaded');
    return true;
  }

  function resetAll(withSeed) {
    state = defaults();
    if (withSeed) seed(state);
    save(true);
    emit('store:reloaded');
  }

  /* ---------------- 导出 ---------------- */
  Q.store = {
    // 常量
    XP: XP, BUCKETS: BUCKETS, PRIORITIES: PRIORITIES, ACHIEVEMENTS: ACHIEVEMENTS,
    // 生命周期
    load: load, save: save, rollover: rollover,
    get state() { return state; },
    get ok() { return storageOK; },
    // 事件
    on: on, off: off, emit: emit,
    // 查询
    byBucket: byBucket, getTask: getTask, progress: progress, questScope: questScope,
    levelInfo: function () { return levelInfo(state.profile.xp); },
    xpFor: xpFor, recentDays: recentDays, achievementList: achievementList,
    todayReview: todayReview,
    // 变更
    addTask: addTask, updateTask: updateTask, removeTask: removeTask, restoreTask: restoreTask,
    toggleDone: toggleDone, reorder: reorder, clearDone: clearDone,
    saveReview: saveReview, importGoals: importGoals, trackAI: trackAI,
    checkAchievements: checkAchievements,
    /** 向同一套 XP 系统追加经验（考试模块复用） */
    addXp: function (amount, reason) {
      if (!amount) return { xp: 0, levelUp: false, level: levelInfo(state.profile.xp).level, title: levelInfo(state.profile.xp).title, unlocked: [] };
      var before = levelInfo(state.profile.xp).level;
      state.profile.xp += amount;
      state.stats.totalXpEarned += amount;
      save();
      var after = levelInfo(state.profile.xp);
      var res = { xp: amount, levelUp: after.level > before, level: after.level, title: after.title, unlocked: [] };
      if (res.levelUp) res.unlocked = checkAchievements(true);
      emit('profile:changed', res);
      return res;
    },
    // 数据
    exportJSON: exportJSON, importJSON: importJSON, resetAll: resetAll,
    // 工具
    dateKey: dateKey, shiftDay: shiftDay, uid: uid, clone: clone, levelOf: levelInfo
  };

})(window);
