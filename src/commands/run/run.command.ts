import { Dirent } from 'fs';
import path from 'path';

import { CPUtilities } from '../../encapsulation';
import { NativeNpmCommands, NpmUtilities } from '../../npm';
import { WorkspaceUtilities } from '../../workspace';

/**
 * Runs the run cli command.
 * @param args - The passed cli commands.
 */
export async function runRun(...args: string[]): Promise<void> {
    const projectName: string = args[0];
    const npmScript: string = args[1];
    const nativeCommand: boolean = Object.values(NativeNpmCommands).includes(args[1] as NativeNpmCommands);

    if (!nativeCommand) {
        await NpmUtilities.run(projectName, npmScript);
    }

    const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
    const projectPath: string = path.join(project.parentPath, project.name);
    CPUtilities.execSync(`cd ${projectPath} && npm ${args.slice(1).join(' ')}`);
}