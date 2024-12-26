import { Dirent } from 'fs';
import path from 'path';

import { ENV_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ENVIRONMENT_TS_FILE_NAME, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME, GlobalEnvironmentVariable } from '../constants';
import { FileLine, FsUtilities, JsonUtilities } from '../encapsulation';
import { KeyValue, OmitStrict } from '../types';
import { WorkspaceUtilities } from '../workspace';

/**
 * The possible types an environment variable can have.
 */
type EnvValue = string | number | boolean | undefined;

/**
 * The full data of an environment variable.
 */
export type EnvVariable = KeyValue<EnvValue> & {
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
     * @param rootPath - The root path of the monorepo, defaults to ''.
     */
    static async buildEnvironmentFiles(rootPath: string = ''): Promise<void> {
        const apps: Dirent[] = await WorkspaceUtilities.getProjects('apps');
        await Promise.all(apps.map(a => this.buildEnvironmentFileForApp(a, rootPath)));
    }

    /**
     * Builds an environment file for the provided app.
     * @param app - The app to build the environment file for.
     * @param rootPath - The root path of the monorepo.
     */
    static async buildEnvironmentFileForApp(app: Dirent, rootPath: string): Promise<void> {
        const environmentFolder: string = path.join(app.parentPath, app.name, 'src', 'environment');
        const variableKeys: string[] = await this.getProjectVariableKeys(path.join(environmentFolder, ENVIRONMENT_MODEL_TS_FILE_NAME));

        await FsUtilities.rm(path.join(environmentFolder, ENVIRONMENT_TS_FILE_NAME));
        await this.createProjectEnvironmentFile(path.join(app.parentPath, app.name), variableKeys, rootPath);
    }

    private static async getProjectVariableKeys(environmentModelPath: string): Promise<string[]> {
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
     * @param rootPath - The path to the mono repo root.
     */
    static async setupProjectEnvironment(projectPath: string, disableCommentRule: boolean, rootPath: string = ''): Promise<void> {
        await FsUtilities.createFile(
            path.join(projectPath, 'src', 'environment', 'environment.model.ts'),
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
        await this.createProjectEnvironmentFile(projectPath, [], rootPath);
    }

    private static async createProjectEnvironmentFile(projectPath: string, variableKeys: string[], rootPath: string): Promise<void> {
        const variables: EnvVariable[] = await this.getEnvVariables(variableKeys, rootPath);
        await FsUtilities.createFile(
            path.join(projectPath, 'src', 'environment', ENVIRONMENT_TS_FILE_NAME),
            [
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
        variableKeys: string[] | undefined,
        rootPath: string
    ): Promise<EnvVariable[]> {
        const lines: string[] = await FsUtilities.readFileLines(path.join(rootPath, ENV_FILE_NAME));
        const variableDefinitions: OmitStrict<EnvVariable, 'value'>[] = await this.getVariableDefinitions(
            path.join(rootPath, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME)
        );
        const res: EnvVariable[] = [];
        for (const line of lines.filter(l => l.includes('='))) {
            const [key, ...value] = line.split('=');
            if (variableKeys != undefined && !variableKeys.includes(key)) {
                continue;
            }
            const v: EnvValue = value.join('');
            const def: OmitStrict<EnvVariable, 'value'> | undefined = variableDefinitions.find(v => v.key === key);
            if (def == undefined) {
                throw new Error(`Could not find definition for variable "${key}"`);
            }
            if (!def.required && (!v || v == 'undefined')) {
                res.push({ key, value: undefined, type: def.type, required: def.required });
                continue;
            }
            if (def.type === 'boolean' && (v === 'true' || v === 'false')) {
                res.push({ key, value: Boolean(v), type: def.type, required: def.required });
                continue;
            }
            if (def.type === 'number' && !Number.isNaN(Number(v))) {
                res.push({ key, value: Number(v), type: def.type, required: def.required });
                continue;
            }
            res.push({ key, value: v, type: def.type, required: def.required });
        }
        const foundVariableKeys: string[] = res.map(v => v.key);
        const missingVariable: string | undefined = variableKeys?.find(k => !foundVariableKeys.includes(k));
        if (missingVariable) {
            throw new Error(`Could not find variable ${missingVariable}`);
        }
        return res;
    }

    /**
     * Gets the value for the given environment variable.
     * @param variable - The variable to get the value of.
     * @param rootPath - The root path of the monorepo.
     * @returns The value of the provided variable.
     */
    static async getEnvVariable<T extends EnvValue>(
        variable: GlobalEnvironmentVariable | Omit<string, GlobalEnvironmentVariable >,
        rootPath: string
    ): Promise<T> {
        return (await this.getEnvVariables([variable as string], rootPath))[0].value as T;
    }

    /**
     * Initializes environment variables inside the monorepo.
     * @param rootPath - The path to the root of the monorepo.
     */
    static async init(rootPath: string = ''): Promise<void> {
        await this.createEnvFile(rootPath);
        await this.createGlobalEnvironmentModel(rootPath);
    }

    private static async createGlobalEnvironmentModel(rootPath: string): Promise<void> {
        await FsUtilities.createFile(path.join(rootPath, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME), 'export type GlobalEnvironment = {}');
    }

    private static async createEnvFile(rootPath: string): Promise<void> {
        await FsUtilities.createFile(path.join(rootPath, ENV_FILE_NAME), '');
    }

    /**
     * Validates the .env file.
     * @param rootPath - Path to the root of the monorepo.
     * @returns An array of error messages mapped to the keys that caused them.
     */
    static async validate(rootPath: string = ''): Promise<KeyValue<EnvValidationErrorMessage>[]> {
        if (!await FsUtilities.exists(path.join(rootPath, ENV_FILE_NAME))) {
            return [
                {
                    key: ENV_FILE_NAME,
                    value: EnvValidationErrorMessage.FILE_DOES_NOT_EXIST
                }
            ];
        }

        const envValues: EnvVariable[] = await this.getEnvVariables(undefined, rootPath);

        const variableDefinitions: OmitStrict<EnvVariable, 'value'>[] = await this.getVariableDefinitions(
            path.join(rootPath, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME)
        );

        const res: KeyValue<EnvValidationErrorMessage>[] = [];
        for (const d of variableDefinitions) {
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

    private static async getVariableDefinitions(globalEnvModelPath: string): Promise<OmitStrict<EnvVariable, 'value'>[]> {
        const lines: string[] = await FsUtilities.readFileLines(globalEnvModelPath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, 'GlobalEnvironment = {');
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
                    key: key.trim(),
                    type: type.join('').split(',')[0] as 'string' | 'number' | 'boolean',
                    required: false
                });
                continue;
            }
            const [key, ...type] = l.content.split(': ');
            res.push({
                key: key.trim(),
                type: type.join('').split(',')[0] as 'string' | 'number' | 'boolean',
                required: true
            });
        }
        return res;
    }

    /**
     * Adds a variable to the .env file.
     * @param variable - The variable to add.
     * @param rootPath - The path to the root of the monorepo.
     */
    static async addVariable(variable: EnvVariable, rootPath: string = ''): Promise<void> {
        const environmentFilePath: string = path.join(rootPath, ENV_FILE_NAME);
        if ((await FsUtilities.readFile(environmentFilePath)).includes(`${variable.key}=`)) {
            throw new Error(`The variable ${variable.key} has already been set.`);
        }
        await FsUtilities.updateFile(environmentFilePath, `${variable.key}=${variable.value ?? ''}`, 'append');

        const environmentModelFilePath: string = path.join(rootPath, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME);

        const lines: string[] = await FsUtilities.readFileLines(environmentModelFilePath);
        const firstLine: FileLine = await FsUtilities.findLineWithContent(lines, 'GlobalEnvironment = {');
        const lastLine: FileLine = await FsUtilities.findLineWithContent(lines, '}', firstLine.index);
        const q: string = variable.required ? '' : '?';

        if (firstLine.index === lastLine.index) {
            await FsUtilities.replaceInFile(
                environmentModelFilePath,
                'GlobalEnvironment = {}',
                `GlobalEnvironment = {\n\t${variable.key}${q}: ${variable.type}\n}`
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

    // /**
    //  *
    //  * @param variableName
    //  */
    // static async removeVariable(variableName: string): Promise<void> {
    //     if (!await FsUtilities.exists(ENV_FILE_NAME)) {
    //         return;
    //     }
    //     const lines: string[] = await FsUtilities.readFileLines(ENV_FILE_NAME);
    //     const foundLine: FileLine = FsUtilities.findLineWithContent(lines, `${variableName}=`);
    //     const newLines: string[] = lines.filter(l => l !== foundLine.content);
    //     await FsUtilities.updateFile(ENV_FILE_NAME, newLines, 'replace');
    // }

    // /**
    //  *
    //  * @param variable
    //  * @param basePath
    //  */
    // static async updateVariable(variable: EnvVariable, basePath: string = ''): Promise<void> {
    //     await this.createEnvFile(basePath);
    //     const lines: string[] = await FsUtilities.readFileLines(path.join(basePath, ENV_FILE_NAME));
    //     const foundLine: FileLine = FsUtilities.findLineWithContent(lines, `${variable.key}=`);
    //     lines[foundLine.index] = `${variable.key}=${variable.value}`;
    //     await FsUtilities.updateFile(path.join(basePath, ENV_FILE_NAME), lines, 'replace');
    // }
}