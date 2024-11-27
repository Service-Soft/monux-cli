// eslint-disable-next-line jsdoc/require-description
/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testEnvironment: 'node',
    rootDir: 'src',
    transform: {
        '^.+.tsx?$': ['ts-jest', {}]
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    bail: true,
    modulePathIgnorePatterns: ['tmp']
};