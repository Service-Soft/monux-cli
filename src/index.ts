#!/usr/bin/env node
import { Command, runAdd, runHelp, runInit, runRun, runVersion } from './commands';
import { validateInput } from './commands/validate-input.function';
import { DeathUtilities, FigletUtilities } from './encapsulation';

DeathUtilities.death();

// eslint-disable-next-line jsdoc/require-jsdoc
async function main(): Promise<void> {
    const [,, ...args] = process.argv;

    await validateInput(args);

    if (args.length === 2) {
        await runRun(args[0], args[1]);
        return;
    }

    const command: Command = args[0] as Command;

    FigletUtilities.displayLogo();

    switch (command) {
        case Command.H:
        case Command.HELP: {
            runHelp();
            return;
        }
        case Command.VERSION:
        case Command.V: {
            runVersion();
            return;
        }
        case Command.INIT:
        case Command.I: {
            await runInit();
            return;
        }
        case Command.ADD:
        case Command.A: {
            await runAdd();
            return;
        }
    }
}

void main();