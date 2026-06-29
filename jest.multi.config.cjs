/** Multi-project Jest config: unit + puppeteer */
module.exports = {
  // Enable verbose by default for multi-project runs
  verbose: true,
  // Global coverage reporters (applies to merged result)
  coverageReporters: ['json-summary', 'text', 'lcov'],
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      roots: ['<rootDir>/test'],
      testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/?(*.)+(spec|test).+(ts|tsx|js)'
      ],
      // Ignore any puppeteer-designated files so they are only run in the browser project
      testPathIgnorePatterns: ['.*\\.puppeteer\\.test\\.(ts|js)$', 'puppeteer\\.test\\.(ts|js)$'],
      transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
      // Modern ts-jest config style (instead of deprecated globals usage) can be added via options array if needed.
      // Example: transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }] }
    },
    {
      displayName: 'browser',
      preset: 'jest-puppeteer',
      roots: ['<rootDir>/test'],
      // Include both *.puppeteer.test.* and a legacy puppeteer.test.* filename
      testMatch: ['**/*.puppeteer.test.ts', '**/*.puppeteer.test.js', '**/puppeteer.test.ts', '**/puppeteer.test.js'],
      transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }] }
    }
  ]
};
