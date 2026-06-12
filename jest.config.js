const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};

module.exports = createJestConfig(customConfig);
