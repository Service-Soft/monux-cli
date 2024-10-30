import { Dirent } from 'fs';
import path from 'path';

import { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript';

import { CPUtilities, FsUtilities, JsonUtilities } from '../encapsulation';
import { WorkspaceUtilities } from '../workspace';
import { TsConfig } from './tsconfig.model';

/**
 *
 */
export abstract class TsConfigUtilities {
    /**
     *
     * @param libraryPath
     */
    static init(libraryPath: string): void {
        CPUtilities.execSync(`cd ${libraryPath} && npx tsc --init`);
    }

    /**
     *
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
            exclude: ['node_modules', 'tmp', 'build', 'dist']
        };
        await FsUtilities.createFile('tsconfig.base.json', JsonUtilities.stringify(tsconfig));
    }

    /**
     *
     * @param projectName
     * @param data
     */
    static async updateTsConfig(projectName: string, data: Partial<TsConfig>): Promise<void> {
        const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        const tsConfigPath: string = path.join(project.parentPath, project.name, 'tsconfig.json');
        await this.update(tsConfigPath, data);
    }

    /**
     *
     * @param data
     */
    static async updateBaseTsConfig(data: Partial<TsConfig>): Promise<void> {
        await this.update('tsconfig.base.json', data);
    }

    private static async update(path: string, data: Partial<TsConfig>): Promise<void> {
        const oldConfig: TsConfig = await FsUtilities.parseFileAs(path);
        const tsconfig: TsConfig = {
            ...oldConfig,
            ...data,
            compilerOptions: {
                ...oldConfig.compilerOptions,
                ...data.compilerOptions,
                paths: {
                    ...oldConfig.compilerOptions.paths,
                    ...data.compilerOptions?.paths
                }
            }
        };
        await FsUtilities.updateFile(path, JsonUtilities.stringify(tsconfig), 'replace', false);
    }
}