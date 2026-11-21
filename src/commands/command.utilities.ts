import { ProcessUtilities } from '../encapsulation';
import { Command } from './command.enum';

/**
 * Utilities for the commands of Monux.
 */
export abstract class CommandUtilities {
    /**
     * Resolves the command from the given args.
     * Anything that is no command of Monux runs an npm script of a project, such as "mx api build".
     * @param args - The args provided by the cli.
     * @returns The resolved command.
     */
    static async resolve(args: string[]): Promise<Command | 'run'> {
        if (args.length < 1) {
            await ProcessUtilities.exitWithError('No command was given.');
        }

        const command: string = args[0];

        if (!this.isCommand(command)) {
            if (args.length === 1) {
                await ProcessUtilities.exitWithError(`The command "${command}" does not exist.`);
            }
            return 'run';
        }

        return command;
    }

    private static isCommand(value: string): value is Command {
        return Object.values(Command).includes(value as Command);
    }
}