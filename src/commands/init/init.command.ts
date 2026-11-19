import { APPS_DIRECTORY_NAME, ENV_FILE_NAME, ENVIRONMENT_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, ROBOTS_FILE_NAME, TAILWIND_CONFIG_FILE_NAME } from '../../constants';
import { DockerUtilities } from '../../docker';
import { CPUtilities, FsUtilities, InquirerUtilities, ProcessUtilities, PathUtilities } from '../../encapsulation';
import { EnvUtilities } from '../../env';
import { GithubUtilities } from '../../github';
import { NpmPackage, NpmUtilities } from '../../npm';
import { TsConfigUtilities } from '../../tsconfig';
import { WorkspaceConfig, WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { initConfigQuestions, InitConfiguration } from './init-configuration.model';
import { tailwindConfigJsContent } from './tailwind-config-js.content';

/**
 * Initializes a new Monux monorepo.
 */
export class InitCommand extends BaseCommand<InitConfiguration> {
    protected override async run(config: InitConfiguration): Promise<void> {
        await NpmUtilities.init('root', false);

        await NpmUtilities.installInRoot([
            NpmPackage.ESLINT_CONFIG_SERVICE_SOFT,
            NpmPackage.ESLINT,
            NpmPackage.TAILWIND,
            NpmPackage.POSTCSS,
            NpmPackage.AUTOPREFIXER
        ], true);

        await EnvUtilities.init(config.prodRootDomain, config.stageRootDomain, 'user', 'password');

        await Promise.all([
            WorkspaceUtilities.createConfig(),
            TsConfigUtilities.createBaseTsConfig(),
            this.createEslintConfig(),
            this.createCspellWords(),
            DockerUtilities.createComposeFiles(config.email),
            FsUtilities.mkdir(PathUtilities.resolve(APPS_DIRECTORY_NAME)),
            FsUtilities.mkdir(PathUtilities.resolve(LIBS_DIRECTORY_NAME)),
            this.createGitIgnore(),
            this.createTailwindConfig(),
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
            '/out-tsc',
            '.angular',
            'tsconfig.tsbuildinfo',
            '# node_modules',
            'node_modules'
        ]);
    }

    private async createCspellWords(): Promise<void> {
        await FsUtilities.createFile(PathUtilities.resolve('cspell.words.txt'), '');
    }

    private async createEslintConfig(): Promise<void> {
        await FsUtilities.createFile(PathUtilities.resolve(ESLINT_CONFIG_FILE_NAME), [
            `import { configs } from '${NpmPackage.ESLINT_CONFIG_SERVICE_SOFT}';`,
            '',
            '// eslint-disable-next-line jsdoc/require-description',
            '/** @type {import(\'eslint\').Linter.Config} */',
            'export default [...configs , { ignores: [\'./global-environment.model.ts\'] }];'
        ]);
    }

    private async createTailwindConfig(): Promise<void> {
        await FsUtilities.createFile(
            PathUtilities.resolve(TAILWIND_CONFIG_FILE_NAME),
            tailwindConfigJsContent
        );
    }
}