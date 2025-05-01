
// eslint-disable-next-line jsdoc/require-description
/** @type {import('ts-jest').JestConfigWithTsJest} **/
const config = {
    testEnvironment: 'node',
    rootDir: 'src',
    transform: {
        '^.+.tsx?$': ['ts-jest', {}]
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    bail: false,
    modulePathIgnorePatterns: ['tmp'],
    // coverage
    collectCoverage: true,
    coverageProvider: 'v8',
    coverageDirectory: '<rootDir>/__testing__/coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/mock/',
        '/sandbox/'
    ]
};

export default config;