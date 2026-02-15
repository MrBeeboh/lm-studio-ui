#!/usr/bin/env node
// Diagnostic script for LM Studio UI stack
const http = require('http');
const { exec } = require('child_process');

function checkPort(port, name) {
  return new Promise(resolve => {
    const req = http.request({ hostname: 'localhost', port, method: 'GET', timeout: 2000 }, res => {
      resolve(`${name} (port ${port}): ONLINE (status ${res.statusCode})`);
    });
    req.on('error', () => {
      resolve(`${name} (port ${port}): OFFLINE`);
    });
    req.end();
  });
}

function checkVite() {
  return new Promise(resolve => {
    exec('npm run dev -- --port 5173 --dry-run', (err, stdout, stderr) => {
      if (err) {
        resolve('Vite dev server: ERROR - ' + stderr);
      } else {
        resolve('Vite dev server: READY');
      }
    });
  });
}

async function main() {
  const results = [];
  results.push(await checkPort(1234, 'LM Studio Server'));
  results.push(await checkPort(5173, 'Vite Dev Server'));
  results.push(await checkVite());
  console.log('--- DIAGNOSTICS ---');
  results.forEach(r => console.log(r));
}

main();
