
import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { TailwindUtilities } from './tailwind.utilities';
import { TAILWIND_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { getPath } from '../utilities';

const mockConstants: MockConstants = getMockConstants('tailwind-utilities');

describe('TailwindUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('setupProjectTailwind', async () => {
        await TailwindUtilities.setupProjectTailwind(mockConstants.TS_LIBRARY_DIR);
        const lines: string[] = await FsUtilities.readFileLines(getPath(mockConstants.TS_LIBRARY_DIR, TAILWIND_CONFIG_FILE_NAME));
        expect(lines).toEqual([
            'baseConfig = require(\'../../tailwind.config\');',
            '',
            '// eslint-disable-next-line jsdoc/require-description',
            '/** @type {import(\'tailwindcss\').Config} */',
            'module.exports = {',
            '    presets: [baseConfig],',
            '    content: [\'./src/**/*.{html,ts}\'],',
            '    theme: {',
            '        extend: {}',
            '    },',
            '    plugins: []',
            '};'
        ]);
    });
});