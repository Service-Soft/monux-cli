import { AngularJson, AngularUtilities } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, LogUtilities, Path, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TemplateUtilities } from '../../../templates';
import { DeepPartial, OmitStrict } from '../../../types';
import { StringUtilities } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { BaseAddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for adding a new angular website.
 */
type AddAngularWebsiteConfiguration = AddConfiguration & {
    /**
     * The port the website is served on during development.
     * @default 4200
     */
    port: number,
    /**
     * The sub domain that this service should be reached under.
     * If nothing is provided, Monux assumes that the service should be reached under the root domain
     * and under the www sub domain.
     */
    subDomain?: string,
    /**
     * The name of the website, as its pages show it in their titles.
     */
    title: string,
    /**
     * The language the website is written in, such as "en" or "de".
     */
    language: string
};

// what the title ends up in: typescript strings, html and the meta tags of the pages
const TITLE_REGEX: RegExp = /^[^"'<>\\{}`]+$/;
const LANGUAGE_REGEX: RegExp = /^[a-z]{2}(-[A-Z]{2})?$/;

// how much a page downloads before it is shown, raw, see the goals of the website. Angular, its router and hydration
// are about 370kB of it, the libraries and the pages the rest. The build fails beyond, so that a heavy dependency added
// to the first load does not go unnoticed. How fast the page is, is measured by lighthouse, not by this
const INITIAL_BUDGET_WARNING: string = '450kB';
const INITIAL_BUDGET_ERROR: string = '550kB';

/**
 * Command that handles adding an angular website to the monorepo.
 */
export class AddAngularWebsiteCommand extends BaseAddCommand<AddAngularWebsiteConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddAngularWebsiteConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            name: 'port',
            message: 'Port',
            validate: (v?: number) => !!v,
            default: 4200
        },
        subDomain: {
            type: 'input',
            name: 'subDomain',
            message: 'Sub domain'
        },
        title: {
            type: 'input',
            name: 'title',
            message: 'Name of the website, as its titles show it',
            validate: (v?: string) => v != undefined && TITLE_REGEX.test(v) ? true : 'The name needs to be without quotes, "<", ">", "{", "}" and "\\"',
            default: StringUtilities.toPascalCase(this.baseConfig.name)
        },
        language: {
            type: 'input',
            name: 'language',
            message: 'Language of the website',
            validate: (v?: string) => v != undefined && LANGUAGE_REGEX.test(v) ? true : 'The language needs to be a code like "en" or "de-AT"',
            default: 'en'
        }
    };

    protected override async run(): Promise<void> {
        const config: AddAngularWebsiteConfiguration = await this.getConfig();
        const root: Path = await this.createProject(config);

        LogUtilities.step('Adding the pages, the navigation and what makes the website fast and findable');
        await this.cleanUp(root);
        await TemplateUtilities.write('angular-website', root, {
            name: config.name,
            prefix: StringUtilities.toSnakeCase(config.name),
            title: config.title,
            language: config.language
        });
        await this.installDependencies(config.name);
        await this.updatePackageJson(config);
        await this.updateAngularJson(root, config.name);

        await this.addToCompose(root, config);
        await this.setupEnvironment(root, config.name);

        LogUtilities.step('Setting up eslint');
        await EslintUtilities.addLintScripts(root);
        await EslintUtilities.addWords(['postbuild', 'prerendered']);
        await EslintUtilities.fix(root);
        LogUtilities.success(`Added "${config.name}" in ${PathUtilities.getRelative(PathUtilities.resolve('.'), root)}`);
    }

    private async createProject(config: AddAngularWebsiteConfiguration): Promise<Path> {
        LogUtilities.step('Creating the Angular project');
        await AngularUtilities.runCommand(
            PathUtilities.resolve(APPS_DIRECTORY_NAME),
            `new ${config.name}`,
            {
                '--skip-git': true,
                '--style': 'tailwind',
                '--ssr': true,
                '--zoneless': true,
                '--ai-config': 'none',
                '--file-name-style-guide': '2016',
                '--defaults': true
            }
        );
        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        return project.path;
    }

    private async cleanUp(root: Path): Promise<void> {
        // what the workspace has once for every project, or what the template replaces
        await Promise.all([
            '.vscode',
            '.editorconfig',
            '.gitignore',
            '.prettierrc',
            'README.md',
            'src/app/app.component.css'
        ].map(f => FsUtilities.rm(PathUtilities.resolve(root, f))));
    }

    private async installDependencies(name: string): Promise<void> {
        LogUtilities.step('Installing the libraries');
        await NpmUtilities.install(name, [
            NpmPackage.SERVICE_SOFT_UI,
            NpmPackage.SERVICE_SOFT_NGX_NAVIGATION,
            NpmPackage.FONTAWESOME_SOLID_ICONS
        ]);
        await NpmUtilities.install(name, [
            NpmPackage.TAILWIND_CLI,
            NpmPackage.SUBSET_FONT,
            NpmPackage.ESLINT_PLUGIN_BETTER_TAILWINDCSS
        ], true);
    }

    private async updatePackageJson(config: AddAngularWebsiteConfiguration): Promise<void> {
        await NpmUtilities.updatePackageJson(config.name, {
            scripts: {
                start: `ng serve --port ${config.port}`,
                build: 'ng build && node scripts/postbuild.mjs',
                test: 'ng test --watch=false'
            }
        });
    }

    private async updateAngularJson(root: Path, name: string): Promise<void> {
        const update: DeepPartial<AngularJson> = {
            projects: {
                [name]: {
                    architect: {
                        build: {
                            configurations: {
                                production: {
                                    budgets: [
                                        { type: 'initial', maximumWarning: INITIAL_BUDGET_WARNING, maximumError: INITIAL_BUDGET_ERROR },
                                        { type: 'anyComponentStyle', maximumWarning: '2kB', maximumError: '4kB' }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        };
        await AngularUtilities.updateAngularJson(PathUtilities.resolve(root, ANGULAR_JSON_FILE_NAME), update);
    }

    private async addToCompose(root: Path, config: AddAngularWebsiteConfiguration): Promise<void> {
        const projectDirectory: string = PathUtilities.getRelative(PathUtilities.resolve('.'), root);
        await DockerUtilities.addServiceToCompose(
            {
                name: config.name,
                build: {
                    dockerfile: `./${projectDirectory}/${DOCKER_FILE_NAME}`,
                    context: '.'
                }
            },
            4000,
            config.port,
            true,
            true,
            config.subDomain
        );
        await DockerUtilities.addAllowedHosts(config.name, config.subDomain);
    }

    private async setupEnvironment(root: Path, name: string): Promise<void> {
        await EnvUtilities.setupProjectEnvironment(root, false);
        const environmentModel: Path = PathUtilities.resolve(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);
        for (const key of [DefaultEnvKeys.ENV, DefaultEnvKeys.baseUrl(name)]) {
            await EnvUtilities.addProjectVariableKey(name, environmentModel, key, false, PathUtilities.resolve('.'));
        }
    }
}