import { LogUtilities, PathUtilities, ProcessUtilities } from '../encapsulation';
import { WorkspaceConfig, WorkspaceSnapshot, WorkspaceSnapshotUtilities, WorkspaceUtilities } from '../workspace';

const TOO_MANY_ARGUMENTS_ERROR_MESSAGE: string = 'The command was given too many arguments.';

/**
 * Contains configuration shared by every cli command of Monux.
 */
export abstract class BaseCommand<Input extends object = {}> {
    /**
     * Whether or not the command should only be called from inside of an initialized workspace.
     * @default false
     */
    protected readonly insideWorkspace: boolean = false;
    /**
     * The maximum length of arguments that should be provided.
     * When set to undefined, the amount of arguments is unrestricted.
     * @default 1
     */
    protected readonly maxLength: number | undefined = 1;
    /**
     * Whether the command restores the files of the workspace as they were before it ran, when it is interrupted or
     * crashes. For the commands that write code, so a failed one leaves nothing half done.
     * @default false
     */
    protected readonly restoresWorkspace: boolean = false;

    /**
     * Starts the cli command.
     * Calls validation, resolves the input and then runs the actual command.
     * @param args - The args from the cli.
     */
    async start(args: string[]): Promise<void> {
        await this.validate(args);
        const input: Input = await this.resolveInput(args);
        if (!this.restoresWorkspace) {
            await this.run(input);
            return;
        }
        await this.runRestoringWorkspace(input);
    }

    private async runRestoringWorkspace(input: Input): Promise<void> {
        const snapshot: WorkspaceSnapshot = await WorkspaceSnapshotUtilities.create(PathUtilities.resolve('.'));
        const restore: () => Promise<void> = () => this.restoreWorkspace(snapshot);
        // when it exits with an error or is interrupted, which ends Monux before this catches anything
        ProcessUtilities.addExitHandler(restore);
        try {
            await this.run(input);
        }
        catch (error) {
            await restore();
            throw error;
        }
        finally {
            ProcessUtilities.removeExitHandler(restore);
        }
    }

    private async restoreWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
        const { changed, lockfileChanged } = await WorkspaceSnapshotUtilities.restore(snapshot);
        if (changed) {
            LogUtilities.warning('The workspace is as it was before the command.');
        }
        if (lockfileChanged) {
            LogUtilities.warning('node_modules may still hold packages the command installed. "npm install" removes them.');
        }
    }

    protected abstract run(input: Input): Promise<void> | void;

    /**
     * Resolves the input args of the cli to input that can be used by the command.
     * @param args - The user provided args.
     * @returns The resolved input.
     */
    // eslint-disable-next-line unusedImports/no-unused-vars
    protected resolveInput(args: string[]): Input | Promise<Input> {
        return undefined as unknown as Input;
    }

    /**
     * Validates the user input.
     * @param args - The cli args.
     */
    protected async validate(args: string[]): Promise<void> {
        await this.validateMaxLength(args);
        await this.validateInsideWorkspace();
    }

    /**
     * Validates that the cwd is a Monux workspace.
     */
    protected async validateInsideWorkspace(): Promise<void> {
        if (!this.insideWorkspace) {
            return;
        }
        const config: WorkspaceConfig | undefined = await WorkspaceUtilities.getConfig();
        // eslint-disable-next-line typescript/strict-boolean-expressions
        if (!config?.isWorkspace) {
            await ProcessUtilities.exitWithError('This command needs to be run inside a workspace.');
        }
    }

    /**
     * Validates that the provided args are not bigger than the maxLength.
     * @param args - The cli args.
     */
    protected async validateMaxLength(args: string[]): Promise<void> {
        if (this.maxLength == undefined) {
            return;
        }
        if (args.length > this.maxLength) {
            await ProcessUtilities.exitWithError(TOO_MANY_ARGUMENTS_ERROR_MESSAGE);
        }
    }
}