
import { NpmUtilities } from '../../npm';

/**
 *
 * @param projectName
 * @param npmScript
 */
export async function runRun(projectName: string, npmScript: string): Promise<void> {
    await NpmUtilities.run(projectName, npmScript);
}