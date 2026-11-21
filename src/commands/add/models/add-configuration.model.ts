import { QuestionsFor, PathUtilities } from '../../../encapsulation';
import { WorkspaceUtilities } from '../../../workspace';
import { AddType } from './add-type.enum';

/**
 * BaseConfiguration for the add cli command.
 */
export type AddConfiguration = {
    /**
     * The type of project to add.
     */
    type: AddType,
    /**
     * The name of the new project.
     */
    name: string
};

/**
 * Validates the name of a new project, which is also its folder and its compose service.
 * @param input - The name.
 * @returns True, what is missing for an empty name, or false for the name of a project the workspace has already.
 */
export async function validateProjectName(input?: string): Promise<true | string | false> {
    return input?.trim()
        ? await WorkspaceUtilities.findProject(input, PathUtilities.resolve('.')) == undefined
        : 'The project needs a name';
}

/**
 * Questions for getting the base configuration for adding a new project to a monorepo.
 */
export const addConfigurationQuestions: QuestionsFor<AddConfiguration> = {
    type: {
        type: 'select',
        name: 'type',
        choices: Object.values(AddType),
        message: 'type'
    },
    name: {
        type: 'input',
        name: 'name',
        message: 'name',
        validate: validateProjectName
    }
};