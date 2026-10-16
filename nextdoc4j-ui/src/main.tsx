import { migrateApplicationSettings } from './features/workspace/storage/migration';
import {
  applicationLocalStorage,
  applicationSessionStorage,
} from './features/workspace/storage/browser-storage';
import { getApplicationId } from './features/workspace/storage/identity';
import { flushPending, reportPersistenceFailure } from './features/workspace/storage/repository';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { NotificationCenter } from './components/notification-center';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/jetbrains-mono/wght-italic.css';
import '@fontsource-variable/noto-sans-sc';
import './styles.css';
import './styles/legacy-base.css';
import './styles/home.css';
import './styles/overview.css';
import './styles/models.css';
import './styles/markdown.css';
import './styles/management.css';
import './styles/operation-detail.css';
import './styles/request-parameters.css';
import './styles/response-parameters.css';
import './styles/json-examples.css';
import './styles/playground.css';
import './styles/export.css';
import './styles/dark-theme.css';
import './styles/workspace.css';
import './styles/segmented.css';
import './styles/tooltip.css';
import './styles/preferences.css';
import './styles/controls.css';
import './styles/source-editor.css';
import './styles/notifications.css';
import './styles/loading.css';
import './styles/tab-switcher.css';
import './styles/rare-ui.css';

/** Mounts after owned preferences migrate, so defaults cannot overwrite saved values.
 * @param None; uses the backend application namespace.
 * @returns Completion after React has been scheduled.
 */
async function mountApplication() {
  await migrateApplicationSettings(
    applicationLocalStorage,
    applicationSessionStorage,
    getApplicationId(),
  );
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushPending().catch(reportPersistenceFailure);
  });
  createRoot(document.querySelector('#root')!).render(
    <StrictMode>
      <App />
      <NotificationCenter />
    </StrictMode>,
  );
}
void mountApplication();
