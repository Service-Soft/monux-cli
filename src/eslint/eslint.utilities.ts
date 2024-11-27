import path from 'path';

import { ESLINT_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';

/**
 * Utilities for eslint.
 */
export abstract class EslintUtilities {
    /**
     * Sets up an eslint file inside the project at the given root.
     * @param root - The root of the project to setup eslint for.
     * @param disableCommentRule - Whether or not the rule jsdoc/require-jsdoc should be disabled.
     * @param eslintTsConfigPath - The path of the tsconfig to use for eslint.
     * @param baseEslintConfigPath - The path of the base eslint config.
     */
    static async setupProjectEslint(
        root: string,
        disableCommentRule: boolean,
        eslintTsConfigPath: string = 'tsconfig.eslint.json',
        baseEslintConfigPath: string = '../../eslint.config'
    ): Promise<void> {
        await FsUtilities.createFile(
            path.join(root, ESLINT_CONFIG_FILE_NAME),
            [
                `baseConfig = require('${baseEslintConfigPath}');`,
                '' + (!disableCommentRule ? '\n// eslint-disable-next-line jsdoc/require-jsdoc' : ''),
                '/** @type {import(\'eslint\').Linter.Config} */',
                'module.exports = [',
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
                '\t\trules: {' + (disableCommentRule ? '\n\t\t\t\'jsdoc/require-description\': \'off\',' : ''),
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