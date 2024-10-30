import death from 'death';

/**
 * Encapsulates functionality of the death package.
 */
export abstract class DeathUtilities {
    /**
     * Kills the program when the process stops.
     * @returns The return of calling death.
     */
    static death(): () => void {
        return death(() => {});
    }
}