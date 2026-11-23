import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const staticSrc = path.join(root, 'client', 'public');
const staticOut = path.join(root, 'public');

console.log('Installing backend dependencies for Vercel...');
execSync('npm install --omit=dev', {
  cwd: backend,
  stdio: 'inherit',
  env: process.env,
});

// Vercel looks for an output directory named "public" by default.
console.log('Preparing static output at /public ...');
if (existsSync(staticOut)) {
  rmSync(staticOut, { recursive: true, force: true });
}
mkdirSync(staticOut, { recursive: true });
cpSync(staticSrc, staticOut, { recursive: true });

console.log('Vercel build complete.');
