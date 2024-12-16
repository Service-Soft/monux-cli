import path from 'path';

import { TAILWIND_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';

/**
 * Utilities for Tailwind.
 */
export abstract class TailwindUtilities {
    /**
     * Sets up tailwind in the project at the provided path.
     * @param root - The path of the project where tailwind should be setup.
     * @param disableCommentRule - Whether or not the rule jsdoc/require-jsdoc should be disabled.
     */
    static async setupProjectTailwind(root: string, disableCommentRule: boolean): Promise<void> {
        await FsUtilities.createFile(
            path.join(root, TAILWIND_CONFIG_FILE_NAME),
            [
                'baseConfig = require(\'../../tailwind.config\');',
                '' + (!disableCommentRule ? '\n// eslint-disable-next-line jsdoc/require-jsdoc' : ''),
                '/** @type {import(\'tailwindcss\').Config} */',
                'module.exports = {',
                '\tpresets: [baseConfig],',
                '\tcontent: [\'./src/**/*.{html,ts}\'],',
                '\ttheme: {',
                '\t\textend: {}',
                '\t},',
                '\tplugins: []',
                '};'
            ]
        );
    }
}