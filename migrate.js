#!/usr/bin/env node
/**
 * 🚀 Migration Script - Portal TI
 * Executa migrations do banco de dados de qualquer lugar
 */

const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, 'backend');

const migrate = spawn('npm', ['run', 'migrate'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

migrate.on('close', (code) => {
  process.exit(code);
});
