
import { ESLINT_CONFIG_FILE_NAME, PACKAGE_JSON_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { NpmPackage, NpmUtilities } from '../npm';
import { getPath } from '../utilities';

/**
 * Utilities for eslint.
 */
export abstract class EslintUtilities {
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
        await NpmUtilities.updatePackageJsonFile(
            getPath(root, PACKAGE_JSON_FILE_NAME),
            {
                scripts: {
                    lint: 'eslint . --max-warnings 0',
                    'lint:fix': 'eslint . --max-warnings 0 --fix'
                }
            }
        );
        await FsUtilities.createFile(
            getPath(root, ESLINT_CONFIG_FILE_NAME),
            [
                `import { cspellOptions } from '${NpmPackage.ESLINT_CONFIG_SERVICE_SOFT}';`,
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
                '\t\t\t\t\tcustomWordListFile: \'../../cspell.words.txt\'',
                '\t\t\t\t}',
                '\t\t\t]',
                '\t\t}',
                '\t}',
                '];'
            ]
        );
    }
}