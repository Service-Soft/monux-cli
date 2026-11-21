/**
 * Converts strings between the casings Monux generates names in.
 */
export abstract class StringUtilities {
    /**
     * Converts the given string to kebab case.
     * @param value - The value to convert.
     * @returns The value in kebab case (kebab-case).
     */
    static toKebabCase(value: string): string {
        return value
            .replaceAll(/([\da-z])([A-Z])/g, '$1-$2') // Insert hyphen between lowercase and uppercase
            .replaceAll(/[\s_]+/g, '-') // Replace spaces or underscores with hyphens
            .toLowerCase();
    }

    /**
     * Converts the given string to pascal case.
     * @param value - The value to convert.
     * @returns The value in pascal case (PascalCase).
     */
    static toPascalCase(value: string): string {
        return value
            .replaceAll(/(^\w|[\s_-]\w)/g, match => match.replace(/[\s_-]/, '').toUpperCase()) // Capitalize first letters
            .replaceAll(/[\s_-]/g, ''); // Remove remaining separators
    }

    /**
     * Converts the given string to snake case.
     * @param value - The value to convert.
     * @returns The value in snake case (snake_case).
     */
    static toSnakeCase(value: string): string {
        return value
            .replaceAll(/([a-z])([A-Z])/g, '$1_$2') // Insert underscore between camelCase words
            .replaceAll(' ', '_')
            .replaceAll('-', '_')
            .toLowerCase();
    }
}