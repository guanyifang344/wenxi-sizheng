export const PYTHON_KEY='wenxi-python-v3';
export function emptyPythonState(){return {version:1,subject:'python',progress:{},sessions:{},active:null};}
export function practiceSession(questions){return {ids:questions.map(q=>q.id),index:0,selected:null,feedback:null,results:{}};}
export function recordAttempt(old={},selected,answer,now=Date.now()){
 const correct=selected===answer;
 return {...old,attempts:(old.attempts||0)+1,correctAttempts:(old.correctAttempts||0)+(correct?1:0),wrongCount:(old.wrongCount||0)+(correct?0:1),inNotebook:Boolean(old.inNotebook||!correct),needsWork:!correct,lastSelected:selected,lastCorrect:correct,lastAnswer:now};
}
export function pythonNotebook(questions,progress,chapter='all',status='all'){
 return questions.filter(q=>{const p=progress[q.id];return p?.inNotebook&&(chapter==='all'||q.chapter===Number(chapter))&&(status==='all'||(status==='pending'?p.needsWork:!p.needsWork));});
}
export function validPythonState(s,questions){
 const byId=Object.fromEntries(questions.map(q=>[q.id,q]));
 if(!s||s.subject!=='python'||s.version!==1||!s.progress||!s.sessions||typeof s.progress!=='object'||typeof s.sessions!=='object'||Array.isArray(s.progress)||Array.isArray(s.sessions))return false;
 if(!Object.entries(s.progress).every(([id,p])=>byId[id]&&p&&Number.isInteger(p.attempts)&&p.attempts>0&&Number.isInteger(p.correctAttempts)&&p.correctAttempts>=0&&p.correctAttempts<=p.attempts&&typeof p.lastCorrect==='boolean'&&['A','B','C','D'].includes(p.lastSelected)&&typeof p.inNotebook==='boolean'&&typeof p.needsWork==='boolean'))return false;
 if(!Object.values(s.sessions).every(t=>t&&Array.isArray(t.ids)&&t.ids.length>0&&new Set(t.ids).size===t.ids.length&&t.ids.every(id=>byId[id])&&Number.isInteger(t.index)&&t.index>=0&&t.index<=t.ids.length&&(t.selected===null||['A','B','C','D'].includes(t.selected))&&(t.feedback===null||typeof t.feedback==='boolean')&&t.results&&Object.entries(t.results).every(([id,r])=>t.ids.includes(id)&&typeof r==='boolean')))return false;
 return s.active===null||Object.hasOwn(s.sessions,s.active);
}
export function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function inlineText(text){return text.split(/(`[^`]+`)/g).map(part=>part.startsWith('`')?`<code>${escapeHtml(part.slice(1,-1))}</code>`:escapeHtml(part).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')).join('');}
export function questionBlocks(q){return q.blocks.map(b=>b.type==='code'?`<div class="py-code"><span>${escapeHtml(b.language||'TEXT')}</span><pre tabindex="0"><code>${escapeHtml(b.text)}</code></pre></div>`:`<p>${inlineText(b.text).replace(/\n/g,'<br>')}</p>`).join('');}
