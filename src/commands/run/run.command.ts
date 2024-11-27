
import { NpmUtilities } from '../../npm';

/**
 * Runs the run cli command.
 * @param projectName - The name of the project to run the command in.
 * @param npmScript - The name of the npm script that should be run.
 */
export async function runRun(projectName: string, npmScript: string): Promise<void> {
    await NpmUtilities.run(projectName, npmScript);
}