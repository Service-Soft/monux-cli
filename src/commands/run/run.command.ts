
import { PACKAGE_JSON_FILE_NAME } from '../../constants';
import { Dirent, FsUtilities, ProcessUtilities, PathUtilities } from '../../encapsulation';
import { NativeNpmCommands, NpmUtilities, PackageJson } from '../../npm';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { RunConfiguration } from './run-configuration.model';

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
        const foundProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(project, PathUtilities.resolve('.'));

        const packageJson: Dirent | undefined = (await FsUtilities.readdir(foundProject.path)).find(f => f.name === PACKAGE_JSON_FILE_NAME);
        if (!packageJson) {
            return await ProcessUtilities.exitWithError(`The project "${project}" has no ${PACKAGE_JSON_FILE_NAME}.`);
        }

        if (Object.values(NativeNpmCommands).includes(args[1] as NativeNpmCommands)) {
            return;
        }

        const npmScript: string = args[1];
        const file: PackageJson = await FsUtilities.parseFileAs<PackageJson>(PathUtilities.resolve(packageJson.parentPath, packageJson.name));

        if (!Object.keys(file.scripts).includes(npmScript)) {
            await ProcessUtilities.exitWithError(`The project "${project}" has no script "${npmScript}".`);
        }
    }
}