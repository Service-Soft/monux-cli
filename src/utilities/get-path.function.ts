import path from 'path';

import { CPUtilities } from '../encapsulation';

/**
 * Gets a os agnostic path by joining the given parts.
 * @param paths - The paths to combine.
 * @returns The os agnostic file/dir path.
 * @throws When the given paths could not be joined.
 */
export function getPath(...paths: string[]): string {
    try {
        const basePath: string = path.join(...paths);
        if (path.isAbsolute(basePath)) {
            return basePath;
        }
        const baseRoot: string = CPUtilities['cwd'] ?? '';
        return path.join(baseRoot, basePath);
    }
    catch (error) {
        throw new Error(`Error trying to get the path ${paths.join()}`, { cause: error });
    }
}