/**
 * Converts the given string to snake case.
 * @param value - The value to transform.
 * @returns The input value formatted in snake case (snake_case).
 */
export function toSnakeCase(value: string): string {
    return value
        .replaceAll(/([a-z])([A-Z])/g, '$1_$2') // Insert underscore between camelCase words
        .replaceAll(' ', '_')
        .replaceAll('-', '_')
        .toLowerCase();
}