import { Dirent } from 'fs';

import { FsUtilities } from '../../encapsulation';
import { NativeNpmCommands, NpmUtilities, PackageJson } from '../../npm';
import { exitWithError, getPath } from '../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { RunConfiguration } from './run-configuration.model';
import { PACKAGE_JSON_FILE_NAME } from '../../constants';

/**
 * Runs either a native npm command or a script from the package.json.
 */
export class RunCommand extends BaseCommand<RunConfiguration> {
    protected override insideWorkspace: boolean = true;
    protected override maxLength: undefined = undefined;

    protected override async run(config: RunConfiguration): Promise<void> {
        await NpmUtilities.run(config.projectName, config.commands, config.isNativeCommand);
    }

    protected override resolveInput(args: string[]): RunConfiguration {
        return {
            projectName: args[0],
            isNativeCommand: Object.values(NativeNpmCommands).includes(args[1] as NativeNpmCommands),
            commands: args.slice(1).join(' ')
        };
    }

    protected override async validate(args: string[]): Promise<void> {
        const project: string = args[0];
        await this.validateInsideWorkspace();
        const foundProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(project, getPath('.'));

        const packageJson: Dirent | undefined = (await FsUtilities.readdir(foundProject.path)).find(f => f.name === PACKAGE_JSON_FILE_NAME);
        if (!packageJson) {
            return await exitWithError(`The provided project "${project}" does not contain a ${PACKAGE_JSON_FILE_NAME} file`);
        }

        if (Object.values(NativeNpmCommands).includes(args[1] as NativeNpmCommands)) {
            return;
        }

        const npmScript: string = args[1];
        const file: PackageJson = await FsUtilities.parseFileAs<PackageJson>(getPath(packageJson.parentPath, packageJson.name));

        if (!Object.keys(file.scripts).includes(npmScript)) {
            await exitWithError(`The project "${project}" does not contain the provided script "${npmScript}"`);
        }
    }
}