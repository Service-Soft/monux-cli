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
        validate: async (input?: string) => input != undefined && await WorkspaceUtilities.findProject(input, PathUtilities.resolve('.')) == undefined
    }
};