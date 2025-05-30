import { beforeEach, describe, expect, test } from '@jest/globals';

import { fakeEnvVariable, FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { EnvUtilities, EnvValidationErrorMessage, EnvVariable } from './env.utilities';
import { FsUtilities } from '../encapsulation';
import { KeyValue } from '../types';
import { DefaultEnvKeys } from './default-environment-keys';
import { GLOBAL_ENVIRONMENT_MODEL_FILE_NAME } from '../constants';
import { getPath, Path } from '../utilities';

const mockConstants: MockConstants = getMockConstants('env-utilities');

describe('EnvUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, []);
        await EnvUtilities.init('test.com', 'test-staging.com', 'user', 'password');
    });

    test('addStaticVariable', async () => {
        for (let i: number = 0; i < 50; i++) {
            await FileMockUtilities.setup(mockConstants, []);
            await EnvUtilities.init('test.com', 'test-staging.com', 'user', 'password');

            const variable: EnvVariable = fakeEnvVariable();
            await EnvUtilities.addStaticVariable(variable, true);

            const lines: string[] = await FsUtilities.readFileLines(mockConstants.ENV_PUBLIC);
            const firstCustomLineIndex: number = 2;
            expect(lines[firstCustomLineIndex]).toEqual(`${variable.key}=${variable.value}`);

            const variable2: EnvVariable = fakeEnvVariable();
            await EnvUtilities.addStaticVariable(variable2, false);

            const lines2: string[] = await FsUtilities.readFileLines(mockConstants.ENV);
            expect(lines2[firstCustomLineIndex]).toEqual(`${variable2.key}=${variable2.value}`);

            const globalEnvLines: string[] = await FsUtilities.readFileLines(mockConstants.GLOBAL_ENV_MODEL);

            expect(globalEnvLines[9]).toEqual(`    ${variable.key}${variable.required ? '' : '?'}: ${variable.type},`);
            expect(globalEnvLines[10]).toEqual(`    ${variable2.key}${variable2.required ? '' : '?'}: ${variable2.type}`);
        }
    });

    test('addCalculatedVariable', async () => {
        const name: string = 'test';
        const port: number = 4201;
        const subDomain: string = 'admin';

        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.port(name), value: port, required: true, type: 'number' },
            true
        );
        await EnvUtilities.addCalculatedVariable(
            {
                key: DefaultEnvKeys.baseUrl(name),
                value: (env, fileName) => {
                    switch (fileName) {
                        case 'dev.docker-compose.yaml': {
                            return `http://localhost:${'PORT_PLACEHOLDER'}`;
                        }
                        case 'local.docker-compose.yaml': {
                            return `http://${'SUB_DOMAIN_PLACEHOLDER'}.localhost`;
                        }
                        case 'stage.docker-compose.yaml': {
                            return `https://${'SUB_DOMAIN_PLACEHOLDER'}.${'STAGE_ROOT_DOMAIN_PLACEHOLDER'}`;
                        }
                        case 'docker-compose.yaml': {
                            return `https://${'SUB_DOMAIN_PLACEHOLDER'}.${'PROD_ROOT_DOMAIN_PLACEHOLDER'}`;
                        }
                    }
                },
                required: true,
                type: 'string'
            }
        );
        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.subDomain(name), value: subDomain, required: true, type: 'string' },
            true
        );
        await EnvUtilities.addCalculatedVariable(
            {
                key: DefaultEnvKeys.domain(name),
                value: (env, fileName) => {
                    switch (fileName) {
                        case 'dev.docker-compose.yaml': {
                            return `localhost:${'PORT_PLACEHOLDER'}`;
                        }
                        case 'local.docker-compose.yaml': {
                            return `${'SUB_DOMAIN_PLACEHOLDER'}.localhost`;
                        }
                        case 'stage.docker-compose.yaml': {
                            return `${'SUB_DOMAIN_PLACEHOLDER'}.${'STAGE_ROOT_DOMAIN_PLACEHOLDER'}`;
                        }
                        case 'docker-compose.yaml': {
                            return `${'SUB_DOMAIN_PLACEHOLDER'}.${'PROD_ROOT_DOMAIN_PLACEHOLDER'}`;
                        }
                    }
                },
                required: true,
                type: 'string'
            }
        );

        const environmentModelFilePath: Path = getPath(mockConstants.PROJECT_DIR, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME);
        await FsUtilities.replaceAllInFile(environmentModelFilePath, '\'PORT_PLACEHOLDER\'', `env.${DefaultEnvKeys.port(name)}`);
        await FsUtilities.replaceAllInFile(environmentModelFilePath, '\'SUB_DOMAIN_PLACEHOLDER\'', `env.${DefaultEnvKeys.subDomain(name)}`);
        await FsUtilities.replaceAllInFile(environmentModelFilePath, '\'PROD_ROOT_DOMAIN_PLACEHOLDER\'', `env.${DefaultEnvKeys.PROD_ROOT_DOMAIN}`);
        await FsUtilities.replaceAllInFile(environmentModelFilePath, '\'STAGE_ROOT_DOMAIN_PLACEHOLDER\'', `env.${DefaultEnvKeys.STAGE_ROOT_DOMAIN}`);

        const fileLines: string[] = await FsUtilities.readFileLines(environmentModelFilePath);
        expect(fileLines).toEqual([
            '/**',
            '* Defines all static environment variables that need to be set in the .env-file.',
            '* This is also used by the "mx prepare" command to validate the .env-file and create the project environment.ts files',
            '*/',
            'type StaticGlobalEnvironment = {',
            '    prod_root_domain: string,',
            '    stage_root_domain: string,',
            '    basic_auth_user: string,',
            '    basic_auth_password: string,',
            '    test_port: number,',
            '    test_sub_domain: string',
            '};',
            '',
            '/**',
            '* Defines all environment variables which should be calculated based on the StaticGlobalEnvironment values.',
            '* This is also used by Monux sometimes, eg. to define baseUrls that consist of',
            '* the subdomain environment variable + baseDomain environment variable + http/https, based on the used docker compose file.',
            '*/',
            'type CalculatedGlobalEnvironment = {',
            '    env: Env,',
            '    test_base_url: string,',
            '    test_domain: string',
            '};',
            '',
            'export type GlobalEnvironment = StaticGlobalEnvironment & CalculatedGlobalEnvironment;',
            '',
            'type DockerComposeFileName = \'docker-compose.yaml\' | \'dev.docker-compose.yaml\' | \'local.docker-compose.yaml\' | \'stage.docker-compose.yaml\';',
            'type Env = \'dev\' | \'local\' | \'stage\' | \'prod\';',
            '',
            '/**',
            '* Defines how the CalculatedGlobalEnvironment values should be calculated.',
            '* This is used by the "mx prepare" command.',
            '* DON\'T CHANGE THE NAME ("calculationSchemaFor") OR FORMATTING. Otherwise Monux might not be able to detect it.',
            '*/',
            'const calculationSchemaFor: Record<',
            '    keyof CalculatedGlobalEnvironment,',
            '    (env: StaticGlobalEnvironment, fileName: DockerComposeFileName) => CalculatedGlobalEnvironment[keyof CalculatedGlobalEnvironment]',
            '> = {',
            '    env: (env, fileName) => {',
            '        switch (fileName) {',
            '            case \'dev.docker-compose.yaml\': {',
            '                return \'dev\';',
            '            }',
            '            case \'local.docker-compose.yaml\': {',
            '                return \'local\';',
            '            }',
            '            case \'stage.docker-compose.yaml\': {',
            '                return \'stage\';',
            '            }',
            '            case \'docker-compose.yaml\': {',
            '                return \'prod\';',
            '            }',
            '        }',
            '    },',
            '    test_base_url: (env, fileName) => {',
            '        switch (fileName) {',
            '            case \'dev.docker-compose.yaml\': {',
            '                return `http://localhost:${env.test_port}`;',
            '            }',
            '            case \'local.docker-compose.yaml\': {',
            '                return `http://${env.test_sub_domain}.localhost`;',
            '            }',
            '            case \'stage.docker-compose.yaml\': {',
            '                return `https://${env.test_sub_domain}.${env.stage_root_domain}`;',
            '            }',
            '            case \'docker-compose.yaml\': {',
            '                return `https://${env.test_sub_domain}.${env.prod_root_domain}`;',
            '            }',
            '        }',
            '    },',
            '    test_domain: (env, fileName) => {',
            '        switch (fileName) {',
            '            case \'dev.docker-compose.yaml\': {',
            '                return `localhost:${env.test_port}`;',
            '            }',
            '            case \'local.docker-compose.yaml\': {',
            '                return `${env.test_sub_domain}.localhost`;',
            '            }',
            '            case \'stage.docker-compose.yaml\': {',
            '                return `${env.test_sub_domain}.${env.stage_root_domain}`;',
            '            }',
            '            case \'docker-compose.yaml\': {',
            '                return `${env.test_sub_domain}.${env.prod_root_domain}`;',
            '            }',
            '        }',
            '    }',
            '};'
        ]);

        const devBaseUrl: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.baseUrl('test'), 'dev.docker-compose.yaml', getPath('.'));
        const devDomain: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.domain('test'), 'dev.docker-compose.yaml', getPath('.'));
        expect(devBaseUrl).toEqual('http://localhost:4201');
        expect(devDomain).toEqual('localhost:4201');

        const localBaseUrl: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.baseUrl('test'), 'local.docker-compose.yaml', getPath('.'));
        const localDomain: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.domain('test'), 'local.docker-compose.yaml', getPath('.'));
        expect(localBaseUrl).toEqual('http://admin.localhost');
        expect(localDomain).toEqual('admin.localhost');

        const prodBaseUrl: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.baseUrl('test'), 'docker-compose.yaml', getPath('.'));
        const prodDomain: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.domain('test'), 'docker-compose.yaml', getPath('.'));
        expect(prodBaseUrl).toEqual('https://admin.test.com');
        expect(prodDomain).toEqual('admin.test.com');
    });

    test('validate', async () => {
        const variable: EnvVariable = fakeEnvVariable({ required: true, type: 'number', value: 42 });
        await EnvUtilities.addStaticVariable(variable, false);
        const errorMessages: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(getPath('.'));
        expect(errorMessages.length).toEqual(0);

        await FsUtilities.replaceInFile(mockConstants.ENV, '42', 'test');
        const errorMessages2: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(getPath('.'));
        expect(errorMessages2.length).toEqual(1);
        expect(errorMessages2[0].value).toEqual(EnvValidationErrorMessage.NUMBER);

        await FsUtilities.updateFile(mockConstants.ENV, '', 'replace');
        const errorMessages3: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(getPath('.'));
        expect(errorMessages3.length).toEqual(3);
        expect(errorMessages3[0].value).toEqual(EnvValidationErrorMessage.REQUIRED);

        await FsUtilities.rm(mockConstants.ENV);
        const errorMessages4: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(getPath('.'));
        expect(errorMessages4.length).toEqual(1);
        expect(errorMessages4[0].value).toEqual(EnvValidationErrorMessage.FILE_DOES_NOT_EXIST);
    });

    test('setupProjectEnvironment', async () => {
        await EnvUtilities.setupProjectEnvironment(mockConstants.ANGULAR_APP_DIR, true);

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
            '/* eslint-disable cspell/spellchecker */',
            'import { Environment } from \'./environment.model\';',
            '',
            'export const environment: Environment = {',
            '};'
        ]);
    });
});