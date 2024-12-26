/**
 * Transforms the given string to kebab case.
 * @param str - The string to transform.
 * @returns The input value formatted in pascal case (kebab-case).
 */
export function toKebabCase(str: string): string {
    return str
        .replaceAll(/([\da-z])([A-Z])/g, '$1-$2') // Insert hyphen between lowercase and uppercase
        .replaceAll(/[\s_]+/g, '-') // Replace spaces or underscores with hyphens
        .toLowerCase();
}