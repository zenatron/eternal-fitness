// Jest setup file for exercise validation tests
// This file is run before all tests

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom matchers here if needed in the future
    }
  }
}

// Global test configuration
beforeAll(() => {
  // Setup that runs before all tests
  console.log('🏋️  Starting Exercise Library Tests...');
});

afterAll(() => {
  // Cleanup that runs after all tests
  console.log('✅ Exercise Library Tests Complete!');
});

// Increase timeout for validation tests since they process many exercises
jest.setTimeout(30000);

export {};
