/** Creates deterministic searchable API choices without checking in large fixtures.
 * @param count Number of interface options.
 * @returns Distinct paths and descriptions, including HTTP method tags.
 */
export const createPerformanceOptions = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    value: `GET /items/${index}`,
    label: `/items/${index}`,
    tag: 'GET',
    description: `接口 ${index}`,
  }));

/** Creates complete JSON with a sentinel beyond the preview boundary.
 * @param mebibytes Minimum ASCII source size in MiB.
 * @returns Valid JSON whose final field verifies that business data was not truncated.
 */
export const createLargeResponse = (mebibytes: number): string =>
  JSON.stringify({ content: 'x'.repeat(Math.ceil(mebibytes * 1024 * 1024)), tail: 'complete' });
