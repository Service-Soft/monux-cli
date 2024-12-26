/* eslint-disable no-console */
import { APPS_DIRECTORY_NAME, CLI_BASE_COMMAND, LIBS_DIRECTORY_NAME } from '../../constants';
import { ChalkUtilities } from '../../encapsulation';
import { Command } from '../command.enum';

// eslint-disable-next-line jsdoc/require-jsdoc
function getCommandLabel(command: Command, shortForm: Command): string {
    return `${ChalkUtilities.secondary(command)} / ${ChalkUtilities.secondary(shortForm)}:`;
}

/**
 * Runs the help cli command.
 */
export function runHelp(): void {
    console.log(ChalkUtilities.boldUnderline('Commands:'));
    console.log(getCommandLabel(Command.HELP, Command.H), 'opens this help-page');
    console.log(getCommandLabel(Command.VERSION, Command.V), 'shows the currently used version');
    console.log(getCommandLabel(Command.INIT, Command.I), 'initializes a new monorepo workspace');
    console.log(getCommandLabel(Command.ADD, Command.A), 'adds a new application to the current monorepo workspace');
    console.log(getCommandLabel(Command.PREPARE, Command.P), 'Handles things like creating robots.txt and environment.ts files');
    console.log(
        getCommandLabel(Command.UP_DEV, Command.UD),
        'deploys things like a database with connection to localhost for local development'
    );
    console.log(getCommandLabel(Command.UP, Command.U), 'deploys the monorepo. This includes the "prepare" command.');
    console.log(getCommandLabel(Command.DOWN, Command.D), 'stops the currently deployed monorepo');
    console.log();
    console.log(`${ChalkUtilities.secondary('Running an npm script')}:`);
    console.log(`To run an npm script of one of your projects you can use ${CLI_BASE_COMMAND} "project" "npmScript"`);
    console.log(`This works for projects in the "${APPS_DIRECTORY_NAME}" and "${LIBS_DIRECTORY_NAME}" directories of your workspace`);
}