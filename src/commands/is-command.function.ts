import { Command } from './command.enum';

/**
 *
 * @param value
 */
export function isCommand(value: string): value is Command {
    return Object.values(Command).includes(value as Command);
}