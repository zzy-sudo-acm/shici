import test from 'node:test';
import assert from 'node:assert/strict';
import {DAY, normalizeWord, recordForgotten, reviewWord, dueWords, validateBackup, mergeBackup, exportBackup} from '../docs/model.mjs';
const now = 1792195200000;

test('规范大小写及空格，同一词累计而非重复创建', () => {
  const a = recordForgotten([], ' Resilient ', now);
  const b = recordForgotten(a.words, 'RESILIENT', now+100);
  assert.equal(b.words.length,1); assert.equal(b.entry.lapses,2);
  assert.equal(b.entry.id,a.entry.id); assert.equal(b.entry.meaning,'有韧性的；能迅速恢复的');
  assert.equal(b.entry.history.length,2);
});
test('短语、撇号和连字符可用，HTML及超长输入被拒绝', () => {
  assert.equal(normalizeWord('  take   care '),'take care');
  assert.equal(normalizeWord('well-known'),'well-known');
  assert.equal(normalizeWord('don’t'),"don't");
  for(const input of ['', '<script>alert(1)</script>', 'a'.repeat(81),123]) assert.throws(()=>normalizeWord(input));
});
test('未知词仍保存，等待用户补充词义', () => {
  const result=recordForgotten([], 'serendipity',now);
  assert.equal(result.entry.meaning,''); assert.equal(result.entry.dueAt,now);
  assert.equal(recordForgotten([], 'constructor',now).entry.meaning,'');
});
test('记录时带入词库释义和音标，无须用户填写中文', () => {
  const definition={word:'serendipity',meaning:'n. 意外发现美好事物的运气',phonetic:'/ˌserənˈdɪpəti/',pos:''};
  const result=recordForgotten([], 'serendipity',now,definition);
  assert.equal(result.entry.meaning,definition.meaning);assert.equal(result.entry.phonetic,definition.phonetic);
  assert.equal(result.entry.lapses,1);
});
test('已有词义不被词库覆盖，空词义可补全，错误单词的释义不混入', () => {
  let result=recordForgotten([], 'serendipity',now);
  const definition={word:'serendipity',meaning:'n. 意外的收获',phonetic:'/test/',pos:'n.'};
  result=recordForgotten(result.words,'serendipity',now+1,definition);
  assert.equal(result.entry.meaning,definition.meaning);assert.equal(result.entry.lapses,2);
  result=recordForgotten(result.words,'serendipity',now+2,{...definition,meaning:'不应该覆盖'});
  assert.equal(result.entry.meaning,definition.meaning);
  const wrong=recordForgotten([], 'unknownword',now,definition);
  assert.equal(wrong.entry.meaning,'');
});
test('成功回忆依次安排1/3/7/14/30/90天，五次后进入记住状态', () => {
  let {entry,words}=recordForgotten([], 'resilient',now);
  let time=now;
  for(const [i,days] of [1,3,7,14,30,90,90].entries()) {
    const result=reviewWord(words,entry.id,true,time);
    assert.equal(result.entry.dueAt,time+days*DAY);
    assert.equal(result.entry.stage,Math.min(i+1,6));
    assert.equal(result.entry.lapses,1);
    words=result.words; time=result.entry.dueAt;
  }
});
test('再次忘记会重置间隔，10分钟后到期', () => {
  let result=recordForgotten([], 'resilient',now);
  result=reviewWord(result.words,result.entry.id,true,now);
  result=reviewWord(result.words,result.entry.id,false,now+DAY);
  assert.equal(result.entry.lapses,2); assert.equal(result.entry.stage,0);
  assert.equal(result.entry.streak,0); assert.equal(result.entry.dueAt,now+DAY+600000);
});
test('提前练习成功不推进阶段或推迟到期，失败仍重新计时', () => {
  let result=recordForgotten([], 'resilient',now);
  result=reviewWord(result.words,result.entry.id,true,now);
  const due=result.entry.dueAt;
  for(let i=1;i<=6;i++) {
    result=reviewWord(result.words,result.entry.id,true,now+i*1000);
    assert.equal(result.entry.stage,1); assert.equal(result.entry.streak,1);
    assert.equal(result.entry.dueAt,due);
  }
  result=reviewWord(result.words,result.entry.id,false,now+10000);
  assert.equal(result.entry.stage,0); assert.equal(result.entry.lapses,2);
  assert.equal(result.entry.dueAt,now+10000+600000);
});
test('随手记录遗忘立即重新安排，并按顽固程度优先复习', () => {
  let result=recordForgotten([], 'resilient',now);
  result=recordForgotten(result.words,'subtle',now);
  result=recordForgotten(result.words,'resilient',now+1);
  assert.deepEqual(dueWords(result.words,now+1).map(w=>w.word),['resilient','subtle']);
  assert.equal(dueWords(result.words,now-1).length,0);
});
test('导出后可严格验证并重新导入', () => {
  const result=recordForgotten([], 'resilient',now);
  const backup=JSON.parse(JSON.stringify(exportBackup(result.words)));
  assert.deepEqual(validateBackup(backup),result.words);
  const merged=mergeBackup([],backup);
  assert.equal(merged.added,1); assert.equal(merged.words[0].lapses,1);
});
test('重复导入不累计次数、不重复事件，保留较新进度', () => {
  let result=recordForgotten([], 'resilient',now);
  const old=exportBackup(result.words);
  result=recordForgotten(result.words, 'resilient',now+200);
  let merged=mergeBackup(result.words,old);
  assert.equal(merged.added,0); assert.equal(merged.words.length,1);
  assert.equal(merged.words[0].lapses,2); assert.equal(merged.words[0].history.length,2);
  merged=mergeBackup(merged.words,old);
  assert.equal(merged.words[0].lapses,2); assert.equal(merged.words[0].history.length,2);
});
test('无效日期、次数、重复词、恶意字符串和模式均不污染词本', () => {
  const {words}=recordForgotten([], 'resilient',now);
  for (const patch of [{dueAt:NaN},{stage:99},{lapses:-1},{streak:1.1},{meaning:3},{id:'<bad>'},{history:[{type:'bad'}]}]) {
    assert.throws(()=>validateBackup({version:1,words:[{...words[0],...patch}]}));
  }
  assert.throws(()=>validateBackup({version:2,words}));
  assert.throws(()=>validateBackup({version:1,words:[words[0],words[0]]}));
  assert.equal(words[0].lapses,1);
});
test('旧状态不被记录和复习的纯函数修改', () => {
  const a=recordForgotten([], 'resilient',now);
  const snapshot=JSON.stringify(a.words);
  recordForgotten(a.words,'resilient',now+1);
  reviewWord(a.words,a.entry.id,true,now+DAY);
  assert.equal(JSON.stringify(a.words),snapshot);
});
