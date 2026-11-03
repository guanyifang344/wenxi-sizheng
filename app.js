import {createPythonApp} from './python-app.js?v=3.0';
import {makeSession, isCorrect, nextRecord, addRetry, upgradeSessions, questionTypeLabel, answerLabel, notebookQuestions} from './engine.js?v=3.0';
const KEY = 'wenxi-sizheng-v1';
const main = document.querySelector('#main');
let subject='sizheng';
const originalNav=document.querySelector('.sidebar nav').innerHTML;
const pythonApp=createPythonApp({main,notice,isActive:()=>subject==='python'});
function switchSubject(value){
 subject=value==='python'?'python':'sizheng';
 document.querySelector('#subject-select').value=subject;
 document.querySelector('#notice').hidden=true;
 try{localStorage.setItem('wenxi-active-subject',subject);}catch{}
 if(subject==='python'){pythonApp.show();}else{document.querySelector('.sidebar nav').innerHTML=originalNav;document.querySelector('.sidebar-note small').textContent='思想道德与法治 · 2026 期中';document.querySelector('.storage-note').innerHTML='<span class="status-dot"></span>思政进度独立保存';page='home';render();}
 focusMain();
}
document.querySelector('#subject-select').addEventListener('change',e=>switchSubject(e.target.value));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let bank, byId, state = {version: 1, progress: {}, session: null}, page = 'home';
let saving = true;
let notebookFilter={type:'all',chapter:'all',status:'all'}, materialChapter=1;
const notebookItems=()=>notebookQuestions(bank.questions,state.progress,notebookFilter);
let noticeTimer;
function notice(message) { clearTimeout(noticeTimer); const el = document.querySelector('#notice'); el.textContent = message; el.hidden = false; noticeTimer=setTimeout(()=>{el.hidden=true;},8000); }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { saving = false; notice('浏览器未能保存进度。请保持此页面打开，并用首页的“备份进度”下载备份。'); }
  document.querySelector('.storage-note').innerHTML = `<span class="status-dot"></span>${saving ? '进度保存在此浏览器' : '进度暂未保存，请备份'}`;
}
const records = () => Object.values(state.progress);
const dueCount = () => records().filter(p => p.seen && p.due <= Date.now()).length;
const weakCount = () => records().filter(p => p.needsWork).length;
function badges() {
  document.querySelector('#due-badge').textContent = dueCount();
  document.querySelector('#wrong-badge').textContent = notebookQuestions(bank.questions,state.progress).length;
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === page));
}
function header(label = '学习首页') {
  return `<header class="topbar"><span>我的复习 / <strong>${label}</strong></span><span class="course-tag">思想道德与法治 <i>V3.0</i></span></header>`;
}
function render() {
  if(subject!=='sizheng')return;
  badges();
  if (page === 'session') return renderSession();
  if (page === 'mistakes') return renderNotebook();
  if (page === 'materials') return renderMaterials();
  if (page === 'review') return renderList();
  renderHome();
}
function renderHome() {
  const seen = records().filter(p => p.seen).length;
  const scheduled = records().filter(p => p.stage > 0 && !p.needsWork).length;
  const percent = Math.round(seen / bank.questions.length * 100);
  main.innerHTML = `${header()}<section class="welcome"><div><div class="eyebrow">慢慢学，也能记得牢</div><h1>今天，也温习一点。</h1><p>从三道题开始，让知识留在脑海里。</p></div><span class="date-pill">${new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date())}</span></section>
  <section class="hero"><div class="hero-copy"><span class="hero-kicker"><span class="live-dot"></span>按章节 · 连续学习</span><h2>${state.session ? '上次的努力，接着来。' : seen === bank.questions.length ? '再回忆一次，记得更牢。' : '先看懂，再试着想起来。'}</h2><p>每组学习 3 题，随即练习。<br>旧题穿插出现，错题稍后再见。</p><button class="primary light" data-action="${state.session ? 'continue' : 'start'}">${state.session ? '继续上次学习' : seen === bank.questions.length ? '开始到期复习' : '开始今日学习'} <span>↗</span></button><small>每章连续学习 · 随时退出，自动保存</small></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="paper back"><span>03</span><div></div><div></div></div><div class="paper front"><span class="paper-label">温故而知新</span><strong>每天一点<br>日积月累</strong><div class="paper-line"></div><span class="paper-check">✓ <i>记得更牢一点</i></span></div><span class="art-star">✳</span><span class="art-caption">LEARN · RECALL · REPEAT</span></div></section>
  <section class="feature-grid" aria-label="复习入口"><button class="feature-card" data-nav="mistakes"><span class="feature-icon">▤</span><div><h2>错题本</h2><p>选择题与判断题 · 查看答案，针对性重练</p></div><span>↗</span></button><button class="feature-card" data-nav="materials"><span class="feature-icon">▥</span><div><h2>材料分析题</h2><p>按章节阅读材料、问题与参考答案</p></div><span>↗</span></button></section>
  <section class="stats" aria-label="学习进度"><article><span>已学习题目</span><strong>${seen}<small> / ${bank.questions.length}</small></strong><div class="mini-progress"><i style="width:${percent}%"></i></div></article><article><span>到期复习 <b class="stat-symbol">↻</b></span><strong>${dueCount()}<small> 题</small></strong><small>给记忆加深一次印象</small></article><article><span>待巩固题目 <b class="stat-symbol orange">▤</b></span><strong>${weakCount()}<small> 题</small></strong><small>答错或不确定，再练一遍</small></article><article><span>已安排间隔复习</span><strong>${scheduled}<small> 题</small></strong><small>答对后，隔天再见</small></article></section><section class="overall-progress"><div><strong>全题库学习进度</strong><span>已通过 ${scheduled} / ${bank.questions.length} 题 <b>${Math.round(scheduled/bank.questions.length*100)}%</b></span></div><div class="session-progress" role="progressbar" aria-label="全题库学习进度" aria-valuemin="0" aria-valuemax="${bank.questions.length}" aria-valuenow="${scheduled}"><i style="width:${scheduled/bank.questions.length*100}%"></i></div><small>确定且答对计入进度；不确定和错题继续巩固。</small></section>
  <section class="chapters"><div class="section-title"><h2>按章节，慢慢来 <span>CHAPTERS</span></h2><span>3 个章节 · ${bank.questions.length} 道题</span></div><div class="chapter-grid">${bank.chapters.map(c => {
    const qs = bank.questions.filter(q=>q.chapter===c.id), n=qs.filter(q=>state.progress[q.id]?.stage>0&&!state.progress[q.id]?.needsWork).length;
    return `<button class="chapter-card" data-chapter="${c.id}"><div class="chapter-top"><span class="chapter-num">0${c.id+1}</span><span>${n===qs.length?'本章已通过':'进入本章'} ↗</span></div><span class="chapter-label">${c.title}</span><h3>${esc(c.subtitle).replace('，','<br>')}</h3><p>${qs.filter(q=>q.type==='single').length} 道单选 <span>·</span> ${qs.filter(q=>q.type==='multiple').length} 道多选 <span>·</span> ${qs.filter(q=>q.type==='judge').length} 道判断</p><div class="chapter-progress"><i style="width:${n/qs.length*100}%"></i></div><div class="chapter-bottom"><span>已通过 ${n} / ${qs.length}</span><span>${Math.round(n/qs.length*100)}%</span></div></button>`;
  }).join('')}</div></section>
  <section class="method"><span class="method-icon">✧</span><div><strong>把“看过了”，变成“想起来了”。</strong><p>先学习 → 自己答 → 看反馈 → 隔一会再答。答对之后，隔天再回来巩固。</p></div><span class="method-tag">小步学习法</span></section>
  <footer><span>依据原题库参考答案 · 单选 · 多选 · 判断</span><div><button data-action="export">备份进度</button><button data-action="import">恢复进度</button><input type="file" id="import-file" accept="application/json,.json" hidden></div></footer>`;
}
function start(chapter = null, mode = 'learn') {
  if(chapter===null){
    if(mode==='learn'&&state.session){page='session';render();focusMain();return;}
    chapter=bank.chapters.find(c=>bank.questions.some(q=>q.chapter===c.id&&(mode==='mistakes'?state.progress[q.id]?.needsWork:mode==='review'?state.progress[q.id]?.due<=Date.now():!state.progress[q.id]?.seen)))?.id ?? bank.chapters.find(c=>bank.questions.some(q=>q.chapter===c.id&&state.progress[q.id]?.due<=Date.now()))?.id ?? 0;
  }
  state.sessions ||= {};
  if(state.session) state.sessions[`${state.session.chapter}-${state.session.mode}`]=state.session;
  if (mode === 'learn' && !bank.questions.some(q=>q.chapter===chapter&&!state.progress[q.id]?.seen)&&!state.sessions[`${chapter}-learn`]) mode='review';
  const key=`${chapter}-${mode}`;
  const session = state.sessions[key] || makeSession(bank.questions,state.progress,{chapter,mode});
  if (!session) { notice(mode==='mistakes'?'这一章暂时没有待巩固题。':'这一章目前没有到期题目，可以稍后再来，或选择其他章节学习。'); return; }
  delete state.sessions[key];session.continuous=true;session.bankVersion=bank.version;state.session=session;page='session';save();render();focusMain();
}
function focusMain() { main.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
function renderSession() {
  const s=state.session;
  if (!s) {page='home';return render();}
  if (!s.queue.length) return renderSummary();
  const chapterQs=bank.questions.filter(q=>s.chapter===null?Object.keys(s.results).includes(q.id)||s.queue.some(t=>t.id===q.id):q.chapter===s.chapter), passed=chapterQs.filter(q=>state.progress[q.id]?.stage>0&&!state.progress[q.id]?.needsWork).length, chapterPercent=Math.round(passed/chapterQs.length*100);
  const task=s.queue[0],q=byId[task.id],learn=task.kind==='learn',feedback=s.feedback;
  const selected=s.selected||[];
  const result=feedback ? feedback.correct&&feedback.certain?'good':'bad':'';
  const options=q.options.map(o=>{
    const correct=q.answer.includes(o.id), chosen=selected.includes(o.id);
    const cls=(learn||feedback)&&correct?'correct':feedback&&chosen&&!correct?'incorrect':chosen?'selected':'';
    return `<button class="option ${cls}" data-option="${o.id}" aria-pressed="${chosen}" ${learn||feedback?'disabled':''}><span class="option-key">${q.type==='judge'?(o.id==='A'?'✓':'×'):o.id}</span><span>${esc(o.text)}</span><span class="option-status">${(learn||feedback)&&correct?'✓':feedback&&chosen?'×':chosen?'●':''}</span></button>`;
  }).join('');
  main.innerHTML=`${header('专注复习')}<section class="study-wrap"><div class="study-top"><button class="text-button" data-action="pause">← 返回首页</button><span>${s.chapter===null?'错题重练':bank.chapters[s.chapter].title} · 已通过 ${passed} / ${chapterQs.length} 题 <strong class="percent-label">${chapterPercent}%</strong></span></div><div class="session-progress" role="progressbar" aria-label="本章学习进度" aria-valuemin="0" aria-valuemax="${chapterQs.length}" aria-valuenow="${passed}"><i style="width:${passed/chapterQs.length*100}%"></i></div><div class="study-heading"><span class="eyebrow">${learn?`带答案学习 · 三题一组`:task.review?'旧题再见 · 回忆练习':'现在，试着想起来'}</span><h1>${learn?'先看懂这一题。':'这道题，你还记得吗？'}</h1><p>${learn?'记住正确选项的内容，准备好再继续。':q.type==='multiple'?'这是一道多选题，选好所有答案后提交。':q.type==='judge'?'判断这句话是否正确，然后提交。':'选择一个答案，然后告诉自己有多确定。'}</p></div><article class="question-card"><div class="question-meta"><span class="type-tag">${questionTypeLabel(q.type)}</span><span>${bank.chapters[q.chapter].title} · 原题 ${q.number}</span></div><h2>${esc(q.prompt)}</h2><div class="options">${options}</div>${learn?`<div class="learning-note">✓ 参考答案：<strong>${answerLabel(q,q.answer)}</strong><span>绿色选项为正确答案</span></div>`:''}${feedback?`<div class="feedback ${result}" role="status"><strong>${feedback.correct?feedback.certain?'答对了，继续保持。':'答对了，不确定的题我们再练一次。':'没关系，再记一次。'}</strong><p>参考答案：${answerLabel(q,q.answer)}${!feedback.correct&&q.type==='multiple'?` · ${q.answer.filter(a=>!selected.includes(a)).length?'漏选 '+q.answer.filter(a=>!selected.includes(a)).join('、'):''}${selected.filter(a=>!q.answer.includes(a)).length?'　错选 '+selected.filter(a=>!q.answer.includes(a)).join('、'):''}`:''}</p><small>${feedback.correct&&feedback.certain?'已安排后续复习。后面还可能穿插出现。':'有其他题时会间隔重试；仍不确定的题留在待巩固列表。'}</small></div>`:''}</article><div class="study-actions">${learn?'<span>按自己的节奏，不用着急</span><button class="primary" data-action="next">看懂了，继续 →</button>':feedback?'<span>答案以题库参考答案为准</span><button class="primary" data-action="next">继续 →</button>':`<span>${selected.length?'已选择 '+answerLabel(q,selected):'请先选择答案'}</span><div><button class="secondary" data-action="uncertain" ${!selected.length?'disabled':''}>不确定，提交</button><button class="primary" data-action="submit" ${!selected.length?'disabled':''}>确定，提交</button></div>`}</div><div class="study-footer"><span>进度自动保存 · 随时可以休息</span><button class="text-button" data-action="pause">暂停，稍后继续</button></div></section>`;
}
function submit(certain) {
  const s=state.session;if(!s||s.feedback||!s.selected.length||s.queue[0]?.kind!=='quiz')return;
  const q=byId[s.queue[0].id],correct=isCorrect(q,s.selected);
  s.feedback={correct,certain};s.tries[q.id]=(s.tries[q.id]||0)+1;
  s.results[q.id]={correct,certain};state.progress[q.id]=nextRecord(state.progress[q.id],correct,certain,Date.now(),s.selected);
  save();render();
}
function next() {
  const s=state.session,task=s?.queue[0];if(!task)return;
  if(task.kind==='quiz'&&!s.feedback)return;
  s.queue.shift();s.done++;
  if(task.kind==='learn')state.progress[task.id]={...state.progress[task.id],seen:true,due:state.progress[task.id]?.due||Date.now()};
  else if(!s.feedback.correct||!s.feedback.certain)addRetry(s,task.id);
  s.feedback=null;s.selected=[];save();render();focusMain();
}
function renderSummary() {
  const s=state.session,entries=Object.entries(s.results),good=entries.filter(([,r])=>r.correct&&r.certain).length;
  main.innerHTML=`${header('学习完成')}<section class="summary"><div class="summary-icon">✓</div><div class="eyebrow">每一次回忆，都算数</div><h1>当前学习内容已完成。</h1><p>休息一下，让知识慢慢沉淀。</p><div class="summary-stats"><div><strong>${entries.length}</strong><span>练习过的题目</span></div><div><strong>${good}</strong><span>已通过</span></div><div><strong>${entries.length-good}</strong><span>仍待巩固</span></div></div><p class="summary-note">答对的题已安排间隔复习。<br>答错或不确定的题，已保留在待巩固列表中。</p><button class="primary" data-action="close-session">完成，回到首页 →</button></section>`;
}
function renderList() {
  const weak=page==='mistakes',qs=bank.questions.filter(q=>weak?state.progress[q.id]?.needsWork:state.progress[q.id]?.seen&&state.progress[q.id].due<=Date.now());
  const label=weak?'待巩固题目':'到期复习';
  main.innerHTML=`${header(label)}<section class="list-page"><div class="eyebrow">${weak?'给不确定，多一次机会':'在忘记之前，再见一面'}</div><h1>${label}<span class="count-label">${qs.length}</span></h1><p>${weak?'这里收集答错或不确定的题，练习时会再次安排回忆。':'已学习但尚未练习，或到了复习时间的题目，会出现在这里。'}</p>${qs.length?`<button class="primary" data-action="${weak?'start-mistakes':'start-review'}">按章节开始复习 ↗</button><div class="question-list">${qs.map(q=>`<article><span>${bank.chapters[q.chapter].title} · ${questionTypeLabel(q.type)} ${q.number}</span><h3>${esc(q.prompt)}</h3></article>`).join('')}</div>`:'<div class="empty-state"><span>✧</span><h2>这里暂时空空的</h2><p>可以去首页学习新题，下次再回来看看。</p><button class="secondary" data-action="home">回到首页</button></div>'}</section>`;
}
function filterButtons(key, entries) {
  return `<div class="filter-row" role="group" aria-label="${{type:'题型',chapter:'章节',status:'状态'}[key]}">${entries.map(([value,label])=>`<button class="filter-chip ${String(notebookFilter[key])===String(value)?'selected':''}" data-notebook-filter="${key}" data-value="${value}" aria-pressed="${String(notebookFilter[key])===String(value)}">${label}</button>`).join('')}</div>`;
}
function renderNotebook() {
  const qs=notebookItems(), all=notebookQuestions(bank.questions,state.progress);
  main.innerHTML=`${header('错题本')}<section class="list-page"><div class="eyebrow">找到薄弱处，再温习一次</div><h1>错题本 <span class="count-label">${qs.length}</span></h1><p>收录选择题与判断题中的错题、不确定题。练会后保留记录，标为“已巩固”。</p><div class="notebook-filters">${filterButtons('type',[['all','全部题型'],['choice','选择题'],['judge','判断题']])}${filterButtons('chapter',[['all','全部章节'],...bank.chapters.map(c=>[c.id,c.title])])}${filterButtons('status',[['all','全部记录'],['pending','待巩固'],['mastered','已巩固']])}</div>${qs.length?`<div class="notebook-toolbar"><span>当前筛选 ${qs.length} 题 · 共收录 ${all.length} 题</span><button class="primary" data-action="notebook-practice">重练当前题目 →</button></div><div class="question-list">${qs.map(q=>{
    const p=state.progress[q.id];
    return `<article class="notebook-card"><div class="question-meta"><span>${bank.chapters[q.chapter].title} · ${questionTypeLabel(q.type)} ${q.number}</span><span class="type-tag">${p.needsWork?'待巩固':'已巩固'}</span></div><h3>${esc(q.prompt)}</h3><ul class="notebook-options">${q.options.map(o=>`<li>${q.type==='judge'?'':o.id+'. '}${esc(o.text)}</li>`).join('')}</ul><p class="record-note">${Number.isInteger(p.wrongCount)?`答错 ${p.wrongCount} 次`:'历史答错次数未记录'} · ${Number.isInteger(p.uncertainCount)?`不确定 ${p.uncertainCount} 次`:'历史不确定次数未记录'}${p.lastSelected?` · 最近作答：${esc(answerLabel(q,p.lastSelected))}`:' · 旧版未记录作答详情'}</p><details class="notebook-answer"><summary>查看参考答案</summary><p><strong>${esc(answerLabel(q,q.answer))}</strong></p>${q.type==='judge'?'':q.options.filter(o=>q.answer.includes(o.id)).map(o=>`<p>${o.id}. ${esc(o.text)}</p>`).join('')}</details><button class="text-button" data-retry="${q.id}">重练这一题 →</button></article>`;
  }).join('')}</div>`:'<div class="empty-state"><span>✧</span><h2>这里暂时没有题目</h2><p>试试其他筛选，或先去学习。答错和不确定的题会自动收录。</p></div>'}</section>`;
}
function startNotebook(id=null) {
  const qs=id?[byId[id]]:notebookItems();if(!qs.length)return;
  state.sessions ||= {};
  if(state.session)state.sessions[`${state.session.chapter}-${state.session.mode}`]=state.session;
  const eligible=Object.fromEntries(qs.map(q=>[q.id,{...state.progress[q.id],needsWork:true}]));
  state.session=makeSession(qs,eligible,{mode:'mistakes'});
  state.session.bankVersion=bank.version;save();page='session';render();focusMain();
}
function renderMaterials() {
  const items=(bank.materials||[]).filter(m=>m.chapter===materialChapter),c=bank.chapters[materialChapter];
  const paragraphs=lines=>lines.map(line=>`<p>${esc(line)}</p>`).join('');
  main.innerHTML=`${header('材料分析题')}<section class="list-page materials-page"><div class="eyebrow">读材料，理清答题思路</div><h1>材料分析题</h1><p>按原题库展示材料、问题和参考答案，直接阅读即可。</p><div class="filter-row material-tabs" role="group" aria-label="材料题章节">${bank.chapters.map(c=>`<button class="filter-chip ${c.id===materialChapter?'selected':''}" data-material-chapter="${c.id}" aria-pressed="${c.id===materialChapter}">${c.title} · ${(bank.materials||[]).filter(m=>m.chapter===c.id).length} 组</button>`).join('')}</div><h2 class="material-chapter-title">${c.title} · ${esc(c.subtitle)}</h2>${items.length?items.map(m=>`<article class="material-card"><div class="question-meta"><span class="type-tag">材料分析</span><span>第 ${m.number} 组</span></div><section><h3>阅读材料</h3>${paragraphs(m.material)}</section><section class="material-questions"><h3>问题</h3>${paragraphs(m.questions)}</section><section class="material-answers"><h3>参考答案</h3>${paragraphs(m.answers)}</section></article>`).join(''):'<div class="empty-state"><h2>本章暂无材料分析题</h2><p>原题库的绪论部分未提供材料题，可切换到第一章或第二章。</p></div>'}</section>`;
}
document.addEventListener('click',e=>{
  if(subject!=='sizheng')return;
  const b=e.target.closest('button');if(!b||b.disabled||!bank)return;
  if(b.dataset.nav){page=b.dataset.nav;render();focusMain();return;}
  if(b.dataset.notebookFilter){notebookFilter[b.dataset.notebookFilter]=b.dataset.value;render();return;}
  if(b.dataset.materialChapter!==undefined){materialChapter=Number(b.dataset.materialChapter);render();focusMain();return;}
  if(b.dataset.retry){startNotebook(b.dataset.retry);return;}
  if(b.dataset.chapter!==undefined){start(Number(b.dataset.chapter));return;}
  if(b.dataset.option){const s=state.session;if(!s||s.feedback)return;const q=byId[s.queue[0].id],a=b.dataset.option;s.selected=q.type!=='multiple'?[a]:s.selected.includes(a)?s.selected.filter(x=>x!==a):[...s.selected,a].sort();save();render();document.querySelector(`[data-option="${a}"]`)?.focus();return;}
  switch(b.dataset.action){
    case 'notebook-practice':startNotebook();break;
    case 'start':start();break;
    case 'start-review':start(null,'review');break;
    case 'start-mistakes':start(null,'mistakes');break;
    case 'continue':page='session';render();focusMain();break;
    case 'home':case 'pause':page='home';render();focusMain();break;
    case 'submit':submit(true);break;
    case 'uncertain':submit(false);break;
    case 'next':next();break;
    case 'close-session':if(state.sessions)delete state.sessions[`${state.session.chapter}-${state.session.mode}`];state.session=null;save();page='home';render();focusMain();break;
    case 'import':document.querySelector('#import-file').click();break;
    case 'export':{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='温习-学习进度.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
  }
});
function validState(value) {
  if(!value||value.version!==1||!value.progress||typeof value.progress!=='object'||Array.isArray(value.progress))return false;
  if(!Object.entries(value.progress).every(([id,p])=>byId[id]&&p&&typeof p==='object'&&typeof p.seen==='boolean'&&Number.isFinite(p.due)&&(!p.stage||Number.isInteger(p.stage)&&p.stage>=0&&p.stage<=3)))return false;
  if(value.sessions && (typeof value.sessions!=='object'||Array.isArray(value.sessions)||!Object.values(value.sessions).every(s=>validState({version:1,progress:{},session:s}))))return false;
  const s=value.session;
  if(s===null)return true;
  return s&&(s.chapter===null||bank.chapters.some(c=>c.id===s.chapter))&&['learn','review','mistakes'].includes(s.mode)&&Array.isArray(s.queue)&&s.queue.every(t=>byId[t.id]&&['learn','quiz'].includes(t.kind))&&Number.isFinite(s.done)&&Number.isFinite(s.total)&&s.results&&s.tries&&Array.isArray(s.selected)&&s.selected.every(a=>/^[A-E]$/.test(a))&&(!s.feedback||typeof s.feedback.correct==='boolean'&&typeof s.feedback.certain==='boolean');
}
document.addEventListener('change',async e=>{
  if(subject!=='sizheng'||e.target.id!=='import-file')return;
  try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error();const parsed=JSON.parse(await file.text());if(!validState(parsed))throw Error();if(!confirm('恢复备份将替换当前浏览器的学习进度，是否继续？'))return;state=upgradeSessions(parsed,bank.questions,bank.version);save();render();notice('学习进度已恢复。');}catch{notice('无法读取这份备份，请选择本站导出的有效进度文件。');}
});
try {
  const res=await fetch('./data/questions.json?v=3.0', {cache:'no-cache'});if(!res.ok)throw Error('题库读取失败');bank=await res.json();byId=Object.fromEntries(bank.questions.map(q=>[q.id,q]));
  try{const saved=localStorage.getItem(KEY);if(saved){const parsed=JSON.parse(saved);if(validState(parsed))state=parsed;else notice('旧进度格式无法识别，暂未覆盖原数据。请先备份浏览器中的旧数据。');}}catch{notice('无法读取已保存的进度；本次仍可继续学习。');}
  if(state.session&&state.session.chapter===null&&state.session.mode==='learn'){state.session=null;save();}
  upgradeSessions(state,bank.questions,bank.version);
  if(state.session||Object.keys(state.sessions||{}).length)save();
  render();
  try{if(localStorage.getItem('wenxi-active-subject')==='python')switchSubject('python');}catch{}
}catch {main.innerHTML='<section class="empty-state"><h1>题库暂时没能打开</h1><p>请检查网络并刷新页面。若在本地预览，请通过本地服务器打开网站。</p><button onclick="location.reload()" class="primary">重新加载</button></section>';}
