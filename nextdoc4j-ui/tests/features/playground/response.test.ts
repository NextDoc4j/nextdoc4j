import { describe, expect, it } from 'vitest';

import { parseDebugResponse, parseSseEventBlock } from '../../../src/features/playground/response';

describe('playground response utilities', () => {
  it('parses JSON, XML and binary responses by content type', async () => {
    await expect(
      parseDebugResponse(
        new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }),
      ),
    ).resolves.toMatchObject({ data: { ok: true }, kind: 'json' });

    await expect(
      parseDebugResponse(
        new Response('<root />', { headers: { 'content-type': 'application/xml' } }),
      ),
    ).resolves.toMatchObject({ data: '<root />', kind: 'xml' });

    await expect(
      parseDebugResponse(new Response('file', { headers: { 'content-type': 'application/pdf' } })),
    ).resolves.toMatchObject({ kind: 'binary', size: 4 });
  });

  it('parses structured SSE frames and ignores comment-only frames', () => {
    expect(
      parseSseEventBlock('id: 7\nevent: progress\ndata: {"step":1}\ndata: done', 3, '12:00:00'),
    ).toEqual({
      data: '{"step":1}\ndone',
      event: 'progress',
      id: '7',
      parsed: undefined,
      sequence: 3,
      time: '12:00:00',
    });
    expect(parseSseEventBlock(': keepalive', 1, '12:00:00')).toBeNull();
  });
});

it.each(['inline', ' INLINE ; filename="a.json"', 'unknown', 'inline; filename="attachment.json"'])(
  'keeps %s JSON displayable',
  async (disposition) => {
    await expect(
      parseDebugResponse(
        new Response('{"ok":true}', {
          headers: {
            'content-type': 'application/json',
            'content-disposition': disposition,
          },
        }),
      ),
    ).resolves.toMatchObject({ kind: 'json', data: { ok: true } });
  },
);
it('downloads attachment text regardless of token casing', async () => {
  await expect(
    parseDebugResponse(
      new Response('complete', {
        headers: {
          'content-type': 'text/plain',
          'content-disposition': ' ATTACHMENT ; filename="a.txt"',
        },
      }),
    ),
  ).resolves.toMatchObject({ kind: 'binary', size: 8 });
});

it('preserves full large JSON for workflows while allowing bounded multibyte previews', async () => {
  const { truncateResponsePreview } =
    await import('../../../src/features/playground/response-preview');
  const text = JSON.stringify({ content: '中文🚀'.repeat(200000), tail: 'complete' });
  const parsed = await parseDebugResponse(
    new Response(text, { headers: { 'content-type': 'application/json' } }),
  );
  expect(parsed.data).toMatchObject({ tail: 'complete' });
  expect(parsed.rawText).toBe(text);
  const preview = truncateResponsePreview(text);
  expect(new TextEncoder().encode(preview).length).toBeLessThanOrEqual(256 * 1024);
  expect(preview).not.toContain('�');
});
it('does not turn cancelled response parsing into a text response', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(parseDebugResponse(new Response('{}'), controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});

it('does not split a surrogate pair at the preview character boundary', async () => {
  const { truncateResponsePreview } =
    await import('../../../src/features/playground/response-preview');
  expect(truncateResponsePreview('abc🚀tail', 4)).toBe('abc');
});
it.each(['', 'invalid', 'null', '"text"'])(
  'preserves empty or scalar JSON response %s',
  async (text) => {
    const result = await parseDebugResponse(
      new Response(text, { headers: { 'content-type': 'application/json' } }),
    );
    expect(result.rawText).toBe(text);
    expect(result.kind).toBe(text === '' || text === 'invalid' ? 'text' : 'json');
  },
);
