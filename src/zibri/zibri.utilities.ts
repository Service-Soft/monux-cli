import { CPUtilities } from '../encapsulation';
import { optionsToCliString, Path } from '../utilities';

/**
 * The `zi new {}` command.
 */
type CliNew = `new ${string}`;

/**
 * All possible zibri cli commands.
 */
type ZibriCliCommands = CliNew;

/**
 * Cli Options for running zi new.
 */
type NewOptions = never; {
    // /**
    //  * Whether or not npm install should be skipped.
    //  */
    // '--skip-install': true,
    // /**
    //  * Whether or not git initialization should be skipped.
    //  */
    // '--skip-git': true
}

/**
 * Possible zibri cli options, narrowed down based on the provided command.
 */
type ZibriCliOptions<T extends ZibriCliCommands>
    = T extends CliNew ? NewOptions
        : never;

/**
 * Utilities for zibri specific code generation/manipulation.
 */
export abstract class ZibriUtilities {

    private static readonly CLI_VERSION: string = '1.6.4';

    /**
     * Runs a zibri cli command inside the provided directory.
     * @param directory - The directory to run the command inside.
     * @param command - The command to run.
     * @param options - Options for running the command.
     */
    static async runCommand(directory: Path, command: ZibriCliCommands, options: ZibriCliOptions<typeof command>): Promise<void> {
        await CPUtilities.exec(`cd ${directory} && npx zibri-cli@${this.CLI_VERSION} ${command} ${optionsToCliString(options)}`);
    }
}