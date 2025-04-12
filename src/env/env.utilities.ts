
import { DockerComposeFileName, ENV_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ENVIRONMENT_TS_FILE_NAME, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME } from '../constants';
import { FileLine, FsUtilities, JsonUtilities } from '../encapsulation';
import { ParseObjectResult, TsUtilities } from '../ts';
import { KeyValue, OmitStrict } from '../types';
import { getPath } from '../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../workspace';
import { DefaultEnvKeys } from './default-environment-keys';
import { EnvironmentVariableKey } from './environment-variable-key.model';

/**
 * The possible types an environment variable can have.
 */
type EnvValue = string | number | boolean | undefined;

/**
 * Definition for variable keys, split into static and calculated.
 */
type VariableKeys = {
    /**
     * All static variable keys.
     */
    static: EnvironmentVariableKey[] | undefined,
    /**
     * All calculated variable keys.
     */
    calculated: EnvironmentVariableKey[] | undefined
};

/**
 * The full data of an environment variable.
 */
export type EnvVariable = {
    /**
     * The key of the environment variable.
     */
    key: EnvironmentVariableKey,
    /**
     * The actual value of the variable.
     */
    value: EnvValue,
    /**
     * Whether or not the environment variable is required.
     */
    required: boolean,
    /**
     * The type of the environment variable.
     */
    type: 'string' | 'number' | 'boolean'
};

/**
 * The full data of an calculated environment variable.
 */
export type CalculatedEnvVariable = OmitStrict<EnvVariable, 'value'> & {
    /**
     * The value function used to calculate the actual value.
     */
    value: (env: Record<string, EnvValue>, fileName: DockerComposeFileName) => EnvValue
};

/**
 * Possible validation error messages for environment variables.
 */
export enum EnvValidationErrorMessage {
    FILE_DOES_NOT_EXIST = 'File does not exist',
    REQUIRED = 'should not be empty',
    NUMBER = 'should be a valid number',
    BOOLEAN = 'should be a valid boolean'
}

/**
 * Provides functionality around handling environment variables.
 */
export abstract class EnvUtilities {

    /**
     * Builds the environment files based on the model and the root .env file.
     * @param fileName - The docker compose file to build the variables for.
     */
    static async buildEnvironmentFiles(fileName: DockerComposeFileName): Promise<void> {
        const apps: WorkspaceProject[] = await WorkspaceUtilities.getProjects('apps');
        await Promise.all(apps.map(a => this.buildEnvironmentFileForApp(a, true, fileName)));
    }

    /**
     * Builds an environment file for the provided app.
     * @param app - The app to build the environment file for.
     * @param failOnMissingVariable - Whether or not the build should fail when a variable is missing.
     * @param fileName - The docker compose file to build the variables for.
     */
    static async buildEnvironmentFileForApp(
        app: WorkspaceProject,
        failOnMissingVariable: boolean,
        fileName: DockerComposeFileName
    ): Promise<void> {
        const environmentFolder: string = getPath(app.path, 'src', 'environment');
        const variableKeys: EnvironmentVariableKey[] = await this.getProjectVariableKeys(
            getPath(environmentFolder, ENVIRONMENT_MODEL_TS_FILE_NAME)
        );

        // TODO: The first time getPath fails here because
        await FsUtilities.rm(getPath(environmentFolder, ENVIRONMENT_TS_FILE_NAME));
        await this.createProjectEnvironmentFile(app.path, variableKeys, failOnMissingVariable, fileName);
    }

    /**
     * Adds a variable key to a project.
     * @param name - The name of the project to add the key to.
     * @param environmentModelPath - The path of the projects environment model.
     * @param variable - The variable to add.
     * @param failOnMissingVariable - Whether or not the build should fail when a variable is missing.
     */
    static async addProjectVariableKey(
        name: string,
        environmentModelPath: string,
        variable: EnvironmentVariableKey,
        failOnMissingVariable: boolean
    ): Promise<void> {
        const lines: string[] = await FsUtilities.readFileLines(environmentModelPath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, 'defineVariables(');

        // eslint-disable-next-line sonar/no-duplicate-string
        const oldValue: string = firstLine.content.includes('defineVariables([]') ? 'defineVariables([]' : 'defineVariables([';
        // eslint-disable-next-line stylistic/max-len
        const newValue: string = firstLine.content.includes('defineVariables([]') ? `defineVariables(['${variable}']` : `defineVariables(['${variable}', `;
        await FsUtilities.replaceInFile(environmentModelPath, oldValue, newValue);

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(name);
        await this.buildEnvironmentFileForApp(app, failOnMissingVariable, 'dev.docker-compose.yaml');
    }

    private static async getProjectVariableKeys(environmentModelPath: string): Promise<EnvironmentVariableKey[]> {
        const lines: string[] = await FsUtilities.readFileLines(environmentModelPath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, 'defineVariables(');
        const lastLine: FileLine = await FsUtilities.findLineWithContent(lines, ']', firstLine.index);
        if (firstLine.index === lastLine.index) {
            const content: string = firstLine.content.split('defineVariables([')[1].split(']')[0];
            const tsArrayString: string = `[${content}]`;
            return await JsonUtilities.parseAsTs(tsArrayString);
        }
        const contentLines: FileLine[] = FsUtilities.getFileLines(lines, firstLine.index + 1, lastLine.index - 1);
        const contentString: string = `[\n${contentLines.map(l => l.content).join('\n')}\n]`;
        return await JsonUtilities.parseAsTs(contentString);
    }

    /**
     * Sets up environment variables inside a project.
     * @param projectPath - The path to the project root.
     * @param disableCommentRule - Whether or not "eslint-disable jsdoc/require-jsdoc" needs to be at the start of the model.
     */
    static async setupProjectEnvironment(projectPath: string, disableCommentRule: boolean): Promise<void> {
        await FsUtilities.createFile(
            getPath(projectPath, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME),
            [
                // eslint-disable-next-line stylistic/max-len
                (disableCommentRule ? '/* eslint-disable jsdoc/require-jsdoc */\n' : '') + 'import { GlobalEnvironment } from \'../../../../global-environment.model\';',
                '',
                '// eslint-disable-next-line typescript/typedef, unusedImports/no-unused-vars',
                'const variables = defineVariables([] as const);',
                '',
                'export type Environment = {',
                '\t[key in (typeof variables)[number]]: GlobalEnvironment[key];',
                '};',
                '',
                'function defineVariables<T extends (keyof GlobalEnvironment)[]>(keys: readonly [...T]): readonly [...T] {',
                '\treturn keys;',
                '}'
            ]
        );
        await this.createProjectEnvironmentFile(projectPath, [], true, 'dev.docker-compose.yaml');
    }

    private static async createProjectEnvironmentFile(
        projectPath: string,
        variableKeys: EnvironmentVariableKey[],
        failOnMissingVariable: boolean,
        fileName: DockerComposeFileName
    ): Promise<void> {
        const variables: EnvVariable[] = await this.getEnvVariables(variableKeys, failOnMissingVariable, fileName);
        await FsUtilities.createFile(
            getPath(projectPath, 'src', 'environment', ENVIRONMENT_TS_FILE_NAME),
            [
                '/* eslint-disable cspell/spellchecker */',
                'import { Environment } from \'./environment.model\';',
                '',
                `export const environment: Environment = {${variables.map(v => this.stringifyEnvKeyValue(v)).join(',')}\n};`
            ]
        );
    }

    private static stringifyEnvKeyValue(v: EnvVariable): string {
        const q: string = v.type === 'string' ? '\'' : '';
        return `\n\t${v.key}: ${q}${v.value}${q}`;
    }

    private static async getEnvVariables(
        variableKeys: EnvironmentVariableKey[] | undefined,
        failOnMissingVariable: boolean,
        fileName: DockerComposeFileName
    ): Promise<EnvVariable[]> {
        const keys: VariableKeys = await this.splitVariableKeys(variableKeys, failOnMissingVariable);
        const staticVariables: EnvVariable[] = await this.getStaticEnvVariables(keys.static, failOnMissingVariable);
        const calculatedVariables: EnvVariable[] = await this.getCalculatedEnvVariables(
            keys.calculated,
            failOnMissingVariable,
            fileName
        );
        return [...staticVariables, ...calculatedVariables];
    }

    private static async splitVariableKeys(
        variableKeys: EnvironmentVariableKey[] | undefined,
        failOnMissingVariable: boolean
    ): Promise<VariableKeys> {
        if (variableKeys == undefined) {
            return { static: undefined, calculated: undefined };
        }
        if (!variableKeys.length) {
            return { static: [], calculated: [] };
        }

        const staticVariableDefinitions: OmitStrict<EnvVariable, 'value'>[] = await this.getVariableDefinitions(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            // eslint-disable-next-line sonar/no-duplicate-string
            'StaticGlobalEnvironment = {'
        );
        const calculatedVariableDefinitions: OmitStrict<EnvVariable, 'value'>[] = await this.getVariableDefinitions(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            // eslint-disable-next-line sonar/no-duplicate-string
            'CalculatedGlobalEnvironment = {'
        );
        const res: VariableKeys = { static: [], calculated: [] };
        for (const key of variableKeys) {
            if (staticVariableDefinitions.map(v => v.key).includes(key)) {
                res.static?.push(key);
                continue;
            }
            if (calculatedVariableDefinitions.map(v => v.key).includes(key)) {
                res.calculated?.push(key);
                continue;
            }
            if (failOnMissingVariable) {
                throw new Error(`Unknown environment variable key ${key}`);
            }
        }
        return res;
    }

    // eslint-disable-next-line sonar/cognitive-complexity
    private static async getCalculatedEnvVariables(
        variableKeys: EnvironmentVariableKey[] | undefined,
        failOnMissingVariable: boolean,
        fileName: DockerComposeFileName
    ): Promise<EnvVariable[]> {
        const staticVariables: EnvVariable[] = await this.getStaticEnvVariables(undefined, failOnMissingVariable);
        const staticVariableObject: Record<string, EnvValue> = staticVariables.reduce((p, c) => p = { ...p, [c.key]: c.value }, {});

        const calculatedVariableDefinitions: OmitStrict<EnvVariable, 'value'>[] = await this.getVariableDefinitions(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            'CalculatedGlobalEnvironment = {'
        );

        const definition: ParseObjectResult<
            Record<
                string,
                (env: Record<string, EnvValue>, fileName: DockerComposeFileName) => EnvValue
            >
        > = await TsUtilities.getObjectStartingWith(getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME), '> = {');

        const res: EnvVariable[] = [];
        for (const key in definition.result) {
            if (variableKeys != undefined && !variableKeys.includes(key as EnvironmentVariableKey)) {
                continue;
            }

            const calculate: (env: Record<string, EnvValue>, fileName: DockerComposeFileName) => EnvValue = definition.result[key];
            const v: EnvValue = calculate(staticVariableObject, fileName);

            const def: OmitStrict<EnvVariable, 'value'> | undefined = calculatedVariableDefinitions.find(d => d.key === key);
            if (def == undefined) {
                throw new Error(`Could not find definition for variable "${key}"`);
            }
            //                     this allows 0, as that might be a valid value
            if (!def.required && (v == undefined || v === '' || v === 'undefined')) {
                res.push({ key: key as EnvironmentVariableKey, value: undefined, type: def.type, required: def.required });
                continue;
            }
            if (def.type === 'boolean' && (v === 'true' || v === 'false')) {
                res.push({ key: key as EnvironmentVariableKey, value: Boolean(v), type: def.type, required: def.required });
                continue;
            }
            if (def.type === 'number' && !Number.isNaN(Number(v))) {
                res.push({ key: key as EnvironmentVariableKey, value: Number(v), type: def.type, required: def.required });
                continue;
            }
            res.push({ key: key as EnvironmentVariableKey, value: v, type: def.type, required: def.required });
        }
        const foundVariableKeys: string[] = res.map(v => v.key);
        const missingVariable: string | undefined = variableKeys?.find(k => !foundVariableKeys.includes(k));
        if (missingVariable && failOnMissingVariable) {
            throw new Error(`Could not find variable ${missingVariable}`);
        }
        return res;
    }

    // eslint-disable-next-line sonar/cognitive-complexity
    private static async getStaticEnvVariables(
        variableKeys: EnvironmentVariableKey[] | undefined,
        failOnMissingVariable: boolean
    ): Promise<EnvVariable[]> {
        const lines: string[] = await FsUtilities.readFileLines(getPath(ENV_FILE_NAME));
        const staticVariableDefinitions: OmitStrict<EnvVariable, 'value'>[] = await this.getVariableDefinitions(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            'StaticGlobalEnvironment = {'
        );
        const res: EnvVariable[] = [];
        for (const line of lines.filter(l => l.includes('='))) {
            const [key, ...value] = line.split('=');
            if (variableKeys != undefined && !variableKeys.includes(key as EnvironmentVariableKey)) {
                continue;
            }
            const v: EnvValue = value.join('');
            const def: OmitStrict<EnvVariable, 'value'> | undefined = staticVariableDefinitions.find(d => d.key === key);
            if (def == undefined) {
                throw new Error(`Could not find definition for variable "${key}"`);
            }
            //                     this allows 0, as that might be a valid value
            if (!def.required && (v == undefined || v === '' || v === 'undefined')) {
                res.push({ key: key as EnvironmentVariableKey, value: undefined, type: def.type, required: def.required });
                continue;
            }
            if (def.type === 'boolean' && (v === 'true' || v === 'false')) {
                res.push({ key: key as EnvironmentVariableKey, value: v === 'true', type: def.type, required: def.required });
                continue;
            }
            if (def.type === 'number' && !Number.isNaN(Number(v))) {
                res.push({ key: key as EnvironmentVariableKey, value: Number(v), type: def.type, required: def.required });
                continue;
            }
            res.push({ key: key as EnvironmentVariableKey, value: v, type: def.type, required: def.required });
        }
        const foundVariableKeys: EnvironmentVariableKey[] = res.map(v => v.key);
        const missingVariable: EnvironmentVariableKey | undefined = variableKeys?.find(k => !foundVariableKeys.includes(k));
        if (missingVariable && failOnMissingVariable) {
            throw new Error(`Could not find variable ${missingVariable}`);
        }
        return res;
    }

    /**
     * Gets the value for the given environment variable.
     * @param variable - The variable to get the value of.
     * @param fileName - The docker compose file to build the variables for.
     * @returns The value of the provided variable.
     */
    static async getEnvVariable<T extends EnvValue>(
        variable: EnvironmentVariableKey,
        fileName: DockerComposeFileName
    ): Promise<T> {
        const envValues: EnvVariable[] = await this.getEnvVariables([variable], false, fileName);
        if (!envValues.length) {
            throw new Error(`Could not find env value ${variable}`);
        }
        return envValues[0].value as T;
    }

    /**
     * Initializes environment variables inside the monorepo.
     * @param prodRootDomain - The root domain used in prod.
     */
    static async init(prodRootDomain: string): Promise<void> {
        await this.createEnvFile(prodRootDomain);
        await this.createGlobalEnvironmentModel();
    }

    private static async createGlobalEnvironmentModel(): Promise<void> {
        await FsUtilities.createFile(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            [
                '/**',
                '* Defines all static environment variables that need to be set in the .env-file.',
                '* This is also used by the "mx prepare" command to validate the .env-file and create the project environment.ts files',
                '*/',
                'type StaticGlobalEnvironment = {',
                `\t${DefaultEnvKeys.IS_PUBLIC}: boolean`,
                `\t${DefaultEnvKeys.PROD_ROOT_DOMAIN}: string`,
                '};',
                '',
                '/**',
                '* Defines all environment variables which should be calculated based on the StaticGlobalEnvironment values.',
                '* This is also used by Monux sometimes, eg. to define baseUrls that consist of',
                // eslint-disable-next-line stylistic/max-len
                '* the subdomain environment variable + baseDomain environment variable + http/https, based on the used docker compose file.',
                '*/',
                'type CalculatedGlobalEnvironment = {};',
                '',
                'export type GlobalEnvironment = StaticGlobalEnvironment & CalculatedGlobalEnvironment;',
                '',
                'type DockerComposeFileName = \'docker-compose.yaml\' | \'dev.docker-compose.yaml\' | \'local.docker-compose.yaml\';',
                '',
                '/**',
                '* Defines how the CalculatedGlobalEnvironment values should be calculated.',
                '* This is used by the "mx prepare" command.',
                '* DONT CHANGE THE NAME ("calculationSchemaFor") OR FORMATTING. Otherwise Monux might not be able to detect it.',
                '*/',
                'const calculationSchemaFor: Record<',
                '\tkeyof CalculatedGlobalEnvironment,',
                // eslint-disable-next-line stylistic/max-len
                '\t(env: StaticGlobalEnvironment, fileName: DockerComposeFileName) => CalculatedGlobalEnvironment[keyof CalculatedGlobalEnvironment]',
                '> = {};'
            ]
        );
    }

    private static async createEnvFile(prodRootDomain: string): Promise<void> {
        await FsUtilities.createFile(getPath(ENV_FILE_NAME), [
            `${DefaultEnvKeys.IS_PUBLIC}=false`,
            `${DefaultEnvKeys.PROD_ROOT_DOMAIN}=${prodRootDomain}`
        ]);
    }

    /**
     * Validates the .env file.
     * @returns An array of error messages mapped to the keys that caused them.
     */
    static async validate(): Promise<KeyValue<EnvValidationErrorMessage>[]> {
        if (!await FsUtilities.exists(getPath(ENV_FILE_NAME))) {
            return [
                {
                    key: ENV_FILE_NAME,
                    value: EnvValidationErrorMessage.FILE_DOES_NOT_EXIST
                }
            ];
        }

        const envValues: EnvVariable[] = await this.getStaticEnvVariables(undefined, true);

        const staticVariableDefinitions: OmitStrict<EnvVariable, 'value'>[] = await this.getVariableDefinitions(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            'StaticGlobalEnvironment = {'
        );

        const res: KeyValue<EnvValidationErrorMessage>[] = [];
        for (const d of staticVariableDefinitions) {
            const foundValue: EnvValue | undefined = envValues.find(v => v.key === d.key)?.value;
            if (d.required && (foundValue == undefined || foundValue === '' || foundValue === 'undefined')) {
                res.push({ key: d.key, value: EnvValidationErrorMessage.REQUIRED });
                continue;
            }
            if (d.type === 'number' && typeof foundValue !== 'number') {
                res.push({ key: d.key, value: EnvValidationErrorMessage.NUMBER });
                continue;
            }
            if (d.type === 'boolean' && typeof foundValue !== 'boolean') {
                res.push({ key: d.key, value: EnvValidationErrorMessage.BOOLEAN });
            }
        }
        return res;
    }

    private static async getVariableDefinitions(
        globalEnvModelPath: string,
        firstLineIdentifier: 'StaticGlobalEnvironment = {' | 'CalculatedGlobalEnvironment = {'
    ): Promise<OmitStrict<EnvVariable, 'value'>[]> {
        const lines: string[] = await FsUtilities.readFileLines(globalEnvModelPath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, firstLineIdentifier);
        const lastLine: FileLine = await FsUtilities.findLineWithContent(lines, '}', firstLine.index);

        if (firstLine.index === lastLine.index) {
            return [];
        }

        const res: OmitStrict<EnvVariable, 'value'>[] = [];
        const contentLines: FileLine[] = FsUtilities.getFileLines(lines, firstLine.index + 1, lastLine.index - 1);
        for (const l of contentLines) {
            if (l.content.includes('?')) {
                const [key, ...type] = l.content.split('?: ');
                res.push({
                    key: key.trim() as EnvironmentVariableKey,
                    type: type.join('').split(',')[0] as 'string' | 'number' | 'boolean',
                    required: false
                });
                continue;
            }
            const [key, ...type] = l.content.split(': ');
            res.push({
                key: key.trim() as EnvironmentVariableKey,
                type: type.join('').split(',')[0] as 'string' | 'number' | 'boolean',
                required: true
            });
        }
        return res;
    }

    /**
     * Adds a variable to the .env file.
     * @param variable - The variable to add.
     */
    static async addStaticVariable(variable: EnvVariable): Promise<void> {
        const environmentFilePath: string = getPath(ENV_FILE_NAME);
        if ((await FsUtilities.readFile(environmentFilePath)).includes(`${variable.key}=`)) {
            throw new Error(`The variable ${variable.key} has already been set.`);
        }
        await FsUtilities.updateFile(environmentFilePath, `${variable.key}=${variable.value ?? ''}`, 'append');

        const environmentModelFilePath: string = getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME);

        const lines: string[] = await FsUtilities.readFileLines(environmentModelFilePath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, 'StaticGlobalEnvironment = {');
        const lastLine: FileLine = await FsUtilities.findLineWithContent(lines, '}', firstLine.index);
        const q: string = variable.required ? '' : '?';

        if (firstLine.index === lastLine.index) {
            await FsUtilities.replaceInFile(
                environmentModelFilePath,
                'StaticGlobalEnvironment = {}',
                `StaticGlobalEnvironment = {\n\t${variable.key}${q}: ${variable.type}\n}`
            );
            return;
        }

        const contentLines: FileLine[] = FsUtilities.getFileLines(lines, firstLine.index + 1, lastLine.index - 1);
        const contentString: string = contentLines.map(l => l.content).join('\n');
        const newContentString: string = `${contentString},\n\t${variable.key}${q}: ${variable.type}`;

        await FsUtilities.replaceInFile(
            environmentModelFilePath,
            contentString,
            newContentString,
            firstLine.index
        );
    }

    /**
     * Adds a calculated variable to the global-environment.model.ts file.
     * @param variable - The variable to add.
     */
    static async addCalculatedVariable(variable: CalculatedEnvVariable): Promise<void> {
        const environmentModelFilePath: string = getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME);
        if ((await FsUtilities.readFile(environmentModelFilePath)).includes(`${variable.key}: `)) {
            throw new Error(`The variable ${variable.key} has already been set.`);
        }

        const lines: string[] = await FsUtilities.readFileLines(environmentModelFilePath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, 'CalculatedGlobalEnvironment = {');
        const lastLine: FileLine = await FsUtilities.findLineWithContent(lines, '}', firstLine.index);
        const q: string = variable.required ? '' : '?';

        if (firstLine.index === lastLine.index) {
            await FsUtilities.replaceInFile(
                environmentModelFilePath,
                'CalculatedGlobalEnvironment = {}',
                `CalculatedGlobalEnvironment = {\n\t${variable.key}${q}: ${variable.type}\n}`
            );
        }
        else {
            const contentLines: FileLine[] = FsUtilities.getFileLines(lines, firstLine.index + 1, lastLine.index - 1);
            const contentString: string = contentLines.map(l => l.content).join('\n');
            const newContentString: string = `${contentString},\n\t${variable.key}${q}: ${variable.type}`;

            await FsUtilities.replaceInFile(
                environmentModelFilePath,
                contentString,
                newContentString,
                firstLine.index
            );
        }

        const definition: ParseObjectResult<
            Record<
                string,
                (env: Record<string, EnvValue>, fileName: DockerComposeFileName) => EnvValue
            >
        > = await TsUtilities.getObjectStartingWith(environmentModelFilePath, '> = {');

        definition.result[variable.key] = variable.value;

        const stringifiedObject: string = ` ${JsonUtilities.stringifyAsTs(definition.result)};`;

        await FsUtilities.replaceInFile(
            environmentModelFilePath,
            definition.contentString,
            stringifiedObject
        );
    }
}