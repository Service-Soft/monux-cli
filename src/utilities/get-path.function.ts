import path from 'path';

/**
 * Gets a os agnostic path by joining the given parts.
 * @param paths - The paths to combine.
 * @returns The os agnostic file/dir path.
 * @throws When the given paths could not be joined.
 */
export function getPath(...paths: string[]): string {
    try {
        return path.join(...paths);
    }
    catch (error) {
        throw new Error(`Error trying to get the path ${paths.join()}`, { cause: error });
    }
}