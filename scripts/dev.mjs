// One command for local development: installs dependencies if needed, then runs
// the backend (http://localhost:3000) and the frontend (http://localhost:5173) together.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const opts = { stdio: 'inherit', shell: process.platform === 'win32' };

for (const dir of ['backend', 'frontend']) {
  if (!existsSync(path.join(root, dir, 'node_modules'))) {
    console.log(`\n▶ Installing ${dir} dependencies…`);
    const r = spawnSync(npm, ['install', '--no-audit', '--no-fund'], { ...opts, cwd: path.join(root, dir) });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

const procs = [
  spawn(npm, ['run', 'dev'], { ...opts, cwd: path.join(root, 'backend') }),
  spawn(npm, ['run', 'dev'], { ...opts, cwd: path.join(root, 'frontend') }),
];
console.log('\n▶ Backend: http://localhost:3000   ▶ Frontend: http://localhost:5173\n');

const stop = () => { procs.forEach((p) => p.kill()); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', (code) => { if (code) { console.error(`A process exited with code ${code}`); stop(); } }));
