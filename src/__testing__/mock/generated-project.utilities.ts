import { NpmUtilities } from '../../npm';

/**
 * Checks what a generator generated the way a developer would right after running it.
 */
export abstract class GeneratedProjectUtilities {
    /**
     * Builds the project, lints it with zero warnings and runs its tests, inside the workspace the test generated.
     * @param projectName - The name of the generated project, such as "admin".
     * @throws When any of them fails.
     */
    static async validate(projectName: string): Promise<void> {
        // one after another, as the lint of some projects reads what the build generated.
        await NpmUtilities.run(projectName, 'build', false);
        await NpmUtilities.run(projectName, 'lint', false);
        await NpmUtilities.run(projectName, 'test', false);
    }
}