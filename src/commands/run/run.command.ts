import { CPUtilities } from '../../encapsulation';
import { NativeNpmCommands, NpmUtilities } from '../../npm';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';

/**
 * Runs the run cli command.
 * @param args - The passed cli commands.
 */
export async function runRun(...args: string[]): Promise<void> {
    const projectName: string = args[0];
    const npmScript: string = args[1];
    const nativeCommand: boolean = Object.values(NativeNpmCommands).includes(npmScript as NativeNpmCommands);

    const commands: string = args.slice(1).join(' ');
    if (!nativeCommand) {
        await NpmUtilities.run(projectName, commands);
    }

    const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(projectName);
    CPUtilities.execSync(`npm ${commands} --workspace=${project.npmWorkspaceString}`);
}