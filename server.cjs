// This is a simple script to start the server
// Run with: node server.js

const { spawn } = require('child_process');
const path = require('path');

// Start the server
const server = spawn('node', [path.join(__dirname, 'server', 'server.js')], {
  stdio: 'inherit',
  shell: true
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle errors
server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping server...');
  server.kill('SIGINT');
  process.exit(0);
});

console.log('Server started. Press Ctrl+C to stop.');