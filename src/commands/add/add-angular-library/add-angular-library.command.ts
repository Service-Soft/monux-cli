import { AngularUtilities } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, PACKAGE_JSON_FILE_NAME } from '../../../constants';
import { FsUtilities, JsonUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmUtilities, PackageJson } from '../../../npm';
import { StorybookUtilities } from '../../../storybook';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { getPath, mergeDeep, Path } from '../../../utilities';
import { WorkspaceConfig, WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { BaseAddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for adding a new angular library.
 */
type AddAngularLibraryConfiguration = AddConfiguration & {
    /**
     * The scope of the library, eg. '@project'.
     */
    scope: string
};

// eslint-disable-next-line jsdoc/require-jsdoc
type CreateResult = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    root: Path,
    // eslint-disable-next-line jsdoc/require-jsdoc
    oldPackageJson: PackageJson
};

/**
 * Command that handles adding an angular library to the monorepo.
 */
export class AddAngularLibraryCommand extends BaseAddCommand<AddAngularLibraryConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddAngularLibraryConfiguration, keyof AddConfiguration>> = {
        scope: {
            type: 'input',
            required: true,
            message: 'scope',
            default: async () => {
                const workspaceConfig: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
                return `@${workspaceConfig.name}`;
            }
        }
    };

    override async run(): Promise<void> {
        const config: AddAngularLibraryConfiguration = await this.getConfig();
        const result: CreateResult = await this.createProject(config);

        await Promise.all([
            FsUtilities.rm(getPath(result.root, '.vscode')),
            FsUtilities.rm(getPath(result.root, '.editorconfig')),
            FsUtilities.rm(getPath(result.root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(getPath(result.root, 'src', 'lib')),
            this.updatePublicApi(result.root),
            this.updateNgPackageJson(result.root),
            this.updateAngularJson(result.root, config.name),
            this.setupTsConfig(result.root, config),
            this.updatePackageJson(result, config.name),
            this.setupTailwind(result.root),
            EslintUtilities.setupProjectEslint(result.root, false)
        ]);
        await FsUtilities.rm(getPath(result.root, 'projects'));
    }

    private async updatePublicApi(root: string): Promise<void> {
        await FsUtilities.updateFile(getPath(root, 'src', 'public-api.ts'), '', 'replace');
    }

    private async setupTailwind(root: string): Promise<void> {
        await TailwindUtilities.setupProjectTailwind(root);
        await FsUtilities.createFile(getPath(root, 'src', 'styles.css'), [
            '@tailwind base;',
            '@tailwind components;',
            '@tailwind utilities;'
        ]);
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
        console.log('Creates a temporary angular workspace');
        AngularUtilities.runCommand(
            getPath(LIBS_DIRECTORY_NAME),
            `new ${config.name}`,
            { '--no-create-application': true }
        );
        // eslint-disable-next-line no-console
        console.log('Creates the base library');
        AngularUtilities.runCommand(
            getPath(LIBS_DIRECTORY_NAME, config.name),
            `generate library ${config.name}`,
            {}
        );

        // eslint-disable-next-line no-console
        console.log('Sets up the storybook');
        StorybookUtilities.setup(getPath(LIBS_DIRECTORY_NAME, config.name));

        const oldPackageJson: PackageJson = await FsUtilities.parseFileAs(
            getPath(LIBS_DIRECTORY_NAME, config.name, 'projects', config.name, PACKAGE_JSON_FILE_NAME)
        );

        await FsUtilities.moveDirectoryContent(
            getPath(LIBS_DIRECTORY_NAME, config.name, 'projects', config.name),
            getPath(LIBS_DIRECTORY_NAME, config.name),
            [PACKAGE_JSON_FILE_NAME]
        );
        await FsUtilities.replaceAllInFile(
            getPath(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            `projects/${config.name}/`,
            ''
        );
        await FsUtilities.replaceAllInFile(
            getPath(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            '"-d",',
            ''
        );
        await FsUtilities.replaceAllInFile(
            getPath(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            `"projects/${config.name}"`,
            ''
        );
        await FsUtilities.replaceAllInFile(
            getPath(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            '"json",',
            '"json"'
        );
        await FsUtilities.replaceInFile(getPath(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME), '"root": ,', '"root": "./",');

        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, getPath('.'));
        await FsUtilities.rm(getPath(newProject.path, 'src', 'stories', '.eslintrc.json'));
        return { root: newProject.path, oldPackageJson };
    }

    private async setupTsConfig(root: Path, config: AddAngularLibraryConfiguration): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('sets up tsconfig');

        await Promise.all([
            TsConfigUtilities.updateTsConfig(config.name, { extends: '../../tsconfig.base.json' }),
            this.createTsConfigEslint(root),
            this.updateTsConfigLib(root),
            this.updateTsConfigSpec(root),
            this.updateBaseTsConfig(config, root)
        ]);
    }

    private async updateBaseTsConfig(config: AddAngularLibraryConfiguration, root: Path): Promise<void> {
        await TsConfigUtilities.updateBaseTsConfig({
            compilerOptions: {
                paths: {
                    [`${config.scope}/${config.name}`]: [`${root}/src/public-api.ts`]
                }
            }
        });
    }

    private async updateTsConfigLib(root: Path): Promise<void> {
        const tsconfigPath: Path = getPath(root, 'tsconfig.lib.json');
        const oldConfig: TsConfig = await FsUtilities.parseFileAs(tsconfigPath);
        const config: TsConfig = mergeDeep(oldConfig, {
            extends: './tsconfig.json',
            compilerOptions: {
                outDir: 'out-tsc/lib'
            }
        });
        await FsUtilities.updateFile(tsconfigPath, JsonUtilities.stringify(config), 'replace');
    }

    private async updateTsConfigSpec(root: string): Promise<void> {
        const tsconfigPath: Path = getPath(root, 'tsconfig.spec.json');
        const oldConfig: TsConfig = await FsUtilities.parseFileAs(tsconfigPath);
        const config: TsConfig = mergeDeep(oldConfig, {
            extends: './tsconfig.json',
            compilerOptions: {
                outDir: 'out-tsc/spec'
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
        await FsUtilities.createFile(getPath(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }

    private async updateNgPackageJson(root: string): Promise<void> {
        await AngularUtilities.updateNgPackageJson(getPath(root, 'ng-package.json'), {
            $schema: './node_modules/ng-packagr/ng-package.schema.json',
            dest: './dist/ui',
            lib: {
                entryFile: 'src/public-api.ts'
            }
        });
    }

    private async updateAngularJson(root: string, projectName: string): Promise<void> {
        await AngularUtilities.updateAngularJson(getPath(root, ANGULAR_JSON_FILE_NAME), {
            $schema: '../../node_modules/@angular/cli/lib/config/schema.json',
            newProjectRoot: './',
            projects: {
                [projectName]: {
                    prefix: projectName,
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