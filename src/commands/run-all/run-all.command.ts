import { NpmUtilities } from '../../npm';
import { exitWithError } from '../../utilities';
import { BaseCommand } from '../base-command.model';

/**
 * Configuration for the run-all command.
 */
type RunAllConfiguration = {
    /**
     * The npm script to run.
     */
    npmScript: string
};

/**
 * Runs the given command in all projects of the current monorepo.
 */
export class RunAllCommand extends BaseCommand<RunAllConfiguration> {

    protected override async run(config: RunAllConfiguration): Promise<void> {
        await NpmUtilities.runAll(config.npmScript);
    }

    protected override resolveInput(args: string[]): RunAllConfiguration {
        return { npmScript: args[1] };
    }

    protected override async validate(args: string[]): Promise<void> {
        if (args.length === 1) {
            await exitWithError('Error: No npm script specified to run in all projects.');
        }
        await this.validateInsideWorkspace();
    }
}