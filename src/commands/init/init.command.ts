
import { APPS_DIRECTORY_NAME, ESLINT_CONFIG_FILE_NAME, LIBS_DIRECTORY_NAME, TAILWIND_CONFIG_FILE_NAME, WORKSPACE_FILE_NAME } from '../../constants';
import { DockerUtilities } from '../../docker';
import { CPUtilities, FsUtilities } from '../../encapsulation';
import { NpmUtilities } from '../../npm';
import { TsConfigUtilities } from '../../tsconfig';
import { WorkspaceUtilities } from '../../workspace';
import { exitWithError } from '../exit-with-error.function';

/**
 * Runs the init cli command.
 */
export async function runInit(): Promise<void> {
    if (await FsUtilities.exists(WORKSPACE_FILE_NAME)) {
        exitWithError('Error: The current directory is already a monorepo workspace');
    }

    await NpmUtilities.init('root', false);

    NpmUtilities.installInRoot(['eslint-config-service-soft', 'eslint', 'tailwindcss', 'postcss', 'autoprefixer'], true);

    await Promise.all([
        WorkspaceUtilities.createConfig(),
        TsConfigUtilities.createBaseTsConfig(),
        createEslintConfig(),
        createCspellWords(),
        DockerUtilities.createDockerCompose(),
        FsUtilities.mkdir(APPS_DIRECTORY_NAME),
        FsUtilities.mkdir(LIBS_DIRECTORY_NAME),
        createGitIgnore(),
        createTailwindConfig(),
        addNpmWorkspaces()
    ]);
    CPUtilities.execSync('git init');
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
    await FsUtilities.createFile('.gitignore', [
        '# See http://help.github.com/ignore-files/ for more about ignoring files.',
        'secrets.ts',
        '# compiled output',
        'dist',
        'tmp',
        'build',
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