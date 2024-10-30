import json5 from 'json5';

/**
 * Utilities for parsing and stringifying json.
 */
export abstract class JsonUtilities {
    /**
     * Parses the given string as an object of type T.
     * @param value - The raw string to parse.
     * @returns The parsed object.
     */
    static parse<T>(value: string): T {
        return json5.parse(value);
    }

    /**
     * Stringifies the given value into a json string.
     * @param value - The value to stringify.
     * @returns The json string, formatted with 4 spaces.
     */
    static stringify<T>(value: T): string {
        return JSON.stringify(value, undefined, 4);
    }
}