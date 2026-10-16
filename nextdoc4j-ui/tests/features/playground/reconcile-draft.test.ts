import { describe, expect, it } from 'vitest';
import {
  reconcileDraft,
  reconcileParameters,
} from '../../../src/features/playground/reconcile-draft';
import type { DebugDraft } from '../../../src/features/playground/draft';

/** Creates a draft fixture with JSON input and no parameter rows.
 * @param value JSON-compatible body example.
 * @returns A request draft for document-update scenarios.
 */
const draft = (value: unknown): DebugDraft => ({
  body: JSON.stringify(value),
  headers: [],
  pathParams: [],
  queryParams: [],
  formFields: [],
  urlEncodedFields: [],
});

describe('background document updates', () => {
  it('removes renamed and deleted fields while retaining edits and custom nested values', () => {
    const old = draft({
      name: '',
      removed: '',
      profile: { age: 0, deleted: '' },
      items: [{ id: 0, removed: '' }],
    });
    const next = draft({
      nameNana: '',
      profile: { age: 0, added: true },
      items: [{ id: 0, added: false }],
    });
    const current = draft({
      name: 'edited old field',
      removed: 'old',
      custom: 1,
      profile: { age: 22, deleted: 'old', custom: 'keep' },
      items: [{ id: 1, removed: 'x' }, { id: 2 }],
    });
    expect(JSON.parse(reconcileDraft(current, old, next).body)).toEqual({
      nameNana: '',
      custom: 1,
      profile: { age: 22, added: true, custom: 'keep' },
      items: [
        { id: 1, added: false },
        { id: 2, added: false },
      ],
    });
  });
  it('preserves unfinished JSON and custom non-JSON bodies', () => {
    const old = draft({ name: '' });
    const next = draft({ renamed: '' });
    for (const body of ['{"editing":', '<custom/>', '']) {
      expect(reconcileDraft({ ...old, body }, old, next).body).toBe(body);
    }
  });
  it('updates unedited examples but keeps explicitly omitted unchanged fields', () => {
    const old = draft({ count: 1, omitted: '' });
    const next = draft({ count: 2, omitted: '', added: 3 });
    expect(reconcileDraft(old, old, next).body).toBe(next.body);
    expect(JSON.parse(reconcileDraft(draft({ count: 7 }), old, next).body)).toEqual({
      count: 7,
      added: 3,
    });
  });
  it('reconciles rows by name, preserves custom rows, and treats header names case-insensitively', () => {
    const row = (name: string, value: string) => ({ name, value, enabled: true });
    expect(
      reconcileParameters(
        [row('X-Token', 'edited'), row('Old', 'edited'), row('Custom', 'keep')],
        [row('X-Token', ''), row('Old', '')],
        [row('x-token', 'new default'), row('Added', 'new')],
        true,
      ),
    ).toEqual([row('x-token', 'edited'), row('Custom', 'keep'), row('Added', 'new')]);
  });
});
