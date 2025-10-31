#!/usr/bin/env node
// lib/__tests__/run-tests.js
// Simple test runner

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFile = join(__dirname, 'indicators.test.js');

console.log('Starting test runner...\n');

const testProcess = spawn('node', [testFile], {
  stdio: 'inherit',
  shell: true
});

testProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Test suite completed successfully');
    process.exit(0);
  } else {
    console.error('\n❌ Test suite failed');
    process.exit(1);
  }
});

testProcess.on('error', (error) => {
  console.error('Failed to run tests:', error);
  process.exit(1);
});
