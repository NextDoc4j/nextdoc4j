import type { WorkflowRuntime } from './pre-post-types';

const sessions = new Map<string, Pick<WorkflowRuntime, 'flow' | 'results'>>();
/** Reads memory-only flow state isolated to an application/service scope.
 * @param scope Stable workspace service token.
 * @returns A detached flow snapshot; run-local variables are never retained.
 */
export function readWorkflowSession(scope: string): Pick<WorkflowRuntime, 'flow' | 'results'> {
  return structuredClone(sessions.get(scope) ?? { flow: {}, results: {} });
}
/** Saves an explicitly completed flow snapshot without writing browser storage.
 * @param scope Owning service scope.
 * @param runtime Flow values and manual results to retain.
 * @returns Nothing; replaces this service's in-memory flow.
 */
export function writeWorkflowSession(
  scope: string,
  runtime: Pick<WorkflowRuntime, 'flow' | 'results'>,
): void {
  sessions.set(scope, structuredClone(runtime));
}
/** Resets the current service's auxiliary results and user-entered flow variables.
 * @param scope Owning service scope.
 * @returns Nothing; forgets the current flow.
 */
export function clearWorkflowSession(scope: string): void {
  sessions.delete(scope);
}
