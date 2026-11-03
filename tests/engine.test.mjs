import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSession,nextRecord,isCorrect,addRetry,DAY,upgradeSessions,questionTypeLabel,answerLabel,notebookQuestions} from '../engine.js';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
test('all 264 questions have complete options and matching reference answer types',()=>{
 assert.equal(bank.questions.length,264);assert.equal(new Set(bank.questions.map(q=>q.id)).size,264);
 for(const q of bank.questions){assert.ok(q.prompt);assert.ok(q.type==='judge'?q.options.length===2:q.options.length>=4);assert.ok(q.options.every(o=>o.text));assert.ok(q.answer.every(a=>q.options.some(o=>o.id===a)));assert.ok(q.type!=='multiple'?q.answer.length===1:q.answer.length>1);}
 assert.deepEqual(bank.chapters.map(c=>bank.questions.filter(q=>q.chapter===c.id).length),[68,105,91]);
});
test('continuous learning includes all 264 questions in groups of three, interleaving old questions',()=>{
 const s=makeSession(bank.questions,{});assert.equal(s.queue.filter(t=>t.kind==='learn').length,264);
 assert.deepEqual(s.queue.slice(0,3).map(t=>t.kind),['learn','learn','learn']);
 assert.equal(s.queue.filter(t=>t.kind==='quiz'&&t.review).length,174);
 const learned=new Set();for(const t of s.queue){if(t.kind==='learn')learned.add(t.id);else assert.ok(learned.has(t.id));}
});
test('multiple choice requires exactly the correct set',()=>{
 const q=bank.questions.find(q=>q.type==='multiple');assert.ok(isCorrect(q,[...q.answer].reverse()));assert.equal(isCorrect(q,q.answer.slice(1)),false);assert.equal(isCorrect(q,[...q.answer,'Z']),false);
});
test('uncertain answers stay due; same-day success cannot advance spaced stages',()=>{
 const now=2000000000000;
 let r=nextRecord({},true,false,now);assert.equal(r.needsWork,true);assert.equal(r.due,now);
 r=nextRecord(r,true,true,now);assert.equal(r.stage,1);assert.equal(r.due,now+DAY);
 r=nextRecord(r,true,true,now+1000);assert.equal(r.stage,1);
 r=nextRecord(r,true,true,now+DAY+2000);assert.equal(r.stage,2);assert.equal(r.due,now+4*DAY+2000);
 r=nextRecord(r,false,true,now+5*DAY);assert.equal(r.stage,0);assert.equal(r.needsWork,true);
});
test('retry waits for three other quizzes and is bounded',()=>{
 const s={queue:[{kind:'learn',id:'a'},...['b','c','d','e'].map(id=>({kind:'quiz',id}))],tries:{x:1},total:5};addRetry(s,'x');assert.equal(s.queue[4].id,'x');addRetry(s,'x');assert.equal(s.queue.filter(t=>t.id==='x').length,1);
 s.queue=[];s.tries.x=3;addRetry(s,'x');assert.equal(s.queue.length,0);
});
test('chapter and review filtering respects due dates',()=>{
 const q=bank.questions[0],progress={[q.id]:{seen:true,due:100,needsWork:true}};
 assert.equal(makeSession(bank.questions,progress,{mode:'review',now:99}),null);
 assert.equal(makeSession(bank.questions,progress,{mode:'review',now:100}).queue[0].id,q.id);
 assert.equal(makeSession(bank.questions,progress,{mode:'mistakes',chapter:1}),null);
});
test('chapter sessions include the entire chosen chapter and never mix chapters',()=>{
 for (const c of bank.chapters){const s=makeSession(bank.questions,{}, {chapter:c.id});const qs=bank.questions.filter(q=>q.chapter===c.id);assert.equal(s.queue.filter(t=>t.kind==='learn').length,qs.length);assert.ok(s.queue.every(t=>qs.some(q=>q.id===t.id)));}
});
test('isolated final wrong answer is deferred instead of repeated immediately',()=>{
 const s={queue:[],tries:{x:1},total:1};addRetry(s,'x');assert.equal(s.queue.length,0);
});
test('61 judgment answers match each original chapter answer key',()=>{
 const expected=['BAAAAABAAAB','AABAABABAAAAAAABBAAABAAABBA','BBAAAAAAABBABAAAAABAABB'];
 for(const c of bank.chapters){const qs=bank.questions.filter(q=>q.chapter===c.id&&q.type==='judge');assert.equal(qs.map(q=>q.answer[0]).join(''),expected[c.id]);for(const q of qs){assert.equal(questionTypeLabel(q.type),'判断题');assert.ok(['正确','错误'].includes(answerLabel(q,q.answer)));assert.ok(isCorrect(q,q.answer));assert.equal(isCorrect(q,['A','B']),false);assert.equal(isCorrect(q,[q.answer[0]==='A'?'B':'A']),false);}}
});
test('V1 upgrade preserves current quiz, progress, selection and feedback and appends judgment questions once',()=>{
 const old=bank.questions.filter(q=>q.type!=='judge');
 const active=makeSession(old,{}, {chapter:0});const parked=makeSession(old,{}, {chapter:1});
 active.selected=['B'];active.feedback={correct:false,certain:true};
 const first=active.queue[0];const progress={[old[0].id]:{seen:true,stage:2,due:12345}};
 const state={version:1,progress,session:active,sessions:{'1-learn':parked}};
 upgradeSessions(state,bank.questions,bank.version);
 assert.equal(state.session.queue[0],first);assert.equal(state.progress,progress);assert.deepEqual(active.selected,['B']);assert.deepEqual(active.feedback,{correct:false,certain:true});
 assert.equal(active.queue.filter(t=>t.kind==='learn'&&t.id.includes('-judge-')).length,11);
 assert.equal(parked.queue.filter(t=>t.kind==='learn'&&t.id.includes('-judge-')).length,27);
 const n=active.queue.length;upgradeSessions(state,bank.questions,bank.version);assert.equal(active.queue.length,n);
});
test('new judgment questions use existing due and mistake review scheduling',()=>{
 const q=bank.questions.find(q=>q.type==='judge'),p={[q.id]:nextRecord({},false,true,1000)};
 assert.equal(makeSession(bank.questions,p,{chapter:0,mode:'mistakes'}).queue[0].id,q.id);
 assert.equal(makeSession(bank.questions,p,{chapter:0,mode:'review',now:1000}).queue[0].id,q.id);
 const good=nextRecord(p[q.id],true,true,2000);assert.equal(good.needsWork,false);assert.equal(good.due,2000+DAY);
});
test('notebook retains corrected questions and filters by type, chapter and status',()=>{
 const choice=bank.questions.find(q=>q.chapter===0&&q.type==='single');
 const judge=bank.questions.find(q=>q.chapter===1&&q.type==='judge');
 const multiple=bank.questions.find(q=>q.chapter===2&&q.type==='multiple');
 const progress={
  [choice.id]:nextRecord({},false,true,1000,['C']),
  [judge.id]:nextRecord({},true,false,1000,['B']),
  [multiple.id]:{seen:true,needsWork:true,due:1000}
 };
 progress[choice.id]=nextRecord(progress[choice.id],true,true,2000,choice.answer);
 assert.equal(progress[choice.id].wrongCount,1);assert.equal(progress[choice.id].inNotebook,true);
 assert.deepEqual(progress[choice.id].lastSelected,choice.answer);
 assert.equal(notebookQuestions(bank.questions,progress).length,3);
 assert.equal(notebookQuestions(bank.questions,progress,{type:'judge'})[0].id,judge.id);
 assert.equal(notebookQuestions(bank.questions,progress,{type:'choice',status:'pending'})[0].id,multiple.id);
 assert.equal(notebookQuestions(bank.questions,progress,{chapter:'0',status:'mastered'})[0].id,choice.id);
 assert.equal(notebookQuestions(bank.questions,progress,{chapter:'2',type:'judge'}).length,0);
});
test('material reading has the complete three source groups and does not enter scored questions',()=>{
 assert.deepEqual(bank.materials.map(m=>[m.chapter,m.material.length,m.questions.length,m.answers.length]),[[1,4,3,10],[2,2,1,5],[2,6,4,3]]);
 assert.match(bank.materials[0].material[0],/小林/);
 assert.match(bank.materials[0].answers.at(-1),/从而获得真实的价值感/);
 assert.match(bank.materials[1].questions[0],/精神之/);
 assert.match(bank.materials[2].material.join(''),/材料三：航天强国/);
 assert.match(bank.materials[2].answers.at(-1),/个人理想融入社会理想/);
 assert.ok(bank.materials.every(m=>!bank.questions.some(q=>q.id===m.id)));
});
