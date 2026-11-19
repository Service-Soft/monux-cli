import path from 'node:path';

import { CPUtilities } from './cp.utilities';

/**
 * The type for a file path.
 */
export type Path = string & {
    // eslint-disable-next-line jsdoc/require-jsdoc
    __brand: 'Path'
};

/**
 * Encapsulates functionality of the path package.
 */
export abstract class PathUtilities {
    /**
     * Resolves an os agnostic path by joining the given parts.
     * A relative path is resolved against the directory Monux runs in.
     * @param paths - The paths to combine.
     * @returns The os agnostic, absolute file or directory path.
     * @throws When the given paths could not be joined.
     */
    static resolve(...paths: string[]): Path {
        try {
            const basePath: string = path.join(...paths);
            if (path.isAbsolute(basePath)) {
                return basePath as Path;
            }
            const baseRoot: string = CPUtilities['cwd'] ?? '';
            return path.join(baseRoot, basePath) as Path;
        }
        catch (error) {
            throw new Error(`Error trying to resolve the path ${paths.join()}`, { cause: error });
        }
    }

    /**
     * Gets the directory the given path is in.
     * @param filePath - The path to get the directory of.
     * @returns The path of the parent directory.
     */
    static getDirectory(filePath: string): Path {
        return path.dirname(filePath) as Path;
    }

    /**
     * Gets the last part of the given path, such as the name of a file.
     * @param filePath - The path to get the last part of.
     * @returns The name of the file or directory.
     */
    static getName(filePath: string): string {
        return path.basename(filePath);
    }

    /**
     * Gets the path that leads from one path to another.
     * @param from - The path to start at.
     * @param to - The path to arrive at.
     * @returns The relative path, such as "src/app/app.ts".
     */
    static getRelative(from: string, to: string): string {
        return path.relative(from, to);
    }
}