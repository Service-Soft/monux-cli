import { AddType } from './add-type.enum';
import { QuestionsFor } from '../../../encapsulation';
import { getPath } from '../../../utilities';
import { WorkspaceUtilities } from '../../../workspace';

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
        validate: async (input?: string) => input != undefined && await WorkspaceUtilities.findProject(input, getPath('.')) == undefined
    }
};