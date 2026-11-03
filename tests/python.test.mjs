import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyPythonState,practiceSession,recordAttempt,pythonNotebook,validPythonState,questionBlocks,inlineText} from '../python-engine.js';
const bank=JSON.parse(readFileSync(new URL('../data/python.json',import.meta.url)));
test('Python imports 121 questions with one answer each across the 12 supplied course files',()=>{
 assert.equal(bank.questions.length,121);assert.equal(new Set(bank.questions.map(q=>q.id)).size,121);
 assert.deepEqual(bank.chapters.map(c=>c.course),[4,5,6,7,8,9,14,15,16,17,18,19]);
 for(const c of bank.chapters){const qs=bank.questions.filter(q=>q.chapter===c.id);assert.equal(qs.length,c.course===19?11:10);assert.deepEqual(qs.map(q=>q.number),Array.from({length:qs.length},(_,i)=>i+1));}
 for(const q of bank.questions){assert.equal(q.answer.length,1);assert.deepEqual(q.options.map(o=>o.id),['A','B','C','D']);assert.ok(q.options.some(o=>o.id===q.answer[0]));assert.ok(q.blocks.length);}
});
test('Python practice starts without answers, learning cards or a spaced review schedule',()=>{
 const s=practiceSession(bank.questions.slice(0,10));assert.equal(s.selected,null);assert.equal(s.feedback,null);assert.equal(s.index,0);assert.equal(s.ids.length,10);assert.equal(s.queue,undefined);
 const r=recordAttempt({},'C','C',123);assert.equal(r.lastCorrect,true);assert.equal(r.inNotebook,false);assert.equal(r.due,undefined);assert.equal(r.stage,undefined);
});
test('Python wrong answers are retained after correction and filtered by course/status',()=>{
 const q=bank.questions[0];let r=recordAttempt({},'A',q.answer[0],1000);assert.equal(r.wrongCount,1);assert.equal(r.needsWork,true);
 r=recordAttempt(r,q.answer[0],q.answer[0],2000);assert.equal(r.attempts,2);assert.equal(r.correctAttempts,1);assert.equal(r.needsWork,false);assert.equal(r.inNotebook,true);
 assert.equal(pythonNotebook(bank.questions,{[q.id]:r},'0','mastered').length,1);assert.equal(pythonNotebook(bank.questions,{[q.id]:r},'all','pending').length,0);
});
test('separate Python backups preserve submitted feedback and reject other subject data',()=>{
 const state=emptyPythonState();state.sessions.c=practiceSession(bank.questions.slice(0,2));state.active='c';state.sessions.c.selected='C';state.sessions.c.feedback=true;state.sessions.c.results[bank.questions[0].id]=true;state.progress[bank.questions[0].id]=recordAttempt({},'C','C');
 assert.ok(validPythonState(JSON.parse(JSON.stringify(state)),bank.questions));assert.equal(validPythonState({...state,subject:'sizheng'},bank.questions),false);assert.equal(validPythonState({...state,active:'missing'},bank.questions),false);
});
test('code blocks retain indentation, multiple files and console text without rendering HTML',()=>{
 const q=bank.questions.find(q=>q.id==='py-19-2');assert.equal(q.blocks.filter(b=>b.type==='code').length,2);assert.ok(q.blocks.some(b=>b.text.includes('    print("Hello!")')));
 assert.ok(bank.questions.find(q=>q.id==='py-19-5').blocks.some(b=>b.type==='code'&&b.text.includes('└──')));
 assert.match(questionBlocks({blocks:[{type:'code',language:'python',text:'if a < b:\n    print("<img>")'}]}),/    print\(&quot;&lt;img&gt;&quot;\)/);
 assert.equal(inlineText('`<class \'str\'>`'),'<code>&lt;class &#39;str&#39;&gt;</code>');
});
