import { APPS_DIRECTORY_NAME, ENV_FILE_NAME, ENVIRONMENT_TS_FILE_NAME, GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, ROBOTS_FILE_NAME } from '../../constants';
import { DockerUtilities } from '../../docker';
import { CPUtilities, FsUtilities, InquirerUtilities, ProcessUtilities, PathUtilities } from '../../encapsulation';
import { EnvUtilities } from '../../env';
import { EslintUtilities } from '../../eslint';
import { GithubUtilities } from '../../github';
import { NpmPackage, NpmUtilities } from '../../npm';
import { TemplateUtilities } from '../../templates';
import { TsConfigUtilities } from '../../tsconfig';
import { WorkspaceConfig, WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { initConfigQuestions, InitConfiguration } from './init-configuration.model';

/**
 * Initializes a new Monux monorepo.
 */
export class InitCommand extends BaseCommand<InitConfiguration> {
    protected override async run(config: InitConfiguration): Promise<void> {
        await NpmUtilities.init('root', false);

        // tailwind is a dependency of each project that uses it, the theme they share is a css file
        await NpmUtilities.installInRoot([NpmPackage.SERVICE_SOFT_ESLINT_CONFIG, NpmPackage.ESLINT], true);

        await EnvUtilities.init(config.prodRootDomain, config.stageRootDomain, 'user', 'password');

        await Promise.all([
            WorkspaceUtilities.createConfig(),
            TsConfigUtilities.createBaseTsConfig(),
            EslintUtilities.setupRootEslint(),
            DockerUtilities.createComposeFiles(config.email),
            FsUtilities.mkdir(PathUtilities.resolve(APPS_DIRECTORY_NAME)),
            FsUtilities.mkdir(PathUtilities.resolve(LIBS_DIRECTORY_NAME)),
            this.createGitIgnore(),
            TemplateUtilities.write('workspace', PathUtilities.resolve('.'), {}),
            this.addNpmWorkspaces()
        ]);

        await CPUtilities.exec('git init');
        if (config.setupGithubActions) {
            await GithubUtilities.createWorkflow({
                name: 'main',
                on: 'push',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { uses: 'actions/checkout@v4' },
                            { name: 'npm i', run: 'npm ci' },
                            { name: 'Linting', run: 'npm run lint --workspaces --if-present' },
                            { name: 'Unit Tests', run: 'npm run test --workspaces --if-present' }
                        ]
                    }
                }
            });
        }
    }

    protected override async resolveInput(): Promise<InitConfiguration> {
        const config: InitConfiguration = await InquirerUtilities.prompt(initConfigQuestions);
        return config;
    }

    protected override async validate(args: string[]): Promise<void> {
        await super.validate(args);
        const config: WorkspaceConfig | undefined = await WorkspaceUtilities.getConfig();
        if (config?.isWorkspace === true) {
            await ProcessUtilities.exitWithError('The current directory is already a workspace.');
        }
    }

    private async addNpmWorkspaces(): Promise<void> {
        await NpmUtilities.updateRootPackageJson({ workspaces: [`${APPS_DIRECTORY_NAME}/*`, `${LIBS_DIRECTORY_NAME}/*`] });
    }

    private async createGitIgnore(): Promise<void> {
        await FsUtilities.createFile(PathUtilities.resolve(GIT_IGNORE_FILE_NAME), [
            '# See http://help.github.com/ignore-files/ for more about ignoring files.',
            ENV_FILE_NAME,
            ENVIRONMENT_TS_FILE_NAME,
            ROBOTS_FILE_NAME,
            '**/init/**.sql',
            'letsencrypt',
            '# compiled output',
            'dist',
            'tmp',
            'out-tsc',
            'storybook-static',
            '.angular',
            'tsconfig.tsbuildinfo',
            '# node_modules',
            'node_modules'
        ]);
    }

}