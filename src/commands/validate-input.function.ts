import { Dirent } from 'fs';
import path from 'path';

import { FsUtilities } from '../encapsulation';
import { WorkspaceConfig, WorkspaceUtilities } from '../workspace';
import { Command } from './command.enum';
import { exitWithError } from './exit-with-error.function';
import { PACKAGE_JSON_FILE_NAME } from '../constants';
import { NativeNpmCommands, PackageJson } from '../npm';

const allKnownCommands: Command[] = Object.values(Command);

/**
 * Validates the user input.
 * @param args - The arguments provided by the user for the cli-command.
 */
export async function validateInput(args: string[]): Promise<void> {
    if (args.length < 1) {
        exitWithError('Error: You need to specify a command.');
    }

    const command: Command = args[0] as Command;
    if (!allKnownCommands.includes(command) && args.length >= 2) {
        await validateRunInput(...args);
        return;
    }

    if (args.length > 1) {
        exitWithError('Error parsing the command: Too many arguments.');
    }

    if (!allKnownCommands.includes(command)) {
        exitWithError(`Error: Unknown command ${command}.`);
    }
    if ([Command.ADD, Command.A, Command.PREPARE, Command.P, Command.D, Command.DOWN, Command.U, Command.UP].includes(command)) {
        await validateInsideWorkspace();
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
async function validateRunInput(...args: string[]): Promise<void> {
    const project: string = args[0];
    await validateInsideWorkspace();
    const foundProject: Dirent = await WorkspaceUtilities.findProjectOrFail(project);

    const foundProjectPath: string = path.join(foundProject.parentPath, foundProject.name);
    const packageJson: Dirent | undefined = (await FsUtilities.readdir(foundProjectPath)).find(f => f.name === PACKAGE_JSON_FILE_NAME);
    if (!packageJson) {
        exitWithError(`The provided project "${project}" does not contain a ${PACKAGE_JSON_FILE_NAME} file`);
        return;
    }

    if (Object.values(NativeNpmCommands).includes(args[1] as NativeNpmCommands)) {
        return;
    }

    if (args.length > 2) {
        exitWithError('Error parsing the command: Too many arguments.');
    }
    const npmScript: string = args[1];
    const file: PackageJson = await FsUtilities.parseFileAs<PackageJson>(path.join(packageJson.parentPath, packageJson.name));

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