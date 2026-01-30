const { spawn } = require('child_process');

console.log('========================================');
console.log('  ADHelper Desktop App - Dev Mode');
console.log('========================================\n');

console.log('Starting Vite dev server...');

// Start Vite
const vite = spawn('npm', ['run', 'dev:vite'], {
  shell: true,
  stdio: 'inherit'
});

// Simple delay-based startup - wait 3 seconds for Vite to start
console.log('Waiting 3 seconds for Vite to start...\n');

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

