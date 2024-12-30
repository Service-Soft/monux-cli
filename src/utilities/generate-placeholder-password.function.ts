/**
 * Generates a random placeholder password.
 * Used as default values for db passwords.
 * @param length - The length of the password to generate.
 * @returns A random combination of numbers, characters and special characters. The value is 20 characters strong.
 */
export function generatePlaceholderPassword(length: number = 20): string {
    const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
    return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}