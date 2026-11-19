import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { TAILWIND_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities, PathUtilities } from '../encapsulation';

import { TailwindUtilities } from './tailwind.utilities';

const mockConstants: MockConstants = getMockConstants('tailwind-utilities');

describe('TailwindUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('setupProjectTailwind', async () => {
        await TailwindUtilities.setupProjectTailwind(mockConstants.TS_LIBRARY_DIR);
        const lines: string[] = await FsUtilities.readFileLines(PathUtilities.resolve(mockConstants.TS_LIBRARY_DIR, TAILWIND_CONFIG_FILE_NAME));
        expect(lines).toEqual([
            'baseConfig = require(\'../../tailwind.config\');',
            '',
            '// eslint-disable-next-line jsdoc/require-description',
            '/** @type {import(\'tailwindcss\').Config} */',
            'module.exports = {',
            '    ...baseConfig,',
            '    content: [\'./src/**/*.{html,ts}\'],',
            '    theme: {',
            '        ...baseConfig.theme,',
            '        extend: {}',
            '    },',
            '    plugins: []',
            '};'
        ]);
    });
});