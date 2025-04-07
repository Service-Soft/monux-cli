import { Dirent } from 'fs';

import { FsUtilities } from '../encapsulation';
import { WorkspaceConfig, WorkspaceUtilities } from '../workspace';
import { Command } from './command.enum';
import { exitWithError } from './exit-with-error.function';
import { PACKAGE_JSON_FILE_NAME } from '../constants';
import { NativeNpmCommands, PackageJson } from '../npm';
import { getPath } from '../utilities';
import { isCommand } from './is-command.function';

const TOO_MANY_ARGUMENTS_ERROR_MESSAGE: string = 'Error parsing the command: Too many arguments.';

/**
 * Validates the user input.
 * @param args - The arguments provided by the user for the cli-command.
 */
export async function validateInput(args: string[]): Promise<void> {
    if (args.length < 1) {
        exitWithError('Error: You need to specify a command.');
        return;
    }

    const command: string = args[0];

    if (!isCommand(command)) {
        if (args.length === 1) {
            exitWithError(`Error: Unknown command ${command}.`);
        }
        await validateRunInput(...args);
        return;
    }

    switch (command) {
        case Command.HELP:
        case Command.H:
        case Command.VERSION:
        case Command.V:
        case Command.INIT:
        case Command.I: {
            validateMaxLength(args.length, 1);
            return;
        }
        case Command.A:
        case Command.ADD:
        case Command.PREPARE:
        case Command.P:
        case Command.UP:
        case Command.U:
        case Command.DOWN:
        case Command.D:
        case Command.UP_DEV:
        case Command.UD:
        case Command.DOWN_DEV:
        case Command.DD:
        case Command.UP_LOCAL:
        case Command.UL:
        case Command.DOWN_LOCAL:
        case Command.DL:
        case Command.GENERATE_PAGE:
        case Command.GP: {
            await validateInsideWorkspace();
            validateMaxLength(args.length, 1);
            return;
        }
        case Command.RUN_MANY:
        case Command.RUN_ALL:
        case Command.RA: {
            if (args.length === 1) {
                exitWithError('Error: No npm script specified to run in all projects.');
            }
            await validateInsideWorkspace();
            return;
        }
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
async function validateRunInput(...args: string[]): Promise<void> {
    const project: string = args[0];
    await validateInsideWorkspace();
    const foundProject: Dirent = await WorkspaceUtilities.findProjectOrFail(project);

    const foundProjectPath: string = getPath(foundProject.parentPath, foundProject.name);
    const packageJson: Dirent | undefined = (await FsUtilities.readdir(foundProjectPath)).find(f => f.name === PACKAGE_JSON_FILE_NAME);
    if (!packageJson) {
        exitWithError(`The provided project "${project}" does not contain a ${PACKAGE_JSON_FILE_NAME} file`);
        return;
    }

    if (Object.values(NativeNpmCommands).includes(args[1] as NativeNpmCommands)) {
        return;
    }

    const npmScript: string = args[1];
    const file: PackageJson = await FsUtilities.parseFileAs<PackageJson>(getPath(packageJson.parentPath, packageJson.name));

    if (!Object.keys(file.scripts).includes(npmScript)) {
        exitWithError(`The project "${project}" does not contain the provided script "${npmScript}"`);
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
async function validateInsideWorkspace(): Promise<void> {
    const config: WorkspaceConfig | undefined = await WorkspaceUtilities.getConfig();
    // eslint-disable-next-line typescript/strict-boolean-expressions
    if (!config?.isWorkspace) {
        exitWithError('This command can only be run inside a workspace');
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
function validateMaxLength(value: number, maxLength: number): void {
    if (value > maxLength) {
        exitWithError(TOO_MANY_ARGUMENTS_ERROR_MESSAGE);
    }
}