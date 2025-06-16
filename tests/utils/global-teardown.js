async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  // Clean up any global resources
  // This could include cleaning test databases, stopping services, etc.
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;
