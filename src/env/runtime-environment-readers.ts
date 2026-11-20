import { AddType } from '../commands/add/models/add-type.enum';

/**
 * The project types that run on a server, whose environment.ts reads its values when the project starts instead of
 * holding them.
 */
export const SERVER_PROJECT_TYPES: AddType[] = [AddType.ZIBRI, AddType.LOOPBACK, AddType.NEST];

/**
 * The functions the environment.ts of a server project reads its values with, by their name.
 * Only the ones a project uses are written into its environment.ts.
 */
export const RUNTIME_ENVIRONMENT_READERS: Record<string, string[]> = {
    readString: [
        'function readString(key: string): string {',
        '\tconst value: string | undefined = process.env[key];',
        '\tif (value == undefined || value === \'\') {',
        '\t\tthrow new Error(`The environment variable "${key}" is not set. Run "mx prepare" to write it.`);',
        '\t}',
        '\treturn value;',
        '}'
    ],
    readOptionalString: [
        'function readOptionalString(key: string): string | undefined {',
        '\tconst value: string | undefined = process.env[key];',
        '\treturn value === \'\' ? undefined : value;',
        '}'
    ],
    readNumber: [
        'function readNumber(key: string): number {',
        '\tconst value: number = Number(readString(key));',
        '\tif (Number.isNaN(value)) {',
        '\t\tthrow new Error(`The environment variable "${key}" needs to be a number.`);',
        '\t}',
        '\treturn value;',
        '}'
    ],
    readOptionalNumber: [
        'function readOptionalNumber(key: string): number | undefined {',
        '\tconst value: string | undefined = process.env[key];',
        '\tif (value == undefined || value === \'\') {',
        '\t\treturn undefined;',
        '\t}',
        '\tif (Number.isNaN(Number(value))) {',
        '\t\tthrow new Error(`The environment variable "${key}" needs to be a number.`);',
        '\t}',
        '\treturn Number(value);',
        '}'
    ],
    readBoolean: [
        'function readBoolean(key: string): boolean {',
        '\tconst value: string = readString(key);',
        '\tif (value !== \'true\' && value !== \'false\') {',
        '\t\tthrow new Error(`The environment variable "${key}" needs to be "true" or "false".`);',
        '\t}',
        '\treturn value === \'true\';',
        '}'
    ],
    readOptionalBoolean: [
        'function readOptionalBoolean(key: string): boolean | undefined {',
        '\tconst value: string | undefined = process.env[key];',
        '\tif (value == undefined || value === \'\') {',
        '\t\treturn undefined;',
        '\t}',
        '\tif (value !== \'true\' && value !== \'false\') {',
        '\t\tthrow new Error(`The environment variable "${key}" needs to be "true" or "false".`);',
        '\t}',
        '\treturn value === \'true\';',
        '}'
    ],
    readOneOf: [
        'function readOneOf<T extends string>(key: string, values: readonly T[]): T {',
        '\tconst value: string = readString(key);',
        '\tconst known: T | undefined = values.find(v => v === value);',
        '\tif (known == undefined) {',
        '\t\tthrow new Error(`The environment variable "${key}" needs to be one of ${values.join(\', \')}.`);',
        '\t}',
        '\treturn known;',
        '}'
    ]
};