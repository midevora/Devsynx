import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');

console.log('Installing backend dependencies for Vercel...');
execSync('npm install --omit=dev', {
  cwd: backend,
  stdio: 'inherit',
  env: process.env,
});
console.log('Vercel build complete.');
