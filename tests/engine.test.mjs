import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSession,nextRecord,isCorrect,addRetry,DAY} from '../engine.js';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
test('all 203 questions have complete options and matching reference answer types',()=>{
 assert.equal(bank.questions.length,203);assert.equal(new Set(bank.questions.map(q=>q.id)).size,203);
 for(const q of bank.questions){assert.ok(q.prompt);assert.ok(q.options.length>=4);assert.ok(q.options.every(o=>o.text));assert.ok(q.answer.every(a=>q.options.some(o=>o.id===a)));assert.ok(q.type==='single'?q.answer.length===1:q.answer.length>1);}
 assert.deepEqual(bank.chapters.map(c=>bank.questions.filter(q=>q.chapter===c.id).length),[57,78,68]);
});
test('continuous learning includes all 203 questions in groups of three, interleaving old questions',()=>{
 const s=makeSession(bank.questions,{});assert.equal(s.queue.filter(t=>t.kind==='learn').length,203);
 assert.deepEqual(s.queue.slice(0,3).map(t=>t.kind),['learn','learn','learn']);
 assert.equal(s.queue.filter(t=>t.kind==='quiz'&&t.review).length,134);
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
