#!/usr/bin/env node
import { Command, runAdd, runDown, runDownDev, runGeneratePage, runHelp, runInit, runPrepare, runRun, runUp, runUpDev, runVersion } from './commands';
import { validateInput } from './commands/validate-input.function';
import { DeathUtilities, FigletUtilities } from './encapsulation';

DeathUtilities.death();

// eslint-disable-next-line jsdoc/require-jsdoc
async function main(): Promise<void> {
    const [,, ...args] = process.argv;

    FigletUtilities.displayLogo();

    await validateInput(args);

    const command: Command = args[0] as Command;

    switch (command) {
        case Command.H:
        case Command.HELP: {
            runHelp();
            return;
        }
        case Command.VERSION:
        case Command.V: {
            await runVersion();
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
        case Command.UP:
        case Command.U: {
            await runUp();
            return;
        }
        case Command.DOWN:
        case Command.D: {
            runDown();
            return;
        }
        case Command.PREPARE:
        case Command.P: {
            await runPrepare();
            return;
        }
        case Command.GENERATE_PAGE:
        case Command.GP: {
            await runGeneratePage();
            return;
        }
        case Command.UP_DEV:
        case Command.UD: {
            await runUpDev();
            return;
        }
        case Command.DOWN_DEV:
        case Command.DD: {
            runDownDev();
            return;
        }
        default: {
            await runRun(...args);
        }
    }
}

void main();