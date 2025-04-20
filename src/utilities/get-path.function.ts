import path from 'path';

import { CPUtilities } from '../encapsulation';

/**
 * The type for a file path.
 */
export type Path = string & {
    // eslint-disable-next-line jsdoc/require-jsdoc
    __brand: 'Path'
};

/**
 * Gets a os agnostic path by joining the given parts.
 * @param paths - The paths to combine.
 * @returns The os agnostic file/dir path.
 * @throws When the given paths could not be joined.
 */
export function getPath(...paths: string[]): Path {
    try {
        const basePath: string = path.join(...paths);
        if (path.isAbsolute(basePath)) {
            return basePath as Path;
        }
        const baseRoot: string = CPUtilities['cwd'] ?? '';
        return path.join(baseRoot, basePath) as Path;
    }
    catch (error) {
        throw new Error(`Error trying to get the path ${paths.join()}`, { cause: error });
    }
}