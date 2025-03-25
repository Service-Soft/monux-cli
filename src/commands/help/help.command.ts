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
    console.log(getCommandLabel(Command.UP_DEV, Command.UD), 'deploys things like a database with connection to localhost for development');
    console.log(getCommandLabel(Command.DOWN_DEV, Command.DD), 'stops the deployed development services');
    console.log(
        getCommandLabel(Command.UP_LOCAL, Command.UL),
        `deploys the monorepo on localhost. This includes the ${ChalkUtilities.secondary(Command.PREPARE)} command.`
    );
    console.log(getCommandLabel(Command.DOWN_LOCAL, Command.DL), 'stops the deployed monorepo on localhost.');
    console.log(
        getCommandLabel(Command.UP, Command.U),
        `deploys the monorepo. This includes the ${ChalkUtilities.secondary(Command.PREPARE)} command.`
    );
    console.log(getCommandLabel(Command.DOWN, Command.D), 'stops the currently deployed monorepo');
    console.log(getCommandLabel(Command.GENERATE_PAGE, Command.GP), 'generates a new page for an angular project');
    console.log();
    console.log(`${ChalkUtilities.boldUnderline('Running an npm script')}:`);
    console.log(
        'To run an npm script in one of your projects you can use',
        ChalkUtilities.exampleUsage(`"${CLI_BASE_COMMAND} {projectName} {npmScript}"`)
    );
    console.log(`This works for projects in the "${APPS_DIRECTORY_NAME}" and "${LIBS_DIRECTORY_NAME}" directories of your workspace`);
    console.log(`${ChalkUtilities.boldUnderline('Running an npm script in multiple projects')}:`);
    console.log('If you want the script to run in multiple projects,');
    console.log(
        `you can use the ${ChalkUtilities.secondary(Command.RUN_ALL)} / ${ChalkUtilities.secondary(Command.RA)} command:`,
        ChalkUtilities.exampleUsage(`"${CLI_BASE_COMMAND} ${Command.RUN_ALL} {npmScript}"`)
    );
}