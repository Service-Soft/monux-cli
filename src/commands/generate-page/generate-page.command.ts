import { Dirent } from 'fs';

import { AddNavElementConfig, AngularUtilities, NavElementTypes } from '../../angular';
import { ANGULAR_ROUTES_FILE_NAME } from '../../constants';
import { FsUtilities, InquirerUtilities, QuestionsFor } from '../../encapsulation';
import { EnvUtilities } from '../../env';
import { getPath, toKebabCase, toPascalCase, toSnakeCase } from '../../utilities';
import { WorkspaceUtilities } from '../../workspace';

/**
 * Options for generating an angular page.
 */
type GeneratePageOptions = {
    /**
     * The name of the project to generate the page for.
     */
    projectName: string,
    /**
     * The name of the page to generate.
     */
    pageName: string,
    /**
     * The route under which the page should be reachable.
     */
    route: string,
    /**
     * The meta title of the page.
     */
    title: string
};

const LOAD_COMPONENT_PLACEHOLDER: string = 'LOAD_COMPONENT_PLACEHOLDER';

/**
 * Runs the generate page cli command.
 */
export async function runGeneratePage(): Promise<void> {
    const apps: Dirent[] = await WorkspaceUtilities.getProjects('apps');
    const questions: QuestionsFor<GeneratePageOptions> = {
        projectName: {
            message: 'Project',
            type: 'select',
            choices: apps.map(a => a.name)
        },
        pageName: {
            message: 'Page name',
            type: 'input',
            required: true
        },
        route: {
            message: 'Route',
            type: 'input',
            required: true
        },
        title: {
            message: 'Title',
            type: 'input',
            required: true
        }
    };

    const options: GeneratePageOptions = await InquirerUtilities.prompt(questions);
    const projectRoot: Dirent = await WorkspaceUtilities.findProjectOrFail(options.projectName);
    const domain: string = await EnvUtilities.getEnvVariable(`${toSnakeCase(options.projectName)}_domain`, '');

    const navElement: AddNavElementConfig = {
        addTo: 'navbar',
        element: {
            type: NavElementTypes.INTERNAL_LINK,
            name: options.pageName,
            route: {
                path: options.route,
                title: options.title,
                // eslint-disable-next-line typescript/no-unsafe-assignment, typescript/no-explicit-any
                loadComponent: LOAD_COMPONENT_PLACEHOLDER as any
            }
        },
        rowIndex: 0
    };

    await AngularUtilities.generatePage(getPath(projectRoot.parentPath, projectRoot.name), options.pageName, navElement, domain);
    const pageName: string = toKebabCase(options.pageName);
    await FsUtilities.replaceInFile(
        getPath(projectRoot.parentPath, projectRoot.name, 'src', 'app', ANGULAR_ROUTES_FILE_NAME),
        `\'${LOAD_COMPONENT_PLACEHOLDER}\'`,
        `() => import(\'./pages/${pageName}/${pageName}.component\').then(m => m.${toPascalCase(options.pageName)}Component)`
    );
}