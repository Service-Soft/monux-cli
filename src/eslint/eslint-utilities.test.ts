
import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities } from '../encapsulation';
import { EslintUtilities } from './eslint.utilities';

const mockConstants: MockConstants = getMockConstants('eslint-utilities');

describe('EslintUtilities', () => {

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants, ['ANGULAR_PACKAGE_JSON']);
    });

    test('setupProjectEslint', async () => {
        await EslintUtilities.setupProjectEslint(mockConstants.ANGULAR_APP_DIR, true);
        const lines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_ESLINT_CONFIG_MJS);
        expect(lines).toEqual([
            'import { cspellOptions } from \'eslint-config-service-soft\';',
            'import baseConfig from \'../../eslint.config.mjs\';',
            '',
            '// eslint-disable-next-line jsdoc/require-description',
            '/** @type {import(\'eslint\').Linter.Config} */',
            'export default [',
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
            '        rules: {',
            '            \'jsdoc/require-jsdoc\': \'off\',',
            '            \'cspell/spellchecker\': [',
            '                \'warn\',',
            '                {',
            '                    ...cspellOptions,',
            '                    customWordListFile: \'../../cspell.words.txt\'',
            '                }',
            '            ]',
            '        }',
            '    }',
            '];'
        ]);
    });
});