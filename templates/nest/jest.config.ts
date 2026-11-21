import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// path aliases, like the ones "nest g library" adds, live in tsconfig.json, so they are read from there instead of
// being repeated here
const tsconfig: ts.ParsedCommandLine | undefined = ts.getParsedCommandLineOfConfigFile(
    './tsconfig.json',
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined }
);

const config: Config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: String.raw`.*\.spec\.ts$`,
    transform: {
        [String.raw`^.+\.(t|j)s$`]: 'ts-jest'
    },
    moduleNameMapper: pathsToModuleNameMapper(tsconfig?.options.paths ?? {}, { prefix: '<rootDir>/' }),
    collectCoverageFrom: ['src/**/*.(t|j)s', 'libs/**/*.(t|j)s', 'apps/**/*.(t|j)s'],
    coverageDirectory: './coverage',
    testEnvironment: 'node'
};

export default config;
