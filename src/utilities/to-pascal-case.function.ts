/**
 * Transforms the given string to pascal case.
 * @param str - The string to transform.
 * @returns The input value formatted in pascal case (PascalCase).
 */
export function toPascalCase(str: string): string {
    return str
        .replaceAll(/(^\w|[\s_-]\w)/g, match => match.replace(/[\s_-]/, '').toUpperCase()) // Capitalize first letters
        .replaceAll(/[\s_-]/g, ''); // Remove remaining separators
}