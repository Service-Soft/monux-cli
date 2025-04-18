import { exitWithError } from '../utilities';
import { WorkspaceConfig, WorkspaceUtilities } from '../workspace';

const TOO_MANY_ARGUMENTS_ERROR_MESSAGE: string = 'Error parsing the command: Too many arguments.';

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
     * Starts the cli command.
     * Calls validation, resolves the input and then runs the actual command.
     * @param args - The args from the cli.
     */
    async start(args: string[]): Promise<void> {
        await this.validate(args);
        const input: Input = await this.resolveInput(args);
        await this.run(input);
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
        this.validateMaxLength(args);
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
            exitWithError('This command can only be run inside a workspace');
        }
    }

    /**
     * Validates that the provided args are not bigger than the maxLength.
     * @param args - The cli args.
     */
    protected validateMaxLength(args: string[]): void {
        if (this.maxLength == undefined) {
            return;
        }
        if (args.length > this.maxLength) {
            exitWithError(TOO_MANY_ARGUMENTS_ERROR_MESSAGE);
        }
    }
}