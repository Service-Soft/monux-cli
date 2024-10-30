
import { APPS_DIRECTORY_NAME, LIBS_DIRECTORY_NAME, WORKSPACE_FILE_NAME } from '../../constants';
import { DockerUtilities } from '../../docker';
import { CPUtilities, FsUtilities } from '../../encapsulation';
import { NpmUtilities } from '../../npm';
import { TsConfigUtilities } from '../../tsconfig';
import { WorkspaceUtilities } from '../../workspace';
import { exitWithError } from '../exit-with-error.function';

/**
 *
 */
export async function runInit(): Promise<void> {
    if (await FsUtilities.exists(WORKSPACE_FILE_NAME)) {
        exitWithError('Error: The current directory is already a monorepo workspace');
    }

    await NpmUtilities.init('root', false);

    await Promise.all([
        WorkspaceUtilities.createConfig(),
        TsConfigUtilities.createBaseTsConfig(),
        setupWorkspaceEslint(),
        createCspellWords(),
        DockerUtilities.createDockerCompose(),
        FsUtilities.mkdir(APPS_DIRECTORY_NAME),
        FsUtilities.mkdir(LIBS_DIRECTORY_NAME),
        createGitIgnore(),
        setupTailwind(),
        addNpmWorkspaces()
    ]);
    CPUtilities.execSync('git init');
}

/**
 *
 */
async function addNpmWorkspaces(): Promise<void> {
    await NpmUtilities.updateRootPackageJson({ workspaces: [`${APPS_DIRECTORY_NAME}/*`, `${LIBS_DIRECTORY_NAME}/*`] });
}

/**
 *
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
 *
 */
async function createCspellWords(): Promise<void> {
    await FsUtilities.createFile('cspell.words.txt', '');
}

/**
 *
 */
async function setupWorkspaceEslint(): Promise<void> {
    await NpmUtilities.installInRoot(['eslint-config-service-soft', 'eslint'], true);
    await FsUtilities.createFile('eslint.config.js', [
        'config = require(\'eslint-config-service-soft\');',
        '',
        '// eslint-disable-next-line jsdoc/require-description',
        '/** @type {import(\'eslint\').Linter.Config} */',
        'module.exports = [...config];'
    ]);
}

/**
 *
 */
async function setupTailwind(): Promise<void> {
    await NpmUtilities.installInRoot(['tailwindcss', 'postcss', 'autoprefixer'], true);

    await FsUtilities.createFile(
        'tailwind.config.js',
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