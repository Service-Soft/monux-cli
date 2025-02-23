
import { APPS_DIRECTORY_NAME, ENV_FILE_NAME, ENVIRONMENT_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, ROBOTS_FILE_NAME, TAILWIND_CONFIG_FILE_NAME, WORKSPACE_FILE_NAME } from '../../constants';
import { DockerUtilities } from '../../docker';
import { CPUtilities, FsUtilities, InquirerUtilities, QuestionsFor } from '../../encapsulation';
import { EnvUtilities } from '../../env';
import { NpmPackage, NpmUtilities } from '../../npm';
import { TsConfigUtilities } from '../../tsconfig';
import { WorkspaceUtilities } from '../../workspace';
import { exitWithError } from '../exit-with-error.function';
import { InitConfiguration } from './init-configuration.model';
import { GithubUtilities } from '../../github';

const initConfigQuestions: QuestionsFor<InitConfiguration> = {
    email: {
        type: 'input',
        message: 'E-Mail (needed for ssl certificates)',
        required: true
    },
    setupGithubActions: {
        type: 'select',
        message: 'Setup Github Actions?',
        choices: [{ value: true, name: 'Yes' }, { value: false, name: 'No' }],
        default: true
    }
};

/**
 * Runs the init cli command.
 */
export async function runInit(): Promise<void> {
    if (await FsUtilities.exists(WORKSPACE_FILE_NAME)) {
        exitWithError('Error: The current directory is already a monorepo workspace');
    }

    const config: InitConfiguration = await InquirerUtilities.prompt(initConfigQuestions);

    await NpmUtilities.init('root', false);

    NpmUtilities.installInRoot([
        NpmPackage.ESLINT_CONFIG_SERVICE_SOFT,
        NpmPackage.ESLINT,
        NpmPackage.TAILWIND,
        NpmPackage.POSTCSS,
        NpmPackage.AUTOPREFIXER
    ], true);

    await EnvUtilities.init();

    await Promise.all([
        WorkspaceUtilities.createConfig(),
        TsConfigUtilities.createBaseTsConfig(),
        createEslintConfig(),
        createCspellWords(),
        DockerUtilities.createDockerCompose(config.email),
        DockerUtilities.createDevDockerCompose(),
        FsUtilities.mkdir(APPS_DIRECTORY_NAME),
        FsUtilities.mkdir(LIBS_DIRECTORY_NAME),
        createGitIgnore(),
        createTailwindConfig(),
        addNpmWorkspaces()
    ]);

    CPUtilities.execSync('git init');
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

/**
 * Adds the base npm workspaces for the monorepo.
 */
async function addNpmWorkspaces(): Promise<void> {
    await NpmUtilities.updateRootPackageJson({ workspaces: [`${APPS_DIRECTORY_NAME}/*`, `${LIBS_DIRECTORY_NAME}/*`] });
}

/**
 * Creates the base .gitignore.
 */
async function createGitIgnore(): Promise<void> {
    await FsUtilities.createFile(GIT_IGNORE_FILE_NAME, [
        '# See http://help.github.com/ignore-files/ for more about ignoring files.',
        ENV_FILE_NAME,
        ENVIRONMENT_TS_FILE_NAME,
        ROBOTS_FILE_NAME,
        '**/init/**.sh',
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

/**
 * Creates a cspell words txt file used for spell checking.
 */
async function createCspellWords(): Promise<void> {
    await FsUtilities.createFile('cspell.words.txt', '');
}

/**
 * Creates an eslint config.
 */
async function createEslintConfig(): Promise<void> {
    await FsUtilities.createFile(ESLINT_CONFIG_FILE_NAME, [
        'config = require(\'eslint-config-service-soft\');',
        '',
        '// eslint-disable-next-line jsdoc/require-description',
        '/** @type {import(\'eslint\').Linter.Config} */',
        'module.exports = [...config];'
    ]);
}

/**
 * Creates a tailwind config file.
 */
async function createTailwindConfig(): Promise<void> {
    await FsUtilities.createFile(
        TAILWIND_CONFIG_FILE_NAME,
        [
            '// eslint-disable-next-line jsdoc/require-description',
            '/** @type {import(\'tailwindcss\').Config} */',
            'module.exports = {',
            '\tcontent: [],',
            '\ttheme: {',
            '\t\textend: {}',
            '\t},',
            '\tplugins: []',
            '};'
        ]
    );
}