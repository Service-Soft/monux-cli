import { JsonUtilities } from '../encapsulation';

/**
 * Transforms the given options into a cli string.
 * @param options - The cli options to transform.
 * @param separator - The character between the option name and the options value. Defaults to '='.
 * @returns The transformed string.
 */
export function optionsToCliString<T extends object>(options: T, separator: string = '='): string {
    let res: string = '';
    for (const key in options) {
        if (options[key] !== false) {
            res += res.length ? ' ' : ''; // Add space to separate from prior argument
            res += `${key}${transformValue(options[key], separator)}`;
        }
    }
    return res;
}

// eslint-disable-next-line jsdoc/require-jsdoc
function transformValue(value: unknown, separator: string): string {
    if (value === true) {
        return '';
    }
    if (typeof value === 'object') {
        return `${separator}'${JsonUtilities.stringify(value)}'`;
    }
    // eslint-disable-next-line typescript/no-base-to-string
    return `${separator}${value}`;
}