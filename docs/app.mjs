import {STORAGE_KEY, DAY, MASTERED_STAGE, normalizeWord, recordForgotten, reviewWord, dueWords, validateBackup, mergeBackup, exportBackup} from './model.mjs';

const $ = (selector) => document.querySelector(selector);
const e = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
};

let words = [];
let corruptRaw = null;
let storageBlocked = false;
let currentRoute = 'record';
let lastAddedId = null;
let undo = null;
let toastTimer;
let filter = 'all';
let query = '';
let session = null;
let editingId = null;

function storageWarning(message) {
  $('#storage-warning').textContent = message;
  $('#storage-warning').hidden = false;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { words = validateBackup(JSON.parse(raw)); }
      catch {
        corruptRaw = raw;
        storageBlocked = true;
        storageWarning('现有词本暂时无法读取，已保留原始数据。请在「备份」中导出原始文件，再导入有效备份。');
      }
    }
  } catch {
    storageBlocked = true;
    storageWarning('浏览器未允许保存词本。请允许此站点使用本地存储，或换到普通浏览模式后重试。');
  }
}

function persist(next, recover = false) {
  if (storageBlocked && !recover) throw new Error('词本暂时无法保存，请查看页面顶部提示。');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, words: next})); }
  catch { storageWarning('词本保存失败，可能是存储空间不足或浏览器阻止保存。此前数据仍保留，请先导出备份。'); throw new Error('没有保存成功，请先导出备份或检查浏览器存储。'); }
  words = next;
  if (recover) { storageBlocked = false; corruptRaw = null; $('#storage-warning').hidden = true; }
  updateNav();
}

function showToast(message, canUndo = false) {
  clearTimeout(toastTimer);
  $('#toast').innerHTML = `<span>${e(message)}</span>${canUndo ? '<button type="button" data-action="undo">撤销</button>' : ''}`;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, canUndo ? 9000 : 5000);
}

function updateNav() {
  document.querySelectorAll('[data-route]').forEach(a => {
    if (a.dataset.route === currentRoute) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('#word-count').textContent = words.length ? String(words.length) : '';
  const count = dueWords(words).length;
  $('#due-count').textContent = count ? String(count) : '';
  $('#due-count').setAttribute('aria-label', count ? `${count} 个待复习单词` : '');
}

function formatDate(time) {
  const now = Date.now();
  if (time <= now) return '现在可以复习';
  const diff = time - now;
  if (diff < 3600000) return `${Math.ceil(diff / 60000)} 分钟后`;
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const nextStart = new Date(time); nextStart.setHours(0, 0, 0, 0);
  const days = Math.round((nextStart - dayStart) / DAY);
  if (days === 0) return `今天 ${new Date(time).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',hour12:false})}`;
  if (days === 1) return '明天';
  if (days < 8) return `${days} 天后`;
  return new Date(time).toLocaleDateString('zh-CN', {month:'long',day:'numeric'});
}

function receiptHtml() {
  const word = words.find(w => w.id === lastAddedId);
  if (!word) return '';
  return `<section class="receipt" aria-label="刚刚记录的单词" role="status">
    <div class="receipt-main"><span class="receipt-word">${e(word.word)}</span><span class="receipt-count">已记录 · 忘记 ${word.lapses} 次</span><div class="receipt-tools"><button class="text-button" data-action="edit" data-id="${word.id}">${word.meaning ? '编辑词义' : '补充词义'}</button>${undo ? '<button class="text-button" data-action="undo">撤销</button>' : ''}</div></div>
    ${word.meaning ? `<p class="receipt-meaning">${e(word.pos)} ${e(word.meaning)}</p>` : '<p class="receipt-note">可以补充词义或助记，留给下次复习。</p>'}
  </section>`;
}

function renderRecord(focus = false) {
  $('#main').innerHTML = `<div class="capture-page"><div class="capture-inner">
    <h1 class="sr-only">记录忘记的单词</h1>
    <form id="record-form" class="record-form" novalidate>
      <label class="sr-only" for="word-input">刚刚忘记的单词</label>
      <input id="word-input" class="word-input" name="word" type="text" placeholder="输入忘记的单词" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="80" enterkeyhint="send" aria-describedby="record-error">
      <button id="record-button" class="record-button" type="submit" disabled>记一笔</button>
    </form>
    <p id="record-error" class="record-error" role="alert"></p><p class="entry-hint"><kbd>Enter</kbd> 记录</p>
    ${receiptHtml()}
  </div></div>`;
  if (focus && matchMedia('(min-width: 701px)').matches) $('#word-input').focus();
}

function renderWords() {
  $('#main').innerHTML = `<div class="page"><div class="page-heading"><h1>词本<span class="heading-meta">${words.length} 个词</span></h1><a class="heading-action" href="#/record">记一笔</a></div>
    <div class="word-toolbar"><div class="filters" role="group" aria-label="筛选单词">
      ${[['all','全部'],['stubborn','顽固词'],['mastered','已记住']].map(([key,label]) => `<button class="filter" data-action="filter" data-filter="${key}" aria-pressed="${key===filter}">${label}</button>`).join('')}
    </div><label class="search-box">${icons.search}<span class="sr-only">搜索单词或词义</span><input id="word-search" class="search-input" type="search" placeholder="搜索单词或词义" value="${e(query)}" autocomplete="off"></label></div>
    <div id="list-summary" class="list-summary"></div><div id="word-list" class="word-list"></div>
  </div>`;
  renderRows();
}

function renderRows() {
  let entries = [...words];
  if (filter === 'stubborn') entries = entries.filter(w => w.lapses >= 3 && w.stage < MASTERED_STAGE);
  if (filter === 'mastered') entries = entries.filter(w => w.stage >= MASTERED_STAGE);
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) entries = entries.filter(w => `${w.word} ${w.meaning} ${w.note}`.toLowerCase().includes(normalizedQuery));
  entries.sort((a,b) => b.lapses - a.lapses || b.updatedAt - a.updatedAt || a.word.localeCompare(b.word));
  $('#list-summary').innerHTML = `<span>${filter==='stubborn' ? '忘记 3 次及以上，尚未记住的词' : filter==='mastered' ? '连续 5 次记得的词，仍会定期复习' : '按遗忘次数排列'}</span><span>${entries.length} 个</span>`;
  if (!entries.length) {
    const title = normalizedQuery ? '没有找到这个词' : filter==='stubborn' ? '暂时没有顽固词' : filter==='mastered' ? '记住的词，会留在这里' : '词本还是空的';
    const detail = normalizedQuery ? '换个单词或词义试试。' : filter==='stubborn' ? '忘记 3 次及以上的词，会优先出现在这里。' : filter==='mastered' ? '跟着复习间隔，连续记得 5 次就会收录。' : '下次忘记时，回来记一笔。';
    $('#word-list').innerHTML = `<div class="empty-state"><h2>${title}</h2><p>${detail}</p>${!words.length ? '<a class="primary-button inline-primary" href="#/record">去记一笔</a>' : ''}</div>`;
    return;
  }
  $('#word-list').innerHTML = entries.map(w => `<article class="word-row ${w.lapses>=3 && w.stage<MASTERED_STAGE ? 'is-stubborn' : ''}">
    <button class="word-details" data-action="edit" data-id="${w.id}" aria-label="查看和编辑 ${e(w.word)}"><span class="word-term">${e(w.word)}<span class="word-sub">${w.stage>=MASTERED_STAGE ? '已记住 · ' : ''}${e(formatDate(w.dueAt))}</span></span><span class="word-meaning">${w.meaning ? e(w.meaning) : '<span class="missing-meaning">补充词义</span>'}</span></button>
    <span class="lapse-count">忘记 <strong>${w.lapses}</strong> 次</span><button class="row-again" data-action="again" data-id="${w.id}" aria-label="${e(w.word)} 又忘了一次">又忘了</button>
  </article>`).join('');
}

function startSession(practice = false) {
  const entries = practice ? [...words].sort((a,b) => b.lapses-a.lapses).slice(0,20) : dueWords(words);
  session = {ids: entries.map(w => w.id), index: 0, remembered: 0, forgotten: 0, shown: false, feedback: '', practice};
  renderReview();
}

function focusReviewContent() {
  const target = $('.review-definition') || $('.review-word') || $('.review-end h1') || $('.review-page .empty-state h2');
  if (target) { target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); }
}

function renderReview() {
  if (!session) {
    const due = dueWords(words);
    if (due.length) { startSession(); return; }
    const next = [...words].sort((a,b) => a.dueAt-b.dueAt)[0];
    $('#main').innerHTML = `<div class="review-page"><div class="empty-state"><h2>${words.length ? '暂时没有待复习的词' : '先记下一个忘记的词'}</h2><p>${next ? `下次复习：${e(formatDate(next.dueAt))}。` : '记下后，就可以在这里开始回忆。'}</p><a class="primary-button inline-primary" href="#/${words.length?'words':'record'}">${words.length?'查看词本':'去记一笔'}</a>${words.length ? '<button class="secondary-button" data-action="practice">提前练习</button>' : ''}</div></div>`;
    return;
  }
  if (session.index >= session.ids.length) {
    const next = [...words].sort((a,b) => a.dueAt-b.dueAt)[0];
    $('#main').innerHTML = `<div class="review-page"><div class="review-end"><span class="end-check">${icons.check}</span><h1>这一轮，复习好了</h1><p>记得 ${session.remembered} 个${session.forgotten ? `，忘记 ${session.forgotten} 个` : ''}。<br>${next ? `下次复习：${e(formatDate(next.dueAt))}。` : ''}</p><div class="review-controls"><a class="primary-button inline-primary" href="#/record">回到记录</a><button class="secondary-button" data-action="finish-review">查看词本</button></div></div></div>`;
    return;
  }
  const word = words.find(w => w.id === session.ids[session.index]);
  if (!word) { session.index++; renderReview(); return; }
  $('#main').innerHTML = `<div class="review-page"><div class="review-meta"><span>${session.practice?'提前练习':'本轮复习'} ${session.index+1} / ${session.ids.length}</span><button data-action="exit-review">结束本轮</button></div>
    <section class="review-stage" aria-label="回忆单词"><div class="review-word-row"><h1 class="review-word">${e(word.word)}</h1><button class="icon-button" data-action="speak" data-id="${word.id}" aria-label="朗读 ${e(word.word)}">${icons.sound}</button></div>
    ${word.phonetic ? `<p class="review-phonetic">${e(word.phonetic)}</p>` : ''}
    ${session.shown ? `<p class="review-definition">${e(word.pos)} ${word.meaning ? e(word.meaning) : '还没有词义'}</p>${word.note ? `<p class="review-note">${e(word.note)}</p>` : ''}${!word.meaning ? `<button class="text-button" data-action="edit" data-id="${word.id}">补充词义</button>` : ''}` : '<p class="review-prompt">先想一想，它是什么意思？</p>'}
    </section><p class="review-feedback" role="status">${e(session.feedback)}</p>
    <div class="review-controls">${session.shown ? `<button class="secondary-button" data-action="forgot" ${word.meaning ? '' : 'disabled'}>没想起来</button><button class="primary-button" data-action="remembered" ${word.meaning ? '' : 'disabled'}>记得</button>${!word.meaning ? '<button class="text-button" data-action="skip-word">暂时跳过</button>' : ''}` : '<button class="primary-button" data-action="reveal">看词义</button>'}</div>
    <p class="review-shortcut">${session.shown ? word.meaning ? '← 没想起来　　记得 →' : '先补充词义，再判断是否记得' : '空格显示词义'}</p>
  </div>`;
}

function route() {
  const parsed = location.hash.replace(/^#\/?/, '');
  const next = ['record','words','review'].includes(parsed) ? parsed : 'record';
  if (next !== 'review') session = null;
  currentRoute = next;
  document.title = `${next==='record'?'记一笔':next==='words'?'词本':'复习'} · 拾词`;
  updateNav();
  if (next === 'record') renderRecord();
  if (next === 'words') renderWords();
  if (next === 'review') renderReview();
  window.scrollTo({top:0,behavior:'instant'});
}

function logWord(value) {
  const before = words;
  const oldLast = lastAddedId;
  const result = recordForgotten(words, value);
  persist(result.words);
  undo = {before, after: words, last: oldLast};
  lastAddedId = result.entry.id;
  if (currentRoute === 'record') renderRecord(true);
  else {
    if (currentRoute === 'words') renderWords();
    showToast(`${result.entry.word} · 忘记 ${result.entry.lapses} 次`, true);
  }
}

function undoLast() {
  if (!undo || words !== undo.after) { undo = null; showToast('词本已更新，无法撤销之前的记录。'); return; }
  const last = undo.last;
  persist(undo.before);
  undo = null;
  lastAddedId = last;
  route();
  showToast('已撤销这次记录');
}

function speak(id) {
  const word = words.find(w => w.id===id);
  if (!word) return;
  if (!('speechSynthesis' in window)) { showToast('当前浏览器暂不支持朗读。'); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.word);
  utterance.lang = 'en-US'; utterance.rate = 0.85;
  const voice = speechSynthesis.getVoices().find(v => v.lang==='en-US') || speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  utterance.onerror = event => { if (!['interrupted','canceled'].includes(event.error)) showToast('暂时无法朗读，请检查系统语音设置。'); };
  speechSynthesis.speak(utterance);
}

function openEdit(id) {
  const word = words.find(w => w.id===id);
  if (!word) return;
  editingId = id;
  $('#edit-dialog').innerHTML = `<div class="dialog-heading"><h2 id="edit-title">${e(word.word)}</h2><div><button class="icon-button" data-action="speak" data-id="${word.id}" aria-label="朗读 ${e(word.word)}">${icons.sound}</button><button class="icon-button" data-action="close-edit" aria-label="关闭词条">${icons.close}</button></div></div>
    <p class="edit-meta">忘记 ${word.lapses} 次 · 连续记得 ${word.streak} 次<br>下次复习：${e(formatDate(word.dueAt))}</p>
    <form id="edit-form" class="edit-form"><label for="edit-word">单词</label><input id="edit-word" name="word" class="field" value="${e(word.word)}" maxlength="80" required autocapitalize="none" spellcheck="false">
    <label for="edit-meaning">词义</label><textarea id="edit-meaning" name="meaning" class="field" placeholder="写下你需要记住的那个意思" maxlength="1000">${e(word.meaning)}</textarea>
    <div class="field-pair"><div><label for="edit-phonetic">音标（可选）</label><input id="edit-phonetic" name="phonetic" class="field" value="${e(word.phonetic)}" maxlength="160"></div><div><label for="edit-pos">词性（可选）</label><input id="edit-pos" name="pos" class="field" value="${e(word.pos)}" maxlength="40"></div></div>
    <label for="edit-note">助记或例句（可选）</label><textarea id="edit-note" name="note" class="field" placeholder="一个联想、一句例句，都可以" maxlength="2000">${e(word.note)}</textarea>
    <p id="edit-status" class="form-status" role="alert"></p><div class="form-actions"><button type="button" class="secondary-button" data-action="close-edit">取消</button><button class="primary-button" type="submit">保存</button></div></form>`;
  $('#edit-dialog').showModal();
  if (!word.meaning) $('#edit-meaning').focus();
}

function download(text, filename, type='application/json') {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function applyReview(remembered) {
  if (!session?.shown) return;
  const id = session.ids[session.index];
  const word = words.find(w => w.id===id);
  if (!word?.meaning) return;
  const result = reviewWord(words, id, remembered);
  persist(result.words);
  undo = null;
  if (remembered) session.remembered++; else session.forgotten++;
  session.feedback = `${result.entry.word}：${formatDate(result.entry.dueAt)}再复习`;
  session.shown = false;
  session.index++;
  renderReview();
  focusReviewContent();
  if (session.index>=session.ids.length) showToast(session.feedback);
}

document.addEventListener('submit', event => {
  if (event.target.id === 'record-form') {
    event.preventDefault();
    try { logWord($('#word-input').value); }
    catch (err) { $('#record-error').textContent = err.message; $('#word-input').setAttribute('aria-invalid','true'); }
  }
  if (event.target.id === 'edit-form') {
    event.preventDefault();
    try {
      const data = new FormData(event.target);
      const term = normalizeWord(data.get('word'));
      if (words.some(w => w.word===term && w.id!==editingId)) throw new Error('词本里已经有这个词了，请保留原单词，或修改为其他拼写。');
      if (!words.some(w => w.id===editingId)) throw new Error('词条已更新，请关闭并重新打开。');
      persist(words.map(w => w.id===editingId ? {...w, word:term, meaning:data.get('meaning').trim(), phonetic:data.get('phonetic').trim(), pos:data.get('pos').trim(), note:data.get('note').trim(), updatedAt:Date.now()} : w));
      undo = null;
      $('#edit-dialog').close();
      if (currentRoute==='record') renderRecord();
      if (currentRoute==='words') renderWords();
      if (currentRoute==='review') renderReview();
      showToast('词条已保存');
    } catch(err) { $('#edit-status').textContent=err.message; }
  }
});

document.addEventListener('input', event => {
  if (event.target.id==='word-input') {
    $('#record-button').disabled = !event.target.value.trim();
    $('#record-error').textContent='';
    event.target.removeAttribute('aria-invalid');
  }
  if (event.target.id==='word-search') { query=event.target.value; renderRows(); }
});

document.addEventListener('click', event => {
  const routeLink = event.target.closest('a[data-route]');
  if (routeLink && routeLink.dataset.route === currentRoute) {
    event.preventDefault();
    if (session && session.index >= session.ids.length) session = null;
    route();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const {action,id} = button.dataset;
  try {
    if (action==='backup') {
      $('#backup-status').textContent='';
      const exportButton = $('[data-action="export"]');
      exportButton.textContent = corruptRaw ? '导出原始文件' : '导出';
      $('#backup-dialog').showModal();
    }
    if (action==='close-backup') $('#backup-dialog').close();
    if (action==='close-edit') $('#edit-dialog').close();
    if (action==='edit') openEdit(id);
    if (action==='again') { const w=words.find(w => w.id===id); if(w) logWord(w.word); }
    if (action==='undo') undoLast();
    if (action==='speak') speak(id);
    if (action==='filter') {
      filter=button.dataset.filter;
      document.querySelectorAll('[data-action="filter"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter===filter)));
      renderRows();
    }
    if (action==='export') {
      const stamp = new Date().toLocaleDateString('sv-SE');
      download(corruptRaw || JSON.stringify(exportBackup(words),null,2), `拾词${corruptRaw?'-原始数据':''}-${stamp}.json`);
      $('#backup-status').style.color='var(--green)';
      $('#backup-status').textContent=corruptRaw?'原始数据已导出，请妥善保管。':'备份已下载。';
    }
    if (action==='import') $('#import-file').click();
    if (action==='reveal' && session) { session.shown=true; session.feedback=''; renderReview(); focusReviewContent(); }
    if (action==='remembered') applyReview(true);
    if (action==='forgot') applyReview(false);
    if (action==='practice') { startSession(true); focusReviewContent(); }
    if (action==='skip-word' && session) { session.index++; session.shown=false; session.feedback='已跳过，下次仍可复习。'; renderReview(); focusReviewContent(); }
    if (action==='exit-review') { session=null; location.hash='/record'; }
    if (action==='finish-review') { session=null; location.hash='/words'; }
  } catch (err) { showToast(err.message); }
});

$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value='';
  if (!file) return;
  const status = $('#backup-status'); status.style.color='var(--danger)';
  try {
    if (file.size > 12*1024*1024) throw new Error('备份文件超过 12 MB，请选择拾词导出的 JSON 文件。');
    const text = await file.text();
    let parsed;
    try { parsed=JSON.parse(text.replace(/^\uFEFF/,'')); } catch { throw new Error('文件不是有效的 JSON 备份，未改动当前词本。'); }
    const result = mergeBackup(words,parsed);
    if (corruptRaw) download(corruptRaw,`拾词-恢复前原始数据-${Date.now()}.json`);
    persist(result.words,true);
    undo=null; session=null;
    route();
    status.style.color='var(--green)';
    status.textContent=`导入完成，新增 ${result.added} 个词，现有词本共 ${words.length} 个词。`;
  } catch(err) { status.textContent=err.message; }
});

document.addEventListener('keydown', event => {
  if (event.isComposing || $('#edit-dialog').open || $('#backup-dialog').open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (currentRoute!=='review' || !session) return;
  if (event.code==='Space' && !session.shown) { event.preventDefault(); session.shown=true; renderReview(); focusReviewContent(); }
  if (event.code==='ArrowLeft' && session.shown) { event.preventDefault(); try { applyReview(false); } catch(err) { showToast(err.message); } }
  if (event.code==='ArrowRight' && session.shown) { event.preventDefault(); try { applyReview(true); } catch(err) { showToast(err.message); } }
});

for (const dialog of [$('#edit-dialog'),$('#backup-dialog')]) {
  dialog.addEventListener('click', event => {
    if(event.target!==dialog) return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) dialog.close();
  });
}

window.addEventListener('hashchange',route);
window.addEventListener('storage',event => {
  if(event.key!==STORAGE_KEY) return;
  try { words=event.newValue ? validateBackup(JSON.parse(event.newValue)) : []; undo=null; session=null; route(); showToast('词本已与另一个页面同步'); }
  catch { corruptRaw=event.newValue; storageBlocked=true; storageWarning('另一个页面写入的词本无法读取，已停止写入。请在「备份」中导出原始文件，再导入有效备份。'); }
});
window.addEventListener('pageshow',updateNav);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateNav(); });
setInterval(() => {
  if (document.hidden) return;
  updateNav();
  if (currentRoute==='review' && !session && !$('#edit-dialog').open && !$('#backup-dialog').open) renderReview();
}, 60000);
load();
route();
