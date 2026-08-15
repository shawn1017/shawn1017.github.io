(function () {
  'use strict';

  const STORE_KEY = 'ai-practice-workbench.v1';
  const routes = ['dashboard', 'opportunities', 'content', 'projects', 'review', 'settings'];
  const labels = {
    priority: { LOW: '低优先级', MEDIUM: '中优先级', HIGH: '高优先级', URGENT: '紧急' },
    taskStatus: { TODO: '待处理', IN_PROGRESS: '进行中', WAITING: '等待他人', COMPLETED: '已完成', CANCELLED: '已取消' },
    stage: { DISCOVERED: '发现问题', ANALYZING: '分析中', DESIGNING: '方案设计', TESTING: '测试中', ONLINE: '已上线', REVIEWED: '已复盘', PAUSED: '暂不处理' },
    privacy: { PUBLIC: '可公开', INTERNAL: '内部内容', CONFIDENTIAL: '敏感内容' },
    contentType: { FACTORY_PROBLEM: '工厂真实问题', AI_PRACTICE: 'AI改造实践', CODEX_LOG: 'Codex开发日志', BUSINESS_INSIGHT: '企业AI认知', PERSONAL_REVIEW: '个人复盘' },
    contentStatus: { MATERIAL: '素材', SCRIPT_PENDING: '待写脚本', SHOOTING_PENDING: '待拍摄', SHOT: '已拍摄', EDITING_PENDING: '待剪辑', PUBLISH_PENDING: '待发布', PUBLISHED: '已发布', REVIEWED: '已复盘' },
    projectStatus: { PLANNING: '规划中', ACTIVE: '进行中', PAUSED: '已暂停', COMPLETED: '已完成', CANCELLED: '已取消' }
  };
  const stateShape = () => ({ version: 1, projects: [], tasks: [], opportunities: [], topics: [], scripts: [], publications: [], reviews: [], meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
  let state = load();
  let currentRoute = routeFromHash();
  let query = '';

  const page = document.getElementById('page');
  const search = document.getElementById('global-search');
  const modalRoot = document.getElementById('modal-root');
  const importFile = document.getElementById('import-file');
  document.getElementById('today-label').textContent = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return stateShape();
      return normalize(JSON.parse(raw));
    } catch (error) {
      console.warn('本地数据读取失败', error);
      return stateShape();
    }
  }
  function normalize(input) {
    const base = stateShape();
    Object.keys(base).forEach((key) => { if (input && input[key] !== undefined) base[key] = input[key]; });
    return base;
  }
  function save(message) {
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if (message) toast(message);
    render();
  }
  function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
  function now() { return new Date().toISOString(); }
  function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function routeFromHash() { const value = location.hash.replace(/^#\/?/, '').split('?')[0]; return routes.includes(value) ? value : 'dashboard'; }
  function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]); }
  function includesQuery(...values) { if (!query) return true; const q = query.toLowerCase(); return values.some((v) => String(v ?? '').toLowerCase().includes(q)); }
  function optionMap(map, selected) { return Object.entries(map).map(([value,label]) => `<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join(''); }
  function fmtDate(value) { if (!value) return '未设置'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '未设置' : new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d); }
  function tone(value) { if (['COMPLETED','ONLINE','REVIEWED','PUBLISHED'].includes(value)) return 'green'; if (['URGENT','CONFIDENTIAL'].includes(value)) return 'red'; if (['HIGH','ANALYZING','SCRIPT_PENDING'].includes(value)) return 'orange'; if (['DESIGNING','WAITING','SHOOTING_PENDING','EDITING_PENDING'].includes(value)) return 'purple'; return 'blue'; }
  function badge(text, kind='') { return `<span class="badge ${kind}">${esc(text)}</span>`; }
  function empty(text) { return `<div class="empty">${esc(text)}</div>`; }
  function stat(title,value,helper,icon,kind) { return `<article class="stat tone-${kind}"><span class="icon">${icon}</span><small>${title}</small><strong>${value}</strong><em>${helper}</em></article>`; }
  function panel(title, subtitle, body) { return `<section class="panel"><div class="panel-head"><h2>${title}</h2><small>${subtitle||''}</small></div>${body}</section>`; }
  function head(title, desc, buttons='') { return `<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${buttons}</div></div>`; }

  function render() {
    currentRoute = routeFromHash();
    document.querySelectorAll('[data-route]').forEach((el) => el.classList.toggle('active', el.dataset.route === currentRoute));
    page.innerHTML = ({ dashboard: renderDashboard, opportunities: renderOpportunities, content: renderContent, projects: renderProjects, review: renderReview, settings: renderSettings })[currentRoute]();
    search.placeholder = `搜索${({dashboard:'今日事项',opportunities:'AI机会',content:'内容选题',projects:'项目与任务',review:'复盘记录',settings:'数据'})[currentRoute]}…`;
  }

  function renderDashboard() {
    const active = state.tasks.filter((t) => !['COMPLETED','CANCELLED'].includes(t.status));
    const done = state.tasks.filter((t) => t.status === 'COMPLETED');
    const overdue = active.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
    const top = active.filter((t) => t.isTopThree).sort((a,b)=>(a.topThreeOrder||99)-(b.topThreeOrder||99));
    const others = active.filter((t) => !t.isTopThree && includesQuery(t.title,t.description)).slice(0,8);
    const waiting = active.filter((t) => t.isWaiting || t.status === 'WAITING');
    const opportunities = state.opportunities.filter((o) => includesQuery(o.title,o.businessScene)).slice(-5).reverse();
    const topics = state.topics.filter((t) => includesQuery(t.title,t.coreViewpoint)).slice(-5).reverse();
    return head('今日工作台','把重要任务、AI机会和内容素材收拢到一个桌面。','<button class="secondary-btn" data-action="new-opportunity">＋ AI机会</button><button class="primary-btn" data-action="new-task">＋ 新建任务</button>') +
      `<div class="stats">${stat('待办任务',active.length,'尚未完成的任务','✓','blue')}${stat('已完成',done.length,'累计完成任务','●','green')}${stat('风险提醒',overdue.length,'已超期且未完成','!','orange')}${stat('可拍选题',state.topics.filter(t=>['SHOOTING_PENDING','SHOT','PUBLISH_PENDING'].includes(t.status)).length,'已进入拍摄环节','▶','purple')}</div>`+
      `<div class="grid-main"><div class="stack">${panel('今日最重要的3件事',`${top.length}/3`, `<div class="panel-body"><div class="list">${top.length?top.map(taskRow).join(''):empty('还没有设置重点任务')}</div></div>`)}${panel('今日其他任务',`${others.length} 项`,`<div class="panel-body"><div class="list">${others.length?others.map(taskRow).join(''):empty('暂无其他待办')}</div></div>`)}</div>`+
      `<div class="stack">${panel('等待他人',`${waiting.length} 项`,`<div class="panel-body"><div class="list">${waiting.length?waiting.slice(0,5).map(taskRow).join(''):empty('暂无等待事项')}</div></div>`)}${panel('今日AI机会',`${opportunities.length} 项`,`<div class="panel-body"><div class="list">${opportunities.length?opportunities.map(o=>`<div class="list-row"><span class="grow"><div class="title">${esc(o.title)}</div><div class="meta">${esc(o.businessScene)}</div></span>${badge(labels.stage[o.stage],tone(o.stage))}</div>`).join(''):empty('尚未记录AI机会')}</div></div>`)}${panel('今日内容素材',`${topics.length} 项`,`<div class="panel-body"><div class="list">${topics.length?topics.map(t=>`<div class="list-row"><span class="grow"><div class="title">${esc(t.title)}</div><div class="meta">${esc(labels.contentType[t.contentType])}</div></span>${badge(labels.contentStatus[t.status],tone(t.status))}</div>`).join(''):empty('尚未记录内容选题')}</div></div>`)}</div></div>`;
  }
  function taskRow(t) { return `<div class="list-row"><button class="check ${t.status==='COMPLETED'?'done':''}" data-action="toggle-task" data-id="${t.id}" aria-label="切换完成状态">✓</button><span class="grow"><div class="title">${esc(t.title)}</div><div class="meta">${esc(t.nextAction||t.description||fmtDate(t.dueAt))}</div></span>${badge(labels.priority[t.priority],tone(t.priority))}<button class="icon-btn" data-action="edit-task" data-id="${t.id}">✎</button></div>`; }

  function renderProjects() {
    const projects = state.projects.filter((p)=>includesQuery(p.name,p.description));
    const tasks = state.tasks.filter((t)=>includesQuery(t.title,t.description));
    const projectCards = projects.map((p)=>{const count=state.tasks.filter(t=>t.projectId===p.id).length;return `<article class="project-card"><div class="actions">${badge(labels.projectStatus[p.status],tone(p.status))}<button class="icon-btn" data-action="edit-project" data-id="${p.id}">✎</button></div><h3>${esc(p.name)}</h3><p>${esc(p.description||'暂无项目说明')}</p><div class="progress"><i style="width:${Math.max(0,Math.min(100,p.progress||0))}%"></i></div><div class="project-foot"><span>${p.progress||0}%</span><span>${count} 个任务</span></div></article>`;}).join('');
    return head('项目与任务','用项目组织长期目标，具体执行落到任务。','<button class="secondary-btn" data-action="new-project">＋ 新建项目</button><button class="primary-btn" data-action="new-task">＋ 新建任务</button>')+
      `<div class="project-grid">${projectCards||empty('尚未创建项目')}</div>`+
      panel('全部任务',`${tasks.length} 项`,`<div class="table-wrap"><table><thead><tr><th>任务</th><th>项目</th><th>优先级</th><th>状态</th><th>截止时间</th><th></th></tr></thead><tbody>${tasks.length?tasks.map(t=>`<tr><td><strong>${esc(t.title)}</strong><div class="meta">${esc(t.nextAction||t.description)}</div></td><td>${esc(state.projects.find(p=>p.id===t.projectId)?.name||'未归类')}</td><td>${badge(labels.priority[t.priority],tone(t.priority))}</td><td><select data-action="task-status" data-id="${t.id}">${optionMap(labels.taskStatus,t.status)}</select></td><td>${fmtDate(t.dueAt)}</td><td><div class="row-actions"><button class="icon-btn" title="转为AI机会" data-action="task-to-opportunity" data-id="${t.id}">✦</button><button class="icon-btn" data-action="edit-task" data-id="${t.id}">✎</button><button class="icon-btn text-danger" data-action="delete-task" data-id="${t.id}">×</button></div></td></tr>`).join(''):`<tr><td colspan="6">${empty('尚未创建任务')}</td></tr>`}</tbody></table></div>`);
  }

  function renderOpportunities() {
    const items = state.opportunities.filter((o)=>includesQuery(o.title,o.businessScene,o.painPoints,o.proposedSolution));
    return head('AI机会池','记录真实低效问题，并持续推进验证和上线。','<button class="primary-btn" data-action="new-opportunity">＋ 新建AI机会</button>')+
      `<div class="stats">${stat('全部机会',items.length,'记录的真实问题','✦','blue')}${stat('测试中',items.filter(i=>i.stage==='TESTING').length,'正在验证方案','◫','orange')}${stat('已上线',items.filter(i=>i.stage==='ONLINE').length,'已进入工作流程','✓','green')}${stat('可拍内容',items.filter(i=>i.isContentReady).length,'适合转成内容','▶','purple')}</div>`+
      panel('机会列表',`${items.length} 条`,`<div class="table-wrap"><table><thead><tr><th>问题名称</th><th>业务场景</th><th>阶段</th><th>隐私</th><th>下一步</th><th></th></tr></thead><tbody>${items.length?items.map(o=>`<tr><td><strong>${esc(o.title)}</strong><div class="meta">${esc(o.painPoints)}</div></td><td>${esc(o.businessScene)}</td><td><select data-action="opportunity-stage" data-id="${o.id}">${optionMap(labels.stage,o.stage)}</select></td><td>${badge(labels.privacy[o.privacyLevel],tone(o.privacyLevel))}</td><td>${esc(o.nextAction||'待补充')}</td><td><div class="row-actions"><button class="icon-btn" title="转为内容选题" data-action="opportunity-to-topic" data-id="${o.id}">▤</button><button class="icon-btn" data-action="edit-opportunity" data-id="${o.id}">✎</button><button class="icon-btn text-danger" data-action="delete-opportunity" data-id="${o.id}">×</button></div></td></tr>`).join(''):`<tr><td colspan="6">${empty('尚未记录AI机会')}</td></tr>`}</tbody></table></div>`);
  }

  function renderContent() {
    const topics = state.topics.filter((t)=>includesQuery(t.title,t.targetAudience,t.coreViewpoint,t.hook));
    const stages=['MATERIAL','SCRIPT_PENDING','SHOOTING_PENDING','PUBLISHED'];
    return head('内容中心','把真实问题沉淀成可以持续生产和复盘的内容。','<button class="primary-btn" data-action="new-topic">＋ 新建内容选题</button>')+
      `<div class="stats">${stat('素材总数',topics.length,'全部内容选题','▤','blue')}${stat('待写脚本',topics.filter(t=>t.status==='SCRIPT_PENDING').length,'需要完成脚本','✎','orange')}${stat('待拍摄',topics.filter(t=>t.status==='SHOOTING_PENDING').length,'脚本已经准备','◉','purple')}${stat('已发布',topics.filter(t=>t.status==='PUBLISHED').length,'已进入数据复盘','↑','green')}</div>`+
      panel('内容流水线','拖动暂未开放，可直接切换状态',`<div class="panel-body"><div class="pipeline">${stages.map(s=>`<div class="pipeline-col"><div class="pipeline-head"><span>${labels.contentStatus[s]}</span>${badge(topics.filter(t=>t.status===s).length,'blue')}</div>${topics.filter(t=>t.status===s).map(t=>`<div class="pipeline-card"><strong>${esc(t.title)}</strong><div class="meta">${esc(labels.contentType[t.contentType])}</div></div>`).join('')||empty('暂无')}</div>`).join('')}</div></div>`)+
      `<div style="height:16px"></div>`+panel('全部选题',`${topics.length} 条`,`<div class="table-wrap"><table><thead><tr><th>选题</th><th>目标用户</th><th>内容类型</th><th>状态</th><th>钩子</th><th></th></tr></thead><tbody>${topics.length?topics.map(t=>`<tr><td><strong>${esc(t.title)}</strong></td><td>${esc(t.targetAudience||'待补充')}</td><td>${esc(labels.contentType[t.contentType])}</td><td><select data-action="topic-status" data-id="${t.id}">${optionMap(labels.contentStatus,t.status)}</select></td><td>${esc(t.hook||'待补充')}</td><td><div class="row-actions"><button class="icon-btn" data-action="edit-topic" data-id="${t.id}">✎</button><button class="icon-btn text-danger" data-action="delete-topic" data-id="${t.id}">×</button></div></td></tr>`).join(''):`<tr><td colspan="6">${empty('尚未记录内容选题')}</td></tr>`}</tbody></table></div>`);
  }

  function renderReview() {
    const key=todayKey(); const review=state.reviews.find(r=>String(r.reviewDate).slice(0,10)===key)||{};
    const fields=[['completedSummary','今天完成了什么'],['unfinishedSummary','未完成事项'],['unfinishedReason','未完成原因'],['discoveredProblems','发现的真实问题'],['aiOpportunitiesSummary','AI机会记录'],['contentIdeasSummary','内容灵感'],['tomorrowTopThree','明日最重要的3件事'],['personalNotes','个人备注']];
    return head('每日复盘','记录今天的结果、问题与明日重点，数据保存在当前浏览器。')+`<section class="panel"><form id="review-form" class="panel-body review-form">${fields.map(([name,label],i)=>`<div class="field ${i>=6?'full':''}"><label>${label}</label><textarea name="${name}" placeholder="记录${label}…">${esc(review[name]||'')}</textarea></div>`).join('')}<div class="full actions" style="justify-content:flex-end"><button class="primary-btn" type="submit">保存今日复盘</button></div></form></section>`;
  }

  function renderSettings() {
    const size=new Blob([JSON.stringify(state)]).size;
    return head('数据与设置','线上版只使用当前浏览器的 localStorage，不连接本机 SQLite。')+`<div class="settings-grid"><section class="setting-block"><h2>本地数据备份</h2><p>建议每周导出一次 JSON。导入文件只在浏览器中读取，不会上传到服务器。</p><div class="setting-actions"><button class="primary-btn" data-action="export">导出 JSON</button><button class="secondary-btn" data-action="import">导入 JSON</button><button class="danger-btn" data-action="reset">清空浏览器数据</button></div></section><section class="setting-block"><h2>当前数据量</h2><p>存储键：${STORE_KEY} · 约 ${(size/1024).toFixed(1)} KB</p><div class="data-summary"><div>项目<strong>${state.projects.length}</strong></div><div>任务<strong>${state.tasks.length}</strong></div><div>AI机会<strong>${state.opportunities.length}</strong></div><div>内容选题<strong>${state.topics.length}</strong></div></div></section></div><div style="height:16px"></div><section class="setting-block"><h2>桌面端使用说明</h2><p>此版本部署在 GitHub Pages。网页由 GitHub 托管，所以电脑关机后仍能打开；数据保存在你当前桌面浏览器中。更换浏览器、清除网站数据或使用无痕模式时，原数据不会自动出现，请通过 JSON 备份迁移。</p></section>`;
  }

  function field(label, name, value='', opts={}) {
    const full=opts.full?' full':''; const inputId=`modal-${name}`; let control;
    if(opts.type==='textarea') control=`<textarea id="${inputId}" name="${name}" ${opts.required?'required':''}>${esc(value)}</textarea>`;
    else if(opts.options) control=`<select id="${inputId}" name="${name}">${optionMap(opts.options,value)}</select>`;
    else if(opts.type==='checkbox') control=`<input id="${inputId}" name="${name}" type="checkbox" ${value?'checked':''} />`;
    else control=`<input id="${inputId}" name="${name}" type="${opts.type||'text'}" value="${esc(value)}" ${opts.required?'required':''} ${opts.min!==undefined?`min="${opts.min}"`:''} ${opts.max!==undefined?`max="${opts.max}"`:''} />`;
    return `<div class="field${full}"><label for="${inputId}">${label}</label>${control}</div>`;
  }
  function showModal(kind, item={}) {
    const forms={
      task:()=>({title:item.id?'编辑任务':'新建任务',body:field('任务名称','title',item.title,{required:true,full:true})+field('任务说明','description',item.description,{type:'textarea',full:true})+field('所属项目','projectId',item.projectId||'',{options:{'':'未归类',...Object.fromEntries(state.projects.map(p=>[p.id,p.name]))}})+field('优先级','priority',item.priority||'MEDIUM',{options:labels.priority})+field('状态','status',item.status||'TODO',{options:labels.taskStatus})+field('截止时间','dueAt',item.dueAt?String(item.dueAt).slice(0,16):'',{type:'datetime-local'})+field('下一步行动','nextAction',item.nextAction,{full:true})+field('列入今日重点','isTopThree',item.isTopThree,{type:'checkbox'})+field('等待他人','isWaiting',item.isWaiting,{type:'checkbox'})+field('等待对象','waitingFor',item.waitingFor,{full:true})}),
      project:()=>({title:item.id?'编辑项目':'新建项目',body:field('项目名称','name',item.name,{required:true,full:true})+field('项目说明','description',item.description,{type:'textarea',full:true})+field('状态','status',item.status||'ACTIVE',{options:labels.projectStatus})+field('优先级','priority',item.priority||'MEDIUM',{options:labels.priority})+field('进度（0-100）','progress',item.progress||0,{type:'number',min:0,max:100})+field('下一步行动','nextAction',item.nextAction,{full:true})}),
      opportunity:()=>({title:item.id?'编辑AI机会':'新建AI机会',body:field('问题名称','title',item.title,{required:true,full:true})+field('业务场景','businessScene',item.businessScene,{required:true})+field('当前阶段','stage',item.stage||'DISCOVERED',{options:labels.stage})+field('当前处理方式','currentMethod',item.currentMethod,{type:'textarea',full:true})+field('主要痛点','painPoints',item.painPoints,{type:'textarea',full:true})+field('预计AI方案','proposedSolution',item.proposedSolution,{type:'textarea',full:true})+field('隐私等级','privacyLevel',item.privacyLevel||'INTERNAL',{options:labels.privacy})+field('可转成公开内容','isContentReady',item.isContentReady,{type:'checkbox'})+field('下一步动作','nextAction',item.nextAction,{full:true})}),
      topic:()=>({title:item.id?'编辑内容选题':'新建内容选题',body:field('选题标题','title',item.title,{required:true,full:true})+field('目标用户','targetAudience',item.targetAudience)+field('内容类型','contentType',item.contentType||'AI_PRACTICE',{options:labels.contentType})+field('状态','status',item.status||'SCRIPT_PENDING',{options:labels.contentStatus})+field('拍摄方式','shootingMethod',item.shootingMethod)+field('前3秒钩子','hook',item.hook,{type:'textarea',full:true})+field('核心观点','coreViewpoint',item.coreViewpoint,{type:'textarea',full:true})})
    };
    const config=forms[kind]();
    modalRoot.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${config.title}</h2><button class="modal-close" data-action="close-modal">×</button></div><form class="modal-form" data-form="${kind}" data-id="${item.id||''}">${config.body}<div class="modal-actions"><button type="button" class="secondary-btn" data-action="close-modal">取消</button><button type="submit" class="primary-btn">保存</button></div></form></section></div>`;
  }
  function formObject(form) { const data=Object.fromEntries(new FormData(form)); form.querySelectorAll('input[type=checkbox]').forEach(el=>data[el.name]=el.checked); return data; }
  function submitEntity(form) {
    const kind=form.dataset.form; const data=formObject(form); const id=form.dataset.id; const map={task:'tasks',project:'projects',opportunity:'opportunities',topic:'topics'}; const list=state[map[kind]]; const old=list.find(x=>x.id===id);
    if(kind==='task') { data.dueAt=data.dueAt?new Date(data.dueAt).toISOString():null; if(data.isTopThree&&!old?.isTopThree&&state.tasks.filter(t=>t.isTopThree&&t.status!=='COMPLETED').length>=3){toast('今日重点最多三条');return;} data.completedAt=data.status==='COMPLETED'?(old?.completedAt||now()):null; data.topThreeOrder=data.isTopThree?(old?.topThreeOrder||state.tasks.filter(t=>t.isTopThree).length+1):null; }
    if(kind==='project') data.progress=Math.max(0,Math.min(100,Number(data.progress)||0));
    const record={...(old||{}),...data,id:old?.id||uid(kind.slice(0,2)),createdAt:old?.createdAt||now(),updatedAt:now()};
    if(old) Object.assign(old,record); else list.push(record);
    closeModal(); save(`${configName(kind)}已保存`);
  }
  function configName(kind){return {task:'任务',project:'项目',opportunity:'AI机会',topic:'内容选题'}[kind];}
  function closeModal(){modalRoot.innerHTML='';}
  function remove(kind,id){const map={task:'tasks',project:'projects',opportunity:'opportunities',topic:'topics'};const list=state[map[kind]];const item=list.find(x=>x.id===id);if(!item||!confirm(`确定删除“${item.title||item.name}”吗？`))return;state[map[kind]]=list.filter(x=>x.id!==id);if(kind==='project')state.tasks.forEach(t=>{if(t.projectId===id)t.projectId=null;});if(kind==='task'){state.opportunities.forEach(o=>{if(o.sourceTaskId===id)o.sourceTaskId=null;});state.topics.forEach(t=>{if(t.sourceTaskId===id)t.sourceTaskId=null;});}if(kind==='opportunity')state.topics.forEach(t=>{if(t.sourceOpportunityId===id)t.sourceOpportunityId=null;});save('已删除');}
  function toast(message){const el=document.getElementById('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,2200);}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ai-practice-workbench-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);toast('备份已导出');}
  function importData(file){const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||!Array.isArray(parsed.tasks)||!Array.isArray(parsed.opportunities)||!Array.isArray(parsed.topics))throw new Error('格式不正确');state=normalize(parsed);localStorage.setItem(STORE_KEY,JSON.stringify(state));toast('数据导入成功');render();}catch(error){alert(`导入失败：${error.message}`);}};reader.readAsText(file);}

  document.addEventListener('click',(event)=>{
    const el=event.target.closest('[data-route],[data-action]'); if(!el)return;
    if(el.dataset.route){location.hash=el.dataset.route;return;}
    const action=el.dataset.action,id=el.dataset.id;
    if(action==='close-modal'){if(event.target===el||el.classList.contains('modal-close')||el.tagName==='BUTTON')closeModal();return;}
    const handlers={
      'new-task':()=>showModal('task'),'edit-task':()=>showModal('task',state.tasks.find(x=>x.id===id)),
      'new-project':()=>showModal('project'),'edit-project':()=>showModal('project',state.projects.find(x=>x.id===id)),
      'new-opportunity':()=>showModal('opportunity'),'edit-opportunity':()=>showModal('opportunity',state.opportunities.find(x=>x.id===id)),
      'new-topic':()=>showModal('topic'),'edit-topic':()=>showModal('topic',state.topics.find(x=>x.id===id)),
      'delete-task':()=>remove('task',id),'delete-opportunity':()=>remove('opportunity',id),'delete-topic':()=>remove('topic',id),
      'toggle-task':()=>{const t=state.tasks.find(x=>x.id===id);t.status=t.status==='COMPLETED'?'TODO':'COMPLETED';t.completedAt=t.status==='COMPLETED'?now():null;save(t.status==='COMPLETED'?'任务已完成':'已恢复任务');},
      'task-to-opportunity':()=>{const t=state.tasks.find(x=>x.id===id);state.opportunities.push({id:uid('op'),title:t.title,businessScene:'待补充',currentMethod:t.description||'',painPoints:'',proposedSolution:'',stage:'DISCOVERED',privacyLevel:'INTERNAL',nextAction:t.nextAction||'',isContentReady:false,sourceTaskId:t.id,createdAt:now(),updatedAt:now()});save('已转为AI机会');location.hash='opportunities';},
      'opportunity-to-topic':()=>{const o=state.opportunities.find(x=>x.id===id);state.topics.push({id:uid('to'),title:o.title,targetAudience:'',coreViewpoint:o.proposedSolution||'',hook:'',contentType:'AI_PRACTICE',status:'SCRIPT_PENDING',shootingMethod:'',sourceOpportunityId:o.id,createdAt:now(),updatedAt:now()});save('已转为内容选题');location.hash='content';},
      export:exportData,import:()=>importFile.click(),reset:()=>{if(confirm('确定清空当前浏览器中的全部工作台数据吗？请先导出备份。')){state=stateShape();localStorage.removeItem(STORE_KEY);save('浏览器数据已清空');}}
    };
    handlers[action]?.();
  });
  document.addEventListener('change',(event)=>{const el=event.target;if(el.dataset.action==='task-status'){const t=state.tasks.find(x=>x.id===el.dataset.id);t.status=el.value;t.completedAt=el.value==='COMPLETED'?(t.completedAt||now()):null;save('任务状态已更新');}if(el.dataset.action==='opportunity-stage'){state.opportunities.find(x=>x.id===el.dataset.id).stage=el.value;save('机会阶段已更新');}if(el.dataset.action==='topic-status'){state.topics.find(x=>x.id===el.dataset.id).status=el.value;save('内容状态已更新');}});
  document.addEventListener('submit',(event)=>{event.preventDefault();const form=event.target;if(form.matches('.modal-form'))submitEntity(form);if(form.id==='review-form'){const data=formObject(form);const key=todayKey();const old=state.reviews.find(r=>String(r.reviewDate).slice(0,10)===key);const record={...(old||{}),...data,id:old?.id||uid('rv'),reviewDate:key,createdAt:old?.createdAt||now(),updatedAt:now()};if(old)Object.assign(old,record);else state.reviews.push(record);save('今日复盘已保存');}});
  importFile.addEventListener('change',()=>{if(importFile.files[0])importData(importFile.files[0]);importFile.value='';});
  search.addEventListener('input',()=>{query=search.value.trim();render();});
  document.getElementById('quick-create').addEventListener('click',()=>({dashboard:()=>showModal('task'),projects:()=>showModal('task'),opportunities:()=>showModal('opportunity'),content:()=>showModal('topic'),review:()=>document.getElementById('review-form')?.querySelector('textarea')?.focus(),settings:()=>exportData()})[currentRoute]());
  window.addEventListener('hashchange',()=>{query='';search.value='';render();});
  if(!location.hash)location.hash='dashboard';else render();
})();
