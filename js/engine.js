/* ============================================================
   engine.js — AI 效率助手（本地规则引擎，无需联网）
   把一段自然语言「今天要做的事」解析成结构化任务，
   自动判定优先级 / 预计耗时 / 截止时间 / 归属分区，并给出执行建议。
   ============================================================ */
(function (global) {
  'use strict';

  var Q = global.Q || (global.Q = {});

  /* ---------------- 词表 ---------------- */
  var KW = {
    p0: ['紧急','加急','急','马上','立刻','立即','火速','必须今天','今天必须','截止','到期','逾期',
         'deadline','ddl','下班前','今晚前','催','被催','客户投诉','故障','线上问题','事故','修复bug',
         '面试','签约','合同','开庭','报税','缴费','还款','挂号','退款','改签','交付','上线','发布'],
    p1: ['重要','尽快','优先','今天','今日','汇报','述职','提案','方案','脚本','稿子','文案','初稿',
         '提交','评审','答辩','路演','演讲','周报','月报','季报','对接','回复','报价','跟进','确认',
         '会议','开会','面谈','沟通','客户','老板','领导'],
    p3: ['有空','以后','将来','未来','someday','某天','想法','点子','灵感','考虑','琢磨','备选',
         '长期','慢慢','不着急','不急','随便','看看','收藏','攒着','等有时间','闲时']
  };

  // 归到灵感仓库的信号词
  var INBOX_KW = ['有空','以后','将来','未来','someday','某天','想法','点子','灵感','考虑','琢磨',
                  '备选','长期','慢慢','不着急','不急','等有时间','闲时','调研','研究一下','了解一下',
                  '选题','攒','收藏','计划做','想做'];

  // 预计耗时的关键词默认值（分钟）
  var DUR = [
    [['会议','开会','面谈','评审','答辩','面试','路演','述职'], 60],
    [['写','撰写','脚本','方案','提案','文档','稿','设计','策划','ppt','PPT','报告'], 90],
    [['研究','调研','分析','复盘','规划','搭建','开发','实现','重构'], 90],
    [['整理','归档','清理','录入','核对','梳理','汇总','统计'], 45],
    [['学习','阅读','读','看','课程','教程','练习'], 30],
    [['运动','健身','跑步','散步','拉伸','瑜伽','冥想','游泳'], 30],
    [['回复','邮件','消息','微信','电话','沟通','联系','通知','转发'], 15],
    [['报销','提交','填写','表格','打卡','缴费','预约','下单','购买','预订'], 20]
  ];

  var CN_NUM = { 一:1, 二:2, 两:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9, 十:10, 半:0.5 };

  /* ---------------- 分句 ---------------- */
  var META_RE = /(不知道|怎么安排|帮我|帮忙|请问|如何|该做什么|先做什么|我今天有|我有\s*\d+\s*件|安排一下|规划一下|理一下|排个序|优先级|求助|谢谢)/;
  var COUNT_RE = /^\s*\d+\s*件?事?情?\s*$/;

  function splitItems(text) {
    if (!text) return [];
    var lines = String(text).split(/[\n\r]+/);
    var out = [];

    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;
      // 单行里含多个事项时再切一次
      var parts = lines.length > 1 && line.length < 40
        ? [line]
        : line.split(/[，,；;、。]+|\s{2,}/);
      if (parts.length === 1) parts = [line];
      parts.forEach(function (p) { out.push(p); });
    });

    return out
      .map(cleanItem)
      .filter(function (s) {
        if (!s || s.length < 2) return false;
        if (COUNT_RE.test(s)) return false;
        if (META_RE.test(s) && s.length < 22) return false;
        return true;
      })
      .slice(0, 24);
  }

  function cleanItem(s) {
    return String(s)
      .trim()
      .replace(/^[\-–—*·•●○◦>》]+\s*/, '')
      .replace(/^[（(]?\s*[0-9０-９]{1,2}\s*[）).、:：]\s*/, '')
      .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
      .replace(/^(今天|今日|我)?(要|需要|得|想|准备|打算|计划)?\s*/, function (m) {
        return m.length > 6 ? m : '';
      })
      .replace(/^[:：]\s*/, '')
      .trim();
  }

  /* ---------------- 耗时解析 ---------------- */
  function parseDuration(s) {
    var m;
    // 1.5小时 / 2 h / 两个小时
    m = s.match(/(\d+(?:\.\d+)?)\s*(?:个)?\s*(小时|時|h|hr|hrs|hours?)/i);
    if (m) return Math.round(parseFloat(m[1]) * 60);

    m = s.match(/([一二两三四五六七八九十半])\s*(?:个)?\s*(?:小时|時)/);
    if (m) return Math.round((CN_NUM[m[1]] || 1) * 60);

    m = s.match(/(\d+)\s*(分钟|分鐘|分|min|mins|minutes?)/i);
    if (m) return Math.max(5, parseInt(m[1], 10));

    if (/半小时|半個小時|半个小时/.test(s)) return 30;
    if (/一整天|全天/.test(s)) return 240;
    if (/一上午|一下午|半天/.test(s)) return 180;

    for (var i = 0; i < DUR.length; i++) {
      var kws = DUR[i][0];
      for (var j = 0; j < kws.length; j++) {
        if (s.indexOf(kws[j]) > -1) return DUR[i][1];
      }
    }
    return 30;
  }

  /* ---------------- 截止时间解析 ---------------- */
  function parseDue(s) {
    var now = new Date();
    var base = null, hour = null, minute = 0;

    var hm = s.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
    if (hm) { hour = parseInt(hm[1], 10); minute = parseInt(hm[2], 10); }
    else {
      var hp = s.match(/(\d{1,2})\s*点/);
      if (hp) hour = parseInt(hp[1], 10);
    }
    if (hour != null && /下午|晚上|傍晚/.test(s) && hour < 12) hour += 12;

    if (/后天/.test(s)) base = 2;
    else if (/明天|明日/.test(s)) base = 1;
    else if (/今天|今日|今晚|下班前|中午前|上午前|收工前|睡前/.test(s)) base = 0;

    var wd = s.match(/(下?)\s*(?:周|週|星期|礼拜)\s*([一二三四五六日天1-7])/);
    if (wd && base == null) {
      var map = { 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 日:0, 天:0,
                  '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':0 };
      var target = map[wd[2]];
      var diff = (target - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      if (wd[1]) diff += 7;
      base = diff;
    }

    if (base == null && hour == null) return null;
    if (base == null) base = 0;

    if (hour == null) {
      if (/今晚|睡前/.test(s)) hour = 22;
      else if (/中午前/.test(s)) hour = 12;
      else if (/上午前|早上/.test(s)) hour = 10;
      else if (/下班前|收工前/.test(s)) hour = 18;
      else hour = 18;
    }

    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + base, hour, minute, 0);
    if (base === 0 && d.getTime() < now.getTime() - 60000 && !/今天|今日|今晚|下班前/.test(s)) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  }

  /* ---------------- 优先级判定 ---------------- */
  function hit(s, list) {
    for (var i = 0; i < list.length; i++) if (s.indexOf(list[i]) > -1) return list[i];
    return null;
  }

  function parsePriority(s, due) {
    var reasons = [];
    var k0 = hit(s, KW.p0);
    if (k0) { reasons.push('包含「' + k0 + '」'); return { p: 'p0', reasons: reasons }; }

    if (due) {
      var hrs = (due - Date.now()) / 3600000;
      if (hrs <= 12) { reasons.push('今天内到期'); return { p: 'p0', reasons: reasons }; }
      if (hrs <= 36) { reasons.push('明天到期'); return { p: 'p1', reasons: reasons }; }
    }

    var k3 = hit(s, KW.p3);
    if (k3) { reasons.push('包含「' + k3 + '」'); return { p: 'p3', reasons: reasons }; }

    var k1 = hit(s, KW.p1);
    if (k1) { reasons.push('包含「' + k1 + '」'); return { p: 'p1', reasons: reasons }; }

    reasons.push('常规事项');
    return { p: 'p2', reasons: reasons };
  }

  /* ---------------- 主解析 ---------------- */
  var TODAY_CAP = 6;      // 今日挑战最多推荐几个
  var TODAY_MINUTES = 300; // 今日建议投入上限（分钟）

  function analyze(text) {
    var items = splitItems(text);
    if (!items.length) {
      return { ok: false, message: '没有识别到具体事项，试试一行写一件事，例如「18 点前回复客户合同」。' };
    }

    var parsed = items.map(function (raw) {
      var due = parseDue(raw);
      var pr = parsePriority(raw, due);
      var est = parseDuration(raw);
      var wantInbox = !!hit(raw, INBOX_KW);
      return {
        title: prettify(raw),
        raw: raw,
        priority: pr.p,
        reasons: pr.reasons,
        estimate: est,
        due: due,
        wantInbox: wantInbox && pr.p !== 'p0'
      };
    });

    // 排序打分：优先级 > 截止紧迫度 > 快赢（短任务优先）
    var W = { p0: 400, p1: 260, p2: 140, p3: 60 };
    parsed.forEach(function (t) {
      var s = W[t.priority];
      if (t.due) {
        var hrs = Math.max(0, (t.due - Date.now()) / 3600000);
        s += Math.max(0, 120 - hrs * 3);
      }
      s += Math.max(0, 40 - t.estimate / 3);   // 短任务小幅加分（快速拿到正反馈）
      t.score = Math.round(s);
    });
    parsed.sort(function (a, b) { return b.score - a.score; });

    // 分区：p0 → 紧急要办；未来向 → 灵感仓库；其余进今日，超额溢出到仓库
    var used = 0, todayCount = 0;
    parsed.forEach(function (t) {
      if (t.priority === 'p0') { t.bucket = 'urgent'; used += t.estimate; return; }
      if (t.wantInbox) { t.bucket = 'inbox'; return; }
      if (todayCount < TODAY_CAP && used + t.estimate <= TODAY_MINUTES) {
        t.bucket = 'today'; todayCount++; used += t.estimate;
      } else {
        t.bucket = 'inbox';
        t.overflow = true;
      }
    });

    var urgent = parsed.filter(function (t) { return t.bucket === 'urgent'; });
    var today  = parsed.filter(function (t) { return t.bucket === 'today'; });
    var inbox  = parsed.filter(function (t) { return t.bucket === 'inbox'; });
    var focusMin = urgent.concat(today).reduce(function (a, t) { return a + t.estimate; }, 0);

    return {
      ok: true,
      items: parsed,
      groups: { urgent: urgent, today: today, inbox: inbox },
      stats: {
        total: parsed.length,
        focus: urgent.length + today.length,
        minutes: focusMin,
        hours: Math.round(focusMin / 6) / 10
      },
      summary: buildSummary(parsed, urgent, today, inbox, focusMin),
      advice: buildAdvice(urgent, today, focusMin)
    };
  }

  function prettify(s) {
    var t = s.replace(/\s+/g, ' ').trim();
    if (t.length > 46) t = t.slice(0, 44) + '…';
    return t;
  }

  function buildSummary(all, urgent, today, inbox, minutes) {
    var h = Math.round(minutes / 6) / 10;
    var parts = [];
    parts.push('识别到 <b>' + all.length + '</b> 件事');
    if (urgent.length) parts.push('其中 <b>' + urgent.length + '</b> 件需要马上处理');
    parts.push('今天建议专注 <b>' + (urgent.length + today.length) + '</b> 件（约 <b>' + h + ' 小时</b>）');
    if (inbox.length) parts.push('<b>' + inbox.length + '</b> 件先放进灵感仓库');
    return parts.join('，') + '。';
  }

  function buildAdvice(urgent, today, minutes) {
    var tips = [];
    if (urgent.length) {
      tips.push('先清掉「' + urgent[0].title + '」——它是今天唯一会带来风险的事。');
    } else if (today.length) {
      tips.push('从「' + today[0].title + '」开始，它的投入产出比最高。');
    }
    if (minutes > 300) {
      tips.push('总时长已超过 5 小时，建议把最后 1～2 件挪到明天，别把自己排满。');
    } else if (minutes < 90 && today.length) {
      tips.push('今天负荷较轻，可以从灵感仓库再捞一件出来。');
    }
    var deep = today.filter(function (t) { return t.estimate >= 60; });
    if (deep.length) {
      tips.push('「' + deep[0].title + '」需要整块时间，安排在你精力最好的时段。');
    }
    if (!tips.length) tips.push('任务量适中，按顺序推进即可。');
    return tips;
  }

  /* ---------------- 对已有任务排序建议 ---------------- */
  function planExisting() {
    var store = Q.store;
    var pool = store.questScope().filter(function (t) { return !t.done; });
    if (!pool.length) {
      return { ok: false, message: '今天没有待办任务，先添加几件事，或者去灵感仓库挑一件。' };
    }
    var W = { p0: 400, p1: 260, p2: 140, p3: 60 };
    var scored = pool.map(function (t) {
      var s = W[t.priority] || 140;
      if (t.bucket === 'urgent') s += 60;
      if (t.due) {
        var hrs = Math.max(0, (t.due - Date.now()) / 3600000);
        s += Math.max(0, 120 - hrs * 3);
      }
      s += Math.max(0, 40 - (t.estimate || 30) / 3);
      return { task: t, score: Math.round(s) };
    }).sort(function (a, b) { return b.score - a.score; });

    var minutes = pool.reduce(function (a, t) { return a + (t.estimate || 0); }, 0);
    return {
      ok: true,
      order: scored,
      minutes: minutes,
      tips: buildAdvice(
        pool.filter(function (t) { return t.bucket === 'urgent'; }).map(wrap),
        pool.filter(function (t) { return t.bucket === 'today'; }).map(wrap),
        minutes
      )
    };
    function wrap(t) { return { title: t.title, estimate: t.estimate || 30 }; }
  }

  Q.engine = {
    analyze: analyze,
    planExisting: planExisting,
    splitItems: splitItems,
    parseDuration: parseDuration,
    parseDue: parseDue
  };

})(window);
