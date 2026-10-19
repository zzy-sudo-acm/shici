import {lookup as coreLookup} from './model.mjs';

const cleanQuery = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ') : '';
const validQuery = value => value.length <= 80 && /^[a-z]+(?:[ '-][a-z]*)*$/.test(value);

export function collectSuggestions(entries, value, personal = [], limit = 6) {
  const prefix = cleanQuery(value);
  if (prefix.length < 2 || !validQuery(prefix)) return [];
  const matching = entries.filter(entry => entry.word.startsWith(prefix));
  const existing = personal.filter(entry => entry.word.startsWith(prefix)).sort((a,b) => b.lapses - a.lapses || b.updatedAt - a.updatedAt);
  const known = new Map(matching.map(entry => [entry.word, entry]));
  const merged = existing.map(entry => ({...known.get(entry.word), ...entry, meaning: entry.meaning || known.get(entry.word)?.meaning || '', phonetic: entry.phonetic || known.get(entry.word)?.phonetic || ''}));
  const candidates = [...merged, ...matching];
  const exact = candidates.find(entry => entry.word === prefix);
  const unique = new Map();
  for (const entry of [...(exact ? [exact] : []), ...candidates]) {
    if (!unique.has(entry.word)) unique.set(entry.word, entry);
    if (unique.size >= limit) break;
  }
  return [...unique.values()];
}

export function createDictionary({fetcher = (...args) => fetch(...args), base = new URL('./dictionary/', import.meta.url), timeout = 5000} = {}) {
  const requests = new Map();
  function load(value) {
    const query = cleanQuery(value);
    if (!validQuery(query)) return Promise.resolve([]);
    const key = query[0];
    if (requests.has(key)) return requests.get(key);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const request = (async () => {
      try {
        const response = await fetcher(new URL(`${key}.json`, base), {signal:controller.signal});
        if (!response.ok) throw new Error('词典暂时无法加载');
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('词典格式有误');
        return rows.map(row => {
          if (!Array.isArray(row) || typeof row[0] !== 'string' || !validQuery(row[0]) || row[0][0] !== key || typeof row[1] !== 'string' || !row[1] || row[1].length > 1000 || typeof row[2] !== 'string' || row[2].length > 160) throw new Error('词典格式有误');
          const [meaning, phonetic, pos] = coreLookup(row[0]);
          return {word:row[0], meaning:meaning || row[1], phonetic:phonetic || row[2], pos:pos || ''};
        });
      } catch (error) {
        requests.delete(key);
        throw new Error('词典暂时无法加载，请稍后重试。', {cause:error});
      } finally { clearTimeout(timer); }
    })();
    requests.set(key, request);
    return request;
  }
  return {
    async suggest(value, personal = []) {
      const query = cleanQuery(value);
      if (query.length < 2 || !validQuery(query)) return [];
      return collectSuggestions(await load(query), query, personal);
    },
    async lookup(value) {
      const query = cleanQuery(value);
      if (!validQuery(query)) return null;
      return (await load(query)).find(entry => entry.word === query) || null;
    },
  };
}
