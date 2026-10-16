import { describe, expect, it } from 'vitest';

import { debugDocument } from '../../fixtures/openapi-documents';
import { getOperations } from '../../../src/features/openapi/utils';
import {
  createFormParameters,
  isFormContentType,
} from '../../../src/features/playground/form-parameters';

describe('playground form parameters', () => {
  it('creates editable non-binary fields from multipart request body properties', () => {
    const operation = getOperations(debugDocument).find(
      (item) => item.operationId === 'uploadFiles',
    );

    expect(createFormParameters(operation!, debugDocument, 'multipart/form-data')).toEqual([
      { contentType: 'text/plain', enabled: true, name: 'note', value: '' },
    ]);
  });

  it('recognizes form content types and initializes URL encoded fields', () => {
    const operation = getOperations(debugDocument).find(
      (item) => item.operationId === 'uploadFiles',
    );

    expect(isFormContentType('application/x-www-form-urlencoded; charset=UTF-8')).toBe(true);
    expect(isFormContentType('application/json')).toBe(false);
    expect(
      createFormParameters(operation!, debugDocument, 'application/x-www-form-urlencoded'),
    ).toEqual([{ contentType: 'text/plain', enabled: true, name: 'source', value: '' }]);
  });
});
