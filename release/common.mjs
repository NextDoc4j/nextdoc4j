import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseRoot = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  try {
    const content = readFileSync(path.join(releaseRoot, '.env'), 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) {
        continue;
      }
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[match[1]] === undefined) {
        process.env[match[1]] = value;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

loadDotEnv();

export const repoRoot = path.resolve(releaseRoot, '..');
export const rootPom = path.join(repoRoot, 'pom.xml');
export const backendRoot = path.join(repoRoot, 'nextdoc4j');
export const backendPom = path.join(backendRoot, 'pom.xml');
export const uiRoot = path.join(repoRoot, 'nextdoc4j-ui');
export const demoMonolithModule =
  'nextdoc4j-demo/nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-monolith';
export const demoMonolithRoot = path.join(repoRoot, demoMonolithModule);
export const demoJar = path.join(
  demoMonolithRoot,
  'target',
  'nextdoc4j-demo-boot3-monolith.jar',
);
export const backendResources = path.join(
  backendRoot,
  'nextdoc4j-ui',
  'src',
  'main',
  'resources',
);

function executable(command) {
  if (process.platform === 'win32' && !path.extname(command) && !command.includes(path.sep)) {
    if (command === 'mvn' || command === 'pnpm') {
      return `${command}.cmd`;
    }
  }
  return command;
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((value) => (String(value).includes(' ') ? JSON.stringify(value) : value))
    .join(' ');
}

export function run(command, args = [], options = {}) {
  const {
    cwd = repoRoot,
    env = {},
    stdio = 'inherit',
  } = options;
  const resolvedCommand = executable(command);
  console.log(`\n$ ${formatCommand(resolvedCommand, args)}`);

  return new Promise((resolve, reject) => {
    const child = spawn(resolvedCommand, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio,
    });

    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${formatCommand(resolvedCommand, args)} exited with ${
            signal ? `signal ${signal}` : `code ${code}`
          }`,
        ),
      );
    });
  });
}

export function start(command, args = [], options = {}) {
  const {
    cwd = repoRoot,
    env = {},
    stdio = 'inherit',
  } = options;
  const resolvedCommand = executable(command);
  console.log(`\n$ ${formatCommand(resolvedCommand, args)}`);
  const child = spawn(resolvedCommand, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio,
  });
  child.once('error', (error) => {
    console.error(error.message);
  });
  return child;
}

export async function stop(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
      finish();
    }, 5000);
    child.once('close', () => {
      clearTimeout(timer);
      finish();
    });
    child.kill('SIGTERM');
  });
}

export function runPnpm(args, options = {}) {
  return run(process.env.PNPM_BIN || 'pnpm', args, {
    cwd: uiRoot,
    ...options,
  });
}

export function startPnpm(args, options = {}) {
  return start(process.env.PNPM_BIN || 'pnpm', args, {
    cwd: uiRoot,
    ...options,
  });
}

export function runMaven(args, options = {}) {
  return run(process.env.MAVEN_BIN || 'mvn', args, options);
}

export function startJava(args, options = {}) {
  return start(process.env.JAVA_BIN || 'java', args, options);
}

export async function assertFile(filePath, label = filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error(`${label} is not a file`);
    }
  } catch (error) {
    throw new Error(`Missing ${label}: ${filePath}`, { cause: error });
  }
}

export async function assertDirectory(directory, label = directory) {
  try {
    const directoryStat = await stat(directory);
    if (!directoryStat.isDirectory()) {
      throw new Error(`${label} is not a directory`);
    }
  } catch (error) {
    throw new Error(`Missing ${label}: ${directory}`, { cause: error });
  }
}

function request(url, timeoutMs) {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const requestObject = client.get(url, (response) => {
      const chunks = [];
      response.setEncoding('utf8');
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          status: response.statusCode ?? 0,
          body: chunks.join(''),
          headers: response.headers,
        });
      });
    });
    requestObject.setTimeout(timeoutMs, () => requestObject.destroy(new Error('timeout')));
    requestObject.on('error', reject);
  });
}

export async function fetchHttp(url, options = {}) {
  const { timeoutMs = 5000 } = options;
  return request(url, timeoutMs);
}

export async function waitForHttp(url, options = {}) {
  const {
    timeoutMs = 60000,
    intervalMs = 500,
    isReady = (response) => response.status >= 200 && response.status < 500,
  } = options;
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetchHttp(url, { timeoutMs: Math.min(Math.max(intervalMs * 4, 5000), 10000) });
      if (isReady(response)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'unknown error'}`);
}

export async function assertHttp(url, label = url) {
  const response = await fetchHttp(url);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  return response;
}

export function mavenSettingsArgs(settingsPath) {
  const configuredSettings = settingsPath || process.env.NEXTDOC4J_MAVEN_SETTINGS || process.env.MAVEN_SETTINGS;
  return configuredSettings ? ['-s', configuredSettings] : [];
}
