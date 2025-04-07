import { CPUtilities } from '../../encapsulation';
import { NativeNpmCommands, NpmUtilities } from '../../npm';

/**
 * Runs the run cli command.
 * @param args - The passed cli commands.
 */
export function runRun(...args: string[]): void {
    const projectName: string = args[0];
    const npmScript: string = args[1];
    const nativeCommand: boolean = Object.values(NativeNpmCommands).includes(npmScript as NativeNpmCommands);

    const commands: string = args.slice(1).join(' ');
    if (!nativeCommand) {
        NpmUtilities.run(projectName, commands);
    }

    CPUtilities.execSync(`npm ${commands} --workspace=${projectName}`);
}