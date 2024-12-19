import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { EslintUtilities } from './eslint.utilities';

const mockConstants: MockConstants = getMockConstants('eslint-utilities');

describe('EslintUtilities', () => {

    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);
    });

    test('setupProjectEslint', async () => {
        await EslintUtilities.setupProjectEslint(mockConstants.PROJECT_DIR, true);
        const lines: string[] = await FsUtilities.readFileLines(mockConstants.ESLINT_CONFIG_JS);
        expect(lines).toEqual([
            'baseConfig = require(\'../../eslint.config\');',
            '',
            '// eslint-disable-next-line jsdoc/require-description',
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
            '            \'jsdoc/require-jsdoc\': \'off\',',
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