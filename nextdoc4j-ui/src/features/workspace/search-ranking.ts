import type { SearchEntry } from './search-index';

const methodKeywords = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
  'connect',
]);

interface SearchDetail {
  label: string;
  value: string;
  normalized: string;
  weight: number;
}
// Immutable entries share normalized text across keystrokes and result rendering.
const normalizedEntries = new WeakMap<
  SearchEntry,
  {
    title: string;
    path: string;
    segments: string[];
    details: SearchDetail[];
  }
>();

/** Normalizes only authorized fields once for each indexed entry.
 * @param entry Interface, model or additional document metadata.
 * @returns Cached identity fields and weighted supplemental search fields.
 */
function normalizeEntry(entry: SearchEntry) {
  const cached = normalizedEntries.get(entry);
  if (cached) return cached;
  const fields: Array<[string, string | undefined, number]> =
    entry.kind === 'api'
      ? [
          ['接口标识', entry.operationId, 30],
          ['接口说明', entry.description, 20],
          ['接口标签', entry.tags?.join(' '), 15],
        ]
      : entry.kind === 'model'
        ? [['实体说明', entry.description, 20]]
        : [
            ['文档分组', entry.group, 15],
            ['正文', entry.content, 10],
          ];
  const title = entry.title.toLowerCase();
  const path = entry.path.toLowerCase();
  const value = {
    title,
    path,
    segments: path.split('/').filter(Boolean),
    details: fields.flatMap(([label, value, weight]) =>
      value ? [{ label, value, weight, normalized: value.toLowerCase() }] : [],
    ),
  };
  normalizedEntries.set(entry, value);
  return value;
}

/** Identifies standalone HTTP method filters without interpreting substrings as methods.
 * @param word Lowercase whitespace-delimited query token.
 * @returns Whether the token selects an exact HTTP method.
 */
export const isSearchMethod = (word: string) => methodKeywords.has(word);

/** Builds the same literal matching rule for ranking and keyword highlighting.
 * @param word Lowercase query token.
 * @returns Escaped regex source; HTTP method names require independent word boundaries.
 */
export function searchWordPattern(word: string): string {
  const literal = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return isSearchMethod(word) ? `(?<![\\p{L}\\p{N}_])${literal}(?![\\p{L}\\p{N}_])` : literal;
}

const methodPatterns = new Map(
  [...methodKeywords].map((word) => [word, new RegExp(searchWordPattern(word), 'u')]),
);

/** Scores identity and supplemental fields, preferring direct title and path matches.
 * @param entry Indexed API, model or document metadata.
 * @param words Lowercase query tokens, all of which must match.
 * @returns Negative one for a mismatch; otherwise a relevance score favoring exact names and path segments.
 */
export function scoreSearchEntry(entry: SearchEntry, words: string[]): number {
  const { title, path, details, segments } = normalizeEntry(entry);
  let score = 0;
  for (const word of words) {
    if (isSearchMethod(word)) {
      const pattern = methodPatterns.get(word)!;
      if (
        !pattern.test(title) &&
        !pattern.test(path) &&
        !details.some((detail) => pattern.test(detail.normalized))
      ) {
        if (entry.kind !== 'api' || entry.method.toLowerCase() !== word) return -1;
        score += 80;
        continue;
      }
    }
    if (title === word || path === word) score += 300;
    else if (segments.includes(word)) score += segments.at(-1) === word ? 160 : 120;
    else if (title.startsWith(word) || path.startsWith(word)) score += 100;
    else if (title.includes(word) || path.includes(word)) score += 40;
    else {
      const detail = details.find((item) =>
        isSearchMethod(word)
          ? methodPatterns.get(word)!.test(item.normalized)
          : item.normalized.includes(word),
      );
      if (!detail) return -1;
      score += detail.weight;
    }
  }
  const phrase = words.join(' ');
  if (phrase && (title === phrase || path === phrase)) score += 300;
  return score;
}

/** Explains a metadata or body match with a short, safely rendered excerpt.
 * @param entry Matching result with cached supplemental fields.
 * @param query Current whitespace-separated search phrase.
 * @returns A labeled excerpt near the first match, or undefined for identity-only matches.
 */
export function getSearchMatchSummary(
  entry: SearchEntry,
  query: string,
): { label: string; text: string } | undefined {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  for (const detail of normalizeEntry(entry).details) {
    let position = -1;
    for (const word of words) {
      const index = isSearchMethod(word)
        ? detail.normalized.search(methodPatterns.get(word)!)
        : detail.normalized.indexOf(word);
      if (index >= 0 && (position < 0 || index < position)) position = index;
    }
    if (position < 0) continue;
    const start = Math.max(0, position - 32);
    const end = Math.min(detail.value.length, start + 160);
    return {
      label: detail.label,
      text: `${start ? '…' : ''}${detail.value.slice(start, end).replace(/\s+/g, ' ')}${end < detail.value.length ? '…' : ''}`,
    };
  }
  return undefined;
}

export interface RankedSearchEntry {
  entry: SearchEntry;
  score: number;
}

/** Keeps the best 80 candidates in stable relevance order without sorting all matches.
 * @param bucket Bounded result category to update.
 * @param candidate Matching entry and its calculated score.
 * @returns Nothing; inserts by score, shorter path and stable identity, evicting the weakest candidate.
 */
export function retainSearchCandidate(
  bucket: RankedSearchEntry[],
  candidate: RankedSearchEntry,
): void {
  let low = 0;
  let high = bucket.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const other = bucket[middle];
    const precedes =
      candidate.score > other.score ||
      (candidate.score === other.score &&
        (candidate.entry.path.length < other.entry.path.length ||
          (candidate.entry.path.length === other.entry.path.length &&
            candidate.entry.id < other.entry.id)));
    if (precedes) high = middle;
    else low = middle + 1;
  }
  if (low >= 80) return;
  bucket.splice(low, 0, candidate);
  if (bucket.length > 80) bucket.pop();
}
