/* ============================================================
   ui.js — 通用 UI：图标 / 格式化 / 任务卡片 / 弹层 / 拖拽
   ============================================================ */
(function (global) {
  'use strict';

  var Q = global.Q || (global.Q = {});
  var store = Q.store, fx = Q.fx;

  /* ---------------- 图标 ---------------- */
  var I = {
    plus:    '<svg viewBox="0 0 24 24"><path d="M11 5h2v14h-2z"/><path d="M5 11h14v2H5z"/></svg>',
    check:   '<svg viewBox="0 0 24 24" fill="none"><path d="m5 12.4 4.4 4.4L19 7.2"/></svg>',
    edit:    '<svg viewBox="0 0 24 24"><path d="M4 16.8 15.3 5.5l3.2 3.2L7.2 20H4v-3.2Zm12.6-12.6 1.5-1.5a1 1 0 0 1 1.4 0l1.8 1.8a1 1 0 0 1 0 1.4l-1.5 1.5-3.2-3.2Z"/></svg>',
    trash:   '<svg viewBox="0 0 24 24"><path d="M8.2 3.4h7.6v1.8h4.6V7H3.6V5.2h4.6V3.4ZM5.6 8.4h12.8l-.9 11.1a1.4 1.4 0 0 1-1.4 1.3H7.9a1.4 1.4 0 0 1-1.4-1.3L5.6 8.4Z"/></svg>',
    clock:   '<svg viewBox="0 0 24 24"><path d="M12 2.6A9.4 9.4 0 1 0 21.4 12 9.4 9.4 0 0 0 12 2.6Zm.9 9.9-3.6 2.4-1-1.5 2.8-1.9V6.5h1.8v6Z"/></svg>',
    cal:     '<svg viewBox="0 0 24 24"><path d="M7 2.6h1.9v2H15V2.6h1.9v2h2.4a1 1 0 0 1 1 1v14.8a1 1 0 0 1-1 1H4.7a1 1 0 0 1-1-1V5.6a1 1 0 0 1 1-1H7v-2ZM5.6 9.4v9.9h12.8V9.4Z"/></svg>',
    flag:    '<svg viewBox="0 0 24 24"><path d="M5.4 2.6h1.9v18.8H5.4Zm3.1 1.1h10.9l-2.4 4 2.4 4H8.5Z"/></svg>',
    right:   '<svg viewBox="0 0 24 24"><path d="m12.6 4.6 7.1 7.1-7.1 7.1-1.4-1.4 4.7-4.7H4.3v-2h11.6l-4.7-4.7Z"/></svg>',
    spark:   '<svg viewBox="0 0 24 24"><path d="M12 2.2 13.8 8 19.6 9.8 13.8 11.6 12 17.4 10.2 11.6 4.4 9.8 10.2 8Zm6.4 9.6.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9ZM5 14.6l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2L2.1 17.5l2.2-.7Z"/></svg>',
    fire:    '<svg viewBox="0 0 24 24"><path d="M13 2.4s.7 3-1.6 5.4C9.4 10 7.4 11 7.4 14.2A5.6 5.6 0 0 0 13 19.8a5.6 5.6 0 0 0 5.6-5.6c0-4.4-3.5-6.4-5.6-11.8ZM12 21.6a3.3 3.3 0 0 1-3.3-3.3c0-1.9 1.2-2.5 2.4-4.2.6 1.9 2.5 2.1 2.5 4.2A3.2 3.2 0 0 1 12 21.6Z"/></svg>',
    target:  '<svg viewBox="0 0 24 24"><path d="M12 2.6A9.4 9.4 0 1 0 21.4 12 9.4 9.4 0 0 0 12 2.6Zm0 3.2A6.2 6.2 0 1 1 5.8 12 6.2 6.2 0 0 1 12 5.8Zm0 3.1A3.1 3.1 0 1 0 15.1 12 3.1 3.1 0 0 0 12 8.9Z"/></svg>',
    trophy:  '<svg viewBox="0 0 24 24"><path d="M6 3.4h12v1.9h3v3.2a4.2 4.2 0 0 1-3.7 4.1A6.1 6.1 0 0 1 13 15.9v2.6h3.4v2H7.6v-2H11v-2.6a6.1 6.1 0 0 1-4.3-3.3A4.2 4.2 0 0 1 3 8.5V5.3h3V3.4Zm0 3.8H4.8v1.3a2.4 2.4 0 0 0 1.2 2Zm12 0v3.3a2.4 2.4 0 0 0 1.2-2V7.2Z"/></svg>',
    chart:   '<svg viewBox="0 0 24 24"><path d="M4 13.6h3.2v6.8H4Zm6.4-5.2h3.2v12h-3.2Zm6.4-4.8H20v16.8h-3.2Z"/></svg>',
    search:  '<svg viewBox="0 0 24 24"><path d="M10.4 3.2a7.2 7.2 0 1 1-4.6 12.7l-3 3-1.4-1.4 3-3A7.2 7.2 0 0 1 10.4 3.2Zm0 2a5.2 5.2 0 1 0 5.2 5.2 5.2 5.2 0 0 0-5.2-5.2Z"/></svg>',
    x:       '<svg viewBox="0 0 24 24"><path d="m12 10.6 5-5 1.4 1.4-5 5 5 5-1.4 1.4-5-5-5 5-1.4-1.4 5-5-5-5L7 5.6Z"/></svg>',
    wand:    '<svg viewBox="0 0 24 24"><path d="m3.4 18.5 11-11 2.1 2.1-11 11ZM17.6 3.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM7 2.6l.6 1.6 1.6.6-1.6.6L7 7l-.6-1.6-1.6-.6L6.4 4.2ZM19 14.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z"/></svg>',
    down:    '<svg viewBox="0 0 24 24"><path d="M11 3.4h2v10l3.7-3.7 1.4 1.4-6.1 6.1-6.1-6.1 1.4-1.4L11 13.4Zm-7 15h16v2H4Z"/></svg>',
    up:      '<svg viewBox="0 0 24 24"><path d="m12 3 6.1 6.1-1.4 1.4L13 6.8v10h-2v-10l-3.7 3.7L5.9 9.1Zm-8 15.4h16v2H4Z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M12 4.4a7.6 7.6 0 0 1 7.3 5.5l1.9-.6A9.6 9.6 0 0 0 4.9 7.1V4.4H3v6.2h6.2V8.7H6.1A7.6 7.6 0 0 1 12 4.4Zm0 15.2a7.6 7.6 0 0 1-7.3-5.5l-1.9.6a9.6 9.6 0 0 0 16.3 2.2v2.7H21v-6.2h-6.2v1.9h3.1a7.6 7.6 0 0 1-5.9 4.3Z"/></svg>',
    sound:   '<svg viewBox="0 0 24 24"><path d="M4 9h3.2L12 4.6v14.8L7.2 15H4Zm11.5-.7a5 5 0 0 1 0 7.4l-1.3-1.4a3.1 3.1 0 0 0 0-4.6Zm2.4-2.6a8.4 8.4 0 0 1 0 12.6l-1.3-1.4a6.5 6.5 0 0 0 0-9.8Z"/></svg>',
    mute:    '<svg viewBox="0 0 24 24"><path d="M4 9h3.2L12 4.6v14.8L7.2 15H4Zm12.9.3 1.4-1.4 1.9 1.9 1.9-1.9 1.4 1.4-1.9 1.9 1.9 1.9-1.4 1.4-1.9-1.9-1.9 1.9-1.4-1.4 1.9-1.9Z"/></svg>',
    note:    '<svg viewBox="0 0 24 24"><path d="M6 3.4h9.2L20 8.1V20a1.2 1.2 0 0 1-1.2 1.2H6A1.2 1.2 0 0 1 4.8 20V4.6A1.2 1.2 0 0 1 6 3.4Zm2 8h8v1.8H8zm0 3.8h5.6V17H8z"/></svg>',
    grip:    '<svg viewBox="0 0 24 24"><path d="M9 5.2h2.2v2.2H9Zm3.8 0H15v2.2h-2.2ZM9 10.9h2.2v2.2H9Zm3.8 0H15v2.2h-2.2ZM9 16.6h2.2v2.2H9Zm3.8 0H15v2.2h-2.2Z"/></svg>',
    bolt:    '<svg viewBox="0 0 24 24"><path d="M13.4 2.2 5.2 13.6h5.1L9.8 21.8l8.4-11.6h-5.3Z"/></svg>',
    inbox:   '<svg viewBox="0 0 24 24"><path d="M4.4 3.6h15.2L21.4 13v7.2a1.2 1.2 0 0 1-1.2 1.2H3.8a1.2 1.2 0 0 1-1.2-1.2V13Zm1.3 1.9L4.3 12.4h4.4l1 2.6h4.6l1-2.6h4.4L18.3 5.5Z"/></svg>',
    shield:  '<svg viewBox="0 0 24 24"><path d="M12 2.2 20.4 5v6.4c0 4.6-3.3 8.5-8.4 10.4C6.9 19.9 3.6 16 3.6 11.4V5Zm-.9 12.6 5.3-5.3-1.4-1.4-3.9 3.9-1.9-1.9-1.4 1.4Z"/></svg>',
    book:    '<svg viewBox="0 0 24 24"><path d="M3.6 4.2h5.9a3.1 3.1 0 0 1 3.1 3.1v13a2.6 2.6 0 0 0-2.2-1.2H3.6Zm16.8 0h-5.9a3.1 3.1 0 0 0-3.1 3.1v13a2.6 2.6 0 0 1 2.2-1.2h6.8Z"/></svg>'
  };

  /* ---------------- 格式化 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtMin(m) {
    m = m | 0;
    if (!m) return '';
    if (m < 60) return m + ' 分钟';
    var h = Math.floor(m / 60), r = m % 60;
    return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
  }

  function fmtDue(ts) {
    if (!ts) return null;
    var now = new Date(), d = new Date(ts);
    var dk = store.dateKey(d), tk = store.dateKey(now);
    var hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var diffDays = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) -
                               new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    var label;
    if (dk === tk) label = '今天 ' + hh;
    else if (diffDays === 1) label = '明天 ' + hh;
    else if (diffDays === 2) label = '后天 ' + hh;
    else if (diffDays === -1) label = '昨天 ' + hh;
    else if (diffDays > 0 && diffDays < 7) label = '周' + '日一二三四五六'[d.getDay()] + ' ' + hh;
    else label = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hh;

    var state = '';
    var diffH = (ts - Date.now()) / 3600000;
    if (diffH < 0) state = 'is-over';
    else if (diffH <= 6) state = 'is-soon';
    return { label: label, state: state, over: diffH < 0 };
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function greet() {
    var h = new Date().getHours();
    if (h < 5)  return '夜深了';
    if (h < 9)  return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    if (h < 22) return '晚上好';
    return '夜深了';
  }

  function todayLabel() {
    var d = new Date();
    var w = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + w;
  }

  /* ---------------- 任务卡片 ---------------- */
  function taskHTML(t, opts) {
    opts = opts || {};
    var P = store.PRIORITIES[t.priority] || store.PRIORITIES.p2;
    var due = fmtDue(t.due);
    var xp = store.xpFor(t);
    var meta = [];

    meta.push('<span class="chip chip--' + t.priority + '">' + esc(P.name) + '</span>');
    if (t.estimate) meta.push('<span class="chip chip--plain">' + I.clock + fmtMin(t.estimate) + '</span>');
    if (due) meta.push('<span class="chip chip--due ' + due.state + '">' + I.cal + esc(due.label) + '</span>');
    if (!t.done) meta.push('<span class="chip chip--xp">+' + xp + ' XP</span>');
    else meta.push('<span class="chip chip--ok">' + I.check.replace('fill="none"', 'fill="none" stroke="currentColor" stroke-width="2.6"') + ' 已通关</span>');

    var tools = '';
    if (opts.promote && t.bucket === 'inbox' && !t.done) {
      tools += '<button class="iconbtn" data-act="promote" data-id="' + t.id + '" title="加入今日挑战">' + I.right + '</button>';
    }
    tools += '<button class="iconbtn" data-act="edit" data-id="' + t.id + '" title="编辑">' + I.edit + '</button>';
    tools += '<button class="iconbtn iconbtn--danger" data-act="del" data-id="' + t.id + '" title="删除">' + I.trash + '</button>';

    return '' +
      '<div class="task' + (t.done ? ' is-done' : '') + '" data-id="' + t.id + '" data-priority="' + t.priority + '" data-bucket="' + t.bucket + '">' +
        '<button class="task__check" data-act="toggle" data-id="' + t.id + '" aria-label="' + (t.done ? '取消完成' : '完成任务') + '">' + I.check + '</button>' +
        '<div class="task__main">' +
          '<div class="task__title">' + esc(t.title) + '</div>' +
          (t.note ? '<div class="task__note">' + esc(t.note) + '</div>' : '') +
          '<div class="task__meta">' + meta.join('') + '</div>' +
        '</div>' +
        '<div class="task__tools">' + tools + '</div>' +
      '</div>';
  }

  function listHTML(bucket, opts) {
    opts = opts || {};
    var items = store.byBucket(bucket);
    if (opts.filter) items = items.filter(opts.filter);
    if (opts.limit) items = items.slice(0, opts.limit);

    var body = items.length
      ? items.map(function (t) { return taskHTML(t, opts); }).join('')
      : emptyHTML(bucket);

    return '<div class="tasklist stagger" data-dropzone="' + bucket + '">' + body + '</div>';
  }

  var EMPTIES = {
    urgent: ['🌤️', '没有紧急事项', '很好，今天没有火要救'],
    today:  ['🎯', '还没有今日挑战', '从灵感仓库挑一件，或者直接新增'],
    inbox:  ['💡', '仓库是空的', '把突然冒出来的想法先扔进来']
  };

  function emptyHTML(bucket) {
    var e = EMPTIES[bucket] || ['📭', '暂无内容', ''];
    return '<div class="empty"><div class="empty__emoji">' + e[0] + '</div><b>' + e[1] + '</b><span>' + e[2] + '</span></div>';
  }

  /* ---------------- 弹层 ---------------- */
  var openModals = [];

  function modal(html, opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = html;
    root.appendChild(ov);
    document.body.style.overflow = 'hidden';

    var api = {
      el: ov,
      find: function (sel) { return ov.querySelector(sel); },
      findAll: function (sel) { return Array.prototype.slice.call(ov.querySelectorAll(sel)); },
      close: close
    };
    openModals.push(api);

    function close(result) {
      var i = openModals.indexOf(api);
      if (i < 0) return;
      openModals.splice(i, 1);
      ov.classList.add('is-closing');
      setTimeout(function () {
        ov.remove();
        if (!openModals.length) document.body.style.overflow = '';
      }, 190);
      if (opts.onClose) opts.onClose(result);
    }

    if (opts.dismissable !== false) {
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(null); });
      ov.addEventListener('click', function (e) {
        if (e.target.closest('[data-close]')) close(null);
      });
    }

    setTimeout(function () {
      var f = ov.querySelector('[data-autofocus]');
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 60);

    return api;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.length) {
      openModals[openModals.length - 1].close(null);
    }
  });

  /* ---------------- 任务编辑弹层 ---------------- */
  function taskModal(opts) {
    opts = opts || {};
    var t = opts.task || null;
    var bucket = t ? t.bucket : (opts.bucket || 'today');
    var priority = t ? t.priority : (bucket === 'urgent' ? 'p0' : 'p2');
    var estimate = t ? (t.estimate || 30) : 30;
    var dueVal = '';
    if (t && t.due) {
      var d = new Date(t.due);
      dueVal = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes());
    }
    function p2(n) { return (n < 10 ? '0' : '') + n; }

    var PS = ['p0', 'p1', 'p2', 'p3'];
    var BS = ['urgent', 'today', 'inbox'];

    var html = '' +
    '<div class="modal">' +
      '<div class="modal__head">' +
        '<span class="sec-icon sec-icon--brand">' + (t ? I.edit : I.plus) + '</span>' +
        '<h3>' + (t ? '编辑任务' : '新增任务') + '</h3>' +
        '<button class="iconbtn" data-close aria-label="关闭">' + I.x + '</button>' +
      '</div>' +
      '<div class="modal__body">' +
        '<div class="field">' +
          '<label for="f-title">任务名称</label>' +
          '<input id="f-title" class="input" data-autofocus maxlength="80" placeholder="例如：18 点前回复客户合同修改意见" value="' + esc(t ? t.title : (opts.title || '')) + '">' +
        '</div>' +
        '<div class="field">' +
          '<label>放到哪里</label>' +
          '<div class="seg" data-seg="bucket">' +
            BS.map(function (b) {
              var B = store.BUCKETS[b];
              return '<button class="seg__btn' + (b === bucket ? ' is-on' : '') + '" data-val="' + b + '">' + B.emoji + ' ' + B.name + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label>优先级</label>' +
          '<div class="seg" data-seg="priority">' +
            PS.map(function (p) {
              var P = store.PRIORITIES[p];
              return '<button class="seg__btn' + (p === priority ? ' is-on' : '') + '" data-val="' + p + '" data-priority="' + p + '">' +
                     '<i style="background:' + P.color + '"></i>' + P.name + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="grid-2">' +
          '<div class="field">' +
            '<label for="f-est">预计耗时</label>' +
            '<select id="f-est" class="select">' +
              [10,15,20,25,30,45,60,90,120,180,240].map(function (m) {
                return '<option value="' + m + '"' + (m === estimate ? ' selected' : '') + '>' + fmtMin(m) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="f-due">截止时间</label>' +
            '<input id="f-due" class="input" type="datetime-local" value="' + dueVal + '">' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="f-note">备注（可选）</label>' +
          '<textarea id="f-note" class="textarea" style="min-height:64px" maxlength="200" placeholder="补充一点上下文，未来的你会感谢现在的你">' + esc(t ? t.note : '') + '</textarea>' +
        '</div>' +
      '</div>' +
      '<div class="modal__foot">' +
        (t ? '<button class="btn btn--danger" data-act="delete">' + I.trash + '删除</button>' : '') +
        '<span class="spacer"></span>' +
        '<button class="btn btn--ghost" data-close>取消</button>' +
        '<button class="btn btn--primary" data-act="save">' + (t ? '保存' : '创建任务') + '</button>' +
      '</div>' +
    '</div>';

    var m = modal(html);
    var sel = { bucket: bucket, priority: priority };

    m.findAll('[data-seg]').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('.seg__btn');
        if (!b) return;
        seg.querySelectorAll('.seg__btn').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        sel[seg.dataset.seg] = b.dataset.val;
        if (seg.dataset.seg === 'bucket' && !t) {
          // 切到紧急要办时自动提升优先级
          var pseg = m.find('[data-seg="priority"]');
          var want = b.dataset.val === 'urgent' ? 'p0' : (b.dataset.val === 'inbox' ? 'p3' : 'p2');
          pseg.querySelectorAll('.seg__btn').forEach(function (x) {
            x.classList.toggle('is-on', x.dataset.val === want);
          });
          sel.priority = want;
        }
        if (fx) fx.sfx.tap();
      });
    });

    function collect() {
      var title = m.find('#f-title').value.trim();
      if (!title) {
        var inp = m.find('#f-title');
        inp.classList.add('fx-shake');
        inp.focus();
        setTimeout(function () { inp.classList.remove('fx-shake'); }, 400);
        return null;
      }
      var dueRaw = m.find('#f-due').value;
      return {
        title: title,
        bucket: sel.bucket,
        priority: sel.priority,
        estimate: parseInt(m.find('#f-est').value, 10) || 30,
        due: dueRaw ? new Date(dueRaw).getTime() : null,
        note: m.find('#f-note').value.trim()
      };
    }

    m.find('[data-act="save"]').addEventListener('click', function () {
      var data = collect();
      if (!data) return;
      m.close();
      if (opts.onSave) opts.onSave(data, t);
    });

    m.find('#f-title').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); m.find('[data-act="save"]').click(); }
    });

    var delBtn = m.find('[data-act="delete"]');
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        m.close();
        if (opts.onDelete) opts.onDelete(t);
      });
    }
    return m;
  }

  /* ---------------- 确认弹层 ---------------- */
  function confirm(opts) {
    var html = '' +
    '<div class="modal" style="width:min(380px,100%)">' +
      '<div class="modal__head">' +
        '<span class="sec-icon ' + (opts.danger ? 'sec-icon--red' : 'sec-icon--brand') + '">' + (opts.icon || I.trash) + '</span>' +
        '<h3>' + esc(opts.title || '确认操作') + '</h3>' +
      '</div>' +
      '<div class="modal__body"><p class="t-body">' + esc(opts.message || '') + '</p></div>' +
      '<div class="modal__foot">' +
        '<button class="btn btn--ghost" data-close>' + esc(opts.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-act="ok">' + esc(opts.okText || '确定') + '</button>' +
      '</div>' +
    '</div>';
    var m = modal(html);
    m.find('[data-act="ok"]').addEventListener('click', function () {
      m.close();
      if (opts.onOk) opts.onOk();
    });
    return m;
  }

  /* ---------------- 庆祝弹层 ---------------- */
  function celebrate(opts) {
    var rewards = (opts.rewards || []).map(function (r) {
      return '<div class="celebrate__reward"><b>' + esc(r.value) + '</b><span>' + esc(r.label) + '</span></div>';
    }).join('');

    var html = '' +
    '<div class="celebrate' + (opts.variant ? ' celebrate--' + opts.variant : '') + '">' +
      '<div class="celebrate__emoji">' + (opts.emoji || '🏆') + '</div>' +
      '<h2>' + esc(opts.title) + '</h2>' +
      '<p>' + esc(opts.message || '') + '</p>' +
      (rewards ? '<div class="celebrate__rewards">' + rewards + '</div>' : '<div style="height:18px"></div>') +
      '<button class="btn btn--primary btn--lg btn--block" data-act="ok">' + esc(opts.okText || '继续前进') + '</button>' +
    '</div>';

    var m = modal(html, { onClose: opts.onClose });
    m.find('[data-act="ok"]').addEventListener('click', function () { m.close(); });
    return m;
  }

  /* ============================================================
     拖拽（指针事件，桌面 + 触摸通用）
     ============================================================ */
  var drag = null;

  function initDnD() {
    document.addEventListener('pointerdown', onDown, { passive: true });
  }

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    var card = e.target.closest ? e.target.closest('.task') : null;
    if (!card) return;
    if (e.target.closest('button, input, textarea, select, a')) return;
    var zone = card.closest('[data-dropzone]');
    if (!zone) return;

    drag = {
      id: card.dataset.id,
      card: card,
      startX: e.clientX, startY: e.clientY,
      active: false,
      pointerId: e.pointerId,
      offsetX: 0, offsetY: 0,
      ghost: null, line: null,
      target: null, index: 0,
      longPress: null
    };

    // 触摸：长按 220ms 才进入拖拽，避免和滚动冲突
    if (e.pointerType === 'touch') {
      drag.longPress = setTimeout(function () {
        if (drag) { drag.ready = true; if (fx) fx.sfx.tap(); }
      }, 220);
    } else {
      drag.ready = true;
    }

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  function onMove(e) {
    if (!drag) return;
    var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;

    if (!drag.active) {
      if (!drag.ready) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cleanup();   // 触摸时判定为滚动
        return;
      }
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      startDrag(e);
    }
    e.preventDefault();

    drag.ghost.style.transform = 'translate(' + (e.clientX - drag.offsetX) + 'px,' + (e.clientY - drag.offsetY) + 'px) rotate(1.4deg) scale(1.02)';
    updateTarget(e.clientX, e.clientY);
    autoScroll(e.clientY);
  }

  function startDrag(e) {
    drag.active = true;
    var card = drag.card;
    var b = card.getBoundingClientRect();
    drag.offsetX = drag.startX - b.left;
    drag.offsetY = drag.startY - b.top;

    var g = card.cloneNode(true);
    g.classList.add('task--ghost');
    g.classList.remove('is-dragging');
    g.style.width = b.width + 'px';
    g.style.left = '0'; g.style.top = '0';
    g.style.transform = 'translate(' + b.left + 'px,' + b.top + 'px) rotate(1.4deg) scale(1.02)';
    document.body.appendChild(g);
    drag.ghost = g;

    card.classList.add('is-dragging');

    var line = document.createElement('div');
    line.className = 'dropline';
    drag.line = line;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }

  function updateTarget(x, y) {
    var zones = Array.prototype.slice.call(document.querySelectorAll('[data-dropzone]'))
      .filter(function (z) { return z.offsetParent !== null; });

    var zone = null;
    for (var i = 0; i < zones.length; i++) {
      var r = zones[i].getBoundingClientRect();
      var pad = 26;
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
        zone = zones[i];
        break;
      }
    }

    zones.forEach(function (z) { z.classList.toggle('is-over', z === zone); });

    if (!zone) {
      if (drag.line.parentNode) drag.line.remove();
      drag.target = null;
      return;
    }

    var cards = Array.prototype.slice.call(zone.querySelectorAll('.task'))
      .filter(function (c) { return c !== drag.card; });

    var idx = cards.length;
    for (var k = 0; k < cards.length; k++) {
      var cr = cards[k].getBoundingClientRect();
      if (y < cr.top + cr.height / 2) { idx = k; break; }
    }

    drag.target = zone.dataset.dropzone;
    drag.index = idx;

    var empty = zone.querySelector('.empty');
    if (empty) empty.style.display = 'none';

    if (idx >= cards.length) zone.appendChild(drag.line);
    else zone.insertBefore(drag.line, cards[idx]);
  }

  var scrollRaf = null;
  function autoScroll(y) {
    var H = global.innerHeight, edge = 90, speed = 0;
    if (y < edge) speed = -(edge - y) / 5;
    else if (y > H - edge) speed = (y - (H - edge)) / 5;
    cancelAnimationFrame(scrollRaf);
    if (!speed) return;
    (function step() {
      global.scrollBy(0, speed);
      scrollRaf = requestAnimationFrame(step);
    })();
  }

  function onUp() {
    if (!drag) return;
    var d = drag;
    if (d.active && d.target) {
      var origBucket = d.card.dataset.bucket;
      store.reorder(d.id, d.target, d.index);
      if (origBucket !== d.target) {
        if (fx) fx.sfx.tap();
        var B = store.BUCKETS[d.target];
        fx.toast('已移到「' + B.name + '」', { kind: 'ok' });
      }
    }
    cleanup();
  }

  function cleanup() {
    cancelAnimationFrame(scrollRaf);
    if (drag) {
      clearTimeout(drag.longPress);
      if (drag.ghost) drag.ghost.remove();
      if (drag.line && drag.line.parentNode) drag.line.remove();
      if (drag.card) drag.card.classList.remove('is-dragging');
    }
    document.querySelectorAll('[data-dropzone].is-over').forEach(function (z) { z.classList.remove('is-over'); });
    document.querySelectorAll('.empty[style]').forEach(function (e) { e.style.display = ''; });
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    drag = null;
  }

  /* ---------------- 环形进度 ---------------- */
  function ringHTML(pct, size, stroke, opts) {
    opts = opts || {};
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    var grad = 'ring-g-' + Math.random().toString(36).slice(2, 7);
    return '' +
    '<div class="ring ' + (opts.cls || '') + '" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '">' +
        '<defs><linearGradient id="' + grad + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + (opts.from || '#6366F1') + '"/>' +
          '<stop offset="1" stop-color="' + (opts.to || '#A855F7') + '"/>' +
        '</linearGradient></defs>' +
        '<circle class="ring__track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '"/>' +
        '<circle class="ring__val" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '" ' +
          'stroke="url(#' + grad + ')" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg>' +
      '<div class="ring__center">' + (opts.center || '') + '</div>' +
    '</div>';
  }

  /* ---------------- 导出 ---------------- */
  Q.ui = {
    I: I, esc: esc,
    fmtMin: fmtMin, fmtDue: fmtDue, fmtDate: fmtDate,
    greet: greet, todayLabel: todayLabel,
    taskHTML: taskHTML, listHTML: listHTML, emptyHTML: emptyHTML,
    modal: modal, taskModal: taskModal, confirm: confirm, celebrate: celebrate,
    ringHTML: ringHTML,
    initDnD: initDnD
  };

})(window);
