import { Dirent } from 'fs';
import path from 'path';

import { AngularUtilities } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, PACKAGE_JSON_FILE_NAME } from '../../../constants';
import { FsUtilities, JsonUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmUtilities, PackageJson } from '../../../npm';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { mergeDeep } from '../../../utilities';
import { WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for adding a new angular library.
 */
type AddAngularLibraryConfiguration = AddConfiguration & {

};

// eslint-disable-next-line jsdoc/require-jsdoc
type CreateResult = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    root: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    oldPackageJson: PackageJson
};

/**
 * Command that handles adding an angular library to the monorepo.
 */
export class AddAngularLibraryCommand extends AddCommand<AddAngularLibraryConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddAngularLibraryConfiguration, keyof AddConfiguration>> = {

    };

    override async run(): Promise<void> {
        const config: AddAngularLibraryConfiguration = await this.getConfig();
        const result: CreateResult = await this.createProject(config);

        await Promise.all([
            FsUtilities.rm(path.join(result.root, '.vscode')),
            FsUtilities.rm(path.join(result.root, '.editorconfig')),
            FsUtilities.rm(path.join(result.root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(path.join(result.root, LIBS_DIRECTORY_NAME)),
            this.updateNgPackageJson(result.root),
            this.updateAngularJson(result.root, config.name),
            this.setupTsConfig(result.root, config.name),
            this.updatePackageJson(result, config.name),
            TailwindUtilities.setupProjectTailwind(result.root, false),
            EslintUtilities.setupProjectEslint(result.root, false)
        ]);
        await FsUtilities.rm(path.join(result.root, 'projects'));
    }

    private async updatePackageJson(result: CreateResult, name: string): Promise<void> {
        await NpmUtilities.updatePackageJson(name, {
            peerDependencies: result.oldPackageJson.peerDependencies,
            dependencies: undefined,
            devDependencies: undefined
        });
    }

    private async createProject(config: AddAngularLibraryConfiguration): Promise<CreateResult> {
        // eslint-disable-next-line no-console
        console.log('Creates the base library');
        AngularUtilities.runCommand(
            path.join(LIBS_DIRECTORY_NAME, config.name),
            `generate library ${config.name}`,
            { '--inline-style': true }
        );

        const oldPackageJson: PackageJson = await FsUtilities.parseFileAs(
            path.join(LIBS_DIRECTORY_NAME, config.name, 'projects', config.name, PACKAGE_JSON_FILE_NAME)
        );

        await FsUtilities.moveDirectoryContent(
            path.join(LIBS_DIRECTORY_NAME, config.name, 'projects', config.name),
            path.join(LIBS_DIRECTORY_NAME, config.name),
            [PACKAGE_JSON_FILE_NAME]
        );

        const newProject: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        const root: string = path.join(newProject.parentPath, newProject.name);
        return { root, oldPackageJson };
    }

    private async setupTsConfig(root: string, projectName: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('sets up tsconfig');

        await Promise.all([
            TsConfigUtilities.updateTsConfig(projectName, { extends: '../../tsconfig.base.json' }),
            this.createTsConfigEslint(root),
            this.updateTsConfigLib(root),
            this.updateTsConfigSpec(root)
        ]);
    }

    private async updateTsConfigLib(root: string): Promise<void> {
        const tsconfigPath: string = path.join(root, 'tsconfig.lib.json');
        const oldConfig: TsConfig = await FsUtilities.parseFileAs(tsconfigPath);
        const config: TsConfig = mergeDeep(oldConfig, {
            extends: './tsconfig.json',
            compilerOptions: {
                outDir: 'out-tsc/spec'
            }
        });
        await FsUtilities.updateFile(tsconfigPath, JsonUtilities.stringify(config), 'replace');
    }

    private async updateTsConfigSpec(root: string): Promise<void> {
        const tsconfigPath: string = path.join(root, 'tsconfig.spec.json');
        const oldConfig: TsConfig = await FsUtilities.parseFileAs(tsconfigPath);
        const config: TsConfig = mergeDeep(oldConfig, {
            extends: 'tsconfig.json',
            compilerOptions: {
                outDir: 'out-tsc/lib'
            }
        });
        await FsUtilities.updateFile(tsconfigPath, JsonUtilities.stringify(config), 'replace');
    }

    private async createTsConfigEslint(root: string): Promise<void> {
        const eslintTsconfig: TsConfig = {
            compilerOptions: {
                outDir: './out-tsc/eslint',
                types: ['jasmine']
            },
            extends: '../../tsconfig.base.json',
            files: ['src/public-api.ts'],
            include: [
                'src/**/*.spec.ts',
                'src/**/*.d.ts'
            ]
        };
        await FsUtilities.createFile(path.join(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }

    private async updateNgPackageJson(root: string): Promise<void> {
        await AngularUtilities.updateNgPackageJson(path.join(root, 'ng-package.json'), {
            dest: './dist/ui',
            lib: {
                entryFile: 'src/public-api.ts'
            }
        });
    }

    private async updateAngularJson(root: string, projectName: string): Promise<void> {
        await AngularUtilities.updateAngularJson(path.join(root, ANGULAR_JSON_FILE_NAME), {
            $schema: '../../node_modules/@angular/cli/lib/config/schema.json',
            newProjectRoot: './',
            projects: {
                [projectName]: {
                    root: './',
                    sourceRoot: 'src',
                    architect: {
                        build: {
                            options: {
                                project: 'ng-package.json'
                            },
                            configurations: {
                                production: {
                                    tsConfig: 'tsconfig.lib.prod.json'
                                },
                                development: {
                                    tsConfig: 'tsconfig.lib.json'
                                }
                            }
                        },
                        test: {
                            options: {
                                tsConfig: 'tsconfig.spec.json'
                            }
                        }
                    }
                }
            }
        });
    }
}