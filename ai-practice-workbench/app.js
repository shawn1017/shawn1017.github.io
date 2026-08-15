(function () {
  'use strict';

  const STORE_KEY = 'ai-practice-workbench.v1';
  const ARCHIVE_KEY = 'ai-practice-workbench.v1.legacy-archive';
  const routes = ['today', 'all', 'completed', 'settings'];
  const priorityLabels = { LOW: '低', MEDIUM: '普通', HIGH: '重要', URGENT: '紧急' };
  const levelTitles = [
    '初来乍到', '见习行动派', '任务学徒', '效率新星', '节奏掌控者',
    '时间管理者', '高效执行官', '专注领主', '效率大师', '时间旅人', '传奇玩家',
  ];
  const questClearBonus = 30;
  const fontLabels = {
    small: ['小号', '90%'],
    standard: ['标准', '100%'],
    large: ['大号', '112%'],
    xlarge: ['超大', '125%'],
  };

  let state = load();
  let currentRoute = routeFromHash();
  let searchText = '';
  let listFilter = 'all';

  const page = document.getElementById('page');
  const search = document.getElementById('global-search');
  const modalRoot = document.getElementById('modal-root');
  const importFile = document.getElementById('import-file');

  document.getElementById('today-label').textContent = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date());
  applyFontScale();

  function emptyState() {
    return {
      version: 3,
      tasks: [],
      quests: [],
      profile: { xp: 0 },
      stats: { totalCompleted: 0, questsCleared: 0 },
      settings: { fontScale: 'standard' },
      meta: { createdAt: now(), updatedAt: now() },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (parsed.version !== 3 && !localStorage.getItem(ARCHIVE_KEY)) {
        localStorage.setItem(ARCHIVE_KEY, raw);
      }
      return normalize(parsed);
    } catch (error) {
      console.warn('本地数据读取失败', error);
      return emptyState();
    }
  }

  function normalize(input) {
    const base = emptyState();
    base.tasks = Array.isArray(input?.tasks) ? input.tasks.map(normalizeTask).filter(Boolean) : [];
    base.quests = Array.isArray(input?.quests) ? input.quests.map(normalizeQuest).filter(Boolean) : [];
    base.profile.xp = Math.max(0, Number(input?.profile?.xp) || 0);
    base.stats.totalCompleted = Math.max(0, Number(input?.stats?.totalCompleted) || 0);
    base.stats.questsCleared = Math.max(0, Number(input?.stats?.questsCleared) || 0);
    const requestedScale = input?.settings?.fontScale;
    base.settings.fontScale = fontLabels[requestedScale] ? requestedScale : 'standard';
    base.meta.createdAt = input?.meta?.createdAt || base.meta.createdAt;
    base.meta.updatedAt = input?.meta?.updatedAt || base.meta.updatedAt;
    return base;
  }

  function normalizeTask(task) {
    const title = String(task?.title || '').trim();
    if (!title) return null;
    const completed = task.completed === true || task.status === 'COMPLETED';
    return {
      id: task.id || uid(),
      title,
      dueAt: task.dueAt || null,
      priority: priorityLabels[task.priority] ? task.priority : 'MEDIUM',
      note: task.note || task.description || task.nextAction || '',
      questId: task.questId || null,
      xpReward: Math.max(1, Number(task.xpReward) || xpForPriority(task.priority)),
      completed,
      completedAt: completed ? (task.completedAt || now()) : null,
      createdAt: task.createdAt || now(),
      updatedAt: task.updatedAt || now(),
    };
  }

  function normalizeQuest(quest) {
    const title = String(quest?.title || '').trim();
    if (!title) return null;
    return {
      id: quest.id || `quest_${uid()}`,
      title,
      bonus: Math.max(0, Number(quest.bonus) || questClearBonus),
      bonusClaimed: quest.bonusClaimed === true,
      clearedAt: quest.clearedAt || null,
      createdAt: quest.createdAt || now(),
    };
  }

  function save(message) {
    state.meta.updatedAt = now();
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if (message) toast(message);
    render();
  }

  function now() { return new Date().toISOString(); }
  function uid() { return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
  function xpForPriority(priority) {
    return { LOW: 5, MEDIUM: 10, HIGH: 15, URGENT: 20 }[priority] || 10;
  }
  function needForLevel(level) { return 80 + (level - 1) * 60; }
  function levelInfo(totalXp = state.profile.xp) {
    let level = 1;
    let inLevel = Math.max(0, Number(totalXp) || 0);
    let need = needForLevel(level);
    while (inLevel >= need && level < 999) {
      inLevel -= need;
      level += 1;
      need = needForLevel(level);
    }
    return {
      level,
      title: levelTitles[Math.min(level - 1, levelTitles.length - 1)],
      inLevel,
      need,
      pct: Math.min(100, Math.round((inLevel / need) * 100)),
    };
  }
  function questProgress(quest) {
    const tasks = state.tasks.filter((task) => task.questId === quest.id);
    const done = tasks.filter((task) => task.completed).length;
    return {
      tasks,
      done,
      total: tasks.length,
      pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      cleared: tasks.length > 0 && done === tasks.length,
    };
  }
  function routeFromHash() {
    const value = location.hash.replace(/^#\/?/, '').split('?')[0];
    return routes.includes(value) ? value : 'today';
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char]);
  }
  function localDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function toLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
  function isToday(task) { return task.dueAt && localDateKey(task.dueAt) === localDateKey(); }
  function isOverdue(task) { return !task.completed && task.dueAt && new Date(task.dueAt).getTime() < Date.now(); }
  function matchesSearch(task) {
    if (!searchText) return true;
    const needle = searchText.toLowerCase();
    return [task.title, task.note].some((value) => String(value || '').toLowerCase().includes(needle));
  }
  function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
      if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
      if (a.dueAt && b.dueAt) return new Date(a.dueAt) - new Date(b.dueAt);
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
  function formatTime(value) {
    if (!value) return '未设置时间';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '未设置时间';
    const day = localDateKey(date) === localDateKey() ? '今天' : new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date);
    const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return `${day} ${time}`;
  }
  function applyFontScale() { document.documentElement.dataset.fontScale = state.settings.fontScale; }
  function renderGrowthSummary() {
    const info = levelInfo();
    return `<div class="level-copy"><b>Lv.${info.level} ${info.title}</b><small>${info.inLevel} / ${info.need} XP</small></div><div class="level-track"><i style="width:${info.pct}%"></i></div>`;
  }
  function head(title, description, action = '') {
    return `<div class="page-head"><div><h1>${title}</h1><p>${description}</p></div><div class="actions">${action}</div></div>`;
  }
  function stat(title, value, helper, className = '') {
    return `<article class="stat ${className}"><small>${title}</small><strong>${value}</strong><em>${helper}</em></article>`;
  }
  function panel(title, subtitle, body) {
    return `<section class="panel"><div class="panel-head"><h2>${title}</h2><small>${subtitle}</small></div><div class="panel-body">${body}</div></section>`;
  }
  function empty(text) { return `<div class="empty">${esc(text)}</div>`; }

  function render() {
    currentRoute = routeFromHash();
    document.querySelectorAll('[data-route]').forEach((button) => {
      button.classList.toggle('active', button.dataset.route === currentRoute);
    });
    const renderer = { today: renderToday, all: renderAll, completed: renderCompleted, settings: renderSettings }[currentRoute];
    page.innerHTML = renderer();
    document.getElementById('growth-summary').innerHTML = renderGrowthSummary();
    search.hidden = currentRoute === 'settings';
  }

  function activeTasks() { return state.tasks.filter((task) => !task.completed && matchesSearch(task)); }

  function renderToday() {
    const active = sortTasks(activeTasks());
    const todayCount = active.filter(isToday).length;
    const overdueCount = active.filter(isOverdue).length;
    return head('今日待办', '只看要做的事情，以及什么时候做。', '<button class="primary-btn" data-action="new-task">新建待办</button>') +
      renderSmartCapture() + renderQuestStrip() +
      `<div class="stats">${stat('待办事项', active.length, '当前未完成')}${stat('今天到期', todayCount, '需要今天处理', 'today')}${stat('已经超期', overdueCount, '请优先安排', overdueCount ? 'overdue' : '')}${stat('累计经验', state.profile.xp, `已通关 ${state.stats.questsCleared} 次`, 'xp')}</div>` +
      panel('待办事项', `${active.length} 项`, active.length ? `<div class="task-list">${active.map(taskRow).join('')}</div>` : empty('没有待办事项，点击“新建待办”开始记录'));
  }

  function renderSmartCapture() {
    return `<section class="smart-capture"><div class="smart-copy"><span class="smart-kicker">智能拆分</span><h2>把一整段事情，变成可以逐项完成的关卡</h2><p>粘贴通知、申请清单或工作要求；内容只在当前浏览器处理。</p></div><div class="smart-input"><label for="ai-task-input">整段输入</label><textarea id="ai-task-input" placeholder="例如：粘贴一份申请资料清单、会议行动项或项目要求…"></textarea><div class="smart-actions"><small>拆分后可先检查和修改，再批量加入待办。</small><button class="primary-btn" data-action="split-tasks">智能拆分待办</button></div></div></section>`;
  }

  function smartSplit(text) {
    const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return { title: '新关卡', tasks: [] };
    const firstIsItem = /^\d+[.、\s]*/.test(lines[0]);
    const title = firstIsItem
      ? '新关卡'
      : lines.shift().replace(/[：:]\s*(?:[（(].*?[）)])?\s*$/, '').trim() || '新关卡';
    const tasks = [];
    const addTask = (taskTitle, note = '') => {
      const cleanTitle = taskTitle.replace(/^[：:、.\s]+/, '').trim();
      if (!cleanTitle) return;
      const priority = /发送|提交|计划书|申请表/.test(cleanTitle) ? 'HIGH' : 'MEDIUM';
      tasks.push({ title: cleanTitle, note, priority, xpReward: xpForPriority(priority) });
    };

    lines.forEach((line) => {
      const numbered = line.match(/^\d+[.、\s]*(.+)$/);
      if (numbered) {
        addTask(numbered[1]);
      } else if (/^【.*】$/.test(line) && tasks.length) {
        tasks[tasks.length - 1].note = [tasks[tasks.length - 1].note, line].filter(Boolean).join('\n');
      } else if (/^压缩包备注[：:]/.test(line)) {
        addTask('按要求命名压缩包', line);
      } else if (/压缩.*文件.*发送|发送.*(?:微信|邮箱|联系人)/.test(line)) {
        addTask('发送全部申请资料', line);
      } else if (tasks.length) {
        tasks[tasks.length - 1].note = [tasks[tasks.length - 1].note, line].filter(Boolean).join('\n');
      } else {
        addTask(line);
      }
    });
    return { title, tasks };
  }

  function showBreakdownModal(result) {
    if (!result.tasks.length) {
      toast('没有识别到可拆分的待办');
      return;
    }
    const rows = result.tasks.map((task, index) => `<div class="breakdown-row">
      <label class="breakdown-check"><input type="checkbox" name="selected" value="${index}" checked /><span>加入</span></label>
      <div class="field"><label for="breakdown-${index}">待办 ${index + 1}</label><input id="breakdown-${index}" name="task-${index}" value="${esc(task.title)}" maxlength="160" /></div>
      <span class="xp-badge">+${task.xpReward} XP</span>
    </div>`).join('');
    modalRoot.dataset.breakdown = JSON.stringify(result.tasks);
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal wide-modal" role="dialog" aria-modal="true">
      <div class="modal-head"><div><h2>检查拆分结果</h2><small>已拆分为 ${result.tasks.length} 个待办，可修改后加入</small></div><button class="modal-close" data-action="close-modal">关闭</button></div>
      <form class="breakdown-form" id="breakdown-form">
        <div class="field"><label for="quest-title">关卡名称</label><input id="quest-title" name="questTitle" value="${esc(result.title)}" maxlength="100" required /></div>
        <div class="breakdown-list">${rows}</div>
        <div class="modal-actions"><button type="button" class="secondary-btn" data-action="close-modal">取消</button><button type="submit" class="primary-btn">批量加入待办</button></div>
      </form>
    </section></div>`;
  }

  function saveBreakdown(form) {
    const templates = JSON.parse(modalRoot.dataset.breakdown || '[]');
    const data = new FormData(form);
    const selected = data.getAll('selected').map(Number);
    if (!selected.length) {
      toast('请至少选择一个待办');
      return;
    }
    const quest = {
      id: `quest_${uid()}`,
      title: String(data.get('questTitle') || '').trim() || '新关卡',
      bonus: questClearBonus,
      bonusClaimed: false,
      clearedAt: null,
      createdAt: now(),
    };
    const created = selected.map((index) => {
      const template = templates[index];
      return normalizeTask({
        id: uid(),
        title: String(data.get(`task-${index}`) || '').trim(),
        note: template.note,
        priority: template.priority,
        xpReward: template.xpReward,
        questId: quest.id,
        dueAt: null,
        completed: false,
      });
    }).filter(Boolean);
    if (!created.length) {
      toast('待办标题不能为空');
      return;
    }
    state.quests.push(quest);
    state.tasks.push(...created);
    closeModal();
    save(`已加入 ${created.length} 个待办，开始闯关`);
  }

  function renderQuestStrip() {
    const quest = [...state.quests].reverse().find((item) => !questProgress(item).cleared) || [...state.quests].reverse()[0];
    if (!quest) return '';
    const progress = questProgress(quest);
    return `<section class="quest-strip ${progress.cleared ? 'cleared' : ''}"><div><small>${progress.cleared ? '最近通关' : '当前关卡'}</small><b>${esc(quest.title)}</b></div><div class="quest-progress"><span>${progress.done} / ${progress.total} 项</span><div><i style="width:${progress.pct}%"></i></div></div><strong>${progress.cleared ? '已通关' : `${progress.pct}%`}</strong></section>`;
  }

  function renderAll() {
    let items = activeTasks();
    if (listFilter === 'today') items = items.filter(isToday);
    if (listFilter === 'overdue') items = items.filter(isOverdue);
    if (listFilter === 'unscheduled') items = items.filter((task) => !task.dueAt);
    items = sortTasks(items);
    const filters = [
      ['all', '全部'], ['today', '今天到期'], ['overdue', '已超期'], ['unscheduled', '未设时间'],
    ].map(([value, label]) => `<button class="${listFilter === value ? 'active' : ''}" data-action="filter" data-value="${value}">${label}</button>`).join('');
    return head('全部事项', '按时间统一查看所有未完成待办。', '<button class="primary-btn" data-action="new-task">新建待办</button>') +
      `<div class="filters">${filters}</div>` +
      panel('待办列表', `${items.length} 项`, items.length ? `<div class="task-list">${items.map(taskRow).join('')}</div>` : empty('当前筛选条件下没有待办'));
  }

  function renderCompleted() {
    const items = state.tasks
      .filter((task) => task.completed && matchesSearch(task))
      .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    return head('已完成', '完成记录保留在当前浏览器中。') +
      panel('完成记录', `${items.length} 项`, items.length ? `<div class="task-list">${items.map(taskRow).join('')}</div>` : empty('还没有已完成事项'));
  }

  function taskRow(task) {
    const overdue = isOverdue(task);
    const priorityClass = task.priority === 'URGENT' ? 'urgent' : task.priority === 'HIGH' ? 'high' : task.priority === 'LOW' ? 'low' : '';
    return `<article class="task-row ${overdue ? 'overdue' : ''} ${task.completed ? 'completed' : ''}">
      <input class="task-check" type="checkbox" data-action="toggle-task" data-id="${task.id}" ${task.completed ? 'checked' : ''} aria-label="切换${esc(task.title)}完成状态" />
      <div class="task-main"><div class="task-title">${esc(task.title)}</div>${task.note ? `<div class="task-note">${esc(task.note)}</div>` : ''}${task.questId ? `<div class="quest-tag">${esc(state.quests.find((quest) => quest.id === task.questId)?.title || '关卡任务')}</div>` : ''}</div>
      <time class="task-time ${overdue ? 'overdue' : ''}">${overdue ? '已超期 · ' : ''}${formatTime(task.dueAt)}</time>
      <div class="task-rewards"><span class="xp-badge">+${task.xpReward} XP</span><span class="badge ${priorityClass}">${priorityLabels[task.priority]}</span></div>
      <div class="row-actions"><button class="text-btn" data-action="edit-task" data-id="${task.id}">编辑</button><button class="text-btn delete" data-action="delete-task" data-id="${task.id}">删除</button></div>
    </article>`;
  }

  function renderSettings() {
    const completedCount = state.tasks.filter((task) => task.completed).length;
    const size = new Blob([JSON.stringify(state)]).size;
    const fontOptions = Object.entries(fontLabels).map(([value, [label, scale]]) =>
      `<button class="font-option ${state.settings.fontScale === value ? 'active' : ''}" data-action="font-scale" data-value="${value}"><b>${label}</b><small>${scale}</small></button>`
    ).join('');
    return head('数据与设置', '调整字体大小，并管理当前浏览器中的待办数据。') +
      `<div class="settings-grid">
        <section class="setting-block"><h2>界面字体大小</h2><p>字体、按钮、间距和卡片会一起缩放，设置会自动保存。</p><div class="font-options">${fontOptions}</div></section>
        <section class="setting-block"><h2>当前数据</h2><p>约 ${(size / 1024).toFixed(1)} KB，只保存在当前浏览器。</p><div class="data-summary"><div>全部事项<strong>${state.tasks.length}</strong></div><div>已完成<strong>${completedCount}</strong></div><div>累计经验<strong>${state.profile.xp}</strong></div><div>已通关<strong>${state.stats.questsCleared}</strong></div></div></section>
      </div><div style="height:1rem"></div>
      <section class="setting-block"><h2>备份与恢复</h2><p>导出文件只包含待办、时间、优先级、备注和字体设置。旧版其他模块已从新界面删除。</p><div class="setting-actions"><button class="primary-btn" data-action="export">导出 JSON</button><button class="secondary-btn" data-action="import">导入 JSON</button><button class="danger-btn" data-action="reset">清空全部待办</button></div></section>`;
  }

  function showTaskModal(task = {}) {
    const inputId = (name) => `task-${name}`;
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h2>${task.id ? '编辑待办' : '新建待办'}</h2><button class="modal-close" data-action="close-modal">关闭</button></div>
      <form class="modal-form" id="task-form" data-id="${task.id || ''}">
        <div class="field full"><label for="${inputId('title')}">待办事项</label><input id="${inputId('title')}" name="title" value="${esc(task.title || '')}" maxlength="120" required autofocus /></div>
        <div class="field"><label for="${inputId('due')}">日期和时间</label><input id="${inputId('due')}" name="dueAt" type="datetime-local" value="${toLocalInput(task.dueAt)}" /></div>
        <div class="field"><label for="${inputId('priority')}">优先级</label><select id="${inputId('priority')}" name="priority">${Object.entries(priorityLabels).map(([value, label]) => `<option value="${value}" ${task.priority === value || (!task.priority && value === 'MEDIUM') ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
        <div class="field full"><label for="${inputId('note')}">备注（可选）</label><textarea id="${inputId('note')}" name="note" maxlength="1000">${esc(task.note || '')}</textarea></div>
        <div class="modal-actions"><button type="button" class="secondary-btn" data-action="close-modal">取消</button><button type="submit" class="primary-btn">保存待办</button></div>
      </form>
    </section></div>`;
    requestAnimationFrame(() => document.getElementById(inputId('title'))?.focus());
  }

  function saveTask(form) {
    const data = Object.fromEntries(new FormData(form));
    const title = String(data.title || '').trim();
    if (!title) return;
    const existing = state.tasks.find((task) => task.id === form.dataset.id);
    const record = {
      ...(existing || {}),
      id: existing?.id || uid(),
      title,
      dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : null,
      priority: priorityLabels[data.priority] ? data.priority : 'MEDIUM',
      note: String(data.note || '').trim(),
      questId: existing?.questId || null,
      xpReward: existing && existing.completed ? existing.xpReward : xpForPriority(data.priority),
      completed: existing?.completed || false,
      completedAt: existing?.completedAt || null,
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };
    if (existing) Object.assign(existing, record); else state.tasks.push(record);
    closeModal();
    save(existing ? '待办已更新' : '待办已创建');
  }

  function closeModal() { modalRoot.innerHTML = ''; }
  function removeTask(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task || !confirm(`确定删除“${task.title}”吗？`)) return;
    if (task.completed) {
      state.profile.xp = Math.max(0, state.profile.xp - task.xpReward);
      state.stats.totalCompleted = Math.max(0, state.stats.totalCompleted - 1);
    }
    state.tasks = state.tasks.filter((item) => item.id !== id);
    if (task.questId && !state.tasks.some((item) => item.questId === task.questId)) {
      state.quests = state.quests.filter((quest) => quest.id !== task.questId);
    }
    save('待办已删除');
  }
  function toggleTask(id, completed) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task || task.completed === completed) return;
    const beforeLevel = levelInfo().level;
    task.completed = completed;
    task.completedAt = completed ? now() : null;
    task.updatedAt = now();
    state.profile.xp = Math.max(0, state.profile.xp + (completed ? task.xpReward : -task.xpReward));
    state.stats.totalCompleted = Math.max(0, state.stats.totalCompleted + (completed ? 1 : -1));
    let message = completed ? `完成待办，+${task.xpReward} XP` : `已恢复为待办，-${task.xpReward} XP`;
    if (completed && task.questId) {
      const quest = state.quests.find((item) => item.id === task.questId);
      if (quest && !quest.bonusClaimed && questProgress(quest).cleared) {
        quest.bonusClaimed = true;
        quest.clearedAt = now();
        state.profile.xp += quest.bonus;
        state.stats.questsCleared += 1;
        message = `闯关成功！+${task.xpReward + quest.bonus} XP（含通关奖励 ${quest.bonus} XP）`;
      }
    }
    const afterLevel = levelInfo().level;
    if (afterLevel > beforeLevel) message += `，升级到 Lv.${afterLevel}`;
    save(message);
  }
  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 2200);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `todo-backup-${localDateKey()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
    toast('备份已导出');
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed?.tasks)) throw new Error('文件中没有待办数据');
        localStorage.setItem(`${ARCHIVE_KEY}.import-${Date.now()}`, reader.result);
        state = normalize(parsed);
        applyFontScale();
        save('待办数据已导入');
      } catch (error) {
        alert(`导入失败：${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-route], [data-action]');
    if (!target) return;
    if (target.dataset.route) {
      location.hash = target.dataset.route;
      return;
    }
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === 'close-modal') {
      if (target.tagName === 'BUTTON' || event.target === target) closeModal();
      return;
    }
    const handlers = {
      'new-task': () => showTaskModal(),
      'split-tasks': () => {
        const input = document.getElementById('ai-task-input');
        const text = input?.value.trim();
        if (!text) return toast('请先粘贴一段工作要求');
        showBreakdownModal(smartSplit(text));
      },
      'edit-task': () => showTaskModal(state.tasks.find((task) => task.id === id)),
      'delete-task': () => removeTask(id),
      'filter': () => { listFilter = target.dataset.value; render(); },
      'font-scale': () => {
        state.settings.fontScale = target.dataset.value;
        applyFontScale();
        save(`字体已调整为${fontLabels[target.dataset.value][0]}`);
      },
      export: exportData,
      import: () => importFile.click(),
      reset: () => {
        if (!confirm('确定清空当前浏览器中的全部待办吗？建议先导出备份。')) return;
        state.tasks = [];
        state.quests = [];
        state.profile.xp = 0;
        state.stats = { totalCompleted: 0, questsCleared: 0 };
        save('全部待办已清空');
      },
    };
    handlers[action]?.();
  });

  document.addEventListener('change', (event) => {
    if (event.target.dataset.action === 'toggle-task') {
      toggleTask(event.target.dataset.id, event.target.checked);
    }
  });
  document.addEventListener('submit', (event) => {
    if (!['task-form', 'breakdown-form'].includes(event.target.id)) return;
    event.preventDefault();
    if (event.target.id === 'task-form') saveTask(event.target);
    if (event.target.id === 'breakdown-form') saveBreakdown(event.target);
  });
  importFile.addEventListener('change', () => {
    if (importFile.files[0]) importData(importFile.files[0]);
    importFile.value = '';
  });
  search.addEventListener('input', () => { searchText = search.value.trim(); render(); });
  document.getElementById('quick-create').addEventListener('click', () => showTaskModal());
  window.addEventListener('hashchange', () => {
    searchText = '';
    search.value = '';
    render();
  });

  if (!location.hash) location.hash = 'today'; else render();
})();
