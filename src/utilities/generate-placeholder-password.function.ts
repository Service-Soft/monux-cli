/**
 * Generates a random placeholder password.
 * Used as default values for db passwords.
 * @returns A random combination of numbers, characters and special characters. The value is 20 characters strong.
 */
export function generatePlaceholderPassword(): string {
    const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
    return Array.from({ length: 20 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}