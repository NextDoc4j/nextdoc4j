import { operationIdentity, parseScopeToken } from './identity';
import { patchOperationDraft, readOperationDraft, clearOperationDrafts } from './repository';
import { sanitizeDebugDraft, type DebugDraft } from '../../playground/draft';
import type { DebugSessionCache } from '../../playground/session-cache';

/** Decodes the existing component key boundary into a typed persistent identity.
 * @param key Draft key carrying an application/service token instead of a request prefix.
 * @returns Operation identity and body media type.
 */
export const decodeDraftIdentity = (key: string) => {
  const [scope, method, path, media] = key
    .slice('nextdoc4j:workspace:draft:'.length)
    .split(':')
    .map(decodeURIComponent);
  return { identity: operationIdentity(parseScopeToken(scope), method, path), media };
};
/** Restores one body type with shared request parameters from a hydrated interface.
 * @param key Component draft key.
 * @param defaults Current document defaults for an unvisited media type.
 * @returns Sanitized request draft, or undefined for a first visit.
 */
export const readPersistentDebugDraft = (
  key: string,
  defaults?: DebugDraft,
): DebugDraft | undefined => {
  const { identity, media } = decodeDraftIdentity(key);
  const draft = readOperationDraft(identity);
  const body = draft?.bodies[media] ?? (draft?.common ? defaults : undefined);
  if (!body) return undefined;
  return sanitizeDebugDraft({
    ...body,
    headers: [],
    pathParams: [],
    queryParams: [],
    ...draft?.common,
  });
};
/** Saves one body branch and shared parameters without adding LocalStorage keys.
 * @param key Component draft key.
 * @param value Current request input after authentication filtering.
 * @returns Nothing; repository queues changed fields.
 */
export const writePersistentDebugDraft = (key: string, value: DebugDraft) => {
  const { identity, media } = decodeDraftIdentity(key);
  const { body, formFields, urlEncodedFields, ...common } = sanitizeDebugDraft(value);
  patchOperationDraft(identity, {
    common,
    bodies: { [media]: { body, formFields, urlEncodedFields } },
  });
};
/** Reads non-credential overrides belonging to an interface.
 * @param key Operation-wide component key.
 * @returns Previously sanitized overrides.
 */
export const readPersistentDebugSession = (key: string) =>
  readOperationDraft(decodeDraftIdentity(key).identity)?.session;
/** Saves sanitized non-credential overrides in the same interface record.
 * @param key Operation-wide component key.
 * @param session Override fields whose authentication values were already removed.
 * @returns Nothing; updates the persistent queue.
 */
export const writePersistentDebugSession = (key: string, session: DebugSessionCache) =>
  patchOperationDraft(decodeDraftIdentity(key).identity, { session });
/** Explicitly clears all body types and ordinary overrides for one interface.
 * @param key Operation-wide component key.
 * @returns Completion after the clear transaction commits.
 */
export const clearPersistentDebugOperation = (key: string) =>
  clearOperationDrafts(decodeDraftIdentity(key).identity);
