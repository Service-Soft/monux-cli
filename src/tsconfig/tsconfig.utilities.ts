import { Dirent } from 'fs';

import { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript';

import { CPUtilities, FsUtilities, JsonUtilities } from '../encapsulation';
import { WorkspaceUtilities } from '../workspace';
import { TsConfig } from './tsconfig.model';
import { TS_CONFIG_FILE_NAME } from '../constants';
import { getPath, mergeDeep } from '../utilities';

/**
 * Utilities for tsconfig.
 */
export abstract class TsConfigUtilities {
    /**
     * Initializes typescript inside the given path.
     * @param path - Where to initialize typescript.
     */
    static init(path: string): void {
        CPUtilities.execSync(`cd ${path} && npx tsc --init`);
    }

    /**
     * Creates the base ts config at the monorepo root.
     */
    static async createBaseTsConfig(): Promise<void> {
        const tsconfig: TsConfig = {
            compileOnSave: false,
            compilerOptions: {
                allowSyntheticDefaultImports: true,
                baseUrl: '.',
                declaration: false,
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
                forceConsistentCasingInFileNames: true,
                importHelpers: true,
                lib: ['ESNext', 'DOM'],
                module: 'ESNext' as unknown as ModuleKind,
                moduleResolution: 'Node' as unknown as ModuleResolutionKind,
                noFallthroughCasesInSwitch: true,
                noImplicitOverride: true,
                noImplicitReturns: true,
                noPropertyAccessFromIndexSignature: true,
                resolveJsonModule: true,
                rootDir: '.',
                skipDefaultLibCheck: true,
                skipLibCheck: true,
                sourceMap: true,
                strict: true,
                target: 'ESNext' as unknown as ScriptTarget,
                useUnknownInCatchVariables: true
            },
            exclude: ['node_modules', 'tmp', 'dist']
        };
        await FsUtilities.createFile('tsconfig.base.json', JsonUtilities.stringify(tsconfig));
    }

    /**
     * Updates the tsconfig of the project with the given name.
     * @param projectName - The name of the project to update the tsconfig in.
     * @param data - The data to update the tsconfig with.
     */
    static async updateTsConfig(projectName: string, data: Partial<TsConfig>): Promise<void> {
        const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        const tsConfigPath: string = getPath(project.parentPath, project.name, TS_CONFIG_FILE_NAME);
        await this.update(tsConfigPath, data);
    }

    /**
     * Updates the base tsconfig at the monorepo root.
     * @param data - The data to update the tsconfig with.
     */
    static async updateBaseTsConfig(data: Partial<TsConfig>): Promise<void> {
        await this.update('tsconfig.base.json', data);
    }

    private static async update(path: string, data: Partial<TsConfig>): Promise<void> {
        const oldConfig: TsConfig = await FsUtilities.parseFileAs(path);
        const tsconfig: TsConfig = mergeDeep<TsConfig>(oldConfig, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(tsconfig), 'replace', false);
    }
}