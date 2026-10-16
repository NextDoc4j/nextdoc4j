import path from 'node:path';
import {
  backendPom,
  mavenSettingsArgs,
  repoRoot,
  run,
  rootPom,
  runMaven,
  runPnpm,
} from './common.mjs';

const args = [...process.argv.slice(2)];
if (args[0] === '--') {
  args.shift();
}
const settingsIndex = args.findIndex((value) => value === '--settings');
let settingsPath;
if (settingsIndex >= 0) {
  settingsPath = args[settingsIndex + 1];
  if (!settingsPath) {
    throw new Error('--settings requires a Maven settings.xml path');
  }
  args.splice(settingsIndex, 2);
}

const skipChecks =
  args.includes('--skip-checks') ||
  /^(1|true|yes)$/i.test(process.env.NEXTDOC4J_PUBLISH_SKIP_CHECKS || '');
if (skipChecks) {
  args.splice(args.indexOf('--skip-checks'), 1);
}

if (args.length > 0) {
  throw new Error(`Unknown arguments: ${args.join(' ')}`);
}

if (!skipChecks) {
  await runPnpm(['run', 'check']);
  await runPnpm(['run', 'build:backend']);
  await runMaven(['-f', rootPom, 'test']);
  await run(process.execPath, [path.join(repoRoot, 'release', 'test-preview.mjs'), '--skip-ui-build']);
}

const settingsArgs = mavenSettingsArgs(settingsPath);
await runMaven([
  '-f',
  backendPom,
  'clean',
  'deploy',
  '-Prelease',
  '-DskipTests',
  ...settingsArgs,
]);

console.log('\nMaven Central deployment command completed.');
