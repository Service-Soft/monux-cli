#!/usr/bin/env node
import { Command, runAdd, runBuildEnv, runDown, runHelp, runInit, runRun, runUp, runVersion } from './commands';
import { validateInput } from './commands/validate-input.function';
import { DeathUtilities, FigletUtilities } from './encapsulation';

DeathUtilities.death();

// eslint-disable-next-line jsdoc/require-jsdoc
async function main(): Promise<void> {
    const [,, ...args] = process.argv;

    await validateInput(args);

    if (args.length >= 2) {
        await runRun(...args);
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
        case Command.BUILD_ENV:
        case Command.B_ENV: {
            await runBuildEnv();
        }
    }
}

void main();