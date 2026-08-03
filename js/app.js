/* ============================================================
   app.js — 路由 / 交互编排 / 动效串联 / 设置
   ============================================================ */
(function (global) {
  'use strict';

  var Q = global.Q;
  var store = Q.store, ui = Q.ui, fx = Q.fx, engine = Q.engine, P = Q.pages;
  var I = ui.I, esc = ui.esc;

  var ROUTES = ['home', 'tasks', 'exam', 'examPlay', 'growth', 'review', 'ai'];
  // 底部/侧边导航里可见的页面（examPlay 是沉浸答题页，不出现在导航里）
  var NAV_ROUTES = ['home', 'tasks', 'exam', 'growth', 'review', 'ai'];
  var TITLES = {
    home: '我的每日挑战', tasks: '任务中心', exam: '考试闯关',
    examPlay: '闯关答题中', growth: '我的成长', review: '每日复盘', ai: 'AI 助手'
  };
  var current = 'home';

  /* ============================================================
     渲染
     ============================================================ */
  function render(route, quiet) {
    route = ROUTES.indexOf(route) > -1 ? route : 'home';
    // 没有进行中的会话时不允许直接进入答题页
    if (route === 'examPlay' && !(Q.epages && Q.epages.hasSession())) route = 'exam';
    var prev = current;
    current = route;

    // 首次进入考试页时把题库读进来，读完再重绘一次
    if ((route === 'exam' || route === 'examPlay') && Q.exam && !Q.exam.ready()) {
      Q.exam.init().then(function () {
        if (current === 'exam' || current === 'examPlay') render(current, true);
      });
    }

    // 保存输入焦点
    var act = document.activeElement;
    var focusId = act && act.id ? act.id : null;
    var caret = act && act.selectionStart != null ? act.selectionStart : null;

    ROUTES.forEach(function (r) {
      var el = document.getElementById('page-' + r);
      if (!el) return;
      if (r === route) {
        el.hidden = false;
        el.innerHTML = P.render[r]();
        if (quiet) {
          el.style.animation = 'none';
          el.querySelectorAll('.stagger').forEach(function (n) { n.classList.remove('stagger'); });
        } else {
          el.style.animation = '';
        }
      } else {
        el.hidden = true;
        el.innerHTML = '';
      }
    });

    // 沉浸答题页隐藏外壳（侧边栏 / 顶栏 / 底部导航）
    document.body.classList.toggle('is-playing', route === 'examPlay');

    // 导航态（答题页高亮"考试闯关"）
    var navKey = route === 'examPlay' ? 'exam' : route;
    document.querySelectorAll('[data-route]').forEach(function (b) {
      if (b.classList.contains('nav__item') || b.classList.contains('bnav__item')) {
        b.classList.toggle('is-active', b.dataset.route === navKey);
      }
    });
    var tt = document.getElementById('topbar-title');
    if (tt) tt.textContent = TITLES[route];

    renderSidebar();
    renderReviewDot();
    renderExamPill();

    if (!quiet && prev !== route) global.scrollTo({ top: 0, behavior: 'instant' in document.body.style ? 'instant' : 'auto' });

    if (focusId) {
      var f = document.getElementById(focusId);
      if (f) {
        f.focus();
        if (caret != null && f.setSelectionRange) { try { f.setSelectionRange(caret, caret); } catch (e) {} }
      }
    }
  }

  function renderSidebar() {
    var lv = store.levelInfo();
    var box = document.getElementById('sidebar-level');
    if (box) {
      box.innerHTML = '' +
        '<div class="slv__top">' +
          '<span class="slv__badge">' + lv.level + '</span>' +
          '<span class="slv__meta"><b>' + esc(lv.title) + '</b><i>Lv.' + lv.level + ' · ' + lv.totalXp + ' XP</i></span>' +
        '</div>' +
        '<div class="slv__bar"><div class="slv__fill" style="width:' + lv.pct + '%"></div></div>' +
        '<div class="slv__foot"><span>' + lv.inLevel + '/' + lv.need + '</span><span>距升级 ' + (lv.need - lv.inLevel) + '</span></div>';
    }
    var xp = document.getElementById('topbar-xp');
    if (xp) {
      var p = store.progress();
      xp.innerHTML = '⚔️ ' + p.done + '/' + p.total + ' · Lv.' + lv.level;
    }
  }

  function renderReviewDot() {
    var need = new Date().getHours() >= 20 && !store.todayReview();
    document.querySelectorAll('.nav__dot, .bnav__dot').forEach(function (d) { d.hidden = !need; });
  }

  /** 侧边栏「考试闯关」上的倒计时小标 */
  function renderExamPill() {
    var pill = document.getElementById('nav-exam-pill');
    if (!pill || !Q.exam) return;
    var d = Q.exam.daysLeft();
    pill.hidden = false;
    pill.textContent = d > 0 ? d + ' 天' : '今天';
    pill.classList.toggle('is-soon', d <= 3);
  }

  /** 供考试模块调用：只刷新外壳数值，不重建页面 */
  function refreshChrome() {
    renderSidebar();
    renderExamPill();
  }

  /** 只刷新数值，不重建 DOM（用于完成动画期间） */
  function refreshLive() {
    var p = store.progress();
    var lv = store.levelInfo();
    var today = store.state.history[store.dateKey()] || { done: 0, xp: 0 };

    var bar = document.querySelector('.qbar__fill');
    if (bar) {
      bar.style.width = p.pct + '%';
      bar.classList.remove('fx-gain');
      void bar.offsetWidth;
      bar.classList.add('fx-gain');
    }
    setNum('[data-live="done"]', p.done);
    setNum('[data-live="xp"]', lv.totalXp);
    var pg = document.querySelector('[data-live="progress"]');
    if (pg) pg.innerHTML = p.done + ' <em>/ ' + p.total + '</em>';

    renderSidebar();
    var sf = document.querySelector('.slv__fill');
    if (sf) { sf.classList.remove('fx-gain'); void sf.offsetWidth; sf.classList.add('fx-gain'); }
  }

  function setNum(sel, v) {
    var el = document.querySelector(sel);
    if (!el) return;
    if (el.textContent !== String(v)) {
      el.textContent = v;
      el.classList.remove('fx-bump');
      void el.offsetWidth;
      el.classList.add('fx-bump');
    }
  }

  /* ============================================================
     完成任务 —— 击败一个小怪
     ============================================================ */
  function completeTask(id, cardEl) {
    var task = store.getTask(id);
    if (!task) return;
    var wasDone = task.done;
    var check = cardEl && cardEl.querySelector('.task__check');

    var res = store.toggleDone(id);
    if (!res) return;

    if (!wasDone) {
      // 卡片缩小 + 绿色光效 + 勾选动画
      if (cardEl) {
        cardEl.classList.remove('fx-defeat'); void cardEl.offsetWidth;
        cardEl.classList.add('fx-defeat');
      }
      if (check) {
        check.classList.remove('fx-check'); void check.offsetWidth;
        check.classList.add('fx-check');
      }
      fx.burst(check || cardEl);
      fx.xpFloat(cardEl || check, '+' + res.xp + ' XP');
      fx.sfx.complete();
    } else {
      if (cardEl) {
        cardEl.classList.remove('fx-revive'); void cardEl.offsetWidth;
        cardEl.classList.add('fx-revive');
      }
      fx.sfx.undo();
    }

    refreshLive();

    setTimeout(function () {
      render(current, true);
      afterReward(res);
    }, wasDone ? 220 : 480);
  }

  function afterReward(res) {
    var queue = [];

    if (res.cleared) queue.push(showClearModal.bind(null, res));
    if (res.levelUp) queue.push(showLevelModal.bind(null, res));
    if (res.unlocked && res.unlocked.length) queue.push(showUnlocks.bind(null, res.unlocked));

    (function next() {
      var fn = queue.shift();
      if (fn) fn(next);
    })();
  }

  function showClearModal(res, done) {
    var s = store.state;
    var p = store.progress();
    fx.celebrate();
    fx.sfx.clear();
    ui.celebrate({
      emoji: '🏆',
      title: '今日挑战完成！',
      message: '你把今天所有关卡都打穿了，这份掌控感值得记住。',
      rewards: [
        { value: '+' + (res.bonus || 0), label: '通关奖励 XP' },
        { value: p.total, label: '今日通关数' },
        { value: s.profile.streak + ' 天', label: '连续完成' }
      ],
      okText: '收下奖励',
      onClose: function () {
        render(current, true);
        if (done) done();
      }
    });
  }

  function showLevelModal(res, done) {
    setTimeout(function () {
      fx.levelUp();
      fx.sfx.levelup();
      ui.celebrate({
        variant: 'level',
        emoji: '⭐',
        title: '升级到 Lv.' + res.level + '！',
        message: '新称号：' + res.title + '。你正在变成更能把事做完的人。',
        rewards: [
          { value: 'Lv.' + res.level, label: '当前等级' },
          { value: res.title, label: '称号' }
        ],
        okText: '太棒了',
        onClose: function () { render(current, true); if (done) done(); }
      });
    }, res.cleared ? 120 : 0);
  }

  function showUnlocks(list, done) {
    list.forEach(function (a, i) {
      setTimeout(function () {
        fx.sfx.unlock();
        fx.toast('解锁成就：' + a.icon + ' ' + a.name, { kind: 'ok', duration: 3200 });
      }, i * 520);
    });
    if (done) setTimeout(done, list.length * 520);
  }

  /* ============================================================
     事件委托
     ============================================================ */
  function bind() {
    // 导航
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-route]');
      if (nav && (nav.classList.contains('nav__item') || nav.classList.contains('bnav__item'))) {
        fx.sfx.tap();
        render(nav.dataset.route);
        return;
      }

      var el = e.target.closest('[data-act]');
      if (!el) return;
      var act = el.dataset.act;
      var id = el.dataset.id;

      switch (act) {
        case 'toggle':
          completeTask(id, el.closest('.task'));
          break;

        case 'add':
          openAdd(el.dataset.bucket || 'today');
          break;

        case 'edit': {
          var t = store.getTask(id);
          if (!t) break;
          ui.taskModal({
            task: t,
            onSave: function (data) {
              store.updateTask(id, data);
              fx.toast('已更新');
              render(current, true);
            },
            onDelete: function () { doDelete(id); }
          });
          break;
        }

        case 'del':
          doDelete(id);
          break;

        case 'promote': {
          var tk = store.getTask(id);
          if (!tk) break;
          store.updateTask(id, { bucket: 'today', priority: tk.priority === 'p3' ? 'p2' : tk.priority });
          fx.sfx.tap();
          fx.toast('已加入今日挑战 ⚔️');
          render(current, true);
          setTimeout(function () {
            var card = document.querySelector('.task[data-id="' + id + '"]');
            if (card) card.classList.add('fx-promote');
          }, 20);
          break;
        }

        case 'goto':
          render(el.dataset.route);
          break;

        case 'clear-done': {
          var n = store.state.tasks.filter(function (x) { return x.done; }).length;
          ui.confirm({
            title: '清理已完成任务',
            message: '将移除 ' + n + ' 条已完成的任务。经验值和统计数据会保留，不影响你的等级。',
            okText: '清理',
            danger: true,
            onOk: function () {
              store.clearDone();
              fx.toast('已清理 ' + n + ' 条');
              render(current, true);
            }
          });
          break;
        }

        /* ---------- AI 助手 ---------- */
        case 'ai-sample': {
          var ta = document.getElementById('ai-input');
          if (ta) {
            ta.value = el.dataset.text;
            P.aiState.text = ta.value;
            ta.focus();
          }
          break;
        }

        case 'ai-run':      runAI(); break;
        case 'ai-plan':     runPlan(); break;
        case 'ai-apply':    applyAI(); break;
        case 'ai-clear':
          P.aiState.result = null;
          P.aiState.picked = {};
          render(current, true);
          break;

        /* ---------- AI 独立页面 ---------- */
        case 'ai-gear':
          openAISettings();
          break;
        case 'ai-tab':
          P.aiPageState.mode = el.dataset.mode;
          render('ai', true);
          if (P.aiPageState.mode === 'chat') scrollChat();
          break;
        case 'ai-coach-run':
          aiRunCoach();
          break;
        case 'ai-plan-run':
          aiRunPlan();
          break;
        case 'ai-send':
          sendChat();
          break;

        /* ---------- 复盘 ---------- */
        case 'rv-save':   saveReview(); break;
        case 'rv-import': importGoals(); break;

        /* ---------- 设置 ---------- */
        case 'set-sound': {
          var muted = !fx.isMuted();
          fx.setMuted(muted);
          el.innerHTML = (muted ? I.mute : I.sound) + (muted ? '音效已关闭' : '音效已开启');
          if (!muted) fx.sfx.tap();
          break;
        }
        case 'set-export': exportData(); break;
        case 'set-import': document.getElementById('import-file').click(); break;
        case 'set-reset':  resetData(); break;
      }
    });

    // 快速新增（移动端 FAB）
    var fab = document.getElementById('btn-quick-add');
    if (fab) fab.addEventListener('click', function () { fx.sfx.tap(); openAdd(current === 'tasks' ? 'today' : 'today'); });

    var setBtn = document.getElementById('btn-settings');
    if (setBtn) setBtn.addEventListener('click', openSettings);

    // 输入事件
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'ai-input') P.aiState.text = t.value;
      if (t.id === 'ai-compose') P.aiPageState.draft = t.value;
      if (t.id === 'task-search') {
        P.taskFilter.q = t.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { render('tasks', true); }, 180);
      }
      if (t.dataset && t.dataset.aiPick != null) {
        P.aiState.picked[t.dataset.aiPick] = t.checked;
      }
    });
    var searchTimer = null;

    document.addEventListener('change', function (e) {
      if (e.target.id === 'prio-filter') {
        P.taskFilter.priority = e.target.value;
        render('tasks', true);
      }
    });

    // 分段控件（筛选 / 心情）
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.seg__btn[data-filter]');
      if (b) {
        P.taskFilter[b.dataset.filter] = b.dataset.val;
        render('tasks', true);
        return;
      }
      var mood = e.target.closest('[data-seg="mood"] .seg__btn');
      if (mood) {
        mood.parentNode.querySelectorAll('.seg__btn').forEach(function (x) { x.classList.remove('is-on'); });
        mood.classList.add('is-on');
        fx.sfx.tap();
      }
    });

    // 键盘快捷键
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.overlay')) return;

      if (current === 'examPlay') return; // 答题页有自己的快捷键
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openAdd('today'); }
      else if (e.key >= '1' && e.key <= '5') { render(NAV_ROUTES[+e.key - 1]); }
      else if (e.key === '/') {
        e.preventDefault();
        render('tasks');
        setTimeout(function () {
          var s = document.getElementById('task-search');
          if (s) s.focus();
        }, 80);
      }
    });

    // AI 通用问答：在输入框里 Enter 发送，Shift+Enter 换行
    document.addEventListener('keydown', function (e) {
      if (e.target && e.target.id === 'ai-compose') {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
      }
    });

    // 导入文件
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.id = 'import-file';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          store.importJSON(rd.result);
          fx.toast('数据已导入');
          render(current);
        } catch (err) {
          fx.toast('导入失败：' + err.message, { kind: 'err' });
        }
        fileInput.value = '';
      };
      rd.readAsText(f);
    });
  }

  /* ---------------- 新增 / 删除 ---------------- */
  function openAdd(bucket) {
    ui.taskModal({
      bucket: bucket,
      onSave: function (data) {
        var t = store.addTask(data);
        render(current, true);
        setTimeout(function () {
          var card = document.querySelector('.task[data-id="' + t.id + '"]');
          if (card) {
            card.classList.add('fx-spawn');
            card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 20);
        fx.sfx.tap();
        fx.toast('已加入「' + store.BUCKETS[data.bucket].name + '」');
      }
    });
  }

  function doDelete(id) {
    var t = store.getTask(id);
    if (!t) return;
    var card = document.querySelector('.task[data-id="' + id + '"]');
    var snapshot = store.clone(t);

    if (card) card.classList.add('fx-vanish');
    setTimeout(function () {
      store.removeTask(id);
      render(current, true);
      fx.toast('已删除「' + (t.title.length > 12 ? t.title.slice(0, 11) + '…' : t.title) + '」', {
        kind: 'warn',
        undo: function () {
          store.restoreTask(snapshot);
          render(current, true);
          fx.toast('已恢复');
        }
      });
    }, card ? 320 : 0);
  }

  /* ---------------- AI 助手 ---------------- */
  function runAI() {
    var ta = document.getElementById('ai-input');
    var text = ta ? ta.value : P.aiState.text;
    if (!text.trim()) {
      if (ta) {
        ta.classList.add('fx-shake');
        ta.focus();
        setTimeout(function () { ta.classList.remove('fx-shake'); }, 400);
      }
      return;
    }
    P.aiState.text = text;
    P.aiState.busy = true;
    P.aiState.picked = {};
    render(current, true);

    setTimeout(function () {
      P.aiState.busy = false;
      P.aiState.result = engine.analyze(text);
      var unlocked = store.trackAI();
      render(current, true);
      fx.sfx.tap();
      if (unlocked.length) showUnlocks(unlocked);
    }, 620);
  }

  function runPlan() {
    var r = engine.planExisting();
    if (!r.ok) { fx.toast(r.message, { kind: 'warn' }); return; }

    var rows = r.order.map(function (o, i) {
      var t = o.task;
      var B = store.BUCKETS[t.bucket];
      var Pr = store.PRIORITIES[t.priority];
      return '<div class="ai__item" style="animation-delay:' + (i * 45) + 'ms">' +
        '<span class="goalrow__idx">' + (i + 1) + '</span>' +
        '<p style="flex:1">' + esc(t.title) + '</p>' +
        '<span class="chip chip--plain">' + B.emoji + '</span>' +
        '<span class="chip chip--' + t.priority + '">' + esc(Pr.name) + '</span>' +
        '<span class="chip chip--plain">' + ui.fmtMin(t.estimate || 30) + '</span>' +
      '</div>';
    }).join('');

    var tips = r.tips.map(function (t) {
      return '<div style="display:flex;gap:7px;margin-top:6px;font-size:12.5px;line-height:1.55">' +
             '<span style="color:var(--brand);flex:none">▸</span><span>' + esc(t) + '</span></div>';
    }).join('');

    ui.modal(
      '<div class="modal modal--wide">' +
        '<div class="modal__head">' +
          '<span class="sec-icon sec-icon--brand">' + I.target + '</span>' +
          '<h3>今天的推荐顺序</h3>' +
          '<button class="iconbtn" data-close>' + I.x + '</button>' +
        '</div>' +
        '<div class="modal__body">' +
          '<div class="ai__summary">共 <b>' + r.order.length + '</b> 件待办，预计 <b>' + ui.fmtMin(r.minutes) + '</b>。' +
          '按「优先级 × 截止时间 × 快速拿分」排序：' + tips + '</div>' +
          '<div>' + rows + '</div>' +
        '</div>' +
        '<div class="modal__foot"><button class="btn btn--primary" data-close>知道了</button></div>' +
      '</div>'
    );
    store.trackAI();
    fx.sfx.tap();
  }

  function applyAI() {
    var r = P.aiState.result;
    if (!r || !r.ok) return;
    var added = 0, byBucket = { urgent: 0, today: 0, inbox: 0 };

    ['urgent', 'today', 'inbox'].forEach(function (b) {
      r.groups[b].forEach(function (t, i) {
        var key = b + ':' + i;
        if (P.aiState.picked[key] === false) return;
        store.addTask({
          title: t.title, bucket: b, priority: t.priority,
          estimate: t.estimate, due: t.due
        });
        added++; byBucket[b]++;
      });
    });

    if (!added) { fx.toast('一条都没勾选', { kind: 'warn' }); return; }

    P.aiState.result = null;
    P.aiState.text = '';
    P.aiState.picked = {};
    render(current, true);

    fx.sfx.clear();
    fx.spawn(global.innerWidth / 2, global.innerHeight * .35, { count: 24, power: 9, size: 7, life: 70 });
    fx.toast('已加入 ' + added + ' 个任务（紧急 ' + byBucket.urgent + ' · 今日 ' + byBucket.today + ' · 仓库 ' + byBucket.inbox + '）', { duration: 3600 });
  }

  /* ---------------- AI 独立页面 ---------------- */
  function scrollChat() {
    var c = document.getElementById('aip-chat');
    if (c) c.scrollTop = c.scrollHeight;
  }

  function aiRunCoach() {
    var st = P.aiPageState;
    if (st.busy) return;
    st.busy = true; render('ai', true);
    var done = function () {
      st.busy = false;
      st.coach = Q.ai.examCoach();
      render('ai', true);
      fx.sfx.tap();
    };
    if (Q.exam && Q.exam.init && !Q.exam.ready()) {
      Q.exam.init().then(done, function () {
        st.busy = false;
        st.coach = { ok: false, message: '题库加载失败，请先在「考试闯关」里等待题库就绪后再试。' };
        render('ai', true);
      });
    } else {
      setTimeout(done, 360);
    }
  }

  function aiRunPlan() {
    var st = P.aiPageState;
    if (st.busy) return;
    st.busy = true; render('ai', true);
    setTimeout(function () {
      st.busy = false;
      st.plan = Q.ai.taskPlan();
      render('ai', true);
      fx.sfx.tap();
    }, 320);
  }

  function sendChat() {
    var st = P.aiPageState;
    var ta = document.getElementById('ai-compose');
    var text = (ta ? ta.value : st.draft || '').trim();
    if (!text || st.busy) return;
    st.draft = '';
    st.chat.push({ role: 'user', text: text });
    st.busy = true;
    st.chat.push({ role: 'bot', typing: true });
    render('ai', true);
    scrollChat();

    Q.ai.chat(text, {
      system: '你是 Questly 的 AI 学习 / 效率助手，语气亲切、简洁、实用。用户正在用一款叫 Questly 的 gamified 个人效率工具，可以帮他规划任务、备考刷题。回答用中文，分点清晰，避免冗长。'
    }).then(function (reply) {
      st.chat = st.chat.filter(function (m) { return !m.typing; });
      st.chat.push({ role: 'bot', text: reply });
      st.busy = false;
      render('ai', true);
      scrollChat();
      fx.sfx.tap();
    }).catch(function (e) {
      st.chat = st.chat.filter(function (m) { return !m.typing; });
      st.chat.push({ role: 'bot', err: true, text: (e && e.message) || '出错了，请稍后再试。' });
      st.busy = false;
      render('ai', true);
      scrollChat();
    });
  }

  function openAISettings() {
    var s = Q.ai.get();
    var IC = P.aiIcon;
    var body = '<div class="ai-set">' +
      '<div class="ai-set__hint">⚙️ 这些设置只保存在你本机浏览器（localStorage），不会上传到任何服务器。API Key 仅作为请求头发给「你填写的官方接口」，不会出现在消息体或界面里。</div>' +
      '<div class="ai-field"><label>平台（仅作备注）</label><input id="ai-plat" placeholder="如 OpenAI / DeepSeek / 通义千问" value="' + esc(s.platform) + '"></div>' +
      '<div class="ai-field"><label>模型名</label><input id="ai-model" placeholder="如 gpt-4o / deepseek-chat" value="' + esc(s.model) + '"></div>' +
      '<div class="ai-field"><label>API 地址（chat/completions）</label><input id="ai-url" placeholder="https://api.openai.com/v1/chat/completions" value="' + esc(s.apiUrl) + '"></div>' +
      '<div class="ai-field"><label>API Key</label><div class="ai-keywrap"><input id="ai-key" type="password" placeholder="粘贴你的 key（仅存本机）" value="' + esc(s.apiKey) + '"><button class="ai-eye" data-ai-eye title="显示/隐藏">' + IC.eye + '</button></div></div>' +
      (s.apiKey ? '<div class="ai-mask">当前 Key：' + esc(Q.ai.maskKey(s.apiKey)) + '</div>' : '') +
      '<div class="ai-err" id="ai-err"></div>' +
      '<div class="ai-ok" id="ai-ok"></div>' +
      '<div class="ai-set__row">' +
        '<button class="btn btn--soft" data-ai-test>连接测试</button>' +
        '<button class="btn btn--primary" data-ai-save>保存</button>' +
      '</div>' +
      '<div class="ai-set__row">' +
        '<button class="btn btn--ghost" data-ai-clear style="flex:1">清空设置</button>' +
      '</div>' +
    '</div>';
    var m = ui.modal(
      '<div class="modal modal--wide"><div class="modal__head">' +
        '<span class="sec-icon sec-icon--brand">' + IC.gear + '</span><h3>AI 联网设置</h3>' +
        '<button class="iconbtn" data-close>' + I.x + '</button></div>' +
        '<div class="modal__body">' + body + '</div></div>'
    );

    m.find('[data-ai-eye]').addEventListener('click', function () {
      var inp = m.find('#ai-key');
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      this.innerHTML = show ? IC.eyeOff : IC.eye;
    });
    m.find('[data-ai-test]').addEventListener('click', function () {
      var errEl = m.find('#ai-err'), okEl = m.find('#ai-ok');
      errEl.textContent = ''; okEl.textContent = '测试中…';
      Q.ai.save({
        platform: m.find('#ai-plat').value, model: m.find('#ai-model').value,
        apiUrl: m.find('#ai-url').value, apiKey: m.find('#ai-key').value
      });
      Q.ai.test().then(function (r) {
        okEl.textContent = r.ok ? r.message : '';
        errEl.textContent = r.ok ? '' : r.message;
      });
    });
    m.find('[data-ai-save]').addEventListener('click', function () {
      Q.ai.save({
        platform: m.find('#ai-plat').value, model: m.find('#ai-model').value,
        apiUrl: m.find('#ai-url').value, apiKey: m.find('#ai-key').value
      });
      fx.toast('已保存 · 仅存本机');
      m.close();
      if (current === 'ai') render('ai', true);
    });
    m.find('[data-ai-clear]').addEventListener('click', function () {
      Q.ai.clear();
      m.find('#ai-plat').value = '';
      m.find('#ai-model').value = '';
      m.find('#ai-url').value = '';
      m.find('#ai-key').value = '';
      var mask = m.find('.ai-mask'); if (mask) mask.remove();
      fx.toast('已清空联网设置');
      if (current === 'ai') render('ai', true);
    });
  }

  /* ---------------- 复盘 ---------------- */
  function saveReview() {
    var summary = (document.getElementById('rv-summary') || {}).value || '';
    var goals = Array.prototype.slice.call(document.querySelectorAll('[data-goal]')).map(function (i) { return i.value; });
    var moodBtn = document.querySelector('[data-seg="mood"] .seg__btn.is-on');
    var mood = moodBtn ? moodBtn.dataset.val : 'ok';

    if (!summary.trim() && !goals.filter(Boolean).length) {
      fx.toast('至少写点什么吧，一句话也行', { kind: 'warn' });
      var ta = document.getElementById('rv-summary');
      if (ta) { ta.classList.add('fx-shake'); ta.focus(); setTimeout(function () { ta.classList.remove('fx-shake'); }, 400); }
      return;
    }

    var isFirst = !store.todayReview();
    var out = store.saveReview({ summary: summary, goals: goals, mood: mood });

    if (isFirst) {
      store.state.profile.xp += 20;
      store.state.stats.totalXpEarned += 20;
      store.save();
      fx.xpFloat(document.querySelector('[data-act="rv-save"]'), '+20 XP', true);
      fx.spawn(global.innerWidth / 2, global.innerHeight * .5, { count: 20, power: 8, size: 7, life: 65 });
      fx.sfx.complete();
    }

    render(current, true);
    fx.toast(isFirst ? '复盘已保存 · +20 XP' : '复盘已更新');
    if (out.unlocked && out.unlocked.length) showUnlocks(out.unlocked);
    renderReviewDot();
  }

  function importGoals() {
    var goals = Array.prototype.slice.call(document.querySelectorAll('[data-goal]'))
      .map(function (i) { return i.value.trim(); }).filter(Boolean);
    if (!goals.length) { fx.toast('先填写明天的重点', { kind: 'warn' }); return; }

    ui.confirm({
      title: '加入今日挑战',
      icon: I.right,
      message: '将把 ' + goals.length + ' 个重点作为任务加入「今日挑战」，明天打开就能直接开干。',
      okText: '加入',
      onOk: function () {
        var n = store.importGoals(goals);
        fx.toast('已加入 ' + n + ' 个任务 ⚔️');
        fx.sfx.tap();
        render('tasks');
      }
    });
  }

  /* ---------------- 设置 ---------------- */
  function openSettings() {
    var s = store.state;
    var muted = fx.isMuted();
    var size = 0;
    try { size = (global.localStorage.getItem('questly.v1') || '').length; } catch (e) {}

    ui.modal(
      '<div class="modal">' +
        '<div class="modal__head">' +
          '<span class="sec-icon sec-icon--brand">' + I.chart + '</span>' +
          '<h3>数据与设置</h3>' +
          '<button class="iconbtn" data-close>' + I.x + '</button>' +
        '</div>' +
        '<div class="modal__body">' +
          '<div class="ai__summary">' +
            '所有数据都保存在<b>你自己的浏览器</b>里，不上传、不需要登录，刷新和关闭后依然保留。' +
            '<div style="margin-top:8px;font-size:11.5px;color:var(--text-3)">' +
              '任务 ' + s.tasks.length + ' 条 · 复盘 ' + s.reviews.length + ' 篇 · 占用约 ' + Math.max(1, Math.round(size / 1024)) + ' KB' +
              (store.ok ? '' : ' · <span style="color:var(--danger)">当前环境无法写入本地存储</span>') +
            '</div>' +
          '</div>' +
          '<button class="btn btn--outline btn--block" data-act="set-sound">' +
            (muted ? I.mute : I.sound) + (muted ? '音效已关闭' : '音效已开启') +
          '</button>' +
          '<div class="grid-2">' +
            '<button class="btn btn--ghost" data-act="set-export">' + I.down + '导出备份</button>' +
            '<button class="btn btn--ghost" data-act="set-import">' + I.up + '导入数据</button>' +
          '</div>' +
          '<button class="btn btn--danger btn--block" data-act="set-reset">' + I.refresh + '重置所有数据</button>' +
          '<div class="t-xs" style="text-align:center;line-height:1.7">' +
            '快捷键：<b>N</b> 新增任务 · <b>1–4</b> 切换页面 · <b>/</b> 搜索<br>' +
            'Questly · 游戏化个人效率工作台' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function exportData() {
    var blob = new Blob([store.exportJSON()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'questly-backup-' + store.dateKey() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    fx.toast('备份已下载');
  }

  function resetData() {
    ui.confirm({
      title: '重置所有数据',
      danger: true,
      icon: I.refresh,
      message: '任务、经验值、等级、成就和复盘记录都会被清空，且无法恢复。建议先导出备份。',
      okText: '确认重置',
      onOk: function () {
        store.resetAll(true);
        document.querySelectorAll('.overlay').forEach(function (o) { o.remove(); });
        document.body.style.overflow = '';
        P.aiState.result = null;
        P.aiState.text = '';
        render('home');
        fx.toast('已重置为初始状态');
      }
    });
  }

  /* ---------------- 首次引导 ---------------- */
  function maybeWelcome() {
    if (store.state.meta.tipsSeen) return;
    store.state.meta.tipsSeen = true;
    store.save();
    setTimeout(function () {
      ui.celebrate({
        emoji: '⚔️',
        title: '欢迎来到 Questly',
        message: '这里不是待办清单，而是你的个人成长游戏系统。每完成一个任务 = 击败一只小怪，攒经验、升等级、解锁成就。',
        rewards: [
          { value: '3', label: '任务分区' },
          { value: '16', label: '可解锁成就' },
          { value: '∞', label: '连续天数' }
        ],
        okText: '开始今天的挑战',
        onClose: function () {
          fx.spawn(global.innerWidth / 2, global.innerHeight * .4, { count: 32, power: 11, size: 8, life: 90 });
        }
      });
    }, 480);
  }

  /* ---------------- 跨天检测 ---------------- */
  function watchMidnight() {
    setInterval(function () {
      if (store.state.meta.lastDay !== store.dateKey()) {
        store.rollover();
        render(current);
        fx.toast('新的一天开始了，今日进度已重置 🌅', { duration: 4200 });
      }
      renderReviewDot();
    }, 30000);
  }

  /* ============================================================
     启动
     ============================================================ */
  function boot() {
    store.load();
    store.rollover();
    store.checkAchievements(true);

    fx.init();
    ui.initDnD();
    bind();
    if (Q.epages) Q.epages.bind();
    render('home');
    watchMidnight();
    maybeWelcome();

    // 后台预热题库，首页 / 成长 / 复盘的考试卡片就能立刻显示真实数据
    if (Q.exam) {
      Q.exam.init().then(function () {
        renderExamPill();
        if (current === 'home' || current === 'exam' || current === 'review' || current === 'growth') render(current, true);
      }).catch(function () {});
    }

    store.on('store:reloaded', function () { render(current); });

    if (!store.ok) {
      setTimeout(function () {
        fx.toast('当前环境无法使用本地存储，数据不会被保存', { kind: 'warn', duration: 5000 });
      }, 1200);
    }
  }

  /* ---------------- 对外暴露 ---------------- */
  Q.goto = function (route) { render(route); };
  Q.app = {
    render: render,
    refreshChrome: refreshChrome,
    current: function () { return current; },
    showUnlocks: showUnlocks
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);

/* ============================================================
   启动密码锁（方案 C：仅威慑，非真安全）
   密码以 djb2 哈希存储，避免明文出现在源码；改 LOCK_HASH 即可换密码。
   注意：纯前端校验，资源仍可下载绕过，仅挡住随手打开的人。
   ============================================================ */
;(function () {
  var LOCK_HASH = 'c73a3cdb'; // djb2('mingzhi')

  function djb2(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }

  function unlock() {
    var inp = document.getElementById('lock-input');
    var err = document.getElementById('lock-err');
    var v = (inp && inp.value) || '';
    if (djb2(v) === LOCK_HASH) {
      document.body.classList.remove('is-locked');
      if (err) err.hidden = true;
      if (inp) inp.value = '';
    } else {
      if (err) err.hidden = false;
      if (inp) { inp.value = ''; inp.focus(); }
    }
  }

  function bindLock() {
    var btn = document.getElementById('lock-btn');
    var inp = document.getElementById('lock-input');
    if (!btn || !inp) return;
    btn.addEventListener('click', unlock);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
    inp.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLock);
  } else {
    bindLock();
  }
})();
