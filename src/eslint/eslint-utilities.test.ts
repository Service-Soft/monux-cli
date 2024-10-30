import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, mockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { EslintUtilities } from './eslint.utilities';

describe('EslintUtilities', () => {

    beforeEach(async () => {
        await FileMockUtilities.clearTemp();
    });

    test('setupProjectEslint', async () => {
        await EslintUtilities.setupProjectEslint(mockConstants.TMP_DIR);
        const lines: string[] = await FsUtilities.readFileLines(mockConstants.ESLINT_CONFIG_JS);
        expect(lines).toEqual([
            'baseConfig = require(\'../../eslint.config\');',
            '',
            '/** @type {import(\'eslint\').Linter.Config} */',
            'module.exports = [',
            '    ...baseConfig,',
            '    {',
            '        files: [\'**/*.ts\'],',
            '        languageOptions: {',
            '            parserOptions: {',
            '                project: [\'tsconfig.eslint.json\']',
            '            }',
            '        }',
            '    },',
            '    {',
            '        files: [\'**/*.ts\', \'**/*.handlebars\', \'**/*.html\', \'**/*.js\', \'**/*.json\'],',
            '        rules: {',
            '            \'cspell/spellchecker\': [',
            '                \'warn\',',
            '                {',
            '                    customWordListFile: \'../../cspell.words.txt\'',
            '                }',
            '            ]',
            '        }',
            '    }',
            '];'
        ]);
    });
});