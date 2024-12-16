import path from 'path';

import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { TailwindUtilities } from './tailwind.utilities';
import { TAILWIND_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';

const mockConstants: MockConstants = getMockConstants('tailwind-utilities');

describe('TailwindUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);
    });

    test('setupProjectTailwind', async () => {
        await TailwindUtilities.setupProjectTailwind(mockConstants.TS_LIBRARY_DIR, true);
        const lines: string[] = await FsUtilities.readFileLines(path.join(mockConstants.TS_LIBRARY_DIR, TAILWIND_CONFIG_FILE_NAME));
        expect(lines).toEqual([
            'baseConfig = require(\'../../tailwind.config\');',
            '',
            '/** @type {import(\'tailwindcss\').Config} */',
            'module.exports = {',
            '    presets: [baseConfig],',
            '    content: [\'./**/*.{html,ts}\'],',
            '    theme: {',
            '        extend: {}',
            '    },',
            '    plugins: []',
            '};'
        ]);
    });
});