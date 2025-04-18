/* eslint-disable no-console */
import { APPS_DIRECTORY_NAME, CLI_BASE_COMMAND, LIBS_DIRECTORY_NAME } from '../../constants';
import { ChalkUtilities } from '../../encapsulation';
import { BaseCommand } from '../base-command.model';
import { Command } from '../command.enum';

/**
 * Displays info on how to use the cli.
 */
export class HelpCommand extends BaseCommand {

    protected override run(): Promise<void> | void {
        console.log(ChalkUtilities.boldUnderline('Commands:'));
        console.log(this.getCommandLabel(Command.HELP, Command.H), 'opens this help-page');
        console.log(this.getCommandLabel(Command.VERSION, Command.V), 'shows the currently used version');
        console.log(this.getCommandLabel(Command.INIT, Command.I), 'initializes a new monorepo workspace');
        console.log(this.getCommandLabel(Command.ADD, Command.A), 'adds a new application to the current monorepo workspace');
        console.log(this.getCommandLabel(Command.PREPARE, Command.P), 'Handles things like creating robots.txt and environment.ts files');
        console.log(
            this.getCommandLabel(Command.UP, Command.U),
            `deploys the monorepo. This includes the ${ChalkUtilities.secondary(Command.PREPARE)} command.`
        );
        console.log(this.getCommandLabel(Command.DOWN, Command.D), 'stops the currently deployed monorepo');
        console.log(this.getCommandLabel(Command.LIST, Command.LS), 'lists running monorepos with their respective docker services');
        console.log(this.getCommandLabel(Command.LIST_ALL, Command.LA), 'lists all monorepos with their respective docker services');
        console.log(this.getCommandLabel(Command.GENERATE_PAGE, Command.GP), 'generates a new page for an angular project');
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

    private getCommandLabel(command: Command, shortForm: Command): string {
        return `${ChalkUtilities.secondary(command)} / ${ChalkUtilities.secondary(shortForm)}:`;
    }
}