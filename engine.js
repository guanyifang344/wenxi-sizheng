export const DAY = 86400000;
export const INTERVALS = [1, 3, 7];
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function isCorrect(question, selected) {
  return selected.length === question.answer.length && question.answer.every(x => selected.includes(x));
}
export function nextRecord(previous = {}, correct, certain, now = Date.now()) {
  const good = correct && certain;
  const stage = good ? Math.min((previous.stage || 0) + (previous.lastSuccess && now - previous.lastSuccess < DAY ? 0 : 1), 3) : 0;
  return { ...previous, seen: true, stage, needsWork: !good, attempts: (previous.attempts || 0) + 1,
    lastAnswer: now, lastSuccess: good ? now : previous.lastSuccess || null,
    due: good ? now + INTERVALS[Math.max(stage - 1, 0)] * DAY : now };
}
export function makeSession(questions, progress, {chapter = null, mode = 'learn', now = Date.now()} = {}) {
  const pool = questions.filter(q => chapter === null || q.chapter === chapter);
  const due = pool.filter(q => progress[q.id]?.seen && progress[q.id].due <= now);
  const weak = pool.filter(q => progress[q.id]?.needsWork);
  const fresh = pool.filter(q => !progress[q.id]?.seen);
  const queue = [];
  if (mode !== 'learn') {
    queue.push(...shuffle(mode === 'mistakes' ? weak : due).map(q => ({kind: 'quiz', id: q.id, review: true})));
  } else {
    queue.push(...shuffle(due).slice(0, 3).map(q => ({kind: 'quiz', id: q.id, review: true})));
    for (let i = 0; i < fresh.length; i += 3) {
      const batch = fresh.slice(i, i + 3);
      queue.push(...batch.map(q => ({kind: 'learn', id: q.id, group: i / 3 + 1})));
      const quizzes = batch.map(q => ({kind: 'quiz', id: q.id}));
      if (i) quizzes.push(...shuffle(fresh.slice(0, i)).slice(0, 2).map(q => ({kind: 'quiz', id: q.id, review: true})));
      queue.push(...shuffle(quizzes));
    }
  }
  if (!queue.length) return null;
  return {queue, total: queue.length, done: 0, results: {}, tries: {}, feedback: null, selected: [], started: now, chapter, mode};
}
export function addRetry(session, id) {
  // At most two additional attempts; a later existing quiz already provides a retry.
  if (session.tries[id] >= 3 || session.queue.some(t => t.kind === 'quiz' && t.id === id)) return;
  let quizzes = 0, position = session.queue.length;
  for (let i = 0; i < session.queue.length; i++) {
    if (session.queue[i].kind === 'quiz' && ++quizzes === 3) { position = i + 1; break; }
  }
  if (quizzes < 2) return; // Leave isolated tail errors due for the next visit.
  session.queue.splice(position, 0, {kind: 'quiz', id, review: true, retry: true});
  session.total++;
}

// Extend saved V1 chapter queues without resetting answers, selections or position.
export function upgradeSessions(state, questions, bankVersion) {
  const sessions = new Set([state.session, ...Object.values(state.sessions || {})].filter(Boolean));
  for (const session of sessions) {
    if (session.bankVersion === bankVersion) continue;
    if (session.mode === 'learn') {
      const queued = new Set(session.queue.map(t => t.id));
      const additions = questions.filter(q => q.chapter === session.chapter && !queued.has(q.id) && !state.progress[q.id]?.seen);
      const extra = makeSession(additions, state.progress, {chapter: session.chapter});
      if (extra) { session.queue.push(...extra.queue); session.total += extra.queue.length; }
    }
    session.bankVersion = bankVersion;
  }
  return state;
}
export function questionTypeLabel(type) {
  return {single:'单选题', multiple:'多选题', judge:'判断题'}[type];
}
export function answerLabel(question, selected) {
  return question.type === 'judge' ? selected.map(id => question.options.find(o => o.id === id)?.text || id).join('、') : selected.join('、');
}
