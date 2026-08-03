/* ============================================================
   fx.js — 游戏化特效：粒子 / XP 飘字 / Toast / 音效
   ============================================================ */
(function (global) {
  'use strict';

  var Q = global.Q || (global.Q = {});

  var canvas, ctx, dpr = 1, particles = [], raf = null, running = false;
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- canvas ---------------- */
  function initCanvas() {
    canvas = document.getElementById('fx-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    global.addEventListener('resize', resize, { passive: true });
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(global.innerWidth * dpr);
    canvas.height = Math.floor(global.innerHeight * dpr);
    canvas.style.width = global.innerWidth + 'px';
    canvas.style.height = global.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
    var alive = 0;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.life <= 0) continue;
      alive++;

      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 1;

      var t = p.life / p.maxLife;
      var alpha = t > .7 ? 1 : Math.max(0, t / .7);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size * .34, p.size, p.size * .68);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else { // star
        star(ctx, 0, 0, 5, p.size / 2, p.size / 4.4);
        ctx.fill();
      }
      ctx.restore();
    }

    if (alive === 0) {
      particles.length = 0;
      running = false;
      ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
      return;
    }
    if (particles.length > 900) particles = particles.filter(function (p) { return p.life > 0; });
    raf = global.requestAnimationFrame(loop);
  }

  function star(c, cx, cy, spikes, outer, inner) {
    var rot = Math.PI / 2 * 3, x = cx, y = cy, step = Math.PI / spikes;
    c.beginPath();
    c.moveTo(cx, cy - outer);
    for (var i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outer; y = cy + Math.sin(rot) * outer;
      c.lineTo(x, y); rot += step;
      x = cx + Math.cos(rot) * inner; y = cy + Math.sin(rot) * inner;
      c.lineTo(x, y); rot += step;
    }
    c.lineTo(cx, cy - outer);
    c.closePath();
  }

  function start() {
    if (running || reduced) return;
    running = true;
    raf = global.requestAnimationFrame(loop);
  }

  var PALETTE = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F59E0B', '#FBBF24',
                 '#10B981', '#34D399', '#22D3EE', '#3B82F6'];
  var SHAPES = ['rect', 'circle', 'star', 'rect', 'rect', 'ring'];

  function spawn(x, y, opts) {
    opts = opts || {};
    var n = opts.count || 30;
    var spread = opts.spread == null ? Math.PI * 2 : opts.spread;
    var dir = opts.dir == null ? -Math.PI / 2 : opts.dir;
    var power = opts.power || 9;
    for (var i = 0; i < n; i++) {
      var a = dir + (Math.random() - .5) * spread;
      var v = power * (.45 + Math.random() * .95);
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: opts.gravity == null ? .28 : opts.gravity,
        drag: opts.drag || .985,
        size: (opts.size || 8) * (.6 + Math.random() * .85),
        color: (opts.colors || PALETTE)[(Math.random() * (opts.colors || PALETTE).length) | 0],
        shape: SHAPES[(Math.random() * SHAPES.length) | 0],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - .5) * .34,
        life: (opts.life || 90) + Math.random() * 40,
        maxLife: (opts.life || 90) + 40
      });
    }
    start();
  }

  /** 小型完成迸发（击败小怪） */
  function burst(el, opts) {
    if (reduced) return;
    var r = rectOf(el);
    if (!r) return;
    spawn(r.x, r.y, Object.assign({
      count: 30, power: 10, size: 9, spread: Math.PI * 1.7,
      colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#FBBF24', '#FFFFFF'],
      life: 80, gravity: .24
    }, opts || {}));
    // 中心冲击环
    spawn(r.x, r.y, { count: 1, power: 0, size: 8, shape: 'ring', drag: .9, life: 26, gravity: 0,
      colors: ['#FFFFFF'] });
  }

  /** 今日通关：全屏彩色粒子雨 */
  function celebrate() {
    if (reduced) return;
    var W = global.innerWidth, H = global.innerHeight;
    // 两侧礼炮
    spawn(0, H * .74, { count: 70, dir: -Math.PI / 3.4, spread: 1.1, power: 26, size: 13, life: 180, gravity: .32, drag: .99 });
    spawn(W, H * .74, { count: 70, dir: -Math.PI + Math.PI / 3.4, spread: 1.1, power: 26, size: 13, life: 180, gravity: .32, drag: .99 });
    // 中央爆开（两次）
    setTimeout(function () {
      spawn(W / 2, H * .42, { count: 90, power: 18, size: 12, life: 150, gravity: .26 });
    }, 120);
    setTimeout(function () {
      spawn(W / 2, H * .42, { count: 60, power: 22, size: 11, life: 140, gravity: .24 });
    }, 260);
    // 顶部飘落
    var drops = 0;
    var timer = setInterval(function () {
      for (var i = 0; i < 16; i++) {
        particles.push({
          x: Math.random() * W, y: -14,
          vx: (Math.random() - .5) * 2.6,
          vy: 1.8 + Math.random() * 3.2,
          g: .05, drag: .996,
          size: 6 + Math.random() * 9,
          color: PALETTE[(Math.random() * PALETTE.length) | 0],
          shape: SHAPES[(Math.random() * SHAPES.length) | 0],
          rot: Math.random() * 6.28, vr: (Math.random() - .5) * .25,
          life: 240, maxLife: 240
        });
      }
      start();
      if (++drops > 22) clearInterval(timer);
    }, 95);
    shake(14, 420);
  }

  /** 升级：金色环形冲击 */
  function levelUp() {
    if (reduced) return;
    var W = global.innerWidth, H = global.innerHeight;
    spawn(W / 2, H * .40, {
      count: 88, power: 20, size: 14, life: 150, gravity: .18,
      colors: ['#F59E0B', '#FBBF24', '#FDE68A', '#FCD34D', '#FFFFFF', '#EC4899', '#F472B6']
    });
    // 双层冲击环
    spawn(W / 2, H * .40, { count: 1, power: 0, size: 10, shape: 'ring', drag: .88, life: 40, gravity: 0, colors: ['#FFFFFF'] });
    shake(10, 320);
  }

  /* ---------------- 屏幕抖动 ---------------- */
  var shakeT = null;
  function shake(px, ms) {
    if (reduced) return;
    var app = document.getElementById('app') || global.document.body;
    if (!app) return;
    app.animate(
      [{ transform: 'translate(0,0)' },
       { transform: 'translate(' + px + 'px,' + (-px * .6) + 'px)' },
       { transform: 'translate(' + (-px) + 'px,' + (px * .5) + 'px)' },
       { transform: 'translate(' + (px * .7) + 'px,' + (px * .4) + 'px)' },
       { transform: 'translate(0,0)' }],
      { duration: ms || 360, easing: 'ease-out' }
    ).onfinish = function () { app.style.transform = ''; };
  }

  function rectOf(el) {
    if (!el) return null;
    if (el.getBoundingClientRect) {
      var b = el.getBoundingClientRect();
      if (!b.width && !b.height) return null;
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, box: b };
    }
    return { x: el.x, y: el.y };
  }

  /* ---------------- XP 飘字 ---------------- */
  function xpFloat(el, text, big) {
    var root = document.getElementById('float-root');
    if (!root) return;
    var r = rectOf(el);
    if (!r) return;
    var n = document.createElement('div');
    n.className = 'xpfloat' + (big ? ' xpfloat--big' : '');
    n.textContent = text;
    n.style.left = r.x + 'px';
    n.style.top = (r.box ? r.box.top : r.y) + 'px';
    root.appendChild(n);
    setTimeout(function () { n.remove(); }, 1250);
  }

  /* ---------------- Toast ---------------- */
  var ICONS = {
    ok:   '<svg viewBox="0 0 24 24"><path d="M9.6 16.6 5 12l1.4-1.4 3.2 3.2 8-8L19 7.2z"/></svg>',
    info: '<svg viewBox="0 0 24 24"><path d="M11 10h2v7h-2zm0-3.4h2v2.1h-2zM12 2.6A9.4 9.4 0 1 0 21.4 12 9.4 9.4 0 0 0 12 2.6Zm0 17A7.6 7.6 0 1 1 19.6 12 7.6 7.6 0 0 1 12 19.6Z"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 2.8 1.6 20.8h20.8ZM11 10h2v5.2h-2zm0 6.6h2v2h-2z"/></svg>',
    err:  '<svg viewBox="0 0 24 24"><path d="M12 2.6A9.4 9.4 0 1 0 21.4 12 9.4 9.4 0 0 0 12 2.6Zm3.8 12-1.4 1.4L12 13.4 9.6 16l-1.4-1.4 2.4-2.6-2.4-2.4L9.6 8 12 10.6 14.4 8l1.4 1.4-2.4 2.6Z"/></svg>'
  };

  function toast(msg, opts) {
    opts = opts || {};
    var root = document.getElementById('toast-root');
    if (!root) return;
    var kind = opts.kind || 'ok';
    var el = document.createElement('div');
    el.className = 'toast toast--' + kind;
    el.innerHTML = (ICONS[kind] || ICONS.info) + '<span></span>';
    el.querySelector('span').textContent = msg;

    if (opts.undo) {
      var b = document.createElement('button');
      b.className = 'toast__undo';
      b.textContent = opts.undoText || '撤销';
      b.addEventListener('click', function () {
        try { opts.undo(); } finally { dismiss(); }
      });
      el.appendChild(b);
    }
    root.appendChild(el);

    var timer = setTimeout(dismiss, opts.duration || (opts.undo ? 5200 : 2600));
    function dismiss() {
      clearTimeout(timer);
      if (!el.parentNode) return;
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 240);
    }
    return dismiss;
  }

  /* ---------------- 音效（WebAudio，极轻量） ---------------- */
  var actx = null, muted = false;
  var MASTER = 1.9; // 整体音量（用户要求更响一些）
  try { muted = global.localStorage.getItem('questly.muted') === '1'; } catch (e) {}

  // Only build/resume the AudioContext after a real user gesture, otherwise
  // Chrome logs "AudioContext was not allowed to start" (and it would be silent anyway).
  var gesture = false;
  function markGesture() { gesture = true; }
  if (global.addEventListener) {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      global.addEventListener(ev, markGesture, { passive: true });
    });
  }

  function audio() {
    if (muted || !gesture) return null;
    if (!actx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    return actx;
  }

  function tone(freq, dur, type, vol, delay) {
    var a = audio(); if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var osc = a.createOscillator(), g = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    var v = (vol == null ? .07 : vol) * MASTER;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(v, t0 + .006);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t0); osc.stop(t0 + dur + .02);
  }

  var sfx = {
    complete: function () { tone(660, .14, 'triangle', .085); tone(990, .18, 'triangle', .075, .07); tone(1320, .1, 'sine', .045, .15); },
    undo:     function () { tone(420, .12, 'sine', .06); tone(300, .14, 'sine', .05, .06); },
    clear:    function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, .34, 'triangle', .08, i * .09); });
    },
    levelup:  function () {
      [440, 554, 659, 880, 1109, 1319].forEach(function (f, i) { tone(f, .36, 'sine', .082, i * .08); });
    },
    unlock:   function () { tone(880, .22, 'triangle', .07); tone(1320, .28, 'triangle', .06, .1); tone(1760, .16, 'sine', .04, .2); },
    tap:      function () { tone(560, .06, 'sine', .045); }
  };

  function setMuted(v) {
    muted = !!v;
    try { global.localStorage.setItem('questly.muted', muted ? '1' : '0'); } catch (e) {}
  }
  function isMuted() { return muted; }

  /* ---------------- 导出 ---------------- */
  Q.fx = {
    init: initCanvas,
    spawn: spawn,
    burst: burst,
    celebrate: celebrate,
    levelUp: levelUp,
    xpFloat: xpFloat,
    toast: toast,
    sfx: sfx,
    setMuted: setMuted,
    isMuted: isMuted,
    get reduced() { return reduced; }
  };

})(window);
