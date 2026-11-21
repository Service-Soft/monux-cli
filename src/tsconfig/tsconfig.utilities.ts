import { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript';

import { BASE_TS_CONFIG_FILE_NAME, TS_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities, JsonUtilities, Path, PathUtilities } from '../encapsulation';
import { mergeDeep } from '../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../workspace';
import { TsConfig } from './tsconfig.model';

/**
 * Utilities for tsconfig.
 */
export abstract class TsConfigUtilities {
    /**
     * Creates the base ts config at the monorepo root.
     */
    static async createBaseTsConfig(): Promise<void> {
        const tsconfig: TsConfig = {
            compileOnSave: false,
            compilerOptions: {
                allowSyntheticDefaultImports: true,
                declaration: false,
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
                forceConsistentCasingInFileNames: true,
                importHelpers: true,
                lib: ['ESNext', 'DOM'],
                module: 'ESNext' as unknown as ModuleKind,
                moduleResolution: 'node' as unknown as ModuleResolutionKind,
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
        await FsUtilities.createFile(PathUtilities.resolve(BASE_TS_CONFIG_FILE_NAME), JsonUtilities.stringify(tsconfig));
    }

    /**
     * Updates the tsconfig of the project with the given name.
     * @param projectName - The name of the project to update the tsconfig in.
     * @param data - The data to update the tsconfig with.
     */
    static async updateTsConfig(projectName: string, data: Partial<TsConfig>): Promise<void> {
        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(projectName, PathUtilities.resolve('.'));
        const tsConfigPath: Path = PathUtilities.resolve(project.path, TS_CONFIG_FILE_NAME);
        await this.update(tsConfigPath, data);
    }

    /**
     * Updates the base tsconfig at the monorepo root.
     * @param data - The data to update the tsconfig with.
     */
    static async updateBaseTsConfig(data: Partial<TsConfig>): Promise<void> {
        await this.update(PathUtilities.resolve(BASE_TS_CONFIG_FILE_NAME), data);
    }

    /**
     * Updates the tsconfig at the given path with the given data.
     * @param path - The path of the tsconfig.
     * @param data - The data to update the tsconfig with.
     */
    static async update(path: Path, data: Partial<TsConfig>): Promise<void> {
        const oldConfig: TsConfig = await FsUtilities.parseFileAs(path);
        const tsconfig: TsConfig = mergeDeep<TsConfig>(oldConfig, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(tsconfig), 'replace');
    }
}