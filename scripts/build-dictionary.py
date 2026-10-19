"""Build same-origin, letter-sharded English/Chinese completion data from ECDICT."""
import csv
import gzip
import hashlib
import io
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

REVISION = 'bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b'
SOURCE = f'https://raw.githubusercontent.com/skywind3000/ECDICT/{REVISION}'
ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.impeccable' / 'dictionary-source'
OUTPUT = ROOT / 'docs' / 'dictionary'


def source_file(name):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists():
        with urlopen(Request(f'{SOURCE}/{name}', headers={'Accept-Encoding': 'gzip'}), timeout=90) as response:
            payload = response.read()
            if response.headers.get('Content-Encoding') == 'gzip':
                payload = gzip.decompress(payload)
            path.write_bytes(payload)
    return path.read_bytes()


def positive(value):
    try:
        return max(0, int(value or 0))
    except ValueError:
        return 0


def main():
    raw = source_file('ecdict.csv')
    license_text = source_file('LICENSE').decode('utf-8')
    entries = {}
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
        original = row['word'].strip()
        word = original.lower().replace('’', "'")
        if len(word) > 80 or not re.fullmatch(r"[a-z]+(?:[ '-][a-z]+)*", word):
            continue
        translation = row.get('translation', '').replace('\\n', '\n').strip()
        if not re.search('[\u3400-\u9fff]', translation):
            continue
        frequency = [n for n in [positive(row.get('frq')), positive(row.get('bnc'))] if n]
        tags = set(row.get('tag', '').split())
        # Retain common/exam words rather than technical names from the full 770k corpus.
        if not frequency and not tags and not positive(row.get('collins')) and not positive(row.get('oxford')):
            continue
        meaning = '；'.join(line.strip() for line in translation.splitlines()[:5] if line.strip())[:1000]
        phonetic = row.get('phonetic', '').strip().strip('/')[:158]
        if phonetic:
            phonetic = f'/{phonetic}/'
        rank = min(frequency) if frequency else 250000
        if original != word:
            rank += 300000  # Prefer ordinary words over names and capitalized abbreviations.
        if tags:
            rank = min(rank, 200000)
        item = [word, meaning, phonetic, '', rank]
        if word not in entries or rank < entries[word][4]:
            entries[word] = item
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sizes = {}
    for letter in 'abcdefghijklmnopqrstuvwxyz':
        items = sorted((entry for word, entry in entries.items() if word.startswith(letter)), key=lambda item: (item[4], len(item[0]), item[0]))
        # Array order carries frequency; no rank or unused part-of-speech column on the wire.
        data = [[word, meaning, phonetic] for word, meaning, phonetic, _, rank in items]
        path = OUTPUT / f'{letter}.json'
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        sizes[letter] = {'words': len(data), 'bytes': path.stat().st_size}
    (OUTPUT / 'LICENSE-ECDICT.txt').write_text(license_text, encoding='utf-8')
    metadata = {
        'name': 'ECDICT', 'source': 'https://github.com/skywind3000/ECDICT',
        'revision': REVISION, 'license': 'MIT', 'source_sha256': hashlib.sha256(raw).hexdigest(),
        'words': len(entries), 'shards': sizes,
        'selection': 'Chinese definitions; frequency, exam, Collins or Oxford tagged entries; normalized English words and phrases',
    }
    (OUTPUT / 'source.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'words': len(entries), 'total_bytes': sum(s['bytes'] for s in sizes.values()), 'largest_shard': max(s['bytes'] for s in sizes.values())}))


if __name__ == '__main__':
    main()
