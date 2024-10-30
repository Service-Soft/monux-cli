import path from 'path';

import { FsUtilities } from '../encapsulation';

/**
 *
 */
export abstract class EslintUtilities {
    /**
     *
     * @param root
     * @param disableComments
     * @param eslintTsConfigPath
     * @param baseEslintConfigPath
     */
    static async setupProjectEslint(
        root: string,
        disableComments: boolean = false,
        eslintTsConfigPath: string = 'tsconfig.eslint.json',
        baseEslintConfigPath: string = '../../eslint.config'
    ): Promise<void> {
        await FsUtilities.createFile(
            path.join(root, 'eslint.config.js'),
            [
                `baseConfig = require('${baseEslintConfigPath}');`,
                '' + (disableComments ? '\n// eslint-disable-next-line jsdoc/require-jsdoc' : ''),
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
                '\t\trules: {' + (disableComments ? '\n\t\t\t\'jsdoc/require-description\': \'off\',' : ''),
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