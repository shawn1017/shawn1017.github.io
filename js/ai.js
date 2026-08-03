/* ============================================================
   ai.js — AI 助手模块（离线优先 + 可选联网）
   - 设置（平台/模型/API 地址/Key）只存在用户浏览器 localStorage，不进仓库、不上云
   - 安全红线：apiKey 只作为 Bearer 头发给「用户自己填写的官方 endpoint」，
     绝不写入消息体、绝不打印到控制台、绝不在 UI 中完整显示
   - 离线优先：闯关陪练 / 任务规划 完全本地（engine + exam 数据）；
     通用问答在有 Key 时调用云端，无 Key 时提示离线模式
   ============================================================ */
(function (global) {
  'use strict';

  var Q = global.Q || (global.Q = {});

  // 仅本地：键名固定，但内容（尤其 apiKey）绝不出现在源码里
  var LS_KEY = 'questly-ai-v1';

  function blank() { return { platform: '', model: '', apiUrl: '', apiKey: '' }; }

  function load() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw) || {};
      return {
        platform: s.platform || '',
        model: s.model || '',
        apiUrl: s.apiUrl || '',
        apiKey: s.apiKey || ''
      };
    } catch (e) { return blank(); }
  }

  var settings = load();

  function save(s) {
    settings = {
      platform: (s.platform || '').trim(),
      model: (s.model || '').trim(),
      apiUrl: (s.apiUrl || '').trim(),
      apiKey: (s.apiKey || '').trim()
    };
    try { global.localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  function clear() {
    settings = blank();
    try { global.localStorage.removeItem(LS_KEY); } catch (e) {}
  }

  function get() { return Object.assign({}, settings); }
  function hasCloud() { return !!settings.apiUrl && !!settings.apiKey; }

  // 掩码：只显示首尾，UI 中绝不出现完整 key
  function maskKey(k) {
    if (!k) return '';
    if (k.length <= 6) return '•'.repeat(k.length);
    return k.slice(0, 4) + '…' + k.slice(-4);
  }

  /* ---------------- 云端对话（安全发送） ---------------- */
  // userText: 用户问题；opts.system 可选系统提示；opts.maxTokens 限制长度
  // 返回 Promise<string>；失败时 reject({ offline?, message })
  function chat(userText, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!hasCloud()) {
        reject({ offline: true, message: '尚未配置 API，当前为离线模式。点击右上角齿轮填写后可使用联网问答。' });
        return;
      }
      // 关键：apiKey 只作为 Authorization 头发送，绝不进入消息体
      var url = settings.apiUrl;
      var messages = [];
      if (opts.system) messages.push({ role: 'system', content: opts.system });
      messages.push({ role: 'user', content: userText });
      var body = {
        model: settings.model || 'gpt-4o',
        messages: messages,
        temperature: 0.7
      };
      if (opts.maxTokens) body.max_tokens = opts.maxTokens;

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + settings.apiKey
        },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            throw new Error('HTTP ' + r.status + (t ? ' · ' + t.slice(0, 140) : ''));
          });
        }
        return r.json();
      }).then(function (data) {
        // 兼容 OpenAI / DeepSeek / 通义千问 等 chat/completions 响应
        var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
          (data.output && data.output.text) ||
          (data.result) || '';
        if (!content) throw new Error('返回结果缺少内容字段，请检查模型/接口格式');
        resolve(String(content).trim());
      }).catch(function (err) {
        // 注意：err.message 可能含网关信息，但不含 apiKey（key 只在请求头）
        reject({ message: err.message || '网络异常，请检查 API 地址与网络' });
      });
    });
  }

  function test() {
    return chat('ping（仅连接测试，请直接回复 ok）', {
      maxTokens: 8,
      system: '你是连接测试助手，收到任何消息只回复 ok 两个字，不要多余内容。'
    }).then(function (txt) {
      return { ok: true, message: '连接成功 ✓ ' + txt.slice(0, 30) };
    }).catch(function (e) {
      return { ok: false, message: e.offline ? '尚未配置 API' : (e.message || '连接失败') };
    });
  }

  /* ---------------- 本地：闯关陪练 ---------------- */
  function examCoach() {
    var exam = Q.exam;
    if (!exam || !exam.ready || !exam.ready()) {
      return { ok: false, message: '题库尚未加载，请先进入「考试闯关」等其就绪后再试。' };
    }
    var list = exam.all ? exam.all() : [];
    var meta = exam.meta();
    var c = exam.counts ? exam.counts() : null;
    var total = list.length;
    var answered = list.filter(function (q) { return q.answered; }).length;
    var mastered = list.filter(function (q) { return q.mastered; }).length;
    var wrong = list.filter(function (q) { return q.inWrong; }).length;
    var weak = list.filter(function (q) { return q.answered && !q.mastered && !q.inWrong; }).length;
    var notDone = total - answered;

    var tips = [];
    tips.push('📊 总进度：' + answered + '/' + total + ' 题已做，已掌握 ' + mastered + ' 题' +
      (c ? '（正确率 ' + (c.rate || 0) + '%）' : '') + '。');
    if (wrong > 0) tips.push('🔧 你有 ' + wrong + ' 道错题待清，建议先进「错题本」逐题攻破，错一题清一题。');
    if (weak > 0) tips.push('🌱 ' + weak + ' 道题做过但未掌握，是「差一口气的薄弱点」，适合二刷巩固。');
    if (notDone > 0) tips.push('📝 还有 ' + notDone + ' 题未碰，建议每天定量推进（如 20–30 题），避免考前突击。');
    if (meta && meta.bossDone) tips.push('🛡️ Boss 战已通关（最佳正确率 ' + (meta.bossBestRate || 0) + '%），保持手感即可。');
    if (meta && meta.star3) tips.push('🌟 已达成三星通关，状态拉满。');
    if (tips.length <= 1) tips.push('🎉 全部题目已掌握，节奏保持住就好。');
    return { ok: true, tips: tips };
  }

  /* ---------------- 本地：任务规划 ---------------- */
  function taskPlan() {
    var engine = Q.engine;
    if (engine && engine.planExisting) return engine.planExisting();
    return { ok: false, message: '规划引擎未就绪。' };
  }

  Q.ai = {
    get: get,
    save: save,
    clear: clear,
    hasCloud: hasCloud,
    maskKey: maskKey,
    chat: chat,
    test: test,
    examCoach: examCoach,
    taskPlan: taskPlan
  };
})(window);
