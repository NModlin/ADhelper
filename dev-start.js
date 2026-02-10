const { spawn, execSync } = require('child_process');

console.log('========================================');
console.log('  ADHelper Desktop App - Dev Mode');
console.log('========================================\n');

// Step 1: Rebuild main process + preload to prevent stale dist/
console.log('[1/3] Building main process & preload (npm run build:main)...');
try {
  execSync('npm run build:main', { stdio: 'inherit' });
  console.log('      Build complete.\n');
} catch (err) {
  console.error('Main process build failed — aborting dev start.');
  process.exit(1);
}

// Step 2: Start Vite dev server
console.log('[2/3] Starting Vite dev server...');

const vite = spawn('npm', ['run', 'dev:vite'], {
  shell: true,
  stdio: 'inherit'
});

// Step 3: Wait for Vite then start Electron
console.log('[3/3] Waiting 3 seconds for Vite to start...\n');

setTimeout(() => {
  console.log('========================================');
  console.log('  Starting Electron...');
  console.log('========================================\n');

  const electron = spawn('npx', ['electron', '.'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electron.on('close', (code) => {
    console.log(`\nElectron exited with code ${code}`);
    console.log('Stopping Vite server...');
    vite.kill();
    process.exit(code);
  });

  electron.on('error', (err) => {
    console.error('Failed to start Electron:', err);
    vite.kill();
    process.exit(1);
  });
}, 3000);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  vite.kill();
  process.exit();
});

// Handle Vite errors
vite.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

