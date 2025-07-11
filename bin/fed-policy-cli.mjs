#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const cliPath = join(projectRoot, 'src', 'cli.tsx');

// Forward all arguments to tsx with the CLI script
const args = ['tsx', cliPath, ...process.argv.slice(2)];

const child = spawn('npx', args, {
  stdio: 'inherit',
  cwd: projectRoot,
  env: process.env
});

child.on('close', (code) => {
  process.exit(code);
});