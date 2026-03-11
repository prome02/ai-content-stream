module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.claude/',
    '<rootDir>/.agent/',
    '<rootDir>/.sisyphus/',
    '<rootDir>/.gemini/',
    '<rootDir>/.opencode/',
    '<rootDir>/.roo/',
    '<rootDir>/logs/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts'
  ],
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2020',
        lib: ['dom', 'dom.iterable', 'es6'],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        module: 'esnext',
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
       jsx: 'preserve'
      }
    }
  }
}
