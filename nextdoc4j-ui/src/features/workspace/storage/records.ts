import type { WorkspaceTab } from '../tabs';
import type { HashRouteState } from '../../../lib/hash-route';
import type { DebugDraft } from '../../playground/draft';
import type { DebugSessionCache } from '../../playground/session-cache';
import type { WorkspaceScope, OperationIdentity } from './identity';
import type { PersistedOperationDetailSelectionState } from '../../documentation/detail-state';

export interface RecordVersion {
  schemaVersion: number;
  revision: number;
  updatedAt: number;
}
export interface WorkspaceRecord extends WorkspaceScope, RecordVersion {
  tabs: WorkspaceTab[];
  activeRoute?: string;
}
export interface OperationStateRecord extends OperationIdentity, RecordVersion {
  page?: 'detail' | 'debug';
  lastRoute?: string;
  lastEntry?: { documentUrl: string; tag?: string };
  scroll?: { detail?: number };
  debug?: Pick<HashRouteState, 'debugTab' | 'debugBody' | 'debugTabExplicit'>;
  detailByDocument: Record<string, PersistedOperationDetailSelectionState>;
}
export interface DebugDraftRecord extends OperationIdentity, RecordVersion {
  common?: Pick<DebugDraft, 'headers' | 'pathParams' | 'queryParams'>;
  session?: DebugSessionCache;
  bodies: Record<string, Pick<DebugDraft, 'body' | 'formFields' | 'urlEncodedFields'>>;
}
export interface ClearGeneration {
  app: number;
  service: number;
  operation: number;
}
