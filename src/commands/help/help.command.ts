import { APPS_DIRECTORY_NAME, CLI_BASE_COMMAND, LIBS_DIRECTORY_NAME } from '../../constants';
import { ChalkUtilities, LogUtilities } from '../../encapsulation';
import { BaseCommand } from '../base-command.model';
import { Command } from '../command.enum';

/**
 * Displays info on how to use the cli.
 */
export class HelpCommand extends BaseCommand {

    protected override run(): Promise<void> | void {
        LogUtilities.heading('Commands:');
        LogUtilities.text(
            `${this.getCommandLabel(Command.HELP, Command.H)} Shows this help`,
            `${this.getCommandLabel(Command.VERSION, Command.V)} Shows the version of Monux`,
            `${this.getCommandLabel(Command.INIT, Command.I)} Initializes a new workspace`,
            `${this.getCommandLabel(Command.ADD, Command.A)} Adds a project to the workspace`,
            `${this.getCommandLabel(Command.PREPARE, Command.P)} Validates the environment and writes the environment.ts files`
            + ' and database scripts',
            `${this.getCommandLabel(Command.UP, Command.U)} Starts the services of the workspace.`
            + ` Runs ${ChalkUtilities.secondary(Command.PREPARE)} first`,
            `${this.getCommandLabel(Command.DOWN, Command.D)} Stops the services of the workspace`,
            `${this.getCommandLabel(Command.LIST, Command.LS)} Lists the workspaces with running docker services`,
            `${this.getCommandLabel(Command.LIST_ALL, Command.LA)} Lists every workspace with docker services, running or stopped`,
            `${this.getCommandLabel(Command.GENERATE_PAGE, Command.GP)} Generates a page in an Angular project`,
            `${this.getCommandLabel(Command.GENERATE_COMPONENT, Command.GC)} Generates a component in an Angular library`
        );
        LogUtilities.newLine();
        LogUtilities.heading('Running an npm script:');
        const runExample: string = ChalkUtilities.exampleUsage(`${CLI_BASE_COMMAND} {projectName} {npmScript}`);
        LogUtilities.text(
            `${runExample} runs an npm script in one project`,
            `of the "${APPS_DIRECTORY_NAME}" or "${LIBS_DIRECTORY_NAME}" directory.`
        );
        LogUtilities.newLine();
        LogUtilities.heading('Running an npm script in multiple projects:');
        const runAllExample: string = ChalkUtilities.exampleUsage(`${CLI_BASE_COMMAND} ${Command.RUN_ALL} {npmScript}`);
        LogUtilities.text(
            `${runAllExample} runs an npm script in every project that has it.`,
            `${ChalkUtilities.secondary(Command.RA)} is short for ${ChalkUtilities.secondary(Command.RUN_ALL)}.`
        );
    }

    private getCommandLabel(command: Command, shortForm: Command): string {
        return `${ChalkUtilities.secondary(command)} / ${ChalkUtilities.secondary(shortForm)}:`;
    }
}