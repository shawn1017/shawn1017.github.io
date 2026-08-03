/* ============================================================
   pages.js — 四个页面的渲染：首页 / 任务 / 成长 / 复盘
   ============================================================ */
(function (global) {
  'use strict';

  var Q = global.Q || (global.Q = {});
  var store = Q.store, ui = Q.ui, fx = Q.fx, engine = Q.engine;
  var I = ui.I, esc = ui.esc;

  // AI 页面独立图标（ui.I 未提供 gear/send/chat 等，这里内联 feather 风格 SVG）
  var AI_ICON = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.7 1.7 0 0 0 .34-1.88 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'
  };

  var pages = {};

  /* 页面级易变状态 */
  var aiState = { text: '', result: null, busy: false, picked: {} };
  var aiPageState = { mode: 'coach', chat: [], busy: false, draft: '' };
  var taskFilter = { q: '', status: 'all', priority: 'all' };

  /* ============================================================
     区块：模块卡片头部
     ============================================================ */
  function sectionCard(cfg) {
    var items = store.byBucket(cfg.bucket);
    var doneN = items.filter(function (t) { return t.done; }).length;
    var pct = items.length ? Math.round(doneN / items.length * 100) : 0;

    return '' +
    '<section class="card" data-section="' + cfg.bucket + '">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--' + cfg.tone + '">' + cfg.emoji + '</span>' +
        '<div class="card__title">' +
          '<h3>' + esc(cfg.name) + '</h3>' +
          '<span class="countpill">' + doneN + '/' + items.length + '</span>' +
        '</div>' +
        '<div class="card__actions">' +
          (cfg.extra || '') +
          '<button class="btn btn--sm btn--soft" data-act="add" data-bucket="' + cfg.bucket + '">' + I.plus + '新增</button>' +
        '</div>' +
      '</div>' +
      (items.length ? '<div class="colprog"><i style="width:' + pct + '%"></i></div>' : '') +
      '<div class="card__body" style="padding-top:0">' +
        ui.listHTML(cfg.bucket, { promote: cfg.bucket === 'inbox', limit: cfg.limit }) +
        (cfg.limit && items.length > cfg.limit
          ? '<button class="quickadd" style="margin-top:8px;justify-content:center" data-act="goto" data-route="tasks">查看全部 ' + items.length + ' 条' + I.right + '</button>'
          : '<button class="quickadd" style="margin-top:8px" data-act="add" data-bucket="' + cfg.bucket + '">' + I.plus + (cfg.addText || '添加一件事') + '</button>') +
      '</div>' +
    '</section>';
  }

  /* ============================================================
     首页
     ============================================================ */
  pages.home = function () {
    var s = store.state;
    var lv = store.levelInfo();
    var p = store.progress();
    var today = store.state.history[store.dateKey()] || { done: 0, xp: 0 };
    var hour = new Date().getHours();
    var needReview = hour >= 20 && !store.todayReview();

    var subtitle;
    if (!p.total) subtitle = '今天还是一张白纸，先添加几件事，或者让 AI 助手帮你理一理。';
    else if (p.cleared) subtitle = '今日全部关卡已通关，剩下的时间属于你自己。';
    else if (p.done === 0) subtitle = '共 ' + p.total + ' 个关卡等着你，先挑最小的那个开始。';
    else subtitle = '已经拿下 ' + p.done + ' 关，还剩 ' + (p.total - p.done) + ' 关，保持节奏。';

    var ticks = '';
    var tn = Math.min(Math.max(p.total, 1), 12);
    for (var i = 0; i < tn; i++) ticks += '<i></i>';

    var hero = '' +
    '<div class="hero">' +
      '<div class="hero__top">' +
        '<div>' +
          '<span class="hero__date">' + I.cal + esc(ui.todayLabel()) + '</span>' +
          '<h1>' + esc(ui.greet()) + '，欢迎回到今天的战场</h1>' +
          '<p class="hero__sub">' + esc(subtitle) + '</p>' +
        '</div>' +
        '<div class="hero__stats">' +
          '<div class="hero__stat"><b class="tnum" data-live="done">' + p.done + '</b><span>今日完成</span></div>' +
          '<div class="hero__stat"><b class="tnum">Lv.' + lv.level + '</b><span>' + esc(lv.title) + '</span></div>' +
          '<div class="hero__stat"><b class="tnum" data-live="xp">' + lv.totalXp + '</b><span>总经验值</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="quest">' +
        '<div class="quest__head">' +
          '<span class="quest__label">' + I.bolt + '今日通关进度</span>' +
          '<span class="quest__count tnum" data-live="progress">' + p.done + ' <em>/ ' + p.total + '</em></span>' +
        '</div>' +
        '<div class="qbar">' +
          '<div class="qbar__fill" style="width:' + p.pct + '%"></div>' +
          '<div class="qbar__ticks">' + ticks + '</div>' +
        '</div>' +
        '<div class="quest__foot">' +
          '<span>' + (p.total ? '完成率 ' + p.pct + '%' : '还没有关卡') + (today.xp ? ' · 今日 +' + today.xp + ' XP' : '') + '</span>' +
          '<span class="quest__streak">' + I.fire + '连续 ' + s.profile.streak + ' 天</span>' +
        '</div>' +
      '</div>' +
    '</div>';

    var banner = needReview
      ? '<div class="banner">' + I.note +
        '<span><b>该复盘了</b> · 今天完成了 ' + p.done + '/' + p.total + '，花两分钟记录一下，明天会更顺。</span>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--sm btn--outline" data-act="goto" data-route="review">去复盘</button>' +
        '</div>'
      : '';

    var tiles = '' +
    '<div class="grid-2">' +
      tile('🔥', '#FEF4E3', s.profile.streak, '天', '连续完成', 'streak') +
      tile('✅', '#E6F9F1', s.stats.totalCompleted, '', '累计通关', 'total') +
    '</div>';

    return '' +
    '<div class="grid-home">' +
      '<div class="stack">' +
        hero +
        banner +
        sectionCard({ bucket: 'urgent', name: '紧急要办', emoji: '🔥', tone: 'red', addText: '添加紧急事项' }) +
        sectionCard({ bucket: 'today',  name: '今日挑战', emoji: '⚔️', tone: 'brand', addText: '添加今日挑战' }) +
      '</div>' +
      '<div class="stack">' +
        aiPanel() +
        tiles +
        examHomeCard() +
        sectionCard({ bucket: 'inbox', name: '灵感仓库', emoji: '💡', tone: 'amber', limit: 5, addText: '记一个想法' }) +
      '</div>' +
    '</div>';
  };

  function tile(emoji, bg, value, unit, label) {
    return '<div class="tile">' +
      '<div class="tile__ico" style="background:' + bg + '">' + emoji + '</div>' +
      '<b class="tnum">' + value + (unit ? '<i>' + unit + '</i>' : '') + '</b>' +
      '<span>' + esc(label) + '</span>' +
    '</div>';
  }

  /* ============================================================
     考试闯关融合（首页 / 成长 / 复盘）
     - 仅当考试题库已就绪（Q.exam.ready()）才渲染，避免首屏报错
     ============================================================ */
  function examReady() {
    return !!(Q.exam && typeof Q.exam.ready === 'function' && Q.exam.ready());
  }

  function examHomeCard() {
    if (!examReady()) return '';
    var c = Q.exam.counts();
    var cd = Q.exam.examCountdown();
    var ts = Q.exam.todayStat();
    var pi = Q.exam.prepIndex();
    var lv = store.levelInfo();
    var titles = Q.exam.EXAM_TITLES;
    var eLv = Math.min(titles.length, Math.max(1, lv.level));
    return '' +
    '<section class="card exam-fuse">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--brand">' + I.shield + '</span>' +
        '<div class="card__title"><h3>考试闯关</h3></div>' +
        '<span class="countpill">倒计时 ' + cd.days + ' 天</span>' +
      '</div>' +
      '<div class="card__body">' +
        '<div class="exam-fuse__row">' +
          '<span class="t-sm">今日考试挑战</span>' +
          '<b class="tnum">' + ts.done + ' / ' + ts.target + ' 题</b>' +
        '</div>' +
        '<div class="exam-fuse__bar"><i style="width:' + ts.pct + '%"></i></div>' +
        '<div class="exam-fuse__row" style="margin-top:14px">' +
          '<span class="t-sm">当前考试等级</span>' +
          '<b>习题 Lv.' + lv.level + ' · ' + esc(titles[eLv - 1]) + '</b>' +
        '</div>' +
        '<div class="exam-fuse__row">' +
          '<span class="t-sm">备考指数</span>' +
          '<b class="tnum">' + pi + ' / 100 · ' + esc(Q.exam.prepStatus(pi)) + '</b>' +
        '</div>' +
        '<div class="exam-fuse__cta">' +
          '<button class="btn btn--primary btn--block" data-act="goto" data-route="exam">' + I.bolt + '继续闯关</button>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function examGrowthCard() {
    if (!examReady()) return '';
    var achs = Q.exam.achievements || Q.exam.ACH || [];
    var meta = Q.exam.meta();
    var unlockedCount = achs.filter(function (a) { return meta.unlocked && meta.unlocked[a.id]; }).length;
    var lv = store.levelInfo();
    var titles = Q.exam.EXAM_TITLES;
    var cur = Math.min(titles.length, Math.max(1, lv.level)) - 1;
    var items = achs.map(function (a) {
      var on = meta.unlocked && meta.unlocked[a.id];
      return '<div class="exam-ach__item' + (on ? ' is-on' : '') + '" title="' + esc(a.desc) + '">' +
        '<span>' + a.icon + '</span><b>' + esc(a.name) + '</b></div>';
    }).join('');
    var titleHtml = titles.map(function (t, i) {
      return '<span class="exam-title' + (i === cur ? ' is-on' : '') + '">' + esc(t) + '</span>';
    }).join('');
    return '' +
    '<section class="card">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--brand">' + I.shield + '</span>' +
        '<div class="card__title"><h3>考试成就与称号</h3></div>' +
        '<span class="countpill">' + unlockedCount + '/' + achs.length + '</span>' +
      '</div>' +
      '<div class="card__body">' +
        '<div class="exam-ach">' + items + '</div>' +
        '<div class="exam-titles__label">考试称号（随等级解锁）</div>' +
        '<div class="exam-titles">' + titleHtml + '</div>' +
      '</div>' +
    '</section>';
  }

  function examReviewCard() {
    if (!examReady()) return '';
    var ts = Q.exam.todayStat();
    var c = Q.exam.counts();
    var m = Q.exam.meta();
    return '' +
    '<section class="card">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--violet">' + I.book + '</span>' +
        '<div class="card__title"><h3>今日考试学习</h3></div>' +
        (ts.done ? '<span class="chip chip--ok">+' + ts.xp + ' 题 XP</span>' : '') +
      '</div>' +
      '<div class="card__body">' +
        '<div class="exam-fuse__row"><span class="t-sm">今日刷题</span><b class="tnum">' + ts.done + ' / ' + ts.target + ' 题</b></div>' +
        '<div class="exam-fuse__bar"><i style="width:' + ts.pct + '%"></i></div>' +
        '<div class="exam-review__grid">' +
          miniStat(ts.rate + '%', '正确率') +
          miniStat(c.wrong, '待复习错题') +
          miniStat(m.studyStreak + ' 天', '连续学习') +
          miniStat(c.answered + ' / ' + c.total, '题库进度') +
        '</div>' +
        '<button class="btn btn--soft btn--block" data-act="goto" data-route="exam" style="margin-top:12px">' + I.shield + '前往考试闯关</button>' +
      '</div>' +
    '</section>';
  }

  /* ============================================================
     AI 效率助手
     ============================================================ */
  var AI_SAMPLES = [
    '我今天有 10 件事情，不知道怎么安排',
    '18 点前回复客户合同、写周报、运动 30 分钟',
    '整理客户资料，学习 AI 工具，有空研究自动化'
  ];

  function aiPanel() {
    var body;
    if (aiState.busy) {
      body = '<div class="ai__result"><div class="ai__summary"><span class="dots"><i></i><i></i><i></i></span> 正在分析优先级与耗时…</div></div>';
    } else if (aiState.result && aiState.result.ok) {
      body = aiResultHTML(aiState.result);
    } else if (aiState.result && !aiState.result.ok) {
      body = '<div class="ai__result"><div class="ai__summary">' + esc(aiState.result.message) + '</div></div>';
    } else {
      body = '';
    }

    return '' +
    '<section class="ai">' +
      '<div class="ai__head">' +
        '<span class="ai__orb">' + I.spark + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<b>AI 效率助手</b>' +
          '<span>把今天要做的事一股脑丢进来，我来分优先级</span>' +
        '</div>' +
      '</div>' +
      '<div class="ai__body">' +
        '<textarea class="ai__input" id="ai-input" placeholder="例如：&#10;我今天有 10 件事情，不知道怎么安排&#10;18 点前要回复客户的合同修改意见&#10;写完这周的视频脚本&#10;整理客户资料&#10;学习 AI 工具 30 分钟&#10;有空研究一下自动化工作流">' + esc(aiState.text) + '</textarea>' +
        '<div class="ai__chips">' +
          AI_SAMPLES.map(function (s) {
            return '<button class="ai__chip" data-act="ai-sample" data-text="' + esc(s) + '">' + esc(s.length > 20 ? s.slice(0, 19) + '…' : s) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="ai__row">' +
          '<button class="btn btn--primary" data-act="ai-run">' + I.wand + '分析并安排</button>' +
          '<button class="btn btn--ghost" data-act="ai-plan">' + I.target + '给现有任务排序</button>' +
        '</div>' +
        body +
      '</div>' +
    '</section>';
  }

  function aiResultHTML(r) {
    var order = ['urgent', 'today', 'inbox'];
    var groups = order.map(function (b) {
      var list = r.groups[b];
      if (!list.length) return '';
      var B = store.BUCKETS[b];
      return '<div class="ai__group">' +
        '<div class="ai__grouphead">' + B.emoji + ' ' + esc(B.name) +
          ' <i>' + list.length + ' 项' + (b !== 'inbox' ? ' · ' + ui.fmtMin(list.reduce(function (a, t) { return a + t.estimate; }, 0)) : '') + '</i></div>' +
        list.map(function (t, i) {
          var key = b + ':' + i;
          var checked = aiState.picked[key] !== false;
          var P = store.PRIORITIES[t.priority];
          var due = t.due ? ui.fmtDue(t.due) : null;
          return '<div class="ai__item" style="animation-delay:' + (i * 40) + 'ms">' +
            '<label>' +
              '<input type="checkbox" data-ai-pick="' + key + '"' + (checked ? ' checked' : '') + '>' +
              '<p>' + esc(t.title) + '</p>' +
            '</label>' +
            '<span class="chip chip--' + t.priority + '">' + esc(P.name) + '</span>' +
            '<span class="chip chip--plain">' + ui.fmtMin(t.estimate) + '</span>' +
            (due ? '<span class="chip chip--due ' + due.state + '">' + esc(due.label) + '</span>' : '') +
          '</div>';
        }).join('') +
      '</div>';
    }).join('');

    var tips = r.advice.map(function (t) {
      return '<div style="display:flex;gap:7px;margin-top:6px;font-size:12.5px;color:var(--text-2);line-height:1.55">' +
             '<span style="color:var(--brand);flex:none">▸</span><span>' + esc(t) + '</span></div>';
    }).join('');

    return '' +
    '<div class="ai__result">' +
      '<div class="ai__summary">' + r.summary + tips + '</div>' +
      groups +
      '<div class="ai__row" style="margin-top:12px">' +
        '<button class="btn btn--primary btn--block" data-act="ai-apply">' + I.check.replace('fill="none"','fill="none" stroke="currentColor" stroke-width="2.6"') + '采纳并加入工作台</button>' +
        '<button class="btn btn--ghost" data-act="ai-clear">清空</button>' +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     任务中心
     ============================================================ */
  pages.tasks = function () {
    var all = store.state.tasks;
    var doneN = all.filter(function (t) { return t.done; }).length;

    function match(t) {
      if (taskFilter.status === 'todo' && t.done) return false;
      if (taskFilter.status === 'done' && !t.done) return false;
      if (taskFilter.priority !== 'all' && t.priority !== taskFilter.priority) return false;
      if (taskFilter.q) {
        var q = taskFilter.q.toLowerCase();
        if ((t.title + ' ' + (t.note || '')).toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    }

    var cols = ['urgent', 'today', 'inbox'].map(function (b) {
      var B = store.BUCKETS[b];
      var items = store.byBucket(b);
      var shown = items.filter(match);
      var doneC = items.filter(function (t) { return t.done; }).length;
      var mins = items.filter(function (t) { return !t.done; }).reduce(function (a, t) { return a + (t.estimate || 0); }, 0);
      var tone = b === 'urgent' ? 'red' : b === 'today' ? 'brand' : 'amber';

      var body = shown.length
        ? shown.map(function (t) { return ui.taskHTML(t, { promote: b === 'inbox' }); }).join('')
        : (items.length ? '<div class="empty"><div class="empty__emoji">🔍</div><b>没有匹配的任务</b><span>换个筛选条件试试</span></div>' : ui.emptyHTML(b));

      return '' +
      '<section class="card">' +
        '<div class="card__head">' +
          '<span class="sec-icon sec-icon--' + tone + '">' + B.emoji + '</span>' +
          '<div class="card__title">' +
            '<h3>' + esc(B.name) + '</h3>' +
            '<span class="countpill">' + doneC + '/' + items.length + '</span>' +
          '</div>' +
          '<div class="card__actions">' +
            '<button class="iconbtn" data-act="add" data-bucket="' + b + '" title="新增">' + I.plus + '</button>' +
          '</div>' +
        '</div>' +
        '<div style="padding:0 18px 10px;font-size:11.5px;color:var(--text-4)">' +
          esc(B.desc) + (mins ? ' · 待办约 ' + ui.fmtMin(mins) : '') +
        '</div>' +
        '<div class="card__body" style="padding-top:0">' +
          '<div class="tasklist stagger" data-dropzone="' + b + '">' + body + '</div>' +
          '<button class="quickadd" style="margin-top:8px" data-act="add" data-bucket="' + b + '">' + I.plus + '添加到' + esc(B.name) + '</button>' +
        '</div>' +
      '</section>';
    }).join('');

    var prios = [['all', '全部优先级']].concat(
      ['p0','p1','p2','p3'].map(function (p) { return [p, store.PRIORITIES[p].name]; })
    );

    return '' +
    '<div class="stack">' +
      '<div class="pagehead">' +
        '<div class="pagehead__t">' +
          '<h1>任务中心</h1>' +
          '<p>三个分区自由拖拽 · 共 ' + all.length + ' 条，已完成 ' + doneN + ' 条</p>' +
        '</div>' +
        '<div class="pagehead__a">' +
          (doneN ? '<button class="btn btn--outline" data-act="clear-done">' + I.trash + '清理已完成</button>' : '') +
          '<button class="btn btn--primary" data-act="add" data-bucket="today">' + I.plus + '新增任务</button>' +
        '</div>' +
      '</div>' +

      '<div class="filterbar">' +
        '<div class="searchbox">' + I.search +
          '<input id="task-search" placeholder="搜索任务…" value="' + esc(taskFilter.q) + '">' +
        '</div>' +
        '<div class="seg" data-seg="status" style="width:auto">' +
          [['all','全部'],['todo','待办'],['done','已完成']].map(function (o) {
            return '<button class="seg__btn' + (taskFilter.status === o[0] ? ' is-on' : '') + '" data-filter="status" data-val="' + o[0] + '" style="padding:0 12px">' + o[1] + '</button>';
          }).join('') +
        '</div>' +
        '<select class="select" id="prio-filter" style="width:auto;min-width:118px">' +
          prios.map(function (o) {
            return '<option value="' + o[0] + '"' + (taskFilter.priority === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') +
        '</select>' +
        '<span class="spacer"></span>' +
        '<span class="t-xs" style="display:flex;align-items:center;gap:5px">' + I.grip + '拖动卡片可跨区移动</span>' +
      '</div>' +

      '<div class="board">' + cols + '</div>' +
    '</div>';
  };

  /* ============================================================
     我的成长
     ============================================================ */
  pages.growth = function () {
    var s = store.state;
    var lv = store.levelInfo();
    var days = store.recentDays(7);
    var maxDone = Math.max.apply(null, days.map(function (d) { return d.done; }).concat([1]));
    var achs = store.achievementList();
    var unlocked = achs.filter(function (a) { return a.unlocked; });
    var weekDone = days.reduce(function (a, d) { return a + d.done; }, 0);
    var weekXp = days.reduce(function (a, d) { return a + d.xp; }, 0);

    var panel = '' +
    '<div class="levelpanel">' +
      ui.ringHTML(lv.pct, 112, 9, {
        cls: 'lp__ring', from: '#FBBF24', to: '#F472B6',
        center: '<b>' + lv.level + '</b><span>LEVEL</span>'
      }) +
      '<div class="lp__info">' +
        '<div class="lp__title">' +
          '<h2>' + esc(lv.title) + '</h2>' +
          '<span class="lp__badge">' + unlocked.length + '/' + achs.length + ' 成就</span>' +
        '</div>' +
        '<p class="lp__desc">再获得 <b style="color:#FBBF24">' + (lv.need - lv.inLevel) + ' XP</b> 即可升到 Lv.' + (lv.level + 1) + '</p>' +
        '<div class="lp__bar"><div class="lp__fill" style="width:' + lv.pct + '%"></div></div>' +
        '<div class="lp__foot"><span>' + lv.inLevel + ' / ' + lv.need + ' XP</span><span>累计 ' + lv.totalXp + ' XP</span></div>' +
      '</div>' +
      '<div class="lp__stats">' +
        '<div class="lp__stat"><b>' + s.profile.streak + '</b><span>连续天数</span></div>' +
        '<div class="lp__stat"><b>' + s.stats.totalCompleted + '</b><span>累计通关</span></div>' +
        '<div class="lp__stat"><b>' + s.stats.perfectDays + '</b><span>完美通关</span></div>' +
      '</div>' +
    '</div>';

    var chart = '' +
    '<section class="card">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--cyan">' + I.chart + '</span>' +
        '<div class="card__title"><h3>最近 7 天</h3></div>' +
        '<span class="t-xs">本周 ' + weekDone + ' 个任务 · ' + weekXp + ' XP</span>' +
      '</div>' +
      '<div class="card__body">' +
        '<div class="chart">' +
          days.map(function (d, i) {
            var h = d.done ? Math.max(10, Math.round(d.done / maxDone * 100)) : 3;
            return '<div class="chart__col">' +
              '<div class="chart__barwrap">' +
                '<div class="chart__bar' + (d.done ? '' : ' is-zero') + (d.isToday ? ' is-today' : '') + '" ' +
                     'style="height:' + h + '%;animation-delay:' + (i * 60) + 'ms" title="' + d.key + '：完成 ' + d.done + ' 个">' +
                  (d.done ? '<span class="chart__val">' + d.done + '</span>' : '') +
                '</div>' +
              '</div>' +
              '<span class="chart__lab' + (d.isToday ? ' is-today' : '') + '">' + (d.isToday ? '今天' : d.label) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</section>';

    var stats = '' +
    '<div class="grid-4">' +
      tile('⚡', '#EEF0FE', s.stats.totalXpEarned, '', '累计经验值') +
      tile('🚒', '#FDEDED', s.stats.urgentDone, '', '解决紧急事项') +
      tile('💡', '#FEF4E3', s.stats.inboxCreated, '', '记录灵感') +
      tile('📝', '#E6F5FE', s.stats.reviewCount, '', '完成复盘') +
    '</div>';

    var sorted = achs.slice().sort(function (a, b) {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.pct - a.pct;
    });

    var achGrid = '' +
    '<section class="card">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--amber">' + I.trophy + '</span>' +
        '<div class="card__title"><h3>成就墙</h3><span class="countpill">' + unlocked.length + '/' + achs.length + '</span></div>' +
      '</div>' +
      '<div class="card__body">' +
        '<div class="grid-2 stagger">' +
          sorted.map(function (a) {
            return '<div class="ach' + (a.unlocked ? ' is-on' : '') + '" data-ach="' + a.id + '">' +
              '<div class="ach__ico">' + a.icon + '</div>' +
              '<div class="ach__main">' +
                '<b>' + esc(a.name) + '</b>' +
                '<span>' + esc(a.desc) + '</span>' +
                (a.unlocked
                  ? '<span class="ach__date">已解锁 · ' + ui.fmtDate(a.at) + '</span>'
                  : '<div class="ach__prog"><i style="width:' + a.pct + '%"></i></div>' +
                    '<span class="t-xs" style="margin-top:3px;display:block">' + a.cur + ' / ' + a.goal + '</span>') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</section>';

    return '' +
    '<div class="stack">' +
      '<div class="pagehead">' +
        '<div class="pagehead__t">' +
          '<h1>我的成长</h1>' +
          '<p>每完成一个任务，都在把自己往前推一点</p>' +
        '</div>' +
      '</div>' +
      panel + stats + chart + achGrid + examGrowthCard() +
    '</div>';
  };

  /* ============================================================
     每日复盘
     ============================================================ */
  pages.review = function () {
    var p = store.progress();
    var s = store.state;
    var today = store.state.history[store.dateKey()] || { done: 0, xp: 0 };
    var rec = store.todayReview();
    var goals = (rec && rec.goals) || ['', '', ''];
    while (goals.length < 3) goals.push('');

    var doneTasks = store.questScope().filter(function (t) { return t.done; });
    var leftTasks = store.questScope().filter(function (t) { return !t.done; });

    var moods = [['great','😄','状态很好'], ['ok','🙂','还行'], ['tired','😮‍💨','有点累'], ['bad','😔','不太顺']];
    var mood = (rec && rec.mood) || 'ok';

    var summaryCard = '' +
    '<section class="card card--pad">' +
      '<div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">' +
        ui.ringHTML(p.pct, 104, 9, {
          from: '#10B981', to: '#22D3EE',
          center: '<b>' + p.pct + '%</b><span>完成率</span>'
        }) +
        '<div style="flex:1;min-width:200px">' +
          '<div class="t-eyebrow">今日战报</div>' +
          '<div style="display:flex;gap:20px;margin-top:10px;flex-wrap:wrap">' +
            miniStat(p.done, '完成任务') +
            miniStat(leftTasks.length, '未完成') +
            miniStat('+' + today.xp, '获得经验') +
            miniStat(s.profile.streak, '连续天数') +
          '</div>' +
          (doneTasks.length
            ? '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:5px">' +
              doneTasks.slice(0, 8).map(function (t) {
                return '<span class="chip chip--ok">' + esc(t.title.length > 14 ? t.title.slice(0, 13) + '…' : t.title) + '</span>';
              }).join('') +
              (doneTasks.length > 8 ? '<span class="chip chip--plain">+' + (doneTasks.length - 8) + '</span>' : '') +
            '</div>'
            : '<p class="t-sm" style="margin-top:12px">今天还没有完成的任务，晚点再来复盘也不迟。</p>') +
        '</div>' +
      '</div>' +
    '</section>';

    var form = '' +
    '<section class="card">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--violet">' + I.note + '</span>' +
        '<div class="card__title"><h3>今日总结</h3></div>' +
        (rec ? '<span class="chip chip--ok">已保存</span>' : '') +
      '</div>' +
      '<div class="card__body stack--sm" style="display:flex;flex-direction:column;gap:16px">' +
        '<div class="field">' +
          '<label>今天感觉怎么样</label>' +
          '<div class="seg" data-seg="mood">' +
            moods.map(function (m) {
              return '<button class="seg__btn' + (mood === m[0] ? ' is-on' : '') + '" data-val="' + m[0] + '">' + m[1] + ' ' + m[2] + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="rv-summary">今天做得怎么样？哪件事最值得？哪里可以更好？</label>' +
          '<textarea id="rv-summary" class="textarea" maxlength="500" placeholder="不用写长，两三句就够。例如：脚本卡了很久，下次先列提纲再动笔。">' + esc(rec ? rec.summary : '') + '</textarea>' +
        '</div>' +
        '<div class="field">' +
          '<label>明天的三个重点</label>' +
          goals.slice(0, 3).map(function (g, i) {
            return '<div class="goalrow">' +
              '<span class="goalrow__idx">' + (i + 1) + '</span>' +
              '<input class="input" data-goal="' + i + '" maxlength="60" placeholder="' + ['明天最重要的一件事','第二重要的事','有余力再做的事'][i] + '" value="' + esc(g) + '">' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn--primary" data-act="rv-save">' + I.check.replace('fill="none"','fill="none" stroke="currentColor" stroke-width="2.6"') + '保存复盘' + (rec ? '' : ' · +20 XP') + '</button>' +
          '<button class="btn btn--outline" data-act="rv-import">' + I.right + '把重点加入明日挑战</button>' +
        '</div>' +
      '</div>' +
    '</section>';

    var history = s.reviews.filter(function (r) { return r.date !== store.dateKey(); });
    var histCard = '' +
    '<section class="card">' +
      '<div class="card__head">' +
        '<span class="sec-icon sec-icon--green">' + I.cal + '</span>' +
        '<div class="card__title"><h3>历史复盘</h3><span class="countpill">' + s.reviews.length + '</span></div>' +
      '</div>' +
      '<div class="card__body">' +
        (history.length
          ? '<div class="stack--sm stagger" style="display:flex;flex-direction:column;gap:10px">' +
            history.slice(0, 12).map(function (r) {
              var dp = r.date.split('-');
              return '<div class="reviewitem">' +
                '<div class="reviewitem__date"><b>' + (+dp[2]) + '</b><span>' + (+dp[1]) + ' 月</span></div>' +
                '<div class="reviewitem__body">' +
                  '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">' +
                    '<span class="chip chip--ok">完成 ' + r.done + '/' + r.total + '</span>' +
                    '<span class="chip chip--plain">' + r.rate + '%</span>' +
                  '</div>' +
                  (r.summary ? '<p>' + esc(r.summary) + '</p>' : '<p class="muted">（没有写总结）</p>') +
                  (r.goals && r.goals.length
                    ? '<ul class="reviewitem__goals">' + r.goals.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>'
                    : '') +
                '</div>' +
              '</div>';
            }).join('') +
            '</div>'
          : '<div class="empty"><div class="empty__emoji">📖</div><b>还没有历史记录</b><span>坚持复盘，这里会长出你的成长轨迹</span></div>') +
      '</div>' +
    '</section>';

    return '' +
    '<div class="stack">' +
      '<div class="pagehead">' +
        '<div class="pagehead__t">' +
          '<h1>每日复盘</h1>' +
          '<p>' + esc(ui.todayLabel()) + ' · 花两分钟收个尾，明天才知道从哪开始</p>' +
        '</div>' +
      '</div>' +
      summaryCard + examReviewCard() + form + histCard +
    '</div>';
  };

  function miniStat(v, label) {
    return '<div><b class="t-num tnum" style="font-size:24px">' + v + '</b>' +
           '<div class="t-xs" style="margin-top:2px">' + esc(label) + '</div></div>';
  }

  /* ============================================================
     AI 助手独立页面（方案 B：离线优先 + 综合面板）
     三个模式：闯关陪练（本地）/ 任务规划（本地）/ 通用问答（可选联网）
     ============================================================ */
  function aiTabBtn(mode, icon, label) {
    return '<button class="aip__tab' + (aiPageState.mode === mode ? ' is-active' : '') + '" data-act="ai-tab" data-mode="' + mode + '">' +
      icon + '<span>' + label + '</span></button>';
  }

  function aiCoachHTML() {
    var st = aiPageState;
    var lead = '<p class="aip__lead">基于你当前的刷题数据，指出今天最该补的薄弱点。完全本地运行，不联网、不上传。</p>';
    var run = '<button class="btn btn--primary aip__run" data-act="ai-coach-run">' + I.wand + '分析我的闯关情况</button>';
    var body = '';
    if (st.busy && st.mode === 'coach') {
      body = '<div class="ai__result"><div class="ai__summary"><span class="dots"><i></i><i></i><i></i></span> 正在分析…</div></div>';
    } else if (st.coach) {
      if (st.coach.ok) {
        body = st.coach.tips.map(function (t) {
          return '<div class="ai__item" style="border:0;padding:12px 14px;background:var(--surface-2)">' + esc(t) + '</div>';
        }).join('');
      } else {
        body = '<div class="aip__offline">' + AI_ICON.warn + '<span>' + esc(st.coach.message) + '</span></div>';
      }
    }
    return lead + body + run;
  }

  function aiPlanHTML() {
    var st = aiPageState;
    var lead = '<p class="aip__lead">把「紧急 / 今日 / 仓库」里现有的任务排出今日推荐顺序，基于本地规则引擎。</p>';
    var run = '<button class="btn btn--primary aip__run" data-act="ai-plan-run">' + I.target + '生成本日顺序</button>';
    var body = '';
    if (st.busy && st.mode === 'plan') {
      body = '<div class="ai__result"><div class="ai__summary"><span class="dots"><i></i><i></i><i></i></span> 正在排序…</div></div>';
    } else if (st.plan) {
      if (st.plan.ok) {
        var rows = st.plan.order.map(function (o, i) {
          var t = o.task;
          var B = store.BUCKETS[t.bucket];
          var Pr = store.PRIORITIES[t.priority];
          return '<div class="ai__item" style="animation-delay:' + (i * 40) + 'ms">' +
            '<span class="goalrow__idx">' + (i + 1) + '</span>' +
            '<p style="flex:1">' + esc(t.title) + '</p>' +
            '<span class="chip chip--plain">' + B.emoji + '</span>' +
            '<span class="chip chip--' + t.priority + '">' + esc(Pr.name) + '</span>' +
            '<span class="chip chip--plain">' + ui.fmtMin(t.estimate || 30) + '</span>' +
          '</div>';
        }).join('');
        body = '<div class="ai__summary">共 <b>' + st.plan.order.length + '</b> 件待办 · 预计 ' + ui.fmtMin(st.plan.minutes) + '。' +
          (st.plan.tips && st.plan.tips.length ? ' ' + esc(st.plan.tips[0]) : '') + '</div>' + rows;
      } else {
        body = '<div class="aip__offline">' + AI_ICON.warn + '<span>' + esc(st.plan.message) + '</span></div>';
      }
    }
    return lead + body + run;
  }

  function aiChatHTML() {
    var st = aiPageState;
    var hasCloud = Q.ai && Q.ai.hasCloud();
    var banner = hasCloud ? '' :
      '<div class="aip__offline">' + AI_ICON.warn +
        '<span><b>离线模式</b>：尚未配置联网 API。点击右上角齿轮填入即可开启「通用问答」。闯关陪练 / 任务规划无需联网，随时可用。</span>' +
      '</div>';
    var msgs;
    if (!st.chat.length) {
      msgs = '<div class="aip__empty">' + AI_ICON.chat +
        '<div>有什么想聊的？<br>问备考策略、让 AI 拆解知识点，或随便唠两句都行。</div></div>';
    } else {
      msgs = st.chat.map(function (m) {
        if (m.typing) return '<div class="aip__msg aip__msg--bot aip__msg--typing"><span></span><span></span><span></span></div>';
        var cls = 'aip__msg aip__msg--' + m.role + (m.err ? ' is-err' : '');
        return '<div class="' + cls + '">' + esc(m.text) + '</div>';
      }).join('');
    }
    var compose = '<div class="aip__compose">' +
      '<textarea id="ai-compose" placeholder="说点什么…（Enter 发送，Shift+Enter 换行）">' + esc(st.draft) + '</textarea>' +
      '<button class="aip__send" data-act="ai-send" ' + (st.busy ? 'disabled' : '') + ' title="发送">' + AI_ICON.send + '</button>' +
      '</div>';
    return banner + '<div class="aip__chat" id="aip-chat">' + msgs + '</div>' + compose;
  }

  function aiPanelContent() {
    if (aiPageState.mode === 'coach') return aiCoachHTML();
    if (aiPageState.mode === 'plan') return aiPlanHTML();
    return aiChatHTML();
  }

  pages.ai = function () {
    return '' +
      '<div class="aip">' +
        '<div class="aip__head">' +
          '<span class="aip__orb">' + I.spark + '</span>' +
          '<div class="aip__title"><b>AI 助手</b><span>离线优先 · 闯关陪练 / 任务规划 / 通用问答</span></div>' +
          '<button class="aip__close" data-act="ai-close" title="收起（Esc）" aria-label="收起">' + AI_ICON.x + '</button>' +
          '<button class="aip__gear" data-act="ai-gear" title="设置联网 API（可选）">' + AI_ICON.gear + '</button>' +
        '</div>' +
        '<div class="aip__tabs">' +
          aiTabBtn('coach', AI_ICON.book, '闯关陪练') +
          aiTabBtn('plan', AI_ICON.target, '任务规划') +
          aiTabBtn('chat', AI_ICON.chat, '通用问答') +
        '</div>' +
        '<div class="aip__panel" id="aip-panel">' + aiPanelContent() + '</div>' +
      '</div>';
  };

  /* ---------------- 导出 ---------------- */
  Q.pages = {
    render: pages,
    aiState: aiState,
    aiPageState: aiPageState,
    aiIcon: AI_ICON,
    taskFilter: taskFilter,
    aiPanel: aiPanel
  };

})(window);
