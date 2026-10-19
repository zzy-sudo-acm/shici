import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectSuggestions, createDictionary} from '../docs/dictionary.mjs';

const rows = [
  ['result', 'n. 结果', '/rɪˈzʌlt/'],
  ['resist', 'v. 抵抗', '/rɪˈzɪst/'],
  ['resilient', 'adj. 有韧性的', '/rɪˈzɪliənt/'],
  ['resilience', 'n. 韧性', '/rɪˈzɪliəns/'],
];
const entries = rows.map(([word,meaning,phonetic]) => ({word,meaning,phonetic,pos:''}));
const response = () => ({ok:true,json:async()=>rows});

test('英文前缀补全带中文词义，完全匹配优先且限制候选数量', () => {
  assert.deepEqual(collectSuggestions(entries,'RESI').map(e=>e.word),['resist','resilient','resilience']);
  assert.equal(collectSuggestions(entries,'resilient')[0].meaning,'adj. 有韧性的');
  assert.equal(collectSuggestions(entries,'res',[],2).length,2);
  assert.deepEqual(collectSuggestions(entries,'r'),[]);
  assert.deepEqual(collectSuggestions(entries,'<script>'),[]);
});
test('优先词本中的单词，保留自定义词义，并为已有空词义补全', () => {
  const own=[{word:'resilient',meaning:'我的联想：倒下也能恢复',lapses:5,updatedAt:1},{word:'resilience',meaning:'',lapses:3,updatedAt:2}];
  const found=collectSuggestions(entries,'resi',own);
  assert.equal(found[0].word,'resilient');assert.equal(found[0].meaning,own[0].meaning);
  assert.equal(found[1].meaning,'n. 韧性');
  assert.equal(new Set(found.map(e=>e.word)).size,found.length);
});
test('补全及完整词查义共用同一按字母分片请求', async () => {
  const urls=[];
  const dictionary=createDictionary({fetcher:async url=>{urls.push(String(url));return response();}});
  const [a,b,c]=await Promise.all([dictionary.suggest('res'),dictionary.suggest('resi'),dictionary.lookup('Resilient')]);
  assert.equal(urls.length,1);assert.match(urls[0],/dictionary\/r\.json$/);
  assert.equal(a.length,4);assert.equal(b.length,3);assert.equal(c.word,'resilient');
  assert.equal(await dictionary.lookup('resiliences'),null);
  assert.equal(urls.length,1);
});
test('空输入和非法字符不发起词库请求', async () => {
  const dictionary=createDictionary({fetcher:()=>{throw Error('不应请求');}});
  for(const value of ['','a','中文','<img>']) assert.deepEqual(await dictionary.suggest(value),[]);
  assert.equal(await dictionary.lookup('中文'),null);
});
test('加载失败后可以重试，不把失败请求永久缓存', async () => {
  let count=0;
  const dictionary=createDictionary({fetcher:async()=>++count===1 ? {ok:false} : response()});
  await assert.rejects(dictionary.suggest('resi'),/词典暂时无法加载/);
  assert.ok((await dictionary.suggest('resi')).length);assert.equal(count,2);
});
test('超时会取消请求，提示中文错误', async () => {
  let aborted=false;
  const dictionary=createDictionary({timeout:10,fetcher:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));},{once:true}))});
  await assert.rejects(dictionary.lookup('resilient'),/词典暂时无法加载/);
  assert.equal(aborted,true);
});
test('真正打包的词库包含常见难词的中文释义，分片格式可用于前端', async () => {
  const dictionary=createDictionary({fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../docs/dictionary/'+new URL(url).pathname.split('/').pop(),import.meta.url),'utf8'))})});
  for(const term of ['resilient','serendipity','ephemeral','ambiguous','ubiquitous','aberration','meticulous','constructor']) {
    const entry=await dictionary.lookup(term);
    assert.ok(entry,term+'应存在'); assert.match(entry.meaning,/[\u3400-\u9fff]/);
  }
  const found=await dictionary.suggest('resili');
  assert.ok(found.some(e=>e.word==='resilient'));
  for(const letter of 'abcdefghijklmnopqrstuvwxyz') assert.ok((await dictionary.suggest(letter+'a')).length<=6);
});
