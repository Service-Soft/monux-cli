import json5 from 'json5';

import { customTsStringToValue, CustomTsValues, customTsValueToString } from './custom-ts.resolver';

/**
 * Utilities for parsing and stringifying json.
 */
export abstract class JsonUtilities {

    private static readonly indent: number = 4;

    /**
     * Parses the given string as an object of type T.
     * @param value - The raw string to parse.
     * @returns The parsed object.
     * @throws When the given value could not be parsed.
     */
    static parse<T>(value: string): T {
        try {
            return json5.parse(value);
        }
        catch (error) {
            throw new Error(`Could not parse value:\n ${this.stringify(value)}\n${error}`);
        }
    }

    /**
     * Stringifies the given value into a json string.
     * @param value - The value to stringify.
     * @returns The json string, formatted with 4 spaces.
     */
    static stringify<T>(value: T): string {
        return JSON.stringify(value, undefined, this.indent);
    }

    /**
     * Parses the given string as typescript.
     * @param value - The string to parse.
     * @returns The parsed typescript.
     */
    static parseAsTs<T>(value: string): T {
        const strippedValue: string = value.trim();

        if (strippedValue === 'null') {
            // eslint-disable-next-line unicorn/no-null
            return null as T;
        }
        if (strippedValue === 'undefined' || strippedValue === '') {
            return undefined as T;
        }

        if (this.isCustomTsValue(strippedValue)) {
            return customTsStringToValue[strippedValue] as T;
        }

        // Handle import functions
        if (/^\(\) => import\(.+\)\.then\(.+\)$/.test(strippedValue)) {
            return eval(strippedValue) as T;
        }

        if (strippedValue.startsWith('[') && strippedValue.endsWith(']')) {
            return this.parseArrayAsTs(strippedValue) as T;
        }

        // Handle objects
        if (strippedValue.startsWith('{') && strippedValue.endsWith('}')) {
            return this.parseObjectAsTs(strippedValue) as T;
        }

        // Handle quoted strings
        if (this.isQuotedString(strippedValue)) {
            return strippedValue.slice(1, -1) as T; // Remove quotes
        }

        return strippedValue as T;
    }

    /**
     * Stringifies the given value into a ts string.
     * @param value - The value to stringify.
     * @param currentIndent - The current indentation level in spaces. Defaults to zero.
     * @returns The ts string, formatted with 4 spaces.
     * @throws When the type of the given value is not known.
     */
    static stringifyAsTs<T>(value: T, currentIndent: number = 0): string {
        if (value === null || value === undefined) {
            return `${value}`;
        }

        switch (typeof value) {
            case 'string': {
                return this.stringToTsString(value);
            }
            case 'function': {
                return this.functionToTsString(value);
            }
            case 'object': {
                if (Array.isArray(value)) {
                    return this.arrayToTsString(value, currentIndent);
                }
                return this.objectToTsString(value, currentIndent);
            }
            case 'boolean':
            case 'number':
            case 'bigint':
            case 'symbol': {
                return String(value);
            }
            default: {
                throw new Error(`Could not stringify property with type ${typeof value}:\n ${value}`);
            }
        }
    }

    private static isQuotedString(strippedValue: string): boolean {
        return (strippedValue.startsWith('\'') && strippedValue.endsWith('\''))
            || (strippedValue.startsWith('"') && strippedValue.endsWith('"'));
    }

    private static parseObjectAsTs(strippedValue: string): Record<string, unknown> {
        const innerContent: string = strippedValue.slice(1, -1).trim();
        const objectEntries: string[] = this.splitIntoEntries(innerContent);
        const res: Record<string, unknown> = {};
        for (const entry of objectEntries) {
            const separatorIndex: number = entry.indexOf(':');
            const key: string = entry.slice(0, separatorIndex).trim();
            const val: string = entry.slice(separatorIndex + 1).trim();
            if (key && val) {
                res[key] = this.parseAsTs(val);
            }
        }
        return res;
    }

    private static parseArrayAsTs(strippedValue: string): unknown[] {
        const innerContent: string = strippedValue.slice(1, -1).trim();
        if (innerContent === '') {
            return [];
        }
        const arrayValues: unknown[] = this.splitIntoEntries(innerContent).map(item => this.parseAsTs(item.trim()));
        return arrayValues;
    }

    // eslint-disable-next-line sonar/cognitive-complexity
    private static splitIntoEntries(value: string): string[] {
        const result: string[] = [];
        let currentEntry: string = '';
        let isInsideString: boolean = false;
        let isInsideComment: boolean = false;
        let nestingLevel: number = 0; // Track object/array nesting levels

        for (let i: number = 0; i < value.length; i++) {
            const char: string = value[i];
            const nextChar: string | undefined = value[i + 1];

            if (this.isStringDelimiter(char, isInsideComment)) {
                isInsideString = !isInsideString;
                currentEntry += char;
                continue;
            }

            if (this.isStartOfComment(char, nextChar)) {
                isInsideComment = true;
                currentEntry += char;
                continue;
            }
            if (this.isEndOfComment(char, nextChar)) {
                isInsideComment = false;
                currentEntry += char;
                continue;
            }

            if (isInsideString || isInsideComment) {
                currentEntry += char;
                continue;
            }

            if (this.isStartOfArrayOrObject(char)) {
                nestingLevel++;
                currentEntry += char;
                continue;
            }
            if (this.isEndOfArrayOrObject(char)) {
                nestingLevel--;
                currentEntry += char;
                continue;
            }

            if (this.isEndOfRootLevelEntry(char, nestingLevel)) {
                result.push(currentEntry.trim());
                currentEntry = '';
                continue;
            }

            currentEntry += char;
        }

        result.push(currentEntry.trim());
        return result;
    }

    private static isEndOfArrayOrObject(char: string): boolean {
        return char === ']' || char === '}';
    }

    private static isStartOfArrayOrObject(char: string): boolean {
        return char === '[' || char === '{';
    }

    private static isEndOfRootLevelEntry(char: string, nestingLevel: number): boolean {
        return char === ',' && nestingLevel === 0;
    }

    private static isEndOfComment(char: string, nextChar: string): boolean {
        return char === '*' && nextChar === '/';
    }

    private static isStartOfComment(char: string, nextChar: string): boolean {
        return char === '/' && nextChar === '*';
    }

    private static isStringDelimiter(char: string, isInsideComment: boolean): boolean {
        return (char === '\'' || char === '"') && !isInsideComment;
    }

    private static objectToTsString(value: object, currentIndent: number): string {
        const currentSpacing: string = ' '.repeat(currentIndent);
        const nextSpacing: string = ' '.repeat(currentIndent + this.indent);

        const entries: [string, unknown][] = Object.entries(value);
        if (!entries.length) {
            return '{}';
        }
        const props: string = entries
            .map(([key, val]) => `${key}: ${this.stringifyAsTs(val, currentIndent + this.indent)}`)
            .join(`,\n${nextSpacing}`);
        return `{\n${nextSpacing}${props}\n${currentSpacing}}`;
    }

    private static arrayToTsString(value: unknown[], currentIndent: number): string {
        const currentSpacing: string = ' '.repeat(currentIndent);
        const nextSpacing: string = ' '.repeat(currentIndent + this.indent);
        if (!value.length) {
            return '[]';
        }
        const items: string = value.map(item => this.stringifyAsTs(item, currentIndent + this.indent)).join(`,\n${nextSpacing}`);
        return `[\n${nextSpacing}${items}\n${currentSpacing}]`;
    }

    private static functionToTsString(value: Function): string {
        const funcString: string = value.toString();
        if (!funcString.includes('__importStar(require(')) {
            return funcString;
        }

        const modulePath: string | undefined = funcString.match(/require\(["'`](.*)["'`]\)/)?.[1];
        const component: string | undefined = funcString.match(/m => m\.(\w+)/)?.[1];

        if (!modulePath || !component) {
            return funcString;
        }

        return `() => import('${modulePath}').then(m => m.${component})`;
    }

    private static stringToTsString(value: string): string {
        if (this.isCustomTsString(value)) {
            return customTsValueToString[value];
        }
        // Detect template literals
        if (/^`.*`$/.test(value)) {
            return value;
        }
        return `'${value.replaceAll('\'', '\\\'')}'`; // Escape single quotes in strings
    }

    private static isCustomTsString(value: string): value is CustomTsValues {
        return value in customTsValueToString;
    }

    private static isCustomTsValue(value: string): boolean {
        return Object.values(customTsValueToString).includes(value);
    }
}