import path from 'node:path';
import { repoRoot, run } from '../common.mjs';
import { demoProfiles } from './demo-profiles.mjs';

function optionValue(name) {
  const equals = process.argv.find((value) => value.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readBoolean(value, name, fallback) {
  if (value === undefined) return fallback;
  if (/^(true|1)$/i.test(value)) return true;
  if (/^(false|0)$/i.test(value)) return false;
  throw new Error(`${name} must be true or false`);
}

const configuredProfiles =
  optionValue('--profiles') ||
  process.env.NEXTDOC4J_TEST_PROFILES ||
  Object.keys(demoProfiles).join(',');
if (process.argv.includes('--skip-ui-build') || process.argv.includes('--no-build-ui')) {
  throw new Error('Use --build-ui=true or --build-ui=false');
}
const profileNames = [
  ...new Set(
    configuredProfiles
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ),
];
const unknown = profileNames.filter((name) => !demoProfiles[name]);
if (unknown.length > 0) {
  throw new Error(`Unknown test profile(s): ${unknown.join(', ')}`);
}
if (profileNames.length === 0) {
  throw new Error('At least one test profile is required');
}

const buildUi = readBoolean(
  optionValue('--build-ui') ?? process.env.NEXTDOC4J_PREVIEW_BUILD_UI,
  '--build-ui',
  true,
);
if (buildUi) {
  await run(process.execPath, [path.join(repoRoot, 'release', 'buildui', 'build-ui.mjs')]);
}

for (const profile of profileNames) {
  await run(process.execPath, [
    path.join(repoRoot, 'release', 'test', 'test-preview.mjs'),
    `--profile=${profile}`,
    '--build-ui=false',
    '--keep-alive=false',
  ]);
}

console.log(`\nDemo matrix passed: ${profileNames.join(', ')}`);
