#!/usr/bin/env node
import { Command, isCommand, runAdd, runDown, runDownDev, runGeneratePage, runHelp, runInit, runList, runPrepare, runRun, runRunAll, runUp, runUpDev, runUpLocal, runVersion } from './commands';
import { runDownLocal } from './commands/down-local';
import { validateInput } from './commands/validate-input.function';
import { DeathUtilities, FigletUtilities } from './encapsulation';

DeathUtilities.death();

// eslint-disable-next-line jsdoc/require-jsdoc
async function main(): Promise<void> {
    const [,, ...args] = process.argv;

    FigletUtilities.displayLogo();

    await validateInput(args);
    const command: string = args[0];

    if (!isCommand(command)) {
        await runRun(...args);
        return;
    }

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
            await runPrepare(undefined);
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
        case Command.UP_LOCAL:
        case Command.UL: {
            await runUpLocal();
            return;
        }
        case Command.DOWN_LOCAL:
        case Command.DL: {
            runDownLocal();
            return;
        }
        case Command.RUN_ALL:
        case Command.RA:
        case Command.RUN_MANY: {
            runRunAll(args[1]);
            return;
        }
        case Command.LIST:
        case Command.LS: {
            await runList(false);
            return;
        }
        case Command.LIST_ALL:
        case Command.LA: {
            await runList(true);
            return;
        }
    }
}

void main();