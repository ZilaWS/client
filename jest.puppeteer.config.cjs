/** Jest config for Puppeteer-marked tests */
module.exports = {
  preset: 'jest-puppeteer',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.puppeteer.test.ts', '**/*.puppeteer.test.js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testTimeout: 120000,
  coverageReporters: ['json-summary','text','lcov']
};
