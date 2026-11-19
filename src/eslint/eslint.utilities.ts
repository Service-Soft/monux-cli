import { CSPELL_WORDS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, PACKAGE_JSON_FILE_NAME } from '../constants';
import { CPUtilities, FsUtilities, Path, PathUtilities } from '../encapsulation';
import { NpmPackage, NpmUtilities } from '../npm';

/**
 * Utilities for eslint.
 */
export abstract class EslintUtilities {
    /**
     * Sets up eslint in the root of a workspace: the config every project extends, and the words its spellchecker knows.
     */
    static async setupRootEslint(): Promise<void> {
        await FsUtilities.createFile(PathUtilities.resolve(ESLINT_CONFIG_FILE_NAME), [
            `import { configs } from '${NpmPackage.SERVICE_SOFT_ESLINT_CONFIG}';`,
            '',
            '// eslint-disable-next-line jsdoc/require-description',
            '/** @type {import(\'eslint\').Linter.Config} */',
            'export default [...configs , { ignores: [\'./global-environment.model.ts\'] }];'
        ]);
        await FsUtilities.createFile(PathUtilities.resolve(CSPELL_WORDS_FILE_NAME), '');
    }

    /**
     * Adds words to the ones the spellchecker of the workspace knows, such as the names of a framework's dependencies.
     * @param words - The words to add. The ones the workspace knows already are left out.
     */
    static async addWords(words: string[]): Promise<void> {
        const path: Path = PathUtilities.resolve(CSPELL_WORDS_FILE_NAME);
        const known: string[] = (await FsUtilities.readFileLines(path)).filter(w => w);
        const missing: string[] = words.filter(w => !known.includes(w));
        if (missing.length) {
            await FsUtilities.updateFile(path, [...known, ...missing], 'replace');
        }
    }

    /**
     * Fixes what eslint can fix in the project at the given root, such as the order of imports in a framework's output.
     * What it cannot fix is left for the lint of the project to report.
     * @param root - The root of the project.
     */
    static async fix(root: string): Promise<void> {
        // without --max-warnings, so that what is left over does not stop the generation
        await CPUtilities.exec(`cd ${root} && npx eslint . --fix`, false);
    }

    /**
     * Adds the npm scripts that lint the project at the given root, for a project whose eslint config comes from a template.
     * @param root - The root of the project.
     */
    static async addLintScripts(root: string): Promise<void> {
        await NpmUtilities.updatePackageJsonFile(
            PathUtilities.resolve(root, PACKAGE_JSON_FILE_NAME),
            {
                scripts: {
                    lint: 'eslint . --max-warnings 0',
                    'lint:fix': 'eslint . --max-warnings 0 --fix'
                }
            }
        );
    }

    /**
     * Sets up an eslint file inside the project at the given root.
     * @param root - The root of the project to setup eslint for.
     * @param disableCommentRule - Whether or not the rule jsdoc/require-jsdoc should be disabled.
     * @param eslintTsConfigPath - The path of the tsconfig to use for eslint.
     */
    static async setupProjectEslint(
        root: string,
        disableCommentRule: boolean,
        eslintTsConfigPath: string = 'tsconfig.eslint.json'
    ): Promise<void> {
        const baseEslintConfigPath: string = '../../eslint.config.mjs';
        await this.addLintScripts(root);
        await FsUtilities.createFile(
            PathUtilities.resolve(root, ESLINT_CONFIG_FILE_NAME),
            [
                `import { cspellOptions } from '${NpmPackage.SERVICE_SOFT_ESLINT_CONFIG}';`,
                `import baseConfig from '${baseEslintConfigPath}';`,
                '',
                '// eslint-disable-next-line jsdoc/require-description',
                '/** @type {import(\'eslint\').Linter.Config} */',
                'export default [',
                '\t...baseConfig,',
                '\t{',
                '\t\tfiles: [\'**/*.ts\'],',
                '\t\tlanguageOptions: {',
                '\t\t\tparserOptions: {',
                `\t\t\t\tproject: ['${eslintTsConfigPath}']`,
                '\t\t\t}',
                '\t\t}',
                '\t},',
                '\t{',
                '\t\trules: {' + (disableCommentRule ? '\n\t\t\t\'jsdoc/require-jsdoc\': \'off\',' : ''),
                '\t\t\t\'cspell/spellchecker\': [',
                '\t\t\t\t\'warn\',',
                '\t\t\t\t{',
                '\t\t\t\t\t...cspellOptions,',
                `\t\t\t\t\tcustomWordListFile: '../../${CSPELL_WORDS_FILE_NAME}'`,
                '\t\t\t\t}',
                '\t\t\t]',
                '\t\t}',
                '\t}',
                '];'
            ]
        );
    }
}