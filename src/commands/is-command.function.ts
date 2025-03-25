import { Command } from './command.enum';

/**
 * Whether or not the given string is a command.
 * @param value - The value to check.
 * @returns True when it is included in the Command enum, false otherwise.
 */
export function isCommand(value: string): value is Command {
    return Object.values(Command).includes(value as Command);
}