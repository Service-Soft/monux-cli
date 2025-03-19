
import { beforeEach, describe, expect, test } from '@jest/globals';

import { fakeEnvVariable, FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { EnvUtilities, EnvValidationErrorMessage, EnvVariable } from './env.utilities';
import { FsUtilities } from '../encapsulation';
import { KeyValue } from '../types';

const mockConstants: MockConstants = getMockConstants('env-utilities');

describe('EnvUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        await EnvUtilities.init(mockConstants.PROJECT_DIR);
    });

    test('addVariable', async () => {
        const variable: EnvVariable = fakeEnvVariable();
        await EnvUtilities.addVariable(variable, mockConstants.PROJECT_DIR);

        const lines: string[] = await FsUtilities.readFileLines(mockConstants.ENV);
        expect(lines[1]).toEqual(`${variable.key}=${variable.value}`);

        const variable2: EnvVariable = fakeEnvVariable();
        await EnvUtilities.addVariable(variable2, mockConstants.PROJECT_DIR);

        const lines2: string[] = await FsUtilities.readFileLines(mockConstants.ENV);
        expect(lines2[2]).toEqual(`${variable2.key}=${variable2.value}`);

        const globalEnvLines: string[] = await FsUtilities.readFileLines(mockConstants.GLOBAL_ENV_MODEL);

        expect(globalEnvLines[2]).toEqual(`    ${variable.key}${variable.required ? '' : '?'}: ${variable.type},`);
        expect(globalEnvLines[3]).toEqual(`    ${variable2.key}${variable2.required ? '' : '?'}: ${variable2.type}`);
    });

    test('validate', async () => {
        const variable: EnvVariable = fakeEnvVariable({ required: true, type: 'number', value: 42 });
        await EnvUtilities.addVariable(variable, mockConstants.PROJECT_DIR);
        const errorMessages: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(mockConstants.PROJECT_DIR);
        expect(errorMessages.length).toEqual(0);

        await FsUtilities.replaceInFile(mockConstants.ENV, '42', 'test');
        const errorMessages2: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(mockConstants.PROJECT_DIR);
        expect(errorMessages2.length).toEqual(1);
        expect(errorMessages2[0].value).toEqual(EnvValidationErrorMessage.NUMBER);

        await FsUtilities.updateFile(mockConstants.ENV, '', 'replace');
        const errorMessages3: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(mockConstants.PROJECT_DIR);
        expect(errorMessages3.length).toEqual(2);
        expect(errorMessages3[0].value).toEqual(EnvValidationErrorMessage.REQUIRED);

        await FsUtilities.rm(mockConstants.ENV);
        const errorMessages4: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(mockConstants.PROJECT_DIR);
        expect(errorMessages4.length).toEqual(1);
        expect(errorMessages4[0].value).toEqual(EnvValidationErrorMessage.FILE_DOES_NOT_EXIST);
    });

    test('setupProjectEnvironment', async () => {
        await EnvUtilities.setupProjectEnvironment(mockConstants.ANGULAR_APP_DIR, true, mockConstants.PROJECT_DIR);

        const environmentModelLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_ENVIRONMENT_MODEL);
        expect(environmentModelLines).toEqual([
            '/* eslint-disable jsdoc/require-jsdoc */',
            'import { GlobalEnvironment } from \'../../../../global-environment.model\';',
            '',
            '// eslint-disable-next-line typescript/typedef, unusedImports/no-unused-vars',
            'const variables = defineVariables([] as const);',
            '',
            'export type Environment = {',
            '    [key in (typeof variables)[number]]: GlobalEnvironment[key];',
            '};',
            '',
            'function defineVariables<T extends (keyof GlobalEnvironment)[]>(keys: readonly [...T]): readonly [...T] {',
            '    return keys;',
            '}'
        ]);

        const environmentLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_ENVIRONMENT);
        expect(environmentLines).toEqual([
            'import { Environment } from \'./environment.model\';',
            '',
            'export const environment: Environment = {',
            '};'
        ]);
    });
});