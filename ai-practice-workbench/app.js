(function () {
  'use strict';

  const STORE_KEY = 'ai-practice-workbench.v1';
  const ARCHIVE_KEY = 'ai-practice-workbench.v1.legacy-archive';
  const routes = ['today', 'all', 'completed', 'settings'];
  const priorityLabels = { LOW: '低', MEDIUM: '普通', HIGH: '重要', URGENT: '紧急' };
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
      version: 2,
      tasks: [],
      settings: { fontScale: 'standard' },
      meta: { createdAt: now(), updatedAt: now() },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (parsed.version !== 2 && !localStorage.getItem(ARCHIVE_KEY)) {
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
      completed,
      completedAt: completed ? (task.completedAt || now()) : null,
      createdAt: task.createdAt || now(),
      updatedAt: task.updatedAt || now(),
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
    search.hidden = currentRoute === 'settings';
  }

  function activeTasks() { return state.tasks.filter((task) => !task.completed && matchesSearch(task)); }

  function renderToday() {
    const active = sortTasks(activeTasks());
    const todayCount = active.filter(isToday).length;
    const overdueCount = active.filter(isOverdue).length;
    return head('今日待办', '只看要做的事情，以及什么时候做。', '<button class="primary-btn" data-action="new-task">新建待办</button>') +
      `<div class="stats">${stat('待办事项', active.length, '当前未完成')}${stat('今天到期', todayCount, '需要今天处理', 'today')}${stat('已经超期', overdueCount, '请优先安排', overdueCount ? 'overdue' : '')}</div>` +
      panel('待办事项', `${active.length} 项`, active.length ? `<div class="task-list">${active.map(taskRow).join('')}</div>` : empty('没有待办事项，点击“新建待办”开始记录'));
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
      <div class="task-main"><div class="task-title">${esc(task.title)}</div>${task.note ? `<div class="task-note">${esc(task.note)}</div>` : ''}</div>
      <time class="task-time ${overdue ? 'overdue' : ''}">${overdue ? '已超期 · ' : ''}${formatTime(task.dueAt)}</time>
      <span class="badge ${priorityClass}">${priorityLabels[task.priority]}</span>
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
        <section class="setting-block"><h2>当前数据</h2><p>约 ${(size / 1024).toFixed(1)} KB，只保存在当前浏览器。</p><div class="data-summary"><div>全部事项<strong>${state.tasks.length}</strong></div><div>已完成<strong>${completedCount}</strong></div></div></section>
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
    state.tasks = state.tasks.filter((item) => item.id !== id);
    save('待办已删除');
  }
  function toggleTask(id, completed) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.completed = completed;
    task.completedAt = completed ? now() : null;
    task.updatedAt = now();
    save(completed ? '已完成' : '已恢复为待办');
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
    if (event.target.id !== 'task-form') return;
    event.preventDefault();
    saveTask(event.target);
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
