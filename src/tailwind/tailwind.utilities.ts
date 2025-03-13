
import { TAILWIND_CONFIG_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { getPath } from '../utilities';

/**
 * Utilities for Tailwind.
 */
export abstract class TailwindUtilities {
    /**
     * Sets up tailwind in the project at the provided path.
     * @param root - The path of the project where tailwind should be setup.
     */
    static async setupProjectTailwind(root: string): Promise<void> {
        await FsUtilities.createFile(
            getPath(root, TAILWIND_CONFIG_FILE_NAME),
            [
                'baseConfig = require(\'../../tailwind.config\');',
                '',
                '// eslint-disable-next-line jsdoc/require-description',
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