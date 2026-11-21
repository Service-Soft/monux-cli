import { createHash, randomBytes } from 'node:crypto';

/**
 * Encapsulates functionality of the crypto package.
 */
export abstract class CryptoUtilities {
    /**
     * Generates a random key, such as one to encrypt with.
     * @param bytes - How many random bytes the key has.
     * @returns The key, as base64url.
     */
    static generateKey(bytes: number): string {
        return randomBytes(bytes).toString('base64url');
    }

    /**
     * Generates a random password, such as the default for a database.
     * Only letters, digits, "-" and "_", so the value needs no quoting in a .env file or a Docker Compose file, where
     * "$" and "#" mean something.
     * @param length - The length of the password.
     * @returns The password.
     */
    static generatePassword(length: number = 32): string {
        // base64url has 6 bits per character, so this many bytes give at least length characters.
        return randomBytes(Math.ceil(length * 3 / 4)).toString('base64url')
            .slice(0, length);
    }

    /**
     * Resolves the SHA-1 hash of a value, such as the password of an htpasswd file.
     * @param value - The value to hash.
     * @returns The hash, as base64.
     */
    static resolveSha1(value: string): string {
        return createHash('sha1').update(value)
            .digest('base64');
    }
}