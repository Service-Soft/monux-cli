import { exitWithError } from '../utilities';
import { Command } from './command.enum';
import { isCommand } from './is-command.function';

/**
 * Resolves the command from the given args.
 * @param args - The args provided by the cli.
 * @returns The resolved command.
 */
export async function resolveCommand(args: string[]): Promise<Command | 'run'> {
    if (args.length < 1) {
        await exitWithError('Error: You need to specify a command.');
    }

    const command: string = args[0];

    if (!isCommand(command)) {
        if (args.length === 1) {
            await exitWithError(`Error: Unknown command ${command}.`);
        }
        return 'run';
    }

    return command;
}