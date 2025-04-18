import { GeneratePageConfiguration, generatePageConfigurationQuestions } from './generate-page-configuration.model';
import { AddNavElementConfig, AngularUtilities, NavElementTypes } from '../../angular';
import { ANGULAR_ROUTES_FILE_NAME } from '../../constants';
import { FsUtilities, InquirerUtilities } from '../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../env';
import { getPath, toKebabCase, toPascalCase } from '../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';

const LOAD_COMPONENT_PLACEHOLDER: string = 'LOAD_COMPONENT_PLACEHOLDER';

/**
 * Generates an angular page.
 */
export class GeneratePageCommand extends BaseCommand<GeneratePageConfiguration> {
    protected override readonly insideWorkspace: boolean = true;

    protected override async run(input: GeneratePageConfiguration): Promise<void> {
        const projectRoot: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(input.projectName, getPath('.'));
        const domain: string = await EnvUtilities.getEnvVariable(
            DefaultEnvKeys.domain(input.projectName),
            'dev.docker-compose.yaml',
            getPath('.')
        );

        const navElement: AddNavElementConfig = {
            addTo: 'navbar',
            element: {
                type: NavElementTypes.INTERNAL_LINK,
                name: input.pageName,
                route: {
                    path: input.route,
                    title: input.title,
                    // eslint-disable-next-line typescript/no-unsafe-assignment, typescript/no-explicit-any
                    loadComponent: LOAD_COMPONENT_PLACEHOLDER as any
                }
            },
            rowIndex: 0
        };

        await AngularUtilities.generatePage(projectRoot.path, input.pageName, navElement, domain);
        const pageName: string = toKebabCase(input.pageName);
        await FsUtilities.replaceInFile(
            getPath(projectRoot.path, 'src', 'app', ANGULAR_ROUTES_FILE_NAME),
            `\'${LOAD_COMPONENT_PLACEHOLDER}\'`,
            `() => import(\'./pages/${pageName}/${pageName}.component\').then(m => m.${toPascalCase(input.pageName)}Component)`
        );
    }

    protected override async resolveInput(): Promise<GeneratePageConfiguration> {
        return await InquirerUtilities.prompt(generatePageConfigurationQuestions);
    }
}