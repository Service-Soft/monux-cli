#!/usr/bin/env node
import { Command, DownCommand, HelpCommand, VersionCommand, InitCommand, UpCommand, PrepareCommand, GeneratePageCommand, AddCommand, ListCommand, RunCommand, RunAllCommand } from './commands';
import { resolveCommand } from './commands/resolve-command.function';
import { DeathUtilities, FigletUtilities } from './encapsulation';

DeathUtilities.death();

// eslint-disable-next-line jsdoc/require-jsdoc
async function main(): Promise<void> {
    const [,, ...args] = process.argv;

    FigletUtilities.displayLogo();

    const command: Command | 'run' = resolveCommand(args);

    switch (command) {
        case Command.H:
        case Command.HELP: {
            await new HelpCommand().start(args);
            return;
        }
        case Command.VERSION:
        case Command.V: {
            await new VersionCommand().start(args);
            return;
        }
        case Command.INIT:
        case Command.I: {
            await new InitCommand().start(args);
            return;
        }
        case Command.ADD:
        case Command.A: {
            await new AddCommand().start(args);
            return;
        }
        case Command.UP:
        case Command.U: {
            await new UpCommand().start(args);
            return;
        }
        case Command.DOWN:
        case Command.D: {
            await new DownCommand().start(args);
            return;
        }
        case Command.PREPARE:
        case Command.P: {
            await new PrepareCommand().start(args);
            return;
        }
        case Command.GENERATE_PAGE:
        case Command.GP: {
            await new GeneratePageCommand().start(args);
            return;
        }
        case Command.RUN_ALL:
        case Command.RA:
        case Command.RUN_MANY: {
            await new RunAllCommand().start(args);
            return;
        }
        case Command.LIST:
        case Command.LS: {
            await new ListCommand(false).start(args);
            return;
        }
        case Command.LIST_ALL:
        case Command.LA: {
            await new ListCommand(true).start(args);
            return;
        }
        case 'run': {
            await new RunCommand().start(args);
            return;
        }
    }
}

void main();