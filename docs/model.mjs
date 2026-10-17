export const STORAGE_KEY = 'shici.words.v1';
export const DAY = 86400000;
export const INTERVALS = [1, 3, 7, 14, 30, 90];
export const MASTERED_STAGE = 5;
const MAX_WORDS = 10000;

const glossary = {
  resilient: ['有韧性的；能迅速恢复的', '/rɪˈzɪliənt/', 'adj.'],
  ephemeral: ['短暂的；转瞬即逝的', '/ɪˈfemərəl/', 'adj.'],
  ambiguous: ['模棱两可的；含糊不清的', '/æmˈbɪɡjuəs/', 'adj.'],
  reluctant: ['不情愿的；勉强的', '/rɪˈlʌktənt/', 'adj.'],
  ubiquitous: ['无处不在的', '/juːˈbɪkwɪtəs/', 'adj.'],
  meticulous: ['一丝不苟的；细致的', '/məˈtɪkjələs/', 'adj.'],
  inevitable: ['不可避免的；必然发生的', '/ɪnˈevɪtəbl/', 'adj.'],
  profound: ['深刻的；深远的', '/prəˈfaʊnd/', 'adj.'],
  eloquent: ['雄辩的；有说服力的', '/ˈeləkwənt/', 'adj.'],
  subtle: ['细微的；不易察觉的', '/ˈsʌtl/', 'adj.'],
  persistent: ['坚持不懈的；持续的', '/pərˈsɪstənt/', 'adj.'],
  diligent: ['勤勉的；用功的', '/ˈdɪlɪdʒənt/', 'adj.'],
  coherent: ['连贯的；条理清楚的', '/koʊˈhɪrənt/', 'adj.'],
  alleviate: ['减轻；缓解', '/əˈliːvieɪt/', 'v.'],
  acquire: ['获得；学到', '/əˈkwaɪər/', 'v.'],
  abandon: ['放弃；抛弃', '/əˈbændən/', 'v.'],
  accommodate: ['容纳；为…提供住宿；适应', '/əˈkɑːmədeɪt/', 'v.'],
  acknowledge: ['承认；认可；致谢', '/əkˈnɑːlɪdʒ/', 'v.'],
  arbitrary: ['任意的；武断的', '/ˈɑːrbɪtreri/', 'adj.'],
  authentic: ['真实的；可信的', '/ɔːˈθentɪk/', 'adj.'],
  benevolent: ['仁慈的；善意的', '/bəˈnevələnt/', 'adj.'],
  cognitive: ['认知的', '/ˈkɑːɡnətɪv/', 'adj.'],
  concise: ['简明的；简洁的', '/kənˈsaɪs/', 'adj.'],
  conscious: ['有意识的；清醒的', '/ˈkɑːnʃəs/', 'adj.'],
  consistent: ['一贯的；一致的', '/kənˈsɪstənt/', 'adj.'],
  contemplate: ['沉思；仔细考虑', '/ˈkɑːntəmpleɪt/', 'v.'],
  distinguish: ['区分；辨别', '/dɪˈstɪŋɡwɪʃ/', 'v.'],
  elaborate: ['详尽的；精心制作的；详细阐述', '/ɪˈlæbərət/', 'adj. / v.'],
  essential: ['必不可少的；本质的', '/ɪˈsenʃəl/', 'adj.'],
  feasible: ['可行的；可能实现的', '/ˈfiːzəbl/', 'adj.'],
  fluctuate: ['波动；起伏', '/ˈflʌktʃueɪt/', 'v.'],
  hypothesis: ['假说；假设', '/haɪˈpɑːθəsɪs/', 'n.'],
  implicit: ['含蓄的；不言明的', '/ɪmˈplɪsɪt/', 'adj.'],
  incentive: ['激励；诱因', '/ɪnˈsentɪv/', 'n.'],
  intricate: ['错综复杂的', '/ˈɪntrɪkət/', 'adj.'],
  mitigate: ['减轻；缓和', '/ˈmɪtɪɡeɪt/', 'v.'],
  obscure: ['晦涩的；鲜为人知的；使模糊', '/əbˈskjʊr/', 'adj. / v.'],
  perceive: ['察觉；理解；认为', '/pərˈsiːv/', 'v.'],
  plausible: ['貌似合理的；可信的', '/ˈplɔːzəbl/', 'adj.'],
  pragmatic: ['务实的；实用的', '/præɡˈmætɪk/', 'adj.'],
  reconcile: ['使和解；调和', '/ˈrekənsaɪl/', 'v.'],
  redundant: ['多余的；冗余的', '/rɪˈdʌndənt/', 'adj.'],
  retain: ['保留；记住', '/rɪˈteɪn/', 'v.'],
  spontaneous: ['自发的；自然的', '/spɑːnˈteɪniəs/', 'adj.'],
  substantial: ['大量的；实质性的', '/səbˈstænʃəl/', 'adj.'],
  sufficient: ['足够的；充分的', '/səˈfɪʃənt/', 'adj.'],
  tangible: ['有形的；切实的', '/ˈtændʒəbl/', 'adj.'],
  tentative: ['暂定的；试探性的', '/ˈtentətɪv/', 'adj.'],
  versatile: ['多才多艺的；多用途的', '/ˈvɜːrsətl/', 'adj.'],
  vulnerable: ['脆弱的；易受伤害的', '/ˈvʌlnərəbl/', 'adj.'],
};

export function normalizeWord(value) {
  if (typeof value !== 'string') throw new Error('请输入一个英文单词或短语。');
  const word = value.trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ');
  if (!word || word.length > 80 || !/^[a-z]+(?:[ '-][a-z]+)*$/.test(word)) {
    throw new Error('请输入英文单词或短语，最多 80 个字符。');
  }
  return word;
}

export const lookup = (word) => glossary[word] || ['', '', ''];
export const makeId = () => globalThis.crypto.randomUUID();

export function recordForgotten(words, value, now = Date.now()) {
  const word = normalizeWord(value);
  const previous = words.find(w => w.word === word);
  if (!previous && words.length >= MAX_WORDS) throw new Error('词本已达 10,000 词，请先导出备份。');
  const [meaning, phonetic, pos] = lookup(word);
  const entry = previous ? {...previous} : {
    id: makeId(), word, meaning, phonetic, pos, note: '',
    lapses: 0, stage: 0, streak: 0, createdAt: now, history: [],
  };
  entry.lapses += 1;
  entry.stage = 0;
  entry.streak = 0;
  entry.dueAt = now;
  entry.updatedAt = now;
  entry.history = [...entry.history, {id: makeId(), type: 'forgot', at: now}].slice(-500);
  return {entry, words: previous ? words.map(w => w.id === entry.id ? entry : w) : [...words, entry]};
}

export function reviewWord(words, id, remembered, now = Date.now()) {
  const previous = words.find(w => w.id === id);
  if (!previous) throw new Error('这个词已不在词本里，请重新开始复习。');
  const entry = {...previous, updatedAt: now};
  if (remembered) {
    entry.stage = Math.min(INTERVALS.length, entry.stage + 1);
    entry.streak += 1;
    entry.dueAt = now + INTERVALS[entry.stage - 1] * DAY;
  } else {
    entry.lapses += 1;
    entry.stage = 0;
    entry.streak = 0;
    entry.dueAt = now + 10 * 60000;
  }
  entry.history = [...entry.history, {id: makeId(), type: remembered ? 'remembered' : 'forgot', at: now}].slice(-500);
  return {entry, words: words.map(w => w.id === id ? entry : w)};
}

export function dueWords(words, now = Date.now()) {
  return words.filter(w => w.dueAt <= now).sort((a, b) => b.lapses - a.lapses || a.dueAt - b.dueAt);
}

const stringField = (value, limit, label) => {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > limit) throw new Error(`备份中的${label}格式有误。`);
  return value;
};

export function validateBackup(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.words) || data.words.length > MAX_WORDS) {
    throw new Error('这不是有效的拾词备份，请选择从「备份」导出的 JSON 文件。');
  }
  const keys = new Set();
  const ids = new Set();
  return data.words.map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('备份中的词条格式有误。');
    const word = normalizeWord(raw.word);
    if (keys.has(word)) throw new Error('备份中存在重复词条。');
    keys.add(word);
    for (const key of ['createdAt', 'updatedAt', 'dueAt']) {
      if (!Number.isSafeInteger(raw[key]) || raw[key] < 0 || raw[key] > 8640000000000000) throw new Error('备份中的日期格式有误。');
    }
    if (!Number.isSafeInteger(raw.lapses) || raw.lapses < 1 || raw.lapses > 10000000 ||
        !Number.isInteger(raw.stage) || raw.stage < 0 || raw.stage > 6 ||
        !Number.isSafeInteger(raw.streak) || raw.streak < 0 || raw.streak > 10000000) throw new Error('备份中的记忆进度格式有误。');
    if (typeof raw.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(raw.id) || ids.has(raw.id)) throw new Error('备份中的词条编号有误。');
    ids.add(raw.id);
    if (!Array.isArray(raw.history) || raw.history.length > 500) throw new Error('备份中的记录格式有误。');
    const history = raw.history.map(event => {
      if (!event || !['forgot', 'remembered'].includes(event.type) || !Number.isSafeInteger(event.at) || event.at < 0 || event.at > 8640000000000000 ||
          typeof event.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(event.id)) throw new Error('备份中的历史记录格式有误。');
      return {id: event.id, type: event.type, at: event.at};
    });
    return {
      id: raw.id, word,
      meaning: stringField(raw.meaning, 1000, '词义'),
      phonetic: stringField(raw.phonetic, 160, '音标'),
      pos: stringField(raw.pos, 40, '词性'),
      note: stringField(raw.note, 2000, '助记'),
      lapses: raw.lapses, stage: raw.stage, streak: raw.streak,
      createdAt: raw.createdAt, updatedAt: raw.updatedAt, dueAt: raw.dueAt, history,
    };
  });
}

export function mergeBackup(current, incoming) {
  const checked = validateBackup(incoming);
  const entries = new Map(current.map(w => [w.word, w]));
  let added = 0;
  for (const word of checked) {
    const existing = entries.get(word.word);
    if (!existing) {
      entries.set(word.word, {...word, id: makeId()});
      added += 1;
    } else {
      const latest = word.updatedAt > existing.updatedAt ? word : existing;
      const history = [...new Map([...existing.history, ...word.history].map(e => [e.id, e])).values()].sort((a, b) => a.at - b.at).slice(-500);
      entries.set(word.word, {
        ...latest, id: existing.id, history,
        lapses: Math.max(existing.lapses, word.lapses),
        meaning: latest.meaning || existing.meaning || word.meaning,
        note: latest.note || existing.note || word.note,
        createdAt: Math.min(existing.createdAt, word.createdAt),
      });
    }
  }
  if (entries.size > MAX_WORDS) throw new Error('合并后超过 10,000 词，未导入任何数据。');
  return {words: [...entries.values()], added};
}

export function exportBackup(words) {
  return {version: 1, app: '拾词', exportedAt: new Date().toISOString(), words};
}
