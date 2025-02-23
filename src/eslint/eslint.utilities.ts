import path from 'path';

import { ESLINT_CONFIG_FILE_NAME, PACKAGE_JSON_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { NpmUtilities } from '../npm';

/**
 * Utilities for eslint.
 */
export abstract class EslintUtilities {
    /**
     * Sets up an eslint file inside the project at the given root.
     * @param root - The root of the project to setup eslint for.
     * @param disableCommentRule - Whether or not the rule jsdoc/require-jsdoc should be disabled.
     * @param useModuleJs - Whether to use module or common js syntax for the eslint config.
     * @param eslintTsConfigPath - The path of the tsconfig to use for eslint.
     * @param baseEslintConfigPath - The path of the base eslint config.
     */
    static async setupProjectEslint(
        root: string,
        disableCommentRule: boolean,
        useModuleJs: boolean = false,
        eslintTsConfigPath: string = 'tsconfig.eslint.json',
        baseEslintConfigPath: string = '../../eslint.config'
    ): Promise<void> {
        await NpmUtilities.updatePackageJsonFile(
            path.join(root, PACKAGE_JSON_FILE_NAME),
            {
                scripts: {
                    lint: 'eslint . --max-warnings 0',
                    'lint:fix': 'eslint . --max-warnings 0 --fix'
                }
            }
        );
        await FsUtilities.createFile(
            path.join(root, ESLINT_CONFIG_FILE_NAME),
            [
                useModuleJs ? 'import baseConfig from \'../../eslint.config.js\';' : `baseConfig = require('${baseEslintConfigPath}');`,
                '',
                '// eslint-disable-next-line jsdoc/require-description',
                '/** @type {import(\'eslint\').Linter.Config} */',
                useModuleJs ? 'export default [' : 'module.exports = [',
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
                '\t\tfiles: [\'**/*.ts\', \'**/*.handlebars\', \'**/*.html\', \'**/*.js\', \'**/*.json\'],',
                '\t\trules: {' + (disableCommentRule ? '\n\t\t\t\'jsdoc/require-jsdoc\': \'off\',' : ''),
                '\t\t\t\'cspell/spellchecker\': [',
                '\t\t\t\t\'warn\',',
                '\t\t\t\t{',
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