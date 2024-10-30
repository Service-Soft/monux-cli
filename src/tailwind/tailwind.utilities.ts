import path from 'path';

import { FsUtilities } from '../encapsulation';

/**
 *
 */
export abstract class TailwindUtilities {
    /**
     *
     * @param root
     * @param baseTailwindConfigPath
     */
    static async setupProjectTailwind(root: string, baseTailwindConfigPath: string = '../../'): Promise<void> {
        await FsUtilities.createFile(
            path.join(root, 'tailwind.config.js'),
            [
                `baseConfig = require('${baseTailwindConfigPath}');`,
                '',
                '// eslint-disable-next-line jsdoc/require-description',
                '/** @type {import(\'tailwindcss\').Config} */',
                'module.exports = {',
                '\tpresets: [baseConfig],',
                '\tcontent: [\'./**/*.{html,ts}\'],',
                '\ttheme: {',
                '\t\textend: {}',
                '\t},',
                '\tplugins: []',
                '};'
            ]
        );
    }
}