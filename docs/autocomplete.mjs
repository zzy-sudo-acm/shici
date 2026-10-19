export function attachAutocomplete(input, {dictionary, personal, commit}) {
  const panel = document.createElement('div');
  panel.id = 'word-suggestions'; panel.className = 'word-suggestions'; panel.hidden = true;
  panel.setAttribute('role', 'listbox'); panel.setAttribute('aria-label', '补全并记录单词');
  if ('showPopover' in panel) panel.setAttribute('popover', 'manual');
  const announcement = document.createElement('div');
  announcement.className = 'sr-only'; announcement.setAttribute('role', 'status');
  document.body.append(panel, announcement);
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', panel.id); input.setAttribute('aria-expanded', 'false');
  let items = [], active = -1, revision = 0, timer, blurTimer, destroyed = false, composing = false;
  const removers = [];
  function listen(target, name, listener, options) {
    target.addEventListener(name, listener, options);
    removers.push(() => target.removeEventListener(name, listener, options));
  }
  function close() {
    revision++; clearTimeout(timer); panel.hidden = true; active = -1;
    if (panel.hasAttribute('popover') && panel.matches(':popover-open')) panel.hidePopover();
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
  }
  function position() {
    if (panel.hidden) return;
    const rect = input.closest('form').getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0;
    const bottom = top + (viewport?.height || innerHeight);
    const below = bottom - rect.bottom - 16, above = rect.top - top - 16;
    const desired = Math.min(items.length ? items.length * 61 + 16 : 64, 380);
    const upwards = below < desired && above > below;
    const height = Math.min(desired, Math.max(70, upwards ? above : below));
    panel.style.width = `${Math.min(rect.width, innerWidth - 32)}px`;
    panel.style.left = `${Math.max(16, Math.min(rect.left, innerWidth - rect.width - 16))}px`;
    panel.style.maxHeight = `${height}px`;
    panel.style.top = `${upwards ? Math.max(top + 8, rect.top - height - 8) : rect.bottom + 8}px`;
  }
  function open() {
    if (destroyed || document.activeElement !== input) return;
    panel.hidden = false;
    if (panel.hasAttribute('popover') && !panel.matches(':popover-open')) panel.showPopover();
    input.setAttribute('aria-expanded', 'true'); position();
  }
  function highlight(index) {
    if (!items.length) return;
    active = (index + items.length) % items.length;
    const options = panel.querySelectorAll('[role="option"]');
    options.forEach((option,i) => option.setAttribute('aria-selected', String(i===active)));
    input.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({block:'nearest'});
  }
  function showItems(next) {
    items = next; active = -1; panel.replaceChildren(); input.removeAttribute('aria-activedescendant');
    if (!items.length) {
      const message = document.createElement('p'); message.className = 'suggestion-message';
      message.textContent = '没有匹配的候选，可以直接记录完整单词。'; panel.append(message);
    }
    items.forEach((entry,index) => {
      const option = document.createElement('div'); option.id = `word-option-${index}`;
      option.className = 'suggestion-option'; option.dataset.index = String(index);
      option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
      option.setAttribute('aria-label', `${entry.word}，${entry.meaning || '暂无词义'}，选择并记录`);
      const term = document.createElement('span'); term.className = 'suggestion-word'; term.textContent = entry.word;
      const meaning = document.createElement('span'); meaning.className = 'suggestion-meaning'; meaning.textContent = entry.meaning || '已在词本中';
      option.append(term, meaning); panel.append(option);
    });
    announcement.textContent = items.length ? `找到 ${items.length} 个候选，用上下方向键选择，回车记录。` : '没有匹配的候选。';
    open();
  }
  async function update(move = false) {
    clearTimeout(timer);
    const value = input.value.trim();
    const ticket = ++revision;
    if (composing || value.length < 2 || !/^[a-z][a-z '\-]*$/i.test(value)) { close(); return; }
    items = []; active = -1; input.removeAttribute('aria-activedescendant');
    panel.replaceChildren();
    const loading = document.createElement('p'); loading.className = 'suggestion-message'; loading.textContent = '正在查找单词…'; panel.append(loading); open();
    try {
      const next = await dictionary.suggest(value, personal());
      if (destroyed || ticket !== revision || input.value.trim() !== value) return;
      showItems(next);
      if (move && next.length) highlight(0);
    } catch {
      if (destroyed || ticket !== revision) return;
      panel.replaceChildren();
      const message = document.createElement('p'); message.className = 'suggestion-message'; message.textContent = '词典暂时无法加载，可直接记录完整单词。';
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'text-button suggestion-retry'; retry.textContent = '重试';
      retry.addEventListener('click', () => { input.focus(); update(); });
      panel.append(message,retry); open(); announcement.textContent = message.textContent;
    }
  }
  function schedule() {
    revision++; clearTimeout(timer);
    if (input.value.trim().length < 2 || composing) { close(); return; }
    // Hide results from the previous prefix immediately; late responses cannot be selected.
    close(); timer = setTimeout(() => update(), 120);
  }
  function choose(index) {
    const entry = items[index];
    if (!entry) return;
    close(); commit(entry.word, entry);
  }
  listen(input, 'input', schedule);
  listen(input, 'focus', () => { clearTimeout(blurTimer); schedule(); });
  listen(input, 'blur', () => { blurTimer = setTimeout(() => { if (!panel.contains(document.activeElement)) close(); }, 180); });
  listen(input, 'compositionstart', () => { composing=true; close(); });
  listen(input, 'compositionend', () => { composing=false; schedule(); });
  listen(input, 'keydown', event => {
    if (composing || event.isComposing) return;
    if (event.key==='ArrowDown' || event.key==='ArrowUp') {
      event.preventDefault();
      if (panel.hidden || !items.length) update(true);
      else highlight(active < 0 ? (event.key==='ArrowDown' ? 0 : items.length-1) : active + (event.key==='ArrowDown' ? 1 : -1));
    }
    if (event.key==='Enter' && !panel.hidden && active>=0) { event.preventDefault(); choose(active); }
    if (event.key==='Escape' || event.key==='Tab') close();
  });
  listen(panel, 'mousedown', event => event.preventDefault());
  listen(panel, 'click', event => { const option=event.target.closest('[role="option"]'); if(option) choose(Number(option.dataset.index)); });
  listen(panel, 'pointermove', event => { if(event.pointerType!=='mouse') return; const option=event.target.closest('[role="option"]'); if(option && Number(option.dataset.index)!==active) highlight(Number(option.dataset.index)); });
  listen(document, 'pointerdown', event => { if(event.target!==input && !panel.contains(event.target)) close(); });
  listen(window, 'resize', position);
  listen(window, 'scroll', position, true);
  if (window.visualViewport) { listen(window.visualViewport, 'resize', position); listen(window.visualViewport, 'scroll', position); }
  return {close, destroy() { destroyed=true; close(); clearTimeout(blurTimer); removers.forEach(remove => remove()); panel.remove(); announcement.remove(); }};
}
