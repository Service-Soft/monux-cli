import { AngularUtilities } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, BASE_TS_CONFIG_FILE_NAME, ESLINT_CONFIG_FILE_NAME, GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, PACKAGE_JSON_FILE_NAME } from '../../../constants';
import { FsUtilities, JsonUtilities, QuestionsFor, PathUtilities, Path, LogUtilities } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmUtilities, PackageJson } from '../../../npm';
import { StorybookUtilities } from '../../../storybook';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { mergeDeep } from '../../../utilities';
import { WorkspaceConfig, WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { BaseAddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';
import { buttonComponentHtmlContent } from './button-component-html.content';
import { buttonComponentTsContent } from './button-component-ts.content';
import { buttonStoriesTsContent } from './button-stories-ts.content';
import { storybookMainTsContent } from './storybook-main-ts.content';

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
            name: 'scope',
            message: 'scope',
            validate: (v?: string) => !!v,
            default: async () => {
                const workspaceConfig: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
                return `@${workspaceConfig.name}`;
            }
        }
    };

    override async run(): Promise<void> {
        const config: AddAngularLibraryConfiguration = await this.getConfig();
        const result: CreateResult = await this.createProject(config);
        await EslintUtilities.setupProjectEslint(result.root, false);
        await Promise.all([
            FsUtilities.rm(PathUtilities.resolve(result.root, '.vscode')),
            FsUtilities.rm(PathUtilities.resolve(result.root, '.editorconfig')),
            FsUtilities.rm(PathUtilities.resolve(result.root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(PathUtilities.resolve(result.root, 'src', 'lib')),
            this.updateNgPackageJson(result.root),
            this.updateAngularJson(result.root, config.name),
            this.setupTsConfig(result.root, config),
            this.updatePackageJson(result, config.name),
            this.setupTailwind(result.root)
        ]);
        await FsUtilities.rm(PathUtilities.resolve(result.root, 'projects'));
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(result.root, ESLINT_CONFIG_FILE_NAME),
            '    ...baseConfig,',
            [
                '    ...baseConfig,',
                '    {',
                '        files: [\'**/*.stories.ts\'],',
                '        rules: {',
                '            \'jsdoc/require-jsdoc\': \'off\'',
                '        }',
                '    },'
            ].join('\n')
        );
    }

    private async setupTailwind(root: string): Promise<void> {
        await TailwindUtilities.setupProjectTailwind(root);
        await FsUtilities.createFile(PathUtilities.resolve(root, 'src', 'styles.css'), [
            '@tailwind base;',
            '@tailwind components;',
            '@tailwind utilities;'
        ]);
    }

    private async updatePackageJson(result: CreateResult, name: string): Promise<void> {
        await NpmUtilities.updatePackageJson(name, {
            peerDependencies: result.oldPackageJson.peerDependencies,
            dependencies: undefined,
            devDependencies: undefined,
            prettier: undefined
        });
    }

    private async createProject(config: AddAngularLibraryConfiguration): Promise<CreateResult> {
        LogUtilities.step('Creating a temporary Angular workspace');
        await AngularUtilities.runCommand(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME),
            `new ${config.name}`,
            { '--no-create-application': true, '--ai-config': 'none', '--zoneless': false }
        );
        LogUtilities.step('Creating the library');
        await AngularUtilities.runCommand(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name),
            `generate library ${config.name}`,
            {}
        );

        LogUtilities.step('Setting up Storybook');
        await StorybookUtilities.setup(PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name));

        const oldPackageJson: PackageJson = await FsUtilities.parseFileAs(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name, 'projects', config.name, PACKAGE_JSON_FILE_NAME)
        );

        await FsUtilities.moveDirectoryContent(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name, 'projects', config.name),
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name),
            [PACKAGE_JSON_FILE_NAME]
        );
        await FsUtilities.replaceAllInFile(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            `projects/${config.name}/`,
            ''
        );
        await FsUtilities.replaceAllInFile(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            '"-d",',
            ''
        );
        await FsUtilities.replaceAllInFile(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            `"projects/${config.name}"`,
            ''
        );
        await FsUtilities.replaceAllInFile(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME),
            '"json",',
            '"json"'
        );
        await FsUtilities.replaceInFile(PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name, ANGULAR_JSON_FILE_NAME), '"root": ,', '"root": "./",');

        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await AngularUtilities.updateAngularJson(
            PathUtilities.resolve(newProject.path, ANGULAR_JSON_FILE_NAME),
            {
                projects: {
                    [newProject.name]: {
                        schematics: {
                            '@schematics/angular:component': {
                                style: 'css',
                                type: 'component'
                            },
                            '@schematics/angular:service': {
                                type: 'service'
                            },
                            '@schematics/angular:pipe': {
                                typeSeparator: '.'
                            },
                            '@schematics/angular:guard': {
                                typeSeparator: '.'
                            }
                        }
                    }
                }
            }
        );

        await FsUtilities.updateFile(
            PathUtilities.resolve(newProject.path, '.storybook', 'main.ts'),
            storybookMainTsContent,
            'replace'
        );

        await this.cleanup(newProject);

        await this.createDefaultFiles(newProject);

        return { root: newProject.path, oldPackageJson };
    }

    private async createDefaultFiles(newProject: WorkspaceProject): Promise<void> {
        await FsUtilities.updateFile(PathUtilities.resolve(newProject.path, 'src', 'public-api.ts'), 'export * from \'./stories\';', 'replace');
        await FsUtilities.createFile(
            PathUtilities.resolve(newProject.path, 'src', 'stories', 'index.ts'),
            'export * from \'./button/button.component\';'
        );
        await FsUtilities.createFile(
            PathUtilities.resolve(newProject.path, 'src', 'stories', 'button', 'button.component.ts'),
            buttonComponentTsContent
        );
        await FsUtilities.createFile(
            PathUtilities.resolve(newProject.path, 'src', 'stories', 'button', 'button.component.html'),
            buttonComponentHtmlContent
        );
        await FsUtilities.createFile(
            PathUtilities.resolve(newProject.path, 'src', 'stories', 'button', 'button.stories.ts'),
            buttonStoriesTsContent
        );
    }

    private async cleanup(newProject: WorkspaceProject): Promise<void> {
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', '.eslintrc.json'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'button.component.ts'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'button.css'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'button.stories.ts'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'header.component.ts'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'header.css'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'header.stories.ts'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'page.component.ts'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'page.css'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'page.stories.ts'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'user.ts'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'Configure.mdx'));
        await FsUtilities.rm(PathUtilities.resolve(newProject.path, 'src', 'stories', 'assets'));
    }

    private async setupTsConfig(root: Path, config: AddAngularLibraryConfiguration): Promise<void> {
        LogUtilities.step('Setting up the tsconfig');

        await Promise.all([
            TsConfigUtilities.updateTsConfig(config.name, { extends: `../../${BASE_TS_CONFIG_FILE_NAME}` }),
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
        const tsconfigPath: Path = PathUtilities.resolve(root, 'tsconfig.lib.json');
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
        const tsconfigPath: Path = PathUtilities.resolve(root, 'tsconfig.spec.json');
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
            extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
            files: ['src/public-api.ts'],
            include: [
                'src/**/*.spec.ts',
                'src/**/*.d.ts',
                'src/**/*.stories.ts',
                '.storybook/*.ts'
            ]
        };
        await FsUtilities.createFile(PathUtilities.resolve(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }

    private async updateNgPackageJson(root: string): Promise<void> {
        await AngularUtilities.updateNgPackageJson(PathUtilities.resolve(root, 'ng-package.json'), {
            $schema: './node_modules/ng-packagr/ng-package.schema.json',
            dest: './dist/ui',
            lib: {
                entryFile: 'src/public-api.ts'
            }
        });
    }

    private async updateAngularJson(root: string, projectName: string): Promise<void> {
        await AngularUtilities.updateAngularJson(PathUtilities.resolve(root, ANGULAR_JSON_FILE_NAME), {
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
                        },
                        storybook: {
                            options: {
                                styles: ['src/styles.css']
                            }
                        }
                    }
                }
            }
        });
    }
}